import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { packageService, Package, supabase } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import {
  normalizePackageStatusZh,
  isActiveCourierTaskStatus,
} from '../utils/packageStatusNormalize';

const { width } = Dimensions.get('window');

export default function CourierHomeScreen({ navigation }: any) {
  const { language, t } = useApp();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');

  useEffect(() => {
    loadUserInfo();
    loadMyPackages();
  }, []);

  // 🚀 新增：实时监听订单分配
  useEffect(() => {
    let channel: any = null;

    const setupRealtimeListener = async () => {
      const userName = await AsyncStorage.getItem('currentUserName') || '';
      if (!userName) return;

      channel = supabase
        .channel('home-tasks-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'packages',
            filter: `courier=eq.${userName}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && (payload.new.status === '已分配' || (payload.old.courier !== payload.new.courier && payload.new.courier === userName)))) {
              // 1. 震动提醒
              Vibration.vibrate([0, 500, 200, 500]);
              
              // 2. 语音播报
              try {
                AsyncStorage.getItem('ml-express-language').then(lang => {
                  const language = lang || 'zh';
                  const speakText = language === 'my' ? 'သင့်တွင် အော်ဒါအသစ်တစ်ခုရှိသည်။' : 
                                   language === 'en' ? 'You have a new order.' : 
                                   '您有新的订单';
                  
                  Speech.speak(speakText, {
                    language: language === 'my' ? 'my-MM' : language === 'en' ? 'en-US' : 'zh-CN',
                    pitch: 1.0,
                    rate: 1.0,
                  });
                });
              } catch (speechError) {
                console.warn('实时监听语音播报失败:', speechError);
              }
              
              // 3. 自动刷新
              loadMyPackages();
            }
          }
        )
        .subscribe();
    };

    setupRealtimeListener();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const loadUserInfo = async () => {
    const userName = await AsyncStorage.getItem('currentUserName') || '骑手';
    setCurrentUserName(userName);
  };

  const loadMyPackages = async () => {
    try {
      setLoading(true);
      const currentUser = await AsyncStorage.getItem('currentUserName') || '';
      const allPackages = await packageService.getAllPackages();
      
      const myPackages = allPackages.filter((pkg) => {
        if (pkg.courier !== currentUser) return false;
        const s = normalizePackageStatusZh(pkg.status);
        return isActiveCourierTaskStatus(s);
      });
      
      setPackages(myPackages);
    } catch (error) {
      console.error('加载包裹失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyPackages();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    const s = normalizePackageStatusZh(status);
    switch (s) {
      case '待取件':
      case '待收款':
        return '#f59e0b';
      case '待确认':
        return '#a855f7';
      case '打包中':
        return '#0ea5e9';
      case '已取件':
        return '#3b82f6';
      case '配送中':
        return '#8b5cf6';
      case '异常上报':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const s = normalizePackageStatusZh(currentStatus);
    switch (s) {
      case '待取件':
      case '待收款':
        return language === 'zh' ? '去取件' : 'Pickup';
      case '打包中':
      case '待确认':
        return language === 'zh' ? '等待商家' : 'Wait';
      case '已取件':
        return language === 'zh' ? '去配送' : 'Deliver';
      case '配送中':
      case '异常上报':
        return language === 'zh' ? '签收' : 'Complete';
      default:
        return '';
    }
  };

  const renderPackageItem = ({ item }: { item: Package }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.packageCardWrapper}
      onPress={() => navigation.navigate('PackageDetail', { package: item })}
      accessibilityRole="button"
      accessibilityLabel={`${t.a11yPackageOpenDetail} ${item.id}`}
      accessibilityHint={item.receiver_name}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.packageGlassCard}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.idBadge}>
              <Text style={styles.packageId}>{item.id}</Text>
            </View>
            
            {/* 🚀 新增：在顶部显示下单身份 */}
            {(() => {
              const identityMatch = item.description?.match(/\[(?:下单身份|Orderer Identity|Orderer|အော်ဒါတင်သူ အမျိုးအစား|အော်ဒါတင်သူ): (.*?)\]/);
              if (identityMatch && identityMatch[1]) {
                const identity = identityMatch[1];
                const isMERCHANTS = identity === '商家' || identity === 'MERCHANTS';
                return (
                  <View style={[styles.identityBadge, { backgroundColor: isMERCHANTS ? '#3b82f6' : '#f59e0b' }]}>
                    <Text style={styles.identityText}>{identity}</Text>
                  </View>
                );
              }
              return null;
            })()}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.receiverContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color="#60a5fa" />
            <Text style={styles.receiverName}>{item.receiver_name}</Text>
          </View>
          <Text style={styles.addressText} numberOfLines={2}>{item.receiver_address}</Text>
        </View>

        {/* 🚀 新增：首页列表展示余额支付金额 */}
        {(() => {
          const payMatch = item.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/);
          if (payMatch && payMatch[1]) {
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginLeft: 16 }}>
                <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>
                  💰 {language === 'zh' ? '余额支付' : language === 'en' ? 'Balance Payment' : 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း'}: {payMatch[1]} MMK
                </Text>
              </View>
            );
          }
          return null;
        })()}

        <View style={styles.cardFooter}>
          <View style={styles.tagGroup}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.package_type}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.weight}kg</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('PackageDetail', { package: item, action: 'updateStatus' });
            }}
            accessibilityRole="button"
            accessibilityLabel={t.a11yNextStepAction}
          >
            <LinearGradient
              colors={[getStatusColor(item.status), getStatusColor(item.status) + 'dd']}
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>{getNextStatus(item.status)}</Text>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // 统计
  const todoCount = packages.filter((p) => {
    const s = normalizePackageStatusZh(p.status);
    return ['待取件', '待收款', '打包中', '待确认'].includes(s);
  }).length;
  const pickedCount = packages.filter(
    (p) => normalizePackageStatusZh(p.status) === '已取件',
  ).length;
  const deliveringCount = packages.filter((p) => {
    const s = normalizePackageStatusZh(p.status);
    return s === '配送中' || s === '异常上报';
  }).length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#334155']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.circle, { top: -100, right: -100, backgroundColor: 'rgba(59, 130, 246, 0.15)' }]} />
      <View style={[styles.circle, { bottom: -50, left: -50, backgroundColor: 'rgba(30, 58, 138, 0.2)' }]} />

      {/* 头部 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>👋 {language === 'zh' ? '你好' : 'Hello'},</Text>
          <Text style={styles.userName}>{currentUserName}</Text>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => navigation.navigate('MyTasks')}
        >
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{packages.length}</Text>
          </View>
          <Ionicons name="notifications-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* 快捷统计 */}
      <View style={styles.statsRow}>
        <LinearGradient colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)']} style={styles.statCard}>
          <Text style={[styles.statNumber, {color: '#fbbf24'}]}>{todoCount}</Text>
          <Text style={styles.statLabel}>{language === 'zh' ? '待取件' : 'Todo'}</Text>
        </LinearGradient>
        <LinearGradient colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.05)']} style={styles.statCard}>
          <Text style={[styles.statNumber, {color: '#60a5fa'}]}>{pickedCount}</Text>
          <Text style={styles.statLabel}>{language === 'zh' ? '已取件' : 'Picked'}</Text>
        </LinearGradient>
        <LinearGradient colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)']} style={styles.statCard}>
          <Text style={[styles.statNumber, {color: '#a78bfa'}]}>{deliveringCount}</Text>
          <Text style={styles.statLabel}>{language === 'zh' ? '配送中' : 'Active'}</Text>
        </LinearGradient>
      </View>

      {/* 任务列表 */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>📦 {language === 'zh' ? '当前任务' : 'Current Tasks'}</Text>
          <TouchableOpacity
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel={t.a11yRefreshTaskList}
          >
            <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={80} color="rgba(255,255,255,0.1)" />
            </View>
            <Text style={styles.emptyText}>{language === 'zh' ? '全部完成！' : 'All Clear!'}</Text>
            <Text style={styles.emptySubtext}>{language === 'zh' ? '当前没有待配送的包裹' : 'No pending deliveries'}</Text>
          </View>
        ) : (
          <FlatList
            data={packages}
            renderItem={renderPackageItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  circle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  userName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  packageCardWrapper: {
    marginBottom: 16,
  },
  packageGlassCard: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  idBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  packageId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  receiverContainer: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  receiverName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  addressText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    lineHeight: 20,
    marginLeft: 26,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  tagGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  actionText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  identityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  identityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
