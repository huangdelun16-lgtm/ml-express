import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { packageService, supabase, userService, testConnection, systemSettingsService, pendingOrderService } from '../services/supabase';
import QRCode from 'qrcode';

// Google Maps API 配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Google Maps API Key 未配置！请检查环境变量 REACT_APP_GOOGLE_MAPS_API_KEY');
}
const GOOGLE_MAPS_LIBRARIES: any = ['places'];

const MYANMAR_CITIES = {
  mandalay: { name: '曼德勒', nameEn: 'Mandalay', nameMm: 'မန္တလေး', lat: 21.9588, lng: 96.0891 },
  pyinoolwin: { name: '眉苗', nameEn: 'Pyin Oo Lwin', nameMm: 'ပင်းတလဲ', lat: 22.0333, lng: 96.4667 },
  yangon: { name: '仰光', nameEn: 'Yangon', nameMm: 'ရန်ကုန်', lat: 16.8661, lng: 96.1951 },
  naypyidaw: { name: '内比都', nameEn: 'Naypyidaw', nameMm: 'နေပြည်တော်', lat: 19.7633, lng: 96.0785 },
  taunggyi: { name: '东枝', nameEn: 'Taunggyi', nameMm: 'တောင်ကြီး', lat: 20.7892, lng: 97.0378 },
  lashio: { name: '腊戌', nameEn: 'Lashio', nameMm: 'လားရှိုး', lat: 22.9333, lng: 97.75 },
  muse: { name: '木姐', nameEn: 'Muse', nameMm: 'မူဆယ်', lat: 23.9833, lng: 97.9 }
} as const;

