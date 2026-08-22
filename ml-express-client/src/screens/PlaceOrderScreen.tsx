import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { baseStyles, wizardStyles } from '../components/placeOrder/placeOrderStyles';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Keyboard,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { useCart, summarizeCustomerRemarks, getCartItemLineKey, CartItem } from '../contexts/CartContext';
import { packageService, systemSettingsService, supabase, Product } from '../services/supabase';
import { databaseService } from '../services/DatabaseService';
import { usePlaceAutocomplete } from '../hooks/usePlaceAutocomplete';
import { FadeInView } from '../components/Animations';
import { MoneyIcon } from '../components/Icon';
import { useLanguageStyles } from '../hooks/useLanguageStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorService } from '../services/ErrorService';
import { feedbackService } from '../services/FeedbackService';
import { analytics } from '../services/AnalyticsService';
import { common } from '../i18n';
import { getPlaceOrderCopy } from './placeOrder/placeOrderCopy';
import LoggerService from '../services/LoggerService';
// 导入拆分后的组件
import SenderForm from '../components/placeOrder/SenderForm';
import ReceiverForm from '../components/placeOrder/ReceiverForm';
import PackageInfo from '../components/placeOrder/PackageInfo';
import DeliveryOptions from '../components/placeOrder/DeliveryOptions';
import PriceCalculation from '../components/placeOrder/PriceCalculation';
import MapModal from '../components/placeOrder/MapModal';
import OrderWizardProgress, { OrderWizardStepIndex } from '../components/placeOrder/OrderWizardProgress';
import OrderQrModal from '../components/placeOrder/OrderQrModal';
import ScheduledTimePickerModal from '../components/placeOrder/ScheduledTimePickerModal';
import PackageTypeInfoModal from '../components/placeOrder/PackageTypeInfoModal';
import { promptGuestLogin } from '../utils/guestSession';

const TEAL = '#2C98A6';

import Toast from '../components/Toast';

const WIZARD_LAST_STEP: OrderWizardStepIndex = 3;

