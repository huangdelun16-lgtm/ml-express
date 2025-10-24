import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Dimensions,
  Image,
  RefreshControl,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { packageService, Package, supabase, deliveryPhotoService } from '../services/supabase';

const { width, height } = Dimensions.get('window');

// 内联位置工具函数
interface ResolvedLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  source: 'coordinates' | 'geocoding' | 'fallback';
  resolvedAddress?: string;
}

// 解析包裹位置（坐标优先，地址备用）
const resolvePackageLocation = async (pkg: Package): Promise<ResolvedLocation | null> => {
  try {
    // 1. 优先使用包裹中的坐标
    if (pkg.receiver_latitude && pkg.receiver_longitude) {
      return {
        lat: parseFloat(pkg.receiver_latitude.toString()),
        lng: parseFloat(pkg.receiver_longitude.toString()),
        accuracy: 10,
        source: 'coordinates',
        resolvedAddress: pkg.receiver_address
      };
    }

    // 2. 尝试地址地理编码
    if (pkg.receiver_address) {
      try {
        const result = await Location.geocodeAsync(pkg.receiver_address);
        if (result && result.length > 0) {
          return {
            lat: result[0].latitude,
            lng: result[0].longitude,
            accuracy: 100,
            source: 'geocoding',
            resolvedAddress: pkg.receiver_address
          };
        }
      } catch (error) {
        console.warn('地理编码失败:', error);
      }
    }

    // 3. 使用默认位置（仰光市中心）
    return {
      lat: 21.9588,
      lng: 96.0891,
      accuracy: 1000,
      source: 'fallback',
      resolvedAddress: pkg.receiver_address || '仰光市中心'
    };
  } catch (error) {
    console.error('解析包裹位置失败:', error);
    return null;
  }
};

// 获取位置来源标签
const getLocationSourceLabel = (source: ResolvedLocation['source']): string => {
  switch (source) {
    case 'coordinates':
      return '精确坐标';
    case 'geocoding':
      return '地址解析';
    case 'fallback':
      return '默认位置';
    default:
      return '未知来源';
  }
};

interface PackageWithExtras extends Package {
  coords?: ResolvedLocation;
  resolvedAddress?: string;
  distance?: number | null;
  priorityScore?: number;
  locationSource?: ResolvedLocation['source'];
  // 新增取货和送货相关字段
  pickupCoords?: ResolvedLocation;
  deliveryCoords?: ResolvedLocation;
  pickupDistance?: number | null;
  deliveryDistance?: number | null;
  totalDistance?: number | null;
}

