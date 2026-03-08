import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import QRCode from 'react-native-qrcode-svg';
import NetInfo from '@react-native-community/netinfo';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { useCart } from '../contexts/CartContext';
import { packageService, systemSettingsService, supabase, merchantService, Product } from '../services/supabase';
import { databaseService } from '../services/DatabaseService';
import { usePlaceAutocomplete } from '../hooks/usePlaceAutocomplete';
import { FadeInView, ScaleInView } from '../components/Animations';
import { PackageIcon, LocationIcon, MapIcon, MoneyIcon, ClockIcon, DeliveryIcon } from '../components/Icon';
import { useLanguageStyles } from '../hooks/useLanguageStyles';
import BackToHomeButton from '../components/BackToHomeButton';
import { errorService } from '../services/ErrorService';
import { feedbackService } from '../services/FeedbackService';
import { analytics } from '../services/AnalyticsService';
import LoggerService from '../services/LoggerService';
// 导入拆分后的组件
import SenderForm from '../components/placeOrder/SenderForm';
import ReceiverForm from '../components/placeOrder/ReceiverForm';
import PackageInfo from '../components/placeOrder/PackageInfo';
import DeliveryOptions from '../components/placeOrder/DeliveryOptions';
import PriceCalculation from '../components/placeOrder/PriceCalculation';
import MapModal from '../components/placeOrder/MapModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing'; // 即使没在package.json，有时expo自带
import * as FileSystem from 'expo-file-system/legacy';
import ViewShot, { captureRef } from 'react-native-view-shot';

import Toast from '../components/Toast';

