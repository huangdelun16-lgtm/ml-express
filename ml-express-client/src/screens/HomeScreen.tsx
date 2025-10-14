import React, { useState } from 'react';
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
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = new Animated.Value(0);

  // 下拉刷新处理
  const onRefresh = async () => {
    setRefreshing(true);
    showLoading('刷新数据中...');
    
    // 模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    hideLoading();
    setRefreshing(false);
  };

  // 导航处理（带加载效果）
  const handleNavigateWithLoading = async (screen: string, message: string) => {
    showLoading(message);
    await new Promise(resolve => setTimeout(resolve, 500));
    hideLoading();
    navigation.navigate(screen);
  };

  const t = {
    zh: {
      title: '缅甸同城快递',
      subtitle: '快速、安全、可靠的同城配送服务',
      welcome: '欢迎使用',
      placeOrder: '立即下单',
      trackOrder: '追踪订单',
      myOrders: '我的订单',
      profile: '个人中心',
      services: '核心服务',
      service1Title: '快速配送',
      service1Desc: '准时达1小时内送达\n急送达30分钟内送达\n定时达按您指定时间',
      service2Title: '安全可靠',
      service2Desc: '专业配送团队\n全程保险保障\n包裹实时监控',
      service3Title: '实时追踪',
      service3Desc: '随时查看包裹位置\n配送员实时定位\n送达及时通知',
      service4Title: '价格透明',
      service4Desc: '明码标价计费\n无隐藏费用\n多种支付方式',
      features: '为什么选择我们？',
      feature1: '7×24小时客服',
      feature2: '覆盖全缅甸主要城市',
      feature3: '专业配送团队',
      feature4: '智能路线优化',
      feature5: '包裹保险',
      feature6: '实时客服支持',
      recentOrders: '最近订单',
      viewAll: '查看全部',
      noOrders: '暂无订单',
      contact: '联系我们',
      phone: '客服热线',
      email: '商务合作',
      callNow: '立即拨打',
      sendEmail: '发送邮件',
    },
    en: {
      title: 'Myanmar City Express',
      subtitle: 'Fast, Safe, and Reliable Same-City Delivery',
      welcome: 'Welcome',
      placeOrder: 'Place Order',
      trackOrder: 'Track Order',
      myOrders: 'My Orders',
      profile: 'Profile',
      services: 'Core Services',
      service1Title: 'Fast Delivery',
      service1Desc: 'On-Time: within 1 hour\nExpress: within 30 mins\nScheduled: your time',
      service2Title: 'Safe & Reliable',
      service2Desc: 'Professional team\nFull insurance\nReal-time monitoring',
      service3Title: 'Real-time Tracking',
      service3Desc: 'Check package location\nCourier live tracking\nDelivery notifications',
      service4Title: 'Transparent Pricing',
      service4Desc: 'Clear pricing rules\nNo hidden fees\nMultiple payments',
      features: 'Why Choose Us?',
      feature1: '24/7 Customer Service',
      feature2: 'Myanmar-wide Coverage',
      feature3: 'Professional Team',
      feature4: 'Smart Route Optimization',
      feature5: 'Package Insurance',
      feature6: 'Live Support',
      recentOrders: 'Recent Orders',
      viewAll: 'View All',
      noOrders: 'No Orders',
      contact: 'Contact Us',
      phone: 'Hotline',
      email: 'Business',
      callNow: 'Call Now',
      sendEmail: 'Send Email',
    },
    my: {
      title: 'မြန်မာမြို့တွင်းအမြန်ပို့ဆောင်ရေး',
      subtitle: 'မြန်ဆန်၊ ဘေးကင်းပြီး ယုံကြည်စိတ်ချရသော ဝန်ဆောင်မှု',
      welcome: 'ကြိုဆိုပါတယ်',
      placeOrder: 'အမှာစာတင်',
      trackOrder: 'ခြေရာခံ',
      myOrders: 'ကျွန်ုပ်၏အမှာစာများ',
      profile: 'ကိုယ်ရေးအချက်အလက်',
      services: 'အဓိကဝန်ဆောင်မှုများ',
      service1Title: 'မြန်ဆန်သောပို့ဆောင်ရေး',
      service1Desc: '၁နာရီအတွင်း\n၃၀မိနစ်အမြန်ပို့\nသင်သတ်မှတ်သောအချိန်',
      service2Title: 'ဘေးကင်းယုံကြည်',
      service2Desc: 'ပရော်ဖက်ရှင်နယ်အဖွဲ့\nအာမခံအပြည့်အဝ\nတိုက်ရိုက်စောင့်ကြည့်',
      service3Title: 'တိုက်ရိုက်ခြေရာခံ',
      service3Desc: 'အချိန်မရွေးစစ်ဆေးနိုင်\nမော်တော်ဆိုင်ကယ်တည်နေရာ\nသတင်းအကြောင်းကြားချက်',
      service4Title: 'ပွင့်လင်းသောစျေးနှုန်း',
      service4Desc: 'ရှင်းလင်းသောစျေးနှုန်း\nလျှို့ဝှက်ကုန်ကျစရိတ်မရှိ\nငွေပေးချေမှုနည်းလမ်းများစွာ',
      features: 'ကျွန်ုပ်တို့ကိုရွေးချယ်ရသည့်အကြောင်းရင်း',
      feature1: '၂၄နာရီဝန်ဆောင်မှု',
      feature2: 'မြန်မာတစ်နိုင်ငံလုံး',
      feature3: 'ကျွမ်းကျင်သောအဖွဲ့',
      feature4: 'စမတ်လမ်းကြောင်း',
      feature5: 'အာမခံ',
      feature6: 'တိုက်ရိုက်ပံ့ပိုး',
      recentOrders: 'မကြာသေးမီအမှာစာများ',
      viewAll: 'အားလုံးကြည့်',
      noOrders: 'အမှာစာမရှိ',
      contact: 'ဆက်သွယ်ရန်',
      phone: 'ဖောက်သည်ဝန်ဆောင်မှု',
      email: 'စီးပွားရေး',
      callNow: 'ခေါ်ဆိုပါ',
      sendEmail: 'အီးမေးလ်ပို့ပါ',
    },
  };

  const currentT = t[language];

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
            style={styles.heroSection}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo-large.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.welcomeText}>{currentT.welcome}</Text>
            <Text style={styles.title}>{currentT.title}</Text>
            <Text style={styles.subtitle}>{currentT.subtitle}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Quick Action Cards - 4 Cards in Grid */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsGrid}>
            {/* Place Order */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleNavigateWithLoading('PlaceOrder', '正在打开下单页面...')}
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
              onPress={() => handleNavigateWithLoading('TrackOrder', '正在打开追踪页面...')}
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
              onPress={() => handleNavigateWithLoading('MyOrders', '正在加载订单列表...')}
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
              onPress={() => handleNavigateWithLoading('Profile', '正在打开个人中心...')}
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

        {/* Services Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{currentT.services}</Text>
          
          <View style={styles.servicesGrid}>
            {/* Service 1 */}
            <View style={styles.serviceCard}>
              <LinearGradient
                colors={['#fef3c7', '#fde68a', '#fbbf24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.serviceGradient}
              >
                <View style={styles.serviceIconBg}>
                  <Text style={styles.serviceIcon}>⚡</Text>
                </View>
                <Text style={styles.serviceTitle}>{currentT.service1Title}</Text>
                <Text style={styles.serviceDesc}>{currentT.service1Desc}</Text>
              </LinearGradient>
            </View>

            {/* Service 2 */}
            <View style={styles.serviceCard}>
              <LinearGradient
                colors={['#dbeafe', '#bfdbfe', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.serviceGradient}
              >
                <View style={styles.serviceIconBg}>
                  <Text style={styles.serviceIcon}>🛡️</Text>
                </View>
                <Text style={styles.serviceTitle}>{currentT.service2Title}</Text>
                <Text style={styles.serviceDesc}>{currentT.service2Desc}</Text>
              </LinearGradient>
            </View>

            {/* Service 3 */}
            <View style={styles.serviceCard}>
              <LinearGradient
                colors={['#dcfce7', '#bbf7d0', '#4ade80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.serviceGradient}
              >
                <View style={styles.serviceIconBg}>
                  <Text style={styles.serviceIcon}>📍</Text>
                </View>
                <Text style={styles.serviceTitle}>{currentT.service3Title}</Text>
                <Text style={styles.serviceDesc}>{currentT.service3Desc}</Text>
              </LinearGradient>
            </View>

            {/* Service 4 */}
            <View style={styles.serviceCard}>
              <LinearGradient
                colors={['#fce7f3', '#fbcfe8', '#f472b6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.serviceGradient}
              >
                <View style={styles.serviceIconBg}>
                  <Text style={styles.serviceIcon}>💰</Text>
                </View>
                <Text style={styles.serviceTitle}>{currentT.service4Title}</Text>
                <Text style={styles.serviceDesc}>{currentT.service4Desc}</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Features Section */}
        <View style={[styles.section, styles.featuresSection]}>
          <Text style={styles.sectionTitle}>{currentT.features}</Text>
          
          <View style={styles.featuresGrid}>
            {[
              { icon: '⏰', text: currentT.feature1, color: '#3b82f6' },
              { icon: '🗺️', text: currentT.feature2, color: '#10b981' },
              { icon: '👥', text: currentT.feature3, color: '#8b5cf6' },
              { icon: '🚀', text: currentT.feature4, color: '#f59e0b' },
              { icon: '📋', text: currentT.feature5, color: '#ef4444' },
              { icon: '💬', text: currentT.feature6, color: '#06b6d4' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{currentT.contact}</Text>
          
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('tel:+959123456789')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb', '#1d4ed8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.contactGradient}
            >
              <View style={styles.contactIconContainer}>
                <Text style={styles.contactIcon}>📞</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{currentT.phone}</Text>
                <Text style={styles.contactValue}>+95 912 345 6789</Text>
              </View>
              <View style={styles.contactArrow}>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('mailto:support@mlexpress.com')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed', '#6d28d9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.contactGradient}
            >
              <View style={styles.contactIconContainer}>
                <Text style={styles.contactIcon}>📧</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{currentT.email}</Text>
                <Text style={styles.contactValue}>support@mlexpress.com</Text>
              </View>
              <View style={styles.contactArrow}>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer Spacing */}
        <View style={styles.footer} />
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
  heroSection: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    fontWeight: '500',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  quickActionsContainer: {
    marginTop: -24,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  quickActionGradient: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  quickActionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionIcon: {
    fontSize: 26,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  section: {
    padding: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  serviceGradient: {
    padding: 16,
    borderRadius: 16,
    minHeight: 180,
  },
  serviceIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    fontSize: 24,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  serviceDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  featuresSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    width: (width - 52) / 3,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 15,
  },
  contactCard: {
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  contactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactIcon: {
    fontSize: 24,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  contactArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  footer: {
    height: 32,
  },
});
