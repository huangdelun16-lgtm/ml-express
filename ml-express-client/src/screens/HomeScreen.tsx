import React from 'react';
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
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const { language } = useApp();

  const t = {
    zh: {
      title: '缅甸同城快递',
      subtitle: '快速、安全、可靠的同城配送服务',
      placeOrder: '立即下单',
      trackOrder: '追踪订单',
      myOrders: '我的订单',
      services: '我们的服务',
      service1Title: '⚡ 快速配送',
      service1Desc: '准时达1小时内\n急送达30分钟',
      service2Title: '🛡️ 安全可靠',
      service2Desc: '专业团队\n全程保障',
      service3Title: '📍 实时追踪',
      service3Desc: '随时查看\n包裹位置',
      service4Title: '💰 价格透明',
      service4Desc: '明码标价\n无隐藏费用',
      whyChooseUs: '为什么选择我们？',
      feature1: '7x24小时服务',
      feature2: '覆盖全缅甸主要城市',
      feature3: '专业配送团队',
      feature4: '智能路线优化',
      contact: '联系我们',
      phone: '客服热线',
      email: '商务合作',
    },
    en: {
      title: 'Myanmar City Express',
      subtitle: 'Fast, Safe, and Reliable Same-City Delivery',
      placeOrder: 'Place Order',
      trackOrder: 'Track Order',
      myOrders: 'My Orders',
      services: 'Our Services',
      service1Title: '⚡ Fast Delivery',
      service1Desc: 'On-Time within 1 hour\nExpress in 30 mins',
      service2Title: '🛡️ Safe & Reliable',
      service2Desc: 'Professional team\nFull guarantee',
      service3Title: '📍 Real-time Tracking',
      service3Desc: 'Check package\nlocation anytime',
      service4Title: '💰 Transparent Pricing',
      service4Desc: 'Clear prices\nNo hidden fees',
      whyChooseUs: 'Why Choose Us?',
      feature1: '24/7 Service',
      feature2: 'Coverage across Myanmar',
      feature3: 'Professional Delivery Team',
      feature4: 'Smart Route Optimization',
      contact: 'Contact Us',
      phone: 'Customer Service',
      email: 'Business',
    },
    my: {
      title: 'မြန်မာမြို့တွင်းအမြန်ပို့ဆောင်ရေး',
      subtitle: 'မြန်ဆန်၊ ဘေးကင်းပြီး ယုံကြည်စိတ်ချရသော ဝန်ဆောင်မှု',
      placeOrder: 'အမှာစာတင်',
      trackOrder: 'ခြေရာခံ',
      myOrders: 'ကျွန်ုပ်၏အမှာစာများ',
      services: 'ကျွန်ုပ်တို့၏ဝန်ဆောင်မှုများ',
      service1Title: '⚡ မြန်ဆန်သောပို့ဆောင်ရေး',
      service1Desc: '၁နာရီအတွင်း\n၃၀မိနစ်အမြန်ပို့',
      service2Title: '🛡️ ဘေးကင်းယုံကြည်',
      service2Desc: 'ပရော်ဖက်ရှင်နယ်\nအဖွဲ့',
      service3Title: '📍 တိုက်ရိုက်ခြေရာခံ',
      service3Desc: 'အချိန်မရွေး\nစစ်ဆေးနိုင်',
      service4Title: '💰 ပွင့်လင်းသောစျေးနှုန်း',
      service4Desc: 'ရှင်းလင်းသော\nစျေးနှုန်း',
      whyChooseUs: 'ကျွန်ုပ်တို့ကိုရွေးချယ်ရသည့်အကြောင်းရင်း',
      feature1: '၂၄နာရီဝန်ဆောင်မှု',
      feature2: 'မြန်မာတစ်နိုင်ငံလုံးဝန်ဆောင်မှု',
      feature3: 'ကျွမ်းကျင်သောအဖွဲ့',
      feature4: 'စမတ်လမ်းကြောင်း',
      contact: 'ဆက်သွယ်ရန်',
      phone: 'ဖောက်သည်ဝန်ဆောင်မှု',
      email: 'စီးပွားရေး',
    },
  };

  const currentT = t[language];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Gradient Background */}
        <LinearGradient
          colors={['#1a365d', '#2c5282', '#3182ce']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroOverlay} />
          
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo-large.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{currentT.title}</Text>
          <Text style={styles.subtitle}>{currentT.subtitle}</Text>

          {/* Main Action Button */}
          <TouchableOpacity
            style={styles.mainActionButton}
            onPress={() => navigation.navigate('PlaceOrder')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mainActionGradient}
            >
              <Text style={styles.mainActionIcon}>📦</Text>
              <Text style={styles.mainActionText}>{currentT.placeOrder}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('TrackOrder')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#ffffff', '#f7fafc']}
              style={styles.quickActionGradient}
            >
              <View style={styles.quickActionIconContainer}>
                <Text style={styles.quickActionIcon}>🔍</Text>
              </View>
              <Text style={styles.quickActionText}>{currentT.trackOrder}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('MyOrders')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#ffffff', '#f7fafc']}
              style={styles.quickActionGradient}
            >
              <View style={styles.quickActionIconContainer}>
                <Text style={styles.quickActionIcon}>📋</Text>
              </View>
              <Text style={styles.quickActionText}>{currentT.myOrders}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>{currentT.services}</Text>
          
          <View style={styles.servicesGrid}>
            {[
              { title: currentT.service1Title, desc: currentT.service1Desc, colors: ['#fef3c7', '#fde68a'] },
              { title: currentT.service2Title, desc: currentT.service2Desc, colors: ['#dbeafe', '#bfdbfe'] },
              { title: currentT.service3Title, desc: currentT.service3Desc, colors: ['#dcfce7', '#bbf7d0'] },
              { title: currentT.service4Title, desc: currentT.service4Desc, colors: ['#fce7f3', '#fbcfe8'] },
            ].map((service, index) => (
              <View key={index} style={styles.serviceCardWrapper}>
                <LinearGradient
                  colors={service.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.serviceCard}
                >
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceDesc}>{service.desc}</Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        </View>

        {/* Why Choose Us Section */}
        <LinearGradient
          colors={['#f8fafc', '#ffffff']}
          style={styles.featuresSection}
        >
          <Text style={styles.sectionTitle}>{currentT.whyChooseUs}</Text>
          
          <View style={styles.featuresGrid}>
            {[
              { icon: '⏰', text: currentT.feature1 },
              { icon: '🗺️', text: currentT.feature2 },
              { icon: '👥', text: currentT.feature3 },
              { icon: '🚀', text: currentT.feature4 },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>{currentT.contact}</Text>
          
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('tel:+959123456789')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
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
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('mailto:support@mlexpress.com')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
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
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer Spacing */}
        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#e5e7eb',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  mainActionButton: {
    width: width - 80,
    borderRadius: 16,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  mainActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  mainActionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  mainActionText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
    marginTop: -20,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionIcon: {
    fontSize: 28,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  servicesSection: {
    padding: 20,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  serviceCardWrapper: {
    width: (width - 56) / 2,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceCard: {
    padding: 20,
    borderRadius: 16,
    minHeight: 140,
    justifyContent: 'center',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 22,
  },
  serviceDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  featuresSection: {
    padding: 20,
    paddingVertical: 32,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureItem: {
    width: (width - 56) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 18,
  },
  contactSection: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  contactCard: {
    marginBottom: 16,
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
    padding: 20,
    borderRadius: 16,
  },
  contactIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contactIcon: {
    fontSize: 28,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  footer: {
    height: 40,
  },
});