type CityKey = keyof typeof MYANMAR_CITIES;
const DEFAULT_CITY_KEY: CityKey = 'mandalay';
const DEFAULT_CITY_CENTER = {
  lat: MYANMAR_CITIES[DEFAULT_CITY_KEY].lat,
  lng: MYANMAR_CITIES[DEFAULT_CITY_KEY].lng
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getNearestCityKey = (lat: number, lng: number): CityKey => {
  let nearestKey: CityKey = DEFAULT_CITY_KEY;
  let minDistance = Number.MAX_VALUE;

  (Object.entries(MYANMAR_CITIES) as [CityKey, typeof MYANMAR_CITIES[CityKey]][]).forEach(([key, city]) => {
    const distance = Math.hypot(city.lat - lat, city.lng - lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestKey = key;
    }
  });

  return nearestKey;
};

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
  const navigate = useNavigate();
  
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
  
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ml-express-language') || 'zh';
  });
  const [isVisible, setIsVisible] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
  const [receiverAddressText, setReceiverAddressText] = useState('');
  const [codAmount, setCodAmount] = useState(''); // 代收款金额
  const [mapClickPosition, setMapClickPosition] = useState<{lat: number, lng: number} | null>(null);
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
  // 广告卡片轮播状态
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const bannerScrollRef = React.useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState<string>('');
  const [selectedDeliverySpeed, setSelectedDeliverySpeed] = useState<string>('');
  const [showWeightInput, setShowWeightInput] = useState<boolean>(false);
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [deliveryDistance, setDeliveryDistance] = useState<number>(0);
  const [paymentQRCode, setPaymentQRCode] = useState<string>('');
  const [isCalculated, setIsCalculated] = useState(false);
  const [calculatedPriceDetail, setCalculatedPriceDetail] = useState<number>(0);
  const [calculatedDistanceDetail, setCalculatedDistanceDetail] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cash'>('cash'); // 支付方式：二维码或现金（默认现金，二维码开发中）
  const [tempOrderId, setTempOrderId] = useState<string>(''); // 临时订单ID，用于从数据库获取订单信息
  // const [orderData, setOrderData] = useState<any>(null);
  
  // 用户认证相关状态
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false); // true=登录模式, false=注册模式
  const [loginType, setLoginType] = useState<'normal' | 'partner'>('normal'); // 登录类型：普通登录或合伙登录
  const [currentUser, setCurrentUser] = useState<any>(null);
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
  const [verificationType] = useState<'email' | 'sms'>('email'); // 固定使用邮箱验证
  
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
  }, []);

  // 当打开订单表单且用户已登录时，自动填充寄件人信息
  useEffect(() => {
    if (showOrderForm && currentUser) {
      // 自动填充寄件人信息
      setSenderName(currentUser.name || '');
      setSenderPhone(currentUser.phone || currentUser.email || '');
      setSenderAddressText(currentUser.address || '');
    } else if (!showOrderForm) {
      // 关闭表单时清空字段（可选，根据需求决定）
      // setSenderName('');
      // setSenderPhone('');
      // setSenderAddressText('');
    }
  }, [showOrderForm, currentUser]);

  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 广告卡片自动轮播逻辑
  useEffect(() => {
    if (isBannerPaused) return;

    const timer = setInterval(() => {
      if (bannerScrollRef.current) {
        const containerWidth = bannerScrollRef.current.offsetWidth;
        let nextIndex = currentBannerIndex + 1;
        if (nextIndex >= 5) {
          nextIndex = 0;
        }
        
        bannerScrollRef.current.scrollTo({
          left: nextIndex * containerWidth,
          behavior: 'smooth'
        });
        setCurrentBannerIndex(nextIndex);
      }
    }, 10000); // 10秒切换

    return () => clearInterval(timer);
  }, [currentBannerIndex, isBannerPaused]);

  // 监听滑动事件，更新当前索引
  useEffect(() => {
    const handleScroll = () => {
      if (bannerScrollRef.current) {
        const containerWidth = bannerScrollRef.current.offsetWidth;
        const scrollLeft = bannerScrollRef.current.scrollLeft;
        const newIndex = Math.round(scrollLeft / containerWidth);
        if (newIndex >= 0 && newIndex < 5 && newIndex !== currentBannerIndex) {
          setCurrentBannerIndex(newIndex);
        }
      }
    };

    const scrollElement = bannerScrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [currentBannerIndex]);

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

  // 加载价格配置（从系统设置中心获取计费规则）
  const loadPricingSettings = async () => {
    try {
      // 从系统设置中心获取计费规则
      const pricingSettings = await systemSettingsService.getPricingSettings();
      setPricingSettings({
        baseFee: pricingSettings.baseFee,
        perKmFee: pricingSettings.perKmFee,
        weightSurcharge: pricingSettings.weightSurcharge,
        urgentSurcharge: pricingSettings.urgentSurcharge,
        oversizeSurcharge: pricingSettings.oversizeSurcharge,
        scheduledSurcharge: pricingSettings.scheduledSurcharge,
        fragileSurcharge: pricingSettings.fragileSurcharge, // 易碎品附加费：每公里200MMK
        foodBeverageSurcharge: pricingSettings.foodBeverageSurcharge,
        freeKmThreshold: pricingSettings.freeKmThreshold
      });
      console.log('已从系统设置中心加载计费规则:', pricingSettings);
    } catch (error) {
      console.error('加载价格设置失败:', error);
      // 使用默认值
      setPricingSettings({
        baseFee: 1500,
        perKmFee: 500,
        weightSurcharge: 150,
        urgentSurcharge: 500,
        oversizeSurcharge: 300,
        scheduledSurcharge: 200,
        fragileSurcharge: 200, // 易碎品附加费：每公里200MMK
        foodBeverageSurcharge: 300,
        freeKmThreshold: 3
      });
    }
  };

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
    
    // 验证手机号
    // 注册模式下验证电话号码（登录模式不需要）
    let normalizedPhone = '';
    if (!isLoginMode) {
      if (!registerForm.phone) {
        alert(language === 'zh' ? '请填写电话号码' : language === 'en' ? 'Please fill in phone number' : 'ဖုန်းနံပါတ်ဖြည့်ပါ');
        return;
      }

      // 支持 9xxxxxxxx 或 09xxxxxxxx 两种格式
      const phoneRegex = /^0?9\d{7,9}$/;
      if (!phoneRegex.test(registerForm.phone)) {
        alert(language === 'zh' ? '请输入有效的缅甸手机号（9开头或09开头）' : 
              language === 'en' ? 'Please enter a valid Myanmar phone number (9xxxxxxxx or 09xxxxxxxx)' : 
              'မှန်ကန်သော မြန်မာဖုန်းနံပါတ်ထည့်ပါ (9 သို့မဟုတ် 09 ဖြင့်စတင်သည်)');
        return;
      }

      // 统一格式为 09xxxxxxxx
      normalizedPhone = registerForm.phone.startsWith('0') ? registerForm.phone : '0' + registerForm.phone;
    }

    // 验证密码
    if (!registerForm.password) {
      alert(language === 'zh' ? '请输入密码' : language === 'en' ? 'Please enter password' : 'စကားဝှက်ထည့်ပါ');
      return;
    }

    if (registerForm.password.length < 6) {
      alert(language === 'zh' ? '密码至少需要6位' : language === 'en' ? 'Password must be at least 6 characters' : 'စကားဝှက်သည် အနည်းဆုံး ၆ လုံးရှိရမည်');
      return;
    }

    try {
      // 检查用户是否已注册（根据验证方式检查）
      let existingUser;
      if (verificationType === 'email') {
        // 邮箱验证：根据邮箱查找用户
        const emailToSearch = registerForm.email.trim().toLowerCase();
        console.log('开始查询用户，邮箱:', emailToSearch);
        
        try {
          // 方法1: 先尝试精确匹配（不区分大小写，不限制类型）
          let { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('email', emailToSearch)
            .maybeSingle();
          
          console.log('方法1 - 精确匹配结果:', { 
            found: !!data, 
            error: error?.code, 
            message: error?.message,
            userType: data?.user_type 
          });
          
          // 方法2: 如果没找到，尝试查找所有匹配的邮箱（可能有多个）
          if (!data) {
            console.log('方法2 - 尝试查找所有匹配的邮箱...');
            const { data: allMatches, error: allError } = await supabase
              .from('users')
              .select('*')
              .ilike('email', emailToSearch)
              .limit(5);
            
            console.log('方法2 - 所有匹配结果:', { 
              count: allMatches?.length || 0, 
              error: allError?.code,
              users: allMatches?.map(u => ({ email: u.email, user_type: u.user_type, id: u.id }))
            });
            
            // 如果有多个匹配，优先选择客户类型
            if (allMatches && allMatches.length > 0) {
              const customerMatch = allMatches.find(u => u.user_type === 'customer');
              data = customerMatch || allMatches[0];
              console.log('从多个匹配中选择:', customerMatch ? '客户类型' : '第一个匹配');
            }
          }
          
          // 方法3: 如果还是没找到，尝试模糊匹配
          if (!data) {
            console.log('方法3 - 尝试模糊匹配...');
            const { data: fuzzyMatches, error: fuzzyError } = await supabase
              .from('users')
              .select('*')
              .like('email', `%${emailToSearch}%`)
              .limit(5);
            
            console.log('方法3 - 模糊匹配结果:', { 
              count: fuzzyMatches?.length || 0, 
              error: fuzzyError?.code,
              users: fuzzyMatches?.map(u => ({ email: u.email, user_type: u.user_type }))
            });
            
            if (fuzzyMatches && fuzzyMatches.length > 0) {
              const customerMatch = fuzzyMatches.find(u => u.user_type === 'customer');
              data = customerMatch || fuzzyMatches[0];
              console.log('从模糊匹配中选择:', customerMatch ? '客户类型' : '第一个匹配');
            }
          }
          
          if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned (正常情况)
            console.error('查询用户失败:', error);
          }
          
          existingUser = data;
          console.log('最终查询结果:', existingUser ? 
            `✅ 找到用户: ${existingUser.email} (类型: ${existingUser.user_type || '未设置'}, ID: ${existingUser.id})` : 
            '❌ 未找到用户');
        } catch (err) {
          console.error('查询用户异常:', err);
          existingUser = null;
        }
      } else {
        // 短信验证：根据手机号查找用户
        existingUser = await userService.getUserByPhone(normalizedPhone);
      }
      
      if (isLoginMode) {
        // ===== 登录模式 =====
        
        // 合伙登录
        if (loginType === 'partner') {
          // 验证店铺代码和密码
          if (!registerForm.email) {
            alert(language === 'zh' ? '请输入店铺代码' : language === 'en' ? 'Please enter store code' : 'ဆိုင်ကုဒ် ထည့်ပါ');
            return;
          }

          if (!registerForm.password) {
            alert(language === 'zh' ? '请输入密码' : language === 'en' ? 'Please enter password' : 'စကားဝှက်ထည့်ပါ');
            return;
          }

          // 查询合伙店铺
          const storeCode = registerForm.email.trim();
          const { data: store, error: storeError } = await supabase
            .from('delivery_stores')
            .select('*')
            .eq('store_code', storeCode)
            .maybeSingle();

          if (storeError) {
            console.error('查询合伙店铺失败:', storeError);
            alert(language === 'zh' ? '查询店铺失败，请稍后重试' : language === 'en' ? 'Failed to query store, please try again later' : 'ဆိုင်ကို ရှာဖွေရန် မအောင်မြင်ပါ');
            return;
          }

          if (!store) {
            alert(language === 'zh' ? '店铺代码不存在' : language === 'en' ? 'Store code does not exist' : 'ဆိုင်ကုဒ် မရှိပါ');
            return;
          }

          // 验证密码
          if (store.password !== registerForm.password) {
            alert(language === 'zh' ? '密码错误' : language === 'en' ? 'Incorrect password' : 'စကားဝှက်မှားနေပါသည်');
            return;
          }

          // 登录成功，创建用户对象（用于兼容现有系统）
          const partnerUser = {
            id: store.id,
            name: store.store_name,
            email: store.email || store.store_code,
            phone: store.phone,
            user_type: 'partner',
            address: store.address,
            store_code: store.store_code,
            store_id: store.id
          };

          setCurrentUser(partnerUser);
          localStorage.setItem('ml-express-customer', JSON.stringify(partnerUser));
          setShowRegisterModal(false);
          alert(language === 'zh' ? `登录成功！欢迎回来，${store.store_name}` : 
                language === 'en' ? `Login successful! Welcome back, ${store.store_name}` : 
                `ဝင်ရောက်ခြင်း အောင်မြင်ပါသည်! ${store.store_name}`);
          
          // 清空表单
          setRegisterForm({ name: '', phone: '', email: '', address: '', password: '', confirmPassword: '', verificationCode: '' });
          setCodeSent(false);
          setCountdown(0);
          setLoginType('normal'); // 重置登录类型
          return;
        }
        
        // 普通登录：验证邮箱和密码
        if (!registerForm.email) {
          alert(language === 'zh' ? '请输入邮箱' : language === 'en' ? 'Please enter email' : 'အီးမေးလ်ထည့်ပါ');
          return;
        }

        if (!registerForm.password) {
          alert(language === 'zh' ? '请输入密码' : language === 'en' ? 'Please enter password' : 'စကားဝှက်ထည့်ပါ');
          return;
        }

        if (!existingUser) {
          console.error('登录失败：未找到用户', {
            email: registerForm.email,
            emailTrimmed: registerForm.email.trim().toLowerCase(),
            verificationType,
            error: '用户不存在或查询失败'
          });
          
          // 尝试直接查询（不区分大小写，不限制类型）用于调试
          const debugResult = await supabase
            .from('users')
            .select('id, email, user_type, name')
            .ilike('email', `%${registerForm.email.trim()}%`)
            .limit(5);
          console.log('调试查询结果（相似邮箱）:', debugResult.data);
          
          alert(language === 'zh' ? '该邮箱未注册，请先注册' : language === 'en' ? 'Email not registered, please register first' : 'အီးမေးလ်မှတ်ပုံမတင်ရသေးပါ');
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
              `ဝင်ရောက်ခြင်း အောင်မြင်ပါသည်! ${existingUser.name}`);
        
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
        if (verificationType === 'email') {
          const { verifyEmailCode } = await import('../services/emailService');
          verifyResult = await verifyEmailCode(registerForm.email, registerForm.verificationCode, language as 'zh' | 'en' | 'my');
        } else {
          const { verifyVerificationCode } = await import('../services/smsService');
          verifyResult = await verifyVerificationCode(normalizedPhone, registerForm.verificationCode, language as 'zh' | 'en' | 'my');
        }
        
        if (!verifyResult.success) {
          alert(verifyResult.message);
          return;
        }

        // 检查邮箱是否已存在
        if (existingUser) {
          alert(language === 'zh' ? '该邮箱已注册，请直接登录' : 
                language === 'en' ? 'Email already registered, please login' : 
                'အီးမေးလ်မှတ်ပုံတင်ပြီးပါပြီ၊ ဝင်ပါ');
          setIsLoginMode(true);
          return;
        }

        // 创建新用户（使用邮箱）
        const newUser = await userService.createCustomer({
          ...registerForm,
          phone: registerForm.phone || '', // 手机号可选
          email: registerForm.email, // 邮箱必填
          password: registerForm.password // 添加密码字段
        });
        
        if (newUser) {
          setCurrentUser(newUser);
          localStorage.setItem('ml-express-customer', JSON.stringify(newUser));
          setShowRegisterModal(false);
          setShowOrderForm(true);
          alert(language === 'zh' ? '注册成功！欢迎使用缅甸同城快递' : 
                language === 'en' ? 'Registration successful! Welcome to Myanmar Express' : 
                'မှတ်ပုံတင်ခြင်း အောင်မြင်ပါသည်!');
          
          // 清空表单
          setRegisterForm({ name: '', phone: '', email: '', address: '', password: '', confirmPassword: '', verificationCode: '' });
          setCodeSent(false);
          setCountdown(0);
        } else {
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
            `${countdown} စက္ကန့် စောင့်ပါ`);
      return;
    }

    try {
      if (verificationType === 'email') {
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
        const result = await sendEmailVerificationCode(registerForm.email, language as 'zh' | 'en' | 'my');
        
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

        // 支持 9xxxxxxxx 或 09xxxxxxxx 两种格式
        const phoneRegex = /^0?9\d{7,9}$/;
        if (!phoneRegex.test(registerForm.phone)) {
          alert(language === 'zh' ? '请输入有效的缅甸手机号（9开头或09开头）' : 
                language === 'en' ? 'Please enter a valid Myanmar phone number (9xxxxxxxx or 09xxxxxxxx)' : 
                'မှန်ကန်သော မြန်မာဖုန်းနံပါတ်ထည့်ပါ (9 သို့မဟုတ် 09 ဖြင့်စတင်သည်)');
          return;
        }

        // 确保手机号以0开头（统一格式）
        const normalizedPhone = registerForm.phone.startsWith('0') ? registerForm.phone : '0' + registerForm.phone;
        console.log('📱 发送验证码到手机:', normalizedPhone);
        
        // 调用SMS服务
        const { sendVerificationCode } = await import('../services/smsService');
        const result = await sendVerificationCode(normalizedPhone, language as 'zh' | 'en' | 'my');
        
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
      console.error(t.errors.qrGenerationFailed, error);
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
      alert(t.errors.qrDownloaded);
    } catch (error) {
      console.error(t.errors.downloadFailed, error);
      alert(t.errors.downloadFailed);
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
          console.warn(t.errors.dbConnectionFailed);
        }
      } catch (error) {
        console.error(t.errors.connectionTestError, error);
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
      console.error(t.errors.saveCustomerFailed, error);
    }
  };

  const translations = {
    zh: {
      nav: {
        home: '首页',
        services: '服务',
        tracking: '包裹跟踪',
        contact: '联系我们',
      },
      hero: {
        title: '缅甸同城快递',
        subtitle: '快速、安全、可靠的同城快递服务',
        cta: '立即下单'
      },
      features: {
        title: '服务特色',
        fast: '快速配送',
        safe: '安全可靠',
        convenient: '便捷服务',
        affordable: '价格实惠'
      },
      process: {
        title: '使用流程',
        step1: '在线下单',
        step2: '上门取件',
        step3: '快速配送',
        step4: '签收确认'
      },
      tracking: {
        title: '包裹跟踪',
        placeholder: '请输入包裹单号',
        track: '查询',
        notFound: '未找到包裹信息'
      },
      order: {
        title: '创建订单',
        sender: '寄件人信息',
        receiver: '收件人信息',
        package: '速度',
        submit: '提交订单',
        cancel: '取消',
        selectOnMap: '在地图中选择',
        senderName: '寄件人姓名',
        senderPhone: '联系电话',
        senderAddress: '寄件地址',
        receiverName: '收件人姓名',
        receiverPhone: '联系电话',
        receiverAddress: '收件地址',
        packageType: '包裹类型',
        packageDescription: '包裹描述',
        packageWeight: '重量',
        mapTitle: '选择地址',
        mapTip: '💡 提示：点击地图标注位置，系统将自动填充地址。您可在此基础上补充门牌号等详细信息。',
        mapPlaceholder: '输入详细地址或在地图上点击选择位置',
        confirmSelection: '确认选择',
        getMyLocation: '获取我的位置'
      },
      footer: {
        company: 'MARKET LINK EXPRESS',
        address: '缅甸',
        phone: '(+95) 09788848928',
        email: 'marketlink982@gmail.com'
      },
      errors: {
        mapLoadFailed: '地图加载失败',
        mapConfigError: 'Google Maps API 配置问题',
        checkApiKey: '请检查 API Key 设置',
        qrGenerationFailed: '生成二维码失败',
        downloadFailed: '下载失败',
        dbConnectionFailed: '数据库连接失败，应用将在离线模式下运行',
        connectionTestError: '连接测试出错',
        saveCustomerFailed: '保存客户信息失败',
        orderInfoLost: '订单信息丢失，请重新下单',
        qrDownloaded: '二维码已下载到本地，并已发送给客户',
        addressRequired: '请填写完整的寄件和收件地址',
        packageInfoRequired: '请填写完整的包裹信息',
        orderProcessFailed: '订单处理失败',
        distanceCalculationFailed: '距离计算失败，使用默认值',
        orderEmailSendFailed: '订单确认邮件发送失败，请手动保存二维码。',
        orderEmailMissing: '未找到客户邮箱，请手动保存二维码。'
      },
      ui: {
        packageTracking: '包裹跟踪',
        lightningDelivery: '极速配送',
        secureReliable: '安全可靠',
        smartService: '智能服务',
        transparentPricing: '透明定价',
        prepaidDeliveryFee: '预付配送费',
        scanQrPay: '请扫描二维码支付',
        deliveryFee: '配送费',
        paymentQrCode: '支付二维码',
        confirmPayment: '支付完成',
        cancelPayment: '取消',
        packageType: '包裹类型',
        document: '文件',
        standardPackage: '标准件（45x60x15cm）和（5KG）以内',
        overweightPackage: '超重件（5KG）以上',
        oversizedPackage: '超规件（45x60x15cm）以上',
        fragile: '易碎品',
        foodDrinks: '食品和饮料',
        onTimeDelivery: '准时达（订单后1小时送达）',
        urgentDelivery: '急送达（订单后30分钟送达）',
        scheduledDelivery: '定时达（客户要求的时间送达）',
        selectDeliverySpeed: '请选择配送速度',
        packageInfoMismatch: '如实物和包裹信息内容不一致会导致报价失误',
        selectDeliveryTime: '选择送达时间',
        selectDate: '选择日期',
        selectTime: '选择时间',
        confirmTime: '确认时间',
        cancel: '取消',
        selectedTime: '已选时间',
        calculating: '正在计算价格...',
        deliveryDistance: '配送距离',
        totalAmount: '应付金额',
        paymentQRCode: '收款二维码',
        scanToPay: '扫码支付',
        paymentWarning: '⚠️ 请注意：付款之后不可退还 已确认下单再付款',
        cashPayment: '现金支付',
        cashPaymentDesc: '选择现金支付，骑手将在取件时代收费用',
        selectPaymentMethod: '选择支付方式',
        qrPayment: '二维码支付',
        underDevelopment: '开发中',
        priceBreakdown: '价格明细',
        basePrice: '基础费用',
        distanceFee: '距离费用',
        packageTypeFee: '包裹类型',
        weightFee: '重量费用',
        speedFee: '速度费用',
        orderEmailSending: '正在发送订单确认邮件，请稍候...',
        orderEmailSent: '订单确认邮件已发送，请查收邮箱。',
        orderEmailSentDev: '开发模式：系统未实际发送邮件，请手动保存二维码。',
        orderFollowup: '我们会在1小时内联系您取件。'
      }
      },
    en: {
      nav: {
        home: 'Home',
        services: 'Services',
        tracking: 'Tracking',
        contact: 'Contact',
      },
      hero: {
        title: 'Myanmar Same-Day Delivery',
        subtitle: 'Fast, Safe, and Reliable Same-Day Delivery Service',
        cta: 'Order Now'
      },
      features: {
        title: 'Service Features',
        fast: 'Fast Delivery',
        safe: 'Safe & Secure',
        convenient: 'Convenient',
        affordable: 'Affordable'
      },
      process: {
        title: 'How It Works',
        step1: 'Place Order',
        step2: 'Pickup',
        step3: 'Fast Delivery',
        step4: 'Confirmation'
      },
      tracking: {
        title: 'Package Tracking',
        placeholder: 'Enter tracking number',
        track: 'Track',
        notFound: 'Package not found'
      },
      order: {
        title: 'Create Order',
        sender: 'Sender Information',
        receiver: 'Receiver Information',
        package: 'Speed',
        submit: 'Submit Order',
        cancel: 'Cancel',
        selectOnMap: 'Select on Map',
        senderName: 'Sender Name',
        senderPhone: 'Contact Phone',
        senderAddress: 'Sender Address',
        receiverName: 'Receiver Name',
        receiverPhone: 'Contact Phone',
        receiverAddress: 'Receiver Address',
        packageType: 'Package Type',
        packageDescription: 'Package Description',
        packageWeight: 'Weight',
        mapTitle: 'Select Address',
        mapTip: '💡 Tip: Click on the map to mark location, the system will automatically fill in the address. You can add house numbers and other details.',
        mapPlaceholder: 'Enter detailed address or click on the map to select location',
        confirmSelection: 'Confirm Selection',
        getMyLocation: 'Get My Location'
      },
      footer: {
        company: 'MARKET LINK EXPRESS',
        address: 'Myanmar',
        phone: '(+95) 09788848928',
        email: 'marketlink982@gmail.com'
      },
      errors: {
        mapLoadFailed: 'Map Loading Failed',
        mapConfigError: 'Google Maps API Configuration Issue',
        checkApiKey: 'Please check API Key settings',
        qrGenerationFailed: 'QR Code Generation Failed',
        downloadFailed: 'Download Failed',
        dbConnectionFailed: 'Database connection failed, app will run in offline mode',
        connectionTestError: 'Connection test error',
        saveCustomerFailed: 'Failed to save customer information',
        orderInfoLost: 'Order information lost, please re-order',
        qrDownloaded: 'QR Code downloaded locally and sent to customer',
        addressRequired: 'Please fill in complete sender and receiver addresses',
        packageInfoRequired: 'Please fill in complete package information',
        orderProcessFailed: 'Order processing failed',
        distanceCalculationFailed: 'Distance calculation failed, using default value',
        orderEmailSendFailed: 'Failed to send the order confirmation email. Please download the QR code manually.',
        orderEmailMissing: 'Customer email not found. Please download the QR code manually.'
      },
      ui: {
        packageTracking: 'Package Tracking',
        lightningDelivery: 'Lightning Delivery',
        secureReliable: 'Secure & Reliable',
        smartService: 'Smart Service',
        transparentPricing: 'Transparent Pricing',
        prepaidDeliveryFee: 'Prepaid Delivery Fee',
        scanQrPay: 'Please scan QR code to pay',
        deliveryFee: 'Delivery Fee',
        paymentQrCode: 'Payment QR Code',
        confirmPayment: 'Payment Complete',
        cancelPayment: 'Cancel',
        packageType: 'Package Type',
        document: 'Document',
        standardPackage: 'Standard Package (45x60x15cm) & (5KG)',
        overweightPackage: 'Overweight Package (5KG+)',
        oversizedPackage: 'Oversized Package (45x60x15cm+)',
        fragile: 'Fragile',
        foodDrinks: 'Foods & Drinks',
        onTimeDelivery: 'On-Time Delivery (1 hour after order)',
        urgentDelivery: 'Urgent Delivery (30 minutes after order)',
        scheduledDelivery: 'Scheduled Delivery (Customer requested time)',
        selectDeliverySpeed: 'Please select delivery speed',
        packageInfoMismatch: 'If actual item and package information do not match, it may cause pricing errors',
        selectDeliveryTime: 'Select Delivery Time',
        selectDate: 'Select Date',
        selectTime: 'Select Time',
        confirmTime: 'Confirm Time',
        cancel: 'Cancel',
        selectedTime: 'Selected Time',
        calculating: 'Calculating price...',
        deliveryDistance: 'Delivery Distance',
        totalAmount: 'Total Amount',
        paymentQRCode: 'Payment QR Code',
        scanToPay: 'Scan to Pay',
        priceBreakdown: 'Price Breakdown',
        paymentWarning: '⚠️ Please note: Payment is non-refundable. Please confirm your order before payment.',
        cashPayment: 'Cash Payment',
        cashPaymentDesc: 'Select cash payment, courier will collect payment upon pickup',
        selectPaymentMethod: 'Select Payment Method',
        qrPayment: 'QR Code Payment',
        underDevelopment: 'Under Development',
        basePrice: 'Base Fee',
        distanceFee: 'Distance Fee',
        packageTypeFee: 'Package Type',
        weightFee: 'Weight Fee',
        speedFee: 'Speed Fee',
        orderEmailSending: 'Sending the order confirmation email, please wait...',
        orderEmailSent: 'Order confirmation email sent. Please check your inbox.',
        orderEmailSentDev: 'Development mode: email not actually sent. Please save the QR code manually.',
        orderFollowup: 'We will contact you within 1 hour to arrange pickup.'
      }
    },
    my: {
      nav: {
        home: 'ပင်မ',
        services: 'ဝန်ဆောင်မှု',
        tracking: 'ထုပ်ပိုးခြင်း',
        contact: 'ဆက်သွယ်ရန်',
      },
      hero: {
        title: 'မြန်မာမြို့တွင်းပို့ဆောင်ရေး',
        subtitle: 'မြန်ဆန်၊ လုံခြုံ၊ ယုံကြည်စိတ်ချရသော မြို့တွင်းပို့ဆောင်ရေး',
        cta: 'အခုပဲအမှာတင်ပါ'
      },
      features: {
        title: 'ဝန်ဆောင်မှုအထူးခြားမှု',
        fast: 'မြန်ဆန်သောပို့ဆောင်မှု',
        safe: 'လုံခြုံသော',
        convenient: 'အဆင်ပြေသော',
        affordable: 'စျေးနှုန်းသင့်တင့်သော'
      },
      process: {
        title: 'အသုံးပြုပုံ',
        step1: 'အွန်လိုင်းအမှာတင်ခြင်း',
        step2: 'အိမ်တွင်းလာယူခြင်း',
        step3: 'မြန်ဆန်သောပို့ဆောင်မှု',
        step4: 'လက်ခံအတည်ပြုခြင်း'
      },
      tracking: {
        title: 'ထုပ်ပိုးခြင်းစောင့်ကြည့်ခြင်း',
        placeholder: 'ထုပ်ပိုးနံပါတ်ထည့်ပါ',
        track: 'ရှာဖွေပါ',
        notFound: 'ထုပ်ပိုးအချက်အလက်မတွေ့ပါ'
      },
      order: {
        title: 'အမှာတင်ခြင်း',
        sender: 'ပို့သူအချက်အလက်',
        receiver: 'လက်ခံသူအချက်အလက်',
        package: 'မြန်နှုန်း',
        submit: 'အမှာတင်ပါ',
        cancel: 'ပယ်ဖျက်ပါ',
        selectOnMap: 'မြေပုံတွင်ရွေးချယ်ပါ',
        senderName: 'ပို့သူအမည်',
        senderPhone: 'ဆက်သွယ်ရေးဖုန်းနံပါတ်',
        senderAddress: 'ပို့သူလိပ်စာ',
        receiverName: 'လက်ခံသူအမည်',
        receiverPhone: 'ဆက်သွယ်ရေးဖုန်းနံပါတ်',
        receiverAddress: 'လက်ခံသူလိပ်စာ',
        packageType: 'ထုပ်ပိုးအမျိုးအစား',
        packageDescription: 'ထုပ်ပိုးဖော်ပြချက်',
        packageWeight: 'အလေးချိန်',
        mapTitle: 'ရွေးချယ်ပါ',
        mapTip: '💡 အကြံပြုချက်: မြေပုံပေါ်တွင် နေရာကို နှိပ်ပြီး လိပ်စာကို အလိုအလျောက် ဖြည့်စွက်ပါ။ သင်သည် အိမ်နံပါတ်နှင့် အသေးစိတ်အချက်အလက်များကို ထပ်မံ ဖြည့်စွက်နိုင်သည်။',
        mapPlaceholder: 'အသေးစိတ်လိပ်စာ ထည့်ပါ သို့မဟုတ် မြေပုံပေါ်တွင် နေရာကို ရွေးချယ်ပါ',
        confirmSelection: 'ရွေးချယ်မှုကို အတည်ပြုပါ',
        getMyLocation: 'ကျွန်ုပ်၏တည်နေရာကို ရယူပါ'
      },
      footer: {
        company: 'MARKET LINK EXPRESS',
        address: 'မန္တလေး၊ မြန်မာ',
        phone: '(+95) 09788848928',
        email: 'marketlink982@gmail.com'
      },
      errors: {
        mapLoadFailed: 'မြေပုံတင် မအောင်မြင်ပါ',
        mapConfigError: 'Google Maps API ပြင်ဆင်မှု ပြဿနာ',
        checkApiKey: 'API Key ပြင်ဆင်မှုကို စစ်ဆေးပါ',
        qrGenerationFailed: 'QR Code ဖန်တီးခြင်း မအောင်မြင်ပါ',
        downloadFailed: 'ဒေါင်းလုဒ် မအောင်မြင်ပါ',
        dbConnectionFailed: 'ဒေတာဘေ့စ် ချိတ်ဆက်မှု မအောင်မြင်ပါ၊ အက်ပ် အော့ဖ်လိုင်း မုဒ်တွင် လည်ပတ်မည်',
        connectionTestError: 'ချိတ်ဆက်မှု စမ်းသပ်ခြင်း မှားယွင်းပါ',
        saveCustomerFailed: 'ဖောက်သည်အချက်အလက် သိမ်းဆည်းခြင်း မအောင်မြင်ပါ',
        orderInfoLost: 'အမှာတင်အချက်အလက် ပျောက်ဆုံးပါ၊ ပြန်လည် အမှာတင်ပါ',
        qrDownloaded: 'QR Code ကို ဒေါင်းလုဒ်ပြီး ဖောက်သည်ထံ ပို့ပြီးပါပြီ',
        addressRequired: 'ပေးပို့သူနှင့် လက်ခံသူ လိပ်စာ အပြည့်အစုံ ဖြည့်ပါ',
        packageInfoRequired: 'ပစ္စည်းအချက်အလက် အပြည့်အစုံ ဖြည့်ပါ',
        orderProcessFailed: 'အမှာတင်ခြင်း မအောင်မြင်ပါ',
        distanceCalculationFailed: 'အကွာအဝေး တွက်ချက်ခြင်း မအောင်မြင်ပါ၊ ပုံသေတန်ဖိုး သုံးပါမည်',
        orderEmailSendFailed: 'အော်ဒါအတည်ပြုအီးမေးလ် ပို့နိုင်ခြင်း မရှိပါ။ QR ကုဒ်ကို ကိုယ်တိုင် သိမ်းဆည်းပါ။',
        orderEmailMissing: 'ဖောက်သည်အီးမေးလ်မရှိပါ။ QR ကုဒ်ကို ကိုယ်တိုင် သိမ်းဆည်းပါ။'
      },
      ui: {
        packageTracking: 'ထုပ်ပိုးခြင်း စောင့်ကြည့်ခြင်း',
        lightningDelivery: 'မြန်ဆန်သော ပို့ဆောင်မှု',
        secureReliable: 'လုံခြုံ ယုံကြည်စိတ်ချရသော',
        smartService: 'ဉာဏ်ရည်တု ဝန်ဆောင်မှု',
        transparentPricing: 'ပွင့်လင်းသော စျေးနှုန်းသတ်မှတ်ခြင်း',
        prepaidDeliveryFee: 'ကြိုတင်ပေးချေသော ပို့ဆောင်ခြင်း ကုန်ကျစရိတ်',
        scanQrPay: 'QR Code ကို စကင်န်ဖတ်ပြီး ပေးချေပါ',
        deliveryFee: 'ပို့ဆောင်ခြင်း ကုန်ကျစရိတ်',
        paymentQrCode: 'ပေးချေမှု QR Code',
        confirmPayment: 'ပေးချေမှုကို အတည်ပြုပါ',
        cancelPayment: 'ပေးချေမှုကို ပယ်ဖျက်ပါ',
        packageType: 'ထုပ်ပိုးအမျိုးအစား',
        document: 'စာရွက်စာတမ်း',
        standardPackage: 'စံထုပ်ပိုး (45x60x15cm) နှင့် (5KG) အတွင်း',
        overweightPackage: 'အလေးချိန်များသော ထုပ်ပိုး (5KG) အထက်',
        oversizedPackage: 'အရွယ်အစားကြီးသော ထုပ်ပိုး (45x60x15cm) အထက်',
        fragile: 'ပျက်စီးလွယ်သော',
        foodDrinks: 'အစားအသောက်များ',
        onTimeDelivery: 'အချိန်မှန်ပို့ဆောင်မှု（အမှာတင်ပြီး ၁ နာရီအတွင်း）',
        urgentDelivery: 'အလျင်အမြန်ပို့ဆောင်မှု（အမှာတင်ပြီး ၃၀ မိနစ်အတွင်း）',
        scheduledDelivery: 'အချိန်သတ်မှတ်ပို့ဆောင်မှု（ဖောက်သည်တောင်းဆိုသောအချိန်）',
        selectDeliverySpeed: 'ပို့ဆောင်မှုမြန်နှုန်းကို ရွေးချယ်ပါ',
        packageInfoMismatch: 'အမှန်တကယ်ပစ္စည်းနှင့် ထုပ်ပိုးအချက်အလက် မကိုက်ညီပါက စျေးနှုန်းသတ်မှတ်ခြင်း မှားယွင်းနိုင်ပါသည်',
        selectDeliveryTime: 'ပို့ဆောင်ချိန်ကို ရွေးချယ်ပါ',
        selectDate: 'ရက်စွဲရွေးပါ',
        selectTime: 'အချိန်ရွေးပါ',
        confirmTime: 'အချိန်အတည်ပြုပါ',
        cancel: 'ပယ်ဖျက်',
        selectedTime: 'ရွေးချယ်ထားသောအချိန်',
        calculating: 'စျေးနှုန်းတွက်ချက်နေသည်...',
        deliveryDistance: 'ပို့ဆောင်အကွာအဝေး',
        totalAmount: 'စုစုပေါင်းပမာဏ',
        paymentQRCode: 'ငွေပေးချေမှု QR ကုဒ်',
        scanToPay: 'စကင်န်ဖတ်၍ ငွေပေးပါ',
        paymentWarning: '⚠️ မှတ်ချက် - ငွေပေးပြီးရင် ပြန်အမ်းမရပါ ။ မှာယူမှတ်တမ်းအား အတည်ပြုပြီးမှ ငွေပေးရန်',
        cashPayment: 'ငွေသားပေးချေမှု',
        cashPaymentDesc: 'ငွေသားပေးချေမှုကို ရွေးချယ်ပါ၊ ကူရီယာသည် ပစ္စည်းယူသောအခါ ငွေကောက်ခံမည်',
        selectPaymentMethod: 'ပေးချေမှုနည်းလမ်းရွေးချယ်ရန်',
        qrPayment: 'QR ကုဒ်ပေးချေမှု',
        underDevelopment: 'ဖွံ့ဖြိုးဆဲ',
        priceBreakdown: 'စျေးနှုန်းအသေးစိတ်',
        basePrice: 'အခြေခံအခကြေး',
        distanceFee: 'အကွာအဝေးအခ',
        packageTypeFee: 'ပစ္စည်းအမျိုးအစား',
        weightFee: 'အလေးချိန်အခ',
        speedFee: 'မြန်နှုန်းအခ',
        orderEmailSending: 'အော်ဒါအတည်ပြုအီးမေးလ် ပို့နေပါသည်၊ ခဏစောင့်ပါ...',
        orderEmailSent: 'အော်ဒါအတည်ပြုအီးမေးလ်ပို့ပြီးပါပြီ။ အီးမေးလ်ကို စစ်ဆေးပါ။',
        orderEmailSentDev: 'ဖွံ့ဖြိုးတိုးတက်မှု မုဒ် - အီးမေးလ်ကို မပို့ရသေးပါ။ QR ကုဒ်ကို ကိုယ်တိုင် သိမ်းဆည်းပါ။',
        orderFollowup: '၁ နာရီအတွင်း ကူရီယာမှ ပစ္စည်းယူဖို့ ဆက်သွယ်ပါမည်။'
      }
    }
  };

  const t = translations[language as keyof typeof translations];

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
    
    // 根据寄件地址自动识别城市前缀（以曼德勒为中心）
    const cityPrefixMap: { [key: string]: string } = {
      // 曼德勒（总部）
      '曼德勒': 'MDY',
      'Mandalay': 'MDY',
      'မန္တလေး': 'MDY',
      // 眉苗
      '眉苗': 'POL',
      'Pyin Oo Lwin': 'POL',
      '彬乌伦': 'POL',
      'ပင်းတလဲ': 'POL',
      // 仰光（开发中）
      '仰光': 'YGN',
      'Yangon': 'YGN',
      'ရန်ကုန်': 'YGN',
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
      'မူဆယ်': 'MSE'
    };
    
    // 判断城市前缀
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
        alert(`${t.errors.distanceCalculationFailed}\n使用默认距离: 5 km`);
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
                const roundedDistance = Math.round(distanceInKm * 10) / 10;
                console.log('✅ 距离计算成功:', roundedDistance, 'km');
                resolve(roundedDistance);
              } else if (element?.status === 'ZERO_RESULTS') {
                console.warn('⚠️ 无法找到路线，使用默认距离');
                alert('无法计算两地之间的距离，可能地址不够详细\n使用默认距离: 5 km');
                resolve(5);
              } else {
                console.warn('⚠️ 距离计算状态异常:', element?.status);
                resolve(5);
              }
            } else if (status === 'OVER_QUERY_LIMIT') {
              console.error('❌ Google Maps API 查询限额已达上限');
              alert('系统繁忙，使用默认距离: 5 km');
              resolve(5);
            } else if (status === 'REQUEST_DENIED') {
              console.error('❌ Google Maps API 请求被拒绝，可能是 API Key 问题');
              alert('地图服务配置错误，使用默认距离: 5 km');
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
      alert(`${t.errors.distanceCalculationFailed}\n${errorMsg}\n使用默认距离: 5 km`);
      return 5;
    }
  };

  // 计算配送价格（使用系统设置中的价格）
  const calculatePrice = (packageType: string, weight: string, deliverySpeed: string, distance: number): number => {
    // 1. 基础起步价
    let totalPrice = pricingSettings.baseFee;
    
    // 2. 距离费用（超过免费公里数后按每公里费用计算）
    if (distance > pricingSettings.freeKmThreshold) {
      const chargeableDistance = distance - pricingSettings.freeKmThreshold;
      totalPrice += chargeableDistance * pricingSettings.perKmFee;
    }
    
    // 3. 重量附加费（假设阈值为5kg）
    const weightNum = parseFloat(weight) || 1;
    const weightThreshold = 5;
    if (weightNum > weightThreshold) {
      totalPrice += (weightNum - weightThreshold) * pricingSettings.weightSurcharge;
    }
    
    // 4. 包裹类型附加费
    if (packageType === t.ui.oversizedPackage || packageType === '超规件') {
      // 超规件：按距离计算附加费
      totalPrice += distance * pricingSettings.oversizeSurcharge;
    } else if (packageType === t.ui.fragile || packageType === '易碎品') {
      // 易碎品：按距离计算附加费（MMK/公里）
      totalPrice += distance * pricingSettings.fragileSurcharge;
    } else if (packageType === t.ui.foodDrinks || packageType === '食品和饮料') {
      // 食品和饮料：按距离计算附加费
      totalPrice += distance * pricingSettings.foodBeverageSurcharge;
    }
    
    // 5. 配送速度附加费
    if (deliverySpeed === t.ui.urgentDelivery || deliverySpeed === '急送达') {
      // 急送达：固定附加费
      totalPrice += pricingSettings.urgentSurcharge;
    } else if (deliverySpeed === t.ui.scheduledDelivery || deliverySpeed === '定时达') {
      // 定时达：固定附加费
      totalPrice += pricingSettings.scheduledSurcharge;
    }
    
    // 返回向上取整到百位的价格
    return Math.ceil(totalPrice / 100) * 100;
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

  // 预估费用计算函数（类似客户端App）
  const calculatePriceEstimate = async () => {
    try {
      // 获取表单数据
      const form = document.querySelector('form') as HTMLFormElement;
      if (!form) return;
      
      const formData = new FormData(form);
      const orderInfo = {
        senderName: formData.get('senderName') as string,
        senderPhone: formData.get('senderPhone') as string,
        senderAddress: formData.get('senderAddress') as string,
        receiverName: formData.get('receiverName') as string,
        receiverPhone: formData.get('receiverPhone') as string,
        receiverAddress: formData.get('receiverAddress') as string,
        packageType: formData.get('packageType') as string,
        weight: formData.get('weight') as string,
        deliverySpeed: formData.get('deliverySpeed') as string,
        description: formData.get('description') as string
      };

      // 检查必填字段
      if (!orderInfo.senderAddress || !orderInfo.receiverAddress) {
        alert(language === 'zh' ? '请先填写寄件和收件地址' : 
              language === 'en' ? 'Please fill in sender and receiver addresses first' : 
              'ပို့ဆောင်သူနှင့် လက်ခံသူ လိပ်စာများကို ဦးစွာ ဖြည့်စွက်ပါ');
        return;
      }

      // 计算距离
      const distance = await calculateDistance(
        orderInfo.senderAddress,
        orderInfo.receiverAddress
      );
      
      // 按照要求：6.1km = 7km（向上取整）
      const roundedDistance = Math.ceil(distance);
      setCalculatedDistanceDetail(roundedDistance);

      // 计算价格
      const price = calculatePrice(
        orderInfo.packageType,
        orderInfo.weight,
        orderInfo.deliverySpeed,
        roundedDistance
      );
      
      setCalculatedPriceDetail(price);
      setIsCalculated(true);
      
      // 显示计算结果
      alert(language === 'zh' ? 
        `计算完成！\n配送距离: ${roundedDistance}km\n总费用: ${price} MMK` :
        language === 'en' ? 
        `Calculation Complete!\nDelivery Distance: ${roundedDistance}km\nTotal Cost: ${price} MMK` :
        `တွက်ချက်မှု ပြီးမြောက်ပါပြီ!\nပို့ဆောင်အကွာအဝေး: ${roundedDistance}km\nစုစုပေါင်းကုန်ကျစရိတ်: ${price} MMK`
      );
      
    } catch (error) {
      console.error('计算费用失败:', error);
      alert(language === 'zh' ? '计算失败，请重试' : 
            language === 'en' ? 'Calculation failed, please try again' : 
            'တွက်ချက်မှု မအောင်မြင်ပါ၊ ပြန်လည်ကြိုးစားပါ');
    }
  };

  // 生成收款二维码（已暂停，开发中）
  // const generatePaymentQRCode = async (amount: number, orderId: string) => {
  //   try {
  //     // 生成支付信息（可以根据实际支付方式调整）
  //     const paymentInfo = {
  //       amount: amount,
  //       currency: 'MMK',
  //       orderId: orderId,
  //       merchant: 'ML Express',
  //       description: '快递费用'
  //     };
  //     
  //     const paymentString = JSON.stringify(paymentInfo);
  //     const qrDataUrl = await QRCode.toDataURL(paymentString, {
  //       width: 300,
  //       margin: 2,
  //       color: {
  //         dark: '#2c5282',
  //         light: '#ffffff'
  //       }
  //     });
  //     
  //     setPaymentQRCode(qrDataUrl);
  //   } catch (error) {
  //     console.error('生成收款二维码失败:', error);
  //   }
  // };

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
    };
    
    // 验证必填字段
    if (!orderInfo.senderAddress || !orderInfo.receiverAddress) {
      alert(t.errors.addressRequired || '请填写完整的寄件和收件地址');
      return;
    }

    // 如果是 Partner 账号，强制使用店铺信息（地址和经纬度）
    if (currentUser?.user_type === 'partner') {
      try {
        console.log('正在查找合伙人店铺信息...', currentUser);
        // 尝试通过多种方式匹配店铺（优先匹配 store_code，即 name）
        const { data: store, error } = await supabase
          .from('delivery_stores')
          .select('*')
          .or(`store_code.eq.${currentUser.name},manager_phone.eq.${currentUser.phone},phone.eq.${currentUser.phone},store_name.eq.${currentUser.name}`)
          .limit(1)
          .maybeSingle();

        if (store) {
          console.log('找到合伙人店铺，强制使用店铺坐标:', store.store_name);
          // 覆盖 orderInfo 中的寄件经纬度
          orderInfo.senderLatitude = store.latitude;
          orderInfo.senderLongitude = store.longitude;
          // 可选：覆盖地址文本，确保一致性
          // orderInfo.senderAddress = store.address; 
          
          // 更新状态，确保后续逻辑（如距离计算）使用新坐标
          setSelectedSenderLocation({ lat: store.latitude, lng: store.longitude });
        } else {
          console.warn('未找到关联的合伙店铺');
        }
      } catch (err) {
        console.error('查找合伙人店铺异常:', err);
      }
    }
    
    // 根据包裹类型决定是否需要重量
    const needWeight = orderInfo.packageType === '超重件' || orderInfo.packageType === '超规件';
    if (!orderInfo.packageType || (needWeight && !orderInfo.weight) || !orderInfo.deliverySpeed) {
      alert('请填写完整的包裹信息');
      return;
    }
    
    // 关闭订单表单并重置确认状态
    setShowOrderForm(false);
    setOrderConfirmationStatus('idle');
    setOrderConfirmationMessage('');
    
    try {
      console.log('开始处理订单...');
      
      // 1. 等待Google Maps API加载
      let retryCount = 0;
      while (!isMapLoaded && retryCount < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retryCount++;
      }
      
      // 2. 计算距离
      console.log('计算配送距离...');
      const distance = await calculateDistance(
        orderInfo.senderAddress,
        orderInfo.receiverAddress
      );
      console.log('距离:', distance, 'km');
      setDeliveryDistance(distance);
      
      // 3. 计算价格
      console.log('计算配送价格...');
      const price = isCalculated ? calculatedPriceDetail : calculatePrice(
        orderInfo.packageType,
        orderInfo.weight,
        orderInfo.deliverySpeed,
        distance
      );
      console.log('价格:', price, 'MMK');
      setCalculatedPrice(price);
      
      // 4. 生成临时订单ID（根据寄件地址自动识别城市）
      const tempOrderId = generateMyanmarPackageId(orderInfo.senderAddress);
      console.log('订单ID:', tempOrderId);
      
      // 5. 生成收款二维码（仅当选择二维码支付时）- 已暂停，开发中
      // console.log('生成收款二维码...');
      // if (paymentMethod === 'qr') {
      //   await generatePaymentQRCode(price, tempOrderId);
      // }
      
      // 6. 存储订单信息到Supabase数据库（替代localStorage）
      console.log('保存临时订单到数据库...');
      const pendingOrderData = {
        temp_order_id: tempOrderId,
        sender_name: orderInfo.senderName,
        sender_phone: orderInfo.senderPhone,
        sender_address: orderInfo.senderAddress,
        sender_latitude: orderInfo.senderLatitude || null,
        sender_longitude: orderInfo.senderLongitude || null,
        receiver_name: orderInfo.receiverName,
        receiver_phone: orderInfo.receiverPhone,
        receiver_address: orderInfo.receiverAddress,
        receiver_latitude: orderInfo.receiverLatitude || null,
        receiver_longitude: orderInfo.receiverLongitude || null,
        package_type: orderInfo.packageType,
        weight: orderInfo.weight || '1',
        delivery_speed: orderInfo.deliverySpeed || null,
        scheduled_delivery_time: orderInfo.scheduledTime || null,
        price: price,
        distance: distance,
        payment_method: paymentMethod,
        cod_amount: orderInfo.codAmount, // 添加代收款金额
        customer_email: currentUser?.email || null,
        customer_name: currentUser?.name || orderInfo.senderName || null
      };
      
      const savedPendingOrder = await pendingOrderService.createPendingOrder(pendingOrderData);
      if (!savedPendingOrder) {
        console.warn('保存临时订单到数据库失败，回退到localStorage');
        // 如果数据库保存失败，回退到localStorage
        const orderWithPrice = {
          ...orderInfo,
          price: price,
          distance: distance,
          tempOrderId: tempOrderId,
          codAmount: orderInfo.codAmount, // 添加代收款金额
          customerEmail: currentUser?.email || '',
          customerName: currentUser?.name || orderInfo.senderName,
          paymentMethod: paymentMethod
        };
        localStorage.setItem('pendingOrder', JSON.stringify(orderWithPrice));
        setTempOrderId(tempOrderId); // 保存到状态中
      } else {
        console.log('临时订单已保存到数据库:', savedPendingOrder.temp_order_id);
        // 保存tempOrderId到状态中，用于后续获取订单信息
        setTempOrderId(savedPendingOrder.temp_order_id);
        // 清除localStorage中的旧数据（如果存在）
        localStorage.removeItem('pendingOrder');
      }
      
      // 7. 读取或设置支付方式
      const savedPaymentMethod = savedPendingOrder?.payment_method || paymentMethod || 'cash';
      setPaymentMethod(savedPaymentMethod);
      
      // 8. 显示支付模态框
      console.log('显示支付页面');
    setShowPaymentModal(true);
    } catch (error) {
      console.error('订单处理失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`订单处理失败: ${errorMessage}\n\n请检查：\n1. 地址是否填写完整\n2. 网络连接是否正常\n3. 稍后重试`);
      setShowOrderForm(true);
    }
  };

  // LOGO组件
  const Logo = ({
    size = 'medium',
    paddingRight = '0px'
  }: {
    size?: 'small' | 'medium' | 'large';
    paddingRight?: string;
  }) => {
    const logoSize = size === 'small' ? '80px' : size === 'large' ? '160px' : '120px';
    
    return (
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          cursor: 'pointer',
          transition: 'opacity 0.3s ease',
          paddingRight
        }}
        onClick={() => window.location.href = '/'}
        onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
      >
        {/* LOGO图片 */}
        <img 
          src="/logo.png" 
          alt="ML Express Logo"
          style={{
          width: logoSize,
          height: logoSize,
            objectFit: 'contain'
          }}
        />
        
        {/* 公司名称 - 双色标题 + 副标题 */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{
            color: 'white',
            fontSize: size === 'small' ? '1.6rem' : size === 'large' ? '4rem' : '2.2rem',
            fontWeight: '900',
            textShadow: '0 4px 8px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.2)',
            background: 'linear-gradient(135deg, #ffffff 0%, #e6f2ff 50%, #b3d9ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '1px',
            whiteSpace: 'nowrap',
            fontFamily: "'Montserrat', 'Roboto', sans-serif",
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>
            MARKET LINK <span style={{ 
              fontSize: '1em', 
              fontStyle: 'italic', 
              fontWeight: '900',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginLeft: '4px'
            }}>EXPRESS</span>
          </span>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            fontStyle: 'italic',
            fontSize: size === 'small' ? '0.5rem' : size === 'large' ? '0.9rem' : '0.7rem',
            fontWeight: '600',
            letterSpacing: size === 'small' ? '2px' : '4px',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.9)',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            fontFamily: "'Roboto', sans-serif",
            marginTop: '4px',
            marginLeft: size === 'small' ? '0' : size === 'large' ? '0' : '0'
          }}>
            <span style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-end',
              marginRight: '6px',
              gap: '2px',
              justifyContent: 'center'
            }}>
              <span style={{ 
                width: size === 'small' ? '16px' : size === 'large' ? '40px' : '24px',
                height: '1.5px',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'block'
              }}></span>
              <span style={{ 
                width: size === 'small' ? '24px' : size === 'large' ? '60px' : '36px',
                height: '1.5px',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'block'
              }}></span>
              <span style={{ 
                width: size === 'small' ? '32px' : size === 'large' ? '80px' : '48px',
                height: '1.5px',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'block'
              }}></span>
            </span>
            DELIVERY SERVICES
            <span style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              marginLeft: '6px',
              gap: '2px',
              justifyContent: 'center'
            }}>
              <span style={{ 
                width: size === 'small' ? '16px' : size === 'large' ? '40px' : '24px',
                height: '1.5px',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'block'
              }}></span>
              <span style={{ 
                width: size === 'small' ? '24px' : size === 'large' ? '60px' : '36px',
                height: '1.5px',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'block'
              }}></span>
              <span style={{ 
                width: size === 'small' ? '32px' : size === 'large' ? '80px' : '48px',
                height: '1.5px',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'block'
              }}></span>
            </span>
          </span>
        </div>
      </div>
    );
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
        language: language === 'zh' ? 'zh-CN' : language === 'en' ? 'en' : 'my'
      },
      (predictions: any[], status: any) => {
        // 确保这是最新的查询结果
        if (lastSearchQueryRef.current === input.trim()) {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            // 显示更多结果（最多10个），像Google Maps一样
            const suggestions = predictions.slice(0, 10).map((prediction) => ({
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
      
      {/* 顶部导航栏 */}
      <nav style={{
        position: 'relative',
        zIndex: 10,
        background: 'transparent',
        color: 'white',
        padding: 0,
        marginBottom: window.innerWidth < 768 ? '24px' : '40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'none',
        gap: window.innerWidth < 768 ? 'var(--spacing-3)' : 'var(--spacing-4)',
        flexWrap: window.innerWidth < 1024 ? 'wrap' : 'nowrap',
        rowGap: 'var(--spacing-3)'
      }}>
        <Logo size="small" />
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: window.innerWidth < 768 ? '1rem' : '1.5rem',
          flexWrap: window.innerWidth < 1024 ? 'wrap' : 'nowrap',
          justifyContent: window.innerWidth < 1024 ? 'flex-start' : 'flex-end',
          rowGap: '0.5rem',
          width: window.innerWidth < 1024 ? '100%' : 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: window.innerWidth < 768 ? '1rem' : '1.5rem',
            flexWrap: window.innerWidth < 640 ? 'wrap' : 'nowrap',
            rowGap: '0.4rem'
          }}>
            <a href="#home" style={{ 
              color: 'white', 
              textDecoration: 'none',
              fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)',
              textAlign: 'center',
              padding: 'var(--spacing-2) var(--spacing-3)',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--transition-fast)',
              lineHeight: 'var(--line-height-normal)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            >{t.nav.home}</a>
            <button onClick={() => handleNavigation('/services')} style={{ 
              color: 'white', 
              textDecoration: 'none',
              fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)',
              textAlign: 'center',
              padding: 'var(--spacing-2) var(--spacing-3)',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--transition-fast)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              lineHeight: 'var(--line-height-normal)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            >{t.nav.services}</button>
            <button onClick={() => handleNavigation('/tracking')} style={{ 
              color: 'white', 
              textDecoration: 'none',
              fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)',
              textAlign: 'center',
              padding: 'var(--spacing-2) var(--spacing-3)',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--transition-fast)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              lineHeight: 'var(--line-height-normal)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            >{t.nav.tracking}</button>
            <button onClick={() => handleNavigation('/contact')} style={{ 
              color: 'white', 
              textDecoration: 'none',
              fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)',
              textAlign: 'center',
              padding: 'var(--spacing-2) var(--spacing-3)',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--transition-fast)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              lineHeight: 'var(--line-height-normal)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            >{t.nav.contact}</button>
            {/* 客户端页面不包含管理员登录入口 */}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            justifyContent: window.innerWidth < 1024 ? 'flex-start' : 'flex-end',
            rowGap: '0.5rem'
          }}>
            {/* 注册/登录按钮（放在语言选择器左侧） */}
            {currentUser ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(72, 187, 120, 0.2)',
              border: '2px solid rgba(72, 187, 120, 0.5)',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              backdropFilter: 'blur(10px)'
            }}>
              <button
                onClick={() => navigate('/profile')}
                style={{
                  background: 'rgba(59, 130, 246, 0.3)',
                  color: 'white',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
                }}
              >
                {language === 'zh' ? '我的账户' : language === 'en' ? 'My Account' : 'ကျွန်ုပ်၏အကောင့်'}
              </button>
              <span style={{ 
                color: 'white',
                fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem',
                fontWeight: 'bold'
              }}>
                {language === 'zh' ? `欢迎，${currentUser.name}` : 
                 language === 'en' ? `Welcome, ${currentUser.name}` : 
                 `ကြိုဆိုပါတယ်, ${currentUser.name}`}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                {language === 'zh' ? '退出' : language === 'en' ? 'Logout' : 'ထွက်'}
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              {/* 注册按钮 */}
              <button
                onClick={() => {
                  setIsLoginMode(false);
                  setShowRegisterModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(72, 187, 120, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(72, 187, 120, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(72, 187, 120, 0.3)';
                }}
              >
                {language === 'zh' ? '注册' : language === 'en' ? 'Register' : 'အကောင့်ဖွင့်ရန်'}
              </button>
              
              {/* 登录按钮 */}
              <button
                onClick={() => {
                  setIsLoginMode(true);
                  setShowRegisterModal(true);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem',
                  fontWeight: 'bold',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                {language === 'zh' ? '登录' : language === 'en' ? 'Login' : 'ဝင်ရန်'}
              </button>
            </div>
          )}
          
            {/* 语言选择器（放在用户卡片右侧） */}
            <div style={{ position: 'relative' }} data-language-dropdown>
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.35rem 0.6rem',
              borderRadius: '5px',
              fontWeight: '600',
              fontSize: window.innerWidth < 768 ? '0.75rem' : '0.85rem',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                minWidth: '90px',
                justifyContent: 'space-between'
              }}
            >
              <span>{language === 'zh' ? '中文' : language === 'en' ? 'English' : 'မြန်မာ'}</span>
              <span style={{ fontSize: '0.7rem' }}>▼</span>
            </button>
            
            {showLanguageDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '5px',
                marginTop: '2px',
                zIndex: 1000,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                {[
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' },
                  { value: 'my', label: 'မြန်မာ' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      console.log('Language changed to:', option.value);
                      handleLanguageChange(option.value);
                      setShowLanguageDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      background: language === option.value ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.5rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: window.innerWidth < 768 ? '0.75rem' : '0.85rem',
                      transition: 'all 0.2s ease',
                      fontWeight: language === option.value ? '600' : '400'
                    }}
                    onMouseOver={(e) => {
                      if (language !== option.value) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (language !== option.value) {
                        e.currentTarget.style.background = 'transparent';
                      } else {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </nav>

      {/* 3D 风格广告横幅 (自动轮播) */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        marginBottom: '40px',
        padding: '0 16px',
        maxWidth: '1200px',
        margin: '0 auto 40px auto',
        width: '100%'
      }}>
        <div
          ref={bannerScrollRef}
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            width: '100%',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            position: 'relative',
            cursor: 'grab',
            WebkitOverflowScrolling: 'touch' as any,
          }}
          onMouseDown={(e) => {
            const element = e.currentTarget;
            element.style.cursor = 'grabbing';
          }}
          onMouseUp={(e) => {
            const element = e.currentTarget;
            element.style.cursor = 'grab';
          }}
          onMouseLeave={(e) => {
            const element = e.currentTarget;
            element.style.cursor = 'grab';
          }}
        >
          {/* 第一张卡片：地图追踪 */}
          <div
            style={{
              minWidth: '100%',
              scrollSnapAlign: 'start',
              height: '280px',
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onMouseDown={() => setIsBannerPaused(true)}
            onMouseUp={() => setIsBannerPaused(false)}
            onMouseLeave={() => setIsBannerPaused(false)}
            onClick={() => window.open('https://www.market-link-express.com', '_blank')}
          >
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 60%, #ffffff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '60px',
                background: 'rgba(0,0,0,0.1)',
                clipPath: 'polygon(0 100%, 0 60%, 20% 50%, 40% 60%, 60% 50%, 80% 60%, 100% 50%, 100% 100%)'
              }}></div>
              
              <div style={{ flex: 1, zIndex: 2 }}>
                <img 
                  src="/logo.png" 
                  alt="Logo"
                  style={{
                    width: '40px',
                    height: '40px',
                    marginBottom: '8px'
                  }}
                />
                <h2 style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: '0 0 8px 0',
                  lineHeight: '1.3',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>曼德勒同城快递<br/>极速送达</h2>
                <p style={{
                  fontSize: '20px',
                  color: '#4b5563',
                  margin: '0 0 12px 0',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>5分钟接单 · 实时定位</p>
                <p style={{
                  fontSize: '16px',
                  color: 'rgba(30, 41, 59, 0.85)',
                  margin: '0 0 16px 0',
                  lineHeight: '20px',
                  fontStyle: 'italic',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>မန္တလေးမြို့တွင်း မြန်ဆန်စွာပို့ဆောင်ပေးခြင်း</p>
              </div>
              
              <div style={{
                flex: '0.8',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
                position: 'relative'
              }}>
                <div style={{
                  width: '100px',
                  height: '210px',
                  backgroundColor: '#1f2937',
                  borderRadius: '14px',
                  border: '2px solid #374151',
                  transform: 'perspective(800px) rotateY(-15deg) rotateX(10deg) rotateZ(-5deg)',
                  boxShadow: '10px 10px 20px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    width: 'calc(100% - 6px)',
                    height: 'calc(100% - 6px)',
                    backgroundColor: '#f3f4f6',
                    margin: '3px',
                    borderRadius: '8px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '40px',
                      left: '20px',
                      width: '40px',
                      height: '60px',
                      borderLeft: '2px dashed #3b82f6',
                      borderBottom: '2px dashed #3b82f6',
                      borderRadius: '10px'
                    }}></div>
                    <div style={{ position: 'absolute', top: '35px', left: '15px', fontSize: '10px' }}>🏠</div>
                    <div style={{ position: 'absolute', top: '80px', left: '40px', fontSize: '12px', backgroundColor: '#ffffff', borderRadius: '10px', padding: '2px' }}>🛵</div>
                    <div style={{ position: 'absolute', bottom: '40px', right: '20px', fontSize: '10px' }}>📍</div>
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '5px',
                      right: '5px',
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      borderRadius: '6px',
                      padding: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#333' }}>正在配送中...</div>
                      <div style={{ fontSize: '7px', color: '#666' }}>预计 15 分钟送达</div>
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                      pointerEvents: 'none'
                    }}></div>
                  </div>
                </div>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  fontSize: '24px',
                  zIndex: 10
                }}>📦</div>
              </div>
            </div>
          </div>

          {/* 第二张卡片：地址填写 */}
          <div
            style={{
              minWidth: '100%',
              scrollSnapAlign: 'start',
              height: '280px',
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onMouseDown={() => setIsBannerPaused(true)}
            onMouseUp={() => setIsBannerPaused(false)}
            onMouseLeave={() => setIsBannerPaused(false)}
          >
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #f3f4f6 0%, #ffffff 50%, #e5e7eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '80px',
                background: 'rgba(0,0,0,0.05)',
                clipPath: 'polygon(0 100%, 0 60%, 20% 50%, 40% 60%, 60% 50%, 80% 60%, 100% 50%, 100% 100%)'
              }}></div>
              
              <div style={{ flex: 1, zIndex: 2 }}>
                <h2 style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  margin: '4px 0 8px 0',
                  lineHeight: '1.3',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>一键填写地址<br/>极速上门取件</h2>
                <p style={{
                  fontSize: '20px',
                  color: '#4b5563',
                  margin: '0 0 12px 0',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>实时定位 · 全城服务 · 30分钟送达</p>
                <p style={{
                  fontSize: '16px',
                  color: '#6b7280',
                  margin: '0 0 16px 0',
                  lineHeight: '20px',
                  fontStyle: 'italic',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>မှန်ကန်သောလိပ်စာ ထည့်သွင်းလိုက်ရုံဖြင့် အမြန်ဆုံးလာရောက်ယူဆောင်ပေးခြင်း</p>
              </div>
              
              <div style={{
                flex: '0.8',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
                position: 'relative'
              }}>
                <div style={{
                  width: '100px',
                  height: '210px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '14px',
                  border: '2px solid #e5e7eb',
                  transform: 'perspective(800px) rotateY(-15deg) rotateX(10deg) rotateZ(-5deg)',
                  boxShadow: '10px 10px 20px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    width: 'calc(100% - 6px)',
                    height: 'calc(100% - 6px)',
                    backgroundColor: '#ffffff',
                    margin: '3px',
                    borderRadius: '8px',
                    padding: '8px',
                    position: 'relative'
                  }}>
                    <div style={{
                      height: '20px',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      marginBottom: '6px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '4px',
                      fontSize: '6px',
                      color: '#9ca3af'
                    }}>📍 取件地址</div>
                    <div style={{
                      height: '20px',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      marginBottom: '6px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '4px',
                      fontSize: '6px',
                      color: '#9ca3af'
                    }}>🏠 送达地址</div>
                    <div style={{
                      height: '30px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '4px',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8px',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>确认下单</div>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, transparent 50%, rgba(255,255,255,0.2) 100%)',
                      pointerEvents: 'none'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 第三张卡片：上线促销 */}
          <div
            style={{
              minWidth: '100%',
              scrollSnapAlign: 'start',
              height: '280px',
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onMouseDown={() => setIsBannerPaused(true)}
            onMouseUp={() => setIsBannerPaused(false)}
            onMouseLeave={() => setIsBannerPaused(false)}
          >
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #e2e8f0 0%, #f8fafc 50%, #ffffff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ flex: 1, zIndex: 2 }}>
                <div style={{
                  backgroundColor: '#1e293b',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginBottom: '10px'
                }}>
                  <span style={{
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    WebkitFontSmoothing: 'antialiased' as any,
                    MozOsxFontSmoothing: 'grayscale' as any,
                    WebkitTextSizeAdjust: '100%' as any,
                    display: 'inline-block',
                    visibility: 'visible',
                    opacity: 1
                  }}>NEW LAUNCH</span>
                </div>
                
                <div style={{ margin: '10px 0' }}>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#2563eb',
                    marginBottom: '6px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    WebkitFontSmoothing: 'antialiased' as any,
                    MozOsxFontSmoothing: 'grayscale' as any,
                    WebkitTextSizeAdjust: '100%' as any,
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1
                  }}>MDY同城2000MMK/一趟</div>
                  <div style={{
                    fontSize: '16px',
                    color: '#64748b',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    WebkitFontSmoothing: 'antialiased' as any,
                    MozOsxFontSmoothing: 'grayscale' as any,
                    WebkitTextSizeAdjust: '100%' as any,
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1
                  }}>曼德勒市内统一价 · 活动仅1个月</div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div style={{
                    fontSize: '16px',
                    color: '#475569',
                    marginBottom: '4px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    WebkitFontSmoothing: 'antialiased' as any,
                    MozOsxFontSmoothing: 'grayscale' as any,
                    WebkitTextSizeAdjust: '100%' as any,
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1
                  }}>📅 2026年1月1日正式启动</div>
                  <div style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    WebkitFontSmoothing: 'antialiased' as any,
                    MozOsxFontSmoothing: 'grayscale' as any,
                    WebkitTextSizeAdjust: '100%' as any,
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1
                  }}>Software စမ်းသပ်အသုံးပြုကာလအတွင်း MDY မြို့တွင်း 2000MMK/တစ်ကြိမ်</div>
                </div>
              </div>
              
              <div style={{
                flex: '0.8',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
                position: 'relative'
              }}>
                <div style={{
                  width: '100px',
                  height: '210px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '14px',
                  border: '2px solid #cbd5e1',
                  transform: 'perspective(800px) rotateY(-15deg) rotateX(10deg) rotateZ(-5deg)',
                  boxShadow: '10px 10px 20px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    width: 'calc(100% - 6px)',
                    height: 'calc(100% - 6px)',
                    backgroundColor: '#ffffff',
                    margin: '3px',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '20px',
                      backgroundColor: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '10px',
                      fontSize: '20px'
                    }}>🚀</div>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                      textAlign: 'center'
                    }}>GRAND OPENING</div>
                    <div style={{
                      fontSize: '8px',
                      color: '#64748b',
                      textAlign: 'center',
                      marginTop: '2px'
                    }}>Jan 1, 2026</div>
                    <div style={{
                      width: '100%',
                      height: '1px',
                      backgroundColor: '#e2e8f0',
                      margin: '8px 0'
                    }}></div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '12px' }}>💰</span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#2563eb'
                      }}>2000 Ks</span>
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.8) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                      pointerEvents: 'none'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 第四张卡片：新用户注册推广 */}
          <div
            style={{
              minWidth: '100%',
              scrollSnapAlign: 'start',
              height: '280px',
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onMouseDown={() => setIsBannerPaused(true)}
            onMouseUp={() => setIsBannerPaused(false)}
            onMouseLeave={() => setIsBannerPaused(false)}
          >
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* 背景装饰线条 */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.05,
                pointerEvents: 'none'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  width: '100px',
                  height: '1px',
                  backgroundColor: '#2563eb',
                  transform: 'rotate(45deg)'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '30px',
                  right: '30px',
                  width: '80px',
                  height: '1px',
                  backgroundColor: '#f59e0b',
                  transform: 'rotate(-45deg)'
                }}></div>
              </div>

              <div style={{ flex: 1, zIndex: 2 }}>
                {/* 主标题 */}
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: '0 0 12px 0',
                  lineHeight: '1.3',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>新用户现在即可开始下单！</h2>

                {/* 副文本 */}
                <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ fontSize: '18px', lineHeight: '20px', flexShrink: 0 }}>🌐</span>
                    <p style={{
                      fontSize: '14px',
                      color: '#475569',
                      margin: 0,
                      lineHeight: '20px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      WebkitFontSmoothing: 'antialiased' as any,
                      MozOsxFontSmoothing: 'grayscale' as any,
                      WebkitTextSizeAdjust: '100%' as any,
                      display: 'block',
                      visibility: 'visible',
                      opacity: 1,
                      flex: 1
                    }}>Web 上注册账号即可直接下单，无需下载软件</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ fontSize: '18px', lineHeight: '20px', flexShrink: 0 }}>📱</span>
                    <p style={{
                      fontSize: '14px',
                      color: '#475569',
                      margin: 0,
                      lineHeight: '20px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      WebkitFontSmoothing: 'antialiased' as any,
                      MozOsxFontSmoothing: 'grayscale' as any,
                      WebkitTextSizeAdjust: '100%' as any,
                      display: 'block',
                      visibility: 'visible',
                      opacity: 1,
                      flex: 1
                    }}>想要更方便？下载 App 解锁更快捷的下单方式、更流畅的操作体验、更精准的定位追踪</p>
                  </div>
                </div>

                {/* 缅文说明 - 与中文对齐 */}
                <div style={{ 
                  marginTop: '8px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px',
                  paddingLeft: '24px' // 与中文文本对齐（图标18px + gap 6px = 24px）
                }}>
                  <p style={{
                    fontSize: '13px',
                    color: '#64748b',
                    margin: 0,
                    lineHeight: '18px',
                    fontStyle: 'italic',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    WebkitFontSmoothing: 'antialiased' as any,
                    MozOsxFontSmoothing: 'grayscale' as any,
                    WebkitTextSizeAdjust: '100%' as any,
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1
                  }}>Webပေါ်မှတ်ပုံတင်ပြီး လျင်မြန်စွာ Orderတင်နိုင်သည်</p>
                  <p style={{
                    fontSize: '13px',
                    color: '#64748b',
                    margin: 0,
                    lineHeight: '18px',
                    fontStyle: 'italic',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    WebkitFontSmoothing: 'antialiased' as any,
                    MozOsxFontSmoothing: 'grayscale' as any,
                    WebkitTextSizeAdjust: '100%' as any,
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1
                  }}>AppကိုDownload အသုံးပြုခြင်းဖြင့် ပိုမိုလုံခြုံလျင်မြန်သော အတွေအကြုံကိုရယူလိုက်ပါ</p>
                </div>
              </div>

              <div style={{
                flex: '0.8',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
                position: 'relative'
              }}>
                {/* 功能图标展示 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: '12px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  maxWidth: '200px'
                }}>
                  {/* Web浏览器图标 */}
                  <div style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#eff6ff',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                  }}>🌐</div>
                  {/* 手机图标 */}
                  <div style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
                  }}>📱</div>
                  {/* 配送箱图标 */}
                  <div style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                  }}>📦</div>
                  {/* 位置追踪图标 */}
                  <div style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#fef2f2',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                  }}>📍</div>
                </div>
              </div>
            </div>
          </div>

          {/* 第五张卡片：缅甸风格定位广告 */}
          <div
            style={{
              minWidth: '100%',
              scrollSnapAlign: 'start',
              height: '280px',
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onMouseDown={() => setIsBannerPaused(true)}
            onMouseUp={() => setIsBannerPaused(false)}
            onMouseLeave={() => setIsBannerPaused(false)}
          >
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 40%, #ffffff 80%, #fef3c7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* 背景装饰 - 柔和光影 */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-30px',
                width: '150px',
                height: '150px',
                borderRadius: '75px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                opacity: 0.6
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-40px',
                left: '-20px',
                width: '120px',
                height: '120px',
                borderRadius: '60px',
                backgroundColor: 'rgba(254, 243, 199, 0.3)',
                opacity: 0.5
              }}></div>

              <div style={{ flex: 1, zIndex: 2 }}>
                {/* 定位图标 - 大号带发光效果 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '30px',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
                    fontSize: '32px'
                  }}>📍</div>
                </div>

                {/* 缅文大标题 */}
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: '0 0 8px 0',
                  lineHeight: '1.4',
                  textAlign: 'center',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>
                  ဘယ်နေရာပဲရောက်ရောက်<br/>
                  အချိန်ကုန်သက်သာဖို့ 📍ပွိုင့်ထောက်ပြီး<br/>
                  Market Link နဲ့ ပစ္စည်းပို့လိုက်စို့！
                </h2>

                {/* 中文副标题 */}
                <p style={{
                  fontSize: '12px',
                  color: '#475569',
                  margin: '0 0 16px 0',
                  lineHeight: '1.5',
                  textAlign: 'center',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  WebkitFontSmoothing: 'antialiased' as any,
                  MozOsxFontSmoothing: 'grayscale' as any,
                  WebkitTextSizeAdjust: '100%' as any,
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}>
                  无论你在城市的哪个位置，只要开启定位，就能节省时间，更快送达。
                </p>

              </div>

              <div style={{
                flex: '0.8',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
                position: 'relative'
              }}>
                {/* 右侧插画区域 - 骑手和路线 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  {/* 骑手插画 */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '40px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                    marginBottom: '8px'
                  }}>🛵</div>
                  
                  {/* 路线节点 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '4px'
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#3b82f6' }}></div>
                    <div style={{ width: '20px', height: '2px', backgroundColor: '#60a5fa' }}></div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#fbbf24' }}></div>
                    <div style={{ width: '20px', height: '2px', backgroundColor: '#60a5fa' }}></div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#10b981' }}></div>
                  </div>

                  {/* 微笑图标 */}
                  <div style={{
                    marginTop: '8px',
                    fontSize: '24px'
                  }}>😊</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 圆点指示器 - 位于卡片下方中间 */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '12px',
            marginBottom: '8px',
            gap: '6px',
            width: '100%',
            paddingTop: '12px'
          }}>
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                style={{
                  width: currentBannerIndex === index ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: currentBannerIndex === index ? '#3b82f6' : '#cbd5e1',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (bannerScrollRef.current) {
                    const containerWidth = bannerScrollRef.current.offsetWidth;
                    bannerScrollRef.current.scrollTo({
                      left: index * containerWidth,
                      behavior: 'smooth'
                    });
                    setCurrentBannerIndex(index);
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>

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
            {[`⚡ ${t.ui.lightningDelivery}`, `🛡️ ${t.ui.secureReliable}`, `📱 ${t.ui.smartService}`, `💎 ${t.ui.transparentPricing}`].map((tag, index) => (
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
      {showOrderForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
            backdropFilter: 'blur(15px)',
            padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
            borderRadius: '15px',
            maxWidth: '420px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Logo size="medium" />
            </div>
            <h2 style={{ color: 'white', marginBottom: '2rem', textAlign: 'center' }}>
              {t.order.title}
            </h2>
            
            <form onSubmit={handleOrderSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>{t.order.sender}</h3>
                <input
                  type="text"
                  name="senderName"
                  placeholder={t.order.senderName}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    border: '2px solid var(--color-border-dark)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-2)',
                    fontSize: 'var(--font-size-base)',
                    lineHeight: 'var(--line-height-normal)',
                    textAlign: 'left',
                    transition: 'all var(--transition-base)',
                    fontFamily: 'var(--font-family-base)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <input
                  type="tel"
                  name="senderPhone"
                  placeholder={t.order.senderPhone}
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    border: '2px solid var(--color-border-dark)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-2)',
                    fontSize: 'var(--font-size-base)',
                    lineHeight: 'var(--line-height-normal)',
                    textAlign: 'left',
                    transition: 'all var(--transition-base)',
                    fontFamily: 'var(--font-family-base)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <div style={{ position: 'relative' }}>
                  <textarea
                    name="senderAddress"
                    placeholder={t.order.senderAddress}
                    required
                    value={senderAddressText}
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-3) var(--spacing-4)',
                      border: '2px solid var(--color-border-dark)',
                      borderRadius: 'var(--radius-md)',
                      height: '80px',
                      resize: 'vertical',
                      fontSize: 'var(--font-size-base)',
                      lineHeight: 'var(--line-height-normal)',
                      textAlign: 'left',
                      transition: 'all var(--transition-base)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(5px)',
                      fontFamily: 'var(--font-family-base)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 如果用户手动编辑地址，移除坐标信息
                      const lines = value.split('\n');
                      const addressLines = lines.filter(line => !line.includes('📍 坐标:'));
                      setSenderAddressText(addressLines.join('\n'));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenMapModal('sender')}
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(44, 82, 130, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(44, 82, 130, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(44, 82, 130, 0.3)';
                    }}
                  >
                    📍 {t.order.selectOnMap}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>{t.order.receiver}</h3>
                <input
                  type="text"
                  name="receiverName"
                  placeholder={t.order.receiverName}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    border: '2px solid var(--color-border-dark)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-2)',
                    fontSize: 'var(--font-size-base)',
                    lineHeight: 'var(--line-height-normal)',
                    textAlign: 'left',
                    transition: 'all var(--transition-base)',
                    fontFamily: 'var(--font-family-base)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <input
                  type="tel"
                  name="receiverPhone"
                  placeholder={t.order.receiverPhone}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    border: '2px solid var(--color-border-dark)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-2)',
                    fontSize: 'var(--font-size-base)',
                    lineHeight: 'var(--line-height-normal)',
                    textAlign: 'left',
                    transition: 'all var(--transition-base)',
                    fontFamily: 'var(--font-family-base)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <div style={{ position: 'relative' }}>
                  <textarea
                    name="receiverAddress"
                    placeholder={t.order.receiverAddress}
                    required
                    value={receiverAddressText}
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-3) var(--spacing-4)',
                      border: '2px solid var(--color-border-dark)',
                      borderRadius: 'var(--radius-md)',
                      height: '80px',
                      resize: 'vertical',
                      fontSize: 'var(--font-size-base)',
                      lineHeight: 'var(--line-height-normal)',
                      textAlign: 'left',
                      transition: 'all var(--transition-base)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(5px)',
                      fontFamily: 'var(--font-family-base)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 如果用户手动编辑地址，移除坐标信息
                      const lines = value.split('\n');
                      const addressLines = lines.filter(line => !line.includes('📍 坐标:'));
                      setReceiverAddressText(addressLines.join('\n'));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenMapModal('receiver')}
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(44, 82, 130, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(44, 82, 130, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(44, 82, 130, 0.3)';
                    }}
                  >
                    📍 {t.order.selectOnMap}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                {/* 包裹类型部分 */}
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>包裹类型</h3>
                <select
                  name="packageType"
                  required
                  onChange={(e) => {
                    const value = e.target.value;
                    // 根据包裹类型决定是否显示重量输入框
                    const showWeight = value === t.ui.overweightPackage || value === t.ui.oversizedPackage;
                    setShowWeightInput(showWeight);
                  }}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    border: '2px solid var(--color-border-dark)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-2)',
                    fontSize: 'var(--font-size-base)',
                    lineHeight: 'var(--line-height-normal)',
                    textAlign: 'left',
                    transition: 'all var(--transition-base)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(5px)',
                    fontFamily: 'var(--font-family-base)',
                    cursor: 'pointer',
                    appearance: 'none',
                    color: 'var(--color-text-primary)',
                    fontWeight: 'var(--font-weight-medium)',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right var(--spacing-3) center',
                    backgroundSize: '1em',
                    paddingRight: '2.5rem'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value={t.ui.standardPackage}>{t.ui.standardPackage}</option>
                  <option value={t.ui.document}>{t.ui.document}</option>
                  <option value={t.ui.fragile}>{t.ui.fragile}</option>
                  <option value={t.ui.foodDrinks}>{t.ui.foodDrinks}</option>
                  <option value={t.ui.overweightPackage}>{t.ui.overweightPackage}</option>
                  <option value={t.ui.oversizedPackage}>{t.ui.oversizedPackage}</option>
                </select>

                {/* 重量输入框 - 只在选择超重件或超规件时显示 */}
                {showWeightInput && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      name="weight"
                      placeholder={t.order.packageWeight}
                      required
                      style={{
                        width: '100%',
                        padding: 'var(--spacing-3) var(--spacing-4)',
                        border: '2px solid var(--color-border-dark)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-2)',
                        fontSize: 'var(--font-size-base)',
                        lineHeight: 'var(--line-height-normal)',
                        textAlign: 'left',
                        transition: 'all var(--transition-base)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(5px)',
                        fontFamily: 'var(--font-family-base)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                )}

                {/* 速度部分 */}
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>速度</h3>
                <select
                  name="deliverySpeed"
                  required
                  value={selectedDeliverySpeed}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedDeliverySpeed(value);
                    // 如果选择了"定时达"，打开时间选择器
                    if (value === t.ui.scheduledDelivery) {
                      setShowTimePickerModal(true);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    border: '2px solid var(--color-border-dark)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-2)',
                    fontSize: 'var(--font-size-base)',
                    lineHeight: 'var(--line-height-normal)',
                    textAlign: 'left',
                    transition: 'all var(--transition-base)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(5px)',
                    fontFamily: 'var(--font-family-base)',
                    cursor: 'pointer',
                    appearance: 'none',
                    color: 'var(--color-text-primary)',
                    fontWeight: 'var(--font-weight-medium)',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right var(--spacing-3) center',
                    backgroundSize: '1em',
                    paddingRight: '2.5rem'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="">{t.ui.selectDeliverySpeed}</option>
                  <option value={t.ui.onTimeDelivery}>{t.ui.onTimeDelivery}</option>
                  <option value={t.ui.urgentDelivery}>{t.ui.urgentDelivery}</option>
                  <option value={t.ui.scheduledDelivery}>{t.ui.scheduledDelivery}</option>
                </select>

                {/* 代收款 (仅Partner或VIP可见) */}
                {((currentUser && currentUser.user_type === 'partner') || (currentUser && currentUser.user_type === 'vip')) && (
                  <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontWeight: 'bold', 
                      color: 'white',
                      fontSize: 'var(--font-size-base)'
                    }}>
                      {language === 'zh' ? '代收款 (COD)' : language === 'en' ? 'Collection Amount (COD)' : 'ငွေကောက်ခံရန် (COD)'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        name="codAmount"
                        value={codAmount}
                        onChange={(e) => setCodAmount(e.target.value)}
                        placeholder={language === 'zh' ? '请输入代收金额' : language === 'en' ? 'Enter amount' : 'ပမာဏထည့်ပါ'}
                        style={{
                          width: '100%',
                          padding: 'var(--spacing-3) var(--spacing-4)',
                          paddingRight: '3.5rem',
                          border: '2px solid var(--color-border-dark)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--font-size-base)',
                          lineHeight: 'var(--line-height-normal)',
                          textAlign: 'left',
                          transition: 'all var(--transition-base)',
                          fontFamily: 'var(--font-family-base)',
                          background: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(5px)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#4a5568',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        MMK
                      </span>
                    </div>
                  </div>
                )}
                
                {/* 显示选择的时间 */}
                {selectedDeliverySpeed === t.ui.scheduledDelivery && scheduledDeliveryTime && (
                  <div style={{
                    padding: '0.8rem',
                    background: 'rgba(72, 187, 120, 0.1)',
                    border: '2px solid rgba(72, 187, 120, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    color: '#2c5282',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>🕐</span>
                    <span style={{ fontWeight: '500' }}>{t.ui.selectedTime}: {scheduledDeliveryTime}</span>
                  </div>
                )}
                
                <div style={{
                  fontSize: '0.8rem',
                  color: '#e74c3c',
                  marginTop: '0.5rem',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  ***{t.ui.packageInfoMismatch}***
                </div>
              </div>

              {/* 💰 价格估算部分 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>💰 {language === 'zh' ? '价格估算' : language === 'en' ? 'Price Estimate' : 'စျေးနှုန်းခန့်မှန်းခြင်း'}</span>
                  <button
                    type="button"
                    onClick={calculatePriceEstimate}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                    }}
                  >
                    🧮 {language === 'zh' ? '计算' : language === 'en' ? 'Calculate' : 'တွက်ချက်ရန်'}
                  </button>
                </h3>
                
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}>
                  {!isCalculated ? (
                    <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                        📊 {language === 'zh' ? '点击"计算"按钮获取精准费用' : 
                            language === 'en' ? 'Click "Calculate" button to get accurate pricing' : 
                            'တိကျသော စျေးနှုန်းရရှိရန် "တွက်ချက်ရန်" ခလုတ်ကို နှိပ်ပါ'}
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                        {language === 'zh' ? '需要先填写寄件和收件地址' : 
                         language === 'en' ? 'Please fill in sender and receiver addresses first' : 
                         'ပို့ဆောင်သူနှင့် လက်ခံသူ လိပ်စာများကို ဦးစွာ ဖြည့်စွက်ပါ'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '配送距离' : language === 'en' ? 'Delivery Distance' : 'ပို့ဆောင်အကွာအဝေး'}:
                        </span>
                        <span style={{ color: '#10b981', fontWeight: '600' }}>
                          {calculatedDistanceDetail} {language === 'zh' ? '公里' : language === 'en' ? 'km' : 'ကီလိုမီတာ'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '基础费用' : language === 'en' ? 'Base Fee' : 'အခြေခံအခကြေး'}:
                        </span>
                        <span style={{ color: '#3b82f6', fontWeight: '600' }}>
                          {pricingSettings.baseFee} MMK
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '距离费用' : language === 'en' ? 'Distance Fee' : 'အကွာအဝေးအခ'}:
                        </span>
                        <span style={{ color: '#8b5cf6', fontWeight: '600' }}>
                          {Math.max(0, calculatedDistanceDetail - pricingSettings.freeKmThreshold) * pricingSettings.perKmFee} MMK
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '超重费' : language === 'en' ? 'Overweight Fee' : 'အလေးချိန်ပိုအခ'}:
                        </span>
                        <span style={{ color: '#ef4444', fontWeight: '600' }}>
                          {(() => {
                            const form = document.querySelector('form') as HTMLFormElement;
                            if (!form) return 0;
                            const formData = new FormData(form);
                            const weight = formData.get('weight') as string;
                            const weightNum = parseFloat(weight) || 1;
                            const weightThreshold = 5;
                            const weightFee = weightNum > weightThreshold ? (weightNum - weightThreshold) * pricingSettings.weightSurcharge : 0;
                            return weightFee;
                          })()} MMK
                        </span>
                      </div>
                      {/* 超规费 - 仅超规件显示 */}
                      {(() => {
                        const form = document.querySelector('form') as HTMLFormElement;
                        if (!form) return null;
                        const formData = new FormData(form);
                        const packageType = formData.get('packageType') as string;
                        const isOversized = packageType === t.ui.oversizedPackage || packageType === '超规件';
                        if (!isOversized) return null;
                        return (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                              {language === 'zh' ? '超规费' : language === 'en' ? 'Oversize Fee' : 'အရွယ်အစားပိုအခ'}:
                            </span>
                            <span style={{ color: '#f97316', fontWeight: '600' }}>
                              {calculatedDistanceDetail * pricingSettings.oversizeSurcharge} MMK
                            </span>
                          </div>
                        );
                      })()}
                      
                      {/* 易碎品费 - 仅易碎品显示 */}
                      {(() => {
                        const form = document.querySelector('form') as HTMLFormElement;
                        if (!form) return null;
                        const formData = new FormData(form);
                        const packageType = formData.get('packageType') as string;
                        const isFragile = packageType === t.ui.fragile || packageType === '易碎品';
                        if (!isFragile) return null;
                        return (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                              {language === 'zh' ? '易碎品费' : language === 'en' ? 'Fragile Fee' : 'ပျက်စီးလွယ်သောအခ'}:
                            </span>
                            <span style={{ color: '#f97316', fontWeight: '600' }}>
                              {calculatedDistanceDetail * pricingSettings.fragileSurcharge} MMK
                            </span>
                          </div>
                        );
                      })()}
                      
                      {/* 食品饮料费 - 仅食品饮料显示 */}
                      {(() => {
                        const form = document.querySelector('form') as HTMLFormElement;
                        if (!form) return null;
                        const formData = new FormData(form);
                        const packageType = formData.get('packageType') as string;
                        const isFoodDrinks = packageType === t.ui.foodDrinks || packageType === '食品和饮料';
                        if (!isFoodDrinks) return null;
                        return (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                              {language === 'zh' ? '食品饮料费' : language === 'en' ? 'Food & Drinks Fee' : 'အစားအသောက်အခ'}:
                            </span>
                            <span style={{ color: '#f97316', fontWeight: '600' }}>
                              {calculatedDistanceDetail * pricingSettings.foodBeverageSurcharge} MMK
                            </span>
                          </div>
                        );
                      })()}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '配送速度费用' : language === 'en' ? 'Delivery Speed Fee' : 'ပို့ဆောင်မြန်နှုန်းအခ'}:
                        </span>
                        <span style={{ color: '#06b6d4', fontWeight: '600' }}>
                          {(() => {
                            const form = document.querySelector('form') as HTMLFormElement;
                            if (!form) return 0;
                            const formData = new FormData(form);
                            const deliverySpeed = formData.get('deliverySpeed') as string;
                            let speedFee = 0;
                            if (deliverySpeed === t.ui.urgentDelivery || deliverySpeed === '加急配送') {
                              speedFee = pricingSettings.urgentSurcharge;
                            } else if (deliverySpeed === t.ui.scheduledDelivery || deliverySpeed === '定时达') {
                              speedFee = pricingSettings.scheduledSurcharge;
                            }
                            // 准时达不加费，所以不需要处理 t.ui.onTimeDelivery
                            return speedFee;
                          })()} MMK
                        </span>
                      </div>
                      <div style={{ 
                        borderTop: '1px solid rgba(255, 255, 255, 0.2)', 
                        paddingTop: '0.5rem', 
                        marginTop: '0.5rem',
                        display: 'flex', 
                        justifyContent: 'space-between' 
                      }}>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
                          {language === 'zh' ? '总费用' : language === 'en' ? 'Total Cost' : 'စုစုပေါင်းကုန်ကျစရိတ်'}:
                        </span>
                        <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.2rem' }}>
                          {calculatedPriceDetail} MMK
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'center',
                flexDirection: window.innerWidth < 768 ? 'column' : 'row'
              }}>
                <button
                  type="button"
                  onClick={() => setShowOrderForm(false)}
                  style={{
                    background: '#e2e8f0',
                    color: '#4a5568',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    width: window.innerWidth < 768 ? '100%' : 'auto',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
                >
                  {t.order.cancel}
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    width: window.innerWidth < 768 ? '100%' : 'auto',
                    boxShadow: '0 4px 15px rgba(44, 82, 130, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(44, 82, 130, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(44, 82, 130, 0.3)';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span>{t.order.submit}</span>
                    {isCalculated && (
                      <span style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '0.2rem' }}>
                        {calculatedPriceDetail} MMK
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 支付二维码模态窗口 */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(26, 54, 93, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'white',
            padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
            borderRadius: '15px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(26, 54, 93, 0.3)',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💳</div>
              <h2 style={{ color: '#2c5282', margin: 0 }}>
                {t.ui.paymentQRCode}
            </h2>
            </div>
            
            {/* 配送距离 */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1rem',
              color: 'white'
            }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>📍 {t.ui.deliveryDistance}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.3rem' }}>
                {deliveryDistance} km
              </div>
            </div>

            {/* 应付金额 */}
            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              padding: '1.5rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              color: 'white'
            }}>
              <div style={{ fontSize: '1rem', opacity: 0.9 }}>💰 {t.ui.totalAmount}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                {calculatedPrice.toLocaleString()} MMK
              </div>
            </div>

            {/* 支付方式选择 */}
            <div style={{
              background: '#f8f9fa',
              padding: '1.5rem',
              borderRadius: '10px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '1rem', color: '#2c5282', marginBottom: '1rem', fontWeight: 'bold', textAlign: 'center' }}>
                💳 {t.ui.selectPaymentMethod}
              </div>
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                marginBottom: '1rem'
              }}>
                {/* 二维码支付选项 - 开发中 */}
                <button
                  onClick={() => {
                    // 禁用点击，显示提示
                    alert(t.ui.underDevelopment || '开发中');
                  }}
                  disabled={true}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '10px',
                    border: '2px solid #d1d5db',
                    background: '#f3f4f6',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>📱</div>
                  <div style={{ fontWeight: 'bold', color: '#6b7280' }}>{t.ui.qrPayment}</div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#ef4444', 
                    fontWeight: 'bold',
                    marginTop: '0.25rem'
                  }}>
                    {t.ui.underDevelopment || '开发中'}
                  </div>
                </button>
                
                {/* 现金支付选项 */}
                <button
                  onClick={async () => {
                    setPaymentMethod('cash');
                    setPaymentQRCode(''); // 清除二维码
                    // 更新数据库中的支付方式
                    if (tempOrderId) {
                      try {
                        const dbPendingOrder = await pendingOrderService.getPendingOrderByTempId(tempOrderId);
                        if (dbPendingOrder) {
                          // 更新数据库中的支付方式
                          const { error } = await supabase
                            .from('pending_orders')
                            .update({ payment_method: 'cash' })
                            .eq('temp_order_id', tempOrderId);
                          if (error) {
                            console.error('更新支付方式失败:', error);
                          }
                        }
                      } catch (err) {
                        console.error('更新支付方式异常:', err);
                      }
                    }
                    // 同时更新localStorage（向后兼容）
                    const pendingOrder = localStorage.getItem('pendingOrder');
                    if (pendingOrder) {
                      const orderInfo = JSON.parse(pendingOrder);
                      orderInfo.paymentMethod = 'cash';
                      localStorage.setItem('pendingOrder', JSON.stringify(orderInfo));
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '10px',
                    border: paymentMethod === 'cash' ? '3px solid #27ae60' : '2px solid #dee2e6',
                    background: paymentMethod === 'cash' ? '#e8f5e9' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseOver={(e) => {
                    if (paymentMethod !== 'cash') {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#27ae60';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (paymentMethod !== 'cash') {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#dee2e6';
                    }
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>💵</div>
                  <div style={{ fontWeight: 'bold', color: '#27ae60' }}>{t.ui.cashPayment}</div>
                </button>
                
              </div>
              
              {/* 现金支付说明 */}
              {paymentMethod === 'cash' && (
                <div style={{
                  background: '#fff3cd',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginTop: '1rem',
                  fontSize: '0.9rem',
                  color: '#856404',
                  textAlign: 'center'
                }}>
                  💡 {t.ui.cashPaymentDesc}
                </div>
              )}
            </div>

            {/* 收款二维码（仅当选择二维码支付时显示）- 已暂停，开发中 */}
            {false && paymentMethod === 'qr' && (
              <div style={{
                background: '#f8f9fa',
                padding: '1.5rem',
                borderRadius: '10px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '1rem', color: '#2c5282', marginBottom: '1rem', fontWeight: 'bold', textAlign: 'center' }}>
                  📱 {t.ui.scanToPay}
                </div>
                {paymentQRCode ? (
                  <img 
                    src={paymentQRCode} 
                    alt="Payment QR Code"
                    style={{
                      width: '250px',
                      height: '250px',
                      margin: '0 auto',
                      display: 'block',
                      borderRadius: '10px',
                      border: '3px solid #2c5282'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '250px',
                    height: '250px',
                    background: '#e9ecef',
                    margin: '0 auto',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666'
                  }}>
                    {t.ui.calculating}
                  </div>
                )}
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'center',
              flexDirection: window.innerWidth < 768 ? 'column' : 'row'
            }}>
              <button
                onClick={async () => {
                  // 设置处理中状态
                  setOrderSubmitStatus('processing');
                  
                  try {
                    // 获取存储的订单信息（优先从数据库获取，如果失败则从localStorage获取）
                    let orderInfo: any = null;
                    let dbPendingOrder: any = null;
                    const currentTempOrderId = tempOrderId || (() => {
                      // 尝试从localStorage获取tempOrderId
                      const localPendingOrder = localStorage.getItem('pendingOrder');
                      if (localPendingOrder) {
                        const localData = JSON.parse(localPendingOrder);
                        return localData.tempOrderId;
                      }
                      return '';
                    })();
                    
                    // 优先从数据库获取订单信息
                    if (currentTempOrderId) {
                      dbPendingOrder = await pendingOrderService.getPendingOrderByTempId(currentTempOrderId);
                      if (dbPendingOrder) {
                        orderInfo = {
                          senderName: dbPendingOrder.sender_name,
                          senderPhone: dbPendingOrder.sender_phone,
                          senderAddress: dbPendingOrder.sender_address,
                          senderLatitude: dbPendingOrder.sender_latitude,
                          senderLongitude: dbPendingOrder.sender_longitude,
                          receiverName: dbPendingOrder.receiver_name,
                          receiverPhone: dbPendingOrder.receiver_phone,
                          receiverAddress: dbPendingOrder.receiver_address,
                          receiverLatitude: dbPendingOrder.receiver_latitude,
                          receiverLongitude: dbPendingOrder.receiver_longitude,
                          packageType: dbPendingOrder.package_type,
                          weight: dbPendingOrder.weight,
                          deliverySpeed: dbPendingOrder.delivery_speed,
                          scheduledTime: dbPendingOrder.scheduled_delivery_time,
                          price: dbPendingOrder.price,
                          distance: dbPendingOrder.distance,
                          paymentMethod: dbPendingOrder.payment_method,
                          codAmount: dbPendingOrder.cod_amount, // 读取代收款
                          tempOrderId: dbPendingOrder.temp_order_id
                        };
                      }
                    }
                    
                    // 如果数据库中没有，尝试从localStorage获取（向后兼容）
                    if (!orderInfo) {
                      const localPendingOrder = localStorage.getItem('pendingOrder');
                      if (localPendingOrder) {
                        orderInfo = JSON.parse(localPendingOrder);
                      }
                    }
                    
                    if (!orderInfo) {
                      setOrderSubmitStatus('failed');
                      setOrderError(t.errors.orderInfoLost || '订单信息丢失，请重新下单');
                      setShowPaymentModal(false);
                      setShowOrderSuccessModal(true);
                      return;
                    }
                    
                    const packageId = orderInfo.tempOrderId || generateMyanmarPackageId(orderInfo.senderAddress);
                    
                    // 获取当前选择的支付方式（优先使用当前状态，如果没有则使用存储的）
                    const currentPaymentMethod = paymentMethod || orderInfo.paymentMethod || (dbPendingOrder?.payment_method) || 'cash';
                    
                    // 创建包裹数据 - 使用数据库字段名
                    // 确保 weight 字段始终有值（数据库要求非空）
                    // 对于不需要重量的包裹类型，使用默认值 '1'
                    const needWeight = orderInfo.packageType === t.ui.overweightPackage || 
                                      orderInfo.packageType === t.ui.oversizedPackage ||
                                      orderInfo.packageType === '超重件' || 
                                      orderInfo.packageType === '超规件';
                    const packageWeight = needWeight && orderInfo.weight 
                      ? orderInfo.weight 
                      : (orderInfo.weight || '1'); // 默认重量为 1kg
                    
                    // 根据支付方式设置订单状态
                    // 现金支付：状态设为"待收款"，骑手代收
                    // 二维码支付：状态设为"待取件"，已支付
                    const orderStatus = currentPaymentMethod === 'cash' ? '待收款' : '待取件';
                    
                    // 构建包裹数据，只包含数据库表中存在的字段
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
                      weight: packageWeight, // 确保始终有值
                      delivery_speed: orderInfo.deliverySpeed,
                      scheduled_delivery_time: orderInfo.scheduledTime || null,
                      delivery_distance: orderInfo.distance || deliveryDistance,
                      status: orderStatus, // 根据支付方式设置状态
                      create_time: new Date().toLocaleString('zh-CN'),
                      pickup_time: '',
                      delivery_time: '',
                      courier: '待分配',
                      price: `${orderInfo.price || calculatedPrice} MMK`,
                      payment_method: currentPaymentMethod, // 添加支付方式字段
                      cod_amount: orderInfo.codAmount || 0 // 添加代收款金额
                    };

                    // 如果是合伙店铺，添加店铺关联信息
                    if (currentUser && currentUser.user_type === 'partner') {
                      // 如果 store_id 存在，添加到 delivery_store_id
                      if (currentUser.store_id) {
                        packageData.delivery_store_id = currentUser.store_id;
                      } else if (currentUser.id) {
                        // 兼容旧逻辑，如果 id 就是 store_id
                        packageData.delivery_store_id = currentUser.id;
                      }
                      
                      // 添加店铺名称
                      if (currentUser.name) {
                        packageData.delivery_store_name = currentUser.name;
                      }
                      
                      // 添加店铺代码作为 sender_code
                      if (currentUser.store_code) {
                        packageData.sender_code = currentUser.store_code;
                      }
                    }

                    // 只有在用户登录时才添加 customer_email 和 customer_name
                    // 如果数据库表中没有这些字段，这些值会被忽略
                    if (currentUser?.id) {
                      packageData.customer_id = currentUser.id;
                    }
                    
                    if (currentUser?.email) {
                      packageData.customer_email = currentUser.email;
                    } else if (orderInfo.customerEmail) {
                      packageData.customer_email = orderInfo.customerEmail;
                    }

                    if (currentUser?.name) {
                      packageData.customer_name = currentUser.name;
                    } else if (orderInfo.customerName) {
                      packageData.customer_name = orderInfo.customerName;
                    } else if (orderInfo.senderName) {
                      packageData.customer_name = orderInfo.senderName;
                    }
                    
                    // 保存到数据库
                    console.log('准备保存包裹数据:', packageData);
                    const result = await packageService.createPackage(packageData);
                    
                    if (result) {
                      // 自动保存客户信息到用户管理
                      await saveCustomerToUsers(orderInfo);

                      // 清除临时订单信息（数据库和localStorage）
                      if (orderInfo.tempOrderId) {
                        await pendingOrderService.deletePendingOrder(orderInfo.tempOrderId);
                      }
                      localStorage.removeItem('pendingOrder');

                      // 使用包裹ID作为订单号，并生成二维码
                      const orderId = result.id || packageId;
                      setGeneratedOrderId(orderId);
                      const qrDataUrl = await generateQRCode(orderId);
                      setQrCodeDataUrl(qrDataUrl || ''); // 确保二维码状态已设置

                      // 设置成功状态，显示订单成功模态框
                      setOrderSubmitStatus('success');
                      setShowPaymentModal(false);
                      setShowOrderSuccessModal(true);
                    } else {
                      // 包裹创建失败
                      setOrderSubmitStatus('failed');
                      setOrderError('包裹创建失败，请检查网络连接或联系客服。');
                      setShowPaymentModal(false);
                      setShowOrderSuccessModal(true);
                    }
                  } catch (error) {
                    // 捕获所有异常
                    console.error('订单提交异常:', error);
                    setOrderSubmitStatus('failed');
                    
                    let errorMessage = '订单提交失败，请稍后重试或联系客服。';
                    if (error instanceof Error) {
                      errorMessage = error.message;
                      // 如果是 API key 错误，提供更友好的提示
                      if (error.message.includes('API Key') || error.message.includes('Invalid API key')) {
                        errorMessage = `配置错误：${error.message}\n\n` +
                          `请联系管理员检查系统配置，或稍后重试。`;
                      }
                    }
                    
                    setOrderError(errorMessage);
                    setShowPaymentModal(false);
                    setShowOrderSuccessModal(true);
                  }
                }}
                disabled={orderSubmitStatus === 'processing'}
                style={{
                  background: orderSubmitStatus === 'processing' 
                    ? '#94a3b8' 
                    : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  cursor: orderSubmitStatus === 'processing' ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  width: window.innerWidth < 768 ? '100%' : 'auto',
                  boxShadow: orderSubmitStatus === 'processing' 
                    ? 'none' 
                    : '0 4px 15px rgba(39, 174, 96, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: orderSubmitStatus === 'processing' ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  if (orderSubmitStatus !== 'processing') {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (orderSubmitStatus !== 'processing') {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                  }
                }}
              >
                {orderSubmitStatus === 'processing' ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    {language === 'zh' ? '正在提交订单...' : language === 'en' ? 'Submitting order...' : 'အော်ဒါတင်နေသည်...'}
                  </>
                ) : (
                  t.ui.confirmPayment
                )}
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  width: window.innerWidth < 768 ? '100%' : 'auto',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                {t.ui.cancelPayment}
              </button>
            </div>
          </div>
        </div>
      )}

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
                      ? '电话: (+95) 09788848928' 
                      : language === 'en'
                        ? 'Phone: (+95) 09788848928'
                        : 'ဖုန်း: (+95) 09788848928'}
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
                      setShowPaymentModal(true);
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
          zIndex: 2000
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
                    <p style={{ margin: '0', opacity: 0.8 }}>请检查网络连接</p>
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
                    
                  } catch (error: any) {
                    console.error('定位失败:', error);
                    
                    let errorMessage = '无法获取您的位置';
                    
                    if (error.code) {
                      switch (error.code) {
                        case error.PERMISSION_DENIED:
                          errorMessage = '❌ 位置权限被拒绝\n\n请在浏览器设置中允许位置访问，然后刷新页面重试';
                          break;
                        case error.POSITION_UNAVAILABLE:
                          errorMessage = '❌ 位置信息不可用\n\n请检查设备的GPS设置';
                          break;
                        case error.TIMEOUT:
                          errorMessage = '❌ 定位超时\n\n请确保设备已开启位置服务';
                          break;
                        default:
                          errorMessage = `❌ 定位失败: ${error.message}`;
                      }
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
                      autocompleteSuggestions.map((suggestion, index) => (
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

            {/* 快速选择时间 */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                color: 'white', 
                display: 'block', 
                marginBottom: '1rem',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}>
                ⚡ 快速选择
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '0.8rem',
                marginBottom: '1rem'
              }}>
                {[
                  { label: '今天下午', value: 'today-afternoon' },
                  { label: '明天上午', value: 'tomorrow-morning' },
                  { label: '明天下午', value: 'tomorrow-afternoon' },
                  { label: '后天上午', value: 'day-after-morning' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      const now = new Date();
                      let targetDate = new Date();
                      let targetTime = '';

                      switch (option.value) {
                        case 'today-afternoon':
                          targetTime = '14:00';
                          break;
                        case 'tomorrow-morning':
                          targetDate.setDate(now.getDate() + 1);
                          targetTime = '09:00';
                          break;
                        case 'tomorrow-afternoon':
                          targetDate.setDate(now.getDate() + 1);
                          targetTime = '14:00';
                          break;
                        case 'day-after-morning':
                          targetDate.setDate(now.getDate() + 2);
                          targetTime = '09:00';
                          break;
                      }

                      const dateInput = document.getElementById('delivery-date') as HTMLInputElement;
                      const timeInput = document.getElementById('delivery-time') as HTMLInputElement;
                      
                      if (dateInput && timeInput) {
                        dateInput.value = targetDate.toISOString().split('T')[0];
                        timeInput.value = targetTime;
                      }
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '0.8rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '0.9rem',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 自定义日期时间选择 */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                color: 'white', 
                display: 'block', 
                marginBottom: '1rem',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}>
                📅 自定义时间
              </label>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem'
                }}>
                  {t.ui.selectDate}
                </label>
                <input
                  type="date"
                  id="delivery-date"
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#2c5282',
                    fontWeight: '500',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem'
                }}>
                  {t.ui.selectTime}
                </label>
                <input
                  type="time"
                  id="delivery-time"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#2c5282',
                    fontWeight: '500',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* 按钮组 */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  const dateInput = document.getElementById('delivery-date') as HTMLInputElement;
                  const timeInput = document.getElementById('delivery-time') as HTMLInputElement;
                  
                  if (dateInput.value && timeInput.value) {
                    const formattedDateTime = `${dateInput.value} ${timeInput.value}`;
                    setScheduledDeliveryTime(formattedDateTime);
                    setShowTimePickerModal(false);
                  } else {
                    alert('请选择日期和时间');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  flex: 1,
                  boxShadow: '0 4px 15px rgba(56, 161, 105, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(56, 161, 105, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(56, 161, 105, 0.3)';
                }}
              >
                ✅ {t.ui.confirmTime}
              </button>
              
              <button
                onClick={() => {
                  setShowTimePickerModal(false);
                  setSelectedDeliverySpeed('');
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  flex: 1,
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                ❌ {t.ui.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户注册/登录模态窗口 */}
      {showRegisterModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(44, 82, 130, 0.6) 0%, rgba(49, 130, 206, 0.5) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 3000,
            animation: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRegisterModal(false);
              setRegisterForm({ name: '', phone: '', email: '', address: '', password: '', confirmPassword: '', verificationCode: '' });
              setCodeSent(false);
              setCountdown(0);
              setLoginType('normal'); // 重置登录类型
            }
          }}
        >
          <div style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%)',
            padding: window.innerWidth < 768 ? '2rem 1.5rem' : '3rem 2.5rem',
            borderRadius: '24px',
            width: window.innerWidth < 768 ? '100%' : '520px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.8) inset, 0 0 60px rgba(49, 130, 206, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            position: 'relative',
            animation: 'scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)'
          }}>
            {/* 关闭按钮 */}
            <button
              onClick={() => {
                setShowRegisterModal(false);
                setRegisterForm({ name: '', phone: '', email: '', address: '', password: '', confirmPassword: '', verificationCode: '' });
                setCodeSent(false);
                setCountdown(0);
                setLoginType('normal'); // 重置登录类型
              }}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.08) 100%)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '1.2rem',
                fontWeight: '600',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.15) 100%)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.08) 100%)';
                e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              }}
            >
              ✕
            </button>

            <div style={{ 
              textAlign: 'center', 
              marginBottom: '2.5rem',
              paddingTop: '0.5rem'
            }}>
              <img 
                src="/logo.png" 
                alt="ML Express Logo"
                style={{ 
                  width: window.innerWidth < 768 ? '80px' : '100px',
                  height: window.innerWidth < 768 ? '80px' : '100px',
                  marginBottom: '1.25rem',
                  filter: 'drop-shadow(0 8px 24px rgba(49, 130, 206, 0.3))',
                  transform: 'translateY(0)',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  display: 'inline-block',
                  objectFit: 'contain'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px) scale(1.15) rotate(5deg)';
                  e.currentTarget.style.filter = 'drop-shadow(0 12px 32px rgba(49, 130, 206, 0.4))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1) rotate(0deg)';
                  e.currentTarget.style.filter = 'drop-shadow(0 8px 24px rgba(49, 130, 206, 0.3))';
                }}
              />
              <h2 style={{ 
                color: '#1a202c', 
                margin: 0, 
                fontSize: window.innerWidth < 768 ? '1.2rem' : '1.8rem', 
                fontWeight: '900',
                letterSpacing: '0.5px',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '0.75rem',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                whiteSpace: 'nowrap'
              }}>
                {isLoginMode ? (
                  <>
                    MARKET LINK <span style={{ 
                      fontSize: '1em', 
                      fontStyle: 'italic', 
                      fontWeight: '900',
                      background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginLeft: '4px'
                    }}>EXPRESS</span>
                  </>
                ) : (
                  (language === 'zh' ? '创建账户' : language === 'en' ? 'Create Account' : 'အကောင့်သစ်ဖွင့်ရန်')
                )}
              </h2>
              {/* 登录模式：显示登录类型选择按钮 */}
              {isLoginMode && (
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'center',
                  marginTop: '0.75rem',
                  marginBottom: '1.5rem',
                  width: '100%'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginType('normal');
                      setRegisterForm({ ...registerForm, email: '', phone: '', password: '' });
                    }}
                    style={{
                      flex: 1,
                      maxWidth: '200px',
                      padding: '0.875rem 1.5rem',
                      background: loginType === 'normal' 
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' 
                        : 'rgba(255, 255, 255, 0.9)',
                      color: loginType === 'normal' ? 'white' : '#475569',
                      border: loginType === 'normal' 
                        ? '2px solid #2563eb' 
                        : '2px solid rgba(148, 163, 184, 0.5)',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: loginType === 'normal' 
                        ? '0 4px 12px rgba(37, 99, 235, 0.3)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transform: loginType === 'normal' ? 'translateY(-2px)' : 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      if (loginType !== 'normal') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                        e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.7)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (loginType !== 'normal') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.5)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                  >
                    {language === 'zh' ? '普通登录' : language === 'en' ? 'Login' : 'ဝင်ရောက်ပါ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginType('partner');
                      setRegisterForm({ ...registerForm, email: '', phone: '', password: '' });
                    }}
                    style={{
                      flex: 1,
                      maxWidth: '200px',
                      padding: '0.875rem 1.5rem',
                      background: loginType === 'partner' 
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' 
                        : 'rgba(255, 255, 255, 0.9)',
                      color: loginType === 'partner' ? 'white' : '#475569',
                      border: loginType === 'partner' 
                        ? '2px solid #2563eb' 
                        : '2px solid rgba(148, 163, 184, 0.5)',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: loginType === 'partner' 
                        ? '0 4px 12px rgba(37, 99, 235, 0.3)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transform: loginType === 'partner' ? 'translateY(-2px)' : 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      if (loginType !== 'partner') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                        e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.7)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (loginType !== 'partner') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.5)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                  >
                    {language === 'zh' ? '合伙登录' : language === 'en' ? 'Partner' : 'လုပ်ဖော်ကိုင်ဖက်'}
                  </button>
                </div>
              )}
              {/* 注册模式：显示描述文字 */}
              {!isLoginMode && (
                <p style={{ 
                  color: '#64748b', 
                  marginTop: '0', 
                  fontSize: '1rem', 
                  lineHeight: '1.7',
                  fontWeight: '400',
                  letterSpacing: '0.2px'
                }}>
                  {language === 'zh' ? '注册只需几分钟' : 
                   language === 'en' ? 'Registration takes just a few minutes' : 
                   'မှတ်ပုံတင်ခြင်းသည် မိနစ်အနည်းငယ်သာ ကြာပါသည်'}
                </p>
              )}
            </div>

            <form onSubmit={handleRegister}>
              {/* 登录模式 */}
              {isLoginMode && (
                <>
                  {/* 普通登录：邮箱或电话号码 */}
                  {loginType === 'normal' && (
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ 
                        color: '#475569', 
                        display: 'block', 
                        marginBottom: '0.6rem',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        letterSpacing: '0.3px'
                      }}>
                        {language === 'zh' ? '邮箱或电话号码' : language === 'en' ? 'Email or Phone Number' : 'အီးမေးလ် သို့မဟုတ် ဖုန်းနံပါတ်'}
                      </label>
                      <input
                        type="text"
                        value={registerForm.email || registerForm.phone}
                        onChange={(e) => {
                          const value = e.target.value;
                          // 判断输入的是邮箱还是电话号码
                          if (value.includes('@')) {
                            // 包含@符号，认为是邮箱
                            setRegisterForm({ ...registerForm, email: value, phone: '' });
                          } else if (/^\d/.test(value)) {
                            // 以数字开头，认为是电话号码
                            setRegisterForm({ ...registerForm, phone: value, email: '' });
                          } else {
                            // 其他情况，同时更新两个字段（让后端判断）
                            setRegisterForm({ ...registerForm, email: value, phone: value });
                          }
                        }}
                        placeholder={language === 'zh' ? '输入邮箱或电话号码' : language === 'en' ? 'Enter email or phone number' : 'အီးမေးလ် သို့မဟုတ် ဖုန်းနံပါတ် ထည့်ပါ'}
                        required
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.125rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '14px',
                          fontSize: '1rem',
                          background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
                          color: '#1e293b',
                          outline: 'none',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* 合伙登录：店铺代码 */}
                  {loginType === 'partner' && (
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ 
                        color: '#475569', 
                        display: 'block', 
                        marginBottom: '0.6rem',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        letterSpacing: '0.3px'
                      }}>
                        {language === 'zh' ? '店铺代码' : language === 'en' ? 'Store Code' : 'ဆိုင်ကုဒ်'}
                      </label>
                      <input
                        type="text"
                        value={registerForm.email || ''}
                        onChange={(e) => {
                          setRegisterForm({ ...registerForm, email: e.target.value, phone: '' });
                        }}
                        placeholder={language === 'zh' ? '输入店铺代码' : language === 'en' ? 'Enter store code' : 'ဆိုင်ကုဒ် ထည့်ပါ'}
                        required
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.125rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '14px',
                          fontSize: '1rem',
                          background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
                          color: '#1e293b',
                          outline: 'none',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* 密码 */}
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ 
                      color: '#475569', 
                      display: 'block', 
                      marginBottom: '0.6rem',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      letterSpacing: '0.3px'
                    }}>
                      {language === 'zh' ? '密码' : language === 'en' ? 'Password' : 'စကားဝှက်'}
                    </label>
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      placeholder={language === 'zh' ? '请输入密码' : language === 'en' ? 'Enter password' : 'စကားဝှက်ထည့်ပါ'}
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1.125rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '14px',
                        fontSize: '1rem',
                        background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
                        color: '#1e293b',
                        outline: 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    />
                  </div>
                </>
              )}

              {/* 注册模式：姓名（仅注册模式显示） */}
              {!isLoginMode && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ 
                    color: '#475569', 
                    display: 'block', 
                    marginBottom: '0.6rem',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    letterSpacing: '0.3px'
                  }}>
                    {language === 'zh' ? '姓名' : language === 'en' ? 'Name' : 'နာမည်'}
                  </label>
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    placeholder={language === 'zh' ? '请输入您的姓名' : language === 'en' ? 'Enter your name' : 'သင့်နာမည်ထည့်ပါ'}
                    required={!isLoginMode}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1.125rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '14px',
                      fontSize: '1rem',
                      background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
                      color: '#1e293b',
                      outline: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  />
                </div>
              )}

              {/* 注册模式：电话号码（仅注册模式显示） */}
              {!isLoginMode && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ 
                    color: '#475569', 
                    display: 'block', 
                    marginBottom: '0.6rem',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    letterSpacing: '0.3px'
                  }}>
                    {language === 'zh' ? '电话号码' : language === 'en' ? 'Phone Number' : 'ဖုန်းနံပါတ်'}
                  </label>
                  <input
                    type="tel"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    placeholder={language === 'zh' ? '09xxxxxxxx' : language === 'en' ? '09xxxxxxxx' : '09xxxxxxxx'}
                    required={!isLoginMode}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1.125rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '14px',
                      fontSize: '1rem',
                      background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
                      color: '#1e293b',
                      outline: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  />
                </div>
              )}

              {/* 注册模式：密码 */}
              {!isLoginMode && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ 
                    color: '#475569', 
                    display: 'block', 
                    marginBottom: '0.6rem',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    letterSpacing: '0.3px'
                  }}>
                    {language === 'zh' ? '密码' : language === 'en' ? 'Password' : 'စကားဝှက်'}
                  </label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    placeholder={language === 'zh' ? '请输入密码' : language === 'en' ? 'Enter password' : 'စကားဝှက်ထည့်ပါ'}
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1.125rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '14px',
                      fontSize: '1rem',
                      background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
                      color: '#1e293b',
                      outline: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  />
                </div>
              )}

              {/* 4. 确认密码（仅注册模式显示） */}
              {!isLoginMode && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ 
                    color: '#475569', 
                    display: 'block', 
                    marginBottom: '0.6rem',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    letterSpacing: '0.3px'
                  }}>
                    {language === 'zh' ? '确认密码' : language === 'en' ? 'Confirm Password' : 'စကားဝှက်အတည်ပြုပါ'}
                  </label>
                  <input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    placeholder={language === 'zh' ? '请再次输入密码' : language === 'en' ? 'Re-enter password' : 'စကားဝှက်ထပ်ထည့်ပါ'}
                    required={!isLoginMode}
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1.125rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '14px',
                      fontSize: '1rem',
                      background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
                      color: '#1e293b',
                      outline: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  />
                </div>
              )}

              {/* 注册模式：电子邮箱 */}
              {!isLoginMode && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ 
                    color: '#475569', 
                    display: 'block', 
                    marginBottom: '0.6rem',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    letterSpacing: '0.3px'
                  }}>
                    {language === 'zh' ? '电子邮箱' : language === 'en' ? 'Email' : 'အီးမေးလ်'}
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      placeholder={language === 'zh' ? 'example@gmail.com' : 'example@gmail.com'}
                      required
                      style={{
                        flex: '1.2',
                        padding: '0.875rem 1.125rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '14px',
                        fontSize: '1rem',
                        background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
                        color: '#1e293b',
                        outline: 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    />
                    
                    {/* 获取验证码按钮（仅注册模式显示） */}
                    <button
                      type="button"
                      onClick={handleSendVerificationCode}
                      disabled={countdown > 0}
                      style={{
                        flex: '0.8',
                        padding: '0.875rem 1rem',
                        background: countdown > 0 
                          ? 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' 
                          : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                        color: countdown > 0 ? '#94a3b8' : '#2563eb',
                        border: countdown > 0 ? '2px solid #e2e8f0' : '2px solid #93c5fd',
                        borderRadius: '14px',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        whiteSpace: 'nowrap',
                        boxShadow: countdown > 0 ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.2)',
                        transform: 'translateY(0)'
                      }}
                      onMouseEnter={(e) => {
                        if (countdown === 0) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)';
                          e.currentTarget.style.borderColor = '#60a5fa';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (countdown === 0) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
                          e.currentTarget.style.borderColor = '#93c5fd';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.2)';
                        }
                      }}
                    >
                      {countdown > 0 ? 
                        `${countdown}s` : 
                        (language === 'zh' ? '获取验证码' : language === 'en' ? 'Get Code' : 'ကုဒ်ယူရန်')
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* 6. 验证码（仅注册模式显示） */}
              {!isLoginMode && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ 
                    color: '#475569', 
                    display: 'block', 
                    marginBottom: '0.6rem',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    letterSpacing: '0.3px'
                  }}>
                    {language === 'zh' ? '验证码' : language === 'en' ? 'Code' : 'အတည်ပြုကုဒ်'}
                  </label>
                  <input
                    type="text"
                    value={registerForm.verificationCode}
                    onChange={(e) => setRegisterForm({ ...registerForm, verificationCode: e.target.value })}
                    placeholder="000000"
                    maxLength={6}
                    required={!isLoginMode}
                    style={{
                      width: '100%',
                      padding: '1rem 1.125rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '14px',
                      fontSize: '1.5rem',
                      background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
                      color: '#1e293b',
                      fontWeight: '700',
                      outline: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      letterSpacing: '0.5em',
                      textAlign: 'center',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      fontFamily: 'monospace'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  />
                </div>
              )}

              {/* 7. 地址（可选，仅注册模式显示） */}
              {!isLoginMode && (
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ 
                    color: '#475569', 
                    display: 'block', 
                    marginBottom: '0.6rem',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    letterSpacing: '0.3px'
                  }}>
                    {language === 'zh' ? '地址（可选）' : language === 'en' ? 'Address' : 'လိပ်စာ'}
                  </label>
                  <textarea
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                    placeholder={language === 'zh' ? '请输入您的地址' : language === 'en' ? 'Enter your address' : 'သင့်လိပ်စာထည့်ပါ'}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1.125rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '14px',
                      fontSize: '1rem',
                      background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
                      color: '#1e293b',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      lineHeight: '1.6'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(59, 130, 246, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  />
                </div>
              )}

              {/* 按钮区 */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '1rem',
                marginTop: '2rem'
              }}>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '1.125rem 1.5rem',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    fontWeight: '800',
                    fontSize: '1.125rem',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 8px 16px rgba(37, 99, 235, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                    transform: 'translateY(0)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(37, 99, 235, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.15) inset';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(37, 99, 235, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)';
                  }}
                >
                  {isLoginMode ? 
                    (language === 'zh' ? '立即登录' : language === 'en' ? 'Login Now' : 'ယခုဝင်ပါ') :
                    (language === 'zh' ? '创建账户' : language === 'en' ? 'Create Account' : 'အကောင့်ဖွင့်ပါ')
                  }
                </button>
                
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '1rem',
                  fontSize: '0.9375rem',
                  color: '#64748b',
                  fontWeight: '400'
                }}>
                  {isLoginMode ? (
                    <>
                      {language === 'zh' ? '还没有账户？' : language === 'en' ? "Don't have an account? " : 'အကောင့်မရှိသေးဘူးလား? '}
                      <span 
                        onClick={() => {
                          setIsLoginMode(false);
                          setLoginType('normal'); // 切换到注册模式时重置登录类型
                        }}
                        style={{ 
                          color: '#2563eb', 
                          fontWeight: '700', 
                          cursor: 'pointer',
                          textDecoration: 'none',
                          marginLeft: '0.5rem',
                          transition: 'all 0.2s ease',
                          borderBottom: '2px solid transparent',
                          paddingBottom: '2px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#1d4ed8';
                          e.currentTarget.style.borderBottomColor = '#1d4ed8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#2563eb';
                          e.currentTarget.style.borderBottomColor = 'transparent';
                        }}
                      >
                        {language === 'zh' ? '去注册' : language === 'en' ? 'Register' : 'မှတ်ပုံတင်ပါ'}
                      </span>
                    </>
                  ) : (
                    <>
                      {language === 'zh' ? '已有账户？' : language === 'en' ? 'Already have an account? ' : 'အကောင့်ရှိပြီးသားလား? '}
                      <span 
                        onClick={() => {
                          setIsLoginMode(true);
                          setLoginType('normal'); // 切换到登录模式时重置登录类型
                        }}
                        style={{ 
                          color: '#2563eb', 
                          fontWeight: '700', 
                          cursor: 'pointer',
                          textDecoration: 'none',
                          marginLeft: '0.5rem',
                          transition: 'all 0.2s ease',
                          borderBottom: '2px solid transparent',
                          paddingBottom: '2px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#1d4ed8';
                          e.currentTarget.style.borderBottomColor = '#1d4ed8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#2563eb';
                          e.currentTarget.style.borderBottomColor = 'transparent';
                        }}
                      >
                        {language === 'zh' ? '去登录' : language === 'en' ? 'Login' : 'ဝင်ပါ'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
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
