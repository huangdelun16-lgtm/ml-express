import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  DeviceEventEmitter,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { packageService, Package } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { feedbackService } from '../services/feedbackService';
import { logger } from '../services/LoggerService';
import { DeliveryCountdownBadge } from '../components/DeliveryCountdownBadge';
import {
  normalizePackageStatusZh,
  isActiveCourierTaskStatus,
} from '../utils/packageStatusNormalize';
import {
  dialCourierTaskContact,
  isMerchantFirstTask,
  navigateCourierTask,
} from '../utils/courierTaskQuickActions';
import { COURIER_NEW_ORDER_EVENT } from '../services/courierNewOrderMonitor';
import { cacheService, OFFLINE_QUEUE_CHANGED, type OfflineUpdate } from '../services/cacheService';
import { offlineQueueFailureText } from '../utils/offlineQueueLabel';
import { locationService } from '../services/locationService';
import {
  courierTaskPoint,
  formatCourierDistance,
  haversineMeters,
  matchesCourierTaskFilter,
  sortCourierTasksByDistance,
  type CourierTaskFilter,
  type GeoPoint,
} from '../utils/courierTaskDistance';

export default function CourierHomeScreen({ navigation }: any) {
  const { language, t } = useApp();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [riderPoint, setRiderPoint] = useState<GeoPoint | null>(null);
  const [taskFilter, setTaskFilter] = useState<CourierTaskFilter>('all');
  const [offlineQueue, setOfflineQueue] = useState<OfflineUpdate[]>([]);
  const [retryingPackageId, setRetryingPackageId] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 24, 120],
    outputRange: [1, 0.72, 0],
    extrapolate: 'clamp',
  });
  const onPageScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  );

  const loadUserInfo = async () => {
    const userName = await AsyncStorage.getItem('currentUserName') || '骑手';
    setCurrentUserName(userName);
  };

  const loadMyPackages = useCallback(async (opts?: { showSpinner?: boolean }) => {
    const showSpinner = opts?.showSpinner === true;
    try {
      if (showSpinner) setLoading(true);
      const currentUser = (await AsyncStorage.getItem('currentUserName')) || '';
      if (!currentUser) {
        setPackages([]);
        return;
      }

      const courierPackages = await packageService.getPackagesForCourier(currentUser);
      const myPackages = courierPackages.filter((pkg) => {
        const s = normalizePackageStatusZh(pkg.status);
        return isActiveCourierTaskStatus(s);
      });

      setPackages(myPackages);
    } catch (error) {
      logger.warn('加载包裹失败', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserInfo();
    void loadMyPackages({ showSpinner: true });
  }, [loadMyPackages]);

  useEffect(() => {
    let alive = true;
    const loadQueue = async () => {
      const next = await cacheService.getOfflineQueue();
      if (alive) setOfflineQueue(next);
    };
    void loadQueue();
    const sub = DeviceEventEmitter.addListener(OFFLINE_QUEUE_CHANGED, () => {
      void loadQueue();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const retryPackageUpload = (packageId: string) => {
    if (retryingPackageId) return;
    setRetryingPackageId(packageId);
    void packageService.syncOfflineUpdates(packageId).finally(() => {
      setRetryingPackageId('');
    });
  };

  useFocusEffect(
    useCallback(() => {
      void loadMyPackages({ showSpinner: false });
      void locationService.getCurrentLocation(language).then((loc) => {
        if (loc) setRiderPoint({ lat: loc.latitude, lng: loc.longitude });
      });
    }, [loadMyPackages, language]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(COURIER_NEW_ORDER_EVENT, () => {
      void loadMyPackages({ showSpinner: false });
    });
    return () => sub.remove();
  }, [loadMyPackages]);

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
        return language === 'zh' ? '去取件' : language === 'my' ? 'ယူရန်' : 'Pickup';
      case '打包中':
      case '待确认':
        return language === 'zh' ? '等待商家' : language === 'my' ? 'ဆိုင်စောင့်' : 'Wait';
      case '已取件':
        return language === 'zh' ? '去配送' : language === 'my' ? 'ပို့ရန်' : 'Deliver';
      case '配送中':
      case '异常上报':
        return language === 'zh' ? '签收' : language === 'my' ? 'လက်ခံ' : 'Complete';
      default:
        return '';
    }
  };

  const handleQuickCall = (pkg: Package) => {
    const kind = dialCourierTaskContact(pkg);
    if (!kind) {
      feedbackService.notify(
        language === 'zh' ? '无法拨打' : language === 'en' ? 'Cannot call' : 'ခေါ်၍မရ',
        language === 'zh'
          ? '此单没有可用电话'
          : language === 'en'
            ? 'No phone number on this order'
            : 'ဖုန်းနံပါတ်မရှိပါ',
      );
    }
  };

  const handleQuickNav = (pkg: Package) => {
    const kind = navigateCourierTask(pkg);
    if (!kind) {
      feedbackService.notify(
        language === 'zh' ? '无法导航' : language === 'en' ? 'Cannot navigate' : 'လမ်းညွှန်မရ',
        language === 'zh'
          ? '此单没有可用地址或坐标'
          : language === 'en'
            ? 'No address or coordinates on this order'
            : 'လိပ်စာမရှိပါ',
      );
    }
  };

  const orderedPackages = useMemo(() => {
    const filtered = packages.filter((pkg) => matchesCourierTaskFilter(pkg, taskFilter));
    return sortCourierTasksByDistance(filtered, riderPoint);
  }, [packages, riderPoint, taskFilter]);

  const renderPackageItem = ({ item }: { item: Package }) => {
    const merchantFirst = isMerchantFirstTask(item);
    const callLabel = merchantFirst
      ? language === 'zh'
        ? '打商家'
        : language === 'en'
          ? 'Shop'
          : 'ဆိုင်'
      : language === 'zh'
        ? '打客户'
        : language === 'en'
          ? 'Call'
          : 'ဖောက်သည်';
    const navLabel = merchantFirst
      ? language === 'zh'
        ? '去取货'
        : language === 'en'
          ? 'Pickup'
          : 'ယူရန်'
        : language === 'zh'
          ? '去送货'
          : language === 'en'
            ? 'Dropoff'
            : 'ပို့ရန်';
    const point = courierTaskPoint(item);
    const distanceLabel =
      riderPoint && point ? formatCourierDistance(haversineMeters(riderPoint, point), language) : '';

    return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.packageCardWrapper}
      onPress={() => navigation.navigate('PackageDetail', { package: item })}
      accessibilityRole="button"
      accessibilityLabel={`${t.a11yPackageOpenDetail} ${item.id}`}
      accessibilityHint={item.receiver_name}
    >
      <LinearGradient
        colors={['#1e293b', '#152033']}
        style={[styles.packageGlassCard, { borderLeftColor: getStatusColor(item.status) }]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
            <View style={styles.idBadge}>
              <Text style={styles.packageId}>{item.id}</Text>
            </View>
            
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

        <DeliveryCountdownBadge
          pkg={item}
          language={language === 'zh' ? 'zh' : language === 'en' ? 'en' : 'my'}
          variant="compact"
          theme="dark"
        />
        
        <View style={styles.receiverContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color="#60a5fa" />
            <Text style={styles.receiverName}>
              {merchantFirst ? (item.sender_name || item.receiver_name) : item.receiver_name}
            </Text>
          </View>
          <Text style={styles.addressText} numberOfLines={2}>
            {merchantFirst
              ? item.sender_address || item.receiver_address
              : item.receiver_address}
          </Text>
          {distanceLabel ? <Text style={styles.distanceText}>{distanceLabel}</Text> : null}
          {offlineQueue
            .filter((row) => row.packageId === item.id)
            .map((row) => (
              <Text key={row.id} style={styles.queueFail}>
                {offlineQueueFailureText(row, language, true)}
              </Text>
            ))}
          {offlineQueue.some((row) => row.packageId === item.id) ? (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => retryPackageUpload(item.id)}
              disabled={retryingPackageId === item.id}
            >
              <Text style={styles.retryText}>
                {retryingPackageId === item.id
                  ? language === 'zh'
                    ? '正在上传…'
                    : language === 'en'
                      ? 'Uploading…'
                      : 'တင်နေသည်…'
                  : language === 'zh'
                    ? '重试上传'
                    : language === 'en'
                      ? 'Retry upload'
                      : 'ပြန်တင်မည်'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {(() => {
          const payMatch = item.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/);
          if (payMatch && payMatch[1]) {
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
                <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>
                  💰 {language === 'zh' ? '余额支付' : language === 'en' ? 'Balance Payment' : 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း'}: {payMatch[1]} MMK
                </Text>
              </View>
            );
          }
          return null;
        })()}

        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnCall]}
            onPress={(e) => {
              e.stopPropagation();
              handleQuickCall(item);
            }}
            accessibilityRole="button"
            accessibilityLabel={t.a11yCallRecipient}
          >
            <Ionicons name="call" size={16} color="#6ee7b7" />
            <Text style={styles.quickBtnText}>{callLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnNav]}
            onPress={(e) => {
              e.stopPropagation();
              handleQuickNav(item);
            }}
            accessibilityRole="button"
            accessibilityLabel={t.a11yNavigateToAddress}
          >
            <Ionicons name="navigate" size={16} color="#93c5fd" />
            <Text style={styles.quickBtnText}>{navLabel}</Text>
          </TouchableOpacity>
        </View>

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
  };

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

      <Animated.FlatList
        data={loading ? [] : orderedPackages}
        renderItem={renderPackageItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        bounces
        onScroll={onPageScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        contentContainerStyle={styles.pageContent}
        ListHeaderComponent={
          <View>
            <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
              <View>
                <Text style={styles.greeting}>👋 {language === 'zh' ? '你好' : 'Hello'},</Text>
                <Text style={styles.userName}>{currentUserName}</Text>
              </View>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => setTaskFilter((current) => (current === 'today' ? 'all' : 'today'))}
                accessibilityRole="button"
                accessibilityLabel={language === 'zh' ? '只看今天的任务' : 'Today'}
              >
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{packages.length}</Text>
                </View>
                <Ionicons name="notifications-outline" size={24} color="white" />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.statsRow}>
              <LinearGradient colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)']} style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#fbbf24' }]}>{todoCount}</Text>
                <Text style={styles.statLabel}>{language === 'zh' ? '待取件' : 'Todo'}</Text>
              </LinearGradient>
              <LinearGradient colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.05)']} style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#60a5fa' }]}>{pickedCount}</Text>
                <Text style={styles.statLabel}>{language === 'zh' ? '已取件' : 'Picked'}</Text>
              </LinearGradient>
              <LinearGradient colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)']} style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#a78bfa' }]}>{deliveringCount}</Text>
                <Text style={styles.statLabel}>{language === 'zh' ? '配送中' : 'Active'}</Text>
              </LinearGradient>
            </View>

            <View style={styles.listHeader}>
              <View>
                <Text style={styles.listTitle}>
                  {language === 'zh' ? '当前任务' : language === 'my' ? 'လက်ရှိအလုပ်' : 'Current tasks'}
                </Text>
                <Text style={styles.listHint}>
                  {riderPoint
                    ? language === 'zh'
                      ? '近的在前'
                      : language === 'my'
                        ? 'အနီးဆုံးအရင်'
                        : 'Nearest first'
                    : language === 'zh'
                      ? '打开定位后按距离排'
                      : language === 'my'
                        ? 'တည်နေရာဖွင့်မှ အကွာအဝေးအလိုက်'
                        : 'Turn on location to sort'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onRefresh}
                accessibilityRole="button"
                accessibilityLabel={t.a11yRefreshTaskList}
              >
                <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterRow}>
              {(
                [
                  { key: 'all' as const, zh: '全部', en: 'All', my: 'အားလုံး' },
                  { key: 'today' as const, zh: '今天', en: 'Today', my: 'ယနေ့' },
                  { key: 'pickup' as const, zh: '待取', en: 'Pickup', my: 'ယူရန်' },
                  { key: 'delivering' as const, zh: '配送中', en: 'Active', my: 'ပို့ဆောင်' },
                ]
              ).map((item) => {
                const selected = taskFilter === item.key;
                const label = language === 'zh' ? item.zh : language === 'my' ? item.my : item.en;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.filterChip, selected && styles.filterChipOn]}
                    onPress={() => setTaskFilter(item.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.filterChipText, selected && styles.filterChipTextOn]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={72} color="#5eead4" />
              </View>
              <Text style={styles.emptyText}>{language === 'zh' ? '全部完成！' : 'All Clear!'}</Text>
              <Text style={styles.emptySubtext}>{language === 'zh' ? '当前没有待配送的包裹' : 'No pending deliveries'}</Text>
            </View>
          )
        }
      />
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
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
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
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  pageContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
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
  listHint: {
    color: '#5eead4',
    fontSize: 12,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  filterChipOn: {
    backgroundColor: 'rgba(45, 212, 191, 0.18)',
    borderColor: 'rgba(94, 234, 212, 0.7)',
  },
  filterChipText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  filterChipTextOn: { color: '#ecfeff', fontWeight: '800' },
  distanceText: {
    marginTop: 6,
    marginLeft: 26,
    color: '#5eead4',
    fontSize: 13,
    fontWeight: '800',
  },
  queueFail: {
    marginTop: 8,
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#b45309',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  packageCardWrapper: {
    marginBottom: 16,
  },
  packageGlassCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
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
    marginTop: 10,
    marginBottom: 12,
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
    fontSize: 15,
    color: '#e2e8f0',
    fontWeight: '600',
    lineHeight: 22,
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
    color: '#cbd5e1',
    fontSize: 12,
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
    color: '#cbd5e1',
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
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickBtnCall: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: 'rgba(110, 231, 183, 0.35)',
  },
  quickBtnNav: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderColor: 'rgba(147, 197, 253, 0.35)',
  },
  quickBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
