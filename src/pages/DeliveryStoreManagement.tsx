import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { deliveryStoreService, DeliveryStore } from '../services/supabase';

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
          background: 'rgba(255, 255, 255, 0.1)',
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

const DeliveryStoreManagement: React.FC = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<DeliveryStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<DeliveryStore | null>(null);
  const [mapCenter] = useState({ lat: 21.9588, lng: 96.0891 }); // 曼德勒中心

  const [formData, setFormData] = useState({
    store_name: '',
    store_code: '',
    address: '',
    latitude: '',
    longitude: '',
    phone: '',
    email: '',
    manager_name: '',
    manager_phone: '',
    store_type: 'branch' as 'hub' | 'branch' | 'pickup_point',
    operating_hours: '08:00-22:00',
    service_area_radius: 5,
    capacity: 1000,
    facilities: [] as string[],
    notes: ''
  });

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    const data = await deliveryStoreService.getAllStores();
    setStores(data);
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFacilityChange = (facility: string) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }));
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setFormData(prev => ({
        ...prev,
        latitude: lat.toString(),
        longitude: lng.toString()
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 验证必填项
    if (!formData.store_name || !formData.store_code || !formData.address || !formData.latitude || !formData.longitude) {
      setErrorMessage('请填写所有必填项');
      return;
    }

    const currentUser = localStorage.getItem('currentUser') || 'admin';
    const result = await deliveryStoreService.createStore({
      ...formData,
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
      service_area_radius: Number(formData.service_area_radius),
      capacity: Number(formData.capacity),
      created_by: currentUser
    });

    if (result) {
      setSuccessMessage('快递店创建成功！');
      setShowForm(false);
      resetForm();
      loadStores();
    } else {
      setErrorMessage('创建失败，店铺代码可能已存在');
    }
  };

  const resetForm = () => {
    setFormData({
      store_name: '',
      store_code: '',
      address: '',
      latitude: '',
      longitude: '',
      phone: '',
      email: '',
      manager_name: '',
      manager_phone: '',
      store_type: 'branch',
      operating_hours: '08:00-22:00',
      service_area_radius: 5,
      capacity: 1000,
      facilities: [],
      notes: ''
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(15, 32, 60, 0.55)',
    color: 'white',
    fontSize: '0.9rem',
    outline: 'none'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '5px',
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.85rem',
    fontWeight: 500
  };

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '12px'
  };

  const facilityOptions = [
    { key: 'parking', label: '停车场' },
    { key: 'storage', label: '仓储区' },
    { key: 'office', label: '办公区' },
    { key: 'restroom', label: '洗手间' },
    { key: 'loading_dock', label: '装卸区' },
    { key: 'security', label: '安保' },
    { key: 'cctv', label: '监控' },
    { key: 'wifi', label: 'WiFi' }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
        padding: '20px',
        fontFamily: 'Segoe UI, Arial, sans-serif'
      }}
    >
      {/* 头部 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          color: 'white'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>快递店管理</h1>
          <p style={{ margin: '6px 0 0 0', opacity: 0.85 }}>管理配送网点、自提点和分拣中心</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '10px 18px',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            ← 返回仪表板
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: showForm ? 'rgba(245, 101, 101, 0.8)' : 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(56, 161, 105, 0.35)'
            }}
          >
            {showForm ? '取消' : '+ 新增快递店'}
          </button>
        </div>
      </div>

      {/* 消息提示 */}
      {(errorMessage || successMessage) && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.25)',
            background: errorMessage ? 'rgba(245, 101, 101, 0.2)' : 'rgba(72, 187, 120, 0.2)',
            color: 'white'
          }}
        >
          {errorMessage || successMessage}
        </div>
      )}

      {/* 新增表单 */}
      {showForm && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '20px'
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '16px', fontSize: '1.3rem' }}>新增快递店</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>店铺名称 *</label>
                <input
                  type="text"
                  name="store_name"
                  value={formData.store_name}
                  onChange={handleInputChange}
                  placeholder="例: 曼德勒中心店"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>店铺代码 *</label>
                <input
                  type="text"
                  name="store_code"
                  value={formData.store_code}
                  onChange={handleInputChange}
                  placeholder="例: MDL001"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>店铺类型 *</label>
                <select
                  name="store_type"
                  value={formData.store_type}
                  onChange={handleInputChange}
                  style={inputStyle}
                  required
                >
                  <option value="hub">分拣中心 (Hub)</option>
                  <option value="branch">配送点 (Branch)</option>
                  <option value="pickup_point">自提点 (Pickup Point)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>详细地址 *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="详细地址"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>联系电话 *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="09-XXXXXXXXX"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>邮箱地址</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="store@company.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>店长姓名 *</label>
                <input
                  type="text"
                  name="manager_name"
                  value={formData.manager_name}
                  onChange={handleInputChange}
                  placeholder="店长姓名"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>店长电话 *</label>
                <input
                  type="tel"
                  name="manager_phone"
                  value={formData.manager_phone}
                  onChange={handleInputChange}
                  placeholder="09-XXXXXXXXX"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>营业时间 *</label>
                <input
                  type="text"
                  name="operating_hours"
                  value={formData.operating_hours}
                  onChange={handleInputChange}
                  placeholder="例: 08:00-22:00"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>服务半径 (公里)</label>
                <input
                  type="number"
                  name="service_area_radius"
                  value={formData.service_area_radius}
                  onChange={handleInputChange}
                  min="1"
                  max="50"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>日处理能力</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  min="1"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>纬度 *</label>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder="21.9588"
                  step="0.00000001"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>经度 *</label>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  placeholder="96.0891"
                  step="0.00000001"
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            {/* 设施选择 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>设施配置</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {facilityOptions.map(facility => (
                  <label key={facility.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.facilities.includes(facility.key)}
                      onChange={() => handleFacilityChange(facility.key)}
                      style={{ accentColor: '#3182ce' }}
                    />
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>
                      {facility.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>备注</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="其他备注信息"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Google Maps 地图选择位置 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>地图位置选择</label>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '10px' }}>
                点击地图选择位置，或手动输入经纬度
              </p>
              <ErrorBoundary>
                <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY"}>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={12}
                    onClick={handleMapClick}
                  >
                    {formData.latitude && formData.longitude && (
                      <Marker
                        position={{
                          lat: Number(formData.latitude),
                          lng: Number(formData.longitude)
                        }}
                      />
                    )}
                  </GoogleMap>
                </LoadScript>
              </ErrorBoundary>
            </div>

            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 28px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
                boxShadow: '0 6px 16px rgba(56, 161, 105, 0.3)'
              }}
            >
              创建快递店
            </button>
          </form>
        </div>
      )}

      {/* 快递店列表和地图 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* 快递店列表 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white'
          }}
        >
          <h2 style={{ marginBottom: '20px' }}>快递店列表</h2>
          {loading ? (
            <p>加载中...</p>
          ) : stores.length === 0 ? (
            <p style={{ opacity: 0.7 }}>暂无快递店数据</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  style={{
                    background: selectedStore?.id === store.id ? 'rgba(49, 130, 206, 0.3)' : 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{store.store_name}</h3>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background:
                          store.status === 'active'
                            ? 'rgba(72, 187, 120, 0.3)'
                            : store.status === 'inactive'
                            ? 'rgba(160, 174, 192, 0.3)'
                            : 'rgba(245, 101, 101, 0.3)',
                        fontSize: '0.8rem'
                      }}
                    >
                      {store.status === 'active' && '营业中'}
                      {store.status === 'inactive' && '暂停营业'}
                      {store.status === 'maintenance' && '维护中'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>{store.address}</p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', opacity: 0.7 }}>
                    <span>📞 {store.phone}</span>
                    <span>👤 {store.manager_name}</span>
                    <span>⏰ {store.operating_hours}</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', opacity: 0.6 }}>
                    <span>类型: {store.store_type === 'hub' ? '分拣中心' : store.store_type === 'branch' ? '配送点' : '自提点'}</span>
                    <span style={{ marginLeft: '12px' }}>容量: {store.capacity}</span>
                    <span style={{ marginLeft: '12px' }}>负载: {store.current_load}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 地图显示 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white'
          }}
        >
          <h2 style={{ marginBottom: '20px' }}>快递店分布图</h2>
          <ErrorBoundary>
            <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY"}>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '400px', borderRadius: '12px' }}
                center={mapCenter}
                zoom={12}
              >
                {stores.map((store) => (
                  <Marker
                    key={store.id}
                    position={{ lat: store.latitude, lng: store.longitude }}
                    onClick={() => setSelectedStore(store)}
                  />
                ))}
                {selectedStore && (
                  <InfoWindow
                    position={{ lat: selectedStore.latitude, lng: selectedStore.longitude }}
                    onCloseClick={() => setSelectedStore(null)}
                  >
                    <div style={{ color: '#000' }}>
                      <h3 style={{ margin: '0 0 8px 0' }}>{selectedStore.store_name}</h3>
                      <p style={{ margin: '0 0 4px 0' }}>{selectedStore.address}</p>
                      <p style={{ margin: '0 0 4px 0' }}>📞 {selectedStore.phone}</p>
                      <p style={{ margin: '0 0 4px 0' }}>👤 {selectedStore.manager_name}</p>
                      <p style={{ margin: '0' }}>⏰ {selectedStore.operating_hours}</p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </LoadScript>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default DeliveryStoreManagement;
