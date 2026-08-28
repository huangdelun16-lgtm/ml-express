import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, Dimensions, Alert, ActivityIndicator, DeviceEventEmitter, Image, Vibration, Modal, TextInput, Platform, ListRenderItem, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickImageFromLibrary } from '../utils/mediaAccess';
import { packageService, supabase, reviewService } from '../services/supabase';
import { chatService } from '../services/chatService';
import LoggerService from '../services/LoggerService';
import { useApp } from '../contexts/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorService } from '../services/ErrorService';
import { feedbackService } from '../services/FeedbackService';
import { OrderSkeleton } from '../components/SkeletonLoader';
import MyanmarAwareText from '../components/MyanmarAwareText';
import { common, ratingCaption } from '../i18n';
import { type AppLang, getOrderListJourneyHint } from '../utils/orderJourney';
import { useFocusEffect } from '@react-navigation/native';
import { ProfileAvatar3D } from '../components/ProfileClayIcons';
import {
  avatarDisplayUri,
  hydrateUserAvatarFromServer,
  loadUserAvatarUrl,
  USER_AVATAR_UPDATED,
} from '../utils/userAvatar';
import {
  getDismissedReviewOrderIds,
  addDismissedReviewOrderId,
  pickUnratedDeliveredOrder,
} from '../utils/reviewPromptStorage';

