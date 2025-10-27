import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { packageService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import Toast from '../components/Toast';
import { OrderCardSkeleton, EmptyOrders } from '../components/Skeleton';
import { NetworkStatus, useNetworkStatus } from '../components/NetworkStatus';
import { ErrorHandler, useErrorHandler } from '../components/ErrorHandler';

const { width } = Dimensions.get('window');

interface Order {
  id: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_latitude?: number;
  sender_longitude?: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_latitude?: number;
  receiver_longitude?: number;
  package_type: string;
  weight: string;
  description?: string;
  status: string;
  price: string;
  delivery_speed?: string;
  courier?: string;
  created_at: string;
  pickup_time?: string;
  delivery_time?: string;
  customer_rating?: number;
  customer_comment?: string;
}

export default function MyOrdersScreen({ navigation }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const { isConnected } = useNetworkStatus();
  const { error, handleError, clearError, retry } = useErrorHandler();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [isGuest, setIsGuest] = useState(false);

  // Toast状态
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  // 多语言翻译 - 使用 useMemo 缓存
  const translations = useMemo(() => ({
    zh: {
      title: '我的订单',
      subtitle: '查看和管理您的订单',
      all: '全部',
      pending: '待取件',
      inTransit: '配送中',
      delivered: '已送达',
      cancelled: '已取消',
      viewDetails: '查看详情',
      cancelOrder: '取消订单',
      rateOrder: '评价订单',
      orderCancelled: '订单已取消',
      orderRated: '评价已提交',
      pleaseLogin: '请先登录',
      loading: '加载中...',
      refresh: '下拉刷新',
      noOrders: '暂无订单',
      noOrdersDesc: '您还没有任何订单，点击下方按钮开始下单吧！',
      placeOrder: '立即下单',
      networkError: '网络连接失败',
      retry: '重试',
    
      packageTypes: {
        'standard': '标准件',
        'document': '文件',
        'fragile': '易碎品',
        'food': '食物和饮料',
        'overweight': '超重件',
        'oversized': '超规件',
      },
      statusTypes: {
        'pending': '待取件',
        'picked_up': '已取件',
        'in_transit': '配送中',
        'delivered': '已送达',
        'cancelled': '已取消',
      },},
    en: {
      title: 'My Orders',
      subtitle: 'View and manage your orders',
      all: 'All',
      pending: 'Pending',
      inTransit: 'In Transit',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      viewDetails: 'View Details',
      cancelOrder: 'Cancel Order',
      rateOrder: 'Rate Order',
      orderCancelled: 'Order cancelled',
      orderRated: 'Rating submitted',
      pleaseLogin: 'Please login first',
      loading: 'Loading...',
      refresh: 'Pull to refresh',
      noOrders: 'No Orders',
      noOrdersDesc: 'You don\'t have any orders yet. Click the button below to place your first order!',
      placeOrder: 'Place Order',
      networkError: 'Network connection failed',
      retry: 'Retry',
    
      packageTypes: {
        'standard': 'Standard',
        'document': 'Document',
        'fragile': 'Fragile',
        'food': 'Food & Beverage',
        'overweight': 'Overweight',
        'oversized': 'Oversized',
      },
      statusTypes: {
        'pending': 'Pending',
        'picked_up': 'Picked Up',
        'in_transit': 'In Transit',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled',
      },},
    my: {
      title: 'ကျွန်ုပ်၏အမှာစာများ',
      subtitle: 'သင့်အမှာစာများကိုကြည့်ရှုနှင့်စီမံခန့်ခွဲပါ',
      all: 'အားလုံး',
      pending: 'ကောက်ယူရန်စောင့်ဆိုင်း',
      inTransit: 'ပို့ဆောင်နေသည်',
      delivered: 'ပို့ဆောင်ပြီး',
      cancelled: 'ပယ်ဖျက်ပြီး',
      viewDetails: 'အသေးစိတ်ကြည့်ရှုရန်',
      cancelOrder: 'အမှာစာပယ်ဖျက်ရန်',
      rateOrder: 'အမှာစာအဆင့်သတ်မှတ်ရန်',
      orderCancelled: 'အမှာစာပယ်ဖျက်ပြီး',
      orderRated: 'အဆင့်သတ်မှတ်မှုတင်ပြီး',
      pleaseLogin: 'ကျေးဇူးပြု၍အရင်လော့ဂ်အင်ဝင်ပါ',
      loading: 'တင်နေသည်...',
      refresh: 'ပြန်လည်တင်ရန်ဆွဲပါ',
      noOrders: 'အမှာစာမရှိပါ',
      noOrdersDesc: 'သင့်တွင်အမှာစာမရှိသေးပါ။ ပထမအမှာစာတင်ရန်အောက်ပါခလုတ်ကိုနှိပ်ပါ။',
      placeOrder: 'အမှာစာတင်ရန်',
      networkError: 'အင်တာနက်ချိတ်ဆက်မှုမအောင်မြင်ပါ',
      retry: 'ပြန်လည်ကြိုးစားပါ',
    
      packageTypes: {
        'standard': 'စံပါဆယ်',
        'document': 'စာရွက်စာတမ်း',
        'fragile': 'အလွယ်တကူကျိုးပဲ့နိုင်သော',
        'food': 'အစားအစာ နှင့် သောက်စရာ',
        'overweight': 'အလွန်လေးသော',
        'oversized': 'အလွန်ကြီးသော',
      },
      statusTypes: {
        'pending': 'စောင့်ဆိုင်းဆဲ',
        'picked_up': 'ထုပ်ယူပြီး',
        'in_transit': 'ပို့ဆောင်နေသည်',
        'delivered': 'ပို့ဆောင်ပြီး',
        'cancelled': 'ပယ်ဖျက်ပြီး',
      },},
  }), []);

  const t = translations[language] || translations.zh;

  // 状态选项 - 使用 useMemo 缓存
  const statusOptions = useMemo(() => [
    { value: 'all', label: t.all },
    { value: '待取件', label: t.pending },
    { value: '配送中', label: t.inTransit },
    { value: '已送达', label: t.delivered },
    { value: '已取消', label: t.cancelled },
  ], [t]);

  // 加载用户ID - 使用 useCallback 优化
  const loadCustomerId = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const isGuest = await AsyncStorage.getItem('isGuest');
      
      if (userData) {
        const user = JSON.parse(userData);
        setCustomerId(user.id);
        
        // 如果是访客，不加载订单
        if (isGuest === 'true' || user.id === 'guest') {
          setIsGuest(true);
          setLoading(false);
          setOrders([]);
          setFilteredOrders([]);
        } else {
          setIsGuest(false);
          await loadOrders(user.id);
        }
      } else {
        // 没有用户信息，跳转登录
        Alert.alert('提示', t.pleaseLogin, [
          { text: '取消', style: 'cancel' },
          { text: '去登录', onPress: () => navigation.navigate('Login') }
        ]);
        setLoading(false);
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
      handleError(error as Error);
      setLoading(false);
    }
  }, [navigation, t.pleaseLogin, handleError]);

  // 加载订单 - 使用 useCallback 优化
  const loadOrders = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const { orders: data } = await packageService.getAllOrders(userId);
      setOrders(data);
      filterOrders(data, selectedStatus);
    } catch (error: any) {
      console.error('加载订单失败:', error);
      const errorMsg = error?.message || t.networkError;
      handleError(error);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, t.networkError, handleError, showToast]);

  // 刷新 - 使用 useCallback 优化
  const onRefresh = useCallback(async () => {
    if (!customerId || isGuest) return;
    setRefreshing(true);
    try {
      await loadOrders(customerId);
    } finally {
      setRefreshing(false);
    }
  }, [customerId, isGuest, loadOrders]);

  // 过滤订单 - 使用 useCallback 优化
  const filterOrders = useCallback((orderList: Order[], status: string) => {
    if (status === 'all') {
      setFilteredOrders(orderList);
    } else {
      setFilteredOrders(orderList.filter(order => order.status === status));
    }
  }, []);

  // 切换状态筛选 - 使用 useCallback 优化
  const handleStatusChange = useCallback((status: string) => {
    setSelectedStatus(status);
    filterOrders(orders, status);
  }, [orders, filterOrders]);

  // 取消订单 - 使用 useCallback 优化
  const handleCancelOrder = useCallback(async (orderId: string) => {
    Alert.alert(
      t.cancelOrder,
      '确定要取消这个订单吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              showLoading('正在取消订单...');
              await packageService.cancelOrder(orderId);
              hideLoading();
              showToast(t.orderCancelled, 'success');
              // 重新加载订单
              if (customerId) {
                await loadOrders(customerId);
              }
            } catch (error: any) {
              hideLoading();
              console.error('取消订单失败:', error);
              showToast(error?.message || '取消订单失败', 'error');
            }
          }
        }
      ]
    );
  }, [t.cancelOrder, t.orderCancelled, showLoading, hideLoading, showToast, customerId, loadOrders]);

  // 评价订单 - 使用 useCallback 优化
  const handleRateOrder = useCallback((orderId: string) => {
    navigation.navigate('RateOrder', { orderId });
  }, [navigation]);

  // 获取状态颜色 - 使用 useCallback 优化
  const getStatusColor = useCallback((status: string) => {
    const colors: any = {
      '待取件': '#f59e0b',
      '已取件': '#3b82f6',
      '配送中': '#8b5cf6',
      '已送达': '#10b981',
      '已取消': '#ef4444',
    };
    return colors[status] || '#6b7280';
  }, []);

  // 格式化日期 - 使用 useCallback 优化
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // 初始化加载
  useEffect(() => {
    loadCustomerId();
  }, [loadCustomerId]);

  // 渲染订单卡片 - 使用 useCallback 优化
  const renderOrderCard = useCallback((order: Order) => (
    <TouchableOpacity
      key={order.id}
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{order.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{translateStatus(order.status)}</Text>
        </View>
      </View>
      
      <View style={styles.orderBody}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderLabel}>📤 寄件人:</Text>
          <Text style={styles.orderValue}>{order.sender_name} {order.sender_phone}</Text>
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.orderLabel}>📍 寄件地址:</Text>
          <Text style={styles.orderValue} numberOfLines={2}>
            {order.sender_address}
          </Text>
          {order.sender_latitude && order.sender_longitude && (
            <View style={styles.coordsContainer}>
              <Text style={styles.coordsLabel}>经纬度：</Text>
              <Text style={styles.coordsText}>
                {order.sender_latitude.toFixed(6)}, {order.sender_longitude.toFixed(6)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.orderLabel}>👤 收件人:</Text>
          <Text style={styles.orderValue}>{order.receiver_name} {order.receiver_phone}</Text>
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.orderLabel}>📍 收件地址:</Text>
          <Text style={styles.orderValue} numberOfLines={2}>
            {order.receiver_address}
          </Text>
          {order.receiver_latitude && order.receiver_longitude && (
            <View style={styles.coordsContainer}>
              <Text style={styles.coordsLabel}>经纬度：</Text>
              <Text style={styles.coordsText}>
                {order.receiver_latitude.toFixed(6)}, {order.receiver_longitude.toFixed(6)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.orderLabel}>📦 包裹:</Text>
          <Text style={styles.orderValue}>{translatePackageType(order.package_type)} ({order.weight}kg)</Text>
        </View>
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.orderPrice}>{order.price} MMK</Text>
        <Text style={styles.orderTime}>{formatDate(order.created_at)}</Text>
      </View>
      
      <View style={styles.orderActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
        >
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.actionButtonGradient}
          >
            <Text style={styles.actionButtonText}>👁️ {t.viewDetails}</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {order.status === '待取件' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCancelOrder(order.id)}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>❌ {t.cancelOrder}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        {order.status === '已送达' && !order.customer_rating && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRateOrder(order.id)}
          >
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>⭐ {t.rateOrder}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  ), [navigation, getStatusColor, formatDate, t, handleCancelOrder, handleRateOrder]);

  // 渲染骨架屏
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 3 }).map((_, index) => (
        <OrderCardSkeleton key={index} />
      ))}
    </View>
  );

  // 渲染空状态
  const renderEmptyState = () => (
    <EmptyOrders
      onAction={() => navigation.navigate('PlaceOrder')}
    />
  );

  return (
    <View style={styles.container}>
      {/* 网络状态指示器 */}
      <NetworkStatus onRetry={() => loadCustomerId()} />
      
      {/* 错误处理 */}
      <ErrorHandler
        error={error}
        onRetry={retry}
        onDismiss={clearError}
      />

      {/* 头部 */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#2E86AB', '#4CA1CF']}
          style={styles.headerGradient}
        >
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </LinearGradient>
      </View>

      {/* 状态筛选 */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                selectedStatus === option.value && styles.filterButtonActive
              ]}
              onPress={() => handleStatusChange(option.value)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedStatus === option.value && styles.filterButtonTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 订单列表 */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title={t.refresh}
            tintColor="#2E86AB"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          renderSkeleton()
        ) : filteredOrders.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.ordersContainer}>
            {filteredOrders.map(renderOrderCard)}
          </View>
        )}
      </ScrollView>

      {/* Toast通知 */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    padding: 30,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2E86AB',
    borderColor: '#2E86AB',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  skeletonContainer: {
    paddingHorizontal: 20,
  },
  ordersContainer: {
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  orderBody: {
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  orderLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 60,
  },
  orderValue: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  coordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  coordsLabel: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginRight: 4,
  },
  coordsText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E86AB',
  },
  orderTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    padding: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
});
