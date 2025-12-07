import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  TextInput,
  ScrollView,
  Vibration,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { Animated } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useApp } from '../contexts/AppContext';
import { packageService, Package, supabase, deliveryPhotoService } from '../services/supabase';
import { AppState, AppStateStatus } from 'react-native';

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

// 计算两点间距离（海里公式）
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // 地球半径（米）
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // 返回米
};

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
  
  // 位置追踪优化
  const lastUpdateLocation = useRef<{lat: number, lng: number, time: number} | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 拍照相关状态
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSingleMapModal, setShowSingleMapModal] = useState(false);
  const [selectedPackageForMap, setSelectedPackageForMap] = useState<PackageWithExtras | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPackageForDelivery, setCurrentPackageForDelivery] = useState<PackageWithExtras | null>(null);

  // 筛选和搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('全部'); // 全部、待取件、已取件、配送中、已送达
  const [distanceFilter, setDistanceFilter] = useState<string>('全部'); // 全部、最近优先、最远优先
  const [speedFilter, setSpeedFilter] = useState<string>('全部'); // 全部、急送达、准时达、定时达
  const [showFilterModal, setShowFilterModal] = useState(false);

  // 路线优化相关状态
  const [optimizationStrategy, setOptimizationStrategy] = useState<'shortest' | 'fastest' | 'priority'>('shortest'); // 最短距离、最快时间、优先级
  const [originalRouteDistance, setOriginalRouteDistance] = useState<number>(0);
  const [optimizedRouteDistance, setOptimizedRouteDistance] = useState<number>(0);
  const [showOptimizationInfo, setShowOptimizationInfo] = useState(false);
  const [optimizedRouteTime, setOptimizedRouteTime] = useState<number>(0); // 总预计时间（分钟）

  // 性能优化和实时更新相关状态
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // 秒
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isBackground, setIsBackground] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const networkListenerRef = useRef<any>(null);
  const appStateListenerRef = useRef<any>(null);
  
  // 可视化增强相关状态
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const pulseAnimations = useRef<Record<string, Animated.Value>>({});
  const [showAlertSettings, setShowAlertSettings] = useState<boolean>(false);

  // 智能提醒系统相关状态
  const [alertSettings, setAlertSettings] = useState({
    arrivalAlertEnabled: true,
    arrivalDistance: 100, // 米
    timeoutAlertEnabled: true,
    timeoutMinutes: 30, // 分钟
    routeDeviationAlertEnabled: true,
    deviationDistance: 500, // 米
    voiceAlertEnabled: false,
  });
  const [activeAlerts, setActiveAlerts] = useState<Set<string>>(new Set());
  const alertCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const packageStartTimes = useRef<Record<string, number>>({});
  const lastAlertTimes = useRef<Record<string, number>>({});

  // 店铺列表状态
  const [deliveryStores, setDeliveryStores] = useState<any[]>([]);

  // 加载店铺列表
  const loadDeliveryStores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .select('id, store_name, store_code');
      if (error) {
        console.warn('获取店铺列表失败:', error);
        return;
      }
      setDeliveryStores(data || []);
    } catch (error) {
      console.warn('获取店铺列表异常:', error);
    }
  }, []);

  useEffect(() => {
    requestLocationPermission();
    loadPackages();
    loadDeliveryStores();
    loadCurrentDeliveringPackage();
    
    // 启动位置追踪
    startLocationTracking();
    
    // 设置骑手状态为活跃
    updateCourierStatus('active');

    // 初始化网络状态监听
    initNetworkListener();
    
    // 初始化应用状态监听
    initAppStateListener();
    
    // 启动自动刷新
    if (autoRefreshEnabled) {
      startAutoRefresh();
    }

    // 启动智能提醒系统
    startAlertSystem();

    // 清理函数
    return () => {
      stopLocationTracking();
      updateCourierStatus('inactive');
      cleanupMemory();
      stopAutoRefresh();
      removeNetworkListener();
      removeAppStateListener();
      stopAlertSystem();
    };
  }, []);

  // 智能提醒系统
  const startAlertSystem = useCallback(() => {
    if (alertCheckIntervalRef.current) {
      clearInterval(alertCheckIntervalRef.current);
    }

    // 每10秒检查一次提醒条件
    alertCheckIntervalRef.current = setInterval(() => {
      checkAlerts();
    }, 10000);

    console.log('🔔 智能提醒系统已启动');
  }, [checkAlerts]);

  const stopAlertSystem = useCallback(() => {
    if (alertCheckIntervalRef.current) {
      clearInterval(alertCheckIntervalRef.current);
      alertCheckIntervalRef.current = null;
    }
  }, []);

  // 检查所有提醒条件
  const checkAlerts = useCallback(async () => {
    if (!location || packages.length === 0) return;

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const currentLat = currentLocation.coords.latitude;
      const currentLng = currentLocation.coords.longitude;

      // 检查每个包裹的提醒条件
      for (const pkg of packages) {
        // 记录包裹开始配送时间
        if (pkg.status === '配送中' && !packageStartTimes.current[pkg.id]) {
          packageStartTimes.current[pkg.id] = Date.now();
        }
        // 1. 到达取货点提醒
        if (alertSettings.arrivalAlertEnabled && pkg.status === '待取件' && pkg.pickupCoords) {
          const distance = calculateDistance(
            currentLat,
            currentLng,
            pkg.pickupCoords.lat,
            pkg.pickupCoords.lng
          ) * 1000; // 转换为米

          if (distance <= alertSettings.arrivalDistance) {
            const alertKey = `arrival-pickup-${pkg.id}`;
            if (!activeAlerts.has(alertKey)) {
              triggerArrivalAlert('pickup', pkg);
              setActiveAlerts(prev => new Set(prev).add(alertKey));
              lastAlertTimes.current[alertKey] = Date.now();
            }
          }
        }

        // 2. 到达送货点提醒
        if (alertSettings.arrivalAlertEnabled && 
            (pkg.status === '已取件' || pkg.status === '配送中') && 
            pkg.deliveryCoords) {
          const distance = calculateDistance(
            currentLat,
            currentLng,
            pkg.deliveryCoords.lat,
            pkg.deliveryCoords.lng
          ) * 1000; // 转换为米

          if (distance <= alertSettings.arrivalDistance) {
            const alertKey = `arrival-delivery-${pkg.id}`;
            if (!activeAlerts.has(alertKey)) {
              triggerArrivalAlert('delivery', pkg);
              setActiveAlerts(prev => new Set(prev).add(alertKey));
              lastAlertTimes.current[alertKey] = Date.now();
            }
          }
        }

        // 3. 超时提醒
        if (alertSettings.timeoutAlertEnabled && pkg.status === '配送中') {
          const startTime = packageStartTimes.current[pkg.id] || new Date(pkg.updated_at || pkg.create_time || Date.now()).getTime();
          const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);

          if (elapsedMinutes >= alertSettings.timeoutMinutes) {
            const alertKey = `timeout-${pkg.id}`;
            if (!activeAlerts.has(alertKey)) {
              triggerTimeoutAlert(pkg, elapsedMinutes);
              setActiveAlerts(prev => new Set(prev).add(alertKey));
              lastAlertTimes.current[alertKey] = Date.now();
            }
          }
        }

        // 4. 路线偏离提醒（检查是否偏离优化路线）
        if (alertSettings.routeDeviationAlertEnabled && 
            optimizedPackagesWithCoords.length > 0 &&
            (pkg.status === '已取件' || pkg.status === '配送中')) {
          const optimizedPkg = optimizedPackagesWithCoords.find(op => op.id === pkg.id);
          if (optimizedPkg && optimizedPkg.deliveryCoords) {
            const distance = calculateDistance(
              currentLat,
              currentLng,
              optimizedPkg.deliveryCoords.lat,
              optimizedPkg.deliveryCoords.lng
            ) * 1000; // 转换为米

            if (distance > alertSettings.deviationDistance) {
              const alertKey = `deviation-${pkg.id}`;
              // 避免频繁提醒，至少间隔5分钟
              const lastAlertTime = lastAlertTimes.current[alertKey] || 0;
              if (Date.now() - lastAlertTime > 5 * 60 * 1000) {
                triggerDeviationAlert(pkg, distance);
                setActiveAlerts(prev => new Set(prev).add(alertKey));
                lastAlertTimes.current[alertKey] = Date.now();
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('检查提醒失败:', error);
    }
  }, [location, packages, alertSettings, activeAlerts, optimizedPackagesWithCoords, triggerArrivalAlert, triggerTimeoutAlert, triggerDeviationAlert, language]);

  // 触发到达提醒
  const triggerArrivalAlert = useCallback((type: 'pickup' | 'delivery', pkg: PackageWithExtras) => {
    const message = type === 'pickup'
      ? (language === 'zh' 
          ? `您已到达取货点：${pkg.sender_name}` 
          : language === 'en' 
          ? `Arrived at pickup: ${pkg.sender_name}`
          : `ကောက်ယူရန်နေရာသို့ရောက်ရှိပြီ: ${pkg.sender_name}`)
      : (language === 'zh'
          ? `您已到达送货点：${pkg.receiver_name}`
          : language === 'en'
          ? `Arrived at delivery: ${pkg.receiver_name}`
          : `ပို့ဆောင်ရန်နေရာသို့ရောက်ရှိပြီ: ${pkg.receiver_name}`);

    // 震动反馈
    Vibration.vibrate([100, 50, 100]);
    
    // 触觉反馈
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 显示提醒
    Alert.alert(
      language === 'zh' ? '📍 到达提醒' : language === 'en' ? '📍 Arrival Alert' : '📍 ရောက်ရှိမှုသတိပေးချက်',
      message,
      [{ text: language === 'zh' ? '确定' : language === 'en' ? 'OK' : 'အိုကေ' }]
    );

    console.log('🔔', message);
  }, [language]);

  // 触发超时提醒
  const triggerTimeoutAlert = useCallback((pkg: PackageWithExtras, elapsedMinutes: number) => {
    const message = language === 'zh'
      ? `包裹 ${pkg.id} 已配送超过 ${Math.floor(elapsedMinutes)} 分钟，请检查状态`
      : language === 'en'
      ? `Package ${pkg.id} has been in delivery for over ${Math.floor(elapsedMinutes)} minutes`
      : `အထုပ် ${pkg.id} သည် ${Math.floor(elapsedMinutes)} မိနစ်ကျော်ပို့ဆောင်နေသည်`;

    // 震动反馈
    Vibration.vibrate([200, 100, 200, 100, 200]);
    
    // 触觉反馈
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      language === 'zh' ? '⏰ 超时提醒' : language === 'en' ? '⏰ Timeout Alert' : '⏰ အချိန်ကျော်သတိပေးချက်',
      message,
      [{ text: language === 'zh' ? '确定' : language === 'en' ? 'OK' : 'အိုကေ' }]
    );

    console.log('⏰', message);
  }, [language]);

  // 触发路线偏离提醒
  const triggerDeviationAlert = useCallback((pkg: PackageWithExtras, distance: number) => {
    const message = language === 'zh'
      ? `您已偏离优化路线约 ${Math.round(distance)} 米，建议返回原路线`
      : language === 'en'
      ? `You have deviated from the optimized route by about ${Math.round(distance)} meters`
      : `အကောင်းဆုံးလမ်းကြောင်းမှ ${Math.round(distance)} မီတာခန့်သွေဖည်နေသည်`;

    // 震动反馈
    Vibration.vibrate([100, 50, 100, 50, 100]);
    
    // 触觉反馈
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Alert.alert(
      language === 'zh' ? '⚠️ 路线偏离提醒' : language === 'en' ? '⚠️ Route Deviation Alert' : '⚠️ လမ်းကြောင်းသွေဖည်မှုသတိပေးချက်',
      message,
      [{ text: language === 'zh' ? '确定' : language === 'en' ? 'OK' : 'အိုကေ' }]
    );

    console.log('⚠️', message);
  }, [language]);


  // 网络状态监听
  const initNetworkListener = useCallback(() => {
    // 检查初始网络状态
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected ?? false);
      if (!state.isConnected) {
        setErrorMessage(language === 'zh' ? '网络连接已断开，正在使用离线模式' : language === 'en' ? 'Network disconnected, using offline mode' : 'အင်တာနက်ချိတ်ဆက်မှုပြတ်တောက်နေသည်');
      }
    });

    // 监听网络状态变化
    networkListenerRef.current = NetInfo.addEventListener(state => {
      const isNowOnline = state.isConnected ?? false;
      
      setIsOnline(prevIsOnline => {
        const wasOffline = !prevIsOnline;
        
        if (wasOffline && isNowOnline) {
          // 从离线恢复到在线，自动刷新数据
          setErrorMessage(null);
          loadPackages(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (!isNowOnline) {
          setErrorMessage(language === 'zh' ? '网络连接已断开，正在使用离线模式' : language === 'en' ? 'Network disconnected, using offline mode' : 'အင်တာနက်ချိတ်ဆက်မှုပြတ်တောက်နေသည်');
        }
        
        return isNowOnline;
      });
    });
  }, [language, loadPackages]);

  const removeNetworkListener = useCallback(() => {
    if (networkListenerRef.current) {
      networkListenerRef.current();
      networkListenerRef.current = null;
    }
  }, []);

  // 应用状态监听（前台/后台）
  const initAppStateListener = useCallback(() => {
    appStateListenerRef.current = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setIsBackground(true);
        // 后台时停止自动刷新
        stopAutoRefresh();
      } else if (nextAppState === 'active') {
        setIsBackground(false);
        // 回到前台时恢复自动刷新并刷新数据
        if (autoRefreshEnabled) {
          startAutoRefresh();
          loadPackages(true);
        }
      }
    });
  }, [autoRefreshEnabled, loadPackages, startAutoRefresh, stopAutoRefresh]);

  const removeAppStateListener = useCallback(() => {
    if (appStateListenerRef.current) {
      appStateListenerRef.current.remove();
      appStateListenerRef.current = null;
    }
  }, []);

  // 自动刷新功能
  const startAutoRefresh = useCallback(() => {
    stopAutoRefresh(); // 先清除之前的定时器
    
    if (isBackground || !autoRefreshEnabled) return;
    
    autoRefreshTimerRef.current = setInterval(() => {
      setIsBackground(prev => {
        setIsOnline(prevOnline => {
          if (!prev && prevOnline) {
            console.log('🔄 自动刷新包裹数据...');
            loadPackages(true);
            setLastUpdateTime(new Date());
          }
          return prevOnline;
        });
        return prev;
      });
    }, autoRefreshInterval * 1000);
  }, [isBackground, autoRefreshEnabled, autoRefreshInterval, loadPackages]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
  }, []);

  // 当自动刷新设置改变时，重新启动定时器
  useEffect(() => {
    if (autoRefreshEnabled && !isBackground) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
    
    return () => {
      stopAutoRefresh();
    };
  }, [autoRefreshEnabled, autoRefreshInterval, isBackground, startAutoRefresh, stopAutoRefresh]);

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

  // 从离线缓存加载数据
  const loadPackagesFromCache = useCallback(async (): Promise<PackageWithExtras[] | null> => {
    try {
      const cachedData = await AsyncStorage.getItem('packages_cache');
      if (cachedData) {
        const { packages: cachedPackages, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        // 缓存有效期24小时
        if (cacheAge < 24 * 60 * 60 * 1000) {
          console.log('📦 从离线缓存加载数据');
          return cachedPackages;
        }
      }
    } catch (error) {
      console.warn('读取离线缓存失败:', error);
    }
    return null;
  }, []);

  // 保存数据到离线缓存
  const savePackagesToCache = useCallback(async (packagesData: PackageWithExtras[]) => {
    try {
      await AsyncStorage.setItem('packages_cache', JSON.stringify({
        packages: packagesData,
        timestamp: Date.now()
      }));
      console.log('💾 数据已保存到离线缓存');
    } catch (error) {
      console.warn('保存离线缓存失败:', error);
    }
  }, []);

  const loadPackages = useCallback(async (forceRefresh = false) => {
    const startTime = Date.now();
    
    try {
      // 检查内存缓存是否有效
      const now = Date.now();
      if (!forceRefresh && packagesCache.current.length > 0 && (now - lastLoadTime.current) < CACHE_DURATION) {
        console.log('📦 使用内存缓存数据');
        setPackages(packagesCache.current);
        trackPerformance('load packages (cache)', startTime);
        setLastUpdateTime(new Date());
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      const currentUser = await AsyncStorage.getItem('currentUserName') || '';
      
      if (!currentUser) {
        Alert.alert(
          language === 'zh' ? '登录状态异常' : language === 'en' ? 'Login Status Error' : 'လော့ဂ်အင်အခြေအနေမမှန်ပါ',
          language === 'zh' ? '请重新登录后再试' : language === 'en' ? 'Please login again' : 'ကျေးဇူးပြု၍ပြန်လည်လော့ဂ်အင်ပြုလုပ်ပါ',
          [{ text: language === 'zh' ? '确定' : language === 'en' ? 'OK' : 'အိုကေ' }]
        );
        setLoading(false);
        return;
      }
      
      console.log('📱 当前用户:', currentUser);
      
      let allPackages: Package[] = [];
      
      // 尝试从网络加载
      if (isOnline) {
        try {
          allPackages = await packageService.getAllPackages();
          console.log('📱 所有包裹:', allPackages.length);
        } catch (networkError) {
          console.warn('网络请求失败，尝试使用离线缓存:', networkError);
          // 网络失败，尝试使用离线缓存
          const cachedPackages = await loadPackagesFromCache();
          if (cachedPackages) {
            packagesCache.current = cachedPackages;
            lastLoadTime.current = now;
            setPackages(cachedPackages);
            setLastUpdateTime(new Date());
            setLoading(false);
            setErrorMessage(language === 'zh' ? '网络连接失败，已加载离线数据' : language === 'en' ? 'Network failed, loaded offline data' : 'အင်တာနက်ချိတ်ဆက်မှုမအောင်မြင်ပါ၊ အော့ဖ်လိုင်းဒေတာကိုရယူပြီးပါပြီ');
            return;
          }
          throw networkError;
        }
      } else {
        // 离线模式，使用缓存
        const cachedPackages = await loadPackagesFromCache();
        if (cachedPackages) {
          packagesCache.current = cachedPackages;
          lastLoadTime.current = now;
          setPackages(cachedPackages);
          setLastUpdateTime(new Date());
          setLoading(false);
          return;
        } else {
          throw new Error('No offline cache available');
        }
      }
      
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
      
      // 更新内存缓存
      packagesCache.current = myPackages;
      lastLoadTime.current = now;
      
      // 保存到离线缓存
      await savePackagesToCache(myPackages);
      
      setPackages(myPackages);
      setLastUpdateTime(new Date());
      trackPerformance('load packages (network)', startTime);
    } catch (error) {
      console.error('加载包裹失败:', error);
      trackPerformance('load packages (error)', startTime);
      
      // 尝试使用离线缓存
      const cachedPackages = await loadPackagesFromCache();
      if (cachedPackages) {
        packagesCache.current = cachedPackages;
        setPackages(cachedPackages);
        setErrorMessage(language === 'zh' ? '网络连接失败，已加载离线数据' : language === 'en' ? 'Network failed, loaded offline data' : 'အင်တာနက်ချိတ်ဆက်မှုမအောင်မြင်ပါ၊ အော့ဖ်လိုင်းဒေတာကိုရယူပြီးပါပြီ');
      } else {
        setErrorMessage(language === 'zh' ? '加载失败，请检查网络连接' : language === 'en' ? 'Loading failed, please check network' : 'ရယူမှုမအောင်မြင်ပါ၊ အင်တာနက်ချိတ်ဆက်မှုကိုစစ်ဆေးပါ');
        Alert.alert(
          language === 'zh' ? '加载失败' : language === 'en' ? 'Loading Failed' : 'ရယူမှုမအောင်မြင်ပါ',
          language === 'zh' ? '无法加载包裹信息，请检查网络连接后重试' : language === 'en' ? 'Unable to load packages, please check your network connection' : 'အထုပ်များကိုရယူ၍မရပါ၊ ကျေးဇူးပြု၍အင်တာနက်ချိတ်ဆက်မှုကိုစစ်ဆေးပါ',
          [
            { text: language === 'zh' ? '重试' : language === 'en' ? 'Retry' : 'ပြန်လည်ကြိုးစားပါ', onPress: () => loadPackages(true) },
            { text: language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်ပါ' }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, language, loadPackagesFromCache, savePackagesToCache]);

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

      // 防止重复启动
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }

      setIsLocationTracking(true);
      
      const updateLocation = async () => {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          const now = Date.now();
          const { latitude, longitude } = currentLocation.coords;
          
          let shouldUpdate = false;
          
          if (!lastUpdateLocation.current) {
            shouldUpdate = true;
          } else {
            const distance = calculateDistance(
              lastUpdateLocation.current.lat,
              lastUpdateLocation.current.lng,
              latitude,
              longitude
            );
            
            // 策略：
            // 1. 如果移动超过 20 米 -> 更新
            // 2. 如果静止，但距离上次更新超过 5 分钟 (心跳包) -> 更新
            // 3. 否则 -> 跳过
            
            const timeDiff = now - lastUpdateLocation.current.time;
            
            if (distance > 20) {
               console.log(`📍 移动距离 ${Math.round(distance)}米 > 20米，触发更新`);
               shouldUpdate = true;
            } else if (timeDiff > 5 * 60 * 1000) {
               console.log(`📍 静止超时 ${Math.round(timeDiff/1000)}秒 > 300秒，触发心跳更新`);
               shouldUpdate = true;
            } else {
               // console.log(`📍 位置未显著变化 (${Math.round(distance)}米)，跳过更新`);
            }
          }

          if (shouldUpdate) {
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

            lastUpdateLocation.current = {
                lat: latitude,
                lng: longitude,
                time: now
            };

            console.log('✅ 数据库位置已更新:', {
              lat: latitude,
              lng: longitude,
              time: new Date().toLocaleTimeString()
            });
          }
        } catch (error) {
          console.error('位置更新失败:', error);
        }
      };

      // 立即执行一次
      updateLocation();

      // 每60秒检查一次
      const interval = setInterval(updateLocation, 60000); 
      locationIntervalRef.current = interval;
      setLocationUpdateInterval(interval);
    } catch (error) {
      console.error('启动位置追踪失败:', error);
      setIsLocationTracking(false);
    }
  };

  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
    }
    setLocationUpdateInterval(null);
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
      
      // 记录开始配送时间（用于超时提醒）
      packageStartTimes.current[packageId] = Date.now();
      
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

  // 计算路线总距离
  const calculateRouteDistance = (packagesList: PackageWithExtras[], startLocation: { lat: number; lng: number }): number => {
    if (!packagesList || packagesList.length === 0) return 0;
    
    let totalDistance = 0;
    let currentPosition = startLocation;

    for (const pkg of packagesList) {
      // 到取货点
      if (pkg.pickupCoords) {
        const distToPickup = calculateDistance(
          currentPosition.lat, currentPosition.lng,
          pkg.pickupCoords.lat, pkg.pickupCoords.lng
        ) / 1000; // 转换为公里
        totalDistance += distToPickup;
        currentPosition = { lat: pkg.pickupCoords.lat, lng: pkg.pickupCoords.lng };
      }
      
      // 到送货点
      if (pkg.deliveryCoords) {
        const distToDelivery = calculateDistance(
          currentPosition.lat, currentPosition.lng,
          pkg.deliveryCoords.lat, pkg.deliveryCoords.lng
        ) / 1000; // 转换为公里
        totalDistance += distToDelivery;
        currentPosition = { lat: pkg.deliveryCoords.lat, lng: pkg.deliveryCoords.lng };
      }
    }

    return totalDistance;
  };

  // 🎯 智能路线优化算法（考虑取货点和送货点的最优路径）
  const optimizeDeliveryRoute = async (packagesList: PackageWithExtras[], strategy: 'shortest' | 'fastest' | 'priority' = 'shortest'): Promise<PackageWithExtras[]> => {
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

      // 2. 根据策略选择排序方式
      let sortedPackages: PackageWithExtras[];
      
      if (strategy === 'shortest') {
        // 最短距离：按总距离排序
        sortedPackages = packagesWithCoords.sort((a, b) => {
          const distA = a.totalDistance ?? 999;
          const distB = b.totalDistance ?? 999;
          return distA - distB;
        });
      } else if (strategy === 'fastest') {
        // 最快时间：考虑配送速度，急送达优先
        sortedPackages = packagesWithCoords.sort((a, b) => {
          const speedWeightA = a.delivery_speed === '急送达' ? 0.5 : a.delivery_speed === '准时达' ? 1 : 1.2;
          const speedWeightB = b.delivery_speed === '急送达' ? 0.5 : b.delivery_speed === '准时达' ? 1 : 1.2;
          const timeA = (a.totalDistance ?? 999) * speedWeightA;
          const timeB = (b.totalDistance ?? 999) * speedWeightB;
          return timeA - timeB;
        });
      } else {
        // 优先级：按优先级分数排序（总距离近 + 紧急程度高的优先）
        sortedPackages = packagesWithCoords.sort((a, b) => {
          return a.priorityScore - b.priorityScore;
        });
      }

      // 3. 使用改进的贪心算法优化路线（考虑取货和送货的完整路径）
      const optimizedRoute: PackageWithExtras[] = [];
      const remaining = [...sortedPackages];
      let currentLat = location.latitude;
      let currentLng = location.longitude;

      console.log('📍 当前位置:', currentLat, currentLng);
      console.log(`🎯 优化策略: ${strategy === 'shortest' ? '最短距离' : strategy === 'fastest' ? '最快时间' : '优先级'}`);

      while (remaining.length > 0) {
        // 找到距离当前位置最近的包裹（考虑取货点）
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        let nearestType = 'pickup'; // 'pickup' 或 'delivery'

        for (let i = 0; i < remaining.length; i++) {
          const pkg = remaining[i];
          
          // 计算到取货点的距离
          if (pkg.pickupCoords) {
            let pickupDist = calculateDistance(currentLat, currentLng, pkg.pickupCoords.lat, pkg.pickupCoords.lng);
            
            // 根据策略调整距离权重
            if (strategy === 'fastest') {
              // 最快时间：急送达优先
              if (pkg.delivery_speed === '急送达') {
                pickupDist *= 0.5; // 急送达权重更高
              } else if (pkg.delivery_speed === '定时达') {
                pickupDist *= 1.2; // 定时达权重稍低
              }
            } else if (strategy === 'priority') {
              // 优先级：急送达优先
              if (pkg.delivery_speed === '急送达') {
                pickupDist *= 0.7;
              }
            }
            
            if (pickupDist < nearestDistance) {
              nearestDistance = pickupDist;
              nearestIndex = i;
              nearestType = 'pickup';
            }
          }
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
      
      // 1. 先为所有包裹解析坐标（用于计算原始距离）
      const packagesWithCoords = await Promise.all(
        packages.map(async (pkg: Package) => {
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
            // 供"配送路线预览"地图与列表用
            pickupCoords: pickupCoords || undefined,
            deliveryCoords: deliveryCoords || undefined,
            pickupDistance,
            deliveryDistance,
            totalDistance,
            locationSource: (deliveryCoords?.source ?? pickupCoords?.source ?? 'fallback') as any,
          } as any;
        })
      );

      // 2. 过滤掉没有送货坐标的包裹（至少需要送货点）
      const validPackages = packagesWithCoords.filter((pkg: any) => pkg.deliveryCoords || pkg.coords);
      
      if (validPackages.length === 0) {
        Alert.alert('提示', '所有包裹都缺少收件地址坐标，无法规划路线');
        return;
      }

      // 3. 计算原始路线距离（按包裹顺序）
      const originalDistance = calculateRouteDistance(validPackages, {
        lat: location.latitude,
        lng: location.longitude
      });
      setOriginalRouteDistance(originalDistance);

      // 4. 计算优化后的配送顺序
      const optimizedPackages = await optimizeDeliveryRoute(validPackages, optimizationStrategy);

      // 5. 计算优化后的路线距离
      const optimizedDistance = calculateRouteDistance(optimizedPackages, {
        lat: location.latitude,
        lng: location.longitude
      });
      setOptimizedRouteDistance(optimizedDistance);

      // 6. 计算优化后的总预计时间（使用平均速度30km/h）
      const averageSpeed = 30; // km/h
      const totalTimeHours = optimizedDistance / averageSpeed;
      const totalTimeMinutes = Math.round(totalTimeHours * 60);
      setOptimizedRouteTime(totalTimeMinutes);

      // 7. 保存优化后的包裹列表
      setOptimizedPackagesWithCoords(optimizedPackages);
      
      // 8. 显示优化信息
      setShowOptimizationInfo(true);
      
      // 9. 显示地图预览
      setShowMapPreview(true);
      
      console.log(`✅ 路线规划完成: ${optimizedPackages.length}个有效包裹`);
      console.log(`📏 原始距离: ${originalDistance.toFixed(2)}km`);
      console.log(`📏 优化后距离: ${optimizedDistance.toFixed(2)}km`);
      console.log(`💾 节省距离: ${(originalDistance - optimizedDistance).toFixed(2)}km (${((originalDistance - optimizedDistance) / originalDistance * 100).toFixed(1)}%)`);
      console.log('📋 配送顺序:', optimizedPackages.map((pkg: any, index: number) => `${index + 1}. ${pkg.receiver_name}`));
      
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

  // 筛选和搜索逻辑
  // 使用useMemo优化筛选逻辑，避免不必要的重新计算
  const filteredPackages = useMemo(() => {
    let filtered = [...packages];

    // 1. 搜索筛选（包裹ID、收件人姓名、寄件人姓名）
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(pkg => 
        pkg.id.toLowerCase().includes(query) ||
        (pkg.receiver_name && pkg.receiver_name.toLowerCase().includes(query)) ||
        (pkg.sender_name && pkg.sender_name.toLowerCase().includes(query)) ||
        (pkg.receiver_address && pkg.receiver_address.toLowerCase().includes(query)) ||
        (pkg.sender_address && pkg.sender_address.toLowerCase().includes(query))
      );
    }

    // 2. 状态筛选
    if (statusFilter !== '全部') {
      filtered = filtered.filter(pkg => pkg.status === statusFilter);
    }

    // 3. 配送速度筛选
    if (speedFilter !== '全部') {
      filtered = filtered.filter(pkg => pkg.delivery_speed === speedFilter);
    }

    // 4. 距离排序
    if (distanceFilter === '最近优先') {
      filtered.sort((a, b) => {
        const distanceA = a.totalDistance ?? a.distance ?? 999;
        const distanceB = b.totalDistance ?? b.distance ?? 999;
        return distanceA - distanceB;
      });
    } else if (distanceFilter === '最远优先') {
      filtered.sort((a, b) => {
        const distanceA = a.totalDistance ?? a.distance ?? 999;
        const distanceB = b.totalDistance ?? b.distance ?? 999;
        return distanceB - distanceA;
      });
    }

    return filtered;
  }, [packages, searchQuery, statusFilter, speedFilter, distanceFilter]);

  // 创建脉冲动画
  const createPulseAnimation = useCallback((markerId: string) => {
    if (!pulseAnimations.current[markerId]) {
      const animValue = new Animated.Value(1);
      pulseAnimations.current[markerId] = animValue;
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
    return pulseAnimations.current[markerId];
  }, []);

  // 根据包裹状态获取标记颜色
  const getMarkerColor = useCallback((status: string, deliverySpeed?: string) => {
    if (status === '待取件') {
      if (deliverySpeed === '急送达') return '#ef4444'; // 红色 - 紧急
      return '#f59e0b'; // 橙色 - 待取件
    } else if (status === '已取件' || status === '配送中') {
      if (deliverySpeed === '急送达') return '#dc2626'; // 深红色 - 紧急配送
      return '#3182ce'; // 蓝色 - 配送中
    }
    return '#6b7280'; // 灰色 - 其他状态
  }, []);

  // 根据配送速度获取标记图标
  const getMarkerIcon = useCallback((deliverySpeed?: string) => {
    if (deliverySpeed === '急送达') return '⚡';
    if (deliverySpeed === '定时达') return '⏰';
    return '📦';
  }, []);

  // 使用useCallback优化calculateETA
  const calculateETA = useCallback((distanceKm: number | null | undefined, deliverySpeed?: string): { hours: number; minutes: number; displayText: string } | null => {
    if (distanceKm === null || distanceKm === undefined || distanceKm <= 0) {
      return null;
    }

    // 根据配送速度调整平均速度（km/h）
    let averageSpeed = 30; // 默认平均速度 30km/h
    if (deliverySpeed === '急送达') {
      averageSpeed = 40; // 急送达速度更快
    } else if (deliverySpeed === '准时达') {
      averageSpeed = 30; // 标准速度
    } else if (deliverySpeed === '定时达') {
      averageSpeed = 25; // 定时达可能稍慢
    }

    // 计算时间（小时）
    const timeInHours = distanceKm / averageSpeed;
    const hours = Math.floor(timeInHours);
    const minutes = Math.round((timeInHours - hours) * 60);

    // 格式化显示文本
    let displayText = '';
    if (hours > 0) {
      displayText = `${hours}${language === 'zh' ? '小时' : language === 'en' ? 'h' : 'နာရီ'}${minutes > 0 ? ` ${minutes}${language === 'zh' ? '分钟' : language === 'en' ? 'm' : 'မိနစ်'}` : ''}`;
    } else {
      displayText = `${minutes}${language === 'zh' ? '分钟' : language === 'en' ? 'm' : 'မိနစ်'}`;
    }

    return { hours, minutes, displayText };
  }, [language]);

  // 使用useCallback优化renderPackageItem，避免不必要的重新渲染
  const renderPackageItem = useCallback(({ item, index }: { item: PackageWithExtras; index: number }) => {
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
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              <Text style={styles.sectionTitle}>📦 取货点</Text>
              {/* 支付方式标识 */}
              {item.payment_method === 'cash' && (
                <View style={{
                  backgroundColor: '#f59e0b',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}>
                    💵 {language === 'zh' ? '现金' : language === 'en' ? 'Cash' : 'ငွေသား'}
                  </Text>
                </View>
              )}
              {item.payment_method === 'qr' && (
                <View style={{
                  backgroundColor: '#3b82f6',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}>
                    📱 {language === 'zh' ? '二维码' : language === 'en' ? 'QR Code' : 'QR Code'}
                  </Text>
                </View>
              )}
              {!item.payment_method && (
                <View style={{
                  backgroundColor: '#6b7280',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}>
                    💰 {language === 'zh' ? '已支付' : language === 'en' ? 'Paid' : 'ပေးချေပြီး'}
                  </Text>
                </View>
              )}
              
              {/* 代收款显示 - Partner订单 */}
              {(() => {
                const isStoreMatch = deliveryStores.some(store => 
                  store.store_name === item.sender_name || 
                  (item.sender_name && item.sender_name.startsWith(store.store_name))
                );
                const isPartner = !!item.delivery_store_id || isStoreMatch;
                const codVal = Number(item.cod_amount || 0);
                
                if (isPartner) {
                  return (
                    <View style={{
                      backgroundColor: '#fee2e2',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#fecaca'
                    }}>
                      <Text style={{
                        color: '#b91c1c',
                        fontSize: 11,
                        fontWeight: 'bold',
                      }}>
                        {language === 'zh' ? '代收款' : 'COD'}: {codVal > 0 ? `${codVal} MMK` : (language === 'zh' ? '无' : 'None')}
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}
            </View>
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
              <View style={styles.distanceTimeRow}>
                <Text style={styles.distanceText}>距离: {item.pickupDistance.toFixed(1)}km</Text>
                {(() => {
                  const pickupETA = calculateETA(item.pickupDistance, item.delivery_speed);
                  return pickupETA ? (
                    <Text style={styles.etaText}>
                      ⏱️ {language === 'zh' ? '预计' : language === 'en' ? 'ETA' : 'ခန့်မှန်း'}: {pickupETA.displayText}
                    </Text>
                  ) : null;
                })()}
              </View>
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
              <View style={styles.distanceTimeRow}>
                <Text style={styles.distanceText}>距离: {item.deliveryDistance.toFixed(1)}km</Text>
                {(() => {
                  const deliveryETA = calculateETA(item.deliveryDistance, item.delivery_speed);
                  return deliveryETA ? (
                    <Text style={styles.etaText}>
                      ⏱️ {language === 'zh' ? '预计' : language === 'en' ? 'ETA' : 'ခန့်မှန်း'}: {deliveryETA.displayText}
                    </Text>
                  ) : null;
                })()}
              </View>
            )}
          </View>
          
          <View style={styles.packageMeta}>
            <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) }]}> 
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <Text style={styles.packageType}>{item.package_type} · {item.weight}</Text>
            {item.totalDistance !== null && item.totalDistance !== undefined && (
              <View style={styles.totalDistanceRow}>
                <Text style={styles.totalDistanceText}>总距离: {item.totalDistance.toFixed(1)}km</Text>
                {(() => {
                  const totalETA = calculateETA(item.totalDistance, item.delivery_speed);
                  return totalETA ? (
                    <Text style={styles.totalEtaText}>
                      ⏱️ {language === 'zh' ? '总预计' : language === 'en' ? 'Total ETA' : 'စုစုပေါင်းခန့်မှန်း'}: {totalETA.displayText}
                    </Text>
                  ) : null;
                })()}
              </View>
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
  }, [packages, currentDeliveringPackageId, language, navigation, startDelivering, finishDelivering, calculateETA]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          🗺️ {language === 'zh' ? '配送路线' : language === 'en' ? 'Delivery Route' : 'ပို့ဆောင်လမ်းကြောင်း'}
        </Text>
      </View>

      {/* 网络状态和错误信息显示 */}
      {errorMessage && (
        <View style={[styles.statusBanner, !isOnline && styles.statusBannerOffline]}>
          <Text style={styles.statusBannerText}>
            {!isOnline ? '📡 ' : '⚠️ '}{errorMessage}
          </Text>
          {!isOnline && (
            <TouchableOpacity onPress={() => loadPackages(true)} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>
                {language === 'zh' ? '重试' : language === 'en' ? 'Retry' : 'ပြန်လည်ကြိုးစားပါ'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 最后更新时间显示 */}
      {lastUpdateTime && (
        <View style={styles.lastUpdateContainer}>
          <Text style={styles.lastUpdateText}>
            {language === 'zh' ? '最后更新' : language === 'en' ? 'Last update' : 'နောက်ဆုံးအပ်ဒိတ်'}: {lastUpdateTime.toLocaleTimeString()}
            {autoRefreshEnabled && ` (${language === 'zh' ? '自动刷新' : language === 'en' ? 'Auto' : 'အလိုအလျောက်'} ${autoRefreshInterval}s)`}
          </Text>
          <TouchableOpacity
            style={styles.alertSettingsButton}
            onPress={() => setShowAlertSettings(true)}
          >
            <Text style={styles.alertSettingsButtonText}>🔔</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 提醒设置Modal */}
      <Modal
        visible={showAlertSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAlertSettings(false)}
      >
        <View style={styles.alertSettingsModalOverlay}>
          <View style={styles.alertSettingsModalContent}>
            <View style={styles.alertSettingsModalHeader}>
              <Text style={styles.alertSettingsModalTitle}>
                {language === 'zh' ? '🔔 智能提醒设置' : language === 'en' ? '🔔 Alert Settings' : '🔔 သတိပေးချက်ဆက်တင်များ'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAlertSettings(false)}
                style={styles.alertSettingsModalCloseButton}
              >
                <Text style={styles.alertSettingsModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.alertSettingsModalBody}>
              {/* 到达提醒设置 */}
              <View style={styles.alertSettingItem}>
                <View style={styles.alertSettingHeader}>
                  <Text style={styles.alertSettingLabel}>
                    {language === 'zh' ? '📍 到达提醒' : language === 'en' ? '📍 Arrival Alert' : '📍 ရောက်ရှိမှုသတိပေးချက်'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setAlertSettings(prev => ({
                      ...prev,
                      arrivalAlertEnabled: !prev.arrivalAlertEnabled
                    }))}
                    style={[
                      styles.toggleSwitch,
                      alertSettings.arrivalAlertEnabled && styles.toggleSwitchActive
                    ]}
                  >
                    <Text style={styles.toggleSwitchText}>
                      {alertSettings.arrivalAlertEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {alertSettings.arrivalAlertEnabled && (
                  <View style={styles.alertSettingValue}>
                    <Text style={styles.alertSettingValueLabel}>
                      {language === 'zh' ? '提醒距离' : language === 'en' ? 'Alert Distance' : 'သတိပေးချက်အကွာအဝေး'}: {alertSettings.arrivalDistance}m
                    </Text>
                    <View style={styles.sliderContainer}>
                      <Text style={styles.sliderLabel}>50m</Text>
                      <View style={styles.sliderTrack}>
                        <View style={[
                          styles.sliderFill,
                          { width: `${((alertSettings.arrivalDistance - 50) / 200) * 100}%` }
                        ]} />
                      </View>
                      <Text style={styles.sliderLabel}>250m</Text>
                    </View>
                    <View style={styles.sliderButtons}>
                      {[50, 100, 150, 200, 250].map((value) => (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.sliderButton,
                            alertSettings.arrivalDistance === value && styles.sliderButtonActive
                          ]}
                          onPress={() => setAlertSettings(prev => ({ ...prev, arrivalDistance: value }))}
                        >
                          <Text style={[
                            styles.sliderButtonText,
                            alertSettings.arrivalDistance === value && styles.sliderButtonTextActive
                          ]}>
                            {value}m
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 超时提醒设置 */}
              <View style={styles.alertSettingItem}>
                <View style={styles.alertSettingHeader}>
                  <Text style={styles.alertSettingLabel}>
                    {language === 'zh' ? '⏰ 超时提醒' : language === 'en' ? '⏰ Timeout Alert' : '⏰ အချိန်ကျော်သတိပေးချက်'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setAlertSettings(prev => ({
                      ...prev,
                      timeoutAlertEnabled: !prev.timeoutAlertEnabled
                    }))}
                    style={[
                      styles.toggleSwitch,
                      alertSettings.timeoutAlertEnabled && styles.toggleSwitchActive
                    ]}
                  >
                    <Text style={styles.toggleSwitchText}>
                      {alertSettings.timeoutAlertEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {alertSettings.timeoutAlertEnabled && (
                  <View style={styles.alertSettingValue}>
                    <Text style={styles.alertSettingValueLabel}>
                      {language === 'zh' ? '超时时间' : language === 'en' ? 'Timeout' : 'အချိန်ကျော်ချိန်'}: {alertSettings.timeoutMinutes}分钟
                    </Text>
                    <View style={styles.sliderButtons}>
                      {[15, 30, 45, 60, 90].map((value) => (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.sliderButton,
                            alertSettings.timeoutMinutes === value && styles.sliderButtonActive
                          ]}
                          onPress={() => setAlertSettings(prev => ({ ...prev, timeoutMinutes: value }))}
                        >
                          <Text style={[
                            styles.sliderButtonText,
                            alertSettings.timeoutMinutes === value && styles.sliderButtonTextActive
                          ]}>
                            {value}分
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 路线偏离提醒设置 */}
              <View style={styles.alertSettingItem}>
                <View style={styles.alertSettingHeader}>
                  <Text style={styles.alertSettingLabel}>
                    {language === 'zh' ? '⚠️ 路线偏离提醒' : language === 'en' ? '⚠️ Route Deviation Alert' : '⚠️ လမ်းကြောင်းသွေဖည်မှုသတိပေးချက်'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setAlertSettings(prev => ({
                      ...prev,
                      routeDeviationAlertEnabled: !prev.routeDeviationAlertEnabled
                    }))}
                    style={[
                      styles.toggleSwitch,
                      alertSettings.routeDeviationAlertEnabled && styles.toggleSwitchActive
                    ]}
                  >
                    <Text style={styles.toggleSwitchText}>
                      {alertSettings.routeDeviationAlertEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {alertSettings.routeDeviationAlertEnabled && (
                  <View style={styles.alertSettingValue}>
                    <Text style={styles.alertSettingValueLabel}>
                      {language === 'zh' ? '偏离距离' : language === 'en' ? 'Deviation Distance' : 'သွေဖည်မှုအကွာအဝေး'}: {alertSettings.deviationDistance}m
                    </Text>
                    <View style={styles.sliderButtons}>
                      {[200, 300, 500, 800, 1000].map((value) => (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.sliderButton,
                            alertSettings.deviationDistance === value && styles.sliderButtonActive
                          ]}
                          onPress={() => setAlertSettings(prev => ({ ...prev, deviationDistance: value }))}
                        >
                          <Text style={[
                            styles.sliderButtonText,
                            alertSettings.deviationDistance === value && styles.sliderButtonTextActive
                          ]}>
                            {value}m
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.alertSettingsModalFooter}>
              <TouchableOpacity
                style={styles.alertSettingsModalButton}
                onPress={() => setShowAlertSettings(false)}
              >
                <Text style={styles.alertSettingsModalButtonText}>
                  {language === 'zh' ? '完成' : language === 'en' ? 'Done' : 'ပြီးမြောက်'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.listContainer}>
        {/* 搜索和筛选栏 */}
        <View style={styles.searchFilterContainer}>
          {/* 搜索框 */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={language === 'zh' ? '搜索包裹ID、收件人、地址...' : language === 'en' ? 'Search package ID, receiver, address...' : 'အထုပ် ID၊ လက်ခံသူ၊ လိပ်စာ ရှာဖွေရန်...'}
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 筛选和规划路线按钮 */}
        <View style={styles.actionButtonsContainer}>
          {/* 筛选按钮 */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Text style={styles.filterIcon}>🔽</Text>
            <Text style={styles.filterButtonText}>
              {language === 'zh' ? '筛选' : language === 'en' ? 'Filter' : 'စစ်ထုတ်ရန်'}
            </Text>
            {(statusFilter !== '全部' || distanceFilter !== '全部' || speedFilter !== '全部') && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {[statusFilter, distanceFilter, speedFilter].filter(f => f !== '全部').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 规划路线按钮 */}
          {location && (
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
          )}
        </View>

        <Text style={styles.listTitle}>
          📦 {language === 'zh' ? `配送顺序 (${filteredPackages.length}/${packages.length})` : language === 'en' ? `Delivery Order (${filteredPackages.length}/${packages.length})` : `ပို့ဆောင်မည့်အစဉ် (${filteredPackages.length}/${packages.length})`}
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
        ) : filteredPackages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>
              {language === 'zh' ? '未找到匹配的包裹' : language === 'en' ? 'No matching packages' : 'ကိုက်ညီသောအထုပ်များမတွေ့ရှိပါ'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {language === 'zh' ? '请尝试调整搜索条件或筛选器' : language === 'en' ? 'Try adjusting your search or filters' : 'ရှာဖွေမှုသို့မဟုတ်စစ်ထုတ်မှုကိုပြင်ဆင်ကြည့်ပါ'}
            </Text>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setSearchQuery('');
                setStatusFilter('全部');
                setDistanceFilter('全部');
                setSpeedFilter('全部');
              }}
            >
              <Text style={styles.clearFiltersButtonText}>
                {language === 'zh' ? '清除所有筛选' : language === 'en' ? 'Clear All Filters' : 'စစ်ထုတ်မှုအားလုံးကိုရှင်းလင်းရန်'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredPackages}
            renderItem={renderPackageItem}
            keyExtractor={(item: PackageWithExtras) => item.id}
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
            <Text style={styles.mapModalTitle}>
              📍 {language === 'zh' ? '配送路线预览' : language === 'en' ? 'Delivery Route Preview' : 'ပို့ဆောင်လမ်းကြောင်းအစမ်းကြည့်ရှုခြင်း'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* 优化信息面板 */}
          {showOptimizationInfo && (
            <View style={styles.optimizationInfoContainer}>
              <View style={styles.optimizationInfoRow}>
                <View style={styles.optimizationInfoItem}>
                  <Text style={styles.optimizationInfoLabel}>
                    {language === 'zh' ? '原始距离' : language === 'en' ? 'Original' : 'မူလ'}
                  </Text>
                  <Text style={styles.optimizationInfoValue}>
                    {originalRouteDistance.toFixed(1)} km
                  </Text>
                </View>
                <View style={styles.optimizationInfoItem}>
                  <Text style={styles.optimizationInfoLabel}>
                    {language === 'zh' ? '优化后' : language === 'en' ? 'Optimized' : 'အကောင်းဆုံး'}
                  </Text>
                  <Text style={[styles.optimizationInfoValue, styles.optimizationInfoValueOptimized]}>
                    {optimizedRouteDistance.toFixed(1)} km
                  </Text>
                </View>
                <View style={styles.optimizationInfoItem}>
                  <Text style={styles.optimizationInfoLabel}>
                    {language === 'zh' ? '节省' : language === 'en' ? 'Saved' : 'ချွေတာ'}
                  </Text>
                  <Text style={[styles.optimizationInfoValue, styles.optimizationInfoValueSaved]}>
                    {(originalRouteDistance - optimizedRouteDistance).toFixed(1)} km
                  </Text>
                  <Text style={styles.optimizationInfoPercent}>
                    ({originalRouteDistance > 0 ? ((originalRouteDistance - optimizedRouteDistance) / originalRouteDistance * 100).toFixed(1) : '0'}%)
                  </Text>
                </View>
                <View style={styles.optimizationInfoItem}>
                  <Text style={styles.optimizationInfoLabel}>
                    {language === 'zh' ? '预计时间' : language === 'en' ? 'ETA' : 'ခန့်မှန်းချိန်'}
                  </Text>
                  <Text style={[styles.optimizationInfoValue, styles.optimizationInfoValueTime]}>
                    {optimizedRouteTime >= 60 
                      ? `${Math.floor(optimizedRouteTime / 60)}${language === 'zh' ? '小时' : language === 'en' ? 'h' : 'နာရီ'} ${optimizedRouteTime % 60}${language === 'zh' ? '分钟' : language === 'en' ? 'm' : 'မိနစ်'}`
                      : `${optimizedRouteTime}${language === 'zh' ? '分钟' : language === 'en' ? 'm' : 'မိနစ်'}`
                    }
                  </Text>
                </View>
              </View>

              {/* 优化策略选择 */}
              <View style={styles.optimizationStrategyContainer}>
                <Text style={styles.optimizationStrategyLabel}>
                  {language === 'zh' ? '优化策略' : language === 'en' ? 'Strategy' : 'မဟာဗျူဟာ'}
                </Text>
                <View style={styles.optimizationStrategyButtons}>
                  <TouchableOpacity
                    style={[
                      styles.optimizationStrategyButton,
                      optimizationStrategy === 'shortest' && styles.optimizationStrategyButtonActive
                    ]}
                    onPress={() => {
                      setOptimizationStrategy('shortest');
                      // 重新优化
                      handleNavigateAll();
                    }}
                  >
                    <Text style={[
                      styles.optimizationStrategyButtonText,
                      optimizationStrategy === 'shortest' && styles.optimizationStrategyButtonTextActive
                    ]}>
                      {language === 'zh' ? '最短距离' : language === 'en' ? 'Shortest' : 'အတိုဆုံး'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optimizationStrategyButton,
                      optimizationStrategy === 'fastest' && styles.optimizationStrategyButtonActive
                    ]}
                    onPress={() => {
                      setOptimizationStrategy('fastest');
                      handleNavigateAll();
                    }}
                  >
                    <Text style={[
                      styles.optimizationStrategyButtonText,
                      optimizationStrategy === 'fastest' && styles.optimizationStrategyButtonTextActive
                    ]}>
                      {language === 'zh' ? '最快时间' : language === 'en' ? 'Fastest' : 'အမြန်ဆုံး'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optimizationStrategyButton,
                      optimizationStrategy === 'priority' && styles.optimizationStrategyButtonActive
                    ]}
                    onPress={() => {
                      setOptimizationStrategy('priority');
                      handleNavigateAll();
                    }}
                  >
                    <Text style={[
                      styles.optimizationStrategyButtonText,
                      optimizationStrategy === 'priority' && styles.optimizationStrategyButtonTextActive
                    ]}>
                      {language === 'zh' ? '优先级' : language === 'en' ? 'Priority' : 'ဦးစားပေး'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 地图控制按钮 */}
          <View style={styles.mapControls}>
            <TouchableOpacity
              style={styles.mapControlButton}
              onPress={() => {
                const types: ('standard' | 'satellite' | 'hybrid')[] = ['standard', 'satellite', 'hybrid'];
                const currentIndex = types.indexOf(mapType);
                setMapType(types[(currentIndex + 1) % types.length]);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.mapControlButtonText}>
                {mapType === 'standard' ? '🗺️' : mapType === 'satellite' ? '🛰️' : '🌍'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapControlButton}
              onPress={() => {
                setShowLegend(!showLegend);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.mapControlButtonText}>
                {showLegend ? '📋' : '📋'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 图例 */}
          {showLegend && (
            <View style={styles.legendContainer}>
              <Text style={styles.legendTitle}>
                {language === 'zh' ? '图例' : language === 'en' ? 'Legend' : 'အဓိပ္ပာယ်ဖွင့်ဆိုချက်'}
              </Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendMarker, { backgroundColor: '#10b981' }]}>
                  <Text style={styles.legendMarkerText}>🏍️</Text>
                </View>
                <Text style={styles.legendText}>
                  {language === 'zh' ? '我的位置' : language === 'en' ? 'My Location' : 'ကျွန်ုပ်၏တည်နေရာ'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendMarker, { backgroundColor: '#f59e0b' }]}>
                  <Text style={styles.legendMarkerText}>📦</Text>
                </View>
                <Text style={styles.legendText}>
                  {language === 'zh' ? '待取件' : language === 'en' ? 'Pending Pickup' : 'ကောက်ယူရန်စောင့်ဆိုင်း'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendMarker, { backgroundColor: '#ef4444' }]}>
                  <Text style={styles.legendMarkerText}>⚡</Text>
                </View>
                <Text style={styles.legendText}>
                  {language === 'zh' ? '急送达' : language === 'en' ? 'Urgent' : 'အရေးတကြီး'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendMarker, { backgroundColor: '#3182ce' }]}>
                  <Text style={styles.legendMarkerText}>📦</Text>
                </View>
                <Text style={styles.legendText}>
                  {language === 'zh' ? '配送中' : language === 'en' ? 'In Delivery' : 'ပို့ဆောင်နေသည်'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>
                  {language === 'zh' ? '到取货点' : language === 'en' ? 'To Pickup' : 'ကောက်ယူရန်နေရာသို့'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.legendText}>
                  {language === 'zh' ? '取货到送货' : language === 'en' ? 'Pickup to Delivery' : 'ကောက်ယူမှပို့ဆောင်ရန်'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.legendText}>
                  {language === 'zh' ? '到下一个取货点' : language === 'en' ? 'To Next Pickup' : 'နောက်ကောက်ယူရန်နေရာသို့'}
                </Text>
              </View>
            </View>
          )}

          {/* 地图视图 */}
          {location ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.mapModalMap}
              mapType={mapType}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
              region={location ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              } : undefined}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              showsScale={true}
              loadingEnabled={true}
              onMapReady={() => {
                console.log('地图已准备就绪');
              }}
              onError={(error) => {
                console.error('地图加载错误:', error);
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

              {/* 取货点标记（P-1, P-2, P-3...） - 只显示待取件的包裹 */}
              {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
                if (!pkg.pickupCoords) return null;
                
                // 只显示待取件状态的包裹取货点
                if (pkg.status !== '待取件') return null;
                
                // 计算包裹编号：基于创建时间排序，确保编号稳定（与包裹列表一致）
                const sortedPackages = [...packages].sort((a, b) => {
                  const timeA = new Date(a.created_at || a.create_time || 0).getTime();
                  const timeB = new Date(b.created_at || b.create_time || 0).getTime();
                  return timeA - timeB;
                });
                const packageNumber = sortedPackages.findIndex(p => p.id === pkg.id) + 1;
                
                const markerColor = getMarkerColor(pkg.status, pkg.delivery_speed);
                const markerIcon = getMarkerIcon(pkg.delivery_speed);
                // 如果是食品和饮料类型，显示🥤图标
                const packageTypeIcon = (pkg.package_type === '食品和饮料' || pkg.package_type === 'Foods & Drinks' || pkg.package_type === 'foodDrinks') ? '🥤' : markerIcon;
                const isUrgent = pkg.delivery_speed === '急送达';
                
                return (
                  <Marker
                    key={`pickup-${pkg.id}`}
                    coordinate={{
                      latitude: pkg.pickupCoords.lat,
                      longitude: pkg.pickupCoords.lng,
                    }}
                    title={`P-${packageNumber}. ${language === 'zh' ? '取货点' : language === 'en' ? 'Pickup' : 'ကောက်ယူရန်နေရာ'}: ${pkg.sender_name}`}
                    description={pkg.sender_address}
                    onPress={() => setSelectedMarker(`pickup-${pkg.id}`)}
                  >
                    <Animated.View
                      style={[
                        styles.pickupMarker,
                        {
                          backgroundColor: markerColor,
                          transform: isUrgent
                            ? [
                                {
                                  scale: createPulseAnimation(`pickup-${pkg.id}`),
                                },
                              ]
                            : undefined,
                        },
                      ]}
                    >
                      <Text style={styles.pickupMarkerText}>P{packageNumber}</Text>
                    </Animated.View>
                    <Callout>
                      <View style={styles.calloutContainer}>
                        <Text style={styles.calloutTitle}>
                          P-{packageNumber}. {language === 'zh' ? '取货点' : language === 'en' ? 'Pickup Point' : 'ကောက်ယူရန်နေရာ'}
                        </Text>
                        <Text style={styles.calloutText}>{pkg.sender_name}</Text>
                        <Text style={styles.calloutAddress}>{pkg.sender_address}</Text>
                        {pkg.pickupDistance !== null && (
                          <Text style={styles.calloutDistance}>
                            📏 {pkg.pickupDistance.toFixed(1)} km
                            {(() => {
                              const eta = calculateETA(pkg.pickupDistance, pkg.delivery_speed);
                              return eta ? ` • ⏱️ ${eta.displayText}` : '';
                            })()}
                          </Text>
                        )}
                        {pkg.delivery_speed && (
                          <Text style={[styles.calloutSpeed, isUrgent && styles.calloutSpeedUrgent]}>
                            {packageTypeIcon} {pkg.delivery_speed}
                          </Text>
                        )}
                      </View>
                    </Callout>
                  </Marker>
                );
              })}

              {/* 送货点标记（D-1A, D-2A, D-3A...） - 只显示已取件和配送中的包裹 */}
              {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
                if (!pkg.deliveryCoords) return null;
                
                // 只显示已取件和配送中状态的包裹送货点
                if (!['已取件', '配送中'].includes(pkg.status)) return null;
                
                // 计算包裹编号：基于创建时间排序，确保编号稳定（与包裹列表一致）
                const sortedPackages = [...packages].sort((a, b) => {
                  const timeA = new Date(a.created_at || a.create_time || 0).getTime();
                  const timeB = new Date(b.created_at || b.create_time || 0).getTime();
                  return timeA - timeB;
                });
                const packageNumber = sortedPackages.findIndex(p => p.id === pkg.id) + 1;
                
                const markerColor = getMarkerColor(pkg.status, pkg.delivery_speed);
                const markerIcon = getMarkerIcon(pkg.delivery_speed);
                // 如果是食品和饮料类型，显示🥤图标
                const packageTypeIcon = (pkg.package_type === '食品和饮料' || pkg.package_type === 'Foods & Drinks' || pkg.package_type === 'foodDrinks') ? '🥤' : markerIcon;
                const isUrgent = pkg.delivery_speed === '急送达';
                
                return (
                  <Marker
                    key={`delivery-${pkg.id}`}
                    coordinate={{
                      latitude: pkg.deliveryCoords.lat,
                      longitude: pkg.deliveryCoords.lng,
                    }}
                    title={`D-${packageNumber}A. ${language === 'zh' ? '送货点' : language === 'en' ? 'Delivery Point' : 'ပို့ဆောင်ရန်နေရာ'}: ${pkg.receiver_name}`}
                    description={pkg.receiver_address}
                    onPress={() => setSelectedMarker(`delivery-${pkg.id}`)}
                  >
                    <Animated.View
                      style={[
                        styles.packageMarker,
                        {
                          backgroundColor: markerColor,
                          transform: isUrgent
                            ? [
                                {
                                  scale: createPulseAnimation(`delivery-${pkg.id}`),
                                },
                              ]
                            : undefined,
                        },
                      ]}
                    >
                      <Text style={styles.packageMarkerNumber}>D{packageNumber}</Text>
                    </Animated.View>
                    <Callout>
                      <View style={styles.calloutContainer}>
                        <Text style={styles.calloutTitle}>
                          D-{packageNumber}A. {language === 'zh' ? '送货点' : language === 'en' ? 'Delivery Point' : 'ပို့ဆောင်ရန်နေရာ'}
                        </Text>
                        <Text style={styles.calloutText}>{pkg.receiver_name}</Text>
                        <Text style={styles.calloutAddress}>{pkg.receiver_address}</Text>
                        {pkg.deliveryDistance !== null && (
                          <Text style={styles.calloutDistance}>
                            📏 {pkg.deliveryDistance.toFixed(1)} km
                            {(() => {
                              const eta = calculateETA(pkg.deliveryDistance, pkg.delivery_speed);
                              return eta ? ` • ⏱️ ${eta.displayText}` : '';
                            })()}
                          </Text>
                        )}
                        {pkg.delivery_speed && (
                          <Text style={[styles.calloutSpeed, isUrgent && styles.calloutSpeedUrgent]}>
                            {packageTypeIcon} {pkg.delivery_speed}
                          </Text>
                        )}
                        <Text style={styles.calloutStatus}>
                          {language === 'zh' ? '状态' : language === 'en' ? 'Status' : 'အခြေအနေ'}: {pkg.status}
                        </Text>
                      </View>
                    </Callout>
                  </Marker>
                );
              })}

              {/* 完整配送路线连线 */}
              {location && optimizedPackagesWithCoords.length > 0 && (
                <>
                  {/* 从当前位置到第一个待取件包裹的取货点路线（绿色） */}
                  {(() => {
                    const firstPendingPickup = optimizedPackagesWithCoords.find(pkg => 
                      pkg.status === '待取件' && pkg.pickupCoords
                    );
                    if (firstPendingPickup?.pickupCoords) {
                      return (
                        <Polyline
                          coordinates={[
                            { latitude: location.latitude, longitude: location.longitude },
                            { 
                              latitude: firstPendingPickup.pickupCoords.lat, 
                              longitude: firstPendingPickup.pickupCoords.lng 
                            }
                          ]}
                          strokeColor="#10b981"
                          strokeWidth={4}
                          lineDashPattern={[8, 4]}
                        />
                      );
                    }
                    return null;
                  })()}
                  
                  {/* 取货点到送货点的路线（橙色） - 只连接已取件和配送中的包裹 */}
                  {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
                    if (!pkg.pickupCoords || !pkg.deliveryCoords) return null;
                    
                    // 只连接已取件和配送中状态的包裹
                    if (!['已取件', '配送中'].includes(pkg.status)) return null;
                    
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
                  
                  {/* 送货点到下一个待取件包裹的取货点路线（蓝色） */}
                  {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
                    // 只处理已取件和配送中状态的包裹
                    if (!['已取件', '配送中'].includes(pkg.status) || !pkg.deliveryCoords) return null;
                    
                    // 找到下一个待取件的包裹
                    const nextPendingPickup = optimizedPackagesWithCoords.find((nextPkg, nextIndex) => 
                      nextIndex > index && 
                      nextPkg.status === '待取件' && 
                      nextPkg.pickupCoords
                    );
                    
                    if (nextPendingPickup?.pickupCoords) {
                      return (
                        <Polyline
                          key={`delivery-pickup-${pkg.id}`}
                          coordinates={[
                            { 
                              latitude: pkg.deliveryCoords.lat, 
                              longitude: pkg.deliveryCoords.lng 
                            },
                            { 
                              latitude: nextPendingPickup.pickupCoords.lat, 
                              longitude: nextPendingPickup.pickupCoords.lng 
                            }
                          ]}
                          strokeColor="#3b82f6"
                          strokeWidth={2}
                          lineDashPattern={[4, 2]}
                        />
                      );
                    }
                    return null;
                  })}
                </>
              )}
            </MapView>
          ) : (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="large" color="#2c5282" />
              <Text style={styles.mapLoadingText}>
                {language === 'zh' ? '正在加载地图...' : language === 'en' ? 'Loading map...' : 'မြေပုံကိုဖွင့်နေသည်...'}
              </Text>
            </View>
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
                    <Text style={styles.routeNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>包裹 {packageNumber}: {pkg.receiver_name}</Text>
                    
                    {/* 取货点信息 */}
                    <View style={styles.pickupInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <Text style={styles.pickupLabel}>P-{packageNumber} 取货点: {pkg.sender_name}</Text>
                        {/* 支付方式标识 */}
                        {pkg.payment_method === 'cash' && (
                          <View style={{
                            backgroundColor: '#f59e0b',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                          }}>
                            <Text style={{
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 'bold',
                            }}>
                              💵 {language === 'zh' ? '现金' : language === 'en' ? 'Cash' : 'ငွေသား'}
                            </Text>
                          </View>
                        )}
                        {pkg.payment_method === 'qr' && (
                          <View style={{
                            backgroundColor: '#3b82f6',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                          }}>
                            <Text style={{
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 'bold',
                            }}>
                              📱 {language === 'zh' ? '二维码' : language === 'en' ? 'QR Code' : 'QR Code'}
                            </Text>
                          </View>
                        )}
                        {!pkg.payment_method && (
                          <View style={{
                            backgroundColor: '#6b7280',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                          }}>
                            <Text style={{
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 'bold',
                            }}>
                              💰 {language === 'zh' ? '已支付' : language === 'en' ? 'Paid' : 'ပေးချေပြီး'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.pickupAddress}>{pkg.sender_address}</Text>
                      {pkg.pickupDistance !== null && (
                        <View style={styles.routeDistanceTimeRow}>
                          <Text style={styles.pickupDistance}>距离: {pkg.pickupDistance.toFixed(1)}km</Text>
                          {(() => {
                            const pickupETA = calculateETA(pkg.pickupDistance, pkg.delivery_speed);
                            return pickupETA ? (
                              <Text style={styles.routeEtaText}>
                                ⏱️ {language === 'zh' ? '预计' : language === 'en' ? 'ETA' : 'ခန့်မှန်း'}: {pickupETA.displayText}
                              </Text>
                            ) : null;
                          })()}
                        </View>
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
                        <View style={styles.routeDistanceTimeRow}>
                          <Text style={styles.deliveryDistance}>距离: {pkg.deliveryDistance.toFixed(1)}km</Text>
                          {(() => {
                            const deliveryETA = calculateETA(pkg.deliveryDistance, pkg.delivery_speed);
                            return deliveryETA ? (
                              <Text style={styles.routeEtaText}>
                                ⏱️ {language === 'zh' ? '预计' : language === 'en' ? 'ETA' : 'ခန့်မှန်း'}: {deliveryETA.displayText}
                              </Text>
                            ) : null;
                          })()}
                        </View>
                      )}
                      {pkg.deliveryCoords && (
                        <Text style={styles.deliveryCoords}>🧭 {pkg.deliveryCoords.lat.toFixed(6)}, {pkg.deliveryCoords.lng.toFixed(6)}</Text>
                      )}
                    </View>
                    
                    {/* 总距离和总ETA */}
                    {pkg.totalDistance !== null && (
                      <View style={styles.routeTotalDistanceRow}>
                        <Text style={styles.totalDistance}>
                          📏 总距离: {pkg.totalDistance.toFixed(1)}km
                        </Text>
                        {(() => {
                          const totalETA = calculateETA(pkg.totalDistance, pkg.delivery_speed);
                          return totalETA ? (
                            <Text style={styles.routeTotalEtaText}>
                              ⏱️ {language === 'zh' ? '总预计' : language === 'en' ? 'Total ETA' : 'စုစုပေါင်းခန့်မှန်း'}: {totalETA.displayText}
                            </Text>
                          ) : null;
                        })()}
                      </View>
                    )}
                    
                    {/* 优先级信息 */}
                    <Text style={styles.routeSource}>
                      {`📡 ${getLocationSourceLabel(pkg.locationSource || 'fallback')}`}
                      {pkg.delivery_speed && ` · ${pkg.delivery_speed}`}
                    </Text>
                  </View>

                  {/* 手动调整顺序按钮 */}
                  <View style={styles.routeOrderControls}>
                    <TouchableOpacity
                      style={[
                        styles.routeOrderButton,
                        index === 0 && styles.routeOrderButtonDisabled
                      ]}
                      onPress={() => {
                        if (index > 0) {
                          const newOrder = [...optimizedPackagesWithCoords];
                          [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                          setOptimizedPackagesWithCoords(newOrder);
                          // 重新计算距离和时间
                          const newDistance = calculateRouteDistance(newOrder, {
                            lat: location.latitude,
                            lng: location.longitude
                          });
                          setOptimizedRouteDistance(newDistance);
                          const averageSpeed = 30; // km/h
                          const totalTimeHours = newDistance / averageSpeed;
                          const totalTimeMinutes = Math.round(totalTimeHours * 60);
                          setOptimizedRouteTime(totalTimeMinutes);
                        }
                      }}
                      disabled={index === 0}
                    >
                      <Text style={styles.routeOrderButtonText}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.routeOrderButton,
                        index === optimizedPackagesWithCoords.length - 1 && styles.routeOrderButtonDisabled
                      ]}
                      onPress={() => {
                        if (index < optimizedPackagesWithCoords.length - 1) {
                          const newOrder = [...optimizedPackagesWithCoords];
                          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                          setOptimizedPackagesWithCoords(newOrder);
                          // 重新计算距离和时间
                          const newDistance = calculateRouteDistance(newOrder, {
                            lat: location.latitude,
                            lng: location.longitude
                          });
                          setOptimizedRouteDistance(newDistance);
                          const averageSpeed = 30; // km/h
                          const totalTimeHours = newDistance / averageSpeed;
                          const totalTimeMinutes = Math.round(totalTimeHours * 60);
                          setOptimizedRouteTime(totalTimeMinutes);
                        }
                      }}
                      disabled={index === optimizedPackagesWithCoords.length - 1}
                    >
                      <Text style={styles.routeOrderButtonText}>↓</Text>
                    </TouchableOpacity>
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
                    <Text style={styles.pickupMarkerText}>P1</Text>
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
                    <Text style={styles.packageMarkerNumber}>D1</Text>
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
                  <View style={styles.singlePackageDistanceTimeRow}>
                    <Text style={styles.singlePackageDistance}>距离: {selectedPackageForMap.pickupDistance.toFixed(1)}km</Text>
                    {(() => {
                      const pickupETA = calculateETA(selectedPackageForMap.pickupDistance, selectedPackageForMap.delivery_speed);
                      return pickupETA ? (
                        <Text style={styles.singlePackageEta}>
                          ⏱️ {language === 'zh' ? '预计' : language === 'en' ? 'ETA' : 'ခန့်မှန်း'}: {pickupETA.displayText}
                        </Text>
                      ) : null;
                    })()}
                  </View>
                )}
              </View>
              
              {/* 送货点信息 */}
              <View style={styles.singlePackageSection}>
                <Text style={styles.singlePackageLabel}>1. 送货点: {selectedPackageForMap.receiver_name}</Text>
                <Text style={styles.singlePackageAddress}>{selectedPackageForMap.receiver_address}</Text>
                {selectedPackageForMap.deliveryDistance !== null && selectedPackageForMap.deliveryDistance !== undefined && (
                  <View style={styles.singlePackageDistanceTimeRow}>
                    <Text style={styles.singlePackageDistance}>距离: {selectedPackageForMap.deliveryDistance.toFixed(1)}km</Text>
                    {(() => {
                      const deliveryETA = calculateETA(selectedPackageForMap.deliveryDistance, selectedPackageForMap.delivery_speed);
                      return deliveryETA ? (
                        <Text style={styles.singlePackageEta}>
                          ⏱️ {language === 'zh' ? '预计' : language === 'en' ? 'ETA' : 'ခန့်မှန်း'}: {deliveryETA.displayText}
                        </Text>
                      ) : null;
                    })()}
                  </View>
                )}
              </View>
              
              {/* 总距离和总ETA */}
              {selectedPackageForMap.totalDistance !== null && selectedPackageForMap.totalDistance !== undefined && (
                <View style={styles.singlePackageTotalDistanceRow}>
                  <Text style={styles.singlePackageTotalDistance}>
                    📏 总距离: {selectedPackageForMap.totalDistance.toFixed(1)}km
                  </Text>
                  {(() => {
                    const totalETA = calculateETA(selectedPackageForMap.totalDistance, selectedPackageForMap.delivery_speed);
                    return totalETA ? (
                      <Text style={styles.singlePackageTotalEta}>
                        ⏱️ {language === 'zh' ? '总预计' : language === 'en' ? 'Total ETA' : 'စုစုပေါင်းခန့်မှန်း'}: {totalETA.displayText}
                      </Text>
                    ) : null;
                  })()}
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* 🔍 筛选Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            {/* 头部 */}
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>
                {language === 'zh' ? '筛选条件' : language === 'en' ? 'Filter Options' : 'စစ်ထုတ်ရေးရွေးချယ်မှုများ'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.filterModalCloseButton}
              >
                <Text style={styles.filterModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalScroll}>
              {/* 状态筛选 */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  {language === 'zh' ? '配送状态' : language === 'en' ? 'Delivery Status' : 'ပို့ဆောင်မှုအခြေအနေ'}
                </Text>
                <View style={styles.filterOptions}>
                  {['全部', '待取件', '已取件', '配送中', '已送达'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        statusFilter === status && styles.filterOptionActive
                      ]}
                      onPress={() => setStatusFilter(status)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        statusFilter === status && styles.filterOptionTextActive
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 距离排序 */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  {language === 'zh' ? '距离排序' : language === 'en' ? 'Distance Sort' : 'အကွာအဝေးစီရန်'}
                </Text>
                <View style={styles.filterOptions}>
                  {['全部', '最近优先', '最远优先'].map((distance) => (
                    <TouchableOpacity
                      key={distance}
                      style={[
                        styles.filterOption,
                        distanceFilter === distance && styles.filterOptionActive
                      ]}
                      onPress={() => setDistanceFilter(distance)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        distanceFilter === distance && styles.filterOptionTextActive
                      ]}>
                        {distance}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 配送速度筛选 */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  {language === 'zh' ? '配送速度' : language === 'en' ? 'Delivery Speed' : 'ပို့ဆောင်မြန်နှုန်း'}
                </Text>
                <View style={styles.filterOptions}>
                  {['全部', '急送达', '准时达', '定时达'].map((speed) => (
                    <TouchableOpacity
                      key={speed}
                      style={[
                        styles.filterOption,
                        speedFilter === speed && styles.filterOptionActive
                      ]}
                      onPress={() => setSpeedFilter(speed)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        speedFilter === speed && styles.filterOptionTextActive
                      ]}>
                        {speed}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* 底部按钮 */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterResetButton}
                onPress={() => {
                  setStatusFilter('全部');
                  setDistanceFilter('全部');
                  setSpeedFilter('全部');
                }}
              >
                <Text style={styles.filterResetButtonText}>
                  {language === 'zh' ? '重置' : language === 'en' ? 'Reset' : 'ပြန်လည်သတ်မှတ်ရန်'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.filterApplyButtonText}>
                  {language === 'zh' ? '应用' : language === 'en' ? 'Apply' : 'အသုံးပြုရန်'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshText: {
    fontSize: 20,
  },
  statusBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  statusBannerOffline: {
    backgroundColor: '#fee2e2',
    borderLeftColor: '#ef4444',
  },
  statusBannerText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  lastUpdateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
  },
  lastUpdateText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    flex: 1,
  },
  alertSettingsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  alertSettingsButtonText: {
    fontSize: 16,
  },
  // 提醒设置Modal样式
  alertSettingsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  alertSettingsModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  alertSettingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  alertSettingsModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  alertSettingsModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertSettingsModalCloseText: {
    fontSize: 18,
    color: '#6b7280',
  },
  alertSettingsModalBody: {
    padding: 20,
  },
  alertSettingItem: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  alertSettingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertSettingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  toggleSwitch: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },
  toggleSwitchActive: {
    backgroundColor: '#3b82f6',
  },
  toggleSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  alertSettingValue: {
    marginTop: 8,
  },
  alertSettingValueLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginHorizontal: 8,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sliderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sliderButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  sliderButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  sliderButtonTextActive: {
    color: '#fff',
  },
  alertSettingsModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  alertSettingsModalButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertSettingsModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  planRouteContainer: {
    margin: 16,
    marginBottom: 8,
    alignItems: 'flex-end', // 按钮靠右对齐
  },
  navigateAllButton: {
    flex: 1,
    backgroundColor: '#3182ce',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navigateAllButtonDisabled: {
    backgroundColor: '#cbd5e0',
  },
  navigateAllIcon: {
    fontSize: 12,
  },
  navigateAllText: {
    color: '#fff',
    fontSize: 10,
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
  distanceTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  etaText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  optimizationInfoContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  optimizationInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  optimizationInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  optimizationInfoLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  optimizationInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  optimizationInfoValueOptimized: {
    color: '#3b82f6',
  },
  optimizationInfoValueSaved: {
    color: '#10b981',
  },
  optimizationInfoValueTime: {
    color: '#f59e0b',
  },
  optimizationInfoPercent: {
    fontSize: 10,
    color: '#10b981',
    marginTop: 2,
  },
  optimizationStrategyContainer: {
    marginTop: 8,
  },
  optimizationStrategyLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
  },
  optimizationStrategyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  optimizationStrategyButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  optimizationStrategyButtonActive: {
    backgroundColor: '#3b82f6',
  },
  optimizationStrategyButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  optimizationStrategyButtonTextActive: {
    color: '#fff',
  },
  map: {
    width: width,
    height: height * 0.5,
  },
  mapModalMap: {
    flex: 1,
    width: '100%',
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  mapLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
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
    minWidth: 32,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: '#3182ce',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 7,
  },
  packageMarkerNumber: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900', // 最粗的字体
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    includeFontPadding: false, // Android上减少额外padding
  },
  // 取货点标记样式
  pickupMarker: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 7,
  },
  pickupMarkerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900', // 最粗的字体
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    includeFontPadding: false, // Android上减少额外padding
  },
  pickupMarkerIcon: {
    fontSize: 12, // 缩小图标
    marginBottom: 1,
    opacity: 0.7, // 降低图标透明度，突出文字
  },
  packageMarkerIcon: {
    fontSize: 12, // 缩小图标
    marginBottom: 1,
    opacity: 0.7, // 降低图标透明度，突出文字
  },
  // 信息窗口样式
  calloutContainer: {
    width: 200,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 2,
  },
  calloutAddress: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  calloutDistance: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  calloutSpeed: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
    marginTop: 4,
  },
  calloutSpeedUrgent: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  calloutStatus: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  // 地图控制按钮
  mapControls: {
    position: 'absolute',
    bottom: 100, // 移动到地图底部，在"查找位置"按钮上方
    right: 16,
    zIndex: 1000,
    flexDirection: 'column',
    gap: 8,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mapControlButtonText: {
    fontSize: 20,
  },
  // 图例样式
  legendContainer: {
    position: 'absolute',
    top: 100,
    left: 16,
    zIndex: 1000,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 180,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  legendMarkerText: {
    fontSize: 12,
  },
  legendLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    color: '#374151',
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
  routeOrderControls: {
    flexDirection: 'column',
    gap: 4,
    marginLeft: 8,
  },
  routeOrderButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeOrderButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.5,
  },
  routeOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  totalDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  totalEtaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  routeDistanceTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  routeEtaText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  routeTotalDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  routeTotalEtaText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  singlePackageDistanceTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  singlePackageEta: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  singlePackageTotalDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  singlePackageTotalEta: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textAlign: 'center',
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
  // 搜索和筛选样式
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1f2937',
    padding: 0,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#9ca3af',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterIcon: {
    fontSize: 12,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  clearFiltersButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  clearFiltersButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  // 筛选Modal样式
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  filterModalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalCloseText: {
    fontSize: 20,
    color: '#6b7280',
  },
  filterModalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  filterResetButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterResetButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  filterApplyButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterApplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});