import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Alert, ActivityIndicator, DeviceEventEmitter, Image, Vibration, Animated, Modal, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { packageService, supabase, reviewService } from '../services/supabase';
import { chatService } from '../services/chatService';
import LoggerService from '../services/LoggerService';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import Toast from '../components/Toast';
import BackToHomeButton from '../components/BackToHomeButton';
import { errorService } from '../services/ErrorService';
import { OrderSkeleton } from '../components/SkeletonLoader';
import PackingModal from '../components/PackingModal';

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
  cod_amount?: number;
  payment_method?: string; // 🚀 新增支付方式
}

export default function MyOrdersScreen({ navigation, route }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  // 从路由参数中获取筛选状态，默认为'all'
  const [selectedStatus, setSelectedStatus] = useState(route?.params?.filterStatus || 'all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [userType, setUserType] = useState<'customer' | 'merchant'>('customer');
  
  // 筛选卡片的位置记录
  const filterCardPositions = useRef<{[key: string]: number}>({});
  // ScrollView引用
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Toast状态
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // 打包模态框状态
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [packingOrderData, setPackingOrderData] = useState<Order | null>(null);

  // 🚀 新增：评价管理状态
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set());
  const [showReviewSubmitModal, setShowReviewSubmitModal] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isUploadingReviewImage, setIsUploadingReviewImage] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // 🚀 新增：聊天未读数状态
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const chatSubscriptionRef = useRef<any>(null);

  // 🚀 新增：呼吸灯动画状态
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // 🚀 启动呼吸灯动画
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

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
      track: '实时追踪',
      cancel: '取消订单',
      rate: '评价',
      loading: '加载中...',
      packageType: '包裹类型',
      weight: '重量',
      courier: '配送员',
      deliveryFee: '跑腿费',
      cod: '代收款',
      totalAmount: '总金额',
      none: '无',
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
      track: 'Track Live',
      cancel: 'Cancel',
      rate: 'Rate',
      loading: 'Loading...',
      packageType: 'Type',
      weight: 'Weight',
      courier: 'Courier',
      deliveryFee: 'Delivery Fee',
      cod: 'COD',
      totalAmount: 'Total',
      none: 'None',
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
      track: 'တိုက်ရိုက်ခြေရာခံ',
      cancel: 'ပယ်ဖျက်',
      rate: 'အဆင့်သတ်မှတ်',
      loading: 'တင်နေသည်...',
      packageType: 'အမျိုးအစား',
      weight: 'အလေးချိန်',
      courier: 'ပို့ဆောင်သူ',
      deliveryFee: 'ပို့ဆောင်ခ',
      cod: 'ငွေကောက်ခံရန်',
      totalAmount: 'စုစုပေါင်း',
      none: 'မရှိ',
      // 包裹类型翻译
      packageTypes: {
        'standard': 'စံပါဆယ်',
        'document': 'စာရွက်စာတမ်း',
        'fragile': 'အလွယ်တကူကျိုးပဲ့နိုင်သော',
        'food': 'အစားအစာ နှင့် သောက်စရာ',
        'overweight': 'အလွန်လေးသော',
        'oversized': 'အလွန်ကြီးသော',
      },
      // 状态翻译
      statusTypes: {
        'pending': 'စောင့်ဆိုင်းဆဲ',
        'picked_up': 'ထုပ်ယူပြီး',
        'in_transit': 'ပို့ဆောင်နေသည်',
        'delivered': 'ပို့ဆောင်ပြီး',
        'cancelled': 'ပယ်ဖျက်ပြီး',
      },

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
    { key: '待确认', label: language === 'zh' ? '待接单' : 'Pending', color: '#f97316' },
    { key: '打包中', label: language === 'zh' ? '打包中' : 'Packing', color: '#10b981' },
    { key: '待取件', label: t.pending, color: '#f59e0b' },
    { key: '已取件', label: t.pickedUp, color: '#3b82f6' },
    { key: '配送中', label: t.inTransit, color: '#8b5cf6' },
    { key: '已送达', label: t.delivered, color: '#10b981' },
    { key: '已取消', label: t.cancelled, color: '#ef4444' },
  ];

  // 加载用户ID
  useEffect(() => {
    loadCustomerId();

    // 🚀 新增：监听全局状态更新事件
    const statusUpdateSub = DeviceEventEmitter.addListener('order_status_updated', () => {
      console.log('🔄 收到状态更新事件，刷新订单列表');
      onRefresh();
    });

    return () => {
      statusUpdateSub.remove();
    };
  }, []);

  // 监听路由参数变化，自动设置筛选状态
  useEffect(() => {
    if (route?.params?.filterStatus) {
      const filterStatus = route.params.filterStatus;
      if (filterStatus !== selectedStatus) {
        setSelectedStatus(filterStatus);
      }
    }
  }, [route?.params?.filterStatus]);

  // 当订单数据加载完成后，应用初始筛选
  useEffect(() => {
    if (orders.length > 0 && selectedStatus) {
      filterOrders(orders, selectedStatus);
    }
  }, [orders, selectedStatus]);

  // 当筛选状态改变且从首页跳转来时，自动滚动到对应卡片
  useEffect(() => {
    if (route?.params?.filterStatus && selectedStatus === route.params.filterStatus) {
      // 延迟滚动，确保布局已完成
      setTimeout(() => {
        scrollToFilter(selectedStatus);
      }, 300);
    }
  }, [route?.params?.filterStatus, selectedStatus]);

  // 🚀 新增：实时监听所有订单的消息
  useEffect(() => {
    if (!customerId) return;

    // 订阅聊天消息表
    chatSubscriptionRef.current = supabase
      .channel('global-unread-counts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMsg = payload.new as any;
          // 如果消息不是我发的，且属于我的某个订单
          if (newMsg.sender_id !== customerId) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMsg.order_id]: (prev[newMsg.order_id] || 0) + 1
            }));
            // 轻微震动提示
            Vibration.vibrate(100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          // 如果消息被标记为已读
          if (updatedMsg.is_read) {
            setUnreadCounts(prev => {
              const currentCount = prev[updatedMsg.order_id] || 0;
              return {
                ...prev,
                [updatedMsg.order_id]: Math.max(0, currentCount - 1)
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (chatSubscriptionRef.current) {
        supabase.removeChannel(chatSubscriptionRef.current);
      }
    };
  }, [customerId]);

  const loadCustomerId = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const isGuest = await AsyncStorage.getItem('isGuest');
      const storedUserType = await AsyncStorage.getItem('userType');
      
      if (userData) {
        const user = JSON.parse(userData);
        setCustomerId(user.id);
        
        // 检测用户类型：优先使用 AsyncStorage 中的 userType，否则从 user 对象中读取
        const detectedUserType = storedUserType || user.user_type || 'customer';
        const finalUserType = detectedUserType === 'merchant' ? 'merchant' : 'customer';
        setUserType(finalUserType);
        
        // 如果是访客，不加载订单
        if (isGuest === 'true' || user.id === 'guest') {
          setLoading(false);
          setOrders([]);
          setFilteredOrders([]);
        } else {
          loadOrders(user.id, finalUserType);
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
      errorService.handleError(error, { context: 'MyOrdersScreen.loadUserInfo', silent: true });
      setLoading(false);
    }
  };

  // 加载订单
  const loadOrders = async (userId: string, type: 'customer' | 'merchant' = 'customer') => {
    try {
      setLoading(true);
      
      // 获取用户信息用于匹配订单
      const userData = await AsyncStorage.getItem('currentUser');
      const user = userData ? JSON.parse(userData) : null;
      const userEmail = await AsyncStorage.getItem('userEmail');
      const userPhone = await AsyncStorage.getItem('userPhone');
      
      // 如果是商家，获取店铺名称用于匹配 sender_name（兼容旧数据）
      let storeName: string | undefined;
      if (type === 'merchant') {
        const userName = await AsyncStorage.getItem('userName');
        if (userName) {
          storeName = userName;
        }
      }
      
      // 传递 userType、storeName、email 和 phone 参数，让 getAllOrders 知道如何查询订单
      const { orders: data } = await packageService.getAllOrders(userId, {
        userType: type,
        storeName: storeName,
        email: userEmail || user?.email,
        phone: userPhone || user?.phone
      });
      setOrders(data);
      filterOrders(data, selectedStatus);

      // 🚀 新增：获取所有订单的未读消息数
      if (data.length > 0) {
        const orderIds = data.map(o => o.id);
        const { data: unreadData, error: unreadError } = await supabase
          .from('chat_messages')
          .select('order_id, is_read')
          .in('order_id', orderIds)
          .eq('is_read', false)
          .neq('sender_id', userId);
        
        if (!unreadError && unreadData) {
          const counts: Record<string, number> = {};
          unreadData.forEach(msg => {
            counts[msg.order_id] = (counts[msg.order_id] || 0) + 1;
          });
          setUnreadCounts(counts);
        }
      }

      // 🚀 新增：获取已评价的订单ID列表
      if (data.length > 0) {
        const { data: reviews } = await supabase
          .from('store_reviews')
          .select('order_id')
          .eq('user_id', userId);
        
        if (reviews) {
          setReviewedOrderIds(new Set(reviews.map(r => r.order_id)));
        }
      }
    } catch (error: any) {
      errorService.handleError(error, { context: 'MyOrdersScreen.loadOrders' });
    } finally {
      setLoading(false);
    }
  };

  // 刷新
  const onRefresh = useCallback(async () => {
    if (!customerId) return;
    setRefreshing(true);
    await loadOrders(customerId, userType);
    setRefreshing(false);
  }, [customerId, userType]);

  // 过滤订单
  const filterOrders = (orderList: Order[], status: string) => {
    if (status === 'all') {
      setFilteredOrders(orderList);
    } else {
      setFilteredOrders(orderList.filter(order => order.status === status));
    }
  };

  // 居中滚动到指定筛选卡片
  const scrollToFilter = (status: string) => {
    if (!scrollViewRef.current) return;
    
    const position = filterCardPositions.current[status];
    if (position !== undefined) {
      const cardWidth = 120; // 筛选卡片的宽度（包括间距）
      const screenWidth = Dimensions.get('window').width;
      
      // 计算居中位置：卡片位置 - (屏幕宽度 - 卡片宽度) / 2
      const scrollX = position - (screenWidth - cardWidth) / 2;
      
      scrollViewRef.current.scrollTo({
        x: Math.max(0, scrollX),
        animated: true,
      });
    }
  };

  // 切换状态筛选
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    filterOrders(orders, status);
    // 滚动到选中卡片
    scrollToFilter(status);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const filter = statusFilters.find(f => f.key === status);
    return filter?.color || '#6b7280';
  };

  // 翻译包裹类型
  const getPackageTypeTranslation = (type: string) => {
    const t = translations[language];
    if (!t || !t.packageTypes) return type;
    
    const typeLower = type.toLowerCase();
    return t.packageTypes[typeLower] || type;
  };
  
  // 翻译状态
  const getStatusTranslation = (status: string) => {
    const t = translations[language];
    if (!t || !t.statusTypes) return status;
    
    // 中文状态映射
    const statusMap: {[key: string]: string} = {
      '待确认': language === 'zh' ? '待接单' : 'Pending',
      '打包中': language === 'zh' ? '打包中' : 'Packing',
      '待取件': t.statusTypes['pending'] || status,
      '已取件': t.statusTypes['picked_up'] || status,
      '配送中': t.statusTypes['in_transit'] || status,
      '已送达': t.statusTypes['delivered'] || status,
      '已取消': t.statusTypes['cancelled'] || status,
    };
    
    return statusMap[status] || status;
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

  // 🚀 新增：评价相关逻辑
  const handleOpenReviewModal = (order: any) => {
    setReviewOrder(order);
    setReviewRating(5);
    setReviewComment('');
    setReviewImages([]);
    setShowReviewSubmitModal(true);
  };

  const handleReviewImagePick = async () => {
    if (reviewImages.length >= 6) {
      showToast(language === 'zh' ? '最多上传6张图片' : 'Max 6 images', 'warning');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(language === 'zh' ? '权限错误' : 'Permission Error', language === 'zh' ? '需要相册访问权限来上传评价图片' : 'Need photo library access');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 6 - reviewImages.length,
        quality: 0.7,
      });

      if (!result.canceled) {
        setIsUploadingReviewImage(true);
        const newImages = [...reviewImages];
        
        for (const asset of result.assets) {
          const url = await reviewService.uploadReviewImage(customerId, asset.uri);
          if (url) {
            newImages.push(url);
          }
        }
        
        setReviewImages(newImages.slice(0, 6));
      }
    } catch (error) {
      LoggerService.error('上传评价图片失败:', error);
      showToast(language === 'zh' ? '上传图片失败' : 'Upload failed', 'error');
    } finally {
      setIsUploadingReviewImage(false);
    }
  };

  const handleRemoveReviewImage = (index: number) => {
    const newImages = [...reviewImages];
    newImages.splice(index, 1);
    setReviewImages(newImages);
  };

  const handleSubmitReview = async () => {
    if (!reviewOrder || !customerId) return;
    if (!reviewComment.trim()) {
      Alert.alert(language === 'zh' ? '提示' : 'Alert', language === 'zh' ? '请输入评价内容' : 'Please enter review');
      return;
    }

    try {
      setIsSubmittingReview(true);
      
      const userData = await AsyncStorage.getItem('currentUser');
      const user = userData ? JSON.parse(userData) : null;

      const reviewData = {
        store_id: reviewOrder.delivery_store_id || '00000000-0000-0000-0000-000000000000',
        order_id: reviewOrder.id,
        user_id: customerId,
        user_name: user?.name || 'User',
        rating: reviewRating,
        comment: reviewComment,
        images: reviewImages,
        is_anonymous: false
      };

      const result = await reviewService.createReview(reviewData);
      if (result.success) {
        showToast(language === 'zh' ? '评价提交成功' : 'Review submitted', 'success');
        
        // 更新已评价列表
        setReviewedOrderIds(prev => {
          const newSet = new Set(prev);
          newSet.add(reviewOrder.id);
          return newSet;
        });
        
        setShowReviewSubmitModal(false);
      } else {
        throw new Error('Submit failed');
      }
    } catch (error) {
      Alert.alert('错误', '提交评价失败');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // 🚀 新增：商家接单
  const handleMerchantAccept = async (orderId: string, paymentMethod: string) => {
    try {
      showLoading(language === 'zh' ? '正在接单...' : 'Accepting...', 'package');
      const newStatus = '打包中'; // 🚀 改为打包中
      
      const { error } = await supabase
        .from('packages')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      showToast(language === 'zh' ? '接单成功，请打包' : 'Accepted, please pack', 'success');
      onRefresh();
    } catch (error) {
      Alert.alert('错误', '接单失败');
    } finally {
      hideLoading();
    }
  };

  // 🚀 新增：商家拒绝
  const handleMerchantDecline = async (orderId: string) => {
    Alert.alert(
      language === 'zh' ? '拒绝订单' : 'Decline Order',
      language === 'zh' ? '确定要拒绝并取消此订单吗？' : 'Decline and cancel this order?',
      [
        { text: t.cancel, style: 'cancel' },
        { 
          text: t.confirm, 
          style: 'destructive',
          onPress: async () => {
            try {
              showLoading(language === 'zh' ? '正在取消...' : 'Cancelling...', 'package');
              const { error } = await supabase
                .from('packages')
                .update({ status: '已取消', updated_at: new Date().toISOString() })
                .eq('id', orderId);

              if (error) throw error;
              showToast(language === 'zh' ? '订单已拒绝' : 'Declined', 'info');
              onRefresh();
            } catch (error) {
              Alert.alert('错误', '操作失败');
            } finally {
              hideLoading();
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1e3a8a', '#2563eb', '#f8fafc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.4 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ paddingTop: 60, paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ color: '#ffffff', fontSize: 32, fontWeight: '800' }}>{t.title}</Text>
          <View style={{ height: 3, width: 40, backgroundColor: '#fbbf24', borderRadius: 2, marginTop: 8 }} />
        </View>
        
        <View style={styles.content}>
          <View style={{ padding: 20 }}>
            <OrderSkeleton />
            <OrderSkeleton />
            <OrderSkeleton />
          </View>
        </View>
      </View>
    );
  }

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1e3a8a', '#2563eb', '#f8fafc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.4 }}
          style={StyleSheet.absoluteFill}
        />
        {/* 背景装饰性圆圈 */}
        <View style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          zIndex: 0
        }} />
        <View style={{
          position: 'absolute',
          top: 150,
          left: -50,
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          zIndex: 0
        }} />

        {/* Toast通知 */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={() => setToastVisible(false)}
      />

      <View style={{ paddingTop: 60, paddingHorizontal: 20, marginBottom: 10 }}>
        <Text style={{ color: '#ffffff', fontSize: 32, fontWeight: '800' }}>{t.title}</Text>
        <View style={{ height: 3, width: 40, backgroundColor: '#fbbf24', borderRadius: 2, marginTop: 8 }} />
        <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16, marginTop: 8 }}>
          {t.all} {orders.length} {language === 'zh' ? '个订单' : language === 'en' ? 'Orders' : 'အော်ဒါ'}
        </Text>
      </View>

      {/* 状态筛选器 */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {statusFilters.map((filter) => {
            const categoryUnreadTotal = filter.key === 'all' ? 0 : orders
              .filter(o => o.status === filter.key)
              .reduce((sum, o) => sum + (unreadCounts[o.id] || 0), 0);
            const hasUnread = categoryUnreadTotal > 0;

            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  selectedStatus === filter.key && styles.filterChipActive,
                  hasUnread && styles.filterChipWithUnread,
                ]}
                onPress={() => handleStatusChange(filter.key)}
                onLayout={(event) => {
                  const { x } = event.nativeEvent.layout;
                  filterCardPositions.current[filter.key] = x;
                }}
                activeOpacity={0.7}
              >
                {/* 🚀 呼吸灯光晕背景 */}
                {hasUnread && (
                  <Animated.View 
                    style={[
                      styles.pulseGlow, 
                      { 
                        opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }),
                        transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }]
                      }
                    ]} 
                  />
                )}

                <LinearGradient
                  colors={
                    selectedStatus === filter.key
                      ? [filter.color, filter.color + 'dd']
                      : ['#ffffff', '#ffffff']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.filterChipGradient,
                    hasUnread && { borderWidth: 2, borderColor: '#3b82f6' }
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedStatus === filter.key && styles.filterChipTextActive,
                      hasUnread && selectedStatus !== filter.key && { color: '#2563eb', fontWeight: '900' }
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
                  
                  {/* 🚀 显著的蓝色消息徽章 */}
                  {hasUnread && (
                    <Animated.View style={[
                      styles.filterUnreadBadge,
                      {
                        transform: [{ translateY: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }]
                      }
                    ]}>
                      <Text style={styles.filterUnreadBadgeText}>💬 {categoryUnreadTotal}</Text>
                    </Animated.View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
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
              style={[
                styles.orderCard,
                unreadCounts[order.id] > 0 && styles.unreadOrderCard
              ]}
              onPress={() => handleViewDetail(order.id)}
              activeOpacity={0.7}
            >
              {/* 🚀 新增：卡片右上角消息提醒 */}
              {unreadCounts[order.id] > 0 && (
                <View style={styles.cardUnreadBadge}>
                  <Text style={styles.cardUnreadBadgeText}>💬 {unreadCounts[order.id]}</Text>
                </View>
              )}
              {/* 订单头部 */}
              <View style={styles.orderHeader}>
                <View style={styles.orderHeaderLeft}>
                  <Text style={styles.orderIdBadge}>#{order.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderPackageType}>{getPackageTypeTranslation(order.package_type)}</Text>
                  <Text style={styles.orderWeight}>{order.weight}</Text>
                </View>
                <View style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.orderStatusText}>{getStatusTranslation(order.status)}</Text>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={styles.orderCourierIcon}>🏍️</Text>
                    <Text style={styles.orderCourierText}>
                      {t.courier}: {order.courier}
                    </Text>
                  </View>
                  {/* 🚀 新增：配送员小框里的消息提示 */}
                  {unreadCounts[order.id] > 0 && (
                    <View style={styles.courierUnreadContainer}>
                      <Ionicons name="chatbubble-ellipses" size={14} color="#3b82f6" />
                      <Text style={styles.courierUnreadText}>{language === 'zh' ? '新消息' : 'New Msg'}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* 订单底部 */}
              <View style={styles.orderFooter}>
                <View style={styles.orderFooterLeft}>
                  {userType === 'merchant' ? (
                    <View>
                      <Text style={[styles.orderInfoLabel, {marginBottom: 4}]}>
                        {t.deliveryFee}: <Text style={{color: '#1e293b', fontWeight: '600'}}>{order.price} MMK</Text>
                      </Text>
                      <Text style={[styles.orderInfoLabel, {marginBottom: 4}]}>
                        {t.cod}: <Text style={{color: '#1e293b', fontWeight: '600'}}>{Number(order.cod_amount || 0) > 0 ? `${order.cod_amount} MMK` : t.none}</Text>
                      </Text>
                      <Text style={styles.orderPrice}>
                        {t.totalAmount}: {(parseFloat(order.price?.replace(/[^\d.]/g, '') || '0') + Number(order.cod_amount || 0)).toLocaleString()} MMK
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.orderPrice}>{order.price} MMK</Text>
                  )}
                  <Text style={styles.orderTime}>{formatDate(order.created_at)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={() => handleViewDetail(order.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.detailButtonText}>{t.detail}</Text>
                    <Text style={styles.detailButtonIcon}>→</Text>
                  </TouchableOpacity>
                  
                  {/* 🚀 新增：评价按钮 */}
                  {userType !== 'merchant' && (order.status === '已送达' || order.status === '已完成') && !reviewedOrderIds.has(order.id) && (
                    <TouchableOpacity
                      style={[styles.detailButton, { backgroundColor: '#fbbf24', marginLeft: 8 }]}
                      onPress={() => handleOpenReviewModal(order)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.detailButtonText, { color: '#ffffff' }]}>⭐ {t.rate}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 🚀 新增：商家快捷接单/取消按钮 */}
              {userType === 'merchant' && order.status === '待确认' && (
                <View style={styles.merchantsActionRow}>
                  <TouchableOpacity 
                    style={[styles.merchantsButton, styles.merchantsDeclineButton]}
                    onPress={() => handleMerchantDecline(order.id)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                    <Text style={styles.merchantsDeclineText}>{language === 'zh' ? '拒绝' : 'Decline'}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.merchantsButton, styles.merchantsAcceptButton]}
                    onPress={() => handleMerchantAccept(order.id, order.payment_method || 'cash')}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                    <Text style={styles.merchantsAcceptText}>{language === 'zh' ? '接单' : 'Accept'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 🚀 新增：商家打包完成按钮 */}
              {userType === 'merchant' && order.status === '打包中' && (
                <View style={styles.merchantsActionRow}>
                  <TouchableOpacity 
                    style={[styles.merchantsButton, styles.merchantsAcceptButton, { backgroundColor: '#10b981' }]}
                    onPress={() => {
                      setPackingOrderData(order);
                      setShowPackingModal(true);
                    }}
                  >
                    <Ionicons name="cube-outline" size={18} color="white" />
                    <Text style={styles.merchantsAcceptText}>{language === 'zh' ? '开始打包' : 'Start Packing'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 🚀 打包核对单 Modal */}
      <PackingModal
        visible={showPackingModal}
        orderData={packingOrderData}
        language={language}
        onClose={() => {
          setShowPackingModal(false);
          setPackingOrderData(null);
        }}
        onComplete={async () => {
          if (!packingOrderData) return;
          try {
            showLoading(language === 'zh' ? '提交中...' : 'Processing...', 'package');
            const newStatus = packingOrderData.payment_method === 'cash' ? '待收款' : '待取件';
            const { error } = await supabase
              .from('packages')
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq('id', packingOrderData.id);

            if (error) throw error;
            
            showToast(language === 'zh' ? '打包完成' : 'Packing Done', 'success');
            setShowPackingModal(false);
            setPackingOrderData(null);
            
            // 发送全局通知，刷新其他页面的状态
            DeviceEventEmitter.emit('order_status_updated');
            onRefresh();
          } catch (error) {
            Alert.alert('错误', '提交失败，请重试');
          } finally {
            hideLoading();
          }
        }}
      />

      {/* 🚀 新增：评价弹窗 */}
      <Modal
        visible={showReviewSubmitModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !isSubmittingReview && setShowReviewSubmitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>{language === 'zh' ? '评价订单' : 'Rate Order'}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowReviewSubmitModal(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingLabel}>{language === 'zh' ? '点击星星评分' : 'Tap to Rate'}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                      <Ionicons 
                        name={star <= reviewRating ? "star" : "star-outline"} 
                        size={40} 
                        color="#fbbf24" 
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingText}>
                  {reviewRating === 5 ? (language === 'zh' ? '非常满意' : 'Excellent') :
                   reviewRating === 4 ? (language === 'zh' ? '满意' : 'Good') :
                   reviewRating === 3 ? (language === 'zh' ? '一般' : 'Average') :
                   reviewRating === 2 ? (language === 'zh' ? '不满意' : 'Poor') :
                   (language === 'zh' ? '非常不满意' : 'Very Poor')}
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '评价内容' : 'Comment'}</Text>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder={language === 'zh' ? '分享您的使用体验...' : 'Share your experience...'}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                />
              </View>

              {/* 🚀 新增：评价图片区域 */}
              <View style={styles.reviewImageContainer}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '上传照片 (选填)' : 'Upload Photos (Optional)'}</Text>
                <View style={styles.reviewImageGrid}>
                  {reviewImages.map((img, index) => (
                    <View key={index} style={styles.reviewImageWrapper}>
                      <Image source={{ uri: img }} style={styles.reviewImage} />
                      <TouchableOpacity 
                        style={styles.removeImageIcon}
                        onPress={() => handleRemoveReviewImage(index)}
                      >
                        <Ionicons name="close-circle" size={22} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {reviewImages.length < 6 && (
                    <TouchableOpacity 
                      style={styles.addImageButton}
                      onPress={handleReviewImagePick}
                      disabled={isUploadingReviewImage}
                    >
                      {isUploadingReviewImage ? (
                        <ActivityIndicator color="#94a3b8" />
                      ) : (
                        <>
                          <Ionicons name="camera-outline" size={30} color="#94a3b8" />
                          <Text style={styles.addImageText}>{language === 'zh' ? '照片' : 'Photos'}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.submitButton, isSubmittingReview && { opacity: 0.7 }]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>{language === 'zh' ? '提交评价' : 'Submit'}</Text>
                )}
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
  filterUnreadBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#3b82f6', // 蓝色背景，与卡片一致
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    borderWidth: 1.5,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  filterUnreadBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
  },
  // 🚀 新增：呼吸灯光晕样式
  pulseGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    zIndex: -1,
  },
  filterChipWithUnread: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
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
    fontSize: 78,
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
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    position: 'relative',
  },
  // 🚀 新增：有未读消息的订单卡片样式
  unreadOrderCard: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    backgroundColor: '#f0f7ff',
  },
  cardUnreadBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardUnreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
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
    gap: 8,
  },
  orderIdBadge: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    fontSize: 14,
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
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  courierUnreadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  courierUnreadText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3b82f6',
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
  // 🚀 新增：商家动作行
  merchantsActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  merchantsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  merchantsAcceptButton: {
    backgroundColor: '#10b981',
  },
  merchantsDeclineButton: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  merchantsAcceptText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  merchantsDeclineText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // 🚀 新增评价 Modal 样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 25,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  modalBody: {
    padding: 20,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 10,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 15,
    padding: 15,
    minHeight: 120,
    fontSize: 16,
    color: '#1e293b',
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  submitButton: {
    backgroundColor: '#fbbf24',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // 🚀 新增评价图片样式
  reviewImageContainer: {
    marginBottom: 20,
  },
  reviewImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reviewImageWrapper: {
    width: (width - 80) / 3, // 三列布局
    aspectRatio: 1,
    borderRadius: 12,
    position: 'relative',
  },
  reviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  removeImageIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 11,
    zIndex: 1,
  },
  addImageButton: {
    width: (width - 80) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  addImageText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
});
