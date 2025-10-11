import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { packageService, Package } from '../services/supabase';

// Google Maps 配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY";
const GOOGLE_MAPS_LIBRARIES: any = ['places'];

// 模拟快递员数据接口
interface Courier {
  id: string;
  name: string;
  phone: string;
  status: 'online' | 'offline' | 'busy';
  latitude: number;
  longitude: number;
  currentPackages: number;
  todayDeliveries: number;
  batteryLevel?: number;
}

const RealTimeTracking: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState('yangon');
  const [mapCenter, setMapCenter] = useState({ lat: 16.8661, lng: 96.1951 }); // 仰光中心

  // 缅甸主要城市数据
  const myanmarCities = {
    yangon: { name: '仰光', nameEn: 'Yangon', nameMm: 'ရန်ကုန်', lat: 16.8661, lng: 96.1951 },
    mandalay: { name: '曼德勒', nameEn: 'Mandalay', nameMm: 'မန္တလေး', lat: 21.9588, lng: 96.0891 },
    naypyidaw: { name: '内比都', nameEn: 'Naypyidaw', nameMm: 'နေပြည်တော်', lat: 19.7633, lng: 96.0785 },
    bago: { name: '勃固', nameEn: 'Bago', nameMm: 'ပဲခူး', lat: 17.3350, lng: 96.4809 },
    mawlamyine: { name: '毛淡棉', nameEn: 'Mawlamyine', nameMm: 'မော်လမြိုင်', lat: 16.4919, lng: 97.6278 },
    pathein: { name: '勃生', nameEn: 'Pathein', nameMm: 'ပုသိမ်', lat: 16.7791, lng: 94.7325 },
    monywa: { name: '蒙育瓦', nameEn: 'Monywa', nameMm: 'မုံရွာ', lat: 22.1086, lng: 95.1358 },
    myitkyina: { name: '密支那', nameEn: 'Myitkyina', nameMm: 'မြစ်ကြီးနား', lat: 25.3833, lng: 97.3964 },
    taunggyi: { name: '东枝', nameEn: 'Taunggyi', nameMm: 'တောင်ကြီး', lat: 20.7833, lng: 97.0333 },
    sittwe: { name: '实兑', nameEn: 'Sittwe', nameMm: 'စစ်တွေ', lat: 20.1500, lng: 92.9000 }
  };

  // 加载 Google Maps
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  // 加载包裹数据
  useEffect(() => {
    loadPackages();
    loadCouriers();
    
    // 每30秒刷新一次数据
    const interval = setInterval(() => {
      loadPackages();
      loadCouriers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadPackages = async () => {
    const data = await packageService.getAllPackages();
    // 只显示待分配和配送中的包裹
    const activePackages = data.filter(p => 
      p.status === '待取件' || p.status === '已取件' || p.status === '配送中'
    );
    setPackages(activePackages);
  };

  const loadCouriers = () => {
    // 模拟快递员数据（实际应该从数据库获取）
    const mockCouriers: Courier[] = [
      {
        id: 'C001',
        name: '张三',
        phone: '09-123456789',
        status: 'online',
        latitude: 16.8661 + (Math.random() - 0.5) * 0.05,
        longitude: 96.1951 + (Math.random() - 0.5) * 0.05,
        currentPackages: 3,
        todayDeliveries: 12,
        batteryLevel: 85
      },
      {
        id: 'C002',
        name: '李四',
        phone: '09-987654321',
        status: 'online',
        latitude: 16.8661 + (Math.random() - 0.5) * 0.05,
        longitude: 96.1951 + (Math.random() - 0.5) * 0.05,
        currentPackages: 2,
        todayDeliveries: 15,
        batteryLevel: 92
      },
      {
        id: 'C003',
        name: '王五',
        phone: '09-555666777',
        status: 'busy',
        latitude: 16.8661 + (Math.random() - 0.5) * 0.05,
        longitude: 96.1951 + (Math.random() - 0.5) * 0.05,
        currentPackages: 5,
        todayDeliveries: 8,
        batteryLevel: 45
      },
      {
        id: 'C004',
        name: '赵六',
        phone: '09-888999000',
        status: 'offline',
        latitude: 16.8661 + (Math.random() - 0.5) * 0.05,
        longitude: 96.1951 + (Math.random() - 0.5) * 0.05,
        currentPackages: 0,
        todayDeliveries: 20,
        batteryLevel: 100
      }
    ];
    setCouriers(mockCouriers);
  };

  // 自动分配包裹
  const autoAssignPackage = async (packageData: Package) => {
    // 找到在线且当前包裹最少的快递员
    const availableCouriers = couriers
      .filter(c => c.status === 'online')
      .sort((a, b) => a.currentPackages - b.currentPackages);

    if (availableCouriers.length === 0) {
      alert('当前没有在线的快递员，请稍后再试');
      return;
    }

    const bestCourier = availableCouriers[0];
    await assignPackageToCourier(packageData, bestCourier);
  };

  // 手动分配包裹
  const assignPackageToCourier = async (packageData: Package, courier: Courier) => {
    try {
      // 更新包裹状态
      const success = await packageService.updatePackageStatus(
        packageData.id,
        '已取件',
        new Date().toLocaleString('zh-CN'),
        undefined,
        courier.name
      );

      if (success) {
        alert(`包裹 ${packageData.id} 已成功分配给快递员 ${courier.name}`);
        setShowAssignModal(false);
        setSelectedPackage(null);
        loadPackages();
        
        // 更新快递员的包裹数（实际应该从后端更新）
        setCouriers(prev => prev.map(c => 
          c.id === courier.id 
            ? { ...c, currentPackages: c.currentPackages + 1 }
            : c
        ));
      } else {
        alert('分配失败，请重试');
      }
    } catch (error) {
      console.error('分配包裹失败:', error);
      alert('分配失败，请重试');
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
    setSelectedCity(cityKey);
    const city = myanmarCities[cityKey as keyof typeof myanmarCities];
    if (city) {
      setMapCenter({ lat: city.lat, lng: city.lng });
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ 
            background: '#10b981', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '8px',
            fontWeight: 'bold'
          }}>
            🟢 在线: {couriers.filter(c => c.status === 'online').length}
          </div>
          <div style={{ 
            background: '#f59e0b', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '8px',
            fontWeight: 'bold'
          }}>
            🟠 忙碌: {couriers.filter(c => c.status === 'busy').length}
          </div>
          <div style={{ 
            background: '#ef4444', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '8px',
            fontWeight: 'bold'
          }}>
            📦 待分配: {packages.filter(p => p.status === '待取件').length}
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
          <h2 style={{ marginTop: 0, color: '#1f2937' }}>🗺️ 快递员实时位置</h2>
          
          <div style={{ 
            width: '100%', 
            height: '600px', 
            borderRadius: '10px', 
            overflow: 'hidden',
            border: '2px solid #e5e7eb',
            position: 'relative'
          }}>
            {/* 城市选择器 */}
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

            {!isMapLoaded ? (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
                color: '#6b7280'
              }}>
                <div>🌍 地图加载中...</div>
              </div>
            ) : (
              <GoogleMap
                key={selectedCity}
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={13}
                options={{
                  fullscreenControl: true,
                  fullscreenControlOptions: {
                    position: window.google.maps.ControlPosition.TOP_RIGHT
                  },
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
                {couriers.map(courier => (
                  <Marker
                    key={courier.id}
                    position={{ lat: courier.latitude, lng: courier.longitude }}
                    icon={{
                      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="18" fill="${getCourierStatusColor(courier.status)}" stroke="white" stroke-width="3"/>
                          <text x="20" y="26" text-anchor="middle" fill="white" font-size="20" font-weight="bold">🏍️</text>
                        </svg>
                      `)}`,
                      scaledSize: new window.google.maps.Size(40, 40)
                    }}
                    onClick={() => setSelectedCourier(courier)}
                  />
                ))}

                {/* 信息窗口 */}
                {selectedCourier && (
                  <InfoWindow
                    position={{ lat: selectedCourier.latitude, lng: selectedCourier.longitude }}
                    onCloseClick={() => setSelectedCourier(null)}
                  >
                    <div style={{ padding: '0.5rem' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>
                        {selectedCourier.name}
                      </h3>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
                        📱 {selectedCourier.phone}
                      </p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
                        📦 当前包裹: {selectedCourier.currentPackages}
                      </p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
                        ✅ 今日完成: {selectedCourier.todayDeliveries}
                      </p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
                        🔋 电量: {selectedCourier.batteryLevel}%
                      </p>
                      <div style={{ 
                        marginTop: '0.5rem',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '5px',
                        background: getCourierStatusColor(selectedCourier.status),
                        color: 'white',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}>
                        {getCourierStatusText(selectedCourier.status)}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
        </div>

        {/* 右侧：待分配包裹列表 */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '1.5rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          maxHeight: '700px',
          overflow: 'auto'
        }}>
          <h2 style={{ marginTop: 0, color: '#1f2937' }}>📦 待分配包裹</h2>

          {packages.filter(p => p.status === '待取件').length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <p>当前没有待分配的包裹</p>
            </div>
          ) : (
            packages
              .filter(p => p.status === '待取件')
              .map(pkg => (
                <div
                  key={pkg.id}
                  style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    padding: '1rem',
                    borderRadius: '10px',
                    marginBottom: '1rem',
                    border: '2px solid #bae6fd'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <strong style={{ color: '#0369a1' }}>{pkg.id}</strong>
                    <span style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '5px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      {pkg.status}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.6' }}>
                    <p style={{ margin: '0.3rem 0' }}>
                      📍 从: {pkg.sender_address}
                    </p>
                    <p style={{ margin: '0.3rem 0' }}>
                      📍 到: {pkg.receiver_address}
                    </p>
                    <p style={{ margin: '0.3rem 0' }}>
                      📦 类型: {pkg.package_type} ({pkg.weight})
                    </p>
                    {pkg.delivery_distance && (
                      <p style={{ margin: '0.3rem 0' }}>
                        🚗 距离: {pkg.delivery_distance} km
                      </p>
                    )}
                    <p style={{ margin: '0.3rem 0' }}>
                      💰 价格: {pkg.price}
                    </p>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem',
                    marginTop: '1rem'
                  }}>
                    <button
                      onClick={() => autoAssignPackage(pkg)}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}
                    >
                      🤖 自动分配
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
                  </div>
                </div>
              ))
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

            {couriers
              .filter(c => c.status !== 'offline')
              .map(courier => (
                <div
                  key={courier.id}
                  style={{
                    background: courier.status === 'online' ? '#f0fdf4' : '#fef3c7',
                    border: `2px solid ${courier.status === 'online' ? '#86efac' : '#fde68a'}`,
                    padding: '1rem',
                    borderRadius: '10px',
                    marginBottom: '1rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => assignPackageToCourier(selectedPackage, courier)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>{courier.name}</h3>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.9rem', color: '#6b7280' }}>
                        📱 {courier.phone}
                      </p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.9rem', color: '#6b7280' }}>
                        📦 当前包裹: {courier.currentPackages} | ✅ 今日完成: {courier.todayDeliveries}
                      </p>
                    </div>
                    <div style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      background: getCourierStatusColor(courier.status),
                      color: 'white',
                      fontWeight: 'bold'
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

