import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { packageService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import Toast from '../components/Toast';

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState('');
  
  // Toast状态
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // 翻译
  const translations: any = {
    zh: {
      title: '我的订单',
      all: '全部',
      pending: '待取件',
      pickedUp: '已取件',
      inTransit: '配送中',
      delivered: '已送达',
      cancelled: '已取消',
      noOrders: '暂无订单',
      noOrdersDesc: '快来下单吧！',
      sender: '寄件人',
      receiver: '收件人',
      status: '状态',
      price: '价格',
      time: '下单时间',
      detail: '查看详情',
      cancel: '取消订单',
      rate: '评价',
      loading: '加载中...',
      packageType: '包裹类型',
      weight: '重量',
      courier: '配送员',
    },
    en: {
      title: 'My Orders',
      all: 'All',
      pending: 'Pending',
      pickedUp: 'Picked Up',
      inTransit: 'In Transit',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      noOrders: 'No Orders',
      noOrdersDesc: 'Place your first order now!',
      sender: 'Sender',
      receiver: 'Receiver',
      status: 'Status',
      price: 'Price',
      time: 'Order Time',
      detail: 'View Details',
      cancel: 'Cancel',
      rate: 'Rate',
      loading: 'Loading...',
      packageType: 'Type',
      weight: 'Weight',
      courier: 'Courier',
    },
    my: {
      title: 'ကျွန်ုပ်၏ အော်ဒါများ',
      all: 'အားလုံး',
      pending: 'စောင့်ဆိုင်းဆဲ',
      pickedUp: 'ထုပ်ယူပြီး',
      inTransit: 'ပို့ဆောင်နေသည်',
      delivered: 'ပို့ဆောင်ပြီး',
      cancelled: 'ပယ်ဖျက်ပြီး',
      noOrders: 'အော်ဒါမရှိပါ',
      noOrdersDesc: 'အော်ဒါတင်ပါ!',
      sender: 'ပို့သူ',
      receiver: 'လက်ခံသူ',
      status: 'အခြေအနေ',
      price: 'စျေးနှုန်း',
      time: 'အော်ဒါအချိန်',
      detail: 'အသေးစိတ်',
      cancel: 'ပယ်ဖျက်',
      rate: 'အဆင့်သတ်မှတ်',
      loading: 'တင်နေသည်...',
      packageType: 'အမျိုးအစား',
      weight: 'အလေးချိန်',
      courier: 'ပို့ဆောင်သူ',
    },
  };

  const t = translations[language] || translations.zh;

  // 显示Toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // 状态过滤器
  const statusFilters = [
    { key: 'all', label: t.all, color: '#6b7280' },
    { key: '待取件', label: t.pending, color: '#f59e0b' },
    { key: '已取件', label: t.pickedUp, color: '#3b82f6' },
    { key: '配送中', label: t.inTransit, color: '#8b5cf6' },
    { key: '已送达', label: t.delivered, color: '#10b981' },
    { key: '已取消', label: t.cancelled, color: '#ef4444' },
  ];

  // 加载用户ID
  useEffect(() => {
    loadCustomerId();
  }, []);

  const loadCustomerId = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const isGuest = await AsyncStorage.getItem('isGuest');
      
      if (userData) {
        const user = JSON.parse(userData);
        setCustomerId(user.id);
        
        // 如果是访客，不加载订单
        if (isGuest === 'true' || user.id === 'guest') {
          setLoading(false);
          setOrders([]);
          setFilteredOrders([]);
        } else {
          loadOrders(user.id);
        }
      } else {
        // 没有用户信息，跳转登录
        Alert.alert('提示', '请先登录', [
          { text: '取消', style: 'cancel' },
          { text: '去登录', onPress: () => navigation.navigate('Login') }
        ]);
        setLoading(false);
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
      setLoading(false);
    }
  };

  // 加载订单
  const loadOrders = async (userId: string) => {
    try {
      setLoading(true);
      const { orders: data } = await packageService.getAllOrders(userId);
      setOrders(data);
      filterOrders(data, selectedStatus);
    } catch (error: any) {
      console.error('加载订单失败:', error);
      const errorMsg = error?.message || '加载订单失败，请稍后重试';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 刷新
  const onRefresh = useCallback(async () => {
    if (!customerId) return;
    setRefreshing(true);
    await loadOrders(customerId);
    setRefreshing(false);
  }, [customerId]);

  // 过滤订单
  const filterOrders = (orderList: Order[], status: string) => {
    if (status === 'all') {
      setFilteredOrders(orderList);
    } else {
      setFilteredOrders(orderList.filter(order => order.status === status));
    }
  };

  // 切换状态筛选
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    filterOrders(orders, status);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const filter = statusFilters.find(f => f.key === status);
    return filter?.color || '#6b7280';
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 查看详情
  const handleViewDetail = (orderId: string) => {
    navigation.navigate('OrderDetail', { orderId });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toast通知 */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={() => setToastVisible(false)}
      />

      {/* 顶部渐变背景 */}
      <LinearGradient
        colors={['#b0d3e8', '#a2c3d6', '#93b4c5', '#86a4b4', '#7895a3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{t.title}</Text>
        <Text style={styles.headerSubtitle}>
          {t.all} {orders.length} {language === 'zh' ? '个订单' : language === 'en' ? 'Orders' : 'အော်ဒါ'}
        </Text>
      </LinearGradient>

      {/* 状态筛选器 */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {statusFilters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                selectedStatus === filter.key && styles.filterChipActive,
              ]}
              onPress={() => handleStatusChange(filter.key)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={
                  selectedStatus === filter.key
                    ? [filter.color, filter.color + 'dd']
                    : ['#ffffff', '#ffffff']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterChipGradient}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedStatus === filter.key && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
                {filter.key !== 'all' && (
                  <View
                    style={[
                      styles.filterBadge,
                      { backgroundColor: selectedStatus === filter.key ? '#ffffff33' : filter.color + '33' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterBadgeText,
                        { color: selectedStatus === filter.key ? '#ffffff' : filter.color },
                      ]}
                    >
                      {orders.filter(o => o.status === filter.key).length}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 订单列表 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>{t.noOrders}</Text>
            <Text style={styles.emptyDesc}>{t.noOrdersDesc}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('PlaceOrder')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyButtonGradient}
              >
                <Text style={styles.emptyButtonText}>
                  {language === 'zh' ? '立即下单' : language === 'en' ? 'Place Order' : 'အော်ဒါတင်'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => handleViewDetail(order.id)}
              activeOpacity={0.7}
            >
              {/* 订单头部 */}
              <View style={styles.orderHeader}>
                <View style={styles.orderHeaderLeft}>
                  <Text style={styles.orderPackageType}>{order.package_type}</Text>
                  <Text style={styles.orderWeight}>{order.weight}</Text>
                </View>
                <View style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.orderStatusText}>{order.status}</Text>
                </View>
              </View>

              {/* 寄件人信息 */}
              <View style={styles.orderInfo}>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoIcon}>📤</Text>
                  <Text style={styles.orderInfoLabel}>{t.sender}:</Text>
                  <Text style={styles.orderInfoValue}>{order.sender_name}</Text>
                  <Text style={styles.orderInfoPhone}>{order.sender_phone}</Text>
                </View>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoIcon}>📍</Text>
                  <Text style={styles.orderInfoAddress} numberOfLines={1}>
                    {order.sender_address}
                  </Text>
                  {order.sender_latitude && order.sender_longitude && (
                    <Text style={styles.orderInfoCoords}>
                      ({order.sender_latitude.toFixed(6)}, {order.sender_longitude.toFixed(6)})
                    </Text>
                  )}
                </View>
              </View>

              {/* 收件人信息 */}
              <View style={styles.orderInfo}>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoIcon}>👤</Text>
                  <Text style={styles.orderInfoLabel}>{t.receiver}:</Text>
                  <Text style={styles.orderInfoValue}>{order.receiver_name}</Text>
                  <Text style={styles.orderInfoPhone}>{order.receiver_phone}</Text>
                </View>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoIcon}>📍</Text>
                  <Text style={styles.orderInfoAddress} numberOfLines={1}>
                    {order.receiver_address}
                  </Text>
                  {order.receiver_latitude && order.receiver_longitude && (
                    <Text style={styles.orderInfoCoords}>
                      ({order.receiver_latitude.toFixed(6)}, {order.receiver_longitude.toFixed(6)})
                    </Text>
                  )}
                </View>
              </View>

              {/* 配送员信息（如有） */}
              {order.courier && (
                <View style={styles.orderCourier}>
                  <Text style={styles.orderCourierIcon}>🏍️</Text>
                  <Text style={styles.orderCourierText}>
                    {t.courier}: {order.courier}
                  </Text>
                </View>
              )}

              {/* 订单底部 */}
              <View style={styles.orderFooter}>
                <View style={styles.orderFooterLeft}>
                  <Text style={styles.orderPrice}>{order.price} MMK</Text>
                  <Text style={styles.orderTime}>{formatDate(order.created_at)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => handleViewDetail(order.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.detailButtonText}>{t.detail}</Text>
                  <Text style={styles.detailButtonIcon}>→</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  filtersContainer: {
    marginTop: -15,
    paddingBottom: 10,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterChipActive: {
    shadowOpacity: 0.2,
    elevation: 6,
  },
  filterChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 30,
    textAlign: 'center',
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderPackageType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  orderWeight: {
    fontSize: 14,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  orderInfo: {
    marginBottom: 12,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderInfoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 8,
  },
  orderInfoPhone: {
    fontSize: 13,
    color: '#64748b',
  },
  orderInfoAddress: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
    marginLeft: 4,
  },
  orderInfoCoords: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
    marginLeft: 8,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderCourier: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  orderCourierIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  orderCourierText: {
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderFooterLeft: {
    flex: 1,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  detailButtonIcon: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: 'bold',
  },
});
