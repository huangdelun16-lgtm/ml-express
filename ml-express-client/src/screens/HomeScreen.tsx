import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useApp } from '../contexts/AppContext';

export default function HomeScreen({ navigation }: any) {
  const { language } = useApp();

  const t = {
    zh: {
      title: '缅甸同城快递',
      subtitle: '快速、安全、可靠的同城配送服务',
      placeOrder: '立即下单',
      trackOrder: '追踪订单',
      services: '我们的服务',
      service1Title: '快速配送',
      service1Desc: '1小时内送达，急送30分钟',
      service2Title: '安全可靠',
      service2Desc: '专业团队，全程保障',
      service3Title: '实时追踪',
      service3Desc: '随时查看包裹位置',
      service4Title: '价格透明',
      service4Desc: '明码标价，无隐藏费用',
      contact: '联系我们',
      phone: '电话',
      email: '邮箱',
    },
    en: {
      title: 'Myanmar City Express',
      subtitle: 'Fast, Safe, and Reliable Same-City Delivery',
      placeOrder: 'Place Order',
      trackOrder: 'Track Order',
      services: 'Our Services',
      service1Title: 'Fast Delivery',
      service1Desc: 'Within 1 hour, Express in 30 mins',
      service2Title: 'Safe & Reliable',
      service2Desc: 'Professional team, Full guarantee',
      service3Title: 'Real-time Tracking',
      service3Desc: 'Check package location anytime',
      service4Title: 'Transparent Pricing',
      service4Desc: 'Clear prices, No hidden fees',
      contact: 'Contact Us',
      phone: 'Phone',
      email: 'Email',
    },
    my: {
      title: 'မြန်မာမြို့တွင်းအမြန်ပို့ဆောင်ရေး',
      subtitle: 'မြန်ဆန်၊ ဘေးကင်းပြီး ယုံကြည်စိတ်ချရသော ပို့ဆောင်ရေးဝန်ဆောင်မှု',
      placeOrder: 'အမှာစာတင်',
      trackOrder: 'ခြေရာခံ',
      services: 'ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုများ',
      service1Title: 'မြန်ဆန်သောပို့ဆောင်ရေး',
      service1Desc: '၁ နာရီအတွင်း၊ ၃၀ မိနစ်အတွင်းအမြန်ပို့',
      service2Title: 'ဘေးကင်းယုံကြည်',
      service2Desc: 'ပရော်ဖက်ရှင်နယ်အဖွဲ့',
      service3Title: 'တိုက်ရိုက်ခြေရာခံ',
      service3Desc: 'အချိန်မရွေးစစ်ဆေးနိုင်',
      service4Title: 'ပွင့်လင်းသောစျေးနှုန်း',
      service4Desc: 'ရှင်းလင်းသောစျေးနှုန်း',
      contact: 'ဆက်သွယ်ရန်',
      phone: 'ဖုန်း',
      email: 'အီးမေးလ်',
    },
  };

  const currentT = t[language];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🚚</Text>
          <Text style={styles.title}>{currentT.title}</Text>
          <Text style={styles.subtitle}>{currentT.subtitle}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => navigation.navigate('PlaceOrder')}
          >
            <Text style={styles.actionButtonIcon}>📦</Text>
            <Text style={styles.primaryButtonText}>{currentT.placeOrder}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('TrackOrder')}
          >
            <Text style={styles.actionButtonIcon}>🔍</Text>
            <Text style={styles.secondaryButtonText}>{currentT.trackOrder}</Text>
          </TouchableOpacity>
        </View>

        {/* Services */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>{currentT.services}</Text>
          
          <View style={styles.servicesGrid}>
            <View style={styles.serviceCard}>
              <Text style={styles.serviceIcon}>⚡</Text>
              <Text style={styles.serviceTitle}>{currentT.service1Title}</Text>
              <Text style={styles.serviceDesc}>{currentT.service1Desc}</Text>
            </View>

            <View style={styles.serviceCard}>
              <Text style={styles.serviceIcon}>🛡️</Text>
              <Text style={styles.serviceTitle}>{currentT.service2Title}</Text>
              <Text style={styles.serviceDesc}>{currentT.service2Desc}</Text>
            </View>

            <View style={styles.serviceCard}>
              <Text style={styles.serviceIcon}>📍</Text>
              <Text style={styles.serviceTitle}>{currentT.service3Title}</Text>
              <Text style={styles.serviceDesc}>{currentT.service3Desc}</Text>
            </View>

            <View style={styles.serviceCard}>
              <Text style={styles.serviceIcon}>💰</Text>
              <Text style={styles.serviceTitle}>{currentT.service4Title}</Text>
              <Text style={styles.serviceDesc}>{currentT.service4Desc}</Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>{currentT.contact}</Text>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => Linking.openURL('tel:+959123456789')}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <View>
              <Text style={styles.contactLabel}>{currentT.phone}</Text>
              <Text style={styles.contactValue}>+95 912 345 6789</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => Linking.openURL('mailto:support@mlexpress.com')}
          >
            <Text style={styles.contactIcon}>📧</Text>
            <View>
              <Text style={styles.contactLabel}>{currentT.email}</Text>
              <Text style={styles.contactValue}>support@mlexpress.com</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2c5282',
    padding: 40,
    paddingTop: 60,
    alignItems: 'center',
  },
  logo: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#e5e7eb',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#3182ce',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#3182ce',
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#3182ce',
    fontSize: 16,
    fontWeight: '600',
  },
  servicesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  serviceDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactSection: {
    padding: 20,
    marginBottom: 40,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
});