export default function MapScreen({ navigation }: any) {
  const { language } = useApp();
  const [location, setLocation] = useState<any>(null);
  const [packages, setPackages] = useState<PackageWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDeliveringPackageId, setCurrentDeliveringPackageId] = useState<string | null>(null);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [optimizedPackagesWithCoords, setOptimizedPackagesWithCoords] = useState<PackageWithExtras[]>([]);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapView>(null);
  const coordinatesCache = useRef<Record<string, ResolvedLocation>>({});
  const packagesCache = useRef<PackageWithExtras[]>([]);
  const lastLoadTime = useRef<number>(0);
  const CACHE_DURATION = 30000; // 30秒缓存
  const pendingRequests = useRef<Set<string>>(new Set());
  const performanceMetrics = useRef<{
    loadTimes: number[];
    renderTimes: number[];
    memoryUsage: number[];
  }>({
    loadTimes: [],
    renderTimes: [],
    memoryUsage: [],
  });
  
  // 拍照相关状态
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSingleMapModal, setShowSingleMapModal] = useState(false);
  const [selectedPackageForMap, setSelectedPackageForMap] = useState<PackageWithExtras | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPackageForDelivery, setCurrentPackageForDelivery] = useState<PackageWithExtras | null>(null);

  useEffect(() => {
    requestLocationPermission();
    loadPackages();
    loadCurrentDeliveringPackage();
    
    // 启动位置追踪
    startLocationTracking();
    
    // 设置骑手状态为活跃
    updateCourierStatus('active');

    // 清理函数
    return () => {
      stopLocationTracking();
      updateCourierStatus('inactive');
      cleanupMemory();
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限被拒绝', '需要位置权限才能使用导航功能');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  };

  const loadPackages = async (forceRefresh = false) => {
    const startTime = Date.now();
    
    try {
      // 检查缓存是否有效
      const now = Date.now();
      if (!forceRefresh && packagesCache.current.length > 0 && (now - lastLoadTime.current) < CACHE_DURATION) {
        console.log('📦 使用缓存数据');
        setPackages(packagesCache.current);
        trackPerformance('load packages (cache)', startTime);
        return;
      }

      setLoading(true);
      const currentUser = await AsyncStorage.getItem('currentUserName') || '';
      
      if (!currentUser) {
        Alert.alert(
          language === 'zh' ? '登录状态异常' : language === 'en' ? 'Login Status Error' : 'လော့ဂ်အင်အခြေအနေမမှန်ပါ',
          language === 'zh' ? '请重新登录后再试' : language === 'en' ? 'Please login again' : 'ကျေးဇူးပြု၍ပြန်လည်လော့ဂ်အင်ပြုလုပ်ပါ',
          [{ text: language === 'zh' ? '确定' : language === 'en' ? 'OK' : 'အိုကေ' }]
        );
        return;
      }
      
      console.log('📱 当前用户:', currentUser);
      
      const allPackages = await packageService.getAllPackages();
      console.log('📱 所有包裹:', allPackages.length);
      
      // 使用Promise.allSettled来避免单个包裹解析失败影响整体
      const packagePromises = allPackages
        .filter(pkg =>
          pkg.courier === currentUser &&
          !['已送达', '已取消'].includes(pkg.status)  // 排除已送达和已取消的包裹
        )
        .map(async pkg => {
          try {
            // 解析取货点坐标
            const pickupCoords = await getPickupCoordinates(pkg);
            // 解析送货点坐标
            const deliveryCoords = await getDeliveryCoordinates(pkg);
            
            return {
              ...pkg,
              pickupCoords: pickupCoords || undefined,
              deliveryCoords: deliveryCoords || undefined,
              // 保持向后兼容
              coords: deliveryCoords || undefined,
              resolvedAddress: deliveryCoords?.resolvedAddress || pkg.receiver_address,
              locationSource: deliveryCoords?.source || 'fallback',
            };
          } catch (error) {
            console.warn(`包裹 ${pkg.id} 解析失败:`, error);
            return {
              ...pkg,
              pickupCoords: undefined,
              deliveryCoords: undefined,
              coords: undefined,
              resolvedAddress: pkg.receiver_address,
              locationSource: 'fallback' as const,
            };
          }
        });

      const results = await Promise.allSettled(packagePromises);
      const myPackages = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<PackageWithExtras>).value);
      
      console.log('📱 我的包裹:', myPackages.length);
      
      // 更新缓存
      packagesCache.current = myPackages;
      lastLoadTime.current = now;
      
      setPackages(myPackages);
      trackPerformance('load packages (network)', startTime);
    } catch (error) {
      console.error('加载包裹失败:', error);
      trackPerformance('load packages (error)', startTime);
      Alert.alert(
        language === 'zh' ? '加载失败' : language === 'en' ? 'Loading Failed' : 'ရယူမှုမအောင်မြင်ပါ',
        language === 'zh' ? '无法加载包裹信息，请检查网络连接后重试' : language === 'en' ? 'Unable to load packages, please check your network connection' : 'အထုပ်များကိုရယူ၍မရပါ၊ ကျေးဇူးပြု၍အင်တာနက်ချိတ်ဆက်မှုကိုစစ်ဆေးပါ',
        [
          { text: language === 'zh' ? '重试' : language === 'en' ? 'Retry' : 'ပြန်လည်ကြိုးစားပါ', onPress: () => loadPackages(true) },
          { text: language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်ပါ' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // 下拉刷新处理
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPackages(true); // 强制刷新
      await loadCurrentDeliveringPackage();
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 📍 实时位置追踪功能
  const startLocationTracking = async () => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) return;

      setIsLocationTracking(true);
      
      // 每30秒更新一次位置
      const interval = setInterval(async () => {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          // 更新数据库中的位置信息
          await supabase
            .from('courier_locations')
            .upsert({
              courier_id: courierId,
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
              heading: currentLocation.coords.heading,
              speed: currentLocation.coords.speed,
              last_update: new Date().toISOString(),
              battery_level: null, // 可以后续添加电池电量检测
            });

          console.log('📍 位置已更新:', {
            lat: currentLocation.coords.latitude,
            lng: currentLocation.coords.longitude,
            time: new Date().toLocaleTimeString()
          });
        } catch (error) {
          console.error('位置更新失败:', error);
        }
      }, 30000); // 30秒间隔

      setLocationUpdateInterval(interval);
    } catch (error) {
      console.error('启动位置追踪失败:', error);
      setIsLocationTracking(false);
    }
  };

  const stopLocationTracking = () => {
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      setLocationUpdateInterval(null);
    }
    setIsLocationTracking(false);
  };

  // 📊 性能监控
  const trackPerformance = (operation: string, startTime: number) => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ ${operation} 耗时: ${duration}ms`);
    
    // 记录性能指标
    if (operation.includes('load')) {
      performanceMetrics.current.loadTimes.push(duration);
      // 只保留最近10次记录
      if (performanceMetrics.current.loadTimes.length > 10) {
        performanceMetrics.current.loadTimes.shift();
      }
    }
    
    if (operation.includes('render')) {
      performanceMetrics.current.renderTimes.push(duration);
      if (performanceMetrics.current.renderTimes.length > 10) {
        performanceMetrics.current.renderTimes.shift();
      }
    }
    
    // 检查性能警告
    if (duration > 1000) {
      console.warn(`⚠️ ${operation} 耗时过长: ${duration}ms`);
    }
  };

  const getPerformanceStats = () => {
    const { loadTimes, renderTimes } = performanceMetrics.current;
    
    const avgLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length 
      : 0;
      
    const avgRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
      : 0;
    
    return {
      avgLoadTime: Math.round(avgLoadTime),
      avgRenderTime: Math.round(avgRenderTime),
      totalLoads: loadTimes.length,
      totalRenders: renderTimes.length,
    };
  };

  // 🌐 网络请求优化
  const debouncedRequest = (key: string, requestFn: () => Promise<any>, delay = 300) => {
    return new Promise((resolve, reject) => {
      // 如果已有相同请求在进行，直接返回
      if (pendingRequests.current.has(key)) {
        console.log(`⏳ 请求 ${key} 已在进行中，跳过重复请求`);
        return;
      }

      pendingRequests.current.add(key);
      
      setTimeout(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          pendingRequests.current.delete(key);
        }
      }, delay);
    });
  };

  // 🧹 内存清理函数
  const cleanupMemory = () => {
    // 清理缓存
    coordinatesCache.current = {};
    packagesCache.current = [];
    
    // 清理状态
    setPackages([]);
    setOptimizedPackagesWithCoords([]);
    
    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
    }
    
    console.log('🧹 内存清理完成');
  };

  // 📊 更新骑手状态
  const updateCourierStatus = async (status: 'active' | 'busy' | 'inactive') => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) return;

      await supabase
        .from('couriers')
        .update({
          status: status,
          last_active: new Date().toISOString(),
        })
        .eq('id', courierId);

      console.log('📊 骑手状态已更新:', status);
    } catch (error) {
      console.error('更新骑手状态失败:', error);
    }
  };

  // 🚚 加载当前正在配送的包裹ID
  const loadCurrentDeliveringPackage = async () => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) return;

      const { data, error } = await supabase
        .from('couriers')
        .select('current_delivering_package_id')
        .eq('id', courierId)
        .single();

      if (error) {
        console.error('加载当前配送包裹失败:', error);
        return;
      }

      setCurrentDeliveringPackageId(data?.current_delivering_package_id || null);
    } catch (error) {
      console.error('加载当前配送包裹异常:', error);
    }
  };

  // 🚀 开始配送此包裹
  const startDelivering = async (packageId: string) => {
    try {
      // 添加触觉反馈
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) {
        Alert.alert('错误', '未找到快递员ID，请重新登录');
        return;
      }

      // 更新数据库中骑手的当前配送包裹ID
      const { error } = await supabase
        .from('couriers')
        .update({ current_delivering_package_id: packageId })
        .eq('id', courierId);

      if (error) {
        console.error('更新当前配送包裹失败:', error);
        Alert.alert(
          language === 'zh' ? '操作失败' : language === 'en' ? 'Operation Failed' : 'လုပ်ဆောင်မှုမအောင်မြင်ပါ',
          language === 'zh' ? '无法开始配送，请检查网络连接后重试' : language === 'en' ? 'Unable to start delivery, please check your network connection' : 'ပို့ဆောင်မှုမစတင်နိုင်ပါ၊ ကျေးဇူးပြု၍အင်တာနက်ချိတ်ဆက်မှုကိုစစ်ဆေးပါ'
        );
        return;
      }

      // 更新包裹状态为"配送中"
      await packageService.updatePackageStatus(
        packageId,
        '配送中',
        new Date().toLocaleString('zh-CN')
      );

      setCurrentDeliveringPackageId(packageId);
      Alert.alert(
        language === 'zh' ? '✅ 开始配送' : language === 'en' ? '✅ Start Delivery' : '✅ ပို့ဆောင်မှုစတင်',
        language === 'zh' ? '您已开始配送此包裹，客户现在可以实时跟踪您的位置' : language === 'en' ? 'You have started delivering this package, customers can now track your location in real-time' : 'သင်ဤအထုပ်ကိုပို့ဆောင်ရန်စတင်ပြီး၊ ဖောက်သည်များသည်ယခုအချိန်တွင်သင့်တည်နေရာကိုတကယ့်အချိန်တွင်ခြေရာခံနိုင်သည်',
        [{ text: language === 'zh' ? '确定' : language === 'en' ? 'OK' : 'အိုကေ' }]
      );

      // 刷新包裹列表
      loadPackages();
    } catch (error) {
      console.error('开始配送异常:', error);
      Alert.alert(
        language === 'zh' ? '操作失败' : language === 'en' ? 'Operation Failed' : 'လုပ်ဆောင်မှုမအောင်မြင်ပါ',
        language === 'zh' ? '开始配送时发生错误，请重试' : language === 'en' ? 'An error occurred while starting delivery, please try again' : 'ပို့ဆောင်မှုစတင်ရန်အမှားတစ်ခုဖြစ်ပွားခဲ့သည်၊ ကျေးဇူးပြု၍ပြန်လည်ကြိုးစားပါ'
      );
    }
  };

  // 🏁 完成配送此包裹（自动拍照）
  const finishDelivering = async (packageId: string) => {
    try {
      // 添加触觉反馈
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // 找到要完成配送的包裹
      const packageToDeliver = packages.find(pkg => pkg.id === packageId);
      if (!packageToDeliver) {
        Alert.alert('错误', '未找到包裹信息');
        return;
      }

      // 设置当前要完成配送的包裹
      setCurrentPackageForDelivery(packageToDeliver);
      
      // 直接弹出拍照窗口
      setShowCameraModal(true);
      
    } catch (error) {
      console.error('完成配送异常:', error);
      Alert.alert('错误', '操作失败，请重试');
    }
  };

  // 📸 打开相机拍照
  const handleOpenCamera = async () => {
    try {
      // 请求相机权限
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert('权限不足', '需要相机权限才能拍照');
        return;
      }

      // 启动相机（iOS优化设置 - 极致压缩）
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3, // iOS专用：降至30%质量，确保流畅上传
        exif: false, // 禁用EXIF数据以提高性能
        base64: false, // 不立即生成base64，避免内存问题
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
        setShowPhotoModal(true);
        setShowCameraModal(false);
      }
    } catch (error) {
      console.error('相机错误:', error);
      Alert.alert('错误', '无法打开相机，请重试');
    }
  };

  // 🔄 将图片转换为base64（优化版 - iOS流畅）
  const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
      console.log('🔄 开始转换照片，URI:', imageUri);
      
      // 使用fetch获取图片数据（更快）
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      console.log('📦 照片Blob大小:', (blob.size / 1024).toFixed(2), 'KB');
      
      // 如果照片仍然太大（>500KB），进一步压缩
      if (blob.size > 500 * 1024) {
        console.log('⚠️ 照片过大，需要进一步压缩');
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        // 添加超时保护
        const timeout = setTimeout(() => {
          reject(new Error('FileReader超时'));
        }, 8000); // 8秒超时
        
        reader.onloadend = () => {
          clearTimeout(timeout);
          const base64String = reader.result as string;
          // 移除data:image/jpeg;base64,前缀
          const base64Data = base64String.split(',')[1];
          console.log('✅ Base64转换完成，大小:', (base64Data.length / 1024).toFixed(2), 'KB');
          resolve(base64Data);
        };
        
        reader.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ FileReader错误:', error);
          reject(error);
        };
        
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ 转换图片为base64失败:', error);
      return '';
    }
  };

  // 📤 上传照片并完成配送
  const handleUploadPhoto = async () => {
    if (!capturedPhoto || !currentPackageForDelivery) {
      Alert.alert('提示', '请先拍照');
      return;
    }

    try {
      setUploadingPhoto(true);

      // 获取当前骑手信息
      const userName = await AsyncStorage.getItem('currentUserName') || '未知骑手';

      // 1. 获取位置（使用超时保护和较低精度）
      console.log('📍 正在获取位置...');
      let latitude = 0;
      let longitude = 0;
      let locationObtained = false;
      
      try {
        const locationPermission = await Location.requestForegroundPermissionsAsync();
        if (locationPermission.status === 'granted') {
          // 使用较低精度和超时，避免卡顿
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced, // 从 BestForNavigation 改为 Balanced
            timeInterval: 5000,
            distanceInterval: 10,
          });

          // 3秒超时
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('GPS获取超时')), 3000)
          );

          const location = await Promise.race([locationPromise, timeoutPromise]) as any;
          if (location) {
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
            locationObtained = true;
            console.log('✅ 位置获取成功:', latitude, longitude);
          }
        }
      } catch (locationError) {
        console.warn('⚠️ 位置获取失败，使用默认坐标:', locationError);
        // 使用默认坐标（曼德勒市中心）
        latitude = 21.9588;
        longitude = 96.0891;
        locationObtained = false;
      }

      // 如果位置获取失败，记录警告
      if (!locationObtained) {
        console.warn('⚠️ 位置获取失败，违规检测可能不准确');
      }

      // 2. 异步保存照片到相册（不阻塞主流程）
      MediaLibrary.requestPermissionsAsync()
        .then(mediaPermission => {
          if (mediaPermission.status === 'granted') {
            MediaLibrary.saveToLibraryAsync(capturedPhoto).catch(error => {
              console.log('⚠️ 保存到相册失败:', error);
            });
          }
        })
        .catch(error => console.log('⚠️ 相册权限请求失败:', error));

      // 3. 转换照片为base64（使用超时保护 - iOS优化）
      console.log('📸 正在压缩照片...');
      let photoBase64 = '';
      
      try {
        const base64Promise = convertImageToBase64(capturedPhoto);
        const timeoutPromise = new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('照片转换超时')), 8000) // 从10秒减到8秒
        );

        photoBase64 = await Promise.race([base64Promise, timeoutPromise]);
        console.log('✅ 照片转换完成，大小:', (photoBase64.length / 1024).toFixed(2), 'KB');
        
        // 检查照片大小，如果太大则警告
        if (photoBase64.length > 400 * 1024) {
          console.warn('⚠️ 照片Base64较大:', (photoBase64.length / 1024).toFixed(2), 'KB，上传可能较慢');
        }
      } catch (conversionError) {
        console.error('❌ 照片转换失败:', conversionError);
        Alert.alert('❌ 错误', '照片处理失败，请重试\n（提示：请在光线充足的地方拍照）');
        setUploadingPhoto(false);
        return;
      }

      // 4. 保存配送照片到数据库（使用超时保护 - iOS优化）
      console.log('☁️ 正在上传照片到服务器...');
      let photoSaved = false;
      
      try {
        const uploadPromise = deliveryPhotoService.saveDeliveryPhoto({
          packageId: currentPackageForDelivery.id,
          photoBase64: photoBase64,
          courierName: userName,
          latitude: latitude,
          longitude: longitude,
          locationName: '配送位置'
        });

        // 12秒上传超时（从15秒减到12秒，更快失败提示）
        const timeoutPromise = new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('照片上传超时')), 12000)
        );

        photoSaved = await Promise.race([uploadPromise, timeoutPromise]);
        
        if (photoSaved) {
          console.log('✅ 照片上传成功！');
        } else {
          console.log('⚠️ 照片上传失败，但继续更新包裹状态');
        }
      } catch (uploadError) {
        console.error('❌ 照片上传失败:', uploadError);
        // 显示警告但继续流程
        console.log('⚠️ 照片上传失败，但继续更新包裹状态');
      }

      // 5. 更新包裹状态为"已送达"并记录店铺信息
      console.log('开始更新包裹状态:', {
        packageId: currentPackageForDelivery.id,
        status: '已送达',
        deliveryTime: new Date().toISOString(),
        courierName: userName
      });

      const success = await packageService.updatePackageStatus(
        currentPackageForDelivery.id,
        '已送达',
        undefined, // pickupTime
        new Date().toISOString(), // deliveryTime
        userName, // courierName
        undefined, // transferCode
        undefined, // storeInfo
        { latitude, longitude } // courierLocation - 新增位置信息
      );

      console.log('包裹状态更新结果:', success);
      console.log('🔍 违规检测信息:', {
        packageId: currentPackageForDelivery.id,
        courierName: userName,
        courierLocation: { latitude, longitude },
        locationObtained: locationObtained
      });

      if (success) {
        // 6. 清除当前配送包裹ID
        const courierId = await AsyncStorage.getItem('currentCourierId');
        if (courierId) {
          const { error } = await supabase
            .from('couriers')
            .update({ current_delivering_package_id: null })
            .eq('id', courierId);

          if (error) {
            console.error('清除当前配送包裹失败:', error);
          }
        }

        setCurrentDeliveringPackageId(null);

        // 记录配送证明
        const deliveryProof = {
          packageId: currentPackageForDelivery.id,
          photoUri: capturedPhoto,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
          courier: userName,
          photoUploaded: photoSaved
        };

        console.log('配送证明记录:', deliveryProof);

        // 生成详细的成功消息
        let successMessage = `包裹已成功送达\n\n📦 包裹编号：${currentPackageForDelivery.id}\n👤 骑手：${userName}\n📍 位置：${latitude?.toFixed(6) || 'N/A'}, ${longitude?.toFixed(6) || 'N/A'}\n⏰ 送达时间：${new Date().toLocaleString('zh-CN')}\n`;
        
        if (photoSaved) {
          successMessage += `\n✅ 配送照片已上传到服务器`;
        } else {
          successMessage += `\n⚠️ 配送照片已保存到本地相册\n（服务器上传失败，但状态已更新）`;
        }

        Alert.alert(
          '✅ 配送完成！',
          successMessage,
          [
            {
              text: '确定',
              onPress: () => {
                setShowPhotoModal(false);
                setCapturedPhoto(null);
                setUploadingPhoto(false);
                setCurrentPackageForDelivery(null);
                // 刷新包裹列表
                loadPackages();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          '⚠️ 部分成功', 
          `配送照片${photoSaved ? '已上传' : '已保存到本地'}\n位置: ${latitude?.toFixed(6) || 'N/A'}, ${longitude?.toFixed(6) || 'N/A'}\n时间: ${new Date().toLocaleString('zh-CN')}\n\n⚠️ 但包裹状态更新失败，请稍后重试`,
          [
            {
              text: '确定',
              onPress: () => {
                setUploadingPhoto(false);
                setShowPhotoModal(false);
                setCapturedPhoto(null);
                setCurrentPackageForDelivery(null);
              }
            }
          ]
        );
      }

    } catch (error) {
      console.error('上传照片失败:', error);
      Alert.alert('上传失败', '网络错误，请重试');
      setUploadingPhoto(false);
    }
  };

  // 导航到单个地址
  const getCoordinatesForPackage = async (pkg: PackageWithExtras): Promise<ResolvedLocation | null> => {
    const cached = coordinatesCache.current[pkg.id];
    if (cached) {
      return cached;
    }

    if (pkg.coords) {
      coordinatesCache.current[pkg.id] = { ...pkg.coords };
      return coordinatesCache.current[pkg.id];
    }

    const resolved = await resolvePackageLocation(pkg);
    if (resolved) {
      coordinatesCache.current[pkg.id] = resolved;
      return resolved;
    }

    return null;
  };

  const handleNavigate = async (pkg: PackageWithExtras) => {
    // 添加触觉反馈
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      // 解析包裹的取货点和送货点坐标
      const pickupCoords = await getPickupCoordinates(pkg);
      const deliveryCoords = await getDeliveryCoordinates(pkg);
      
      if (!pickupCoords || !deliveryCoords) {
        Alert.alert('提示', '包裹缺少坐标信息，请联系管理员补全地址坐标');
        return;
      }

      // 计算距离
      const pickupDistance = location ? 
        calculateDistance(location.latitude, location.longitude, pickupCoords.lat, pickupCoords.lng) / 1000 : null;
      const deliveryDistance = 
        calculateDistance(pickupCoords.lat, pickupCoords.lng, deliveryCoords.lat, deliveryCoords.lng) / 1000;
      const totalDistance = (pickupDistance ?? 0) + deliveryDistance;

      // 设置单个包裹地图数据
      const packageWithCoords = {
        ...pkg,
        pickupCoords,
        deliveryCoords,
        pickupDistance,
        deliveryDistance,
        totalDistance,
        locationSource: deliveryCoords.source || pickupCoords.source || 'fallback'
      };

      setSelectedPackageForMap(packageWithCoords);
      setShowSingleMapModal(true);
      
    } catch (error) {
      console.error('解析包裹坐标失败:', error);
      Alert.alert('错误', '无法解析包裹坐标，请重试');
    }
  };

  // 🧮 计算两点之间的直线距离（哈弗辛公式）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 🎯 智能路线优化算法（考虑取货点和送货点的最优路径）
  const optimizeDeliveryRoute = async (packagesList: PackageWithExtras[]): Promise<PackageWithExtras[]> => {
    if (!location || packagesList.length <= 1) {
      return packagesList;
    }

    try {
      console.log('🚀 开始智能路线优化，包裹数量:', packagesList.length);
      
      // 1. 为每个包裹计算取货点和送货点坐标
      const packagesWithCoords = await Promise.all(
        packagesList.map(async (pkg) => {
          // 获取取货点坐标
          const pickupCoords = await getPickupCoordinates(pkg);
          // 获取送货点坐标  
          const deliveryCoords = await getDeliveryCoordinates(pkg);
          
          // 计算从当前位置到取货点的距离
          const pickupDistance = pickupCoords ? 
            calculateDistance(location.latitude, location.longitude, pickupCoords.lat, pickupCoords.lng) : null;
          
          // 计算从取货点到送货点的距离
          const deliveryDistance = (pickupCoords && deliveryCoords) ? 
            calculateDistance(pickupCoords.lat, pickupCoords.lng, deliveryCoords.lat, deliveryCoords.lng) : null;
          
          // 总距离 = 到取货点 + 取货到送货
          const totalDistance = pickupDistance && deliveryDistance ? 
            pickupDistance + deliveryDistance : null;
          
          // 计算优先级分数（越小越优先）
          let priorityScore = totalDistance !== null ? totalDistance : 999;
          
          // 急送达优先级最高（减少50%距离权重）
          if (pkg.delivery_speed === '急送达') {
            priorityScore *= 0.5;
          }
          // 定时达根据时间紧迫度调整
          else if (pkg.delivery_speed === '定时达' && pkg.scheduled_delivery_time) {
            const scheduledTime = new Date(pkg.scheduled_delivery_time).getTime();
            const currentTime = new Date().getTime();
            const timeLeft = scheduledTime - currentTime;
            const hoursLeft = timeLeft / (1000 * 60 * 60);
            
            // 如果剩余时间少于1小时，优先级提高
            if (hoursLeft < 1) {
              priorityScore *= 0.3;
            } else if (hoursLeft < 2) {
              priorityScore *= 0.6;
            }
          }

          return {
            ...pkg,
            pickupCoords: pickupCoords || undefined,
            deliveryCoords: deliveryCoords || undefined,
            pickupDistance,
            deliveryDistance,
            totalDistance,
            priorityScore,
            // 保持向后兼容
            coords: deliveryCoords || undefined,
            distance: totalDistance,
            locationSource: deliveryCoords?.source || 'fallback',
            resolvedAddress: deliveryCoords?.resolvedAddress || pkg.receiver_address,
          };
        })
      );

      // 2. 按优先级排序（总距离近 + 紧急程度高的优先）
      const sortedPackages = packagesWithCoords.sort((a, b) => {
        return a.priorityScore - b.priorityScore;
      });

      // 3. 使用改进的贪心算法优化路线（考虑取货和送货的完整路径）
      const optimizedRoute: PackageWithExtras[] = [];
      const remaining = [...sortedPackages];
      let currentLat = location.latitude;
      let currentLng = location.longitude;

      console.log('📍 当前位置:', currentLat, currentLng);

      while (remaining.length > 0) {
        // 找到距离当前位置最近的包裹（考虑取货点）
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        let nearestType = 'pickup'; // 'pickup' 或 'delivery'

        for (let i = 0; i < remaining.length; i++) {
          const pkg = remaining[i];
          
          // 计算到取货点的距离
          if (pkg.pickupCoords) {
            const pickupDist = calculateDistance(currentLat, currentLng, pkg.pickupCoords.lat, pkg.pickupCoords.lng);
            // 考虑优先级：急送达的包裹即使稍远也可能被选中
            const adjustedPickupDist = pkg.delivery_speed === '急送达' ? pickupDist * 0.7 : pickupDist;
            
            if (adjustedPickupDist < nearestDistance) {
              nearestDistance = adjustedPickupDist;
              nearestIndex = i;
              nearestType = 'pickup';
            }
          }
          
          // 如果包裹已经取货，也可以考虑直接送货
          // 这里可以根据实际业务逻辑调整
        }

        // 将最近的包裹加入路线
        const nearest = remaining.splice(nearestIndex, 1)[0];
        optimizedRoute.push(nearest);
        
        // 更新当前位置到取货点
        if (nearest.pickupCoords) {
          currentLat = nearest.pickupCoords.lat;
          currentLng = nearest.pickupCoords.lng;
          console.log(`📦 前往取货点: ${nearest.sender_name} (${nearest.pickupDistance?.toFixed(2)}km)`);
        }
        
        // 然后更新到送货点
        if (nearest.deliveryCoords) {
          currentLat = nearest.deliveryCoords.lat;
          currentLng = nearest.deliveryCoords.lng;
          console.log(`🚚 前往送货点: ${nearest.receiver_name} (${nearest.deliveryDistance?.toFixed(2)}km)`);
        }
      }

      console.log('🎯 路线优化完成:', optimizedRoute.map(p => 
        `${p.id} (取货:${p.pickupDistance?.toFixed(2)}km + 送货:${p.deliveryDistance?.toFixed(2)}km = 总计:${p.totalDistance?.toFixed(2)}km)`
      ));
      
      return optimizedRoute;
    } catch (error) {
      console.error('路线优化失败:', error);
      // 如果优化失败，返回原始列表
      return packagesList;
    }
  };

  // 🎯 增强的智能路径规划算法
  const enhancedRouteOptimization = async (packagesList: PackageWithExtras[]): Promise<PackageWithExtras[]> => {
    if (!location || packagesList.length <= 1) {
      return packagesList;
    }

    try {
      console.log('🧠 开始增强智能路径规划...');
      
      // 1. 为每个包裹计算详细坐标信息
      const packagesWithDetailedCoords = await Promise.all(
        packagesList.map(async (pkg) => {
          const pickupCoords = await getPickupCoordinates(pkg);
          const deliveryCoords = await getDeliveryCoordinates(pkg);
          
          // 计算各种距离
          const pickupDistance = pickupCoords ? 
            calculateDistance(location.latitude, location.longitude, pickupCoords.lat, pickupCoords.lng) : 999;
          
          const deliveryDistance = (pickupCoords && deliveryCoords) ? 
            calculateDistance(pickupCoords.lat, pickupCoords.lng, deliveryCoords.lat, deliveryCoords.lng) : 999;
          
          const totalDistance = pickupDistance + deliveryDistance;
          
          // 计算智能优先级分数
          let priorityScore = 0;
          
          // 配送速度权重 (40%)
          if (pkg.delivery_speed === '急送达') priorityScore += 40;
          else if (pkg.delivery_speed === '定时达') priorityScore += 25;
          else priorityScore += 10;
          
          // 距离权重 (30%) - 距离越近分数越高
          const distanceScore = Math.max(0, 30 - (totalDistance * 5));
          priorityScore += distanceScore;
          
          // 包裹重量权重 (20%) - 轻的优先
          const weight = parseFloat(pkg.weight?.replace(/[^\d.]/g, '') || '1');
          const weightScore = Math.max(0, 20 - (weight * 2));
          priorityScore += weightScore;
          
          // 时间紧迫度权重 (10%)
          if (pkg.scheduled_delivery_time) {
            const scheduledTime = new Date(pkg.scheduled_delivery_time).getTime();
            const currentTime = new Date().getTime();
            const hoursLeft = (scheduledTime - currentTime) / (1000 * 60 * 60);
            
            if (hoursLeft < 1) priorityScore += 10;
            else if (hoursLeft < 2) priorityScore += 7;
            else if (hoursLeft < 4) priorityScore += 4;
          }
          
          return {
            ...pkg,
            pickupCoords: pickupCoords || undefined,
            deliveryCoords: deliveryCoords || undefined,
            pickupDistance,
            deliveryDistance,
            totalDistance,
            priorityScore
          };
        })
      );

      // 2. 智能排序 - 按优先级分数降序
      const optimizedPackages = packagesWithDetailedCoords.sort((a, b) => b.priorityScore - a.priorityScore);

      // 3. 计算实际配送路径总距离
      let actualTotalDistance = 0;
      let lastPosition = { lat: location.latitude, lng: location.longitude };

      for (let i = 0; i < optimizedPackages.length; i++) {
        const pkg = optimizedPackages[i];
        
        // 到取货点
        if (pkg.pickupCoords) {
          const distToPickup = calculateDistance(
            lastPosition.lat, lastPosition.lng,
            pkg.pickupCoords.lat, pkg.pickupCoords.lng
          );
          actualTotalDistance += distToPickup;
          lastPosition = pkg.pickupCoords;
        }
        
        // 到送货点
        if (pkg.deliveryCoords) {
          const distToDelivery = calculateDistance(
            lastPosition.lat, lastPosition.lng,
            pkg.deliveryCoords.lat, pkg.deliveryCoords.lng
          );
          actualTotalDistance += distToDelivery;
          lastPosition = pkg.deliveryCoords;
        }
      }

      console.log(`🎯 增强智能路径规划完成: ${optimizedPackages.length}个包裹，实际总距离: ${actualTotalDistance.toFixed(2)}km`);
      console.log('📊 优先级排序:', optimizedPackages.map(p => `${p.id}(分数:${p.priorityScore.toFixed(1)})`));
      
      return optimizedPackages;

    } catch (error) {
      console.error('增强智能路径规划失败:', error);
      return packagesList;
    }
  };

  // 🏠 获取取货点坐标
  const getPickupCoordinates = async (pkg: Package): Promise<ResolvedLocation | null> => {
    try {
      // 1. 优先使用包裹中的发件人坐标
      if (pkg.sender_latitude && pkg.sender_longitude) {
        return {
          lat: parseFloat(pkg.sender_latitude.toString()),
          lng: parseFloat(pkg.sender_longitude.toString()),
          accuracy: 10,
          source: 'coordinates',
          resolvedAddress: pkg.sender_address
        };
      }

      // 2. 尝试发件人地址地理编码
      if (pkg.sender_address) {
        try {
          const result = await Location.geocodeAsync(pkg.sender_address);
          if (result && result.length > 0) {
            return {
              lat: result[0].latitude,
              lng: result[0].longitude,
              accuracy: 100,
              source: 'geocoding',
              resolvedAddress: pkg.sender_address
            };
          }
        } catch (error) {
          console.warn('发件人地址地理编码失败:', error);
        }
      }

      // 3. 使用默认位置（仰光市中心）
      return {
        lat: 21.9588,
        lng: 96.0891,
        accuracy: 1000,
        source: 'fallback',
        resolvedAddress: pkg.sender_address || '仰光市中心'
      };
    } catch (error) {
      console.error('解析取货点位置失败:', error);
      return null;
    }
  };

  // 🏢 获取送货点坐标
  const getDeliveryCoordinates = async (pkg: Package): Promise<ResolvedLocation | null> => {
    try {
      // 1. 优先使用包裹中的收件人坐标
      if (pkg.receiver_latitude && pkg.receiver_longitude) {
        return {
          lat: parseFloat(pkg.receiver_latitude.toString()),
          lng: parseFloat(pkg.receiver_longitude.toString()),
          accuracy: 10,
          source: 'coordinates',
          resolvedAddress: pkg.receiver_address
        };
      }

      // 2. 尝试收件人地址地理编码
      if (pkg.receiver_address) {
        try {
          const result = await Location.geocodeAsync(pkg.receiver_address);
          if (result && result.length > 0) {
            return {
              lat: result[0].latitude,
              lng: result[0].longitude,
              accuracy: 100,
              source: 'geocoding',
              resolvedAddress: pkg.receiver_address
            };
          }
        } catch (error) {
          console.warn('收件人地址地理编码失败:', error);
        }
      }

      // 3. 使用默认位置（仰光市中心）
      return {
        lat: 21.9588,
        lng: 96.0891,
        accuracy: 1000,
        source: 'fallback',
        resolvedAddress: pkg.receiver_address || '仰光市中心'
      };
    } catch (error) {
      console.error('解析送货点位置失败:', error);
      return null;
    }
  };

  // 导航到所有包裹地址（完整版路线规划）
  const handleNavigateAll = async () => {
    try {
      // 添加触觉反馈
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('触觉反馈失败:', error);
    }
    
    if (packages.length === 0) {
      Alert.alert('提示', '暂无待配送包裹');
      return;
    }

    if (!location) {
      Alert.alert('提示', '正在获取您的位置，请稍后再试');
      return;
    }

    try {
      console.log('🧭 开始规划路线...');
      
      // 1. 计算优化后的配送顺序
      const optimizedPackages = await optimizeDeliveryRoute(packages);
      
      // 2. 为每个包裹解析坐标并计算距离（供“配送顺序”列表与路线渲染使用）
      const packagesWithCoords = await Promise.all(
        optimizedPackages.map(async (pkg: Package) => {
          const pickupCoords = await getPickupCoordinates(pkg);
          const deliveryCoords = await getDeliveryCoordinates(pkg);

          // 计算公里数（如无坐标则为null）
          const pickupDistance = pickupCoords
            ? calculateDistance(location.latitude, location.longitude, pickupCoords.lat, pickupCoords.lng) / 1000
            : null;
          const deliveryDistance = pickupCoords && deliveryCoords
            ? calculateDistance(pickupCoords.lat, pickupCoords.lng, deliveryCoords.lat, deliveryCoords.lng) / 1000
            : null;
          const totalDistance = (pickupDistance ?? 0) + (deliveryDistance ?? 0);

          return {
            ...pkg,
            // 供外部Google Maps多点导航用
            coords: deliveryCoords || undefined,
            displayCoords: deliveryCoords ? `${deliveryCoords.lat.toFixed(6)}, ${deliveryCoords.lng.toFixed(6)}` : '坐标缺失',
            // 供“配送路线预览”地图与列表用
            pickupCoords: pickupCoords || undefined,
            deliveryCoords: deliveryCoords || undefined,
            pickupDistance,
            deliveryDistance,
            totalDistance,
            locationSource: (deliveryCoords?.source ?? pickupCoords?.source ?? 'fallback') as any,
          } as any;
        })
      );

      // 3. 过滤掉没有送货坐标的包裹（至少需要送货点）
      const validPackages = packagesWithCoords.filter((pkg: any) => pkg.deliveryCoords || pkg.coords);
      
      if (validPackages.length === 0) {
        Alert.alert('提示', '所有包裹都缺少收件地址坐标，无法规划路线');
        return;
      }

      // 4. 保存优化后的包裹列表
      setOptimizedPackagesWithCoords(validPackages);
      
      // 5. 显示地图预览
      setShowMapPreview(true);
      
      console.log(`✅ 路线规划完成: ${validPackages.length}个有效包裹`);
      console.log('📋 配送顺序:', validPackages.map((pkg: any, index: number) => `${index + 1}. ${pkg.receiver_name}`));
      
    } catch (error) {
      console.error('路线规划失败:', error);
      Alert.alert('错误', '路线规划失败，请重试');
    }
  };

  // 🚀 跳转到Google Maps导航
  const openGoogleMapsNavigation = async () => {
    if (!location || optimizedPackagesWithCoords.length === 0) return;

    try {
      const origin = `${location.latitude},${location.longitude}`;
      
      if (optimizedPackagesWithCoords.length === 1) {
        // 单个包裹导航 - 优先使用取货点坐标
        const pkg = optimizedPackagesWithCoords[0];
        let destination: string;
        
        // 优先使用pickupCoords（取货点）
        if (pkg.pickupCoords) {
          destination = `${pkg.pickupCoords.lat},${pkg.pickupCoords.lng}`;
        } else if (pkg.deliveryCoords) {
          // 如果没有取货点坐标，使用送货点坐标
          destination = `${pkg.deliveryCoords.lat},${pkg.deliveryCoords.lng}`;
        } else {
          // 最后使用备用方法
          const coords = pkg.coords || (await getCoordinatesForPackage(pkg));
          destination = coords
            ? `${coords.lat},${coords.lng}`
            : encodeURIComponent(pkg.receiver_address);
        }
        
        // 尝试多种URL方案，确保iOS和Android都能正常工作
        const urls = [
          `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`, // Google Maps App (iOS/Android)
          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`, // Web fallback
        ];
        
        // 尝试打开Google Maps应用，失败则使用浏览器
        let opened = false;
        for (const url of urls) {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            opened = true;
            break;
          }
        }
        
        if (!opened) {
          // 如果都失败，使用Apple Maps作为iOS备选
          const appleMapsUrl = `http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
          await Linking.openURL(appleMapsUrl);
        }
      } else {
        // 多个包裹导航 - 使用完整的取货点和送货点坐标
        const allCoords: string[] = [];
        for (const pkg of optimizedPackagesWithCoords) {
          // 优先使用pickupCoords和deliveryCoords（更准确）
          if (pkg.pickupCoords) {
            allCoords.push(`${pkg.pickupCoords.lat},${pkg.pickupCoords.lng}`);
          }
          if (pkg.deliveryCoords) {
            allCoords.push(`${pkg.deliveryCoords.lat},${pkg.deliveryCoords.lng}`);
          }
          
          // 如果没有pickupCoords/deliveryCoords，则使用备用方法
          if (!pkg.pickupCoords && !pkg.deliveryCoords) {
            const coords = pkg.coords || (await getCoordinatesForPackage(pkg));
            if (coords) {
              allCoords.push(`${coords.lat},${coords.lng}`);
            }
          }
        }
        
        if (allCoords.length === 0) {
          Alert.alert('错误', '无法获取包裹位置坐标，请检查地址设置');
          return;
        }
        
        const destination = allCoords[allCoords.length - 1];
        const waypointsLimit = Math.min(allCoords.length - 1, 9); // Google Maps最多支持9个途经点
        const waypoints = allCoords.slice(0, waypointsLimit).join('|');
        
        // 尝试多种URL方案
        const urls = [
          `comgooglemaps://?saddr=${origin}&daddr=${destination}&waypoints=${waypoints}&directionsmode=driving`, // Google Maps App
          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`, // Web
        ];
        
        let opened = false;
        for (const url of urls) {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            opened = true;
            break;
          }
        }
        
        if (!opened) {
          // iOS备选：Apple Maps（但Apple Maps不支持多途经点，所以只导航到最后一个地址）
          Alert.alert(
            '提示', 
            'iOS系统不支持多途经点导航，将只导航到最后一个地址。建议安装Google Maps应用以获得完整路线。',
            [
              {
                text: '取消',
                style: 'cancel'
              },
              {
                text: '继续',
                onPress: async () => {
                  const appleMapsUrl = `http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
                  await Linking.openURL(appleMapsUrl);
                }
              }
            ]
          );
        }
      }
      
      // 关闭地图预览
      setShowMapPreview(false);
    } catch (error) {
      console.error('打开导航失败:', error);
      Alert.alert('错误', '无法打开导航应用，请确保已安装Google Maps或Apple Maps');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';  // 橙色
      case '已取件': return '#3498db';  // 蓝色
      case '配送中': return '#9b59b6';  // 紫色
      case '已送达': return '#27ae60';  // 绿色
      default: return '#95a5a6';        // 灰色
    }
  };

  const renderPackageItem = ({ item, index }: { item: PackageWithExtras; index: number }) => {
    // 显示距离信息（如果有且有效）
    const itemDistance = (item as any).distance;
    const distanceText = itemDistance !== null && itemDistance !== undefined && itemDistance !== 999 && typeof itemDistance === 'number'                             
      ? `📏 ${itemDistance.toFixed(1)}km` 
      : '';
    
    // 显示配送速度图标
    const speedIcon = item.delivery_speed === '急送达' ? '⚡' : 
                     item.delivery_speed === '定时达' ? '⏰' : '✓';
    
    // 判断是否为当前配送的包裹
    const isCurrentDelivering = currentDeliveringPackageId === item.id;
    
    // 计算包裹编号：基于创建时间排序，确保编号稳定
    const sortedPackages = [...packages].sort((a, b) => {
      const timeA = new Date(a.created_at || a.create_time || 0).getTime();
      const timeB = new Date(b.created_at || b.create_time || 0).getTime();
      return timeA - timeB;
    });
    const packageNumber = sortedPackages.findIndex(pkg => pkg.id === item.id) + 1;
    
    return (
      <TouchableOpacity
        style={[
          styles.packageCard,
          isCurrentDelivering && styles.currentDeliveringCard
        ]}
          onPress={() => navigation.navigate('PackageDetail', { package: item })}
      >
        <View style={styles.packageInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.packageId}>{item.id}</Text>
            {item.delivery_speed && (
              <View style={styles.speedBadge}>
                <Text style={styles.speedIcon}>{speedIcon}</Text>
                <Text style={styles.speedText}>{item.delivery_speed}</Text>
              </View>
            )}
            {isCurrentDelivering && (
              <View style={styles.deliveringBadge}>
                <Text style={styles.deliveringText}>🚚 配送中</Text>
              </View>
            )}
          </View>
          
          {/* 取货点信息 */}
          <View style={styles.pickupSection}>
            <Text style={styles.sectionTitle}>📦 取货点</Text>
            <Text style={styles.senderName}>{item.sender_name}</Text>
            <Text style={styles.address} numberOfLines={2}>{item.sender_address}</Text>
            {item.pickupCoords && (
              <View style={styles.coordsContainer}>
                <Text style={styles.coordsLabel}>经纬度:</Text>
                <Text style={styles.coordsText}>
                  {item.pickupCoords.lat.toFixed(6)}, {item.pickupCoords.lng.toFixed(6)}
                </Text>
              </View>
            )}
            {item.pickupDistance !== null && item.pickupDistance !== undefined && (
              <Text style={styles.distanceText}>距离: {item.pickupDistance.toFixed(1)}km</Text>
            )}
          </View>

          {/* 送货点信息 */}
          <View style={styles.deliverySection}>
            <Text style={styles.sectionTitle}>🚚 送货点</Text>
            <Text style={styles.receiverName}>{item.receiver_name}</Text>
            <Text style={styles.address} numberOfLines={2}>{item.receiver_address}</Text>
            {item.deliveryCoords && (
              <View style={styles.coordsContainer}>
                <Text style={styles.coordsLabel}>经纬度:</Text>
                <Text style={styles.coordsText}>
                  {item.deliveryCoords.lat.toFixed(6)}, {item.deliveryCoords.lng.toFixed(6)}
                </Text>
              </View>
            )}
            {item.deliveryDistance !== null && item.deliveryDistance !== undefined && (
              <Text style={styles.distanceText}>距离: {item.deliveryDistance.toFixed(1)}km</Text>
            )}
          </View>
          
          <View style={styles.packageMeta}>
            <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) }]}> 
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <Text style={styles.packageType}>{item.package_type} · {item.weight}</Text>
            {item.totalDistance !== null && item.totalDistance !== undefined && (
              <Text style={styles.totalDistanceText}>总距离: {item.totalDistance.toFixed(1)}km</Text>
            )}
            <Text style={styles.locationSourceTag}>
              {`📡 ${getLocationSourceLabel(item.locationSource || 'fallback')}`}
            </Text>
            
            {/* 分配状态显示 */}
            <View style={styles.assignmentStatus}>
              {item.courier && item.courier !== '未分配' ? (
                <Text style={styles.assignedText}>
                  ✅ {language === 'zh' ? '已分配给' : language === 'en' ? 'Assigned to' : 'ပေးအပ်ပြီး'}: {item.courier}
                </Text>
              ) : (
                <Text style={styles.unassignedText}>
                  ⏳ {language === 'zh' ? '待分配' : language === 'en' ? 'Pending Assignment' : 'ပေးအပ်ရန်စောင့်ဆိုင်း'}
                </Text>
              )}
            </View>
          </View>

          {/* 操作按钮区域 */}
          <View style={styles.actionRow}>
            {/* 数字标记 */}
            <View style={[styles.numberBadge, { backgroundColor: getStatusColor(item.status) }]}>                                                                    
              <Text style={styles.numberText}>{packageNumber}</Text>
            </View>
            
            {/* 配送按钮 */}
            {item.status === '已取件' ? (
              !isCurrentDelivering ? (
                <TouchableOpacity 
                  style={styles.startDeliveryButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    startDelivering(item.id);
                  }}
                >
                  <Text style={styles.startDeliveryText}>
                    🚀 {language === 'zh' ? '开始配送' : language === 'en' ? 'Start Delivery' : 'ပို့ဆောင်မှုစတင်'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.finishDeliveryButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    finishDelivering(item.id);
                  }}
                >
                  <Text style={styles.finishDeliveryText}>
                    🏁 {language === 'zh' ? '完成配送' : language === 'en' ? 'Complete Delivery' : 'ပို့ဆောင်မှုပြီးမြောက်'}
                  </Text>
                </TouchableOpacity>
              )
            ) : item.status === '配送中' ? (
              <TouchableOpacity 
                style={styles.finishDeliveryButton}
                onPress={(e) => {
                  e.stopPropagation();
                  finishDelivering(item.id);
                }}
              >
                <Text style={styles.finishDeliveryText}>
                  🏁 {language === 'zh' ? '完成配送' : language === 'en' ? 'Complete Delivery' : 'ပို့ဆောင်မှုပြီးမြောက်'}
                </Text>
              </TouchableOpacity>
            ) : item.status === '待取件' ? (
              <View style={styles.placeholderButton}>
                <Text style={styles.placeholderText}>
                  {language === 'zh' ? '请先扫码取件' : language === 'en' ? 'Please scan to pickup' : 'အမှာစာရယူရန်စကင်န်ပါ'}
                </Text>
              </View>
            ) : item.status === '已送达' ? (
              <View style={styles.completedButton}>
                <Text style={styles.completedText}>
                  ✅ {language === 'zh' ? '已送达' : language === 'en' ? 'Delivered' : 'ပို့ဆောင်ပြီးပါပြီ'}
                </Text>
              </View>
            ) : (
              <View style={styles.placeholderButton}>
                <Text style={styles.placeholderText}>
                  {language === 'zh' ? '状态异常' : language === 'en' ? 'Status Error' : 'အခြေအနေမမှန်ပါ'}
                </Text>
              </View>
            )}
            
            {/* 导航按钮 */}
            <TouchableOpacity 
              style={styles.navButton}
              onPress={(e) => {
                e.stopPropagation();
                handleNavigate(item);
              }}
            >
              <Text style={styles.navButtonLabel}>
                {language === 'zh' ? '导航' : language === 'en' ? 'Navigate' : 'လမ်းညွှန်'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          🗺️ {language === 'zh' ? '配送路线' : language === 'en' ? 'Delivery Route' : 'ပို့ဆောင်လမ်းကြောင်း'}
        </Text>
        <TouchableOpacity onPress={() => loadPackages(true)} style={styles.refreshButton}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {location && (
        <View style={styles.locationCard}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationInfo}>
            {language !== 'my' && (
              <>
                <Text style={styles.locationTitle}>
                  {language === 'zh' ? '我的位置' : 'My Location'}
                </Text>
                <Text style={styles.locationCoords}>
                  {location?.latitude?.toFixed(4) || 'N/A'}, {location?.longitude?.toFixed(4) || 'N/A'}
                </Text>
                <View style={styles.trackingStatus}>
                  <Text style={styles.trackingIcon}>
                    {isLocationTracking ? '🟢' : '🔴'}
                  </Text>
                  <Text style={styles.trackingText}>
                    {isLocationTracking 
                      ? (language === 'zh' ? '实时追踪中' : language === 'en' ? 'Live Tracking' : 'တကယ့်အချိန်ခြေရာခံနေသည်')
                      : (language === 'zh' ? '追踪已停止' : language === 'en' ? 'Tracking Stopped' : 'ခြေရာခံမှုရပ်ဆိုင်းထားသည်')
                    }
                  </Text>
                </View>
              </>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.navigateAllButton, packages.length === 0 && styles.navigateAllButtonDisabled]}
            onPress={handleNavigateAll}
            disabled={packages.length === 0}
          >
            <Text style={styles.navigateAllIcon}>🧭</Text>
            <Text style={styles.navigateAllText}>
              {packages.length > 0 
                ? (language === 'zh' ? `规划路线 (${packages.length}站)` : language === 'en' ? `Plan Route (${packages.length} stops)` : `လမ်းကြောင်းစီစဉ် (${packages.length} ဂိတ်)`)
                : (language === 'zh' ? '暂无任务' : language === 'en' ? 'No Tasks' : 'တာဝန်မရှိ')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          📦 {language === 'zh' ? `配送顺序 (${packages.length})` : language === 'en' ? `Delivery Order (${packages.length})` : `ပို့ဆောင်မည့်အစဉ် (${packages.length})`}
        </Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>
              {language === 'zh' ? '正在加载包裹信息...' : language === 'en' ? 'Loading packages...' : 'အထုပ်များကိုရယူနေသည်...'}
            </Text>
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>
              {language === 'zh' ? '暂无配送任务' : language === 'en' ? 'No Delivery Tasks' : 'ပို့ဆောင်ရန်တာဝန်မရှိ'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {language === 'zh' ? '等待管理员分配新的包裹' : language === 'en' ? 'Waiting for new package assignments' : 'အထုပ်အသစ်များရယူရန်စောင့်ဆိုင်းနေသည်'}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => loadPackages(true)}
            >
              <Text style={styles.refreshButtonText}>
                🔄 {language === 'zh' ? '刷新' : language === 'en' ? 'Refresh' : 'ပြန်လည်ရယူရန်'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={packages}
            renderItem={renderPackageItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
                tintColor="#3b82f6"
                title={language === 'zh' ? '下拉刷新' : language === 'en' ? 'Pull to refresh' : 'ပြန်လည်ရယူရန်ဆွဲပါ'}
                titleColor="#6b7280"
              />
            }
            // 性能优化
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 200, // 估算的包裹卡片高度
              offset: 200 * index,
              index,
            })}
          />
        )}
      </View>

      {/* 🗺️ 地图预览Modal（显示数字标记 1,2,3,4） */}
      <Modal
        visible={showMapPreview}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMapPreview(false)}
      >
        <View style={styles.mapModalContainer}>
          {/* 地图标题栏 */}
          <View style={styles.mapModalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowMapPreview(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>📍 配送路线预览</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* 地图视图 */}
          {location && optimizedPackagesWithCoords.length > 0 && (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
            >
              {/* 骑手当前位置标记（绿色圆点） */}
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="我的位置"
                description="骑手当前位置"
              >
                <View style={styles.courierMarker}>
                  <Text style={styles.courierMarkerText}>🏍️</Text>
                </View>
              </Marker>

              {/* 取货点标记（P-1, P-2, P-3...） */}
              {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
                if (!pkg.pickupCoords) return null;
                return (
                  <Marker
                    key={`pickup-${pkg.id}`}
                    coordinate={{
                      latitude: pkg.pickupCoords.lat,
                      longitude: pkg.pickupCoords.lng,
                    }}
                    title={`P-${index + 1}. 取货点: ${pkg.sender_name}`}
                    description={pkg.sender_address}
                  >
                    <View style={styles.pickupMarker}>
                      <Text style={styles.pickupMarkerText}>P-{index + 1}</Text>
                    </View>
                  </Marker>
                );
              })}

              {/* 送货点标记（D-1A, D-2A, D-3A...） */}
              {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
                if (!pkg.deliveryCoords) return null;
                return (
                  <Marker
                    key={`delivery-${pkg.id}`}
                    coordinate={{
                      latitude: pkg.deliveryCoords.lat,
                      longitude: pkg.deliveryCoords.lng,
                    }}
                    title={`D-${index + 1}A. 送货点: ${pkg.receiver_name}`}
                    description={pkg.receiver_address}
                  >
                    <View style={styles.packageMarker}>
                      <Text style={styles.packageMarkerNumber}>D-{index + 1}A</Text>
                    </View>
                  </Marker>
                );
              })}

              {/* 完整配送路线连线 */}
              {location && optimizedPackagesWithCoords.length > 0 && (
                <>
                  {/* 从当前位置到第一个取货点的路线（绿色） */}
                  {optimizedPackagesWithCoords[0]?.pickupCoords && (
                    <Polyline
                      coordinates={[
                        { latitude: location.latitude, longitude: location.longitude },
                        { 
                          latitude: optimizedPackagesWithCoords[0].pickupCoords.lat, 
                          longitude: optimizedPackagesWithCoords[0].pickupCoords.lng 
                        }
                      ]}
                      strokeColor="#10b981"
                      strokeWidth={4}
                      lineDashPattern={[8, 4]}
                    />
                  )}
                  
                  {/* 取货点到送货点的路线（橙色） */}
                  {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
                    if (!pkg.pickupCoords || !pkg.deliveryCoords) return null;
                    return (
                      <Polyline
                        key={`pickup-delivery-${pkg.id}`}
                        coordinates={[
                          { 
                            latitude: pkg.pickupCoords.lat, 
                            longitude: pkg.pickupCoords.lng 
                          },
                          { 
                            latitude: pkg.deliveryCoords.lat, 
                            longitude: pkg.deliveryCoords.lng 
                          }
                        ]}
                        strokeColor="#f59e0b"
                        strokeWidth={3}
                        lineDashPattern={[6, 3]}
                      />
                    );
                  })}
                  
                  {/* 送货点到下一个取货点的路线（蓝色） */}
                  {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
                    if (index === optimizedPackagesWithCoords.length - 1) return null;
                    const nextPkg = optimizedPackagesWithCoords[index + 1];
                    if (!pkg.deliveryCoords || !nextPkg.pickupCoords) return null;
                    
                    return (
                      <Polyline
                        key={`delivery-pickup-${pkg.id}`}
                        coordinates={[
                          { 
                            latitude: pkg.deliveryCoords.lat, 
                            longitude: pkg.deliveryCoords.lng 
                          },
                          { 
                            latitude: nextPkg.pickupCoords.lat, 
                            longitude: nextPkg.pickupCoords.lng 
                          }
                        ]}
                        strokeColor="#3b82f6"
                        strokeWidth={2}
                        lineDashPattern={[4, 2]}
                      />
                    );
                  })}
                </>
              )}
            </MapView>
          )}

          {/* 底部操作按钮 */}
          <View style={styles.mapModalFooter}>
            <TouchableOpacity 
              style={styles.startNavigationButton}
              onPress={openGoogleMapsNavigation}
            >
              <Text style={styles.startNavigationText}>
                🚀 {language === 'zh' ? '开始导航' : language === 'en' ? 'Start Navigation' : 'လမ်းညွှန်စတင်ရန်'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 配送顺序列表 */}
          <View style={styles.routeList}>
            <Text style={styles.routeListTitle}>
              {language === 'zh' ? '配送顺序：' : language === 'en' ? 'Delivery Order:' : 'ပို့ဆောင်မည့်အစဉ်:'}
            </Text>
            {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
              // 计算包裹编号：基于创建时间排序，确保编号稳定
              const sortedPackages = [...packages].sort((a, b) => {
                const timeA = new Date(a.created_at || a.create_time || 0).getTime();
                const timeB = new Date(b.created_at || b.create_time || 0).getTime();
                return timeA - timeB;
              });
              const packageNumber = sortedPackages.findIndex(p => p.id === pkg.id) + 1;
              
              return (
                <View key={pkg.id} style={styles.routeListItem}>
                  <View style={styles.routeNumber}>
                    <Text style={styles.routeNumberText}>{packageNumber}</Text>
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>包裹 {packageNumber}: {pkg.receiver_name}</Text>
                    
                    {/* 取货点信息 */}
                    <View style={styles.pickupInfo}>
                      <Text style={styles.pickupLabel}>P-{packageNumber} 取货点: {pkg.sender_name}</Text>
                      <Text style={styles.pickupAddress}>{pkg.sender_address}</Text>
                      {pkg.pickupDistance !== null && (
                        <Text style={styles.pickupDistance}>距离: {pkg.pickupDistance.toFixed(1)}km</Text>
                      )}
                      {pkg.pickupCoords && (
                        <Text style={styles.pickupCoords}>🧭 {pkg.pickupCoords.lat.toFixed(6)}, {pkg.pickupCoords.lng.toFixed(6)}</Text>
                      )}
                    </View>
                    
                    {/* 送货点信息 */}
                    <View style={styles.deliveryInfo}>
                      <Text style={styles.deliveryLabel}>D-{packageNumber}A 送货点: {pkg.receiver_name}</Text>
                      <Text style={styles.deliveryAddress}>{pkg.receiver_address}</Text>
                      {pkg.deliveryDistance !== null && (
                        <Text style={styles.deliveryDistance}>距离: {pkg.deliveryDistance.toFixed(1)}km</Text>
                      )}
                      {pkg.deliveryCoords && (
                        <Text style={styles.deliveryCoords}>🧭 {pkg.deliveryCoords.lat.toFixed(6)}, {pkg.deliveryCoords.lng.toFixed(6)}</Text>
                      )}
                    </View>
                    
                    {/* 总距离 */}
                    {pkg.totalDistance !== null && (
                      <Text style={styles.totalDistance}>
                        📏 总距离: {pkg.totalDistance.toFixed(1)}km
                      </Text>
                    )}
                    
                    {/* 优先级信息 */}
                    <Text style={styles.routeSource}>
                      {`📡 ${getLocationSourceLabel(pkg.locationSource || 'fallback')}`}
                      {pkg.delivery_speed && ` · ${pkg.delivery_speed}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* 📸 拍照Modal */}
      <Modal
        visible={showCameraModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.cameraModalContainer}>
          <View style={styles.cameraModalContent}>
            <View style={styles.cameraModalHeader}>
              <Text style={styles.cameraModalTitle}>
                📸 {language === 'zh' ? '拍摄配送照片' : language === 'en' ? 'Take Delivery Photo' : 'ပို့ဆောင်ရေးဓာတ်ပုံရိုက်ပါ'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCameraModal(false)}
                style={styles.cameraModalCloseButton}
              >
                <Text style={styles.cameraModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.cameraModalBody}>
              <Text style={styles.cameraModalDescription}>
                {language === 'zh' ? '请拍摄包裹送达照片作为配送证明' : language === 'en' ? 'Please take a photo of the delivered package as proof' : 'ပို့ဆောင်ပြီးသားပက်ကေ့ဂျ်ဓာတ်ပုံကို သက်သေအဖြစ် ရိုက်ပါ'}
              </Text>
              
              <TouchableOpacity
                onPress={handleOpenCamera}
                style={styles.cameraButton}
              >
                <Text style={styles.cameraButtonText}>
                  📷 {language === 'zh' ? '打开相机' : language === 'en' ? 'Open Camera' : 'ကင်မရာဖွင့်ပါ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 📷 照片预览Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.photoModalContainer}>
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>
                📷 {language === 'zh' ? '配送照片预览' : language === 'en' ? 'Delivery Photo Preview' : 'ပို့ဆောင်ရေးဓာတ်ပုံအစမ်းကြည့်ရန်'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPhotoModal(false);
                  setCapturedPhoto(null);
                  setCurrentPackageForDelivery(null);
                }}
                style={styles.photoModalCloseButton}
              >
                <Text style={styles.photoModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.photoModalBody}>
              {capturedPhoto && (
                <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} />
              )}
              
              <View style={styles.photoModalActions}>
                <TouchableOpacity
                  onPress={() => {
                    setShowPhotoModal(false);
                    setCapturedPhoto(null);
                    setShowCameraModal(true);
                  }}
                  style={styles.retakeButton}
                >
                  <Text style={styles.retakeButtonText}>
                    🔄 {language === 'zh' ? '重新拍照' : language === 'en' ? 'Retake' : 'ပြန်ရိုက်ပါ'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleUploadPhoto}
                  disabled={uploadingPhoto}
                  style={[styles.uploadButton, uploadingPhoto && styles.uploadButtonDisabled]}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.uploadButtonText}>
                      📤 {language === 'zh' ? '上传并完成配送' : language === 'en' ? 'Upload & Complete' : 'တင်ပြီး ပြီးမြောက်ပါ'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🗺️ 单个包裹地图Modal */}
      <Modal
        visible={showSingleMapModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowSingleMapModal(false)}
      >
        <View style={styles.mapModalContainer}>
          {/* 地图标题栏 */}
          <View style={styles.mapModalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSingleMapModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>📍 包裹配送路线</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* 地图视图 */}
          {location && selectedPackageForMap && (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
            >
              {/* 骑手当前位置标记（绿色圆点） */}
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="我的位置"
                description="骑手当前位置"
              >
                <View style={styles.courierMarker}>
                  <Text style={styles.courierMarkerText}>🏍️</Text>
                </View>
              </Marker>

              {/* 取货点标记（P-1） */}
              {selectedPackageForMap.pickupCoords && (
                <Marker
                  coordinate={{
                    latitude: selectedPackageForMap.pickupCoords.lat,
                    longitude: selectedPackageForMap.pickupCoords.lng,
                  }}
                  title={`P-1. 取货点: ${selectedPackageForMap.sender_name}`}
                  description={selectedPackageForMap.sender_address}
                >
                  <View style={styles.pickupMarker}>
                    <Text style={styles.pickupMarkerText}>P-1</Text>
                  </View>
                </Marker>
              )}

              {/* 送货点标记（D-1A） */}
              {selectedPackageForMap.deliveryCoords && (
                <Marker
                  coordinate={{
                    latitude: selectedPackageForMap.deliveryCoords.lat,
                    longitude: selectedPackageForMap.deliveryCoords.lng,
                  }}
                  title={`D-1A. 送货点: ${selectedPackageForMap.receiver_name}`}
                  description={selectedPackageForMap.receiver_address}
                >
                  <View style={styles.packageMarker}>
                    <Text style={styles.packageMarkerNumber}>D-1A</Text>
                  </View>
                </Marker>
              )}

              {/* 配送路线连线 */}
              {selectedPackageForMap.pickupCoords && selectedPackageForMap.deliveryCoords && (
                <>
                  {/* 从当前位置到取货点的路线（绿色） */}
                  <Polyline
                    coordinates={[
                      { latitude: location.latitude, longitude: location.longitude },
                      { 
                        latitude: selectedPackageForMap.pickupCoords.lat, 
                        longitude: selectedPackageForMap.pickupCoords.lng 
                      }
                    ]}
                    strokeColor="#10b981"
                    strokeWidth={4}
                    lineDashPattern={[8, 4]}
                  />
                  
                  {/* 从取货点到送货点的路线（橙色） */}
                  <Polyline
                    coordinates={[
                      { 
                        latitude: selectedPackageForMap.pickupCoords.lat, 
                        longitude: selectedPackageForMap.pickupCoords.lng 
                      },
                      { 
                        latitude: selectedPackageForMap.deliveryCoords.lat, 
                        longitude: selectedPackageForMap.deliveryCoords.lng 
                      }
                    ]}
                    strokeColor="#f59e0b"
                    strokeWidth={4}
                    lineDashPattern={[6, 3]}
                  />
                </>
              )}
            </MapView>
          )}

          {/* 底部操作按钮 */}
          <View style={styles.mapModalFooter}>
            <TouchableOpacity 
              style={styles.startNavigationButton}
              onPress={async () => {
                if (!selectedPackageForMap || !location) return;
                
                try {
                  const origin = `${location.latitude},${location.longitude}`;
                  const destination = `${selectedPackageForMap.deliveryCoords?.lat},${selectedPackageForMap.deliveryCoords?.lng}`;
                  
                  const candidateUrls = [
                    `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`,
                    `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`,
                  ];

                  let opened = false;
                  for (const url of candidateUrls) {
                    if (await Linking.canOpenURL(url)) {
                      await Linking.openURL(url);
                      opened = true;
                      break;
                    }
                  }

                  if (!opened) {
                    const fallbackUrl = `http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
                    await Linking.openURL(fallbackUrl);
                  }
                  
                  setShowSingleMapModal(false);
                } catch (error) {
                  console.error('打开导航失败:', error);
                  Alert.alert('错误', '无法打开导航应用');
                }
              }}
            >
              <Text style={styles.startNavigationText}>
                🚀 {language === 'zh' ? '开始导航' : language === 'en' ? 'Start Navigation' : 'လမ်းညွှန်စတင်ရန်'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 包裹信息 */}
          {selectedPackageForMap && (
            <View style={styles.singlePackageInfo}>
              <Text style={styles.singlePackageTitle}>
                📦 {selectedPackageForMap.id} - {selectedPackageForMap.receiver_name}
              </Text>
              
              {/* 取货点信息 */}
              <View style={styles.singlePackageSection}>
                <Text style={styles.singlePackageLabel}>A. 取货点: {selectedPackageForMap.sender_name}</Text>
                <Text style={styles.singlePackageAddress}>{selectedPackageForMap.sender_address}</Text>
                {selectedPackageForMap.pickupDistance !== null && selectedPackageForMap.pickupDistance !== undefined && (
                  <Text style={styles.singlePackageDistance}>距离: {selectedPackageForMap.pickupDistance.toFixed(1)}km</Text>
                )}
              </View>
              
              {/* 送货点信息 */}
              <View style={styles.singlePackageSection}>
                <Text style={styles.singlePackageLabel}>1. 送货点: {selectedPackageForMap.receiver_name}</Text>
                <Text style={styles.singlePackageAddress}>{selectedPackageForMap.receiver_address}</Text>
                {selectedPackageForMap.deliveryDistance !== null && selectedPackageForMap.deliveryDistance !== undefined && (
                  <Text style={styles.singlePackageDistance}>距离: {selectedPackageForMap.deliveryDistance.toFixed(1)}km</Text>
                )}
              </View>
              
              {/* 总距离 */}
              {selectedPackageForMap.totalDistance !== null && selectedPackageForMap.totalDistance !== undefined && (
                <Text style={styles.singlePackageTotalDistance}>
                  📏 总距离: {selectedPackageForMap.totalDistance.toFixed(1)}km
                </Text>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  header: {
    backgroundColor: '#2c5282',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshText: {
    fontSize: 20,
  },
  locationCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  locationCoords: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  navigateAllButton: {
    backgroundColor: '#3182ce',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navigateAllButtonDisabled: {
    backgroundColor: '#cbd5e0',
  },
  navigateAllIcon: {
    fontSize: 14,
  },
  navigateAllText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  numberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  packageInfo: {
    flex: 1,
  },
  packageId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 2,
  },
  receiverName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  address: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
  },
  packageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  packageType: {
    fontSize: 10,
    color: '#999',
  },
  speedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffc107',
    gap: 3,
  },
  speedIcon: {
    fontSize: 10,
  },
  speedText: {
    fontSize: 9,
    color: '#856404',
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },
  currentDeliveringCard: {
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  deliveringBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  deliveringText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  actionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  placeholderButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  completedButton: {
    flex: 1,
    backgroundColor: '#d1fae5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  startDeliveryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  startDeliveryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  finishDeliveryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  finishDeliveryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  navButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  navButtonText: {
    fontSize: 20,
  },
  navButtonLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  trackingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trackingIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  trackingText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  // 🗺️ 地图预览Modal样式
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapModalHeader: {
    backgroundColor: '#2c5282',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  mapModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  map: {
    width: width,
    height: height * 0.5,
  },
  courierMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  courierMarkerText: {
    fontSize: 20,
  },
  packageMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3182ce',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  packageMarkerNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 取货点标记样式
  pickupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarkerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapModalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  startNavigationButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startNavigationText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  routeList: {
    flex: 1,
    backgroundColor: '#f7fafc',
    padding: 16,
  },
  routeListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  routeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  routeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3182ce',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  routeDistance: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  // 拍照Modal样式
  cameraModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cameraModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cameraModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cameraModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraModalCloseText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  cameraModalBody: {
    padding: 20,
  },
  cameraModalDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  cameraButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 照片预览Modal样式
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  photoModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalCloseText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  photoModalBody: {
    padding: 20,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#f3f4f6',
  },
  photoModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    flex: 2,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  coordsText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  // 新增样式
  pickupSection: {
    backgroundColor: '#fef3c7',
    padding: 6,
    borderRadius: 4,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  deliverySection: {
    backgroundColor: '#dbeafe',
    padding: 6,
    borderRadius: 4,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 3,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  coordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 4,
    borderRadius: 4,
  },
  coordsLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginRight: 4,
    fontWeight: '500',
  },
  totalDistanceText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    textAlign: 'center',
  },
  routeCoords: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  locationSourceTag: {
    fontSize: 10,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  routeSource: {
    fontSize: 10,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  // 取货点样式
  pickupInfo: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  pickupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  pickupAddress: {
    fontSize: 11,
    color: '#78350f',
    marginBottom: 2,
  },
  pickupDistance: {
    fontSize: 10,
    color: '#a16207',
    fontWeight: '500',
  },
  pickupCoords: {
    fontSize: 9,
    color: '#a16207',
    fontFamily: 'monospace',
  },
  // 送货点样式
  deliveryInfo: {
    backgroundColor: '#dbeafe',
    padding: 8,
    borderRadius: 6,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  deliveryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 2,
  },
  deliveryAddress: {
    fontSize: 11,
    color: '#1e3a8a',
    marginBottom: 2,
  },
  deliveryDistance: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '500',
  },
  deliveryCoords: {
    fontSize: 9,
    color: '#2563eb',
    fontFamily: 'monospace',
  },
  // 总距离样式
  totalDistance: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 4,
    textAlign: 'center',
  },
  
  // 单个包裹地图样式
  singlePackageInfo: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  singlePackageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  singlePackageSection: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  singlePackageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  singlePackageAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  singlePackageDistance: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  singlePackageTotalDistance: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  
  // 分配状态样式
  assignmentStatus: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  assignedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    textAlign: 'center',
  },
  unassignedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
    textAlign: 'center',
  },
});