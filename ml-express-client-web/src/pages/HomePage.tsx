import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { packageService, supabase, userService, testConnection, systemSettingsService, merchantService, tutorialService, Tutorial } from '../services/supabase';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import QRCode from 'qrcode';
import HomeBanner from '../components/home/HomeBanner';
import NavigationBar from '../components/home/NavigationBar';
import Logo from '../components/Logo';
import OrderModal from '../components/home/OrderModal';
import LoginRegisterModal from '../components/home/LoginRegisterModal';
import { MYANMAR_CITIES, CityKey, DEFAULT_CITY_KEY, DEFAULT_CITY_CENTER } from '../constants/cities';
import { deriveInitialOrderStatus } from '../utils/orderSubmitHelpers';
// import { getNearestCityKey } from '../utils/locationUtils';

// Google Maps API 配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Google Maps API Key 未配置！请检查环境变量 REACT_APP_GOOGLE_MAPS_API_KEY');
}
const GOOGLE_MAPS_LIBRARIES: any = ['places'];


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
          height: '300px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '10px',
          color: '#4a5568'
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


const HomePage: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const [currentUser, setCurrentUser] = useState<any>(null); // 🚀 核心优化：提前声明，防止 Block-scoped variable 错误
  
  // 🚀 新增：商家商品选择相关状态 (移至顶部以解决作用域问题)
  const [merchantProducts, setMerchantProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [isFromCart, setIsFromCart] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [hasCOD, setHasCOD] = useState(true);
  const [merchantStore, setMerchantStore] = useState<any>(null); // 商家店铺信息
  const isFromCartRef = React.useRef(false); // 🚀 新增：使用 ref 确保在异步闭包中能获取最新值

  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();

  const [isVisible, setIsVisible] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false); // 🚀 新增：使用教学模态框状态
  const [activeTutorialStep, setActiveTutorialStep] = useState<number | null>(null); // 🚀 优化：当前选中的教学步骤
  const [tutorials, setTutorials] = useState<Tutorial[]>([]); // 🚀 新增：从数据库获取的教学步骤
  const [trackingNumber] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapSelectionType, setMapSelectionType] = useState<'sender' | 'receiver' | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [selectedSenderLocation, setSelectedSenderLocation] = useState<{lat: number; lng: number} | null>(null);                                                       
  const [selectedReceiverLocation, setSelectedReceiverLocation] = useState<{lat: number; lng: number} | null>(null);
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddressText, setSenderAddressText] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddressText, setReceiverAddressText] = useState('');
  const [description, setDescription] = useState(''); // 🚀 新增：物品描述状态
  const [codAmount, setCodAmount] = useState(''); // 代收款金额
  const [mapClickPosition, setMapClickPosition] = useState<{lat: number, lng: number} | null>(null);

  // 处理从其他页面跳转过来的登录/注册请求
  useEffect(() => {
    if (location.state && (location.state as any).showModal) {
      const { isLoginMode } = location.state as any;
      setIsLoginMode(isLoginMode);
      setShowRegisterModal(true);
      // 清除 state，防止刷新时再次弹出
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // 🚀 新增：处理从购物车跳转过来的订单请求
  useEffect(() => {
    if (location.state && (location.state as any).selectedProducts) {
      const incomingProducts = (location.state as any).selectedProducts as any[];
      console.log('📦 收到购物车商品，设置 isFromCart 为 true:', incomingProducts);
      
      setIsFromCart(true);
      isFromCartRef.current = true; // 🚀 同时更新 ref
      setShowOrderForm(true);
      
      // 转换商品格式为 Record<string, number>
      const selectedMap: Record<string, number> = {};
      incomingProducts.forEach(item => {
        selectedMap[item.id] = item.quantity;
      });
      setSelectedProducts(selectedMap);
      setMerchantProducts(incomingProducts);
      
      // 计算总价
      const total = incomingProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      setCartTotal(total);
      
      // 🚀 优化：自动设置代收款金额
      if (total > 0) {
        setCodAmount(total.toString());
        setHasCOD(true);
      }
      
      // 如果有店铺信息，自动填充寄件人
      if (incomingProducts.length > 0 && incomingProducts[0].store_id) {
        const storeId = incomingProducts[0].store_id;
        const fillSenderFromStore = async () => {
          try {
            console.log('正在查找关联店铺:', storeId);
            const { data: store, error: storeError } = await supabase
              .from('delivery_stores')
              .select('*')
              .eq('id', storeId)
              .maybeSingle();
            
            if (storeError) throw storeError;
            
            if (store) {
              console.log('✅ 自动填充寄件人信息:', store.store_name);
              setSenderName(store.store_name);
              setSenderPhone(store.phone || store.manager_phone);
              
              // 🚀 优化：自动格式化地址并包含精确坐标
              if (store.latitude && store.longitude) {
                const formattedAddress = `${store.address}\n📍 坐标: ${store.latitude.toFixed(6)}, ${store.longitude.toFixed(6)}`;
                setSenderAddressText(formattedAddress);
                setSelectedSenderLocation({ lat: store.latitude, lng: store.longitude });
                console.log('📍 已自动选择店铺坐标:', { lat: store.latitude, lng: store.longitude });
              } else {
                setSenderAddressText(store.address);
                console.warn('⚠️ 店铺没有经纬度信息');
              }
            }
          } catch (error) {
            console.error('自动填充寄件人信息失败:', error);
          }
        };
        fillSenderFromStore();
      }

      // 🚀 新增：从购物车下单时，收件人默认为当前登录用户
      if (currentUser) {
        console.log('✅ 自动填充收件人信息 (Member):', currentUser.name);
        setReceiverName(currentUser.name || '');
        setReceiverPhone(currentUser.phone || '');
        setReceiverAddressText(currentUser.address || '');
      }
      
      // 清除 state，防止刷新时再次弹出
      window.history.replaceState({}, document.title);
    }
  }, [location.state, currentUser]);
  
  // 🚀 新增：自动更新物品描述和代收金额 (对齐 App 逻辑)
  useEffect(() => {
    if (Object.keys(selectedProducts).length > 0) {
      let totalProductPrice = 0;
      let productDetails: string[] = [];
      
      Object.entries(selectedProducts).forEach(([id, qty]) => {
        const product = merchantProducts.find(p => p.id === id);
        if (product) {
          totalProductPrice += product.price * qty;
          productDetails.push(`${product.name} x${qty}`);
        }
      });

      if (totalProductPrice > 0) {
        setCartTotal(totalProductPrice);
        // 只有在开启代收时才设置金额，否则设为 0
        setCodAmount(hasCOD ? totalProductPrice.toString() : '0');
        
        // 自动把选中的商品添加到物品描述中
        const selectedProductsText = language === 'zh' ? '已选商品' : language === 'en' ? 'Selected' : 'ရွေးချယ်ထားသောပစ္စည်း';
        const balancePaymentText = language === 'zh' ? '余额支付' : language === 'en' ? 'Balance Payment' : 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း';
        const productsText = `[${selectedProductsText}: ${productDetails.join(', ')}][${balancePaymentText}: ${totalProductPrice.toLocaleString()} MMK]`;
        
        // 如果原先有描述，保留它（避免重复添加）
        // 移除所有可能的系统自动添加的标签
        const cleanDesc = description.replace(/\[已选商品:.*?\]|\[Selected:.*?\]|\[ကုန်ပစ္စည်းများ:.*?\]|\[付给商家:.*?\]|\[Pay to Merchant:.*?\]|\[ဆိုင်သို့ ပေးချေရန်:.*?\]|\[骑手代付:.*?\]|\[Courier Advance Pay:.*?\]|\[ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း:.*?\]|\[平台支付:.*?\]|\[Platform Payment:.*?\]|\[ပလက်ဖောင်းမှ ပေးချေခြင်း:.*?\]|\[余额支付:.*?\]|\[Balance Payment:.*?\]|\[လက်ကျန်ငွေဖြင့် ပေးချေခြင်း:.*?\]|\[商品费用（仅余额支付）:.*?\]|\[Item Cost \(Balance Only\):.*?\]|\[ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\):.*?\]/g, '').trim();
        setDescription(`${productsText} ${cleanDesc}`.trim());
      }
    } else {
      setCartTotal(0);
      setCodAmount('0');
    }
    // merchantProducts/description 用于拼接描述，纳入依赖会导致与 setDescription 循环；仅随购物车与语言变
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProducts, hasCOD, currentUser, language]);

  // Google Maps API 加载
  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('[Google Maps] 缺少 REACT_APP_GOOGLE_MAPS_API_KEY 环境变量，地图无法加载。');
    }
    if (mapLoadError) {
      console.error('[Google Maps] 加载失败详情:', mapLoadError);
    }
  }, [mapLoadError]);
  
  const [selectedPOI, setSelectedPOI] = useState<{name: string, types: string[]} | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CITY_CENTER);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [placesService, setPlacesService] = useState<any>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const autocompleteDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastSearchQueryRef = React.useRef<string>('');
  type OrderConfirmationStatus = 'idle' | 'success' | 'failed';
  type OrderSubmitStatus = 'idle' | 'processing' | 'success' | 'failed';
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [orderSubmitStatus, setOrderSubmitStatus] = useState<OrderSubmitStatus>('idle');
  const [orderError, setOrderError] = useState<string>('');
  const [generatedOrderId, setGeneratedOrderId] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [orderConfirmationStatus, setOrderConfirmationStatus] = useState<OrderConfirmationStatus>('idle');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [orderConfirmationMessage, setOrderConfirmationMessage] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityKey>(DEFAULT_CITY_KEY);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState<string>('');
  const [selectedDeliverySpeed, setSelectedDeliverySpeed] = useState<string>('');
  const [showWeightInput, setShowWeightInput] = useState<boolean>(false);
  const [isCalculated, setIsCalculated] = useState(false);
  const [calculatedPriceDetail, setCalculatedPriceDetail] = useState<number>(0);
  const [calculatedDistanceDetail, setCalculatedDistanceDetail] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cash' | 'balance'>('cash'); // 🚀 支付方式：二维码、现金或余额
  const [tempScheduledDate, setTempSelectedDate] = useState<string>('Today'); // 🚀 新增：定时达临时日期选择
  const [tempScheduledTime, setTempSelectedTime] = useState<string>(''); // 🚀 新增：定时达临时时间选择

  // 🚀 生成时间槽 (与 App 逻辑一致：每30分钟一个槽)
  const availableTimeSlots = useMemo(() => {
    const slots = [];
    const startHour = 8;
    const endHour = 22;
    
    for (let h = startHour; h < endHour; h++) {
      const hourStr = h.toString().padStart(2, '0');
      slots.push(`${hourStr}:00`);
      slots.push(`${hourStr}:30`);
    }
    slots.push('22:00');

    if (tempScheduledDate === 'Today') {
      // 🚀 如果是今天，过滤掉过去的时间
      // 缅甸时区处理
      const now = new Date();
      const myanmarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Yangon' }));
      const currentHour = myanmarTime.getHours();
      const currentMinute = myanmarTime.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      return slots.filter(slot => {
        const [sh, sm] = slot.split(':').map(Number);
        const slotTimeInMinutes = sh * 60 + sm;
        return slotTimeInMinutes > currentTimeInMinutes + 30; // 🚀 至少提前30分钟预约
      });
    }
    
    return slots;
  }, [tempScheduledDate]);

  // 用户认证相关状态
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false); // true=登录模式, false=注册模式
  const [registerMethod, setRegisterMethod] = useState<'phone' | 'email'>('phone'); // 注册方式：手机号或邮箱
  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });
  
  // 验证码相关状态
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sentCode, setSentCode] = useState('');
  
  // 系统价格设置
  const [pricingSettings, setPricingSettings] = useState({
    baseFee: 1500,
    perKmFee: 500,
    weightSurcharge: 150,
    urgentSurcharge: 500,
    oversizeSurcharge: 300,
    scheduledSurcharge: 200,
    fragileSurcharge: 200, // 易碎品附加费：每公里200MMK（按距离计算）
    foodBeverageSurcharge: 300,
    freeKmThreshold: 3
  });

  useEffect(() => {
    setIsVisible(true);
    loadPricingSettings();
    loadUserFromStorage();
    loadTutorials(); // 🚀 新增：组件加载时获取教学内容
  }, []);

  // 🚀 新增：从数据库获取教学内容
  const loadTutorials = async () => {
    try {
      const data = await tutorialService.getAllTutorials();
      if (data && data.length > 0) {
        setTutorials(data.filter(t => t.is_active));
      }
    } catch (error) {
      console.error('获取教学内容失败:', error);
    }
  };

  // 🚀 新增：当商家打开下单窗口时，自动加载其商品
  useEffect(() => {
    if (showOrderForm && currentUser?.user_type === 'merchant' && !isFromCart) {
      const loadMerchantProducts = async () => {
        try {
          const storeId = currentUser.store_id || currentUser.id;
          console.log('正在加载商家商品，storeId:', storeId);
          const products = await merchantService.getStoreProducts(storeId);
          // 仅显示上架的商品
          setMerchantProducts(products.filter(p => p.is_available));
          console.log(`✅ 已加载商家商品: ${products.length} 个`);
        } catch (error) {
          console.error('加载商家商品失败:', error);
        }
      };
      loadMerchantProducts();
    }
  }, [showOrderForm, currentUser, isFromCart]);

  // 当打开订单表单且用户已登录时，自动填充信息
  useEffect(() => {
    if (showOrderForm && currentUser) {
      if (isFromCart) {
        // 🛒 从购物车下单：用户是收件人
        console.log('🛒 购物车下单模式：自动填充收件人为当前会员');
        setReceiverName(currentUser.name || '');
        setReceiverPhone(currentUser.phone || '');
        setReceiverAddressText(currentUser.address || '');
      } else {
        // 🏠 普通下单：用户通常是寄件人
        console.log('🏠 普通下单模式：自动填充寄件人为当前会员');
        setSenderName(currentUser.name || '');
        setSenderPhone(currentUser.phone || currentUser.email || '');
        setSenderAddressText(currentUser.address || '');
      }
    }
  }, [showOrderForm, currentUser, isFromCart]);

  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);


  // 从本地存储加载用户信息
  const loadUserFromStorage = () => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    }
  };

  // 加载合伙店铺信息（当currentUser变化时）
  useEffect(() => {
    if (currentUser?.user_type === 'merchant') {
      const loadMerchantStore = async () => {
        try {
          const { data: store } = await supabase
            .from('delivery_stores')
            .select('*')
            .or(`store_code.eq.${currentUser.name},manager_phone.eq.${currentUser.phone},phone.eq.${currentUser.phone},store_name.eq.${currentUser.name}`)
            .limit(1)
            .maybeSingle();
          
          if (store) {
            console.log('✅ 已加载合伙店铺信息:', store.store_name);
            setMerchantStore(store);
          }
        } catch (error) {
          console.error('加载合伙店铺失败:', error);
        }
      };
      loadMerchantStore();
    } else {
      setMerchantStore(null);
    }
  }, [currentUser]);

  // 加载价格配置（从系统设置中心获取计费规则）
  const loadPricingSettings = async (region?: string) => {
    try {
      // 从系统设置中心获取计费规则
      const pricingSettings = await systemSettingsService.getPricingSettings(region);
      setPricingSettings({
        baseFee: pricingSettings.baseFee,
        perKmFee: pricingSettings.perKmFee,
        weightSurcharge: pricingSettings.weightSurcharge,
        urgentSurcharge: pricingSettings.urgentSurcharge,
        oversizeSurcharge: pricingSettings.oversizeSurcharge,
        scheduledSurcharge: pricingSettings.scheduledSurcharge,
        fragileSurcharge: pricingSettings.fragileSurcharge,
        foodBeverageSurcharge: pricingSettings.foodBeverageSurcharge,
        freeKmThreshold: pricingSettings.freeKmThreshold
      });
      console.log(`✅ 已加载${region ? region : '全局'}计费规则:`, pricingSettings);
    } catch (error) {
      console.error('加载价格设置失败:', error);
      // 使用系统默认值
      setPricingSettings({
        baseFee: 1500,
        perKmFee: 250,
        weightSurcharge: 150,
        urgentSurcharge: 500,
        oversizeSurcharge: 300,
        scheduledSurcharge: 200,
        fragileSurcharge: 300,
        foodBeverageSurcharge: 300,
        freeKmThreshold: 3
      });
    }
  };

  // 根据寄件地址检测领区并加载对应计费规则
  useEffect(() => {
    const detectAndLoadPricing = async () => {
      const address = senderAddressText;
      if (!address) {
        // 如果没有地址，加载全局默认配置
        loadPricingSettings();
        return;
      }

      const regionMap: { [key: string]: string } = {
        '曼德勒': 'mandalay', 'Mandalay': 'mandalay', 'မန္တလေး': 'mandalay',
        '彬乌伦': 'maymyo', 'Pyin Oo Lwin': 'maymyo', 'ပင်းတလဲ': 'maymyo',
        '仰光': 'yangon', 'Yangon': 'yangon', 'ရန်ကုန်': 'yangon',
        '内比都': 'naypyidaw', 'NPW': 'naypyidaw', 'နေပြည်တော်': 'naypyidaw',
        '东枝': 'taunggyi', 'TGI': 'taunggyi', 'တောင်ကြီး': 'taunggyi',
        '腊戌': 'lashio', 'Lashio': 'lashio', 'လားရှိုး': 'lashio',
        '木姐': 'muse', 'Muse': 'muse', 'မူဆယ်': 'muse'
      };

      let detectedRegion = '';
      for (const [city, regionId] of Object.entries(regionMap)) {
        if (address.includes(city)) {
          detectedRegion = regionId;
          break;
        }
      }

      loadPricingSettings(detectedRegion);
    };

    detectAndLoadPricing();
  }, [senderAddressText]);

  // 处理"立即下单"按钮点击
  const handleOrderButtonClick = () => {
    if (currentUser) {
      // 用户已登录，直接打开订单表单
      setShowOrderForm(true);
    } else {
      // 用户未登录，提示并打开注册窗口
      alert(language === 'zh' ? '请先注册或登录后再下单' : 
            language === 'en' ? 'Please register or login before placing an order' : 
            'အော်ဒါမတင်မီ အကောင့်ဖွင့်ပါ သို့မဟုတ် ဝင်ပါ');
      setShowRegisterModal(true);
    }
  };

  // 处理用户注册/登录
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 动态判断验证方式（邮箱或手机号）
    const isPhoneLogin = !isLoginMode ? (registerMethod === 'phone') : (!!registerForm.phone && !registerForm.email);
    const currentVerificationType = isPhoneLogin ? 'sms' : 'email';
    
    // 验证手机号
    // 注册模式下验证电话号码（登录模式不需要严格验证格式，只要有值即可）
    let normalizedPhone = '';
    
    if (isPhoneLogin) {
      if (!registerForm.phone) {
        alert(language === 'zh' ? '请填写电话号码' : language === 'en' ? 'Please fill in phone number' : 'ဖုန်းနံပါတ်ဖြည့်ပါ');
        return;
      }

      // 在注册模式下，或者登录模式下输入了不符合基本格式的号码时进行提示
      // 登录时稍微放宽一点，但基本格式还是要对
      const phoneRegex = /^[1-9]\d{7,10}$/;
      if (!isLoginMode && !phoneRegex.test(registerForm.phone)) {
        alert(language === 'zh' ? '请输入有效的手机号' : 
              language === 'en' ? 'Please enter a valid phone number' : 
              'မှန်ကန်သော ဖုန်းနံပါတ်ထည့်ပါ');
        return;
      }

      // 统一格式为 09xxxxxxxx
      normalizedPhone = '0' + registerForm.phone.replace(/^0+/, '');
    }

    // 验证密码
    if (!registerForm.password) {
      alert(language === 'zh' ? '请输入密码' : language === 'en' ? 'Please enter password' : 'စကားဝှက်ထည့်ပါ');
      return;
    }

    if (!isLoginMode && registerForm.password.length < 6) {
      alert(language === 'zh' ? '密码至少需要6位' : language === 'en' ? 'Password must be at least 6 characters' : 'စကားဝှက်သည် အနည်းဆုံး ၆ လုံးရှိရမည်');
      return;
    }

    try {
      // 检查用户是否已注册（根据验证方式检查）
      let existingUser;
      if (currentVerificationType === 'email') {
        // 邮箱验证：根据邮箱查找用户
        if (registerForm.email) {
          const emailToSearch = registerForm.email.trim().toLowerCase();
          console.log('开始查询用户，邮箱:', emailToSearch);
          
          try {
            // 方法1: 先尝试精确匹配（不区分大小写，不限制类型）
            let { data } = await supabase
          .from('users')
          .select('*')
              .ilike('email', emailToSearch)
              .maybeSingle();
            
            // 方法2: 如果没找到，尝试查找所有匹配的邮箱（可能有多个）
            if (!data) {
              const { data: allMatches } = await supabase
                .from('users')
                .select('*')
                .ilike('email', emailToSearch)
                .limit(5);
              
              // 如果有多个匹配，优先选择客户类型
              if (allMatches && allMatches.length > 0) {
                const customerMatch = allMatches.find(u => u.user_type === 'customer');
                data = customerMatch || allMatches[0];
              }
            }
            
            // 方法3: 如果还是没找到，尝试模糊匹配
            if (!data) {
              const { data: fuzzyMatches } = await supabase
                .from('users')
                .select('*')
                .like('email', `%${emailToSearch}%`)
                .limit(5);
              
              if (fuzzyMatches && fuzzyMatches.length > 0) {
                const customerMatch = fuzzyMatches.find(u => u.user_type === 'customer');
                data = customerMatch || fuzzyMatches[0];
              }
            }
            
        existingUser = data;
          } catch (err) {
            console.error('查询用户异常:', err);
            existingUser = null;
          }
        }
      } else {
        // 短信验证：根据手机号查找用户
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', normalizedPhone)
            .maybeSingle();
            
          if (error && error.code !== 'PGRST116') {
             console.error('查询用户失败(手机):', error);
          }
          existingUser = data;
        } catch (err) {
          console.error('查询用户异常(手机):', err);
          existingUser = null;
        }
      }
      
      if (isLoginMode) {
        // ===== 登录模式（会员）—— 商家请使用独立商家端 =====
        // 普通登录：验证邮箱或手机号和密码
        if (!registerForm.email && !registerForm.phone) {
          alert(language === 'zh' ? '请输入邮箱或手机号' : language === 'en' ? 'Please enter email or phone number' : 'အီးမေးလ် သို့မဟုတ် ဖုန်းနံပါတ်ထည့်ပါ');
          return;
        }

        if (!registerForm.password) {
          alert(language === 'zh' ? '请输入密码' : language === 'en' ? 'Please enter password' : 'စကားဝှက်ထည့်ပါ');
          return;
        }

        if (!existingUser) {
          alert(language === 'zh' ? '该账号未注册，请先注册' : language === 'en' ? 'Account not registered, please register first' : 'အကောင့်မရှိပါ၊ မှတ်ပုံတင်ပါ');
          setIsLoginMode(false);
          return;
        }
        
        // 检查用户类型，如果不是客户类型，给出提示（但不阻止登录，兼容旧数据）
        if (existingUser.user_type && existingUser.user_type !== 'customer') {
          console.warn('用户类型不匹配:', existingUser.user_type, '但允许登录（兼容模式）');
        }

        // 验证密码
        if (existingUser.password !== registerForm.password) {
          alert(language === 'zh' ? '密码错误' : language === 'en' ? 'Incorrect password' : 'စကားဝှက်မှားနေပါသည်');
          return;
        }

        // 登录成功
        setCurrentUser(existingUser);
        localStorage.setItem('ml-express-customer', JSON.stringify(existingUser));
        setShowRegisterModal(false);
        alert(language === 'zh' ? `登录成功！欢迎回来，${existingUser.name}` : 
              language === 'en' ? `Login successful! Welcome back, ${existingUser.name}` : 
              'ဝင်ရောက်ခြင်း အောင်မြင်ပါသည်! ' + existingUser.name);
        
        // 清空表单
        setRegisterForm({ name: '', phone: '', email: '', address: '', password: '', confirmPassword: '', verificationCode: '' });
        setCodeSent(false);
        setCountdown(0);
        
      } else {
        // ===== 注册模式 =====
        
        // 验证姓名
        if (!registerForm.name) {
          alert(language === 'zh' ? '请填写姓名' : language === 'en' ? 'Please fill in name' : 'နာမည်ဖြည့်ပါ');
          return;
        }

        // 验证确认密码
        if (!registerForm.confirmPassword) {
          alert(language === 'zh' ? '请确认密码' : language === 'en' ? 'Please confirm password' : 'စကားဝှက်အတည်ပြုပါ');
          return;
        }

        if (registerForm.password !== registerForm.confirmPassword) {
          alert(language === 'zh' ? '两次输入的密码不一致' : language === 'en' ? 'Passwords do not match' : 'စကားဝှက်များ မတူညီပါ');
          return;
        }

        // 验证验证码
        if (!registerForm.verificationCode) {
          alert(language === 'zh' ? '请输入验证码' : language === 'en' ? 'Please enter verification code' : 'အတည်ပြုကုဒ်ထည့်ပါ');
          return;
        }

        // 验证验证码是否正确（根据验证方式选择不同的服务）
        let verifyResult;
        const currentVerificationType = registerMethod === 'phone' ? 'sms' : 'email';
        
        if (currentVerificationType === 'email') {
          const { verifyEmailCode } = await import('../services/emailService');
          console.log('正在调用邮箱验证服务，邮箱:', registerForm.email, '验证码:', registerForm.verificationCode);
          verifyResult = await verifyEmailCode(registerForm.email, registerForm.verificationCode, language as 'zh' | 'en');
        } else {
          const { verifyVerificationCode } = await import('../services/smsService');
          console.log('正在调用短信验证服务，手机:', normalizedPhone, '验证码:', registerForm.verificationCode);
          verifyResult = await verifyVerificationCode(normalizedPhone, registerForm.verificationCode, language as 'zh' | 'en');
        }
        
        console.log('验证服务返回结果:', verifyResult);
        
        if (!verifyResult.success) {
          console.error('验证码验证失败:', verifyResult.message);
          alert(verifyResult.message);
          return;
        }

        console.log('验证码验证通过，准备检查邮箱是否已存在...');

        // 再次检查账号是否已存在（防止并发注册）
        if (existingUser) {
          const identifier = registerMethod === 'email' ? '邮箱' : '电话号码';
          const identifierEn = registerMethod === 'email' ? 'Email' : 'Phone number';
          const identifierMm = registerMethod === 'email' ? 'အီးမေးလ်' : 'ဖုန်းနံပါတ်';
          
          alert(language === 'zh' ? `该${identifier}已注册，请直接登录` : 
                language === 'en' ? `${identifierEn} already registered, please login` : 
                `${identifierMm} မှတ်ပုံတင်ပြီးပါပြီ၊ ဝင်ပါ`);
          setIsLoginMode(true);
          return;
        }

        console.log('账号不存在，开始创建新用户...');

        // 创建新用户
        const newUser = await userService.createCustomer({
          name: registerForm.name,
          phone: registerMethod === 'phone' ? normalizedPhone : '',
          email: registerMethod === 'email' ? registerForm.email : '',
          address: registerForm.address || '',
          password: registerForm.password
        });
        
        console.log('创建用户返回结果:', newUser);
        
        if (newUser) {
          setCurrentUser(newUser);
          localStorage.setItem('ml-express-customer', JSON.stringify(newUser));
          setShowRegisterModal(false);
          setShowOrderForm(true);
          console.log('注册成功，已保存用户信息');
          alert(language === 'zh' ? '注册成功！欢迎使用缅甸同城快递' : 
                language === 'en' ? 'Registration successful! Welcome to Myanmar Express' : 
                'မှတ်ပုံတင်ခြင်း အောင်မြင်ပါသည်!');
          
          // 清空表单
          setRegisterForm({ name: '', phone: '', email: '', address: '', password: '', confirmPassword: '', verificationCode: '' });
          setCodeSent(false);
          setCountdown(0);
        } else {
          console.error('注册失败：userService.createCustomer 返回 null');
          alert(language === 'zh' ? '注册失败，请稍后重试' : 
                language === 'en' ? 'Registration failed, please try again later' : 
                'မှတ်ပုံတင်ခြင်း မအောင်မြင်ပါ');
        }
      }
    } catch (error) {
      console.error('注册/登录失败:', error);
      alert(language === 'zh' ? '操作失败，请检查网络连接' : 
            language === 'en' ? 'Operation failed, please check network connection' : 
            'လုပ်ဆောင်ချက် မအောင်မြင်ပါ');
    }
  };

  // 发送验证码（支持邮箱和短信）
  const handleSendVerificationCode = async () => {
    // 检查倒计时
    if (countdown > 0) {
      alert(language === 'zh' ? `请等待 ${countdown} 秒后再试` : 
            language === 'en' ? `Please wait ${countdown} seconds` : 
            countdown + ' စက္ကန့် စောင့်ပါ');
      return;
    }

    try {
      const currentVerificationType = registerMethod === 'phone' ? 'sms' : 'email';
      
      if (currentVerificationType === 'email') {
        // ========== 邮箱验证 ==========
        // 验证邮箱
        if (!registerForm.email) {
          alert(language === 'zh' ? '请先输入邮箱' : 
                language === 'en' ? 'Please enter email first' : 
                'အီးမေးလ်ထည့်ပါ');
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(registerForm.email)) {
          alert(language === 'zh' ? '请输入有效的邮箱地址' : 
                language === 'en' ? 'Please enter a valid email address' : 
                'မှန်ကန်သော အီးမေးလ်လိပ်စာထည့်ပါ');
          return;
        }

        console.log('📧 发送验证码到邮箱:', registerForm.email);
        
        // 调用邮箱服务
        const { sendEmailVerificationCode } = await import('../services/emailService');
        const result = await sendEmailVerificationCode(registerForm.email, language as 'zh' | 'en');
        
        console.log('📧 邮箱服务返回结果:', result);
        
        if (result.success) {
          setCodeSent(true);
          setCountdown(60); // 60秒倒计时
          if (result.code) {
            setSentCode(result.code); // 开发模式可能会返回验证码
            console.log('🔑 验证码:', result.code);
          }
          alert(result.message);
        } else {
          console.error('❌ 邮箱服务返回失败:', result);
          alert(result.message);
        }
        
      } else {
        // ========== 短信验证 ==========
        // 验证手机号
        if (!registerForm.phone) {
          alert(language === 'zh' ? '请先输入手机号' : 
                language === 'en' ? 'Please enter phone number first' : 
                'ဖုန်းနံပါတ်ထည့်ပါ');
          return;
        }

        // 支持 9xxxxxxxx 格式（UI 已带 +95 并自动去 0）
        const phoneRegex = /^[1-9]\d{7,10}$/;
        if (!phoneRegex.test(registerForm.phone)) {
          alert(language === 'zh' ? '请输入有效的手机号' : 
                language === 'en' ? 'Please enter a valid phone number' : 
                'မှန်ကန်သော ဖုန်းနံပါတ်ထည့်ပါ');
          return;
        }

        // 统一格式为 09... 发送给后端函数
        const normalizedPhone = '0' + registerForm.phone.replace(/^0+/, '');
        console.log('📱 发送验证码到手机:', normalizedPhone);
        
        // 调用SMS服务
        const { sendVerificationCode } = await import('../services/smsService');
        const result = await sendVerificationCode(normalizedPhone, language as 'zh' | 'en');
        
        if (result.success) {
          setCodeSent(true);
          setCountdown(60); // 60秒倒计时
          if (result.code) {
            setSentCode(result.code); // 开发模式可能会返回验证码
            console.log('🔑 验证码:', result.code);
          }
          alert(result.message);
        } else {
          alert(result.message);
        }
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
      alert(language === 'zh' ? '发送失败，请重试' : 
            language === 'en' ? 'Failed to send, please try again' : 
            'ပို့ဆောင်မှု မအောင်မြင်ပါ');
    }
  };

  // 处理用户登出
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ml-express-customer');
    // 刷新页面以更新UI
    window.location.reload();
  };

  // 语言切换函数
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
  };

  // 城市切换函数
  const handleCityChange = (cityKey: string) => {
    const normalizedKey = (cityKey as CityKey) || DEFAULT_CITY_KEY;
    setSelectedCity(normalizedKey);
    const city = MYANMAR_CITIES[normalizedKey];
    if (city) {
      setMapCenter({ 
        lat: city.lat as number, 
        lng: city.lng as number 
      });
    }
  };

  // 根据位置判断最接近的城市
  const detectCityFromLocation = (lat: number, lng: number): CityKey => {
    let closestCity: CityKey = DEFAULT_CITY_KEY;
    let minDistance = Infinity;

    Object.entries(MYANMAR_CITIES).forEach(([key, city]) => {
      const distance = Math.sqrt(
        Math.pow(city.lat - lat, 2) + Math.pow(city.lng - lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = key as CityKey;
      }
    });

    return closestCity;
  };

  // 打开地图模态框时自动定位
  const handleOpenMapModal = async (type: 'sender' | 'receiver') => {
    setMapSelectionType(type);
    
    // 如果是 merchant 账号且选择寄件地址，且已加载店铺信息，直接锁定到店铺位置
    if (currentUser?.user_type === 'merchant' && type === 'sender' && merchantStore) {
        console.log('📍 MERCHANTS账号，自动锁定店铺位置:', merchantStore.store_name);
        
        // 设置地图中心和选中位置
        setMapCenter({ lat: merchantStore.latitude, lng: merchantStore.longitude });
        setSelectedLocation({
            lat: merchantStore.latitude,
            lng: merchantStore.longitude,
            address: merchantStore.address
        });
        
        // 根据店铺位置自动切换到对应城市
        const detectedCity = detectCityFromLocation(merchantStore.latitude, merchantStore.longitude);
        setSelectedCity(detectedCity);
        
        // 自动填充地址输入框（如果存在）
        setTimeout(() => {
          const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
          if (addressInput) {
            addressInput.value = merchantStore.address;
          }
        }, 100);

        setShowMapModal(true);
        return; // 跳过后续的自动定位逻辑
    }
    
    // 尝试获取用户位置
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5分钟缓存
            }
          );
        });

        const { latitude, longitude } = position.coords;
        
        // 根据位置判断城市
        const detectedCity = detectCityFromLocation(latitude, longitude);
        setSelectedCity(detectedCity);
        setMapCenter({ lat: latitude, lng: longitude });
        
        console.log(`📍 已根据定位自动选择城市: ${MYANMAR_CITIES[detectedCity].name}`);
      } catch (error) {
        // 定位失败，使用默认城市（曼德勒）
        console.log('⚠️ 无法获取位置，使用默认城市（曼德勒）');
        const defaultCity = MYANMAR_CITIES[DEFAULT_CITY_KEY];
        setSelectedCity(DEFAULT_CITY_KEY);
        setMapCenter({ lat: defaultCity.lat, lng: defaultCity.lng });
      }
    } else {
      // 浏览器不支持定位，使用默认城市（曼德勒）
      console.log('⚠️ 浏览器不支持定位，使用默认城市（曼德勒）');
      const defaultCity = MYANMAR_CITIES[DEFAULT_CITY_KEY];
      setSelectedCity(DEFAULT_CITY_KEY);
      setMapCenter({ lat: defaultCity.lat, lng: defaultCity.lng });
    }

    setShowMapModal(true);
  };

  // 长按处理函数
  const handleLongPress = async (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 根据选择的城市动态调整坐标转换
    const currentCity =
      MYANMAR_CITIES[selectedCity] || MYANMAR_CITIES[DEFAULT_CITY_KEY];
    const lat = currentCity.lat + (0.5 - y / rect.height) * 0.1;
    const lng = currentCity.lng + (x / rect.width - 0.5) * 0.1;
    
    // 设置地图点击位置
    setMapClickPosition({ lat, lng });
    
    // 使用Google Maps Geocoding API获取真实地址
    try {
      // 使用Google Maps API获取地址
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      
      let fullAddress = '';
      if (response.results && response.results[0]) {
        fullAddress = response.results[0].formatted_address;
      } else {
        // 如果无法获取地址，使用城市名称和坐标
        const currentCity =
          MYANMAR_CITIES[selectedCity] || MYANMAR_CITIES[DEFAULT_CITY_KEY];
        fullAddress = `${currentCity.name}, 坐标: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
      
      // 自动填充到地址输入框
      const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
      if (addressInput) {
        addressInput.value = fullAddress;
        addressInput.style.borderColor = 'rgba(56, 161, 105, 0.6)';
        addressInput.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
      }
      
      // 更新选中位置
      setSelectedLocation({ lat, lng, address: fullAddress });
      
      console.log(`✅ 长按选中位置：${fullAddress}`);
    } catch (error) {
      console.error('地址获取失败:', error);
      // 出错时使用城市名称和坐标
      const currentCity =
        MYANMAR_CITIES[selectedCity] || MYANMAR_CITIES[DEFAULT_CITY_KEY];
      const fallbackAddress = `${currentCity.name}, 坐标: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
      if (addressInput) {
        addressInput.value = fallbackAddress;
        addressInput.style.borderColor = 'rgba(56, 161, 105, 0.6)';
        addressInput.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
      }
      
      setSelectedLocation({ lat, lng, address: fallbackAddress });
    }
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

  const handleNavigation = (path: string) => {
    setIsVisible(false);
    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  // 生成二维码
  const generateQRCode = async (orderId: string) => {
    try {
      const qrCodeUrl = await QRCode.toDataURL(orderId, {
        width: 200,
        margin: 2,
        color: {
          dark: '#2c5282',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrCodeUrl);
      return qrCodeUrl;
    } catch (error) {
      console.error(t.errors?.qrGenerationFailed, error);
      return null;
    }
  };

  // 下载二维码
  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    setDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `${t.ui.packageTracking}_${generatedOrderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 模拟发送给客户
      alert(t.errors?.qrDownloaded);
    } catch (error) {
      console.error(t.errors?.downloadFailed, error);
      alert(t.errors?.downloadFailed);
    } finally {
      setDownloading(false);
    }
  };

  // 测试数据库连接
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await testConnection();
        if (!isConnected) {
          console.warn(t.errors?.dbConnectionFailed);
        }
      } catch (error) {
        console.error(t.errors?.connectionTestError, error);
      }
    };
    
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动保存客户信息到用户管理
  const saveCustomerToUsers = async (orderInfo: any) => {
    try {
      console.log('开始保存客户信息:', orderInfo);
      
      // 检查客户是否已存在
      const existingUser = await userService.getUserByPhone(orderInfo.senderPhone);
      
      if (existingUser) {
        console.log('客户已存在，更新统计信息:', existingUser);
        // 更新现有客户的订单统计
        await userService.updateUserStats(existingUser.id, 5000);
      } else {
        console.log('创建新客户:', orderInfo);
        // 创建新客户
        const newCustomer = await userService.createCustomer({
          name: orderInfo.senderName,
          phone: orderInfo.senderPhone,
          address: orderInfo.senderAddress
        });
        
        if (newCustomer) {
          // 更新新客户的订单统计
          await userService.updateUserStats(newCustomer.id, 5000);
        }
      }
    } catch (error) {
      console.error(t.errors?.saveCustomerFailed, error);
    }
  };


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTracking = () => {
    if (trackingNumber) {
      // 模拟跟踪结果
      setTrackingResult({
        number: trackingNumber,
        status: 'In Transit',
        location: 'Myanmar Distribution Center',
        estimatedDelivery: 'Today 3:00 PM'
      });
    }
  };

  // 生成缅甸时间格式的包裹ID（根据寄件地址自动识别城市）
  const generateMyanmarPackageId = (senderAddress?: string) => {
    // 使用Intl API获取缅甸时间（Asia/Yangon时区），确保年份和时间准确
    const now = new Date();
    
    // 获取缅甸时间的各个组件
    const myanmarTimeParts = {
      year: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', year: 'numeric' }),
      month: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', month: '2-digit' }),
      day: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', day: '2-digit' }),
      hour: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', hour: '2-digit', hour12: false }),
      minute: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', minute: '2-digit' })
    };
    
    // 格式化时间组件
    const year = myanmarTimeParts.year;
    const month = myanmarTimeParts.month.padStart(2, '0');
    const day = myanmarTimeParts.day.padStart(2, '0');
    const hour = myanmarTimeParts.hour.padStart(2, '0');
    const minute = myanmarTimeParts.minute.padStart(2, '0');
    const random1 = Math.floor(Math.random() * 10);
    const random2 = Math.floor(Math.random() * 10);
    
    // 根据寄件地址自动识别城市前缀（优先级从高到低）
    // 🚀 核心修复：将具体城市（如 POL）放在前面，通用名称（如 MDY 曼德勒省）放在最后
    const cityPrefixMap: { [key: string]: string } = {
      // 彬乌伦
      '彬乌伦': 'POL',
      'Pyin Oo Lwin': 'POL',
      'ပင်းတလဲ': 'POL',
      // 内比都（开发中）
      '内比都': 'NPW',
      'Naypyidaw': 'NPW',
      'နေပြည်တော်': 'NPW',
      // 东枝（开发中）
      '东枝': 'TGI',
      'Taunggyi': 'TGI',
      'တောင်ကြီး': 'TGI',
      // 腊戌（开发中）
      '腊戌': 'LSO',
      'Lashio': 'LSO',
      'လားရှိုး': 'LSO',
      // 木姐（开发中）
      '木姐': 'MSE',
      'Muse': 'MSE',
      'မူဆယ်': 'MSE',
      // 仰光（开发中）
      '仰光': 'YGN',
      'Yangon': 'YGN',
      'ရန်ကုန်': 'YGN',
      // 曼德勒（总部/省份名，放最后作为兜底）
      '曼德勒': 'MDY',
      'Mandalay': 'MDY',
      'မန္တလေး': 'MDY'
    };
    
    // 🚀 修正：不再依赖 selectedCity 状态，而是根据地址文本自动检测
    let prefix = 'MDY'; // 默认曼德勒
    if (senderAddress) {
      for (const [city, cityPrefix] of Object.entries(cityPrefixMap)) {
        if (senderAddress.includes(city)) {
          prefix = cityPrefix;
          break;
        }
      }
    }
    
    return `${prefix}${year}${month}${day}${hour}${minute}${random1}${random2}`;
  };

  // 计算两个地址之间的距离（使用Google Maps Distance Matrix API）
  const calculateDistance = async (origin: string, destination: string): Promise<number> => {
    console.log('开始计算距离:', { origin, destination });
    
    try {
      if (!window.google || !window.google.maps) {
        console.warn('⚠️ Google Maps API未加载，使用默认距离 5km');
        alert(`${t.errors?.distanceCalculationFailed || '距离计算失败'}\n使用默认距离: 5 km`);
        return 5;
      }

      if (!origin || !destination) {
        console.error('❌ 地址信息不完整');
        throw new Error('地址信息不完整');
      }

      const service = new window.google.maps.DistanceMatrixService();
      
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          console.warn('⏱️ 距离计算超时，使用默认值');
          resolve(5);
        }, 10000); // 10秒超时

        service.getDistanceMatrix(
          {
            origins: [origin],
            destinations: [destination],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC,
          },
          (response: any, status: any) => {
            clearTimeout(timeoutId);
            
            console.log('距离计算响应:', { status, response });
            
            if (status === 'OK') {
              const element = response.rows[0]?.elements[0];
              
              if (element?.status === 'OK') {
                const distanceInMeters = element.distance.value;
                const distanceInKm = distanceInMeters / 1000;
                // 不再进行四舍五入，保留最精准的数值
                console.log('✅ 距离计算成功:', distanceInKm, 'km');
                resolve(distanceInKm);
              } else if (element?.status === 'ZERO_RESULTS') {
                console.warn('⚠️ 无法找到路线，使用默认距离');
                alert((language === 'zh' ? '无法计算两地之间的距离，可能地址不够详细' : language === 'en' ? 'Unable to calculate distance between two locations, address may be insufficient' : 'နေရာနှစ်ခုကြားအကွာအဝေးကို တွက်ချက်နိုင်ခြင်းမရှိပါ၊ လိပ်စာမလုံလောက်နိုင်သည်') + '\n' + (language === 'zh' ? '使用默认距离: 5 km' : language === 'en' ? 'Using default distance: 5 km' : 'ပုံမှန်အကွာအဝေး: 5 km'));
                resolve(5);
              } else {
                console.warn('⚠️ 距离计算状态异常:', element?.status);
                resolve(5);
              }
            } else if (status === 'OVER_QUERY_LIMIT') {
              console.error('❌ Google Maps API 查询限额已达上限');
              alert(language === 'zh' ? '系统繁忙，使用默认距离: 5 km' : language === 'en' ? 'System busy, using default distance: 5 km' : 'စနစ်မှာ အလုပ်များနေသည်၊ ပုံမှန်အကွာအဝေး: 5 km');
              resolve(5);
            } else if (status === 'REQUEST_DENIED') {
              console.error('❌ Google Maps API 请求被拒绝，可能是 API Key 问题');
              alert(language === 'zh' ? '地图服务配置错误，使用默认距离: 5 km' : language === 'en' ? 'Map service configuration error, using default distance: 5 km' : 'မြေပုံဝန်ဆောင်မှု ကွန်ဖီဂူရေးရှင်းမှားနေသည်၊ ပုံမှန်အကွာအဝေး: 5 km');
              resolve(5);
            } else {
              console.warn('⚠️ 距离计算失败，状态:', status);
              resolve(5);
            }
          }
        );
      });
    } catch (error) {
      console.error('❌ 距离计算异常:', error);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      alert(`${t.errors?.distanceCalculationFailed || '距离计算失败'}\n${errorMsg}\n使用默认距离: 5 km`);
      return 5;
    }
  };

  // 计算配送价格（使用系统设置中的价格）
  const calculatePrice = (packageType: string, weight: string, deliverySpeed: string, distance: number): number => {
    // 🚀 按照要求：给客户计费的距离向上取整（例如 6.1km = 7km）
    const billingDistance = Math.max(1, Math.ceil(distance));
    
    // 🚀 核心优化：如果是“顺路递”，只计算基础费用，不加任何附加费
    if (packageType === t.ui.waySide) {
      return pricingSettings.baseFee;
    }
    
    // 1. 基础起步价
    let totalPrice = pricingSettings.baseFee;
    
    // 2. 距离费用（超过免费公里数后按每公里费用计算）
    const distanceFee = Math.max(0, billingDistance - pricingSettings.freeKmThreshold) * pricingSettings.perKmFee;
    totalPrice += distanceFee;
    
    // 3. 重量附加费
    const weightNum = parseFloat(weight) || 0;
    const weightThreshold = 5;
    // 仅超重件计算重量附加费，匹配 App 逻辑
    if ((packageType === t.ui.overweightPackageDetail || packageType === '超重件（5KG）以上') && weightNum > weightThreshold) {
      totalPrice += (weightNum - weightThreshold) * pricingSettings.weightSurcharge;
    }
    
    // 4. 包裹类型附加费
    if (packageType === t.ui.oversizedPackageDetail || packageType === '超规件（45x60x15cm）以上') {
      // 超规件：按计费距离计算附加费
      totalPrice += billingDistance * pricingSettings.oversizeSurcharge;
    } else if (packageType === t.ui.fragile || packageType === '易碎品') {
      // 易碎品：按计费距离计算附加费
      totalPrice += billingDistance * pricingSettings.fragileSurcharge;
    } else if (packageType === t.ui.foodDrinks || packageType === '食品和饮料') {
      // 食品和饮料：按计费距离计算附加费
      totalPrice += billingDistance * pricingSettings.foodBeverageSurcharge;
    }
    
    // 5. 配送速度附加费
    if (deliverySpeed === t.ui.urgentDelivery || deliverySpeed === '加急配送' || deliverySpeed === '急送达') {
      totalPrice += pricingSettings.urgentSurcharge;
    } else if (deliverySpeed === t.ui.scheduledDelivery || deliverySpeed === '定时达' || deliverySpeed === '预约配送') {
      totalPrice += pricingSettings.scheduledSurcharge;
    }
    
    // 返回四舍五入后的价格
    return Math.round(totalPrice);
  };

  // 重置表单和计算状态
  const resetOrderForm = () => {
    setIsCalculated(false);
    setCalculatedPriceDetail(0);
    setCalculatedDistanceDetail(0);
    setSelectedSenderLocation(null);
    setSelectedReceiverLocation(null);
    setScheduledDeliveryTime('');
    setSelectedDeliverySpeed('');
    setOrderConfirmationStatus('idle');
    setOrderConfirmationMessage('');
    setQrCodeDataUrl('');
    setGeneratedOrderId('');
  };

  // 计算两个点之间的球面距离（公里）
  const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 预估费用计算函数（类似客户端App）
  const calculatePriceEstimate = async () => {
    try {
      // 获取表单数据
      const form = document.querySelector('form') as HTMLFormElement;
      if (!form) return;
      
      const formData = new FormData(form);
      const orderInfo = {
        packageType: formData.get('packageType') as string,
        weight: formData.get('weight') as string,
        deliverySpeed: formData.get('deliverySpeed') as string,
      };

      // 检查坐标信息（优先使用地图选择的精确坐标）
      let distance = 0;
      
      // 🚀 优化：从地址文本中尝试提取坐标（如果 state 为空但文本里有）
      let senderLat = selectedSenderLocation?.lat;
      let senderLng = selectedSenderLocation?.lng;
      let receiverLat = selectedReceiverLocation?.lat;
      let receiverLng = selectedReceiverLocation?.lng;

      const senderAddressTextValue = formData.get('senderName') ? senderAddressText : (formData.get('senderAddress') as string);
      const receiverAddressTextValue = formData.get('receiverAddress') as string;

      if (!senderLat || !senderLng) {
        const match = senderAddressTextValue?.match(/📍 坐标: (-?\d+\.\d+), (-?\d+\.\d+)/);
        if (match) {
          senderLat = parseFloat(match[1]);
          senderLng = parseFloat(match[2]);
        }
      }
      if (!receiverLat || !receiverLng) {
        const match = receiverAddressTextValue?.match(/📍 坐标: (-?\d+\.\d+), (-?\d+\.\d+)/);
        if (match) {
          receiverLat = parseFloat(match[1]);
          receiverLng = parseFloat(match[2]);
        }
      }

      if (senderLat && senderLng && receiverLat && receiverLng) {
        console.log('📍 使用精确坐标计算距离:', { sender: { lat: senderLat, lng: senderLng }, receiver: { lat: receiverLat, lng: receiverLng } });
        distance = calculateDistanceKm(senderLat, senderLng, receiverLat, receiverLng);
      } else {
        // 如果没有坐标，尝试使用地址字符串计算（备用方案）
        if (!senderAddressTextValue || !receiverAddressTextValue) {
          alert(language === 'zh' ? '请先选择寄件和收件地址（建议从地图选择以获得精准费用）' : 
                language === 'en' ? 'Please select sender and receiver addresses (Map selection recommended for accurate pricing)' : 
                'ပို့ဆောင်သူနှင့် လက်ခံသူ လိပ်စာများကို ရွေးချယ်ပါ (တိကျသောစျေးနှုန်းအတွက် မြေပုံမှရွေးချယ်ရန် အကြံပြုပါသည်)');
          return;
        }

        // 清理地址文本中的坐标信息，防止 Google API 识别失败
        const cleanSenderAddr = senderAddressTextValue.split('\n').filter(l => !l.includes('📍 坐标:')).join(' ').trim();
        const cleanReceiverAddr = receiverAddressTextValue.split('\n').filter(l => !l.includes('📍 坐标:')).join(' ').trim();

        console.log('📝 无坐标，尝试使用清理后的地址文本计算距离:', { cleanSenderAddr, cleanReceiverAddr });
        distance = await calculateDistance(cleanSenderAddr, cleanReceiverAddr);
      }
      
      // 按照要求：用于给客户计费的距离向上取整（例如 6.1km = 7km）
      const roundedDistanceForBilling = Math.max(1, Math.ceil(distance));
      
      // 🚀 核心修改：如果是“顺路递”，强制将显示距离设为 0 (或保持原样但说明不计费)
      const isWaySide = orderInfo.packageType === t.ui.waySide;
      setCalculatedDistanceDetail(isWaySide ? 0 : roundedDistanceForBilling);
      
      // 计算价格
      const priceValue = calculatePrice(
        orderInfo.packageType,
        orderInfo.weight,
        orderInfo.deliverySpeed,
        roundedDistanceForBilling
      );
      
      setCalculatedPriceDetail(priceValue);
      setIsCalculated(true);
      
      // 显示计算结果
      let resultMsg = '';
      if (isWaySide) {
        resultMsg = language === 'zh' ? 
          `计算完成！\n配送类型: 顺路递 (24小时内送达)\n总费用: ${priceValue} MMK` :
          language === 'en' ? 
          `Calculation Complete!\nType: Eco Way (24h Delivery)\nTotal Cost: ${priceValue} MMK` :
          'တွက်ချက်မှု ပြီးမြောက်ပါပြီ!\nအမျိုးအစား: တန်တန်လေးပို့ (၂၄ နာရီအတွင်း)\nစုစုပေါင်းကုန်ကျစရိတ်: ' + priceValue + ' MMK';
      } else {
        resultMsg = language === 'zh' ? 
          `计算完成！\n配送距离: ${roundedDistanceForBilling}km\n总费用: ${priceValue} MMK` :
          language === 'en' ? 
          `Calculation Complete!\nDelivery Distance: ${roundedDistanceForBilling}km\nTotal Cost: ${priceValue} MMK` :
          'တွက်ချက်မှု ပြီးမြောက်ပါပြီ!\nပို့ဆောင်အကွာအဝေး: ' + roundedDistanceForBilling + 'km\nစုစုပေါင်းကုန်ကျစရိတ်: ' + priceValue + ' MMK';
      }
      
      alert(resultMsg);
      
    } catch (error) {
      console.error('计算费用失败:', error);
      alert(language === 'zh' ? '计算失败，请重试' : 
            language === 'en' ? 'Calculation failed, please try again' : 
            'တွက်ချက်မှု မအောင်မြင်ပါ၊ ပြန်လည်ကြိုးစားပါ');
    }
  };

  // 🚀 新增：处理商品数量变化
  const handleProductQuantityChange = (productId: string, delta: number) => {
    setSelectedProducts(prev => {
      const newQty = Math.max(0, (prev[productId] || 0) + delta);
      const newSelected = { ...prev };
      if (newQty === 0) {
        delete newSelected[productId];
      } else {
        newSelected[productId] = newQty;
      }
      
      // 更新总价
      const newTotal = Object.entries(newSelected).reduce((sum, [id, qty]) => {
        const product = merchantProducts.find(p => p.id === id);
        return sum + (product ? product.price * qty : 0);
      }, 0);
      setCartTotal(newTotal);
      
      return newSelected;
    });
  };

  const handleCancelOrder = () => {
    setShowOrderForm(false);
    setIsFromCart(false);
    isFromCartRef.current = false; // 🚀 同时更新 ref
    setOrderConfirmationStatus('idle');
    setOrderConfirmationMessage('');
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    
    // 从地址文本中提取纯地址（移除坐标信息）
    const extractAddress = (addressText: string) => {
      const lines = addressText.split('\n');
      return lines.filter(line => !line.includes('📍 坐标:')).join('\n').trim();
    };
    
    const orderInfo = {
      senderName: formData.get('senderName') as string,
      senderPhone: formData.get('senderPhone') as string,
      senderAddress: extractAddress(senderAddressText),
      receiverName: formData.get('receiverName') as string,
      receiverPhone: formData.get('receiverPhone') as string,
      receiverAddress: extractAddress(receiverAddressText),
      packageType: formData.get('packageType') as string,
      weight: formData.get('weight') as string,
      deliverySpeed: formData.get('deliverySpeed') as string,
      scheduledTime: scheduledDeliveryTime || null,
      senderLatitude: selectedSenderLocation?.lat || null,
      senderLongitude: selectedSenderLocation?.lng || null,
      receiverLatitude: selectedReceiverLocation?.lat || null,
      receiverLongitude: selectedReceiverLocation?.lng || null,
      codAmount: codAmount ? parseFloat(codAmount) : 0,
      description: description // 🚀 新增：传递物品描述
    };
    
    // 验证必填字段
    if (!orderInfo.senderAddress || !orderInfo.receiverAddress) {
      alert(t.errors?.addressRequired || '请填写完整的寄件和收件地址');
      return;
    }

    // 如果是 MERCHANTS 账号，强制使用店铺信息（地址和经纬度）
    if (currentUser?.user_type === 'merchant') {
      try {
        console.log('正在查找商家店铺信息...', currentUser);
        // 尝试通过多种方式匹配店铺（优先匹配 store_code，即 name）
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data: store } = await supabase
          .from('delivery_stores')
          .select('*')
          .or(`store_code.eq.${currentUser.name},manager_phone.eq.${currentUser.phone},phone.eq.${currentUser.phone},store_name.eq.${currentUser.name}`)
          .limit(1)
          .maybeSingle();

        if (store) {
          console.log('找到商家店铺，强制使用店铺坐标:', store.store_name);
          // 覆盖 orderInfo 中的寄件经纬度
          orderInfo.senderLatitude = store.latitude;
          orderInfo.senderLongitude = store.longitude;
          // 更新状态，确保后续逻辑（如距离计算）使用新坐标
          setSelectedSenderLocation({ lat: store.latitude, lng: store.longitude });
        } else {
          console.warn('未找到关联的合伙店铺');
        }
      } catch (err) {
        console.error('查找商家店铺异常:', err);
      }
    }
    
    // 根据包裹类型决定是否需要重量
    const needWeight = orderInfo.packageType === t.ui.overweightPackageDetail || 
                      orderInfo.packageType === t.ui.oversizedPackageDetail ||
                      orderInfo.packageType === '超重件（5KG）以上' || 
                      orderInfo.packageType === '超规件（45x60x15cm）以上';
    if (!orderInfo.packageType || (needWeight && !orderInfo.weight) || !orderInfo.deliverySpeed) {
      alert('请填写完整的包裹信息');
      return;
    }
    
    // 🚀 核心优化：直接进入正式提交流程，不再显示“选择支付方式”窗口
    setOrderSubmitStatus('processing');
    setShowOrderForm(false);
    setOrderConfirmationStatus('idle');
    setOrderConfirmationMessage('');
    
    try {
      console.log('🚀 开始提交订单...');
      
      // 1. 等待Google Maps API加载 (如果未加载)
      let retryCount = 0;
      while (!isMapLoaded && retryCount < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retryCount++;
      }
      
      // 2. 计算距离和价格
      // 🚀 核心优化：如果之前已经点击过“计算”按键获得了精准距离，则直接复用
      let finalDistance = 0;
      
      if (isCalculated && calculatedDistanceDetail > 0) {
        finalDistance = calculatedDistanceDetail;
        console.log('✅ 复用之前的计算结果:', finalDistance, 'km');
      } else {
        // 如果没有点击过计算，或者计算结果为0，尝试重新计算
        // 优先使用坐标计算
        let sLat = selectedSenderLocation?.lat;
        let sLng = selectedSenderLocation?.lng;
        let rLat = selectedReceiverLocation?.lat;
        let rLng = selectedReceiverLocation?.lng;

        if (sLat && sLng && rLat && rLng) {
          finalDistance = calculateDistanceKm(sLat, sLng, rLat, rLng);
          console.log('📍 使用提交时的坐标重新计算距离:', finalDistance, 'km');
        } else {
          // 备用：使用地址文本计算
          const distance = await calculateDistance(orderInfo.senderAddress, orderInfo.receiverAddress);
          finalDistance = distance || 5; 
          console.log('📝 使用提交时的地址文本计算距离:', finalDistance, 'km');
        }
      }
      
      const finalPrice = isCalculated ? calculatedPriceDetail : calculatePrice(
        orderInfo.packageType,
        orderInfo.weight,
        orderInfo.deliverySpeed,
        finalDistance
      );

      // 3. 生成最终订单 ID
      const packageId = generateMyanmarPackageId(orderInfo.senderAddress);
      setGeneratedOrderId(packageId);

      // 4. 余额扣款逻辑 (仅限会员/VIP，且针对商城订单)
      let totalDeduction = 0;
      if (isFromCart && cartTotal > 0 && currentUser?.user_type !== 'merchant') {
        totalDeduction += cartTotal;
      }

      // 如果跑腿费也选择余额支付
      if (paymentMethod === 'balance' && currentUser?.user_type !== 'merchant') {
        totalDeduction += finalPrice;
      }

      // 检查余额
      if (totalDeduction > 0) {
        const currentBalance = currentUser?.balance || 0;
        if (currentBalance < totalDeduction) {
          setOrderSubmitStatus('failed');
          setOrderError(language === 'zh' ? `余额不足！当前余额: ${currentBalance.toLocaleString()} MMK，需要支付: ${totalDeduction.toLocaleString()} MMK` : 
                       `Insufficient balance! Current: ${currentBalance.toLocaleString()} MMK, Required: ${totalDeduction.toLocaleString()} MMK`);
          setShowOrderSuccessModal(true);
          return;
        }

        // 执行余额扣除
        console.log('💰 正在执行余额扣除:', totalDeduction);
        const { data: updatedUser, error: deductError } = await supabase
          .from('users')
          .update({ 
            balance: currentBalance - totalDeduction,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentUser.id)
          .select()
          .single();

        if (deductError) {
          throw new Error(language === 'zh' ? '由于余额扣除异常，订单无法提交' : 'Balance deduction failed, order cannot be submitted');
        }

        // 更新本地状态
        const newUserData = { ...currentUser, balance: updatedUser.balance };
        setCurrentUser(newUserData);
        localStorage.setItem('ml-express-customer', JSON.stringify(newUserData));
      }

      // 5. 身份标记与描述准备
      let ordererTypeTag = '';
      if (currentUser) {
        const type = currentUser.user_type === 'merchant' ? '商家' : 
                    ((currentUser.balance > 0 || currentUser.user_type === 'vip') ? 'VIP' : '会员');
        const zhTag = `[下单身份: ${type}]`;
        const enTag = `[Orderer: ${type === '商家' ? 'MERCHANTS' : (type === 'VIP' ? 'VIP' : 'Member')}]`;
        const myTag = `[အော်ဒါတင်သူ: ${type === '商家' ? 'MERCHANTS' : (type === 'VIP' ? 'VIP' : 'Member')}]`;
        ordererTypeTag = language === 'zh' ? zhTag : (language === 'en' ? enTag : myTag);
      }

      const finalDescription = `${ordererTypeTag} ${orderInfo.description || description || ''}`.trim();
      
      const orderStatus = deriveInitialOrderStatus({
        isFromCart,
        userType: currentUser?.user_type,
        paymentMethod
      });

      // 6. 构建并保存包裹记录
      const packageData: any = {
        id: packageId,
        sender_name: orderInfo.senderName,
        sender_phone: orderInfo.senderPhone,
        sender_address: orderInfo.senderAddress,
        sender_latitude: orderInfo.senderLatitude,
        sender_longitude: orderInfo.senderLongitude,
        receiver_name: orderInfo.receiverName,
        receiver_phone: orderInfo.receiverPhone,
        receiver_address: orderInfo.receiverAddress,
        receiver_latitude: orderInfo.receiverLatitude,
        receiver_longitude: orderInfo.receiverLongitude,
        package_type: orderInfo.packageType,
        weight: (needWeight && orderInfo.weight) ? orderInfo.weight : '1',
        description: finalDescription,
        delivery_speed: orderInfo.deliverySpeed,
        scheduled_delivery_time: orderInfo.scheduledTime || null,
        delivery_distance: finalDistance,
        status: orderStatus,
        create_time: new Date().toLocaleString('zh-CN'),
        pickup_time: '',
        delivery_time: '',
        courier: '待分配',
        price: `${finalPrice} MMK`,
        payment_method: paymentMethod,
        cod_amount: orderInfo.codAmount || 0,
        customer_id: currentUser?.id || null,
        customer_email: currentUser?.email || null,
        customer_name: currentUser?.name || orderInfo.senderName
      };

      if (isFromCart && merchantProducts.length > 0) {
        packageData.delivery_store_id = merchantProducts[0].store_id;
      } else if (currentUser && currentUser.user_type === 'merchant') {
        packageData.delivery_store_id = currentUser.store_id || currentUser.id;
        packageData.delivery_store_name = currentUser.name;
        packageData.sender_code = currentUser.store_code;
      }

      console.log('准备保存包裹数据:', packageData);
      const result = await packageService.createPackage(packageData);
      
      if (result) {
        await saveCustomerToUsers(orderInfo);
        
        // 生成二维码并成功显示
        const qrDataUrl = await generateQRCode(packageId);
        setQrCodeDataUrl(qrDataUrl || '');

        // 清理
        if (isFromCart || isFromCartRef.current) {
          clearCart();
          localStorage.removeItem('ml-express-cart');
          setSelectedProducts({});
          setMerchantProducts([]);
          setIsFromCart(false);
          isFromCartRef.current = false;
        }

        setOrderSubmitStatus('success');
        setShowOrderSuccessModal(true);
      } else {
        throw new Error('创建包裹记录失败');
      }
    } catch (error) {
      console.error('订单提交失败:', error);
      setOrderSubmitStatus('failed');
      setOrderError(error instanceof Error ? error.message : '订单提交失败，请稍后重试');
      setShowOrderSuccessModal(true);
    }
  };


  const captureMapSelection = () => {
    const addressInput = document.getElementById('map-address-input') as HTMLInputElement | null;
    if (!mapSelectionType || !addressInput) return;

    const targetField = mapSelectionType === 'sender'
      ? document.querySelector('textarea[name="senderAddress"]') as HTMLTextAreaElement | null
      : document.querySelector('textarea[name="receiverAddress"]') as HTMLTextAreaElement | null;

    if (targetField && addressInput.value.trim()) {
      targetField.value = addressInput.value.trim();
      if (mapSelectionType === 'sender') {
        setSelectedSenderLocation(mapClickPosition);
      } else {
        setSelectedReceiverLocation(mapClickPosition);
      }
    }
  };

  // 实际执行API请求的函数
  const performAutocompleteSearch = (input: string) => {
    if (!input.trim() || !autocompleteService || input.trim().length < 2) {
      setAutocompleteSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
      return;
    }

    // 如果查询相同，不重复请求
    if (lastSearchQueryRef.current === input.trim()) {
      return;
    }

    setIsLoadingSuggestions(true);
    lastSearchQueryRef.current = input.trim();

    // 使用Google Places Autocomplete API
    autocompleteService.getPlacePredictions(
      {
        input: input.trim(),
        location: new window.google.maps.LatLng(mapCenter.lat, mapCenter.lng),
        radius: 50000, // 50公里范围
        componentRestrictions: { country: 'mm' }, // 限制在缅甸
        language: language === 'zh' ? 'zh-CN' : 'en'
      },
      (predictions: any[], status: any) => {
        // 确保这是最新的查询结果
        if (lastSearchQueryRef.current === input.trim()) {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            // 显示更多结果（最多10个），像Google Maps一样
            const suggestions = predictions.slice(0, 10).map((prediction: any) => ({
              place_id: prediction.place_id,
              main_text: prediction.structured_formatting.main_text,
              secondary_text: prediction.structured_formatting.secondary_text,
              description: prediction.description
            }));
            setAutocompleteSuggestions(suggestions);
            setShowSuggestions(true);
          } else {
            setAutocompleteSuggestions([]);
            setShowSuggestions(false);
          }
          setIsLoadingSuggestions(false);
        }
      }
    );
  };

  // 处理地址输入变化，触发自动完成（带防抖）
  const handleAddressInputChange = (input: string) => {
    // 清除之前的定时器
    if (autocompleteDebounceTimerRef.current) {
      clearTimeout(autocompleteDebounceTimerRef.current);
    }

    // 如果输入为空，立即清除结果
    if (!input.trim() || input.length < 1) {
      setAutocompleteSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
      lastSearchQueryRef.current = '';
      return;
    }

    // 如果输入长度小于2，不搜索（减少不必要的请求）
    if (input.trim().length < 2) {
      setAutocompleteSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
      return;
    }

    // 设置防抖定时器（300ms延迟，平衡响应速度和API调用次数）
    autocompleteDebounceTimerRef.current = setTimeout(() => {
      performAutocompleteSearch(input);
    }, 300);
  };

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (autocompleteDebounceTimerRef.current) {
        clearTimeout(autocompleteDebounceTimerRef.current);
      }
    };
  }, []);

  // 处理选择建议
  const handleSelectSuggestion = (suggestion: any) => {
    if (!placesService) return;

    const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
    
    // 立即更新输入框，提供即时反馈
    if (addressInput) {
      addressInput.value = suggestion.description;
    }
    
    setShowSuggestions(false);
    setIsLoadingSuggestions(true);
    lastSearchQueryRef.current = '';

    // 获取地点的详细信息（包括坐标）
    placesService.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['geometry', 'formatted_address', 'name']
      },
      (place: any, status: any) => {
        setIsLoadingSuggestions(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const location = place.geometry.location;
          const coords = {
            lat: location.lat(),
            lng: location.lng()
          };

          // 更新地图中心
          setMapCenter(coords);
          
          // 如果地图实例存在，立即移动到新位置（平滑动画）
          if (mapRef.current) {
            mapRef.current.panTo(coords);
            // 可选：设置合适的缩放级别
            mapRef.current.setZoom(16);
          }
          
          // 设置地图点击位置（显示标记）
          setMapClickPosition(coords);
          
          // 设置选中位置
          setSelectedLocation({
            lat: coords.lat,
            lng: coords.lng,
            address: place.formatted_address || suggestion.description
          });

          // 设置POI信息
          if (place.name) {
            setSelectedPOI({
              name: place.name,
              types: place.types || []
            });
          }

          // 更新地址输入框（使用格式化地址）
          if (addressInput) {
            addressInput.value = place.formatted_address || suggestion.description;
            // 添加视觉反馈
            addressInput.style.borderColor = 'rgba(56, 161, 105, 0.6)';
            addressInput.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
          }
        } else {
          // 如果获取详情失败，至少保留用户选择的描述
          console.warn('获取地点详情失败，使用描述信息');
        }
      }
    );

    setAutocompleteSuggestions([]);
  };

  return (
    <div className="homepage" style={{ 
      fontFamily: 'var(--font-family-base)', 
      lineHeight: 'var(--line-height-normal)',
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
      
      <NavigationBar
        language={language}
        onLanguageChange={handleLanguageChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        onShowRegisterModal={(isLoginMode) => {
          setIsLoginMode(isLoginMode);
                  setShowRegisterModal(true);
                }}
      />


      <HomeBanner />

      {/* 英雄区域 */}
      <section id="home" style={{
        position: 'relative',
        zIndex: 5,
        background: 'transparent',
                color: 'white',
        padding: 0,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-in-out',
        textAlign: 'center',
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        {/* 动态背景装饰 */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '300px',
          height: '300px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          animation: 'float 6s ease-in-out infinite',
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '15%',
          left: '8%',
          width: '250px',
          height: '250px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          animation: 'float 8s ease-in-out infinite reverse',
        }}></div>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '400px',
          height: '400px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'pulse 10s ease-in-out infinite',
        }}></div>
        
        {/* 粒子效果 */}
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `sparkle ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`
          }}></div>
        ))}
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* 主标题区域 */}
          <div style={{
            marginBottom: '3rem',
            animation: 'fadeInUp 1s ease-out'
          }}>
          <Logo size="large" />
          <h1 style={{ 
              fontSize: window.innerWidth < 768 ? '2.5rem' : '4rem', 
              marginBottom: '1.5rem',
              fontWeight: '800',
              textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
              background: 'linear-gradient(45deg, #ffffff, #f0f8ff, #e6f3ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-1px',
              lineHeight: '1.1',
            marginTop: '1rem'
          }}>
            {t.hero.title}
          </h1>
          </div>

          {/* CTA按钮区域 */}
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeInUp 1s ease-out 0.3s both'
          }}>
          <button
            onClick={handleOrderButtonClick}
            style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                color: '#1e293b',
                border: '2px solid rgba(255,255,255,0.3)',
                padding: window.innerWidth < 768 ? '1.2rem 2.5rem' : '1.5rem 3rem',
                borderRadius: '60px',
              cursor: 'pointer',
                fontWeight: '700',
                fontSize: window.innerWidth < 768 ? '1.1rem' : '1.3rem',
                boxShadow: '0 15px 35px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 20px 45px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
            }}
          >
              <span style={{ position: 'relative', zIndex: 1 }}>
            {t.hero.cta}
              </span>
          </button>
            
            <button
              onClick={() => handleNavigation('/tracking')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.4)',
                padding: window.innerWidth < 768 ? '1.2rem 2.5rem' : '1.5rem 3rem',
                borderRadius: '60px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
            }}
            >
              📦 {t.ui.packageTracking}
            </button>

            {/* 🚀 恢复：同城商场和购物车入口 (仅限非 MERCHANTS 账号) */}
            {(!currentUser || (currentUser?.user_type !== 'merchant' && currentUser?.user_type !== 'partner')) ? (
              <>
                <button
                  onClick={() => handleNavigation('/mall')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    padding: window.innerWidth < 768 ? '1.2rem 2.5rem' : '1.5rem 3rem',
                    borderRadius: '60px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                  }}
                >
                  🛍️ {t.hero.mall}
                </button>

                <button
                  onClick={() => handleNavigation('/cart')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    padding: window.innerWidth < 768 ? '1.2rem 2.5rem' : '1.5rem 3rem',
                    borderRadius: '60px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                  }}
                >
                  🛒 {t.hero.cart}
                </button>

                <button
                  onClick={() => setShowTutorialModal(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    padding: window.innerWidth < 768 ? '1.2rem 2.5rem' : '1.5rem 3rem',
                    borderRadius: '60px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                  }}
                >
                  📖 {t.tutorial?.button || (language === 'zh' ? '使用教学' : 'Tutorial')}
                </button>
              </>
            ) : null}
            </div>

          {/* 特色标签 */}
        <div style={{
            marginTop: '3rem',
                    display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
                    justifyContent: 'center',
            animation: 'fadeInUp 1s ease-out 0.6s both'
          }}>
            {[`⚡ ${t.ui.lightningDelivery}`, `🛡️ ${t.ui.secureReliable}`, `📱 ${t.ui.smartService}`, `💎 ${t.ui.transparentPricing}`].map((tag: string, index: number) => (
              <div key={index} style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '0.8rem 1.5rem',
                borderRadius: '25px',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: 'white',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
                {tag}
          </div>
            ))}
            </div>
        </div>
      </section>





      {/* CSS动画样式 */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
          }
          
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1); }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      {/* 订单表单模态窗口 */}
      <OrderModal
        showOrderForm={showOrderForm}
        setShowOrderForm={setShowOrderForm}
        handleCancelOrder={handleCancelOrder}
        language={language}
        t={t}
        currentUser={currentUser}
        senderName={senderName}
        setSenderName={setSenderName}
        senderPhone={senderPhone}
        setSenderPhone={setSenderPhone}
        senderAddressText={senderAddressText}
        setSenderAddressText={setSenderAddressText}
        receiverName={receiverName}
        setReceiverName={setReceiverName}
        receiverPhone={receiverPhone}
        setReceiverPhone={setReceiverPhone}
        receiverAddressText={receiverAddressText}
        setReceiverAddressText={setReceiverAddressText}
        codAmount={codAmount}
        setCodAmount={setCodAmount}
        selectedDeliverySpeed={selectedDeliverySpeed}
        setSelectedDeliverySpeed={setSelectedDeliverySpeed}
        setShowTimePickerModal={setShowTimePickerModal}
        scheduledDeliveryTime={scheduledDeliveryTime}
        showWeightInput={showWeightInput}
        setShowWeightInput={setShowWeightInput}
        isCalculated={isCalculated}
        calculatedPriceDetail={calculatedPriceDetail}
        calculatedDistanceDetail={calculatedDistanceDetail}
        pricingSettings={pricingSettings}
        handleOpenMapModal={handleOpenMapModal}
        calculatePriceEstimate={calculatePriceEstimate}
        handleOrderSubmit={handleOrderSubmit}
        // 🚀 优化：坐标自动选择相关
        setSelectedSenderLocation={setSelectedSenderLocation}
        setSelectedReceiverLocation={setSelectedReceiverLocation}
        // 🚀 新增：商家商品选择相关
        merchantProducts={merchantProducts}
        selectedProducts={selectedProducts}
        handleProductQuantityChange={handleProductQuantityChange}
        cartTotal={cartTotal}
        hasCOD={hasCOD}
        setHasCOD={setHasCOD}
        isFromCart={isFromCart}
        description={description}
        setDescription={setDescription}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        merchantStore={merchantStore}
      />

      {/* 订单成功模态框 */}
      {showOrderSuccessModal && (
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
          zIndex: 999999
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
                color: orderSubmitStatus === 'success' ? '#A5C7FF' : '#ff6b6b',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                {orderSubmitStatus === 'success' 
                  ? '🎉 订单创建成功！' 
                  : orderSubmitStatus === 'failed'
                    ? '❌ 订单创建失败'
                    : '⏳ 正在处理...'}
              </h2>
              <button
                onClick={() => {
                  setShowOrderSuccessModal(false);
                  setOrderSubmitStatus('idle');
                  setOrderError('');
                  resetOrderForm();
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

            {/* 错误信息 - 仅在失败时显示 */}
            {orderSubmitStatus === 'failed' && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '1.5rem',
                borderRadius: '15px',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: '#ff6b6b',
                  fontSize: '1.2rem'
                }}>
                  错误信息
                </h3>
                <div style={{
                  background: 'rgba(255, 107, 107, 0.1)',
                  border: '2px solid #ff6b6b',
                  padding: '1rem',
                  borderRadius: '10px',
                  marginBottom: '1rem'
                }}>
                  <p style={{
                    margin: 0,
                    color: '#ff6b6b',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    fontWeight: 'bold'
                  }}>
                    {orderError || '订单提交失败，请稍后重试或联系客服。'}
                  </p>
                  <p style={{
                    margin: '1rem 0 0 0',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.9rem',
                    lineHeight: '1.6'
                  }}>
                    如果问题持续存在，请联系客服：<br />
                    {language === 'zh' 
                      ? '电话: (+95) 09788848928 / (+95) 09941118588 / (+95) 09941118688' 
                      : language === 'en'
                        ? 'Phone: (+95) 09788848928 / (+95) 09941118588 / (+95) 09941118688'
                        : 'ဖုန်း: (+95) 09788848928 / (+95) 09941118588 / (+95) 09941118688'}
                  </p>
                </div>
              </div>
            )}

            {/* 二维码显示 - 仅在成功时显示 */}
            {orderSubmitStatus === 'success' && (
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
                  {language === 'zh' ? '订单二维码' : language === 'en' ? 'Order QR Code' : 'အော်ဒါ QR Code'}
                </h3>
                
                {/* 订单号显示 */}
                <div style={{
                  background: 'white',
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  display: 'inline-block'
                }}>
                  <p style={{
                    margin: 0,
                    color: '#2c5282',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}>
                    {language === 'zh' ? '订单号' : language === 'en' ? 'Order Number' : 'အော်ဒါနံပါတ်'}: {generatedOrderId}
                  </p>
                </div>

                {/* 二维码 */}
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
                      alt="订单二维码" 
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
                      {language === 'zh' ? '正在生成二维码...' : language === 'en' ? 'Generating QR code...' : 'QR Code ထုတ်နေသည်...'}
                    </div>
                  )}
                </div>
                <p style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.9rem',
                  lineHeight: '1.5'
                }}>
                  {language === 'zh' 
                    ? '快递员将扫描此二维码进行取件\n请妥善保管此二维码'
                    : language === 'en'
                      ? 'The courier will scan this QR code to pick up the package\nPlease keep this QR code safe'
                      : 'ကူရီယာသည် QR Code ကို စကင်ဖတ်၍ ပစ္စည်းယူမည်\nဤ QR Code ကို သေချာစွာ ထိန်းသိမ်းထားပါ'}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexDirection: window.innerWidth < 768 ? 'column' : 'row'
            }}>
              {orderSubmitStatus === 'success' ? (
                <>
                  <button
                    onClick={downloadQRCode}
                    disabled={downloading || !qrCodeDataUrl}
                    style={{
                      background: downloading ? '#94a3b8' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '1rem 2rem',
                      borderRadius: '10px',
                      cursor: downloading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      width: window.innerWidth < 768 ? '100%' : 'auto'
                    }}
                    onMouseOver={(e) => {
                      if (!downloading) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!downloading) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                      }
                    }}
                  >
                    {downloading ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        {language === 'zh' ? '下载中...' : language === 'en' ? 'Downloading...' : 'ဒေါင်းလုဒ်လုပ်နေသည်...'}
                      </>
                    ) : (
                      <>
                        📥 {language === 'zh' ? '下载二维码' : language === 'en' ? 'Download QR Code' : 'QR Code ဒေါင်းလုဒ်လုပ်ရန်'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowOrderSuccessModal(false);
                      setOrderSubmitStatus('idle');
                      setOrderError('');
                      resetOrderForm();
                    }}
                    style={{
                      background: '#e2e8f0',
                      color: '#4a5568',
                      border: 'none',
                      padding: '1rem 2rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease',
                      width: window.innerWidth < 768 ? '100%' : 'auto'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
                  >
                    {language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်ရန်'}
                  </button>
                </>
              ) : orderSubmitStatus === 'failed' ? (
                <>
                  <button
                    onClick={() => {
                      setShowOrderSuccessModal(false);
                      setOrderSubmitStatus('idle');
                      setOrderError('');
                      setShowOrderForm(true); // 🚀 优化：失败后回到订单详情页重试
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '1rem 2rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)',
                      transition: 'all 0.3s ease',
                      width: window.innerWidth < 768 ? '100%' : 'auto'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(231, 76, 60, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(231, 76, 60, 0.3)';
                    }}
                  >
                    🔄 {language === 'zh' ? '重试' : language === 'en' ? 'Retry' : 'ပြန်လုပ်ရန်'}
                  </button>
                  <button
                    onClick={() => {
                      setShowOrderSuccessModal(false);
                      setOrderSubmitStatus('idle');
                      setOrderError('');
                      resetOrderForm();
                    }}
                    style={{
                      background: '#e2e8f0',
                      color: '#4a5568',
                      border: 'none',
                      padding: '1rem 2rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease',
                      width: window.innerWidth < 768 ? '100%' : 'auto'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
                  >
                    {language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်ရန်'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 地图选择模态窗口 */}
      {showMapModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999
        }}>
          <div style={{
            background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
            padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
            borderRadius: '15px',
            width: window.innerWidth < 768 ? '95%' : '80%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ color: 'white', marginBottom: '1rem' }}>
                选择{mapSelectionType === 'sender' ? t.order.sender : t.order.receiver}
              </h2>
            </div>
            
            {/* Google Maps 嵌入 */}
            <div style={{
              width: '100%',
              height: '400px',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '2rem',
              border: '2px solid rgba(255, 255, 255, 0.3)',
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
                    background: 'transparent',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#2d3748',
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '120px'
                  }}
                >
                  {Object.entries(MYANMAR_CITIES).map(([key, city]) => (
                    <option key={key} value={key}>
                      {language === 'zh' ? city.name : language === 'en' ? city.nameEn : city.nameMm}
                    </option>
                  ))}
                </select>
              </div>

              {/* 交互式地图容器 */}
              <div 
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  cursor: 'crosshair'
                }}
                onMouseDown={(e) => {
                  // 开始长按计时
                  const timer = setTimeout(() => {
                    setIsLongPressing(true);
                    handleLongPress(e);
                  }, 500); // 500ms后触发长按
                  setLongPressTimer(timer);
                }}
                onMouseUp={() => {
                  // 取消长按
                  if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    setLongPressTimer(null);
                  }
                  setIsLongPressing(false);
                }}
                onMouseLeave={() => {
                  // 鼠标离开时取消长按
                  if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    setLongPressTimer(null);
                  }
                  setIsLongPressing(false);
                }}
                onTouchStart={(e) => {
                  // 移动端长按支持
                  const timer = setTimeout(() => {
                    setIsLongPressing(true);
                    const touch = e.touches[0];
                    const mouseEvent = {
                      currentTarget: e.currentTarget,
                      clientX: touch.clientX,
                      clientY: touch.clientY
                    } as any;
                    handleLongPress(mouseEvent);
                  }, 500);
                  setLongPressTimer(timer);
                }}
                onTouchEnd={() => {
                  if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    setLongPressTimer(null);
                  }
                  setIsLongPressing(false);
                }}
              
              >
                {/* 真正的Google Maps */}
                {mapLoadError ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
                    color: '#4a5568'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>地图加载失败</h3>
                    <p style={{ margin: '0', opacity: 0.8, textAlign: 'center', padding: '0 1rem', fontSize: '0.9rem' }}>
                      请检查是否已在 Google Cloud 启用「Maps JavaScript API」、绑定结算账号，并在 API 密钥中允许本网站域名。
                    </p>
                  </div>
                ) : !isMapLoaded ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
                    color: '#4a5568'
                  }}>
                    <div style={{ 
                      fontSize: '2rem', 
                      marginBottom: '1rem',
                      animation: 'spin 1s linear infinite'
                    }}>🌍</div>
                    <h3 style={{ margin: '0' }}>地图加载中...</h3>
                  </div>
                ) : (
                  <ErrorBoundary>
                    <GoogleMap
                      key={selectedCity} // 强制重新渲染当城市改变时
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={mapCenter}
                      zoom={15}
                      onLoad={(map) => {
                        // 保存地图实例引用
                        mapRef.current = map;
                        
                        // 地图加载完成后的提示
                        console.log('地图加载完成，可以开始定位');
                        
                        // 初始化Places服务
                        if (window.google && window.google.maps) {
                          const autocomplete = new window.google.maps.places.AutocompleteService();
                          const places = new window.google.maps.places.PlacesService(map);
                          setAutocompleteService(autocomplete);
                          setPlacesService(places);
                        }
                        
                        // 添加地图点击事件监听（支持普通点击和POI点击）
                        map.addListener('click', async (e: any) => {
                          // 如果点击的是POI（店铺、地点等）
                          if (e.placeId) {
                            // 阻止默认行为（打开信息窗口）
                            e.stop();
                            
                            // 获取POI的详细信息
                            const service = new window.google.maps.places.PlacesService(map);
                            service.getDetails(
                              { placeId: e.placeId, fields: ['name', 'formatted_address', 'geometry', 'types'] },
                              (place: any, status: any) => {
                                if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                                  const lat = place.geometry.location.lat();
                                  const lng = place.geometry.location.lng();
                                  const address = place.formatted_address || place.name;
                                  
                                  // 设置地图点击位置
                                  setMapClickPosition({ lat, lng });
                                  setMapCenter({ lat, lng });
                                  
                                  // 自动填充到地址输入框
                                  const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
                                  if (addressInput) {
                                    addressInput.value = address;
                                    addressInput.style.borderColor = 'rgba(56, 161, 105, 0.6)';
                                    addressInput.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
                                  }
                                  
                                  // 更新选中位置
                                  setSelectedLocation({ lat, lng, address });
                                  
                                  // 设置选中的POI信息
                                  setSelectedPOI({ name: place.name, types: place.types || [] });
                                  
                                  // 显示选中POI的提示
                                  console.log('✅ 已选择POI:', place.name, '类型:', place.types);
                                } else {
                                  console.error('获取POI详情失败:', status);
                                }
                              }
                            );
                          } else if (e.latLng) {
                            // 如果点击的是普通地图位置（不是POI）
                            const lat = e.latLng.lat();
                            const lng = e.latLng.lng();
                            
                            // 设置地图点击位置
                            setMapClickPosition({ lat, lng });
                            
                            // 使用Google Maps Geocoding API获取真实地址
                            try {
                              const geocoder = new window.google.maps.Geocoder();
                              const response = await geocoder.geocode({ location: { lat, lng } });
                              
                              let fullAddress = '';
                              if (response.results && response.results[0]) {
                                fullAddress = response.results[0].formatted_address;
                              } else {
                                const currentCity =
                                  MYANMAR_CITIES[selectedCity] || MYANMAR_CITIES[DEFAULT_CITY_KEY];
                                fullAddress = `${currentCity.name}, 坐标: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                              }
                              
                              // 自动填充到地址输入框
                              const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
                              if (addressInput) {
                                addressInput.value = fullAddress;
                                addressInput.style.borderColor = 'rgba(56, 161, 105, 0.6)';
                                addressInput.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
                              }
                              
                              // 更新选中位置
                              setSelectedLocation({ lat, lng, address: fullAddress });
                              
                              console.log('✅ 已选择位置:', fullAddress);
                            } catch (error) {
                              console.error('地址获取失败:', error);
                              const currentCity =
                                MYANMAR_CITIES[selectedCity] || MYANMAR_CITIES[DEFAULT_CITY_KEY];
                              const fallbackAddress = `${currentCity.name}, 坐标: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                              
                              const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
                              if (addressInput) {
                                addressInput.value = fallbackAddress;
                                addressInput.style.borderColor = 'rgba(56, 161, 105, 0.6)';
                                addressInput.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
                              }
                              
                              setSelectedLocation({ lat, lng, address: fallbackAddress });
                            }
                          }
                        });
                      }}
                      onRightClick={async (e) => {
                        if (e.latLng) {
                          const lat = e.latLng.lat();
                          const lng = e.latLng.lng();
                          
                          // 设置地图点击位置
                          setMapClickPosition({ lat, lng });
                          
                          // 使用Google Maps Geocoding API获取真实地址
                          try {
                            const geocoder = new window.google.maps.Geocoder();
                            const response = await geocoder.geocode({ location: { lat, lng } });
                            
                            let fullAddress = '';
                            if (response.results && response.results[0]) {
                              fullAddress = response.results[0].formatted_address;
                            } else {
                              const currentCity =
                                MYANMAR_CITIES[selectedCity] || MYANMAR_CITIES[DEFAULT_CITY_KEY];
                              fullAddress = `${currentCity.name}, 坐标: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                            }
                      
                      // 自动填充到地址输入框
                            const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
                      if (addressInput) {
                        addressInput.value = fullAddress;
                        addressInput.style.borderColor = 'rgba(56, 161, 105, 0.6)';
                        addressInput.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
                      }
                      
                      // 更新选中位置
                      setSelectedLocation({ lat, lng, address: fullAddress });
                    } catch (error) {
                      console.error('地址获取失败:', error);
                            const currentCity =
                              MYANMAR_CITIES[selectedCity] || MYANMAR_CITIES[DEFAULT_CITY_KEY];
                            const fallbackAddress = `${currentCity.name}, 坐标: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                            
                            const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
                            if (addressInput) {
                              addressInput.value = fallbackAddress;
                              addressInput.style.borderColor = 'rgba(56, 161, 105, 0.6)';
                              addressInput.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
                            }
                            
                            setSelectedLocation({ lat, lng, address: fallbackAddress });
                          }
                        }
                      }}
                    >
                {(mapClickPosition || selectedLocation) && (
                        <Marker
                          position={mapClickPosition ? { lat: mapClickPosition.lat, lng: mapClickPosition.lng } : { lat: selectedLocation!.lat, lng: selectedLocation!.lng }}
                          title={selectedLocation?.address || "选择的位置"}
                          icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="12" fill="#ef4444" stroke="white" stroke-width="3"/>
                                <circle cx="20" cy="20" r="5" fill="white"/>
                                <circle cx="20" cy="20" r="2" fill="#ef4444"/>
                              </svg>
                            `),
                            scaledSize: new window.google.maps.Size(40, 40),
                            anchor: new window.google.maps.Point(20, 20)
                          }}
                          animation={window.google?.maps?.Animation?.DROP}
                          zIndex={1000}
                        />
                      )}
                    </GoogleMap>
                  </ErrorBoundary>
                )}
              
              {/* 自动定位按钮 */}
              <button
                onClick={async (e) => {
                  if (!navigator.geolocation) {
                    alert('您的浏览器不支持地理定位功能');
                    return;
                  }

                  // 显示加载状态
                  const button = e.currentTarget as HTMLButtonElement;
                  const originalContent = button.innerHTML;
                  button.innerHTML = '🔄';
                  button.style.opacity = '0.7';
                  button.disabled = true;

                    try {
                      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                      navigator.geolocation.getCurrentPosition(
                        resolve, 
                        reject, 
                        {
                          enableHighAccuracy: true,
                          timeout: 15000,
                          maximumAge: 300000 // 5分钟缓存
                        }
                      );
                      });
                      
                      const { latitude, longitude } = position.coords;
                      
                    // 使用Google Geocoding API进行逆地理编码
                    try {
                      const geocoder = new window.google.maps.Geocoder();
                      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
                        geocoder.geocode(
                          { location: { lat: latitude, lng: longitude } },
                          (results, status) => {
                            if (status === 'OK' && results) {
                              resolve(results);
                            } else {
                              reject(new Error(`Geocoding failed: ${status}`));
                            }
                          }
                        );
                      });

                      if (result && result.length > 0) {
                        const address = result[0].formatted_address;
                        
                        // 更新地图中心到当前位置
                        setMapCenter({ lat: latitude, lng: longitude });
                        setMapClickPosition({ lat: latitude, lng: longitude });
                        
                        // 填充地址到输入框
                        const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
                        if (addressInput) {
                          addressInput.value = address;
                          addressInput.style.borderColor = 'rgba(56, 161, 105, 0.6)';
                          addressInput.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
                        }
                        
                        // 更新选中位置
                        setSelectedLocation({ lat: latitude, lng: longitude, address });
                        
                        alert(`✅ 定位成功！\n\n地址：${address}\n\n坐标：${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                      } else {
                        throw new Error('无法获取地址信息');
                      }
                    } catch (geocodeError) {
                      console.error('逆地理编码失败:', geocodeError);
                      // 如果逆地理编码失败，至少显示坐标
                      const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
                      if (addressInput) {
                        addressInput.value = `纬度: ${latitude.toFixed(6)}, 经度: ${longitude.toFixed(6)}`;
                      }
                      setMapCenter({ lat: latitude, lng: longitude });
                      setMapClickPosition({ lat: latitude, lng: longitude });
                      alert(`📍 已获取位置坐标：\n纬度: ${latitude.toFixed(6)}\n经度: ${longitude.toFixed(6)}\n\n请手动输入详细地址`);
                    }
                    
                  } catch (error: unknown) {
                    // GeolocationPositionError 仅提供 code 数字：1=拒绝 2=不可用 3=超时（无 PERMISSION_DENIED 等实例属性）
                    const geo = error as GeolocationPositionError;
                    let errorMessage = '无法获取您的位置';
                    if (geo && typeof geo.code === 'number') {
                      switch (geo.code) {
                        case 1:
                          errorMessage =
                            '❌ 位置权限被拒绝\n\n请在 Safari「设置 › 网站 › 位置」或地址栏旁允许位置访问，然后重试';
                          break;
                        case 2:
                          errorMessage = '❌ 位置信息不可用\n\n请检查设备的定位/GPS 设置';
                          break;
                        case 3:
                          errorMessage = '❌ 定位超时\n\n请确保已开启位置服务，或稍后在信号较好处重试';
                          break;
                        default:
                          errorMessage = `❌ 定位失败: ${geo.message || '未知错误'}`;
                      }
                    }
                    if (process.env.NODE_ENV === 'development') {
                      console.warn('定位未成功:', geo);
                    }
                    alert(errorMessage);
                  } finally {
                    // 恢复按钮状态
                    button.innerHTML = originalContent;
                    button.style.opacity = '1';
                    button.disabled = false;
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '70px',
                  right: '10px',
                  background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(56, 161, 105, 0.3)',
                  transition: 'all 0.3s ease',
                  zIndex: 10
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(56, 161, 105, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(56, 161, 105, 0.3)';
                }}
                title={t.order.getMyLocation}
              >
                📍
              </button>
            </div>
            </div>

            {/* 地址输入框 */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                📍 点击地图、右键选择位置或点击店铺图标选择位置
              </div>
              <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="map-address-input"
                placeholder={t.order.mapPlaceholder}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    if (e.currentTarget.value.trim()) {
                      handleAddressInputChange(e.currentTarget.value);
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    // 延迟隐藏建议列表，以便点击建议项
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onChange={(e) => handleAddressInputChange(e.target.value)}
                />
                
                {/* 加载指示器 */}
                {isLoadingSuggestions && (
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    zIndex: 1001
                  }}>
                    🔍 {language === 'zh' ? '搜索中...' : language === 'en' ? 'Searching...' : 'ရှာဖွေနေသည်...'}
                  </div>
                )}

                {/* 自动完成建议列表 */}
                {showSuggestions && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}>
                    {isLoadingSuggestions ? (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '0.9rem'
                      }}>
                        🔍 {language === 'zh' ? '搜索中...' : language === 'en' ? 'Searching...' : 'ရှာဖွေနေသည်...'}
                      </div>
                    ) : autocompleteSuggestions.length > 0 ? (
                      autocompleteSuggestions.map((suggestion: any, index: number) => (
                        <div
                          key={`${suggestion.place_id}-${index}`}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          style={{
                            padding: '0.875rem 1rem',
                            cursor: 'pointer',
                            borderBottom: index < autocompleteSuggestions.length - 1 ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
                            color: '#1f2937',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '16px',
                            background: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            flexShrink: 0
                          }}>
                            📍
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '400', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                              {suggestion.main_text}
                            </div>
                            {suggestion.secondary_text && (
                              <div style={{ color: '#6b7280', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {suggestion.secondary_text}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '20px', color: '#9ca3af', marginLeft: '8px', flexShrink: 0 }}>
                            ›
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#9ca3af',
                        fontSize: '0.9rem'
                      }}>
                        {language === 'zh' ? '未找到相关位置' : language === 'en' ? 'No results found' : 'ရလဒ်မတွေ့ရှိပါ'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* 选中POI信息显示 */}
              {selectedPOI && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'rgba(56, 161, 105, 0.1)',
                  border: '1px solid rgba(56, 161, 105, 0.3)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ 
                    color: 'rgba(255, 255, 255, 0.9)', 
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem'
                  }}>
                    ✅ 已选择: {selectedPOI.name}
                  </div>
                  <div style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    fontSize: '0.8rem'
                  }}>
                    类型: {selectedPOI.types.slice(0, 3).join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* 按钮组 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => {
                  // 确认选择地址的逻辑
                  const addressInput = document.getElementById('map-address-input') as HTMLInputElement;
                  if (addressInput && addressInput.value.trim()) {
                    // 获取完整地址（包含用户补充的详细信息）
                    const completeAddress = addressInput.value.trim();
                    
                    // 优先使用 selectedLocation (POI点击) 的坐标，其次使用 mapClickPosition (右键点击)
                    const finalCoords = selectedLocation 
                      ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
                      : mapClickPosition;

                    if (finalCoords) {
                      // 将地址和坐标一起添加到输入框
                      const addressWithCoords = `${completeAddress}\n📍 坐标: ${finalCoords.lat.toFixed(6)}, ${finalCoords.lng.toFixed(6)}`;
                      
                      if (mapSelectionType === 'sender') {
                        setSenderAddressText(addressWithCoords);
                        setSelectedSenderLocation(finalCoords);
                        console.log('✅ 寄件地址坐标已保存:', finalCoords);
                      } else if (mapSelectionType === 'receiver') {
                        setReceiverAddressText(addressWithCoords);
                        setSelectedReceiverLocation(finalCoords);
                        console.log('✅ 收件地址坐标已保存:', finalCoords);
                      }
                      
                      // 更改地址后，重置计算状态
                      setIsCalculated(false);
                    } else {
                      // 如果没有坐标，只添加地址
                      if (mapSelectionType === 'sender') {
                        setSenderAddressText(completeAddress);
                      } else if (mapSelectionType === 'receiver') {
                        setReceiverAddressText(completeAddress);
                      }
                      console.warn('⚠️ 未能获取坐标信息');
                    }

                    alert(`✅ 地址已成功填入${mapSelectionType === 'sender' ? '寄件' : '收件'}地址字段！\n\n📍 ${completeAddress}`);

                    setMapClickPosition(null);
                    setSelectedLocation(null);
                    setSelectedPOI(null);
                    setShowMapModal(false);
                    setMapSelectionType(null);
                  } else {
                    alert('⚠️ 请先在地图上点击选择位置，或在地址框中输入地址信息');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {t.order.confirmSelection}
              </button>
              
              <button
                onClick={() => {
                  captureMapSelection();
                  setMapClickPosition(null);
                  setShowMapModal(false);
                  setMapSelectionType(null);
                }}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {t.ui.cancelPayment}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 时间选择器模态窗口 */}
      {showTimePickerModal && (
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
            background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
            padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
            borderRadius: '20px',
            width: window.innerWidth < 768 ? '90%' : '450px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(15px)'
          }}>
            {/* 头部 */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ 
                fontSize: '3.5rem', 
                marginBottom: '0.5rem',
                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
              }}>🕐</div>
              <h2 style={{ 
                color: 'white', 
                margin: 0, 
                fontSize: '1.5rem',
                fontWeight: 'bold',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
              }}>
                {t.ui.selectDeliveryTime}
              </h2>
              <p style={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                margin: '0.5rem 0 0 0',
                fontSize: '0.9rem'
              }}>
                选择您希望的配送时间
              </p>
            </div>

            {/* 🕒 时间选择器内容区域 */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '16px', marginBottom: '1.5rem' }}>
                <button 
                  type="button"
                  onClick={() => setTempSelectedDate('Today')}
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', fontWeight: '800', cursor: 'pointer', background: tempScheduledDate === 'Today' ? '#3b82f6' : 'transparent', color: 'white', transition: 'all 0.3s' }}
                >今日 {t.ui.today}</button>
                <button 
                  type="button"
                  onClick={() => setTempSelectedDate('Tomorrow')}
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', fontWeight: '800', cursor: 'pointer', background: tempScheduledDate === 'Tomorrow' ? '#3b82f6' : 'transparent', color: 'white', transition: 'all 0.3s' }}
                >明日 {t.ui.tomorrow}</button>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '8px', marginBottom: '1.5rem' }} className="custom-scrollbar">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {availableTimeSlots.length > 0 ? (
                    availableTimeSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTempSelectedTime(slot)}
                        style={{
                          padding: '12px 5px',
                          borderRadius: '12px',
                          border: '2px solid',
                          borderColor: tempScheduledTime === slot ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                          background: tempScheduledTime === slot ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                          color: tempScheduledTime === slot ? '#fff' : 'rgba(255,255,255,0.5)',
                          fontSize: '0.95rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {slot}
                      </button>
                    ))
                  ) : (
                    <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                      今日配送已截止，请选择明日
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 按钮组 */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                type="button"
                onClick={() => {
                  if (tempScheduledDate && tempScheduledTime) {
                    const dateStr = tempScheduledDate === 'Today' ? t.ui.today : t.ui.tomorrow;
                    setScheduledDeliveryTime(`${dateStr} ${tempScheduledTime}`);
                    setShowTimePickerModal(false);
                  } else {
                    alert('请选择时间');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1.1rem',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: '900',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  flex: 2,
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 25px rgba(59, 130, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.3)';
                }}
              >
                ✅ {t.ui.confirmTime}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowTimePickerModal(false);
                  if (!scheduledDeliveryTime) setSelectedDeliverySpeed('');
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '1.1rem',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: '800',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  flex: 1,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                ❌ {t.ui.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：使用教学模态窗口 */}
      {showTutorialModal && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTutorialModal(false);
          }}
        >
          <div style={{
            background: 'white',
            padding: window.innerWidth < 768 ? '2rem 1.5rem' : '2.5rem',
            borderRadius: '32px',
            width: window.innerWidth < 768 ? '100%' : '650px',
            maxWidth: '95vw',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            color: '#1e293b',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <button
              onClick={() => {
                setShowTutorialModal(false);
                setActiveTutorialStep(null);
              }}
              style={{
                position: 'absolute', top: '1.5rem', right: '1.5rem',
                background: '#f1f5f9', border: 'none',
                width: '40px', height: '40px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748b', zIndex: 10
              }}
            >✕</button>

            {activeTutorialStep === null ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📖</div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '850', margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>
                    {t.tutorial?.title || '如何使用'}
                  </h2>
                  <p style={{ color: '#64748b', marginTop: '0.5rem', fontWeight: '500' }}>点击下方步骤查看详细图解</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(tutorials.length > 0 ? tutorials : t.tutorial?.steps || []).map((step: any, index: number) => (
                    <div 
                      key={index} 
                      onClick={() => setActiveTutorialStep(index)}
                      style={{
                        display: 'flex',
                        gap: '1.25rem',
                        alignItems: 'center',
                        padding: '1.5rem',
                        background: '#f8fafc',
                        borderRadius: '24px',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(59, 130, 246, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        width: '40px', height: '40px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        borderRadius: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: '800', flexShrink: 0,
                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '750', margin: '0 0 4px 0', color: '#0f172a' }}>
                          {tutorials.length > 0 
                            ? (language === 'zh' ? step.title_zh : language === 'en' ? (step.title_en || step.title_zh) : (step.title_my || step.title_zh))
                            : step.title}
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                          {tutorials.length > 0 
                            ? (language === 'zh' ? step.content_zh : language === 'en' ? (step.content_en || step.content_zh) : (step.content_my || step.content_zh))
                            : step.content}
                        </p>
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: '1.2rem' }}>❯</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <button 
                  onClick={() => setActiveTutorialStep(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 16px', borderRadius: '12px',
                    background: '#f1f5f9', border: 'none',
                    color: '#64748b', fontWeight: '700',
                    cursor: 'pointer', marginBottom: '1.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                >
                  ← {language === 'zh' ? '返回列表' : language === 'en' ? 'Back' : 'နောက်သို့'}
                </button>

                {(() => {
                  const step = (tutorials.length > 0 ? tutorials : t.tutorial?.steps || [])[activeTutorialStep];
                  return (
                    <>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                          width: '32px', height: '32px',
                          background: '#3b82f6', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 'bold'
                        }}>
                          {activeTutorialStep + 1}
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                          {tutorials.length > 0 
                            ? (language === 'zh' ? step.title_zh : language === 'en' ? (step.title_en || step.title_zh) : (step.title_my || step.title_zh))
                            : step.title}
                        </h2>
                      </div>

                      <div style={{ 
                        background: '#f8fafc', padding: '1.5rem', 
                        borderRadius: '24px', border: '1px solid #e2e8f0',
                        marginBottom: '2rem'
                      }}>
                        <p style={{ fontSize: '1.05rem', color: '#334155', lineHeight: '1.6', margin: 0, fontWeight: '500' }}>
                          {tutorials.length > 0 
                            ? (language === 'zh' ? step.content_zh : language === 'en' ? (step.content_en || step.content_zh) : (step.content_my || step.content_zh))
                            : step.content}
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {step.image_urls && step.image_urls.length > 0 ? (
                          step.image_urls.map((url: string, imgIdx: number) => (
                            <div key={imgIdx} style={{ 
                              width: '100%', borderRadius: '20px', overflow: 'hidden',
                              border: '1px solid #e2e8f0', background: '#f1f5f9',
                              boxShadow: '0 15px 30px -10px rgba(0, 0, 0, 0.1)'
                            }}>
                              <img src={url} alt="step" style={{ width: '100%', display: 'block', objectFit: 'contain' }} />
                            </div>
                          ))
                        ) : step.image_url ? (
                          <div style={{ 
                            width: '100%', borderRadius: '20px', overflow: 'hidden',
                            border: '1px solid #e2e8f0', background: '#f1f5f9',
                            boxShadow: '0 15px 30px -10px rgba(0, 0, 0, 0.1)'
                          }}>
                            <img src={step.image_url} alt="step" style={{ width: '100%', display: 'block' }} />
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '3rem', color: '#cbd5e1', fontSize: '1.2rem' }}>暂无说明图片</div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {activeTutorialStep === null && (
              <button
                onClick={() => setShowTutorialModal(false)}
                style={{
                  width: '100%', marginTop: '2rem', padding: '1.25rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white', border: 'none', borderRadius: '18px',
                  fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer',
                  boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {language === 'zh' ? '我知道了' : language === 'en' ? 'Got it' : 'နားလည်ပါပြီ'}
              </button>
            )}
          </div>
        </div>
      )}

      {showRegisterModal && (
        <LoginRegisterModal
          language={language}
          isLoginMode={isLoginMode}
          setIsLoginMode={setIsLoginMode}
          registerMethod={registerMethod}
          setRegisterMethod={setRegisterMethod}
          registerForm={registerForm}
          setRegisterForm={setRegisterForm}
          setCodeSent={setCodeSent}
          countdown={countdown}
          setCountdown={setCountdown}
          onClose={() => setShowRegisterModal(false)}
          onSubmit={handleRegister}
          onSendVerificationCode={handleSendVerificationCode}
        />
      )}
    </div>
  );
};

// 添加旋转动画的CSS样式
const style = document.createElement('style');
style.innerHTML = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
if (!document.head.querySelector('style[data-spin-animation]')) {
  style.setAttribute('data-spin-animation', 'true');
  document.head.appendChild(style);
}

export default HomePage;