export default function PlaceOrderScreen({ navigation, route }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const { clearCart } = useCart();
  const styles = useLanguageStyles(baseStyles);
  
  // QR码保存引用
  const viewShotRef = useRef<any>(null);
  const submitGuardRef = useRef(0);
  const orderDraftRef = useRef<{
    orderId: string;
    signature: string;
    createdAt: number;
    deducted: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理从其他页面（如商品详情/购物车）传来的预选商品
  useEffect(() => {
    const handleIncomingProducts = async () => {
      if (route.params?.selectedProducts) {
        const incomingProducts = route.params.selectedProducts;
        const productMap: Record<string, number> = {};
        
        // 1. 先把这些商品加入到 merchantProducts 列表中，这样后续逻辑能找到它们
        // 过滤掉已经在列表中的商品，避免重复
        setMerchantProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = incomingProducts.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });

        // 2. 设置选中状态
        incomingProducts.forEach((p: any) => {
          productMap[p.id] = p.quantity;
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

  // 保存二维码到相册
  const handleSaveQRCode = async () => {
    try {
      showLoading(language === 'zh' ? '正在保存...' : 'Saving...', 'package');
      
      // 检查相册权限
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        hideLoading();
        Alert.alert(
          language === 'zh' ? '权限提示' : 'Permission Required',
          language === 'zh' ? '需要相册权限才能保存二维码' : 'Photo library permission is required to save QR code'
        );
        return;
      }

      // 截取视图
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
      });

      // 保存到本地文件（可选，captureRef 返回的已经是本地临时文件）
      // 保存到相册
      await MediaLibrary.saveToLibraryAsync(uri);
      
      hideLoading();
      Alert.alert(
        language === 'zh' ? '保存成功' : 'Saved!',
        language === 'zh' ? '二维码已保存到您的相册' : 'QR code has been saved to your gallery'
      );
    } catch (error) {
      hideLoading();
      LoggerService.error('保存二维码失败:', error);
      Alert.alert(
        language === 'zh' ? '保存失败' : 'Save Failed',
        language === 'zh' ? '无法保存图片，请稍后重试' : 'Unable to save image, please try again'
      );
    }
  };

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
          setIsMerchantStore(user.user_type === 'merchant');
          setIsGuest(false);
          if (user.user_type === 'merchant') {
            setPaymentMethod('cash');
          }
          
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
  
  // 支付方式（默认现金，二维码开发中）
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'cash'>('cash');
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [isMerchantStore, setIsMerchantStore] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [merchantStore, setMerchantStore] = useState<any>(null); // 商家店铺信息

  useEffect(() => {
    if (currentUser?.user_type === 'merchant' && paymentMethod !== 'cash') {
      setPaymentMethod('cash');
    }
  }, [currentUser, paymentMethod]);
  
  // 商品选择相关状态
  const [merchantProducts, setMerchantProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({}); // id -> quantity
  const [showProductSelector, setShowProductSelector] = useState(false);
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

  const t = {
    zh: {
      title: '立即下单',
      subtitle: '请填写订单信息',
      senderInfo: '寄件人信息',
      useMyInfo: '使用我的信息',
      senderName: '寄件人姓名',
      senderPhone: '寄件人电话',
      senderAddress: '取件地址',
      useCurrentLocation: '使用当前位置',
      openMap: '打开地图',
      receiverInfo: '收件人信息',
      receiverName: '收件人姓名',
      receiverPhone: '收件人电话',
      receiverAddress: '送达地址',
      packageInfo: '包裹信息',
      packageType: '包裹类型',
      weight: '重量（kg）',
      description: '物品描述（选填）',
      codAmount: '代收款 (COD)',
      hasCOD: '代收状态',
      collect: '有代收',
      noCollect: '无代收',
      selectProduct: '选择商品',
      selectedProducts: '已选商品',
      totalProductPrice: '商品总价',
      deliveryOptions: '配送选项',
      deliverySpeed: '配送速度',
      speedStandard: '准时达（1小时内）',
      speedExpress: '急送达（30分钟内）',
      speedScheduled: '定时达（指定时间）',
      scheduledTime: '指定送达时间',
      priceEstimate: '预估价格',
      distance: '配送距离',
      basePrice: '起步价',
      distancePrice: '里程费',
      speedPrice: '时效费',
      totalPrice: '总计',
      calculateButton: '计算',
      calculating: '计算中...',
      calculateSuccess: '计算完成',
      calculateFailed: '计算失败',
      submitOrder: '提交订单',
      fillRequired: '请填写所有必填项',
      orderSuccess: '订单创建成功',
      orderFailed: '订单创建失败',
      creating: '正在创建订单...',
      kmUnit: '公里',
      orderNumber: '订单号',
      totalAmount: '总金额',
      qrHint: '请保存此二维码，用于取件和追踪',
      viewOrders: '查看订单',
      continueOrder: '继续下单',
      kgUnit: '公斤',
      orderSavedOfflineTitle: '网络不稳定，已离线保存订单',
      orderSavedOfflineDescription: '我们会在网络恢复后自动同步，请勿重复提交。',
      orderSavedOfflineAction: '好的',
      placeholders: {
        name: '请输入姓名',
        phone: '请输入电话号码',
        address: '请输入详细地址',
        weight: '请输入重量',
        codAmount: '请输入代收款金额',
        description: '如：衣服、食品等',
        scheduledTime: '如：今天18:00',
      },
      paymentMethod: '支付方式',
      balancePayment: '余额支付',
      cashPayment: '现金支付',
      courierFeeBalance: '跑腿费 (余额支付)',
      courierFeeCash: '跑腿费 (现金支付)',
      shippingFeePayment: '跑腿费支付方式',
      itemBalancePayment: '商品费用 (仅余额支付)',
      accountBalance: '账户余额',
      insufficientBalance: '余额不足',
      balanceDeducted: '支付成功，已从余额扣除',
      paymentMethodDesc: '请选择订单支付方式',
      useBalance: '优先使用余额支付',
      useCash: '使用现金支付',
      coordinates: '坐标',
      packageTypes: {
        document: '文件',
        standard: '标准件',
        overweight: '超重件',
        oversized: '超规件',
        fragile: '易碎品',
        foodDrinks: '食品和饮料',
      },
      packageTypeDetails: {
        standard: '标准件（45x60x15cm）和（5KG）以内',
        overweight: '超重件（5KG）以上',
        oversized: '超规件（45x60x15cm）以上',
      },
      packageTypeInfo: {
        title: '包裹类型说明',
        sizeLimit: '尺寸限制',
        weightLimit: '重量限制',
        weightRequirement: '重量要求',
        sizeRequirement: '尺寸要求',
        description: '说明',
        standardDescription: '适用于常规大小的包裹，如衣物、文件、小型物品等。',
        overweightDescription: '适用于重量超过5公斤的包裹。重物品需要额外运费，请确保包装牢固。',
        oversizedDescription: '适用于尺寸超过标准的大型包裹。大件物品需要额外运费，请提前联系确认是否可以运输。',
        understood: '我知道了',
      },
      timePicker: {
        title: '选择送达时间',
        subtitle: '请选择您期望的送达日期和时间',
        workingHours: '营业时间: 09:00 - 18:00',
        selectDate: '选择日期',
        selectTime: '选择时间',
        confirm: '确定',
        cancel: '取消',
        today: '今天',
        tomorrow: '明天',
      },
    },
    en: {
      title: 'Place Order',
      subtitle: 'Please fill in order information',
      senderInfo: 'Sender Information',
      useMyInfo: 'Use my info',
      senderName: 'Sender Name',
      senderPhone: 'Sender Phone',
      senderAddress: 'Pickup Address',
      useCurrentLocation: 'Use current location',
      openMap: 'Open Map',
      receiverInfo: 'Receiver Information',
      receiverName: 'Receiver Name',
      receiverPhone: 'Receiver Phone',
      receiverAddress: 'Delivery Address',
      packageInfo: 'Package Information',
      packageType: 'Package Type',
      weight: 'Weight (kg)',
      description: 'Description (Optional)',
      codAmount: 'COD Amount',
      hasCOD: 'COD Status',
      collect: 'Collect',
      noCollect: 'No Collect',
      selectProduct: 'Select Products',
      selectedProducts: 'Selected',
      totalProductPrice: 'Total Price',
      deliveryOptions: 'Delivery Options',
      deliverySpeed: 'Delivery Speed',
      speedStandard: 'Standard (within 1 hour)',
      speedExpress: 'Express (within 30 mins)',
      speedScheduled: 'Scheduled (specific time)',
      scheduledTime: 'Scheduled Time',
      priceEstimate: 'Price Estimate',
      distance: 'Distance',
      basePrice: 'Base Price',
      distancePrice: 'Distance Fee',
      speedPrice: 'Speed Fee',
      totalPrice: 'Total',
      calculateButton: 'Calculate',
      calculating: 'Calculating...',
      calculateSuccess: 'Calculation Complete',
      calculateFailed: 'Calculation Failed',
      submitOrder: 'Submit Order',
      fillRequired: 'Please fill all required fields',
      orderSuccess: 'Order created successfully',
      orderFailed: 'Failed to create order',
      creating: 'Creating order...',
      kmUnit: 'km',
      orderNumber: 'Order Number',
      totalAmount: 'Total Amount',
      qrHint: 'Please save this QR code for pickup and tracking',
      viewOrders: 'View Orders',
      continueOrder: 'Continue Ordering',
      kgUnit: 'kg',
      orderSavedOfflineTitle: 'Order saved offline',
      orderSavedOfflineDescription: 'We stored this order locally and will sync it automatically once the network recovers. Please do not submit again.',
      orderSavedOfflineAction: 'Got it',
      placeholders: {
        name: 'Enter name',
        phone: 'Enter phone number',
        address: 'Enter detailed address',
        weight: 'Enter weight',
        codAmount: 'Enter COD amount',
        description: 'e.g.: Clothes, Food, etc.',
        scheduledTime: 'e.g.: Today 18:00',
      },
      paymentMethod: 'Payment Method',
      balancePayment: 'Balance Payment',
      cashPayment: 'Cash Payment',
      courierFeeBalance: 'Courier Fee (Balance Pay)',
      courierFeeCash: 'Courier Fee (Cash Pay)',
      shippingFeePayment: 'Shipping Fee Payment',
      itemBalancePayment: 'Item Cost (Balance Only)',
      accountBalance: 'Account Balance',
      insufficientBalance: 'Insufficient Balance',
      balanceDeducted: 'Payment successful, deducted from balance',
      paymentMethodDesc: 'Please select a payment method',
      useBalance: 'Pay with Balance',
      useCash: 'Pay with Cash',
      coordinates: 'Coordinates',
      packageTypes: {
        document: 'Document',
        standard: 'Standard Package',
        overweight: 'Overweight',
        oversized: 'Oversized',
        fragile: 'Fragile',
        foodDrinks: 'Food & Drinks',
      },
      packageTypeDetails: {
        standard: 'Standard Package (45x60x15cm) and (5KG) or less',
        overweight: 'Overweight (over 5KG)',
        oversized: 'Oversized (over 45x60x15cm)',
      },
      packageTypeInfo: {
        title: 'Package Type Description',
        sizeLimit: 'Size Limit',
        weightLimit: 'Weight Limit',
        weightRequirement: 'Weight Requirement',
        sizeRequirement: 'Size Requirement',
        description: 'Description',
        standardDescription: 'Suitable for regular-sized packages such as clothing, documents, small items, etc.',
        overweightDescription: 'Suitable for packages weighing over 5KG. Heavy items require additional shipping fees. Please ensure secure packaging.',
        oversizedDescription: 'Suitable for large packages exceeding standard dimensions. Large items require additional shipping fees. Please contact in advance to confirm transportability.',
        understood: 'I Understand',
      },
      timePicker: {
        title: 'Select Delivery Time',
        subtitle: 'Please select your preferred delivery date and time',
        workingHours: 'Working Hours: 09:00 - 18:00',
        selectDate: 'Select Date',
        selectTime: 'Select Time',
        confirm: 'Confirm',
        cancel: 'Cancel',
        today: 'Today',
        tomorrow: 'Tomorrow',
      },
    },
    my: {
      title: 'အမှာစာတင်',
      subtitle: 'အမှာစာအချက်အလက်ဖြည့်ပါ',
      senderInfo: 'ပေးပို့သူအချက်အလက်',
      useMyInfo: 'ကျွန်ုပ်၏အချက်အလက်သုံးမည်',
      senderName: 'ပေးပို့သူအမည်',
      senderPhone: 'ပေးပို့သူဖုန်း',
      senderAddress: 'ယူရန်လိပ်စာ',
      useCurrentLocation: 'လက်ရှိတည်နေရာသုံးမည်',
      openMap: 'မြေပုံဖွင့်',
      receiverInfo: 'လက်ခံသူအချက်အလက်',
      receiverName: 'လက်ခံသူအမည်',
      receiverPhone: 'လက်ခံသူဖုန်း',
      receiverAddress: 'ပို့ရန်လိပ်စာ',
      packageInfo: 'ပါဆယ်အချက်အလက်',
      packageType: 'ပါဆယ်အမျိုးအစား',
      weight: 'အလေးချိန် (kg)',
      description: 'ပစ္စည်းဖော်ပြချက် (ရွေးချယ်)',
      codAmount: '代收款 (COD)',
      hasCOD: '代收状态',
      collect: 'ငွေကောက်ခံမည်',
      noCollect: 'ငွေမကောက်ခံပါ',
      deliveryOptions: 'ပို့ဆောင်ရေးရွေးချယ်မှု',
      deliverySpeed: 'ပို့ဆောင်မြန်နှုန်း',
      speedStandard: 'စံချိန် (၁နာရီအတွင်း)',
      speedExpress: 'အမြန် (၃၀မိနစ်အတွင်း)',
      speedScheduled: 'အချိန်သတ်မှတ် (သတ်မှတ်ထားသောအချိန်)',
      scheduledTime: 'သတ်မှတ်အချိန်',
      priceEstimate: 'ခန့်မှန်းစျေးနှုန်း',
      distance: 'အကွာအဝေး',
      basePrice: 'အခြေခံစျေးနှုန်း',
      distancePrice: 'အကွာအဝေးအခကြေး',
      speedPrice: 'မြန်နှုန်းအခကြေး',
      totalPrice: 'စုစုပေါင်း',
      calculateButton: 'တွက်ချက်မည်',
      calculating: 'တွက်ချက်နေသည်...',
      calculateSuccess: 'တွက်ချက်ပြီးပြီ',
      calculateFailed: 'တွက်ချက်မအောင်မြင်',
      submitOrder: 'အမှာစာတင်သွင်းမည်',
      fillRequired: 'လိုအပ်သောအကွက်များဖြည့်ပါ',
      orderSuccess: 'အမှာစာအောင်မြင်စွာဖန်တီးပြီး',
      orderFailed: 'အမှာစာဖန်တီးမှုမအောင်မြင်',
      selectedProducts: 'ကုန်ပစ္စည်းများ',
      creating: 'အမှာစာဖန်တီးနေသည်...',
      kmUnit: 'ကီလိုမီတာ',
      orderNumber: 'အမှာစာနံပါတ်',
      totalAmount: 'စုစုပေါင်းပမာဏ',
      qrHint: 'ဤ QR ကုဒ်ကိုသိမ်းဆည်းပါ၊ ထုတ်ယူရန်နှင့်ခြေရာခံရန်အတွက်',
      viewOrders: 'အမှာစာများကြည့်ရန်',
      continueOrder: 'ဆက်လက်မှာယူမည်',
      kgUnit: 'ကီလိုဂရမ်',
      orderSavedOfflineTitle: 'အင်တာနက် မတော်တဆ ချိတ်ဆက်မရှိသဖြင့် အော်ဒါကို အော့ဖ်လိုင်း သိမ်းဆည်းထားပါသည်',
      orderSavedOfflineDescription: 'အင်တာနက် ပြန်လည်ရလာပါက အော်ဒါကို အလိုအလျောက် ပို့စ်ပေးမည်ဖြစ်ပြီး ထပ်မံတင်သွင်းရန် မလိုအပ်ပါ။',
      orderSavedOfflineAction: 'အိုကေ',
      placeholders: {
        name: 'အမည်ထည့်ပါ',
        phone: 'ဖုန်းနံပါတ်ထည့်ပါ',
        address: 'အသေးစိတ်လိပ်စာထည့်ပါ',
        weight: 'အလေးချိန်ထည့်ပါ',
        codAmount: '代收款 (COD) ပမာဏထည့်ပါ',
        description: 'ဥပမာ: အဝတ်အစား, အစားအစာ',
        scheduledTime: 'ဥပမာ: ယနေ့ ၁၈:၀၀',
      },
      paymentMethod: 'ပေးချေမှုနည်းလမ်း',
      balancePayment: 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း',
      cashPayment: 'ငွေသားဖြင့် ပေးချေခြင်း',
      courierFeeBalance: 'ပို့ဆောင်ခ (လက်ကျန်ငွေဖြင့်)',
      courierFeeCash: 'ပို့ဆောင်ခ (ငွေသားဖြင့်)',
      shippingFeePayment: 'ပို့ဆောင်ခ ပေးချေမှုနည်းလမ်း',
      itemBalancePayment: 'ကုန်ပစ္စည်းဖိုး (လက်ကျန်ငွေဖြင့်သာ)',
      accountBalance: 'အကောင့်လက်ကျန်ငွေ',
      insufficientBalance: 'လက်ကျန်ငွေမလုံလောက်ပါ',
      balanceDeducted: 'ပေးချေမှုအောင်မြင်ပါသည်၊ လက်ကျန်ငွေမှ နုတ်ယူပြီးပါပြီ',
      paymentMethodDesc: 'ပေးချေမှုနည်းလမ်းကို ရွေးချယ်ပါ',
      useBalance: 'လက်ကျန်ငွေဖြင့် ပေးချေမည်',
      useCash: 'ငွေသားဖြင့် ပေးချေမည်',
      coordinates: 'ကိုဩဒိနိတ်',
      packageTypes: {
        document: 'စာရွက်စာတမ်း',
        standard: 'ပုံမှန်ပါဆယ်',
        overweight: 'အလေးချိန်ပိုပါဆယ်',
        oversized: 'အရွယ်အစားကြီးပါဆယ်',
        fragile: 'ကျိုးပဲ့လွယ်သောပစ္စည်း',
        foodDrinks: 'အစားအသောက်',
      },
      packageTypeDetails: {
        standard: 'ပုံမှန်ပါဆယ် (45x60x15cm) နှင့် (5KG) အောက်',
        overweight: 'အလေးချိန်ပိုပါဆယ် (5KG အထက်)',
        oversized: 'အရွယ်အစားကြီးပါဆယ် (45x60x15cm အထက်)',
      },
      packageTypeInfo: {
        title: 'ပါဆယ်အမျိုးအစားရှင်းလင်းချက်',
        sizeLimit: 'အရွယ်အစားကန့်သတ်ချက်',
        weightLimit: 'အလေးချိန်ကန့်သတ်ချက်',
        weightRequirement: 'အလေးချိန်လိုအပ်ချက်',
        sizeRequirement: 'အရွယ်အစားလိုအပ်ချက်',
        description: 'ရှင်းလင်းချက်',
        standardDescription: 'ပုံမှန်အရွယ်အစားရှိသောပါဆယ်များအတွက်သင့်လျော်သည်။ ဥပမာ: အဝတ်အစား၊ စာရွက်စာတမ်း၊ သေးငယ်သောပစ္စည်းများ။',
        overweightDescription: '၅ကီလိုဂရမ်ထက်ပိုလေးသောပါဆယ်များအတွက်သင့်လျော်သည်။ လေးသောပစ္စည်းများအတွက် အပိုပို့ဆောင်ခ လိုအပ်ပါသည်။ ထုပ်ပိုးမှုခိုင်မာစွာပြုလုပ်ပါ။',
        oversizedDescription: 'စံချိန်ထက်ကြီးသောအရွယ်အစားရှိသောပါဆယ်များအတွက်သင့်လျော်သည်။ ကြီးမားသောပစ္စည်းများအတွက် အပိုပို့ဆောင်ခ လိုအပ်ပါသည်။ ပို့ဆောင်နိုင်မနိုင်ကို ကြိုတင်ဆက်သွယ်ပါ။',
        understood: 'နားလည်ပါပြီ',
      },
      timePicker: {
        title: 'ပို့ဆောင်မည့်အချိန်ရွေးပါ',
        subtitle: 'သင်အလိုရှိသော ပို့ဆောင်မည့်ရက်နှင့် အချိန်ကို ရွေးချယ်ပါ',
        workingHours: 'ရုံးဖွင့်ချိန်: 09:00 - 18:00',
        selectDate: 'ရက်စွဲရွေးပါ',
        selectTime: 'အချိန်ရွေးပါ',
        confirm: 'အတည်ပြုသည်',
        cancel: 'ပယ်ဖျက်သည်',
        today: 'ယနေ့',
        tomorrow: 'မနက်ဖြန်',
      },
    },
  };

  const currentT = t[language];

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
  const packageTypes = useMemo(() => [
    { value: '文件', label: currentT.packageTypes.document },
    { value: '标准件（45x60x15cm）和（5KG）以内', label: currentT.packageTypes.standard },
    { value: '超重件（5KG）以上', label: currentT.packageTypes.overweight },
    { value: '超规件（45x60x15cm）以上', label: currentT.packageTypes.oversized },
    { value: '易碎品', label: currentT.packageTypes.fragile },
    { value: '食品和饮料', label: currentT.packageTypes.foodDrinks },
  ], [currentT.packageTypes]);

  // 配送速度选项（从计费规则获取）- 使用 useMemo 优化
  const deliverySpeeds = useMemo(() => [
    { value: '准时达', label: currentT.speedStandard, extra: 0 },
    { value: '急送达', label: currentT.speedExpress, extra: pricingSettings.urgent_surcharge },
    { value: '定时达', label: currentT.speedScheduled, extra: pricingSettings.scheduled_surcharge },
  ], [currentT.speedStandard, currentT.speedExpress, currentT.speedScheduled, pricingSettings.urgent_surcharge, pricingSettings.scheduled_surcharge]);

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

  // 加载合伙店铺信息（当currentUser变化时）
  useEffect(() => {
    // 检查 currentUser 是否包含 user_type
    // 注意：App端 currentUser 是从 localStorage 加载的，可能需要检查结构
    if (currentUser?.user_type === 'merchant') {
      const loadMerchantStore = async () => {
        try {
          // 在App端使用 supabase
          const { data: store } = await supabase
            .from('delivery_stores')
            .select('*')
            .or(`store_code.eq.${currentUser.name},manager_phone.eq.${currentUser.phone},phone.eq.${currentUser.phone},store_name.eq.${currentUser.name}`)
            .limit(1)
            .maybeSingle();
          
          if (store) {
            LoggerService.debug('✅ App端已加载合伙店铺信息:', store.store_name);
            setMerchantStore(store);
            
            // 自动填充寄件人信息
            setSenderName(store.store_name);
            setSenderPhone(store.phone || store.manager_phone);
            setSenderAddress(store.address);
            
            // 自动设置坐标
            setSenderCoordinates({
              lat: store.latitude,
              lng: store.longitude
            });
            LoggerService.debug('✅ 已自动填充店铺信息和坐标');

            // 加载店铺商品
            try {
              const products = await merchantService.getStoreProducts(store.id);
              setMerchantProducts(products.filter(p => p.is_available));
              LoggerService.debug('✅ 已加载店铺商品:', products.length);
            } catch (err) {
              LoggerService.error('加载店铺商品失败:', err);
            }
          }
        } catch (error) {
          LoggerService.error('加载合伙店铺失败:', error);
        }
      };
      loadMerchantStore();
    } else {
      setMerchantStore(null);
    }
  }, [currentUser]);

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
      if (currentUser?.user_type === 'merchant' && merchantStore) {
        setSenderName(merchantStore.store_name);
        setSenderPhone(merchantStore.phone || merchantStore.manager_phone);
        // 如果没有地址，则使用店铺地址
        if (!senderAddress) {
            setSenderAddress(merchantStore.address);
            setSenderCoordinates({
                lat: merchantStore.latitude,
                lng: merchantStore.longitude
            });
        }
      } else {
        setSenderName(userName);
        setSenderPhone(userPhone);
      }
    } else {
      setSenderName('');
      setSenderPhone('');
    }
  }, [useMyInfo, userName, userPhone, currentUser, merchantStore]);

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

      // 如果是 MERCHANTS 账号且选择寄件地址，且已加载店铺信息，直接锁定到店铺位置
      if (currentUser?.user_type === 'merchant' && type === 'sender' && merchantStore) {
          LoggerService.debug('📍 MERCHANTS账号(App)，自动锁定店铺位置:', merchantStore.store_name);
          setSelectedLocation({
            latitude: merchantStore.latitude,
            longitude: merchantStore.longitude,
          });
          // 可以在这里设置地址输入框的值，但App端MapModal可能处理方式不同
          // mapAddressInput 是 MapModal 的 prop，可以在这里设置
          setMapAddressInput(merchantStore.address);
          
          setShowMapModal(true);
          return; // 跳过后续的自动定位逻辑
      }
      
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

  // 精准计算费用
  const calculatePrice = useCallback(async () => {
    try {
      showLoading(currentT.calculating, 'package');
      
      // 检查是否有坐标信息
      if (!senderCoordinates || !receiverCoordinates) {
        Alert.alert('提示', '请先选择寄件和收件地址的精确位置');
        hideLoading();
        return;
      }

      // 计算精确距离
      const exactDistance = calculateDistance(
        senderCoordinates.lat,
        senderCoordinates.lng,
        receiverCoordinates.lat,
        receiverCoordinates.lng
      );

      // 按照要求：6.1km = 7km（向上取整）用于给客户计费
      const roundedDistanceForPrice = Math.ceil(exactDistance);
      
      // 存储原始精确距离，用于给骑手算 KM 费
      setCalculatedDistance(exactDistance);

      // 计算各项费用（计费仍按取整后的距离）
      let totalPrice = pricingSettings.base_fee; // 基础费用

      // 距离费用（超过免费公里数后收费）
      const distanceFee = Math.max(0, roundedDistanceForPrice - pricingSettings.free_km_threshold) * pricingSettings.per_km_fee;
      totalPrice += distanceFee;

      // 重量附加费
      const weightNum = parseFloat(weight || '0');
      if (packageType === '超重件（5KG）以上' && weightNum > 5) {
        totalPrice += Math.max(0, weightNum - 5) * pricingSettings.weight_surcharge;
      }

      // 速度附加费
      if (deliverySpeed !== '准时达') {
        const speedExtra = deliverySpeeds.find(s => s.value === deliverySpeed)?.extra || 0;
        totalPrice += speedExtra;
      }

      // 包裹类型附加费
      if (packageType === '超规件（45x60x15cm）以上') {
        totalPrice += roundedDistanceForPrice * pricingSettings.oversize_surcharge;
      }
      if (packageType === '易碎品') {
        // 易碎品：按距离计算附加费 (MMK/公里)
        totalPrice += roundedDistanceForPrice * pricingSettings.fragile_surcharge;
      }
      if (packageType === '食品和饮料') {
        totalPrice += roundedDistanceForPrice * pricingSettings.food_beverage_surcharge;
      }

      // 更新计算结果
      setCalculatedPrice(Math.round(totalPrice).toString());
      setIsCalculated(true);
      
      hideLoading();
      Alert.alert(currentT.calculateSuccess, `距离: ${roundedDistanceForPrice}km\n总费用: ${Math.round(totalPrice)} MMK`);
      
    } catch (error) {
      hideLoading();
      errorService.handleError(error, { context: 'PlaceOrderScreen.calculateFee' });
    }
  }, [senderCoordinates, receiverCoordinates, packageType, weight, deliverySpeed, pricingSettings, currentT, showLoading, hideLoading]);

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

  // 提交订单
  const handleSubmitOrder = async () => {
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
      
      // 🚀 优化：记录下单人身份 (识别 商家/VIP/普通会员)
      let ordererType = '会员';
      if (currentUser?.user_type === 'merchant') {
        ordererType = '商家';
      } else if (currentUser?.user_type === 'vip' || accountBalance > 0) {
        ordererType = 'VIP';
      }

      const typeTag = language === 'zh' ? `[下单身份: ${ordererType}]` : 
                     language === 'en' ? `[Orderer: ${ordererType === '商家' ? 'MERCHANTS' : (ordererType === 'VIP' ? 'VIP' : 'Member')}]` : 
                     `[အော်ဒါတင်သူ: ${ordererType === '商家' ? 'MERCHANTS' : (ordererType === 'VIP' ? 'VIP' : 'Member')}]`;

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

      // 如果是 MERCHANTS 账号，强制使用店铺信息
      if (currentUser?.user_type === 'merchant') {
        try {
          LoggerService.debug('正在查找商家店铺信息...', currentUser);
          const { data: store } = await supabase
            .from('delivery_stores')
            .select('*')
            .or(`store_code.eq.${currentUser.name},manager_phone.eq.${currentUser.phone},phone.eq.${currentUser.phone},store_name.eq.${currentUser.name}`)
            .limit(1)
            .maybeSingle();

          if (store) {
            LoggerService.debug('找到商家店铺，强制使用店铺坐标:', store.store_name);
            finalSenderLat = store.latitude;
            finalSenderLng = store.longitude;
            // finalSenderAddr = store.address; // 可选：是否强制覆盖地址文本
          }
        } catch (err) {
          LoggerService.error('查找商家店铺异常:', err);
        }
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
        cod_amount: (currentUser?.user_type === 'merchant' && hasCOD) ? codAmountNumber : (deliveryStoreId ? codAmountNumber : 0),
        description: `${typeTag} ${paymentTag} ${description || ''}`.trim(),
        delivery_speed: deliverySpeed,
        scheduled_delivery_time: deliverySpeed === '定时达' ? scheduledTime : '',
        delivery_distance: isCalculated ? calculatedDistance : distance,
        // 🚀 优化：商城订单初始状态为“待确认”，商家订单直接为“待取件/待收款”
        status: (deliveryStoreId && currentUser?.user_type !== 'merchant') 
          ? '待确认' 
          : (paymentMethod === 'cash' ? '待收款' : '待取件'),
        delivery_store_id: deliveryStoreId || (currentUser?.user_type === 'merchant' ? userId : null),
        create_time: createTime,
        pickup_time: '',
        delivery_time: '',
        courier: '待分配',
        price: String(Math.round(finalPriceNumber)),
        payment_method: paymentMethod, // 添加支付方式字段
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
      // 🚀 修复：仅针对“买家”（Member/VIP），商家（MERCHANTS）录单不扣除自身余额
      if (cartTotal > 0 && !isGuest && currentUser?.user_type !== 'merchant') {
        if (accountBalance < cartTotal) {
          if (draftSnapshot?.deducted) {
            // 已扣款情况下跳过余额不足校验
          } else {
            hideLoading();
            Alert.alert(
              currentT.insufficientBalance, 
              `${language === 'zh' ? '账户余额' : 'Balance'}: ${accountBalance.toLocaleString()} MMK\n` +
              `${language === 'zh' ? '商品总计' : 'Items Total'}: ${cartTotal.toLocaleString()} MMK\n\n` +
              `${language === 'zh' ? '请先充值后再购买商场商品。' : 'Please recharge before buying mall items.'}`
            );
            return;
          }
        }
        totalDeduction += cartTotal;
      }

      // 2. 如果运费也选择余额支付
      // 🚀 修复：仅针对非商家账号
      if (paymentMethod === 'balance' && !isGuest && currentUser?.user_type !== 'merchant') {
        totalDeduction += shippingFee;
        
        if (accountBalance < totalDeduction && !draftSnapshot?.deducted) {
          hideLoading();
          Alert.alert(
            currentT.insufficientBalance, 
            `${language === 'zh' ? '账户余额' : 'Balance'}: ${accountBalance.toLocaleString()} MMK\n` +
            `${language === 'zh' ? '总计费用' : 'Total Required'}: ${totalDeduction.toLocaleString()} MMK`
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
        setShowQRCodeModal(true);
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

  const handleProductQuantityChange = (productId: string, delta: number) => {
    setSelectedProducts(prev => {
      const product = merchantProducts.find(p => p.id === productId);
      if (!product) return prev;

      const currentQty = prev[productId] || 0;
      let newQty = currentQty + delta;

      // 🚀 核心优化：增加库存校验逻辑
      if (delta > 0) {
        // 如果库存不是无限(-1)且当前数量已达到库存上限
        if (product.stock !== -1 && currentQty >= product.stock) {
          showToast(language === 'zh' ? `库存不足 (剩余: ${product.stock})` : `Out of stock (Left: ${product.stock})`, 'warning');
          return prev;
        }
      }

      newQty = Math.max(0, newQty);
      
      const newSelected = { ...prev };
      if (newQty === 0) {
        delete newSelected[productId];
      } else {
        newSelected[productId] = newQty;
      }
      
      return newSelected;
    });
  };

  // 🚀 新增：统一监听选中商品或代收状态的变化，实时更新金额和描述
  useEffect(() => {
    updateCODAndDescription(selectedProducts);
  }, [selectedProducts, hasCOD, merchantProducts]);

  const updateCODAndDescription = (selected: Record<string, number>, productsToUse?: Product[], overrideHasCOD?: boolean) => {
    let totalCOD = 0;
    let productDetails: string[] = [];
    const sourceProducts = productsToUse || merchantProducts;

    Object.entries(selected).forEach(([id, qty]) => {
      const product = sourceProducts.find(p => p.id === id);
      if (product) {
        totalCOD += product.price * qty;
        productDetails.push(`${product.name} x${qty}`);
      }
    });

    const isCODEnabled = overrideHasCOD !== undefined ? overrideHasCOD : hasCOD;

    if (totalCOD > 0) {
      setCartTotal(totalCOD);
      // 只有在开启代收时才设置金额，否则设为 0
      setCodAmount(isCODEnabled ? totalCOD.toString() : '0');
      
      // 自动把选中的商品添加到物品描述中
      const productsText = `[${currentT.selectedProducts}: ${productDetails.join(', ')}]`;
      
      // 🚀 优化：仅当非 MERCHANTS 账号时，才添加“余额支付”金额到描述中
      let payToMerchantTag = '';
      if (currentUser?.user_type !== 'merchant') {
        const payToMerchantText = currentT.itemBalancePayment;
        payToMerchantTag = ` [${payToMerchantText}: ${totalCOD.toLocaleString()} MMK]`;
      }

      // 如果原先有描述，保留它（避免重复添加）
      const cleanDesc = description.replace(/\[已选商品:.*?\]|\[Selected:.*?\]|\[ကုန်ပစ္စည်းများ:.*?\]|\[付给商家:.*?\]|\[Pay to Merchant:.*?\]|\[ဆိုင်သို့ ပေးချေရန်:.*?\]|\[骑手代付:.*?\]|\[Courier Advance Pay:.*?\]|\[ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း:.*?\]|\[平台支付:.*?\]|\[Platform Payment:.*?\]|\[ပလက်ဖောင်းမှ ပေးချေခြင်း:.*?\]|\[余额支付:.*?\]|\[Balance Payment:.*?\]|\[လက်ကျန်ငွေဖြင့် ပေးချေခြင်း:.*?\]/g, '').trim();
      setDescription(`${productsText}${payToMerchantTag} ${cleanDesc}`.trim());
    } else {
      setCartTotal(0);
      setCodAmount('0');
    }
  };

  // 重置表单
  const resetForm = () => {
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

  // Force re-bundle
  return (
    <View style={styles.container}>
      {/* 优化背景视觉效果 */}
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.header, { marginBottom: 10 }]}>
            <Text style={[styles.headerTitle, { color: '#ffffff', fontSize: 32, fontWeight: '800' }]}>{currentT.title}</Text>
            <View style={{ height: 3, width: 40, backgroundColor: '#fbbf24', borderRadius: 2, marginTop: 8, marginBottom: 8 }} />
            <Text style={[styles.headerSubtitle, { color: 'rgba(255, 255, 255, 0.9)', fontSize: 16 }]}>{currentT.subtitle}</Text>
          </View>

          {/* 寄件人表单 */}
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
            disabled={cartTotal > 0 && currentUser?.user_type !== 'merchant'} // 🚀 商城订单锁定寄件信息
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

          {/* 🚀 新增：商家商品选择卡片 (仅限 MERCHANTS 账号，放在收件人后) */}
          {currentUser?.user_type === 'merchant' && (
            <FadeInView delay={250}>
              <View style={styles.section}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="basket-outline" size={18} color="#1e293b" />
                  <Text style={styles.sectionTitle}> {currentT.selectedProducts}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>{language === 'zh' ? '从我的店铺选货' : 'Select from my store'}</Text>
                      <TouchableOpacity 
                        style={styles.selectProductBtn}
                        onPress={() => setShowProductSelector(true)}
                      >
                        <Ionicons name="add-circle-outline" size={16} color="#3b82f6" />
                        <Text style={styles.selectProductBtnText}>{language === 'zh' ? '选择商品' : language === 'en' ? 'Select Product' : 'ကုန်ပစ္စည်းရွေးချယ်ပါ'}</Text>
                      </TouchableOpacity>
                  </View>

                  {/* 已选商品列表 */}
                  {Object.keys(selectedProducts).length > 0 ? (
                    <View style={styles.selectedProductsList}>
                      {Object.entries(selectedProducts).map(([id, qty]) => {
                        const product = merchantProducts.find(p => p.id === id);
                        if (!product) return null;
                        return (
                          <View key={id} style={styles.selectedProductItem}>
                            <Text style={styles.selectedProductName} numberOfLines={1}>{product.name}</Text>
                            <View style={styles.qtyControl}>
                              <TouchableOpacity onPress={() => handleProductQuantityChange(id, -1)}>
                                <Ionicons name="remove-circle-outline" size={20} color="#64748b" />
                              </TouchableOpacity>
                              <Text style={styles.qtyText}>{qty}</Text>
                              <TouchableOpacity onPress={() => handleProductQuantityChange(id, 1)}>
                                <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.selectedProductPrice}>{(product.price * qty).toLocaleString()} MMK</Text>
                          </View>
                        );
                      })}
                      <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{currentT.totalPrice}</Text>
                        <Text style={{ fontWeight: '900', color: '#10b981', fontSize: 16 }}>{cartTotal.toLocaleString()} MMK</Text>
                      </View>

                      {/* 🚀 优化：代收款控制现在放在“总计”下面 */}
                      <View style={{ marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                        <View style={[styles.sectionHeader, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                          <View style={styles.sectionTitleContainer}>
                            <MoneyIcon size={16} color="#475569" />
                            <Text style={[styles.sectionTitle, { fontSize: 14, color: '#475569' }]}> {currentT.codAmount}</Text>
                          </View>
                        </View>

                        <View style={{ marginTop: 10 }}>
                          <TextInput
                            style={[styles.input, { height: 40, paddingVertical: 8, backgroundColor: '#fff' }]}
                            value={codAmount}
                            onChangeText={setCodAmount}
                            placeholder={currentT.placeholders.codAmount}
                            placeholderTextColor="#9ca3af"
                            keyboardType="decimal-pad"
                            editable={hasCOD} // 🚀 仅开启代收时可编辑
                          />
                          
                          {/* 🚀 移动位置：无代收/有代收开关移动到金额输入框下方 */}
                          <View style={[styles.codToggleContainer, { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 0 }]}>
                            <Text style={[styles.codToggleLabel, { fontSize: 11 }, !hasCOD && styles.codToggleLabelActive]}>{currentT.noCollect}</Text>
                            <Switch
                              value={hasCOD}
                              onValueChange={handleToggleCOD}
                              trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                              thumbColor="#ffffff"
                              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                            <Text style={[styles.codToggleLabel, { fontSize: 11 }, hasCOD && styles.codToggleLabelActive]}>{currentT.collect}</Text>
                          </View>

                          {hasCOD && (
                            <Text style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                              💡 {language === 'zh' ? '该金额将由骑手代收' : language === 'en' ? 'Courier will collect this' : 'ကူရီယာမှ ကောက်ခံမည်'}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      onPress={() => setShowProductSelector(true)}
                      style={{ padding: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <Text style={{ color: '#94a3b8' }}>{language === 'zh' ? '暂未选择商品，点击添加' : 'No items selected, tap to add'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </FadeInView>
          )}

          {/* 包裹信息 */}
          <PackageInfo
            language={language as any}
            styles={styles}
            currentT={currentT}
            packageType={packageType}
            weight={weight}
            description={description}
            showWeightInput={showWeightInput}
            packageTypes={packageTypes}
            onPackageTypeChange={setPackageType}
            onWeightChange={setWeight}
            onDescriptionChange={setDescription}
            onPackageTypeInfoClick={(type) => {
              setSelectedPackageTypeInfo(type);
              setShowPackageTypeInfo(true);
            }}
            cartTotal={currentUser?.user_type === 'merchant' ? 0 : cartTotal}
            accountBalance={currentUser?.user_type === 'merchant' ? undefined : accountBalance}
          />

          {/* 代收款 (仅限 VIP 账号，MERCHANTS 已移入商品卡片) */}
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
                      trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
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

          {/* 配送选项 */}
          <DeliveryOptions
            language={language as any}
            styles={styles}
            currentT={currentT}
            deliverySpeed={deliverySpeed}
            deliverySpeeds={deliverySpeeds}
            onDeliverySpeedChange={setDeliverySpeed}
            onScheduleTimeClick={() => setShowTimePicker(true)}
          />

          {/* 价格计算 */}
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
            onCalculate={calculatePrice}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            accountBalance={currentUser?.user_type === 'merchant' ? undefined : (accountBalance - cartTotal)}
            cartTotal={currentUser?.user_type === 'merchant' ? 0 : cartTotal}
            isMerchant={currentUser?.user_type === 'merchant'}
          />

          {/* 提交按钮 */}
          <ScaleInView delay={450}>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmitOrder}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <DeliveryIcon size={24} color="#ffffff" />
                <Text style={styles.submitText}>
                  {isSubmitting ? currentT.creating : currentT.submitOrder}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScaleInView>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 模态框 */}
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
      
      {/* 包裹类型说明模态框 */}
      <Modal
        visible={showPackageTypeInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPackageTypeInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentT.packageTypeInfo.title}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.modalText}>
                {selectedPackageTypeInfo === '标准件（45x60x15cm）和（5KG）以内' ? currentT.packageTypeDetails.standard :
                 selectedPackageTypeInfo === '超重件（5KG）以上' ? currentT.packageTypeDetails.overweight :
                 selectedPackageTypeInfo === '超规件（45x60x15cm）以上' ? currentT.packageTypeDetails.oversized :
                 selectedPackageTypeInfo}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPackageTypeInfo(false)}
            >
              <Text style={styles.modalCloseButtonText}>{currentT.packageTypeInfo.understood}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 时间选择器模态框 */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContent}>
            <LinearGradient
              colors={['#1e3a8a', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.timePickerHeader}
            >
              <View style={styles.timePickerHeaderContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time" size={24} color="#fbbf24" style={{ marginRight: 10 }} />
                  <View>
                    <Text style={styles.timePickerTitle}>{currentT.timePicker.title}</Text>
                    <Text style={styles.timePickerSubtitle}>{currentT.timePicker.subtitle}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowTimePicker(false)}
                style={styles.timePickerCloseButton}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.timePickerBody}>
              <View style={styles.quickSelectSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="calendar-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
                  <Text style={styles.quickSelectTitle}>{currentT.timePicker.selectDate}</Text>
                </View>
                <View style={styles.quickSelectGrid}>
                  <TouchableOpacity
                    style={[
                      styles.quickSelectButton,
                      selectedDate === 'Today' && { borderColor: '#3b82f6', backgroundColor: '#eff6ff' }
                    ]}
                    onPress={() => setSelectedDate('Today')}
                  >
                    <Ionicons 
                      name={selectedDate === 'Today' ? "checkmark-circle" : "ellipse-outline"} 
                      size={20} 
                      color={selectedDate === 'Today' ? "#3b82f6" : "#cbd5e1"} 
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.quickSelectButtonText, selectedDate === 'Today' && { color: '#3b82f6' }]}>
                      {currentT.timePicker.today}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.quickSelectButton,
                      selectedDate === 'Tomorrow' && { borderColor: '#3b82f6', backgroundColor: '#eff6ff' }
                    ]}
                    onPress={() => setSelectedDate('Tomorrow')}
                  >
                    <Ionicons 
                      name={selectedDate === 'Tomorrow' ? "checkmark-circle" : "ellipse-outline"} 
                      size={20} 
                      color={selectedDate === 'Tomorrow' ? "#3b82f6" : "#cbd5e1"} 
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.quickSelectButtonText, selectedDate === 'Tomorrow' && { color: '#3b82f6' }]}>
                      {currentT.timePicker.tomorrow}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.timeSlotsSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="time-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
                    <Text style={styles.timeSlotsTitle}>{currentT.timePicker.selectTime}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#94a3b8' }}>{currentT.timePicker.workingHours}</Text>
                </View>
                
                <ScrollView 
                  style={styles.timeSlotsContainer} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.timeSlotsGrid}
                >
                  {availableTimeSlots.length > 0 ? (
                    availableTimeSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.timeSlotButton,
                          selectedTime === slot && styles.timeSlotButtonActive
                        ]}
                        onPress={() => setSelectedTime(slot)}
                      >
                        <Text style={[
                          styles.timeSlotText,
                          selectedTime === slot && styles.timeSlotTextActive
                        ]}>{slot}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={{ width: '100%', padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: '#94a3b8' }}>今日配送已截止，请选择明日</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>

            <View style={styles.timePickerButtons}>
              <TouchableOpacity
                style={styles.timePickerCancelButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timePickerCancelText}>{currentT.timePicker.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timePickerConfirmButton}
                onPress={() => {
                  if (selectedDate && selectedTime) {
                    const timeStr = `${selectedDate === 'Today' ? currentT.timePicker.today : currentT.timePicker.tomorrow} ${selectedTime}`;
                    setScheduledTime(timeStr);
                    setShowTimePicker(false);
                  } else {
                    Alert.alert('提示', '请选择日期并输入时间');
                  }
                }}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.timePickerConfirmGradient}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.timePickerConfirmText}>{currentT.timePicker.confirm}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 商品选择模态框 */}
      <Modal
        visible={showProductSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.modalTitle}>{language === 'zh' ? '选择商品' : language === 'en' ? 'Select Product' : 'ကုန်ပစ္စည်းရွေးချယ်ပါ'}</Text>
              <TouchableOpacity onPress={() => setShowProductSelector(false)} style={styles.timePickerCloseButton}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 10 }}>
              {merchantProducts.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Ionicons name="basket-outline" size={48} color="#cbd5e1" />
                  <Text style={{ marginTop: 12, color: '#94a3b8' }}>暂无上架商品</Text>
                </View>
              ) : (
                merchantProducts.map((item) => (
                  <View key={item.id} style={styles.selectorItem}>
                    <View style={styles.selectorImageContainer}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.selectorImage} />
                      ) : (
                        <Ionicons name="image-outline" size={24} color="#cbd5e1" />
                      )}
                    </View>
                    
                    <View style={styles.selectorRightContent}>
                      <Text style={styles.selectorName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.selectorPrice} numberOfLines={1}>{item.price.toLocaleString()} MMK</Text>
                      
                      <View style={styles.selectorBottomRow}>
                        <View style={styles.selectorStockRow}>
                          <Ionicons name="cube-outline" size={12} color="#94a3b8" />
                          <Text style={[
                            styles.selectorStockText,
                            item.stock === 0 && { color: '#ef4444' }
                          ]}>
                            {language === 'zh' ? '库存' : language === 'en' ? 'Stock' : 'လက်ကျန်'}: {item.stock === -1 ? (language === 'zh' ? '无限' : language === 'en' ? 'Infinite' : 'အကန့်အသတ်မရှိ') : item.stock}
                          </Text>
                        </View>
                        
                        <View style={styles.selectorQtyControl}>
                          <TouchableOpacity 
                            onPress={() => handleProductQuantityChange(item.id, -1)}
                            disabled={!selectedProducts[item.id]}
                          >
                            <Ionicons 
                              name="remove-circle-outline" 
                              size={28} 
                              color={selectedProducts[item.id] ? "#64748b" : "#e2e8f0"} 
                            />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{selectedProducts[item.id] || 0}</Text>
                          <TouchableOpacity 
                            onPress={() => handleProductQuantityChange(item.id, 1)}
                            disabled={item.stock !== -1 && (selectedProducts[item.id] || 0) >= item.stock}
                          >
                            <Ionicons 
                              name="add-circle-outline" 
                              size={28} 
                              color={item.stock !== -1 && (selectedProducts[item.id] || 0) >= item.stock ? "#e2e8f0" : "#3b82f6"} 
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalConfirmBtn}
              onPress={() => setShowProductSelector(false)}
            >
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.modalConfirmGradient}>
                <Text style={styles.modalConfirmText}>{language === 'zh' ? '确定' : language === 'en' ? 'Confirm' : 'အတည်ပြုသည်'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR码模态框 */}
      <Modal
        visible={showQRCodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowQRCodeModal(false);
          resetForm();
        }}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <LinearGradient
              colors={['#2E86AB', '#4CA1CF']}
              style={styles.qrModalHeader}
            >
              <Text style={styles.qrModalTitle}>📱 {language === 'zh' ? '订单创建成功' : language === 'en' ? 'Order Created' : 'အော်ဒါအောင်မြင်သည်'}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowQRCodeModal(false);
                  resetForm();
                }}
                style={styles.qrModalClose}
              >
                <Text style={styles.qrModalCloseText}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>

            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={{ backgroundColor: 'white' }}>
              <View style={styles.qrModalBody}>
                <Text style={styles.qrInfoText}>📦 {language === 'zh' ? '订单号' : language === 'en' ? 'Order ID' : 'အော်ဒါနံပါတ်'}</Text>
                <Text style={styles.qrOrderId}>{qrOrderId}</Text>

                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={qrOrderId}
                      size={200}
                      color="#2E86AB"
                      backgroundColor="white"
                    />
                  </View>
                </View>

                <Text style={styles.qrHint}>
                  {language === 'zh' ? '请向骑手出示此二维码以供取件扫描' : language === 'en' ? 'Please show this QR code to the courier' : 'ပစ္စည်းယူသည့်အခါ ဤ QR ကုဒ်ကို ပြပေးပါ'}
                </Text>

                <Text style={styles.qrOrderPrice}>{qrOrderPrice} MMK</Text>
              </View>
            </ViewShot>

            <View style={styles.qrModalButtons}>
              <TouchableOpacity
                style={styles.qrButton}
                onPress={handleSaveQRCode}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.qrButtonGradient}
                >
                  <Text style={styles.qrButtonText}>💾 {language === 'zh' ? '保存二维码' : language === 'en' ? 'Save QR' : 'သိမ်းဆည်းမည်'}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => {
                  setShowQRCodeModal(false);
                  resetForm();
                  navigation.navigate('MyOrders');
                }}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.qrButtonGradient}
                >
                  <Text style={styles.qrButtonText}>📄 {language === 'zh' ? '查看订单' : language === 'en' ? 'View Orders' : 'အော်ဒါကြည့်ရန်'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                alignItems: 'center',
                paddingVertical: 15,
                borderTopWidth: 1,
                borderTopColor: '#f1f5f9'
              }}
              onPress={() => {
                setShowQRCodeModal(false);
                resetForm();
              }}
            >
              <Text style={{ color: '#64748b', fontWeight: 'bold' }}>{language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်မည်'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* 🚀 移除多余的空 Modal */}
      <Toast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calculateButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  calculateButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pricePlaceholder: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  pricePlaceholderText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
  },
  pricePlaceholderSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 2,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkButton: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  coordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
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
  coordinateInfo: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  coordinateText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  chipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  chipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  radioOptionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  radioContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radioText: {
    fontSize: 15,
    color: '#475569',
  },
  radioTextActive: {
    color: '#1e40af',
    fontWeight: '600',
  },
  extraPrice: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  priceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  priceLabelTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  priceTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  submitButton: {
    marginTop: 32,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 12,
  },
  submitText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  qrModalClose: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  qrModalCloseText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  submitPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // 地图模态框样式
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  mapCloseButton: {
    fontSize: 28,
    color: '#64748b',
    fontWeight: 'bold',
    width: 40,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  mapHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mapCurrentLocationButton: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  mapCurrentLocationText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  mapConfirmButton: {
    fontSize: 28,
    color: '#3b82f6',
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapFooter: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  mapInstructions: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  mapAddressInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    position: 'relative',
    zIndex: 1000,
  },
  mapAddressInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 70, // 输入框下方 (padding 15 + input height ~50 + margin 5)
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 400,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1f2937',
    flex: 1,
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // 包裹类型说明模态框样式
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalContent: {
    width: '90%',
    maxWidth: 400,
  },
  infoModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  infoModalClose: {
    fontSize: 24,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  infoModalBody: {
    marginBottom: 24,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  infoModalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  infoModalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  infoModalButtonText: {
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
    alignItems: 'center',
  },
  qrModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  qrModalBody: {
    padding: 24,
    alignItems: 'center',
  },
  qrInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 6,
  },
  qrOrderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginBottom: 8,
  },
  qrOrderPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 16,
  },
  qrCodeContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#2E86AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  qrHint: {
    marginTop: 16,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // 支付方式选择样式
  paymentMethodContainer: {
    marginTop: 12,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  paymentMethodOptionActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#3b82f6',
  },
  paymentMethodRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#94a3b8',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  paymentMethodLabelActive: {
    color: '#3b82f6',
  },
  paymentMethodDesc: {
    fontSize: 13,
    color: '#64748b',
  },
  qrModalButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  qrButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  qrButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  qrButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // 时间选择器样式
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timePickerContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '92%',
    maxWidth: 400,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  timePickerHeader: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timePickerHeaderContent: {
    flex: 1,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  timePickerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  timePickerCloseButton: {
    width: 30,
    height: 32,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerBody: {
    padding: 20,
  },
  quickSelectSection: {
    marginBottom: 20,
  },
  quickSelectTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  quickSelectGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  quickSelectButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSelectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  timeSlotsSection: {
    height: 220, // 固定高度防止重叠
  },
  timeSlotsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  timeSlotsContainer: {
    marginTop: 8,
    flex: 1,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    paddingBottom: 10,
  },
  timeSlotButton: {
    width: '31.3%', // 精确计算宽度
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 2,
  },
  timeSlotButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  timeSlotText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  timeSlotTextActive: {
    color: '#3b82f6',
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  timePickerCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  timePickerConfirmButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  timePickerConfirmGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  timePickerConfirmText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // 选中POI信息样式
  selectedPlaceInfo: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  selectedPlaceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  selectedPlaceAddress: {
    fontSize: 12,
    color: '#0369a1',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalCloseButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // 商家商品选择样式
  selectProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  selectProductBtnText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  selectedProductsList: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedProductName: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    minWidth: 20,
    textAlign: 'center',
  },
  selectedProductPrice: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'right',
  },
  productTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
  },
  productTotalLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  productTotalValue: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectorImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  selectorImage: {
    width: '100%',
    height: '100%',
  },
  selectorRightContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  selectorName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  selectorPrice: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectorBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  selectorStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectorStockText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  selectorQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalConfirmBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  modalConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  // 代收切换样式
  codToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codToggleLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  codToggleLabelActive: {
    color: '#3b82f6',
  },
});
