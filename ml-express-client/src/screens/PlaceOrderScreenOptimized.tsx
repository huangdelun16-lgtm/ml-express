import React, { useState, useEffect, useReducer, useMemo, useCallback } from 'react';
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

// 定义状态类型
interface OrderFormState {
  // 用户信息
  userId: string;
  userName: string;
  userPhone: string;
  
  // 寄件人信息
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  useMyInfo: boolean;
  
  // 收件人信息
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  
  // 包裹信息
  packageType: string;
  weight: string;
  description: string;
  
  // 配送选项
  deliverySpeed: string;
  scheduledTime: string;
  
  // 价格和距离
  price: string;
  distance: number;
  
  // 地图相关
  showMapModal: boolean;
  mapType: 'sender' | 'receiver';
  selectedLocation: {
    latitude: number;
    longitude: number;
  };
  
  // 包裹类型说明
  showPackageTypeInfo: boolean;
  selectedPackageTypeInfo: string;
  
  // QR码模态框
  showQRCodeModal: boolean;
  qrOrderId: string;
  qrOrderPrice: string;
  
  // 计费规则
  pricingSettings: {
    base_fee: number;
    per_km_fee: number;
    weight_surcharge: number;
    urgent_surcharge: number;
    scheduled_surcharge: number;
    oversize_surcharge: number;
    fragile_surcharge: number;
    food_beverage_surcharge: number;
    free_km_threshold: number;
  };
}

// 初始状态
const initialState: OrderFormState = {
  userId: '',
  userName: '',
  userPhone: '',
  senderName: '',
  senderPhone: '',
  senderAddress: '',
  useMyInfo: true,
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  packageType: '文件',
  weight: '',
  description: '',
  deliverySpeed: '准时达',
  scheduledTime: '',
  price: '0',
  distance: 0,
  showMapModal: false,
  mapType: 'sender',
  selectedLocation: {
    latitude: 21.9588,
    longitude: 96.0891,
  },
  showPackageTypeInfo: false,
  selectedPackageTypeInfo: '',
  showQRCodeModal: false,
  qrOrderId: '',
  qrOrderPrice: '',
  pricingSettings: {
    base_fee: 1000,
    per_km_fee: 500,
    weight_surcharge: 150,
    urgent_surcharge: 1500,
    scheduled_surcharge: 500,
    oversize_surcharge: 300,
    fragile_surcharge: 400,
    food_beverage_surcharge: 300,
    free_km_threshold: 3,
  },
};

// Action 类型
type OrderFormAction =
  | { type: 'SET_USER_INFO'; payload: { userId: string; userName: string; userPhone: string } }
  | { type: 'SET_SENDER_INFO'; payload: { name: string; phone: string; address: string } }
  | { type: 'SET_RECEIVER_INFO'; payload: { name: string; phone: string; address: string } }
  | { type: 'SET_PACKAGE_INFO'; payload: { type: string; weight: string; description: string } }
  | { type: 'SET_DELIVERY_OPTIONS'; payload: { speed: string; scheduledTime: string } }
  | { type: 'SET_PRICE'; payload: string }
  | { type: 'SET_DISTANCE'; payload: number }
  | { type: 'SET_USE_MY_INFO'; payload: boolean }
  | { type: 'SET_MAP_MODAL'; payload: { show: boolean; type?: 'sender' | 'receiver' } }
  | { type: 'SET_SELECTED_LOCATION'; payload: { latitude: number; longitude: number } }
  | { type: 'SET_PACKAGE_TYPE_INFO'; payload: { show: boolean; type?: string } }
  | { type: 'SET_QR_MODAL'; payload: { show: boolean; orderId?: string; price?: string } }
  | { type: 'SET_PRICING_SETTINGS'; payload: any }
  | { type: 'RESET_FORM' };

