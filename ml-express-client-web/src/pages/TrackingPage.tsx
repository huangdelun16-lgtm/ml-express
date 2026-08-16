import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import LoggerService from '../services/LoggerService';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline, OverlayView, OverlayViewF } from '@react-google-maps/api';
import { packageService, supabase } from '../services/supabase';
import NavigationBar from '../components/home/NavigationBar';
import ClientInteriorShell from '../components/layout/ClientInteriorShell';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ACTIVE_PACKAGE_STATUSES,
  PACKAGE_STATUS,
  TERMINAL_EXCLUDED_STATUSES,
  TRACKING_LIVE_MAP_STATUSES
} from '../constants/packageStatus';
import { TRACKING_COURIER_COLOR, TRACKING_DESTINATION_COLOR, TRACKING_MAP_OPTIONS, TRACKING_ROUTE_COLOR } from '../constants/trackingMapStyles';
import { getCourierMarkerIcon, getDestinationMarkerIcon } from '../utils/trackingMapMarkers';
import { formatTrackingAge } from '../utils/trackingRelativeTime';
import { feedbackService } from '../services/FeedbackService';
import '../styles/trackingLiveMap.css';

// Google Maps API 配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
if (!GOOGLE_MAPS_API_KEY) {
  LoggerService.error('❌ Google Maps API Key 未配置！请检查环境变量 REACT_APP_GOOGLE_MAPS_API_KEY');
}
const GOOGLE_MAPS_LIBRARIES: any = ['places'];

