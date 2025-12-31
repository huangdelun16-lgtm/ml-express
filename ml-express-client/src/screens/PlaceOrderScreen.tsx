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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { packageService, systemSettingsService, supabase } from '../services/supabase';
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
import * as FileSystem from 'expo-file-system';
import ViewShot, { captureRef } from 'react-native-view-shot';

export default function PlaceOrderScreen({ navigation }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const styles = useLanguageStyles(baseStyles);
  
  // QR码保存引用
  const viewShotRef = useRef<any>(null);

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
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cash'>('cash');
  const [partnerStore, setPartnerStore] = useState<any>(null); // 合伙店铺信息
  
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
    if (currentUser?.user_type === 'partner') {
      const loadPartnerStore = async () => {
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
            setPartnerStore(store);
            
            // 自动填充寄件人信息
            setSenderName(store.store_name);
            setSenderPhone(store.contact_phone || store.manager_phone);
            setSenderAddress(store.address);
            
            // 自动设置坐标
            setSenderCoordinates({
              lat: store.latitude,
              lng: store.longitude
            });
            LoggerService.debug('✅ 已自动填充店铺信息和坐标');
          }
        } catch (error) {
          LoggerService.error('加载合伙店铺失败:', error);
        }
      };
      loadPartnerStore();
    } else {
      setPartnerStore(null);
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
      }
      if (phone) {
        setUserPhone(phone);
        if (useMyInfo) setSenderPhone(phone);
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
        '眉苗': 'maymyo', 'Pyin Oo Lwin': 'maymyo', '彬乌伦': 'maymyo', 'ပင်းတလဲ': 'maymyo',
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
      if (currentUser?.user_type === 'partner' && partnerStore) {
        setSenderName(partnerStore.store_name);
        setSenderPhone(partnerStore.contact_phone || partnerStore.manager_phone);
        // 如果没有地址，则使用店铺地址
        if (!senderAddress) {
            setSenderAddress(partnerStore.address);
            setSenderCoordinates({
                lat: partnerStore.latitude,
                lng: partnerStore.longitude
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
  }, [useMyInfo, userName, userPhone, currentUser, partnerStore]);

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

      // 如果是 Partner 账号且选择寄件地址，且已加载店铺信息，直接锁定到店铺位置
      if (currentUser?.user_type === 'partner' && type === 'sender' && partnerStore) {
          LoggerService.debug('📍 Partner账号(App)，自动锁定店铺位置:', partnerStore.store_name);
          setSelectedLocation({
            latitude: partnerStore.latitude,
            longitude: partnerStore.longitude,
          });
          // 可以在这里设置地址输入框的值，但App端MapModal可能处理方式不同
          // mapAddressInput 是 MapModal 的 prop，可以在这里设置
          setMapAddressInput(partnerStore.address);
          
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

  // 提交订单
  const handleSubmitOrder = async () => {
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
          '眉苗': 'POL', 'Pyin Oo Lwin': 'POL', '彬乌伦': 'POL', 'ပင်းတလဲ': 'POL',
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
      
      const orderId = generateOrderId(senderAddress);
      const now = new Date();
      
      const createTime = now.toLocaleString('zh-CN', {
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

      // 如果是 Partner 账号，强制使用店铺信息
      if (currentUser?.user_type === 'partner') {
        try {
          LoggerService.debug('正在查找合伙人店铺信息...', currentUser);
          const { data: store } = await supabase
            .from('delivery_stores')
            .select('*')
            .or(`store_code.eq.${currentUser.name},manager_phone.eq.${currentUser.phone},phone.eq.${currentUser.phone},store_name.eq.${currentUser.name}`)
            .limit(1)
            .maybeSingle();

          if (store) {
            LoggerService.debug('找到合伙人店铺，强制使用店铺坐标:', store.store_name);
            finalSenderLat = store.latitude;
            finalSenderLng = store.longitude;
            // finalSenderAddr = store.address; // 可选：是否强制覆盖地址文本
          }
        } catch (err) {
          LoggerService.error('查找合伙人店铺异常:', err);
        }
      }

      const orderData = {
        id: orderId,
        customer_id: userId,
        sender_name: senderName,
        sender_phone: senderPhone,
        sender_address: finalSenderAddr,
        sender_latitude: finalSenderLat || null,
        sender_longitude: finalSenderLng || null,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_address: extractAddress(receiverAddress),
        receiver_latitude: receiverCoordinates?.lat || null,
        receiver_longitude: receiverCoordinates?.lng || null,
        package_type: packageType,
        weight: weight,
        cod_amount: currentUser?.user_type === 'partner' ? parseFloat(codAmount || '0') : 0,
        description: description || '',
        delivery_speed: deliverySpeed,
        scheduled_delivery_time: deliverySpeed === '定时达' ? scheduledTime : '',
        delivery_distance: isCalculated ? calculatedDistance : distance,
        status: paymentMethod === 'cash' ? '待收款' : '待取件', // 现金支付：状态设为"待收款"，骑手代收
        create_time: createTime,
        pickup_time: '',
        delivery_time: '',
        courier: '待分配',
        price: isCalculated ? calculatedPrice : price,
        payment_method: paymentMethod, // 添加支付方式字段
      };

      offlinePayload = { ...orderData };

      // 调用API创建订单
      const result = await packageService.createPackage(orderData);
      
      hideLoading();

      if (result?.success) {
        await persistOrderLocally(offlinePayload, 'synced');
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
        await persistOrderLocally(offlinePayload, 'pending', result?.error?.message);
        showOfflineSavedAlert();
        return;
      }
    } catch (error: any) {
      hideLoading();
      errorService.handleError(error, { context: 'PlaceOrderScreen.handleSubmit', silent: true });
      await persistOrderLocally(offlinePayload, 'pending', error?.message);
      showOfflineSavedAlert();
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
          <BackToHomeButton navigation={navigation} color="white" />
          
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
          />

          {/* 代收款 (仅限 Partner 账号) */}
          {currentUser?.user_type === 'partner' && (
            <FadeInView delay={320}>
              <View style={styles.section}>
                <View style={styles.sectionTitleContainer}>
                  <MoneyIcon size={18} color="#1e293b" />
                  <Text style={styles.sectionTitle}> {currentT.codAmount}</Text>
                </View>
                <View style={[styles.inputGroup, { marginTop: 15 }]}>
                  <Text style={styles.label}>{currentT.codAmount} *</Text>
                  <TextInput
                    style={styles.input}
                    value={codAmount}
                    onChangeText={setCodAmount}
                    placeholder={currentT.placeholders.codAmount}
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                  />
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                    💡 {language === 'zh' ? '该金额将由骑手在取件时代收' : language === 'en' ? 'This amount will be collected by the courier upon pickup' : 'ဤပမာဏကို ကူရီယာမှ ပစ္စည်းယူစဉ် ကောက်ခံမည်ဖြစ်သည်'}
                  </Text>
                </View>
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
          />

          {/* 提交按钮 */}
          <ScaleInView delay={450}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitOrder}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <DeliveryIcon size={24} color="#ffffff" />
                <Text style={styles.submitText}>{currentT.submitOrder}</Text>
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
              colors={['#2c5282', '#2d3748']}
              style={styles.timePickerHeader}
            >
              <View style={styles.timePickerHeaderContent}>
                <Text style={styles.timePickerTitle}>{currentT.timePicker.title}</Text>
                <Text style={styles.timePickerSubtitle}>{currentT.timePicker.subtitle}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTimePicker(false)}
                style={styles.timePickerCloseButton}
              >
                <Text style={styles.timePickerCloseText}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.timePickerBody}>
              <View style={styles.quickSelectSection}>
                <Text style={styles.quickSelectTitle}>{currentT.timePicker.selectDate}</Text>
                <View style={styles.quickSelectGrid}>
                  <TouchableOpacity
                    style={[
                      styles.quickSelectButton,
                      selectedDate === 'Today' && { borderColor: '#3b82f6', backgroundColor: '#eff6ff' }
                    ]}
                    onPress={() => setSelectedDate('Today')}
                  >
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
                    <Text style={[styles.quickSelectButtonText, selectedDate === 'Tomorrow' && { color: '#3b82f6' }]}>
                      {currentT.timePicker.tomorrow}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.customTimeSection}>
                <Text style={styles.customTimeTitle}>{currentT.timePicker.selectTime}</Text>
                <View style={styles.dateTimeRow}>
                  <View style={styles.dateTimeInput}>
                    <Text style={styles.dateTimeLabel}>{currentT.timePicker.workingHours}</Text>
                    <TextInput
                      style={styles.dateTimeTextInput}
                      value={selectedTime}
                      onChangeText={setSelectedTime}
                      placeholder="例如: 14:30"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
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
                  style={styles.timePickerConfirmGradient}
                >
                  <Text style={styles.timePickerConfirmText}>{currentT.timePicker.confirm}</Text>
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
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  timePickerHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timePickerHeaderContent: {
    flex: 1,
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  timePickerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  timePickerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerCloseText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  timePickerBody: {
    padding: 24,
  },
  quickSelectSection: {
    marginBottom: 24,
  },
  quickSelectTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  quickSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickSelectButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  quickSelectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  customTimeSection: {
    marginBottom: 24,
  },
  customTimeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeInput: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  dateTimeTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 0,
  },
  timePickerCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  timePickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  timePickerConfirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  timePickerConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  timePickerConfirmText: {
    fontSize: 16,
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
});