export default function PlaceOrderScreen({ navigation, route }: any) {
  const { language } = useApp();
  const c = common(language);
  const insets = useSafeAreaInsets();
  const { showLoading, hideLoading } = useLoading();
  const { clearCart } = useCart();
  const styles = useLanguageStyles(baseStyles);
  
  const submitGuardRef = useRef(0);
  const orderDraftRef = useRef<{
    orderId: string;
    signature: string;
    createdAt: number;
    deducted: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardStep, setWizardStep] = useState<OrderWizardStepIndex>(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // 处理从其他页面（如商品详情/购物车）传来的预选商品
  useEffect(() => {
    const handleIncomingProducts = async () => {
      if (route.params?.selectedProducts) {
        const incomingProducts = route.params.selectedProducts;
        const productMap: Record<string, number> = {};
        
        // 1. 先把购物车商品加入到列表中，这样后续逻辑能找到它们
        // 过滤掉已经在列表中的商品，避免重复
        setMerchantProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = incomingProducts.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });

        // 2. 设置选中状态
        incomingProducts.forEach((p: CartItem) => {
          productMap[getCartItemLineKey(p)] = p.quantity;
        });
        setSelectedProducts(productMap);
        
        // 3. 开启代收
        setHasCOD(true);
        
        // 4. 自动填充店铺信息 (如果是从某个店铺直接购买)
        if (incomingProducts.length > 0 && incomingProducts[0].store_id) {
          try {
            const storeId = incomingProducts[0].store_id;
            const { data: store, error } = await supabase
              .from('delivery_stores')
              .select('*')
              .eq('id', storeId)
              .single();
            
            if (store && !error) {
              setSenderName(store.store_name);
              setSenderPhone(store.phone || store.manager_phone);
              setSenderAddress(store.address);
              setSenderCoordinates({
                lat: store.latitude,
                lng: store.longitude
              });
            }
          } catch (err) {
            LoggerService.error('自动填充店铺信息失败:', err);
          }
        }

        // 延迟一下调用，确保 merchantProducts 已更新（或者直接传入商品列表）
        setTimeout(() => {
          updateCODAndDescription(productMap, incomingProducts);
        }, 100);
      }
    };

    handleIncomingProducts();
  }, [route.params?.selectedProducts]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userStr = await AsyncStorage.getItem('currentUser');
        const guestMode = await AsyncStorage.getItem('isGuest');
        
        if (guestMode === 'true' || !userStr) {
          setIsGuest(true);
          return;
        }

        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          setUserId(user.id);
          setUserName(user.name);
          setUserPhone(user.phone);
          setIsGuest(false);
          
          // 从数据库获取最新余额
          const { data, error } = await supabase
            .from('users')
            .select('balance')
            .eq('id', user.id)
            .single();
          
          if (data && !error) {
            const currentBalance = data.balance || 0;
            setAccountBalance(currentBalance);
            // 🚀 如果余额为 0，强制切换为现金支付跑腿费
            if (currentBalance === 0) {
              setPaymentMethod('cash');
            }
          } else {
            const currentBalance = user.balance || 0;
            setAccountBalance(currentBalance);
            if (currentBalance === 0) {
              setPaymentMethod('cash');
            }
          }
        }
      } catch (error) {
        LoggerService.error('加载用户信息失败:', error);
      }
    };
    loadUserInfo();
  }, []);

  useEffect(() => {
    analytics.trackPageView('PlaceOrderScreen');
  }, []);
  
  // 用户信息
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRegion, setCurrentRegion] = useState<string>(''); // 当前订单所属区域
  
  // 寄件人信息
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [useMyInfo, setUseMyInfo] = useState(true);
  
  // 收件人信息
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  
  // 包裹信息
  const [packageType, setPackageType] = useState('文件');
  const [weight, setWeight] = useState('');
  const [codAmount, setCodAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);
  
  // 配送选项
  const [deliverySpeed, setDeliverySpeed] = useState('准时达');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // 价格
  const [price, setPrice] = useState('0');
  const [distance, setDistance] = useState(0);
  const [isCalculated, setIsCalculated] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState('0');
  const [calculatedDistance, setCalculatedDistance] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  
  // 地图相关
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapType, setMapType] = useState<'sender' | 'receiver'>('sender');
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 21.9588,
    longitude: 96.0891,
  });
  
  // 坐标状态 - 用于保存寄件人和收件人的精确坐标
  const [senderCoordinates, setSenderCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [receiverCoordinates, setReceiverCoordinates] = useState<{lat: number, lng: number} | null>(null);
  
  // 包裹类型说明
  const [showPackageTypeInfo, setShowPackageTypeInfo] = useState(false);
  const [selectedPackageTypeInfo, setSelectedPackageTypeInfo] = useState('');
  
  // 时间选择器
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  // 地图POI相关
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  // 表单验证状态
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((field: string, value: string) => {
    let error = '';
    switch (field) {
      case 'senderName':
      case 'receiverName':
        if (!value.trim()) error = '请输入姓名';
        break;
      case 'senderPhone':
      case 'receiverPhone':
        if (!value.trim()) error = '请输入电话';
        else if (!/^09\d{7,9}$/.test(value.trim())) error = '手机号格式错误 (09...)';
        break;
      case 'senderAddress':
      case 'receiverAddress':
        if (!value.trim()) error = '请输入地址';
        break;
    }
    return error;
  }, []);

  const handleFieldChange = useCallback((field: string, value: string) => {
    // 更新对应状态
    switch (field) {
      case 'senderName': setSenderName(value); break;
      case 'senderPhone': setSenderPhone(value); break;
      case 'senderAddress': setSenderAddress(value); break;
      case 'receiverName': setReceiverName(value); break;
      case 'receiverPhone': setReceiverPhone(value); break;
      case 'receiverAddress': setReceiverAddress(value); break;
    }

    // 实时验证（如果已触摸）
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    } else {
      // 清除之前的错误（如果有）
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  }, [touched, errors, validateField]);

  const handleFieldBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    let value = '';
    switch (field) {
      case 'senderName': value = senderName; break;
      case 'senderPhone': value = senderPhone; break;
      case 'senderAddress': value = senderAddress; break;
      case 'receiverName': value = receiverName; break;
      case 'receiverPhone': value = receiverPhone; break;
      case 'receiverAddress': value = receiverAddress; break;
    }
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  }, [senderName, senderPhone, senderAddress, receiverName, receiverPhone, receiverAddress, validateField]);

  const {
    mapAddressInput,
    setMapAddressInput,
    autocompleteSuggestions,
    showSuggestions,
    setShowSuggestions,
    isLoadingSuggestions,
    handleMapAddressInputChange,
    handleSelectSuggestion,
  } = usePlaceAutocomplete({
    language: language as 'zh' | 'en' | 'my',
    selectedLocation,
    onLocationChange: setSelectedLocation,
    onPlaceChange: setSelectedPlace,
  });
  
  // QR码模态框
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [qrOrderId, setQrOrderId] = useState('');
  const [qrOrderPrice, setQrOrderPrice] = useState('');
  const [qrMallSummary, setQrMallSummary] = useState<{
    productAmount: number;
    deliveryFee: number;
    coupon: number;
    paidAmount: number;
    remarks: string;
  } | null>(null);
  
  // 支付方式（默认现金，二维码开发中）
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'cash'>('cash');
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [isGuest, setIsGuest] = useState(false);
  
  // 购物车商品相关状态
  const [merchantProducts, setMerchantProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({}); // id -> quantity
  const [hasCOD, setHasCOD] = useState(true); // 新增：是否代收状态
  
  // 计费规则
  const [pricingSettings, setPricingSettings] = useState({
    base_fee: 1000,
    per_km_fee: 500,
    weight_surcharge: 150,
    urgent_surcharge: 1500,
    scheduled_surcharge: 500,
    oversize_surcharge: 300,
    fragile_surcharge: 400,
    food_beverage_surcharge: 300,
    free_km_threshold: 3,
  });

  const currentT = getPlaceOrderCopy(language);
  const wizardStepLabels: string[] =
    (currentT as { wizardSteps?: string[] }).wizardSteps ?? ['地址', '包裹', '配送', '确认'];

  // 生成可用时间段 (09:00 - 18:00, 30分钟间隔)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    slots.push('18:00');
    return slots;
  }, []);

  // 过滤出当前日期之后的时间
  const availableTimeSlots = useMemo(() => {
    if (selectedDate !== 'Today') return timeSlots;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    return timeSlots.filter(slot => {
      const [hour, minute] = slot.split(':').map(Number);
      // 🚀 逻辑优化：预留至少 60 分钟准备时间 (1小时)
      // 如果当前是 9:30，最早只能选 10:30
      const slotTotalMinutes = hour * 60 + minute;
      const nowTotalMinutes = currentHour * 60 + currentMinute;
      
      return slotTotalMinutes >= nowTotalMinutes + 60;
    });
  }, [selectedDate, timeSlots]);

  // 当可用时间段变化时，如果当前选择的时间已失效，自动重置
  useEffect(() => {
    if (showTimePicker && selectedDate === 'Today' && selectedTime) {
      if (!availableTimeSlots.includes(selectedTime)) {
        setSelectedTime('');
      }
    }
  }, [availableTimeSlots, showTimePicker, selectedDate, selectedTime]);

  // 初始化选择日期：逻辑优化，如果今日已截止自动选明天
  useEffect(() => {
    if (showTimePicker && !selectedDate) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // 如果当前时间 + 1小时 (60分钟) 已经超过了最晚营业时间 18:00
      if (currentHour * 60 + currentMinute + 60 > 18 * 60) {
        setSelectedDate('Tomorrow');
      } else {
        setSelectedDate('Today');
      }
    }
  }, [showTimePicker]);

  // 包裹类型选项（与Web端一致）- 使用 useMemo 优化
  const packageTypes = useMemo(() => {
    const types = [
      { value: '文件', label: currentT.packageTypes.document },
      { value: '标准件（45x60x15cm）和（5KG）以内', label: currentT.packageTypes.standard },
      { value: '超重件（5KG）以上', label: currentT.packageTypes.overweight },
      { value: '超规件（45x60x15cm）以上', label: currentT.packageTypes.oversized },
      { value: '易碎品', label: currentT.packageTypes.fragile },
      { value: '食品和饮料', label: currentT.packageTypes.foodDrinks },
    ];

    return types;
  }, [currentT.packageTypes]);

  // 配送速度选项（从计费规则获取）- 使用 useMemo 优化
  const deliverySpeeds = useMemo(() => [
    { value: '准时达', label: currentT.speedStandard, extra: 0 },
    { value: '急送达', label: currentT.speedExpress, extra: pricingSettings.urgent_surcharge },
    { value: '定时达', label: currentT.speedScheduled, extra: pricingSettings.scheduled_surcharge },
    { value: 'Eco Way', label: currentT.speedWaySide, extra: 0 },
  ], [currentT.speedStandard, currentT.speedExpress, currentT.speedScheduled, currentT.speedWaySide, pricingSettings.urgent_surcharge, pricingSettings.scheduled_surcharge]);

  const handleDeliverySpeedChange = useCallback((value: string) => {
    if (value === 'Eco Way') {
      setDeliverySpeed('Eco Way');
      setPackageType('顺路递');
      setShowWeightInput(false);
      setScheduledTime('');
    } else {
      setDeliverySpeed(value);
      if (packageType === '顺路递') {
        setPackageType('标准件（45x60x15cm）和（5KG）以内');
        setShowWeightInput(false);
      }
    }
  }, [packageType]);

  const persistOrderLocally = useCallback(
    async (payload: any, syncStatus: 'pending' | 'synced', errorMessage?: string) => {
      if (!payload) return;
      try {
        await databaseService.saveOrder(payload, { syncStatus, errorMessage });
      } catch (dbError) {
        errorService.handleError(dbError, { context: 'PlaceOrderScreen.persistOrderLocally', silent: true });
      }
    },
    []
  );

  const syncPendingOrders = useCallback(async () => {
    try {
      const pendingOrders = await databaseService.getPendingOrders();
      if (!pendingOrders.length) return;

      for (const record of pendingOrders) {
        try {
          const payload = JSON.parse(record.data);
          const result = await packageService.createPackage(payload);

          if (result?.success || result?.error?.code === '23505') {
            await databaseService.markOrderSynced(record.id);
          } else {
            errorService.handleError(result?.error, { context: 'PlaceOrderScreen.syncPendingOrders', silent: true });
          }
        } catch (syncError: any) {
          if (syncError?.code === '23505') {
            await databaseService.markOrderSynced(record.id);
          } else {
            errorService.handleError(syncError, { context: 'PlaceOrderScreen.syncPendingOrders', silent: true });
          }
        }
      }
    } catch (error) {
      errorService.handleError(error, { context: 'PlaceOrderScreen.syncPendingOrders', silent: true });
    }
  }, []);

  useEffect(() => {
    syncPendingOrders();
  }, [syncPendingOrders]);

  const showOfflineSavedAlert = () => {
    Alert.alert(
      currentT.orderSavedOfflineTitle,
      currentT.orderSavedOfflineDescription,
      [
        {
          text: currentT.orderSavedOfflineAction,
        },
      ]
    );
  };

  // 加载用户信息和计费规则
  useEffect(() => {
    loadUserInfo();
    loadPricingSettings();
  }, []);

  const loadUserInfo = async () => {
    try {
      const id = await AsyncStorage.getItem('userId');
      const name = await AsyncStorage.getItem('userName');
      const phone = await AsyncStorage.getItem('userPhone');
      const currentUserStr = await AsyncStorage.getItem('currentUser');
      
      if (currentUserStr) {
        try {
          const user = JSON.parse(currentUserStr);
          setCurrentUser(user);
        } catch (e) {
          LoggerService.error('解析用户信息失败:', e);
        }
      } else {
        // 如果没有 currentUser，尝试构造一个（虽然通常应该有）
        if (id) {
          // 尝试读取 userType
          const type = await AsyncStorage.getItem('userType');
          setCurrentUser({
            id,
            name: name || '',
            phone: phone || '',
            user_type: type || 'customer'
          });
        }
      }
      
      if (id) setUserId(id);
      if (name) {
        setUserName(name);
        if (useMyInfo) setSenderName(name);
        
        // 🚀 新增：如果是会员账号且来自购物车/店铺，自动填写收件人信息
        if (route.params?.selectedProducts && (currentUser?.user_type === 'customer' || currentUser?.user_type === 'member' || !currentUser?.user_type)) {
          setReceiverName(name);
        }
      }
      if (phone) {
        setUserPhone(phone);
        if (useMyInfo) setSenderPhone(phone);
        
        // 🚀 新增：自动填写收件人电话
        if (route.params?.selectedProducts && (currentUser?.user_type === 'customer' || currentUser?.user_type === 'member' || !currentUser?.user_type)) {
          setReceiverPhone(phone);
        }
      }
    } catch (error) {
      errorService.handleError(error, { context: 'PlaceOrderScreen.loadUserInfo', silent: true });
    }
  };

  const loadPricingSettings = async (region?: string) => {
    try {
      const settings = await systemSettingsService.getPricingSettings(region);
      setPricingSettings(settings);
      LoggerService.debug(`✅ 已加载${region ? region : '全局'}计费规则`);
    } catch (error) {
      errorService.handleError(error, { context: 'PlaceOrderScreen.loadPricingSettings' });
    }
  };

  // 每次进入「立即下单」页重新拉取计费，与 Admin 最新设置一致
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const settings = await systemSettingsService.getPricingSettings(currentRegion || undefined);
          if (!cancelled) setPricingSettings(settings);
        } catch (error) {
          errorService.handleError(error, { context: 'PlaceOrderScreen.useFocusEffect pricing', silent: true });
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [currentRegion])
  );

  // 根据寄件地址检测领区并加载对应计费规则
  useEffect(() => {
    const detectAndLoadPricing = async () => {
      if (!senderAddress) {
        if (currentRegion !== '') {
          setCurrentRegion('');
          loadPricingSettings();
        }
        return;
      }

      // 领区映射逻辑（与ID生成一致）
      const regionMap: { [key: string]: string } = {
        '曼德勒': 'mandalay', 'Mandalay': 'mandalay', 'မန္တလေး': 'mandalay',
        '彬乌伦': 'maymyo', 'Pyin Oo Lwin': 'maymyo', 'ပင်းတလဲ': 'maymyo',
        '仰光': 'yangon', 'Yangon': 'yangon', 'ရန်ကုန်': 'yangon',
        '内比都': 'naypyidaw', 'NPW': 'naypyidaw', 'နေပြည်တော်': 'naypyidaw',
        '东枝': 'taunggyi', 'TGI': 'taunggyi', 'တောင်ကြီး': 'taunggyi',
        '腊戌': 'lashio', 'Lashio': 'lashio', 'လားရှိုး': 'lashio',
        '木姐': 'muse', 'Muse': 'muse', 'မူဆယ်': 'muse'
      };

      let detectedRegion = '';
      for (const [city, regionId] of Object.entries(regionMap)) {
        if (senderAddress.includes(city)) {
          detectedRegion = regionId;
          break;
        }
      }

      if (detectedRegion !== currentRegion) {
        setCurrentRegion(detectedRegion);
        loadPricingSettings(detectedRegion);
      }
    };

    detectAndLoadPricing();
  }, [senderAddress]);

  // 切换使用我的信息
  useEffect(() => {
    if (useMyInfo) {
      setSenderName(userName);
      setSenderPhone(userPhone);
    } else {
      setSenderName('');
      setSenderPhone('');
    }
  }, [useMyInfo, userName, userPhone]);

  // 计算价格
  // 使用当前位置（在地图Modal中）- 优化：使用缓存和超时
  const useCurrentLocationInMap = async () => {
    try {
      showLoading('获取位置中...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        hideLoading();
        Alert.alert('提示', '需要位置权限才能使用此功能');
        return;
      }

      // 设置超时和优化选项
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // 使用平衡精度，更快
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('获取位置超时')), 5000) // 5秒超时
      );
      
      const location = await Promise.race([locationPromise, timeoutPromise]) as any;
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      hideLoading();
    } catch (error) {
      hideLoading();
      errorService.handleError(error, { context: 'PlaceOrderScreen.handleUseCurrentLocation' });
    }
  };

  // 使用当前位置（在表单中）
  const useCurrentLocation = async () => {
    try {
      showLoading('获取位置中...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        hideLoading();
        Alert.alert('提示', '需要位置权限才能使用此功能');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address && address[0]) {
        const addr = address[0];
        const fullAddress = `${addr.street || ''} ${addr.district || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
        const finalAddress = fullAddress || `${location.coords.latitude}, ${location.coords.longitude}`;
        
        // 将地址和坐标一起添加到输入框
        const coords = {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        };
        const addressWithCoords = `${finalAddress}\n📍 ${currentT.coordinates}: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        setSenderAddress(addressWithCoords);
        setSenderCoordinates(coords);
        LoggerService.debug('✅ 当前位置坐标已保存:', coords);
      }
      
      hideLoading();
    } catch (error) {
      hideLoading();
      errorService.handleError(error, { context: 'PlaceOrderScreen.handleGetCurrentLocation' });
    }
  };

  // 打开地图选择器 - 优化：先打开地图，异步获取位置
  const openMapSelector = useCallback(async (type: 'sender' | 'receiver') => {
    try {
      setMapType(type);
      
      // 如果已有地址，填充到输入框
      if (type === 'sender' && senderAddress) {
        const addressLines = senderAddress.split('\n');
        const addressWithoutCoords = addressLines.filter(line => !line.includes('📍')).join('\n');
        setMapAddressInput(addressWithoutCoords);
        // 如果已有坐标，使用已有坐标
        if (senderCoordinates && senderCoordinates.lat && senderCoordinates.lng) {
          setSelectedLocation({
            latitude: senderCoordinates.lat,
            longitude: senderCoordinates.lng,
          });
          setShowMapModal(true);
          return; // 直接使用已有坐标，不需要获取当前位置
        }
      } else if (type === 'receiver' && receiverAddress) {
        const addressLines = receiverAddress.split('\n');
        const addressWithoutCoords = addressLines.filter(line => !line.includes('📍')).join('\n');
        setMapAddressInput(addressWithoutCoords);
        // 如果已有坐标，使用已有坐标
        if (receiverCoordinates && receiverCoordinates.lat && receiverCoordinates.lng) {
          setSelectedLocation({
            latitude: receiverCoordinates.lat,
            longitude: receiverCoordinates.lng,
          });
          setShowMapModal(true);
          return; // 直接使用已有坐标，不需要获取当前位置
        }
      } else {
        setMapAddressInput('');
      }
      
      // 默认位置：曼德勒（缅甸主要城市）
      const defaultLocation = {
        latitude: 21.9588,
        longitude: 96.0891,
      };
      
      // 先使用默认位置打开地图（立即响应）
      setSelectedLocation(defaultLocation);
      setShowMapModal(true);
      
      // 异步获取当前位置（不阻塞UI）
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            LoggerService.debug('位置权限未授予，使用默认位置');
            return;
          }

          // 设置超时，避免等待太久
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced, // 使用平衡精度，更快
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('获取位置超时')), 3000) // 3秒超时
          );
          
          const location = await Promise.race([locationPromise, timeoutPromise]) as any;
          const currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          // 更新地图位置（如果获取成功）
          setSelectedLocation(currentLocation);
        } catch (error) {
          LoggerService.debug('获取当前位置失败，使用默认位置:', error);
          // 使用默认位置，不显示错误提示
        }
      })();
    } catch (error) {
      errorService.handleError(error, { context: 'PlaceOrderScreen.handleOpenMap', silent: true });
      // 即使出错也打开地图，使用默认位置
      setShowMapModal(true);
    }
  }, [senderAddress, receiverAddress, senderCoordinates, receiverCoordinates]);

  // 确认地图位置
  const confirmMapLocation = useCallback(async () => {
    try {
      showLoading('获取地址中...');
      
      // 优先使用输入框中的地址
      let finalAddress = mapAddressInput.trim();
      
      // 如果没有输入地址，则使用反向地理编码
      if (!finalAddress) {
        const address = await Location.reverseGeocodeAsync({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        });

        if (address && address[0]) {
          const addr = address[0];
          finalAddress = `${addr.street || ''} ${addr.district || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
        }
      }
      
      // 如果还是没有地址，使用坐标
      if (!finalAddress) {
        finalAddress = `${selectedLocation.latitude}, ${selectedLocation.longitude}`;
      }
      
      // 保存坐标和地址
      const coords = {
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude
      };
      
      if (mapType === 'sender') {
        // 将地址和坐标一起添加到输入框
        const addressWithCoords = `${finalAddress}\n📍 ${currentT.coordinates}: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        setSenderAddress(addressWithCoords);
        setSenderCoordinates(coords);
        LoggerService.debug('✅ 寄件地址坐标已保存:', coords);
      } else {
        // 将地址和坐标一起添加到输入框
        const addressWithCoords = `${finalAddress}\n📍 ${currentT.coordinates}: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        setReceiverAddress(addressWithCoords);
        setReceiverCoordinates(coords);
        LoggerService.debug('✅ 收件地址坐标已保存:', coords);
      }
      
      // 清空地图地址输入框
      setMapAddressInput('');
      setShowMapModal(false);
      hideLoading();
    } catch (error) {
      hideLoading();
      errorService.handleError(error, { context: 'PlaceOrderScreen.handleReverseGeocode' });
    }
  }, [mapAddressInput, selectedLocation, mapType, currentT.coordinates, setSenderAddress, setReceiverAddress, setSenderCoordinates, setReceiverCoordinates, setMapAddressInput, setShowMapModal, showLoading, hideLoading]);

  // 使用Haversine公式计算两点之间的距离（公里）
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 精准计算费用；silent 用于自动更新预估，不弹窗、不显示全屏 loading
  const calculatePrice = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      if (!senderCoordinates || !receiverCoordinates) {
        if (!silent) {
          Alert.alert('提示', '请先选择寄件和收件地址的精确位置');
          hideLoading();
        } else {
          setIsCalculated(false);
        }
        return;
      }

      if (showWeightInput && !String(weight).trim()) {
        if (silent) {
          setIsCalculated(false);
        }
        return;
      }

      if (!silent) {
        showLoading(currentT.calculating, 'package');
      }

      const exactDistance = calculateDistance(
        senderCoordinates.lat,
        senderCoordinates.lng,
        receiverCoordinates.lat,
        receiverCoordinates.lng
      );

      const roundedDistanceForPrice = Math.ceil(exactDistance);

      setCalculatedDistance(exactDistance);

      if (packageType === '顺路递') {
        const basePrice = pricingSettings.base_fee;
        setCalculatedPrice(Math.round(basePrice).toString());
        setIsCalculated(true);
        if (!silent) {
          hideLoading();
          Alert.alert(currentT.calculateSuccess, `配送类型: ${currentT.speedWaySide}\n总费用: ${Math.round(basePrice)} MMK`);
        }
        return;
      }

      let totalPrice = pricingSettings.base_fee;

      const distanceFee = Math.max(0, roundedDistanceForPrice - pricingSettings.free_km_threshold) * pricingSettings.per_km_fee;
      totalPrice += distanceFee;

      const weightNum = parseFloat(weight || '0');
      if (packageType === '超重件（5KG）以上' && weightNum > 5) {
        totalPrice += Math.max(0, weightNum - 5) * pricingSettings.weight_surcharge;
      }

      if (deliverySpeed !== '准时达') {
        const speedExtra = deliverySpeeds.find(s => s.value === deliverySpeed)?.extra || 0;
        totalPrice += speedExtra;
      }

      if (packageType === '超规件（45x60x15cm）以上') {
        totalPrice += roundedDistanceForPrice * pricingSettings.oversize_surcharge;
      }
      if (packageType === '易碎品') {
        totalPrice += roundedDistanceForPrice * pricingSettings.fragile_surcharge;
      }
      if (packageType === '食品和饮料') {
        totalPrice += roundedDistanceForPrice * pricingSettings.food_beverage_surcharge;
      }

      setCalculatedPrice(Math.round(totalPrice).toString());
      setIsCalculated(true);

      if (!silent) {
        hideLoading();
        Alert.alert(currentT.calculateSuccess, `距离: ${roundedDistanceForPrice}km\n总费用: ${Math.round(totalPrice)} MMK`);
      }
    } catch (error) {
      if (!silent) {
        hideLoading();
      }
      errorService.handleError(error, { context: 'PlaceOrderScreen.calculateFee' });
    }
  }, [senderCoordinates, receiverCoordinates, packageType, weight, deliverySpeed, deliverySpeeds, pricingSettings, currentT, showLoading, hideLoading, showWeightInput]);

  const calculatePriceRef = useRef(calculatePrice);
  calculatePriceRef.current = calculatePrice;

  useEffect(() => {
    const id = setTimeout(() => {
      void calculatePriceRef.current({ silent: true });
    }, 400);
    return () => clearTimeout(id);
  }, [senderCoordinates, receiverCoordinates, packageType, weight, deliverySpeed, showWeightInput, pricingSettings]);

  // 估算距离（简化版，实际应该使用地图API）
  const estimateDistance = () => {
    // 这里简化为随机距离，实际应该根据地址计算
    if (senderAddress && receiverAddress) {
      setDistance(Math.floor(Math.random() * 10) + 2); // 2-12km
    }
  };

  useEffect(() => {
    estimateDistance();
  }, [senderAddress, receiverAddress]);

  // 从地址文本中提取纯地址（移除坐标信息）
  const extractAddress = (addressText: string) => {
    const lines = addressText.split('\n');
    return lines.filter(line => !line.includes('📍')).join('\n').trim();
  };

  const ORDER_DRAFT_CACHE_KEY = 'pendingOrderDraft';
  const ORDER_DRAFT_TTL_MS = 5 * 60 * 1000;

  const buildOrderSignature = () => {
    const signaturePayload = {
      senderName: senderName.trim(),
      senderPhone: senderPhone.trim(),
      senderAddress: extractAddress(senderAddress),
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      receiverAddress: extractAddress(receiverAddress),
      senderCoordinates,
      receiverCoordinates,
      packageType,
      weight,
      deliverySpeed,
      scheduledTime: deliverySpeed === '定时达' ? scheduledTime : '',
      paymentMethod,
      hasCOD,
      codAmount,
      cartTotal,
      calculatedPrice,
      calculatedDistance,
      isCalculated,
      selectedProducts,
      description,
    };
    return JSON.stringify(signaturePayload);
  };

  const getCachedDraft = async (signature: string) => {
    try {
      const cached = await AsyncStorage.getItem(ORDER_DRAFT_CACHE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (!parsed?.signature || !parsed?.orderId || !parsed?.createdAt) return null;
      const isExpired = Date.now() - parsed.createdAt > ORDER_DRAFT_TTL_MS;
      if (isExpired || parsed.signature !== signature) {
        await AsyncStorage.removeItem(ORDER_DRAFT_CACHE_KEY);
        return null;
      }
      return parsed as { orderId: string; signature: string; createdAt: number; deducted: boolean };
    } catch (error) {
      LoggerService.error('读取下单草稿失败:', error);
      return null;
    }
  };

  const saveDraft = async (draft: { orderId: string; signature: string; createdAt: number; deducted: boolean }) => {
    orderDraftRef.current = draft;
    try {
      await AsyncStorage.setItem(ORDER_DRAFT_CACHE_KEY, JSON.stringify(draft));
    } catch (error) {
      LoggerService.error('保存下单草稿失败:', error);
    }
  };

  const clearDraft = async () => {
    orderDraftRef.current = null;
    try {
      await AsyncStorage.removeItem(ORDER_DRAFT_CACHE_KEY);
    } catch (error) {
      LoggerService.error('清除下单草稿失败:', error);
    }
  };

  const isNetworkError = (error: any) => {
    const message = error?.message || '';
    return message.includes('Network request failed') ||
      message.includes('Failed to fetch') ||
      message.toLowerCase().includes('timeout');
  };

  const getOrderErrorMessage = (error: any) => {
    const message = error?.message || '';
    if (error?.code === '23505') {
      return language === 'zh' ? '订单已提交，请勿重复下单' : language === 'en' ? 'Order already submitted' : 'အော်ဒါကို ပို့ပြီးသားပါ';
    }
    if (isNetworkError(error)) {
      return language === 'zh' ? '网络不稳定，已为你保存订单，稍后可重试' : language === 'en' ? 'Network unstable. Order saved for retry.' : 'အင်တာနက်မတည်ငြိမ်ပါ၊ အော်ဒါကို သိမ်းထားပြီးပါပြီ';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return language === 'zh' ? '权限不足，请重新登录' : language === 'en' ? 'Permission denied. Please re-login.' : 'အခွင့်မပြုပါ၊ ပြန်လည်ဝင်ရောက်ပါ';
    }
    return language === 'zh' ? '下单失败，请稍后重试或联系客服' : language === 'en' ? 'Order failed. Please retry or contact support.' : 'အော်ဒါမအောင်မြင်ပါ၊ နောက်မှ ထပ်ကြိုးစားပါ';
  };

  const createPackageWithRetry = async (orderData: any) => {
    const maxAttempts = 2;
    const timeoutMs = 12000;
    let lastResult: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result: any = await Promise.race([
          packageService.createPackage(orderData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
        ]);
        lastResult = result;
        if (result?.success || result?.error?.code === '23505') {
          return result;
        }
        if (!isNetworkError(result?.error)) {
          return result;
        }
      } catch (error: any) {
        lastResult = { success: false, error };
        if (!isNetworkError(error) || attempt === maxAttempts) {
          return lastResult;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 800 * attempt));
    }

    return lastResult;
  };

  const validateAddressStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    const fieldsToValidate = [
      { field: 'senderName', value: senderName },
      { field: 'senderPhone', value: senderPhone },
      { field: 'senderAddress', value: senderAddress },
      { field: 'receiverName', value: receiverName },
      { field: 'receiverPhone', value: receiverPhone },
      { field: 'receiverAddress', value: receiverAddress },
    ];
    fieldsToValidate.forEach(({ field, value }) => {
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    setErrors(newErrors);
    setTouched(fieldsToValidate.reduce((acc, { field }) => ({ ...acc, [field]: true }), {}));
    if (!isValid) {
      feedbackService.error(currentT.fillRequired);
      return false;
    }
    if (!senderCoordinates || !receiverCoordinates) {
      feedbackService.warning(
        language === 'zh'
          ? '请在地图中选择寄件与收件精确位置'
          : language === 'en'
            ? 'Please pick sender and receiver locations on the map'
            : 'ပို့သူနှင့် လက်ခံသူ လိပ်စာကို မြေပွင့်တွင် ရွေးချယ်ပါ'
      );
      return false;
    }
    return true;
  };

  const validatePackageStep = (): boolean => {
    if (showWeightInput && !weight) {
      feedbackService.warning(
        language === 'zh' ? '请填写包裹重量' : language === 'en' ? 'Please enter package weight' : 'ပါဆယ်အလေးချိန် ထည့်ပါ'
      );
      return false;
    }
    const parsedWeight = Number(weight);
    if (showWeightInput && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      feedbackService.warning(
        language === 'zh' ? '请输入有效包裹重量' : language === 'en' ? 'Please enter valid weight' : 'အလေးချိန်မှန်ကန်စွာ ထည့်ပါ'
      );
      return false;
    }
    return true;
  };

  const validateDeliveryStep = (): boolean => {
    if (deliverySpeed === '定时达' && !scheduledTime) {
      feedbackService.warning(
        language === 'zh' ? '请填写指定送达时间' : language === 'en' ? 'Please set scheduled delivery time' : 'ပို့ဆောင်မည့်အချိန် ရွေးချယ်ပါ'
      );
      return false;
    }
    return true;
  };

  const handleWizardNext = () => {
    if (wizardStep === 0 && !validateAddressStep()) return;
    if (wizardStep === 1 && !validatePackageStep()) return;
    if (wizardStep === 2) {
      if (!validateDeliveryStep()) return;
      void calculatePrice({ silent: true });
    }
    if (wizardStep < WIZARD_LAST_STEP) {
      setWizardStep((s) => (s + 1) as OrderWizardStepIndex);
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 0) {
      setWizardStep((s) => (s - 1) as OrderWizardStepIndex);
    }
  };

  const handleWizardExit = () => {
    navigation.navigate('Home');
  };

  // 提交订单
  const handleSubmitOrder = async () => {
    if (isGuest) {
      promptGuestLogin(navigation, language);
      return;
    }
    if (isSubmitting) {
      feedbackService.warning(language === 'zh' ? '订单提交中，请勿重复点击' : language === 'en' ? 'Submitting, please do not tap again' : 'အော်ဒါတင်နေပါသည်၊ ထပ်မနှိပ်ပါနှင့်');
      return;
    }
    const submitTs = Date.now();
    if (submitTs - submitGuardRef.current < 1500) {
      feedbackService.warning(language === 'zh' ? '请稍候再提交' : language === 'en' ? 'Please wait before submitting again' : 'ခဏစောင့်ပြီးမှ ထပ်တင်ပါ');
      return;
    }

    // 1. 验证必填字段
    const newErrors: Record<string, string> = {};
    let isValid = true;

    const fieldsToValidate = [
      { field: 'senderName', value: senderName },
      { field: 'senderPhone', value: senderPhone },
      { field: 'senderAddress', value: senderAddress },
      { field: 'receiverName', value: receiverName },
      { field: 'receiverPhone', value: receiverPhone },
      { field: 'receiverAddress', value: receiverAddress },
    ];

    fieldsToValidate.forEach(({ field, value }) => {
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(fieldsToValidate.reduce((acc, { field }) => ({ ...acc, [field]: true }), {}));

    if (!isValid) {
      feedbackService.error(currentT.fillRequired);
      return;
    }

    // 验证重量字段（只在需要时验证）
    if (showWeightInput && !weight) {
      feedbackService.warning('请填写包裹重量');
      return;
    }

    // 验证定时达时间
    if (deliverySpeed === '定时达' && !scheduledTime) {
      feedbackService.warning('请填写指定送达时间');
      return;
    }

    const parsedWeight = Number(weight);
    if (showWeightInput && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      feedbackService.warning(language === 'zh' ? '请输入有效包裹重量' : language === 'en' ? 'Please enter valid weight' : 'အလေးချိန်မှန်ကန်စွာ ထည့်ပါ');
      return;
    }

    const finalPriceNumber = Number(isCalculated ? calculatedPrice : price);
    if (!Number.isFinite(finalPriceNumber) || finalPriceNumber <= 0) {
      feedbackService.warning(language === 'zh' ? '请先计算价格' : language === 'en' ? 'Please calculate price first' : 'စျေးနှုန်းကို အရင်တွက်ပါ');
      return;
    }

    if (paymentMethod !== 'cash' && paymentMethod !== 'balance') {
      feedbackService.warning(language === 'zh' ? '支付方式无效' : language === 'en' ? 'Invalid payment method' : 'ပေးချေမှုနည်းလမ်း မမှန်ကန်ပါ');
      return;
    }

    const codAmountNumber = hasCOD ? Number(codAmount || '0') : 0;
    if (hasCOD && (!Number.isFinite(codAmountNumber) || codAmountNumber < 0)) {
      feedbackService.warning(language === 'zh' ? '代收款金额无效' : language === 'en' ? 'Invalid COD amount' : 'COD ငွေပမာဏ မမှန်ကန်ပါ');
      return;
    }

    submitGuardRef.current = submitTs;
    setIsSubmitting(true);
    let offlinePayload: any = null;

    try {
      showLoading(currentT.creating, 'package');
      feedbackService.trigger(undefined); // 触觉反馈

      // 生成订单ID（根据寄件地址所在城市自动选择前缀）
      const generateOrderId = (address: string) => {
        // 城市前缀映射（优先级从高到低）
        // 🚀 注意：必须将具体的小城市放在前面，将“曼德勒”等大省份名称放在后面，
        // 否则“彬乌伦 曼德勒省”会因为包含“曼德勒”而错误识别为 MDY
        const cityPrefixMap: { [key: string]: string } = {
          '彬乌伦': 'POL', 'Pyin Oo Lwin': 'POL', 'ပင်းတလဲ': 'POL',
          '内比都': 'NPW', 'Naypyidaw': 'NPW', 'နေပြည်တော်': 'NPW',
          '东枝': 'TGI', 'Taunggyi': 'TGI', 'တောင်ကြီး': 'TGI',
          '腊戌': 'LSO', 'Lashio': 'LSO', 'လားရှိုး': 'LSO',
          '木姐': 'MSE', 'Muse': 'MSE', 'မူဆယ်': 'MSE',
          '仰光': 'YGN', 'Yangon': 'YGN', 'ရန်ကုန်': 'YGN',
          '曼德勒': 'MDY', 'Mandalay': 'MDY', 'မန္တလေး': 'MDY' // 曼德勒放在最后作为兜底
        };
        
        // 判断城市前缀
        let prefix = 'MDY'; // 默认曼德勒
        for (const [city, cityPrefix] of Object.entries(cityPrefixMap)) {
          if (address.includes(city)) {
            prefix = cityPrefix;
            break;
          }
        }
        
        // 使用Intl API获取缅甸时间（Asia/Yangon时区），确保年份和时间准确
        const now = new Date();
        
        // 获取缅甸时间的各个组件
        const myanmarTimeParts = {
          year: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', year: 'numeric' }),
          month: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', month: '2-digit' }),
          day: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', day: '2-digit' }),
          hour: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', hour: '2-digit', hour12: false }),
          minute: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', minute: '2-digit' })
        };
        
        // 格式化时间组件
        const year = myanmarTimeParts.year;
        const month = myanmarTimeParts.month.padStart(2, '0');
        const day = myanmarTimeParts.day.padStart(2, '0');
        const hour = myanmarTimeParts.hour.padStart(2, '0');
        const minute = myanmarTimeParts.minute.padStart(2, '0');
        const random1 = Math.floor(Math.random() * 10);
        const random2 = Math.floor(Math.random() * 10);
        
        return `${prefix}${year}${month}${day}${hour}${minute}${random1}${random2}`;
      };
      
      const signature = buildOrderSignature();
      const cachedDraft = await getCachedDraft(signature);
      const orderId = cachedDraft?.orderId || generateOrderId(senderAddress);
      const createdAt = cachedDraft ? new Date(cachedDraft.createdAt) : new Date();
      await saveDraft(cachedDraft || {
        orderId,
        signature,
        createdAt: createdAt.getTime(),
        deducted: false,
      });
      
      // 🚀 优化：记录下单人身份 (识别 VIP/普通会员)
      let ordererType = '会员';
      if (currentUser?.user_type === 'vip' || accountBalance > 0) {
        ordererType = 'VIP';
      }

      const typeTag = language === 'zh' ? `[下单身份: ${ordererType}]` : 
                     language === 'en' ? `[Orderer: ${ordererType === 'VIP' ? 'VIP' : 'Member'}]` : 
                     `[အော်ဒါတင်သူ: ${ordererType === 'VIP' ? 'VIP' : 'Member'}]`;

      const createTime = createdAt.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      // 准备订单数据
      let finalSenderLat = senderCoordinates?.lat;
      let finalSenderLng = senderCoordinates?.lng;
      let finalSenderAddr = extractAddress(senderAddress);
      let deliveryStoreId = null;

      // 如果是商城选货订单，获取店铺ID
      if (route.params?.selectedProducts && route.params.selectedProducts.length > 0) {
        deliveryStoreId = route.params.selectedProducts[0].store_id;
      }

      // 🚀 优化：生成支付状态标签
      let paymentTag = '';
      if (paymentMethod === 'balance') {
        paymentTag = cartTotal > 0 
          ? (language === 'zh' ? '[总计已余额支付]' : language === 'en' ? '[Total Paid by Balance]' : '[စုစုပေါင်းအား လက်ကျန်ငွေဖြင့် ပေးချေပြီး]')
          : (language === 'zh' ? '[跑腿费已余额支付]' : language === 'en' ? '[Courier Fee Paid by Balance]' : '[ပို့ဆောင်ခအား လက်ကျန်ငွေဖြင့် ပေးချေပြီး]');
      } else if (cartTotal > 0) {
        paymentTag = language === 'zh' ? '[商品已余额支付 | 跑腿费现金]' : language === 'en' ? '[Items Paid by Balance | Fee in Cash]' : '[ကုန်ပစ္စည်းအား လက်ကျန်ငွေဖြင့် ပေးချေပြီး | ပို့ဆောင်ခအား ငွေသားဖြင့်]';
      }

      const orderData = {
        id: orderId,
        customer_id: userId,
        sender_name: senderName.trim(),
        sender_phone: senderPhone.trim(),
        sender_address: finalSenderAddr,
        sender_latitude: finalSenderLat || null,
        sender_longitude: finalSenderLng || null,
        receiver_name: receiverName.trim(),
        receiver_phone: receiverPhone.trim(),
        receiver_address: extractAddress(receiverAddress),
        receiver_latitude: receiverCoordinates?.lat || null,
        receiver_longitude: receiverCoordinates?.lng || null,
        package_type: packageType,
        weight: weight,
        cod_amount: deliveryStoreId ? codAmountNumber : 0,
        description: `${typeTag} ${paymentTag} ${description || ''}`.trim(),
        delivery_speed: deliverySpeed,
        scheduled_delivery_time: deliverySpeed === '定时达' ? scheduledTime : '',
        delivery_distance: isCalculated ? calculatedDistance : distance,
        status: deliveryStoreId
          ? '待确认'
          : (paymentMethod === 'cash' ? '待收款' : '待取件'),
        delivery_store_id: deliveryStoreId || null,
        create_time: createTime,
        pickup_time: '',
        delivery_time: '',
        courier: '待分配',
        price: String(Math.round(finalPriceNumber)),
        payment_method: paymentMethod, // 添加支付方式字段
        pricing_base_fee_mmk: Math.round(Number(pricingSettings.base_fee) || 0),
      };

      offlinePayload = { ...orderData };

      const netState = await NetInfo.fetch();
      const isOnline = Boolean(netState.isConnected) && netState.isInternetReachable !== false;
      if (!isOnline) {
        hideLoading();
        await persistOrderLocally(offlinePayload, 'pending', 'offline');
        showOfflineSavedAlert();
        return;
      }

      // 🚀 核心逻辑：余额支付扣款校验
      const shippingFee = Math.max(0, Number(orderData.price) || 0);
      let totalDeduction = 0;
      const originalBalance = accountBalance;
      const draftSnapshot = orderDraftRef.current;

      // 1. 如果是商城订单，强制检查余额是否充足支付商品
      if (cartTotal > 0 && !isGuest) {
        if (accountBalance < cartTotal) {
          if (draftSnapshot?.deducted) {
            // 已扣款情况下跳过余额不足校验
          } else {
            hideLoading();
            Alert.alert(
              currentT.insufficientBalance, 
              `${currentT.accountBalance}: ${accountBalance.toLocaleString()} MMK\n` +
              `${currentT.itemsTotal}: ${cartTotal.toLocaleString()} MMK\n\n` +
              `${currentT.rechargeBeforeMall}`
            );
            return;
          }
        }
        totalDeduction += cartTotal;
      }

      // 2. 如果运费也选择余额支付
      if (paymentMethod === 'balance' && !isGuest) {
        totalDeduction += shippingFee;
        
        if (accountBalance < totalDeduction && !draftSnapshot?.deducted) {
          hideLoading();
          Alert.alert(
            currentT.insufficientBalance, 
            `${currentT.accountBalance}: ${accountBalance.toLocaleString()} MMK\n` +
            `${currentT.totalRequired}: ${totalDeduction.toLocaleString()} MMK`
          );
          return;
        }
      }

      // 3. 执行扣款 (如果有需要扣款的金额)
      if (totalDeduction > 0 && !isGuest) {
        if (!draftSnapshot?.deducted) {
          console.log('💰 正在执行余额扣除:', totalDeduction);
          const { data: updatedUser, error: deductError } = await supabase
            .from('users')
            .update({ 
              balance: accountBalance - totalDeduction,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

          if (deductError) {
            hideLoading();
            LoggerService.error('余额扣除失败:', deductError);
            Alert.alert('扣款失败', '由于余额扣除异常，请稍后重试或联系客服。');
            return;
          }

          // 扣款成功，更新本地状态和缓存
          setAccountBalance(updatedUser.balance);
          await AsyncStorage.setItem('currentUser', JSON.stringify({ ...currentUser, balance: updatedUser.balance }));
          feedbackService.success(currentT.balanceDeducted);
          await saveDraft({
            orderId,
            signature,
            createdAt: createdAt.getTime(),
            deducted: true,
          });
        }
      }

      // 调用API创建订单
      const result = await createPackageWithRetry(orderData);
      
      hideLoading();

      if (result?.success || result?.error?.code === '23505') {
        // 🚀 核心优化：订单创建成功后清空购物车
        if (route.params?.selectedProducts) {
          clearCart();
          LoggerService.debug('✅ 订单创建成功，购物车已清空');
        }
        
        await persistOrderLocally(offlinePayload, 'synced');
        await clearDraft();
        syncPendingOrders();
        // 显示包裹二维码（无论支付方式，快递员需要扫描取件）
        // 注意：这是包裹二维码，不是支付二维码
        setQrOrderId(orderId);
        setQrOrderPrice(isCalculated ? calculatedPrice : price);
        const incomingMallItems = route.params?.selectedProducts;
        const isMallOrder =
          (Array.isArray(incomingMallItems) && incomingMallItems.length > 0) || cartTotal > 0;
        if (isMallOrder) {
          const deliveryFee = Math.round(Number(isCalculated ? calculatedPrice : price) || 0);
          const productAmount = Math.round(Number(cartTotal) || 0);
          const coupon = 0;
          setQrMallSummary({
            productAmount,
            deliveryFee,
            coupon,
            paidAmount: Math.max(0, productAmount + deliveryFee - coupon),
            remarks: collectMallRemarks(),
          });
        } else {
          setQrMallSummary(null);
        }
        setShowQRCodeModal(true);
        setWizardStep(0);
        // 不再显示Alert，因为二维码模态框已经包含了成功信息
        // Alert.alert(
        //   currentT.orderSuccess,
        //   (language === 'zh' ? '订单创建成功！' : language === 'en' ? 'Order created successfully!' : 'အော်ဒါဖန်တီးခြင်းအောင်မြင်ပါသည်!') + '\n' + (language === 'zh' ? '订单号' : language === 'en' ? 'Order ID' : 'အော်ဒါနံပါတ်') + '：' + orderId + '\n' + (language === 'zh' ? '总金额' : language === 'en' ? 'Total Amount' : 'စုစုပေါင်းငွေ') + '：' + (isCalculated ? calculatedPrice : price) + ' MMK\n' + (language === 'zh' ? '支付方式' : language === 'en' ? 'Payment Method' : 'ပေးချေမှုနည်းလမ်း') + '：' + (language === 'zh' ? '现金支付' : language === 'en' ? 'Cash Payment' : 'ငွေသားပေးချေမှု') + '\n\n' + (language === 'zh' ? '骑手将在取件时代收费用。' : language === 'en' ? 'The courier will collect payment upon pickup.' : 'ကူရီယာသည် ပစ္စည်းယူသောအခါ ငွေကောက်ခံမည်။'),
        //   [
        //     {
        //       text: language === 'zh' ? '查看订单' : language === 'en' ? 'View Orders' : 'အော်ဒါများကြည့်ရှုရန်',
        //       onPress: () => {
        //         navigation.navigate('MyOrders');
        //       }
        //     },
        //     {
        //       text: language === 'zh' ? '继续下单' : language === 'en' ? 'Continue Ordering' : 'ဆက်လက်အော်ဒါပေးရန်',
        //       onPress: () => {
        //         resetForm();
        //       }
        //     }
        //   ]
        // );
        // 重置表单（在关闭二维码模态框时也会重置）
        // resetForm(); // 移到二维码模态框关闭时重置
      } else {
        if (orderDraftRef.current?.deducted && !isGuest) {
          const { error: refundError } = await supabase
            .from('users')
            .update({ 
              balance: originalBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          if (refundError) {
            LoggerService.error('余额回滚失败:', refundError);
            Alert.alert('下单失败', '订单未创建成功，余额回滚失败，请联系客服处理。');
          } else {
            setAccountBalance(originalBalance);
            await AsyncStorage.setItem('currentUser', JSON.stringify({ ...currentUser, balance: originalBalance }));
            await saveDraft({
              orderId,
              signature,
              createdAt: createdAt.getTime(),
              deducted: false,
            });
          }
        }
        if (isNetworkError(result?.error)) {
          await persistOrderLocally(offlinePayload, 'pending', result?.error?.message);
          showOfflineSavedAlert();
        }
        feedbackService.error(getOrderErrorMessage(result?.error));
        return;
      }
    } catch (error: any) {
      hideLoading();
      errorService.handleError(error, { context: 'PlaceOrderScreen.handleSubmit', silent: true });
      if (isNetworkError(error)) {
        await persistOrderLocally(offlinePayload, 'pending', error?.message);
        showOfflineSavedAlert();
      }
      feedbackService.error(getOrderErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // 🚀 新增：统一监听选中商品或代收状态的变化，实时更新金额和描述
  useEffect(() => {
    updateCODAndDescription(selectedProducts);
  }, [selectedProducts, hasCOD, merchantProducts]);

  const updateCODAndDescription = (selected: Record<string, number>, productsToUse?: Product[], overrideHasCOD?: boolean) => {
    let totalCOD = 0;
    let productDetails: string[] = [];
    const sourceProducts = productsToUse || merchantProducts;

    Object.entries(selected).forEach(([lineKey, qty]) => {
      const product =
        sourceProducts.find((p) => getCartItemLineKey(p as CartItem) === lineKey) ??
        sourceProducts.find((p) => p.id === lineKey);
      if (product) {
        totalCOD += product.price * qty;
        const variantName = (product as CartItem).variant_name?.trim();
        const label = variantName ? `${product.name} (${variantName})` : product.name;
        productDetails.push(`${label} x${qty}`);
      }
    });

    const isCODEnabled = overrideHasCOD !== undefined ? overrideHasCOD : hasCOD;

    if (totalCOD > 0) {
      setCartTotal(totalCOD);
      // 只有在开启代收时才设置金额，否则设为 0
      setCodAmount(isCODEnabled ? totalCOD.toString() : '0');
      
      // 自动把选中的商品添加到物品描述中
      const productsText = `[${currentT.selectedProducts}: ${productDetails.join(', ')}]`;
      
      const payToMerchantText = currentT.itemBalancePayment;
      const payToMerchantTag = ` [${payToMerchantText}: ${totalCOD.toLocaleString()} MMK]`;

      // 如果原先有描述，保留它（避免重复添加）
      const cleanDesc = description.replace(/\[已选商品:.*?\]|\[Selected:.*?\]|\[ကုန်ပစ္စည်းများ:.*?\]|\[付给商家:.*?\]|\[Pay to Merchant:.*?\]|\[ဆိုင်သို့ ပေးချေရန်:.*?\]|\[骑手代付:.*?\]|\[Courier Advance Pay:.*?\]|\[ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း:.*?\]|\[平台支付:.*?\]|\[Platform Payment:.*?\]|\[ပလက်ဖောင်းမှ ပေးချေခြင်း:.*?\]|\[余额支付:.*?\]|\[Balance Payment:.*?\]|\[လက်ကျန်ငွေဖြင့် ပေးချေခြင်း:.*?\]|\[买家商品备注:.*?\]|\[Buyer item notes:.*?\]|\[ဝယ်ယူသူမှတ်ချက်:.*?\]/g, '').trim();
      const remarkSegments: string[] = [];
      Object.entries(selected).forEach(([lineKey]) => {
        const found =
          sourceProducts.find((p) => getCartItemLineKey(p as CartItem) === lineKey) ??
          sourceProducts.find((p) => p.id === lineKey);
        const product = found as CartItem | undefined;
        let note: string | undefined;
        if (product?.customer_remarks?.length) {
          note = summarizeCustomerRemarks(product.customer_remarks);
        } else if (product?.customer_remark?.trim()) {
          note = product.customer_remark.trim();
        }
        if (product && note) remarkSegments.push(`${product.name}: ${note}`);
      });
      const buyerRemarkLabel =
        language === 'zh' ? '买家商品备注' : language === 'en' ? 'Buyer item notes' : 'ဝယ်ယူသူမှတ်ချက်';
      const buyerRemarksTag = remarkSegments.length > 0 ? ` [${buyerRemarkLabel}: ${remarkSegments.join(' | ')}]` : '';

      setDescription(`${productsText}${payToMerchantTag}${buyerRemarksTag} ${cleanDesc}`.trim());
    } else {
      setCartTotal(0);
      setCodAmount('0');
    }
  };

  const collectMallRemarks = () => {
    const segments: string[] = [];
    const seen = new Set<string>();

    const addFromProduct = (product?: CartItem | Product | null) => {
      if (!product) return;
      const cartItem = product as CartItem;
      const key = getCartItemLineKey(cartItem);
      if (seen.has(key)) return;
      seen.add(key);
      let note: string | undefined;
      if (cartItem.customer_remarks?.length) {
        note = summarizeCustomerRemarks(cartItem.customer_remarks);
      } else if (cartItem.customer_remark?.trim()) {
        note = cartItem.customer_remark.trim();
      }
      if (note) {
        segments.push(cartItem.name ? `${cartItem.name}: ${note}` : note);
      }
    };

    const incoming = route.params?.selectedProducts;
    if (Array.isArray(incoming)) {
      incoming.forEach((item: CartItem) => addFromProduct(item));
    }
    Object.entries(selectedProducts).forEach(([lineKey]) => {
      const found =
        merchantProducts.find((p) => getCartItemLineKey(p as CartItem) === lineKey) ??
        merchantProducts.find((p) => p.id === lineKey);
      addFromProduct(found);
    });

    if (segments.length === 1) {
      const only = segments[0];
      const sep = only.indexOf(': ');
      return sep >= 0 ? only.slice(sep + 2) : only;
    }
    return segments.join('\n');
  };

  // 重置表单（下单成功或关闭二维码后回到第 1 步「地址」）
  const resetForm = () => {
    setWizardStep(0);
    setErrors({});
    setTouched({});
    setReceiverName('');
    setReceiverPhone('');
    setReceiverAddress('');
    setWeight('');
    setCodAmount('');
    setDescription('');
    setDeliverySpeed('准时达');
    setScheduledTime('');
    setSenderAddress('');
    setReceiverCoordinates(null);
    setSenderCoordinates(null);
    setIsCalculated(false);
    setCalculatedPrice('0');
    setCalculatedDistance(0);
    setPrice('0');
    setDistance(0);
    setSelectedProducts({}); // 同时重置选中的商品
    setHasCOD(true); // 重置为默认有代收
    setQrMallSummary(null);
  };

  // 处理包裹类型点击
  const handlePackageTypeClick = useCallback((typeValue: string) => {
    setPackageType(typeValue);
    
    // 控制重量框的显示逻辑
    // ✅超重件 ✅超规件 时 "重量"框框 需要显示
    // ❌标准件 ❌文件 ❌易碎品 ❌食物和饮料 时 "重量"框框 不需要显示
    const showWeight = typeValue === '超重件（5KG）以上' || typeValue === '超规件（45x60x15cm）以上';
    setShowWeightInput(showWeight);
    
    // 如果是标准件、超重件或超规件，显示详细说明
    if (typeValue === '标准件（45x60x15cm）和（5KG）以内' ||
        typeValue === '超重件（5KG）以上' ||
        typeValue === '超规件（45x60x15cm）以上') {
      setSelectedPackageTypeInfo(typeValue);
      setShowPackageTypeInfo(true);
    }
  }, [setPackageType, setShowWeightInput]);

  // 处理地址簿选择
  const openAddressBook = (type: 'sender' | 'receiver') => {
    navigation.navigate('AddressBook', {
      pickerMode: true,
      onSelect: (item: any) => {
        if (type === 'sender') {
          handleFieldChange('senderName', item.contact_name);
          handleFieldChange('senderPhone', item.contact_phone);
          handleFieldChange('senderAddress', item.address_text);
          if (item.latitude && item.longitude) {
            setSenderCoordinates({ lat: item.latitude, lng: item.longitude });
          }
        } else {
          handleFieldChange('receiverName', item.contact_name);
          handleFieldChange('receiverPhone', item.contact_phone);
          handleFieldChange('receiverAddress', item.address_text);
          if (item.latitude && item.longitude) {
            setReceiverCoordinates({ lat: item.latitude, lng: item.longitude });
          }
        }
      }
    });
  };

  // 处理代收切换
  const handleToggleCOD = (val: boolean) => {
    setHasCOD(val);
    if (!val) {
      // 切换到无代收时，金额归零，但保留已选商品和描述
      setCodAmount('0');
    }
    // 注意：切换回开启时，useEffect 会自动触发 updateCODAndDescription 重新计算金额
  };

  const renderWizardActionBar = () => (
    <View style={wizardStyles.actionBar}>
      <View style={wizardStyles.actionBarSide}>
        <Text style={wizardStyles.payableLabel}>
          {(currentT as { payableAmount?: string }).payableAmount || currentT.totalPrice}
        </Text>
        <Text style={wizardStyles.payableValue}>
          {isCalculated ? `${Number(calculatedPrice).toLocaleString()} MMK` : '—'}
        </Text>
      </View>

      <View style={[wizardStyles.actionBarSide, wizardStyles.actionBarSideEnd]}>
        {wizardStep < WIZARD_LAST_STEP ? (
          <TouchableOpacity
            style={wizardStyles.actionPrimaryBtn}
            onPress={handleWizardNext}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={(currentT as { wizardNext?: string }).wizardNext}
          >
            <View style={wizardStyles.actionPrimaryGradient}>
              <Text style={wizardStyles.nextBtnText}>
                {(currentT as { wizardNext?: string }).wizardNext ?? '下一步'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={wizardStyles.actionPrimaryBtn}
            onPress={handleSubmitOrder}
            activeOpacity={0.8}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={currentT.submitOrder}
          >
            <View style={wizardStyles.actionPrimaryGradient}>
              <Text style={wizardStyles.nextBtnText} numberOfLines={1}>
                {isSubmitting ? currentT.creating : currentT.submitOrder}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const bottomBarInset = Math.max(insets.bottom, 10);
  const bottomBarHeight = 72 + bottomBarInset;

  return (
    <View style={styles.container}>
      <View style={wizardStyles.mainColumn}>
        <View
          style={[
            wizardStyles.topChrome,
            { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) },
            keyboardVisible && wizardStyles.topChromeCompact,
          ]}
        >
          <View style={wizardStyles.navRow}>
            <TouchableOpacity
              style={wizardStyles.navBtn}
              onPress={wizardStep > 0 ? handleWizardBack : handleWizardExit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={
                wizardStep > 0
                  ? (currentT as { wizardBack?: string }).wizardBack
                  : (currentT as { wizardExit?: string }).wizardExit
              }
            >
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={wizardStyles.navTitle} numberOfLines={1}>
              {currentT.title}
            </Text>
            <View style={wizardStyles.navSide} />
          </View>

          <OrderWizardProgress
            currentStep={wizardStep}
            labels={wizardStepLabels}
            language={language}
            compact={keyboardVisible}
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: 16,
              paddingTop: 4,
              paddingBottom: bottomBarHeight + 16,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          scrollEventThrottle={16}
          overScrollMode="always"
          bounces
          nestedScrollEnabled
        >
          {isGuest && (
            <View style={wizardStyles.guestBanner}>
              <Text style={wizardStyles.guestBannerText}>
                {(currentT as { guestLoginToSubmit?: string }).guestLoginToSubmit}
              </Text>
              <TouchableOpacity onPress={() => promptGuestLogin(navigation, language)}>
                <Text style={wizardStyles.guestBannerLink}>
                  {language === 'zh' ? '去登录' : language === 'en' ? 'Sign in' : 'ဝင်ရောက်မည်'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {wizardStep === 0 && (
          <>
          <SenderForm
            language={language as any}
            styles={styles}
            currentT={currentT}
            senderName={senderName}
            senderPhone={senderPhone}
            senderAddress={senderAddress}
            useMyInfo={useMyInfo}
            senderCoordinates={senderCoordinates}
            errors={errors}
            touched={touched}
            onSenderNameChange={(val) => handleFieldChange('senderName', val)}
            onSenderPhoneChange={(val) => handleFieldChange('senderPhone', val)}
            onSenderAddressChange={(val) => handleFieldChange('senderAddress', val)}
            onUseMyInfoChange={setUseMyInfo}
            onOpenMap={() => openMapSelector('sender')}
            onOpenAddressBook={() => openAddressBook('sender')}
            onBlur={handleFieldBlur}
            disabled={cartTotal > 0} // 🚀 商城订单锁定寄件信息
          />

          {/* 收件人表单 */}
          <ReceiverForm
            language={language as any}
            styles={styles}
            currentT={currentT}
            receiverName={receiverName}
            receiverPhone={receiverPhone}
            receiverAddress={receiverAddress}
            receiverCoordinates={receiverCoordinates}
            errors={errors}
            touched={touched}
            onReceiverNameChange={(val) => handleFieldChange('receiverName', val)}
            onReceiverPhoneChange={(val) => handleFieldChange('receiverPhone', val)}
            onReceiverAddressChange={(val) => handleFieldChange('receiverAddress', val)}
            onOpenMap={() => openMapSelector('receiver')}
            onOpenAddressBook={() => openAddressBook('receiver')}
            onBlur={handleFieldBlur}
          />
          </>
          )}

          {wizardStep === 1 && (
          <>
          {/* 包裹信息 */}
          <PackageInfo
            language={language as any}
            styles={styles}
            currentT={currentT}
            packageType={packageType}
            deliverySpeed={deliverySpeed}
            weight={weight}
            description={description}
            showWeightInput={showWeightInput}
            packageTypes={packageTypes}
            onPackageTypeChange={(value) => {
              setPackageType(value);
            }}
            onWeightChange={setWeight}
            onDescriptionChange={setDescription}
            onPackageTypeInfoClick={(type) => {
              setSelectedPackageTypeInfo(type);
              setShowPackageTypeInfo(true);
            }}
            cartTotal={cartTotal}
            accountBalance={accountBalance}
          />

          {/* 代收款 (仅限 VIP 账号) */}
          {currentUser?.user_type === 'vip' && (
            <FadeInView delay={320}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <MoneyIcon size={18} color="#1e293b" />
                    <Text style={styles.sectionTitle}> {currentT.codAmount}</Text>
                  </View>
                  <View style={styles.codToggleContainer}>
                    <Text style={[styles.codToggleLabel, !hasCOD && styles.codToggleLabelActive]}>{currentT.noCollect}</Text>
                    <Switch
                      value={hasCOD}
                      onValueChange={handleToggleCOD}
                      trackColor={{ false: '#e2e8f0', true: TEAL }}
                      thumbColor="#ffffff"
                    />
                    <Text style={[styles.codToggleLabel, hasCOD && styles.codToggleLabelActive]}>{currentT.collect}</Text>
                  </View>
                </View>

                {/* 代收金额输入框 */}
                {hasCOD && (
                  <FadeInView>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>{currentT.codAmount} *</Text>
                      <TextInput
                        style={styles.input}
                        value={codAmount}
                        onChangeText={setCodAmount}
                        placeholder={currentT.placeholders.codAmount}
                        placeholderTextColor="#9ca3af"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </FadeInView>
                )}
              </View>
            </FadeInView>
          )}
          </>
          )}

          {wizardStep === 2 && (
          <DeliveryOptions
            styles={styles}
            currentT={currentT}
            deliverySpeed={deliverySpeed}
            deliverySpeeds={deliverySpeeds}
            onDeliverySpeedChange={handleDeliverySpeedChange}
            onScheduleTimeClick={() => setShowTimePicker(true)}
          />
          )}

          {wizardStep === 3 && (
          <PriceCalculation
            language={language as any}
            styles={styles}
            currentT={currentT}
            isCalculated={isCalculated}
            calculatedDistance={calculatedDistance}
            calculatedPrice={calculatedPrice}
            packageType={packageType}
            weight={weight}
            deliverySpeed={deliverySpeed}
            deliverySpeeds={deliverySpeeds}
            pricingSettings={pricingSettings as any}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            accountBalance={accountBalance - cartTotal}
            cartTotal={cartTotal}
          />
          )}
        </ScrollView>
      </View>

      <View
        style={[
          wizardStyles.bottomBar,
          { paddingBottom: bottomBarInset },
        ]}
      >
        {renderWizardActionBar()}
      </View>

      <MapModal
        visible={showMapModal}
        language={language as any}
        styles={styles}
        currentT={currentT}
        mapType={mapType}
        selectedLocation={selectedLocation}
        selectedPlace={selectedPlace}
        mapAddressInput={mapAddressInput}
        showSuggestions={showSuggestions}
        autocompleteSuggestions={autocompleteSuggestions}
        onClose={() => setShowMapModal(false)}
        onConfirm={confirmMapLocation}
        onAddressInputChange={handleMapAddressInputChange}
        onMapAddressInputChange={setMapAddressInput}
        onUseCurrentLocation={useCurrentLocationInMap}
        onSelectSuggestion={handleSelectSuggestion}
        onSetShowSuggestions={setShowSuggestions}
        onLocationChange={(coords) => setSelectedLocation(coords)}
        onPlaceChange={setSelectedPlace}
      />
      
      <PackageTypeInfoModal
        visible={showPackageTypeInfo}
        styles={styles}
        currentT={currentT}
        selectedPackageTypeInfo={selectedPackageTypeInfo}
        onClose={() => setShowPackageTypeInfo(false)}
      />

      <ScheduledTimePickerModal
        visible={showTimePicker}
        styles={styles}
        currentT={currentT}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        availableTimeSlots={availableTimeSlots}
        onChangeDate={setSelectedDate}
        onChangeTime={setSelectedTime}
        onClose={() => setShowTimePicker(false)}
        onConfirm={(timeStr) => {
          setScheduledTime(timeStr);
          setShowTimePicker(false);
        }}
      />

      <OrderQrModal
        visible={showQRCodeModal}
        styles={styles}
        currentT={currentT}
        language={language}
        orderId={qrOrderId}
        orderPrice={qrOrderPrice}
        mallSummary={qrMallSummary}
        showLoading={showLoading}
        hideLoading={hideLoading}
        onClose={() => {
          setShowQRCodeModal(false);
          resetForm();
        }}
        onViewOrders={() => {
          setShowQRCodeModal(false);
          resetForm();
          navigation.navigate('Main', { screen: 'MyOrders' });
        }}
      />

      <Toast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

