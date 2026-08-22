import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Modal, TextInput, Linking, Image, DeviceEventEmitter } from 'react-native';
import { theme } from '../config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOrderChat } from '../hooks/useOrderChat';
import CourierChatModal from '../components/orderChat/CourierChatModal';
import LoggerService from '../services/LoggerService';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import { ensureSaveToLibraryPermission } from '../utils/mediaAccess';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { packageService, reviewService, supabase } from '../services/supabase';
import { addDismissedReviewOrderId, getDismissedReviewOrderIds } from '../utils/reviewPromptStorage';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import Toast from '../components/Toast';
import BackToHomeButton from '../components/BackToHomeButton';
import { type AppLang, getJourneyCopy, getJourneyLabels } from '../utils/orderJourney';
import { common, tt } from '../i18n';

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
  scheduled_delivery_time?: string;
  courier?: string;
  created_at: string;
  pickup_time?: string;
  delivery_time?: string;
  customer_rating?: number;
  customer_comment?: string;
  courier_service_rating?: number;
  delivery_store_id?: string;
  sender_code?: string;
  transfer_code?: string;
  store_receive_code?: string;
  cod_amount?: number;
  payment_method?: 'qr' | 'cash' | 'balance';
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
  const c = common(language);
  const { showLoading, hideLoading } = useLoading();
  const [order, setOrder] = useState<Order | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState('');
  const [deliveryPhotos, setDeliveryPhotos] = useState<any[]>([]); // 🚀 新增：配送照片状态

  const {
    showChatModal,
    openChat,
    closeChat,
    messages,
    inputText,
    setInputText,
    sending,
    sendMessage,
    unreadCount,
  } = useOrderChat({
    orderId,
    userId: customerId || null,
    enabled: Boolean(orderId && customerId),
    sendFailedText: c.sendFailed,
  });

  // 评价相关
  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [courierRating, setCourierRating] = useState(5);
  const [comment, setComment] = useState('');
  const rateAutoHandledRef = useRef(false);
  const [rateModalStoreName, setRateModalStoreName] = useState('');

  // QR码模态框
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const viewShotRef = useRef<any>(null);

  // 保存二维码到相册
  const handleSaveQRCode = async () => {
    try {
      showLoading(c.saving, 'package');
      const granted = await ensureSaveToLibraryPermission();
      if (!granted) {
        hideLoading();
        Alert.alert(
          c.permissionTitle,
          c.galleryPermissionQr
        );
        return;
      }

      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      hideLoading();
      Alert.alert(
        c.saved,
        c.qrSaved
      );
    } catch (error) {
      hideLoading();
      LoggerService.error('保存二维码失败:', error);
      Alert.alert(
        c.saveFailed,
        c.cannotSaveImage
      );
    }
  };

  // Toast状态
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // 翻译
  const translations: any = {
    zh: {
      title: '订单详情',
      orderInfo: '订单信息',
      orderNumber: '订单号',
      storeLabel: '商店',
      courierLabel: '配送骑手',
      orderStatus: '订单状态',
      ordererIdentity: '下单人身份',
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
      deliveryFee: '跑腿费',
      itemFee: '商品费',
      balancePayment: '余额支付',
      cashPayment: '现金支付',
      cod: '代收款',
      totalAmount: '总金额',
      none: '无',
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
      merchantProductRating: '商家商品',
      courierServiceRating: '骑手配送服务',
      commentLabel: '评价内容（选填）',
      commentPlaceholder: '请输入您的评价...',
      submitRate: '提交评价',
      rateSuccess: '评价成功',
      rateFailed: '评价失败',
      close: '关闭',
      viewQRCode: '查看QR Code',
      qrCodeTitle: '订单二维码',
      saveQRHint: '长按二维码可保存图片',
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
      storeLabel: 'Store',
      courierLabel: 'Courier',
      orderStatus: 'Status',
      ordererIdentity: 'Orderer Identity',
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
      deliveryFee: 'Delivery Fee',
      itemFee: 'Item Fee',
      balancePayment: 'Balance Payment',
      cashPayment: 'Cash Payment',
      cod: 'COD',
      totalAmount: 'Total Amount',
      none: 'None',
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
      merchantProductRating: 'Merchant & product',
      courierServiceRating: 'Delivery / courier',
      commentLabel: 'Comment (Optional)',
      commentPlaceholder: 'Enter your comment...',
      submitRate: 'Submit',
      rateSuccess: 'Rated successfully',
      rateFailed: 'Rate failed',
      close: 'Close',
      viewQRCode: 'View QR Code',
      qrCodeTitle: 'Order QR Code',
      saveQRHint: 'Long press to save QR code',
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
      storeLabel: 'ဆိုင်',
      courierLabel: 'ပို့ဆောင်သူ',
      orderStatus: 'အခြေအနေ',
      ordererIdentity: 'အော်ဒါတင်သူ အမျိုးအစား',
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
      deliveryFee: 'ပို့ဆောင်ခ',
      itemFee: 'ကုန်ပစ္စည်းဖိုး',
      balancePayment: 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း',
      cashPayment: 'ငွေသားဖြင့် ပေးချေခြင်း',
      cod: 'ငွေကောက်ခံရန်',
      totalAmount: 'စုစုပေါင်း',
      none: 'မရှိ',
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
      merchantProductRating: 'ကုန်ပစ္စည်း/ဆိုင်',
      courierServiceRating: 'ပို့ဆောင်မှု',
      commentLabel: 'မှတ်ချက် (ရွေးချယ်)',
      commentPlaceholder: 'မှတ်ချက်ထည့်ပါ...',
      submitRate: 'တင်သွင်း',
      rateSuccess: 'အောင်မြင်',
      rateFailed: 'မအောင်မြင်',
      close: 'ပိတ်',
      viewQRCode: 'QR ကုဒ်ကြည့်ရှုရန်',
      qrCodeTitle: 'အမှာစာ QR ကုဒ်',
      saveQRHint: 'QR ကုဒ်ကိုသိမ်းဆည်းရန် ရှည်လျား၍နှိပ်ပါ',
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

  // 显示Toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // 复制订单号
  const copyOrderNumber = async () => {
    try {
      await Clipboard.setStringAsync(order?.id || '');
      showToast(t.copied, 'success');
    } catch (error) {
      LoggerService.error('复制订单号失败:', error);
      showToast(c.copyFailed, 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [orderId]);

  useEffect(() => {
    rateAutoHandledRef.current = false;
  }, [orderId]);

  // 已送达且未评：进入详情后自动弹评价（可关闭，关闭后同「我的订单」会写入「不再自动打扰」）
  useEffect(() => {
    if (!order) return;
    if (order.status !== '已送达' || order.customer_rating) return;
    if (rateAutoHandledRef.current) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      const dismissed = await getDismissedReviewOrderIds();
      if (!alive) return;
      if (dismissed.has(orderId)) {
        rateAutoHandledRef.current = true;
        return;
      }
      timer = setTimeout(() => {
        if (!alive) return;
        if (rateAutoHandledRef.current) return;
        rateAutoHandledRef.current = true;
        setRating(5);
        setCourierRating(5);
        setComment('');
        setShowRateModal(true);
      }, 500);
    })();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [order, orderId]);

  useEffect(() => {
    if (!order?.delivery_store_id) {
      setRateModalStoreName('');
      return;
    }
    let alive = true;
    void supabase
      .from('delivery_stores')
      .select('store_name')
      .eq('id', order.delivery_store_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setRateModalStoreName((data as { store_name?: string } | null)?.store_name || '');
      });
    return () => {
      alive = false;
    };
  }, [order?.id, order?.delivery_store_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载用户ID（会员 App 仅 customer）
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        setCustomerId(user.id);
      }

      await loadOrderDetails();
    } catch (error: any) {
      LoggerService.error('加载订单数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async () => {
    try {
      // 加载订单详情
      const orderData = await packageService.getOrderById(orderId);
      if (orderData) {
        setOrder(orderData);
      }

      // 加载追踪历史
      const history = await packageService.getTrackingHistory(orderId);
      setTrackingHistory(history);

      // 🚀 新增：加载配送照片
      const { deliveryPhotoService } = require('../services/supabase');
      const photos = await deliveryPhotoService.getPackagePhotos(orderId);
      setDeliveryPhotos(photos);
    } catch (error) {
      LoggerService.error('加载订单详情内部失败:', error);
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
    rateAutoHandledRef.current = true;
    setRating(5);
    setCourierRating(5);
    setComment('');
    setShowRateModal(true);
  };

  const handleCloseRateModal = useCallback(async () => {
    await addDismissedReviewOrderId(orderId);
    setShowRateModal(false);
  }, [orderId]);

  // 提交评价（商家商品 + 骑手配送，写入 store_reviews 并同步 packages）
  const handleSubmitRating = async () => {
    if (!order || !customerId) return;
    const customerIdFromDescription = order.description?.match(/\[客户ID: ([^\]]+)\]/)?.[1];
    if (customerIdFromDescription !== customerId) {
      Alert.alert(c.notice, c.notAllowed);
      return;
    }
    if (order.status !== '已送达') {
      Alert.alert(c.notice, c.onlyDeliveredCanRate);
      return;
    }

    showLoading();
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const user = userData ? JSON.parse(userData) : null;
      const result = await reviewService.createReview({
        store_id: order.delivery_store_id || '00000000-0000-0000-0000-000000000000',
        order_id: orderId,
        user_id: customerId,
        user_name: user?.name || 'User',
        rating,
        courier_rating: courierRating,
        comment: comment.trim(),
        images: [],
        is_anonymous: false,
      });
      hideLoading();

      if (result.success) {
        DeviceEventEmitter.emit('order_status_updated');
        Alert.alert(t.rateSuccess, c.thankYouFeedback);
        setShowRateModal(false);
        loadData();
      } else {
        Alert.alert(t.rateFailed, c.tryAgain);
      }
    } catch (error) {
      hideLoading();
      LoggerService.error('提交评价失败:', error);
      Alert.alert(t.rateFailed, c.tryAgain);
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
    if (!phone || !phone.trim()) {
      Alert.alert('提示', '暂无联系电话');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colors: any = {
      '待取件': '#f59e0b',
      '已取件': '#2C98A6',
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

  const formatText = (value?: string) => {
    if (!value) return t.none;
    const trimmed = value.trim();
    return trimmed ? trimmed : t.none;
  };

  const formatCoord = (value?: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
    return value.toFixed(6);
  };

  const hasCoords = (lat?: number, lng?: number) =>
    typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng);

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

  // 🚀 从描述中提取商品费用
  const getItemCost = (description: string = '') => {
    // 增强型正则，支持更多变体和空格
    const match = description.match(/\[(?:商品费用|Item Cost|ကုန်ပစ္စည်းဖိုး|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း)\s*[\(（]?.*?[\)）]?\s*:\s*(.*?)\s*MMK\]/i);
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C98A6" />
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

  const senderPhone = (order.sender_phone || '').trim();
  const receiverPhone = (order.receiver_phone || '').trim();

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
          <View style={styles.orderNumberContainer}>
            <Text style={styles.statusSubtitle}>{t.orderNumber}: {order.id}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={copyOrderNumber}
              activeOpacity={0.7}
            >
              <Text style={styles.copyButtonText}>📋</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {(() => {
          const appLang: AppLang = language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh';
          const journey = getJourneyCopy(order.status, appLang);
          const labels = getJourneyLabels(appLang);
          const stepIdx = journey.activeStep;
          const isComplete = (i: number) => stepIdx === 3 || (stepIdx >= 0 && stepIdx > i);
          const isCurrent = (i: number) => i === stepIdx && stepIdx >= 0 && stepIdx < 3;
          const titleJourney =
            appLang === 'en' ? 'Order progress' : appLang === 'my' ? 'အော်ဒါတိုးတက်မှု' : '订单进度';
          const trackLabel =
            appLang === 'en' ? 'Live tracking' : appLang === 'my' ? 'တိုက်ရိုက်ပြမြေပုံ' : '实时追踪';
          const chatLabel =
            appLang === 'en' ? 'Chat' : appLang === 'my' ? 'ဆက်သွယ်ရန်' : '联系骑手';
          return (
            <View style={styles.journeyCard}>
              <Text style={styles.journeyCardTitle}>📍 {titleJourney}</Text>
              <View style={styles.journeyStepsRow}>
                {labels.map((label, i) => (
                  <View key={i} style={styles.journeyStepItem}>
                    {isCurrent(i) ? (
                      <View style={styles.journeyDotCurrentOuter}>
                        <View style={styles.journeyDotCurrentInner} />
                      </View>
                    ) : (
                      <View
                        style={[styles.journeyDot, isComplete(i) && styles.journeyDotDone]}
                      />
                    )}
                    <Text numberOfLines={2} style={styles.journeyStepLabel}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
              <View
                style={[
                  styles.journeyMessageBox,
                  journey.variant === 'warning' && styles.journeyMessageWarn,
                  journey.variant === 'success' && styles.journeyMessageOk,
                  journey.variant === 'muted' && styles.journeyMessageMuted,
                ]}
              >
                <Text style={styles.journeyHeadline}>{journey.headline}</Text>
                <Text style={styles.journeyDetail}>{journey.detail}</Text>
              </View>
              <View style={styles.journeyActions}>
                {journey.suggestTrack && order.status !== '已取消' && (
                  <TouchableOpacity
                    style={styles.journeyActionBtn}
                    onPress={() => navigation.navigate('Main', { screen: 'TrackOrder', params: { orderId: order.id } })}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="map-outline" size={18} color="#fff" />
                    <Text style={styles.journeyActionBtnText}>{trackLabel}</Text>
                  </TouchableOpacity>
                )}
                {journey.suggestChat && order.courier && order.courier !== '待分配' && (
                  <TouchableOpacity
                    style={[styles.journeyActionBtn, styles.journeyActionBtnSecondary]}
                    onPress={openChat}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color={theme.colors.primary.DEFAULT}
                    />
                    <Text style={styles.journeyActionBtnTextSecondary}>{chatLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })()}
        {/* 订单信息卡片 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 {t.orderInfo}</Text>
          
          {(() => {
            const identityMatch = order.description?.match(/\[(?:下单身份|Orderer Identity|Orderer|အော်ဒါတင်သူ အမျိုးအစား|အော်ဒါတင်သူ): (.*?)\]/);
            if (identityMatch && identityMatch[1]) {
              let identity = identityMatch[1];
              // 🚀 核心优化：如果是商家身份，统一显示为 MERCHANTS
              if (identity === '商家' || identity === 'merchant') {
                identity = 'MERCHANTS';
              }
              
              return (
                <View style={[styles.infoRow, { borderBottomColor: '#f1f5f9' }]}>
                  <Text style={[styles.infoLabel, { fontWeight: 'bold' }]}>{t.ordererIdentity}:</Text>
                  <View style={{ backgroundColor: identity === 'MERCHANTS' ? '#2C98A6' : '#f59e0b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '800' }}>{identity}</Text>
                  </View>
                </View>
              );
            }
            return null;
          })()}

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
              <Text style={styles.addressName}>{formatText(order.sender_name)}</Text>
              <TouchableOpacity
                style={[styles.phoneButton, !senderPhone && styles.phoneButtonDisabled]}
                onPress={() => handleCallPhone(senderPhone)}
                activeOpacity={0.7}
                disabled={!senderPhone}
              >
                <Text style={styles.phoneButtonText}>📞 {senderPhone || t.none}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addressText}>📍 {formatText(order.sender_address)}</Text>
            {hasCoords(order.sender_latitude, order.sender_longitude) && (
              <View style={styles.coordsContainer}>
                <Text style={styles.coordsLabel}>经纬度：</Text>
                <Text style={styles.coordsText}>
                  {formatCoord(order.sender_latitude)}, {formatCoord(order.sender_longitude)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 收件信息 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📥 {t.receiverInfo}</Text>
          <View style={styles.addressContainer}>
            <View style={styles.addressRow}>
              <Text style={styles.addressName}>{formatText(order.receiver_name)}</Text>
              <TouchableOpacity
                style={[styles.phoneButton, !receiverPhone && styles.phoneButtonDisabled]}
                onPress={() => handleCallPhone(receiverPhone)}
                activeOpacity={0.7}
                disabled={!receiverPhone}
              >
                <Text style={styles.phoneButtonText}>📞 {receiverPhone || t.none}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addressText}>📍 {formatText(order.receiver_address)}</Text>
            {hasCoords(order.receiver_latitude, order.receiver_longitude) && (
              <View style={styles.coordsContainer}>
                <Text style={styles.coordsLabel}>经纬度：</Text>
                <Text style={styles.coordsText}>
                  {formatCoord(order.receiver_latitude)}, {formatCoord(order.receiver_longitude)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 包裹信息 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 {t.packageInfo}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.packageType}:</Text>
            <Text style={styles.infoValue}>{formatText(order.package_type)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.weight}:</Text>
            <Text style={styles.infoValue}>{formatText(order.weight)}</Text>
          </View>
          {order.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.description}:</Text>
              <Text style={styles.infoValue}>{formatText(order.description)}</Text>
            </View>
          )}
          
          {/* 🚀 新增：从描述中解析“余额支付”并显示 */}
          {(() => {
            const payMatch = order.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/);
            if (payMatch && payMatch[1]) {
              return (
                <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 5, paddingTop: 15 }]}>
                  <Text style={[styles.infoLabel, { fontWeight: 'bold', color: '#10b981' }]}>
                    {c.itemCostBalanceOnly}:
                  </Text>
                  <Text style={[styles.infoValue, { fontWeight: 'bold', color: '#10b981' }]}>
                    {payMatch[1]} MMK
                  </Text>
                </View>
              );
            }
            return null;
          })()}
        </View>

        {/* 价格信息 */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.cardTitle}>💰 {t.priceInfo}</Text>
            <Ionicons name="receipt-outline" size={20} color="#64748b" />
          </View>
          
          {(() => {
            const description = order.description || '';
            const isVIP = description.includes('[下单身份: VIP]') || description.includes('[Orderer: VIP]');
            const itemCost = getItemCost(description);
            const deliveryFee = parseFloat(order.price?.replace(/[^0-9.]/g, '') || '0');
            const total = itemCost + deliveryFee;

            if (isVIP && itemCost > 0) {
              return (
                <View style={styles.merchantsPriceContainer}>
                  {/* 商品费项目 */}
                  <View style={styles.priceRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="bag-handle-outline" size={16} color="#fbbf24" style={{ marginRight: 8 }} />
                        <Text style={[styles.priceLabel, { fontWeight: '700' }]}>{t.itemFee}</Text>
                      </View>
                      <View style={{ backgroundColor: '#ecfdf5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 24 }}>
                        <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>✨ {t.balancePayment}</Text>
                      </View>
                    </View>
                    <Text style={[styles.priceValue, { color: '#1e293b' }]}>{itemCost.toLocaleString()} MMK</Text>
                  </View>

                  {/* 跑腿费项目 */}
                  <View style={[styles.priceRow, { marginTop: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="flash-outline" size={16} color="#2C98A6" style={{ marginRight: 8 }} />
                        <Text style={[styles.priceLabel, { fontWeight: '700' }]}>{t.deliveryFee}</Text>
                      </View>
                      <View style={{ 
                        backgroundColor: order.payment_method === 'balance' ? '#ecfdf5' : '#fff7ed', 
                        alignSelf: 'flex-start', 
                        paddingHorizontal: 8, 
                        paddingVertical: 2, 
                        borderRadius: 6,
                        marginLeft: 24,
                        borderWidth: 1,
                        borderColor: order.payment_method === 'balance' ? '#10b98122' : '#f59e0b22'
                      }}>
                        <Text style={{ 
                          color: order.payment_method === 'balance' ? '#10b981' : '#f59e0b', 
                          fontSize: 11, 
                          fontWeight: '800' 
                        }}>
                          {order.payment_method === 'balance' ? `✨ ${t.balancePayment}` : `💵 ${t.cashPayment}`}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.priceValue, { color: '#1e293b' }]}>{deliveryFee.toLocaleString()} MMK</Text>
                  </View>
                  
                  {/* 分隔线 */}
                  <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 16, borderStyle: 'dashed', borderRadius: 1 }} />
                  
                  {/* 总计结果 */}
                  <LinearGradient
                    colors={['#E8F6F8', '#D7F3F6']}
                    style={{ padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#2C98A6' }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: '#1F7A84', fontWeight: '900', fontSize: 16 }}>{t.totalAmount}</Text>
      <Text style={{ color: '#1F7A84', fontWeight: '900', fontSize: 26 }}>{total.toLocaleString()} MMK</Text>
    </View>
    <Text style={{ color: 'rgba(30, 64, 175, 0.6)', fontSize: 11, marginTop: 4, textAlign: 'right', fontStyle: 'italic' }}>
      * {c.includesItemAndDelivery}
    </Text>
  </LinearGradient>
</View>
);
} else {
return (
<View style={[styles.priceRow, { backgroundColor: '#f8fafc', padding: 20, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#10b981' }]}>
  <Text style={[styles.priceLabel, { fontSize: 18, fontWeight: '800' }]}>{t.totalPrice}</Text>
  <Text style={[styles.priceValue, { fontSize: 22, fontWeight: '900', color: '#10b981' }]}>{deliveryFee.toLocaleString()} MMK</Text>
</View>
);
}
          })()}
        </View>

        {/* 配送员信息 */}
        {order.courier && order.courier !== '待分配' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏍️ {t.courierInfo}</Text>
            <View style={styles.courierContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.courierName}>{order.courier}</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>正在为您派送中</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                  style={styles.chatButton}
                  onPress={openChat}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.colors.primary.DEFAULT} />
                  {unreadCount > 0 && (
                    <View style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      backgroundColor: '#ef4444',
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: '#fff'
                    }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={handleContactCourier}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* 🚀 新增：配送凭证图片 */}
        {deliveryPhotos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 {c.deliveryProof}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {deliveryPhotos.map((photo, index) => (
                <TouchableOpacity 
                  key={index}
                  onPress={() => {
                    Alert.alert(c.viewPhoto);
                  }}
                >
                  <Image 
                    source={{ uri: photo.photo_url }} 
                    style={{ width: 120, height: 120, borderRadius: 12, backgroundColor: '#f1f5f9' }} 
                    resizeMode="cover"
                  />
                  <Text style={{ fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'center' }}>
                    {formatDate(photo.upload_time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
              <Text style={[styles.modalLabel, { marginBottom: 8, marginTop: 0 }]}>{t.merchantProductRating}</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text key={star} style={styles.starDisplay}>
                    {star <= order.customer_rating! ? '⭐' : '☆'}
                  </Text>
                ))}
              </View>
              {typeof order.courier_service_rating === 'number' && order.courier_service_rating >= 1 && (
                <>
                  <Text style={[styles.modalLabel, { marginBottom: 8, marginTop: 14 }]}>{t.courierServiceRating}</Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text key={`c-${star}`} style={styles.starDisplay}>
                        {star <= order.courier_service_rating! ? '⭐' : '☆'}
                      </Text>
                    ))}
                  </View>
                </>
              )}
              {order.customer_comment && (
                <Text style={styles.commentDisplay}>{order.customer_comment}</Text>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <CourierChatModal
        visible={showChatModal}
        title={c.chatWithCourier}
        subtitle={order?.courier}
        emptyText={tt(language, '暂无消息', 'No messages yet', 'မက်ဆေ့ခ်ျမရှိပါ')}
        inputPlaceholder={c.typeMessage}
        messages={messages}
        currentUserId={customerId}
        inputText={inputText}
        sending={sending}
        onChangeInput={setInputText}
        onSend={sendMessage}
        onClose={closeChat}
      />

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
        {/* 查看QR Code按钮 - 所有订单都可以查看 */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowQRCodeModal(true)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#2C98A6', '#5BB8C4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <Text style={styles.actionButtonText}>📱 {t.viewQRCode}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 评价弹窗 */}
      <Modal
        visible={showRateModal}
        transparent
        animationType="slide"
        onRequestClose={() => void handleCloseRateModal()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.rateTitle}</Text>

            {order && (
              <View style={styles.rateModalInfoCard}>
                <Text style={styles.rateModalInfoMuted}>{t.orderNumber}</Text>
                <Text style={styles.rateModalInfoStrong} selectable>
                  {order.id}
                </Text>
                <Text style={[styles.rateModalInfoMuted, { marginTop: 10 }]}>{t.storeLabel}</Text>
                <Text style={styles.rateModalInfoStrong} numberOfLines={3}>
                  {rateModalStoreName || '—'}
                </Text>
                <Text style={[styles.rateModalInfoMuted, { marginTop: 10 }]}>{t.courierLabel}</Text>
                <Text style={styles.rateModalInfoStrong} numberOfLines={3}>
                  {order.courier?.trim()
                    ? order.courier
                    : t.none}
                </Text>
              </View>
            )}

            <Text style={styles.modalLabel}>{t.merchantProductRating}</Text>
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

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>{t.courierServiceRating}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={`cr-${star}`}
                  onPress={() => setCourierRating(star)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.star}>{star <= courierRating ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 评价内容 */}
            <Text style={[styles.modalLabel, { marginTop: 12 }]}>{t.commentLabel}</Text>
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
                onPress={() => void handleCloseRateModal()}
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

      {/* QR码模态框 */}
      <Modal
        visible={showQRCodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRCodeModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <LinearGradient
              colors={['#2C98A6', '#5BB8C4']}
              style={styles.qrModalHeader}
            >
              <Text style={styles.qrModalTitle}>📱 {t.qrCodeTitle}</Text>
              <TouchableOpacity
                onPress={() => setShowQRCodeModal(false)}
                style={styles.qrModalClose}
              >
                <Text style={styles.qrModalCloseText}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>

            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={{ backgroundColor: 'white' }}>
              <View style={styles.qrModalBody}>
                <Text style={styles.qrOrderInfo}>📦 {t.orderNumber}</Text>
                <Text style={styles.qrOrderId}>{order?.id}</Text>

                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={order?.id || ''}
                      size={220}
                      color="#2C98A6"
                      backgroundColor="white"
                    />
                  </View>
                </View>

                <Text style={styles.qrHint}>{t.saveQRHint}</Text>

                {/* 订单状态和价格 */}
                <View style={styles.qrInfoRow}>
                  <View style={styles.qrInfoItem}>
                    <Text style={styles.qrInfoLabel}>{t.status}:</Text>
                    <Text style={[styles.qrInfoValue, { color: getStatusColor(order?.status || '') }]}>
                      {order?.status}
                    </Text>
                  </View>
                  <View style={styles.qrInfoItem}>
                    <Text style={styles.qrInfoLabel}>{t.totalPrice}:</Text>
                    <Text style={styles.qrInfoValue}>{order?.price} MMK</Text>
                  </View>
                </View>
              </View>
            </ViewShot>

            <View style={{ flexDirection: 'row', gap: 12, padding: 20, paddingTop: 0 }}>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
                onPress={handleSaveQRCode}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={{ paddingVertical: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>💾 {c.saveImage}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
                onPress={() => setShowQRCodeModal(false)}
              >
                <LinearGradient
                  colors={['#64748b', '#475569']}
                  style={{ paddingVertical: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>{t.close}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// 获取状态颜色的辅助函数
const getStatusColor = (status: string) => {
  const colors: { [key: string]: string } = {
    '待取件': '#f59e0b',
    '已取件': '#2C98A6',
    '配送中': '#8b5cf6',
    '已送达': '#10b981',
    '已取消': '#ef4444',
  };
  return colors[status] || '#64748b';
};

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
  orderNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  copyButtonText: {
    fontSize: 16,
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  journeyCard: {
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
  journeyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  journeyStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  journeyStepItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  journeyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e2e8f0',
  },
  journeyDotDone: {
    backgroundColor: '#10b981',
  },
  journeyDotCurrentOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary.DEFAULT,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyDotCurrentInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  journeyStepLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 12,
  },
  journeyMessageBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  journeyMessageWarn: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  journeyMessageOk: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  journeyMessageMuted: {
    backgroundColor: '#f1f5f9',
  },
  journeyHeadline: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  journeyDetail: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  journeyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginHorizontal: -4,
  },
  journeyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 12,
  },
  journeyActionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
  },
  journeyActionBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT,
  },
  journeyActionBtnTextSecondary: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
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
    fontSize: 16,
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
    backgroundColor: '#E8F6F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  phoneButtonDisabled: {
    opacity: 0.5,
  },
  phoneButtonText: {
    fontSize: 11,
    color: '#1E6F7A',
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  coordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  coordsLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginRight: 4,
  },
  coordsText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  merchantsPriceContainer: {
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F6F8',
    padding: 16,
    borderRadius: 12,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C98A6',
  },
  totalPriceRow: {
    backgroundColor: '#D7F3F6',
    borderTopWidth: 2,
    borderTopColor: '#2C98A6',
    marginTop: 8,
    paddingTop: 16,
  },
  totalPriceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F7A84',
    flex: 1,
  },
  totalPriceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F7A84',
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
    color: '#185A63',
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
    backgroundColor: '#2C98A6',
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
    marginBottom: 16,
    textAlign: 'center',
  },
  rateModalInfoCard: {
    alignSelf: 'stretch',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rateModalInfoMuted: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
    marginBottom: 4,
  },
  rateModalInfoStrong: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
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
  // QR码模态框样式
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  qrModalHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  qrModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalCloseText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  qrModalBody: {
    padding: 24,
    alignItems: 'center',
  },
  qrOrderInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  qrOrderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C98A6',
    marginBottom: 20,
  },
  qrCodeContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  qrCodeWrapper: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#2C98A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  qrHint: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  qrInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  qrInfoItem: {
    alignItems: 'center',
  },
  qrInfoLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  qrInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  qrCloseButton: {
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  qrCloseButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  qrCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactButton: {
    backgroundColor: '#10b981',
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
