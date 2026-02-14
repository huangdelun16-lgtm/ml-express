import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorHandler } from '../services/errorHandler';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { packageService, Package, supabase, CourierLocation, notificationService, deliveryStoreService, DeliveryStore, adminAccountService, auditLogService } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';
import { useLanguage } from '../contexts/LanguageContext';
import { Courier, CourierWithLocation, Coordinates } from '../types';

// Google Maps 配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Google Maps API Key 未配置！请检查环境变量 REACT_APP_GOOGLE_MAPS_API_KEY');
}
const GOOGLE_MAPS_LIBRARIES: any = ['places'];

// 配送商店接口已在types/index.ts中定义

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
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [abnormalPackages, setAbnormalPackages] = useState<Package[]>([]); // 🚨 新增：异常包裹状态
  const [abnormalCouriers, setAbnormalCouriers] = useState<CourierWithLocation[]>([]); // 🚨 新增：异常骑手状态
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
  const [activeTab, setActiveTab] = useState<'packages' | 'stores'>('packages');
  const [stores, setStores] = useState<DeliveryStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  
  // 包裹位置点显示状态
  const [selectedLocationPoint, setSelectedLocationPoint] = useState<{
    packageId: string;
    type: 'pickup' | 'delivery';
    coordinates: Coordinates;
  } | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString()); // 🚀 新增：最后刷新时间
  const [nextRefreshCountdown, setNextRefreshCountdown] = useState<number>(60); // 🚀 新增：倒计时

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

  // 加载包裹数据
  useEffect(() => {
    const refreshData = async () => {
      console.log('🔄 正在自动刷新数据...');
      await Promise.all([
        loadPackages(),
        loadCouriers(),
        loadStores()
      ]);
      setLastRefreshTime(new Date().toLocaleTimeString());
      setNextRefreshCountdown(60);
    };

    refreshData();
    
    // 🚀 倒计时逻辑
    const countdownInterval = setInterval(() => {
      setNextRefreshCountdown(prev => {
        if (prev <= 1) {
          refreshData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

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

      // 如果发现了新的异常（包裹或骑手），触发警报
      if (abnormalPkgs.length > abnormalPackages.length || abnormalRiders.length > abnormalCouriers.length) {
        if (soundEnabledRef.current && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error('播放警报音失败:', e));
        }

        if (Notification.permission === 'granted') {
          new Notification('⚠️ 实时监控异常警报', {
            body: `发现 ${abnormalPkgs.length} 个异常包裹和 ${abnormalRiders.length} 个异常停留骑手！`,
            icon: '/favicon.ico',
            tag: 'abnormal-alert'
          });
        }
        setShowAbnormalAlert(true);
      }

      setAbnormalPackages(abnormalPkgs);
      setAbnormalCouriers(abnormalRiders as any);
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
          const courierRt = couriersData.find(c => c.employee_id === acc.employee_id || c.phone === acc.phone);
          // 在 courier_locations 表中查找位置
          const location = locationsData?.find(loc => loc.courier_id === (courierRt?.id || acc.id));
          
          const currentPackages = packageCounts[acc.employee_name] || 0;

          // 确定在线状态逻辑
          const lastActiveStr = courierRt?.last_active || acc.last_login;
          let displayStatus: Courier['status'] = 'offline';
          
          if (acc.status === 'active') {
            // 比较 couriers 表的最后活跃时间和 admin_accounts 的最后登录时间，取最近的一个
            const rtActiveTime = courierRt?.last_active ? new Date(courierRt.last_active).getTime() : 0;
            const loginActiveTime = acc.last_login ? new Date(acc.last_login).getTime() : 0;
            const mostRecentActiveTime = Math.max(rtActiveTime, loginActiveTime);

            if (mostRecentActiveTime > 0) {
              const now = Date.now();
              const diffMinutes = (now - mostRecentActiveTime) / (1000 * 60);
              
              // 30分钟内有活动视为在线
              if (diffMinutes < 30) {
                displayStatus = (currentPackages >= 5 ? 'busy' : 'online') as Courier['status'];
              }
            }
          }

          return {
            id: courierRt?.id || acc.id,
            name: acc.employee_name,
            phone: acc.phone,
            employee_id: acc.employee_id,
            // 使用位置信息，如果没有则使用该城市中心点的随机偏移
            latitude: location?.latitude || (myanmarCities[selectedCity].lat + (Math.random() - 0.5) * 0.02),
            longitude: location?.longitude || (myanmarCities[selectedCity].lng + (Math.random() - 0.5) * 0.02),
            status: displayStatus,
            currentPackages: currentPackages,
            todayDeliveries: courierRt?.total_deliveries || 0,
            batteryLevel: location?.battery_level || 100,
            vehicle_type: acc.position === '骑手队长' ? 'car' : 'motorcycle',
            location_updated_at: location?.updated_at || courierRt?.last_active || acc.last_login
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

  // 自动分配包裹
  const autoAssignPackage = async (packageData: Package) => {
    // 找到在线且当前包裹最少的快递员
    const availableCouriers = couriers
      .filter(c => c.status === 'online' || c.status === 'active')
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: '2rem'
    }}>
      {/* 顶部导航 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '15px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/admin')}
            style={{
              background: '#6366f1',
              color: 'white',
              border: 'none',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            ← 返回后台
          </button>
          <h1 style={{ margin: 0, color: '#1f2937', fontSize: '1.8rem' }}>
            📍 实时跟踪管理
          </h1>
          
          {/* 🚀 自动刷新状态指示器 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(59, 130, 246, 0.1)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            marginLeft: '1rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: '600' }}>
              自动刷新中: {nextRefreshCountdown}s
            </span>
            <button 
              onClick={() => {
                setNextRefreshCountdown(1); // 触发下一秒刷新
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="立即刷新"
            >
              <span style={{ fontSize: '1rem' }}>🔄</span>
            </button>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
              上次更新: {lastRefreshTime}
            </span>
          </div>
          
          {/* 声音开关按钮 */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: soundEnabled ? '#10b981' : '#9ca3af',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginLeft: '1rem',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            title={soundEnabled ? "点击关闭新订单提示音" : "点击开启新订单提示音"}
          >
            {soundEnabled ? '🔔 提示音: 开' : '🔕 提示音: 关'}
          </button>
          
          {/* 隐藏的音频元素 - 使用清脆的提示音效 */}
          <audio 
            ref={audioRef} 
            src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
            preload="auto"
          />
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '0.8rem', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.8)',
          padding: '0.6rem 1rem',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e5e7eb'
        }}>
          {/* 区域按钮 */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: isRegionalUser ? 'default' : 'pointer'
          }}>
            <span>📍 {isRegionalUser ? `${currentRegionPrefix} 专区` : myanmarCities[selectedCity].name}</span>
          </div>

          <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 0.5rem' }} />

          {/* 骑手统计 */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', border: '1px solid #b9f6ca' }}>
              🟢 在线: {onlineRiderCount}
            </div>
            <div style={{ background: '#fffbeb', color: '#92400e', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', border: '1px solid #fde68a' }}>
              🟠 忙碌: {couriers.filter(c => c.status === 'busy').length}
            </div>
            <div style={{ background: '#f3f4f6', color: '#374151', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', border: '1px solid #d1d5db' }}>
              ⚪ 离线: {couriers.filter(c => c.status === 'offline').length}
            </div>
          </div>

          <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 0.5rem' }} />

          {/* 包裹统计 */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', border: '1px solid #fecaca' }}>
              ⏳ 待分配: {filterPackagesByCity(packages).filter(p => p.status === '待取件' || p.status === '待收款').length}
            </div>
            <div style={{ background: '#eff6ff', color: '#1e40af', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', border: '1px solid #bfdbfe' }}>
              🚚 配送中: {filterPackagesByCity(packages).filter(p => p.status === '已取件' || p.status === '配送中').length}
            </div>
          </div>

          {/* 刷新倒计时 */}
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#f8fafc',
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>自动刷新: {nextRefreshCountdown}s</span>
            <button 
              onClick={() => setNextRefreshCountdown(1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}
              title={`上次更新: ${lastRefreshTime}`}
            >🔄</button>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', borderLeft: '1px solid #e2e8f0', paddingLeft: '0.5rem' }}>{lastRefreshTime}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* 左侧：地图 */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '1.5rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: '#1f2937' }}>🗺️ 快递员实时位置</h2>
            <div style={{ 
              background: '#ecfdf5', 
              border: '1px solid #86efac', 
              borderRadius: '6px', 
              padding: '0.5rem 1rem', 
              fontSize: '0.8rem',
              color: '#065f46',
              fontWeight: 'bold'
            }}>
              ✅ {isRegionalUser ? currentRegionPrefix : (selectedCity === 'yangon' ? 'YGN' : (selectedCity === 'mandalay' ? 'MDY' : (selectedCity === 'pyinoolwin' ? 'POL' : '')))} 骑手账号: {regionalRiderCount}
            </div>
          </div>
          
          {couriers.length === 0 && (
            <div style={{ 
              background: '#fef3c7', 
              border: '1px solid #fde68a', 
              borderRadius: '8px', 
              padding: '1rem', 
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>⚠️ 暂无快递员数据</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f' }}>
                请前往 <strong>「快递员管理」</strong> 页面添加快递员，或从账号系统导入骑手账号
              </p>
            </div>
          )}
          
          <div style={{ 
            width: '100%', 
            height: '600px', 
            borderRadius: '10px', 
            overflow: 'hidden',
            border: '2px solid #e5e7eb',
            position: 'relative'
          }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
              {/* 城市选择器 - 仅非领区限制用户（如 admin）显示 */}
              {!isRegionalUser && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  zIndex: 1000,
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  padding: '8px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <select
                    value={selectedCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '2px solid #e5e7eb',
                      background: 'white',
                      color: '#1f2937',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      minWidth: '150px',
                      outline: 'none'
                    }}
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
                  key={`${selectedCity}-${selectedLocationPoint?.coordinates.lat || 'default'}`}
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={13}
                  options={{
                    fullscreenControl: true,
                    fullscreenControlOptions: {
                      position: window.google.maps.ControlPosition.TOP_RIGHT
                    },
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    styles: [
                      {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                      }
                    ]
                  }}
                >
                  {/* 显示快递员位置 */}
                  {couriers
                    .filter(courier => courier.latitude != null && courier.longitude != null)
                    .map(courier => {
                      const isAbnormal = abnormalCouriers.some(ac => ac.id === courier.id);
                      return (
                        <Marker
                          key={courier.id}
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
                          onClick={() => setSelectedCourier(courier)}
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
                      onCloseClick={() => setSelectedCourier(null)}
                    >
                      <div style={{ padding: '0.5rem', minWidth: '250px' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                          {selectedCourier.name}
                        </h3>
                        <div style={{ marginBottom: '0.5rem' }}>
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
        </div>

        {/* 右侧：包裹管理 */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '1.5rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          maxHeight: '700px',
          overflow: 'auto'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setActiveTab('packages')}
                style={{
                  background: activeTab === 'packages' 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                    : 'transparent',
                  color: activeTab === 'packages' ? 'white' : '#6b7280',
                  border: '2px solid',
                  borderColor: activeTab === 'packages' ? '#3b82f6' : '#e5e7eb',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📦 包裹管理
              </button>
              <button
                onClick={() => setActiveTab('stores')}
                style={{
                  background: activeTab === 'stores' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    : 'transparent',
                  color: activeTab === 'stores' ? 'white' : '#6b7280',
                  border: '2px solid',
                  borderColor: activeTab === 'stores' ? '#10b981' : '#e5e7eb',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🏪 合伙店铺
              </button>
            </div>
          </div>
          
          {/* 根据选项卡显示不同内容 */}
          {activeTab === 'packages' ? (
            <>
              {/* 待分配包裹 */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: '#dc2626', margin: 0, fontSize: '1.1rem' }}>
                    ⏳ 待分配包裹 ({filterPackagesByCity(packages).filter(p => p.status === '待取件' || p.status === '待收款').length})
                  </h3>
                  <button
                    onClick={() => {
                      loadPackages();
                      loadCouriers();
                      loadStores();
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#2563eb',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                  >
                    🔄 刷新
                  </button>
                </div>

          {filterPackagesByCity(packages).filter(p => p.status === '待取件' || p.status === '待收款').length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <p>当前没有待分配的包裹</p>
            </div>
          ) : (
            filterPackagesByCity(packages)
              .filter(p => p.status === '待取件' || p.status === '待收款')
              .map(pkg => (
                <div
                  key={pkg.id}
                  style={{
                    background: pkg.courier && pkg.courier !== '未分配' && pkg.courier !== '待分配'
                      ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                      : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    padding: '1rem',
                    borderRadius: '10px',
                    marginBottom: '1rem',
                    border: pkg.courier && pkg.courier !== '未分配' && pkg.courier !== '待分配'
                      ? '2px solid #22c55e'
                      : '2px solid #bae6fd',
                    opacity: pkg.courier && pkg.courier !== '未分配' && pkg.courier !== '待分配' ? 0.9 : 1
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <strong style={{ color: '#0369a1' }}>{pkg.id}</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* 下单身份标识 */}
                      {(() => {
                        const identityMatch = pkg.description?.match(/\[(?:下单身份|Orderer Identity|အော်ဒါတင်သူ အမျိုးအစား): (.*?)\]/);
                        if (identityMatch && identityMatch[1]) {
                          const identity = identityMatch[1];
                          const isMERCHANTS = identity === '商家' || identity === 'MERCHANTS';
                          const isVIP = identity === 'VIP';
                          return (
                            <span style={{
                              background: isMERCHANTS ? '#dbeafe' : (isVIP ? '#fef3c7' : '#f3f4f6'),
                              color: isMERCHANTS ? '#1e40af' : (isVIP ? '#92400e' : '#6b7280'),
                              padding: '0.2rem 0.6rem',
                              borderRadius: '5px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              border: `1px solid ${isMERCHANTS ? '#bfdbfe' : (isVIP ? '#fde68a' : '#e5e7eb')}`
                            }}>
                              👤 {identity}
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {/* 支付方式标识 */}
                      {(pkg as any).payment_method === 'cash' && (
                        <span style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '5px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          💵 现金
                        </span>
                      )}
                      {(pkg as any).payment_method === 'qr' && (
                        <span style={{
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '5px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          📱 二维码
                        </span>
                      )}
                      {(!(pkg as any).payment_method) && (
                        <span style={{
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '5px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          📱 已支付
                        </span>
                      )}
                      <span style={{
                        background: pkg.courier && pkg.courier !== '未分配' && pkg.courier !== '待分配'
                          ? '#dcfce7'
                          : '#fef3c7',
                        color: pkg.courier && pkg.courier !== '未分配' && pkg.courier !== '待分配'
                          ? '#166534'
                          : '#92400e',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '5px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {pkg.status === '待收款' ? '待取件' : pkg.status}
                      </span>
                      
                      {/* 代收款显示 - MERCHANTS订单显示代收款 */}
                      {(() => {
                        const isStoreMatch = stores.some(store => 
                          store.store_name === pkg.sender_name || 
                          (pkg.sender_name && pkg.sender_name.startsWith(store.store_name))
                        );
                        const isMERCHANTS = !!pkg.delivery_store_id || isStoreMatch;
                        const codVal = Number(pkg.cod_amount || 0);
                        
                        if (isMERCHANTS) {
                          return (
                            <span style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '5px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              whiteSpace: 'nowrap'
                            }}>
                              {language === 'zh' ? '代收款' : 'COD'}: {codVal > 0 ? `${codVal} MMK` : '无'}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.6' }}>                                                                           
                    <p style={{ margin: '0.3rem 0' }}>
                      📍 从: {pkg.sender_address}
                      {pkg.sender_latitude && pkg.sender_longitude && (
                        <span 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!pkg.sender_latitude || !pkg.sender_longitude) return;
                            const coords = { lat: pkg.sender_latitude, lng: pkg.sender_longitude };
                            setSelectedLocationPoint({
                              packageId: pkg.id,
                              type: 'pickup',
                              coordinates: coords
                            });
                            setMapCenter(coords);
                            setSelectedCourier(null);
                          }}
                          style={{ 
                            color: '#3b82f6', 
                            fontSize: '0.8rem', 
                            marginLeft: '0.5rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#2563eb';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#3b82f6';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          ({pkg.sender_latitude.toFixed(6)}, {pkg.sender_longitude.toFixed(6)})
                        </span>
                      )}
                    </p>
                    <p style={{ margin: '0.3rem 0' }}>
                      📍 到: {pkg.receiver_address}
                      {pkg.receiver_latitude && pkg.receiver_longitude && (
                        <span 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!pkg.receiver_latitude || !pkg.receiver_longitude) return;
                            const coords = { lat: pkg.receiver_latitude, lng: pkg.receiver_longitude };
                            setSelectedLocationPoint({
                              packageId: pkg.id,
                              type: 'delivery',
                              coordinates: coords
                            });
                            setMapCenter(coords);
                            setSelectedCourier(null);
                          }}
                          style={{ 
                            color: '#ef4444', 
                            fontSize: '0.8rem', 
                            marginLeft: '0.5rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#dc2626';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          ({pkg.receiver_latitude.toFixed(6)}, {pkg.receiver_longitude.toFixed(6)})
                        </span>
                      )}
                    </p>
                    <p style={{ margin: '0.3rem 0' }}>
                      📦 类型: {pkg.package_type} ({pkg.weight})
                    </p>
                    {pkg.delivery_distance && (
                      <p style={{ margin: '0.3rem 0' }}>
                        🚗 距离: {pkg.delivery_distance} km
                      </p>
                    )}
                    {pkg.price && (
                    <p style={{ margin: '0.3rem 0' }}>
                      💰 跑腿费: {pkg.price}
                    </p>
                    )}
                    {/* 🚀 新增：从描述中解析“平台支付”并显示 */}
                    {(() => {
                      const payMatch = pkg.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/);
                      if (payMatch && payMatch[1]) {
                        return (
                          <p style={{ margin: '0.3rem 0', fontWeight: 'bold', color: '#10b981' }}>
                            💵 平台支付: {payMatch[1]} MMK
                          </p>
                        );
                      }
                      return null;
                    })()}
                    {(() => {
                      const isStoreMatch = stores.some(store => 
                        store.store_name === pkg.sender_name || 
                        (pkg.sender_name && pkg.sender_name.startsWith(store.store_name))
                      );
                      const isMERCHANTS = !!pkg.delivery_store_id || isStoreMatch;
                      
                      if (isMERCHANTS) {
                        const priceVal = parseFloat(pkg.price?.replace(/[^\d.]/g, '') || '0');
                        const codVal = Number(pkg.cod_amount || 0);
                        const totalVal = priceVal + codVal;
                        return (
                          <p style={{ margin: '0.3rem 0', fontWeight: 'bold', color: '#b45309' }}>
                            💰 总金额: {totalVal.toLocaleString()} MMK
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem',
                    marginTop: '1rem'
                  }}>
                    {/* 如果包裹已分配给骑手（有courier且不为'未分配'和'待分配'），显示状态信息而不是分配按钮 */}
                    {pkg.courier && pkg.courier !== '未分配' && pkg.courier !== '待分配' ? (
                      <div style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        color: '#92400e',
                        border: '2px solid #f59e0b',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        ✅ 已分配给: {pkg.courier}
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => autoAssignPackage(pkg)}
                          disabled={isAssigning}
                          style={{
                            flex: 1,
                            background: isAssigning 
                              ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '0.6rem',
                            borderRadius: '8px',
                            cursor: isAssigning ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            opacity: isAssigning ? 0.7 : 1
                          }}
                        >
                          {isAssigning ? '⏳ 分配中...' : '🤖 自动分配'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setShowAssignModal(true);
                          }}
                          style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '0.6rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                          }}
                        >
                          👤 手动分配
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
          )}
          </div>
          
          {/* 已分配包裹 */}
          <div>
            <h3 style={{ color: '#059669', marginBottom: '1rem', fontSize: '1.1rem' }}>
              ✅ 已分配包裹 ({filterPackagesByCity(packages).filter(p => p.status === '已取件' || p.status === '配送中').length})
            </h3>
            
            {filterPackagesByCity(packages).filter(p => p.status === '已取件' || p.status === '配送中').length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#9ca3af'
              }}>
                <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', marginBottom: '0.5rem' }}>📦</div>
                <p>暂无已分配包裹</p>
              </div>
            ) : (
              filterPackagesByCity(packages)
                .filter(p => p.status === '已取件' || p.status === '配送中')
                .map(pkg => (
                  <div
                    key={pkg.id}
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      padding: '1rem',
                      borderRadius: '10px',
                      marginBottom: '1rem',
                      border: '2px solid #bbf7d0'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <strong style={{ color: '#166534' }}>{pkg.id}</strong>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* 支付方式标识 */}
                        {pkg.payment_method === 'cash' && (
                          <span style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            💵 现金
                          </span>
                        )}
                        {pkg.payment_method === 'qr' && (
                          <span style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            📱 二维码
                          </span>
                        )}
                        {(!pkg.payment_method) && (
                          <span style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            📱 已支付
                          </span>
                        )}
                        <span style={{
                          background: pkg.status === '待收款' ? '待取件' : pkg.status === '已取件' ? '#fef3c7' : '#dbeafe',
                          color: pkg.status === '待收款' ? 'inherit' : pkg.status === '已取件' ? '#92400e' : '#1e40af',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '5px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          {pkg.status === '待收款' ? '待取件' : pkg.status}
                        </span>

                        {/* 代收款显示 - MERCHANTS订单显示代收款 */}
                        {(() => {
                          const isStoreMatch = stores.some(store => 
                            store.store_name === pkg.sender_name || 
                            (pkg.sender_name && pkg.sender_name.startsWith(store.store_name))
                          );
                          const isMERCHANTS = !!pkg.delivery_store_id || isStoreMatch;
                          const codVal = Number(pkg.cod_amount || 0);
                          
                          if (isMERCHANTS) {
                            return (
                              <span style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '5px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap'
                              }}>
                                {language === 'zh' ? '代收款' : 'COD'}: {codVal > 0 ? `${codVal} MMK` : '无'}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.6' }}>
                      <p style={{ margin: '0.3rem 0' }}>
                        <strong>📤 寄件人:</strong> {pkg.sender_name} ({pkg.sender_phone})
                      </p>
                      <p style={{ margin: '0.3rem 0' }}>
                        <strong>📥 收件人:</strong> {pkg.receiver_name} ({pkg.receiver_phone})
                      </p>
                      <p style={{ margin: '0.3rem 0' }}>
                        <strong>📍 从:</strong> {pkg.sender_address}
                        {pkg.sender_latitude && pkg.sender_longitude && (
                          <span 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!pkg.sender_latitude || !pkg.sender_longitude) return;
                              const coords = { lat: pkg.sender_latitude, lng: pkg.sender_longitude };
                              setSelectedLocationPoint({
                                packageId: pkg.id,
                                type: 'pickup',
                                coordinates: coords
                              });
                              setMapCenter(coords);
                              setSelectedCourier(null);
                            }}
                            style={{ 
                              color: '#3b82f6', 
                              fontSize: '0.8rem', 
                              marginLeft: '0.5rem',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              fontWeight: 'bold',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#2563eb';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#3b82f6';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            ({pkg.sender_latitude.toFixed(6)}, {pkg.sender_longitude.toFixed(6)})
                          </span>
                        )}
                      </p>
                      <p style={{ margin: '0.3rem 0' }}>
                        <strong>📍 到:</strong> {pkg.receiver_address}
                        {pkg.receiver_latitude && pkg.receiver_longitude && (
                          <span 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!pkg.receiver_latitude || !pkg.receiver_longitude) return;
                              const coords = { lat: pkg.receiver_latitude, lng: pkg.receiver_longitude };
                              setSelectedLocationPoint({
                                packageId: pkg.id,
                                type: 'delivery',
                                coordinates: coords
                              });
                              setMapCenter(coords);
                              setSelectedCourier(null);
                            }}
                            style={{ 
                              color: '#ef4444', 
                              fontSize: '0.8rem', 
                              marginLeft: '0.5rem',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              fontWeight: 'bold',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#dc2626';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            ({pkg.receiver_latitude.toFixed(6)}, {pkg.receiver_longitude.toFixed(6)})
                          </span>
                        )}
                      </p>
                      <p style={{ margin: '0.3rem 0' }}>
                        <strong>🚚 骑手:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>{pkg.courier || '未分配'}</span>
                      </p>
                      {pkg.pickup_time && (
                        <p style={{ margin: '0.3rem 0', fontSize: '0.8rem', color: '#6b7280' }}>
                          <strong>⏰ 取件时间:</strong> {pkg.pickup_time}
                        </p>
                      )}

                      <p style={{ margin: '0.3rem 0' }}>
                        <strong>💰 跑腿费:</strong> {pkg.price}
                      </p>
                      {(() => {
                        const isStoreMatch = stores.some(store => 
                          store.store_name === pkg.sender_name || 
                          (pkg.sender_name && pkg.sender_name.startsWith(store.store_name))
                        );
                        const isMERCHANTS = !!pkg.delivery_store_id || isStoreMatch;
                        
                        if (isMERCHANTS) {
                          const priceVal = parseFloat(pkg.price?.replace(/[^\d.]/g, '') || '0');
                          const codVal = Number(pkg.cod_amount || 0);
                          const totalVal = priceVal + codVal;
                          return (
                            <p style={{ margin: '0.3rem 0', fontWeight: 'bold', color: '#b45309' }}>
                              <strong>💰 总金额:</strong> {totalVal.toLocaleString()} MMK
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                ))
            )}
          </div>
            </>
          ) : (
            // 快递店管理内容
            <div>
              <h3 style={{ color: '#10b981', marginBottom: '1rem', fontSize: '1.1rem' }}>
                🏪 合伙店铺列表 ({stores.length})
              </h3>
              
              {loadingStores ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                  <p>加载中...</p>
                </div>
              ) : stores.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏪</div>
                  <p>暂无合伙店铺</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#6b7280' }}>
                    请前往独立页面添加合伙店铺
                  </p>
                </div>
              ) : (
                stores.map(store => (
                  <div
                    key={store.id}
                    style={{
                      background: store.status === 'active' 
                        ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
                        : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      padding: '1rem',
                      borderRadius: '10px',
                      marginBottom: '1rem',
                      border: store.status === 'active' 
                        ? '2px solid #86efac' 
                        : '2px solid #fcd34d'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div>
                        <strong style={{ color: store.status === 'active' ? '#166534' : '#92400e' }}>
                          {store.store_name}
                        </strong>
                        <span style={{
                          background: store.status === 'active' ? '#dcfce7' : '#fef3c7',
                          color: store.status === 'active' ? '#166534' : '#92400e',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '5px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          marginLeft: '0.5rem'
                        }}>
                          {store.store_type === 'restaurant' ? '🍽️ 餐厅' : 
                           store.store_type === 'tea_shop' ? '🍵 茶铺' : 
                           store.store_type === 'drinks_snacks' ? '🥤 饮料和小吃' : 
                           store.store_type === 'grocery' ? '🛒 杂货店' : 
                           store.store_type === 'transit_station' ? '🚚 中转站' : 
                           store.store_type}
                        </span>
                      </div>
                      <span style={{
                        background: store.status === 'active' ? '#10b981' : '#f59e0b',
                        color: 'white',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '5px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {store.status === 'active' ? '✅ 营业中' : store.status === 'inactive' ? '⏸️ 暂停' : '🔧 维护中'}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.6' }}>
                      <p style={{ margin: '0.3rem 0' }}>
                        <strong>📍 地址:</strong> {store.address}
                      </p>
                      <p style={{ margin: '0.3rem 0' }}>
                        <strong>📞 电话:</strong> {store.phone}
                      </p>
                      <p style={{ margin: '0.3rem 0' }}>
                        <strong>👤 店长:</strong> {store.manager_name} ({store.manager_phone})
                      </p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.8rem', color: '#059669' }}>
                        📍 坐标: ({store.latitude.toFixed(6)}, {store.longitude.toFixed(6)})
                      </p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.8rem', color: '#6b7280' }}>
                        ⏰ 营业时间: {store.operating_hours} | 
                        📦 容量: {store.capacity} | 
                        🎯 服务半径: {store.service_area_radius}km
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
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
      {showAbnormalAlert && (abnormalPackages.length > 0 || abnormalCouriers.length > 0) && (
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
          animation: 'slideUp 0.5s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              🚨 异常状态预警
            </h3>
            <button 
              onClick={() => setShowAbnormalAlert(false)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', width: '28px', height: '28px', borderRadius: '50%' }}
            >✕</button>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
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