// Reducer
function orderFormReducer(state: OrderFormState, action: OrderFormAction): OrderFormState {
  switch (action.type) {
    case 'SET_USER_INFO':
      return {
        ...state,
        userId: action.payload.userId,
        userName: action.payload.userName,
        userPhone: action.payload.userPhone,
      };
    case 'SET_SENDER_INFO':
      return {
        ...state,
        senderName: action.payload.name,
        senderPhone: action.payload.phone,
        senderAddress: action.payload.address,
      };
    case 'SET_RECEIVER_INFO':
      return {
        ...state,
        receiverName: action.payload.name,
        receiverPhone: action.payload.phone,
        receiverAddress: action.payload.address,
      };
    case 'SET_PACKAGE_INFO':
      return {
        ...state,
        packageType: action.payload.type,
        weight: action.payload.weight,
        description: action.payload.description,
      };
    case 'SET_DELIVERY_OPTIONS':
      return {
        ...state,
        deliverySpeed: action.payload.speed,
        scheduledTime: action.payload.scheduledTime,
      };
    case 'SET_PRICE':
      return { ...state, price: action.payload };
    case 'SET_DISTANCE':
      return { ...state, distance: action.payload };
    case 'SET_USE_MY_INFO':
      return { ...state, useMyInfo: action.payload };
    case 'SET_MAP_MODAL':
      return {
        ...state,
        showMapModal: action.payload.show,
        mapType: action.payload.type || state.mapType,
      };
    case 'SET_SELECTED_LOCATION':
      return {
        ...state,
        selectedLocation: {
          latitude: action.payload.latitude,
          longitude: action.payload.longitude,
        },
      };
    case 'SET_PACKAGE_TYPE_INFO':
      return {
        ...state,
        showPackageTypeInfo: action.payload.show,
        selectedPackageTypeInfo: action.payload.type || '',
      };
    case 'SET_QR_MODAL':
      return {
        ...state,
        showQRCodeModal: action.payload.show,
        qrOrderId: action.payload.orderId || '',
        qrOrderPrice: action.payload.price || '',
      };
    case 'SET_PRICING_SETTINGS':
      return { ...state, pricingSettings: action.payload };
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
}

export default function PlaceOrderScreen({ navigation }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  
  // 使用 useReducer 管理状态
  const [state, dispatch] = useReducer(orderFormReducer, initialState);

  // 多语言翻译 - 使用 useMemo 缓存
  const translations = useMemo(() => ({
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
      receiverAddress: '收件地址',
      packageInfo: '包裹信息',
      packageType: '包裹类型',
      weight: '重量 (kg)',
      description: '包裹描述',
      deliveryOptions: '配送选项',
      deliverySpeed: '配送速度',
      scheduledTime: '预约时间',
      price: '价格',
      submitOrder: '提交订单',
      orderSuccess: '订单创建成功',
      orderNumber: '订单号',
      totalAmount: '总金额',
      qrHint: '请保存此二维码，用于取件和追踪',
      viewOrders: '查看订单',
      continueOrder: '继续下单',
      // ... 其他翻译
    },
    en: {
      title: 'Place Order',
      subtitle: 'Please fill in order information',
      senderInfo: 'Sender Information',
      useMyInfo: 'Use My Information',
      senderName: 'Sender Name',
      senderPhone: 'Sender Phone',
      senderAddress: 'Pickup Address',
      useCurrentLocation: 'Use Current Location',
      openMap: 'Open Map',
      receiverInfo: 'Receiver Information',
      receiverName: 'Receiver Name',
      receiverPhone: 'Receiver Phone',
      receiverAddress: 'Delivery Address',
      packageInfo: 'Package Information',
      packageType: 'Package Type',
      weight: 'Weight (kg)',
      description: 'Package Description',
      deliveryOptions: 'Delivery Options',
      deliverySpeed: 'Delivery Speed',
      scheduledTime: 'Scheduled Time',
      price: 'Price',
      submitOrder: 'Submit Order',
      orderSuccess: 'Order Created Successfully',
      orderNumber: 'Order Number',
      totalAmount: 'Total Amount',
      qrHint: 'Please save this QR code for pickup and tracking',
      viewOrders: 'View Orders',
      continueOrder: 'Continue Order',
      // ... 其他翻译
    },
    my: {
      title: 'အမှာစာတင်ရန်',
      subtitle: 'ကျေးဇူးပြု၍အမှာစာအချက်အလက်များကိုဖြည့်စွက်ပါ',
      senderInfo: 'ပို့သူအချက်အလက်',
      useMyInfo: 'ကျွန်ုပ်၏အချက်အလက်ကိုအသုံးပြုရန်',
      senderName: 'ပို့သူအမည်',
      senderPhone: 'ပို့သူဖုန်း',
      senderAddress: 'ကောက်ယူမည့်လိပ်စာ',
      useCurrentLocation: 'လက်ရှိတည်နေရာကိုအသုံးပြုရန်',
      openMap: 'မြေပုံဖွင့်ရန်',
      receiverInfo: 'လက်ခံသူအချက်အလက်',
      receiverName: 'လက်ခံသူအမည်',
      receiverPhone: 'လက်ခံသူဖုန်း',
      receiverAddress: 'ပို့ဆောင်မည့်လိပ်စာ',
      packageInfo: 'ပါဆယ်အချက်အလက်',
      packageType: 'ပါဆယ်အမျိုးအစား',
      weight: 'အလေးချိန် (kg)',
      description: 'ပါဆယ်ဖော်ပြချက်',
      deliveryOptions: 'ပို့ဆောင်မှုရွေးချယ်စရာများ',
      deliverySpeed: 'ပို့ဆောင်မှုအမြန်နှုန်း',
      scheduledTime: 'စီစဉ်ထားသောအချိန်',
      price: 'ဈေးနှုန်း',
      submitOrder: 'အမှာစာတင်ရန်',
      orderSuccess: 'အမှာစာဖန်တီးမှုအောင်မြင်',
      orderNumber: 'အမှာစာနံပါတ်',
      totalAmount: 'စုစုပေါင်းပမာဏ',
      qrHint: 'ကောက်ယူမှုနှင့်ခြေရာခံမှုအတွက် ဤQR ကုဒ်ကိုသိမ်းဆည်းပါ',
      viewOrders: 'အမှာစာများကြည့်ရှုရန်',
      continueOrder: 'အမှာစာဆက်လက်တင်ရန်',
      // ... 其他翻译
    },
  }), []);

  const currentT = translations[language] || translations.zh;

  // 包裹类型选项 - 使用 useMemo 缓存
  const packageTypes = useMemo(() => [
    { value: '文件', label: currentT.packageTypes?.document || '文件' },
    { value: '标准件（45x60x15cm）和（5KG）以内', label: currentT.packageTypes?.standard || '标准件' },
    { value: '超重件（5KG）以上', label: currentT.packageTypes?.overweight || '超重件' },
    { value: '超规件（45x60x15cm）以上', label: currentT.packageTypes?.oversized || '超规件' },
    { value: '易碎品', label: currentT.packageTypes?.fragile || '易碎品' },
    { value: '食品和饮料', label: currentT.packageTypes?.foodDrinks || '食品和饮料' },
  ], [currentT]);

  // 配送速度选项 - 使用 useMemo 缓存
  const deliverySpeeds = useMemo(() => [
    { value: '准时达', label: currentT.speedStandard || '准时达', extra: 0 },
    { value: '急送达', label: currentT.speedExpress || '急送达', extra: state.pricingSettings.urgent_surcharge },
    { value: '定时达', label: currentT.speedScheduled || '定时达', extra: state.pricingSettings.scheduled_surcharge },
  ], [currentT, state.pricingSettings]);

  // 价格计算 - 使用 useMemo 缓存
  const calculatedPrice = useMemo(() => {
    if (!state.weight || state.distance === 0) return '0';
    
    const weightNum = parseFloat(state.weight) || 0;
    const distanceKm = Math.max(0, state.distance - state.pricingSettings.free_km_threshold);
    
    let totalPrice = state.pricingSettings.base_fee;
    totalPrice += distanceKm * state.pricingSettings.per_km_fee;
    totalPrice += weightNum * state.pricingSettings.weight_surcharge;
    
    // 根据包裹类型添加附加费
    switch (state.packageType) {
      case '超重件（5KG）以上':
        totalPrice += state.pricingSettings.oversize_surcharge;
        break;
      case '易碎品':
        totalPrice += state.pricingSettings.fragile_surcharge;
        break;
      case '食品和饮料':
        totalPrice += state.pricingSettings.food_beverage_surcharge;
        break;
    }
    
    // 根据配送速度添加附加费
    const selectedSpeed = deliverySpeeds.find(speed => speed.value === state.deliverySpeed);
    if (selectedSpeed) {
      totalPrice += selectedSpeed.extra;
    }
    
    return Math.round(totalPrice).toString();
  }, [state.weight, state.distance, state.packageType, state.deliverySpeed, state.pricingSettings, deliverySpeeds]);

  // 更新价格
  useEffect(() => {
    dispatch({ type: 'SET_PRICE', payload: calculatedPrice });
  }, [calculatedPrice]);

  // 加载用户信息和计费规则 - 使用 useCallback 优化
  const loadUserInfo = useCallback(async () => {
    try {
      const id = await AsyncStorage.getItem('userId');
      const name = await AsyncStorage.getItem('userName');
      const phone = await AsyncStorage.getItem('userPhone');
      
      if (id && name && phone) {
        dispatch({ type: 'SET_USER_INFO', payload: { userId: id, userName: name, userPhone: phone } });
        
        if (state.useMyInfo) {
          dispatch({ type: 'SET_SENDER_INFO', payload: { name, phone, address: state.senderAddress } });
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  }, [state.useMyInfo, state.senderAddress]);

  const loadPricingSettings = useCallback(async () => {
    try {
      const settings = await systemSettingsService.getPricingSettings();
      if (settings) {
        dispatch({ type: 'SET_PRICING_SETTINGS', payload: settings });
      }
    } catch (error) {
      console.error('加载计费规则失败:', error);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadUserInfo();
    loadPricingSettings();
  }, [loadUserInfo, loadPricingSettings]);

  // 使用当前位置 - 使用 useCallback 优化
  const useCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限被拒绝', '需要位置权限来获取当前位置');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      dispatch({ type: 'SET_SELECTED_LOCATION', payload: { latitude, longitude } });
      
      // 获取地址信息
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses.length > 0) {
        const address = addresses[0];
        const addressString = `${address.city || ''} ${address.district || ''} ${address.street || ''}`.trim();
        dispatch({ type: 'SET_SENDER_INFO', payload: { 
          name: state.senderName, 
          phone: state.senderPhone, 
          address: addressString 
        }});
      }
    } catch (error) {
      console.error('获取当前位置失败:', error);
      Alert.alert('错误', '获取当前位置失败');
    }
  }, [state.senderName, state.senderPhone]);

  // 打开地图选择器 - 使用 useCallback 优化
  const openMapSelector = useCallback((type: 'sender' | 'receiver') => {
    dispatch({ type: 'SET_MAP_MODAL', payload: { show: true, type } });
  }, []);

  // 确认地图位置 - 使用 useCallback 优化
  const confirmMapLocation = useCallback(async () => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: state.selectedLocation.latitude,
        longitude: state.selectedLocation.longitude,
      });
      
      if (addresses.length > 0) {
        const address = addresses[0];
        const addressString = `${address.city || ''} ${address.district || ''} ${address.street || ''}`.trim();
        
        if (state.mapType === 'sender') {
          dispatch({ type: 'SET_SENDER_INFO', payload: { 
            name: state.senderName, 
            phone: state.senderPhone, 
            address: addressString 
          }});
        } else {
          dispatch({ type: 'SET_RECEIVER_INFO', payload: { 
            name: state.receiverName, 
            phone: state.receiverPhone, 
            address: addressString 
          }});
        }
      }
      
      dispatch({ type: 'SET_MAP_MODAL', payload: { show: false } });
    } catch (error) {
      console.error('获取地址失败:', error);
      Alert.alert('错误', '获取地址失败');
    }
  }, [state.selectedLocation, state.mapType, state.senderName, state.senderPhone, state.receiverName, state.receiverPhone]);

  // 处理包裹类型点击 - 使用 useCallback 优化
  const handlePackageTypeClick = useCallback((type: string) => {
    dispatch({ type: 'SET_PACKAGE_TYPE_INFO', payload: { show: true, type } });
  }, []);

  // 提交订单 - 使用 useCallback 优化
  const handleSubmitOrder = useCallback(async () => {
    // 验证表单
    if (!state.senderName || !state.senderPhone || !state.senderAddress ||
        !state.receiverName || !state.receiverPhone || !state.receiverAddress ||
        !state.weight) {
      Alert.alert('提示', '请填写所有必填字段');
      return;
    }

    showLoading('正在提交订单...');

    try {
      // 生成订单号
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const random1 = Math.floor(Math.random() * 10);
      const random2 = Math.floor(Math.random() * 10);
      const orderId = `MDY${year}${month}${day}${hour}${minute}${random1}${random2}`;

      const orderData = {
        id: orderId,
        sender_name: state.senderName,
        sender_phone: state.senderPhone,
        sender_address: state.senderAddress,
        receiver_name: state.receiverName,
        receiver_phone: state.receiverPhone,
        receiver_address: state.receiverAddress,
        package_type: state.packageType,
        weight: parseFloat(state.weight),
        description: state.description,
        price: state.price,
        delivery_speed: state.deliverySpeed,
        scheduled_delivery_time: state.scheduledTime || null,
        delivery_distance: state.distance,
        customer_id: state.userId,
        create_time: new Date().toLocaleString('zh-CN'),
      };

      const result = await packageService.createPackage(orderData);
      hideLoading();

      if (result.success) {
        dispatch({ type: 'SET_QR_MODAL', payload: { show: true, orderId, price: state.price } });
      } else {
        const errorMessage = result.error?.message || '订单创建失败';
        Alert.alert('订单创建失败', errorMessage);
      }
    } catch (error: any) {
      hideLoading();
      console.error('提交订单失败:', error);
      Alert.alert('错误', error.message || '提交订单失败');
    }
  }, [state, showLoading, hideLoading]);

  // 重置表单 - 使用 useCallback 优化
  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
    loadUserInfo();
  }, [loadUserInfo]);

  // 渲染函数组件
  const renderPackageTypeSelector = useCallback(() => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{currentT.packageType}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packageTypeContainer}>
        {packageTypes.map((type, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.packageTypeItem,
              state.packageType === type.value && styles.packageTypeItemSelected
            ]}
            onPress={() => {
              dispatch({ type: 'SET_PACKAGE_INFO', payload: { 
                type: type.value, 
                weight: state.weight, 
                description: state.description 
              }});
              handlePackageTypeClick(type.value);
            }}
          >
            <Text style={[
              styles.packageTypeText,
              state.packageType === type.value && styles.packageTypeTextSelected
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  ), [packageTypes, state.packageType, state.weight, state.description, currentT, handlePackageTypeClick]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 标题 */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#2E86AB', '#4CA1CF']}
            style={styles.headerGradient}
          >
            <Text style={styles.title}>{currentT.title}</Text>
            <Text style={styles.subtitle}>{currentT.subtitle}</Text>
          </LinearGradient>
        </View>

        {/* 寄件人信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{currentT.senderInfo}</Text>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>{currentT.useMyInfo}</Text>
            <Switch
              value={state.useMyInfo}
              onValueChange={(value) => {
                dispatch({ type: 'SET_USE_MY_INFO', payload: value });
                if (value) {
                  dispatch({ type: 'SET_SENDER_INFO', payload: { 
                    name: state.userName, 
                    phone: state.userPhone, 
                    address: state.senderAddress 
                  }});
                }
              }}
              trackColor={{ false: '#767577', true: '#2E86AB' }}
              thumbColor={state.useMyInfo ? '#fff' : '#f4f3f4'}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder={currentT.senderName}
            value={state.senderName}
            onChangeText={(text) => dispatch({ type: 'SET_SENDER_INFO', payload: { 
              name: text, 
              phone: state.senderPhone, 
              address: state.senderAddress 
            }})}
          />

          <TextInput
            style={styles.input}
            placeholder={currentT.senderPhone}
            value={state.senderPhone}
            onChangeText={(text) => dispatch({ type: 'SET_SENDER_INFO', payload: { 
              name: state.senderName, 
              phone: text, 
              address: state.senderAddress 
            }})}
            keyboardType="phone-pad"
          />

          <View style={styles.addressContainer}>
            <TextInput
              style={[styles.input, styles.addressInput]}
              placeholder={currentT.senderAddress}
              value={state.senderAddress}
              onChangeText={(text) => dispatch({ type: 'SET_SENDER_INFO', payload: { 
                name: state.senderName, 
                phone: state.senderPhone, 
                address: text 
              }})}
              multiline
            />
            <TouchableOpacity
              style={styles.locationButton}
              onPress={useCurrentLocation}
            >
              <Text style={styles.locationButtonText}>📍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => openMapSelector('sender')}
            >
              <Text style={styles.mapButtonText}>🗺️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 收件人信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{currentT.receiverInfo}</Text>
          
          <TextInput
            style={styles.input}
            placeholder={currentT.receiverName}
            value={state.receiverName}
            onChangeText={(text) => dispatch({ type: 'SET_RECEIVER_INFO', payload: { 
              name: text, 
              phone: state.receiverPhone, 
              address: state.receiverAddress 
            }})}
          />

          <TextInput
            style={styles.input}
            placeholder={currentT.receiverPhone}
            value={state.receiverPhone}
            onChangeText={(text) => dispatch({ type: 'SET_RECEIVER_INFO', payload: { 
              name: state.receiverName, 
              phone: text, 
              address: state.receiverAddress 
            }})}
            keyboardType="phone-pad"
          />

          <View style={styles.addressContainer}>
            <TextInput
              style={[styles.input, styles.addressInput]}
              placeholder={currentT.receiverAddress}
              value={state.receiverAddress}
              onChangeText={(text) => dispatch({ type: 'SET_RECEIVER_INFO', payload: { 
                name: state.receiverName, 
                phone: state.receiverPhone, 
                address: text 
              }})}
              multiline
            />
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => openMapSelector('receiver')}
            >
              <Text style={styles.mapButtonText}>🗺️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 包裹信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{currentT.packageInfo}</Text>
          
          {renderPackageTypeSelector()}

          <TextInput
            style={styles.input}
            placeholder={currentT.weight}
            value={state.weight}
            onChangeText={(text) => dispatch({ type: 'SET_PACKAGE_INFO', payload: { 
              type: state.packageType, 
              weight: text, 
              description: state.description 
            }})}
            keyboardType="numeric"
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={currentT.description}
            value={state.description}
            onChangeText={(text) => dispatch({ type: 'SET_PACKAGE_INFO', payload: { 
              type: state.packageType, 
              weight: state.weight, 
              description: text 
            }})}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* 配送选项 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{currentT.deliveryOptions}</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deliverySpeedContainer}>
            {deliverySpeeds.map((speed, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.deliverySpeedItem,
                  state.deliverySpeed === speed.value && styles.deliverySpeedItemSelected
                ]}
                onPress={() => dispatch({ type: 'SET_DELIVERY_OPTIONS', payload: { 
                  speed: speed.value, 
                  scheduledTime: state.scheduledTime 
                }})}
              >
                <Text style={[
                  styles.deliverySpeedText,
                  state.deliverySpeed === speed.value && styles.deliverySpeedTextSelected
                ]}>
                  {speed.label}
                </Text>
                {speed.extra > 0 && (
                  <Text style={styles.extraFeeText}>+{speed.extra} MMK</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 价格显示 */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>{currentT.price}</Text>
          <Text style={styles.priceValue}>{state.price} MMK</Text>
        </View>

        {/* 提交按钮 */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitOrder}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#2E86AB', '#4CA1CF']}
            style={styles.submitButtonGradient}
          >
            <Text style={styles.submitButtonText}>{currentT.submitOrder}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* 地图模态框 */}
      <Modal
        visible={state.showMapModal}
        transparent
        animationType="slide"
        onRequestClose={() => dispatch({ type: 'SET_MAP_MODAL', payload: { show: false } })}
      >
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalContent}>
            <View style={styles.mapModalHeader}>
              <Text style={styles.mapModalTitle}>
                {state.mapType === 'sender' ? '选择取件地址' : '选择收件地址'}
              </Text>
              <TouchableOpacity
                onPress={() => dispatch({ type: 'SET_MAP_MODAL', payload: { show: false } })}
                style={styles.mapModalClose}
              >
                <Text style={styles.mapModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: state.selectedLocation.latitude,
                longitude: state.selectedLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                dispatch({ type: 'SET_SELECTED_LOCATION', payload: { latitude, longitude } });
              }}
            >
              <Marker
                coordinate={state.selectedLocation}
                title="选择的位置"
              />
            </MapView>
            
            <View style={styles.mapModalButtons}>
              <TouchableOpacity
                style={styles.mapModalButton}
                onPress={confirmMapLocation}
              >
                <LinearGradient
                  colors={['#2E86AB', '#4CA1CF']}
                  style={styles.mapModalButtonGradient}
                >
                  <Text style={styles.mapModalButtonText}>确认位置</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR码模态框 */}
      <Modal
        visible={state.showQRCodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => dispatch({ type: 'SET_QR_MODAL', payload: { show: false } })}
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
              <Text style={styles.qrOrderId}>{state.qrOrderId}</Text>
              <Text style={styles.qrInfoText}>💰 {currentT.totalAmount}</Text>
              <Text style={styles.qrOrderPrice}>{state.qrOrderPrice} MMK</Text>
              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={state.qrOrderId}
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
                  dispatch({ type: 'SET_QR_MODAL', payload: { show: false } });
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
                  dispatch({ type: 'SET_QR_MODAL', payload: { show: false } });
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

