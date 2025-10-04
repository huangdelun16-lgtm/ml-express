import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadScript, GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { trackingService, TrackingEvent, CourierLocation, Package } from '../services/supabase';
import { useRealTimeTracking } from '../hooks/useRealTimeTracking';

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Google Maps Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15,32,60,0.6)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>地图加载失败</h3>
          <p style={{ margin: '0', opacity: 0.8, textAlign: 'center' }}>
            Google Maps API 配置问题<br/>
            请检查 API Key 设置
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

interface PackageWithStatus extends Package {
  tracking_events?: TrackingEvent[];
  courier_location?: CourierLocation | null;
}

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '20px',
  overflow: 'hidden'
};

const TrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const {
    packages,
    courierLocations,
    couriers, // 添加骑手详细信息
    trackingEvents,
    loading,
    error,
    lastUpdate,
    refreshData,
    initializeCourierData,
    simulateCourierMovement
  } = useRealTimeTracking({
    refreshInterval: 15000,
    autoRefresh: true,
    selectedPackageId: selectedPackageId || undefined
  });

  const googleMapsApiKey = useMemo(() => process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY", []);
  
  useEffect(() => {
    document.title = '实时跟踪 | 管理后台';
  }, []);

  // 处理初始化骑手数据
  const handleInitializeCourierData = useCallback(async () => {
    if (!window.confirm('确定要初始化骑手位置数据吗？\n\n这将为所有活跃骑手生成模拟位置数据用于演示。')) {
      return;
    }

    setInitializing(true);
    try {
      await initializeCourierData();
      alert('✅ 骑手位置数据初始化成功！\n\n现在可以在地图上看到骑手位置了。');
    } catch (error) {
      console.error('初始化骑手数据失败:', error);
      alert('初始化失败，请稍后重试');
    } finally {
      setInitializing(false);
    }
  }, [initializeCourierData]);

  // 处理模拟骑手移动
  const handleSimulateCourierMovement = useCallback(async () => {
    if (courierLocations.length === 0) {
      alert('没有找到骑手位置数据\n\n请先点击"初始化骑手数据"按钮。');
      return;
    }

    try {
      await simulateCourierMovement();
      console.log('骑手位置已更新');
    } catch (error) {
      console.error('模拟骑手移动失败:', error);
    }
  }, [courierLocations.length, simulateCourierMovement]);

  // 计算当前包裹信息
  const currentPackage = useMemo(() => {
    return selectedPackageId ? packages.find(pkg => pkg.id === selectedPackageId) : null;
  }, [selectedPackageId, packages]);

  // 计算当前快递员位置
  const currentCourierLocation = useMemo(() => {
    if (!currentPackage?.courier) return null;
    return courierLocations.find(loc => loc.courier_id === currentPackage.courier) || null;
  }, [currentPackage, courierLocations]);

  // 计算地图中心点
  const defaultCenter = useMemo(() => ({ lat: 39.9042, lng: 116.4074 }), []);
  
  const mapCenter = useMemo(() => {
    if (currentCourierLocation) {
      return {
        lat: currentCourierLocation.latitude,
        lng: currentCourierLocation.longitude
      };
    }
    if (courierLocations.length > 0) {
      const avgLat = courierLocations.reduce((sum, loc) => sum + loc.latitude, 0) / courierLocations.length;
      const avgLng = courierLocations.reduce((sum, loc) => sum + loc.longitude, 0) / courierLocations.length;
      return { lat: avgLat, lng: avgLng };
    }
    return defaultCenter;
  }, [currentCourierLocation, courierLocations, defaultCenter]);

  // 计算跟踪路径
  const trackingPath = useMemo(() => {
    if (!selectedPackageId || trackingEvents.length === 0) return [];
    
    return trackingEvents
      .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime())
      .map(event => ({
        lat: event.latitude,
        lng: event.longitude
      }));
  }, [selectedPackageId, trackingEvents]);

  // 计算快递员标记
  const courierMarkers = useMemo(() => {
    return courierLocations.map(location => ({
      id: location.id,
      position: { lat: location.latitude, lng: location.longitude },
      title: `骑手 ${location.courier_id}`,
      status: location.status,
      lastUpdate: location.last_update
    }));
  }, [courierLocations]);

  // 计算包裹事件标记
  const packageEventMarkers = useMemo(() => {
    return trackingEvents.map(event => ({
      id: event.id,
      position: { lat: event.latitude, lng: event.longitude },
      title: event.status,
      time: event.event_time
    }));
  }, [trackingEvents]);

  // 处理选择包裹
  const handleSelectPackage = useCallback((packageId: string) => {
    setSelectedPackageId(packageId);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '24px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        {/* 页面标题和操作按钮 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <h1 style={{
            color: 'white',
            fontSize: '2rem',
            fontWeight: 'bold',
            margin: 0,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            🗺️ 实时跟踪中心
          </h1>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleInitializeCourierData}
              disabled={initializing || loading}
              style={{
                background: initializing ? 'rgba(156, 163, 175, 0.8)' : 'rgba(16, 185, 129, 0.8)',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: initializing || loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s'
              }}
            >
              {initializing ? '初始化中...' : '🚀 初始化骑手数据'}
            </button>
            
            <button
              onClick={handleSimulateCourierMovement}
              disabled={loading || courierLocations.length === 0}
              style={{
                background: loading ? 'rgba(156, 163, 175, 0.8)' : 'rgba(59, 130, 246, 0.8)',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: loading || courierLocations.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s'
              }}
            >
              📍 更新骑手位置
            </button>
            
            <button
              onClick={() => navigate('/admin/dashboard')}
              style={{
                background: 'rgba(107, 114, 128, 0.8)',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s'
              }}
            >
              🏠 返回主页
            </button>
          </div>
        </div>

        {/* 状态信息栏 */}
        {(loading || error || lastUpdate) && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ color: 'white', fontSize: '0.9rem' }}>
              {loading && '🔄 数据加载中...'}
              {error && `❌ ${error}`}
              {!loading && !error && lastUpdate && (
                <>
                  ✅ 数据已更新 | 最后更新: {lastUpdate.toLocaleTimeString()}
                </>
              )}
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem'
              }}
            >
              🔄 手动刷新
            </button>
          </div>
        )}

        {/* 主要内容区域 */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', minHeight: '600px' }}>
          {/* 左侧边栏 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 进行中的包裹 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h2 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '12px' }}>📦 进行中的包裹</h2>
              {packages.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '20px 0' }}>
                  暂无进行中的包裹
                </p>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {packages.map(pkg => (
                    <div
                      key={pkg.id}
                      onClick={() => handleSelectPackage(pkg.id)}
                      style={{
                        background: selectedPackageId === pkg.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.08)',
                        border: selectedPackageId === pkg.id ? '2px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: 'white'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>#{pkg.id.slice(-8)}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '4px' }}>
                        {pkg.sender_name} → {pkg.receiver_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>
                        状态: {pkg.status} | 骑手: {pkg.courier || '待分配'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 在线快递员 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h2 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '12px' }}>🚴 在线快递员</h2>
              {courierLocations.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '20px 0' }}>
                  暂无在线骑手<br />
                  <small>请先点击"初始化骑手数据"</small>
                </p>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {courierLocations.map(location => {
                    // 查找对应的骑手详细信息
                    const courierInfo = couriers.find(c => c.id === location.courier_id);
                    
                    return (
                      <div
                        key={location.id}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          padding: '12px',
                          marginBottom: '8px',
                          color: 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {courierInfo ? (
                              <div>
                                <div>{courierInfo.name}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>
                                  {courierInfo.phone} • {courierInfo.vehicle_type}
                                </div>
                              </div>
                            ) : (
                              `骑手 ${location.courier_id.slice(-6)}`
                            )}
                          </div>
                          <div style={{
                            background: location.status === 'active' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(156, 163, 175, 0.8)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.7rem'
                          }}>
                            {location.status === 'active' ? '在线' : '离线'}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '6px' }}>
                          📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px', display: 'flex', gap: '12px' }}>
                          <span>🚀 {location.speed || 0} km/h</span>
                          <span>🔋 {location.battery_level || 100}%</span>
                          {courierInfo && (
                            <span>⭐ {courierInfo.rating || 0}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px' }}>
                          更新: {new Date(location.last_update).toLocaleString()}
                        </div>
                        {courierInfo && courierInfo.notes && (
                          <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '4px', fontStyle: 'italic' }}>
                            备注: {courierInfo.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 右侧主要内容 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 地图区域 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(255,255,255,0.1)',
              height: '400px'
            }}>
              {googleMapsApiKey ? (
                <ErrorBoundary>
                  <LoadScript googleMapsApiKey={googleMapsApiKey}>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={13}
                    options={{
                      styles: [
                        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }
                      ]
                    }}
                  >
                    {/* 快递员位置标记 */}
                    {courierMarkers.map(marker => (
                      <Marker
                        key={marker.id}
                        position={marker.position}
                        title={marker.title}
                        icon={{
                          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="16" cy="16" r="12" fill="#10B981" stroke="white" stroke-width="2"/>
                              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">🚴</text>
                            </svg>
                          `),
                          scaledSize: new window.google.maps.Size(32, 32)
                        }}
                      />
                    ))}

                    {/* 包裹事件标记 */}
                    {packageEventMarkers.map(marker => (
                      <Marker
                        key={marker.id}
                        position={marker.position}
                        title={`${marker.title} - ${marker.time}`}
                        icon={{
                          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                              <text x="12" y="16" text-anchor="middle" fill="white" font-size="10">📦</text>
                            </svg>
                          `),
                          scaledSize: new window.google.maps.Size(24, 24)
                        }}
                      />
                    ))}

                    {/* 跟踪路径 */}
                    {trackingPath.length > 1 && (
                      <Polyline
                        path={trackingPath}
                        options={{
                          strokeColor: '#F59E0B',
                          strokeOpacity: 0.8,
                          strokeWeight: 4
                        }}
                      />
                    )}
                  </GoogleMap>
                </LoadScript>
                </ErrorBoundary>
              ) : (
                <div style={{ ...mapContainerStyle, background: 'rgba(15,32,60,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '0 20px' }}>
                    未检测到 Google Maps API Key，请先在 `.env.local` 和 Netlify 环境变量中配置 `REACT_APP_GOOGLE_MAPS_API_KEY`。
                  </p>
                </div>
              )}
            </div>

            {/* 配送详情 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h2 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '12px' }}>配送详情</h2>
              {currentPackage ? (
                <div style={{ color: 'white', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', opacity: 0.9 }}>包裹信息</h3>
                    <p style={{ margin: '6px 0' }}>包裹编号：{currentPackage.id}</p>
                    <p style={{ margin: '6px 0' }}>寄件人：{currentPackage.sender_name}</p>
                    <p style={{ margin: '6px 0' }}>收件人：{currentPackage.receiver_name}</p>
                    <p style={{ margin: '6px 0' }}>状态：{currentPackage.status}</p>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', opacity: 0.9 }}>快递员</h3>
                    <p style={{ margin: '6px 0' }}>负责快递员：{currentPackage.courier || '待分配'}</p>
                    {currentCourierLocation ? (
                      <>
                        <p style={{ margin: '6px 0' }}>当前位置：{currentCourierLocation.latitude.toFixed(5)}, {currentCourierLocation.longitude.toFixed(5)}</p>
                        <p style={{ margin: '6px 0' }}>最后上报：{currentCourierLocation.last_update}</p>
                      </>
                    ) : (
                      <p style={{ margin: '6px 0' }}>暂无位置数据</p>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>请选择左侧列表中的包裹查看详情</p>
              )}
            </div>

            {/* 实时事件 & 轨迹 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h2 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '12px' }}>实时事件 & 轨迹</h2>
              {selectedPackageId ? (
                trackingEvents.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>暂无轨迹记录</p>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px' }}>
                    {trackingEvents.map(event => (
                      <li key={event.id} style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'white'
                      }}>
                        <div style={{ fontWeight: 600 }}>{event.status}</div>
                        <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>时间：{event.event_time}</div>
                        <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>位置：{event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}</div>
                        {event.note && (
                          <div style={{ marginTop: '4px', fontSize: '0.9rem', opacity: 0.85 }}>备注：{event.note}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>请选择包裹后显示轨迹记录</p>
              )}
            </div>
          </div>
        </div>

        {/* 骑手连接状态 */}
        <div style={{
          marginTop: '20px',
          padding: '18px',
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white'
        }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>🔗 骑手连接状态</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px',
            marginBottom: '15px'
          }}>
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.2)', 
              padding: '12px', 
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{courierLocations.length}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>在线骑手</div>
            </div>
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.2)', 
              padding: '12px', 
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{packages.length}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>活跃包裹</div>
            </div>
            <div style={{ 
              background: 'rgba(168, 85, 247, 0.2)', 
              padding: '12px', 
              borderRadius: '8px',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{trackingEvents.length}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>跟踪事件</div>
            </div>
          </div>
          <div style={{ opacity: 0.85, fontSize: '0.9rem', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 8px 0' }}>
              ✅ <strong>Google Maps 已集成：</strong>支持实时地图显示和路径跟踪
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              ✅ <strong>数据库表已配置：</strong>courier_locations 和 tracking_events 表正常工作
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              ✅ <strong>骑手账号已连接：</strong>可从"快递员管理"导入骑手到跟踪系统
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              🔄 <strong>自动更新：</strong>每15秒刷新数据，每30秒模拟骑手移动
            </p>
            <p style={{ margin: 0 }}>
              📱 <strong>移动端支持：</strong>骑手可通过API上报位置（/api/courier/location）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;