import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { packageService, trackingService } from '../services/supabase';

// Google Maps API 配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY";
const GOOGLE_MAPS_LIBRARIES: any = ['places'];

const TrackingPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Google Maps API 加载
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });
  
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ml-express-language') || 'zh';
  });
  const [isVisible, setIsVisible] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [courierLocation, setCourierLocation] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 16.8661, lng: 96.1951 }); // 仰光中心
  const [selectedMarker, setSelectedMarker] = useState<'package' | 'courier' | null>(null);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 自动刷新快递员位置
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    
    if (trackingResult && trackingResult.courier) {
      // 立即加载一次
      loadCourierLocation(trackingResult.courier);
      
      // 每10秒刷新一次
      refreshInterval = setInterval(() => {
        loadCourierLocation(trackingResult.courier);
      }, 10000);
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [trackingResult]);

  // 加载快递员位置
  const loadCourierLocation = async (courierName: string) => {
    try {
      // 从 trackingService 获取活跃的快递员
      const couriers = await trackingService.getActiveCouriers();
      const courier = couriers.find((c: any) => c.name === courierName);
      
      if (!courier) {
        console.log('未找到快递员:', courierName);
        return;
      }
      
      // 获取快递员的位置信息
      const locations = await trackingService.getCourierLocations();
      const courierLocation = locations.find((loc: any) => loc.courier_id === courier.id);
      
      if (courierLocation) {
        setCourierLocation({
          lat: courierLocation.latitude,
          lng: courierLocation.longitude,
          name: courier.name,
          phone: courier.phone,
          vehicle: courier.vehicle_type || '摩托车',
          last_active: courierLocation.last_update
        });
      }
    } catch (error) {
      console.error('加载快递员位置失败:', error);
    }
  };

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

  const translations = {
    zh: {
      nav: {
        home: '首页',
        services: '服务',
        tracking: '包裹跟踪',
        contact: '联系我们',
        admin: '管理后台'
      },
      tracking: {
        title: '包裹跟踪',
        placeholder: '请输入包裹单号',
        track: '查询',
        notFound: '未找到包裹信息',
        packageInfo: '包裹信息',
        trackingNumber: '单号',
        status: '状态',
        location: '当前位置',
        estimatedDelivery: '预计送达',
        sender: '寄件人',
        receiver: '收件人',
        courier: '配送员',
        packageType: '包裹类型',
        weight: '重量',
        courierLocation: '快递员位置',
        packageLocation: '包裹位置',
        realTimeTracking: '实时跟踪',
        lastUpdate: '最后更新',
        courierInfo: '快递员信息',
        vehicle: '车辆',
        contactCourier: '联系快递员'
      }
    },
    en: {
      nav: {
        home: 'Home',
        services: 'Services',
        tracking: 'Tracking',
        contact: 'Contact',
        admin: 'Admin'
      },
      tracking: {
        title: 'Package Tracking',
        placeholder: 'Enter tracking number',
        track: 'Track',
        notFound: 'Package not found',
        packageInfo: 'Package Information',
        trackingNumber: 'Number',
        status: 'Status',
        location: 'Current Location',
        estimatedDelivery: 'Estimated Delivery',
        sender: 'Sender',
        receiver: 'Receiver',
        courier: 'Courier',
        packageType: 'Type',
        weight: 'Weight',
        courierLocation: 'Courier Location',
        packageLocation: 'Package Location',
        realTimeTracking: 'Real-Time Tracking',
        lastUpdate: 'Last Update',
        courierInfo: 'Courier Info',
        vehicle: 'Vehicle',
        contactCourier: 'Contact Courier'
      }
    },
    my: {
      nav: {
        home: 'ပင်မ',
        services: 'ဝန်ဆောင်မှု',
        tracking: 'ထုပ်ပိုးခြင်း',
        contact: 'ဆက်သွယ်ရန်',
        admin: 'စီမံခန့်ခွဲမှု'
      },
      tracking: {
        title: 'ထုပ်ပိုးခြင်း',
        placeholder: 'ထုပ်ပိုးနံပါတ်ကို ထည့်ပါ',
        track: 'ရှာဖွေပါ',
        notFound: 'ထုပ်ပိုးအချက်အလက် မတွေ့ပါ',
        packageInfo: 'ထုပ်ပိုးအချက်အလက်',
        trackingNumber: 'နံပါတ်',
        status: 'အခြေအနေ',
        location: 'လက်ရှိတည်နေရာ',
        estimatedDelivery: 'ပို့ဆောင်မည့်အချိန်',
        sender: 'ပို့သူ',
        receiver: 'လက်ခံသူ',
        courier: 'ပေးပို့သူ',
        packageType: 'အမျိုးအစား',
        weight: 'အလေးချိန်',
        courierLocation: 'ပေးပို့သူတည်နေရာ',
        packageLocation: 'ထုပ်ပိုးတည်နေရာ',
        realTimeTracking: 'တိုက်ရိုက်ခြေရာခံခြင်း',
        lastUpdate: 'နောက်ဆုံးအပ်ဒိတ်',
        courierInfo: 'ပေးပို့သူအချက်အလက်',
        vehicle: 'ယာဉ်',
        contactCourier: 'ပေးပို့သူကို ဆက်သွယ်ပါ'
      }
    }
  };

  const t = translations[language as keyof typeof translations] || translations.zh;

  const handleNavigation = (path: string) => {
    setIsVisible(false);
    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  const handleTracking = async () => {
    if (!trackingNumber.trim()) {
      alert(language === 'zh' ? '请输入包裹单号' : language === 'en' ? 'Please enter tracking number' : 'ထုပ်ပိုးနံပါတ်ကို ထည့်ပါ');
      return;
    }

    setLoading(true);
    try {
      // 从数据库查询包裹信息
      const packages = await packageService.getAllPackages();
      const foundPackage = packages.find(pkg => pkg.id === trackingNumber);
      
      if (foundPackage) {
        setTrackingResult(foundPackage);
        
        // 解析收件地址的坐标（如果有）
        // 这里使用 Geocoding API 获取地址坐标
        if (foundPackage.receiver_address && isMapLoaded) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            const response = await geocoder.geocode({ address: foundPackage.receiver_address });
            
            if (response.results && response.results[0]) {
              const location = response.results[0].geometry.location;
              setMapCenter({ lat: location.lat(), lng: location.lng() });
            }
          } catch (error) {
            console.error('地址解析失败:', error);
          }
        }
        
        // 加载快递员位置
        if (foundPackage.courier) {
          loadCourierLocation(foundPackage.courier);
        }
      } else {
        alert(t.tracking.notFound);
        setTrackingResult(null);
        setCourierLocation(null);
      }
    } catch (error) {
      console.error('查询失败:', error);
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
      overflow: 'hidden'
    }}>
      {/* 页面切换动画背景 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        zIndex: 1
      }} />

      {/* 导航栏 */}
      <nav style={{
        position: 'relative',
        zIndex: 10,
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        padding: window.innerWidth < 768 ? '1rem' : '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              width: window.innerWidth < 768 ? '40px' : '50px', 
              height: window.innerWidth < 768 ? '40px' : '50px' 
            }} 
          />
          <span style={{ 
            color: 'white',
            fontSize: window.innerWidth < 768 ? '1.6rem' : '2.2rem',
            fontWeight: '800',
            textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
            background: 'linear-gradient(45deg, #ffffff, #f0f8ff, #e6f3ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-1px',
            lineHeight: '1.1',
            whiteSpace: 'nowrap'
          }}>
            MARKET LINK <span style={{ fontSize: '0.6em', fontStyle: 'italic', fontWeight: '400' }}>EXPRESS</span>
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <button onClick={() => handleNavigation('/')} style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.home}</button>
          <button onClick={() => handleNavigation('/services')} style={{ 
            color: 'white',
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.services}</button>
          <button style={{ 
            color: '#FFD700', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>{t.nav.tracking}</button>
          <button onClick={() => handleNavigation('/contact')} style={{ 
            color: 'white',
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.contact}</button>
          <a href="/admin/login" style={{ 
            color: 'white',
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'rgba(255,255,255,0.2)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.3)'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >{t.nav.admin}</a>
          
          {/* 自定义语言选择器 */}
          <div style={{ position: 'relative' }} data-language-dropdown>
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '0.5rem',
                borderRadius: '5px',
                fontWeight: 'bold',
                fontSize: window.innerWidth < 768 ? '0.8rem' : '1rem',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '120px',
                justifyContent: 'space-between'
              }}
            >
              <span>{language === 'zh' ? '中文' : language === 'en' ? 'English' : 'မြန်မာ'}</span>
              <span style={{ fontSize: '0.8rem' }}>▼</span>
            </button>
            
            {showLanguageDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '5px',
                marginTop: '2px',
                zIndex: 1000,
                overflow: 'hidden'
              }}>
                {[
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' },
                  { value: 'my', label: 'မြန်မာ' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleLanguageChange(option.value);
                      setShowLanguageDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: window.innerWidth < 768 ? '0.8rem' : '1rem',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-in-out',
        padding: window.innerWidth < 768 ? '2rem 1rem' : '2rem 2rem'
      }}>
        {/* 页面标题 */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: window.innerWidth < 768 ? '2rem' : '3rem',
            color: 'white',
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

        {/* 跟踪查询区域 */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* 查询输入区域 */}
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            marginBottom: '2rem'
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
                  padding: '1.2rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  transition: 'border-color 0.3s ease',
                  background: 'white'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
              <button
                onClick={handleTracking}
                disabled={loading}
                style={{
                  background: loading ? '#cbd5e0' : 'linear-gradient(to right top, #498ab6, #428cc9, #468dda, #558cea)',
                  color: 'white',
                  border: 'none',
                  padding: '1.2rem 2.5rem',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  minWidth: window.innerWidth < 768 ? '100%' : 'auto',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease'
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
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(20px)',
                  padding: '2rem',
                  borderRadius: '20px',
                  border: '2px solid ' + getStatusColor(trackingResult.status),
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
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
                      <br />
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
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
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
                        
                        {/* 快递员位置标记 */}
                        {courierLocation && (
                          <Marker
                            position={{ lat: courierLocation.lat, lng: courierLocation.lng }}
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
                            animation={window.google.maps.Animation.BOUNCE}
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
                        {selectedMarker === 'courier' && courierLocation && (
                          <InfoWindow
                            position={{ lat: courierLocation.lat, lng: courierLocation.lng }}
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
                              </p>
                              <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#4a5568' }}>
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
                        borderRadius: '50%'
                      }} />
                      <span style={{ fontSize: '0.9rem', color: '#4a5568' }}>{t.tracking.courierLocation}</span>
                    </div>
                  </div>
                  
                  {courierLocation && (
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
