import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { deliveryStoreService, DeliveryStore, packageService, Package } from '../services/supabase';
import QRCode from 'qrcode';

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
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [currentStoreQR, setCurrentStoreQR] = useState<DeliveryStore | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [editingStore, setEditingStore] = useState<DeliveryStore | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // 包裹详情相关状态
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [storePackages, setStorePackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

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

  // 生成店长收件码二维码
  const generateStoreQRCode = async (store: DeliveryStore) => {
    try {
      // 生成唯一的收件码
      const receiveCode = `STORE_${store.id}_${store.store_code}`;
      const qrCodeUrl = await QRCode.toDataURL(receiveCode, {
        width: 200,
        margin: 2,
        color: {
          dark: '#2c5282',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrCodeUrl);
      setCurrentStoreQR(store);
      setShowQRModal(true);
    } catch (error) {
      console.error('生成二维码失败:', error);
      setErrorMessage('生成二维码失败');
    }
  };

  // 下载二维码
  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !currentStoreQR) return;
    
    try {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `店长收件码_${currentStoreQR.store_name}_${currentStoreQR.store_code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('下载失败:', error);
      setErrorMessage('下载失败，请重试');
    }
  };

  // 打开地图选择
  const openMapSelection = () => {
    setShowMapModal(true);
  };

  // 确认地图选择
  const confirmMapSelection = () => {
    setShowMapModal(false);
    setSuccessMessage('位置已选择，请填写其他信息');
  };

  // 编辑店铺
  const editStore = (store: DeliveryStore) => {
    setEditingStore(store);
    setIsEditing(true);
    setFormData({
      store_name: store.store_name,
      store_code: store.store_code,
      address: store.address,
      latitude: store.latitude.toString(),
      longitude: store.longitude.toString(),
      phone: store.phone,
      email: store.email || '',
      manager_name: store.manager_name,
      manager_phone: store.manager_phone,
      store_type: store.store_type,
      operating_hours: store.operating_hours,
      service_area_radius: store.service_area_radius,
      capacity: store.capacity,
      facilities: store.facilities || [],
      notes: store.notes || ''
    });
    setShowForm(true);
  };

  // 获取店铺的包裹列表
  const loadStorePackages = async (store: DeliveryStore) => {
    setLoadingPackages(true);
    try {
      const allPackages = await packageService.getAllPackages();
      
      // 过滤出送达至该店铺的包裹（通过店长收件码识别）
      const storeReceiveCode = `STORE_${store.id}_${store.store_code}`;
      const packages = allPackages.filter(pkg => {
        // 检查包裹的送达记录中是否包含该店铺的收件码
        // 这里简化处理，实际应该根据包裹的送达记录来判断
        return pkg.status === '已送达' && pkg.courier; // 暂时显示所有已送达的包裹
      });
      
      setStorePackages(packages);
      setShowPackageModal(true);
    } catch (error) {
      console.error('获取店铺包裹失败:', error);
      setErrorMessage('获取包裹列表失败');
    } finally {
      setLoadingPackages(false);
    }
  };

  // 处理店铺卡片点击
  const handleStoreClick = (store: DeliveryStore) => {
    setSelectedStore(store);
    loadStorePackages(store);
  };

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
    
    if (isEditing && editingStore) {
      // 编辑模式
      const result = await deliveryStoreService.updateStore(editingStore.id!, {
        ...formData,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        service_area_radius: Number(formData.service_area_radius),
        capacity: Number(formData.capacity),
        updated_at: new Date().toISOString()
      });

      if (result) {
        setSuccessMessage('快递店信息更新成功！');
        setShowForm(false);
        cancelEdit();
        loadStores();
      } else {
        setErrorMessage('更新失败，请重试');
      }
    } else {
      // 创建模式
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
            onClick={() => {
              if (showForm) {
                if (isEditing) {
                  cancelEdit();
                } else {
                  setShowForm(false);
                  resetForm();
                }
              } else {
                setShowForm(true);
              }
            }}
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
            {showForm ? (isEditing ? '取消编辑' : '取消') : '+ 新增快递店'}
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
          <h2 style={{ color: 'white', marginBottom: '16px', fontSize: '1.3rem' }}>
            {isEditing ? '编辑快递店' : '新增快递店'}
          </h2>
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

            {/* 地图位置选择按钮 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>地图位置选择</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={openMapSelection}
                  style={{
                    background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(44, 82, 130, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(44, 82, 130, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(44, 82, 130, 0.3)';
                  }}
                >
                  🗺️ 选择地图位置
                </button>
                {formData.latitude && formData.longitude && (
                  <span style={{ color: '#27ae60', fontSize: '0.9rem', fontWeight: '500' }}>
                    ✅ 位置已选择 ({formData.latitude}, {formData.longitude})
                  </span>
                )}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                点击按钮打开地图窗口，在地图上点击选择位置
              </p>
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
              {isEditing ? '更新快递店' : '创建快递店'}
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
                  onClick={() => handleStoreClick(store)}
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
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateStoreQRCode(store);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(39, 174, 96, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(39, 174, 96, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(39, 174, 96, 0.3)';
                      }}
                    >
                      📱 店长收件码
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editStore(store);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(44, 82, 130, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(44, 82, 130, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(44, 82, 130, 0.3)';
                      }}
                    >
                      ✏️ 编辑
                    </button>
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
                    icon={{
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 2C12.27 2 6 8.27 6 16c0 10.5 14 22 14 22s14-11.5 14-22c0-7.73-6.27-14-14-14z" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
                          <circle cx="20" cy="16" r="6" fill="white"/>
                          <text x="20" y="20" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#e74c3c">店</text>
                        </svg>
                      `),
                      scaledSize: new window.google.maps.Size(40, 40),
                      anchor: new window.google.maps.Point(20, 40)
                    }}
                  />
                ))}
                {selectedStore && (
                  <InfoWindow
                    position={{ lat: selectedStore.latitude, lng: selectedStore.longitude }}
                    onCloseClick={() => setSelectedStore(null)}
                  >
                    <div style={{ 
                      color: '#000', 
                      padding: '8px',
                      minWidth: '200px',
                      fontFamily: 'Arial, sans-serif'
                    }}>
                      <h3 style={{ 
                        margin: '0 0 8px 0', 
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#2c5282'
                      }}>
                        {selectedStore.store_name}
                      </h3>
                      <p style={{ 
                        margin: '0 0 6px 0', 
                        fontSize: '14px',
                        color: '#4a5568'
                      }}>
                        📍 {selectedStore.address}
                      </p>
                      <p style={{ 
                        margin: '0 0 6px 0', 
                        fontSize: '14px',
                        color: '#4a5568',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ color: '#e53e3e' }}>📞</span> {selectedStore.phone}
                      </p>
                      <p style={{ 
                        margin: '0 0 6px 0', 
                        fontSize: '14px',
                        color: '#4a5568',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ color: '#805ad5' }}>👤</span> {selectedStore.manager_name}
                      </p>
                      <p style={{ 
                        margin: '0 0 6px 0', 
                        fontSize: '14px',
                        color: '#4a5568',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ color: '#e53e3e' }}>⏰</span> {selectedStore.operating_hours}
                      </p>
                      <div style={{
                        marginTop: '8px',
                        padding: '4px 8px',
                        background: selectedStore.status === 'active' ? '#c6f6d5' : '#fed7d7',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: selectedStore.status === 'active' ? '#22543d' : '#742a2a',
                        fontWeight: '500'
                      }}>
                        {selectedStore.status === 'active' && '🟢 营业中'}
                        {selectedStore.status === 'inactive' && '🔴 暂停营业'}
                        {selectedStore.status === 'maintenance' && '🟡 维护中'}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </LoadScript>
          </ErrorBoundary>
        </div>
      </div>

      {/* 店长收件码二维码模态框 */}
      {showQRModal && currentStoreQR && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            padding: '2rem',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h2 style={{
                margin: 0,
                color: '#A5C7FF',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                📱 店长收件码
              </h2>
              <button
                onClick={() => setShowQRModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 店铺信息 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#A5C7FF',
                fontSize: '1.2rem'
              }}>
                店铺信息
              </h3>
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '10px',
                marginBottom: '1rem'
              }}>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#2c5282',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}>
                  店铺名称: {currentStoreQR.store_name}
                </p>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#2c5282',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}>
                  店铺代码: {currentStoreQR.store_code}
                </p>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  地址: {currentStoreQR.address}
                </p>
                <p style={{
                  margin: 0,
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  店长: {currentStoreQR.manager_name} ({currentStoreQR.manager_phone})
                </p>
              </div>
            </div>

            {/* 二维码显示 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#A5C7FF',
                fontSize: '1.2rem'
              }}>
                收件码二维码
              </h3>
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '10px',
                display: 'inline-block',
                marginBottom: '1rem'
              }}>
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="店长收件码" 
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(44, 82, 130, 0.3)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '200px',
                    height: '200px',
                    background: '#f8f9fa',
                    border: '2px dashed #2c5282',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    正在生成二维码...
                  </div>
                )}
              </div>
              <p style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                骑手送件时必须扫描此二维码<br/>
                确认包裹送达至该店铺<br/>
                请妥善保管此收件码
              </p>
            </div>

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={downloadQRCode}
                disabled={!qrCodeDataUrl}
                style={{
                  background: !qrCodeDataUrl ? '#94a3b8' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: !qrCodeDataUrl ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  if (qrCodeDataUrl) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (qrCodeDataUrl) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                  }
                }}
              >
                📥 下载收件码
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 包裹详情模态框 */}
      {showPackageModal && selectedStore && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            padding: '2rem',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  color: '#A5C7FF',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}>
                  📦 {selectedStore.store_name} - 送达包裹
                </h2>
                <p style={{
                  margin: '0.5rem 0 0 0',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.9rem'
                }}>
                  📍 {selectedStore.address} | 👤 店长: {selectedStore.manager_name}
                </p>
              </div>
              <button
                onClick={() => setShowPackageModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 包裹列表 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '15px',
              padding: '1.5rem',
              maxHeight: '60vh',
              overflow: 'auto'
            }}>
              {loadingPackages ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                  <p>正在加载包裹列表...</p>
                </div>
              ) : storePackages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📦</div>
                  <p>暂无送达包裹</p>
                  <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                    该店铺还没有收到任何包裹
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {storePackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '16px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#A5C7FF' }}>
                          📦 {pkg.id}
                        </h3>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(72, 187, 120, 0.3)',
                          fontSize: '0.8rem',
                          color: '#2ecc71'
                        }}>
                          ✅ 已送达
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                        <div>
                          <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            <span style={{ color: '#A5C7FF' }}>📤 寄件人:</span> {pkg.sender_name}
                          </p>
                          <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            <span style={{ color: '#A5C7FF' }}>📥 收件人:</span> {pkg.receiver_name}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            <span style={{ color: '#A5C7FF' }}>📞 电话:</span> {pkg.receiver_phone}
                          </p>
                          <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            <span style={{ color: '#A5C7FF' }}>🏷️ 类型:</span> {pkg.package_type}
                          </p>
                        </div>
                      </div>
                      
                      <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>
                        <span style={{ color: '#A5C7FF' }}>📍 地址:</span> {pkg.receiver_address}
                      </p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                          <span>⚖️ {pkg.weight}kg</span>
                          <span style={{ marginLeft: '12px' }}>💰 ¥{pkg.price}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                          <span style={{ color: '#27ae60' }}>🚚 骑手: {pkg.courier}</span>
                        </div>
                      </div>
                      
                      {pkg.delivery_time && (
                        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(39, 174, 96, 0.2)', borderRadius: '6px' }}>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#2ecc71' }}>
                            ⏰ 送达时间: {new Date(pkg.delivery_time).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 统计信息 */}
            {storePackages.length > 0 && (
              <div style={{
                marginTop: '1.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '1rem',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', color: '#A5C7FF', fontWeight: 'bold' }}>
                    {storePackages.length}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>总包裹数</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', color: '#2ecc71', fontWeight: 'bold' }}>
                    {storePackages.reduce((sum, pkg) => sum + parseFloat(pkg.weight || '0'), 0).toFixed(1)}kg
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>总重量</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', color: '#f39c12', fontWeight: 'bold' }}>
                    ¥{storePackages.reduce((sum, pkg) => sum + parseFloat(pkg.price || '0'), 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>总金额</div>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              marginTop: '1.5rem'
            }}>
              <button
                onClick={() => setShowPackageModal(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 地图选择模态框 */}
      {showMapModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            padding: '2rem',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h2 style={{
                margin: 0,
                color: '#A5C7FF',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                🗺️ 选择店铺位置
              </h2>
              <button
                onClick={() => setShowMapModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 地图说明 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                📍 在地图上点击选择店铺位置<br/>
                🎯 点击后会自动设置经纬度坐标<br/>
                ✅ 选择完成后点击"确认位置"按钮
              </p>
            </div>

            {/* 地图容器 */}
            <div style={{
              width: '100%',
              height: '400px',
              borderRadius: '15px',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <ErrorBoundary>
                <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY"}>
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
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
                        icon={{
                          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 2C12.27 2 6 8.27 6 16c0 10.5 14 22 14 22s14-11.5 14-22c0-7.73-6.27-14-14-14z" fill="#27ae60" stroke="#229954" stroke-width="2"/>
                              <circle cx="20" cy="16" r="6" fill="white"/>
                              <text x="20" y="20" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#27ae60">新</text>
                            </svg>
                          `),
                          scaledSize: new window.google.maps.Size(40, 40),
                          anchor: new window.google.maps.Point(20, 40)
                        }}
                      />
                    )}
                  </GoogleMap>
                </LoadScript>
              </ErrorBoundary>
            </div>

            {/* 位置信息 */}
            {formData.latitude && formData.longitude && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '1rem',
                borderRadius: '10px',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  color: '#A5C7FF',
                  fontSize: '1.1rem'
                }}>
                  已选择位置
                </h3>
                <p style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.9rem'
                }}>
                  纬度: {formData.latitude}<br/>
                  经度: {formData.longitude}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={confirmMapSelection}
                disabled={!formData.latitude || !formData.longitude}
                style={{
                  background: (!formData.latitude || !formData.longitude) ? '#94a3b8' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: (!formData.latitude || !formData.longitude) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  if (formData.latitude && formData.longitude) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (formData.latitude && formData.longitude) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                  }
                }}
              >
                ✅ 确认位置
              </button>
              <button
                onClick={() => setShowMapModal(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryStoreManagement;
