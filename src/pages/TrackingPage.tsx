import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadScript, GoogleMap, Marker, Polyline } from '@react-google-maps/api';
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

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '20px',
  overflow: 'hidden'
};

const TrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const {
    packages,
    courierLocations,
    couriers,
    trackingEvents,
    loading,
    error,
    lastUpdate,
    refreshData,
    initializeCourierData,
    simulateCourierMovement
  } = useRealTimeTracking({
    refreshInterval: 30000,
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
          <div>
            <h1 style={{ color: 'white', fontSize: '2rem', margin: '0 0 8px 0', fontWeight: 'bold' }}>
              🗺️ 实时跟踪中心
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '1rem' }}>
              实时监控快递员位置和包裹配送状态
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleInitializeCourierData}
              disabled={initializing}
              style={{
                background: initializing ? 'rgba(156, 163, 175, 0.8)' : 'rgba(16, 185, 129, 0.8)',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: initializing ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s'
              }}
            >
              {initializing ? '🔄 初始化中...' : '🎯 初始化骑手数据'}
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
              onClick={() => navigate('/')}
              style={{
                background: 'rgba(239, 68, 68, 0.8)',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>🏠</span> 返回主页
            </button>
          </div>
        </div>

        {/* 状态栏 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
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
              background: 'rgba(59, 130, 246, 0.6)',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}
          >
            🔄 手动刷新
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginTop: '24px' }}>
          {/* 左侧面板 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                        background: selectedPackageId === pkg.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.08)',
                        border: selectedPackageId === pkg.id ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '10px',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        color: 'white',
                        transition: 'all 0.2s'
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

            {/* 增强的在线快递员模块 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ color: 'white', fontSize: '1.2rem', margin: 0 }}>🚴 在线快递员</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                    {courierLocations.length} 人在线
                  </span>
                  <button
                    onClick={refreshData}
                    style={{
                      background: 'rgba(59, 130, 246, 0.6)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 刷新
                  </button>
                </div>
              </div>

              {courierLocations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚴‍♂️</div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 8px 0' }}>
                    暂无在线骑手
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
                    等待骑手上线或点击"初始化骑手数据"
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {courierLocations.map(location => {
                    const courierInfo = couriers.find(c => c.id === location.courier_id);
                    const taskCount = packages.filter(pkg => 
                      pkg.courier === location.courier_id && 
                      ['待取件', '已取件', '配送中'].includes(pkg.status)
                    ).length;
                    
                    const getStatusInfo = (status: string) => {
                      switch (status) {
                        case 'online':
                          return { color: 'rgba(16, 185, 129, 0.8)', text: '在线', icon: '🟢' };
                        case 'busy':
                          return { color: 'rgba(245, 158, 11, 0.8)', text: '忙碌', icon: '🟡' };
                        case 'offline':
                          return { color: 'rgba(156, 163, 175, 0.8)', text: '离线', icon: '⚫' };
                        default:
                          return { color: 'rgba(156, 163, 175, 0.8)', text: '未知', icon: '❓' };
                      }
                    };
                    
                    const statusInfo = getStatusInfo(location.status);
                    const isSelected = selectedCourierId === location.courier_id;
                    
                    return (
                      <div
                        key={location.id}
                        style={{
                          background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.08)',
                          border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '12px',
                          padding: '14px',
                          marginBottom: '10px',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => setSelectedCourierId(isSelected ? null : location.courier_id)}
                      >
                        {/* 骑手基本信息 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '1.1rem' }}>{statusInfo.icon}</span>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                {courierInfo ? courierInfo.name : `骑手 ${location.courier_id.slice(-6)}`}
                              </div>
                              <div style={{
                                background: statusInfo.color,
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '0.65rem',
                                fontWeight: '500'
                              }}>
                                {statusInfo.text}
                              </div>
                            </div>
                            {courierInfo && (
                              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px' }}>
                                📞 {courierInfo.phone} • 🚲 {courierInfo.vehicle_type}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              background: taskCount > 0 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(16, 185, 129, 0.8)',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '8px',
                              fontSize: '0.7rem',
                              fontWeight: '600'
                            }}>
                              📦 {taskCount} 任务
                            </div>
                          </div>
                        </div>

                        {/* 位置和状态信息 */}
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '8px' }}>
                          <div style={{ marginBottom: '2px' }}>
                            📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <span>🚀 {location.speed || 0} km/h</span>
                            <span>🔋 {location.battery_level || 100}%</span>
                            {courierInfo && (
                              <span>⭐ {courierInfo.rating || 5.0}</span>
                            )}
                            <span>🕒 {new Date(location.last_update).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {/* 展开的操作面板 */}
                        {isSelected && (
                          <div style={{
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            paddingTop: '12px',
                            marginTop: '8px'
                          }}>
                            {/* 快捷操作按钮 */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const courier = couriers.find(c => c.id === location.courier_id);
                                  if (courier?.phone) {
                                    window.open(`tel:${courier.phone}`);
                                  }
                                }}
                                style={{
                                  background: 'rgba(16, 185, 129, 0.8)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: 'white',
                                  padding: '6px 10px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                📞 呼叫
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert('消息功能开发中...');
                                }}
                                style={{
                                  background: 'rgba(59, 130, 246, 0.8)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: 'white',
                                  padding: '6px 10px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                💬 消息
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/courier-history/${location.courier_id}`);
                                }}
                                style={{
                                  background: 'rgba(168, 85, 247, 0.8)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: 'white',
                                  padding: '6px 10px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                📊 历史
                              </button>
                            </div>

                            {/* 当前任务列表 */}
                            {taskCount > 0 && (
                              <div style={{ marginTop: '8px' }}>
                                <div style={{ fontSize: '0.75rem', marginBottom: '6px', opacity: 0.9 }}>
                                  🎯 当前任务 ({taskCount}):
                                </div>
                                <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
                                  {packages
                                    .filter(pkg => pkg.courier === location.courier_id && ['待取件', '已取件', '配送中'].includes(pkg.status))
                                    .map(pkg => (
                                      <div
                                        key={pkg.id}
                                        style={{
                                          background: 'rgba(16, 185, 129, 0.1)',
                                          border: '1px solid rgba(16, 185, 129, 0.3)',
                                          borderRadius: '6px',
                                          padding: '4px 6px',
                                          marginBottom: '3px',
                                          fontSize: '0.65rem',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <span>#{pkg.id.slice(-6)} - {pkg.status}</span>
                                        <span style={{ opacity: 0.7 }}>
                                          {pkg.receiver_name}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* 备注信息 */}
                            {courierInfo?.notes && (
                              <div style={{
                                fontSize: '0.7rem',
                                opacity: 0.6,
                                marginTop: '8px',
                                fontStyle: 'italic',
                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                paddingTop: '6px'
                              }}>
                                💡 备注: {courierInfo.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 底部统计信息 */}
              {courierLocations.length > 0 && (
                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  paddingTop: '12px',
                  marginTop: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: '8px',
                  fontSize: '0.7rem'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(16, 185, 129, 1)', fontWeight: 'bold' }}>
                      {courierLocations.filter(c => c.status === 'online').length}
                    </div>
                    <div style={{ opacity: 0.7 }}>在线</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(245, 158, 11, 1)', fontWeight: 'bold' }}>
                      {courierLocations.filter(c => c.status === 'busy').length}
                    </div>
                    <div style={{ opacity: 0.7 }}>忙碌</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(59, 130, 246, 1)', fontWeight: 'bold' }}>
                      {packages.filter(p => ['待取件', '已取件', '配送中'].includes(p.status)).length}
                    </div>
                    <div style={{ opacity: 0.7 }}>任务</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(168, 85, 247, 1)', fontWeight: 'bold' }}>
                      {Math.round(courierLocations.reduce((sum, c) => sum + (c.speed || 0), 0) / courierLocations.length) || 0}
                    </div>
                    <div style={{ opacity: 0.7 }}>平均速度</div>
                  </div>
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
                    {/* 快递员标记 */}
                    {courierMarkers.map(marker => (
                      <Marker
                        key={marker.id}
                        position={marker.position}
                        title={marker.title}
                        icon={{
                          url: `data:image/svg+xml,${encodeURIComponent(`
                            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="16" cy="16" r="15" fill="${marker.status === 'online' ? '#10b981' : '#f59e0b'}" stroke="white" stroke-width="2"/>
                              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">🚴</text>
                            </svg>
                          `)}`,
                          scaledSize: new window.google.maps.Size(32, 32)
                        }}
                      />
                    ))}

                    {/* 跟踪路径 */}
                    {trackingPath.length > 1 && (
                      <Polyline
                        path={trackingPath}
                        options={{
                          strokeColor: '#3b82f6',
                          strokeOpacity: 0.8,
                          strokeWeight: 3
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
              <h2 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '12px' }}>📍 实时轨迹</h2>
              {trackingEvents.length > 0 ? (
                <ul style={{ color: 'white', listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                  {trackingEvents
                    .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
                    .map(event => (
                      <li key={event.id} style={{ 
                        padding: '8px 0', 
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        fontSize: '0.9rem'
                      }}>
                        <div style={{ fontWeight: 600 }}>{event.status}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>
                          📍 {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '2px' }}>
                          🕒 {new Date(event.event_time).toLocaleString()}
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>请选择包裹后显示轨迹记录</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;