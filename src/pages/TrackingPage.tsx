import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadScript, GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { trackingService, TrackingEvent, CourierLocation, Package } from '../services/supabase';

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
  const [packages, setPackages] = useState<PackageWithStatus[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [courierLocations, setCourierLocations] = useState<CourierLocation[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const googleMapsApiKey = useMemo(() => process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '', []);
  useEffect(() => {
    document.title = '实时跟踪 | 管理后台';
  }, []);

  const loadTrackingData = useCallback(async () => {
    try {
      setLoading(true);
      const [activePackages, locations] = await Promise.all([
        trackingService.getActivePackages(),
        trackingService.getCourierLocations()
      ]);

      setPackages(activePackages as PackageWithStatus[]);
      setCourierLocations(locations);

      if (activePackages.length > 0 && !selectedPackageId) {
        setSelectedPackageId(activePackages[0].id);
      }
    } catch (error) {
      console.error('加载实时跟踪数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPackageId]);

  const loadLiveData = useCallback(async () => {
    try {
      const [locations, activePackages] = await Promise.all([
        trackingService.getCourierLocations(),
        trackingService.getActivePackages()
      ]);
      setCourierLocations(locations);
      setPackages(activePackages as PackageWithStatus[]);
    } catch (error) {
      console.error('刷新实时数据失败:', error);
    }
  }, []);

  useEffect(() => {
    loadTrackingData();
    const interval = setInterval(loadLiveData, 15000);
    return () => clearInterval(interval);
  }, [loadTrackingData, loadLiveData]);

  useEffect(() => {
    if (selectedPackageId) {
      loadTrackingTimeline(selectedPackageId);
    }
  }, [selectedPackageId]);

  const loadTrackingTimeline = async (pkgId: string) => {
    const events = await trackingService.getTrackingEvents(pkgId);
    setTrackingEvents(events);
  };

  const currentPackage = useMemo(() => {
    return packages.find(pkg => pkg.id === selectedPackageId) || null;
  }, [packages, selectedPackageId]);

  const currentCourierLocation = useMemo(() => {
    if (!currentPackage || !currentPackage.courier) return null;
    return courierLocations.find(loc => loc.courier_id === currentPackage.courier) || null;
  }, [courierLocations, currentPackage]);

  const defaultCenter = useMemo(() => ({ lat: 21.9588, lng: 96.0891 }), []);

  const mapCenter = useMemo(() => {
    if (currentCourierLocation) {
      return {
        lat: Number(currentCourierLocation.latitude) || defaultCenter.lat,
        lng: Number(currentCourierLocation.longitude) || defaultCenter.lng
      };
    }

    if (trackingEvents.length > 0) {
      const latestEvent = trackingEvents.find(event => !Number.isNaN(event.latitude) && !Number.isNaN(event.longitude));
      if (latestEvent) {
        return {
          lat: Number(latestEvent.latitude) || defaultCenter.lat,
          lng: Number(latestEvent.longitude) || defaultCenter.lng
        };
      }
    }

    return defaultCenter;
  }, [currentCourierLocation, defaultCenter, trackingEvents]);

  const trackingPath = useMemo(() => {
    const path = trackingEvents
      .filter(event => !Number.isNaN(event.latitude) && !Number.isNaN(event.longitude))
      .map(event => ({ lat: Number(event.latitude), lng: Number(event.longitude) }));

    if (path.length > 1) {
      return path.slice().reverse();
    }

    return [];
  }, [trackingEvents]);

  const courierMarkers = useMemo(() => {
    return courierLocations
      .filter(loc => !Number.isNaN(loc.latitude) && !Number.isNaN(loc.longitude))
      .map(loc => ({
        id: loc.id || loc.courier_id,
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
        status: loc.status,
        courierId: loc.courier_id
      }));
  }, [courierLocations]);

  const packageEventMarkers = useMemo(() => {
    return trackingEvents
      .filter(event => !Number.isNaN(event.latitude) && !Number.isNaN(event.longitude))
      .map(event => ({
        id: event.id,
        lat: Number(event.latitude),
        lng: Number(event.longitude),
        status: event.status,
        note: event.note,
        eventTime: event.event_time
      }));
  }, [trackingEvents]);

  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackageId(pkgId);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
      padding: '20px',
      fontFamily: 'Segoe UI, Arial, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        color: 'white'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>实时跟踪中心</h1>
          <p style={{ margin: '6px 0 0 0', opacity: 0.85 }}>监控快递员位置、包裹状态与轨迹</p>
        </div>
        <button
          onClick={() => navigate('/admin/dashboard')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          ← 返回仪表板
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '18px',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: 'calc(100vh - 140px)',
          overflowY: 'auto'
        }}>
          <h2 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '12px' }}>进行中的包裹</h2>
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>加载中...</p>
          ) : packages.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>暂无进行中的包裹</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg.id)}
                  style={{
                    background: pkg.id === selectedPackageId ? 'rgba(49, 130, 206, 0.35)' : 'rgba(255,255,255,0.08)',
                    border: pkg.id === selectedPackageId ? '1px solid rgba(144,205,244,0.8)' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '14px',
                    textAlign: 'left',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{pkg.id} · {pkg.package_type}</div>
                  <div style={{ marginTop: '6px', fontSize: '0.9rem', opacity: 0.8 }}>
                    寄件人：{pkg.sender_name}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.9rem', opacity: 0.8 }}>
                    当前状态：{pkg.status}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '10px' }}>在线快递员</h3>
            {courierLocations.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>暂未接收到在线快递员位置</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {courierLocations.map(loc => (
                  <div key={loc.id} style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white'
                  }}>
                    <div style={{ fontWeight: 600 }}>快递员 ID：{loc.courier_id}</div>
                    <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>状态：{loc.status}</div>
                    <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>位置：{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</div>
                    <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>更新时间：{loc.last_update}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '18px',
            border: '1px solid rgba(255,255,255,0.1)',
            height: '480px'
          }}>
            <h2 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '12px' }}>实时地图</h2>
            <div style={{ position: 'relative', height: 'calc(100% - 40px)' }}>
              {googleMapsApiKey ? (
                <LoadScript googleMapsApiKey={googleMapsApiKey} loadingElement={<div style={{ width: '100%', height: '100%' }} />}> 
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={13}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                      styles: [
                        { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
                        { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
                        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
                        {
                          featureType: 'administrative.country',
                          elementType: 'geometry.stroke',
                          stylers: [{ color: '#4b6878' }]
                        },
                        {
                          featureType: 'landscape',
                          elementType: 'geometry',
                          stylers: [{ color: '#0b1b33' }]
                        },
                        {
                          featureType: 'road',
                          elementType: 'geometry',
                          stylers: [{ color: '#304a7d' }]
                        },
                        {
                          featureType: 'water',
                          elementType: 'geometry',
                          stylers: [{ color: '#0e1626' }]
                        }
                      ]
                    }}
                  >
                    {courierMarkers.map(marker => (
                      <Marker
                        key={`courier-${marker.id}`}
                        position={{ lat: marker.lat, lng: marker.lng }}
                        label={{ text: marker.courierId || '快递员', color: '#ffffff', fontSize: '12px' }}
                        icon={{
                          url: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
                          scaledSize: new window.google.maps.Size(32, 32)
                        }}
                      />
                    ))}

                    {packageEventMarkers.map(marker => (
                      <Marker
                        key={`event-${marker.id}`}
                        position={{ lat: marker.lat, lng: marker.lng }}
                        label={{ text: marker.status, color: '#ffffff', fontSize: '11px' }}
                        icon={{
                          url: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
                          scaledSize: new window.google.maps.Size(28, 28)
                        }}
                      />
                    ))}

                    {trackingPath.length > 1 && (
                      <Polyline
                        path={trackingPath}
                        options={{
                          strokeColor: '#63b3ed',
                          strokeOpacity: 0.8,
                          strokeWeight: 4
                        }}
                      />
                    )}
                  </GoogleMap>
                </LoadScript>
              ) : (
                <div style={{ ...mapContainerStyle, background: 'rgba(15,32,60,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '0 20px' }}>
                    未检测到 Google Maps API Key，请先在 `.env.local` 和 Netlify 环境变量中配置 `REACT_APP_GOOGLE_MAPS_API_KEY`。
                  </p>
                </div>
              )}
            </div>
          </div>

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

      <div style={{
        marginTop: '20px',
        padding: '18px',
        background: 'rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'white'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>接入说明</h2>
        <p style={{ opacity: 0.85 }}>
          - 地图区域目前为占位视图，可根据需要替换为 Google Maps / Mapbox / OpenLayers 等；
          - Supabase 需要新增 `tracking_events`、`courier_locations` 表用于存储轨迹事件与实时坐标；
          - 快递员 App 或定位设备每隔 10-15 秒调用 Supabase Edge Function / REST API 上传最新位置；
          - 当订单状态发生变化时，可向 `tracking_events` 写入事件，页面刷新后即时显示。
        </p>
      </div>
    </div>
  );
};

export default TrackingPage;

