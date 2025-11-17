import React, { useState, useEffect } from 'react';
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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { packageService, systemSettingsService } from '../services/supabase';
import { FadeInView, ScaleInView } from '../components/Animations';
import { PackageIcon, LocationIcon, MapIcon, MoneyIcon, ClockIcon, DeliveryIcon } from '../components/Icon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PlaceOrderScreen({ navigation }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  
  // 用户信息
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  
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
  
  // QR码模态框
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [qrOrderId, setQrOrderId] = useState('');
  const [qrOrderPrice, setQrOrderPrice] = useState('');
  
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
      placeholders: {
        name: '请输入姓名',
        phone: '请输入电话号码',
        address: '请输入详细地址',
        weight: '请输入重量',
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
      placeholders: {
        name: 'Enter name',
        phone: 'Enter phone number',
        address: 'Enter detailed address',
        weight: 'Enter weight',
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
      placeholders: {
        name: 'အမည်ထည့်ပါ',
        phone: 'ဖုန်းနံပါတ်ထည့်ပါ',
        address: 'အသေးစိတ်လိပ်စာထည့်ပါ',
        weight: 'အလေးချိန်ထည့်ပါ',
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
    },
  };

  const currentT = t[language];

  // 包裹类型选项（与Web端一致）
  const packageTypes = [
    { value: '文件', label: currentT.packageTypes.document },
    { value: '标准件（45x60x15cm）和（5KG）以内', label: currentT.packageTypes.standard },
    { value: '超重件（5KG）以上', label: currentT.packageTypes.overweight },
    { value: '超规件（45x60x15cm）以上', label: currentT.packageTypes.oversized },
    { value: '易碎品', label: currentT.packageTypes.fragile },
    { value: '食品和饮料', label: currentT.packageTypes.foodDrinks },
  ];

  // 配送速度选项（从计费规则获取）
  const deliverySpeeds = [
    { value: '准时达', label: currentT.speedStandard, extra: 0 },
    { value: '急送达', label: currentT.speedExpress, extra: pricingSettings.urgent_surcharge },
    { value: '定时达', label: currentT.speedScheduled, extra: pricingSettings.scheduled_surcharge },
  ];

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
      console.error('加载用户信息失败:', error);
    }
  };

  const loadPricingSettings = async () => {
    try {
      const settings = await systemSettingsService.getPricingSettings();
      setPricingSettings(settings);
    } catch (error) {
      console.error('加载计费规则失败:', error);
    }
  };

  // 切换使用我的信息
  useEffect(() => {
    if (useMyInfo) {
      setSenderName(userName);
      setSenderPhone(userPhone);
    } else {
      setSenderName('');
      setSenderPhone('');
    }
  }, [useMyInfo]);

  // 计算价格
  // 使用当前位置（在地图Modal中）
  const useCurrentLocationInMap = async () => {
    try {
      showLoading('获取位置中...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        hideLoading();
        Alert.alert('提示', '需要位置权限才能使用此功能');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      hideLoading();
    } catch (error) {
      hideLoading();
      console.error('获取位置失败:', error);
      Alert.alert('错误', '获取位置失败');
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
        console.log('✅ 当前位置坐标已保存:', coords);
      }
      
      hideLoading();
    } catch (error) {
      hideLoading();
      console.error('获取位置失败:', error);
      Alert.alert('错误', '获取位置失败，请手动输入地址');
    }
  };

  // 打开地图选择器
  const openMapSelector = async (type: 'sender' | 'receiver') => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要位置权限才能使用地图');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setSelectedLocation(currentLocation);
      setMapType(type);
      setShowMapModal(true);
    } catch (error) {
      console.error('打开地图失败:', error);
      Alert.alert('错误', '打开地图失败');
    }
  };

  // 确认地图位置
  const confirmMapLocation = async () => {
    try {
      showLoading('获取地址中...');
      
      const address = await Location.reverseGeocodeAsync({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });

      if (address && address[0]) {
        const addr = address[0];
        const fullAddress = `${addr.street || ''} ${addr.district || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
        const finalAddress = fullAddress || `${selectedLocation.latitude}, ${selectedLocation.longitude}`;
        
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
          console.log('✅ 寄件地址坐标已保存:', coords);
        } else {
          // 将地址和坐标一起添加到输入框
          const addressWithCoords = `${finalAddress}\n📍 ${currentT.coordinates}: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
          setReceiverAddress(addressWithCoords);
          setReceiverCoordinates(coords);
          console.log('✅ 收件地址坐标已保存:', coords);
        }
      }
      
      setShowMapModal(false);
      hideLoading();
    } catch (error) {
      hideLoading();
      console.error('获取地址失败:', error);
      Alert.alert('错误', '获取地址失败');
    }
  };

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
  const calculatePrice = async () => {
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

      // 按照要求：6.1km = 7km（向上取整）
      const roundedDistance = Math.ceil(exactDistance);
      setCalculatedDistance(roundedDistance);

      // 计算各项费用
      let totalPrice = pricingSettings.base_fee; // 基础费用

      // 距离费用（超过免费公里数后收费）
      const distanceFee = Math.max(0, roundedDistance - pricingSettings.free_km_threshold) * pricingSettings.per_km_fee;
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
        totalPrice += roundedDistance * pricingSettings.oversize_surcharge;
      }
      if (packageType === '易碎品') {
        totalPrice += pricingSettings.fragile_surcharge;
      }
      if (packageType === '食品和饮料') {
        totalPrice += roundedDistance * pricingSettings.food_beverage_surcharge;
      }

      // 更新计算结果
      setCalculatedPrice(Math.round(totalPrice).toString());
      setIsCalculated(true);
      
      hideLoading();
      Alert.alert(currentT.calculateSuccess, `距离: ${roundedDistance}km\n总费用: ${Math.round(totalPrice)} MMK`);
      
    } catch (error) {
      hideLoading();
      console.error('计算费用失败:', error);
      Alert.alert(currentT.calculateFailed, '计算失败，请重试');
    }
  };

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
    // 验证必填字段
    if (!senderName || !senderPhone || !senderAddress ||
        !receiverName || !receiverPhone || !receiverAddress ||
        !packageType) {
      Alert.alert('提示', currentT.fillRequired);
      return;
    }

    // 验证重量字段（只在需要时验证）
    if (showWeightInput && !weight) {
      Alert.alert('提示', '请填写包裹重量');
      return;
    }

    // 验证定时达时间
    if (deliverySpeed === '定时达' && !scheduledTime) {
      Alert.alert('提示', '请填写指定送达时间');
      return;
    }

    try {
      showLoading(currentT.creating, 'package');

      // 生成订单ID（根据寄件地址所在城市自动选择前缀）
      const generateOrderId = (address: string) => {
        // 城市前缀映射（以曼德勒为中心）
        const cityPrefixMap: { [key: string]: string } = {
          // 曼德勒（总部）
          '曼德勒': 'MDY',
          'Mandalay': 'MDY',
          'မန္တလေး': 'MDY',
          // 眉苗
          '眉苗': 'POL',
          'Pyin Oo Lwin': 'POL',
          '彬乌伦': 'POL',
          'ပင်းတလဲ': 'POL',
          // 仰光（开发中）
          '仰光': 'YGN',
          'Yangon': 'YGN',
          'ရန်ကုန်': 'YGN',
          // 内比都（开发中）
          '内比都': 'NPW',
          'Naypyidaw': 'NPW',
          'နေပြည်တော်': 'NPW',
          // 东枝（开发中）
          '东枝': 'TGI',
          'Taunggyi': 'TGI',
          'တောင်ကြီး': 'TGI',
          // 腊戌（开发中）
          '腊戌': 'LSO',
          'Lashio': 'LSO',
          'လားရှိုး': 'LSO',
          // 木姐（开发中）
          '木姐': 'MSE',
          'Muse': 'MSE',
          'မူဆယ်': 'MSE'
        };
        
        // 判断城市前缀
        let prefix = 'MDY'; // 默认曼德勒
        for (const [city, cityPrefix] of Object.entries(cityPrefixMap)) {
          if (address.includes(city)) {
            prefix = cityPrefix;
            break;
          }
        }
        
        // 获取当前 UTC 时间
        const now = new Date();
        // 获取 UTC 时间戳（毫秒）
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
        // 缅甸时间 (UTC+6:30) = UTC + 6小时30分钟
        const myanmarTime = new Date(utcTime + (6.5 * 60 * 60 * 1000));
        
        // 使用 UTC 方法获取日期时间组件，确保时间准确
        const year = myanmarTime.getUTCFullYear();
        const month = String(myanmarTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(myanmarTime.getUTCDate()).padStart(2, '0');
        const hour = String(myanmarTime.getUTCHours()).padStart(2, '0');
        const minute = String(myanmarTime.getUTCMinutes()).padStart(2, '0');
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
      const orderData = {
        id: orderId,
        customer_id: userId,
        sender_name: senderName,
        sender_phone: senderPhone,
        sender_address: extractAddress(senderAddress),
        sender_latitude: senderCoordinates?.lat || null,
        sender_longitude: senderCoordinates?.lng || null,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_address: extractAddress(receiverAddress),
        receiver_latitude: receiverCoordinates?.lat || null,
        receiver_longitude: receiverCoordinates?.lng || null,
        package_type: packageType,
        weight: weight,
        description: description || '',
        delivery_speed: deliverySpeed,
        scheduled_delivery_time: deliverySpeed === '定时达' ? scheduledTime : '',
        delivery_distance: isCalculated ? calculatedDistance : distance,
        status: '待取件',
        create_time: createTime,
        pickup_time: '',
        delivery_time: '',
        courier: '待分配',
        price: isCalculated ? calculatedPrice : price,
      };

      // 调用API创建订单
      const result = await packageService.createPackage(orderData);
      
      hideLoading();

      if (result) { // 假设成功时 result 不为 null
        // 显示QR码模态框
        setQrOrderId(orderId);
        setQrOrderPrice(isCalculated ? calculatedPrice : price);
        setShowQRCodeModal(true);
        // 重置表单
        resetForm();
      } else {
        // 由于没有统一的错误对象，我们直接在服务层打印错误
        // 这里只给用户通用提示
        Alert.alert(
          currentT.orderFailed, 
          '创建失败，请检查网络连接或联系客服。\n错误信息已记录在控制台。'
        );
      }
    } catch (error: any) {
      hideLoading();
      // 在这里捕获并打印完整的错误信息
      console.error('【订单创建失败】捕获到异常:', error);
      Alert.alert(
        currentT.orderFailed, 
        `创建失败，请检查网络连接或联系客服。\n错误信息：${error?.message || '未知错误'}`
      );
    }
  };

  // 重置表单
  const resetForm = () => {
    setReceiverName('');
    setReceiverPhone('');
    setReceiverAddress('');
    setWeight('');
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
  const handlePackageTypeClick = (typeValue: string) => {
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
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#b0d3e8', '#7895a3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{currentT.title}</Text>
        <Text style={styles.headerSubtitle}>{currentT.subtitle}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 寄件人信息 */}
        <FadeInView delay={100}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <PackageIcon size={20} color="#1e293b" />
                <Text style={styles.sectionTitle}> {currentT.senderInfo}</Text>
              </View>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>{currentT.useMyInfo}</Text>
                <Switch
                  value={useMyInfo}
                  onValueChange={setUseMyInfo}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={useMyInfo ? '#3b82f6' : '#f3f4f6'}
                />
              </View>
            </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{currentT.senderName} *</Text>
            <TextInput
              style={styles.input}
              value={senderName}
              onChangeText={setSenderName}
              placeholder={currentT.placeholders.name}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{currentT.senderPhone} *</Text>
            <TextInput
              style={styles.input}
              value={senderPhone}
              onChangeText={setSenderPhone}
              placeholder={currentT.placeholders.phone}
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{currentT.senderAddress} *</Text>
              <TouchableOpacity onPress={() => openMapSelector('sender')}>
                <Text style={styles.linkButton}>🗺️ {currentT.openMap}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={senderAddress}
              onChangeText={(text) => {
                // 如果用户手动编辑地址，移除坐标信息
                const lines = text.split('\n');
                const addressLines = lines.filter(line => !line.includes('📍'));
                setSenderAddress(addressLines.join('\n'));
              }}
              placeholder={currentT.placeholders.address}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
            {senderCoordinates && (
              <View style={styles.coordsContainer}>
                <Text style={styles.coordsLabel}>经纬度：</Text>
                <Text style={styles.coordsText}>
                  {senderCoordinates.lat.toFixed(6)}, {senderCoordinates.lng.toFixed(6)}
                </Text>
              </View>
            )}
          </View>
        </View>
        </FadeInView>

        {/* 收件人信息 */}
        <FadeInView delay={200}>
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <LocationIcon size={20} color="#1e293b" />
              <Text style={styles.sectionTitle}> {currentT.receiverInfo}</Text>
            </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{currentT.receiverName} *</Text>
            <TextInput
              style={styles.input}
              value={receiverName}
              onChangeText={setReceiverName}
              placeholder={currentT.placeholders.name}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{currentT.receiverPhone} *</Text>
            <TextInput
              style={styles.input}
              value={receiverPhone}
              onChangeText={setReceiverPhone}
              placeholder={currentT.placeholders.phone}
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{currentT.receiverAddress} *</Text>
              <TouchableOpacity onPress={() => openMapSelector('receiver')}>
                <Text style={styles.linkButton}>🗺️ {currentT.openMap}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={receiverAddress}
              onChangeText={(text) => {
                // 如果用户手动编辑地址，移除坐标信息
                const lines = text.split('\n');
                const addressLines = lines.filter(line => !line.includes('📍'));
                setReceiverAddress(addressLines.join('\n'));
              }}
              placeholder={currentT.placeholders.address}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
            {receiverCoordinates && (
              <View style={styles.coordsContainer}>
                <Text style={styles.coordsLabel}>经纬度：</Text>
                <Text style={styles.coordsText}>
                  {receiverCoordinates.lat.toFixed(6)}, {receiverCoordinates.lng.toFixed(6)}
                </Text>
              </View>
            )}
          </View>
        </View>
        </FadeInView>

        {/* 包裹信息 */}
        <FadeInView delay={300}>
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <PackageIcon size={20} color="#1e293b" />
              <Text style={styles.sectionTitle}> {currentT.packageInfo}</Text>
            </View>

            {/* 包裹类型部分 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>包裹类型 *</Text>
              <View style={styles.chipContainer}>
                {packageTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.chip,
                      packageType === type.value && styles.chipActive
                    ]}
                    onPress={() => handlePackageTypeClick(type.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.chipText,
                      packageType === type.value && styles.chipTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 重量输入框 - 只在选择超重件或超规件时显示 */}
            {showWeightInput && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{currentT.weight} *</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder={currentT.placeholders.weight}
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* 配送选项部分 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>🚚配送选项 *</Text>
              {deliverySpeeds.map((speed) => (
                <TouchableOpacity
                  key={speed.value}
                  style={[
                    styles.radioOption,
                    deliverySpeed === speed.value && styles.radioOptionActive
                  ]}
                  onPress={() => {
                    setDeliverySpeed(speed.value);
                    if (speed.value === '定时达') {
                      setShowTimePicker(true);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.radio}>
                    {deliverySpeed === speed.value && <View style={styles.radioInner} />}
                  </View>
                    <View style={styles.radioContent}>
                    <Text style={[
                      styles.radioText,
                      deliverySpeed === speed.value && styles.radioTextActive
                    ]}>
                      {speed.label}
                    </Text>
                    {speed.extra > 0 && (
                      <Text style={styles.extraPrice}>+{speed.extra} MMK</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.description}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={currentT.placeholders.description}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
              />
            </View>
          </View>
        </FadeInView>

        {/* 价格估算 */}
        <ScaleInView delay={400}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MoneyIcon size={20} color="#1e293b" />
              <Text style={styles.sectionTitle}> {currentT.priceEstimate}</Text>
            </View>
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={calculatePrice}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.calculateButtonGradient}
              >
                <Text style={styles.calculateButtonText}>🧮 {currentT.calculateButton}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.priceCard}>
            {!isCalculated ? (
              <View style={styles.pricePlaceholder}>
                <Text style={styles.pricePlaceholderText}>
                  📊 点击"计算"按钮获取精准费用
                </Text>
                <Text style={styles.pricePlaceholderSubtext}>
                  需要先选择寄件和收件地址的精确位置
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{currentT.distance}:</Text>
                  <Text style={styles.priceValue}>{calculatedDistance} {currentT.kmUnit}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{currentT.basePrice}:</Text>
                  <Text style={styles.priceValue}>{pricingSettings.base_fee} MMK</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{currentT.distancePrice}:</Text>
                  <Text style={styles.priceValue}>
                    {Math.round(Math.max(0, calculatedDistance - pricingSettings.free_km_threshold) * pricingSettings.per_km_fee)} MMK
                  </Text>
                </View>
                {packageType === '超重件（5KG）以上' && parseFloat(weight || '0') > 5 && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>超重附加费:</Text>
                    <Text style={styles.priceValue}>
                      {Math.round(Math.max(0, parseFloat(weight) - 5) * pricingSettings.weight_surcharge)} MMK
                    </Text>
                  </View>
                )}
                {deliverySpeed !== '准时达' && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>{currentT.speedPrice}:</Text>
                    <Text style={styles.priceValue}>
                      {deliverySpeeds.find(s => s.value === deliverySpeed)?.extra || 0} MMK
                    </Text>
                  </View>
                )}
                {packageType === '超规件（45x60x15cm）以上' && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>超规附加费:</Text>
                    <Text style={styles.priceValue}>
                      {Math.round(calculatedDistance * pricingSettings.oversize_surcharge)} MMK
                    </Text>
                  </View>
                )}
                {packageType === '易碎品' && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>易碎品附加费:</Text>
                    <Text style={styles.priceValue}>{pricingSettings.fragile_surcharge} MMK</Text>
                  </View>
                )}
                {packageType === '食品和饮料' && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>食品附加费:</Text>
                    <Text style={styles.priceValue}>
                      {Math.round(calculatedDistance * pricingSettings.food_beverage_surcharge)} MMK
                    </Text>
                  </View>
                )}
                <View style={styles.priceDivider} />
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabelTotal}>{currentT.totalPrice}:</Text>
                  <Text style={styles.priceTotal}>{calculatedPrice} MMK</Text>
                </View>
              </>
            )}
          </View>
        </View>
        </ScaleInView>

        {/* 提交按钮 */}
        <ScaleInView delay={500}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitOrder}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>{currentT.submitOrder}</Text>
              <Text style={styles.submitPrice}>
                {isCalculated ? calculatedPrice : '0'} MMK
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScaleInView>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 地图选择模态框 */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setShowMapModal(false)}>
              <Text style={styles.mapCloseButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.mapTitle}>
              {mapType === 'sender' ? currentT.senderAddress : currentT.receiverAddress}
            </Text>
            <View style={styles.mapHeaderButtons}>
              <TouchableOpacity onPress={useCurrentLocationInMap} style={styles.mapCurrentLocationButton}>
                <Text style={styles.mapCurrentLocationText}>📍 {currentT.useCurrentLocation}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmMapLocation}>
                <Text style={styles.mapConfirmButton}>✓</Text>
              </TouchableOpacity>
            </View>
          </View>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={(e) => {
              setSelectedLocation(e.nativeEvent.coordinate);
              setSelectedPlace(null); // 清除POI选择
            }}
            onPoiClick={(e) => {
              // 点击POI时自动选择该位置
              setSelectedLocation(e.nativeEvent.coordinate);
              setSelectedPlace({
                name: e.nativeEvent.name || '选中位置',
                address: e.nativeEvent.name || '未知地址'
              });
            }}
          >
            {/* 主标记 - 用户选择的位置 */}
            <Marker
              coordinate={selectedLocation}
              draggable
              onDragEnd={(e) => {
                setSelectedLocation(e.nativeEvent.coordinate);
                setSelectedPlace(null); // 拖动时清除POI选择
              }}
              title="选择的位置"
              description="拖动或点击地图调整位置"
            />
          </MapView>

          <View style={styles.mapFooter}>
            <Text style={styles.mapInstructions}>
              📍 点击地图、拖动标记或点击店铺图标选择位置
            </Text>
            {selectedPlace && (
              <View style={styles.selectedPlaceInfo}>
                <Text style={styles.selectedPlaceName}>✅ 已选择: {selectedPlace.name}</Text>
                <Text style={styles.selectedPlaceAddress}>{selectedPlace.address}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 包裹类型说明模态框 */}
      <Modal
        visible={showPackageTypeInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPackageTypeInfo(false)}
      >
        <TouchableOpacity 
          style={styles.infoModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPackageTypeInfo(false)}
        >
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalCard}>
              <View style={styles.infoModalHeader}>
                <Text style={styles.infoModalTitle}>📦 {currentT.packageTypeInfo.title}</Text>
                <TouchableOpacity onPress={() => setShowPackageTypeInfo(false)}>
                  <Text style={styles.infoModalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.infoModalBody}>
                {selectedPackageTypeInfo === '标准件（45x60x15cm）和（5KG）以内' && (
                  <>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>📏 {currentT.packageTypeInfo.sizeLimit}：</Text>
                      <Text style={styles.infoValue}>45 × 60 × 15 cm 以内</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>⚖️ {currentT.packageTypeInfo.weightLimit}：</Text>
                      <Text style={styles.infoValue}>5 KG 以内</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>💡 {currentT.packageTypeInfo.description}：</Text>
                      <Text style={styles.infoDescription}>
                        {currentT.packageTypeInfo.standardDescription}
                      </Text>
                    </View>
                  </>
                )}
                
                {selectedPackageTypeInfo === '超重件（5KG）以上' && (
                  <>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>⚖️ {currentT.packageTypeInfo.weightRequirement}：</Text>
                      <Text style={styles.infoValue}>5 KG 以上</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>💡 {currentT.packageTypeInfo.description}：</Text>
                      <Text style={styles.infoDescription}>
                        {currentT.packageTypeInfo.overweightDescription}
                      </Text>
                    </View>
                  </>
                )}
                
                {selectedPackageTypeInfo === '超规件（45x60x15cm）以上' && (
                  <>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>📏 {currentT.packageTypeInfo.sizeRequirement}：</Text>
                      <Text style={styles.infoValue}>45 × 60 × 15 cm 以上</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>💡 {currentT.packageTypeInfo.description}：</Text>
                      <Text style={styles.infoDescription}>
                        {currentT.packageTypeInfo.oversizedDescription}
                      </Text>
                    </View>
                  </>
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.infoModalButton}
                onPress={() => setShowPackageTypeInfo(false)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.infoModalButtonGradient}
                >
                  <Text style={styles.infoModalButtonText}>{currentT.packageTypeInfo.understood}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 时间选择器模态框 */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContent}>
            <LinearGradient
              colors={['#b0d3e8', '#7895a3']}
              style={styles.timePickerHeader}
            >
              <View style={styles.timePickerHeaderContent}>
                <Text style={styles.timePickerTitle}>🕐 选择配送时间</Text>
                <Text style={styles.timePickerSubtitle}>请选择您希望的配送时间</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTimePicker(false)}
                style={styles.timePickerCloseButton}
              >
                <Text style={styles.timePickerCloseText}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.timePickerBody}>
              {/* 快速选择时间 */}
              <View style={styles.quickSelectSection}>
                <Text style={styles.quickSelectTitle}>⚡ 快速选择</Text>
                <View style={styles.quickSelectGrid}>
                  {[
                    { label: '今天下午', value: 'today-afternoon' },
                    { label: '明天上午', value: 'tomorrow-morning' },
                    { label: '明天下午', value: 'tomorrow-afternoon' },
                    { label: '后天上午', value: 'day-after-morning' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        const now = new Date();
                        let targetDate = new Date();
                        let targetTime = '';

                        switch (option.value) {
                          case 'today-afternoon':
                            targetTime = '14:00';
                            break;
                          case 'tomorrow-morning':
                            targetDate.setDate(now.getDate() + 1);
                            targetTime = '09:00';
                            break;
                          case 'tomorrow-afternoon':
                            targetDate.setDate(now.getDate() + 1);
                            targetTime = '14:00';
                            break;
                          case 'day-after-morning':
                            targetDate.setDate(now.getDate() + 2);
                            targetTime = '09:00';
                            break;
                        }

                        setSelectedDate(targetDate.toISOString().split('T')[0]);
                        setSelectedTime(targetTime);
                      }}
                      style={styles.quickSelectButton}
                    >
                      <Text style={styles.quickSelectButtonText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 自定义时间选择 */}
              <View style={styles.customTimeSection}>
                <Text style={styles.customTimeTitle}>📅 自定义时间</Text>
                
                <View style={styles.dateTimeRow}>
                  <View style={styles.dateTimeInput}>
                    <Text style={styles.dateTimeLabel}>日期</Text>
                    <TextInput
                      style={styles.dateTimeTextInput}
                      value={selectedDate}
                      onChangeText={setSelectedDate}
                      placeholder="选择日期"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  
                  <View style={styles.dateTimeInput}>
                    <Text style={styles.dateTimeLabel}>时间</Text>
                    <TextInput
                      style={styles.dateTimeTextInput}
                      value={selectedTime}
                      onChangeText={setSelectedTime}
                      placeholder="选择时间"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.timePickerButtons}>
              <TouchableOpacity
                style={styles.timePickerCancelButton}
                onPress={() => {
                  setShowTimePicker(false);
                  setDeliverySpeed('准时达');
                }}
              >
                <Text style={styles.timePickerCancelText}>❌ 取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timePickerConfirmButton}
                onPress={() => {
                  if (selectedDate && selectedTime) {
                    const formattedDateTime = `${selectedDate} ${selectedTime}`;
                    setScheduledTime(formattedDateTime);
                    setShowTimePicker(false);
                  } else {
                    Alert.alert('提示', '请选择日期和时间');
                  }
                }}
              >
                <LinearGradient
                  colors={['#38a169', '#48bb78']}
                  style={styles.timePickerConfirmGradient}
                >
                  <Text style={styles.timePickerConfirmText}>✅ 确认时间</Text>
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
              colors={['#2E86AB', '#4CA1CF']}
              style={styles.qrModalHeader}
            >
              <Text style={styles.qrModalTitle}>✅ {currentT.orderSuccess}</Text>
            </LinearGradient>

            <View style={styles.qrModalBody}>
              <Text style={styles.qrInfoText}>📦 {currentT.orderNumber}</Text>
              <Text style={styles.qrOrderId}>{qrOrderId}</Text>
              
              <Text style={styles.qrInfoText}>💰 {currentT.totalAmount}</Text>
              <Text style={styles.qrOrderPrice}>{qrOrderPrice} MMK</Text>

              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={qrOrderId}
                    size={200}
                    color="#2E86AB"
                    backgroundColor="white"
                  />
                </View>
                <Text style={styles.qrHint}>
                  {currentT.qrHint}
                </Text>
              </View>
            </View>

            <View style={styles.qrModalButtons}>
              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => {
                  setShowQRCodeModal(false);
                  navigation.navigate('MyOrders');
                }}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.qrButtonGradient}
                >
                  <Text style={styles.qrButtonText}>📋 {currentT.viewOrders}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => {
                  setShowQRCodeModal(false);
                  resetForm();
                }}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.qrButtonGradient}
                >
                  <Text style={styles.qrButtonText}>➕ {currentT.continueOrder}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
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
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 14,
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
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  submitText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
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
    fontSize: 20,
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
    fontSize: 22,
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
    fontSize: 16,
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
});
