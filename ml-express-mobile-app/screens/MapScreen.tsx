import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
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
  source: 'coordinates' | 'geocoding' | 'fallback' | 'cache';
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
  const isFocused = useIsFocused();
  
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
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [anomalyType, setAnomalyType] = useState('');
  const [anomalyDescription, setAnomalyDescription] = useState('');
  const [reporting, setReporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('全部');
  const [distanceFilter, setDistanceFilter] = useState<string>('全部');
  const [speedFilter, setSpeedFilter] = useState<string>('全部');
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [completedPackageIds, setCompletedPackageIds] = useState<Record<string, number>>({});
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(60);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isBackground, setIsBackground] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deliveryStores, setDeliveryStores] = useState<any[]>([]);
  const [optimizationStrategy, setOptimizationStrategy] = useState<'shortest' | 'fastest' | 'priority'>('shortest');
  
  // 🚀 坐标平滑处理状态
  const [smoothCoords, setSmoothCoords] = useState<{lat: number, lng: number} | null>(null);
  const lastSmoothCoords = useRef<{lat: number, lng: number} | null>(null);
  const SMOOTHING_FACTOR = 0.35;

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
  const lastLocationConfigRef = useRef<{ accuracy: Location.Accuracy; timeInterval: number; distanceInterval: number; mode: string } | null>(null);
  const packageStartTimes = useRef<Record<string, number>>({});
  const pulseAnimations = useRef<Record<string, Animated.Value>>({});
  const pendingRequests = useRef<Set<string>>(new Set());
  const performanceMetrics = useRef({
    loadTimes: [] as number[],
    renderTimes: [] as number[]
  });

  // 3. 核心功能函数 (useCallback)
  
  const normalizeStatus = useCallback((status?: string) => {
    if (!status) return '';
    const trimmed = status.trim();
    if (trimmed.includes('已送达')) return '已送达';
    if (trimmed.includes('已取消')) return '已取消';
    if (trimmed.includes('配送中')) return '配送中';
    if (trimmed.includes('已取件')) return '已取件';
    if (trimmed.includes('待收款')) return '待收款';
    if (trimmed.includes('待取件')) return '待取件';
    if (trimmed.includes('待确认')) return '待确认';
    return trimmed;
  }, []);

  const resolvePackageStatus = useCallback((pkg: PackageWithExtras, override?: string) => {
    if (pkg.delivery_time) return '已送达';
    return normalizeStatus(override || pkg.status);
  }, [normalizeStatus]);

  const COMPLETED_IDS_KEY = 'completed_delivery_ids';
  const COMPLETED_TTL = 7 * 24 * 60 * 60 * 1000;

  const loadCompletedIds = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(COMPLETED_IDS_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, number>;
      const now = Date.now();
      const cleaned: Record<string, number> = {};
      Object.entries(parsed).forEach(([id, ts]) => {
        if (now - ts < COMPLETED_TTL) cleaned[id] = ts;
      });
      setCompletedPackageIds(cleaned);
      await AsyncStorage.setItem(COMPLETED_IDS_KEY, JSON.stringify(cleaned));
    } catch (e) {}
  }, []);

  const saveCompletedIds = useCallback(async (next: Record<string, number>) => {
    try {
      await AsyncStorage.setItem(COMPLETED_IDS_KEY, JSON.stringify(next));
    } catch (e) {}
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (normalizeStatus(status)) {
      case '待取件': return '#f39c12';
      case '待收款': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      case '已送达': return '#27ae60';
      case '异常上报': return '#ef4444'; // 🚀 新增：异常状态为红色
      default: return '#95a5a6';
    }
  }, [normalizeStatus]);

  // 🚀 新增：获取状态文本函数
  const getStatusDisplayText = useCallback((status: string) => {
    const s = normalizeStatus(status);
    switch (s) {
      case '待取件': return language === 'zh' ? '待取件' : 'Pending';
      case '待收款': return language === 'zh' ? '待收款' : 'Wait Collect';
      case '已取件': return language === 'zh' ? '已取件' : 'Picked Up';
      case '配送中': return language === 'zh' ? '配送中' : 'Delivering';
      case '已送达': return language === 'zh' ? '已送达' : 'Delivered';
      case '异常上报': return language === 'zh' ? '异常上报' : 'Anomaly Reported';
      case '已取消': return language === 'zh' ? '已取消' : 'Cancelled';
      default: return s;
    }
  }, [language, normalizeStatus]);

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

  const hasInTransitOrders = useMemo(() => {
    return Boolean(
      currentDeliveringPackageId ||
      packages.some(p => p.status === '配送中' || p.status === '配送进行中')
    );
  }, [currentDeliveringPackageId, packages]);

  const buildLocationConfig = useCallback(() => {
    if (isBackground) {
      return {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 240000,
        distanceInterval: 250,
        mode: 'background'
      };
    }
    if (hasInTransitOrders) {
      return {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 10000,
        distanceInterval: 15,
        mode: 'active'
      };
    }
    return {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 20000,
      distanceInterval: 80,
      mode: 'idle'
    };
  }, [hasInTransitOrders, isBackground]);

  const cleanupMemory = useCallback(() => {
    coordinatesCache.current = {};
    packagesCache.current = [];
    setPackages([]);
    setOptimizedPackagesWithCoords([]);
    console.log('🧹 内存清理完成');
  }, []);

  const normalizeAddressForDb = (address?: string) => {
    if (!address) return null;
    return address.trim().toLowerCase();
  };

  const normalizeAddressKey = (address?: string) => {
    if (!address) return null;
    return encodeURIComponent(address.trim().toLowerCase());
  };

  const getGeocodeCacheKey = (address?: string) => {
    const normalized = normalizeAddressKey(address);
    if (!normalized) return null;
    return `geo:${normalized}`;
  };

  const readGeocodeCache = useCallback(async (address?: string): Promise<ResolvedLocation | null> => {
    try {
      const key = getGeocodeCacheKey(address);
      if (!key) return null;
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (typeof parsed?.lat !== 'number' || typeof parsed?.lng !== 'number') return null;
      return { lat: parsed.lat, lng: parsed.lng, source: 'cache', resolvedAddress: address || '' };
    } catch (error) {
      return null;
    }
  }, []);

  const readRemoteGeocodeCache = useCallback(async (address?: string): Promise<ResolvedLocation | null> => {
    try {
      const normalized = normalizeAddressForDb(address);
      if (!normalized || !isOnline) return null;
      const { data, error } = await supabase
        .from('geocode_cache')
        .select('lat, lng')
        .eq('address', normalized)
        .maybeSingle();
      if (error || !data) return null;
      return { lat: data.lat, lng: data.lng, source: 'cache', resolvedAddress: address || '' };
    } catch (error) {
      return null;
    }
  }, [isOnline]);

  const writeGeocodeCache = useCallback(async (address: string | undefined, coords: { lat: number; lng: number }) => {
    try {
      const key = getGeocodeCacheKey(address);
      if (!key) return;
      await AsyncStorage.setItem(key, JSON.stringify({ lat: coords.lat, lng: coords.lng, ts: Date.now() }));
    } catch (error) {
      console.error('写入地理编码缓存失败:', error);
    }
  }, []);

  const writeRemoteGeocodeCache = useCallback(async (address: string | undefined, coords: { lat: number; lng: number }) => {
    try {
      const normalized = normalizeAddressForDb(address);
      if (!normalized || !isOnline) return;
      await supabase
        .from('geocode_cache')
        .upsert({
          address: normalized,
          lat: coords.lat,
          lng: coords.lng,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'address' });
    } catch (error) {
      console.error('写入共享地理编码缓存失败:', error);
    }
  }, [isOnline]);

  const getPickupCoordinates = useCallback(async (pkg: Package): Promise<ResolvedLocation | null> => {
    try {
      if (pkg.sender_latitude && pkg.sender_longitude) {
        const coords = { lat: parseFloat(pkg.sender_latitude.toString()), lng: parseFloat(pkg.sender_longitude.toString()) };
        await writeGeocodeCache(pkg.sender_address, coords);
        await writeRemoteGeocodeCache(pkg.sender_address, coords);
        return { ...coords, source: 'coordinates', resolvedAddress: pkg.sender_address };
      }
      if (pkg.sender_address) {
        const cached = await readGeocodeCache(pkg.sender_address);
        if (cached) return cached;
        const remoteCached = await readRemoteGeocodeCache(pkg.sender_address);
        if (remoteCached) {
          await writeGeocodeCache(pkg.sender_address, { lat: remoteCached.lat, lng: remoteCached.lng });
          return remoteCached;
        }
        if (!isOnline) {
          return { lat: 21.9588, lng: 96.0891, source: 'fallback', resolvedAddress: pkg.sender_address || '仰光' };
        }
        try {
          const res = await Location.geocodeAsync(pkg.sender_address);
          if (res && res.length > 0) {
            const coords = { lat: res[0].latitude, lng: res[0].longitude };
            await writeGeocodeCache(pkg.sender_address, coords);
            await writeRemoteGeocodeCache(pkg.sender_address, coords);
            return { ...coords, source: 'geocoding', resolvedAddress: pkg.sender_address };
          }
        } catch (e) {}
      }
      return { lat: 21.9588, lng: 96.0891, source: 'fallback', resolvedAddress: pkg.sender_address || '仰光' };
    } catch (e) { return null; }
  }, [isOnline, readGeocodeCache, readRemoteGeocodeCache, writeGeocodeCache, writeRemoteGeocodeCache]);

  const getDeliveryCoordinates = useCallback(async (pkg: Package): Promise<ResolvedLocation | null> => {
    try {
      if (pkg.receiver_latitude && pkg.receiver_longitude) {
        const coords = { lat: parseFloat(pkg.receiver_latitude.toString()), lng: parseFloat(pkg.receiver_longitude.toString()) };
        await writeGeocodeCache(pkg.receiver_address, coords);
        await writeRemoteGeocodeCache(pkg.receiver_address, coords);
        return { ...coords, source: 'coordinates', resolvedAddress: pkg.receiver_address };
      }
      if (pkg.receiver_address) {
        const cached = await readGeocodeCache(pkg.receiver_address);
        if (cached) return cached;
        const remoteCached = await readRemoteGeocodeCache(pkg.receiver_address);
        if (remoteCached) {
          await writeGeocodeCache(pkg.receiver_address, { lat: remoteCached.lat, lng: remoteCached.lng });
          return remoteCached;
        }
        if (!isOnline) {
          return { lat: 21.9588, lng: 96.0891, source: 'fallback', resolvedAddress: pkg.receiver_address || '仰光' };
        }
        try {
          const res = await Location.geocodeAsync(pkg.receiver_address);
          if (res && res.length > 0) {
            const coords = { lat: res[0].latitude, lng: res[0].longitude };
            await writeGeocodeCache(pkg.receiver_address, coords);
            await writeRemoteGeocodeCache(pkg.receiver_address, coords);
            return { ...coords, source: 'geocoding', resolvedAddress: pkg.receiver_address };
          }
        } catch (e) {}
      }
      return { lat: 21.9588, lng: 96.0891, source: 'fallback', resolvedAddress: pkg.receiver_address || '仰光' };
    } catch (e) { return null; }
  }, [isOnline, readGeocodeCache, readRemoteGeocodeCache, writeGeocodeCache, writeRemoteGeocodeCache]);

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
      
      const normalizedPackages = allPackages.map(pkg => ({
        ...pkg,
        status: normalizeStatus(pkg.status)
      }));

      // 过滤属于当前骑手且未完成的包裹
      const packagePromises = normalizedPackages
        .filter(pkg => {
          const status = normalizeStatus(pkg.status);
          const isFinished = status === '已送达' || status === '已取消' || !!pkg.delivery_time;
          const isMyPackage = pkg.courier === currentUser;
          const isLocallyCompleted = !!completedPackageIds[pkg.id];
          
          // 调试日志：帮助定位为何订单没消失
          if (isMyPackage && (isFinished || isLocallyCompleted)) {
            console.log(`🔍 过滤订单 ${pkg.id}: status=${status}, hasDeliveryTime=${!!pkg.delivery_time}, locallyCompleted=${isLocallyCompleted}`);
          }

          return isMyPackage && !isFinished && !isLocallyCompleted;
        })
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
      setStatusOverrides(prev => {
        const next = { ...prev };
        myPackages.forEach(pkg => {
          const serverResolved = pkg.delivery_time ? '已送达' : normalizeStatus(pkg.status);
          if (next[pkg.id] && next[pkg.id] === serverResolved) {
            delete next[pkg.id];
          }
          if (['配送中', '已送达', '已取消'].includes(serverResolved)) {
            delete next[pkg.id];
          }
        });
        return next;
      });
      setCompletedPackageIds(prev => {
        const next = { ...prev };
        myPackages.forEach(pkg => {
          const resolved = resolvePackageStatus(pkg);
          if (resolved === '已送达' || resolved === '已取消') {
            delete next[pkg.id];
          }
        });
        saveCompletedIds(next);
        return next;
      });
      setLastUpdateTime(new Date());
      trackPerformance('load packages', startTime);
    } catch (error) {
      console.error('加载包裹失败:', error);
    } finally {
      setLoading(false);
    }
  }, [isOnline, getPickupCoordinates, getDeliveryCoordinates, trackPerformance, completedPackageIds, normalizeStatus, resolvePackageStatus]);

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
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    try {
      setLoading(true);
      
      // 🚀 新增：限制接单逻辑 - 信用分检查
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (courierId) {
        const { data: courierData } = await supabase
          .from('couriers')
          .select('credit_score')
          .eq('id', courierId)
          .single();
        
        const score = courierData?.credit_score ?? 100;
        
        // 限制规则：信用分低于 60 分禁止开始配送
        if (score < 60) {
          Alert.alert(
            language === 'zh' ? '接单受限' : 'Account Restricted',
            language === 'zh' 
              ? `您的信用分过低 (${score})，已被限制接单。请联系管理员处理。` 
              : `Your credit score is too low (${score}). Account restricted. Please contact admin.`
          );
          return;
        }

        // 限制规则：信用分低于 80 分不能接高价单 (配送费 > 5000)
        const deliveryFee = parseFloat(pkg.price?.toString().replace(/[^\d.]/g, '') || '0');
        if (score < 80 && deliveryFee > 5000) {
          Alert.alert(
            language === 'zh' ? '权限不足' : 'Restricted',
            language === 'zh' 
              ? `您的信用分 (${score}) 不足以配送此高价订单（限 80 分以上）。` 
              : `Credit score (${score}) too low for this high-value order (min 80).`
          );
          return;
        }
      }

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
    } finally {
      setLoading(false);
    }
  }, [loadPackages, language, packages]);

  const finishDelivering = useCallback(async (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    try {
      setLoading(true);
      
      // 1. 🚀 防作弊检查：检查模拟定位和开发者模式
      const { deviceHealthService } = require('../services/deviceHealthService');
      const health = await deviceHealthService.performFullCheck();
      
      if (health.location.isMocked) {
        Alert.alert(
          language === 'zh' ? '检测到异常' : 'Anomaly Detected',
          language === 'zh' ? '系统检测到您正在使用“模拟定位”，该操作已被禁止并已上报系统。' : 'Mock location detected. This action is prohibited and reported.'
        );
        // 上报给系统 (这里可以通过 reportAnomaly 实现)
        await packageService.reportAnomaly({
          packageId: pkg.id,
          courierId: await AsyncStorage.getItem('currentCourierId') || '未知',
          courierName: await AsyncStorage.getItem('currentUserName') || '未知',
          anomalyType: '疑似使用模拟定位',
          description: `骑手在尝试确认送达时，系统检测到使用了模拟定位。设备信息: ${health.device.modelName}, OS: ${health.device.osVersion}`,
          location: location ? { latitude: location.latitude, longitude: location.longitude } : undefined
        });
        return;
      }

      // 2. 🚀 电子围栏检查：检查距离
      if (!location) {
        Alert.alert('提示', '无法获取您的当前位置，请确保 GPS 已开启');
        return;
      }

      const dist = calculateDistanceKm(
        location.latitude,
        location.longitude,
        pkg.deliveryCoords?.lat || pkg.receiver_latitude || 0,
        pkg.deliveryCoords?.lng || pkg.receiver_longitude || 0
      );

      const distanceMeters = dist * 1000;
      console.log(`📍 距离目标点: ${distanceMeters.toFixed(2)} 米`);

      if (distanceMeters > 200) {
        Alert.alert(
          language === 'zh' ? '距离过远' : 'Too Far',
          language === 'zh' 
            ? `您距离送达点还剩 ${Math.round(distanceMeters)} 米，请到达目的地后再点击（需在 200 米范围内）。` 
            : `You are ${Math.round(distanceMeters)}m away from destination. Please arrive before clicking (within 200m).`
        );
        return;
      }

      // 3. 校验通过，进入拍照/扫码流程
      setCurrentPackageForDelivery(pkg);
      setShowCameraModal(true);
    } catch (err) {
      console.error('完成配送前校验失败:', err);
    } finally {
      setLoading(false);
    }
  }, [packages, location, language]);

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
            Alert.alert(
              language === 'zh' ? '成功' : language === 'en' ? 'Success' : 'အောင်မြင်ပါသည်',
              language === 'zh' ? '已确认取件' : language === 'en' ? 'Pickup confirmed' : 'ကောက်ယူမှုကိုအတည်ပြုပြီးပါပြီ'
            );
            setStatusOverrides(prev => ({ ...prev, [packageId]: '已取件' }));
            setPackages(prev => {
              const nextPackages = prev.map(pkg => pkg.id === packageId ? { ...pkg, status: '已取件' } : pkg);
              packagesCache.current = nextPackages;
              cacheService.savePackages(nextPackages);
              return nextPackages;
            });
            if (isOnline) {
              loadPackages(true);
            }
      if (selectedPackageForMap?.id === packageId) setSelectedPackageForMap(prev => prev ? { ...prev, status: '已取件' } : null);
          } else {
            Alert.alert(
              language === 'zh' ? '错误' : language === 'en' ? 'Error' : 'အမှား',
              language === 'zh' ? '操作失败' : language === 'en' ? 'Operation failed' : 'လုပ်ဆောင်မှု မအောင်မြင်ပါ'
            );
          }
        }}
      ]
    );
  }, [loadPackages, selectedPackageForMap, language, isOnline]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
  }, []);

  const startAutoRefresh = useCallback(() => {
    stopAutoRefresh();
    if (isBackground || !autoRefreshEnabled || !hasInTransitOrders) return;
    const intervalSeconds = hasInTransitOrders ? autoRefreshInterval : Math.max(autoRefreshInterval, 120);
    autoRefreshTimerRef.current = setInterval(() => {
      if (!isBackground && isOnline) loadPackages(true);
    }, intervalSeconds * 1000);
  }, [isBackground, autoRefreshEnabled, autoRefreshInterval, hasInTransitOrders, isOnline, stopAutoRefresh, loadPackages]);

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

  const stopLocationTracking = useCallback(() => {
    if (locationIntervalRef.current) {
      if ((locationIntervalRef.current as any).remove) {
        (locationIntervalRef.current as any).remove();
      } else {
      clearInterval(locationIntervalRef.current);
      }
      locationIntervalRef.current = null;
    }
    setIsLocationTracking(false);
    lastLocationConfigRef.current = null;
  }, []);

  const startLocationTracking = useCallback(async () => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) return;

      if (!hasInTransitOrders) {
        stopLocationTracking();
        return;
      }

      const locationConfig = buildLocationConfig();
      const lastConfig = lastLocationConfigRef.current;
      if (
        isLocationTracking &&
        lastConfig &&
        lastConfig.mode === locationConfig.mode &&
        lastConfig.timeInterval === locationConfig.timeInterval &&
        lastConfig.distanceInterval === locationConfig.distanceInterval &&
        lastConfig.accuracy === locationConfig.accuracy
      ) {
        return;
      }
      
      // 清除旧的追踪
      if (locationIntervalRef.current) {
        if ((locationIntervalRef.current as any).remove) {
          (locationIntervalRef.current as any).remove();
        } else {
          clearInterval(locationIntervalRef.current);
        }
      }
      
      setIsLocationTracking(true);

      // 🚀 核心优化：使用 watchPositionAsync 替代定时器，实现更精准和实时的平滑追踪
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: locationConfig.accuracy,
          timeInterval: locationConfig.timeInterval,
          distanceInterval: locationConfig.distanceInterval,
        },
        async (currentLocation) => {
          const now = Date.now();
          let { latitude, longitude } = currentLocation.coords;
          const heading = currentLocation.coords.heading;
          const speed = currentLocation.coords.speed || 0;

          // 🚀 坐标平滑处理 (Simple Low-pass Filter)
          if (!lastSmoothCoords.current) {
            lastSmoothCoords.current = { lat: latitude, lng: longitude };
          } else {
            latitude = lastSmoothCoords.current.lat + SMOOTHING_FACTOR * (latitude - lastSmoothCoords.current.lat);
            longitude = lastSmoothCoords.current.lng + SMOOTHING_FACTOR * (longitude - lastSmoothCoords.current.lng);
            lastSmoothCoords.current = { lat: latitude, lng: longitude };
          }
          
          setSmoothCoords({ lat: latitude, lng: longitude });
          setLocation({ latitude, longitude });

          // 🚀 核心：地理围栏自动检测 (到达商家或目的地)
          if (optimizedPackagesWithCoords.length > 0) {
            optimizedPackagesWithCoords.forEach(pkg => {
              if (pkg.status === '待取件' || pkg.status === '待收款') {
                const dist = calculateDistanceKm(latitude, longitude, pkg.coords?.lat || 0, pkg.coords?.lng || 0);
                if (dist <= 0.1) { // 100米内
                  Vibration.vibrate(400);
                  // 可以在这里弹出提示或更新 UI
                }
              }
            });
          }

          // 🚀 动态上报逻辑：移动速度快时位移超过10米即上报，静止时保持心跳
          let shouldUpdate = false;
          if (!lastUpdateLocation.current) shouldUpdate = true;
          else {
            const distance = calculateDistanceKm(lastUpdateLocation.current.lat, lastUpdateLocation.current.lng, latitude, longitude);
            const isMoving = speed > 0.5;
            if ((isMoving && distance * 1000 > 15) || (now - lastUpdateLocation.current.time) > 2 * 60 * 1000) {
              shouldUpdate = true;
          }
          }

          if (shouldUpdate) {
            await supabase.from('courier_locations').upsert({ 
              courier_id: courierId, 
              latitude, 
              longitude, 
              heading, 
              speed, 
              last_update: new Date().toISOString() 
            });
            lastUpdateLocation.current = { lat: latitude, lng: longitude, time: now };
          }
        }
      );

      locationIntervalRef.current = subscription as any;
      lastLocationConfigRef.current = locationConfig;
    } catch (e) { 
      setIsLocationTracking(false); 
      console.error('追踪启动异常:', e);
    }
  }, [buildLocationConfig, hasInTransitOrders, isBackground, isLocationTracking, stopLocationTracking]);

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

      // 🚀 核心优化：在点击“确认送达”时再次执行地理围栏和防作弊校验
      const { deviceHealthService } = require('../services/deviceHealthService');
      const health = await deviceHealthService.performFullCheck();
      
      if (health.location.isMocked) {
        Alert.alert('检测到异常', '系统检测到模拟定位，无法确认送达。');
        return;
      }

      // 获取实时位置
      const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (currentLoc) {
        const dist = calculateDistanceKm(
          currentLoc.coords.latitude,
          currentLoc.coords.longitude,
          currentPackageForDelivery.deliveryCoords?.lat || currentPackageForDelivery.receiver_latitude || 0,
          currentPackageForDelivery.deliveryCoords?.lng || currentPackageForDelivery.receiver_longitude || 0
        );

        if (dist * 1000 > 200) {
          Alert.alert('距离过远', `您当前距离目标点约 ${Math.round(dist * 1000)} 米，请到达目的地 200 米范围内再确认。`);
          return;
        }
      }

      const name = await AsyncStorage.getItem('currentUserName') || '未知';
      const b64 = await convertImageToBase64(capturedPhoto);
      await deliveryPhotoService.saveDeliveryPhoto({ 
          packageId: currentPackageForDelivery.id,
        photoBase64: b64, 
        courierName: name, 
        latitude: currentLoc?.coords.latitude || location?.latitude || 0, 
        longitude: currentLoc?.coords.longitude || location?.longitude || 0, 
          locationName: '配送位置'
        });
      const ok = await packageService.updatePackageStatus(currentPackageForDelivery.id, '已送达', undefined, new Date().toISOString(), name);
      if (ok) {
        console.log(`✅ [验证] 订单 ${currentPackageForDelivery.id} 状态更新成功`);
        
        // 🚀 强制再次拉取确认 (双保险)
        setTimeout(async () => {
          const { data } = await supabase.from('packages').select('status, delivery_time').eq('id', currentPackageForDelivery.id).single();
          console.log(`📡 [验证回拉] ${currentPackageForDelivery.id} 实时状态: status=${data?.status}, time=${data?.delivery_time}`);
        }, 2000);

        const id = await AsyncStorage.getItem('currentCourierId');
        if (id) await supabase.from('couriers').update({ current_delivering_package_id: null }).eq('id', id);
        setCurrentDeliveringPackageId(null);
        setStatusOverrides(prev => {
          const next = { ...prev };
          delete next[currentPackageForDelivery.id];
          return next;
        });
        setCompletedPackageIds(prev => {
          const next = { ...prev, [currentPackageForDelivery.id]: Date.now() };
          saveCompletedIds(next);
          return next;
        });
        setPackages(prev => {
          const nextPackages = prev.filter(pkg => pkg.id !== currentPackageForDelivery.id);
          packagesCache.current = nextPackages;
          cacheService.savePackages(nextPackages);
          return nextPackages;
        });
        setShowPhotoModal(false);
        setCapturedPhoto(null);
        setCurrentPackageForDelivery(null);
        if (isOnline) loadPackages(true);
              }
    } finally { setUploadingPhoto(false); }
  }, [capturedPhoto, currentPackageForDelivery, location, convertImageToBase64, loadPackages]);

  const handleReportAnomaly = useCallback(async () => {
    if (!currentPackageForDelivery) return;
    if (!anomalyType || !anomalyDescription) {
      Alert.alert('提示', '请选择异常类型并填写详细说明');
      return;
    }

    try {
      setReporting(true);
      const courierId = await AsyncStorage.getItem('currentCourierId') || '未知';
      const courierName = await AsyncStorage.getItem('currentUserName') || '骑手';
      
      const success = await packageService.reportAnomaly({
        packageId: currentPackageForDelivery.id,
        courierId,
        courierName,
        anomalyType,
        description: anomalyDescription,
        location: location ? { latitude: location.latitude, longitude: location.longitude } : undefined
      });

      if (success) {
        // 🚀 更新本地状态为“异常上报”
        setStatusOverrides(prev => ({ ...prev, [currentPackageForDelivery.id]: '异常上报' }));
        
        Alert.alert(
          language === 'zh' ? '提交成功' : 'Reported Successfully',
          language === 'zh' ? '异常已报备，平台将介入处理。感谢您的配合！' : 'Anomaly reported. The platform will intervene. Thank you for your cooperation!',
          [{ text: '确定', onPress: () => {
            setShowAnomalyModal(false);
            setAnomalyType('');
            setAnomalyDescription('');
            loadPackages(true);
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
  }, [currentPackageForDelivery, anomalyType, anomalyDescription, location, language, loadPackages]);

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
    const effectiveStatus = resolvePackageStatus(item, statusOverrides[item.id]);
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
                  const isMERCHANTS = identity === '商家' || identity === 'MERCHANTS';
                  return (
                    <View style={[styles.identityBadge, { backgroundColor: isMERCHANTS ? '#3b82f6' : '#f59e0b' }]}>
                      <Text style={styles.identityText}>{identity}</Text>
                    </View>
                  );
                }
                return null;
              })()}
            </View>
            <View style={[styles.deliveringBadge, { backgroundColor: getStatusColor(effectiveStatus) + '20' }]}>
              <Ionicons 
                name={effectiveStatus === '异常上报' ? "warning" : "bicycle"} 
                size={12} 
                color={getStatusColor(effectiveStatus)} 
              />
              <Text style={[styles.deliveringText, { color: getStatusColor(effectiveStatus) }]}>
                {getStatusDisplayText(effectiveStatus)}
              </Text>
            </View>
          </View>
          
          <View style={styles.cardBody}>
            {(() => {
              const identityMatch = item.description?.match(/\[(?:下单身份|Orderer Identity|အော်ဒါတင်သူ အမျိုးအစား): (.*?)\]/);
              const identity = identityMatch ? identityMatch[1] : 'Member';
              const isMERCHANTS = identity === '商家' || identity === 'MERCHANTS';
              const isVIP = identity === 'VIP' || identity === 'VIP MEMBER' || identity === 'VIP အဖွဲ့ဝင်';
              const isMember = identity === '会员' || identity === 'Member' || identity === 'အဖွဲ့ဝင်';

              return (
                <>
                  {/* 取货点部分 */}
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
                      
                      {/* 🚀 规则 1：MERCHANTS 账号显示 COD 信息 */}
                      {isMERCHANTS && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          {Number(item.cod_amount || 0) > 0 ? (
                            <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '800' }}>
                              💰 {language === 'zh' ? '代收款 (COD)' : language === 'en' ? 'Collect COD' : 'COD ကောက်ခံရန်'}: {Number(item.cod_amount).toLocaleString()} MMK
                            </Text>
                          ) : (
                            <Text style={{ color: '#64748b', fontSize: 11, fontWeight: 'bold' }}>
                              💰 {language === 'zh' ? '无 (COD)' : language === 'en' ? 'No COD' : 'COD မရှိပါ'}
                            </Text>
                          )}
                        </View>
                      )}

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

                  {/* 送货点部分 */}
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
                      
                      {/* 🚀 规则 3：通用规则 - 跑腿费现金支付提示 (针对 Member, VIP, MERCHANTS) */}
                      {item.payment_method === 'cash' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '900' }}>
                            🛵 {language === 'zh' ? '跑腿费 (现金)' : language === 'en' ? 'Shipping Fee (Cash)' : 'ပို့ဆောင်ခ (ငွေသား)'}: {item.price?.replace('MMK', '').trim()} MMK
                          </Text>
                        </View>
                      )}

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
                </>
              );
            })()}
          </View>

          <View style={styles.actionRow}>
            <View style={[styles.numberBadge, { backgroundColor: getStatusColor(effectiveStatus) }]}>                                                                    
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            
            <View style={styles.buttonGroup}>
            {effectiveStatus === '已取件' ? (
                !isCurrent ? (
                <TouchableOpacity 
                  style={styles.startDeliveryButton}
                    onPress={(e) => { e?.stopPropagation?.(); startDelivering(item.id); }}
                >
                  <Text style={styles.startDeliveryText}>
                    🚀 {language === 'zh' ? '开始配送' : language === 'en' ? 'Start Delivery' : 'ပို့ဆောင်မှုစတင်'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.finishDeliveryButton}
                    onPress={(e) => { e?.stopPropagation?.(); finishDelivering(item.id); }}
                >
                  <Text style={styles.finishDeliveryText}>
                      🏁 {language === 'zh' ? '完成配送' : language === 'en' ? 'Complete' : 'ပြီးမြောက်ပါ'}
                  </Text>
                </TouchableOpacity>
              )
            ) : (effectiveStatus === '配送中' || effectiveStatus === '异常上报') ? (
              <TouchableOpacity 
                style={[
                  styles.finishDeliveryButton,
                  effectiveStatus === '异常上报' && { backgroundColor: '#ef4444' }
                ]}
                  onPress={(e) => { e?.stopPropagation?.(); finishDelivering(item.id); }}
              >
                <Text style={styles.finishDeliveryText}>
                    {effectiveStatus === '异常上报' ? '⚠️ ' : '🏁 '}
                    {getStatusDisplayText(effectiveStatus)}
                </Text>
              </TouchableOpacity>
            ) : effectiveStatus === '待取件' ? (
                <View style={styles.dualButtons}>
                  <TouchableOpacity 
                    style={[styles.placeholderButton, { backgroundColor: '#3b82f6' }]} 
                    onPress={(e) => { e?.stopPropagation?.(); navigation.navigate('Scan'); }}
                  >
                <Text style={styles.placeholderText}>
                      {language === 'zh' ? '扫码取件' : language === 'en' ? 'Scan' : 'စကင်န်ဖတ်ပါ'}
                </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.placeholderButton, { backgroundColor: '#10b981' }]} 
                    onPress={(e) => { e?.stopPropagation?.(); handleManualPickup(item.id); }}
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
  }, [currentDeliveringPackageId, navigation, startDelivering, finishDelivering, handleManualPickup, getMarkerIcon, getStatusColor, statusOverrides, language, normalizeStatus, resolvePackageStatus]);

  // 7. 初始化效果
  useEffect(() => {
    const init = async () => {
      await loadCompletedIds();
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

  useEffect(() => {
    startLocationTracking();
  }, [hasInTransitOrders, isBackground, startLocationTracking]);

  useEffect(() => {
    if (autoRefreshEnabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  }, [autoRefreshEnabled, hasInTransitOrders, startAutoRefresh, stopAutoRefresh]);

  useEffect(() => {
    if (!hasInTransitOrders) {
      stopAutoRefresh();
    }
  }, [hasInTransitOrders, stopAutoRefresh]);

  const filteredPackages = useMemo(() => {
    let filtered = packages.filter(pkg => !completedPackageIds[pkg.id]);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => p.id.toLowerCase().includes(q) || (p.receiver_name && p.receiver_name.toLowerCase().includes(q)) || (p.sender_name && p.sender_name.toLowerCase().includes(q)));
    }
    if (statusFilter !== '全部') filtered = filtered.filter(p => p.status === statusFilter);
    if (speedFilter !== '全部') filtered = filtered.filter(p => p.delivery_speed === speedFilter);
    return filtered;
  }, [packages, searchQuery, statusFilter, speedFilter, completedPackageIds]);

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
            {isFocused ? (
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
            ) : (
              <View style={styles.mapPausedContainer}>
                <Text style={styles.mapPausedText}>
                  {language === 'zh' ? '地图已暂停以节省电量' : language === 'en' ? 'Map paused to save battery' : 'မြေပုံကို ဘက်ထရီချွေတာရန် ခန့်ထားထားသည်'}
                </Text>
              </View>
            )}
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
                {language === 'zh' ? '📸 配送操作' : language === 'en' ? '📸 Delivery' : '📸 ပို့ဆောင်မှု'}
              </Text>
              <TouchableOpacity onPress={() => setShowCameraModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalBody, { flexDirection: 'row', gap: 12, flexWrap: 'wrap' }]}>
              {currentPackageForDelivery?.status === '待取件' ? (
                <>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={() => { setShowCameraModal(false); navigation.navigate('Scan'); }}>
                    <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.gridBtnGradient}>
                      <Ionicons name="qr-code" size={28} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '扫码取件' : 'Scan'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={() => { setShowCameraModal(false); handleManualPickup(currentPackageForDelivery.id); }}>
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
                  <TouchableOpacity style={styles.gridActionBtn} onPress={() => { setShowCameraModal(false); navigation.navigate('Scan'); }}>
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

      {/* 🚀 异常上报模态框 */}
      <Modal visible={showAnomalyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.glassModal, { backgroundColor: '#fff', maxWidth: 450 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: '#f1f5f9' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="warning" size={24} color="#ef4444" />
                </View>
                <Text style={[styles.modalTitle, { color: '#ef4444' }]}>
                  {language === 'zh' ? '异常场景申报' : 'Anomaly Report'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAnomalyModal(false)} style={[styles.closeBtn, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* 引导语 */}
              <View style={{ backgroundColor: '#fef2f2', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#fee2e2' }}>
                <Text style={{ color: '#991b1b', fontSize: 13, lineHeight: 20, fontWeight: '600' }}>
                  {language === 'zh' 
                    ? '💡 遇到问题请先报备，平台将核实免责。严禁在未送达的情况下直接点击“确认送达”，虚假点击将面临平台重罚！' 
                    : '💡 Please report issues first. The platform will verify and exempt liability. Do not mark as "Delivered" without actual delivery; false clicks result in heavy penalties!'}
                </Text>
              </View>

              {/* 异常类型选择 */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' }}>
                🚩 {language === 'zh' ? '选择异常类型' : 'Anomaly Type'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {['联系不上收件人', '地址错误/无法送达', '收件人拒绝签收', '包裹损坏', '其他异常'].map((type) => (
                  <TouchableOpacity 
                    key={type}
                    onPress={() => setAnomalyType(type)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: anomalyType === type ? '#fee2e2' : '#f8fafc',
                      borderWidth: 1,
                      borderColor: anomalyType === type ? '#ef4444' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ color: anomalyType === type ? '#ef4444' : '#64748b', fontSize: 13, fontWeight: '600' }}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 详细说明 */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' }}>
                📝 {language === 'zh' ? '详细说明' : 'Description'}
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: 16,
                  padding: 16,
                  color: '#1e293b',
                  fontSize: 14,
                  minHeight: 100,
                  textAlignVertical: 'top',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  marginBottom: 24,
                }}
                placeholder={language === 'zh' ? '请描述具体情况，如：拨打收件人电话3次未接通...' : 'Describe the situation...'}
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={anomalyDescription}
                onChangeText={setAnomalyDescription}
              />

              <TouchableOpacity 
                style={[{ height: 56, borderRadius: 16, overflow: 'hidden' }, (reporting || !anomalyType || !anomalyDescription) && styles.disabledBtn]} 
                onPress={handleReportAnomaly}
                disabled={reporting || !anomalyType || !anomalyDescription}
              >
                <LinearGradient colors={['#ef4444', '#dc2626']} style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                  {reporting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="white" />
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{language === 'zh' ? '提交报备' : 'Submit Report'}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={{ height: 20 }} />
            </ScrollView>
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
  mapPausedContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mapPausedText: {
    color: '#e2e8f0',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
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
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  glassModal: { width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.98)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  modalHeader: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalBody: { padding: 24 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  disabledBtn: { opacity: 0.5 },
  gridActionBtn: { flex: 1, height: 100, borderRadius: 20, overflow: 'hidden' },
  gridBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gridBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 10 },
  
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
