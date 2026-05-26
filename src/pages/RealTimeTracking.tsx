import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorHandler } from '../services/errorHandler';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import '../styles/adminRealTimeTracking.css';
import { packageService, Package, supabase, CourierLocation, notificationService, deliveryStoreService, DeliveryStore, adminAccountService, auditLogService, systemSettingsService } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';
import { useLanguage } from '../contexts/LanguageContext';
import { Courier, CourierWithLocation, Coordinates } from '../types';
import { GOOGLE_MAPS_LIBRARIES } from '../constants/googleMaps';
import { notifyAdminTodosRefresh } from '../utils/adminTodoBridge';
import {
  isMerchantOrderPackage,
  packageHasCod,
  resolvePackageCodAmount,
} from '../utils/packageCodAmount';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Google Maps API Key 未配置！请检查环境变量 REACT_APP_GOOGLE_MAPS_API_KEY');
}

// 配送商店接口已在types/index.ts中定义

/** 与「系统设置中心 → 实时跟踪」相同的配置项（system_settings.settings_key） */
const TRACKING_SETTING_KEYS = [
  'tracking.refresh_interval_seconds',
  'tracking.map_theme',
  'tracking.route_prediction_enabled',
  'tracking.webhook_push_enabled',
] as const;

/** 实时跟踪包裹卡片：客户下单时选择的配送速度 / 预约时间（与 packages 表字段一致） */
function adminDeliveryOptionLine(pkg: Package): string {
  const speed = (pkg.delivery_speed || '').trim();
  const sched = (pkg.scheduled_delivery_time || '').trim();
  const desc = pkg.description || '';
  if (!speed && !sched && desc) {
    const m = desc.match(
      /\[(?:配送选项|Delivery Option|ပို့ဆောင်မှု\s*ရွေးချယ်မှု)\s*[:：]\s*(.+?)\]/,
    );
    if (m?.[1]) return m[1].trim();
  }
  const bits: string[] = [];
  if (speed) bits.push(speed);
  if (sched) bits.push(`指定时间 ${sched}`);
  return bits.length > 0 ? bits.join(' · ') : '—';
}

type MapThemeSetting = 'dark' | 'light' | 'satellite';

/** 暗色地图样式（与系统设置「地图主题 → 暗色」对应） */
const GOOGLE_MAP_DARK_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
] as const;

