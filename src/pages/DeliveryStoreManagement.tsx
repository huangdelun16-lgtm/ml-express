import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase, deliveryStoreService, productService, DeliveryStore, packageService, Package } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';
import QRCode from 'qrcode';
import { GOOGLE_MAPS_LIBRARIES } from '../constants/googleMaps';
import { notifyAdminTodosRefresh } from '../utils/adminTodoBridge';
import { useAdminTodo } from '../contexts/AdminTodoContext';
import '../styles/productVariantsEditor.css';
import { prepareProductImage, PrepareProductImageSettings } from '../utils/productImagePrepare';
import {
  normalizeProductVariants,
  syncProductAggregateFromVariants,
  validateVariants,
} from '../utils/productVariants';
import '../styles/adminStoreCreateForm.css';
import {
  isStoreCodeTaken,
  resolveNextStoreCodeForPrefix,
} from '../utils/merchantStoreCode';
import { feedbackService } from '../services/FeedbackService';
import ProductReviewRejectModal from '../components/ProductReviewRejectModal';
import StoreLicenseDocsModal from '../components/StoreLicenseDocsModal';
import { fetchStoreLicenseDocuments } from '../services/merchantApplicationService';
import '../styles/merchantApplications.css';
import { applyProductReviewDecision } from '../services/productReviewQueueService';
import { isValidRejectReason } from '../utils/productReviewDecision';
import { normalizeStorePackingSlaMinutes } from '../services/_shared/packingCountdown';
import { withPublicProductImages } from '../utils/supabaseBrowserUrl';

import {
  ErrorBoundary,
  GOOGLE_MAPS_API_KEY,
  REGIONS,
  STORE_TYPE_LABELS,
  DEFAULT_OPERATING_HOURS,
  parseOperatingHours,
  formatOperatingHours,
  regionToCityKey,
  DEFAULT_ADMIN_PRODUCT_FORM,
  normalizeProductListingStatus,
  hasPendingProductUpdate,
  productNeedsAdminReview,
} from './deliveryStore/deliveryStoreShared';
import { DeliveryStoreWorkspaceProvider } from './deliveryStore/DeliveryStoreWorkspace';
import DeliveryStoreOverlays from './deliveryStore/DeliveryStoreOverlays';

const DeliveryStoreManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeListSearchQ = (searchParams.get('q') || '').trim().toLowerCase();
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
  const [licenseDocsStore, setLicenseDocsStore] = useState<DeliveryStore | null>(null);
  const [licenseDocsUrls, setLicenseDocsUrls] = useState<string[]>([]);
  const [licenseDocsLoading, setLicenseDocsLoading] = useState(false);
  const [licenseDocsError, setLicenseDocsError] = useState<string | null>(null);
  const [viewingStoreName, setViewingStoreName] = useState('');
  const [viewingStoreId, setViewingStoreId] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productListingActionId, setProductListingActionId] = useState<string | null>(null);
  const [rejectTargetProductId, setRejectTargetProductId] = useState<string | null>(null);
  /** 商品列表弹窗：全部 / 待审核 / 已完成(已通过) / 已取消(已拒绝) */
  const [productListFilter, setProductListFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedAdminProductId, setSelectedAdminProductId] = useState<string | null>(null);
  /** 全局待审核商品数（listing_status=pending），用于列表区与仪表板一致提示 */
  const [pendingProductReviewCount, setPendingProductReviewCount] = useState(0);
  const { counts: adminTodoCounts, refresh: refreshAdminTodos } = useAdminTodo();
  const pendingMerchantApplications = adminTodoCounts.pendingMerchantApplications;
  const overdueMerchantAccept = adminTodoCounts.overdueMerchantAccept;
  const prevMerchantAppsRef = useRef<number | null>(null);
  const [merchantAppAlertPulse, setMerchantAppAlertPulse] = useState(false);

  /** 合伙店铺页：更频繁刷新入驻申请待办，并在有新申请时提示 */
  useEffect(() => {
    void refreshAdminTodos();
    const timer = window.setInterval(() => void refreshAdminTodos(), 30000);
    return () => window.clearInterval(timer);
  }, [refreshAdminTodos]);

  useEffect(() => {
    const prev = prevMerchantAppsRef.current;
    const current = pendingMerchantApplications;
    if (prev !== null && current > prev) {
      setMerchantAppAlertPulse(true);
      const hideTimer = window.setTimeout(() => setMerchantAppAlertPulse(false), 15000);
      prevMerchantAppsRef.current = current;
      return () => window.clearTimeout(hideTimer);
    }
    prevMerchantAppsRef.current = current;
  }, [pendingMerchantApplications]);

  /** 各合伙店铺待审核商品数量（store_id → 件数），用于列表按店展示与卡片提示 */
  const [pendingReviewByStoreId, setPendingReviewByStoreId] = useState<Record<string, number>>({});
  /** 各合伙店铺商品总数（store_id → 件数） */
  const [productCountByStoreId, setProductCountByStoreId] = useState<Record<string, number>>({});

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

  /** 合伙店铺列表（不含 Inventory 中转站，中转站由「跨境物流」独立管理） */
  const stores = useMemo(() => {
    const merchantStores = allStores.filter((store) => store.store_type !== 'transit_station');
    let filtered: DeliveryStore[];
    if (storeListSearchQ) {
      filtered = merchantStores.filter(
        (store) =>
          (store.store_name || '').toLowerCase().includes(storeListSearchQ) ||
          (store.store_code || '').toLowerCase().includes(storeListSearchQ),
      );
    } else {
      filtered = merchantStores.filter((store) => {
        const regionCity = regionToCityKey(store.region);
        if (regionCity) return regionCity === selectedCity;
        const storeCity = getStoreCity(store);
        return storeCity === selectedCity;
      });
    }
    return filtered.slice().sort((a, b) => {
      const pa = a.id ? (pendingReviewByStoreId[a.id] ?? 0) : 0;
      const pb = b.id ? (pendingReviewByStoreId[b.id] ?? 0) : 0;
      if (pb !== pa) return pb - pa;
      return (a.store_name || '').localeCompare(b.store_name || '', 'zh-Hans');
    });
  }, [allStores, selectedCity, pendingReviewByStoreId, storeListSearchQ]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [currentStoreQR, setCurrentStoreQR] = useState<DeliveryStore | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);
  const [isSubmittingStore, setIsSubmittingStore] = useState(false);
  const [editingStore, setEditingStore] = useState<DeliveryStore | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [adminProductForm, setAdminProductForm] = useState(DEFAULT_ADMIN_PRODUCT_FORM);
  const [showAdminProductDetailPanel, setShowAdminProductDetailPanel] = useState(false);
  const [isUploadingAdminProductImage, setIsUploadingAdminProductImage] = useState(false);
  const [isUploadingAdminProductDetailImages, setIsUploadingAdminProductDetailImages] = useState(false);
  const [isSavingAdminProduct, setIsSavingAdminProduct] = useState(false);
  const [adminProductError, setAdminProductError] = useState<string | null>(null);
  const adminProductFileInputRef = useRef<HTMLInputElement>(null);
  const adminProductDetailFileInputRef = useRef<HTMLInputElement>(null);
  const [adminImageEditorFile, setAdminImageEditorFile] = useState<File | null>(null);
  const [adminImageEditorTarget, setAdminImageEditorTarget] = useState<'main' | 'detail' | null>(null);
  const [adminPendingDetailFiles, setAdminPendingDetailFiles] = useState<File[]>([]);
  
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
    store_type: 'restaurant' as DeliveryStore['store_type'],
    operating_hours: DEFAULT_OPERATING_HOURS,
    service_area_radius: 5, // 保留默认值，但不在表单中显示
    capacity: 1000, // 保留默认值，但不在表单中显示
    facilities: [] as string[],
    notes: '',
    password: '', // 合伙店铺登录密码
    region: 'mandalay',
    cod_settlement_day: '7' as '7' | '10' | '15' | '30',
    packing_sla_minutes: 12,
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

  const resetAdminProductForm = () => {
    setAdminProductForm(DEFAULT_ADMIN_PRODUCT_FORM);
    setShowAdminProductDetailPanel(false);
    setAdminProductError(null);
    setIsUploadingAdminProductImage(false);
    setIsUploadingAdminProductDetailImages(false);
    setIsSavingAdminProduct(false);
    if (adminProductFileInputRef.current) adminProductFileInputRef.current.value = '';
    if (adminProductDetailFileInputRef.current) adminProductDetailFileInputRef.current.value = '';
    setAdminImageEditorFile(null);
    setAdminImageEditorTarget(null);
    setAdminPendingDetailFiles([]);
  };

  const hasAdminProductDraft = (): boolean => {
    const f = adminProductForm;
    return Boolean(
      f.name.trim() ||
        f.description.trim() ||
        f.image_url ||
        f.detail_image_urls.length > 0 ||
        f.price.trim() ||
        f.use_variants ||
        f.variants.some((v) => v.name.trim() || String(v.price ?? '').trim()),
    );
  };

  const reloadViewingStoreProducts = async (storeId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setStoreProducts((data || []).map(withPublicProductImages));
  };

  const saveAdminProductForStore = async (
    storeId: string,
    storeName?: string,
  ): Promise<{ success: boolean; error?: string; productName?: string }> => {
    if (!adminProductForm.name.trim()) {
      return { success: false, error: '请填写商品名称' };
    }

    let price: number;
    let stock = -1;
    let originalPrice: number | undefined;
    let variants: import('../utils/productVariants').ProductVariant[] | null = null;

    if (adminProductForm.use_variants) {
      const normalized = normalizeProductVariants(adminProductForm.variants);
      const variantError = validateVariants(normalized);
      if (variantError) {
        return { success: false, error: variantError };
      }
      const agg = syncProductAggregateFromVariants(normalized);
      price = agg.price;
      stock = agg.stock;
      originalPrice = agg.original_price;
      variants = normalized;
    } else {
      if (!adminProductForm.price.trim()) {
        return { success: false, error: '请填写商品价格' };
      }
      price = parseFloat(adminProductForm.price);
      if (!Number.isFinite(price) || price <= 0) {
        return { success: false, error: '请输入有效的商品价格' };
      }
    }

    const result = await productService.createProductAsAdmin(storeId, {
      name: adminProductForm.name.trim(),
      description: adminProductForm.description.trim() || undefined,
      price,
      original_price: originalPrice,
      stock,
      variants,
      image_url: adminProductForm.image_url || undefined,
      detail_image_urls: adminProductForm.detail_image_urls,
    });

    if (!result.success) {
      return { success: false, error: result.error || '添加商品失败，请重试' };
    }

    return {
      success: true,
      productName: adminProductForm.name.trim(),
    };
  };

  const handleAdminProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStore?.id) return;
    setAdminImageEditorFile(file);
    setAdminImageEditorTarget('main');
    if (adminProductFileInputRef.current) adminProductFileInputRef.current.value = '';
  };

  const handleAdminProductDetailImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editingStore?.id) return;
    setAdminPendingDetailFiles(files.slice(1));
    setAdminImageEditorFile(files[0]);
    setAdminImageEditorTarget('detail');
    if (adminProductDetailFileInputRef.current) adminProductDetailFileInputRef.current.value = '';
  };

  const handleAdminImageEditorCancel = () => {
    setAdminImageEditorFile(null);
    setAdminImageEditorTarget(null);
    setAdminPendingDetailFiles([]);
  };

  const handleAdminImageEditorConfirm = async (
    processedFile: File,
    settings: PrepareProductImageSettings,
  ) => {
    const storeId = editingStore?.id;
    const target = adminImageEditorTarget;
    const restFiles = [...adminPendingDetailFiles];
    handleAdminImageEditorCancel();
    if (!storeId || !target) return;

    if (target === 'main') {
      setIsUploadingAdminProductImage(true);
      setAdminProductError(null);
      try {
        const url = await productService.uploadProductImage(storeId, processedFile);
        if (url) {
          setAdminProductForm((prev) => ({ ...prev, image_url: url }));
        } else {
          setAdminProductError('图片上传失败，请重试');
        }
      } catch (error) {
        console.error('Admin 商品主图上传失败:', error);
        setAdminProductError('图片上传失败，请重试');
      } finally {
        setIsUploadingAdminProductImage(false);
      }
      return;
    }

    setIsUploadingAdminProductDetailImages(true);
    setAdminProductError(null);
    try {
      const uploadedUrls: string[] = [];
      const firstUrl = await productService.uploadProductImage(storeId, processedFile);
      if (firstUrl) uploadedUrls.push(firstUrl);

      for (const file of restFiles) {
        const prepared = await prepareProductImage(file, settings);
        const url = await productService.uploadProductImage(storeId, prepared);
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        setAdminProductForm((prev) => ({
          ...prev,
          detail_image_urls: [...prev.detail_image_urls, ...uploadedUrls],
        }));
        setShowAdminProductDetailPanel(true);
      } else {
        setAdminProductError('详细介绍图上传失败，请重试');
      }
    } catch (error) {
      console.error('Admin 商品详细介绍图上传失败:', error);
      setAdminProductError('详细介绍图上传失败，请重试');
    } finally {
      setIsUploadingAdminProductDetailImages(false);
    }
  };

  const handleRemoveAdminProductDetailImage = (index: number) => {
    setAdminProductForm((prev) => ({
      ...prev,
      detail_image_urls: prev.detail_image_urls.filter((_, i) => i !== index),
    }));
  };

  const handleSaveAdminProduct = async () => {
    const storeId = editingStore?.id;
    if (!storeId) {
      setAdminProductError('请先保存店铺后再添加商品');
      return;
    }

    setIsSavingAdminProduct(true);
    setAdminProductError(null);

    try {
      const result = await saveAdminProductForStore(storeId, editingStore?.store_name);

      if (result.success) {
        setSuccessMessage(`已为「${editingStore?.store_name}」添加商品「${result.productName}」`);
        resetAdminProductForm();
        await loadPendingProductReviewSummary();
        if (viewingStoreId === storeId) {
          await reloadViewingStoreProducts(storeId);
        }
      } else {
        setAdminProductError(result.error || '添加商品失败，请重试');
      }
    } finally {
      setIsSavingAdminProduct(false);
    }
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
      store_type: store.store_type as DeliveryStore['store_type'],
      operating_hours: formatOperatingHours(
        parseOperatingHours(store.operating_hours).open,
        parseOperatingHours(store.operating_hours).close,
      ),
      service_area_radius: store.service_area_radius,
      capacity: store.capacity,
      facilities: store.facilities || [],
      notes: store.notes || '',
      password: store.password || '',
      region: store.region || 'mandalay',
      cod_settlement_day: store.cod_settlement_day || '7',
      packing_sla_minutes: store.packing_sla_minutes || 12,
    });
    resetAdminProductForm();
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
  const viewStoreProducts = async (
    store: DeliveryStore,
    initialFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'all'
  ) => {
    try {
      setLoadingProducts(true);
      setProductListFilter(initialFilter);
      setViewingStoreName(store.store_name);
      setViewingStoreId(store.id ?? null);
      setShowProductsModal(true);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStoreProducts((data || []).map(withPublicProductImages));
    } catch (error) {
      console.error('加载店铺商品失败:', error);
      feedbackService.notify('加载商品失败，请重试');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadPendingProductReviewSummary = useCallback(async () => {
    try {
      const [pendingRes, totalRes] = await Promise.all([
        supabase
          .from('products')
          .select('store_id, listing_status, pending_update')
          .or('listing_status.eq.pending,pending_update.not.is.null'),
        supabase.from('products').select('store_id'),
      ]);

      if (pendingRes.error) {
        setPendingProductReviewCount(0);
        setPendingReviewByStoreId({});
      } else {
        const byId: Record<string, number> = {};
        for (const row of pendingRes.data || []) {
          if (!productNeedsAdminReview(row)) continue;
          const sid = row.store_id as string | undefined;
          if (!sid) continue;
          byId[sid] = (byId[sid] || 0) + 1;
        }
        setPendingReviewByStoreId(byId);
        setPendingProductReviewCount(Object.values(byId).reduce((a, b) => a + b, 0));
      }

      if (totalRes.error) {
        setProductCountByStoreId({});
      } else {
        const totalById: Record<string, number> = {};
        for (const row of totalRes.data || []) {
          const sid = row.store_id as string | undefined;
          if (!sid) continue;
          totalById[sid] = (totalById[sid] || 0) + 1;
        }
        setProductCountByStoreId(totalById);
      }
    } catch {
      setPendingProductReviewCount(0);
      setPendingReviewByStoreId({});
      setProductCountByStoreId({});
    }
  }, []);

  /** 悬停在顶部「待审核」徽章上时显示各店件数（不占用列表区域） */
  const pendingReviewTitleHint = useMemo(() => {
    if (pendingProductReviewCount <= 0) return '';
    const lines = Object.entries(pendingReviewByStoreId)
      .map(([id, count]) => ({
        count,
        label:
          allStores.find((s) => s.id === id)?.store_name ??
          (id.length > 8 ? `${id.slice(0, 6)}…` : id),
      }))
      .sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, 'zh-Hans'));
    return lines.map(({ label, count }) => `${label}：${count} 件`).join('\n');
  }, [pendingReviewByStoreId, allStores, pendingProductReviewCount]);

  useEffect(() => {
    loadPendingProductReviewSummary();
    const t = setInterval(loadPendingProductReviewSummary, 30000);
    return () => clearInterval(t);
  }, [loadPendingProductReviewSummary]);

  const updateProductListingStatus = async (
    productId: string,
    listing_status: 'approved' | 'rejected',
    notes?: string,
  ) => {
    if (!viewingStoreId) return;
    const product = storeProducts.find((p) => p.id === productId);
    if (!product) return;
    if (listing_status === 'rejected' && !isValidRejectReason(notes)) {
      setRejectTargetProductId(productId);
      return;
    }
    setProductListingActionId(productId);
    try {
      const result = await applyProductReviewDecision({
        product,
        action: listing_status,
        reason: notes,
      });
      if (!result.ok) {
        feedbackService.notify(result.error || '更新失败，请重试');
        return;
      }
      const { data, error: reloadError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', viewingStoreId)
        .order('created_at', { ascending: false });
      if (reloadError) throw reloadError;
      setStoreProducts((data || []).map(withPublicProductImages));
      await loadPendingProductReviewSummary();
      notifyAdminTodosRefresh();
      feedbackService.notify(
        listing_status === 'approved' ? '已通过，已通知商家' : '已拒绝，商家可见原因',
      );
      setRejectTargetProductId(null);
    } catch (e) {
      console.error('更新商品审核状态失败:', e);
      feedbackService.notify('更新失败，请重试（请确认已在数据库执行 listing_status 迁移）');
    } finally {
      setProductListingActionId(null);
    }
  };

  const productListCounts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    storeProducts.forEach((p) => {
      if (productNeedsAdminReview(p)) pending += 1;
      else if (normalizeProductListingStatus(p) === 'approved') approved += 1;
      else rejected += 1;
    });
    return { all: storeProducts.length, pending, approved, rejected };
  }, [storeProducts]);

  const filteredStoreProducts = useMemo(() => {
    if (productListFilter === 'all') return storeProducts;
    if (productListFilter === 'pending') {
      return storeProducts.filter((p) => productNeedsAdminReview(p));
    }
    if (productListFilter === 'approved') {
      return storeProducts.filter(
        (p) => normalizeProductListingStatus(p) === 'approved' && !hasPendingProductUpdate(p),
      );
    }
    return storeProducts.filter((p) => normalizeProductListingStatus(p) === productListFilter);
  }, [storeProducts, productListFilter]);

  const selectedAdminProduct = useMemo(
    () => storeProducts.find((p) => p.id === selectedAdminProductId) ?? null,
    [storeProducts, selectedAdminProductId],
  );

  const suggestStoreCode = useCallback(
    (regionId: string) => {
      const regionObj = REGIONS.find((r) => r.id === regionId);
      const prefix = regionObj ? regionObj.prefix : 'MDY';
      return resolveNextStoreCodeForPrefix(prefix, allStores);
    },
    [allStores],
  );

  useEffect(() => {
    if (!showForm || isEditing || !formData.region || !formData.store_name) return;
    const nextCode = suggestStoreCode(formData.region);
    setFormData((prev) => (prev.store_code === nextCode ? prev : { ...prev, store_code: nextCode }));
  }, [showForm, isEditing, formData.region, formData.store_name, suggestStoreCode]);

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
      setFormData((prev) => {
        const newData = { ...prev, [name]: value };
        if (newData.region && newData.store_name) {
          newData.store_code = suggestStoreCode(newData.region);
        }
        return newData;
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleOperatingHoursPartChange = (part: 'open' | 'close', value: string) => {
    setFormData(prev => {
      const { open, close } = parseOperatingHours(prev.operating_hours);
      return {
        ...prev,
        operating_hours: formatOperatingHours(
          part === 'open' ? value : open,
          part === 'close' ? value : close,
        ),
      };
    });
  };

  const applyOperatingHoursPreset = (value: string) => {
    setFormData(prev => ({ ...prev, operating_hours: value }));
  };

  const applyPackingSlaPreset = (minutes: number) => {
    setFormData(prev => ({ ...prev, packing_sla_minutes: minutes }));
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
    setFormSubmitError(null);

    if (
      !formData.store_name ||
      !formData.store_code ||
      !formData.address ||
      !formData.latitude ||
      !formData.longitude ||
      !formData.password ||
      !formData.region ||
      !formData.phone ||
      !formData.manager_name ||
      !formData.manager_phone ||
      !formData.operating_hours
    ) {
      const msg = '请填写所有必填项（含地图位置、联系电话与店长信息）';
      setFormSubmitError(msg);
      setErrorMessage(msg);
      return;
    }

    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const msg = '经纬度无效，请通过「选择地图位置」重新选点';
      setFormSubmitError(msg);
      setErrorMessage(msg);
      return;
    }

    const currentUser = localStorage.getItem('currentUser') || 'admin';
    setIsSubmittingStore(true);

    try {
      if (isEditing && editingStore) {
        let savedProductName: string | undefined;

        if (hasAdminProductDraft()) {
          if (!adminProductForm.name.trim()) {
            const msg =
              '您填写了部分商品信息但未填写商品名称。请先完善商品并点击「添加商品并上架」，或清空商品区域后再更新店铺。';
            setFormSubmitError(msg);
            setErrorMessage(msg);
            return;
          }
          setAdminProductError(null);
          const productResult = await saveAdminProductForStore(editingStore.id!, editingStore.store_name);
          if (!productResult.success) {
            const msg = productResult.error || '商品添加失败，店铺信息未更新';
            setFormSubmitError(msg);
            setAdminProductError(msg);
            return;
          }
          savedProductName = productResult.productName;
          resetAdminProductForm();
          await loadPendingProductReviewSummary();
          if (viewingStoreId === editingStore.id) {
            await reloadViewingStoreProducts(editingStore.id!);
          }
        }

        const { latitude, longitude, service_area_radius, capacity, ...restFormData } = formData;
        const packing_sla_minutes =
          normalizeStorePackingSlaMinutes(formData.packing_sla_minutes) ?? 12;

        const result = await deliveryStoreService.updateStore(editingStore.id!, {
          ...restFormData,
          packing_sla_minutes,
          latitude: lat,
          longitude: lng,
          service_area_radius: Number(service_area_radius),
          capacity: Number(capacity),
          updated_at: new Date().toISOString(),
        });

        if (result) {
          const productNote = savedProductName ? `，并已上架商品「${savedProductName}」` : '';
          setSuccessMessage(`合伙店铺信息更新成功${productNote}！`);
          setShowForm(false);
          setEditingStore(null);
          setIsEditing(false);
          const cityKey = regionToCityKey(formData.region);
          if (cityKey && cityKey in myanmarCities) {
            setSelectedCity(cityKey as typeof selectedCity);
          }
          await loadStores();
        } else {
          const msg = '更新失败，请重试';
          setFormSubmitError(msg);
          setErrorMessage(msg);
        }
      } else {
        const { latitude, longitude, service_area_radius, capacity, ...restFormData } = formData;
        const store_code = isStoreCodeTaken(formData.store_code, allStores)
          ? suggestStoreCode(formData.region)
          : formData.store_code.trim().toUpperCase();
        const packing_sla_minutes =
          normalizeStorePackingSlaMinutes(formData.packing_sla_minutes) ?? 12;

        const result = await deliveryStoreService.createStore({
          ...restFormData,
          packing_sla_minutes,
          store_code,
          latitude: lat,
          longitude: lng,
          service_area_radius: Number(service_area_radius),
          capacity: Number(capacity),
          created_by: currentUser,
        });

        if (result.success) {
          setSuccessMessage('合伙店铺创建成功！');
          setShowForm(false);
          resetForm();
          const cityKey = regionToCityKey(formData.region);
          if (cityKey && cityKey in myanmarCities) {
            setSelectedCity(cityKey as typeof selectedCity);
          }
          await loadStores();
        } else {
          const msg = result.error || '创建失败，请重试';
          setFormSubmitError(msg);
          setErrorMessage(msg);
        }
      }
    } finally {
      setIsSubmittingStore(false);
    }
  };

  const openStoreLicenseDocs = async (store: DeliveryStore) => {
    setLicenseDocsStore(store);
    setLicenseDocsUrls([]);
    setLicenseDocsError(null);
    setLicenseDocsLoading(true);
    try {
      const urls = await fetchStoreLicenseDocuments({
        id: store.id,
        store_code: store.store_code,
        phone: store.phone,
        store_name: store.store_name,
      });
      setLicenseDocsUrls(urls);
    } catch (error) {
      setLicenseDocsError(error instanceof Error ? error.message : '加载证件失败');
    } finally {
      setLicenseDocsLoading(false);
    }
  };

  // 删除店铺
  const handleDeleteStore = async (store: DeliveryStore) => {
    if (
      !window.confirm(
        `确定要删除店铺「${store.store_name}」吗？\n\n将同时清除该店商品、评价和该店自己下的订单。入驻申请和证件会留底备查。\n此操作不可撤销。`,
      )
    ) {
      return;
    }

    try {
      const result = await deliveryStoreService.deleteStore(store.id!);
      if (result.success) {
        setSuccessMessage(`店铺「${store.store_name}」已删除，经营数据已清除`);
        loadStores();
      } else {
        setErrorMessage(result.error || '删除店铺失败，请重试');
      }
    } catch (error) {
      console.error('删除店铺失败:', error);
      setErrorMessage(error instanceof Error ? error.message : '删除店铺失败，请重试');
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
      store_type: 'restaurant' as DeliveryStore['store_type'],
      operating_hours: DEFAULT_OPERATING_HOURS,
      service_area_radius: 5,
      capacity: 1000,
      facilities: [],
      notes: '',
      password: '',
      region: 'mandalay',
      cod_settlement_day: '7',
      packing_sla_minutes: 12,
    });
  };

  const closeStoreForm = () => {
    if (isEditing) {
      setEditingStore(null);
      setIsEditing(false);
    }
    setShowForm(false);
    setFormSubmitError(null);
    resetAdminProductForm();
    resetForm();
  };

  useEffect(() => {
    if (!showForm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showForm]);

  const facilityOptions = [
    { key: 'store', label: '店铺' },
    { key: 'storage', label: '仓储区' }
  ];

  const deliveryStoreWorkspace = {
    adminImageEditorFile,
    adminImageEditorTarget,
    adminProductDetailFileInputRef,
    adminProductError,
    adminProductFileInputRef,
    adminProductForm,
    applyOperatingHoursPreset,
    applyPackingSlaPreset,
    closeStoreForm,
    confirmMapSelection,
    currentStorageStore,
    currentStoreQR,
    currentTransferPackage,
    currentViewStore,
    downloadQRCode,
    editingStore,
    facilityOptions,
    filteredStoreProducts,
    formData,
    formSubmitError,
    generateTransferQRCode,
    getMapErrorMessage,
    handleAdminImageEditorCancel,
    handleAdminImageEditorConfirm,
    handleAdminProductDetailImagesUpload,
    handleAdminProductImageUpload,
    handleFacilityChange,
    handleForwardPackage,
    handleInputChange,
    handleMapClick,
    handleOperatingHoursPartChange,
    handleRemoveAdminProductDetailImage,
    handleSaveAdminProduct,
    handleSubmit,
    isEditing,
    isMapLoaded,
    isSavingAdminProduct,
    isSubmittingStore,
    isUploadingAdminProductDetailImages,
    isUploadingAdminProductImage,
    language,
    loadingProducts,
    loadingStorage,
    loadingStorePackages,
    mapCenter,
    mapLoadError,
    onMapLoad,
    openMapSelection,
    productListCounts,
    productListFilter,
    productListingActionId,
    rejectTargetProductId,
    setRejectTargetProductId,
    qrCodeDataUrl,
    selectedAdminProduct,
    selectedStore,
    setAdminProductForm,
    setCurrentViewStore,
    setFormData,
    setProductListFilter,
    setSelectedAdminProductId,
    setShowAdminProductDetailPanel,
    setShowMapModal,
    setShowPackageModal,
    setShowProductsModal,
    setShowQRModal,
    setShowStorageModal,
    setShowStorePackagesModal,
    setShowStoreTypeDropdown,
    setShowTransferQRModal,
    setStorePackages,
    setSuccessMessage,
    setViewingStoreId,
    showAdminProductDetailPanel,
    showForm,
    showMapModal,
    showPackageModal,
    showProductsModal,
    showQRModal,
    showStorageModal,
    showStorePackagesModal,
    showStoreTypeDropdown,
    showTransferQRModal,
    storagePackages,
    storePackages,
    storeProducts,
    storeTypeDropdownRef,
    transferQRCodeDataUrl,
    updateProductListingStatus,
    viewingStoreName
  };

  return (
    <DeliveryStoreWorkspaceProvider value={deliveryStoreWorkspace}>
    <div className="admin-page">
      {/* 头部 */}
      <div className="admin-page-head">
        <div>
          <h1>合伙店铺</h1>
          <p>
            管理 City 配送合伙店铺位置与商品
          </p>
          <p>
            Inventory 中转站登录账号已独立至「跨境物流」，请在该模块创建与管理。
          </p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-shell__btn"
            onClick={() => navigate('/admin/dashboard')}
          >
            ← 返回仪表板
          </button>
          <button
            type="button"
            className="admin-shell__btn admin-shell__btn--primary"
            onClick={() => navigate('/admin/product-reviews')}
            style={{ position: 'relative' }}
          >
            🛍️ 商品审核
            {pendingProductReviewCount > 0 && (
              <span
                style={{
                  marginLeft: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '22px',
                  height: '22px',
                  padding: '0 6px',
                  borderRadius: '999px',
                  background: '#d48806',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}
              >
                {pendingProductReviewCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="admin-shell__btn"
            onClick={() => navigate('/admin/merchant-ops')}
            style={{ position: 'relative' }}
          >
            🛎️ 今日监管
            {overdueMerchantAccept > 0 && (
              <span
                style={{
                  marginLeft: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '22px',
                  height: '22px',
                  padding: '0 6px',
                  borderRadius: '999px',
                  background: '#e11d48',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}
              >
                {overdueMerchantAccept}
              </span>
            )}
          </button>
          <button
            type="button"
            className="admin-shell__btn admin-shell__btn--primary"
            onClick={() => navigate('/admin/merchant-applications')}
            style={{ position: 'relative' }}
          >
            📋 入驻申请
            {pendingMerchantApplications > 0 && (
              <span
                style={{
                  marginLeft: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '22px',
                  height: '22px',
                  padding: '0 6px',
                  borderRadius: '999px',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.45)',
                }}
              >
                {pendingMerchantApplications}
              </span>
            )}
          </button>
          <button
            type="button"
            className={showForm ? 'admin-shell__btn' : 'admin-shell__btn admin-shell__btn--primary'}
            onClick={() => {
              if (showForm) {
                closeStoreForm();
              } else {
                setShowForm(true);
              }
            }}
            style={showForm ? undefined : { background: '#389e0d', borderColor: '#389e0d' }}
          >
            {showForm ? (isEditing ? '✕ 取消编辑' : '✕ 取消') : '➕ 新增合伙店铺'}
          </button>
        </div>
      </div>

      {pendingMerchantApplications > 0 && (
        <div
          role="alert"
          onClick={() => navigate('/admin/merchant-applications')}
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '14px',
            cursor: 'pointer',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            background: merchantAppAlertPulse
              ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.28) 0%, rgba(37, 99, 235, 0.18) 100%)'
              : 'rgba(59, 130, 246, 0.14)',
            border: merchantAppAlertPulse
              ? '1px solid rgba(147, 197, 253, 0.85)'
              : '1px solid rgba(96, 165, 250, 0.45)',
            color: '#0f172a',
            boxShadow: merchantAppAlertPulse ? '0 0 24px rgba(59, 130, 246, 0.2)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
              {merchantAppAlertPulse ? '🔔' : '📋'}
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                {merchantAppAlertPulse
                  ? `刚刚收到新的商家入驻申请（共 ${pendingMerchantApplications} 条待审核）`
                  : `有 ${pendingMerchantApplications} 条商家入驻申请待审核`}
              </div>
              <div style={{ fontSize: '0.82rem', opacity: 0.88, marginTop: '2px' }}>
                点击进入审核页面，通过后自动开通店铺账号
              </div>
            </div>
          </div>
          <span
            style={{
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: '999px',
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: '0.84rem',
              whiteSpace: 'nowrap',
            }}
          >
            立即审核 →
          </span>
        </div>
      )}

      {/* 消息提示 */}
      {(errorMessage || successMessage) && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '12px',
            background: errorMessage ? '#fff2f0' : '#f6ffed',
            color: errorMessage ? '#cf1322' : '#389e0d'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{errorMessage || successMessage}</span>
            {errorMessage && errorMessage.includes('加载合伙店铺列表失败') && (
              <button
                type="button"
                onClick={() => loadStores(true)}
                className="admin-shell__btn"
                style={{ marginLeft: 12 }}
              >
                🔄 重试
              </button>
            )}
          </div>
        </div>
      )}

      {/* 合伙店铺列表和地图 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
        {/* 合伙店铺列表 */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: isMobile ? '16px' : '24px',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06), 0 6px 16px rgba(15, 23, 42, 0.06)',
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
              <button
                type="button"
                title={pendingReviewTitleHint || undefined}
                onClick={() => navigate('/admin/product-reviews')}
                style={{
                  background: 'rgba(245, 158, 11, 0.22)',
                  border: '1px solid rgba(251, 191, 36, 0.55)',
                  color: '#d48806',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  padding: '6px 14px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
                  cursor: 'pointer'
                }}
              >
                待审核 {pendingProductReviewCount} 件
                <span style={{ fontWeight: 500, opacity: 0.85, marginLeft: '6px', fontSize: '0.75rem' }}>打开工作台</span>
              </button>
            )}
          </h2>
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
              {stores.map((store) => {
                const pendingN = store.id ? (pendingReviewByStoreId[store.id] ?? 0) : 0;
                const productTotal = store.id ? (productCountByStoreId[store.id] ?? 0) : 0;
                const baseShadow = selectedStore?.id === store.id ? '0 10px 25px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.1)';
                const pendingInset = pendingN > 0 ? ', inset 5px 0 0 0 rgba(245, 158, 11, 0.92)' : '';
                return (
                <div
                  key={store.id}
                  data-store-id={store.id}
                  onClick={() => handleStoreClick(store)}
                  style={{
                    background: selectedStore?.id === store.id ? '#e6f4ff' : '#f8fafc',
                    border: selectedStore?.id === store.id ? '1px solid #91caff' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: `${baseShadow}${pendingInset}`
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    if (selectedStore?.id !== store.id) {
                      e.currentTarget.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    if (selectedStore?.id !== store.id) {
                      e.currentTarget.style.background = '#f8fafc';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                      {pendingN > 0 && (
                        <button
                          type="button"
                          title="直接打开该店商品并切换到「待审核」"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/product-reviews?store=${store.id}`);
                          }}
                          style={{
                            background: 'rgba(245, 158, 11, 0.25)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251, 191, 36, 0.55)',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            lineHeight: 1.2
                          }}
                        >
                          待审 {pendingN}
                        </button>
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
                  <p style={{ margin: '4px 0 0', opacity: 0.78, fontSize: '0.85rem' }}>
                    🛍️ 共 {productTotal} 条商品
                  </p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', opacity: 0.7, marginTop: '6px' }}>
                    <span>📞 {store.phone}</span>
                    <span>👤 {store.manager_name}</span>
                    <span>⏰ {store.operating_hours}</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', opacity: 0.6 }}>
                    <span>类型: {STORE_TYPE_LABELS[store.store_type] || store.store_type}</span>
                    <span style={{ marginLeft: '12px' }}>容量: {store.capacity}</span>
                    <span style={{ marginLeft: '12px' }}>负载: {store.current_load}</span>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                        void openStoreLicenseDocs(store);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
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
                        boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(79, 70, 229, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(79, 70, 229, 0.3)';
                      }}
                    >
                      证件
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
                        background: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)',
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
                        boxShadow: '0 2px 6px rgba(230, 126, 34, 0.3)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(230, 126, 34, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(230, 126, 34, 0.3)';
                      }}
                    >
                      入库
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
                );
              })}
            </div>
          )}
        </div>

        {/* 地图显示 */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06), 0 6px 16px rgba(15, 23, 42, 0.06)',
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
                                {STORE_TYPE_LABELS[selectedStore.store_type] || selectedStore.store_type}
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

      {licenseDocsStore && (
        <StoreLicenseDocsModal
          storeName={licenseDocsStore.store_name}
          urls={licenseDocsUrls}
          loading={licenseDocsLoading}
          error={licenseDocsError}
          isEn={language === 'en'}
          onClose={() => {
            setLicenseDocsStore(null);
            setLicenseDocsUrls([]);
            setLicenseDocsError(null);
          }}
        />
      )}
      <DeliveryStoreOverlays />
      <ProductReviewRejectModal
        open={!!rejectTargetProductId}
        productLabel={
          storeProducts.find((p) => p.id === rejectTargetProductId)?.name || '商品'
        }
        language={language}
        submitting={!!productListingActionId}
        onCancel={() => setRejectTargetProductId(null)}
        onConfirm={(reason) => {
          if (rejectTargetProductId) {
            void updateProductListingStatus(rejectTargetProductId, 'rejected', reason);
          }
        }}
      />
    </div>
    </DeliveryStoreWorkspaceProvider>
  );
};

export default DeliveryStoreManagement;
