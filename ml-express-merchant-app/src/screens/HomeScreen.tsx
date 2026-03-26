import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image, Dimensions, Animated, RefreshControl, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton, { StatsCardSkeleton, OrderCardSkeleton } from '../components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { packageService, deliveryStoreService, supabase } from '../services/supabase';
import { theme } from '../config/theme';
import { analytics } from '../services/AnalyticsService';

const { width } = Dimensions.get('window');

interface MerchantStats {
  pending: number;
  processing: number;
  completed: number;
  totalSales: number;
}

export default function HomeScreen({ navigation }: any) {
  const { language, isDarkMode } = useApp();
  const { showLoading, hideLoading } = useLoading();
  
  const [refreshing, setRefreshing] = useState(false);
  const [merchantInfo, setMerchantInfo] = useState<any>(null);
  const [stats, setStats] = useState<MerchantStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    totalSales: 0,
  });
  const [loading, setLoading] = useState(true);
  const scrollY = new Animated.Value(0);

  const t = {
    zh: {
      welcome: '欢迎回来, 合作伙伴',
      businessStatus: '经营概况',
      pendingOrders: '待确认',
      processingOrders: '打包中',
      completedOrders: '已完成',
      totalSales: '总营收 (MMK)',
      manageProducts: '商品管理',
      printerSettings: '打印设置',
      myOrders: '订单列表',
      profile: '店铺资料',
      recentActivity: '近期动态',
      noActivity: '暂无新动态',
      refresh: '下拉刷新数据',
    },
    en: {
      welcome: 'Welcome Back, Partner',
      businessStatus: 'Business Overview',
      pendingOrders: 'Pending',
      processingOrders: 'Packing',
      completedOrders: 'Completed',
      totalSales: 'Total Revenue (MMK)',
      manageProducts: 'Products',
      printerSettings: 'Printer',
      myOrders: 'Orders',
      profile: 'Store Info',
      recentActivity: 'Recent Activity',
      noActivity: 'No recent activity',
      refresh: 'Pull to refresh',
    },
    my: {
      welcome: 'ပြန်လည်ကြိုဆိုပါတယ် မိတ်ဖက်',
      businessStatus: 'စီးပွားရေးအခြေအနေ',
      pendingOrders: 'အတည်ပြုရန်',
      processingOrders: 'ထုပ်ပိုးနေသည်',
      completedOrders: 'ပြီးစီးသည်',
      totalSales: 'စုစုပေါင်းဝင်ငွေ (MMK)',
      manageProducts: 'ကုန်ပစ္စည်းများ',
      printerSettings: 'ပရင်တာ',
      myOrders: 'အော်ဒါများ',
      profile: 'ဆိုင်အချက်အလက်',
      recentActivity: 'လတ်တလောလှုပ်ရှားမှု',
      noActivity: 'လှုပ်ရှားမှုမရှိပါ',
      refresh: 'ဒေတာအသစ်ရယူရန်',
    },
  };

  const currentT = t[language] || t.zh;

  const loadData = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        navigation.replace('Login');
        return;
      }

      // 获取店铺详细信息
      const store = await deliveryStoreService.getStoreById(userId);
      setMerchantInfo(store);

      // 获取订单统计 (针对商家)
      const email = await AsyncStorage.getItem('userEmail');
      const orderData = await packageService.getOrderStats(userId, email || undefined, undefined, 'merchant', store?.store_name);
      
      // 模拟商家特定统计 (在实际项目中需在 supabase.ts 增加 merchant 专用统计接口)
      setStats({
        pending: orderData.pending || 0,
        processing: 0, // 后续需增加打包中状态的统计
        completed: orderData.delivered || 0,
        totalSales: 0, // 后续需增加营收统计
      });

    } catch (error) {
      console.error('Failed to load merchant data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [220, 180],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: '#0f172a' }]}>
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <LinearGradient
          colors={['#1e293b', '#0f172a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{merchantInfo?.store_name?.charAt(0) || 'M'}</Text>
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.welcomeText}>{currentT.welcome}</Text>
              <Text style={styles.storeName}>{merchantInfo?.store_name || 'Loading...'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              <View style={styles.badge} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>{currentT.businessStatus}</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity style={styles.statsCard} onPress={() => navigation.navigate('MyOrders', { filter: 'pending' })}>
              <Text style={styles.statsValue}>{stats.pending}</Text>
              <Text style={styles.statsLabel}>{currentT.pendingOrders}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statsCard} onPress={() => navigation.navigate('MyOrders', { filter: 'processing' })}>
              <Text style={styles.statsValue}>{stats.processing}</Text>
              <Text style={styles.statsLabel}>{currentT.processingOrders}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statsCard} onPress={() => navigation.navigate('MyOrders', { filter: 'completed' })}>
              <Text style={styles.statsValue}>{stats.completed}</Text>
              <Text style={styles.statsLabel}>{currentT.completedOrders}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.salesCard}>
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.salesGradient}
            >
              <Text style={styles.salesLabel}>{currentT.totalSales}</Text>
              <Text style={styles.salesValue}>0</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('MerchantProducts', { storeId: merchantInfo?.id, storeName: merchantInfo?.store_name })}
          >
            <View style={[styles.iconBg, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="cube-outline" size={28} color="#3b82f6" />
            </View>
            <Text style={styles.actionText}>{currentT.manageProducts}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('MyOrders')}
          >
            <View style={[styles.iconBg, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="list-outline" size={28} color="#8b5cf6" />
            </View>
            <Text style={styles.actionText}>{currentT.myOrders}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.iconBg, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="settings-outline" size={28} color="#10b981" />
            </View>
            <Text style={styles.actionText}>{currentT.printerSettings}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.iconBg, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="business-outline" size={28} color="#f59e0b" />
            </View>
            <Text style={styles.actionText}>{currentT.profile}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>{currentT.recentActivity}</Text>
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyText}>{currentT.noActivity}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerContent: {
    zIndex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  nameContainer: {
    marginLeft: 15,
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  storeName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  content: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
  },
  statsContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e3a8a',
  },
  statsLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  salesCard: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  salesGradient: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salesLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  salesValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  actionItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 15,
  },
  iconBg: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
    textAlign: 'center',
  },
  recentActivity: {
    marginTop: 24,
  },
  emptyActivity: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  }
});
