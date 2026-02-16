import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorHandler } from '../services/errorHandler';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle, HeatmapLayer, TrafficLayer } from '@react-google-maps/api';
import { packageService, Package, supabase, notificationService, deliveryStoreService, DeliveryStore, adminAccountService } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';
import { useLanguage } from '../contexts/LanguageContext';
import { Courier, CourierWithLocation, Coordinates } from '../types';

// Google Maps 配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Google Maps API Key 未配置！请检查环境变量 REACT_APP_GOOGLE_MAPS_API_KEY');
}
const GOOGLE_MAPS_LIBRARIES: any = ['places', 'visualization'];

const RealTimeTracking: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  // 获取当前用户角色和区域信息
  const currentUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '';
  const currentUserRole = sessionStorage.getItem('currentUserRole') || localStorage.getItem('currentUserRole') || '';
  const currentUserRegion = sessionStorage.getItem('currentUserRegion') || localStorage.getItem('currentUserRegion') || '';
  
  const getDetectedRegion = () => {
    const userUpper = currentUser.toUpperCase();
    if (currentUserRegion === 'yangon' || userUpper.startsWith('YGN')) return 'YGN';
    if (currentUserRegion === 'maymyo' || userUpper.startsWith('POL')) return 'POL';
    if (currentUserRegion === 'mandalay' || userUpper.startsWith('MDY')) return 'MDY';
    return '';
  };

  const currentRegionPrefix = getDetectedRegion();
  const isRegionalUser = currentUserRole !== 'admin' && currentRegionPrefix !== '';

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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
        const score = 100 - (distance * 5) - ((courier.currentPackages || 0) * 10);
        return { ...courier, distance, score };
      })
      .sort((a, b) => b.score - a.score);
  };

  const getHeatmapData = () => {
    if (!isMapLoaded || !window.google) return [];
    return packages
      .filter(p => p.sender_latitude && p.sender_longitude)
      .map(p => new window.google.maps.LatLng(p.sender_latitude!, p.sender_longitude!));
  };

  const [packages, setPackages] = useState<Package[]>([]);
  const { isMobile } = useResponsive();
  const [couriers, setCouriers] = useState<CourierWithLocation[]>([]);
  const [regionalRiderCount, setRegionalRiderCount] = useState(0);
  const [onlineRiderCount, setOnlineRiderCount] = useState(0);
  const [selectedCourier, setSelectedCourier] = useState<CourierWithLocation | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [abnormalPackages, setAbnormalPackages] = useState<Package[]>([]);
  const [abnormalCouriers, setAbnormalCouriers] = useState<CourierWithLocation[]>([]);
  const [showAbnormalAlert, setShowAbnormalAlert] = useState(false);
  
  type CityKey = 'mandalay' | 'pyinoolwin' | 'yangon' | 'naypyidaw' | 'taunggyi' | 'lashio' | 'muse';
  
  const initialCity: CityKey = currentRegionPrefix === 'YGN' ? 'yangon' : 'mandalay';
  const initialCenter = currentRegionPrefix === 'YGN' 
    ? { lat: 16.8661, lng: 96.1951 } 
    : { lat: 21.9588, lng: 96.0891 };

  const [selectedCity, setSelectedCity] = useState<CityKey>(initialCity); 
  const [mapCenter, setMapCenter] = useState<Coordinates>(initialCenter); 
  const [isAssigning, setIsAssigning] = useState(false);
  const [draggedPackage, setDraggedPackage] = useState<Package | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<'packages' | 'stores' | 'couriers'>('packages');
  const [stores, setStores] = useState<DeliveryStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  
  const [selectedLocationPoint, setSelectedLocationPoint] = useState<{
    packageId: string;
    type: 'pickup' | 'delivery';
    coordinates: Coordinates;
  } | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [nextRefreshCountdown, setNextRefreshCountdown] = useState<number>(60);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [mapType, setMapTheme] = useState<'standard' | 'dark' | 'satellite'>('standard');

  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel('realtime-tracking-packages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages'
        },
        (payload) => {
          const newPackage = payload.new as Package;
          const oldPackage = payload.old as Package;
          
          if (payload.eventType === 'INSERT') {
            if (newPackage.status === '待取件' || newPackage.status === '待收款') {
              triggerAlert(newPackage);
            }
          }
          
          if (payload.eventType === 'UPDATE') {
            if (oldPackage?.status === '待确认' && (newPackage.status === '待取件' || newPackage.status === '待收款')) {
              triggerAlert(newPackage);
            }
          }

          loadPackages();
          loadCouriers();
        }
      )
      .subscribe();

    const triggerAlert = (pkg: Package) => {
      if (soundEnabledRef.current && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error('播放提示音失败:', e));
      }
      
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

  const myanmarCities: Record<CityKey, { name: string; nameEn: string; nameMm: string; lat: number; lng: number }> = {
    mandalay: { name: '曼德勒', nameEn: 'Mandalay', nameMm: 'မန္တလေး', lat: 21.9588, lng: 96.0891 },
    pyinoolwin: { name: '彬乌伦', nameEn: 'Pyin Oo Lwin', nameMm: 'ပင်းတလဲ', lat: 22.0333, lng: 96.4667 },
    yangon: { name: '仰光', nameEn: 'Yangon', nameMm: 'ရန်ကုန်', lat: 16.8661, lng: 96.1951 },
    naypyidaw: { name: '内比都', nameEn: 'Naypyidaw', nameMm: 'နေပြည်တော်', lat: 19.7633, lng: 96.0785 },
    taunggyi: { name: '东枝', nameEn: 'Taunggyi', nameMm: 'တောင်ကြီး', lat: 20.7892, lng: 97.0378 },
    lashio: { name: '腊戌', nameEn: 'Lashio', nameMm: 'လားရှိုး', lat: 22.9333, lng: 97.7500 },
    muse: { name: '木姐', nameEn: 'Muse', nameMm: 'မူဆယ်', lat: 23.9833, lng: 97.9000 }
  };

  const { isLoaded: isMapLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  useEffect(() => {
    const refreshData = async () => {
      await Promise.all([
        loadPackages(),
        loadCouriers(),
        loadStores()
      ]);
      setLastRefreshTime(new Date().toLocaleTimeString());
      setNextRefreshCountdown(60);
    };

    refreshData();
    
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

  useEffect(() => {
    const checkAbnormalStatus = () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      const abnormalPkgs = packages.filter(pkg => {
        if (pkg.status !== '配送中' && pkg.status !== '配送进行中') return false;
        const lastUpdateTime = pkg.updated_at ? new Date(pkg.updated_at) : (pkg.created_at ? new Date(pkg.created_at) : null);
        return lastUpdateTime && lastUpdateTime < twoHoursAgo;
      });

      const abnormalRiders = couriers.filter(c => {
        if (c.status === 'offline' || (c.currentPackages || 0) === 0) return false;
        const lastLocUpdate = (c as any).location_updated_at ? new Date((c as any).location_updated_at) : null;
        return lastLocUpdate && lastLocUpdate < thirtyMinsAgo;
      });

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

    checkAbnormalStatus();
    const timer = setInterval(checkAbnormalStatus, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [packages, abnormalPackages.length]);
  
  const loadStores = async () => {
    try {
      setLoadingStores(true);
      const data = await deliveryStoreService.getAllStores();
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
      const pendingPackages = data.filter(p => p.status === '待取件' || p.status === '待收款');
      const assignedPackages = data.filter(p => p.status === '已取件' || p.status === '配送中');
      let activePackages = [...pendingPackages, ...assignedPackages];
      if (isRegionalUser) {
        activePackages = activePackages.filter(p => p.id.startsWith(currentRegionPrefix));
      }
      setPackages(activePackages);
    } catch (error) {
      errorHandler.handleErrorSilent(error, '加载包裹数据');
      setPackages([]);
    }
  };

  const getUnassignedPackages = () => {
    return packages.filter(pkg => 
      pkg.courier === '待分配' && 
      (pkg.status === '待取件' || pkg.status === '待收款') && 
      ((pkg.sender_latitude && pkg.sender_longitude) || (pkg.receiver_latitude && pkg.receiver_longitude))
    );
  };

  const loadCouriers = async () => {
    try {
      const accounts = await adminAccountService.getAllAccounts();
      const riderAccounts = accounts.filter(acc => 
        acc.position === '骑手' || acc.position === '骑手队长'
      );

      let activePrefix = currentRegionPrefix;
      if (!isRegionalUser) {
        if (selectedCity === 'yangon') activePrefix = 'YGN';
        else if (selectedCity === 'mandalay') activePrefix = 'MDY';
        else if (selectedCity === 'pyinoolwin') activePrefix = 'POL';
        else activePrefix = '';
      }

      const regionalRiders = riderAccounts.filter(acc => {
        if (activePrefix) {
          return acc.employee_id && acc.employee_id.startsWith(activePrefix);
        }
        return true;
      });
      setRegionalRiderCount(regionalRiders.length);

      const { data: couriersData, error: couriersError } = await supabase
        .from('couriers')
        .select('*')
        .order('last_active', { ascending: false });

      if (couriersError) throw couriersError;

      const { data: locationsData } = await supabase.from('courier_locations').select('*');

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

      const enrichedCouriers: CourierWithLocation[] = riderAccounts
        .filter(acc => activePrefix ? acc.employee_id && acc.employee_id.startsWith(activePrefix) : true)
        .map(acc => {
          const courierRt = couriersData?.find(c => c.employee_id === acc.employee_id || c.phone === acc.phone);
          const location = locationsData?.find(loc => loc.courier_id === (courierRt?.id || acc.id));
          const currentPackages = packageCounts[acc.employee_name] || 0;
          let displayStatus: Courier['status'] = 'offline';
          if (acc.status === 'active') {
            const rtActiveTime = courierRt?.last_active ? new Date(courierRt.last_active).getTime() : 0;
            const loginActiveTime = acc.last_login ? new Date(acc.last_login).getTime() : 0;
            const mostRecentActiveTime = Math.max(rtActiveTime, loginActiveTime);
            if (mostRecentActiveTime > 0 && (Date.now() - mostRecentActiveTime) / 60000 < 30) {
              displayStatus = currentPackages >= 5 ? 'busy' : 'online';
            }
          }
          return {
            id: courierRt?.id || acc.id,
            name: acc.employee_name,
            phone: acc.phone,
            employee_id: acc.employee_id,
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
      setOnlineRiderCount(enrichedCouriers.filter(c => c.status === 'online').length);
    } catch (error) {
      errorHandler.handleErrorSilent(error, '加载快递员数据');
      setCouriers([]);
      setOnlineRiderCount(0);
    }
  };

  const autoAssignPackage = async (packageData: Package) => {
    const availableCouriers = couriers
      .filter(c => c.status === 'online' || c.status === 'active')
      .sort((a, b) => (a.currentPackages || 0) - (b.currentPackages || 0));
    if (availableCouriers.length === 0) {
      alert('当前没有在线的快递员，请稍后再试');
      return;
    }
    await assignPackageToCourier(packageData, availableCouriers[0]);
  };

  const assignPackageToCourier = async (packageData: Package, courier: Courier) => {
    setIsAssigning(true);
    try {
      const success = await packageService.updatePackageStatus(packageData.id, '待取件', undefined, undefined, courier.name);
      if (success) {
        await notificationService.sendPackageAssignedNotification(courier.id, courier.name, packageData.id, {
          sender: packageData.sender_name,
          receiver: packageData.receiver_name,
          receiverAddress: packageData.receiver_address,
          deliverySpeed: packageData.delivery_speed
        });
        alert(`✅ 分配成功！\n\n包裹已分配给骑手 ${courier.name}`);
        setShowAssignModal(false);
        setSelectedPackage(null);
        loadPackages();
        loadCouriers();
      } else {
        alert('❌ 分配失败！');
      }
    } catch (error) {
      alert('❌ 分配失败！\n\n发生错误');
    } finally {
      setIsAssigning(false);
    }
  };

  const getCourierStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'busy': return '#f59e0b';
      case 'offline': return '#6b7280';
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

  const handleCityChange = (cityKey: string) => {
    if (isRegionalUser) return;
    const validCityKey = cityKey as CityKey;
    if (validCityKey in myanmarCities) {
      setSelectedCity(validCityKey);
      const city = myanmarCities[validCityKey];
      setMapCenter({ lat: city.lat, lng: city.lng });
      setTimeout(() => loadCouriers(), 100);
    }
  };
  
  const filterPackagesByCity = (pkgList: Package[]) => {
    if (isRegionalUser) return pkgList.filter(pkg => pkg.id.startsWith(currentRegionPrefix));
    const cityPrefixMap: { [key: string]: string } = {
      'mandalay': 'MDY', 'pyinoolwin': 'POL', 'yangon': 'YGN', 'naypyidaw': 'NPW', 'taunggyi': 'TGI', 'lashio': 'LSO', 'muse': 'MSE'
    };
    const prefix = cityPrefixMap[selectedCity] || 'ALL';
    return prefix === 'ALL' ? pkgList : pkgList.filter(pkg => pkg.id.startsWith(prefix));
  };

  const darkMapStyle = [{ elementType: 'geometry', stylers: [{ color: '#242f3e' }] }, { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] }, { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }, { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] }, { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] }, { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] }, { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] }, { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] }, { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] }, { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] }, { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] }, { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] }, { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] }, { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] }, { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] }, { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] }, { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] }, { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] }];

  const pendingPackages = filterPackagesByCity(packages).filter(p => p.status === '待取件' || p.status === '待收款');
  const assignedPackages = filterPackagesByCity(packages).filter(p => p.status === '已取件' || p.status === '配送中');
  const pendingCount = pendingPackages.length;
  const assignedCount = assignedPackages.length;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)', padding: '2rem' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '0.8rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <button onClick={() => navigate('/admin')} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', transition: 'transform 0.2s' }}>
            <span>←</span> 返回后台
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: 0, color: '#1f2937', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em' }}>📍 实时跟踪管理</h1>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Real-time Fleet & Package Monitoring</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', background: 'rgba(241, 245, 249, 0.5)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ background: '#3b82f6', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)' }}>
            <span>📍 {isRegionalUser ? `${currentRegionPrefix}` : myanmarCities[selectedCity].name}</span>
          </div>
          <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 0.2rem' }} />
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <div title="在线骑手" style={{ background: '#f0fdf4', color: '#166534', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '3px' }}>在线: {onlineRiderCount}</div>
              <div title="忙碌骑手" style={{ background: '#fffbeb', color: '#92400e', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '3px' }}>忙碌: {couriers.filter(c => c.status === 'busy').length}</div>
            </div>
            <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 0.2rem' }} />
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <div title="待分配包裹" style={{ background: '#fef2f2', color: '#991b1b', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', gap: '3px' }}>⌛ {pendingCount}</div>
              <div title="配送中包裹" style={{ background: '#eff6ff', color: '#1e40af', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: '3px' }}>🚚 {assignedCount}</div>
            </div>
          </div>
          <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 0.2rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'white', padding: '0.2rem 0.5rem 0.2rem 0.7rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '2px' }}>NEXT SYNC</span>
              <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '800', fontFamily: 'monospace' }}>{nextRefreshCountdown}s</span>
            </div>
            <button onClick={() => setNextRefreshCountdown(1)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '5px', borderRadius: '50%', display: 'flex', color: '#64748b' }}>
              <span style={{ fontSize: '0.8rem' }}>🔄</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '15px', padding: '1.5rem', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: '#1f2937' }}>🗺️ 快递员实时位置</h2>
            <div style={{ background: '#ecfdf5', border: '1px solid #86efac', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#065f46', fontWeight: 'bold' }}>✅ {isRegionalUser ? currentRegionPrefix : selectedCity.toUpperCase()} 骑手: {regionalRiderCount}</div>
          </div>
          <div style={{ width: '100%', height: '650px', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
              <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                {!isRegionalUser && (
                  <select value={selectedCity} onChange={(e) => handleCityChange(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #e5e7eb', background: 'white', color: '#1f2937', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', minWidth: '150px', outline: 'none' }}>
                    {Object.entries(myanmarCities).map(([key, city]) => <option key={key} value={key}>📍 {city.name}</option>)}
                  </select>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowTraffic(!showTraffic)} style={{ padding: '8px 12px', borderRadius: '6px', background: showTraffic ? '#10b981' : 'white', color: showTraffic ? 'white' : '#1f2937', border: '2px solid #e5e7eb', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>🚦 路况</button>
                  <button onClick={() => setShowHeatmap(!showHeatmap)} style={{ padding: '8px 12px', borderRadius: '6px', background: showHeatmap ? '#ef4444' : 'white', color: showHeatmap ? 'white' : '#1f2937', border: '2px solid #e5e7eb', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>📈 热力图</button>
                  <select value={mapType} onChange={(e) => setMapTheme(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #e5e7eb', background: 'white', color: '#1f2937', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    <option value="standard">🗺️ 标准</option>
                    <option value="dark">🌑 深夜</option>
                    <option value="satellite">🛰️ 卫星</option>
                  </select>
                </div>
              </div>
              {!isMapLoaded ? <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f3f4f6' }}>加载中...</div> : (
                <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={mapCenter} zoom={13} mapTypeId={mapType === 'satellite' ? 'satellite' : 'roadmap'} options={{ styles: mapType === 'dark' ? darkMapStyle : [] }}>
                  {showTraffic && <TrafficLayer />}
                  {showHeatmap && <HeatmapLayer data={getHeatmapData()} options={{ radius: 30, opacity: 0.7 }} />}
                  {couriers.filter(c => c.latitude != null).map(c => (
                    <Marker key={c.id} position={{ lat: c.latitude!, lng: c.longitude! }} onClick={() => setSelectedCourier(c)} />
                  ))}
                  {stores.filter(s => s.latitude != null).map(s => (
                    <Marker key={s.id} position={{ lat: s.latitude!, lng: s.longitude! }} icon={{ url: '/store-icon.png', scaledSize: new window.google.maps.Size(30, 30) }} />
                  ))}
                </GoogleMap>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '15px', padding: '1.5rem', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)', maxHeight: '700px', overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button onClick={() => setActiveTab('packages')} style={{ background: activeTab === 'packages' ? '#3b82f6' : 'transparent', color: activeTab === 'packages' ? 'white' : '#6b7280', border: '1px solid #e5e7eb', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>📦 包裹</button>
            <button onClick={() => setActiveTab('stores')} style={{ background: activeTab === 'stores' ? '#10b981' : 'transparent', color: activeTab === 'stores' ? 'white' : '#6b7280', border: '1px solid #e5e7eb', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>🏪 店铺</button>
            <button onClick={() => setActiveTab('couriers')} style={{ background: activeTab === 'couriers' ? '#f59e0b' : 'transparent', color: activeTab === 'couriers' ? 'white' : '#6b7280', border: '1px solid #e5e7eb', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>🛵 骑手</button>
          </div>

          {activeTab === 'packages' && (
            <div key="packages-tab">
              <h3 style={{ color: '#dc2626' }}>⏳ 待分配 ({pendingCount})</h3>
              {pendingPackages.map(pkg => {
                const isVIP = pkg.description?.includes('VIP');
                return (
                  <div key={pkg.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>#{pkg.id.slice(-8)}</strong>
                      <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{pkg.status}</span>
                    </div>
                    {pkg.cod_amount && !isVIP && (
                      <div style={{ color: '#e11d48', fontWeight: 'bold' }}>💰 COD: {Number(pkg.cod_amount).toLocaleString()}</div>
                    )}
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      <div>📤 {pkg.sender_name}</div>
                      <div>📥 {pkg.receiver_name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                      <button onClick={() => autoAssignPackage(pkg)} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}>智能分配</button>
                      <button onClick={() => { setSelectedPackage(pkg); setShowAssignModal(true); }} style={{ background: 'white', border: '1px solid #ddd', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}>手动</button>
                    </div>
                  </div>
                );
              })}
              <h3 style={{ color: '#059669', marginTop: '2rem' }}>✅ 已分配 ({assignedCount})</h3>
              {assignedPackages.map(pkg => (
                <div key={pkg.id} style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #dcfce7' }}>
                  <strong>#{pkg.id.slice(-8)}</strong>
                  <div style={{ fontSize: '0.8rem' }}>🚚 骑手: {pkg.courier}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stores' && (
            <div key="stores-tab">
              {stores.map(store => (
                <div key={store.id} style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                  <strong>{store.store_name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{store.address}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'couriers' && (
            <div key="couriers-tab">
              {couriers.filter(c => c.status !== 'offline').map(c => (
                <div key={c.id} style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{c.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>📦 {c.currentPackages} 包裹</div>
                  </div>
                  <span style={{ color: getCourierStatusColor(c.status) }}>● {getCourierStatusText(c.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAssignModal && selectedPackage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px' }}>
            <h3>分配包裹 - {selectedPackage.id}</h3>
            {getRecommendedCouriers(selectedPackage).map(c => (
              <div key={c.id} onClick={() => assignPackageToCourier(selectedPackage, c)} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px', marginBottom: '0.5rem', cursor: 'pointer' }}>
                {c.name} ({c.currentPackages} 包裹)
              </div>
            ))}
            <button onClick={() => setShowAssignModal(false)} style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}>取消</button>
          </div>
        </div>
      )}
      
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />
    </div>
  );
};

export default RealTimeTracking;
