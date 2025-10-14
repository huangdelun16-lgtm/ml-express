import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { packageService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';

const { width } = Dimensions.get('window');

interface Order {
  id: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  package_type: string;
  weight: string;
  description?: string;
  status: string;
  price: string;
  delivery_speed?: string;
  scheduled_delivery_time?: string;
  courier?: string;
  created_at: string;
  pickup_time?: string;
  delivery_time?: string;
  customer_rating?: number;
  customer_comment?: string;
  sender_code?: string;
  transfer_code?: string;
  store_receive_code?: string;
}

interface TrackingEvent {
  id: string;
  package_id: string;
  status: string;
  note?: string;
  event_time: string;
  latitude?: number;
  longitude?: number;
}

export default function OrderDetailScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const [order, setOrder] = useState<Order | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState('');

  // 评价相关
  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // 翻译
  const translations: any = {
    zh: {
      title: '订单详情',
      orderInfo: '订单信息',
      orderNumber: '订单号',
      orderStatus: '订单状态',
      orderTime: '下单时间',
      pickupTime: '取件时间',
      deliveryTime: '送达时间',
      deliverySpeed: '配送速度',
      senderInfo: '寄件信息',
      senderName: '寄件人',
      senderPhone: '联系电话',
      senderAddress: '寄件地址',
      receiverInfo: '收件信息',
      receiverName: '收件人',
      receiverPhone: '联系电话',
      receiverAddress: '收件地址',
      packageInfo: '包裹信息',
      packageType: '包裹类型',
      weight: '重量',
      description: '物品描述',
      priceInfo: '价格信息',
      totalPrice: '总价',
      courierInfo: '配送员',
      trackingHistory: '追踪历史',
      noTracking: '暂无追踪信息',
      cancelOrder: '取消订单',
      rateOrder: '评价订单',
      contactCourier: '联系配送员',
      confirmCancel: '确认取消订单？',
      cancelSuccess: '订单已取消',
      cancelFailed: '取消失败',
      rateTitle: '评价订单',
      rateLabel: '服务评分',
      commentLabel: '评价内容（选填）',
      commentPlaceholder: '请输入您的评价...',
      submitRate: '提交评价',
      rateSuccess: '评价成功',
      rateFailed: '评价失败',
      close: '关闭',
      loading: '加载中...',
      callPhone: '拨打电话',
      copyOrderNumber: '复制订单号',
      copied: '已复制',
      onTime: '准时达',
      urgent: '急送达',
      scheduled: '定时达',
      rated: '已评价',
      myRating: '我的评价',
    },
    en: {
      title: 'Order Details',
      orderInfo: 'Order Information',
      orderNumber: 'Order No.',
      orderStatus: 'Status',
      orderTime: 'Order Time',
      pickupTime: 'Pickup Time',
      deliveryTime: 'Delivery Time',
      deliverySpeed: 'Delivery Speed',
      senderInfo: 'Sender',
      senderName: 'Name',
      senderPhone: 'Phone',
      senderAddress: 'Address',
      receiverInfo: 'Receiver',
      receiverName: 'Name',
      receiverPhone: 'Phone',
      receiverAddress: 'Address',
      packageInfo: 'Package',
      packageType: 'Type',
      weight: 'Weight',
      description: 'Description',
      priceInfo: 'Price',
      totalPrice: 'Total',
      courierInfo: 'Courier',
      trackingHistory: 'Tracking',
      noTracking: 'No tracking info',
      cancelOrder: 'Cancel Order',
      rateOrder: 'Rate',
      contactCourier: 'Contact Courier',
      confirmCancel: 'Confirm cancel?',
      cancelSuccess: 'Order cancelled',
      cancelFailed: 'Cancel failed',
      rateTitle: 'Rate Order',
      rateLabel: 'Rating',
      commentLabel: 'Comment (Optional)',
      commentPlaceholder: 'Enter your comment...',
      submitRate: 'Submit',
      rateSuccess: 'Rated successfully',
      rateFailed: 'Rate failed',
      close: 'Close',
      loading: 'Loading...',
      callPhone: 'Call',
      copyOrderNumber: 'Copy Order No.',
      copied: 'Copied',
      onTime: 'On-Time',
      urgent: 'Urgent',
      scheduled: 'Scheduled',
      rated: 'Rated',
      myRating: 'My Rating',
    },
    my: {
      title: 'အော်ဒါအသေးစိတ်',
      orderInfo: 'အော်ဒါအချက်အလက်',
      orderNumber: 'အော်ဒါနံပါတ်',
      orderStatus: 'အခြေအနေ',
      orderTime: 'အော်ဒါအချိန်',
      pickupTime: 'ထုပ်ယူချိန်',
      deliveryTime: 'ပို့ဆောင်ချိန်',
      deliverySpeed: 'အမြန်နှုန်း',
      senderInfo: 'ပို့သူ',
      senderName: 'အမည်',
      senderPhone: 'ဖုန်း',
      senderAddress: 'လိပ်စာ',
      receiverInfo: 'လက်ခံသူ',
      receiverName: 'အမည်',
      receiverPhone: 'ဖုန်း',
      receiverAddress: 'လိပ်စာ',
      packageInfo: 'ပါဆယ်',
      packageType: 'အမျိုးအစား',
      weight: 'အလေးချိန်',
      description: 'ဖော်ပြချက်',
      priceInfo: 'စျေးနှုန်း',
      totalPrice: 'စုစုပေါင်း',
      courierInfo: 'ပို့ဆောင်သူ',
      trackingHistory: 'ခြေရာခံ',
      noTracking: 'အချက်အလက်မရှိ',
      cancelOrder: 'ပယ်ဖျက်',
      rateOrder: 'အဆင့်သတ်မှတ်',
      contactCourier: 'ဆက်သွယ်',
      confirmCancel: 'ပယ်ဖျက်မှာသေချာပါသလား?',
      cancelSuccess: 'ပယ်ဖျက်ပြီး',
      cancelFailed: 'ပယ်ဖျက်မအောင်မြင်',
      rateTitle: 'အဆင့်သတ်မှတ်',
      rateLabel: 'ရမှတ်',
      commentLabel: 'မှတ်ချက် (ရွေးချယ်)',
      commentPlaceholder: 'မှတ်ချက်ထည့်ပါ...',
      submitRate: 'တင်သွင်း',
      rateSuccess: 'အောင်မြင်',
      rateFailed: 'မအောင်မြင်',
      close: 'ပိတ်',
      loading: 'တင်နေသည်...',
      callPhone: 'ခေါ်ဆိုမည်',
      copyOrderNumber: 'ကော်ပီကူး',
      copied: 'ကော်ပီကူးပြီး',
      onTime: 'ပုံမှန်',
      urgent: 'အမြန်',
      scheduled: 'စီစဉ်ထား',
      rated: 'အဆင့်သတ်မှတ်ပြီး',
      myRating: 'ကျွန်ုပ်၏အဆင့်',
    },
  };

  const t = translations[language] || translations.zh;

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载用户ID
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        setCustomerId(user.id);
      }

      // 加载订单详情
      const orderData = await packageService.getOrderById(orderId);
      if (orderData) {
        setOrder(orderData);
      }

      // 加载追踪历史
      const history = await packageService.getTrackingHistory(orderId);
      setTrackingHistory(history);
    } catch (error) {
      console.error('加载订单详情失败:', error);
      Alert.alert('错误', '加载订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 取消订单
  const handleCancelOrder = () => {
    Alert.alert(
      t.cancelOrder,
      t.confirmCancel,
      [
        { text: t.close, style: 'cancel' },
        {
          text: t.cancelOrder,
          style: 'destructive',
          onPress: async () => {
            showLoading();
            const result = await packageService.cancelOrder(orderId, customerId);
            hideLoading();
            
            if (result.success) {
              Alert.alert(t.cancelSuccess, result.message);
              loadData(); // 重新加载数据
            } else {
              Alert.alert(t.cancelFailed, result.message);
            }
          },
        },
      ]
    );
  };

  // 打开评价弹窗
  const handleOpenRateModal = () => {
    setShowRateModal(true);
  };

  // 提交评价
  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('提示', '请选择评分');
      return;
    }

    showLoading();
    const result = await packageService.rateOrder(orderId, customerId, rating, comment);
    hideLoading();
    
    if (result.success) {
      Alert.alert(t.rateSuccess, result.message);
      setShowRateModal(false);
      loadData(); // 重新加载数据
    } else {
      Alert.alert(t.rateFailed, result.message);
    }
  };

  // 联系配送员
  const handleContactCourier = () => {
    if (!order?.courier) {
      Alert.alert('提示', '暂无配送员信息');
      return;
    }
    // 这里可以实现拨打电话或发送消息
    Alert.alert('提示', `联系配送员: ${order.courier}`);
  };

  // 拨打电话
  const handleCallPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colors: any = {
      '待取件': '#f59e0b',
      '已取件': '#3b82f6',
      '配送中': '#8b5cf6',
      '已送达': '#10b981',
      '已取消': '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  // 格式化日期
  const formatDate = (dateString?: string) => {
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

  // 格式化配送速度
  const formatDeliverySpeed = (speed?: string) => {
    if (!speed) return t.onTime;
    const speedMap: any = {
      '准时达': t.onTime,
      '急送达': t.urgent,
      '定时达': t.scheduled,
    };
    return speedMap[speed] || speed;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>订单不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部状态栏 */}
      <LinearGradient
        colors={[getStatusColor(order.status), getStatusColor(order.status) + 'dd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statusBar}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>{order.status}</Text>
          <Text style={styles.statusSubtitle}>{t.orderNumber}: {order.id}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 订单信息卡片 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 {t.orderInfo}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.orderTime}:</Text>
            <Text style={styles.infoValue}>{formatDate(order.created_at)}</Text>
          </View>
          {order.pickup_time && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.pickupTime}:</Text>
              <Text style={styles.infoValue}>{formatDate(order.pickup_time)}</Text>
            </View>
          )}
          {order.delivery_time && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.deliveryTime}:</Text>
              <Text style={styles.infoValue}>{formatDate(order.delivery_time)}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.deliverySpeed}:</Text>
            <Text style={styles.infoValue}>{formatDeliverySpeed(order.delivery_speed)}</Text>
          </View>
          {order.scheduled_delivery_time && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>指定时间:</Text>
              <Text style={styles.infoValue}>{formatDate(order.scheduled_delivery_time)}</Text>
            </View>
          )}
        </View>

        {/* 寄件信息 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 {t.senderInfo}</Text>
          <View style={styles.addressContainer}>
            <View style={styles.addressRow}>
              <Text style={styles.addressName}>{order.sender_name}</Text>
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={() => handleCallPhone(order.sender_phone)}
                activeOpacity={0.7}
              >
                <Text style={styles.phoneButtonText}>📞 {order.sender_phone}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addressText}>📍 {order.sender_address}</Text>
          </View>
        </View>

        {/* 收件信息 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📥 {t.receiverInfo}</Text>
          <View style={styles.addressContainer}>
            <View style={styles.addressRow}>
              <Text style={styles.addressName}>{order.receiver_name}</Text>
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={() => handleCallPhone(order.receiver_phone)}
                activeOpacity={0.7}
              >
                <Text style={styles.phoneButtonText}>📞 {order.receiver_phone}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addressText}>📍 {order.receiver_address}</Text>
          </View>
        </View>

        {/* 包裹信息 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 {t.packageInfo}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.packageType}:</Text>
            <Text style={styles.infoValue}>{order.package_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.weight}:</Text>
            <Text style={styles.infoValue}>{order.weight}</Text>
          </View>
          {order.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.description}:</Text>
              <Text style={styles.infoValue}>{order.description}</Text>
            </View>
          )}
        </View>

        {/* 价格信息 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 {t.priceInfo}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t.totalPrice}</Text>
            <Text style={styles.priceValue}>{order.price} MMK</Text>
          </View>
        </View>

        {/* 配送员信息 */}
        {order.courier && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏍️ {t.courierInfo}</Text>
            <View style={styles.courierContainer}>
              <Text style={styles.courierName}>{order.courier}</Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactCourier}
                activeOpacity={0.7}
              >
                <Text style={styles.contactButtonText}>{t.contactCourier}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 追踪历史 */}
        {trackingHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 {t.trackingHistory}</Text>
            {trackingHistory.map((event, index) => (
              <View key={event.id} style={styles.trackingItem}>
                <View style={styles.trackingDot}>
                  <View style={[
                    styles.trackingDotInner,
                    index === 0 && styles.trackingDotActive
                  ]} />
                  {index !== trackingHistory.length - 1 && (
                    <View style={styles.trackingLine} />
                  )}
                </View>
                <View style={styles.trackingContent}>
                  <Text style={styles.trackingStatus}>{event.status}</Text>
                  {event.note && (
                    <Text style={styles.trackingNote}>{event.note}</Text>
                  )}
                  <Text style={styles.trackingTime}>{formatDate(event.event_time)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 评价区域 */}
        {order.customer_rating && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⭐ {t.myRating}</Text>
            <View style={styles.ratingDisplay}>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text key={star} style={styles.starDisplay}>
                    {star <= order.customer_rating! ? '⭐' : '☆'}
                  </Text>
                ))}
              </View>
              {order.customer_comment && (
                <Text style={styles.commentDisplay}>{order.customer_comment}</Text>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 底部操作按钮 */}
      <View style={styles.bottomActions}>
        {order.status === '待取件' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCancelOrder}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>{t.cancelOrder}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {order.status === '已送达' && !order.customer_rating && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleOpenRateModal}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>⭐ {t.rateOrder}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* 评价弹窗 */}
      <Modal
        visible={showRateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.rateTitle}</Text>

            {/* 星级评分 */}
            <Text style={styles.modalLabel}>{t.rateLabel}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.star}>{star <= rating ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 评价内容 */}
            <Text style={styles.modalLabel}>{t.commentLabel}</Text>
            <TextInput
              style={styles.commentInput}
              placeholder={t.commentPlaceholder}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />

            {/* 按钮 */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowRateModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextCancel}>{t.close}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleSubmitRating}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonTextSubmit}>{t.submitRate}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  statusBar: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 2,
    textAlign: 'right',
  },
  addressContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  phoneButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  phoneButtonText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  courierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
  },
  courierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  contactButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  trackingItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  trackingDot: {
    width: 40,
    alignItems: 'center',
  },
  trackingDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#cbd5e1',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  trackingDotActive: {
    backgroundColor: '#3b82f6',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  trackingLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginTop: 4,
  },
  trackingContent: {
    flex: 1,
    paddingLeft: 12,
  },
  trackingStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  trackingNote: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  trackingTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  ratingDisplay: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starDisplay: {
    fontSize: 32,
    marginHorizontal: 4,
  },
  commentDisplay: {
    fontSize: 14,
    color: '#78350f',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  star: {
    fontSize: 40,
    marginHorizontal: 4,
  },
  commentInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonCancel: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalButtonSubmit: {
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  modalButtonTextSubmit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
