import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import LoggerService from '../services/LoggerService';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Animated, Alert, Linking, BackHandler } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, AnimatedRegion } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { packageService, supabase, deliveryPhotoService } from '../services/supabase';
import {
  crossBorderTrackingService,
  pickCrossBorderLabel,
  crossBorderStatusColor,
  type CrossBorderTrackingResult,
} from '../services/crossBorderTrackingService';
import { useApp } from '../contexts/AppContext';
import { APP_CONFIG } from '../config/constants';
import { getJourneyCopy } from '../utils/orderJourney';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { feedbackService } from '../services/FeedbackService';
import { common } from '../i18n';
import { getTrackOrderCopy } from './trackOrder/trackOrderCopy';
import { styles, ui, TEAL, NAVY } from './trackOrder/trackOrderStyles';
import { calculateEtaMinutes, formatHm, formatTrackDate, toCourierLatLng } from './trackOrder/trackOrderUtils';
import CourierChatModal from '../components/orderChat/CourierChatModal';
import DeliveryProofSection from '../components/trackOrder/DeliveryProofSection';
import { useOrderChat } from '../hooks/useOrderChat';

interface Package {
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
  delivery_distance?: number;
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

export default function TrackOrderScreen({ navigation, route }: any) {
  const { language } = useApp();
  const c = common(language);
  const insets = useSafeAreaInsets();
  const [trackingCode, setTrackingCode] = useState(route?.params?.orderId || '');
  const [loading, setLoading] = useState(false);
  const [packageData, setPackageData] = useState<Package | null>(null);
  const [crossBorderData, setCrossBorderData] = useState<CrossBorderTrackingResult | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<TrackingEvent[]>([]);
  const [searched, setSearched] = useState(false);
  const [courierId, setCourierId] = useState<string | null>(null);
  const [courierPhone, setCourierPhone] = useState<string | null>(null);
  const [riderLocation, setRiderLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null); // 🚀 新增：预计剩余时间（分钟）
  const [deliveryPhotos, setDeliveryPhotos] = useState<any[]>([]); // 🚀 新增：配送照片状态
  
  // 🚀 优化：平滑移动动画
  const riderAnimatedLocation = useRef(new AnimatedRegion({
    latitude: 16.8661,
    longitude: 96.1951,
    latitudeDelta: 0,
    longitudeDelta: 0,
  })).current;

  const [isOnline, setIsOnline] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const lastFitAtRef = useRef(0);
  const hasFittedOnceRef = useRef(false);
  const [inTransitOrders, setInTransitOrders] = useState<Package[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<MapView>(null);
  const { isDarkMode } = useApp(); // 🚀 获取主题状态

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('userId').then(id => setCurrentUserId(id));
  }, []);

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
    orderId: packageData?.id,
    userId: currentUserId,
    enabled: Boolean(packageData?.id),
    sendFailedText: c.sendFailed,
  });


  useEffect(() => {
    let isMounted = true;
    NetInfo.fetch().then((state) => {
      if (!isMounted) return;
      setIsOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    });
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      setMapError(false);
    }
  }, [isOnline]);

  // 加载正在进行的订单
  const loadInTransitOrders = async () => {
    try {
      if (!refreshing) setLoadingOrders(true);
      const userData = await AsyncStorage.getItem('currentUser');
      const user = userData ? JSON.parse(userData) : null;
      if (!user || user.id === 'guest') {
        setLoadingOrders(false);
        return;
      }

      const userEmail = await AsyncStorage.getItem('userEmail');
      const userPhone = await AsyncStorage.getItem('userPhone');

      const { orders } = await packageService.getAllOrders(user.id, {
        userType: 'customer',
        email: userEmail || user?.email,
        phone: userPhone || user?.phone
      });

      const excludedStatuses = new Set(['已送达', '已取消']);
      const activeOrders = orders.filter((o: any) => !excludedStatuses.has(o.status));
      setInTransitOrders(activeOrders);
      
      // 如果当前正在追踪的订单状态变了（不再是配送中），清除追踪详情
      if (packageData && !activeOrders.find((o: any) => o.id === packageData.id) && packageData.status !== '已送达') {
        // 只有当订单还在“配送中”列表里才维持实时追踪，否则只保留静态详情
        // 这里可以根据需求决定是否清除
      }
    } catch (error) {
      console.error('Failed to load in-transit orders:', error);
    } finally {
      setLoadingOrders(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInTransitOrders();
    if (trackingCode) {
      handleTrackInternal(trackingCode);
    }
  }, [trackingCode]);

  useEffect(() => {
    loadInTransitOrders();
  }, []);

  // 🚀 新增：如果从导航参数传入了 orderId，自动触发查询
  useEffect(() => {
    if (route?.params?.orderId) {
      setTrackingCode(route.params.orderId);
      // 延迟一小会儿确保状态已更新
      setTimeout(() => {
        handleTrackInternal(route.params.orderId);
      }, 300);
    }
  }, [route?.params?.orderId]);

  // 为了能被 useEffect 调用，提取核心查询逻辑
  const handleTrackInternal = async (code: string) => {
    if (!code.trim()) return;

    if (!isOnline) {
      setSearched(true);
      showToast(t.offlineSearch, 'warning');
      return;
    }

    setLoading(true);
    setSearched(true);
    setCrossBorderData(null);
    
    try {
      // 查询同城配送订单
      const order = await packageService.trackOrder(code.trim());
      
      if (order) {
        setPackageData(order);
        setCrossBorderData(null);
        
        // 🚀 新增：获取骑手ID以进行实时追踪 (优先匹配姓名，失败则匹配订单中的courier字段作为ID尝试)
        if (order.courier && order.courier !== '待分配') {
          const fetchCourier = async () => {
            try {
              const { data } = await supabase
                .from('couriers')
                .select('id, phone')
                .eq('name', order.courier)
                .single();
              
              if (data) {
                setCourierId(data.id);
                setCourierPhone(data.phone || null);
              } else {
                setCourierId(order.courier);
                setCourierPhone(null);
              }
            } catch (e) {
              setCourierId(order.courier);
              setCourierPhone(null);
            }
          };
          fetchCourier();
        } else {
          setCourierId(null);
          setCourierPhone(null);
          setRiderLocation(null);
        }
        
        // 获取追踪历史
        const history = await packageService.getTrackingHistory(order.id);
        setTrackingHistory(history);

        // 🚀 新增：如果是已送达，获取配送照片
        if (order.status === '已送达') {
          const photos = await deliveryPhotoService.getPackagePhotos(order.id);
          setDeliveryPhotos(photos);
        } else {
          setDeliveryPhotos([]);
        }
        
        showToast(c.found, 'success');
      } else {
        // 同城未命中时，尝试 Inventory 跨境物流（快递单号 / 入库单号）
        const crossBorder = await crossBorderTrackingService.trackByCode(code.trim());
        if (crossBorder) {
          setPackageData(null);
          setTrackingHistory([]);
          setCourierId(null);
          setCourierPhone(null);
          setRiderLocation(null);
          setCrossBorderData(crossBorder);
          showToast(c.crossBorderFound, 'success');
        } else {
          setPackageData(null);
          setCrossBorderData(null);
          setTrackingHistory([]);
          showToast(t.notFound, 'error');
        }
      }
    } catch (error: any) {
      LoggerService.error('查询失败:', error);
      setPackageData(null);
      setCrossBorderData(null);
      setTrackingHistory([]);
      showToast(t.searchError, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 地图仅在屏获得焦点时挂载，离屏卸载以降低原生资源占用
  useFocusEffect(
    useCallback(() => {
      setMapMounted(true);
      return () => {
        setMapMounted(false);
        hasFittedOnceRef.current = false;
      };
    }, [])
  );

  // 监听骑手位置：Realtime 能通则即时推送；缅甸走 REST 轮询兜底
  useEffect(() => {
    let channel: any = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const activeTrackingStatuses = ['待取件', '已取件', '打包中', '配送中', '待收款', '异常上报'];
    const isTrackingActive = packageData && activeTrackingStatuses.includes(packageData.status);

    const applyLoc = (newLoc: { latitude: number; longitude: number }) => {
      setRiderLocation(newLoc);
      if (packageData?.receiver_latitude && packageData?.receiver_longitude) {
        setEstimatedTime(calculateEtaMinutes(
          newLoc.latitude,
          newLoc.longitude,
          Number(packageData.receiver_latitude),
          Number(packageData.receiver_longitude),
        ));
      }
      (riderAnimatedLocation as any).timing({
        ...newLoc,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: 2000,
        useNativeDriver: false,
      }).start();
    };

    if (mapMounted && isOnline && isTrackingActive && courierId) {
      const pull = () => {
        supabase
          .from('courier_locations')
          .select('latitude, longitude')
          .eq('courier_id', courierId)
          .single()
          .then(({ data }) => {
            const loc = toCourierLatLng(data);
            if (!loc) return;
            setRiderLocation(loc);
            (riderAnimatedLocation as any).setValue({ ...loc, latitudeDelta: 0, longitudeDelta: 0 });
            if (packageData?.receiver_latitude && packageData?.receiver_longitude) {
              setEstimatedTime(calculateEtaMinutes(
                loc.latitude,
                loc.longitude,
                Number(packageData.receiver_latitude),
                Number(packageData.receiver_longitude),
              ));
            }
          });
      };
      pull();
      pollTimer = setInterval(pull, 8000);

      channel = supabase
        .channel(`rider-tracking-${courierId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'courier_locations',
            filter: `courier_id=eq.${courierId}`
          },
          (payload) => {
            const loc = toCourierLatLng(payload.new as { latitude?: unknown; longitude?: unknown });
            if (loc) applyLoc(loc);
          }
        )
        .subscribe();
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [packageData?.status, packageData?.receiver_latitude, packageData?.receiver_longitude, courierId, isOnline, mapMounted]);

  // 地图视野：首次立即适配，之后最多每 4 秒跟随一次，避免每次 Realtime 都重绘视野
  useEffect(() => {
    if (!mapMounted || !mapRef.current || !packageData) return;

    const now = Date.now();
    const shouldFit = !hasFittedOnceRef.current || now - lastFitAtRef.current >= 4000;
    if (!shouldFit) return;

    const coordinates = [];
    if (packageData.sender_latitude && packageData.sender_longitude) {
      coordinates.push({ latitude: Number(packageData.sender_latitude), longitude: Number(packageData.sender_longitude) });
    }
    if (packageData.receiver_latitude && packageData.receiver_longitude) {
      coordinates.push({ latitude: Number(packageData.receiver_latitude), longitude: Number(packageData.receiver_longitude) });
    }
    if (riderLocation) {
      coordinates.push({ latitude: Number(riderLocation.latitude), longitude: Number(riderLocation.longitude) });
    }
    if (coordinates.length === 0) return;

    lastFitAtRef.current = now;
    hasFittedOnceRef.current = true;

    if (coordinates.length >= 2) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    } else {
      mapRef.current.animateToRegion({
        ...coordinates[0],
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [packageData, riderLocation, mapMounted]);

  const t = getTrackOrderCopy(language);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (type === 'success') feedbackService.success(message);
    else if (type === 'error') feedbackService.error(message);
    else if (type === 'warning') feedbackService.warning(message);
    else feedbackService.info(message);
  };

  // 查询订单
  const handleTrack = () => {
    handleTrackInternal(trackingCode);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colors: any = {
      '待确认': '#f97316',
      '待取件': '#f59e0b',
      '待收款': '#f59e0b',
      '打包中': '#3BAFBD',
      '已取件': '#2C98A6',
      '配送中': '#8b5cf6',
      '已送达': '#10b981',
      '已取消': '#ef4444',
      '已到达瑞丽仓库': '#2C98A6',
      '已装车': '#8b5cf6',
      '已抵达目的地': '#22c55e',
      '已签收': '#10b981',
    };
    return colors[status] || '#6b7280';
  };

  const crossBorderEvents = useMemo(() => {
    if (!crossBorderData?.events?.length) return [];
    return [...crossBorderData.events].reverse();
  }, [crossBorderData]);


  const eventTimeFor = (statuses: string[]) => {
    const ev = trackingHistory.find((e) => statuses.includes(e.status));
    return ev?.event_time;
  };

  const timelineIndex = (status: string) => {
    if (['已送达', '已完成', '已签收'].includes(status)) return 4;
    if (['配送中', '待收款', '异常上报'].includes(status)) return 3;
    if (status === '已取件') return 2;
    if (['待取件', '待确认', '打包中'].includes(status)) return 1;
    return 0;
  };

  const openCourierPhone = () => {
    if (!courierPhone) {
      Alert.alert(t.noCourierPhone);
      return;
    }
    Linking.openURL(`tel:${courierPhone}`).catch(() => Alert.alert(t.noCourierPhone));
  };

  const openSupport = () => {
    Linking.openURL(`tel:${APP_CONFIG.CONTACT.PHONE}`).catch(() => {});
  };

  const closeTrackingDetail = useCallback(() => {
    setPackageData(null);
    setCrossBorderData(null);
    setTrackingHistory([]);
    setSearched(false);
    setTrackingCode('');
    setCourierId(null);
    setCourierPhone(null);
    setRiderLocation(null);
    setEstimatedTime(null);
    setDeliveryPhotos([]);
    closeChat();
    setLoading(false);
    if (route?.params?.orderId) {
      navigation.setParams({ orderId: undefined });
    }
  }, [navigation, route?.params?.orderId, closeChat]);

  const handleTrackBack = useCallback(() => {
    if (packageData || crossBorderData) {
      closeTrackingDetail();
      return;
    }
    navigation.navigate('Home');
  }, [packageData, crossBorderData, closeTrackingDetail, navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleTrackBack();
        return true;
      });
      return () => sub.remove();
    }, [handleTrackBack]),
  );

  const renderPageHeader = (overlay = false) => (
    <View style={[ui.navRow, overlay && ui.navRowOverlay, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity
        style={ui.navBtn}
        onPress={handleTrackBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={22} color={NAVY} />
      </TouchableOpacity>
      <Text style={ui.navTitle} numberOfLines={1}>{t.title}</Text>
      <TouchableOpacity style={ui.supportBtn} onPress={openSupport}>
        <Ionicons name="headset-outline" size={18} color={NAVY} />
        <Text style={ui.supportLabel}>{t.customerService}</Text>
      </TouchableOpacity>
    </View>
  );

  const chatModal = (
    <CourierChatModal
      visible={showChatModal}
      title={t.chatWithCourier}
      subtitle={packageData?.courier}
      emptyText={t.noMessages}
      inputPlaceholder={t.inputMessage}
      messages={messages}
      currentUserId={currentUserId}
      inputText={inputText}
      sending={sending}
      isDarkMode={isDarkMode}
      onChangeInput={setInputText}
      onSend={sendMessage}
      onClose={closeChat}
    />
  );

  if (packageData && !loading) {
    const showMap = ['待取件', '已取件', '打包中', '配送中', '待收款', '异常上报'].includes(packageData.status);
    const idx = timelineIndex(packageData.status);
    const journey = getJourneyCopy(packageData.status, language as 'zh' | 'en' | 'my');
    const headline =
      packageData.status === '配送中' || packageData.status === '待收款'
        ? t.riderDelivering
        : journey.headline;
    const etaText =
      estimatedTime != null
        ? t.etaMinutes.replace('{n}', String(estimatedTime))
        : t.etaByOption;
    const steps = [
      { label: t.stepPlaced, time: formatHm(packageData.created_at) },
      { label: t.stepPreparing, time: formatHm(eventTimeFor(['打包中', '待取件', '待确认'])) },
      { label: t.stepPicked, time: formatHm(packageData.pickup_time || eventTimeFor(['已取件'])) },
      { label: t.stepDelivering, time: formatHm(eventTimeFor(['配送中', '待收款'])) },
      { label: idx >= 4 ? t.stepArrived : t.stepArrive, time: formatHm(packageData.delivery_time || eventTimeFor(['已送达'])) },
    ];
    const courierName = packageData.courier && packageData.courier !== '待分配' ? packageData.courier : t.courier;
    const summaryText = packageData.description || packageData.package_type || t.orderInfo;

    return (
      <View style={ui.page}>
        <View style={ui.hero}>
          {showMap && mapMounted && isOnline && !mapError ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              onMapReady={() => setMapError(false)}
              initialRegion={{
                latitude: riderLocation?.latitude || packageData.sender_latitude || 16.8661,
                longitude: riderLocation?.longitude || packageData.sender_longitude || 96.1951,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {!!packageData.sender_latitude && !!packageData.sender_longitude ? (
                <Marker
                  coordinate={{
                    latitude: packageData.sender_latitude,
                    longitude: packageData.sender_longitude,
                  }}
                  title="发货点"
                  pinColor={TEAL}
                />
              ) : null}
              {!!packageData.receiver_latitude && !!packageData.receiver_longitude ? (
                <Marker
                  coordinate={{
                    latitude: packageData.receiver_latitude,
                    longitude: packageData.receiver_longitude,
                  }}
                  title="我的位置"
                  pinColor="#ef4444"
                />
              ) : null}
              {!!riderLocation ? (
                <Marker.Animated
                  coordinate={riderAnimatedLocation as any}
                  title={c.riderLocation}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={ui.riderPin}>
                    <Text style={{ fontSize: 22 }}>🛵</Text>
                  </View>
                </Marker.Animated>
              ) : null}
              {!!riderLocation && !!packageData.receiver_latitude && !!packageData.receiver_longitude ? (
                <Polyline
                  coordinates={[
                    riderLocation,
                    {
                      latitude: packageData.receiver_latitude,
                      longitude: packageData.receiver_longitude,
                    },
                  ]}
                  strokeColor={TEAL}
                  strokeWidth={4}
                />
              ) : null}
            </MapView>
          ) : (
            <LinearGradient colors={['#d8eef1', '#b7dce1', '#e8f5f6']} style={StyleSheet.absoluteFill} />
          )}
          <View style={ui.heroScrim} pointerEvents="none" />
          {renderPageHeader(true)}
          <View style={ui.statusFloat}>
            <Text style={ui.statusHeadline} numberOfLines={2}>{headline}</Text>
            <Text style={ui.statusEta}>{etaText}</Text>
          </View>
        </View>

        <View style={ui.sheet}>
          <View style={ui.riderBar}>
            <View style={ui.riderAvatar}>
              <Text style={ui.riderAvatarText}>{(courierName || '骑').trim().charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ui.riderName} numberOfLines={1}>{courierName}</Text>
              <Text style={ui.riderMeta}>{packageData.status}</Text>
            </View>
            <TouchableOpacity style={ui.actionCol} onPress={openCourierPhone}>
              <View style={ui.actionCircle}>
                <Ionicons name="call" size={18} color="#fff" />
              </View>
              <Text style={ui.actionLabel}>{t.callCourier}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ui.actionCol} onPress={openChat}>
              <View style={ui.actionCircle}>
                <Ionicons name="chatbubble" size={18} color="#fff" />
                {unreadCount > 0 ? (
                  <View style={ui.unreadDot}>
                    <Text style={ui.unreadDotText}>{unreadCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={ui.actionLabel}>{t.messageCourier}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
          >
            {steps.map((step, i) => {
              const done = i < idx;
              const current = i === idx;
              return (
                <View key={`${step.label}-${i}`} style={ui.tlRow}>
                  <View style={ui.tlRail}>
                    <View style={[ui.tlDot, done && ui.tlDotDone, current && ui.tlDotCurrent]}>
                      {done ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}
                    </View>
                    {i < steps.length - 1 ? <View style={[ui.tlLine, i < idx && ui.tlLineDone]} /> : null}
                  </View>
                  <View style={ui.tlBody}>
                    <Text style={[ui.tlLabel, current && ui.tlLabelCurrent]}>{step.label}</Text>
                    {step.time ? <Text style={ui.tlTime}>{step.time}</Text> : null}
                  </View>
                </View>
              );
            })}

            <DeliveryProofSection
              photos={deliveryPhotos}
              styles={styles}
              isDarkMode={isDarkMode}
              title={c.deliveryProof}
              viewPhotoLabel={c.viewPhoto}
            />

            <View style={ui.miniCard}>
              <Text style={ui.miniCardTitle}>{t.senderInfo}</Text>
              <Text style={ui.miniCardText}>{packageData.sender_name}  {packageData.sender_phone}</Text>
              <Text style={ui.miniCardMuted}>{packageData.sender_address}</Text>
            </View>
            <View style={ui.miniCard}>
              <Text style={ui.miniCardTitle}>{t.receiverInfo}</Text>
              <Text style={ui.miniCardText}>{packageData.receiver_name}  {packageData.receiver_phone}</Text>
              <Text style={ui.miniCardMuted}>{packageData.receiver_address}</Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={ui.summaryBar}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OrderDetail', { orderId: packageData.id })}
          >
            <View style={ui.summaryThumb}>
              <Ionicons name="cube-outline" size={22} color={TEAL} />
            </View>
            <Text style={ui.summaryName} numberOfLines={1}>{summaryText}</Text>
            <Text style={ui.summaryPrice}>{Number(packageData.price || 0).toLocaleString()} MMK</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
        {chatModal}
      </View>
    );
  }

  return (
    <View style={ui.page}>
      {renderPageHeader(false)}

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />
        }
      >
        <Text style={ui.browseSubtitle}>{t.subtitle}</Text>

        {/* 正在配送中的订单列表 (快捷访问) - 始终显示，除非列表为空 */}
        {inTransitOrders.length > 0 && (
          <View style={styles.ongoingContainer}>
            <Text style={[styles.ongoingTitle, isDarkMode && styles.darkText]}>🛵 {t.ongoingOrders} ({inTransitOrders.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10, paddingHorizontal: 4 }}>
              {inTransitOrders.map((order) => {
                const isSelected = packageData?.id === order.id;
                return (
                  <TouchableOpacity
                    key={order.id}
                    style={[
                      styles.ongoingCard, 
                      isSelected && { borderWidth: 2, borderColor: '#fbbf24', elevation: 8, shadowOpacity: 0.3 },
                      isDarkMode && !isSelected && { backgroundColor: '#1e293b' }
                    ]}
                    onPress={() => {
                      setTrackingCode(order.id);
                      handleTrackInternal(order.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isSelected 
                        ? (isDarkMode ? ['#164E56', '#1E6F7A'] : ['#E8F6F8', '#D7F3F6']) 
                        : (isDarkMode ? ['#1e293b', '#0f172a'] : ['#ffffff', '#f1f5f9'])}
                      style={styles.ongoingCardGradient}
                    >
                      <View style={styles.ongoingCardHeader}>
                        <Text style={[styles.ongoingOrderId, (isSelected || isDarkMode) && { color: '#5BB8C4' }]}>
                          #{order.id.slice(-6).toUpperCase()}
                        </Text>
                        <View style={[styles.ongoingBadge, isSelected && { backgroundColor: '#2C98A6' }]}>
                          <Text style={styles.ongoingBadgeText}>{order.status}</Text>
                        </View>
                      </View>
                      <Text style={[styles.ongoingAddress, isDarkMode && { color: '#94a3b8' }]} numberOfLines={1}>📍 {order.receiver_address}</Text>
                      <Text style={[styles.ongoingTap, isSelected && { fontWeight: 'bold' }, isDarkMode && { color: '#5BB8C4' }]}>
                        {isSelected ? '👀 ' + c.trackingNow : t.tapToTrack}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 搜索框 */}
        <View style={[styles.searchContainer, { marginTop: 0 }]}>
          <View style={[styles.searchInputContainer, isDarkMode && styles.darkSearchInput]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, isDarkMode && { color: '#ffffff' }]}
              placeholder={t.inputPlaceholder}
              placeholderTextColor={isDarkMode ? "#64748b" : "#9ca3af"}
              value={trackingCode}
              onChangeText={setTrackingCode}
              onSubmitEditing={handleTrack}
              returnKeyType="search"
            />
          </View>
          
          <TouchableOpacity
            style={styles.trackButton}
            onPress={handleTrack}
            activeOpacity={0.7}
            disabled={loading}
          >
            <LinearGradient
              colors={[TEAL, '#1F7A86']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.trackButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.trackButtonText}>{t.trackButton}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>{t.offlineBanner}</Text>
          </View>
        )}

        {/* 加载中 */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>{t.searching}</Text>
          </View>
        )}

        {/* 未找到 */}
        {searched && !loading && !packageData && !crossBorderData && (
          <View style={styles.notFoundContainer}>
            <Text style={styles.notFoundIcon}>📦</Text>
            <Text style={styles.notFoundText}>{t.notFound}</Text>
            <Text style={styles.notFoundDesc}>{t.notFoundDesc}</Text>
          </View>
        )}

        {crossBorderData && !loading && (
          <>
            <View style={styles.statusCard}>
              <LinearGradient
                colors={[
                  crossBorderStatusColor(crossBorderData.current_status_key),
                  crossBorderStatusColor(crossBorderData.current_status_key) + 'dd',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusGradient}
              >
                <View style={styles.statusHeader}>
                  <Text style={styles.statusBadge}>{t.crossBorderBadge}</Text>
                  <Text style={styles.statusText}>
                    {pickCrossBorderLabel(crossBorderData.current_status, language)}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>📦 {t.orderInfo}</Text>
              <View style={[styles.infoRow, isDarkMode && styles.darkInfoRow]}>
                <Text style={styles.infoLabel}>{t.inboundBarcode}:</Text>
                <Text style={[styles.infoValue, isDarkMode && styles.darkText]} selectable>
                  {crossBorderData.order_barcode}
                </Text>
              </View>
              {crossBorderData.express_barcode ? (
                <View style={[styles.infoRow, isDarkMode && styles.darkInfoRow]}>
                  <Text style={styles.infoLabel}>{t.expressBarcode}:</Text>
                  <Text style={[styles.infoValue, isDarkMode && styles.darkText]} selectable>
                    {crossBorderData.express_barcode}
                  </Text>
                </View>
              ) : null}
              {crossBorderData.recipient_name ? (
                <View style={[styles.infoRow, isDarkMode && styles.darkInfoRow]}>
                  <Text style={styles.infoLabel}>{t.receiver}:</Text>
                  <Text style={[styles.infoValue, isDarkMode && styles.darkText]}>
                    {crossBorderData.recipient_name}
                  </Text>
                </View>
              ) : null}
              {crossBorderData.final_destination ? (
                <View style={[styles.infoRow, isDarkMode && styles.darkInfoRow]}>
                  <Text style={styles.infoLabel}>{t.destination}:</Text>
                  <Text style={[styles.infoValue, isDarkMode && styles.darkText]}>
                    {crossBorderData.final_destination_label
                      ? pickCrossBorderLabel(
                          {
                            zh: crossBorderData.final_destination_label.zh,
                            en: crossBorderData.final_destination_label.en,
                            my: crossBorderData.final_destination_label.en,
                          },
                          language,
                        )
                      : crossBorderData.final_destination}
                  </Text>
                </View>
              ) : null}
              {crossBorderData.product_name ? (
                <View style={[styles.infoRow, isDarkMode && styles.darkInfoRow]}>
                  <Text style={styles.infoLabel}>{t.productName}:</Text>
                  <Text style={[styles.infoValue, isDarkMode && styles.darkText]}>
                    {crossBorderData.product_name}
                  </Text>
                </View>
              ) : null}
              {crossBorderData.weight ? (
                <View style={[styles.infoRow, isDarkMode && styles.darkInfoRow]}>
                  <Text style={styles.infoLabel}>{t.weight}:</Text>
                  <Text style={[styles.infoValue, isDarkMode && styles.darkText]}>
                    {crossBorderData.weight}
                  </Text>
                </View>
              ) : null}
            </View>

            {crossBorderEvents.length > 0 && (
              <View style={[styles.card, isDarkMode && styles.darkCard]}>
                <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>📍 {t.trackingHistory}</Text>
                {crossBorderEvents.map((event, index) => (
                  <View key={`${event.status_key}-${event.event_time}-${index}`} style={styles.trackingItem}>
                    <View style={styles.trackingDot}>
                      <View
                        style={[
                          styles.trackingDotInner,
                          index === 0 && styles.trackingDotActive,
                          isDarkMode && { borderColor: '#1e293b' },
                        ]}
                      />
                      {index !== crossBorderEvents.length - 1 && (
                        <View style={[styles.trackingLine, isDarkMode && { backgroundColor: '#1e293b' }]} />
                      )}
                    </View>
                    <View style={styles.trackingContent}>
                      <Text style={[styles.trackingStatus, isDarkMode && styles.darkText]}>
                        {pickCrossBorderLabel(event.labels, language)}
                      </Text>
                      {event.note ? (
                        <Text style={[styles.trackingNote, isDarkMode && { color: '#94a3b8' }]}>
                          {event.note}
                        </Text>
                      ) : null}
                      <Text style={styles.trackingTime}>{formatTrackDate(event.event_time)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {chatModal}
    </View>
  );
}
