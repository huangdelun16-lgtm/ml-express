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
  
  // 配送选项
  const [deliverySpeed, setDeliverySpeed] = useState('准时达');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // 价格
  const [price, setPrice] = useState('0');
  const [distance, setDistance] = useState(0);
  
  // 地图相关
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapType, setMapType] = useState<'sender' | 'receiver'>('sender');
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 21.9588,
    longitude: 96.0891,
  });
  
  // 包裹类型说明
  const [showPackageTypeInfo, setShowPackageTypeInfo] = useState(false);
  const [selectedPackageTypeInfo, setSelectedPackageTypeInfo] = useState('');
  
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
      packageTypes: {
        document: 'စာရွက်စာတမ်း',
        standard: 'စံပါဆယ်',
        overweight: 'အလေးချိန်ပိုပါဆယ်',
        oversized: 'အရွယ်အစားကြီးပါဆယ်',
        fragile: 'ကျိုးပဲ့လွယ်သောပစ္စည်း',
        foodDrinks: 'အစားအသောက်',
      },
      packageTypeDetails: {
        standard: 'စံပါဆယ် (45x60x15cm) နှင့် (5KG) အောက်',
        overweight: 'အလေးချိန်ပိုပါဆယ် (5KG အထက်)',
        oversized: 'အရွယ်အစားကြီးပါဆယ် (45x60x15cm အထက်)',
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
  useEffect(() => {
    calculatePrice();
  }, [weight, deliverySpeed, distance, packageType, pricingSettings]);

  const calculatePrice = () => {
    // 基础价格（起步价）
    let totalPrice = pricingSettings.base_fee;
    
    // 1. 距离费用（超过免费公里数部分）
    const chargeableDistance = Math.max(0, distance - pricingSettings.free_km_threshold);
    totalPrice += chargeableDistance * pricingSettings.per_km_fee;
    
    // 2. 重量附加费（超重件：重量超过5KG的部分）
    if (packageType === '超重件（5KG）以上') {
      const weightValue = parseFloat(weight || '0');
      const excessWeight = Math.max(0, weightValue - 5);
      totalPrice += excessWeight * pricingSettings.weight_surcharge;
    }
    
    // 3. 配送速度附加费
    if (deliverySpeed === '急送达') {
      totalPrice += pricingSettings.urgent_surcharge;
    } else if (deliverySpeed === '定时达') {
      totalPrice += pricingSettings.scheduled_surcharge;
    }
    
    // 4. 包裹类型附加费
    if (packageType === '超规件（45x60x15cm）以上') {
      // 超规件：按距离计算附加费
      totalPrice += distance * pricingSettings.oversize_surcharge;
    } else if (packageType === '易碎品') {
      // 易碎品：固定附加费
      totalPrice += pricingSettings.fragile_surcharge;
    } else if (packageType === '食品和饮料') {
      // 食品和饮料：按距离计算附加费
      totalPrice += distance * pricingSettings.food_beverage_surcharge;
    }
    
    setPrice(Math.round(totalPrice).toString());
  };

  // 使用当前位置
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
        setSenderAddress(fullAddress || `${location.coords.latitude}, ${location.coords.longitude}`);
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
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
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
        
        if (mapType === 'sender') {
          setSenderAddress(finalAddress);
        } else {
          setReceiverAddress(finalAddress);
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

  // 提交订单
  const handleSubmitOrder = async () => {
    // 验证必填字段
    if (!senderName || !senderPhone || !senderAddress ||
        !receiverName || !receiverPhone || !receiverAddress ||
        !packageType || !weight) {
      Alert.alert('提示', currentT.fillRequired);
      return;
    }

    // 验证定时达时间
    if (deliverySpeed === '定时达' && !scheduledTime) {
      Alert.alert('提示', '请填写指定送达时间');
      return;
    }

    try {
      showLoading(currentT.creating, 'package');

      // 生成订单ID（与Web端格式一致：MDY年月日时分随机数）
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const random1 = Math.floor(Math.random() * 10);
      const random2 = Math.floor(Math.random() * 10);
      const orderId = `MDY${year}${month}${day}${hour}${minute}${random1}${random2}`;
      
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
        sender_address: senderAddress,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_address: receiverAddress,
        package_type: packageType,
        weight: weight,
        // 核心修正：确保 description 字段包含客户ID标记
        description: `${description || ''} [客户ID: ${userId}]`.trim(),
        delivery_speed: deliverySpeed,
        scheduled_delivery_time: deliverySpeed === '定时达' ? scheduledTime : '',
        delivery_distance: distance,
        status: '待取件',
        create_time: createTime,
        pickup_time: '',
        delivery_time: '',
        courier: '待分配',
        price: price,
      };

      // 调用API创建订单
      const result = await packageService.createPackage(orderData);
      
      hideLoading();

      if (result) { // 假设成功时 result 不为 null
        // 显示QR码模态框
        setQrOrderId(orderId);
        setQrOrderPrice(price);
        setShowQRCodeModal(true);
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
  };

  // 处理包裹类型点击
  const handlePackageTypeClick = (typeValue: string) => {
    setPackageType(typeValue);
    
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📦 {currentT.senderInfo}</Text>
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
              <TouchableOpacity onPress={useCurrentLocation}>
                <Text style={styles.linkButton}>📍 {currentT.useCurrentLocation}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={senderAddress}
              onChangeText={setSenderAddress}
              placeholder={currentT.placeholders.address}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* 收件人信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📮 {currentT.receiverInfo}</Text>

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
              onChangeText={setReceiverAddress}
              placeholder={currentT.placeholders.address}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* 包裹信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 {currentT.packageInfo}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{currentT.packageType} *</Text>
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

        {/* 配送选项 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚚 {currentT.deliveryOptions}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{currentT.deliverySpeed} *</Text>
            {deliverySpeeds.map((speed) => (
              <TouchableOpacity
                key={speed.value}
                style={[
                  styles.radioOption,
                  deliverySpeed === speed.value && styles.radioOptionActive
                ]}
                onPress={() => setDeliverySpeed(speed.value)}
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

          {deliverySpeed === '定时达' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.scheduledTime} *</Text>
              <TextInput
                style={styles.input}
                value={scheduledTime}
                onChangeText={setScheduledTime}
                placeholder={currentT.placeholders.scheduledTime}
                placeholderTextColor="#9ca3af"
              />
            </View>
          )}
        </View>

        {/* 价格估算 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 {currentT.priceEstimate}</Text>

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{currentT.distance}:</Text>
              <Text style={styles.priceValue}>~{distance} {currentT.kmUnit}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{currentT.basePrice}:</Text>
              <Text style={styles.priceValue}>{pricingSettings.base_fee} MMK</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{currentT.distancePrice}:</Text>
              <Text style={styles.priceValue}>
                {Math.round(Math.max(0, distance - pricingSettings.free_km_threshold) * pricingSettings.per_km_fee)} MMK
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
                  {Math.round(distance * pricingSettings.oversize_surcharge)} MMK
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
                  {Math.round(distance * pricingSettings.food_beverage_surcharge)} MMK
                </Text>
              </View>
            )}
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceLabelTotal}>{currentT.totalPrice}:</Text>
              <Text style={styles.priceTotal}>{price} MMK</Text>
            </View>
          </View>
        </View>

        {/* 提交按钮 */}
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
            <Text style={styles.submitPrice}>{price} MMK</Text>
          </LinearGradient>
        </TouchableOpacity>

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
            <TouchableOpacity onPress={confirmMapLocation}>
              <Text style={styles.mapConfirmButton}>✓</Text>
            </TouchableOpacity>
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
            onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
          >
            <Marker
              coordinate={selectedLocation}
              draggable
              onDragEnd={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
            />
          </MapView>

          <View style={styles.mapFooter}>
            <Text style={styles.mapInstructions}>
              📍 点击地图或拖动标记选择位置
            </Text>
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
                <Text style={styles.infoModalTitle}>📦 包裹类型说明</Text>
                <TouchableOpacity onPress={() => setShowPackageTypeInfo(false)}>
                  <Text style={styles.infoModalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.infoModalBody}>
                {selectedPackageTypeInfo === '标准件（45x60x15cm）和（5KG）以内' && (
                  <>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>📏 尺寸限制：</Text>
                      <Text style={styles.infoValue}>45 × 60 × 15 cm 以内</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>⚖️ 重量限制：</Text>
                      <Text style={styles.infoValue}>5 KG 以内</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>💡 说明：</Text>
                      <Text style={styles.infoDescription}>
                        适用于常规大小的包裹，如衣物、文件、小型物品等。
                      </Text>
                    </View>
                  </>
                )}
                
                {selectedPackageTypeInfo === '超重件（5KG）以上' && (
                  <>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>⚖️ 重量要求：</Text>
                      <Text style={styles.infoValue}>5 KG 以上</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>💡 说明：</Text>
                      <Text style={styles.infoDescription}>
                        适用于重量超过5公斤的包裹。重物品需要额外运费，请确保包装牢固。
                      </Text>
                    </View>
                  </>
                )}
                
                {selectedPackageTypeInfo === '超规件（45x60x15cm）以上' && (
                  <>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>📏 尺寸要求：</Text>
                      <Text style={styles.infoValue}>45 × 60 × 15 cm 以上</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>💡 说明：</Text>
                      <Text style={styles.infoDescription}>
                        适用于尺寸超过标准的大型包裹。大件物品需要额外运费，请提前联系确认是否可以运输。
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
                  <Text style={styles.infoModalButtonText}>我知道了</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
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
});
