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
  Platform,
  Animated,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useApp } from '../contexts/AppContext';
import { packageService, Package, supabase, deliveryPhotoService } from '../services/supabase';
import { cacheService } from '../services/cacheService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppState, AppStateStatus } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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

// 计算两点间距离（哈弗辛公式 - 返回公里）
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

export default function MapScreen({ navigation }: any) {
  const { language } = useApp();
  
  // 1. 状态定义
  const [location, setLocation] = useState<any>(null);
  const [packages, setPackages] = useState<PackageWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDeliveringPackageId, setCurrentDeliveringPackageId] = useState<string | null>(null);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [optimizedPackagesWithCoords, setOptimizedPackagesWithCoords] = useState<PackageWithExtras[]>([]);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSingleMapModal, setShowSingleMapModal] = useState(false);
  const [selectedPackageForMap, setSelectedPackageForMap] = useState<PackageWithExtras | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPackageForDelivery, setCurrentPackageForDelivery] = useState<PackageWithExtras | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('全部');
  const [distanceFilter, setDistanceFilter] = useState<string>('全部');
  const [speedFilter, setSpeedFilter] = useState<string>('全部');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isBackground, setIsBackground] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deliveryStores, setDeliveryStores] = useState<any[]>([]);
  const [optimizationStrategy, setOptimizationStrategy] = useState<'shortest' | 'fastest' | 'priority'>('shortest');
  const [originalRouteDistance, setOriginalRouteDistance] = useState<number>(0);
  const [optimizedRouteDistance, setOptimizedRouteDistance] = useState<number>(0);
  const [showOptimizationInfo, setShowOptimizationInfo] = useState(false);
  const [optimizedRouteTime, setOptimizedRouteTime] = useState<number>(0);

  // 2. Refs
  const mapRef = useRef<MapView>(null);
  const coordinatesCache = useRef<Record<string, ResolvedLocation>>({});
  const packagesCache = useRef<PackageWithExtras[]>([]);
  const lastLoadTime = useRef<number>(0);
  const CACHE_DURATION = 30000;
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const networkListenerRef = useRef<any>(null);
  const appStateListenerRef = useRef<any>(null);
  const lastUpdateLocation = useRef<{lat: number, lng: number, time: number} | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const packageStartTimes = useRef<Record<string, number>>({});
  const pulseAnimations = useRef<Record<string, Animated.Value>>({});
  const pendingRequests = useRef<Set<string>>(new Set());
  const performanceMetrics = useRef({
    loadTimes: [] as number[],
    renderTimes: [] as number[]
  });

  // 3. 核心功能函数 (useCallback)
  
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      case '已送达': return '#27ae60';
      default: return '#95a5a6';
    }
  }, []);

  const getMarkerIcon = useCallback((speed?: string) => speed === '急送达' ? '⚡' : (speed === '定时达' ? '⏰' : '📦'), []);

  const calculateETA = useCallback((dist: number | null | undefined, speed?: string): { hours: number; minutes: number; displayText: string } | null => {
    if (!dist || dist <= 0) return null;
    let avg = 30;
    if (speed === '急送达') avg = 40;
    else if (speed === '定时达') avg = 25;
    const h = dist / avg;
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    return { 
      hours, 
      minutes, 
      displayText: hours > 0 
        ? `${hours}${language === 'zh' ? '小时' : language === 'en' ? 'h' : 'နာရီ'}${minutes > 0 ? ` ${minutes}${language === 'zh' ? '分钟' : language === 'en' ? 'm' : 'မိနစ်'}` : ''}` 
        : `${minutes}${language === 'zh' ? '分钟' : language === 'en' ? 'm' : 'မိနစ်'}` 
    };
  }, [language]);

  const trackPerformance = useCallback((operation: string, startTime: number) => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    if (operation.includes('load')) {
      performanceMetrics.current.loadTimes.push(duration);
      if (performanceMetrics.current.loadTimes.length > 10) performanceMetrics.current.loadTimes.shift();
    }
  }, []);

  const cleanupMemory = useCallback(() => {
    coordinatesCache.current = {};
    packagesCache.current = [];
    setPackages([]);
    setOptimizedPackagesWithCoords([]);
    console.log('🧹 内存清理完成');
  }, []);

  const getPickupCoordinates = useCallback(async (pkg: Package): Promise<ResolvedLocation | null> => {
    try {
      if (pkg.sender_latitude && pkg.sender_longitude) return { lat: parseFloat(pkg.sender_latitude.toString()), lng: parseFloat(pkg.sender_longitude.toString()), source: 'coordinates', resolvedAddress: pkg.sender_address };
      if (pkg.sender_address) {
        try {
          const res = await Location.geocodeAsync(pkg.sender_address);
          if (res && res.length > 0) return { lat: res[0].latitude, lng: res[0].longitude, source: 'geocoding', resolvedAddress: pkg.sender_address };
        } catch (e) {}
      }
      return { lat: 21.9588, lng: 96.0891, source: 'fallback', resolvedAddress: pkg.sender_address || '仰光' };
    } catch (e) { return null; }
  }, []);

  const getDeliveryCoordinates = useCallback(async (pkg: Package): Promise<ResolvedLocation | null> => {
    try {
      if (pkg.receiver_latitude && pkg.receiver_longitude) return { lat: parseFloat(pkg.receiver_latitude.toString()), lng: parseFloat(pkg.receiver_longitude.toString()), source: 'coordinates', resolvedAddress: pkg.receiver_address };
      if (pkg.receiver_address) {
        try {
          const res = await Location.geocodeAsync(pkg.receiver_address);
          if (res && res.length > 0) return { lat: res[0].latitude, lng: res[0].longitude, source: 'geocoding', resolvedAddress: pkg.receiver_address };
        } catch (e) {}
      }
      return { lat: 21.9588, lng: 96.0891, source: 'fallback', resolvedAddress: pkg.receiver_address || '仰光' };
    } catch (e) { return null; }
  }, []);

  const getCoordinatesForPackage = useCallback(async (pkg: PackageWithExtras): Promise<ResolvedLocation | null> => {
    const cached = coordinatesCache.current[pkg.id];
    if (cached) return cached;
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
  }, []);

  const loadPackages = useCallback(async (forceRefresh = false) => {
    const startTime = Date.now();
    try {
      const now = Date.now();
      if (!forceRefresh && packagesCache.current.length > 0 && (now - lastLoadTime.current) < CACHE_DURATION) {
        setPackages(packagesCache.current);
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      const currentUser = await AsyncStorage.getItem('currentUserName') || '';
      if (!currentUser) return;
      
      let allPackages: Package[] = [];
      if (isOnline) {
        try {
          allPackages = await packageService.getAllPackages();
        } catch (networkError) {
          const cached = await cacheService.getCachedPackages();
          if (cached) allPackages = cached;
        }
      } else {
        const cached = await cacheService.getCachedPackages();
        if (cached) allPackages = cached;
      }
      
      const packagePromises = allPackages
        .filter(pkg => pkg.courier === currentUser && !['已送达', '已取消'].includes(pkg.status))
        .map(async pkg => {
          const pickupCoords = await getPickupCoordinates(pkg);
          const deliveryCoords = await getDeliveryCoordinates(pkg);
          return {
            ...pkg,
            pickupCoords: pickupCoords || undefined,
            deliveryCoords: deliveryCoords || undefined,
            coords: deliveryCoords || undefined,
            resolvedAddress: deliveryCoords?.resolvedAddress || pkg.receiver_address,
            locationSource: deliveryCoords?.source || 'fallback',
          };
        });

      const results = await Promise.allSettled(packagePromises);
      const myPackages = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<PackageWithExtras>).value);
      
      packagesCache.current = myPackages;
      lastLoadTime.current = now;
      await cacheService.savePackages(myPackages);
      setPackages(myPackages);
      setLastUpdateTime(new Date());
      trackPerformance('load packages', startTime);
    } catch (error) {
      console.error('加载包裹失败:', error);
    } finally {
      setLoading(false);
    }
  }, [isOnline, getPickupCoordinates, getDeliveryCoordinates, trackPerformance]);

  const loadCurrentDeliveringPackage = useCallback(async () => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) return;
      const { data } = await supabase.from('couriers').select('current_delivering_package_id').eq('id', courierId).single();
      setCurrentDeliveringPackageId(data?.current_delivering_package_id || null);
    } catch (error) {}
  }, []);

  const updateCourierStatus = useCallback(async (status: 'active' | 'busy' | 'inactive') => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) return;
      await supabase.from('couriers').update({ status, last_active: new Date().toISOString() }).eq('id', courierId);
    } catch (error) {}
  }, []);

  // 4. 配送业务函数
  const startDelivering = useCallback(async (packageId: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const id = await AsyncStorage.getItem('currentCourierId');
      if (!id) return;
      await supabase.from('couriers').update({ current_delivering_package_id: packageId }).eq('id', id);
      await packageService.updatePackageStatus(packageId, '配送中', new Date().toLocaleString('zh-CN'));
      setCurrentDeliveringPackageId(packageId);
      loadPackages();
    } catch (e) { 
      Alert.alert(
        language === 'zh' ? '错误' : language === 'en' ? 'Error' : 'အမှား', 
        language === 'zh' ? '操作失败' : language === 'en' ? 'Operation failed' : 'လုပ်ဆောင်မှု မအောင်မြင်ပါ'
      ); 
    }
  }, [loadPackages, language]);

  const finishDelivering = useCallback((packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      setCurrentPackageForDelivery(pkg);
      setShowCameraModal(true);
    }
  }, [packages]);

  const handleManualPickup = useCallback(async (packageId: string) => {
    Alert.alert(
      language === 'zh' ? '确认取件' : language === 'en' ? 'Confirm Pickup' : 'ပစ္စည်းလက်ခံရရှိကြောင်း အတည်ပြုပါ', 
      language === 'zh' ? '确定已收到此包裹吗？' : language === 'en' ? 'Are you sure you have received this package?' : 'ဤပါဆယ်ထုပ်ကို လက်ခံရရှိသည်မှာ သေချာပါသလား?', 
      [
        { text: language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်ပါ', style: 'cancel' },
        { text: language === 'zh' ? '确认' : language === 'en' ? 'Confirm' : 'အတည်ပြုပါ', onPress: async () => {
          const name = await AsyncStorage.getItem('currentUserName') || '';
          const ok = await packageService.updatePackageStatus(packageId, '已取件', new Date().toLocaleString('zh-CN'), undefined, name);
          if (ok) {
            loadPackages();
            if (selectedPackageForMap?.id === packageId) setSelectedPackageForMap(prev => prev ? { ...prev, status: '已取件' } : null);
          }
        }}
      ]
    );
  }, [loadPackages, selectedPackageForMap, language]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
  }, []);

  const startAutoRefresh = useCallback(() => {
    stopAutoRefresh();
    if (isBackground || !autoRefreshEnabled) return;
    autoRefreshTimerRef.current = setInterval(() => {
      if (!isBackground && isOnline) loadPackages(true);
    }, autoRefreshInterval * 1000);
  }, [isBackground, autoRefreshEnabled, autoRefreshInterval, isOnline, stopAutoRefresh, loadPackages]);

  const initNetworkListener = useCallback(() => {
    NetInfo.fetch().then(state => setIsOnline(state.isConnected ?? false));
    networkListenerRef.current = NetInfo.addEventListener(state => {
      const isNowOnline = state.isConnected ?? false;
      setIsOnline(prev => {
        if (!prev && isNowOnline) loadPackages(true);
        return isNowOnline;
      });
    });
  }, [loadPackages]);

  const removeNetworkListener = useCallback(() => {
    if (networkListenerRef.current) {
      networkListenerRef.current();
      networkListenerRef.current = null;
    }
  }, []);

  const initAppStateListener = useCallback(() => {
    appStateListenerRef.current = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setIsBackground(true);
        stopAutoRefresh();
      } else if (nextAppState === 'active') {
        setIsBackground(false);
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

  const startLocationTracking = useCallback(async () => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) return;
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      setIsLocationTracking(true);
      const updateLocation = async () => {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const now = Date.now();
          const { latitude, longitude } = currentLocation.coords;
          let shouldUpdate = false;
          if (!lastUpdateLocation.current) shouldUpdate = true;
          else {
            const distance = calculateDistanceKm(lastUpdateLocation.current.lat, lastUpdateLocation.current.lng, latitude, longitude);
            if (distance * 1000 > 20 || (now - lastUpdateLocation.current.time) > 5 * 60 * 1000) shouldUpdate = true;
          }
          if (shouldUpdate) {
            await supabase.from('courier_locations').upsert({ courier_id: courierId, latitude, longitude, heading: currentLocation.coords.heading, speed: currentLocation.coords.speed, last_update: new Date().toISOString() });
            lastUpdateLocation.current = { lat: latitude, lng: longitude, time: now };
          }
        } catch (e) {}
      };
      updateLocation();
      locationIntervalRef.current = setInterval(updateLocation, 60000);
    } catch (e) { setIsLocationTracking(false); }
  }, []);

  const stopLocationTracking = useCallback(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setIsLocationTracking(false);
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const c = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: c.coords.latitude, longitude: c.coords.longitude });
      }
    } catch (e) {}
  }, []);

  const loadDeliveryStores = useCallback(async () => {
    try {
      const { data } = await supabase.from('delivery_stores').select('id, store_name, store_code');
      setDeliveryStores(data || []);
    } catch (error) {}
  }, []);

  const handleOpenCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.3 });
    if (!res.canceled && res.assets[0]) {
      setCapturedPhoto(res.assets[0].uri);
      setShowPhotoModal(true);
      setShowCameraModal(false);
    }
  }, []);

  const convertImageToBase64 = useCallback(async (uri: string): Promise<string> => {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const tid = setTimeout(() => reject(new Error('Timeout')), 8000);
        reader.onloadend = () => { clearTimeout(tid); resolve((reader.result as string).split(',')[1]); };
        reader.readAsDataURL(blob);
      });
    } catch (e) { return ''; }
  }, []);

  const handleUploadPhoto = useCallback(async () => {
    if (!capturedPhoto || !currentPackageForDelivery) return;
    try {
      setUploadingPhoto(true);
      const name = await AsyncStorage.getItem('currentUserName') || '未知';
      const b64 = await convertImageToBase64(capturedPhoto);
      await deliveryPhotoService.saveDeliveryPhoto({ 
        packageId: currentPackageForDelivery.id, 
        photoBase64: b64, 
        courierName: name, 
        latitude: location?.latitude || 0, 
        longitude: location?.longitude || 0, 
        locationName: '配送位置' 
      });
      const ok = await packageService.updatePackageStatus(currentPackageForDelivery.id, '已送达', undefined, new Date().toISOString(), name);
      if (ok) {
        const id = await AsyncStorage.getItem('currentCourierId');
        if (id) await supabase.from('couriers').update({ current_delivering_package_id: null }).eq('id', id);
        setCurrentDeliveringPackageId(null);
        setShowPhotoModal(false);
        setCapturedPhoto(null);
        setCurrentPackageForDelivery(null);
        loadPackages();
      }
    } finally { setUploadingPhoto(false); }
  }, [capturedPhoto, currentPackageForDelivery, location, convertImageToBase64, loadPackages]);

  // 5. 导航功能
  const startNavigationToPoint = useCallback(async (lat: number, lng: number) => {
    if (!location) return;
    const origin = `${location.latitude},${location.longitude}`;
    const destination = `${lat},${lng}`;
    const urls = [`comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`, `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`];
    let opened = false;
    for (const url of urls) { if (await Linking.canOpenURL(url)) { await Linking.openURL(url); opened = true; break; } }
    if (!opened) await Linking.openURL(`http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`);
  }, [location]);

  const handleSingleNavigate = useCallback(async (lat: number, lng: number) => {
    startNavigationToPoint(lat, lng);
  }, [startNavigationToPoint]);

  const openGoogleMapsNavigation = useCallback(async () => {
    if (!location || optimizedPackagesWithCoords.length === 0) return;
    const origin = `${location.latitude},${location.longitude}`;
    const allCoords: string[] = [];
    optimizedPackagesWithCoords.forEach(p => { 
      if (p.pickupCoords) allCoords.push(`${p.pickupCoords.lat},${p.pickupCoords.lng}`); 
      if (p.deliveryCoords) allCoords.push(`${p.deliveryCoords.lat},${p.deliveryCoords.lng}`); 
    });
    if (allCoords.length === 0) return;
    const dest = allCoords[allCoords.length - 1];
    const waypoints = allCoords.slice(0, Math.min(allCoords.length - 1, 9)).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${waypoints}&travelmode=driving`;
    await Linking.openURL(url);
    setShowMapPreview(false);
  }, [location, optimizedPackagesWithCoords]);

  const calculateRouteDistance = useCallback((packagesList: PackageWithExtras[], start: { lat: number; lng: number }): number => {
    let total = 0;
    let current = start;
    packagesList.forEach(p => {
      if (p.pickupCoords) {
        total += calculateDistanceKm(current.lat, current.lng, p.pickupCoords.lat, p.pickupCoords.lng);
        current = p.pickupCoords;
      }
      if (p.deliveryCoords) {
        total += calculateDistanceKm(current.lat, current.lng, p.deliveryCoords.lat, p.deliveryCoords.lng);
        current = p.deliveryCoords;
      }
    });
    return total;
  }, []);

  const optimizeDeliveryRoute = useCallback(async (packagesList: PackageWithExtras[], strategy: 'shortest' | 'fastest' | 'priority' = 'shortest'): Promise<PackageWithExtras[]> => {
    if (!location || packagesList.length <= 1) return packagesList;
    try {
      const packagesWithCoords = await Promise.all(packagesList.map(async (pkg) => {
        const pickupCoords = await getPickupCoordinates(pkg);
        const deliveryCoords = await getDeliveryCoordinates(pkg);
        const pickupDistance = pickupCoords ? calculateDistanceKm(location.latitude, location.longitude, pickupCoords.lat, pickupCoords.lng) : null;
        const deliveryDistance = (pickupCoords && deliveryCoords) ? calculateDistanceKm(pickupCoords.lat, pickupCoords.lng, deliveryCoords.lat, deliveryCoords.lng) : null;
        const totalDistance = (pickupDistance || 0) + (deliveryDistance || 0);
        let priorityScore = totalDistance || 999;
        if (pkg.delivery_speed === '急送达') priorityScore *= 0.5;
        return { ...pkg, pickupCoords: pickupCoords || undefined, deliveryCoords: deliveryCoords || undefined, totalDistance, priorityScore };
      }));
      let sorted = [...packagesWithCoords];
      if (strategy === 'shortest') sorted.sort((a, b) => (a.totalDistance ?? 999) - (b.totalDistance ?? 999));
      else sorted.sort((a, b) => a.priorityScore - b.priorityScore);
      
      const optimized: PackageWithExtras[] = [];
      const remaining = [...sorted];
      let currentLat = location.latitude;
      let currentLng = location.longitude;
      while (remaining.length > 0) {
        let nearestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          if (remaining[i].pickupCoords) {
            const d = calculateDistanceKm(currentLat, currentLng, remaining[i].pickupCoords!.lat, remaining[i].pickupCoords!.lng);
            if (d < minDist) { minDist = d; nearestIdx = i; }
          }
        }
        const nearest = remaining.splice(nearestIdx, 1)[0];
        optimized.push(nearest);
        if (nearest.deliveryCoords) { currentLat = nearest.deliveryCoords.lat; currentLng = nearest.deliveryCoords.lng; }
      }
      return optimized;
    } catch (e) { return packagesList; }
  }, [location, getPickupCoordinates, getDeliveryCoordinates]);

  const handleNavigateAll = useCallback(async () => {
    if (packages.length === 0 || !location) return;
    const optimized = await optimizeDeliveryRoute(packages, optimizationStrategy);
    setOptimizedPackagesWithCoords(optimized);
    setOptimizedRouteDistance(calculateRouteDistance(optimized, { lat: location.latitude, lng: location.longitude }));
    setShowMapPreview(true);
  }, [packages, location, optimizeDeliveryRoute, optimizationStrategy, calculateRouteDistance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPackages(true);
    await loadCurrentDeliveringPackage();
    setRefreshing(false);
  }, [loadPackages, loadCurrentDeliveringPackage]);

  // 🔔 新增：实时订单监听功能
  useEffect(() => {
    let channel: any = null;

    const setupRealtimeListener = async () => {
      const currentUser = await AsyncStorage.getItem('currentUserName') || '';
      if (!currentUser) return;

      console.log('📡 正在开启新订单实时监听...', currentUser);

      channel = supabase
        .channel('rider-new-orders')
        .on(
          'postgres_changes',
          {
            event: '*', // 监听所有变化（包括新指派和取消）
            schema: 'public',
            table: 'packages',
            filter: `courier=eq.${currentUser}`
          },
          async (payload) => {
            console.log('🔔 收到订单变更通知:', payload.eventType);
            
            // 如果是新增订单或状态变更为“已分配”
            if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && payload.new.status === '已分配')) {
              // 1. 触发震动
              Vibration.vibrate([0, 500, 200, 500]); // 震动模式：等待0ms，震500ms，停200ms，震500ms
              
              // 2. 触觉反馈 (iOS/高级安卓)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // 3. 弹窗提醒
              Alert.alert(
                language === 'zh' ? '新任务提醒' : 'New Task',
                language === 'zh' ? `您有一单新的配送任务: #${payload.new.id.slice(-6)}` : `New task assigned: #${payload.new.id.slice(-6)}`,
                [{ text: 'OK', onPress: () => loadPackages(true) }]
              );

              // 4. 自动刷新列表
              loadPackages(true);
            } else if (payload.eventType === 'DELETE' || (payload.eventType === 'UPDATE' && payload.new.status === '已取消')) {
              // 订单取消提醒
              Vibration.vibrate(300);
              loadPackages(true);
            }
          }
        )
        .subscribe();
    };

    setupRealtimeListener();

    return () => {
      if (channel) {
        console.log('📴 正在关闭实时监听...');
        supabase.removeChannel(channel);
      }
    };
  }, [language, loadPackages]);

  // 当弹窗打开时，自动调整地图缩放以显示所有点
  useEffect(() => {
    if (showMapPreview && optimizedPackagesWithCoords.length > 0 && mapRef.current) {
      const coords = optimizedPackagesWithCoords.flatMap(p => {
        const points = [];
        if (p.pickupCoords) points.push({ latitude: p.pickupCoords.lat, longitude: p.pickupCoords.lng });
        if (p.deliveryCoords) points.push({ latitude: p.deliveryCoords.lat, longitude: p.deliveryCoords.lng });
        return points;
      });
      
      if (location) {
        coords.push({ latitude: location.latitude, longitude: location.longitude });
      }

      if (coords.length > 0) {
        // 延迟一点确保地图加载完成
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 50, right: 50, bottom: 350, left: 50 },
            animated: true,
          });
        }, 500);
      }
    }
  }, [showMapPreview, optimizedPackagesWithCoords, location]);

  // 6. 渲染辅助
  const renderPackageItem = useCallback(({ item, index }: { item: PackageWithExtras; index: number }) => {
    const isCurrent = currentDeliveringPackageId === item.id;
    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        style={[
          styles.packageCard, 
          isCurrent && styles.currentDeliveringCard
        ]} 
        onPress={() => navigation.navigate('PackageDetail', { package: item, coords: item.coords })}
      >
        <View style={styles.packageInfo}>
          <View style={styles.cardHeader}>
            <View style={styles.idGroup}>
              <Text style={styles.packageId}>#{item.id.slice(-6)}</Text>
              {item.delivery_speed && (
                <View style={styles.speedBadge}>
                  <Text style={styles.speedIcon}>{getMarkerIcon(item.delivery_speed)}</Text>
                  <Text style={styles.speedText}>{item.delivery_speed}</Text>
                </View>
              )}
              
              {/* 🚀 新增：在顶部显示下单身份 */}
              {(() => {
                const identityMatch = item.description?.match(/\[(?:下单身份|Orderer Identity|အော်ဒါတင်သူ အမျိုးအစား): (.*?)\]/);
                if (identityMatch && identityMatch[1]) {
                  const identity = identityMatch[1];
                  const isPartner = identity === '合伙人' || identity === 'Partner';
                  return (
                    <View style={[styles.identityBadge, { backgroundColor: isPartner ? '#3b82f6' : '#f59e0b' }]}>
                      <Text style={styles.identityText}>{identity}</Text>
                    </View>
                  );
                }
                return null;
              })()}
            </View>
            {isCurrent && (
              <View style={styles.deliveringBadge}>
                <Ionicons name="bicycle" size={12} color="#059669" />
                <Text style={styles.deliveringText}>配送中</Text>
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <View style={styles.pickupSection}>
              <View style={styles.pointIndicator}>
                <View style={[styles.pointDot, { backgroundColor: '#f59e0b' }]} />
                <View style={styles.pointLine} />
              </View>
              <View style={styles.pointContent}>
                <Text style={styles.sectionTitle}>
                  {language === 'zh' ? '取货点' : language === 'en' ? 'Pickup' : 'ပစ္စည်းယူရန်'}
                </Text>
                <Text style={styles.senderName}>{item.sender_name}</Text>
                <Text style={styles.address} numberOfLines={1}>{item.sender_address}</Text>
                {item.pickupCoords && (
                  <TouchableOpacity 
                    style={styles.pointNavAction} 
                    onPress={() => handleSingleNavigate(item.pickupCoords!.lat, item.pickupCoords!.lng)}
                  >
                    <Ionicons name="navigate-circle" size={16} color="#3b82f6" />
                    <Text style={styles.pointNavActionText}>{language === 'zh' ? '导航' : language === 'en' ? 'Nav' : 'လမ်းညွှန်'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.deliverySection}>
              <View style={styles.pointIndicator}>
                <View style={[styles.pointDot, { backgroundColor: '#3b82f6' }]} />
              </View>
              <View style={styles.pointContent}>
                <Text style={styles.sectionTitle}>
                  {language === 'zh' ? '送货点' : language === 'en' ? 'Delivery' : 'ပစ္စည်းပို့ရန်'}
                </Text>
                <Text style={styles.receiverName}>{item.receiver_name}</Text>
                <Text style={styles.address} numberOfLines={1}>{item.receiver_address}</Text>
                
                {/* 🚀 新增：地图展示付给商家金额 */}
                {(() => {
                  const payMatch = item.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်): (.*?) MMK\]/);
                  if (payMatch && payMatch[1]) {
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>
                          💰 {language === 'zh' ? '付给商家' : language === 'en' ? 'Pay to Merchant' : 'ဆိုင်သို့ ပေးချေရန်'}: {payMatch[1]} MMK
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}

                {item.deliveryCoords && (
                  <TouchableOpacity 
                    style={styles.pointNavAction} 
                    onPress={() => handleSingleNavigate(item.deliveryCoords!.lat, item.deliveryCoords!.lng)}
                  >
                    <Ionicons name="navigate-circle" size={16} color="#3b82f6" />
                    <Text style={styles.pointNavActionText}>{language === 'zh' ? '导航' : language === 'en' ? 'Nav' : 'လမ်းညွှန်'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <View style={[styles.numberBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            
            <View style={styles.buttonGroup}>
              {item.status === '已取件' ? (
                !isCurrent ? (
                  <TouchableOpacity 
                    style={styles.startDeliveryButton} 
                    onPress={(e) => { e.stopPropagation(); startDelivering(item.id); }}
                  >
                    <Text style={styles.startDeliveryText}>
                      🚀 {language === 'zh' ? '开始配送' : language === 'en' ? 'Start Delivery' : 'ပို့ဆောင်မှုစတင်'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.finishDeliveryButton} 
                    onPress={(e) => { e.stopPropagation(); finishDelivering(item.id); }}
                  >
                    <Text style={styles.finishDeliveryText}>
                      🏁 {language === 'zh' ? '完成配送' : language === 'en' ? 'Complete' : 'ပြီးမြောက်ပါ'}
                    </Text>
                  </TouchableOpacity>
                )
              ) : item.status === '配送中' ? (
                <TouchableOpacity 
                  style={styles.finishDeliveryButton} 
                  onPress={(e) => { e.stopPropagation(); finishDelivering(item.id); }}
                >
                  <Text style={styles.finishDeliveryText}>
                    🏁 {language === 'zh' ? '完成配送' : language === 'en' ? 'Complete' : 'ပြီးမြောက်ပါ'}
                  </Text>
                </TouchableOpacity>
              ) : item.status === '待取件' ? (
                <View style={styles.dualButtons}>
                  <TouchableOpacity 
                    style={[styles.placeholderButton, { backgroundColor: '#3b82f6' }]} 
                    onPress={(e) => { e.stopPropagation(); navigation.navigate('Scan'); }}
                  >
                    <Text style={styles.placeholderText}>
                      {language === 'zh' ? '扫码取件' : language === 'en' ? 'Scan' : 'စကင်န်ဖတ်ပါ'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.placeholderButton, { backgroundColor: '#10b981' }]} 
                    onPress={(e) => { e.stopPropagation(); handleManualPickup(item.id); }}
                  >
                    <Text style={styles.placeholderText}>
                      {language === 'zh' ? '手动取件' : language === 'en' ? 'Manual' : 'ကိုယ်တိုင်ယူ'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.completedButton}>
                  <Text style={styles.completedText}>✅ {item.status}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [currentDeliveringPackageId, navigation, startDelivering, finishDelivering, handleManualPickup, getMarkerIcon, getStatusColor]);

  // 7. 初始化效果
  useEffect(() => {
    const init = async () => {
      await requestLocationPermission();
      await loadPackages();
      await loadDeliveryStores();
      await loadCurrentDeliveringPackage();
      await updateCourierStatus('active');
      initNetworkListener();
      initAppStateListener();
      startLocationTracking();
      if (autoRefreshEnabled) startAutoRefresh();
    };
    init();
    return () => {
      stopLocationTracking();
      updateCourierStatus('inactive');
      cleanupMemory();
      stopAutoRefresh();
      removeNetworkListener();
      removeAppStateListener();
    };
  }, []);

  const filteredPackages = useMemo(() => {
    let filtered = [...packages];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => p.id.toLowerCase().includes(q) || (p.receiver_name && p.receiver_name.toLowerCase().includes(q)) || (p.sender_name && p.sender_name.toLowerCase().includes(q)));
    }
    if (statusFilter !== '全部') filtered = filtered.filter(p => p.status === statusFilter);
    if (speedFilter !== '全部') filtered = filtered.filter(p => p.delivery_speed === speedFilter);
    return filtered;
  }, [packages, searchQuery, statusFilter, speedFilter]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          🗺️ {language === 'zh' ? '配送路线' : language === 'en' ? 'Delivery Route' : 'ပို့ဆောင်ရေးလမ်းကြောင်း'}
        </Text>
      </View>
      
      {errorMessage && (
        <View style={[styles.statusBanner, !isOnline && styles.statusBannerOffline]}>
          <Text style={styles.statusBannerText}>
            {!isOnline ? '📡 ' : '⚠️ '}{errorMessage}
          </Text>
          {!isOnline && (
            <TouchableOpacity onPress={() => loadPackages(true)} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>
                {language === 'zh' ? '重试' : language === 'en' ? 'Retry' : 'ပြန်ကြိုးစားပါ'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {lastUpdateTime && (
        <View style={styles.lastUpdateContainer}>
          <Text style={styles.lastUpdateText}>
            {language === 'zh' ? '最后更新' : language === 'en' ? 'Last update' : 'နောက်ဆုံးအပ်ဒိတ်'}: {lastUpdateTime.toLocaleTimeString()}
          </Text>
        </View>
      )}
      <View style={styles.listContainer}>
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput 
              style={styles.searchInput} 
              placeholder={language === 'zh' ? '搜索包裹...' : language === 'en' ? 'Search packages...' : 'ပါဆယ်ထုပ်များကိုရှာဖွေပါ...'} 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
            />
          </View>
          {location && (
            <TouchableOpacity style={styles.filterButton} onPress={handleNavigateAll}>
              <Text style={styles.filterButtonText}>
                {language === 'zh' ? '🗺️ 规划路线' : language === 'en' ? '🗺️ Plan Route' : '🗺️ လမ်းကြောင်းစီစဉ်ပါ'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" />
        ) : (
          packages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>
                {language === 'zh' ? '暂无任务' : language === 'en' ? 'No Tasks' : 'တာဝန်မရှိပါ'}
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={() => loadPackages(true)}>
                <Text style={styles.refreshButtonText}>
                  {language === 'zh' ? '🔄 刷新' : language === 'en' ? '🔄 Refresh' : '🔄 ပြန်လည်ရယူပါ'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList 
              data={filteredPackages} 
              renderItem={renderPackageItem} 
              keyExtractor={p => p.id} 
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} 
            />
          )
        )}
      </View>

      <Modal visible={showMapPreview} animationType="slide">
        <View style={styles.mapModalContainer}>
          <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.mapModalHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowMapPreview(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>
              {language === 'zh' ? '📍 路线预览' : language === 'en' ? '📍 Route Preview' : '📍 လမ်းကြောင်းအစမ်းကြည့်'}
            </Text>
            <View style={{ width: 40 }} />
          </LinearGradient>
          <View style={{ flex: 1, position: 'relative' }}>
            <MapView 
              ref={mapRef}
              provider={PROVIDER_GOOGLE} 
              style={StyleSheet.absoluteFillObject} 
              initialRegion={{ 
                latitude: location?.latitude || 21.9588, 
                longitude: location?.longitude || 96.0891, 
                latitudeDelta: 0.05, 
                longitudeDelta: 0.05 
              }}
            >
              {location && (
                <Marker 
                  coordinate={{ latitude: location.latitude, longitude: location.longitude }} 
                  title={language === 'zh' ? '当前位置' : 'My Location'}
                >
                  <View style={styles.courierMarker}>
                    <Text style={styles.courierMarkerText}>🛵</Text>
                  </View>
                </Marker>
              )}
              
              {optimizedPackagesWithCoords.map((p, i) => (
                <React.Fragment key={`${p.id}-${i}`}>
                  {p.pickupCoords && (
                    <Marker 
                      coordinate={{ latitude: p.pickupCoords.lat, longitude: p.pickupCoords.lng }}
                      title={`${language === 'zh' ? '取货点' : 'Pickup'} P${i + 1}`}
                      description={p.sender_address}
                    >
                      <View style={styles.pickupMarker}>
                        <Text style={styles.pickupMarkerText}>P{i + 1}</Text>
                      </View>
                    </Marker>
                  )}
                  {p.deliveryCoords && (
                    <Marker 
                      coordinate={{ latitude: p.deliveryCoords.lat, longitude: p.deliveryCoords.lng }}
                      title={`${language === 'zh' ? '送货点' : 'Delivery'} D${i + 1}`}
                      description={p.receiver_address}
                    >
                      <View style={styles.packageMarker}>
                        <Text style={styles.pickupMarkerText}>D{i + 1}</Text>
                      </View>
                    </Marker>
                  )}
                </React.Fragment>
              ))}
            </MapView>
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <View style={styles.routeListContainer}>
                <View style={styles.routeListHeader}>
                  <Text style={styles.routeListTitle}>
                    {language === 'zh' ? '📦 配送顺序' : language === 'en' ? '📦 Delivery Order' : '📦 ပို့ဆောင်မည့်အစဉ်'}
                  </Text>
                  <TouchableOpacity style={styles.startNavigationButtonCompact} onPress={openGoogleMapsNavigation}>
                    <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={styles.navBtnGradientSmall}>
                      <Text style={styles.navBtnTextSmall}>
                        {language === 'zh' ? '🚀 开始导航' : language === 'en' ? '🚀 Start Nav' : '🚀 လမ်းညွှန်စတင်ပါ'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.routeListScroll}>
                  {optimizedPackagesWithCoords.map((p, i) => (
                    <View key={p.id} style={[styles.routeListItem, { padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={styles.routeNumberBadgeCompact}><Text style={styles.routeNumberBadgeTextCompact}>{i+1}</Text></View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontWeight: '600' }}>{p.receiver_name}</Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }} numberOfLines={1}>{p.receiver_address}</Text>
                      </View>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(p.status) }]} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCameraModal} animationType="slide" transparent={true}>
        <View style={styles.cameraModalContainer}>
          <View style={styles.cameraModalContent}>
            <View style={styles.cameraModalHeader}>
              <Text style={styles.cameraModalTitle}>
                {language === 'zh' ? '📸 拍摄照片' : language === 'en' ? '📸 Take Photo' : '📸 ဓာတ်ပုံရိုက်ပါ'}
              </Text>
              <TouchableOpacity onPress={() => setShowCameraModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.cameraModalBody}>
              <TouchableOpacity onPress={handleOpenCamera} style={styles.cameraButton}>
                <Text style={styles.cameraButtonText}>
                  {language === 'zh' ? '📷 打开相机' : language === 'en' ? '📷 Open Camera' : '📷 ကင်မရာဖွင့်ပါ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPhotoModal} animationType="fade" transparent={true}>
        <View style={styles.photoModalContainer}>
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>
                {language === 'zh' ? '配送照片预览' : language === 'en' ? 'Photo Preview' : 'ဓာတ်ပုံအစမ်းကြည့်'}
              </Text>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.photoModalBody}>
              <Image source={{ uri: capturedPhoto || '' }} style={styles.photoPreviewWrapper} />
              <TouchableOpacity onPress={handleUploadPhoto} style={styles.uploadButton}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.uploadButtonGradient}>
                  <Text style={styles.uploadButtonText}>
                    {uploadingPhoto 
                      ? (language === 'zh' ? '正在上传...' : language === 'en' ? 'Uploading...' : 'တင်နေသည်...') 
                      : (language === 'zh' ? '确认送达' : language === 'en' ? 'Confirm Delivery' : 'ပစ္စည်းရောက်ရှိကြောင်းအတည်ပြု')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    backgroundColor: '#1e293b', 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  statusBanner: { backgroundColor: '#fef3c7', padding: 12, margin: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  statusBannerOffline: { backgroundColor: '#fee2e2', borderLeftColor: '#ef4444' },
  statusBannerText: { fontSize: 13, color: '#92400e', flex: 1, fontWeight: '500' },
  retryButton: { backgroundColor: '#3b82f6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginLeft: 10 },
  retryButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  lastUpdateContainer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  lastUpdateText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  listContainer: { flex: 1, paddingTop: 10 },
  searchFilterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  searchContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    height: 46,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8, opacity: 0.6 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', fontWeight: '500' },
  filterButton: { 
    backgroundColor: '#fff', 
    paddingHorizontal: 15, 
    height: 46, 
    justifyContent: 'center', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonText: { color: '#3b82f6', fontSize: 13, fontWeight: '700' },
  
  // 包裹卡片
  packageCard: { 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginBottom: 12, 
    borderRadius: 16, 
    padding: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  currentDeliveringCard: { 
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: '#f0fdf4'
  },
  packageInfo: { gap: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  packageId: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  speedBadge: { 
    flexDirection: 'row', 
    backgroundColor: '#f1f5f9', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8, 
    alignItems: 'center', 
    gap: 4 
  },
  speedIcon: { fontSize: 12 },
  speedText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  deliveringBadge: { 
    flexDirection: 'row',
    backgroundColor: '#d1fae5', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 20, 
    alignItems: 'center',
    gap: 4
  },
  deliveringText: { fontSize: 11, fontWeight: '800', color: '#059669' },
  
  cardBody: {
    gap: 4
  },
  pickupSection: { flexDirection: 'row', gap: 12 },
  deliverySection: { flexDirection: 'row', gap: 12 },
  pointIndicator: {
    alignItems: 'center',
    width: 12,
    paddingTop: 6
  },
  pointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pointLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
    minHeight: 20
  },
  pointContent: {
    flex: 1,
    paddingBottom: 10
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase' },
  senderName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  receiverName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  address: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  
  actionRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 4,
    alignItems: 'center'
  },
  numberBadge: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  numberText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  buttonGroup: {
    flex: 1,
  },
  dualButtons: {
    flexDirection: 'row',
    gap: 10
  },
  startDeliveryButton: { 
    backgroundColor: '#10b981', 
    height: 44,
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3
  },
  startDeliveryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  finishDeliveryButton: { 
    backgroundColor: '#ef4444', 
    height: 44,
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3
  },
  finishDeliveryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  placeholderButton: { 
    flex: 1,
    height: 44,
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  placeholderText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  completedButton: { 
    height: 44,
    borderRadius: 12, 
    backgroundColor: '#f1f5f9', 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  completedText: { color: '#94a3b8', fontWeight: '800', fontSize: 14 },

  // 地图Modal
  mapModalContainer: { flex: 1, backgroundColor: '#fff' },
  mapModalHeader: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 20,
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#1e293b'
  },
  mapModalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  closeButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  courierMarker: { 
    backgroundColor: '#10b981', 
    width: 40,
    height: 40,
    borderRadius: 20, 
    borderWidth: 3, 
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5
  },
  courierMarkerText: { fontSize: 20 },
  pickupMarker: { 
    backgroundColor: '#f59e0b', 
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 3, 
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4
  },
  packageMarker: { 
    backgroundColor: '#3b82f6', 
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 3, 
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4
  },
  pickupMarkerText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  routeListContainer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 320, 
    backgroundColor: 'rgba(255,255,255,0.98)', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10
  },
  routeListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  routeListTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  startNavigationButtonCompact: { borderRadius: 14, overflow: 'hidden' },
  navBtnGradientSmall: { paddingHorizontal: 20, paddingVertical: 10 },
  navBtnTextSmall: { color: '#fff', fontWeight: '800', fontSize: 14 },
  routeListScroll: { flex: 1 },
  routeListItem: { 
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#f1f5f9',
    padding: 12,
    marginBottom: 10
  },
  routeNumberBadgeCompact: { 
    width: 26, 
    height: 26, 
    borderRadius: 13, 
    backgroundColor: '#1e293b', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  routeNumberBadgeTextCompact: { color: '#fff', fontSize: 12, fontWeight: '800' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  
  cameraModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  cameraModalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, elevation: 10 },
  cameraModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  cameraModalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  cameraModalBody: { alignItems: 'center' },
  cameraButton: { backgroundColor: '#10b981', width: '100%', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  cameraButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  
  photoModalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  photoModalContent: { flex: 1, backgroundColor: '#fff', marginTop: 60, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24 },
  photoModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  photoModalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  photoModalBody: { flex: 1 },
  photoPreviewWrapper: { width: '100%', flex: 1, borderRadius: 20, marginBottom: 24, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  uploadButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  uploadButtonGradient: { padding: 18, alignItems: 'center', justifyContent: 'center' },
  uploadButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  
  pointNavAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#eff6ff', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  pointNavActionText: { color: '#3b82f6', fontSize: 12, fontWeight: '800' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 70, marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#475569', marginBottom: 12 },
  refreshButton: { backgroundColor: '#3b82f6', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 16, shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  refreshButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  identityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  identityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