const RealTimeTracking: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  // 获取当前用户角色和区域信息
  const currentUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '';
  const currentUserRole = sessionStorage.getItem('currentUserRole') || localStorage.getItem('currentUserRole') || '';
  const currentUserRegion = sessionStorage.getItem('currentUserRegion') || localStorage.getItem('currentUserRegion') || '';
  
  // 领区识别逻辑更新：确保 MDY 和 POL 彻底分开
  const getDetectedRegion = () => {
    const userUpper = currentUser.toUpperCase();
    if (currentUserRegion === 'yangon' || userUpper.startsWith('YGN')) return 'YGN';
    if (currentUserRegion === 'maymyo' || userUpper.startsWith('POL')) return 'POL';
    if (currentUserRegion === 'mandalay' || userUpper.startsWith('MDY')) return 'MDY';
    return '';
  };

  const currentRegionPrefix = getDetectedRegion();
  // 角色为系统管理员则不分领区，否则如果检测到了领区前缀，就强制开启领区锁定
  const isRegionalUser = currentUserRole !== 'admin' && currentRegionPrefix !== '';

  // 🚀 辅助函数：计算两个经纬度点之间的距离（公里）
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

  // 🚀 辅助函数：根据当前包裹推荐最合适的骑手
  const getRecommendedCouriers = (pkg: Package) => {
    if (!pkg.sender_latitude || !pkg.sender_longitude) return couriers.filter(c => c.status !== 'offline');

    return couriers
      .filter(c => c.status !== 'offline')
      .filter(c => {
        const la = c.latitude != null ? Number(c.latitude) : NaN;
        const lo = c.longitude != null ? Number(c.longitude) : NaN;
        return Number.isFinite(la) && Number.isFinite(lo);
      })
      .map(courier => {
        const distance = calculateDistance(
          pkg.sender_latitude || 0,
          pkg.sender_longitude || 0,
          courier.latitude || 0,
          courier.longitude || 0
        );
        
        // 推荐指数计算：距离越近分数越高，包裹越少分数越高
        // 基础分数 100，每公里扣 5 分，每个包裹扣 10 分
        const score = 100 - (distance * 5) - ((courier.currentPackages || 0) * 10);
        
        return { ...courier, distance, score };
      })
      .sort((a, b) => b.score - a.score);
  };

  const [packages, setPackages] = useState<Package[]>([]);
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  const [couriers, setCouriers] = useState<CourierWithLocation[]>([]);
  const [regionalRiderCount, setRegionalRiderCount] = useState(0);
  const [onlineRiderCount, setOnlineRiderCount] = useState(0);
  const [selectedCourier, setSelectedCourier] = useState<CourierWithLocation | null>(null);
  /** 选中骑手后，地图是否持续中心对准其最新坐标（由实时推送或轮询更新） */
  const [followSelectedCourierOnMap, setFollowSelectedCourierOnMap] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [abnormalPackages, setAbnormalPackages] = useState<Package[]>([]); // 🚨 新增：异常包裹状态
  const [abnormalCouriers, setAbnormalCouriers] = useState<CourierWithLocation[]>([]); // 🚨 新增：异常骑手状态
  const [lowBatteryRiders, setLowBatteryRiders] = useState<CourierWithLocation[]>([]); // 🔋 新增：低电量预警骑手
  const [showAbnormalAlert, setShowAbnormalAlert] = useState(false); // 🚨 新增：异常警报弹窗显示状态
  
  type CityKey = 'mandalay' | 'pyinoolwin' | 'yangon' | 'naypyidaw' | 'taunggyi' | 'lashio' | 'muse';
  
  // 初始化城市和坐标逻辑
  const initialCity: CityKey = currentRegionPrefix === 'YGN' ? 'yangon' : 'mandalay';
  const initialCenter = currentRegionPrefix === 'YGN' 
    ? { lat: 16.8661, lng: 96.1951 } 
    : { lat: 21.9588, lng: 96.0891 };

  const [selectedCity, setSelectedCity] = useState<CityKey>(initialCity); 
  const [mapCenter, setMapCenter] = useState<Coordinates>(initialCenter); 
  const [isAssigning, setIsAssigning] = useState(false); // 分配状态
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // 选项卡和快递店相关状态
  const [sidebarTab, setSidebarTab] = useState<'pending' | 'assigned'>('pending');
  const [stores, setStores] = useState<DeliveryStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  
  // 包裹位置点显示状态
  const [selectedLocationPoint, setSelectedLocationPoint] = useState<{
    packageId: string;
    type: 'pickup' | 'delivery';
    coordinates: Coordinates;
  } | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString()); // 🚀 新增：最后刷新时间
  const [nextRefreshCountdown, setNextRefreshCountdown] = useState<number>(15); // 与系统设置 tracking.refresh_interval_seconds 对齐（默认 15）
  /** 与「系统设置中心 → 实时跟踪」卡片中的配置联动 */
  const [trackingRefreshSec, setTrackingRefreshSec] = useState(15);
  const [mapThemeSetting, setMapThemeSetting] = useState<MapThemeSetting>('dark');
  const [routePredictionEnabled, setRoutePredictionEnabled] = useState(false);
  const [webhookPushEnabled, setWebhookPushEnabled] = useState(false);

  // 音频提示相关状态
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundEnabledRef = useRef(soundEnabled);

  // 更新 ref 以便在闭包中使用最新状态
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // 监听新订单
  useEffect(() => {
    // 请求通知权限
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    console.log('📡 启动新订单实时监听...');
    const channel = supabase
      .channel('realtime-tracking-packages')
      .on(
        'postgres_changes',
        {
          event: '*', // 🚀 监听所有变更（包含 INSERT, UPDATE, DELETE）
          schema: 'public',
          table: 'packages'
        },
        (payload) => {
          const newPackage = payload.new as Package;
          const oldPackage = payload.old as Package;
          
          console.log('📡 实时变化通知:', payload.eventType, newPackage?.id);

          // 1. 如果是新订单
          if (payload.eventType === 'INSERT') {
            if (newPackage.status === '待取件' || newPackage.status === '待收款') {
              triggerAlert(newPackage);
            }
          }
          
          // 2. 如果是订单状态更新 (特别处理商场订单确认)
          if (payload.eventType === 'UPDATE') {
            // 如果状态从 待确认 变为 待取件/待收款
            if (oldPackage?.status === '待确认' && (newPackage.status === '待取件' || newPackage.status === '待收款')) {
              console.log('✅ 商场订单已被商家接收，准备提醒管理员进行分配:', newPackage.id);
              triggerAlert(newPackage);
            }
          }

          // 无论什么变化，统一刷新数据
          loadPackages();
          loadCouriers();
        }
      )
      .subscribe();

    const triggerAlert = (pkg: Package) => {
      // 播放声音
      if (soundEnabledRef.current && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error('播放提示音失败:', e));
      }
      
      // 浏览器通知
      if (Notification.permission === 'granted') {
        try {
          new Notification('📦 订单更新提醒', {
            body: `订单 ${pkg.id} 状态: ${pkg.status}\n地址: ${pkg.sender_address || ''}`,
            icon: '/favicon.ico'
          });
        } catch (e) {
          console.error('通知发送失败:', e);
        }
      }
    };

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 缅甸主要城市数据（以曼德勒为中心）
  const myanmarCities: Record<CityKey, { name: string; nameEn: string; nameMm: string; lat: number; lng: number }> = {
    mandalay: { name: '曼德勒', nameEn: 'Mandalay', nameMm: 'မန္တလေး', lat: 21.9588, lng: 96.0891 }, // 总部
    pyinoolwin: { name: '彬乌伦', nameEn: 'Pyin Oo Lwin', nameMm: 'ပင်းတလဲ', lat: 22.0333, lng: 96.4667 }, // 彬乌伦
    yangon: { name: '仰光', nameEn: 'Yangon', nameMm: 'ရန်ကုန်', lat: 16.8661, lng: 96.1951 }, // 开发中
    naypyidaw: { name: '内比都', nameEn: 'Naypyidaw', nameMm: 'နေပြည်တော်', lat: 19.7633, lng: 96.0785 }, // 开发中
    taunggyi: { name: '东枝', nameEn: 'Taunggyi', nameMm: 'တောင်ကြီး', lat: 20.7892, lng: 97.0378 }, // 开发中
    lashio: { name: '腊戌', nameEn: 'Lashio', nameMm: 'လားရှိုး', lat: 22.9333, lng: 97.7500 }, // 开发中
    muse: { name: '木姐', nameEn: 'Muse', nameMm: 'မူဆယ်', lat: 23.9833, lng: 97.9000 } // 开发中
  };

  // 加载 Google Maps
  const { isLoaded: isMapLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  // 检查Google Maps加载状态
  useEffect(() => {
    if (loadError) {
      console.error('Google Maps load error:', loadError);
    }
    
    // 如果API密钥缺失，显示警告
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.trim() === '') {
      console.error('❌ Google Maps API密钥未设置！');
      console.error('请在 Netlify Dashboard 的环境变量设置中配置：REACT_APP_GOOGLE_MAPS_API_KEY');
    } else {
      console.log('✅ Google Maps API Key 已加载:', GOOGLE_MAPS_API_KEY.substring(0, 20) + '...');
    }
  }, [isMapLoaded, loadError, GOOGLE_MAPS_API_KEY]);

  // 🚨 新增：检测配送中的异常包裹（超过2小时未更新状态/位置）
  useEffect(() => {
    const checkAbnormalStatus = () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      // 1. 检测异常包裹
      const abnormalPkgs = packages.filter(pkg => {
        if (pkg.status !== '配送中' && pkg.status !== '配送进行中') return false;
        const lastUpdateTime = pkg.updated_at ? new Date(pkg.updated_at) : (pkg.created_at ? new Date(pkg.created_at) : null);
        return lastUpdateTime && lastUpdateTime < twoHoursAgo;
      });

      // 2. 检测异常停留骑手 (有包裹但位置30分钟未更新)
      const abnormalRiders = couriers.filter(c => {
        if (c.status === 'offline' || (c.currentPackages || 0) === 0) return false;
        const lastLocUpdate = (c as any).location_updated_at ? new Date((c as any).location_updated_at) : null;
        return lastLocUpdate && lastLocUpdate < thirtyMinsAgo;
      });

      // 3. 🔋 检测低电量且有任务的骑手 (电量 < 10%)
      const lowBatteryRidersList = couriers.filter(c => {
        return (c.batteryLevel !== undefined && c.batteryLevel < 10) && (c.currentPackages || 0) > 0 && c.status !== 'offline';
      });

      // 如果发现了新的异常（包裹、骑手或低电量），触发警报
      if (
        abnormalPkgs.length > abnormalPackages.length || 
        abnormalRiders.length > abnormalCouriers.length ||
        lowBatteryRidersList.length > lowBatteryRiders.length
      ) {
        if (soundEnabledRef.current && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error('播放警报音失败:', e));
        }

        const alertBody = [];
        if (abnormalPkgs.length > 0) alertBody.push(`${abnormalPkgs.length} 个异常包裹`);
        if (abnormalRiders.length > 0) alertBody.push(`${abnormalRiders.length} 个异常停留骑手`);
        if (lowBatteryRidersList.length > 0) alertBody.push(`${lowBatteryRidersList.length} 个骑手电量不足`);

        if (Notification.permission === 'granted') {
          new Notification('⚠️ 实时监控预警', {
            body: `发现: ${alertBody.join(', ')}！`,
            icon: '/favicon.ico',
            tag: 'abnormal-alert'
          });
        }
        setShowAbnormalAlert(true);
      }

      setAbnormalPackages(abnormalPkgs);
      setAbnormalCouriers(abnormalRiders as any);
      setLowBatteryRiders(lowBatteryRidersList);
    };

    // 初始执行一次
    checkAbnormalStatus();

    // 每 5 分钟检测一次
    const timer = setInterval(checkAbnormalStatus, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [packages, abnormalPackages.length]);
  
  // 加载快递店数据
  const loadStores = async () => {
    try {
      setLoadingStores(true);
      const data = await deliveryStoreService.getAllStores();
      
      // 领区过滤
      if (isRegionalUser) {
        setStores(data.filter(s => s.store_code && s.store_code.startsWith(currentRegionPrefix)));
      } else {
        setStores(data);
      }
    } catch (error) {
      errorHandler.handleErrorSilent(error, '加载快递店数据');
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  const loadPackages = async () => {
    try {
      const data = await packageService.getAllPackages();
      
      // 分离不同状态的包裹（待分配包裹仅包含 待取件 和 待收款，不包含 待确认）
      // 🚀 逻辑修改：商城订单在商家确认前（待确认）不显示在管理员的待分配列表中
      const pendingPackages = data.filter(p => p.status === '待取件' || p.status === '待收款');
      const assignedPackages = data.filter(p => p.status === '已取件' || p.status === '配送中');
      
      // 显示所有活跃包裹（待分配 + 已分配）
      let activePackages = [...pendingPackages, ...assignedPackages];
      
      // 领区过滤
      if (isRegionalUser) {
        activePackages = activePackages.filter(p => p.id.startsWith(currentRegionPrefix));
      }
      
      setPackages(activePackages);
      
    } catch (error) {
      errorHandler.handleErrorSilent(error, '加载包裹数据');
      setPackages([]);
    }
  };

  // 获取未分配的包裹（用于在地图上显示P点和D点）
  const getUnassignedPackages = () => {
    return packages.filter(pkg => 
      pkg.courier === '待分配' && 
      (pkg.status === '待取件' || pkg.status === '待收款') && // 🚀 逻辑修改：不再包含 待确认
      // 确保有坐标信息
      ((pkg.sender_latitude && pkg.sender_longitude) || (pkg.receiver_latitude && pkg.receiver_longitude))
    );
  };

  const loadCouriers = async () => {
    try {
      // 1. 获取所有账号系统中的账号（同步用户管理页面的来源）
      const accounts = await adminAccountService.getAllAccounts();
      const riderAccounts = accounts.filter(acc => 
        acc.position === '骑手' || acc.position === '骑手队长'
      );

      // 2. 确定当前过滤前缀
      let activePrefix = currentRegionPrefix;
      if (!isRegionalUser) {
        if (selectedCity === 'yangon') activePrefix = 'YGN';
        else if (selectedCity === 'mandalay') activePrefix = 'MDY';
        else if (selectedCity === 'pyinoolwin') activePrefix = 'POL';
        else activePrefix = ''; // 其他城市暂不按前缀过滤
      }

      // 3. 计算该区域的骑手总数
      const regionalRiders = riderAccounts.filter(acc => {
        if (activePrefix) {
          return acc.employee_id && acc.employee_id.startsWith(activePrefix);
        }
        return true;
      });
      setRegionalRiderCount(regionalRiders.length);

      // 4. 从数据库获取快递员实时位置和状态
      const { data: couriersData, error: couriersError } = await supabase
        .from('couriers')
        .select('*')
        .order('last_active', { ascending: false });

      if (couriersError) {
        console.error('获取快递员列表失败:', couriersError);
        setCouriers([]);
        return;
      }

      if (!couriersData || couriersData.length === 0) {
        setCouriers([]);
        setOnlineRiderCount(0);
        return;
      }

      // 5. 获取位置信息
      const { data: locationsData, error: locationsError } = await supabase
        .from('courier_locations')
        .select('*');

      if (locationsError) {
        console.warn('获取位置信息失败:', locationsError);
      }

      // 6. 计算每个快递员的当前包裹数
      const { data: packagesData } = await supabase
        .from('packages')
        .select('courier, status')
        .in('status', ['已取件', '配送中']);

      const packageCounts: { [key: string]: number } = {};
      packagesData?.forEach(pkg => {
        if (pkg.courier && pkg.courier !== '待分配') {
          packageCounts[pkg.courier] = (packageCounts[pkg.courier] || 0) + 1;
        }
      });

      // 7. 合并数据并过滤
      // 以账号系统 (riderAccounts) 为准，确保所有骑手都能显示
      const enrichedCouriers: CourierWithLocation[] = riderAccounts
        .filter(acc => {
          // 只显示当前区域的骑手
          if (activePrefix) {
            return acc.employee_id && acc.employee_id.startsWith(activePrefix);
          }
          return true;
        })
        .map(acc => {
          // 在 couriers 表中查找对应的实时数据
          // 🚀 优化：增强匹配逻辑，同时支持 employee_id 和 phone 匹配（忽略 0 开头差异）
          const normalizePhoneForMatch = (p: string) => p ? p.replace(/^0/, '') : '';
          const accPhone = normalizePhoneForMatch(acc.phone);
          
          const courierRt = couriersData.find(c => {
            if (c.employee_id === acc.employee_id) return true;
            if (normalizePhoneForMatch(c.phone) === accPhone) return true;
            return false;
          });
          
          // 在 courier_locations 表中查找位置
          const location = locationsData?.find(loc => loc.courier_id === (courierRt?.id || acc.id));
          
          const currentPackages = packageCounts[acc.employee_name] || 0;

          // 确定在线状态逻辑
          const lastActiveStr = courierRt?.last_active || acc.last_login;
          let displayStatus: Courier['status'] = 'offline';
          
          // 🚀 优化：增加明确的离线状态检查
          // 1. 账号被禁用
          // 2. 骑手主动在 App 中登出 (courierRt.status === 'inactive')
          const isExplicitlyOffline = acc.status !== 'active' || courierRt?.status === 'inactive';

          if (!isExplicitlyOffline) {
            // 比较 couriers 表的最后活跃时间和 admin_accounts 的最后登录时间，取最近的一个
            // 🚀 优化：增加有效性检查，防止非日期字符串导致 NaN
            const parseDate = (dateStr: any) => {
              if (!dateStr || dateStr === '从未上线' || dateStr === '从未登录') return 0;
              const d = new Date(dateStr).getTime();
              return isNaN(d) ? 0 : d;
            };

            const rtActiveTime = parseDate(courierRt?.last_active);
            const loginActiveTime = parseDate(acc.last_login);
            const locationUpdateTime = parseDate(location?.updated_at || location?.last_update); // 🚀 新增：包含位置更新时间
            
            const mostRecentActiveTime = Math.max(rtActiveTime, loginActiveTime, locationUpdateTime);

            const now = Date.now();
            const diffMinutes = (now - mostRecentActiveTime) / (1000 * 60);
            
            // 🚀 核心优化：即便显式状态是离线，如果 10 分钟内有位置更新，也强制显示为在线
            const hasRecentLocation = locationUpdateTime > 0 && (now - locationUpdateTime) / (1000 * 60) < 10;

            if (hasRecentLocation || !isExplicitlyOffline) {
              // 🚀 优化：将在线判定阈值延长为 30 分钟，确保位置更新稍慢的骑手不会被显示为离线
              if (hasRecentLocation || diffMinutes < 30) {
                displayStatus = (currentPackages >= 5 ? 'busy' : 'online') as Courier['status'];
              }
            }
          }

          const latRaw = location?.latitude;
          const lngRaw = location?.longitude;
          const lat =
            latRaw !== null && latRaw !== undefined && latRaw !== ''
              ? Number(latRaw)
              : NaN;
          const lng =
            lngRaw !== null && lngRaw !== undefined && lngRaw !== ''
              ? Number(lngRaw)
              : NaN;
          const hasValidGps = Number.isFinite(lat) && Number.isFinite(lng);

          return {
            id: courierRt?.id || acc.id,
            name: acc.employee_name,
            phone: acc.phone,
            employee_id: acc.employee_id,
            // 仅使用实际上报的 GPS；无定位时不生成随机点，避免地图上出现假位置
            latitude: hasValidGps ? lat : undefined,
            longitude: hasValidGps ? lng : undefined,
            status: displayStatus,
            currentPackages: currentPackages,
            todayDeliveries: courierRt?.total_deliveries || 0,
            batteryLevel: location?.battery_level ?? 100,
            signal_strength: location?.signal_strength ?? 100, // 🚀 映射信号强度
            vehicle_type: acc.position === '骑手队长' ? 'car' : 'motorcycle',
            location_updated_at: location?.updated_at || location?.last_update || courierRt?.last_active || acc.last_login
          } as any;
        });

      setCouriers(enrichedCouriers);
      // 更新在线骑手数量 (仅计算状态为 online 的，busy 另计)
      setOnlineRiderCount(enrichedCouriers.filter(c => c.status === 'online').length);
    } catch (error) {
      errorHandler.handleErrorSilent(error, '加载快递员数据');
      setCouriers([]);
      setOnlineRiderCount(0);
    }
  };

  /** Supabase Realtime：`courier_locations` 行级更新立即反映到地图，不等待轮询 */
  const mergeRealtimeCourierLocation = useCallback(
    (row: Record<string, unknown> & { deleted?: boolean }) => {
      if (!row || typeof row !== 'object') return;
      if (row.deleted) {
        const cid = row.courier_id as string | undefined;
        if (!cid) return;
        setCouriers(prev =>
          prev.map(c =>
            c.id === cid ? { ...c, latitude: undefined, longitude: undefined } : c
          )
        );
        setSelectedCourier(prev =>
          prev?.id === cid ? { ...prev, latitude: undefined, longitude: undefined } : prev
        );
        return;
      }
      const cid = row.courier_id as string | undefined;
      if (!cid) return;
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const batteryRaw = row.battery_level;
      const sigRaw = row.signal_strength;
      const ts = (row.last_update || row.updated_at) as string | undefined;

      setCouriers(prev =>
        prev.map(c => {
          if (c.id !== cid) return c;
          const next: CourierWithLocation = { ...c, latitude: lat, longitude: lng };
          if (batteryRaw !== undefined && batteryRaw !== null && String(batteryRaw) !== '') {
            const b = Number(batteryRaw);
            if (Number.isFinite(b)) next.batteryLevel = b;
          }
          if (sigRaw !== undefined && sigRaw !== null && String(sigRaw) !== '') {
            const s = Number(sigRaw);
            if (Number.isFinite(s)) next.signal_strength = s;
          }
          if (ts) (next as CourierWithLocation & { location_updated_at?: string }).location_updated_at = ts;
          return next;
        })
      );

      setSelectedCourier(prev => {
        if (!prev || prev.id !== cid) return prev;
        const next: CourierWithLocation = { ...prev, latitude: lat, longitude: lng };
        if (batteryRaw !== undefined && batteryRaw !== null && String(batteryRaw) !== '') {
          const b = Number(batteryRaw);
          if (Number.isFinite(b)) next.batteryLevel = b;
        }
        if (sigRaw !== undefined && sigRaw !== null && String(sigRaw) !== '') {
          const s = Number(sigRaw);
          if (Number.isFinite(s)) next.signal_strength = s;
        }
        if (ts) (next as CourierWithLocation & { location_updated_at?: string }).location_updated_at = ts;
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime-courier-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courier_locations' },
        payload => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as { courier_id?: string };
            if (oldRow?.courier_id) {
              mergeRealtimeCourierLocation({ courier_id: oldRow.courier_id, deleted: true });
            }
          } else {
            mergeRealtimeCourierLocation((payload.new || {}) as Record<string, unknown>);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mergeRealtimeCourierLocation]);

  /** 选中骑手并勾选「跟随」后，地图中心随实时位置移动 */
  useEffect(() => {
    if (!followSelectedCourierOnMap || !selectedCourier?.id) return;
    const c = couriers.find(x => x.id === selectedCourier.id);
    if (c?.latitude == null || c?.longitude == null) return;
    const lat = Number(c.latitude);
    const lng = Number(c.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const pos = { lat, lng };
    mapRef.current?.panTo(pos);
    setMapCenter(pos);
  }, [couriers, followSelectedCourierOnMap, selectedCourier?.id]);

  const parseSettingRaw = (raw: unknown): unknown => {
    if (raw && typeof raw === 'object' && raw !== null && 'value' in raw) {
      return (raw as { value: unknown }).value;
    }
    return raw;
  };

  const loadTrackingSettings = useCallback(async () => {
    try {
      const rows = await systemSettingsService.getSettingsByKeys([...TRACKING_SETTING_KEYS]);
      const map: Record<string, unknown> = {};
      rows.forEach(r => {
        map[r.settings_key] = parseSettingRaw(r.settings_value);
      });

      const sec = Number(map['tracking.refresh_interval_seconds']);
      const clamped = Number.isFinite(sec) ? Math.min(300, Math.max(5, sec)) : 15;
      setTrackingRefreshSec(clamped);
      setNextRefreshCountdown(clamped);

      const themeRaw = String(map['tracking.map_theme'] || 'dark').toLowerCase();
      if (themeRaw === 'light' || themeRaw === 'satellite' || themeRaw === 'dark') {
        setMapThemeSetting(themeRaw as MapThemeSetting);
      } else {
        setMapThemeSetting('dark');
      }

      const rp = map['tracking.route_prediction_enabled'];
      setRoutePredictionEnabled(rp === true || rp === 'true');

      const wh = map['tracking.webhook_push_enabled'];
      setWebhookPushEnabled(wh === true || wh === 'true');
    } catch (e) {
      console.warn('加载实时跟踪系统设置失败，使用默认值', e);
    }
  }, []);

  useEffect(() => {
    void loadTrackingSettings();
  }, [loadTrackingSettings]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-tracking-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        payload => {
          const key = (payload.new as { settings_key?: string } | null)?.settings_key
            || (payload.old as { settings_key?: string } | null)?.settings_key;
          if (key?.startsWith('tracking.')) {
            void loadTrackingSettings();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTrackingSettings]);

  const loadPackagesRef = useRef(loadPackages);
  const loadCouriersRef = useRef(loadCouriers);
  const loadStoresRef = useRef(loadStores);
  loadPackagesRef.current = loadPackages;
  loadCouriersRef.current = loadCouriers;
  loadStoresRef.current = loadStores;

  /** 自动刷新：间隔与「系统设置 → 实时跟踪 → 定位刷新间隔」一致 */
  useEffect(() => {
    const intervalSec = trackingRefreshSec;

    const refreshData = async () => {
      console.log('🔄 正在自动刷新数据...');
      await Promise.all([
        loadPackagesRef.current(),
        loadCouriersRef.current(),
        loadStoresRef.current(),
      ]);
      setLastRefreshTime(new Date().toLocaleTimeString());
      setNextRefreshCountdown(intervalSec);
    };

    void refreshData();

    const countdownInterval = window.setInterval(() => {
      setNextRefreshCountdown(prev => {
        if (prev <= 1) {
          void refreshData();
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdownInterval);
  }, [trackingRefreshSec]);

  const googleMapOptions = useMemo(() => {
    const position =
      typeof window !== 'undefined' && window.google?.maps?.ControlPosition !== undefined
        ? window.google.maps.ControlPosition.TOP_RIGHT
        : 3;

    const base = {
      fullscreenControl: true,
      fullscreenControlOptions: { position },
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
    };

    if (mapThemeSetting === 'satellite') {
      return {
        ...base,
        mapTypeId: 'hybrid' as const,
        styles: undefined,
      };
    }

    if (mapThemeSetting === 'dark') {
      return {
        ...base,
        mapTypeId: 'roadmap' as const,
        styles: [...GOOGLE_MAP_DARK_STYLES] as any,
      };
    }

    return {
      ...base,
      mapTypeId: 'roadmap' as const,
      styles: [{ featureType: 'poi' as const, elementType: 'labels' as const, stylers: [{ visibility: 'off' }] }],
    };
  }, [mapThemeSetting]);

  // 自动分配包裹
  const autoAssignPackage = async (packageData: Package) => {
    // 找到在线且当前包裹最少的快递员
    const availableCouriers = couriers
      .filter(
        c =>
          c.status === 'online' ||
          c.status === 'active' ||
          c.status === 'busy',
      )
      .sort((a, b) => (a.currentPackages || 0) - (b.currentPackages || 0));

    if (availableCouriers.length === 0) {
      alert('当前没有在线的快递员，请稍后再试');
      return;
    }

    const bestCourier = availableCouriers[0];
    await assignPackageToCourier(packageData, bestCourier);
  };

  // 手动分配包裹
  const assignPackageToCourier = async (packageData: Package, courier: Courier) => {
    setIsAssigning(true);
    try {
      // 更新包裹状态为"待取件"并分配骑手
      const success = await packageService.updatePackageStatus(
        packageData.id,
        '待取件',  // 分配后状态为待取件，骑手扫码后才变为已取件
        undefined, // pickupTime - 取件时间由骑手扫码时设置
        undefined, // deliveryTime
        courier.name  // courierName
      );

      if (success) {
        // 🔔 发送通知给快递员
        const notificationSuccess = await notificationService.sendPackageAssignedNotification(
          courier.id,
          courier.name,
          packageData.id,
          {
            sender: packageData.sender_name,
            receiver: packageData.receiver_name,
            receiverAddress: packageData.receiver_address,
            deliverySpeed: packageData.delivery_speed
          }
        );

        // 显示明确的成功消息
        const successMessage = `✅ 分配成功！\n\n📦 包裹：${packageData.id}\n🚚 骑手：${courier.name}\n📲 通知：${notificationSuccess ? '已发送' : '发送失败'}\n\n包裹已从待分配列表移除`;
        alert(successMessage);
        
        setShowAssignModal(false);
        setSelectedPackage(null);
        
        notifyAdminTodosRefresh();

        // 立即重新加载包裹数据
        await loadPackages();
        
        // 验证包裹状态是否已更新
        await packageService.getPackageById(packageData.id);
        
        // 强制刷新页面数据
        setTimeout(async () => {
          await loadPackages();
          await loadCouriers();
        }, 1000);
        
        // 更新快递员的包裹数（实际应该从后端更新）
        setCouriers(prev => prev.map(c => 
          c.id === courier.id 
            ? { ...c, currentPackages: (c.currentPackages || 0) + 1 }
            : c
        ));
      } else {
        alert('❌ 分配失败！\n\n包裹状态更新失败，请重试');
      }
    } catch (error) {
      console.error('分配包裹失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert('❌ 分配失败！\n\n发生错误：' + errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  const getCourierStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10b981'; // 绿色
      case 'busy': return '#f59e0b'; // 橙色
      case 'offline': return '#6b7280'; // 灰色
      default: return '#6b7280';
    }
  };

  const getCourierStatusText = (status: string) => {
    switch (status) {
      case 'online': return '在线';
      case 'busy': return '忙碌';
      case 'offline': return '离线';
      default: return '未知';
    }
  };

  // 切换城市
  const handleCityChange = (cityKey: string) => {
    // 如果是领区用户，禁止切换城市（锁死）
    if (isRegionalUser) return;

    const validCityKey = cityKey as CityKey;
    if (validCityKey in myanmarCities) {
      setSelectedCity(validCityKey);
      const city = myanmarCities[validCityKey];
      setMapCenter({ lat: city.lat, lng: city.lng });
      // 切换城市后立即重新加载该区域的快递员数据
      setTimeout(() => loadCouriers(), 100);
    }
  };
  
  // 根据城市过滤包裹
  const filterPackagesByCity = (pkgList: Package[]) => {
    // 如果是领区用户，强制按领区前缀过滤（锁死）
    if (isRegionalUser) {
      return pkgList.filter(pkg => pkg.id.startsWith(currentRegionPrefix));
    }

    // 城市前缀映射（以曼德勒为中心）
    const cityPrefixMap: { [key: string]: string } = {
      'mandalay': 'MDY',      // 曼德勒（总部）
      'pyinoolwin': 'POL',    // 彬乌伦
      'yangon': 'YGN',        // 仰光（开发中）
      'naypyidaw': 'NPW',     // 内比都（开发中）
      'taunggyi': 'TGI',      // 东枝（开发中）
      'lashio': 'LSO',        // 腊戌（开发中）
      'muse': 'MSE'           // 木姐（开发中）
    };
    
    const prefix = cityPrefixMap[selectedCity] || 'ALL';
    
    if (prefix === 'ALL') {
      return pkgList;
    }
    
    return pkgList.filter(pkg => {
      // 检查包裹ID是否以该城市的前缀开头
      return pkg.id.startsWith(prefix);
    });
  };

  const cityFilteredPackages = useMemo(
    () => filterPackagesByCity(packages),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterPackagesByCity 依赖 selectedCity / 领区
    [packages, selectedCity, isRegionalUser, currentRegionPrefix],
  );

  const pendingPackages = useMemo(
    () => cityFilteredPackages.filter((p) => p.status === '待取件' || p.status === '待收款'),
    [cityFilteredPackages],
  );

  const assignedPackages = useMemo(
    () => cityFilteredPackages.filter((p) => p.status === '已取件' || p.status === '配送中'),
    [cityFilteredPackages],
  );

  const pendingCodStats = useMemo(() => {
    const withCod = pendingPackages.filter((p) => packageHasCod(p));
    return {
      count: withCod.length,
      total: withCod.reduce((sum, p) => sum + resolvePackageCodAmount(p), 0),
    };
  }, [pendingPackages]);

  const renderPackageCodLine = (pkg: Package, compact = false) => {
    const cod = resolvePackageCodAmount(pkg);
    if (cod <= 0) return null;
    if (compact) {
      return (
        <span className="rt-tracking__badge rt-tracking__badge--cod">
          COD {cod.toLocaleString()} MMK
        </span>
      );
    }
    return (
      <p className="rt-tracking__pkg-cod">
        <strong>COD 代收款:</strong> {cod.toLocaleString()} MMK
        {isMerchantOrderPackage(pkg) ? (
          <span className="rt-tracking__pkg-cod-note">（商家订单 · 骑手送达时向收件人收取）</span>
        ) : null}
      </p>
    );
  };

  const busyRiderCount = useMemo(
    () => couriers.filter((c) => c.status === 'busy').length,
    [couriers],
  );

  const offlineRiderCount = useMemo(
    () => couriers.filter((c) => c.status === 'offline').length,
    [couriers],
  );

  const regionLabel = isRegionalUser
    ? `${currentRegionPrefix} 专区`
    : selectedCity === 'yangon'
      ? 'YGN 仰光'
      : selectedCity === 'mandalay'
        ? 'MDY 曼德勒'
        : selectedCity === 'pyinoolwin'
          ? 'POL 彬乌伦'
          : myanmarCities[selectedCity]?.name || selectedCity;

  const refreshAll = () => {
    loadPackages();
    loadCouriers();
    loadStores();
  };

  const renderPackageIdentityBadges = (pkg: Package) => {
    const identityMatch = pkg.description?.match(
      /\[(?:下单身份|Orderer Identity|Orderer|အော်ဒါတင်သူ အမျိုးအစား|အော်ဒါတင်သူ): (.*?)\]/,
    );
    const identity = identityMatch ? identityMatch[1] : '';
    const isMerchant = identity === '商家' || identity === 'MERCHANTS';
    const isVIP = identity === 'VIP';

    return (
      <>
        {identity && (
          <span
            className={`rt-tracking__badge ${
              isMerchant ? 'rt-tracking__badge--merchant' : isVIP ? 'rt-tracking__badge--vip' : 'rt-tracking__badge--member'
            }`}
          >
            {isMerchant ? '商家' : isVIP ? 'VIP' : identity}
          </span>
        )}
        <span
          className={`rt-tracking__badge ${
            (pkg as Package & { payment_method?: string }).payment_method === 'balance'
              ? 'rt-tracking__badge--balance'
              : 'rt-tracking__badge--cash'
          }`}
        >
          跑腿费: {(pkg as Package & { payment_method?: string }).payment_method === 'balance' ? '余额' : '现金'}
        </span>
        {packageHasCod(pkg) && (
          <span className="rt-tracking__badge rt-tracking__badge--cod">
            COD {resolvePackageCodAmount(pkg).toLocaleString()} MMK
          </span>
        )}
        {isVIP &&
          (() => {
            const balanceMatch = pkg.description?.match(
              /\[(?:余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/,
            );
            if (balanceMatch?.[1]) {
              return (
                <span className="rt-tracking__badge rt-tracking__badge--balance">
                  商品费余额 {balanceMatch[1]} MMK
                </span>
              );
            }
            return null;
          })()}
      </>
    );
  };

  const focusPackageOnMap = (
    pkg: Package,
    type: 'pickup' | 'delivery',
    e?: React.MouseEvent,
  ) => {
    e?.preventDefault();
    e?.stopPropagation();
    const lat = type === 'pickup' ? pkg.sender_latitude : pkg.receiver_latitude;
    const lng = type === 'pickup' ? pkg.sender_longitude : pkg.receiver_longitude;
    if (lat == null || lng == null) return;
    const coords = { lat, lng };
    setSelectedLocationPoint({ packageId: pkg.id, type, coordinates: coords });
    setMapCenter(coords);
    setSelectedCourier(null);
  };

  return (
    <div className="rt-tracking">
      <header className="rt-tracking__toolbar">
        <div className="rt-tracking__heading">
          <h1 className="rt-tracking__title">
            {language === 'zh' ? '实时跟踪' : language === 'en' ? 'Real-time Tracking' : 'အချိန်နှင့်တစ်ပြေးညီခြေရာခံမှု'}
          </h1>
          <span className="rt-tracking__subtitle">
            {language === 'zh'
              ? `骑手 ${regionalRiderCount} · 上次刷新 ${lastRefreshTime}`
              : `Riders ${regionalRiderCount} · Updated ${lastRefreshTime}`}
          </span>
        </div>

        <div className="rt-tracking__stats">
          <span className="rt-tracking__chip rt-tracking__chip--online" title="在线">
            <span className="rt-tracking__chip-dot" aria-hidden />
            {onlineRiderCount}
          </span>
          <span className="rt-tracking__chip rt-tracking__chip--busy" title="忙碌">
            <span className="rt-tracking__chip-dot" aria-hidden />
            {busyRiderCount}
          </span>
          <span className="rt-tracking__chip rt-tracking__chip--offline" title="离线">
            <span className="rt-tracking__chip-dot" aria-hidden />
            {offlineRiderCount}
          </span>
          <span className="rt-tracking__chip rt-tracking__chip--pending">
            待分配 {pendingPackages.length}
            {pendingCodStats.count > 0
              ? ` · COD ${pendingCodStats.count}（${pendingCodStats.total.toLocaleString()} MMK）`
              : ''}
          </span>
          <span className="rt-tracking__chip rt-tracking__chip--delivering">
            配送中 {assignedPackages.length}
          </span>
        </div>

        <div className="rt-tracking__actions">
          <button
            type="button"
            className={`rt-tracking__region${isRegionalUser ? ' rt-tracking__region--locked' : ''}`}
            onClick={() => !isRegionalUser && navigate('/admin/settings')}
          >
            📍 {regionLabel}
          </button>

          <div className="rt-tracking__refresh" title={`上次更新: ${lastRefreshTime}`}>
            <div>
              <div className="rt-tracking__refresh-label">AUTO {trackingRefreshSec}s</div>
              <div className="rt-tracking__refresh-count">{nextRefreshCountdown}s</div>
            </div>
            <button
              type="button"
              className="rt-tracking__icon-btn"
              onClick={() => setNextRefreshCountdown(1)}
              aria-label="立即刷新"
            >
              🔄
            </button>
          </div>

          <button
            type="button"
            className="rt-tracking__settings-btn"
            onClick={() => navigate('/admin/settings', { state: { activeTab: 'tracking' as const } })}
          >
            ⚙️ 设置
          </button>
        </div>
      </header>

      <div className="rt-tracking__grid">
        <section className="rt-tracking__panel">
          <div className="rt-tracking__panel-head">
            <h2 className="rt-tracking__panel-title">
              <span aria-hidden>🗺️</span>
              骑手与订单位置
            </h2>
            <span className="rt-tracking__panel-meta">
              {regionLabel} · 骑手 {regionalRiderCount}
            </span>
          </div>

          {couriers.length === 0 && (
            <div className="rt-tracking__warn">
              暂无快递员数据，请前往「用户管理」添加快递员账号
            </div>
          )}

          <div className="rt-tracking__map-wrap">
            <div className="rt-tracking__map">
              {/* 城市选择器 - 仅非领区限制用户（如 admin）显示 */}
              {!isRegionalUser && (
                <div className="rt-tracking__map-city">
                  <select
                    value={selectedCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                  >
                    {Object.entries(myanmarCities).map(([key, city]) => (
                      <option key={key} value={key}>
                        📍 {city.name} ({city.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!isMapLoaded ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  textAlign: 'center',
                  padding: '2rem'
                }}>
                  {!GOOGLE_MAPS_API_KEY ? (
                    <>
                      <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', marginBottom: '1rem' }}>🚫</div>
                      <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#ef4444', fontWeight: 'bold' }}>
                        Google Maps API 密钥缺失
                      </div>
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '1rem', 
                        background: '#fff', 
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '0.9rem',
                        textAlign: 'left',
                        maxWidth: '400px'
                      }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>🔧 解决方法</h4>
                        <p style={{ margin: 0, lineHeight: 1.6 }}>
                          请在 Netlify Dashboard 的环境变量设置中，添加一个名为 <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> 的变量，并填入您有效的 Google Maps API 密钥。
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', marginBottom: '1rem' }}>🌍</div>
                      <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>地图加载中...</div>
                      {loadError && (
                        <div style={{ color: '#ef4444', marginTop: '0.5rem', background: '#fffbeB', padding: '0.5rem', borderRadius: '4px' }}>
                          加载错误: {loadError.message}
                          {loadError.message && loadError.message.includes('API key') && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                              请检查 Netlify Dashboard 中的环境变量配置：REACT_APP_GOOGLE_MAPS_API_KEY
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <GoogleMap
                  key={`${selectedCity}-${mapThemeSetting}-${selectedLocationPoint?.coordinates.lat || 'default'}`}
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={13}
                  options={googleMapOptions}
                  onLoad={map => {
                    mapRef.current = map;
                  }}
                >
                  {/* 显示快递员位置 */}
                  {couriers
                    .filter(courier => courier.latitude != null && courier.longitude != null)
                    .map(courier => {
                      const isAbnormal = abnormalCouriers.some(ac => ac.id === courier.id);
                      return (
                        <Marker
                          key={`courier-${courier.id}-${String(courier.latitude)}-${String(courier.longitude)}`}
                          position={{ lat: courier.latitude!, lng: courier.longitude! }}
                          icon={{
                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="18" fill="${isAbnormal ? '#ef4444' : getCourierStatusColor(courier.status)}" stroke="${isAbnormal ? '#fee2e2' : 'white'}" stroke-width="3"/>
                                ${isAbnormal ? '<circle cx="32" cy="8" r="8" fill="#ef4444" stroke="white" stroke-width="2"/><text x="32" y="11" text-anchor="middle" fill="white" font-size="10" font-weight="bold">!</text>' : ''}
                                <text x="20" y="26" text-anchor="middle" fill="white" font-size="20" font-weight="bold">🏍️</text>
                              </svg>
                            `)}`,
                            scaledSize: new window.google.maps.Size(40, 40),
                            anchor: new window.google.maps.Point(20, 20)
                          }}
                          onClick={() => {
                            setFollowSelectedCourierOnMap(false);
                            setSelectedCourier(courier);
                          }}
                        />
                      );
                    })}

                  {/* 显示快递店位置及围栏 */}
                  {stores
                    .filter(store => store.latitude && store.longitude)
                    .map(store => (
                      <React.Fragment key={`store-group-${store.id}`}>
                        <Marker
                          key={`store-${store.id}`}
                          position={{ lat: store.latitude!, lng: store.longitude! }}
                          icon={{
                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="18" fill="${store.status === 'active' ? '#10b981' : '#f59e0b'}" stroke="white" stroke-width="3"/>
                                <text x="20" y="26" text-anchor="middle" fill="white" font-size="20" font-weight="bold">🏪</text>
                              </svg>
                            `)}`,
                            scaledSize: new window.google.maps.Size(40, 40),
                            anchor: new window.google.maps.Point(20, 20)
                          }}
                        />
                        <Circle
                          center={{ lat: store.latitude!, lng: store.longitude! }}
                          radius={1000} // 1公里围栏
                          options={{
                            fillColor: store.status === 'active' ? '#10b981' : '#f59e0b',
                            fillOpacity: 0.1,
                            strokeColor: store.status === 'active' ? '#10b981' : '#f59e0b',
                            strokeOpacity: 0.3,
                            strokeWeight: 1,
                            clickable: false
                          }}
                        />
                      </React.Fragment>
                    ))}

                  {/* 显示未分配包裹的取件点(P)和配送点(D) */}
                  {getUnassignedPackages().map(pkg => {
                    const markers = [];
                    
                    // P点（取件点）- 寄件地址
                    if (pkg.sender_latitude && pkg.sender_longitude) {
                      markers.push({
                        id: `pickup-${pkg.id}`,
                        position: { lat: pkg.sender_latitude, lng: pkg.sender_longitude },
                        type: 'pickup' as const,
                        pkg: pkg
                      });
                    }
                    
                    // D点（送达点）- 收件地址
                    if (pkg.receiver_latitude && pkg.receiver_longitude) {
                      markers.push({
                        id: `delivery-${pkg.id}`,
                        position: { lat: pkg.receiver_latitude, lng: pkg.receiver_longitude },
                        type: 'delivery' as const,
                        pkg: pkg
                      });
                    }
                    
                    return markers.map(marker => (
                      <Marker
                        key={marker.id}
                        position={marker.position}
                        icon={{
                          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="20" cy="20" r="18" fill="${marker.type === 'pickup' ? '#3b82f6' : '#ef4444'}" stroke="white" stroke-width="2"/>
                              <text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-weight="bold">${marker.type === 'pickup' ? 'P' : 'D'}</text>
                            </svg>
                          `)}`,
                          scaledSize: new window.google.maps.Size(40, 40),
                          anchor: new window.google.maps.Point(20, 20)
                        }}
                        zIndex={500}
                        onClick={() => {
                          setSelectedLocationPoint({
                            packageId: marker.pkg.id,
                            type: marker.type,
                            coordinates: marker.position
                          });
                        }}
                      />
                    ));
                  }).flat()}

                  {/* 显示选中的包裹位置点（高亮显示） */}
                  {selectedLocationPoint && (
                    <Marker
                      position={selectedLocationPoint.coordinates}
                      icon={{
                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="24" cy="24" r="20" fill="${selectedLocationPoint.type === 'pickup' ? '#3b82f6' : '#ef4444'}" stroke="white" stroke-width="3"/>
                            <text x="24" y="31" text-anchor="middle" fill="white" font-size="24" font-weight="bold">${selectedLocationPoint.type === 'pickup' ? 'P' : 'D'}</text>
                          </svg>
                        `)}`,
                        scaledSize: new window.google.maps.Size(48, 48),
                        anchor: new window.google.maps.Point(24, 24)
                      }}
                      zIndex={1000}
                    />
                  )}
                  {selectedLocationPoint && (
                    <InfoWindow
                      position={selectedLocationPoint.coordinates}
                      onCloseClick={() => setSelectedLocationPoint(null)}
                    >
                      <div style={{ padding: '0.5rem', minWidth: '200px' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                          {selectedLocationPoint.type === 'pickup' ? '📍 取件点 (P)' : '📍 配送点 (D)'}
                        </h3>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                            <strong>包裹ID:</strong> {selectedLocationPoint.packageId}
                          </p>
                          {(() => {
                            const pkg = packages.find(p => p.id === selectedLocationPoint.packageId);
                            if (pkg) {
                              return (
                                <>
                                  <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                                    <strong>寄件人:</strong> {pkg.sender_name}
                                  </p>
                                  <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                                    <strong>收件人:</strong> {pkg.receiver_name}
                                  </p>
                                  <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                                    <strong>地址:</strong> {selectedLocationPoint.type === 'pickup' ? pkg.sender_address : pkg.receiver_address}
                                  </p>
                                  <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                                    <strong>状态:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>待分配</span>
                                  </p>
                                  {packageHasCod(pkg) && (
                                    <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#b45309', fontWeight: 700 }}>
                                      <strong>COD 代收款:</strong>{' '}
                                      {resolvePackageCodAmount(pkg).toLocaleString()} MMK
                                    </p>
                                  )}
                                </>
                              );
                            }
                            return null;
                          })()}
                          <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                            <strong>坐标:</strong> {selectedLocationPoint.coordinates.lat.toFixed(6)}, {selectedLocationPoint.coordinates.lng.toFixed(6)}
                          </p>
                          <button
                            onClick={() => navigate('/admin/city-packages', { state: { search: selectedLocationPoint.packageId } })}
                            style={{
                              marginTop: '0.8rem',
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            查看订单详情 ➔
                          </button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}

                  {/* 信息窗口 */}
                  {selectedCourier && selectedCourier.latitude && selectedCourier.longitude && (
                    <InfoWindow
                      position={{ lat: selectedCourier.latitude, lng: selectedCourier.longitude }}
                      onCloseClick={() => {
                        setSelectedCourier(null);
                        setFollowSelectedCourierOnMap(false);
                      }}
                    >
                      <div style={{ padding: '0.5rem', minWidth: '250px' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                          {selectedCourier.name}
                        </h3>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                            <strong>📍 GPS:</strong>{' '}
                            {Number(selectedCourier.latitude).toFixed(6)}, {Number(selectedCourier.longitude).toFixed(6)}
                          </p>
                          {(selectedCourier as CourierWithLocation & { location_updated_at?: string }).location_updated_at && (
                            <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                              <strong>🕐 上报时间:</strong>{' '}
                              {new Date(
                                (selectedCourier as CourierWithLocation & { location_updated_at?: string }).location_updated_at!
                              ).toLocaleString()}
                            </p>
                          )}
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              marginTop: '0.5rem',
                              fontSize: '0.85rem',
                              color: '#1e3a8a',
                              fontWeight: 700,
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={followSelectedCourierOnMap}
                              onChange={e => setFollowSelectedCourierOnMap(e.target.checked)}
                            />
                            地图居中跟随此骑手（实时）
                          </label>
                          <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                            <strong>📱 电话:</strong> 
                            <a 
                              href={`tel:${selectedCourier.phone}`}
                              style={{ 
                                color: '#3b82f6', 
                                textDecoration: 'none', 
                                fontWeight: 'bold',
                                marginLeft: '0.5rem',
                                padding: '2px 6px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '4px'
                              }}
                            >
                              {selectedCourier.phone} 📞 拨打
                            </a>
                          </p>
                          {selectedCourier.email && (
                            <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                              <strong>📧 邮箱:</strong> {selectedCourier.email}
                            </p>
                          )}
                          {selectedCourier.vehicle_type && (
                            <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                              <strong>🏍️ 车辆:</strong> {selectedCourier.vehicle_type}
                            </p>
                          )}
                          {selectedCourier.license_number && (
                            <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                              <strong>🪪 车牌:</strong> {selectedCourier.license_number}
                            </p>
                          )}
                        </div>
                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                          <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}>
                            <strong>📦 当前包裹:</strong> <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{selectedCourier.currentPackages || 0}</span>
                          </p>
                          <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}>
                            <strong>✅ 总完成:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>{selectedCourier.todayDeliveries || 0}</span>
                          </p>
                          {selectedCourier.rating !== undefined && (
                            <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}>
                              <strong>⭐ 评分:</strong> <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{selectedCourier.rating.toFixed(1)}</span>
                            </p>
                          )}
                          <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}>
                            <strong>🔋 电量:</strong> <span style={{ color: selectedCourier.batteryLevel && selectedCourier.batteryLevel < 30 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{selectedCourier.batteryLevel || 0}%</span>
                          </p>
                          <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}>
                            <strong>📶 信号:</strong> <span style={{ 
                              color: !selectedCourier.signal_strength || selectedCourier.signal_strength < 30 ? '#ef4444' : (selectedCourier.signal_strength < 60 ? '#f59e0b' : '#10b981'), 
                              fontWeight: 'bold' 
                            }}>
                              {selectedCourier.signal_strength || 0}%
                            </span>
                          </p>
                        </div>
                        <div style={{ 
                          marginTop: '0.8rem',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.5rem'
                        }}>
                          <div style={{ 
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            background: getCourierStatusColor(selectedCourier.status),
                            color: 'white',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            fontSize: '0.85rem'
                          }}>
                            {getCourierStatusText(selectedCourier.status)}
                          </div>
                          <button
                            onClick={() => navigate('/admin/users', { state: { search: selectedCourier.name } })}
                            style={{
                              padding: '0.4rem 0.8rem',
                              borderRadius: '6px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            账号管理 ➔
                          </button>
                        </div>
                        {(abnormalCouriers.some(ac => ac.id === selectedCourier.id)) && (
                          <div style={{ 
                            marginTop: '0.5rem', 
                            padding: '0.5rem', 
                            background: '#fef2f2', 
                            border: '1px solid #fecaca', 
                            borderRadius: '6px',
                            color: '#991b1b',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            textAlign: 'center'
                          }}>
                            ⚠️ 注意：该骑手已停留超过 30 分钟！
                          </div>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>
          </div>
        </section>

        <section className="rt-tracking__panel rt-tracking__sidebar">
          <div className="rt-tracking__tabs">
            <button
              type="button"
              className={`rt-tracking__tab${sidebarTab === 'pending' ? ' rt-tracking__tab--active-pending' : ''}`}
              onClick={() => setSidebarTab('pending')}
            >
              ⏳ 待分配 ({pendingPackages.length}
              {pendingCodStats.count > 0 ? ` · COD ${pendingCodStats.count}` : ''})
            </button>
            <button
              type="button"
              className={`rt-tracking__tab${sidebarTab === 'assigned' ? ' rt-tracking__tab--active-assigned' : ''}`}
              onClick={() => setSidebarTab('assigned')}
            >
              🚚 配送中 ({assignedPackages.length})
            </button>
          </div>

          <div className="rt-tracking__list">
            <div className="rt-tracking__list-toolbar">
              <button type="button" className="rt-tracking__list-refresh" onClick={refreshAll}>
                🔄 刷新列表
              </button>
            </div>

            {sidebarTab === 'pending' ? (
              pendingPackages.length === 0 ? (
                <div className="rt-tracking__empty">
                  <div className="rt-tracking__empty-icon">✅</div>
                  <p>当前没有待分配包裹</p>
                </div>
              ) : (
                pendingPackages.map((pkg) => {
                  const isLocked =
                    !!pkg.courier && pkg.courier !== '未分配' && pkg.courier !== '待分配';
                  return (
                    <article
                      key={pkg.id}
                      className={`rt-tracking__pkg rt-tracking__pkg--pending${
                        isLocked ? ' rt-tracking__pkg--locked' : ''
                      }`}
                    >
                      <div className="rt-tracking__pkg-head">
                        <span className="rt-tracking__pkg-id">{pkg.id}</span>
                        <div className="rt-tracking__badges">{renderPackageIdentityBadges(pkg)}</div>
                      </div>
                      <div className="rt-tracking__pkg-body">
                        <p>
                          从 {pkg.sender_address}
                          {pkg.sender_latitude != null && pkg.sender_longitude != null && (
                            <span
                              className="rt-tracking__coord rt-tracking__coord--pickup"
                              onClick={(e) => focusPackageOnMap(pkg, 'pickup', e)}
                            >
                              定位
                            </span>
                          )}
                        </p>
                        <p>
                          到 {pkg.receiver_address}
                          {pkg.receiver_latitude != null && pkg.receiver_longitude != null && (
                            <span
                              className="rt-tracking__coord rt-tracking__coord--delivery"
                              onClick={(e) => focusPackageOnMap(pkg, 'delivery', e)}
                            >
                              定位
                            </span>
                          )}
                        </p>
                        <p>
                          {pkg.package_type} · {pkg.weight}
                          {pkg.delivery_distance ? ` · ${pkg.delivery_distance} km` : ''}
                        </p>
                        <p>
                          <strong>配送选项:</strong> {adminDeliveryOptionLine(pkg)}
                        </p>
                        {pkg.price && <p>跑腿费 {pkg.price}</p>}
                        {renderPackageCodLine(pkg)}
                      </div>
                      <div className="rt-tracking__pkg-actions">
                        {isLocked ? (
                          <div className="rt-tracking__assigned-banner">已分配给 {pkg.courier}</div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={`rt-tracking__btn rt-tracking__btn--auto${
                                isAssigning ? ' rt-tracking__btn--disabled' : ''
                              }`}
                              disabled={isAssigning}
                              onClick={() => autoAssignPackage(pkg)}
                            >
                              {isAssigning ? '分配中…' : '自动分配'}
                            </button>
                            <button
                              type="button"
                              className="rt-tracking__btn rt-tracking__btn--manual"
                              onClick={() => {
                                setSelectedPackage(pkg);
                                setShowAssignModal(true);
                              }}
                            >
                              手动分配
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })
              )
            ) : assignedPackages.length === 0 ? (
              <div className="rt-tracking__empty">
                <div className="rt-tracking__empty-icon">📦</div>
                <p>暂无配送中包裹</p>
              </div>
            ) : (
              assignedPackages.map((pkg) => (
                <article key={pkg.id} className="rt-tracking__pkg rt-tracking__pkg--assigned">
                  <div className="rt-tracking__pkg-head">
                    <span className="rt-tracking__pkg-id">{pkg.id}</span>
                    <div className="rt-tracking__badges">
                      {renderPackageIdentityBadges(pkg)}
                      <span className="rt-tracking__badge rt-tracking__badge--status">
                        {pkg.status === '待收款' ? '待取件' : pkg.status}
                      </span>
                    </div>
                  </div>
                  <div className="rt-tracking__pkg-body">
                    <p>
                      {pkg.sender_name} → {pkg.receiver_name}
                    </p>
                    <p>
                      到 {pkg.receiver_address}
                      {pkg.receiver_latitude != null && pkg.receiver_longitude != null && (
                        <span
                          className="rt-tracking__coord rt-tracking__coord--delivery"
                          onClick={(e) => focusPackageOnMap(pkg, 'delivery', e)}
                        >
                          定位
                        </span>
                      )}
                    </p>
                    <p>
                      骑手 <strong>{pkg.courier || '未分配'}</strong>
                      {pkg.pickup_time ? ` · 取件 ${pkg.pickup_time}` : ''}
                    </p>
                    <p>
                      <strong>配送选项:</strong> {adminDeliveryOptionLine(pkg)}
                      {pkg.price ? ` · 跑腿费 ${pkg.price}` : ''}
                    </p>
                    {renderPackageCodLine(pkg)}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 手动分配模态框 */}
      {showAssignModal && selectedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>
              选择快递员 - {selectedPackage.id}
            </h2>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
              <p style={{ margin: '0.3rem 0' }}><strong>寄件地址:</strong> {selectedPackage.sender_address}</p>
              <p style={{ margin: '0.3rem 0' }}><strong>收件地址:</strong> {selectedPackage.receiver_address}</p>
              {packageHasCod(selectedPackage) && (
                <p style={{ margin: '0.5rem 0 0', color: '#b45309', fontWeight: 700 }}>
                  <strong>COD 代收款:</strong> {resolvePackageCodAmount(selectedPackage).toLocaleString()} MMK
                  {isMerchantOrderPackage(selectedPackage) ? '（商家订单）' : ''}
                </p>
              )}
            </div>

            {getRecommendedCouriers(selectedPackage)
              .map((courier, index) => (
                <div
                  key={courier.id}
                  style={{
                    background: index === 0 ? '#eff6ff' : (courier.status === 'online' ? '#f0fdf4' : '#fef3c7'),
                    border: `2px solid ${index === 0 ? '#3b82f6' : (courier.status === 'online' ? '#86efac' : '#fde68a')}`,
                    padding: '1rem',
                    borderRadius: '10px',
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onClick={() => assignPackageToCourier(selectedPackage, courier)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {index === 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-10px',
                      left: '20px',
                      background: '#3b82f6',
                      color: 'white',
                      padding: '2px 10px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      ✨ 智能推荐 (最近/最闲)
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0 }}>{courier.name}</h3>
                        <span style={{ 
                          background: 'rgba(59, 130, 246, 0.1)', 
                          color: '#3b82f6', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          📍 距离: {(courier as any).distance?.toFixed(2)} km
                        </span>
                      </div>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                        📱 <a href={`tel:${courier.phone}`} onClick={(e) => e.stopPropagation()} style={{ color: '#3b82f6', textDecoration: 'none' }}>{courier.phone}</a>
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#3b82f6', fontWeight: 'bold' }}>
                          📦 当前: {courier.currentPackages || 0}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>
                          ✅ 总计: {courier.todayDeliveries || 0}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      background: getCourierStatusColor(courier.status),
                      color: 'white',
                      fontWeight: 'bold',
                      marginLeft: '1rem',
                      whiteSpace: 'nowrap'
                    }}>
                      {getCourierStatusText(courier.status)}
                    </div>
                  </div>
                </div>
              ))}

            <button
              onClick={() => {
                setShowAssignModal(false);
                setSelectedPackage(null);
              }}
              style={{
                width: '100%',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginTop: '1rem'
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 🚨 新增：异常监控警报浮窗 */}
      {showAbnormalAlert && (abnormalPackages.length > 0 || abnormalCouriers.length > 0 || lowBatteryRiders.length > 0) && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '380px',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          zIndex: 2000,
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderLeft: '6px solid #f97316', // 🚀 橙色警报
          animation: 'slideUp 0.5s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              🚨 实时监控异常预警
            </h3>
            <button 
              onClick={() => setShowAbnormalAlert(false)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', width: '28px', height: '28px', borderRadius: '50%' }}
            >✕</button>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* 🔋 骑手电量监控 */}
            {lowBatteryRiders.length > 0 && (
              <div>
                <div style={{ color: '#f97316', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  🔋 骑手电量不足 (低于 10%)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lowBatteryRiders.map(courier => (
                    <div key={courier.id} style={{ 
                      background: 'rgba(249, 115, 22, 0.1)', 
                      padding: '12px', 
                      borderRadius: '10px',
                      border: '1px solid rgba(249, 115, 22, 0.2)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (courier.latitude && courier.longitude) {
                        setMapCenter({ lat: courier.latitude, lng: courier.longitude });
                        setSelectedCourier(courier);
                      }
                    }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold', color: '#f97316' }}>{courier.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'white', background: '#f97316', padding: '1px 6px', borderRadius: '4px' }}>
                          电量: {courier.batteryLevel}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                        📦 正在配送: {courier.currentPackages} 件 | 📱 {courier.phone}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 异常停留骑手 */}
            {abnormalCouriers.length > 0 && (
              <div>
                <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ⏳ 异常停留骑手 ({abnormalCouriers.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {abnormalCouriers.map(courier => (
                    <div key={courier.id} style={{ 
                      background: 'rgba(251, 191, 36, 0.1)', 
                      padding: '12px', 
                      borderRadius: '10px',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (courier.latitude && courier.longitude) {
                        setMapCenter({ lat: courier.latitude, lng: courier.longitude });
                        setSelectedCourier(courier);
                      }
                    }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{courier.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#fef3c7', background: '#d97706', padding: '1px 6px', borderRadius: '4px' }}>
                          停留 &gt; 30min
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                        📦 持有包裹: {courier.currentPackages} | 📱 {courier.phone}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 超时包裹 */}
            {abnormalPackages.length > 0 && (
              <div>
                <div style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📦 超时未更新包裹 ({abnormalPackages.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {abnormalPackages.map(pkg => (
                    <div key={pkg.id} style={{ 
                      background: 'rgba(248, 113, 113, 0.1)', 
                      padding: '12px', 
                      borderRadius: '10px',
                      border: '1px solid rgba(248, 113, 113, 0.2)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (pkg.receiver_latitude && pkg.receiver_longitude) {
                        setMapCenter({ lat: pkg.receiver_latitude, lng: pkg.receiver_longitude });
                      }
                    }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold', color: '#f87171' }}>{pkg.id}</span>
                        <span style={{ fontSize: '0.75rem', color: '#fee2e2', background: '#dc2626', padding: '1px 6px', borderRadius: '4px' }}>
                          超时 &gt; 2h
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                        🛵 骑手: {pkg.courier}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              点击条目可在地图上快速定位
            </p>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />
    </div>
  );
};

// 添加全局样式来调整Google Maps全屏按钮位置
const style = document.createElement('style');
style.innerHTML = `
  /* 调整Google Maps全屏控制按钮位置 */
  .gm-fullscreen-control {
    top: 50px !important;
    right: 10px !important;
  }
  
  /* 确保其他控制按钮也有适当的间距 */
  .gm-svpc {
    top: 100px !important;
  }
`;
if (!document.head.querySelector('style[data-realtime-tracking-styles]')) {
  style.setAttribute('data-realtime-tracking-styles', 'true');
  document.head.appendChild(style);
}

export default RealTimeTracking;

