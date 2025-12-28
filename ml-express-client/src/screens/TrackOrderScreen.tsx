import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoggerService from './../services/LoggerService';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { packageService, supabase } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import Toast from '../components/Toast';
import BackToHomeButton from '../components/BackToHomeButton';

const { width, height } = Dimensions.get('window');

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
  const [trackingCode, setTrackingCode] = useState(route?.params?.orderId || '');
  const [loading, setLoading] = useState(false);
  const [packageData, setPackageData] = useState<Package | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<TrackingEvent[]>([]);
  const [searched, setSearched] = useState(false);
  const [courierId, setCourierId] = useState<string | null>(null);
  const [riderLocation, setRiderLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const mapRef = useRef<MapView>(null);

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

    setLoading(true);
    setSearched(true);
    
    try {
      // 查询订单
      const order = await packageService.trackOrder(code.trim());
      
      if (order) {
        setPackageData(order);
        
        // 🚀 新增：获取骑手ID以进行实时追踪
        if (order.courier && order.courier !== '待分配') {
          supabase
            .from('couriers')
            .select('id')
            .eq('name', order.courier)
            .single()
            .then(({ data }) => {
              if (data) setCourierId(data.id);
            });
        } else {
          setCourierId(null);
          setRiderLocation(null);
        }
        
        // 获取追踪历史
        const history = await packageService.getTrackingHistory(order.id);
        setTrackingHistory(history);
        
        showToast('查询成功！', 'success');
      } else {
        setPackageData(null);
        setTrackingHistory([]);
        showToast(t.notFound, 'error');
      }
    } catch (error: any) {
      LoggerService.error('查询失败:', error);
      setPackageData(null);
      setTrackingHistory([]);
      showToast(t.searchError, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 监听骑手实时位置
  useEffect(() => {
    let channel: any = null;

    if (packageData?.status === '配送中' && courierId) {
      console.log('📡 启动骑手实时追踪:', courierId);
      
      // 1. 获取初始位置
      supabase
        .from('courier_locations')
        .select('latitude, longitude')
        .eq('courier_id', courierId)
        .single()
        .then(({ data }) => {
          if (data) {
            setRiderLocation({ latitude: data.latitude, longitude: data.longitude });
          }
        });

      // 2. 订阅位置更新
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
            console.log('📍 收到骑手位置更新:', payload.new);
            setRiderLocation({
              latitude: payload.new.latitude,
              longitude: payload.new.longitude
            });
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        console.log('🛑 停止骑手实时追踪');
        supabase.removeChannel(channel);
      }
    };
  }, [packageData?.status, courierId]);

  // Toast状态
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // 翻译
  const translations: any = {
    zh: {
      title: '追踪订单',
      subtitle: '输入订单号查询包裹状态',
      inputPlaceholder: '请输入订单号或扫描二维码',
      trackButton: '查询',
      scanButton: '扫码查询',
      notFound: '未找到订单',
      notFoundDesc: '请检查订单号是否正确',
      orderInfo: '订单信息',
      orderNumber: '订单号',
      status: '当前状态',
      packageType: '包裹类型',
      weight: '重量',
      price: '价格',
      courier: '配送员',
      distance: '配送距离',
      senderInfo: '寄件信息',
      sender: '寄件人',
      senderPhone: '联系电话',
      senderAddress: '寄件地址',
      receiverInfo: '收件信息',
      receiver: '收件人',
      receiverPhone: '联系电话',
      receiverAddress: '收件地址',
      trackingHistory: '追踪历史',
      noHistory: '暂无追踪记录',
      createdAt: '下单时间',
      pickedUpAt: '取件时间',
      deliveredAt: '送达时间',
      inputError: '请输入订单号',
      searchError: '查询失败',
      searching: '查询中...',
    },
    en: {
      title: 'Track Order',
      subtitle: 'Enter order number to check status',
      inputPlaceholder: 'Enter order number or scan QR code',
      trackButton: 'Track',
      scanButton: 'Scan',
      notFound: 'Order Not Found',
      notFoundDesc: 'Please check the order number',
      orderInfo: 'Order Information',
      orderNumber: 'Order No.',
      status: 'Status',
      packageType: 'Type',
      weight: 'Weight',
      price: 'Price',
      courier: 'Courier',
      distance: 'Distance',
      senderInfo: 'Sender',
      sender: 'Name',
      senderPhone: 'Phone',
      senderAddress: 'Address',
      receiverInfo: 'Receiver',
      receiver: 'Name',
      receiverPhone: 'Phone',
      receiverAddress: 'Address',
      trackingHistory: 'Tracking History',
      noHistory: 'No tracking records',
      createdAt: 'Created',
      pickedUpAt: 'Picked Up',
      deliveredAt: 'Delivered',
      inputError: 'Please enter order number',
      searchError: 'Search failed',
      searching: 'Searching...',
    },
    my: {
      title: 'အော်ဒါခြေရာခံ',
      subtitle: 'အော်ဒါနံပါတ်ထည့်သွင်းပါ',
      inputPlaceholder: 'အော်ဒါနံပါတ် သို့မဟုတ် QR ကုဒ်စကန်ဖတ်ပါ',
      trackButton: 'ရှာဖွေ',
      scanButton: 'စကန်ဖတ်',
      notFound: 'အော်ဒါမတွေ့ပါ',
      notFoundDesc: 'အော်ဒါနံပါတ်ကိုစစ်ဆေးပါ',
      orderInfo: 'အော်ဒါအချက်အလက်',
      orderNumber: 'အော်ဒါနံပါတ်',
      status: 'အခြေအနေ',
      packageType: 'အမျိုးအစား',
      weight: 'အလေးချိန်',
      price: 'စျေးနှုန်း',
      courier: 'ပို့ဆောင်သူ',
      distance: 'အကွာအဝေး',
      senderInfo: 'ပို့သူ',
      sender: 'အမည်',
      senderPhone: 'ဖုန်း',
      senderAddress: 'လိပ်စာ',
      receiverInfo: 'လက်ခံသူ',
      receiver: 'အမည်',
      receiverPhone: 'ဖုန်း',
      receiverAddress: 'လိပ်စာ',
      trackingHistory: 'ခြေရာခံမှတ်တမ်း',
      noHistory: 'မှတ်တမ်းမရှိ',
      createdAt: 'ဖန်တီးချိန်',
      pickedUpAt: 'ထုတ်ယူချိန်',
      deliveredAt: 'ပို့ဆောင်ချိန်',
      inputError: 'အော်ဒါနံပါတ်ထည့်ပါ',
      searchError: 'ရှာဖွေမှုမအောင်မြင်',
      searching: 'ရှာဖွေနေသည်...',
    },
  };

  const t = translations[language] || translations.zh;

  // 显示Toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // 查询订单
  const handleTrack = () => {
    handleTrackInternal(trackingCode);
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

  return (
    <View style={styles.container}>
      {/* 优化背景视觉效果 */}
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

      <BackToHomeButton navigation={navigation} position="topRight" color="white" />
      
      {/* Toast通知 */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={() => setToastVisible(false)}
      />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerStyle, { marginBottom: 30, paddingHorizontal: 20 }]}>
          <Text style={{ color: '#ffffff', fontSize: 32, fontWeight: '800' }}>{t.title}</Text>
          <View style={{ height: 3, width: 40, backgroundColor: '#fbbf24', borderRadius: 2, marginTop: 8, marginBottom: 8 }} />
          <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16 }}>{t.subtitle}</Text>
        </View>

        {/* 搜索框 */}
        <View style={[styles.searchContainer, { marginTop: 0 }]}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t.inputPlaceholder}
              placeholderTextColor="#9ca3af"
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
              colors={['#3b82f6', '#2563eb']}
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

        {/* 加载中 */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>{t.searching}</Text>
          </View>
        )}

        {/* 未找到 */}
        {searched && !loading && !packageData && (
          <View style={styles.notFoundContainer}>
            <Text style={styles.notFoundIcon}>📦</Text>
            <Text style={styles.notFoundText}>{t.notFound}</Text>
            <Text style={styles.notFoundDesc}>{t.notFoundDesc}</Text>
          </View>
        )}

        {/* 订单信息 */}
        {packageData && !loading && (
          <>
            {/* 实时地图追踪 */}
            {packageData.status === '配送中' && (
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: riderLocation?.latitude || packageData.sender_latitude || 16.8661,
                    longitude: riderLocation?.longitude || packageData.sender_longitude || 96.1951,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  {/* 起点标记 */}
                  {packageData.sender_latitude && packageData.sender_longitude && (
                    <Marker
                      coordinate={{
                        latitude: packageData.sender_latitude,
                        longitude: packageData.sender_longitude
                      }}
                      title="发货点"
                      pinColor="#3b82f6"
                    />
                  )}

                  {/* 终点标记 */}
                  {packageData.receiver_latitude && packageData.receiver_longitude && (
                    <Marker
                      coordinate={{
                        latitude: packageData.receiver_latitude,
                        longitude: packageData.receiver_longitude
                      }}
                      title="我的位置"
                      pinColor="#ef4444"
                    />
                  )}

                  {/* 骑手标记 */}
                  {riderLocation && (
                    <Marker
                      coordinate={riderLocation}
                      title="骑手正在赶来"
                    >
                      <View style={styles.riderMarker}>
                        <Text style={{ fontSize: 24 }}>🛵</Text>
                      </View>
                    </Marker>
                  )}

                  {/* 路线预览 */}
                  {riderLocation && packageData.receiver_latitude && (
                    <Polyline
                      coordinates={[
                        riderLocation,
                        {
                          latitude: packageData.receiver_latitude,
                          longitude: packageData.receiver_longitude
                        }
                      ]}
                      strokeColor="#3b82f6"
                      strokeWidth={3}
                      lineDashPattern={[5, 5]}
                    />
                  )}
                </MapView>
                
                <View style={styles.mapOverlay}>
                  <Text style={styles.mapOverlayText}>
                    ✨ {language === 'zh' ? '正在为您进行实时追踪' : language === 'en' ? 'Live Tracking Enabled' : 'တိုက်ရိုက်ခြေရာခံနေသည်'}
                  </Text>
                </View>
              </View>
            )}

            {/* 状态卡片 */}
            <View style={styles.statusCard}>
              <LinearGradient
                colors={[getStatusColor(packageData.status), getStatusColor(packageData.status) + 'dd']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusGradient}
              >
                <Text style={styles.statusIcon}>📦</Text>
                <Text style={styles.statusText}>{packageData.status}</Text>
                <Text style={styles.statusTime}>{formatDate(packageData.created_at)}</Text>
              </LinearGradient>
            </View>

            {/* 订单信息卡片 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 {t.orderInfo}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.orderNumber}:</Text>
                <Text style={styles.infoValue}>{packageData.id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.packageType}:</Text>
                <Text style={styles.infoValue}>{packageData.package_type}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.weight}:</Text>
                <Text style={styles.infoValue}>{packageData.weight}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.price}:</Text>
                <Text style={styles.infoPriceValue}>{packageData.price} MMK</Text>
              </View>
              {packageData.courier && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t.courier}:</Text>
                  <Text style={styles.infoValue}>{packageData.courier}</Text>
                </View>
              )}
              {packageData.delivery_distance && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t.distance}:</Text>
                  <Text style={styles.infoValue}>{packageData.delivery_distance} km</Text>
                </View>
              )}
            </View>

            {/* 寄件信息 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📤 {t.senderInfo}</Text>
              <View style={styles.addressContainer}>
                <View style={styles.addressRow}>
                  <Text style={styles.addressName}>{packageData.sender_name}</Text>
                  <Text style={styles.addressPhone}>📞 {packageData.sender_phone}</Text>
                </View>
                <Text style={styles.addressText}>📍 {packageData.sender_address}</Text>
              </View>
            </View>

            {/* 收件信息 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📥 {t.receiverInfo}</Text>
              <View style={styles.addressContainer}>
                <View style={styles.addressRow}>
                  <Text style={styles.addressName}>{packageData.receiver_name}</Text>
                  <Text style={styles.addressPhone}>📞 {packageData.receiver_phone}</Text>
                </View>
                <Text style={styles.addressText}>📍 {packageData.receiver_address}</Text>
              </View>
            </View>

            {/* 追踪历史 */}
            {trackingHistory.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📍 {t.trackingHistory}</Text>
                {trackingHistory.map((event, index) => (
                  <View key={event.id} style={styles.trackingItem}>
                    <View style={styles.trackingDot}>
                      <View
                        style={[
                          styles.trackingDotInner,
                          index === 0 && styles.trackingDotActive,
                        ]}
                      />
                      {index !== trackingHistory.length - 1 && (
                        <View style={styles.trackingLine} />
                      )}
                    </View>
                    <View style={styles.trackingContent}>
                      <Text style={styles.trackingStatus}>{event.status}</Text>
                      {event.note && (
                        <Text style={styles.trackingNote}>{event.note}</Text>
                      )}
                      <Text style={styles.trackingTime}>
                        {formatDate(event.event_time)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  searchContainer: {
    marginBottom: 24,
    gap: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 16,
  },
  trackButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  trackButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  trackButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  notFoundContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  notFoundIcon: {
    fontSize: 78,
    marginBottom: 20,
  },
  notFoundText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  notFoundDesc: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  statusCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  statusGradient: {
    padding: 30,
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 58,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  statusTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
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
  infoPriceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
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
  addressPhone: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
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
  mapContainer: {
    height: 300,
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  riderMarker: {
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(30, 58, 138, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backdropFilter: 'blur(5px)',
  },
  mapOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
