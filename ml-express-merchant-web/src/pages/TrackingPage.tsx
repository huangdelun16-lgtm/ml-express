import React, { useState, useEffect, useRef } from 'react';
import LoggerService from '../services/LoggerService';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { packageService, supabase } from '../services/supabase';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';

// Google Maps API 配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
if (!GOOGLE_MAPS_API_KEY) {
  LoggerService.error('❌ Google Maps API Key 未配置！请检查环境变量 REACT_APP_GOOGLE_MAPS_API_KEY');
}
const GOOGLE_MAPS_LIBRARIES: any = ['places'];

const TrackingPage: React.FC = () => {
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

  const [mapCenter, setMapCenter] = useState({ lat: 16.8661, lng: 96.1951 }); // 仰光中心
  const [selectedMarker, setSelectedMarker] = useState<'package' | 'courier' | null>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]); // 🚀 新增：进行中的订单列表
  const [loadingActiveOrders, setLoadingActiveOrders] = useState(false); // 🚀 新增：加载状态

  useEffect(() => {
    setIsVisible(true);
    loadUserFromStorage();
  }, []);

  // 🚀 新增：当用户信息加载后，拉取进行中的订单
  useEffect(() => {
    if (currentUser) {
      loadActiveOrders();
    }
  }, [currentUser]);

  // 🚀 新增：加载进行中的订单列表
  const loadActiveOrders = async () => {
    if (!currentUser) return;
    setLoadingActiveOrders(true);
    try {
      // 这里的逻辑参考 ProfilePage 的拉取逻辑，确保数据一致
      const packages = await packageService.getPackagesByUser(
        currentUser.email,
        currentUser.phone,
        undefined,
        currentUser.user_type === 'merchant' ? (currentUser.store_id || currentUser.id) : undefined,
        currentUser.id,
        currentUser.user_type === 'merchant' ? currentUser.name : undefined
      );
      
      // 过滤出进行中的订单（非已送达、非已取消，且排除“顺路递”）
      const excludedStatuses = ['已送达', '已取消', 'Delivered', 'Cancelled'];
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
  };

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

    const activeStatuses = ['待确认', '待取件', '已取件', '打包中', '配送中', '待收款', '异常上报'];
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
              // 自动调整地图中心到骑手位置
              setMapCenter({ lat: locData.latitude, lng: locData.longitude });
              
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
  }, [trackingResult]);

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

  const onRefresh = () => {
    loadActiveOrders();
    if (trackingNumber) {
      handleTrackingInternal(trackingNumber);
    }
  };

  const handleTracking = async () => {
    handleTrackingInternal(trackingNumber);
  };

  const handleTrackingInternal = async (number: string) => {
    if (!number.trim()) {
      alert(language === 'zh' ? '请输入包裹单号' : language === 'en' ? 'Please enter tracking number' : 'ထုပ်ပိုးနံပါတ်ကို ထည့်ပါ');
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
          alert(language === 'zh' ? '该订单类型暂不支持实时跟踪' : 'Live tracking is not available for this package type');
          setLoading(false);
          return;
        }

        setTrackingResult(pkg);
        
        // 解析收件地址的坐标（如果有）
        // 这里使用 Geocoding API 获取地址坐标
        if (pkg.receiver_address && isMapLoaded) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            const response = await geocoder.geocode({ address: pkg.receiver_address });
            
            if (response.results && response.results[0]) {
              const location = response.results[0].geometry.location;
              setMapCenter({ lat: location.lat(), lng: location.lng() });
            }
          } catch (error) {
            LoggerService.error('地址解析失败:', error);
          }
        }
        // 加载快递员位置
        if (pkg.courier) {
          // 由于已改为实时订阅，这里可以保持逻辑
        }
      } else {
        alert(t.tracking.notFound);
        setTrackingResult(null);
        setCourierLocation(null);
      }
    } catch (error) {
      LoggerService.error('查询失败:', error);
      alert(language === 'zh' ? '查询失败，请稍后重试' : language === 'en' ? 'Query failed, please try again later' : 'ရှာဖွေမှု မအောင်မြင်ပါ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件':
      case 'Pending Pickup':
        return '#f39c12';
      case '已取件':
      case 'Picked Up':
        return '#3498db';
      case '配送中':
      case 'In Delivery':
        return '#9b59b6';
      case '已送达':
      case 'Delivered':
        return '#27ae60';
      case '已取消':
      case 'Cancelled':
        return '#95a5a6';
      default:
        return '#2c5282';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      position: 'relative',
      overflow: 'hidden',
      padding: window.innerWidth < 768 ? '12px' : '20px'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: '5%',
        right: '5%',
        width: '200px',
        height: '200px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        zIndex: 1
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '5%',
        left: '5%',
        width: '150px',
        height: '150px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        filter: 'blur(30px)',
        zIndex: 1
      }}></div>

      {/* 导航栏 */}
      <NavigationBar
        language={language}
        onLanguageChange={handleLanguageChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        onShowRegisterModal={(isLoginMode) => {
          navigate('/', { state: { showModal: true, isLoginMode } });
        }} 
        
      />
      {/* 搜索区域 */}

      {/* 主要内容区域 */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-in-out',
        color: 'white'
      }}>
        {/* 页面标题 */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: window.innerWidth < 768 ? '2rem' : '3rem',
            marginBottom: '0.5rem',
            fontWeight: '800',
            textShadow: '2px 2px 8px rgba(0,0,0,0.3)',
            letterSpacing: '-1px'
          }}>
            {t.tracking.title}
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
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
                <div style={{
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(20px)',
                  padding: '2rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ 
                    color: '#2c5282', 
                    marginBottom: '1rem', 
                    fontSize: '1.2rem',
                    fontWeight: '700'
                  }}>
                    🗺️ {t.tracking.realTimeTracking}
                  </h3>
                  
                  {isMapLoaded ? (
                    <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={mapCenter}
                        zoom={13}
                        options={{
                          zoomControl: true,
                          streetViewControl: false,
                          mapTypeControl: false,
                          fullscreenControl: true
                        }}
                      >
                        {/* 包裹位置标记 */}
                        <Marker
                          position={mapCenter}
                          icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${getStatusColor(trackingResult.status)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                              </svg>
                            `),
                            scaledSize: new window.google.maps.Size(40, 40),
                            anchor: new window.google.maps.Point(20, 20)
                          }}
                          onClick={() => setSelectedMarker('package')}
                        />
                        
                        {/* 快递员位置标记 (使用动画坐标实现平滑移动) */}
                        {animatedCourierLocation && (
                          <Marker
                            position={{ lat: animatedCourierLocation.lat, lng: animatedCourierLocation.lng }}
                            icon={{
                              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <circle cx="12" cy="12" r="10" fill="#fff"/>
                                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                                </svg>
                              `),
                              scaledSize: new window.google.maps.Size(50, 50),
                              anchor: new window.google.maps.Point(25, 25)
                            }}
                            onClick={() => setSelectedMarker('courier')}
                          />
                        )}

                        {/* 包裹信息窗口 */}
                        {selectedMarker === 'package' && (
                          <InfoWindow
                            position={mapCenter}
                            onCloseClick={() => setSelectedMarker(null)}
                          >
                            <div style={{ padding: '0.5rem' }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: '#2c5282' }}>
                                📦 {t.tracking.packageLocation}
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

                        {/* 快递员信息窗口 */}
                        {selectedMarker === 'courier' && animatedCourierLocation && (
                          <InfoWindow
                            position={{ lat: animatedCourierLocation.lat, lng: animatedCourierLocation.lng }}
                            onCloseClick={() => setSelectedMarker(null)}
                          >
                            <div style={{ padding: '0.5rem' }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: '#e53e3e' }}>
                                🏍️ {t.tracking.courierInfo}
                              </h4>
                              <p style={{ margin: '0.2rem 0', fontSize: '0.9rem', color: '#2d3748' }}>
                                <strong>{courierLocation.name}</strong>
                              </p>
                              <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#4a5568' }}>
                                📱 {courierLocation.phone}
                                <br />
                                🚗 {courierLocation.vehicle}
                              </p>
                              <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#38a169' }}>
                                ● {language === 'zh' ? '实时在线' : language === 'en' ? 'Online Now' : 'အွန်လိုင်း'}
                              </p>
                            </div>
                          </InfoWindow>
                        )}
                      </GoogleMap>
                    </div>
                  ) : (
                    <div style={{ 
                      height: '500px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: '#f7fafc',
                      borderRadius: '12px',
                      color: '#718096'
                    }}>
                      {language === 'zh' ? '加载地图中...' : language === 'en' ? 'Loading Map...' : 'မြေပုံ တင်နေသည်...'}
                    </div>
                  )}

                  {/* 图例 */}
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '1rem', 
                    background: 'rgba(102, 126, 234, 0.05)',
                    borderRadius: '12px',
                    display: 'flex',
                    gap: '2rem',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        background: getStatusColor(trackingResult.status),
                        borderRadius: '50%'
                      }} />
                      <span style={{ fontSize: '0.9rem', color: '#4a5568' }}>{t.tracking.packageLocation}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        background: '#e53e3e',
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      <span style={{ fontSize: '0.9rem', color: '#4a5568' }}>{t.tracking.courierLocation}</span>
                    </div>
                  </div>

                  {/* 骑手位置信息或隐私提示 */}
                  {['待取件', '已取件', '打包中', '配送中', '待收款', '异常上报'].includes(trackingResult.status) && (
                    <>
                      {courierLocation ? (
                        <div style={{ 
                          marginTop: '1rem', 
                          padding: '0.8rem', 
                          background: 'rgba(56, 161, 105, 0.1)',
                          borderRadius: '8px',
                          textAlign: 'center',
                          color: '#38a169',
                          fontSize: '0.9rem'
                        }}>
                          🔄 {t.tracking.lastUpdate}: {new Date(courierLocation.last_active).toLocaleString(language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'my-MM')}
                        </div>
                      ) : (
                        <div style={{
                          marginTop: '1rem',
                          padding: '0.8rem',
                          background: 'rgba(237, 137, 54, 0.1)',
                          color: '#c05621',
                          fontSize: '0.9rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(237, 137, 54, 0.3)',
                          textAlign: 'center'
                        }}>
                          🔒 {language === 'zh' ? '骑手正在配送其他包裹，稍后开始配送您的包裹时即可查看位置' : 
                               language === 'en' ? 'Courier is delivering other packages. Location will be visible when delivering yours' : 
                               'ပို့ဆောင်သူသည် အခြားထုပ်ပိုးများကို ပို့ဆောင်နေသည်'}
                        </div>
                      )}
                    </>
                  )}
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
    </div>
  );
};

export default TrackingPage;
