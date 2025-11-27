import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Dimensions,
  Platform,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { LinearGradient } from 'expo-linear-gradient';
import { packageService } from '../services/supabase';
import { errorService } from '../services/ErrorService';
import { theme } from '../config/theme';
import { APP_CONFIG } from '../config/constants';

const { width } = Dimensions.get('window');

const HOTLINE_NUMBERS = [
  { display: APP_CONFIG.CONTACT.PHONE_DISPLAY, tel: APP_CONFIG.CONTACT.PHONE },
];

interface OrderStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
}

interface RecentOrder {
  id: string;
  receiver_name: string;
  receiver_address: string;
  status: string;
  created_at: string;
  price: string;
}

export default function HomeScreen({ navigation }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [userName, setUserName] = useState('');
  const [orderStats, setOrderStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const scrollY = new Animated.Value(0);

  const t = {
    zh: {
      title: 'MARKET LINK EXPRESS',
      subtitle: '快速、安全、可靠的同城配送服务',
      welcome: '欢迎',
      welcomeBack: '欢迎回来',
      guest: '访客',
      placeOrder: '立即下单',
      trackOrder: '追踪订单',
      myOrders: '我的订单',
      profile: '个人中心',
      orderStats: '订单统计',
      totalOrders: '全部订单',
      pendingOrders: '待取件',
      inTransitOrders: '配送中',
      deliveredOrders: '已送达',
      services: '核心服务',
      service1Title: '快速配送',
      service1Desc: '准时达1小时内送达\n急送达30分钟内送达',
      service2Title: '安全可靠',
      service2Desc: '专业配送团队\n全程保险保障',
      service3Title: '实时追踪',
      service3Desc: '随时查看包裹位置\n配送员实时定位',
      service4Title: '价格透明',
      service4Desc: '明码标价计费\n无隐藏费用',
      recentOrders: '最近订单',
      viewAll: '查看全部',
      noOrders: '暂无订单',
      noOrdersDesc: '您还没有创建订单\n点击下方按钮开始下单',
      receiver: '收件人',
      address: '地址',
      status: '状态',
      price: '金额',
      contact: '联系我们',
      phone: '客服热线',
      email: '商务合作',
      wechatId: 'WeChat ID',
      wechatValue: 'AMT349',
      viber: 'Viber',
      viberValue: '09259369349',
      gmail: 'Gmail',
      gmailValue: 'huangdelun16@gmail.com',
      features: '为什么选择我们',
      feature1: '7×24小时客服',
      feature2: '覆盖全缅甸主要城市',
      feature3: '专业配送团队',
      feature4: '智能路线优化',
      loginToSeeOrders: '登录后查看订单',
      loginNow: '立即登录',
    },
    en: {
      title: 'MARKET LINK EXPRESS',
      subtitle: 'Fast, Safe, and Reliable Same-City Delivery',
      welcome: 'Welcome',
      welcomeBack: 'Welcome Back',
      guest: 'Guest',
      placeOrder: 'Place Order',
      trackOrder: 'Track Order',
      myOrders: 'My Orders',
      profile: 'Profile',
      orderStats: 'Order Statistics',
      totalOrders: 'Total Orders',
      pendingOrders: 'Pending',
      inTransitOrders: 'In Transit',
      deliveredOrders: 'Delivered',
      services: 'Core Services',
      service1Title: 'Fast Delivery',
      service1Desc: 'On-Time: within 1 hour\nExpress: within 30 mins',
      service2Title: 'Safe & Reliable',
      service2Desc: 'Professional team\nFull insurance',
      service3Title: 'Real-time Tracking',
      service3Desc: 'Check package location\nCourier live tracking',
      service4Title: 'Transparent Pricing',
      service4Desc: 'Clear pricing rules\nNo hidden fees',
      recentOrders: 'Recent Orders',
      viewAll: 'View All',
      noOrders: 'No Orders',
      noOrdersDesc: 'You haven\'t created any orders yet\nTap below to start',
      receiver: 'Receiver',
      address: 'Address',
      status: 'Status',
      price: 'Price',
      contact: 'Contact Us',
      phone: 'Hotline',
      email: 'Business Cooperation',
      wechatId: 'WeChat ID',
      wechatValue: 'AMT349',
      viber: 'Viber',
      viberValue: '09259369349',
      gmail: 'Gmail',
      gmailValue: 'huangdelun16@gmail.com',
      features: 'Why Choose Us',
      feature1: '24/7 Customer Service',
      feature2: 'Myanmar-wide Coverage',
      feature3: 'Professional Team',
      feature4: 'Smart Route Optimization',
      loginToSeeOrders: 'Login to see orders',
      loginNow: 'Login Now',
    },
    my: {
      title: 'MARKET LINK EXPRESS',
      subtitle: 'မြန်ဆန်၊ ဘေးကင်းပြီး ယုံကြည်ရသော ပို့ဆောင်ရေး',
      welcome: 'ကြိုဆိုပါတယ်',
      welcomeBack: 'ပြန်လည်ကြိုဆိုပါတယ်',
      guest: 'ဧည့်သည်',
      placeOrder: 'အမှာစာတင်',
      trackOrder: 'ခြေရာခံ',
      myOrders: 'ကျွန်ုပ်၏အမှာစာများ',
      profile: 'ကိုယ်ရေး',
      orderStats: 'အမှာစာစာရင်းအင်း',
      totalOrders: 'စုစုပေါင်း',
      pendingOrders: 'ဆိုင်းငံ့',
      inTransitOrders: 'ပို့ဆောင်နေဆဲ',
      deliveredOrders: 'ပို့ဆောင်ပြီး',
      services: 'အဓိကဝန်ဆောင်မှုများ',
      service1Title: 'မြန်ဆန်သောပို့ဆောင်ရေး',
      service1Desc: '၁နာရီအတွင်း\n၃၀မိနစ်အမြန်ပို့',
      service2Title: 'ဘေးကင်းယုံကြည်',
      service2Desc: 'ပရော်ဖက်ရှင်နယ်အဖွဲ့\nအာမခံအပြည့်အဝ',
      service3Title: 'တိုက်ရိုက်ခြေရာခံ',
      service3Desc: 'အချိန်မရွေးစစ်ဆေးနိုင်\nမော်တော်ဆိုင်ကယ်တည်နေရာ',
      service4Title: 'ပွင့်လင်းသောစျေးနှုန်း',
      service4Desc: 'ရှင်းလင်းသောစျေးနှုန်း\nလျှို့ဝှက်ကုန်ကျစရိတ်မရှိ',
      recentOrders: 'မကြာသေးမီအမှာစာများ',
      viewAll: 'အားလုံးကြည့်',
      noOrders: 'အမှာစာမရှိသေးပါ',
      noOrdersDesc: 'သင်မှာယူမှုမရှိသေးပါ\nအောက်ပါခလုတ်ကိုနှိပ်ပြီးစတင်ပါ',
      receiver: 'လက်ခံသူ',
      address: 'လိပ်စာ',
      status: 'အခြေအနေ',
      price: 'စျေးနှုန်း',
      contact: 'ဆက်သွယ်ရန်',
      phone: 'ဖုန်း',
      email: 'စီးပွားရေးပူးပေါင်းဆောင်ရွက်မှု',
      wechatId: 'WeChat ID',
      wechatValue: 'AMT349',
      viber: 'Viber',
      viberValue: '09259369349',
      gmail: 'Gmail',
      gmailValue: 'huangdelun16@gmail.com',
      features: 'ကျွန်ုပ်တို့ကိုရွေးချယ်ရသည့်အကြောင်းရင်း',
      feature1: '၂၄နာရီဝန်ဆောင်မှု',
      feature2: 'မြန်မာတစ်နိုင်ငံလုံး',
      feature3: 'ကျွမ်းကျင်သောအဖွဲ့',
      feature4: 'စမတ်လမ်းကြောင်း',
      loginToSeeOrders: 'အမှာစာများကြည့်ရန် ဝင်ရောက်ပါ',
      loginNow: 'ယခုဝင်ရောက်',
    },
  };

  const currentT = t[language];
  const hotlineDisplay = HOTLINE_NUMBERS.map(item => item.display).join('\n');

  const handleCallHotline = () => {
    const cancelText = language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'မဆက်တော့ပါ';
    const title =
      language === 'zh'
        ? '选择拨打的客服热线'
        : language === 'en'
        ? 'Choose a hotline number'
        : 'ဖုန်းနံပါတ်ကို ရွေးချယ်ပါ';

    Alert.alert(
      title,
      '',
      [
        ...HOTLINE_NUMBERS.map(item => ({
          text: item.display,
          onPress: () => Linking.openURL(`tel:${item.tel}`),
        })),
        { text: cancelText, style: 'cancel' },
      ]
    );
  };

  // 加载用户信息和订单数据
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedUserName = await AsyncStorage.getItem('userName');
      const guestMode = await AsyncStorage.getItem('isGuest');
      
      setUserId(storedUserId);
      setUserName(storedUserName || '');
      setIsGuest(guestMode === 'true');

      // 如果是已登录用户（非访客），加载订单数据
      if (storedUserId && guestMode !== 'true') {
        await loadOrderData(storedUserId);
      }
    } catch (error) {
      errorService.handleError(error, { context: 'HomeScreen.loadUserData', silent: true });
    }
  };

  const loadOrderData = async (customerId: string) => {
    try {
      // 获取订单统计
      const stats = await packageService.getOrderStats(customerId);
      setOrderStats(stats);

      // 获取最近的订单
      const orders = await packageService.getRecentOrders(customerId, 3);
      setRecentOrders(orders as RecentOrder[]);
    } catch (error) {
      errorService.handleError(error, { context: 'HomeScreen.loadOrderData', silent: true });
    }
  };

  // 下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  // 导航处理（带加载效果）
  const handleNavigateWithLoading = async (screen: string, message: string) => {
    showLoading(message);
    await new Promise(resolve => setTimeout(resolve, 300));
    hideLoading();
    navigation.navigate(screen);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件':
        return '#f59e0b';
      case '已取件':
      case '配送中':
        return '#3b82f6';
      case '已送达':
        return '#10b981';
      case '已取消':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6', '#2563eb']}
          />
        }
      >
        {/* Hero Section with Web Background */}
        <Animated.View style={{ opacity: headerOpacity, transform: [{ scale: headerScale }] }}>
          <LinearGradient
            colors={['#b0d3e8', '#a2c3d6', '#93b4c5', '#86a4b4', '#7895a3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerBackground}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>{currentT.title}</Text>
            <Text style={styles.subtitle}>{currentT.subtitle}</Text>
            
            {/* 用户欢迎信息 */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>
                {userName ? `${currentT.welcomeBack}, ${userName}!` : 
                 isGuest ? `${currentT.welcome}, ${currentT.guest}!` : currentT.welcome}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* 订单统计卡片 */}
        {!isGuest && userId && (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>{currentT.orderStats}</Text>
            <View style={styles.statsGrid}>
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigation.navigate('MyOrders', { filterStatus: 'all' })}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statGradient}
                >
                  <Text style={styles.statNumber}>{orderStats.total}</Text>
                  <Text style={styles.statLabel}>{currentT.totalOrders}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('MyOrders', { filterStatus: '待取件' })}
              >
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statGradient}
                >
                  <Text style={styles.statNumber}>{orderStats.pending}</Text>
                  <Text style={styles.statLabel}>{currentT.pendingOrders}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('MyOrders', { filterStatus: '配送中' })}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statGradient}
                >
                  <Text style={styles.statNumber}>{orderStats.inTransit}</Text>
                  <Text style={styles.statLabel}>{currentT.inTransitOrders}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('MyOrders', { filterStatus: '已送达' })}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statGradient}
                >
                  <Text style={styles.statNumber}>{orderStats.delivered}</Text>
                  <Text style={styles.statLabel}>{currentT.deliveredOrders}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Action Cards - 4 Cards in Grid */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsGrid}>
            {/* Place Order */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleNavigateWithLoading('PlaceOrder', currentT.placeOrder + '...')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <View style={styles.quickActionIconContainer}>
                  <Text style={styles.quickActionIcon}>📦</Text>
                </View>
                <Text style={styles.quickActionText}>{currentT.placeOrder}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Track Order */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleNavigateWithLoading('TrackOrder', currentT.trackOrder + '...')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <View style={styles.quickActionIconContainer}>
                  <Text style={styles.quickActionIcon}>🔍</Text>
                </View>
                <Text style={styles.quickActionText}>{currentT.trackOrder}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* My Orders */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleNavigateWithLoading('MyOrders', currentT.myOrders + '...')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <View style={styles.quickActionIconContainer}>
                  <Text style={styles.quickActionIcon}>📋</Text>
                </View>
                <Text style={styles.quickActionText}>{currentT.myOrders}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleNavigateWithLoading('Profile', currentT.profile + '...')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <View style={styles.quickActionIconContainer}>
                  <Text style={styles.quickActionIcon}>👤</Text>
                </View>
                <Text style={styles.quickActionText}>{currentT.profile}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* 最近订单 */}
        {!isGuest && userId && (
          <View style={styles.recentOrdersContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{currentT.recentOrders}</Text>
              {recentOrders.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('MyOrders')}>
                  <Text style={styles.viewAllButton}>{currentT.viewAll} →</Text>
                </TouchableOpacity>
              )}
            </View>

            {recentOrders.length === 0 ? (
              <View style={styles.noOrdersCard}>
                <Text style={styles.noOrdersIcon}>📭</Text>
                <Text style={styles.noOrdersText}>{currentT.noOrders}</Text>
                <Text style={styles.noOrdersDesc}>{currentT.noOrdersDesc}</Text>
                <TouchableOpacity
                  style={styles.startOrderButton}
                  onPress={() => navigation.navigate('PlaceOrder')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.startOrderGradient}
                  >
                    <Text style={styles.startOrderText}>{currentT.placeOrder}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              recentOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderHeader}>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderReceiver}>
                        {currentT.receiver}: {order.receiver_name}
                      </Text>
                      <Text style={styles.orderAddress} numberOfLines={1}>
                        📍 {order.receiver_address}
                      </Text>
                    </View>
                    <View style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status) }]}>
                      <Text style={styles.orderStatusText}>{order.status}</Text>
                  </View>
                </View>
                <View style={styles.orderFooter}>
                  <Text style={styles.orderPrice}>{order.price} MMK</Text>
                  <Text style={styles.orderTime}>{formatDate(order.created_at)}</Text>
                </View>
              </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* 访客提示 */}
        {isGuest && (
          <View style={styles.guestPromptCard}>
            <Text style={styles.guestPromptIcon}>🔐</Text>
            <Text style={styles.guestPromptTitle}>{currentT.loginToSeeOrders}</Text>
            <TouchableOpacity
              style={styles.guestLoginButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.guestLoginGradient}
              >
                <Text style={styles.guestLoginText}>{currentT.loginNow}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>{currentT.services}</Text>
          <View style={styles.servicesGrid}>
            <View style={styles.serviceCard}>
              <LinearGradient
                colors={['#fbbf24', '#f59e0b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.serviceGradient}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.serviceIcon}>⚡</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.serviceTitle}>{currentT.service1Title}</Text>
                  <Text style={styles.serviceDesc}>{currentT.service1Desc}</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.serviceCard}>
              <LinearGradient
                colors={['#60a5fa', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.serviceGradient}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.serviceIcon}>🛡️</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.serviceTitle}>{currentT.service2Title}</Text>
                  <Text style={styles.serviceDesc}>{currentT.service2Desc}</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.serviceCard}>
              <LinearGradient
                colors={['#a78bfa', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.serviceGradient}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.serviceIcon}>📍</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.serviceTitle}>{currentT.service3Title}</Text>
                  <Text style={styles.serviceDesc}>{currentT.service3Desc}</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.serviceCard}>
              <LinearGradient
                colors={['#34d399', '#10b981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.serviceGradient}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.serviceIcon}>💰</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.serviceTitle}>{currentT.service4Title}</Text>
                  <Text style={styles.serviceDesc}>{currentT.service4Desc}</Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Why Choose Us Section */}
        <View style={styles.whyChooseUsSection}>
          <Text style={styles.sectionTitle}>{currentT.features}</Text>
          <View style={styles.whyChooseUsCard}>
            {[currentT.feature1, currentT.feature2, currentT.feature3, currentT.feature4].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>{currentT.contact}</Text>
          <View style={styles.contactGrid}>
            <TouchableOpacity
              style={styles.contactCard}
              onPress={handleCallHotline}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.contactGradient}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.contactIcon}>📞</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.contactLabel}>{currentT.phone}</Text>
                  <Text style={styles.contactValue}>{hotlineDisplay}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactCard}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#fa709a', '#fee140']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.contactGradient}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.contactIcon}>🤝</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.contactLabel}>{currentT.email}</Text>
                  <View style={styles.businessInfoContainer}>
                    <View style={styles.businessRow}>
                      <Text style={styles.contactSubLabel}>{currentT.wechatId}: </Text>
                      <Text style={styles.contactSubValue}>{currentT.wechatValue}</Text>
                    </View>
                    <View style={styles.businessRow}>
                      <Text style={styles.contactSubLabel}>{currentT.viber}: </Text>
                      <Text style={styles.contactSubValue}>{currentT.viberValue}</Text>
                    </View>
                    <View style={styles.businessRow}>
                      <Text style={styles.contactSubLabel}>{currentT.gmail}: </Text>
                      <Text style={styles.contactSubValue}>{currentT.gmailValue}</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  headerBackground: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    padding: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginTop: -18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: (width - 48) / 2,
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 56) / 2,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionGradient: {
    padding: 20,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
  },
  quickActionIconContainer: {
    marginBottom: 12,
  },
  quickActionIcon: {
    fontSize: 36,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  recentOrdersContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  noOrdersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noOrdersIcon: {
    fontSize: 58,
    marginBottom: 16,
  },
  noOrdersText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  noOrdersDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  startOrderButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startOrderGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  startOrderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderReceiver: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  orderAddress: {
    fontSize: 14,
    color: '#64748b',
  },
  orderStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  orderTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  guestPromptCard: {
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  guestPromptIcon: {
    fontSize: 58,
    marginBottom: 16,
  },
  guestPromptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  guestLoginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  guestLoginGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  guestLoginText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  servicesSection: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  servicesGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  serviceCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  serviceGradient: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  serviceIcon: {
    fontSize: 26,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
    fontWeight: '500',
  },
  whyChooseUsSection: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  whyChooseUsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  featureIcon: {
    fontSize: 18,
    color: '#10b981',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 15,
    color: '#1e293b',
    flex: 1,
  },
  contactSection: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  contactGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  contactCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  contactGradient: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  contactIcon: {
    fontSize: 26,
  },
  textContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 4,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  businessInfoContainer: {
    marginTop: 2,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactSubLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  contactSubValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
