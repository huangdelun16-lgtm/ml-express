import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api';
import { supabase, deliveryStoreService, DeliveryStore, packageService, Package } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';
import QRCode from 'qrcode';
import { GOOGLE_MAPS_LIBRARIES } from '../constants/googleMaps';

const REGIONS = [
  { id: 'mandalay', name: '曼德勒', prefix: 'MDY' },
  { id: 'maymyo', name: '彬乌伦', prefix: 'POL' },
  { id: 'yangon', name: '仰光', prefix: 'YGN' },
  { id: 'naypyidaw', name: '内比都', prefix: 'NPW' },
  { id: 'taunggyi', name: '东枝', prefix: 'TGI' },
  { id: 'lashio', name: '腊戌', prefix: 'LSO' },
  { id: 'muse', name: '木姐', prefix: 'MUSE' }
];

const STORE_TYPES = [
  { value: 'restaurant', label: '餐厅' },
  { value: 'drinks_snacks', label: '饮料和小吃' },
  { value: 'breakfast', label: '早点铺' },
  { value: 'cake_shop', label: '蛋糕店' },
  { value: 'tea_shop', label: '茶铺' },
  { value: 'flower_shop', label: '鲜花店' },
  { value: 'clothing_store', label: '服装店' },
  { value: 'grocery', label: '杂货店' },
  { value: 'hardware_store', label: '五金店' },
  { value: 'supermarket', label: '超市' },
  { value: 'transit_station', label: '中转站' },
  { value: 'other', label: '其它' }
];

// Google Maps API 配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Google Maps API Key 未配置！请检查环境变量 REACT_APP_GOOGLE_MAPS_API_KEY');
}

