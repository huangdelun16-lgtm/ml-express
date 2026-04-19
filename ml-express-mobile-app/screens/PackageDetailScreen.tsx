import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Vibration,
  FlatList
} from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { chatService } from '../services/chatService';
import { packageService, deliveryStoreService, supabase } from '../services/supabase';
import { cacheService } from '../services/cacheService';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { CameraView } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import {
  normalizePackageStatusZh,
  isPickupFlowStatus,
  isNavigateMerchantFirstPhase,
} from '../utils/packageStatusNormalize';
import { getPackingModalModel } from '../utils/parseOrderPackingItems';
import { openMapsToAddress } from '../utils/openMapsNavigation';

const { width } = Dimensions.get('window');

export default function PackageDetailScreen({ route, navigation }: any) {
  const isFocused = useIsFocused();
  const { language } = useApp();
  const { packageId, package: initialPackage } = route.params || {};
  const [pkg, setPkg] = useState<any>(initialPackage || null);
  const [loading, setLoading] = useState(!initialPackage);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [anomalyType, setAnomalyType] = useState('');
  const [anomalyDescription, setAnomalyDescription] = useState('');
  const [reporting, setReporting] = useState(false);

  // 🚀 快捷回复模板
  const QUICK_REPLIES = [
    { zh: '你好，我是配送员，我现在出发去取件。', en: 'Hi, I am your courier. I am on my way to pick up.', my: 'ပစ္စည်းသွားယူပါပြီ' },
    { zh: '你好，我已经取到您的包裹，正在为您配送中。', en: 'Hi, I have picked up your package and it is on the way.', my: 'ပစ္စည်းယူပြီးလာပို့နေပါပြီ' },
    { zh: '我已到达您的收件地址附近，请保持电话畅通。', en: 'I am near your delivery address. Please keep your phone active.', my: 'သင့်ထံမကြာမှီရောက်ရှိပါတော့မည်' },
    { zh: '您的包裹已经成功送达，感谢您的使用！', en: 'Your package has been delivered. Thank you for using our service!', my: 'လက်ခံသူမှပစ္စည်းလက်ခံရရှိပြီးပါပြီ' },
    { zh: '抱歉，暂时无法联系到收件人，我会稍后重试。', en: 'Sorry, I cannot reach the receiver. I will try again later.', my: 'လက်ခံသူအား ဆက်သွယ်၍မရပါ' },
  ];

  // 聊天相关
  const [showChatModal, setShowChatModal] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [courierId, setCourierId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatSubscriptionRef = React.useRef<any>(null);
  const flatListRef = React.useRef<FlatList>(null);

  const [orderPacking, setOrderPacking] = useState<ReturnType<
    typeof getPackingModalModel
  > | null>(null);

  // 自动检查未读消息
  useEffect(() => {
    if (!pkg?.id || !courierId) return;
    
    const checkUnread = async () => {
      const count = await chatService.getUnreadCount(courierId);
      setUnreadCount(count);
    };
    
    checkUnread();
    const timer = setInterval(checkUnread, 10000); // 10秒检查一次
    return () => clearInterval(timer);
  }, [pkg?.id, courierId]);

  useEffect(() => {
    if (!initialPackage && (packageId || route.params?.id)) {
      loadPackageDetails(packageId || route.params?.id);
    }
    loadCourierInfo();

    return () => {
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe();
      }
    };
  }, [packageId, route.params?.id, initialPackage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pkg) {
        setOrderPacking(null);
        return;
      }
      const priceMap = await deliveryStoreService.getProductPriceMapByStoreId(
        pkg.delivery_store_id,
      );
      if (cancelled) return;
      setOrderPacking(getPackingModalModel(pkg.description, priceMap));
    })();
    return () => {
      cancelled = true;
    };
  }, [pkg?.id, pkg?.description, pkg?.delivery_store_id]);

  const loadCourierInfo = async () => {
    const id = await AsyncStorage.getItem('currentCourierId');
    console.log('👤 当前骑手 ID:', id);
    setCourierId(id);
  };

  const loadChatMessages = async () => {
    const id = pkg?.id || packageId || route.params?.id;
    if (!id) return;
    
    const chatMsgs = await chatService.getOrderMessages(id);
    setMessages(chatMsgs);
    
    // 订阅新消息
    if (!chatSubscriptionRef.current) {
      chatSubscriptionRef.current = chatService.subscribeToMessages(id, (newMsg) => {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        
        // 如果聊天框没打开，且是对方发的消息，增加未读数
        if (!showChatModal && newMsg.sender_id !== courierId) {
          setUnreadCount(prev => prev + 1);
          Vibration.vibrate(100);
          // 语音播报新消息
          Speech.speak('您有新的客户消息', { language: 'zh-CN' });
        }
      });
    }
  };

  const handleSendMessage = async () => {
    const id = pkg?.id || packageId || route.params?.id;
    console.log('💬 准备手动发送消息, orderId:', id, 'courierId:', courierId);
    if (!inputText.trim() || !courierId || !id) {
      console.warn('⚠️ 发送条件不满足:', { text: !!inputText.trim(), courierId: !!courierId, id: !!id });
      return;
    }
    
    const messageText = inputText.trim();
    
    // 🚀 乐观更新：先将消息显示在界面上
    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      order_id: id,
      sender_id: courierId,
      sender_type: 'rider',
      message: messageText,
      created_at: new Date().toISOString(),
      is_read: false
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    
    const result = await chatService.sendMessage({
      order_id: id,
      sender_id: courierId,
      sender_type: 'rider',
      message: messageText
    });
    
    if (!result.success) {
      console.error('❌ 发送失败详情:', result.error);
      // 如果发送失败，移除乐观消息并还原输入框（可选，或者显示失败红点）
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInputText(messageText);
      Alert.alert('错误', '消息发送失败: ' + (result.error?.message || '未知错误'));
    }
  };

  // 🚀 发送快捷回复
  const handleQuickReply = async (text: string) => {
    const id = pkg?.id || packageId || route.params?.id;
    console.log('⚡ 准备发送快捷回复:', text, 'orderId:', id);
    if (!courierId || !id) {
      console.warn('⚠️ 发送条件不满足:', { courierId: !!courierId, id: !!id });
      return;
    }
    
    // 🚀 乐观更新
    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      order_id: id,
      sender_id: courierId,
      sender_type: 'rider',
      message: text,
      created_at: new Date().toISOString(),
      is_read: false
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    const result = await chatService.sendMessage({
      order_id: id,
      sender_id: courierId,
      sender_type: 'rider',
      message: text
    });
    
    if (!result.success) {
      console.error('❌ 快捷回复发送失败:', result.error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      Alert.alert('错误', '消息发送失败: ' + (result.error?.message || '未知错误'));
    }
  };

  const loadPackageDetails = async (id: string) => {
    try {
      setLoading(true);
      const netInfo = await NetInfo.fetch();
      let data = null;

      if (netInfo.isConnected) {
        data = await packageService.getPackageById(id);
      } else {
        const cachedPackages = await cacheService.getCachedPackages();
        data = cachedPackages?.find(p => p.id === id) || null;
      }

      if (data) {
        setPkg(data);
      } else {
        throw new Error('Package not found');
      }
    } catch (error) {
      console.error('加载包裹详情失败:', error);
      Alert.alert(
        language === 'zh' ? '加载失败' : 'Load Failed',
        language === 'zh' ? '无法加载包裹详情，请检查网络' : 'Unable to load package details, please check network'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = normalizePackageStatusZh(status);
    switch (s) {
      case '待取件':
      case '待收款':
        return '#f39c12';
      case '待确认':
        return '#a855f7';
      case '打包中':
        return '#0ea5e9';
      case '已取件':
        return '#3498db';
      case '配送中':
        return '#9b59b6';
      case '已送达':
      case '已完成':
        return '#27ae60';
      case '已取消':
        return '#e74c3c';
      case '异常上报':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相机权限');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
      quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
        setShowPhotoModal(true);
        setShowCameraModal(false);
    }
  };

  const handleManualPickup = async () => {
    if (!pkg) return;
    
    Alert.alert(
      language === 'zh' ? '确认取件' : language === 'en' ? 'Confirm Pickup' : 'ကောက်ယူမှုကိုအတည်ပြုပါ',
      language === 'zh' ? '确定已收到此包裹吗？' : language === 'en' ? 'Are you sure you have received this package?' : 'ဤအထုပ်ကိုလက်ခံရရှိသည်မှာသေချာပါသလား?',
      [
        { text: language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်', style: 'cancel' },
        {
          text: language === 'zh' ? '确认' : language === 'en' ? 'Confirm' : 'အတည်ပြု',
          onPress: async () => {
            try {
      const success = await packageService.updatePackageStatus(
                pkg.id,
                '已取件',
                new Date().toLocaleString('zh-CN'),
                undefined,
                pkg.courier
              );

      if (success) {
        Alert.alert(
                  language === 'zh' ? '成功' : language === 'en' ? 'Success' : 'အောင်မြင်ပါသည်',
                  language === 'zh' ? '已确认取件' : language === 'en' ? 'Pickup confirmed' : 'ကောက်ယူမှုကိုအတည်ပြုပြီးပါပြီ'
                );
                setShowCameraModal(false);
                loadPackageDetails(pkg.id);
              }
    } catch (error) {
              Alert.alert('错误', '操作失败');
            }
          }
        }
      ]
    );
  };

  const handleUploadPhoto = async () => {
    if (!capturedPhoto || !pkg) return;
    
    try {
      setUploading(true);

      // 1. 🚀 防作弊检查
      const { deviceHealthService } = require('../services/deviceHealthService');
      const health = await deviceHealthService.performFullCheck();
      
      if (health.location.isMocked) {
        Alert.alert(
          language === 'zh' ? '检测到异常' : 'Anomaly Detected',
          language === 'zh' ? '系统检测到您正在使用“模拟定位”，该操作已被禁止并已上报系统。' : 'Mock location detected. This action is prohibited and reported.'
        );
        const courierId = await AsyncStorage.getItem('currentCourierId') || pkg.courier || '未知';
        const courierName = await AsyncStorage.getItem('currentUserName') || '骑手';
        await packageService.reportAnomaly({
          packageId: pkg.id,
          courierId,
          courierName,
          anomalyType: '疑似使用模拟定位',
          description: `骑手在尝试上传照片送达时，系统检测到使用了模拟定位。`,
        });
        return;
      }

      // 2. 🚀 电子围栏距离检查
      const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (currentLoc && pkg.receiver_latitude && pkg.receiver_longitude) {
        const { latitude, longitude } = currentLoc.coords;
        const R = 6371e3; // meters
        const p1 = latitude * Math.PI/180;
        const p2 = pkg.receiver_latitude * Math.PI/180;
        const dp = (pkg.receiver_latitude - latitude) * Math.PI/180;
        const dl = (pkg.receiver_longitude - longitude) * Math.PI/180;
        const a = Math.sin(dp/2) * Math.sin(dp/2) +
                  Math.cos(p1) * Math.cos(p2) *
                  Math.sin(dl/2) * Math.sin(dl/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const dist = R * c;

        if (dist > 200) {
          Alert.alert(
            language === 'zh' ? '距离过远' : 'Too Far',
            language === 'zh' 
              ? `您距离送达点还剩 ${Math.round(dist)} 米，请到达目的地后再拍照。` 
              : `You are ${Math.round(dist)}m away from destination. Please arrive before taking photo.`
          );
          return;
        }
      }

      const success = await packageService.updatePackageStatus(
        pkg.id, '已送达', undefined, new Date().toISOString(), pkg.courier
      );
      if (success) {
        Alert.alert('成功', '包裹已送达', [{ text: '确定', onPress: () => {
          setShowPhotoModal(false);
          loadPackageDetails(pkg.id);
        }}]);
      }
      } catch (error) {
      Alert.alert('失败', '上传配送证明失败');
    } finally {
      setUploading(false);
    }
  };

  const handleReportAnomaly = async () => {
    if (!anomalyType || !anomalyDescription) {
      Alert.alert('提示', '请选择异常类型并填写详细说明');
      return;
    }

    try {
      setReporting(true);
      
      const currentCourierId = await AsyncStorage.getItem('currentCourierId') || pkg.courier || '未知';
      const currentCourierName = await AsyncStorage.getItem('currentUserName') || '骑手';
      
      // 获取当前位置
      let locationData = undefined;
      try {
        const { locationService } = require('../services/locationService');
        const loc = await locationService.getCurrentLocation();
        if (loc) locationData = { latitude: loc.latitude, longitude: loc.longitude };
      } catch (e) {}

      const success = await packageService.reportAnomaly({
        packageId: pkg.id,
        courierId: currentCourierId,
        courierName: currentCourierName,
        anomalyType,
        description: anomalyDescription,
        location: locationData
      });

      if (success) {
        Alert.alert(
          language === 'zh' ? '提交成功' : 'Reported Successfully',
          language === 'zh' ? '异常已报备，平台将介入处理。感谢您的配合！' : 'Anomaly reported. The platform will intervene. Thank you for your cooperation!',
          [{ text: '确定', onPress: () => {
            setShowAnomalyModal(false);
            setAnomalyType('');
            setAnomalyDescription('');
          }}]
        );
      } else {
        throw new Error('Submit failed');
      }
    } catch (error) {
      Alert.alert('失败', '提交报备失败，请重试');
    } finally {
      setReporting(false);
    }
  };

  const handleScanCode = async (data: string) => {
    setShowScanModal(false);
    
    try {
      setLoading(true);
      
      // 1. 🚀 防作弊检查
      const { deviceHealthService } = require('../services/deviceHealthService');
      const health = await deviceHealthService.performFullCheck();
      if (health.location.isMocked) {
        Alert.alert('检测到异常', '禁止使用模拟定位进行扫码送达');
        return;
      }

      // 2. 🚀 距离检查 (如果是送达操作且不是扫码送达中转站)
      const isStoreCode = data.startsWith('STORE_');
      if (
        pkg &&
        !isPickupFlowStatus(normalizePackageStatusZh(pkg.status)) &&
        !isStoreCode
      ) {
        const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (currentLoc && pkg.receiver_latitude && pkg.receiver_longitude) {
          // ... 距离计算 ...
          const R = 6371e3;
          const p1 = currentLoc.coords.latitude * Math.PI/180;
          const p2 = pkg.receiver_latitude * Math.PI/180;
          const dp = (pkg.receiver_latitude - currentLoc.coords.latitude) * Math.PI/180;
          const dl = (pkg.receiver_longitude - currentLoc.coords.longitude) * Math.PI/180;
          const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const dist = R * c;

          if (dist > 200) {
            Alert.alert('距离过远', `您距离送达点还剩 ${Math.round(dist)} 米，请到达目的地后再扫码。`);
            return;
          }
        }
      }

      if (data.startsWith('STORE_')) {
        const storeId = data.replace('STORE_', '').split('_')[0];
        
        // 🚀 核心逻辑：如果是异常上报状态送达中转站，增加备注说明
        const isAnomalyResolution =
          normalizePackageStatusZh(pkg?.status) === '异常上报';
        const statusMsg = isAnomalyResolution ? '已送达 (异常转中转站)' : '已送达';
        const alertMsg = isAnomalyResolution ? '包裹已作为异常件送达至中转站' : '包裹已送达至代收点';

        const success = await packageService.updatePackageStatus(
            pkg.id, '已送达', undefined, new Date().toISOString(), pkg.courier, undefined, { storeId, storeName: '中转站', receiveCode: data }
        );
        if (success) {
            // 如果是异常上报，额外更新一条描述
            if (isAnomalyResolution) {
              try {
                await supabase.from('packages').update({ 
                  description: (pkg.description || '') + ' [异常转送中转站]'
                }).eq('id', pkg.id);
              } catch (e) {}
            }
            
            Alert.alert('✅ ' + statusMsg, alertMsg, [{ text: '确定', onPress: () => loadPackageDetails(pkg.id) }]);
        }
      } else {
        Alert.alert('扫码成功', `扫描结果: ${data}`);
      }
    } catch (error) {
      Alert.alert('错误', '更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !pkg) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#0f172a', '#1e3a8a']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const statusNorm = normalizePackageStatusZh(pkg.status);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f172a', '#1e3a8a', '#334155']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{language === 'zh' ? '包裹详情' : 'Package Detail'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pkg.status) }]}>
            <Text style={styles.statusText}>{statusNorm || pkg.status}</Text>
          </View>
          <Text style={styles.packageId}>{pkg.id}</Text>
        </View>

        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>📦 {language === 'zh' ? '包裹详情' : 'Information'}</Text>
          
          {/* 🚀 新增：展示下单身份 */}
          {(() => {
            const identityMatch = pkg.description?.match(/\[(?:下单身份|Orderer Identity|Orderer|အော်ဒါတင်သူ အမျိုးအစား|အော်ဒါတင်သူ): (.*?)\]/);
            if (identityMatch && identityMatch[1]) {
              const identity = identityMatch[1];
              return (
                <View style={[styles.infoLine, { backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 10, borderRadius: 10, marginBottom: 15 }]}>
                  <Text style={[styles.infoLabel, { color: '#fff', fontWeight: 'bold' }]}>
                    👤 {language === 'zh' ? '下单身份' : 'Orderer'}:
                  </Text>
                  <Text style={[styles.infoValue, { color: '#3b82f6', fontWeight: 'bold', fontSize: 15 }]}>
                    {identity}
                  </Text>
                </View>
              );
            }
            return null;
          })()}

          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>{language === 'zh' ? '类型' : 'Type'}</Text>
            <Text style={styles.infoValue}>{pkg.package_type}</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>{language === 'zh' ? '重量' : 'Weight'}</Text>
            <Text style={styles.infoValue}>{pkg.weight}kg</Text>
          </View>
          <View style={styles.glassDivider} />
          <Text style={styles.sectionTitle}>💰 {language === 'zh' ? '费用信息' : 'Price Information'}</Text>
          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>{language === 'zh' ? '跑腿费' : 'Delivery Fee'}</Text>
            <Text style={[styles.infoValue, { color: '#10b981' }]}>{Number(parseFloat(String(pkg.price || 0).replace(/[^\d.]/g, '')) || 0).toLocaleString()} MMK</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>{language === 'zh' ? '代收款 (COD)' : 'COD Amount'}</Text>
            <Text style={[styles.infoValue, { color: '#f59e0b' }]}>{Number(pkg.cod_amount || 0).toLocaleString()} MMK</Text>
          </View>

          {/* 🚀 新增：解析并显示“余额支付”金额 */}
          {(() => {
            const payMatch = pkg.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/);
            if (payMatch && payMatch[1]) {
              return (
                <View style={[styles.infoLine, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', marginTop: 10, paddingTop: 15 }]}>
                  <Text style={[styles.infoLabel, { fontWeight: 'bold', color: '#10b981' }]}>
                    {language === 'zh' ? '余额支付' : language === 'en' ? 'Balance Payment' : 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း'}:
                  </Text>
                  <Text style={[styles.infoValue, { fontWeight: 'bold', color: '#10b981', fontSize: 18 }]}>
                    {payMatch[1]} MMK
                  </Text>
                </View>
              );
            }
            return null;
          })()}

          {orderPacking && orderPacking.lineCount > 0 ? (
            <>
              <View style={styles.glassDivider} />
              <Text style={styles.sectionTitle}>
                🛒{" "}
                {language === "zh"
                  ? "商品明细"
                  : language === "en"
                    ? "Order items"
                    : "ပစ္စည်းစာရင်း"}
              </Text>
              <View style={styles.packingTableHeader}>
                <Text
                  style={[styles.packingHdrText, { flex: 1, marginRight: 8 }]}
                >
                  {language === "zh"
                    ? "商品"
                    : language === "en"
                      ? "Item"
                      : "ပစ္စည်း"}
                </Text>
                <Text style={[styles.packingHdrText, styles.packingColQty]}>
                  {language === "zh"
                    ? "数量"
                    : language === "en"
                      ? "Qty"
                      : "အရေ"}
                </Text>
                <Text style={[styles.packingHdrText, styles.packingColMoney]}>
                  {language === "zh"
                    ? "单价"
                    : language === "en"
                      ? "Unit"
                      : "ဈေး"}
                </Text>
                <Text style={[styles.packingHdrText, styles.packingColMoney]}>
                  {language === "zh"
                    ? "小计"
                    : language === "en"
                      ? "Sub"
                      : "စုစုပေါင်း"}
                </Text>
              </View>
              {orderPacking.rows.map((row, idx) => (
                <View key={`${row.name}-${idx}`} style={styles.packingDataRow}>
                  <Text
                    style={[styles.packingCellName, { flex: 1, marginRight: 8 }]}
                    numberOfLines={3}
                  >
                    {row.name}
                  </Text>
                  <Text style={[styles.packingCell, styles.packingColQty]}>
                    {row.qty}
                  </Text>
                  <Text style={[styles.packingCell, styles.packingColMoney]}>
                    {row.unitPrice != null
                      ? Number(row.unitPrice).toLocaleString()
                      : "—"}
                  </Text>
                  <Text
                    style={[
                      styles.packingCell,
                      styles.packingColMoney,
                      { fontWeight: "800" },
                    ]}
                  >
                    {row.lineTotal != null
                      ? Number(row.lineTotal).toLocaleString()
                      : "—"}
                  </Text>
                </View>
              ))}
              {orderPacking.summaryTotal != null ? (
                <View style={styles.packingSummaryBar}>
                  <Text style={styles.packingSummaryLabel}>
                    {language === "zh"
                      ? "商品合计（MMK）"
                      : language === "en"
                        ? "Items total (MMK)"
                        : "ပစ္စည်းစုစုပေါင်း"}
                  </Text>
                  <Text style={styles.packingSummaryValue}>
                    {orderPacking.summaryTotal.toLocaleString()}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          {orderPacking?.customerNote ? (
            <View style={styles.packingCustomerNote}>
              <Text style={styles.packingCustomerNoteTitle}>
                {language === "zh"
                  ? "客户备注"
                  : language === "en"
                    ? "Customer note"
                    : "ဖောက်သည်မှတ်ချက်"}
              </Text>
              <Text style={styles.packingCustomerNoteBody}>
                {orderPacking.customerNote}
              </Text>
            </View>
          ) : null}

          <View style={styles.glassDivider} />
          <Text style={styles.sectionTitle}>👥 {language === 'zh' ? '联系人' : 'Contacts'}</Text>
          {isNavigateMerchantFirstPhase(statusNorm) &&
          (pkg.sender_name || pkg.sender_address) ? (
            <View style={[styles.contactItem, styles.pickupHighlightCard]}>
              <Text style={styles.contactRole}>
                {language === 'zh'
                  ? '商家 · 取件/收款'
                  : language === 'en'
                    ? 'Merchant · Pickup / COD'
                    : 'ဆိုင် · ကောက်ယူ/ငွေကောက်ခံ'}
              </Text>
              {statusNorm === '待收款' ? (
                <Text style={styles.pickupCodHint}>
                  {language === 'zh'
                    ? '待收款单请先到商家处收款并完成取货。'
                    : language === 'en'
                      ? 'For COD: go to the merchant first to collect payment and pick up.'
                      : 'ငွေကောက်ခံအမှာစာဖြစ်ပါက ဆိုင်သို့ ဦးစွာသွားပါ။'}
                </Text>
              ) : null}
              <View style={styles.contactInfo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>
                    {pkg.sender_name || '—'}
                  </Text>
                  {pkg.sender_phone ? (
                    <Text style={styles.contactPhone}>{pkg.sender_phone}</Text>
                  ) : null}
                  <Text style={[styles.addressText, { marginTop: 8 }]}>
                    {pkg.sender_address || '—'}
                  </Text>
                </View>
                {pkg.sender_phone ? (
                  <TouchableOpacity
                    style={styles.miniCallBtn}
                    onPress={() => handleCall(pkg.sender_phone)}
                  >
                    <Ionicons name="call" size={18} color="white" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.pickupNavBtn}
                onPress={() =>
                  openMapsToAddress(
                    pkg.sender_address,
                    pkg.sender_latitude,
                    pkg.sender_longitude,
                  )
                }
              >
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  style={styles.pickupNavBtnGradient}
                >
                  <Ionicons name="navigate" size={18} color="white" />
                  <Text style={styles.pickupNavBtnText}>
                    {language === 'zh'
                      ? '导航到商家'
                      : language === 'en'
                        ? 'Navigate to merchant'
                        : 'ဆိုင်သို့လမ်းညွှန်'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={styles.contactItem}>
            <Text style={styles.contactRole}>{language === 'zh' ? '收件人' : 'Receiver'}</Text>
            {isNavigateMerchantFirstPhase(statusNorm) ? (
              <Text style={styles.receiverAfterPickupHint}>
                {language === 'zh'
                  ? '取件完成后前往以下地址配送'
                  : language === 'en'
                    ? 'After pickup, deliver to:'
                    : 'ကောက်ယူပြီးနောက် ပို့ရမည့်လိပ်စာ'}
              </Text>
            ) : null}
            <View style={styles.contactInfo}>
              <View>
                <Text style={styles.contactName}>{pkg.receiver_name}</Text>
                <Text style={styles.contactPhone}>{pkg.receiver_phone}</Text>
          </View>
              <TouchableOpacity style={styles.miniCallBtn} onPress={() => handleCall(pkg.receiver_phone)}>
                <Ionicons name="call" size={18} color="white" />
              </TouchableOpacity>
          </View>
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactRole}>{language === 'zh' ? '收件地址' : 'Address'}</Text>
            <Text style={styles.addressText}>{pkg.receiver_address}</Text>
            <TouchableOpacity
              style={[styles.pickupNavBtn, { marginTop: 12 }]}
              onPress={() =>
                openMapsToAddress(
                  pkg.receiver_address,
                  pkg.receiver_latitude,
                  pkg.receiver_longitude,
                )
              }
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.pickupNavBtnGradient}
              >
                <Ionicons name="navigate" size={18} color="white" />
                <Text style={styles.pickupNavBtnText}>
                  {language === 'zh'
                    ? '导航到客户'
                    : language === 'en'
                      ? 'Navigate to customer'
                      : 'ဖောက်သည်ထံလမ်းညွှန်'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* 🚀 新增：聊天入口按钮 */}
          <TouchableOpacity 
            style={[styles.chatEntryBtn, { marginTop: 20 }]} 
            onPress={() => {
              setShowChatModal(true);
              loadChatMessages();
              chatService.markAsRead(pkg.id, courierId || '');
              setUnreadCount(0);
            }}
          >
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.chatEntryGradient}>
              <Ionicons name="chatbubble-ellipses" size={22} color="white" />
              <Text style={styles.chatEntryText}>
                {language === 'zh' ? '在线联系客户' : 'Chat with Customer'}
              </Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAddressModal(true)}>
            <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.btnGradient}>
              <Ionicons name="location" size={24} color="#3b82f6" />
              <Text style={styles.btnText}>{language === 'zh' ? '查看地图' : 'Map'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowCameraModal(true)}>
            <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.btnGradient}>
              <Ionicons 
                name={isPickupFlowStatus(statusNorm) ? "archive" : "checkmark-circle"} 
                size={24} 
                color="#10b981" 
              />
              <Text style={styles.btnText}>
                {isPickupFlowStatus(statusNorm)
                  ? (language === 'zh' ? '立即取件' : 'Pickup') 
                  : (language === 'zh' ? '完成配送' : 'Complete')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 地址模态框：取件阶段区分商家与客户导航 */}
      <Modal visible={showAddressModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📍{" "}
                {isNavigateMerchantFirstPhase(statusNorm)
                  ? language === "zh"
                    ? "取件与导航"
                    : language === "en"
                      ? "Pickup & navigate"
                      : "ကောက်ယူရန်နှင့်လမ်းညွှန်"
                  : language === "zh"
                    ? "位置与导航"
                    : language === "en"
                      ? "Location"
                      : "တည်နေရာနှင့်လမ်းညွှန်"}
              </Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {isNavigateMerchantFirstPhase(statusNorm) &&
              (pkg.sender_address || pkg.sender_name) ? (
                <View style={[styles.glassInfoCard, { marginBottom: 16 }]}>
                  <Text style={[styles.infoLabel, { color: "#fbbf24" }]}>
                    🏪{" "}
                    {language === "zh"
                      ? "商家 / 取件点"
                      : language === "en"
                        ? "Merchant / Pickup"
                        : "ဆိုင် / ကောက်ယူရာ"}
                  </Text>
                  {statusNorm === "待收款" ? (
                    <Text style={styles.pickupCodHint}>
                      {language === "zh"
                        ? "待收款：请先到商家处收款并取货。"
                        : language === "en"
                          ? "COD: collect payment at merchant before pickup."
                          : "ငွေကောက်ခံရမည့်အမှာစာဖြစ်ပါက ဆိုင်တွင်ငွေကောက်ယူပါ။"}
                    </Text>
                  ) : null}
                  <Text style={styles.infoValueText}>
                    {pkg.sender_name ? `${pkg.sender_name}\n` : ""}
                    {pkg.sender_address || "—"}
                  </Text>
                  <TouchableOpacity
                    style={styles.bigNavBtn}
                    onPress={() =>
                      openMapsToAddress(
                        pkg.sender_address,
                        pkg.sender_latitude,
                        pkg.sender_longitude,
                      )
                    }
                  >
                    <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.bigBtnGradient}>
                      <Ionicons name="navigate" size={20} color="white" />
                      <Text style={styles.bigBtnText}>
                        {language === "zh"
                          ? "导航到商家"
                          : language === "en"
                            ? "To merchant"
                            : "ဆိုင်သို့"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.glassInfoCard}>
                <Text style={styles.infoLabel}>
                  {isNavigateMerchantFirstPhase(statusNorm)
                    ? language === "zh"
                      ? "客户 · 送达地址（取件后）"
                      : language === "en"
                        ? "Customer · After pickup"
                        : "ဖောက်သည် · ကောက်ယူပြီးနောက်"
                    : language === "zh"
                      ? "收件地址"
                      : language === "en"
                        ? "Delivery address"
                        : "လက်ခံလိပ်စာ"}
                </Text>
                <Text style={styles.infoValueText}>{pkg.receiver_address}</Text>
                <TouchableOpacity
                  style={styles.bigNavBtn}
                  onPress={() =>
                    openMapsToAddress(
                      pkg.receiver_address,
                      pkg.receiver_latitude,
                      pkg.receiver_longitude,
                    )
                  }
                >
                  <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.bigBtnGradient}>
                    <Ionicons name="navigate" size={20} color="white" />
                    <Text style={styles.bigBtnText}>
                      {language === "zh"
                        ? "导航到客户"
                        : language === "en"
                          ? "To customer"
                          : "ဖောက်သည်ထံ"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {!isNavigateMerchantFirstPhase(statusNorm) &&
              (pkg.sender_address || pkg.sender_name) ? (
                <View style={[styles.glassInfoCard, { marginTop: 16 }]}>
                  <Text style={styles.infoLabel}>
                    {language === "zh"
                      ? "寄件 / 商家（参考）"
                      : language === "en"
                        ? "Sender (reference)"
                        : "ပေးပို့သူ"}
                  </Text>
                  <Text style={[styles.infoValueText, { fontSize: 14 }]}>
                    {pkg.sender_address || "—"}
                  </Text>
                  <TouchableOpacity
                    style={styles.bigNavBtn}
                    onPress={() =>
                      openMapsToAddress(
                        pkg.sender_address,
                        pkg.sender_latitude,
                        pkg.sender_longitude,
                      )
                    }
                  >
                    <LinearGradient
                      colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.06)"]}
                      style={styles.bigBtnGradient}
                    >
                      <Ionicons name="storefront" size={20} color="#94a3b8" />
                      <Text style={[styles.bigBtnText, { color: "#e2e8f0" }]}>
                        {language === "zh"
                          ? "导航到商家"
                          : language === "en"
                            ? "To merchant"
                            : "ဆိုင်သို့"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 选择操作模态框 */}
      <Modal visible={showCameraModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📷 {language === 'zh' ? '选择配送证明' : 'Delivery Proof'}</Text>
              <TouchableOpacity onPress={() => setShowCameraModal(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
            </View>
            <View style={[styles.modalBody, { flexDirection: 'row', gap: 12, flexWrap: 'wrap' }]}>
              {isPickupFlowStatus(statusNorm) ? (
                <>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={() => { setShowCameraModal(false); setShowScanModal(true); }}>
                    <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.gridBtnGradient}>
                      <Ionicons name="qr-code" size={28} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '扫码取件' : 'Scan'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={handleManualPickup}>
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.gridBtnGradient}>
                      <Ionicons name="hand-right" size={28} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '手动取件' : 'Manual'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={() => { setShowCameraModal(false); setShowAnomalyModal(true); }}>
                    <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.gridBtnGradient}>
                      <Ionicons name="warning" size={28} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '异常上报' : 'Anomaly'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={handleOpenCamera}>
                    <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.gridBtnGradient}>
                      <Ionicons name="camera" size={28} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '拍照送达' : 'Photo'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={() => { setShowCameraModal(false); setShowScanModal(true); }}>
                    <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.gridBtnGradient}>
                      <Ionicons name="qr-code" size={28} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '扫码送达' : 'Scan'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={() => { setShowCameraModal(false); setShowAnomalyModal(true); }}>
                    <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.gridBtnGradient}>
                      <Ionicons name="warning" size={28} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '异常上报' : 'Anomaly'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 扫码相机 */}
      <Modal visible={showScanModal} transparent animationType="slide">
        <View style={styles.scanOverlay}>
          {isFocused ? (
            <CameraView style={StyleSheet.absoluteFill} facing="back" onBarcodeScanned={({ data }) => handleScanCode(data)} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.cameraPaused]}>
              <Text style={styles.cameraPausedText}>
                {language === 'zh' ? '相机已暂停以节省电量' : language === 'en' ? 'Camera paused to save battery' : 'ကင်မရာကို ဘက်ထရီချွေတာရန် ခန့်ထားထားသည်'}
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setShowScanModal(false)} style={styles.scanCloseBtn}><Ionicons name="close" size={32} color="white" /></TouchableOpacity>
        </View>
      </Modal>

      {/* 照片预览 */}
      <Modal visible={showPhotoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📸 {language === 'zh' ? '确认配送' : 'Confirm Delivery'}</Text>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.photoPreviewWrapper}>
              {capturedPhoto ? (
                  <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} />
                ) : (
                  <View style={[styles.photoPreview, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }]}>
                    <ActivityIndicator color="#3b82f6" />
                  </View>
                )}
                <View style={styles.photoBadge}>
                  <Text style={styles.photoBadgeText}>
                    {language === 'zh' ? '待上传证明' : 'Proof to Upload'}
                  </Text>
                </View>
              </View>
                  
              <View style={styles.photoActionRow}>
                    <TouchableOpacity 
                      onPress={() => {
                        setShowPhotoModal(false);
                    setCapturedPhoto(null);
                      }}
                  style={styles.retakeButtonFixed}
                    >
                  <Ionicons name="refresh" size={18} color="#64748b" />
                  <Text style={styles.retakeButtonTextFixed}>
                    {language === 'zh' ? '重新拍摄' : 'Retake'}
                  </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={handleUploadPhoto}
                  style={[styles.uploadButtonFixed, uploading && styles.disabledBtn]}
                  disabled={uploading}
                >
                  <LinearGradient
                    colors={uploading ? ['#9ca3af', '#6b7280'] : ['#10b981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.uploadButtonGradientFixed}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    )}
                    <Text style={styles.uploadButtonTextFixed}>
                      {uploading 
                        ? (language === 'zh' ? '正在上传...' : 'Uploading...') 
                        : (language === 'zh' ? '确认送达' : 'Confirm')}
                  </Text>
                  </LinearGradient>
                  </TouchableOpacity>
            </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🚀 异常上报模态框 */}
      <Modal visible={showAnomalyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={[styles.modalHeader, { borderBottomColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <Text style={[styles.modalTitle, { color: '#ef4444' }]}>⚠️ {language === 'zh' ? '异常场景申报' : 'Anomaly Report'}</Text>
              <TouchableOpacity onPress={() => setShowAnomalyModal(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* 引导语 */}
              <View style={[styles.glassInfoCard, { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Text style={{ color: '#fca5a5', fontSize: 13, lineHeight: 20, fontWeight: '600' }}>
                  {language === 'zh' 
                    ? '💡 遇到问题请先报备，平台将核实免责。严禁在未送达的情况下直接点击“确认送达”，虚假点击将面临平台重罚！' 
                    : '💡 Please report issues first. The platform will verify and exempt liability. Do not mark as "Delivered" without actual delivery; false clicks result in heavy penalties!'}
                </Text>
              </View>

              {/* 异常类型选择 */}
              <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>🚩 {language === 'zh' ? '选择异常类型' : 'Anomaly Type'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {['联系不上收件人', '地址错误/无法送达', '收件人拒绝签收', '包裹损坏', '其他异常'].map((type) => (
                  <TouchableOpacity 
                    key={type}
                    onPress={() => setAnomalyType(type)}
                    style={[
                      styles.typeTag,
                      anomalyType === type && styles.typeTagActive
                    ]}
                  >
                    <Text style={[styles.typeTagText, anomalyType === type && styles.typeTagTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 详细说明 */}
              <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>📝 {language === 'zh' ? '详细说明' : 'Description'}</Text>
              <TextInput
                style={styles.anomalyInput}
                placeholder={language === 'zh' ? '请描述具体情况，如：拨打收件人电话3次未接通...' : 'Describe the situation...'}
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                numberOfLines={4}
                value={anomalyDescription}
                onChangeText={setAnomalyDescription}
              />

              <TouchableOpacity 
                style={[styles.submitReportBtn, (reporting || !anomalyType || !anomalyDescription) && styles.disabledBtn]} 
                onPress={handleReportAnomaly}
                disabled={reporting || !anomalyType || !anomalyDescription}
              >
                <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.bigBtnGradient}>
                  {reporting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="white" />
                      <Text style={styles.bigBtnText}>{language === 'zh' ? '提交报备' : 'Submit Report'}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🚀 新增：聊天模态框 (In-App Chat) */}
      <Modal
        visible={showChatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.glassModal, { height: '85%', padding: 0 }]}>
            {/* 聊天页眉 */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.1)',
              backgroundColor: '#1e293b'
            }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>
                  {language === 'zh' ? '联系客户' : 'Chat with Customer'}
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{pkg?.receiver_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowChatModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* 消息列表 */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={{ flex: 1, padding: 16, backgroundColor: '#0f172a' }}
              contentContainerStyle={{ paddingBottom: 20 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => {
                const isMine = item.sender_id === courierId;
                return (
                  <View style={{
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    marginBottom: 12,
                  }}>
                    <View style={{
                      backgroundColor: isMine ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                      padding: 12,
                      borderRadius: 16,
                      borderBottomRightRadius: isMine ? 4 : 16,
                      borderBottomLeftRadius: isMine ? 16 : 4,
                    }}>
                      <Text style={{ 
                        color: '#fff',
                        fontSize: 15,
                        lineHeight: 24, // 🚀 增加行高，适配缅语字体
                        paddingVertical: 2, // 🚀 增加垂直边距，防止上下切断
                      }}>
                        {item.message}
                      </Text>
                    </View>
                    <Text style={{ 
                      fontSize: 10, 
                      color: 'rgba(255,255,255,0.4)', 
                      marginTop: 4,
                      textAlign: isMine ? 'right' : 'left'
                    }}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              }}
            />

            {/* 🚀 快捷回复区域 */}
            <View style={{ backgroundColor: '#0f172a', paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                {QUICK_REPLIES.map((reply, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    onPress={() => handleQuickReply(reply[language as keyof typeof reply] || reply.zh)}
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    <Text style={{ color: '#60a5fa', fontSize: 13, fontWeight: '600' }}>
                      {reply[language as keyof typeof reply] || reply.zh}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 输入区域 */}
            <View style={{ 
              padding: 16, 
              paddingBottom: Platform.OS === 'ios' ? 34 : 16,
              backgroundColor: '#1e293b',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.1)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12
            }}>
              <TextInput
                style={{ 
                  flex: 1, 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  borderRadius: 20, 
                  paddingHorizontal: 16, 
                  paddingVertical: 10,
                  maxHeight: 100,
                  color: '#fff'
                }}
                placeholder={language === 'zh' ? '输入消息...' : 'Type a message...'}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity 
                disabled={!inputText.trim() || sendingMessage}
                onPress={handleSendMessage}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: inputText.trim() ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
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
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  content: { flex: 1, paddingHorizontal: 20 },
  statusSection: { alignItems: 'center', marginVertical: 24 },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginBottom: 12 },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  packageId: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  glassCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  sectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  infoLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '800' },
  glassDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 24 },
  packingTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  packingHdrText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  packingColQty: { width: 36, textAlign: 'right' },
  packingColMoney: { width: 72, textAlign: 'right' },
  packingDataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  packingCellName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  packingCell: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  packingSummaryBar: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  packingSummaryLabel: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '800',
  },
  packingSummaryValue: {
    color: '#34d399',
    fontSize: 17,
    fontWeight: '900',
  },
  packingCustomerNote: {
    marginTop: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  packingCustomerNoteTitle: {
    color: '#fcd34d',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  packingCustomerNoteBody: {
    color: '#fde68a',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  contactItem: { marginBottom: 20 },
  contactRole: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', marginBottom: 8 },
  contactInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contactName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  contactPhone: { color: '#3b82f6', fontSize: 14, fontWeight: '700', marginTop: 2 },
  miniCallBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  addressText: { color: '#fff', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  pickupHighlightCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  pickupCodHint: {
    color: '#fcd34d',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 10,
    marginTop: 4,
  },
  receiverAfterPickupHint: {
    color: 'rgba(148, 163, 184, 0.95)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },
  pickupNavBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  pickupNavBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pickupNavBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  actionGrid: { flexDirection: 'row', gap: 16, marginTop: 24 },
  actionBtn: { flex: 1, height: 80, borderRadius: 20, overflow: 'hidden' },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  glassModal: { width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.98)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  modalHeader: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 24 },
  glassInfoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoValueText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 24, marginTop: 8 },
  bigNavBtn: { height: 56, borderRadius: 16, overflow: 'hidden' },
  bigBtnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  bigBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  gridActionBtn: { flex: 1, height: 100, borderRadius: 20, overflow: 'hidden' },
  gridBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gridBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 10 },
  scanOverlay: { flex: 1, backgroundColor: '#000' },
  cameraPaused: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  cameraPausedText: {
    color: '#e2e8f0',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  scanCloseBtn: { position: 'absolute', top: 60, right: 30, zIndex: 10 },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPreviewWrapper: {
    width: '100%',
    aspectRatio: 4/3,
    borderRadius: 24,
    marginBottom: 24,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  photoBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  photoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  retakeButtonFixed: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  retakeButtonTextFixed: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
  uploadButtonFixed: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  uploadButtonGradientFixed: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  uploadButtonTextFixed: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  disabledBtn: { opacity: 0.5 },
  typeTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeTagActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ef4444',
  },
  typeTagText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  typeTagTextActive: {
    color: '#ef4444',
  },
  anomalyInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  submitReportBtn: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  // 🚀 聊天入口样式
  chatEntryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chatEntryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  chatEntryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: 10,
    right: 20,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