const { width } = Dimensions.get('window');
const TEAL = '#2C98A6';
const NAVY = '#1A2B48';
const MUTED = '#8A94A6';
const PAGE_BG = '#F5F7FA';

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
  delivery_store_id?: string;
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
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  // 从路由参数中获取筛选状态，默认为'all'
  const [selectedStatus, setSelectedStatus] = useState(route?.params?.filterStatus || 'all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  
  // 筛选卡片的位置记录
  const filterCardPositions = useRef<{[key: string]: number}>({});
  // ScrollView引用
  const scrollViewRef = useRef<ScrollView>(null);

  // 🚀 评价：已读 store_reviews 的订单；自动弹窗关闭时写入 reviewPromptStorage
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set());
  const [showReviewSubmitModal, setShowReviewSubmitModal] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewCourierRating, setReviewCourierRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isUploadingReviewImage, setIsUploadingReviewImage] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewStoreName, setReviewStoreName] = useState('');

  const ordersRef = useRef(orders);
  const reviewedRef = useRef(reviewedOrderIds);
  const showReviewModalRef = useRef(showReviewSubmitModal);
  const submittingRef = useRef(isSubmittingReview);
  const customerIdRef = useRef(customerId);
  const hasLoadedOnceRef = useRef(false);
  const loginPromptedRef = useRef(false);
  const loadCustomerIdRef = useRef<() => Promise<void>>(async () => {});
  const loadOrdersFnRef = useRef<(userId: string, opts?: { silent?: boolean }) => Promise<void>>(async () => {});
  ordersRef.current = orders;
  reviewedRef.current = reviewedOrderIds;
  showReviewModalRef.current = showReviewSubmitModal;
  submittingRef.current = isSubmittingReview;
  customerIdRef.current = customerId;

  // 🚀 新增：聊天未读数状态
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const chatSubscriptionRef = useRef<any>(null);

  // 翻译
  const translations: any = {
    zh: {
      title: '我的订单',
      all: '全部',
      waitingAccept: '待接单',
      packing: '打包中',
      pending: '待取件',
      pickedUp: '已取件',
      inTransit: '配送中',
      delivered: '已送达',
      completed: '已完成',
      cancelled: '已取消',
      pendingPay: '待收款',
      unassigned: '待分配',
      orderCount: '全部 {n} 个订单',
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
      placeOrderNow: '立即下单',
      rateTitle: '评价订单',
      orderNo: '订单号',
      store: '商店',
      courierRider: '配送骑手',
      noCourierShort: '暂无',
      merchantProduct: '商家商品',
      courierService: '骑手配送服务',
      commentOptional: '评价内容（选填）',
      commentPlaceholder: '分享您的使用体验...',
      uploadPhotos: '上传照片 (选填)',
      photos: '照片',
      submitReview: '提交评价',
      packageTypes: {
        standard: '标准件',
        document: '文件',
        fragile: '易碎品',
        food: '食品饮料',
        overweight: '超重件',
        oversized: '超规件',
      },
      statusTypes: {
        pending: '待取件',
        picked_up: '已取件',
        in_transit: '配送中',
        delivered: '已送达',
        cancelled: '已取消',
      },
    },
    en: {
      title: 'My Orders',
      all: 'All',
      waitingAccept: 'To accept',
      packing: 'Packing',
      pending: 'Pickup',
      pickedUp: 'Picked Up',
      inTransit: 'Delivering',
      delivered: 'Delivered',
      completed: 'Completed',
      cancelled: 'Cancelled',
      pendingPay: 'Unpaid',
      unassigned: 'Unassigned',
      orderCount: '{n} orders in total',
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
      placeOrderNow: 'Place Order',
      rateTitle: 'Rate Order',
      orderNo: 'Order no.',
      store: 'Store',
      courierRider: 'Courier',
      noCourierShort: 'N/A',
      merchantProduct: 'Merchant & product',
      courierService: 'Delivery / courier',
      commentOptional: 'Comment (optional)',
      commentPlaceholder: 'Share your experience...',
      uploadPhotos: 'Upload Photos (Optional)',
      photos: 'Photos',
      submitReview: 'Submit',
      packageTypes: {
        standard: 'Standard',
        document: 'Document',
        fragile: 'Fragile',
        food: 'Food',
        overweight: 'Overweight',
        oversized: 'Oversized',
      },
      statusTypes: {
        pending: 'Pickup',
        picked_up: 'Picked Up',
        in_transit: 'Delivering',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
      },
    },
    my: {
      title: 'ကျွန်ုပ်၏ အော်ဒါများ',
      all: 'အားလုံး',
      waitingAccept: 'လက်ခံရန်',
      packing: 'ထုပ်ပိုးနေ',
      pending: 'ထုပ်ယူရန်',
      pickedUp: 'ထုပ်ယူပြီး',
      inTransit: 'ပို့ဆောင်နေသည်',
      delivered: 'ပို့ဆောင်ပြီး',
      completed: 'ပြီးပါပြီ',
      cancelled: 'ပယ်ဖျက်ပြီး',
      pendingPay: 'ငွေကောက်ရန်',
      unassigned: 'ခွဲမပေးရသေး',
      orderCount: 'အော်ဒါ {n} ခု',
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
      placeOrderNow: 'အော်ဒါတင်',
      rateTitle: 'အော်ဒါ အဆင့်သတ်မှတ်',
      orderNo: 'အော်ဒါနံပါတ်',
      store: 'ဆိုင်',
      courierRider: 'ပို့ဆောင်သူ',
      noCourierShort: 'မရှိသေး',
      merchantProduct: 'ကုန်ပစ္စည်း/ဆိုင်',
      courierService: 'ပို့ဆောင်မှု',
      commentOptional: 'မှတ်ချက် (ရွေးချယ်)',
      commentPlaceholder: 'အတွေ့အကြုံကို မျှဝေပါ...',
      uploadPhotos: 'ဓာတ်ပုံတင်ရန် (ရွေးချယ်)',
      photos: 'ဓာတ်ပုံ',
      submitReview: 'တင်သွင်း',
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
  const c = common(language);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (type === 'success') feedbackService.success(message);
    else if (type === 'error') feedbackService.error(message);
    else if (type === 'warning') feedbackService.warning(message);
    else feedbackService.info(message);
  };

  // 状态过滤器（筛选 key 与「我的」页跳转、后端状态一致）
  const statusFilters = [
    { key: 'all', label: t.all },
    { key: '待确认', label: t.waitingAccept },
    { key: '打包中', label: t.packing },
    { key: '待取件', label: t.pending },
    { key: '配送中', label: t.inTransit },
    { key: '已送达', label: t.completed },
    { key: '已取消', label: t.cancelled },
  ];

  // 每次进入「我的订单」都重新读登录态并拉单（登录/下单后切 Tab 不会丢单）
  useFocusEffect(
    useCallback(() => {
      void loadCustomerIdRef.current();
    }, [])
  );

  useEffect(() => {
    const statusUpdateSub = DeviceEventEmitter.addListener('order_status_updated', () => {
      const id = customerIdRef.current;
      if (id && id !== 'guest') {
        void loadOrdersFnRef.current(id, { silent: true });
      }
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

  // 当订单数据加载完成后，应用初始筛选（空列表也要同步，避免残留上一批）
  useEffect(() => {
    filterOrders(orders, selectedStatus);
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

  /** 有未评价的已送达/已完成单时，进入页面后自动弹评价（关闭=不再自动打扰，仍可从列表手动点「评价」） */
  useFocusEffect(
    useCallback(() => {
      void loadUserAvatarUrl(customerId).then((url) => {
        if (customerId && customerId !== 'guest') setAvatarUri(url);
      });
      if (loading || !customerId) {
        return () => {};
      }
      const t = setTimeout(() => {
        void (async () => {
          if (showReviewModalRef.current || submittingRef.current) return;
          const dismissed = await getDismissedReviewOrderIds();
          const candidate = pickUnratedDeliveredOrder(
            ordersRef.current,
            reviewedRef.current,
            dismissed
          );
          if (!candidate) return;
          setReviewOrder(candidate);
          setReviewRating(5);
          setReviewCourierRating(5);
          setReviewComment('');
          setReviewImages([]);
          setShowReviewSubmitModal(true);
        })();
      }, 500);
      return () => clearTimeout(t);
    }, [customerId, loading])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(USER_AVATAR_UPDATED, (payload: { userId?: string; url?: string }) => {
      if (!payload) return;
      if (payload.userId && customerId && payload.userId !== customerId) return;
      setAvatarUri(payload.url || '');
    });
    return () => sub.remove();
  }, [customerId]);

  // 打开评价弹窗时解析店铺名（delivery_stores）
  useEffect(() => {
    if (!reviewOrder?.delivery_store_id) {
      setReviewStoreName('');
      return;
    }
    let cancelled = false;
    void supabase
      .from('delivery_stores')
      .select('store_name')
      .eq('id', reviewOrder.delivery_store_id)
      .maybeSingle()
      .then(({ data, error: _e }) => {
        if (cancelled) return;
        setReviewStoreName((data as { store_name?: string } | null)?.store_name || '');
      });
    return () => {
      cancelled = true;
    };
  }, [reviewOrder?.id, reviewOrder?.delivery_store_id]);

  // 未读：Realtime 能通则即时；缅甸无 WS 时 REST 轮询兜底
  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;

    const refreshUnread = async () => {
      const ids = ordersRef.current.map((o) => o.id);
      if (!ids.length) return;
      const counts = await chatService.getUnreadCountsByOrder(customerId, ids);
      if (!cancelled) setUnreadCounts(counts);
    };

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
          if (newMsg.sender_id !== customerId) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMsg.order_id]: (prev[newMsg.order_id] || 0) + 1
            }));
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

    void refreshUnread();
    const timer = setInterval(() => { void refreshUnread(); }, 15000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (chatSubscriptionRef.current) {
        supabase.removeChannel(chatSubscriptionRef.current);
      }
    };
  }, [customerId]);

  const loadCustomerId = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const isGuest = await AsyncStorage.getItem('isGuest');
      
      if (userData) {
        const user = JSON.parse(userData);
        setCustomerId(user.id);
        const photo = await loadUserAvatarUrl(user.id);
        setAvatarUri(isGuest === 'true' || user.id === 'guest' ? '' : photo);
        if (isGuest !== 'true' && user.id && user.id !== 'guest') {
          void hydrateUserAvatarFromServer(user.id).then((url) => {
            if (url) setAvatarUri(url);
          });
        }
        
        // 如果是访客，不加载订单
        if (isGuest === 'true' || user.id === 'guest') {
          setLoading(false);
          setOrders([]);
          setFilteredOrders([]);
        } else {
          await loadOrders(user.id, { silent: hasLoadedOnceRef.current });
        }
      } else {
        if (!loginPromptedRef.current) {
          loginPromptedRef.current = true;
          Alert.alert('提示', '请先登录', [
            { text: '取消', style: 'cancel' },
            { text: '去登录', onPress: () => navigation.navigate('Login') }
          ]);
        }
        setLoading(false);
      }
    } catch (error) {
      errorService.handleError(error, { context: 'MyOrdersScreen.loadUserInfo', silent: true });
      setLoading(false);
    }
  };

  // 加载订单
  const loadOrders = async (userId: string, opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      
      // 获取用户信息用于匹配订单
      const userData = await AsyncStorage.getItem('currentUser');
      const user = userData ? JSON.parse(userData) : null;
      const userEmail = await AsyncStorage.getItem('userEmail');
      const userPhone = await AsyncStorage.getItem('userPhone');
      
      const { orders: data } = await packageService.getAllOrders(userId, {
        userType: 'customer',
        email: userEmail || user?.email,
        phone: userPhone || user?.phone
      });
      hasLoadedOnceRef.current = true;
      setOrders(data);
      filterOrders(data, selectedStatus);

      // 🚀 新增：获取所有订单的未读消息数（REST，缅甸无 WebSocket 也能更新）
      if (data.length > 0) {
        const counts = await chatService.getUnreadCountsByOrder(userId, data.map((o) => o.id));
        setUnreadCounts(counts);
      }

      // 已写入 store_reviews 的订单
      let nextReviewed = new Set<string>();
      if (data.length > 0) {
        const { data: reviews } = await supabase
          .from('store_reviews')
          .select('order_id')
          .eq('user_id', userId);
        if (reviews) {
          nextReviewed = new Set(reviews.map((r) => r.order_id));
          setReviewedOrderIds(nextReviewed);
        }
      }

    } catch (error: any) {
      errorService.handleError(error, { context: 'MyOrdersScreen.loadOrders' });
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  loadCustomerIdRef.current = loadCustomerId;
  loadOrdersFnRef.current = loadOrders;

  // 刷新
  const onRefresh = useCallback(async () => {
    if (!customerId) return;
    setRefreshing(true);
    await loadOrders(customerId, { silent: true });
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
    const colors: Record<string, string> = {
      '待确认': TEAL,
      '打包中': TEAL,
      '待取件': TEAL,
      '已取件': TEAL,
      '配送中': TEAL,
      '待收款': '#F59E0B',
      '已送达': TEAL,
      '已完成': TEAL,
      '已取消': '#94A3B8',
    };
    return colors[status] || TEAL;
  };

  const formatPackageSpec = (type: string, weight: string) => {
    const raw = type || '';
    let name = raw;
    if (raw.includes('标准件')) name = language === 'en' ? 'Standard' : language === 'my' ? 'စံပါဆယ်' : '标准件';
    else if (raw.includes('超重')) name = language === 'en' ? 'Overweight' : language === 'my' ? 'အလေးပို' : '超重件';
    else if (raw.includes('超规')) name = language === 'en' ? 'Oversized' : language === 'my' ? 'အရွယ်ကြီး' : '超规件';
    else if (raw.includes('文件') || raw.toLowerCase().includes('document')) name = language === 'en' ? 'Document' : language === 'my' ? 'စာရွက်' : '文件';
    else if (raw.includes('易碎')) name = language === 'en' ? 'Fragile' : language === 'my' ? 'ကျိုးလွယ်' : '易碎品';
    else if (raw.includes('食品') || raw.includes('饮料')) name = language === 'en' ? 'Food' : language === 'my' ? 'အစားအစာ' : '食品饮料';
    else if (raw.includes('顺路')) name = language === 'en' ? 'Way-side' : language === 'my' ? 'တန်တန်' : '顺路递';
    else name = getPackageTypeTranslation(raw);

    const parts = [name];
    const size = raw.match(/(\d+\s*[x×]\s*\d+\s*[x×]\s*\d+\s*cm)/i);
    if (size) parts.push(size[1].replace(/\s/g, '').replace(/×/g, 'x'));
    else if (raw.includes('45x60x15')) parts.push('45x60x15cm');

    const w = (weight || '').trim();
    if (w && w !== '0') {
      parts.push(/kg/i.test(w) ? w.replace(/\s/g, '').toUpperCase() : `${w}KG`);
    } else if (raw.includes('5KG')) {
      parts.push('5KG');
    }
    return parts.join(' · ');
  };

  const formatPrice = (price: string) => {
    const n = Number(String(price || '0').replace(/[^0-9.]/g, ''));
    return `${Number.isFinite(n) ? n.toLocaleString() : price} MMK`;
  };

  const showPendingPay = (order: Order) => {
    if (order.status === '待收款') return true;
    if (order.payment_method === 'cash' && !['已送达', '已完成', '已取消'].includes(order.status)) return true;
    return false;
  };

  const openLocation = (lat?: number, lng?: number, label?: string) => {
    if (!lat || !lng) return;
    const q = encodeURIComponent(label || '');
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${q}@${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
    Linking.openURL(url).catch(() => {});
  };

  const handleCallCourier = async (order: Order) => {
    if (!order.courier || order.courier === '待分配') {
      Alert.alert(
        c.notice,
        c.noCourier
      );
      return;
    }
    try {
      const { data } = await supabase
        .from('couriers')
        .select('phone')
        .eq('name', order.courier)
        .maybeSingle();
      if (data?.phone) {
        Linking.openURL(`tel:${data.phone}`);
        return;
      }
    } catch {
      // fall through to track page
    }
    navigation.navigate('Main', { screen: 'TrackOrder', params: { orderId: order.id } });
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
      '待确认': t.waitingAccept,
      '打包中': t.packing,
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
    if (Number.isNaN(date.getTime())) return dateString;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${h}:${min}`;
  };

  // 查看详情
  const handleViewDetail = (orderId: string) => {
    navigation.navigate('OrderDetail', { orderId });
  };

  // 🚀 评价相关
  const handleOpenReviewModal = (order: any) => {
    setReviewOrder(order);
    setReviewRating(5);
    setReviewCourierRating(5);
    setReviewComment('');
    setReviewImages([]);
    setShowReviewSubmitModal(true);
  };

  const handleCloseReviewModal = useCallback(async () => {
    if (isSubmittingReview) return;
    if (reviewOrder?.id) {
      await addDismissedReviewOrderId(reviewOrder.id);
    }
    setShowReviewSubmitModal(false);
  }, [isSubmittingReview, reviewOrder]);

  const handleReviewImagePick = async () => {
    if (reviewImages.length >= 6) {
      showToast(c.maxPhotos, 'warning');
      return;
    }

    const result = await pickImageFromLibrary({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 6 - reviewImages.length,
      quality: 0.7,
    });

    if (result.canceled && result.assets === null) {
      Alert.alert(c.permissionError, c.galleryPermissionPhoto);
      return;
    }

    try {
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
      showToast(c.uploadFailed, 'error');
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
        courier_rating: reviewCourierRating,
        comment: reviewComment.trim(),
        images: reviewImages,
        is_anonymous: false
      };

      const result = await reviewService.createReview(reviewData);
      if (result.success) {
        showToast(c.reviewSubmitted, 'success');
        DeviceEventEmitter.emit('order_status_updated');
        
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
      feedbackService.error(c.reviewFailed);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const renderPartyRow = (
    icon: keyof typeof Ionicons.glyphMap,
    name: string,
    phone: string,
    address: string,
    lat?: number,
    lng?: number,
  ) => (
    <View style={styles.partyRow}>
      <View style={styles.partyIconWrap}>
        <Ionicons name={icon} size={16} color={TEAL} />
      </View>
      <View style={styles.partyBody}>
        <Text style={styles.partyName} numberOfLines={1}>
          {name}
          {phone ? `  ${phone}` : ''}
        </Text>
        <Text style={styles.partyAddress} numberOfLines={1}>{address}</Text>
      </View>
      <TouchableOpacity
        style={styles.partyPinBtn}
        onPress={() => openLocation(lat, lng, name)}
        disabled={!lat || !lng}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="location" size={16} color={lat && lng ? TEAL : '#CBD5E1'} />
      </TouchableOpacity>
    </View>
  );

  const renderOrderItem: ListRenderItem<Order> = ({ item: order }) => {
    const appLang: AppLang = language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh';
    const statusHint = getOrderListJourneyHint(order.status, appLang);
    const courierName = order.courier && order.courier !== '待分配' ? order.courier : t.unassigned;
    const hasCourier = Boolean(order.courier && order.courier !== '待分配');

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleViewDetail(order.id)}
        activeOpacity={0.85}
      >
        {unreadCounts[order.id] > 0 && (
          <View style={styles.cardUnreadBadge}>
            <Ionicons name="chatbubble" size={10} color="#fff" />
            <Text style={styles.cardUnreadBadgeText}>{unreadCounts[order.id]}</Text>
          </View>
        )}

        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <View style={styles.orderIdChip}>
              <Text style={styles.orderIdChipText}>#{order.id.slice(-6).toUpperCase()}</Text>
            </View>
            <Text style={styles.orderPackageSpec} numberOfLines={1}>
              {formatPackageSpec(order.package_type, order.weight)}
            </Text>
          </View>
          <View style={styles.orderStatusWrap}>
            <Ionicons name="bicycle" size={14} color={getStatusColor(order.status)} />
            <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]} numberOfLines={1}>
              {statusHint}
            </Text>
          </View>
        </View>

        {renderPartyRow(
          'cube-outline',
          order.sender_name,
          order.sender_phone,
          order.sender_address,
          order.sender_latitude,
          order.sender_longitude,
        )}
        {renderPartyRow(
          'person-outline',
          order.receiver_name,
          order.receiver_phone,
          order.receiver_address,
          order.receiver_latitude,
          order.receiver_longitude,
        )}

        <View style={styles.partyRow}>
          <View style={styles.partyIconWrap}>
            <Ionicons name="bicycle-outline" size={16} color={TEAL} />
          </View>
          <View style={styles.partyBody}>
            <Text style={styles.partyName} numberOfLines={1}>{courierName}</Text>
          </View>
          {unreadCounts[order.id] > 0 ? (
            <View style={styles.courierUnreadDot}>
              <Ionicons name="chatbubble-ellipses" size={12} color={TEAL} />
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.callBtn, !hasCourier && { opacity: 0.45 }]}
            onPress={() => handleCallCourier(order)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="call" size={14} color={TEAL} />
          </TouchableOpacity>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.orderFooterLeft}>
            <View style={styles.priceRow}>
              <Text style={styles.orderPrice}>{formatPrice(order.price)}</Text>
              {showPendingPay(order) ? (
                <View style={styles.pendingPayBadge}>
                  <Text style={styles.pendingPayText}>{t.pendingPay}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.orderTime}>{formatDate(order.created_at)}</Text>
          </View>
          <View style={styles.footerActions}>
            {(order.status === '已送达' || order.status === '已完成') && !reviewedOrderIds.has(order.id) && (
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => handleOpenReviewModal(order)}
                activeOpacity={0.8}
              >
                <Text style={styles.rateButtonText}>{t.rate}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.detailButton}
              onPress={() => handleViewDetail(order.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.detailButtonText}>{t.detail}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const orderCountLabel = String(t.orderCount || '').replace('{n}', String(orders.length));

  const renderPageHeader = () => (
    <LinearGradient
      colors={['#2C98A6', '#5BB8C4', PAGE_BG]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.pageHeader, { paddingTop: Math.max(insets.top, 12) }]}
    >
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          accessibilityRole="button"
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={22} color={NAVY} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <Text style={styles.headerSubtitle}>{orderCountLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerAvatar}
          onPress={() => navigation.navigate('Main', { screen: 'Profile' })}
          activeOpacity={0.85}
        >
          {avatarDisplayUri(avatarUri) ? (
            <Image
              source={{ uri: avatarDisplayUri(avatarUri) }}
              style={styles.headerAvatarImage}
              onError={() => setAvatarUri('')}
            />
          ) : (
            <ProfileAvatar3D size={40} />
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
      >
        {statusFilters.map((filter) => {
          const active = selectedStatus === filter.key;
          const count =
            filter.key === 'all'
              ? orders.length
              : orders.filter((o) => o.status === filter.key).length;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => handleStatusChange(filter.key)}
              onLayout={(event) => {
                filterCardPositions.current[filter.key] = event.nativeEvent.layout.x;
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
              {filter.key !== 'all' && count > 0 && !active ? (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountBadgeText}>{count > 99 ? '99+' : String(count)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        {renderPageHeader()}
        {renderFilters()}
        <View style={styles.content}>
          <View style={{ padding: 16 }}>
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
        {renderPageHeader()}
        {renderFilters()}

      {/* 订单列表 */}
      <FlatList
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, filteredOrders.length === 0 && { flexGrow: 1 }]}
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={42} color={TEAL} />
            </View>
            <Text style={styles.emptyText}>{t.noOrders}</Text>
            <Text style={styles.emptyDesc}>{t.noOrdersDesc}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('PlaceOrder')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyButtonText}>
                {t.placeOrderNow}
              </Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={<View style={{ height: 20 }} />}
      />

      {/* 🚀 新增：评价弹窗 */}
      <Modal
        visible={showReviewSubmitModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!isSubmittingReview) void handleCloseReviewModal();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              style={styles.modalHeader}
            >
              <MyanmarAwareText text={t.rateTitle} style={styles.modalTitle} myanmarWeight="bold" />
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => void handleCloseReviewModal()}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <View style={styles.reviewInfoCard}>
                <View style={styles.reviewInfoBlock}>
                  <MyanmarAwareText text={t.orderNo} style={styles.reviewInfoLabel} myanmarWeight="semibold" />
                  <Text style={styles.reviewInfoValue} selectable>
                    {reviewOrder?.id || '—'}
                  </Text>
                </View>
                <View style={[styles.reviewInfoBlock, { marginTop: 10 }]}>
                  <MyanmarAwareText text={t.store} style={styles.reviewInfoLabel} myanmarWeight="semibold" />
                  <Text style={styles.reviewInfoValue} numberOfLines={3}>
                    {reviewStoreName || '—'}
                  </Text>
                </View>
                <View style={[styles.reviewInfoBlock, { marginTop: 10 }]}>
                  <MyanmarAwareText text={t.courierRider} style={styles.reviewInfoLabel} myanmarWeight="semibold" />
                  <Text style={styles.reviewInfoValue} numberOfLines={3}>
                    {reviewOrder?.courier?.trim() ? reviewOrder.courier : t.noCourierShort}
                  </Text>
                </View>
              </View>
              <View style={styles.ratingContainer}>
                <MyanmarAwareText text={t.merchantProduct} style={styles.ratingLabel} myanmarWeight="semibold" />
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
                <MyanmarAwareText text={ratingCaption(language, reviewRating)} style={styles.ratingText} myanmarWeight="semibold" />
              </View>

              <View style={[styles.ratingContainer, { marginTop: 8 }]}>
                <MyanmarAwareText text={t.courierService} style={styles.ratingLabel} myanmarWeight="semibold" />
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setReviewCourierRating(star)}>
                      <Ionicons 
                        name={star <= reviewCourierRating ? "star" : "star-outline"} 
                        size={40} 
                        color="#2C98A6" 
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <MyanmarAwareText text={ratingCaption(language, reviewCourierRating)} style={styles.ratingText} myanmarWeight="semibold" />
              </View>

              <View style={styles.inputContainer}>
                <MyanmarAwareText text={t.commentOptional} style={styles.inputLabel} myanmarWeight="semibold" />
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder={t.commentPlaceholder}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                />
              </View>

              {/* 🚀 新增：评价图片区域 */}
              <View style={styles.reviewImageContainer}>
                <MyanmarAwareText text={t.uploadPhotos} style={styles.inputLabel} myanmarWeight="semibold" />
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
                          <MyanmarAwareText text={t.photos} style={styles.addImageText} />
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
                  <MyanmarAwareText text={t.submitReview} style={styles.submitButtonText} myanmarWeight="bold" />
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
    backgroundColor: PAGE_BG,
  },
  content: {
    flex: 1,
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A2B48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitles: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#1A2B48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  headerAvatarImage: {
    width: 44,
    height: 44,
  },
  filtersContainer: {
    marginTop: -6,
    paddingBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  filterChip: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#1A2B48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: TEAL,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  filterCountBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  emptyContainer: {
    marginTop: 48,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#e8f5f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: TEAL,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#1A2B48',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    position: 'relative',
  },
  cardUnreadBadge: {
    position: 'absolute',
    top: -8,
    right: 14,
    backgroundColor: TEAL,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardUnreadBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  orderHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  orderIdChip: {
    backgroundColor: TEAL,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  orderIdChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  orderPackageSpec: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  orderStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '42%',
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  partyIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e8f5f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  partyBody: {
    flex: 1,
    minWidth: 0,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  partyAddress: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  partyPinBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  courierUnreadDot: {
    marginRight: 6,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef2f6',
    marginTop: 4,
  },
  orderFooterLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: TEAL,
  },
  pendingPayBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingPayText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  orderTime: {
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailButton: {
    borderWidth: 1.5,
    borderColor: TEAL,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#ffffff',
  },
  detailButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEAL,
  },
  rateButton: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  rateButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
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
  reviewInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewInfoBlock: {},
  reviewInfoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewInfoValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
    lineHeight: 22,
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
