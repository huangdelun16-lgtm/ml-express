import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { LinearGradient } from 'expo-linear-gradient';
import { packageService } from '../services/supabase';
import { errorService } from '../services/ErrorService';
import { theme } from '../config/theme';
import { APP_CONFIG } from '../config/constants';
import { analytics, EventType } from '../services/AnalyticsService';

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
  
  useEffect(() => {
    analytics.trackPageView('HomeScreen');
  }, []);

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
  const bannerScrollRef = useRef<ScrollView>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [selectedBannerIndex, setSelectedBannerIndex] = useState(0);
  const TOTAL_BANNERS = 4;

  // 自动轮播逻辑
  useEffect(() => {
    if (isBannerPaused) return; // 如果暂停，不执行轮播

    const timer = setInterval(() => {
      let nextIndex = currentBannerIndex + 1;
      if (nextIndex >= 4) { // 总共4张卡片
        nextIndex = 0;
      }
      
      if (bannerScrollRef.current) {
        bannerScrollRef.current.scrollTo({
          x: nextIndex * (width - 32), // 宽度需要计算 padding
          animated: true,
        });
        setCurrentBannerIndex(nextIndex);
      }
    }, 5000); // 5秒切换

    return () => clearInterval(timer);
  }, [currentBannerIndex, isBannerPaused]);

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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Text style={styles.title}>{currentT.title}</Text>
              <Text style={[styles.title, { fontStyle: 'italic', marginLeft: 8, fontSize: 14 }]}>Delivery Service</Text>
            </View>
            <Text style={styles.subtitle}>{currentT.subtitle}</Text>
            
            {/* 用户欢迎信息 */}
            <View style={styles.welcomeContainer} accessibilityRole="header">
              <Text style={styles.welcomeText}>
                {userName ? `${currentT.welcomeBack}, ${userName}!` : 
                 isGuest ? `${currentT.welcome}, ${currentT.guest}!` : currentT.welcome}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* 3D 风格广告横幅 (自动轮播) */}
        <View style={styles.bannerContainer}>
          {/* 广告卡片指示器 */}
          <View style={styles.bannerIndicatorContainer}>
            <Text style={styles.bannerIndicatorText}>
              {currentBannerIndex + 1} / {TOTAL_BANNERS}
            </Text>
            <View style={styles.bannerIndicatorDots}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.bannerIndicatorDot,
                    currentBannerIndex === index && styles.bannerIndicatorDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
          
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            snapToInterval={width - 32}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            style={styles.bannerScroll}
            contentContainerStyle={{ width: (width - 32) * 4 }}
          >
            {/* 第一张卡片：地图追踪 */}
            <View style={styles.bannerCardWrapper}>
              <TouchableOpacity 
                style={styles.bannerCard}
                activeOpacity={0.9}
                onPressIn={() => setIsBannerPaused(true)}
                onPressOut={() => setIsBannerPaused(false)}
                onPress={() => {
                  setSelectedBannerIndex(0);
                  setShowBannerModal(true);
                }}
              >
                <LinearGradient
                  colors={['#3b82f6', '#60a5fa', '#ffffff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  locations={[0, 0.6, 1]}
                  style={styles.bannerGradient}
                >
                  <View style={styles.citySilhouette} />
                  <View style={styles.bannerContentRow}>
                    <View style={styles.bannerTextArea}>
                      <Image 
                        source={require('../../assets/logo.png')} 
                        style={styles.bannerLogoIcon} 
                        resizeMode="contain"
                      />
                      <Text style={styles.bannerHeadline}>曼德勒同城快递{'\n'}极速送达</Text>
                      <Text style={styles.bannerSubHeadline}>5分钟接单 · 实时定位</Text>
                      <Text style={styles.bannerBurmeseText}>
                        မန္တလေးမြို့တွင်း မြန်ဆန်စွာပို့ဆောင်ပေးခြင်း
                      </Text>
                    </View>
                    <View style={styles.phoneMockupContainer}>
                      <View style={styles.phoneMockup}>
                        <View style={styles.phoneScreen}>
                          <View style={styles.mapRoute} />
                          <View style={styles.mapPinSender}><Text style={{fontSize: 10}}>🏠</Text></View>
                          <View style={styles.mapPinRider}><Text style={{fontSize: 12}}>🛵</Text></View>
                          <View style={styles.mapPinReceiver}><Text style={{fontSize: 10}}>📍</Text></View>
                          <View style={styles.floatingCard}>
                            <Text style={{fontSize: 8, fontWeight: 'bold', color: '#333'}}>正在配送中...</Text>
                            <Text style={{fontSize: 7, color: '#666'}}>预计 15 分钟送达</Text>
                          </View>
                        </View>
                        <LinearGradient
                          colors={['rgba(255,255,255,0.4)', 'transparent', 'rgba(255,255,255,0.1)']}
                          style={styles.phoneReflection}
                        />
                      </View>
                      <View style={[styles.floatingIcon, { top: -10, right: -10 }]}>
                        <Text style={{fontSize: 24}}>📦</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* 第二张卡片：地址填写 (新设计) */}
            <View style={styles.bannerCardWrapper}>
              <TouchableOpacity 
                style={styles.bannerCard}
                activeOpacity={0.9}
                onPressIn={() => setIsBannerPaused(true)}
                onPressOut={() => setIsBannerPaused(false)}
                onPress={() => {
                  setSelectedBannerIndex(1);
                  setShowBannerModal(true);
                }}
              >
                <LinearGradient
                  colors={['#f3f4f6', '#ffffff', '#e5e7eb']} // 浅灰色调
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bannerGradient}
                >
                  {/* 曼德勒皇宫剪影背景 (更柔和) */}
                  <View style={[styles.citySilhouette, { backgroundColor: 'rgba(0,0,0,0.05)', height: 80 }]} />
                  
                  <View style={styles.bannerContentRow}>
                    <View style={styles.bannerTextArea}>
                      <Text style={[styles.bannerHeadline, { color: '#1f2937', marginTop: 4 }]}>一键填写地址{'\n'}极速上门取件</Text>
                      <Text style={[styles.bannerSubHeadline, { color: '#4b5563' }]}>实时定位 · 全城服务 · 30分钟送达</Text>
                      <Text style={[styles.bannerBurmeseText, { color: '#6b7280' }]}>
                        မှန်ကန်သောလိပ်စာ ထည့်သွင်းလိုက်ရုံဖြင့် အမြန်ဆုံးလာရောက်ယူဆောင်ပေးခြင်း
                      </Text>
                    </View>

                    <View style={styles.phoneMockupContainer}>
                      {/* 3D 手机 (地址填写页面风格) */}
                      <View style={[styles.phoneMockup, { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }]}>
                        <View style={[styles.phoneScreen, { padding: 8 }]}>
                          {/* 模拟输入框 */}
                          <View style={{height: 20, backgroundColor: 'white', borderRadius: 4, marginBottom: 6, borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', paddingHorizontal: 4}}>
                            <Text style={{fontSize: 6, color: '#9ca3af'}}>📍 取件地址</Text>
                          </View>
                          <View style={{height: 20, backgroundColor: 'white', borderRadius: 4, marginBottom: 6, borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', paddingHorizontal: 4}}>
                            <Text style={{fontSize: 6, color: '#9ca3af'}}>🏠 送达地址</Text>
                          </View>
                          <View style={{height: 30, backgroundColor: '#3b82f6', borderRadius: 4, marginTop: 4, alignItems: 'center', justifyContent: 'center'}}>
                            <Text style={{fontSize: 8, color: 'white', fontWeight: 'bold'}}>确认下单</Text>
                          </View>
                        </View>
                        <LinearGradient
                          colors={['rgba(255,255,255,0.6)', 'transparent', 'rgba(255,255,255,0.2)']}
                          style={styles.phoneReflection}
                        />
                      </View>
                      {/* 3D 浮动元素 */}
                      <View style={[styles.floatingIcon, { top: 0, right: -15, backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                        <Text style={{fontSize: 20}}>📍</Text>
                      </View>
                      <View style={[styles.floatingIcon, { bottom: 20, left: -15, backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                        <Text style={{fontSize: 18}}>📝</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* 第三张卡片：上线促销 (新设计) */}
            <View style={styles.bannerCardWrapper}>
              <TouchableOpacity 
                style={styles.bannerCard}
                activeOpacity={0.9}
                onPressIn={() => setIsBannerPaused(true)}
                onPressOut={() => setIsBannerPaused(false)}
                onPress={() => {
                  setSelectedBannerIndex(2);
                  setShowBannerModal(true);
                }}
              >
                <LinearGradient
                  colors={['#e2e8f0', '#f8fafc', '#ffffff']} // 极简企业灰白调
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bannerGradient}
                >
                  <View style={styles.bannerContentRow}>
                    <View style={styles.bannerTextArea}>
                      <View style={{
                        backgroundColor: '#1e293b', 
                        paddingHorizontal: 8, 
                        paddingVertical: 2, 
                        borderRadius: 4, 
                        alignSelf: 'flex-start',
                        marginBottom: 6
                      }}>
                        <Text style={{color: '#fff', fontSize: 10, fontWeight: 'bold'}}>NEW LAUNCH</Text>
                      </View>
                      
                      <View style={{marginVertical: 6}}>
                        <Text style={{fontSize: 18, fontWeight: 'bold', color: '#2563eb'}}>MDY同城2000MMK/一趟</Text>
                        <Text style={{fontSize: 10, color: '#64748b'}}>曼德勒市内统一价 · 活动仅1个月</Text>
                      </View>

                      <View style={{gap: 2}}>
                        <Text style={{fontSize: 10, color: '#475569'}}>📅 2026年1月1日正式启动</Text>
                        <Text style={{fontSize: 9, color: '#94a3b8', fontStyle: 'italic'}}>Software စမ်းသပ်အသုံးပြုကာလအတွင်း MDY မြို့တွင်း 2000MMK/တစ်ကြိမ်</Text>
                      </View>
                    </View>

                    <View style={styles.phoneMockupContainer}>
                      {/* 3D 手机 (浅色极简风格) */}
                      <View style={[styles.phoneMockup, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}>
                        <View style={[styles.phoneScreen, { backgroundColor: '#ffffff', padding: 10, alignItems: 'center', justifyContent: 'center' }]}>
                          <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 10}}>
                            <Text style={{fontSize: 20}}>🚀</Text>
                          </View>
                          <Text style={{fontSize: 10, fontWeight: 'bold', color: '#1e293b', textAlign: 'center'}}>GRAND OPENING</Text>
                          <Text style={{fontSize: 8, color: '#64748b', textAlign: 'center', marginTop: 2}}>Jan 1, 2026</Text>
                          
                          <View style={{width: '100%', height: 1, backgroundColor: '#e2e8f0', marginVertical: 8}} />
                          
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                            <Text style={{fontSize: 12}}>💰</Text>
                            <Text style={{fontSize: 12, fontWeight: 'bold', color: '#2563eb'}}>2000 Ks</Text>
                          </View>
                        </View>
                        <LinearGradient
                          colors={['rgba(255,255,255,0.8)', 'transparent', 'rgba(255,255,255,0.1)']}
                          style={styles.phoneReflection}
                        />
                      </View>
                      {/* 3D 浮动元素 - 促销标签 */}
                      <View style={[styles.floatingIcon, { top: -5, right: -10, backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }]}>
                        <Text style={{fontSize: 8, color: 'white', fontWeight: 'bold'}}>-50%</Text>
                      </View>
                      <View style={[styles.floatingIcon, { bottom: 15, left: -15, backgroundColor: '#ffffff', padding: 4, shadowColor: '#000', shadowOpacity: 0.1, elevation: 2 }]}>
                        <Text style={{fontSize: 16}}>🎉</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* 第四张卡片：新用户注册推广 */}
            <View style={styles.bannerCardWrapper}>
              <TouchableOpacity 
                style={styles.bannerCard}
                activeOpacity={0.9}
                onPressIn={() => setIsBannerPaused(true)}
                onPressOut={() => setIsBannerPaused(false)}
                onPress={() => {
                  setSelectedBannerIndex(3);
                  setShowBannerModal(true);
                }}
              >
                <LinearGradient
                  colors={['#ffffff', '#f8fafc', '#f1f5f9']} // 白色背景，极简风格
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bannerGradient}
                >
                  {/* 背景装饰线条 */}
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.05,
                  }}>
                    <View style={{
                      position: 'absolute',
                      top: 20,
                      left: 20,
                      width: 100,
                      height: 1,
                      backgroundColor: '#2563eb',
                      transform: [{ rotate: '45deg' }],
                    }} />
                    <View style={{
                      position: 'absolute',
                      bottom: 30,
                      right: 30,
                      width: 80,
                      height: 1,
                      backgroundColor: '#f59e0b',
                      transform: [{ rotate: '-45deg' }],
                    }} />
                  </View>

                  <View style={styles.bannerContentRow}>
                    <View style={styles.bannerTextArea}>
                      {/* 主标题 */}
                      <Text style={{
                        fontSize: 22,
                        fontWeight: 'bold',
                        color: '#1e293b',
                        marginBottom: 12,
                        lineHeight: 28,
                      }}>新用户现在即可开始下单！</Text>

                      {/* 副文本 */}
                      <View style={{ gap: 8, marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                          <Text style={{ fontSize: 18, lineHeight: 20 }}>🌐</Text>
                          <Text style={{ fontSize: 12, color: '#475569', lineHeight: 16, flex: 1 }}>
                            Web 上注册账号即可直接下单，无需下载软件
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                          <Text style={{ fontSize: 18, lineHeight: 20 }}>📱</Text>
                          <Text style={{ fontSize: 12, color: '#475569', lineHeight: 16, flex: 1 }}>
                            想要更方便？下载 App 解锁更快捷的下单方式、更流畅的操作体验、更精准的定位追踪
                          </Text>
                        </View>
                      </View>

                      {/* 缅文说明 - 与中文对齐 */}
                      <View style={{ gap: 6, marginTop: 8, paddingLeft: 24 }}>
                        <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16, fontStyle: 'italic' }}>
                          Webပေါ်မှတ်ပုံတင်ပြီး လျင်မြန်စွာ Orderတင်နိုင်သည်
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16, fontStyle: 'italic' }}>
                          AppကိုDownload အသုံးပြုခြင်းဖြင့် ပိုမိုလုံခြုံလျင်မြန်သော အတွေအကြုံကိုရယူလိုက်ပါ
                        </Text>
                      </View>
                    </View>

                    <View style={styles.phoneMockupContainer}>
                      {/* 功能图标展示 */}
                      <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        {/* Web浏览器图标 */}
                        <View style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#eff6ff',
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#2563eb',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 3,
                        }}>
                          <Text style={{ fontSize: 24 }}>🌐</Text>
                        </View>
                        {/* 手机图标 */}
                        <View style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#fef3c7',
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#f59e0b',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 3,
                        }}>
                          <Text style={{ fontSize: 24 }}>📱</Text>
                        </View>
                        {/* 配送箱图标 */}
                        <View style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#f0fdf4',
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#10b981',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 3,
                        }}>
                          <Text style={{ fontSize: 24 }}>📦</Text>
                        </View>
                        {/* 位置追踪图标 */}
                        <View style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#fef2f2',
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#ef4444',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 3,
                        }}>
                          <Text style={{ fontSize: 24 }}>📍</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* 广告详情Modal */}
        <Modal
          visible={showBannerModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowBannerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowBannerModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              
              <ScrollView 
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={true}
              >
                {selectedBannerIndex === 0 && (
                  <View style={styles.modalBannerContent}>
                    <LinearGradient
                      colors={['#3b82f6', '#60a5fa', '#ffffff']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      locations={[0, 0.6, 1]}
                      style={styles.modalBannerGradient}
                    >
                      <Image 
                        source={require('../../assets/logo.png')} 
                        style={styles.modalBannerLogo} 
                        resizeMode="contain"
                      />
                      <Text style={styles.modalBannerHeadline}>曼德勒同城快递{'\n'}极速送达</Text>
                      <Text style={styles.modalBannerSubHeadline}>5分钟接单 · 实时定位</Text>
                      <Text style={styles.modalBannerBurmeseText}>
                        မန္တလေးမြို့တွင်း မြန်ဆန်စွာပို့ဆောင်ပေးခြင်း
                      </Text>
                      <Text style={styles.modalBannerDescription}>
                        通过我们的实时地图追踪系统，您可以随时查看包裹的配送状态。专业的配送团队确保您的包裹安全、快速地送达目的地。
                      </Text>
                    </LinearGradient>
                  </View>
                )}
                
                {selectedBannerIndex === 1 && (
                  <View style={styles.modalBannerContent}>
                    <LinearGradient
                      colors={['#f3f4f6', '#ffffff', '#e5e7eb']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalBannerGradient}
                    >
                      <Text style={[styles.modalBannerHeadline, { color: '#1f2937' }]}>一键填写地址{'\n'}极速上门取件</Text>
                      <Text style={[styles.modalBannerSubHeadline, { color: '#4b5563' }]}>实时定位 · 全城服务 · 30分钟送达</Text>
                      <Text style={[styles.modalBannerBurmeseText, { color: '#6b7280' }]}>
                        မှန်ကန်သောလိပ်စာ ထည့်သွင်းလိုက်ရုံဖြင့် အမြန်ဆုံးလာရောက်ယူဆောင်ပေးခြင်း
                      </Text>
                      <Text style={[styles.modalBannerDescription, { color: '#475569' }]}>
                        只需简单填写取件和送达地址，我们的系统会自动为您匹配最近的配送员。智能路线规划确保最快速度完成配送任务。
                      </Text>
                    </LinearGradient>
                  </View>
                )}
                
                {selectedBannerIndex === 2 && (
                  <View style={styles.modalBannerContent}>
                    <LinearGradient
                      colors={['#e2e8f0', '#f8fafc', '#ffffff']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalBannerGradient}
                    >
                      <View style={styles.modalBannerTag}>
                        <Text style={styles.modalBannerTagText}>NEW LAUNCH</Text>
                      </View>
                      <Text style={[styles.modalBannerHeadline, { color: '#2563eb', fontSize: 24 }]}>MDY同城2000MMK/一趟</Text>
                      <Text style={[styles.modalBannerSubHeadline, { color: '#64748b' }]}>曼德勒市内统一价 · 活动仅1个月</Text>
                      <Text style={[styles.modalBannerBurmeseText, { color: '#475569' }]}>
                        📅 2026年1月1日正式启动
                      </Text>
                      <Text style={[styles.modalBannerDescription, { color: '#64748b', fontStyle: 'italic' }]}>
                        Software စမ်းသပ်အသုံးပြုကာလအတွင်း MDY မြို့တွင်း 2000MMK/တစ်ကြိမ်
                      </Text>
                      <Text style={[styles.modalBannerDescription, { color: '#475569', marginTop: 12 }]}>
                        为庆祝新系统上线，我们推出限时优惠活动。曼德勒市内所有订单统一价格2000缅币，无论距离远近，让您享受最优惠的配送服务。
                      </Text>
                    </LinearGradient>
                  </View>
                )}
                
                {selectedBannerIndex === 3 && (
                  <View style={styles.modalBannerContent}>
                    <LinearGradient
                      colors={['#ffffff', '#f8fafc', '#f1f5f9']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalBannerGradient}
                    >
                      <Text style={[styles.modalBannerHeadline, { color: '#1e293b', fontSize: 24 }]}>新用户现在即可开始下单！</Text>
                      
                      <View style={styles.modalBannerFeatureList}>
                        <View style={styles.modalBannerFeatureItem}>
                          <Text style={styles.modalBannerFeatureIcon}>🌐</Text>
                          <View style={styles.modalBannerFeatureText}>
                            <Text style={[styles.modalBannerDescription, { color: '#475569', marginBottom: 4 }]}>
                              Web 上注册账号即可直接下单，无需下载软件
                            </Text>
                            <Text style={[styles.modalBannerBurmeseText, { color: '#64748b', fontSize: 12 }]}>
                              Webပေါ်မှတ်ပုံတင်ပြီး လျင်မြန်စွာ Orderတင်နိုင်သည်
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.modalBannerFeatureItem}>
                          <Text style={styles.modalBannerFeatureIcon}>📱</Text>
                          <View style={styles.modalBannerFeatureText}>
                            <Text style={[styles.modalBannerDescription, { color: '#475569', marginBottom: 4 }]}>
                              想要更方便？下载 App 解锁更快捷的下单方式、更流畅的操作体验、更精准的定位追踪
                            </Text>
                            <Text style={[styles.modalBannerBurmeseText, { color: '#64748b', fontSize: 12 }]}>
                              AppကိုDownload အသုံးပြုခြင်းဖြင့် ပိုမိုလုံခြုံလျင်မြန်သော အတွေအကြုံကိုရယူလိုက်ပါ
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <Text style={[styles.modalBannerDescription, { color: '#64748b', marginTop: 16, textAlign: 'center' }]}>
                        无论您选择网页版还是App，都能享受我们专业的配送服务。立即注册，开始您的便捷配送之旅！
                      </Text>
                    </LinearGradient>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Quick Action Cards - 4 Cards in Grid */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsGrid}>
            {/* Place Order */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleNavigateWithLoading('PlaceOrder', currentT.placeOrder + '...')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={currentT.placeOrder}
              accessibilityHint="跳转到下单页面"
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
              accessibilityRole="button"
              accessibilityLabel={currentT.trackOrder}
              accessibilityHint="跳转到订单追踪页面"
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
              accessibilityRole="button"
              accessibilityLabel={currentT.myOrders}
              accessibilityHint="查看我的订单列表"
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
              accessibilityRole="button"
              accessibilityLabel={currentT.profile}
              accessibilityHint="查看个人中心"
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
                  accessibilityRole="button"
                  accessibilityLabel={`订单 ${order.id}, 收件人 ${order.receiver_name}, 状态 ${order.status}`}
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
              accessibilityRole="button"
              accessibilityLabel={`${currentT.phone}: ${hotlineDisplay}`}
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
  bannerContainer: {
    paddingHorizontal: 16,
    marginTop: -30,
    marginBottom: 16,
  },
  bannerIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  bannerIndicatorText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  bannerIndicatorDots: {
    flexDirection: 'row',
    gap: 6,
  },
  bannerIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  bannerIndicatorDotActive: {
    backgroundColor: '#3b82f6',
    width: 20,
  },
  bannerScroll: {
    overflow: 'hidden',
  },
  bannerCardWrapper: {
    width: width - 32,
    paddingRight: 0,
    overflow: 'visible',
  },
  bannerCard: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    ...theme.shadows.medium,
    elevation: 10,
  },
  bannerGradient: {
    flex: 1,
    padding: 20,
    position: 'relative',
  },
  citySilhouette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 50,
    opacity: 0.5,
  },
  bannerContentRow: {
    flexDirection: 'row',
    height: '100%',
  },
  bannerTextArea: {
    flex: 1.2,
    justifyContent: 'center',
    zIndex: 2,
  },
  bannerLogoIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
  },
  bannerBrandName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  bannerHeadline: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerSubHeadline: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 6,
    lineHeight: 14,
    fontWeight: '500',
  },
  bannerBurmeseText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 12,
    lineHeight: 14,
    fontStyle: 'italic',
  },
  bannerCtaButton: {
    backgroundColor: '#fbbf24', // 黄色按钮
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerCtaText: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '800',
  },
  
  // 3D 手机模型样式
  phoneMockupContainer: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  phoneMockup: {
    width: 100,
    height: 210,
    backgroundColor: '#1f2937', // 手机边框
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#374151',
    transform: [
      { perspective: 800 },
      { rotateY: '-15deg' },
      { rotateX: '10deg' },
      { rotateZ: '-5deg' },
    ],
    shadowColor: '#000',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    margin: 3,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  phoneReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  mapRoute: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 40,
    height: 60,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  mapPinSender: {
    position: 'absolute',
    top: 35,
    left: 15,
  },
  mapPinReceiver: {
    position: 'absolute',
    bottom: 40,
    right: 20,
  },
  mapPinRider: {
    position: 'absolute',
    top: 80,
    left: 40,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 2,
    elevation: 2,
  },
  floatingCard: {
    position: 'absolute',
    bottom: 10,
    left: 5,
    right: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 6,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  floatingIcon: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 5,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
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
  // Modal样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    ...theme.shadows.large,
    elevation: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: 'bold',
  },
  modalScrollView: {
    flex: 1,
  },
  modalBannerContent: {
    width: '100%',
    minHeight: 400,
  },
  modalBannerGradient: {
    flex: 1,
    padding: 24,
    paddingTop: 50,
  },
  modalBannerLogo: {
    width: 60,
    height: 60,
    marginBottom: 16,
    alignSelf: 'center',
  },
  modalBannerHeadline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 36,
  },
  modalBannerSubHeadline: {
    fontSize: 18,
    color: '#4b5563',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBannerBurmeseText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  modalBannerDescription: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 8,
  },
  modalBannerTag: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalBannerTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalBannerFeatureList: {
    marginTop: 20,
    gap: 16,
  },
  modalBannerFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalBannerFeatureIcon: {
    fontSize: 24,
    lineHeight: 24,
  },
  modalBannerFeatureText: {
    flex: 1,
  },
});