// 样式保持不变
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    padding: 30,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 15,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9fafb',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  addressInput: {
    flex: 1,
    marginRight: 10,
    marginBottom: 0,
  },
  locationButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  locationButtonText: {
    fontSize: 16,
    color: 'white',
  },
  mapButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
  },
  mapButtonText: {
    fontSize: 16,
    color: 'white',
  },
  packageTypeContainer: {
    marginBottom: 15,
  },
  packageTypeItem: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  packageTypeItemSelected: {
    backgroundColor: '#2E86AB',
    borderColor: '#2E86AB',
  },
  packageTypeText: {
    fontSize: 14,
    color: '#374151',
  },
  packageTypeTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  deliverySpeedContainer: {
    marginBottom: 15,
  },
  deliverySpeedItem: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  deliverySpeedItemSelected: {
    backgroundColor: '#2E86AB',
    borderColor: '#2E86AB',
  },
  deliverySpeedText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  deliverySpeedTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  extraFeeText: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  priceSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E86AB',
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  mapModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  mapModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  mapModalClose: {
    padding: 8,
  },
  mapModalCloseText: {
    fontSize: 20,
    color: '#6b7280',
  },
  map: {
    flex: 1,
  },
  mapModalButtons: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  mapModalButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapModalButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  mapModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  qrModalHeader: {
    padding: 20,
    alignItems: 'center',
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  qrModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  qrInfoText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 5,
  },
  qrOrderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginBottom: 15,
  },
  qrOrderPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 20,
  },
  qrCodeContainer: {
    alignItems: 'center',
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  qrModalButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  qrButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  qrButtonGradient: {
    padding: 12,
    alignItems: 'center',
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});