/** 与客户端 App「追踪订单」一致：优先使用库里的收货坐标，其次才对地址做地理编码 */
function parseReceiverLatLng(pkg: { receiver_latitude?: number | null; receiver_longitude?: number | null } | null): { lat: number; lng: number } | null {
  if (!pkg) return null;
  const la = pkg.receiver_latitude;
  const lo = pkg.receiver_longitude;
  if (la == null || lo == null) return null;
  const lat = Number(la);
  const lng = Number(lo);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

type TrackingPageProps = { embedInLanding?: boolean };

const TrackingPage: React.FC<TrackingPageProps> = ({ embedInLanding }) => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  
  // Google Maps API 加载
  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      LoggerService.error('[TrackingPage] 未找到 REACT_APP_GOOGLE_MAPS_API_KEY 环境变量。');
    }
    if (mapLoadError) {
      LoggerService.error('[TrackingPage] Google Maps 加载失败:', mapLoadError);
    }
  }, [mapLoadError]);

  const [isVisible, setIsVisible] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [courierLocation, setCourierLocation] = useState<any>(null);
  
  // 🚀 优化：平滑移动动画相关
  const [animatedCourierLocation, setAnimatedCourierLocation] = useState<any>(null);
  const targetLocationRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [mapCenter, setMapCenter] = useState({ lat: 16.8661, lng: 96.1951 }); // 仰光中心（无订单时的默认；有订单时以收货地为准）
  /** 收货地/目的地在地图上的坐标 — 与 App 的 receiver_latitude / receiver_longitude 一致，勿与 mapCenter(曾被错误设为骑手位置) 混用 */
  const [receiverMapPosition, setReceiverMapPosition] = useState<{ lat: number; lng: number } | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const boundsFitStateRef = useRef<{ id?: string; mode?: 'r' | 'rc' }>({});
  const [selectedMarker, setSelectedMarker] = useState<'package' | 'courier' | null>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]); // 🚀 新增：进行中的订单列表
  const [loadingActiveOrders, setLoadingActiveOrders] = useState(false); // 🚀 新增：加载状态

  const destinationMarkerIcon = useMemo(
    () => (isMapLoaded ? getDestinationMarkerIcon() : undefined),
    [isMapLoaded],
  );
  const courierMarkerIcon = useMemo(
    () => (isMapLoaded ? getCourierMarkerIcon(courierLocation?.vehicle) : undefined),
    [isMapLoaded, courierLocation?.vehicle],
  );

  const loadActiveOrders = useCallback(async () => {
    if (!currentUser) return;
    setLoadingActiveOrders(true);
    try {
      const packages = await packageService.getPackagesByUser(
        currentUser.email,
        currentUser.phone,
        undefined,
        undefined,
        currentUser.id,
        undefined
      );

      const excludedStatuses = [...TERMINAL_EXCLUDED_STATUSES];
      const active = packages.filter(pkg => {
        const isExcludedStatus = excludedStatuses.includes(pkg.status);
        const isWaySide = pkg.package_type === '顺路递' || pkg.package_type === 'Eco Way' || pkg.package_type === 'တန်တန်လေးပို့';
        return !isExcludedStatus && !isWaySide;
      });
      setActiveOrders(active);
    } catch (error) {
      LoggerService.error('加载进行中的订单失败:', error);
    } finally {
      setLoadingActiveOrders(false);
    }
  }, [currentUser]);

  useEffect(() => {
    setIsVisible(true);
    loadUserFromStorage();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadActiveOrders();
    }
  }, [currentUser, loadActiveOrders]);

  /** 与 App 一致：从 receiver_latitude / receiver_longitude 或地址解析出「收货地」图钉，不随骑手位置变化 */
  useEffect(() => {
    if (!trackingResult) {
      setReceiverMapPosition(null);
      return;
    }
    const fromDb = parseReceiverLatLng(trackingResult);
    if (fromDb) {
      setReceiverMapPosition(fromDb);
      setMapCenter(fromDb);
      return;
    }
    if (!isMapLoaded || !window.google?.maps || !trackingResult.receiver_address) {
      return;
    }
    let cancelled = false;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: trackingResult.receiver_address }, (results, status) => {
      if (cancelled) return;
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location;
        const p = { lat: loc.lat(), lng: loc.lng() };
        setReceiverMapPosition(p);
        setMapCenter(p);
      } else {
        LoggerService.error('[TrackingPage] 收货地址地理编码失败:', status);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    isMapLoaded,
    trackingResult?.id,
    trackingResult?.receiver_latitude,
    trackingResult?.receiver_longitude,
    trackingResult?.receiver_address
  ]);

  useEffect(() => {
    boundsFitStateRef.current = {};
  }, [trackingResult?.id]);

  /** 首次展示：仅收货地时居中；出现骑手后一次性 fit 两端（不在此用骑手覆盖收货坐标） */
  useEffect(() => {
    if (!trackingResult) return;
    const map = mapInstanceRef.current;
    if (!map || !receiverMapPosition || !window.google?.maps) return;
    const id = trackingResult?.id;
    if (courierLocation) {
      if (boundsFitStateRef.current.id === id && boundsFitStateRef.current.mode === 'rc') return;
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(receiverMapPosition);
      bounds.extend(new window.google.maps.LatLng(courierLocation.lat, courierLocation.lng));
      map.fitBounds(bounds, 64);
      boundsFitStateRef.current = { id, mode: 'rc' };
    } else {
      if (boundsFitStateRef.current.id === id && boundsFitStateRef.current.mode === 'r') return;
      map.setCenter(receiverMapPosition);
      map.setZoom(14);
      boundsFitStateRef.current = { id, mode: 'r' };
    }
  }, [receiverMapPosition, courierLocation, trackingResult?.id]);

  // 从本地存储加载用户信息
  const loadUserFromStorage = () => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        LoggerService.error('加载用户信息失败:', error);
      }
    }
  };

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    setCurrentUser(null);
    // 刷新页面以更新UI
    window.location.reload();
  };

  // 自动刷新快递员位置逻辑已优化为实时订阅
  useEffect(() => {
    let channel: any = null;
    
    const animate = () => {
      setAnimatedCourierLocation((prev: any) => {
        if (!prev || !targetLocationRef.current) return targetLocationRef.current;
        
        const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;
        const speed = 0.05; // 平滑度
        
        const nextLat = lerp(prev.lat, targetLocationRef.current.lat, speed);
        const nextLng = lerp(prev.lng, targetLocationRef.current.lng, speed);
        
        // 如果距离非常近了，直接设为目标点
        if (Math.abs(nextLat - targetLocationRef.current.lat) < 0.00001 && 
            Math.abs(nextLng - targetLocationRef.current.lng) < 0.00001) {
          return targetLocationRef.current;
        }
        
        return { ...prev, lat: nextLat, lng: nextLng };
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const activeStatuses = [...ACTIVE_PACKAGE_STATUSES];
    if (trackingResult && activeStatuses.includes(trackingResult.status) && trackingResult.courier && trackingResult.courier !== '待分配') {
      console.log('📡 启动 Web 实时追踪:', trackingResult.courier);
      
      // 1. 获取骑手 ID (增加对不同语言环境下名称的兼容性处理)
      const fetchCourierAndSubscribe = async () => {
        try {
          const courierName = trackingResult.courier.trim();
          
          // 🚀 核心优化：先尝试精确匹配，如果失败再尝试不区分大小写的匹配
          let { data, error } = await supabase
            .from('couriers')
            .select('id, phone, vehicle_type')
            .eq('name', courierName)
            .maybeSingle();

          if (!data && !error) {
            // 如果精确匹配没找到，尝试 ilike (不区分大小写)
            const { data: ilikeData, error: ilikeError } = await supabase
              .from('couriers')
              .select('id, phone, vehicle_type')
              .ilike('name', courierName)
              .maybeSingle();
            data = ilikeData;
            error = ilikeError;
          }

          if (error) throw error;
          
          if (data) {
            const courierId = data.id;
            const courierPhone = data.phone;
            const courierVehicleType = data.vehicle_type;
            console.log('✅ 找到骑手 ID:', courierId);
            
            // 获取初始位置
            const { data: locData } = await supabase
              .from('courier_locations')
              .select('latitude, longitude, last_update')
              .eq('courier_id', courierId)
              .maybeSingle();

            if (locData) {
              const initialLoc = { 
                lat: locData.latitude, 
                lng: locData.longitude,
                name: trackingResult.courier,
                phone: courierPhone,
                vehicle: courierVehicleType === 'car' ? (language === 'zh' ? '汽车' : 'Car') : (language === 'zh' ? '摩托车' : 'Motorcycle'),
                last_active: locData.last_update
              };
              targetLocationRef.current = initialLoc;
              setAnimatedCourierLocation(initialLoc);
              setCourierLocation(initialLoc);
              // 勿将 mapCenter 设为骑手位置，否则「包裹」标记会与收货地址不一致（与 App 端一致：目的地单独用 receiverMapPosition）
              
              // 启动动画循环
              if (!animationFrameRef.current) {
                animationFrameRef.current = requestAnimationFrame(animate);
              }
            }

            // 订阅实时更新
            channel = supabase
              .channel(`web-rider-tracking-${courierId}`)
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'courier_locations',
                  filter: `courier_id=eq.${courierId}`
                },
                (payload: any) => {
                  console.log('📍 Web 收到位置更新:', payload.new);
                  const updatedLoc = {
                    lat: payload.new.latitude,
                    lng: payload.new.longitude,
                    name: trackingResult.courier,
                    phone: courierPhone,
                    vehicle: courierVehicleType === 'car' ? (language === 'zh' ? '汽车' : 'Car') : (language === 'zh' ? '摩托车' : 'Motorcycle'),
                    last_active: payload.new.last_update || new Date().toISOString()
                  };
                  targetLocationRef.current = updatedLoc;
                  setCourierLocation(updatedLoc);
                }
              )
              .subscribe();
          } else {
            console.warn('⚠️ 未找到对应的骑手信息:', trackingResult.courier);
          }
        } catch (err) {
          console.error('❌ 骑手实时追踪初始化失败:', err);
        }
      };

      fetchCourierAndSubscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [trackingResult, language]);

  // 语言切换函数
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showLanguageDropdown && !target.closest('[data-language-dropdown]')) {
        setShowLanguageDropdown(false);
      }
    };

    if (showLanguageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageDropdown]);

  const handleTracking = async () => {
    handleTrackingInternal(trackingNumber);
  };

  const handleTrackingInternal = async (number: string) => {
    if (!number.trim()) {
      feedbackService.notify(language === 'zh' ? '请输入包裹单号' : language === 'en' ? 'Please enter tracking number' : 'ထုပ်ပိုးနံပါတ်ကို ထည့်ပါ');
      return;
    }
    setLoading(true);
    try {
      // 从数据库直接按ID查询，不再使用 getAllPackages
      const { data: pkg, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', number.trim())
        .maybeSingle();

      if (error) throw error;

      if (pkg) {
        // 🚀 核心优化：如果该订单是“顺路递”，则不显示在包裹跟踪中
        const isWaySide = pkg.package_type === '顺路递' || pkg.package_type === 'Eco Way' || pkg.package_type === 'တန်တန်လေးပို့';
        if (isWaySide) {
          feedbackService.notify(language === 'zh' ? '该订单类型暂不支持实时跟踪' : 'Live tracking is not available for this package type');
          setTrackingResult(null);
          setCourierLocation(null);
          setAnimatedCourierLocation(null);
          setLoading(false);
          return;
        }

        setTrackingResult(pkg);
        // 收货地坐标由上方 useEffect 根据 receiver_latitude/receiver_longitude 或地理编码写入 receiverMapPosition（与客户端 App 一致）
      } else {
        feedbackService.notify(t.tracking.notFound);
        setTrackingResult(null);
        setCourierLocation(null);
        setAnimatedCourierLocation(null);
      }
    } catch (error) {
      LoggerService.error('查询失败:', error);
      feedbackService.notify(language === 'zh' ? '查询失败，请稍后重试' : language === 'en' ? 'Query failed, please try again later' : 'ရှာဖွေမှု မအောင်မြင်ပါ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case PACKAGE_STATUS.PENDING_PICKUP:
      case 'Pending Pickup':
        return '#f39c12';
      case PACKAGE_STATUS.PICKED_UP:
      case 'Picked Up':
        return '#3498db';
      case PACKAGE_STATUS.IN_TRANSIT:
      case 'In Delivery':
        return '#9b59b6';
      case PACKAGE_STATUS.DELIVERED:
      case 'Delivered':
        return '#27ae60';
      case PACKAGE_STATUS.CANCELLED:
      case 'Cancelled':
        return '#95a5a6';
      default:
        return '#2c5282';
    }
  };

  const inner = (
    <>
      {!embedInLanding && (
      <NavigationBar
        variant="landing"
        language={language}
        onLanguageChange={handleLanguageChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        onShowRegisterModal={(isLoginMode) => {
          navigate('/', { state: { showModal: true, isLoginMode } });
        }}
      />
      )}
      <div style={{
        position: 'relative',
        zIndex: 5,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-in-out',
        color: 'white'
      }}>
        {/* 页面标题 */}
        <div className="client-page-title-wrap" style={{ marginBottom: '2rem' }}>
          <div className="client-page-accent-bar" />
          <h1 className="client-page-title">
            {t.tracking.title}
          </h1>
          <p className="client-page-subtitle">
            {t.tracking.realTimeTracking}
          </p>
        </div>

        {/* 正在配送中的订单列表 (快捷访问) */}
        {currentUser && (
          <div style={{ maxWidth: '1400px', margin: '0 auto 2rem auto', padding: '0 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🛵 {language === 'zh' ? '未完成订单' : language === 'en' ? 'Ongoing Orders' : 'မပြီးသေးသော အော်ဒါများ'} 
                <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: '400' }}>({activeOrders.length})</span>
              </h2>
              <button 
                onClick={loadActiveOrders}
                disabled={loadingActiveOrders}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {loadingActiveOrders ? '...' : (language === 'zh' ? '刷新' : 'Refresh')}
              </button>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              overflowX: 'auto', 
              paddingBottom: '1rem',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }} className="hide-scrollbar">
              {loadingActiveOrders ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} style={{ minWidth: '280px', height: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }} />
                ))
              ) : activeOrders.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                  <span style={{ opacity: 0.6 }}>{language === 'zh' ? '暂无进行中的订单' : 'No ongoing orders'}</span>
                </div>
              ) : (
                activeOrders.map((order) => {
                  const isSelected = trackingResult?.id === order.id;
                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        setTrackingNumber(order.id);
                        handleTrackingInternal(order.id);
                      }}
                      style={{
                        minWidth: '280px',
                        background: isSelected 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '20px',
                        padding: '1.25rem',
                        border: isSelected ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: isSelected ? '0 10px 25px rgba(251, 191, 36, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ color: isSelected ? '#fbbf24' : 'white', fontWeight: '800', fontFamily: 'monospace' }}>
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                        <div style={{ background: getStatusColor(order.status), color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {order.status}
                        </div>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px' }}>
                        📍 {order.receiver_address}
                      </div>
                      <div style={{ color: isSelected ? '#60a5fa' : 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '700' }}>
                        {isSelected ? '👀 ' + (language === 'zh' ? '正在追踪' : 'Tracking') : (language === 'zh' ? '点击立即追踪 ➔' : 'Tap to track ➔')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 跟踪查询区域 */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* 查询输入区域 */}
          <div style={{
            background: 'var(--card-bg)',
            backdropFilter: 'var(--card-backdrop)',
            borderRadius: 'var(--card-radius-lg)',
            padding: 'var(--card-padding-lg)',
            boxShadow: 'var(--shadow-card)',
            border: 'var(--card-border)',
            marginBottom: 'var(--spacing-8)'
          }}>
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexDirection: window.innerWidth < 768 ? 'column' : 'row'
            }}>
              <input
                type="text"
                placeholder={t.tracking.placeholder}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTracking()}
                style={{
                  flex: 1,
                  padding: 'var(--spacing-4) var(--spacing-5)',
                  border: '2px solid var(--color-border-dark)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--font-size-lg)',
                  lineHeight: 'var(--line-height-normal)',
                  textAlign: 'left',
                  transition: 'all var(--transition-base)',
                  background: 'white',
                  fontFamily: 'var(--font-family-base)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={handleTracking}
                disabled={loading}
                style={{
                  background: loading ? '#cbd5e0' : 'linear-gradient(to right top, #498ab6, #428cc9, #468dda, #558cea)',
                  color: 'white',
                  border: 'none',
                  padding: 'var(--spacing-4) var(--spacing-6)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--font-size-lg)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'var(--font-weight-bold)',
                  textAlign: 'center',
                  minWidth: window.innerWidth < 768 ? '100%' : 'auto',
                  fontFamily: 'var(--font-family-base)',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                  transition: 'all var(--transition-base)'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(102, 126, 234, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
                }}
              >
                {loading ? '查询中...' : t.tracking.track}
              </button>
            </div>
          </div>

          {/* 查询结果 */}
          {trackingResult && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1.2fr',
              gap: '2rem',
              animation: 'fadeInUp 0.5s ease-out'
            }}>
              {/* 左侧：包裹信息 */}
              <div>
                <div style={{
                  background: 'var(--card-bg)',
                  backdropFilter: 'var(--card-backdrop)',
                  padding: 'var(--card-padding-lg)',
                  borderRadius: 'var(--card-radius-lg)',
                  border: '2px solid ' + getStatusColor(trackingResult.status),
                  boxShadow: 'var(--shadow-card)'
                }}>
                  <h3 style={{ 
                    color: getStatusColor(trackingResult.status), 
                    marginBottom: '1.5rem', 
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    📦 {t.tracking.packageInfo}
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <strong style={{ color: '#4a5568', display: 'block', marginBottom: '0.5rem' }}>{t.tracking.trackingNumber}</strong>
                      <span style={{ color: '#2d3748', fontSize: '1.1rem', fontWeight: '600' }}>{trackingResult.id}</span>
                    </div>
                    
                    <div style={{ padding: '1rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <strong style={{ color: '#4a5568', display: 'block', marginBottom: '0.5rem' }}>{t.tracking.status}</strong>
                      <span style={{ 
                        color: getStatusColor(trackingResult.status), 
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        padding: '0.3rem 0.8rem',
                        background: getStatusColor(trackingResult.status) + '20',
                        borderRadius: '8px',
                        display: 'inline-block'
                      }}>
                        {trackingResult.status}
                      </span>
                    </div>

                    <div style={{ padding: '1rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <strong style={{ color: '#4a5568', display: 'block', marginBottom: '0.5rem' }}>{t.tracking.sender}</strong>
                      <span style={{ color: '#2d3748' }}>{trackingResult.sender_name}</span>
                      <br />
                      <span style={{ color: '#718096', fontSize: '0.9rem' }}>{trackingResult.sender_phone}</span>
                    </div>

                    <div style={{ padding: '1rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <strong style={{ color: '#4a5568', display: 'block', marginBottom: '0.5rem' }}>{t.tracking.receiver}</strong>
                      <span style={{ color: '#2d3748' }}>{trackingResult.receiver_name}</span>
                      <br />
                      <span style={{ color: '#718096', fontSize: '0.9rem' }}>{trackingResult.receiver_phone}</span>
                      <span style={{ color: '#718096', fontSize: '0.9rem', marginTop: '0.3rem', display: 'block' }}>
                        📍 {trackingResult.receiver_address}
                      </span>
                    </div>

                    <div style={{ padding: '1rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <strong style={{ color: '#4a5568', display: 'block', marginBottom: '0.5rem' }}>{t.tracking.packageType}</strong>
                      <span style={{ color: '#2d3748' }}>{trackingResult.package_type}</span>
                      <span style={{ color: '#718096', marginLeft: '0.5rem' }}>• {trackingResult.weight}</span>
                    </div>

                    {trackingResult.courier && (
                      <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)', borderRadius: '12px', border: '2px solid #667eea40' }}>
                        <strong style={{ color: '#667eea', display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                          🏍️ {t.tracking.courier}
                        </strong>
                        <span style={{ color: '#2d3748', fontSize: '1.1rem', fontWeight: '600' }}>{trackingResult.courier}</span>
                        {courierLocation && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#4a5568' }}>
                            <div>📱 {courierLocation.phone}</div>
                            <div>🚗 {courierLocation.vehicle}</div>
                            <div style={{ color: '#38a169', marginTop: '0.3rem' }}>
                              ● {language === 'zh' ? '在线' : language === 'en' ? 'Online' : 'အွန်လိုင်း'}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 右侧：实时地图 */}
              <div>
                <div className="tracking-map-shell">
                  <div className="tracking-map-frame">
                  {isMapLoaded ? (
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        mapContainerClassName="tracking-map-canvas"
                        center={mapCenter}
                        zoom={13}
                        onLoad={(map) => {
                          mapInstanceRef.current = map;
                        }}
                        options={TRACKING_MAP_OPTIONS}
                      >
                        {receiverMapPosition && (
                        <Marker
                          position={receiverMapPosition}
                          icon={destinationMarkerIcon}
                          zIndex={2}
                          onClick={() => setSelectedMarker('package')}
                        />
                        )}

                        {receiverMapPosition && animatedCourierLocation && (
                          <Polyline
                            path={[
                              { lat: receiverMapPosition.lat, lng: receiverMapPosition.lng },
                              { lat: animatedCourierLocation.lat, lng: animatedCourierLocation.lng },
                            ]}
                            options={{
                              strokeColor: TRACKING_ROUTE_COLOR,
                              strokeOpacity: 0.92,
                              strokeWeight: 4,
                              geodesic: true,
                            }}
                          />
                        )}

                        {animatedCourierLocation && (
                          <OverlayViewF
                            position={{ lat: animatedCourierLocation.lat, lng: animatedCourierLocation.lng }}
                            mapPaneName={OverlayView.OVERLAY_LAYER}
                            getPixelPositionOffset={() => ({ x: -36, y: -36 })}
                          >
                            <div className="tracking-map-pulse" />
                          </OverlayViewF>
                        )}
                        
                        {animatedCourierLocation && (
                          <Marker
                            position={{ lat: animatedCourierLocation.lat, lng: animatedCourierLocation.lng }}
                            icon={courierMarkerIcon}
                            zIndex={3}
                            onClick={() => setSelectedMarker('courier')}
                          />
                        )}

                        {selectedMarker === 'package' && receiverMapPosition && (
                          <InfoWindow
                            position={receiverMapPosition}
                            onCloseClick={() => setSelectedMarker(null)}
                          >
                            <div style={{ padding: '0.5rem' }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: TRACKING_DESTINATION_COLOR }}>
                                {t.tracking.packageLocation}
                              </h4>
                              <p style={{ margin: '0', fontSize: '0.9rem', color: '#4a5568' }}>
                                {trackingResult.receiver_address}
                              </p>
                              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#718096' }}>
                                {t.tracking.status}: <strong style={{ color: getStatusColor(trackingResult.status) }}>{trackingResult.status}</strong>
                              </p>
                            </div>
                          </InfoWindow>
                        )}

                        {selectedMarker === 'courier' && animatedCourierLocation && courierLocation && (
                          <InfoWindow
                            position={{ lat: animatedCourierLocation.lat, lng: animatedCourierLocation.lng }}
                            onCloseClick={() => setSelectedMarker(null)}
                          >
                            <div style={{ padding: '0.5rem' }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: TRACKING_COURIER_COLOR }}>
                                {t.tracking.courierInfo}
                              </h4>
                              <p style={{ margin: '0.2rem 0', fontSize: '0.9rem', color: '#2d3748' }}>
                                <strong>{courierLocation.name}</strong>
                              </p>
                              <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#4a5568' }}>
                                {courierLocation.phone}
                                <br />
                                {courierLocation.vehicle}
                              </p>
                              <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#38a169' }}>
                                {t.tracking.live}
                              </p>
                            </div>
                          </InfoWindow>
                        )}
                      </GoogleMap>
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#718096'
                    }}>
                      {language === 'zh' ? '加载地图中...' : language === 'en' ? 'Loading Map...' : 'မြေပုံ တင်နေသည်...'}
                    </div>
                  )}

                    <div className="tracking-map-hud tracking-map-hud--top">
                      <div className="tracking-map-chip">
                        {t.tracking.realTimeTracking}
                        <span style={{ color: getStatusColor(trackingResult.status), fontWeight: 800 }}>
                          {trackingResult.status}
                        </span>
                      </div>
                      {courierLocation ? (
                        <div className="tracking-map-chip tracking-map-live">
                          <span className="tracking-map-live-dot" />
                          {t.tracking.live}
                        </div>
                      ) : TRACKING_LIVE_MAP_STATUSES.includes(trackingResult.status) ? (
                        <div className="tracking-map-chip">{t.tracking.courierOnTheWay}</div>
                      ) : null}
                    </div>

                    {courierLocation ? (
                      <div className="tracking-map-hud tracking-map-hud--courier">
                        <div className="tracking-map-avatar">
                          {String(courierLocation.name || trackingResult.courier || t.tracking.courier).trim().slice(0, 1).toUpperCase()}
                        </div>
                        <div className="tracking-map-courier-meta">
                          <div className="tracking-map-courier-name">
                            {courierLocation.name || trackingResult.courier}
                          </div>
                          <div className="tracking-map-courier-sub">
                            {[courierLocation.vehicle, formatTrackingAge(courierLocation.last_active, {
                              justNow: t.tracking.justNow,
                              minutesAgo: t.tracking.minutesAgo,
                              hoursAgo: t.tracking.hoursAgo,
                            })].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                    ) : TRACKING_LIVE_MAP_STATUSES.includes(trackingResult.status) ? (
                      <div className="tracking-map-hud tracking-map-hud--hint">
                        {t.tracking.courierBusyHint}
                      </div>
                    ) : null}

                    {!(TRACKING_LIVE_MAP_STATUSES.includes(trackingResult.status) && !courierLocation) ? (
                    <div className="tracking-map-hud tracking-map-hud--legend">
                      <div className="tracking-map-legend-pill">
                        <span className="tracking-map-legend-dot tracking-map-legend-dot--pkg" />
                        {t.tracking.packageLocation}
                      </div>
                      <div className="tracking-map-legend-pill">
                        <span className="tracking-map-legend-dot tracking-map-legend-dot--rider" />
                        {t.tracking.courierLocation}
                      </div>
                    </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 添加CSS动画 */}
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </>
  );

  if (embedInLanding) {
    return inner;
  }

  return <ClientInteriorShell>{inner}</ClientInteriorShell>;
};

export default TrackingPage;