// 添加CSS动画样式
const spinAnimation = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// 注入CSS样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    ${spinAnimation}
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    select option {
      background-color: #1e293b;
      color: white;
      padding: 10px;
    }
    /* 优化滚动条样式 */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `;
  document.head.appendChild(style);
}

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

/** 仅当明确为 approved 时视为已上架；null/undefined/空串 等均视为待审核（避免未跑迁移时误判为「已上架」） */
function normalizeProductListingStatus(product: { listing_status?: string | null }): 'pending' | 'approved' | 'rejected' {
  const s = typeof product.listing_status === 'string' ? product.listing_status.trim() : '';
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  return 'pending';
}

const DeliveryStoreManagement: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ml-express-language') || 'zh';
  });
  
  // 🚀 新增：店铺类型下拉框状态
  const [showStoreTypeDropdown, setShowStoreTypeDropdown] = useState(false);
  const storeTypeDropdownRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (storeTypeDropdownRef.current && !storeTypeDropdownRef.current.contains(event.target as Node)) {
        setShowStoreTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Google Maps API 加载 - 使用 useJsApiLoader hook（与其他页面保持一致）
  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });
  
  // 检查 Google Maps API Key 配置
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.trim() === '') {
      console.error('❌ Google Maps API密钥未设置！');
      console.error('请在 Netlify Dashboard 的环境变量设置中配置：REACT_APP_GOOGLE_MAPS_API_KEY');
    } else {
      console.log('✅ Google Maps API Key 已加载:', GOOGLE_MAPS_API_KEY.substring(0, 20) + '...');
    }
    
    if (mapLoadError) {
      console.error('❌ Google Maps 加载失败:', mapLoadError);
    }
  }, [isMapLoaded, mapLoadError]);
  
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<DeliveryStore | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 21.9588, lng: 96.0891 }); // 默认曼德勒
  const [selectedCity, setSelectedCity] = useState<'mandalay' | 'pyinoolwin' | 'yangon' | 'naypyidaw' | 'taunggyi' | 'lashio' | 'muse'>('mandalay'); // 默认曼德勒
  const [allStores, setAllStores] = useState<DeliveryStore[]>([]); // 存储所有合伙店铺
  
  // 🚀 新增：店铺商品查看状态
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [viewingStoreName, setViewingStoreName] = useState('');
  const [viewingStoreId, setViewingStoreId] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productListingActionId, setProductListingActionId] = useState<string | null>(null);
  /** 商品列表弹窗：全部 / 待审核 / 已完成(已通过) / 已取消(已拒绝) */
  const [productListFilter, setProductListFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  /** 全局待审核商品数（listing_status=pending），用于列表区与仪表板一致提示 */
  const [pendingProductReviewCount, setPendingProductReviewCount] = useState(0);
  /** 各合伙店铺待审核商品数量（store_id → 件数），用于列表按店展示与卡片提示 */
  const [pendingReviewByStoreId, setPendingReviewByStoreId] = useState<Record<string, number>>({});

  // Google Places API 相关状态
  const [placeSearchInput, setPlaceSearchInput] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<any[]>([]);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [isLoadingPlaceDetails, setIsLoadingPlaceDetails] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const googleMapsApiKey = GOOGLE_MAPS_API_KEY;
  
  // 缅甸主要城市数据
  const myanmarCities = {
    mandalay: { name: '曼德勒', nameEn: 'Mandalay', lat: 21.9588, lng: 96.0891, radius: 0.5 },
    pyinoolwin: { name: '彬乌伦', nameEn: 'Pyin Oo Lwin', lat: 22.0333, lng: 96.4667, radius: 0.3 },
    yangon: { name: '仰光', nameEn: 'Yangon', lat: 16.8661, lng: 96.1951, radius: 0.8 },
    naypyidaw: { name: '内比都', nameEn: 'Naypyidaw', lat: 19.7633, lng: 96.0785, radius: 0.5 },
    taunggyi: { name: '东枝', nameEn: 'Taunggyi', lat: 20.7892, lng: 97.0378, radius: 0.3 },
    lashio: { name: '腊戌', nameEn: 'Lashio', lat: 22.9333, lng: 97.7500, radius: 0.3 },
    muse: { name: '木姐', nameEn: 'Muse', lat: 23.9833, lng: 97.9000, radius: 0.3 }
  };

  // Google Places API 自动完成搜索
  const searchPlaces = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 2) {
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
      return;
    }

    if (!googleMapsApiKey) {
      console.error('Google Maps API Key 未配置');
      return;
    }

    try {
      // 使用 Google Places Autocomplete API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${googleMapsApiKey}&language=zh-CN&components=country:mm`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        setPlaceSuggestions(data.predictions);
        setShowPlaceSuggestions(true);
      } else {
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
      }
    } catch (error) {
      console.error('搜索地点失败:', error);
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
    }
  }, [googleMapsApiKey]);

  // 获取地点详情并自动填充表单
  const getPlaceDetails = useCallback(async (placeId: string) => {
    if (!googleMapsApiKey) {
      console.error('Google Maps API Key 未配置');
      return;
    }

    setIsLoadingPlaceDetails(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,formatted_phone_number,website,rating,types&key=${googleMapsApiKey}&language=zh-CN`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const place = data.result;
        const location = place.geometry.location;
        
        // 自动填充表单
        setFormData(prev => ({
          ...prev,
          store_name: place.name || prev.store_name,
          address: place.formatted_address || prev.address,
          latitude: location.lat.toString(),
          longitude: location.lng.toString(),
          phone: place.formatted_phone_number || prev.phone,
        }));
        
        // 更新地图中心
        setMapCenter({ lat: location.lat, lng: location.lng });
        
        setPlaceSearchInput(place.name || place.formatted_address || '');
        setShowPlaceSuggestions(false);
      }
    } catch (error) {
      console.error('获取地点详情失败:', error);
      setErrorMessage('获取店铺信息失败，请手动填写');
    } finally {
      setIsLoadingPlaceDetails(false);
    }
  }, [googleMapsApiKey]);

  // 处理地点搜索输入变化（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (placeSearchInput) {
        searchPlaces(placeSearchInput);
      } else {
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [placeSearchInput, searchPlaces]);

  // 根据坐标判断合伙店铺属于哪个城市
  const getStoreCity = (store: DeliveryStore): string | null => {
    // 计算两点之间的距离（公里）
    const distance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371; // 地球半径（公里）
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let closestCity: string | null = null;
    let minDistance = Infinity;

    // 遍历所有城市，找到距离最近的城市
    for (const [cityKey, cityData] of Object.entries(myanmarCities)) {
      const dist = distance(store.latitude, store.longitude, cityData.lat, cityData.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestCity = cityKey;
      }
    }

    // 如果距离在合理范围内（50公里），则返回该城市，否则返回null
    return minDistance <= 50 ? closestCity : null;
  };

  // 根据选择的城市过滤合伙店铺
  const filteredStores = allStores.filter(store => {
    const storeCity = getStoreCity(store);
    return storeCity === selectedCity;
  });

  // 使用过滤后的合伙店铺列表
  const stores = filteredStores;
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [currentStoreQR, setCurrentStoreQR] = useState<DeliveryStore | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [editingStore, setEditingStore] = useState<DeliveryStore | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // 包裹详情相关状态
  const [showPackageModal, setShowPackageModal] = useState(false);
  // const [storePackages, setStorePackages] = useState<Package[]>([]); // 暂时未使用
  // const [loadingPackages, setLoadingPackages] = useState(false); // 暂时未使用
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [storagePackages, setStoragePackages] = useState<Package[]>([]);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [currentStorageStore, setCurrentStorageStore] = useState<DeliveryStore | null>(null);
  
  // 店铺包裹查看相关状态
  const [showStorePackagesModal, setShowStorePackagesModal] = useState(false);
  const [storePackages, setStorePackages] = useState<Package[]>([]);
  const [loadingStorePackages, setLoadingStorePackages] = useState(false);
  const [currentViewStore, setCurrentViewStore] = useState<DeliveryStore | null>(null);
  
  // 添加重试状态
  const [retryCount, setRetryCount] = useState(0);
  
  // 中转码二维码相关状态
  const [showTransferQRModal, setShowTransferQRModal] = useState(false);
  const [transferQRCodeDataUrl, setTransferQRCodeDataUrl] = useState('');
  const [currentTransferPackage, setCurrentTransferPackage] = useState<Package | null>(null);

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
    store_type: 'restaurant' as 'restaurant' | 'drinks_snacks' | 'breakfast' | 'cake_shop' | 'tea_shop' | 'flower_shop' | 'clothing_store' | 'grocery' | 'hardware_store' | 'supermarket' | 'transit_station' | 'other',
    operating_hours: '08:00-22:00',
    service_area_radius: 5, // 保留默认值，但不在表单中显示
    capacity: 1000, // 保留默认值，但不在表单中显示
    facilities: [] as string[],
    notes: '',
    password: '', // 合伙店铺登录密码
    region: 'mandalay',
    cod_settlement_day: '7' as '7' | '10' | '15' | '30'
  });

  // 生成店长收件码二维码
  const generateStoreQRCode = async (store: DeliveryStore) => {
    try {
      // 生成唯一的收件码，使用店铺ID确保唯一性
      const receiveCode = `STORE_${store.id}_${Date.now()}`;
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
    // 如果已经有了经纬度，则以经纬度为中心
    if (formData.latitude && formData.longitude) {
      setMapCenter({ 
        lat: Number(formData.latitude), 
        lng: Number(formData.longitude) 
      });
    } else {
      // 否则以当前选择的区域为中心
      const cityKey = formData.region === 'maymyo' ? 'pyinoolwin' : formData.region;
      const cityCoords = (myanmarCities as any)[cityKey];
      if (cityCoords) {
        setMapCenter({ lat: cityCoords.lat, lng: cityCoords.lng });
      }
    }
    setShowMapModal(true);
  };

  // 地图加载成功回调
  const onMapLoad = useCallback(() => {
    console.log('✅ 地图加载成功');
  }, []);

  // 获取地图错误消息
  const getMapErrorMessage = useCallback(() => {
    if (!mapLoadError) return null;
    
    const error = mapLoadError as any;
    if (error && error.message) {
      if (error.message.includes('quota') || error.message.includes('billing')) {
        return 'Google Maps API配额已用完，请联系管理员设置付费账户';
      } else if (error.message.includes('key') || error.message.includes('API_KEY')) {
        return 'Google Maps API密钥无效，请联系管理员检查配置';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        return '网络连接失败，请检查网络后重试';
      } else if (error.message.includes('referer') || error.message.includes('domain')) {
        return 'API密钥域名限制，请联系管理员添加当前域名';
      } else {
        return `地图加载失败: ${error.message}`;
      }
    }
    
    return '地图加载失败，请重试';
  }, [mapLoadError]);

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
      store_type: store.store_type as 'restaurant' | 'drinks_snacks' | 'breakfast' | 'cake_shop' | 'tea_shop' | 'flower_shop' | 'clothing_store' | 'grocery' | 'hardware_store' | 'supermarket' | 'transit_station' | 'other',
      operating_hours: store.operating_hours,
      service_area_radius: store.service_area_radius,
      capacity: store.capacity,
      facilities: store.facilities || [],
      notes: store.notes || '',
      password: store.password || '',
      region: store.region || 'mandalay',
      cod_settlement_day: store.cod_settlement_day || '7'
    });
    setShowForm(true);
  };

  // 生成中转码
  const generateTransferCode = (packageId: string, storeId: string) => {
    // 格式：TC + 店铺ID前3位 + 包裹ID后4位 + 时间戳后3位
    const storePrefix = storeId.substring(0, 3).toUpperCase();
    const packageSuffix = packageId.substring(packageId.length - 4);
    const timeSuffix = Date.now().toString().slice(-3);
    return `TC${storePrefix}${packageSuffix}${timeSuffix}`;
  };

  // 生成中转码二维码
  const generateTransferQRCode = async (pkg: Package) => {
    try {
      if (!pkg.transfer_code) {
        setErrorMessage('该包裹没有中转码');
        return;
      }
      
      const qrCodeUrl = await QRCode.toDataURL(pkg.transfer_code, {
        width: 200,
        margin: 2,
        color: {
          dark: '#9b59b6',
          light: '#FFFFFF'
        }
      });
      setTransferQRCodeDataUrl(qrCodeUrl);
      setCurrentTransferPackage(pkg);
      setShowTransferQRModal(true);
    } catch (error) {
      console.error('生成中转码二维码失败:', error);
      setErrorMessage('生成中转码二维码失败');
    }
  };

  // 转发包裹功能
  const handleForwardPackage = async (pkg: Package) => {
    try {
      // 生成中转码
      const transferCode = generateTransferCode(pkg.id, currentStorageStore?.id || 'DEFAULT');
      
      // 更新包裹状态为"待派送"，并添加中转码
      const success = await packageService.updatePackageStatus(
        pkg.id,
        '待派送',
        pkg.pickup_time,
        undefined, // 清除delivery_time，因为包裹还在中转站
        pkg.courier,
        transferCode // 添加中转码
      );

      if (success) {
        setSuccessMessage(`包裹 ${pkg.id} 已标记为待派送，中转码: ${transferCode}`);
        // 刷新包裹列表
        if (currentStorageStore) {
          loadStoragePackages(currentStorageStore);
        }
      } else {
        setErrorMessage('转发包裹失败，请重试');
      }
    } catch (error) {
      console.error('转发包裹失败:', error);
      setErrorMessage('转发包裹失败，请重试');
    }
  };

  // 获取入库包裹列表（骑手送来的包裹）
  const loadStoragePackages = async (store: DeliveryStore) => {
    if (!store.id) {
      setErrorMessage('店铺信息不完整，无法加载包裹');
      return;
    }
    setLoadingStorage(true);
    setCurrentStorageStore(store);
    setShowStorageModal(true);
    try {
      // 直接从数据库获取属于该店铺的包裹
      const packages = await packageService.getPackagesByStore(store.id);
      
      setStoragePackages(packages);
    } catch (error) {
      console.error('获取入库包裹失败:', error);
      setErrorMessage('获取入库包裹列表失败');
    } finally {
      setLoadingStorage(false);
    }
  };

  // 处理店铺卡片点击（在地图上标注位置）
  const handleStoreClick = (store: DeliveryStore) => {
    setSelectedStore(store);
  };

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async (isRetry = false) => {
    try {
      setLoading(true);
      if (!isRetry) {
        setErrorMessage(null); // 清除之前的错误信息
      }
      const data = await deliveryStoreService.getAllStores();
      setAllStores(data); // 存储所有合伙店铺
      setRetryCount(0); // 重置重试计数
    } catch (error) {
      console.error('加载合伙店铺列表失败:', error);
      setErrorMessage('加载合伙店铺列表失败，请刷新页面重试');
      setAllStores([]); // 设置空数组避免undefined
      if (!isRetry) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  // 🚀 新增：加载店铺商品逻辑
  const viewStoreProducts = async (store: DeliveryStore) => {
    try {
      setLoadingProducts(true);
      setProductListFilter('all');
      setViewingStoreName(store.store_name);
      setViewingStoreId(store.id ?? null);
      setShowProductsModal(true);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStoreProducts(data || []);
    } catch (error) {
      console.error('加载店铺商品失败:', error);
      alert('加载商品失败，请重试');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadPendingProductReviewSummary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('store_id')
        .eq('listing_status', 'pending');
      if (error) {
        setPendingProductReviewCount(0);
        setPendingReviewByStoreId({});
        return;
      }
      const byId: Record<string, number> = {};
      for (const row of data || []) {
        const sid = row.store_id as string | undefined;
        if (!sid) continue;
        byId[sid] = (byId[sid] || 0) + 1;
      }
      setPendingReviewByStoreId(byId);
      setPendingProductReviewCount(Object.values(byId).reduce((a, b) => a + b, 0));
    } catch {
      setPendingProductReviewCount(0);
      setPendingReviewByStoreId({});
    }
  }, []);

  /** 待审核商品按店铺名称排序展示（名称以当前已加载的合伙店铺列表为准） */
  const pendingReviewBreakdownLines = useMemo(() => {
    return Object.entries(pendingReviewByStoreId)
      .map(([id, count]) => ({
        id,
        count,
        name:
          allStores.find((s) => s.id === id)?.store_name ??
          `店铺 ${id.length > 8 ? `${id.slice(0, 6)}…` : id}`,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans'));
  }, [pendingReviewByStoreId, allStores]);

  useEffect(() => {
    loadPendingProductReviewSummary();
    const t = setInterval(loadPendingProductReviewSummary, 30000);
    return () => clearInterval(t);
  }, [loadPendingProductReviewSummary]);

  const updateProductListingStatus = async (productId: string, listing_status: 'approved' | 'rejected') => {
    if (!viewingStoreId) return;
    setProductListingActionId(productId);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          listing_status,
          is_available: listing_status === 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
      if (error) throw error;
      const { data, error: reloadError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', viewingStoreId)
        .order('created_at', { ascending: false });
      if (reloadError) throw reloadError;
      setStoreProducts(data || []);
      await loadPendingProductReviewSummary();
    } catch (e) {
      console.error('更新商品审核状态失败:', e);
      alert('更新失败，请重试（请确认已在数据库执行 listing_status 迁移）');
    } finally {
      setProductListingActionId(null);
    }
  };

  const productListCounts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    storeProducts.forEach((p) => {
      const ls = normalizeProductListingStatus(p);
      if (ls === 'pending') pending += 1;
      else if (ls === 'approved') approved += 1;
      else rejected += 1;
    });
    return { all: storeProducts.length, pending, approved, rejected };
  }, [storeProducts]);

  const filteredStoreProducts = useMemo(() => {
    if (productListFilter === 'all') return storeProducts;
    return storeProducts.filter((p) => normalizeProductListingStatus(p) === productListFilter);
  }, [storeProducts, productListFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 当切换区域时，自动更新地图中心点
    if (name === 'region') {
      const cityKey = value === 'maymyo' ? 'pyinoolwin' : value;
      const cityCoords = (myanmarCities as any)[cityKey];
      if (cityCoords) {
        setMapCenter({ lat: cityCoords.lat, lng: cityCoords.lng });
      }
    }

    // 自动生成店铺代码逻辑
    if (!isEditing && (name === 'store_name' || name === 'region')) {
      setFormData(prev => {
        const newData = { ...prev, [name]: value };
        // 如果区域和店铺名称都有了（或者正在输入名称），自动生成代码
        if (newData.region && newData.store_name) {
          const regionObj = REGIONS.find(r => r.id === newData.region);
          const prefix = regionObj ? regionObj.prefix : 'MDY';
          
          // 获取该区域现有的店铺数量
          const regionStores = allStores.filter(s => s.region === newData.region || (s.store_code && s.store_code.startsWith(prefix)));
          const nextNumber = (regionStores.length + 1).toString().padStart(3, '0');
          newData.store_code = `${prefix}${nextNumber}`;
        }
        return newData;
      });
    } else {
    setFormData(prev => ({ ...prev, [name]: value }));
    }
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
    if (!formData.store_name || !formData.store_code || !formData.address || !formData.latitude || !formData.longitude || !formData.password || !formData.region) {
      setErrorMessage('请填写所有必填项');
      return;
    }

    const currentUser = localStorage.getItem('currentUser') || 'admin';
    
    if (isEditing && editingStore) {
      // 编辑模式
      // 🚀 优化：解构 formData，将需要转换为数字的字段分离出来，避免类型冲突
      const { latitude, longitude, service_area_radius, capacity, ...restFormData } = formData;

      const result = await deliveryStoreService.updateStore(editingStore.id!, {
        ...restFormData,
        latitude: Number(latitude),
        longitude: Number(longitude),
        service_area_radius: Number(service_area_radius),
        capacity: Number(capacity),
        updated_at: new Date().toISOString()
      });

      if (result) {
        setSuccessMessage('合伙店铺信息更新成功！');
        setShowForm(false);
        setEditingStore(null);
        setIsEditing(false);
        loadStores();
      } else {
        setErrorMessage('更新失败，请重试');
      }
    } else {
      // 创建模式
      // 🚀 优化：同样进行解构处理
      const { latitude, longitude, service_area_radius, capacity, ...restFormData } = formData;

      const result = await deliveryStoreService.createStore({
        ...restFormData,
        latitude: Number(latitude),
        longitude: Number(longitude),
        service_area_radius: Number(service_area_radius),
        capacity: Number(capacity),
        created_by: currentUser
      });

      if (result.success) {
        setSuccessMessage('合伙店铺创建成功！');
        setShowForm(false);
        resetForm();
        loadStores();
      } else {
        setErrorMessage(result.error || '创建失败，请重试');
      }
    }
  };

  // 删除店铺
  const handleDeleteStore = async (store: DeliveryStore) => {
    if (!window.confirm(`确定要删除店铺 "${store.store_name}" 吗？\n\n此操作不可撤销！`)) {
      return;
    }

    try {
      const result = await deliveryStoreService.deleteStore(store.id!);
      if (result) {
        setSuccessMessage(`店铺 "${store.store_name}" 已成功删除`);
        loadStores();
      } else {
        setErrorMessage('删除店铺失败，请重试');
      }
    } catch (error) {
      console.error('删除店铺失败:', error);
      setErrorMessage('删除店铺失败，请重试');
    }
  };

  // 关闭/暂停店铺
  const handleCloseStore = async (store: DeliveryStore) => {
    const action = store.status === 'active' ? '暂停营业' : '恢复营业';
    const newStatus = store.status === 'active' ? 'inactive' : 'active';
    
    if (!window.confirm(`确定要${action}店铺 "${store.store_name}" 吗？`)) {
      return;
    }

    try {
      const result = await deliveryStoreService.updateStore(store.id!, {
        ...store,
        status: newStatus as 'active' | 'inactive' | 'maintenance',
        updated_at: new Date().toISOString()
      });
      
      if (result) {
        setSuccessMessage(`店铺 "${store.store_name}" 已${action}`);
        loadStores();
      } else {
        setErrorMessage(`${action}店铺失败，请重试`);
      }
    } catch (error) {
      console.error(`${action}店铺失败:`, error);
      setErrorMessage(`${action}店铺失败，请重试`);
    }
  };

  const resetForm = () => {
    setPlaceSearchInput('');
    setPlaceSuggestions([]);
    setShowPlaceSuggestions(false);
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
      store_type: 'restaurant' as 'restaurant' | 'drinks_snacks' | 'breakfast' | 'cake_shop' | 'tea_shop' | 'flower_shop' | 'clothing_store' | 'grocery' | 'hardware_store' | 'supermarket' | 'transit_station' | 'other',
      operating_hours: '08:00-22:00',
      service_area_radius: 5,
      capacity: 1000,
      facilities: [],
      notes: '',
      password: '',
      region: 'mandalay',
      cod_settlement_day: '7'
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'white',
    fontSize: '0.95rem',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
    fontWeight: 600,
    letterSpacing: '0.5px'
  };

  // const mapContainerStyle = {
  //   width: '100%',
  //   height: '400px',
  //   borderRadius: '12px'
  // };

  const facilityOptions = [
    { key: 'store', label: '店铺' },
    { key: 'storage', label: '仓储区' }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #334155 100%)',
        padding: '24px',
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
          color: 'white',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          gap: '15px'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 700 }}>合伙店铺</h1>
          <p style={{ margin: '6px 0 0 0', opacity: 0.85 }}>管理合伙店铺位置和信息</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '12px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              flex: isMobile ? 1 : 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ← 返回仪表板
          </button>
          <button
            onClick={() => {
              if (showForm) {
                if (isEditing) {
                  setEditingStore(null);
                  setIsEditing(false);
                  setShowForm(false);
                  resetForm();
                } else {
                  setShowForm(false);
                  resetForm();
                }
              } else {
                setShowForm(true);
              }
            }}
            style={{
              background: showForm ? 'rgba(245, 101, 101, 0.2)' : 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
              color: 'white',
              border: showForm ? '1px solid rgba(245, 101, 101, 0.5)' : 'none',
              padding: '12px 28px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: showForm ? 'none' : '0 8px 25px rgba(56, 161, 105, 0.4)',
              flex: isMobile ? 1 : 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              if (!showForm) {
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(56, 161, 105, 0.5)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              if (!showForm) {
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(56, 161, 105, 0.4)';
              }
            }}
          >
            {showForm ? (isEditing ? '✕ 取消编辑' : '✕ 取消') : '➕ 新增合伙店铺'}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{errorMessage || successMessage}</span>
            {errorMessage && errorMessage.includes('加载合伙店铺列表失败') && (
              <button
                onClick={() => loadStores(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  marginLeft: '12px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                🔄 重试
              </button>
            )}
          </div>
        </div>
      )}

      {/* 新增表单 */}
      {showForm && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: isMobile ? '24px' : '32px',
          marginBottom: '32px',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(30px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
              <span style={{ fontSize: '1.8rem' }}>📝</span> {isEditing ? '编辑合伙店铺' : '新增合伙店铺'}
            </h2>
            {/* 区域选择下拉框 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>工作区域：</label>
              <select
                name="region"
                value={formData.region}
                onChange={handleInputChange}
          style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(66, 153, 225, 0.2)',
                  color: '#63b3ed',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              >
                {REGIONS.map(r => (
                  <option key={r.id} value={r.id} style={{ color: '#000' }}>
                    {r.name} ({r.prefix})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>店铺名称 *</label>
                <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="store_name"
                  value={formData.store_name}
                  onChange={handleInputChange}
                  placeholder="例: 缅甸中心店"
                  style={inputStyle}
                  required
                />
                </div>
              </div>
              <div>
                <label style={labelStyle}>店铺代码 * (自动生成)</label>
                <input
                  type="text"
                  name="store_code"
                  value={formData.store_code}
                  readOnly
                  style={{
                    ...inputStyle,
                    background: 'rgba(72, 187, 120, 0.1)',
                    border: '1px solid rgba(72, 187, 120, 0.4)',
                    color: '#48bb78',
                    fontWeight: 'bold',
                    cursor: 'not-allowed'
                  }}
                  placeholder="填写店铺名称后自动生成"
                />
              </div>
              <div>
                <label style={labelStyle}>店铺类型 *</label>
                <div style={{ position: 'relative' }} ref={storeTypeDropdownRef}>
                  <div
                    onClick={() => setShowStoreTypeDropdown(!showStoreTypeDropdown)}
                    style={{
                      ...inputStyle,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: showStoreTypeDropdown ? 'rgba(255, 255, 255, 0.12)' : inputStyle.background,
                      boxShadow: showStoreTypeDropdown ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none',
                      borderColor: showStoreTypeDropdown ? '#3b82f6' : 'rgba(255,255,255,0.2)'
                    }}
                    onMouseOver={(e) => {
                      if (!showStoreTypeDropdown) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!showStoreTypeDropdown) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                  >
                    <span>{STORE_TYPES.find(t => t.value === formData.store_type)?.label || '选择店铺类型'}</span>
                    <span style={{ 
                      transform: showStoreTypeDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                      fontSize: '0.8rem',
                      opacity: 0.7
                    }}>▼</span>
                  </div>
                  
                  {showStoreTypeDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 5px)',
                      left: 0,
                      right: 0,
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      zIndex: 1000,
                      maxHeight: '240px', // 约 6 条数据的高度
                      overflowY: 'auto',
                      animation: 'fadeIn 0.3s ease'
                    }}>
                      {STORE_TYPES.map((type) => (
                        <div
                          key={type.value}
                          onClick={() => {
                            handleInputChange({ target: { name: 'store_type', value: type.value } } as any);
                            setShowStoreTypeDropdown(false);
                          }}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            color: formData.store_type === type.value ? '#48bb78' : 'white',
                            backgroundColor: formData.store_type === type.value ? 'rgba(72, 187, 120, 0.1)' : 'transparent',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                          onMouseOver={(e) => {
                            if (formData.store_type !== type.value) {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (formData.store_type !== type.value) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {type.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={labelStyle}>密码 *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="合伙店铺登录密码"
                  style={inputStyle}
                  required
                />
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
                <label style={labelStyle}>COD 结清日 *</label>
                <select
                  name="cod_settlement_day"
                  value={formData.cod_settlement_day}
                  onChange={handleInputChange}
                  style={inputStyle}
                  required
                >
                  <option value="7" style={{ color: '#000' }}>7天</option>
                  <option value="10" style={{ color: '#000' }}>10天</option>
                  <option value="15" style={{ color: '#000' }}>15天</option>
                  <option value="30" style={{ color: '#000' }}>1个月</option>
                </select>
              </div>
              {!isEditing && (
              <div>
                  <label style={labelStyle}>创建合伙时间</label>
                <input
                    type="text"
                    value={new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    readOnly
                    style={{
                      ...inputStyle,
                      background: 'rgba(255, 255, 255, 0.1)',
                      cursor: 'not-allowed',
                      opacity: 0.7
                    }}
                />
              </div>
              )}
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
              <div style={{ display: 'flex', gap: '20px' }}>
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
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>地图位置选择</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={openMapSelection}
                  style={{
                    background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 8px 20px rgba(49, 130, 206, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 25px rgba(49, 130, 206, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(49, 130, 206, 0.3)';
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
                padding: '12px 32px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                boxShadow: '0 8px 20px rgba(56, 161, 105, 0.35)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 25px rgba(56, 161, 105, 0.45)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(56, 161, 105, 0.35)';
              }}
            >
              {isEditing ? '✅ 更新合伙店铺' : '🚀 创建合伙店铺'}
            </button>
          </form>
        </div>
      )}

      {/* 合伙店铺列表和地图 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
        {/* 合伙店铺列表 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: isMobile ? '16px' : '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white'
          }}
        >
          <h2 style={{
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'space-between',
            rowGap: '12px'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              合伙店铺列表
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', opacity: 0.8 }}>
                ({myanmarCities[selectedCity].name}: {stores.length} 个)
              </span>
            </span>
            {pendingProductReviewCount > 0 && (
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.22)',
                  border: '1px solid rgba(251, 191, 36, 0.55)',
                  color: '#fbbf24',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  padding: '6px 14px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)'
                }}
              >
                🛍️ 待审核共 {pendingProductReviewCount} 件
              </span>
            )}
          </h2>
          {pendingProductReviewCount > 0 && pendingReviewBreakdownLines.length > 0 && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.35)',
                borderRadius: '12px',
                fontSize: '0.84rem',
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.95)'
              }}
            >
              <div style={{ fontWeight: 800, color: '#fbbf24', marginBottom: '8px' }}>
                待审核分布（按店铺，含全部区域）
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', listStyle: 'disc' }}>
                {pendingReviewBreakdownLines.map(({ id, name, count }) => (
                  <li key={id} style={{ marginBottom: '4px' }}>
                    <strong>{name}</strong>：{count} 件新商品待审核
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loading ? (
            <p>加载中...</p>
          ) : stores.length === 0 ? (
            <p style={{ opacity: 0.7 }}>
              {allStores.length === 0 
                ? '暂无合伙店铺数据' 
                : `${myanmarCities[selectedCity].name}地区暂无合伙店铺`}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stores.map((store) => (
                <div
                  key={store.id}
                  data-store-id={store.id}
                  onClick={() => handleStoreClick(store)}
                  style={{
                    background: selectedStore?.id === store.id ? 'rgba(66, 153, 225, 0.25)' : 'rgba(255,255,255,0.08)',
                    border: selectedStore?.id === store.id ? '1px solid rgba(66, 153, 225, 0.5)' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '20px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: selectedStore?.id === store.id ? '0 10px 25px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.1)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    if (selectedStore?.id !== store.id) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    if (selectedStore?.id !== store.id) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{store.store_name}</h3>
                      {store.region && (
                        <span style={{ 
                          background: 'rgba(72, 187, 120, 0.2)', 
                          color: '#48bb78', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '0.7rem',
                          border: '1px solid rgba(72, 187, 120, 0.3)'
                        }}>
                          {REGIONS.find(r => r.id === store.region)?.prefix || store.region}
                        </span>
                      )}
                    </div>
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
                  {store.id && (pendingReviewByStoreId[store.id] ?? 0) > 0 && (
                    <div
                      role="status"
                      style={{
                        marginTop: '10px',
                        marginBottom: '6px',
                        padding: '10px 12px',
                        background: 'rgba(245, 158, 11, 0.2)',
                        border: '1px solid rgba(251, 191, 36, 0.5)',
                        borderRadius: '12px',
                        color: '#fef3c7',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        lineHeight: 1.45
                      }}
                    >
                      <span aria-hidden style={{ flexShrink: 0 }}>{String.fromCodePoint(0x1f514)}</span>
                      <span>
                        本店（{store.store_name}）有 <strong style={{ color: '#fff' }}>{pendingReviewByStoreId[store.id]}</strong>{' '}
                        件新商品待审核，请点击「进入店铺」，在商品列表中切换到「待审核」进行通过或拒绝。
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', opacity: 0.7 }}>
                    <span>📞 {store.phone}</span>
                    <span>👤 {store.manager_name}</span>
                    <span>⏰ {store.operating_hours}</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', opacity: 0.6 }}>
                    <span>类型: {
                      {
                        restaurant: '餐厅',
                        drinks_snacks: '饮料和小吃',
                        breakfast: '早点铺',
                        cake_shop: '蛋糕店',
                        tea_shop: '茶铺',
                        flower_shop: '鲜花店',
                        clothing_store: '服装店',
                        grocery: '杂货店',
                        hardware_store: '五金店',
                        supermarket: '超市',
                        transit_station: '中转站',
                        other: '其它'
                      }[store.store_type] || store.store_type
                    }</span>
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
                      店长收件码
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        viewStoreProducts(store);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
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
                        boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(245, 158, 11, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(245, 158, 11, 0.3)';
                      }}
                    >
                      进入店铺
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
                      编辑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadStoragePackages(store);
                      }}
                      style={{
                        background: store.store_type === 'transit_station' 
                          ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)'
                          : 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)',
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
                        boxShadow: store.store_type === 'transit_station'
                          ? '0 2px 6px rgba(155, 89, 182, 0.3)'
                          : '0 2px 6px rgba(230, 126, 34, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = store.store_type === 'transit_station'
                          ? '0 4px 8px rgba(155, 89, 182, 0.4)'
                          : '0 4px 8px rgba(230, 126, 34, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = store.store_type === 'transit_station'
                          ? '0 2px 6px rgba(155, 89, 182, 0.3)'
                          : '0 2px 6px rgba(230, 126, 34, 0.3)';
                      }}
                    >
                      {store.store_type === 'transit_station' ? '中转包裹' : '入库'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseStore(store);
                      }}
                      style={{
                        background: store.status === 'active' 
                          ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
                          : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
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
                        boxShadow: store.status === 'active' 
                          ? '0 2px 6px rgba(243, 156, 18, 0.3)'
                          : '0 2px 6px rgba(39, 174, 96, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = store.status === 'active' 
                          ? '0 4px 8px rgba(243, 156, 18, 0.4)'
                          : '0 4px 8px rgba(39, 174, 96, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = store.status === 'active' 
                          ? '0 2px 6px rgba(243, 156, 18, 0.3)'
                          : '0 2px 6px rgba(39, 174, 96, 0.3)';
                      }}
                    >
                      {store.status === 'active' ? '暂停' : '恢复'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStore(store);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
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
                        boxShadow: '0 2px 6px rgba(231, 76, 60, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(231, 76, 60, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(231, 76, 60, 0.3)';
                      }}
                    >
                      删除
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
          <h2 style={{ marginBottom: '20px' }}>合伙店铺分布图</h2>
          <div style={{ 
            position: 'relative',
            width: '100%',
            height: '400px',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {/* 城市选择器 - 与实时跟踪页面完全一致 */}
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
                onChange={(e) => {
                  const selectedKey = e.target.value as typeof selectedCity;
                  setSelectedCity(selectedKey);
                  const city = myanmarCities[selectedKey];
                  setMapCenter({ lat: city.lat, lng: city.lng });
                  setSelectedStore(null);
                }}
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

          <ErrorBoundary>
              {!isMapLoaded ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>正在加载地图...</h3>
                  <p style={{ margin: '0', opacity: 0.8 }}>请稍候，正在连接Google Maps服务</p>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '3px solid #3498db',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginTop: '1rem'
                  }}></div>
                </div>
              ) : mapLoadError ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(231, 76, 60, 0.1)',
                  color: 'white',
                  textAlign: 'center',
                  padding: '2rem',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#e74c3c' }}>地图加载失败</h3>
                  <p style={{ margin: '0', opacity: 0.8 }}>{getMapErrorMessage()}</p>
                </div>
              ) : (
              <GoogleMap
                  key={selectedCity}
                  mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '12px' }}
                center={mapCenter}
                zoom={12}
                  options={{
                    disableDefaultUI: false,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                  }}
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
                        padding: '0',
                        minWidth: '280px',
                        maxWidth: '320px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        backgroundColor: '#fff'
                      }}>
                        {/* 头部：店铺名称 */}
                        <div style={{
                          background: 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)',
                          padding: '16px',
                          color: 'white',
                          position: 'relative'
                    }}>
                      <h3 style={{ 
                            margin: 0,
                            fontSize: '18px',
                        fontWeight: 'bold',
                            letterSpacing: '0.5px',
                            lineHeight: '1.4'
                      }}>
                        {selectedStore.store_name}
                      </h3>
                          <div style={{
                            fontSize: '12px',
                            opacity: 0.9,
                            marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                            flexWrap: 'wrap',
                        gap: '6px'
                      }}>
                            <span style={{ 
                              background: 'rgba(255,255,255,0.2)', 
                              padding: '2px 8px', 
                              borderRadius: '12px',
                              fontWeight: '500'
                            }}>
                              {selectedStore.store_code || '无编号'}
                            </span>
                            {selectedStore.store_type && (
                              <span style={{ 
                                background: 'rgba(255,255,255,0.2)', 
                                padding: '2px 8px', 
                                borderRadius: '12px',
                                fontWeight: '500'
                              }}>
                                {{
                                  restaurant: '餐厅',
                                  drinks_snacks: '饮料和小吃',
                                  breakfast: '早点铺',
                                  cake_shop: '蛋糕店',
                                  tea_shop: '茶铺',
                                  flower_shop: '鲜花店',
                                  clothing_store: '服装店',
                                  grocery: '杂货店',
                                  hardware_store: '五金店',
                                  supermarket: '超市',
                                  transit_station: '中转站',
                                  other: '其它'
                                }[selectedStore.store_type] || selectedStore.store_type}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 内容区域 */}
                        <div style={{ padding: '16px' }}>
                          {/* 地址 */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
                            <span style={{ fontSize: '18px', marginTop: '-2px' }}>📍</span>
                            <span style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.5', flex: 1 }}>{selectedStore.address}</span>
                          </div>

                          {/* 联系信息 Grid */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>📞</span>
                              <span style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>{selectedStore.phone}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>👤</span>
                              <span style={{ fontSize: '14px', color: '#2d3748' }}>{selectedStore.manager_name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>⏰</span>
                              <span style={{ fontSize: '14px', color: '#2d3748' }}>{selectedStore.operating_hours}</span>
                            </div>
                          </div>

                          {/* 状态和按钮区域 */}
                          <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                            justifyContent: 'space-between', 
                            marginTop: '16px', 
                            paddingTop: '16px', 
                            borderTop: '1px solid #e2e8f0' 
                      }}>
                            {/* 状态标签 */}
                      <div style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                        fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: selectedStore.status === 'active' ? '#def7ec' : selectedStore.status === 'maintenance' ? '#fefcbf' : '#fed7d7',
                              color: selectedStore.status === 'active' ? '#03543f' : selectedStore.status === 'maintenance' ? '#744210' : '#9b2c2c',
                            }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }}></div>
                              {selectedStore.status === 'active' ? '营业中' : selectedStore.status === 'maintenance' ? '维护中' : '暂停营业'}
                            </div>

                            {/* 按钮 */}
                            <button
                              onClick={async () => {
                                // 关闭地图弹窗
                                setSelectedStore(null);
                                // 打开店铺包裹查看模态框
                                if (selectedStore && selectedStore.id) {
                                  setCurrentViewStore(selectedStore);
                                  setShowStorePackagesModal(true);
                                  setLoadingStorePackages(true);
                                  
                                  try {
                                    const packages = await packageService.getPackagesByStoreId(selectedStore.id);
                                    setStorePackages(packages);
                                  } catch (error) {
                                    console.error('加载店铺包裹失败:', error);
                                    setErrorMessage('加载店铺包裹失败，请重试');
                                    setStorePackages([]);
                                  } finally {
                                    setLoadingStorePackages(false);
                                  }
                                }
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(47, 133, 90, 0.3)',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(47, 133, 90, 0.4)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(47, 133, 90, 0.3)';
                              }}
                            >
                              进店查看 →
                            </button>
                          </div>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
              )}
          </ErrorBoundary>
        </div>
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
                  📦 {selectedStore.store_name} - 中转站包裹
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
              {false ? ( // loadingPackages 暂时禁用
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                  <p>正在加载包裹列表...</p>
                </div>
              ) : storagePackages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏪</div>
                  <p>暂无中转站包裹</p>
                  <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                    该店铺还没有收到任何中转包裹
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {storagePackages.map((pkg) => (
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 193, 7, 0.3)',
                            fontSize: '0.8rem',
                            color: '#ffc107'
                          }}>
                            🏪 已到达中转站
                          </span>
                          {pkg.sender_code && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(52, 152, 219, 0.3)',
                              fontSize: '0.8rem',
                              color: '#3498db',
                              fontWeight: 'bold'
                            }}>
                              📱 寄件码: {pkg.sender_code}
                            </span>
                          )}
                        </div>
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleForwardPackage(pkg);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            🚚 转发包裹
                          </button>
                        </div>
                      </div>
                      
                      {pkg.delivery_time && (
                        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255, 193, 7, 0.2)', borderRadius: '6px' }}>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#ffc107' }}>
                            ⏰ 到达中转站时间: {new Date(pkg.delivery_time).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 统计信息 */}
            {storagePackages.length > 0 && (
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
                    {storagePackages.length}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>总包裹数</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', color: '#2ecc71', fontWeight: 'bold' }}>
                    {storagePackages.reduce((sum, pkg) => sum + parseFloat(pkg.weight || '0'), 0).toFixed(1)}kg
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>总重量</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', color: '#f39c12', fontWeight: 'bold' }}>
                    ¥{storagePackages.reduce((sum, pkg) => sum + parseFloat(pkg.price || '0'), 0).toFixed(2)}
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
              border: '2px solid rgba(255, 255, 255, 0.2)',
              position: 'relative'
            }}>
              {!isMapLoaded ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>正在加载地图...</h3>
                  <p style={{ margin: '0', opacity: 0.8 }}>请稍候，正在连接Google Maps服务</p>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '3px solid #3498db',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginTop: '1rem'
                  }}></div>
                </div>
              ) : mapLoadError ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(231, 76, 60, 0.1)',
                  color: 'white',
                  textAlign: 'center',
                  padding: '2rem'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#e74c3c' }}>地图加载失败</h3>
                  <p style={{ margin: '0 0 1rem 0', opacity: 0.8 }}>{getMapErrorMessage()}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        // 强制重新加载页面
                        window.location.reload();
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      🔄 重新加载
                    </button>
                    <button
                      onClick={() => {
                        // 手动输入坐标的备用方案
                        const lat = prompt('请输入纬度 (latitude):\n例如: 21.9588');
                        const lng = prompt('请输入经度 (longitude):\n例如: 96.0891');
                        if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
                          setFormData(prev => ({
                            ...prev,
                            latitude: lat,
                            longitude: lng
                          }));
                          setShowMapModal(false);
                          setSuccessMessage('位置已手动设置');
                        } else if (lat && lng) {
                          alert('请输入有效的数字坐标');
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      📍 手动输入坐标
                    </button>
                    <button
                      onClick={() => {
                        // 使用预设的常用位置
                        const locations = [
                          { name: '曼德勒市中心', lat: '21.9588', lng: '96.0891' },
                          { name: '仰光市中心', lat: '16.8661', lng: '96.1951' },
                          { name: '内比都', lat: '19.7633', lng: '96.0785' }
                        ];
                        
                        const choice = prompt(`请选择预设位置:\n1. 曼德勒市中心\n2. 仰光市中心\n3. 内比都\n\n请输入数字 (1-3):`);
                        const index = parseInt(choice || '0') - 1;
                        
                        if (index >= 0 && index < locations.length) {
                          const location = locations[index];
                          setFormData(prev => ({
                            ...prev,
                            latitude: location.lat,
                            longitude: location.lng
                          }));
                          setShowMapModal(false);
                          setSuccessMessage(`已选择${location.name}位置`);
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      🏙️ 选择预设位置
                    </button>
                  </div>
                </div>
              ) : (
                <ErrorBoundary>
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={mapCenter}
                      zoom={12}
                      onClick={handleMapClick}
                      onLoad={onMapLoad}
                    >
                    {formData.latitude && formData.longitude && isMapLoaded && window.google && (
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
                </ErrorBoundary>
              )}
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
                disabled={!formData.latitude || !formData.longitude || !isMapLoaded || !!mapLoadError}
                style={{
                  background: (!formData.latitude || !formData.longitude || !isMapLoaded || !!mapLoadError) ? '#94a3b8' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: (!formData.latitude || !formData.longitude || !isMapLoaded || !!mapLoadError) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  if (formData.latitude && formData.longitude && isMapLoaded && !mapLoadError) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (formData.latitude && formData.longitude && isMapLoaded && !mapLoadError) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                  }
                }}
              >
                {!isMapLoaded ? '⏳ 加载中...' : mapLoadError ? '❌ 加载失败' : '✅ 确认位置'}
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

      {/* 入库包裹模态框 */}
      {showStorageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              color: 'white'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>
                  📦 {currentStorageStore ? `${currentStorageStore.store_name} - 入库包裹` : '入库包裹管理'}
                </h2>
                <p style={{ margin: '6px 0 0 0', opacity: 0.85, fontSize: '0.9rem' }}>
                  {currentStorageStore ? `骑手送到 ${currentStorageStore.store_name} 的包裹信息` : '骑手送来的包裹信息'}
                </p>
              </div>
              <button
                onClick={() => setShowStorageModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ✕ 关闭
              </button>
            </div>

            {/* 统计信息 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                  {storagePackages.length}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, color: 'white' }}>
                  总包裹数
                </div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚚</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                  {new Set(storagePackages.map(pkg => pkg.courier).filter(Boolean)).size}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, color: 'white' }}>
                  参与骑手
                </div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏪</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                  {storagePackages.filter(pkg => pkg.status === '已送达').length}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, color: 'white' }}>
                  已到达中转站
                </div>
              </div>
            </div>

            {/* 包裹列表 */}
            {loadingStorage ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'white',
                opacity: 0.8
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                <p>加载包裹信息中...</p>
              </div>
            ) : storagePackages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'white',
                opacity: 0.8
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
                <h3 style={{ margin: '0 0 8px 0' }}>暂无入库包裹</h3>
                <p style={{ margin: 0, opacity: 0.7 }}>
                  {currentStorageStore ? `骑手还没有送包裹到 ${currentStorageStore.store_name}` : '骑手还没有送包裹到这家店铺'}
                </p>
              </div>
            ) : (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '1.1rem' }}>
                  📋 入库包裹详情
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {storagePackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600 }}>
                            📦 {pkg.id}
                          </h4>
                          <p style={{ margin: '0', fontSize: '0.85rem', opacity: 0.8 }}>
                            {pkg.sender_name} → {pkg.receiver_name}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: pkg.status === '已送达' ? 'rgba(72, 187, 120, 0.3)' : 
                                       pkg.status === '待派送' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(160, 174, 192, 0.3)',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: pkg.status === '已送达' ? '#48bb78' : 
                                   pkg.status === '待派送' ? '#ffc107' : '#a0aec0'
                          }}>
                            {pkg.status === '已送达' ? '🏪 已到达中转站' : pkg.status}
                          </span>
                          {pkg.transfer_code && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateTransferQRCode(pkg);
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                boxShadow: '0 2px 4px rgba(155, 89, 182, 0.3)'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(155, 89, 182, 0.4)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(155, 89, 182, 0.3)';
                              }}
                            >
                              🔄 中转码
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', opacity: 0.9 }}>
                        <div>
                          <span style={{ color: '#e53e3e' }}>🚚</span> 骑手: {pkg.courier || '未分配'}
                        </div>
                        <div>
                          <span style={{ color: '#805ad5' }}>📅</span> 送达时间: {pkg.delivery_time ? new Date(pkg.delivery_time).toLocaleString() : '未送达'}
                        </div>
                        <div>
                          <span style={{ color: '#38a169' }}>📏</span> 重量: {pkg.weight}kg
                        </div>
                        <div>
                          <span style={{ color: '#d69e2e' }}>💰</span> 费用: ¥{pkg.price}
                        </div>
                        {pkg.transfer_code && (
                          <div style={{ gridColumn: '1 / -1', marginTop: '4px', padding: '4px 8px', background: 'rgba(155, 89, 182, 0.2)', borderRadius: '4px', border: '1px solid rgba(155, 89, 182, 0.3)' }}>
                            <span style={{ color: '#9b59b6' }}>🔄</span> 中转码: {pkg.transfer_code}
                          </div>
                        )}
                      </div>
                      
                      {pkg.description && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          opacity: 0.8
                        }}>
                          <span style={{ color: '#4299e1' }}>📝</span> 备注: {pkg.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 中转码二维码模态框 */}
      {showTransferQRModal && currentTransferPackage && (
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
                🔄 中转码二维码
              </h2>
              <button
                onClick={() => setShowTransferQRModal(false)}
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

            {/* 包裹信息 */}
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
                包裹信息
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
                  包裹ID: {currentTransferPackage.id}
                </p>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#2c5282',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}>
                  中转码: {currentTransferPackage.transfer_code}
                </p>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  寄件人: {currentTransferPackage.sender_name}
                </p>
                <p style={{
                  margin: 0,
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  收件人: {currentTransferPackage.receiver_name}
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
                中转码二维码
              </h3>
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '10px',
                display: 'inline-block',
                marginBottom: '1rem'
              }}>
                {transferQRCodeDataUrl ? (
                  <img 
                    src={transferQRCodeDataUrl} 
                    alt="中转码二维码" 
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(155, 89, 182, 0.3)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '200px',
                    height: '200px',
                    background: '#f8f9fa',
                    border: '2px dashed #9b59b6',
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
                骑手扫描此二维码确认包裹中转<br/>
                中转码: {currentTransferPackage.transfer_code}<br/>
                请妥善保管此中转码
              </p>
            </div>

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  if (transferQRCodeDataUrl) {
                    const link = document.createElement('a');
                    link.href = transferQRCodeDataUrl;
                    link.download = `中转码_${currentTransferPackage.id}_${currentTransferPackage.transfer_code}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                disabled={!transferQRCodeDataUrl}
                style={{
                  background: !transferQRCodeDataUrl ? '#94a3b8' : 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: !transferQRCodeDataUrl ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  if (transferQRCodeDataUrl) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(155, 89, 182, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (transferQRCodeDataUrl) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(155, 89, 182, 0.3)';
                  }
                }}
              >
                📥 保存二维码
              </button>
              <button
                onClick={() => setShowTransferQRModal(false)}
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

      {/* 店铺包裹查看模态框 */}
      {showStorePackagesModal && currentViewStore && (
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
            maxWidth: '900px',
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
                  📦 {currentViewStore.store_name} - 包裹列表
                </h2>
                <p style={{
                  margin: '0.5rem 0 0 0',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem'
                }}>
                  {currentViewStore.store_code} | {storePackages.length} 个包裹
                </p>
              </div>
              <button
                onClick={() => {
                  setShowStorePackagesModal(false);
                  setCurrentViewStore(null);
                  setStorePackages([]);
                }}
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
            {loadingStorePackages ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                <p>加载包裹数据中...</p>
              </div>
            ) : storePackages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>暂无包裹数据</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  该店铺还没有相关的包裹记录
                </p>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                maxHeight: '60vh',
                overflowY: 'auto',
                paddingRight: '0.5rem'
              }}>
                {storePackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '1rem',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          <h3 style={{
                            margin: 0,
                            color: '#A5C7FF',
                            fontSize: '1.1rem',
                            fontWeight: 'bold'
                          }}>
                            📦 {pkg.id}
                          </h3>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: pkg.status === '已送达' ? 'rgba(72, 187, 120, 0.3)' :
                                       pkg.status === '配送中' ? 'rgba(59, 130, 246, 0.3)' :
                                       pkg.status === '待取件' ? 'rgba(251, 191, 36, 0.3)' :
                                       'rgba(156, 163, 175, 0.3)',
                            color: pkg.status === '已送达' ? '#48bb78' :
                                   pkg.status === '配送中' ? '#3b82f6' :
                                   pkg.status === '待取件' ? '#fbbf24' :
                                   '#9ca3af'
                          }}>
                            {pkg.status}
                          </span>
                          {/* 代收款显示 - 只有合伙店铺下单且需要代收款时才显示 */}
                          {pkg.delivery_store_id && (pkg.cod_amount ? parseFloat(pkg.cod_amount.toString()) : 0) > 0 && (
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: 'rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.5)',
                              whiteSpace: 'nowrap'
                            }}>
                              {language === 'zh' ? '代收款' : language === 'en' ? 'COD' : 'ငွေကောက်ခံရမည့်ပမာဏ'}: {(() => {
                                const value = parseFloat(pkg.cod_amount?.toString() || '0');
                                return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
                              })()} MMK
                            </span>
                          )}
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.75rem',
                          fontSize: '0.9rem',
                          color: 'rgba(255, 255, 255, 0.9)',
                          marginBottom: '0.5rem'
                        }}>
                          <div>
                            <span style={{ opacity: 0.7 }}>店铺名称:</span> {currentViewStore.store_name}
                          </div>
                          <div>
                            <span style={{ opacity: 0.7 }}>店铺电话:</span> {currentViewStore.phone}
                          </div>
                          <div>
                            <span style={{ opacity: 0.7 }}>收件人:</span> {pkg.receiver_name}
                          </div>
                          <div>
                            <span style={{ opacity: 0.7 }}>电话:</span> {pkg.receiver_phone}
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ opacity: 0.7 }}>地址:</span> {pkg.receiver_address}
                          </div>
                        </div>
                        {/* 代收款金额 - 突出显示 */}
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.85rem 1rem',
                          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.3) 100%)',
                          borderRadius: '8px',
                          border: '2px solid rgba(251, 191, 36, 0.5)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'stretch',
                            gap: '0.75rem',
                            width: '100%',
                            boxSizing: 'border-box',
                            overflow: 'visible'
                          }}>
                            {/* 左侧：总金额 */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              flex: '0 0 auto',
                              minWidth: '110px',
                              paddingRight: '0.75rem',
                              borderRight: '1px solid rgba(251, 191, 36, 0.3)',
                              boxSizing: 'border-box'
                            }}>
                              <span style={{
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                lineHeight: '1',
                                flexShrink: 0
                              }}>💰</span>
                              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: '0.65rem',
                                  color: 'rgba(255, 255, 255, 0.85)',
                                  marginBottom: '0.15rem',
                                  fontWeight: '500',
                                  lineHeight: '1.2',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {language === 'zh' ? '总金额' : language === 'en' ? 'Total Amount' : 'စုစုပေါင်းငွေ'}
                                </div>
                                <div style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 'bold',
                                  color: '#fbbf24',
                                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                  lineHeight: '1.2',
                                  letterSpacing: '0.1px',
                                  whiteSpace: 'nowrap',
                                  wordBreak: 'keep-all'
                                }}>
                                  {(() => {
                                    const storeFee = parseFloat(pkg.cod_amount?.toString() || '0');
                                    const deliveryFee = parseFloat(pkg.delivery_fee?.toString() || '0');
                                    const priceValue = parseFloat(pkg.price?.toString() || '0');
                                    // 如果 delivery_fee 为 0，使用 price 作为跑腿费
                                    const actualDeliveryFee = deliveryFee > 0 ? deliveryFee : priceValue;
                                    const total = storeFee + actualDeliveryFee;
                                    const displayValue = total > 0 ? total : parseFloat(pkg.price || '0');
                                    return displayValue % 1 === 0 ? displayValue.toString() : displayValue.toFixed(2).replace(/\.?0+$/, '');
                                  })()} MMK
                                </div>
                              </div>
                            </div>
                            
                            {/* 中间：费用明细 - 横向布局 */}
                            <div style={{
                              display: 'flex',
                              flex: '1',
                              gap: '1rem',
                              justifyContent: 'space-between',
                              alignItems: 'stretch',
                              padding: '0 0.75rem',
                              borderRight: '1px solid rgba(251, 191, 36, 0.3)',
                              minWidth: '280px',
                              maxWidth: '400px',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                flex: '1',
                                minWidth: '110px',
                                maxWidth: '150px',
                                boxSizing: 'border-box'
                              }}>
                                <div style={{
                                  fontSize: '0.65rem',
                                  color: 'rgba(255, 255, 255, 0.8)',
                                  fontWeight: '500',
                                  lineHeight: '1.2',
                                  marginBottom: '0.1rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {language === 'zh' ? '代收款' : language === 'en' ? 'COD Amount' : 'ငွေကောက်ခံရမည့်ပမာဏ'}
                                </div>
                                <div style={{
                                  fontSize: '0.85rem',
                                  color: '#fbbf24',
                                  fontWeight: '700',
                                  lineHeight: '1.3',
                                  letterSpacing: '0.2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {(() => {
                                    const value = parseFloat(pkg.cod_amount?.toString() || '0');
                                    return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
                                  })()} MMK
                                </div>
                              </div>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                flex: '1',
                                minWidth: '110px',
                                maxWidth: '150px',
                                boxSizing: 'border-box'
                              }}>
                                <div style={{
                                  fontSize: '0.65rem',
                                  color: 'rgba(255, 255, 255, 0.8)',
                                  fontWeight: '500',
                                  lineHeight: '1.2',
                                  marginBottom: '0.1rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {language === 'zh' ? '跑腿费' : language === 'en' ? 'Delivery Fee' : 'ပို့ဆောင်ခ'}
                                </div>
                                <div style={{
                                  fontSize: '0.85rem',
                                  color: '#3b82f6',
                                  fontWeight: '700',
                                  lineHeight: '1.3',
                                  letterSpacing: '0.2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {(() => {
                                    const deliveryFee = parseFloat(pkg.delivery_fee?.toString() || '0');
                                    const priceValue = parseFloat(pkg.price?.toString() || '0');
                                    // 如果 delivery_fee 为 0，使用 price 作为跑腿费
                                    const value = deliveryFee > 0 ? deliveryFee : priceValue;
                                    return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
                                  })()} MMK
                                </div>
                              </div>
                            </div>
                            
                            {/* 右侧：支付方式 */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'flex-start',
                              flex: '0 0 auto',
                              minWidth: '90px',
                              maxWidth: '140px',
                              paddingLeft: '0.75rem',
                              boxSizing: 'border-box',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                fontSize: '0.65rem',
                                color: 'rgba(255, 255, 255, 0.85)',
                                marginBottom: '0.2rem',
                                fontWeight: '500',
                                lineHeight: '1.2',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                width: '100%'
                              }}>
                                {language === 'zh' ? '支付方式' : language === 'en' ? 'Payment Method' : 'ငွေပေးချေမှုနည်းလမ်း'}
                              </div>
                              <div style={{
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                color: pkg.payment_method === 'qr' ? '#3b82f6' : '#10b981',
                                padding: '0.2rem 0.5rem',
                                background: pkg.payment_method === 'qr' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                borderRadius: '6px',
                                border: `1px solid ${pkg.payment_method === 'qr' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                                whiteSpace: 'nowrap',
                                lineHeight: '1.3',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%',
                                boxSizing: 'border-box'
                              }}>
                                {pkg.payment_method === 'qr' 
                                  ? (language === 'zh' ? '📱 二维码支付' : language === 'en' ? '📱 QR Payment' : '📱 QR Code ငွေပေးချေမှု')
                                  : pkg.payment_method === 'cash' 
                                  ? (language === 'zh' ? '💵 现金支付' : language === 'en' ? '💵 Cash Payment' : '💵 ငွေသားငွေပေးချေမှု')
                                  : (language === 'zh' ? '未设置' : language === 'en' ? 'Not Set' : 'မသတ်မှတ်ထားပါ')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{
                        textAlign: 'right',
                        marginLeft: '1rem',
                        minWidth: '120px'
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginBottom: '0.5rem'
                        }}>
                          {pkg.package_type}
                        </div>
                        <div style={{
                          fontSize: '0.8rem',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginBottom: '0.5rem'
                        }}>
                          {pkg.weight} kg
                        </div>
                        {pkg.create_time && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                            marginTop: '0.5rem'
                          }}>
                            {new Date(pkg.create_time).toLocaleDateString('zh-CN')}
                          </div>
                        )}
                      </div>
                    </div>
                    {pkg.description && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: 'rgba(255, 255, 255, 0.8)'
                      }}>
                        <span style={{ opacity: 0.7 }}>备注:</span> {pkg.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🚀 新增：店铺商品详情弹窗 */}
      {showProductsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '800px',
            background: '#1e293b',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>🛍️ {viewingStoreName} - 商品列表</h2>
                <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                  共 {productListCounts.all} 件 · 待审 {productListCounts.pending} · 已完成 {productListCounts.approved} · 已取消 {productListCounts.rejected}
                </p>
              </div>
              <button 
                onClick={() => { setShowProductsModal(false); setViewingStoreId(null); }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  width: '40px',
                  height: '40px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >✕</button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {loadingProducts ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(255,255,255,0.1)',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  <p style={{ color: 'white' }}>正在加载店铺商品...</p>
                </div>
              ) : storeProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📦</div>
                  <p style={{ fontSize: '1.2rem' }}>该店铺暂未添加任何商品</p>
                </div>
              ) : (
                <>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginBottom: '20px'
                }}>
                  {([
                    { key: 'all' as const, label: '全部' },
                    { key: 'pending' as const, label: '待审核' },
                    { key: 'approved' as const, label: '已完成' },
                    { key: 'rejected' as const, label: '已取消' },
                  ]).map(({ key, label }) => {
                    const count = key === 'all' ? productListCounts.all : productListCounts[key];
                    const active = productListFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setProductListFilter(key)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: active ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.15)',
                          background: active ? 'rgba(37, 99, 235, 0.4)' : 'rgba(255,255,255,0.06)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {label} <span style={{ opacity: 0.75 }}>({count})</span>
                      </button>
                    );
                  })}
                </div>
                {filteredStoreProducts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.45)' }}>
                    <p style={{ fontSize: '1.1rem', margin: 0 }}>该状态下暂无商品</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.7 }}>请切换上方状态或等待商家提交</p>
                  </div>
                ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '20px'
                }}>
                  {filteredStoreProducts.map((product) => (
                    <div key={product.id} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'transform 0.3s ease'
                    }}>
                      <div style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '12px',
                        background: '#0f172a',
                        marginBottom: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '2rem' }}>🖼️</span>
                        )}
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'white' }}>{product.name}</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>{product.price.toLocaleString()} MMK</span>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          padding: '2px 8px', 
                          borderRadius: '6px',
                          background: product.is_available ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: product.is_available ? '#10b981' : '#ef4444'
                        }}>
                          {product.is_available ? '在售' : '下架'}
                        </span>
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background:
                            normalizeProductListingStatus(product) === 'pending'
                              ? 'rgba(245, 158, 11, 0.25)'
                              : normalizeProductListingStatus(product) === 'rejected'
                                ? 'rgba(239, 68, 68, 0.25)'
                                : 'rgba(16, 185, 129, 0.2)',
                          color:
                            normalizeProductListingStatus(product) === 'pending'
                              ? '#fbbf24'
                              : normalizeProductListingStatus(product) === 'rejected'
                                ? '#f87171'
                                : '#34d399',
                        }}>
                          {normalizeProductListingStatus(product) === 'pending'
                            ? '待审核'
                            : normalizeProductListingStatus(product) === 'rejected'
                              ? '已取消'
                              : '已完成'}
                        </span>
                      </div>
                      {normalizeProductListingStatus(product) !== 'approved' && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={productListingActionId === product.id}
                            onClick={(e) => { e.stopPropagation(); updateProductListingStatus(product.id, 'approved'); }}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: 'none',
                              cursor: productListingActionId === product.id ? 'wait' : 'pointer',
                              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            {productListingActionId === product.id ? '…' : '通过上架'}
                          </button>
                          <button
                            type="button"
                            disabled={productListingActionId === product.id}
                            onClick={(e) => { e.stopPropagation(); updateProductListingStatus(product.id, 'rejected'); }}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: '1px solid rgba(248, 113, 113, 0.5)',
                              cursor: productListingActionId === product.id ? 'wait' : 'pointer',
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#fca5a5',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                      <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                        库存: {product.stock === -1 ? '无限' : product.stock}
                      </div>
                    </div>
                  ))}
                </div>
                )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryStoreManagement;
