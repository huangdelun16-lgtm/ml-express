import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { packageService, testConnection, userService, systemSettingsService } from '../services/supabase';
import QRCode from 'qrcode';

// Google Maps API 配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY";
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
  const navigate = useNavigate();
  
  // Google Maps API 加载
  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });
  
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ml-express-language') || 'zh';
  });
  const [isVisible, setIsVisible] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapSelectionType, setMapSelectionType] = useState<'sender' | 'receiver' | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [mapClickPosition, setMapClickPosition] = useState<{lat: number, lng: number} | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 16.8661, lng: 96.1951 }); // 仰光中心
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [selectedCity, setSelectedCity] = useState('yangon');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState<string>('');
  const [selectedDeliverySpeed, setSelectedDeliverySpeed] = useState<string>('');
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [deliveryDistance, setDeliveryDistance] = useState<number>(0);
  const [paymentQRCode, setPaymentQRCode] = useState<string>('');
  // const [orderData, setOrderData] = useState<any>(null);
  
  // 系统价格设置
  const [pricingSettings, setPricingSettings] = useState({
    baseFee: 1500,
    perKmFee: 500,
    weightSurcharge: 150,
    urgentSurcharge: 500,
    oversizeSurcharge: 300,
    scheduledSurcharge: 200,
    fragileSurcharge: 400,
    foodBeverageSurcharge: 300,
    freeKmThreshold: 3
  });

  // 缅甸主要城市数据
  const myanmarCities = {
    yangon: { name: '仰光', nameEn: 'Yangon', nameMm: 'ရန်ကုန်', lat: 16.8661, lng: 96.1951 },
    mandalay: { name: '曼德勒', nameEn: 'Mandalay', nameMm: 'မန္တလေး', lat: 21.9588, lng: 96.0891 },
    naypyidaw: { name: '内比都', nameEn: 'Naypyidaw', nameMm: 'နေပြည်တော်', lat: 19.7633, lng: 96.0785 },
    mawlamyine: { name: '毛淡棉', nameEn: 'Mawlamyine', nameMm: 'မော်လမြိုင်', lat: 16.4909, lng: 97.6282 },
    taunggyi: { name: '东枝', nameEn: 'Taunggyi', nameMm: 'တောင်ကြီး', lat: 20.7892, lng: 97.0378 },
    myitkyina: { name: '密支那', nameEn: 'Myitkyina', nameMm: 'မြစ်ကြီးနား', lat: 25.3833, lng: 97.4000 },
    pathein: { name: '勃生', nameEn: 'Pathein', nameMm: 'ပုသိမ်', lat: 16.7833, lng: 94.7333 },
    sittwe: { name: '实兑', nameEn: 'Sittwe', nameMm: 'စစ်တွေ', lat: 20.1500, lng: 92.9000 },
    kalay: { name: '葛礼', nameEn: 'Kalay', nameMm: 'ကလေး', lat: 23.1833, lng: 94.0500 },
    monywa: { name: '蒙育瓦', nameEn: 'Monywa', nameMm: 'မုံရွာ', lat: 22.1167, lng: 95.1333 }
  };

  useEffect(() => {
    setIsVisible(true);
    loadPricingSettings();
  }, []);

  // 从系统设置加载价格配置
  const loadPricingSettings = async () => {
    try {
      const settings = await systemSettingsService.getAllSettings();
      const settingsMap: { [key: string]: any } = {};
      settings.forEach(setting => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });
      
      setPricingSettings({
        baseFee: parseFloat(settingsMap['pricing.base_fee']) || 1500,
        perKmFee: parseFloat(settingsMap['pricing.per_km_fee']) || 500,
        weightSurcharge: parseFloat(settingsMap['pricing.weight_surcharge']) || 150,
        urgentSurcharge: parseFloat(settingsMap['pricing.urgent_surcharge']) || 500,
        oversizeSurcharge: parseFloat(settingsMap['pricing.oversize_surcharge']) || 300,
        scheduledSurcharge: parseFloat(settingsMap['pricing.scheduled_surcharge']) || 200,
        fragileSurcharge: parseFloat(settingsMap['pricing.fragile_surcharge']) || 400,
        foodBeverageSurcharge: parseFloat(settingsMap['pricing.food_beverage_surcharge']) || 300,
        freeKmThreshold: parseFloat(settingsMap['pricing.free_km_threshold']) || 3
      });
    } catch (error) {
      console.error('加载价格设置失败:', error);
      // 使用默认值
    }
  };

  // 语言切换函数
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
  };

  // 城市切换函数
  const handleCityChange = (cityKey: string) => {
    setSelectedCity(cityKey);
    const city = myanmarCities[cityKey as keyof typeof myanmarCities];
    if (city) {
      setMapCenter({ lat: city.lat, lng: city.lng });
    }
  };

  // 长按处理函数
  const handleLongPress = async (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 根据选择的城市动态调整坐标转换
    const currentCity = myanmarCities[selectedCity as keyof typeof myanmarCities];
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
        const currentCity = myanmarCities[selectedCity as keyof typeof myanmarCities];
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
      const currentCity = myanmarCities[selectedCity as keyof typeof myanmarCities];
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
    } catch (error) {
      console.error(t.errors.qrGenerationFailed, error);
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

  // 生成订单ID
  const generateOrderId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const random1 = Math.floor(Math.random() * 10);
    const random2 = Math.floor(Math.random() * 10);
    
    return `MDY${year}${month}${day}${hour}${minute}${random1}${random2}`;
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
        admin: '管理后台'
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
        phone: '+95 9 123 456 789',
        email: 'info@marketlinkexpress.com'
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
        distanceCalculationFailed: '距离计算失败，使用默认值'
      },
      ui: {
        packageTracking: '包裹跟踪',
        lightningDelivery: '极速配送',
        secureReliable: '安全可靠',
        smartService: '智能服务',
        transparentPricing: '透明定价',
        prepaidPickupFee: '预付取货费',
        scanQrPay: '请扫描二维码支付',
        pickupFee: '取货费',
        paymentQrCode: '支付二维码',
        confirmPayment: '支付完成',
        cancelPayment: '取消',
        packageType: '包裹类型',
        document: '文件',
        standardPackage: '标准件（45x60x15cm）以内',
        overweightPackage: '超重件（10 KG）以上',
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
        priceBreakdown: '价格明细',
        basePrice: '基础费用',
        distanceFee: '距离费用',
        packageTypeFee: '包裹类型',
        weightFee: '重量费用',
        speedFee: '速度费用'
      }
    },
    en: {
      nav: {
        home: 'Home',
        services: 'Services',
        tracking: 'Tracking',
        contact: 'Contact',
        admin: 'Admin'
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
        phone: '+95 9 123 456 789',
        email: 'info@marketlinkexpress.com'
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
        distanceCalculationFailed: 'Distance calculation failed, using default value'
      },
      ui: {
        packageTracking: 'Package Tracking',
        lightningDelivery: 'Lightning Delivery',
        secureReliable: 'Secure & Reliable',
        smartService: 'Smart Service',
        transparentPricing: 'Transparent Pricing',
        prepaidPickupFee: 'Prepaid Pickup Fee',
        scanQrPay: 'Please scan QR code to pay',
        pickupFee: 'pickup fee',
        paymentQrCode: 'Payment QR Code',
        confirmPayment: 'Payment Complete',
        cancelPayment: 'Cancel',
        packageType: 'Package Type',
        document: 'Document',
        standardPackage: 'Standard Package (45x60x15cm)',
        overweightPackage: 'Overweight Package (10 KG+)',
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
        basePrice: 'Base Fee',
        distanceFee: 'Distance Fee',
        packageTypeFee: 'Package Type',
        weightFee: 'Weight Fee',
        speedFee: 'Speed Fee'
      }
    },
    my: {
      nav: {
        home: 'ပင်မ',
        services: 'ဝန်ဆောင်မှု',
        tracking: 'ထုပ်ပိုးခြင်း',
        contact: 'ဆက်သွယ်ရန်',
        admin: 'စီမံခန့်ခွဲမှု'
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
        phone: '+95 9 123 456 789',
        email: 'info@marketlinkexpress.com'
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
        distanceCalculationFailed: 'အကွာအဝေး တွက်ချက်ခြင်း မအောင်မြင်ပါ၊ ပုံသေတန်ဖိုး သုံးပါမည်'
      },
      ui: {
        packageTracking: 'ထုပ်ပိုးခြင်း စောင့်ကြည့်ခြင်း',
        lightningDelivery: 'မြန်ဆန်သော ပို့ဆောင်မှု',
        secureReliable: 'လုံခြုံ ယုံကြည်စိတ်ချရသော',
        smartService: 'ဉာဏ်ရည်တု ဝန်ဆောင်မှု',
        transparentPricing: 'ပွင့်လင်းသော စျေးနှုန်းသတ်မှတ်ခြင်း',
        prepaidPickupFee: 'ကြိုတင်ပေးချေသော လာယူခြင်း ကုန်ကျစရိတ်',
        scanQrPay: 'QR Code ကို စကင်န်ဖတ်ပြီး ပေးချေပါ',
        pickupFee: 'လာယူခြင်း ကုန်ကျစရိတ်',
        paymentQrCode: 'ပေးချေမှု QR Code',
        confirmPayment: 'ပေးချေမှုကို အတည်ပြုပါ',
        cancelPayment: 'ပေးချေမှုကို ပယ်ဖျက်ပါ',
        packageType: 'ထုပ်ပိုးအမျိုးအစား',
        document: 'စာရွက်စာတမ်း',
        standardPackage: 'စံထုပ်ပိုး (45x60x15cm) အတွင်း',
        overweightPackage: 'အလေးချိန်များသော ထုပ်ပိုး (10 KG) အထက်',
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
        priceBreakdown: 'စျေးနှုန်းအသေးစိတ်',
        basePrice: 'အခြေခံအခကြေး',
        distanceFee: 'အကွာအဝေးအခ',
        packageTypeFee: 'ပစ္စည်းအမျိုးအစား',
        weightFee: 'အလေးချိန်အခ',
        speedFee: 'မြန်နှုန်းအခ'
      }
    }
  };

  const t = translations[language as keyof typeof translations];

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

  // 生成缅甸时间格式的包裹ID
  const generateMyanmarPackageId = () => {
    const now = new Date();
    // 缅甸时间 (UTC+6:30)
    const myanmarTime = new Date(now.getTime() + (6.5 * 60 * 60 * 1000));
    
    const year = myanmarTime.getFullYear();
    const month = String(myanmarTime.getMonth() + 1).padStart(2, '0');
    const day = String(myanmarTime.getDate()).padStart(2, '0');
    const hour = String(myanmarTime.getHours()).padStart(2, '0');
    const minute = String(myanmarTime.getMinutes()).padStart(2, '0');
    const random1 = Math.floor(Math.random() * 10);
    const random2 = Math.floor(Math.random() * 10);
    
    return `MDY${year}${month}${day}${hour}${minute}${random1}${random2}`;
  };

  // 计算两个地址之间的距离（使用Google Maps Distance Matrix API）
  const calculateDistance = async (origin: string, destination: string): Promise<number> => {
    console.log('开始计算距离:', { origin, destination });
    
    try {
      if (!window.google || !window.google.maps) {
        console.warn('⚠️ Google Maps API未加载，使用默认距离 5km');
        alert(t.errors.distanceCalculationFailed + '\n' + '使用默认距离: 5 km');
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
      alert(t.errors.distanceCalculationFailed + '\n' + errorMsg + '\n使用默认距离: 5 km');
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
      // 易碎品：固定附加费
      totalPrice += pricingSettings.fragileSurcharge;
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

  // 生成收款二维码
  const generatePaymentQRCode = async (amount: number, orderId: string) => {
    try {
      // 生成支付信息（可以根据实际支付方式调整）
      const paymentInfo = {
        amount: amount,
        currency: 'MMK',
        orderId: orderId,
        merchant: 'ML Express',
        description: '快递费用'
      };
      
      const paymentString = JSON.stringify(paymentInfo);
      const qrDataUrl = await QRCode.toDataURL(paymentString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#2c5282',
          light: '#ffffff'
        }
      });
      
      setPaymentQRCode(qrDataUrl);
    } catch (error) {
      console.error('生成收款二维码失败:', error);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
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
      scheduledTime: scheduledDeliveryTime || null
    };
    
    // 验证必填字段
    if (!orderInfo.senderAddress || !orderInfo.receiverAddress) {
      alert(t.errors.addressRequired || '请填写完整的寄件和收件地址');
      return;
    }
    
    if (!orderInfo.packageType || !orderInfo.weight || !orderInfo.deliverySpeed) {
      alert('请填写完整的包裹信息');
      return;
    }
    
    // 关闭订单表单
    setShowOrderForm(false);
    
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
      const price = calculatePrice(
        orderInfo.packageType,
        orderInfo.weight,
        orderInfo.deliverySpeed,
        distance
      );
      console.log('价格:', price, 'MMK');
      setCalculatedPrice(price);
      
      // 4. 生成临时订单ID
      const tempOrderId = generateMyanmarPackageId();
      console.log('订单ID:', tempOrderId);
      
      // 5. 生成收款二维码
      console.log('生成收款二维码...');
      await generatePaymentQRCode(price, tempOrderId);
      
      // 6. 存储订单信息（包含价格和距离）
      const orderWithPrice = {
        ...orderInfo,
        price: price,
        distance: distance,
        tempOrderId: tempOrderId
      };
      localStorage.setItem('pendingOrder', JSON.stringify(orderWithPrice));
      
      // 7. 显示支付模态框
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
  const Logo = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
    const logoSize = size === 'small' ? '80px' : size === 'large' ? '160px' : '120px';
    
    return (
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          cursor: 'pointer',
          transition: 'opacity 0.3s ease',
          paddingRight: '200px'
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
        
        {/* 公司名称 - 与标题相同大小和样式 */}
        <div style={{
          color: 'white',
          fontSize: size === 'small' ? '1.6rem' : size === 'large' ? '4rem' : '2.2rem',
          fontWeight: '800',
          textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
          background: 'linear-gradient(45deg, #ffffff, #f0f8ff, #e6f3ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-1px',
          lineHeight: '1.1',
          whiteSpace: 'nowrap',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            MARKET LINK
          </div>
          <div style={{
            fontSize: '0.6em', 
            fontStyle: 'italic', 
            fontWeight: '400',
            marginTop: '-0.2em'
          }}>
            EXPRESS
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="homepage" style={{ 
      fontFamily: 'Arial, sans-serif', 
      lineHeight: '1.6',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 页面切换动画背景 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        opacity: isVisible ? 0 : 1,
        transition: 'opacity 0.3s ease-in-out',
        zIndex: 1
      }} />
      {/* 顶部导航栏 */}
      <nav style={{
        position: 'relative',
        zIndex: 10,
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        flexWrap: 'wrap'
      }}>
        <Logo size="small" />
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: window.innerWidth < 768 ? '1rem' : '2rem',
          flexWrap: 'wrap'
        }}>
          <a href="#home" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.home}</a>
          <button onClick={() => handleNavigation('/services')} style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.services}</button>
          <button onClick={() => handleNavigation('/tracking')} style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.tracking}</button>
          <button onClick={() => handleNavigation('/contact')} style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.contact}</button>
          <a href="/admin/login" style={{ 
          color: 'white',
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.admin}</a>
          
          {/* 自定义语言选择器 */}
          <div style={{ position: 'relative' }} data-language-dropdown>
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.5rem',
              borderRadius: '5px',
              fontWeight: 'bold',
              fontSize: window.innerWidth < 768 ? '0.8rem' : '1rem',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '120px',
                justifyContent: 'space-between'
              }}
            >
              <span>{language === 'zh' ? '中文' : language === 'en' ? 'English' : 'မြန်မာ'}</span>
              <span style={{ fontSize: '0.8rem' }}>▼</span>
            </button>
            
            {showLanguageDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '5px',
                marginTop: '2px',
                zIndex: 1000,
                overflow: 'hidden'
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
                      background: 'transparent',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: window.innerWidth < 768 ? '0.8rem' : '1rem',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 英雄区域 */}
      <section id="home" style={{
        position: 'relative',
        zIndex: 5,
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
                color: 'white',
        padding: window.innerWidth < 768 ? '2rem 1rem' : '4rem 2rem',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-in-out',
        textAlign: 'center',
        minHeight: '100vh',
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
          animation: 'float 6s ease-in-out infinite'
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
          animation: 'float 8s ease-in-out infinite reverse'
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
          animation: 'pulse 10s ease-in-out infinite'
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
            onClick={() => setShowOrderForm(true)}
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
            maxWidth: '500px',
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
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <input
                  type="tel"
                  name="senderPhone"
                  placeholder={t.order.senderPhone}
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <div style={{ position: 'relative' }}>
                  <textarea
                    name="senderAddress"
                    placeholder={t.order.senderAddress}
                    required
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      height: '80px',
                      resize: 'vertical',
                      transition: 'border-color 0.3s ease',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(5px)'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMapSelectionType('sender');
                      setShowMapModal(true);
                    }}
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
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <input
                  type="tel"
                  name="receiverPhone"
                  placeholder={t.order.receiverPhone}
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <div style={{ position: 'relative' }}>
                  <textarea
                    name="receiverAddress"
                    placeholder={t.order.receiverAddress}
                    required
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      height: '80px',
                      resize: 'vertical',
                      transition: 'border-color 0.3s ease',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(5px)'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMapSelectionType('receiver');
                      setShowMapModal(true);
                    }}
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
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>{t.order.package}</h3>
                <select
                  name="packageType"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'all 0.3s ease',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    cursor: 'pointer',
                    appearance: 'none',
                    color: '#2c5282',
                    fontWeight: '500',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232c5282' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.7rem center',
                    backgroundSize: '1em',
                    paddingRight: '2.5rem',
                    boxShadow: '0 4px 15px rgba(44, 82, 130, 0.1)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(44, 82, 130, 0.6)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(44, 82, 130, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(44, 82, 130, 0.1)';
                  }}
                >
                  <option value={t.ui.document}>{t.ui.document}</option>
                  <option value={t.ui.standardPackage}>{t.ui.standardPackage}</option>
                  <option value={t.ui.overweightPackage}>{t.ui.overweightPackage}</option>
                  <option value={t.ui.oversizedPackage}>{t.ui.oversizedPackage}</option>
                  <option value={t.ui.fragile}>{t.ui.fragile}</option>
                  <option value={t.ui.foodDrinks}>{t.ui.foodDrinks}</option>
                </select>
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
                    padding: '0.8rem',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'all 0.3s ease',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    cursor: 'pointer',
                    appearance: 'none',
                    color: '#2c5282',
                    fontWeight: '500',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232c5282' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.7rem center',
                    backgroundSize: '1em',
                    paddingRight: '2.5rem',
                    boxShadow: '0 4px 15px rgba(44, 82, 130, 0.1)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(44, 82, 130, 0.6)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(44, 82, 130, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(44, 82, 130, 0.1)';
                  }}
                >
                  <option value="">{t.ui.selectDeliverySpeed}</option>
                  <option value={t.ui.onTimeDelivery}>{t.ui.onTimeDelivery}</option>
                  <option value={t.ui.urgentDelivery}>{t.ui.urgentDelivery}</option>
                  <option value={t.ui.scheduledDelivery}>{t.ui.scheduledDelivery}</option>
                </select>
                
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
                <input
                  type="text"
                  name="weight"
                  placeholder={t.order.packageWeight}
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
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
                  {t.order.submit}
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

            {/* 收款二维码 */}
            <div style={{
              background: '#f8f9fa',
              padding: '1.5rem',
              borderRadius: '10px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '1rem', color: '#2c5282', marginBottom: '1rem', fontWeight: 'bold' }}>
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
            
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'center',
              flexDirection: window.innerWidth < 768 ? 'column' : 'row'
            }}>
              <button
                onClick={async () => {
                  setShowPaymentModal(false);
                  
                  // 获取存储的订单信息
                  const pendingOrder = localStorage.getItem('pendingOrder');
                  if (!pendingOrder) {
                    alert(t.errors.orderInfoLost);
                    return;
                  }
                  
                  const orderInfo = JSON.parse(pendingOrder);
                  const packageId = generateMyanmarPackageId();
                  
                  // 创建包裹数据 - 使用数据库字段名
                  const packageData = {
                    id: packageId,
                    sender_name: orderInfo.senderName,
                    sender_phone: orderInfo.senderPhone,
                    sender_address: orderInfo.senderAddress,
                    receiver_name: orderInfo.receiverName,
                    receiver_phone: orderInfo.receiverPhone,
                    receiver_address: orderInfo.receiverAddress,
                    package_type: orderInfo.packageType,
                    weight: orderInfo.weight,
                    delivery_speed: orderInfo.deliverySpeed,
                    scheduled_delivery_time: orderInfo.scheduledTime || null,
                    delivery_distance: orderInfo.distance || deliveryDistance,
                    status: '待取件',
                    create_time: new Date().toLocaleString('zh-CN'),
                    pickup_time: '',
                    delivery_time: '',
                    courier: '待分配',
                    price: `${orderInfo.price || calculatedPrice} MMK`
                  };
                  
                  // 保存到数据库
                  console.log('准备保存包裹数据:', packageData);
                  const result = await packageService.createPackage(packageData);
                  
                  if (result) {
                    // 自动保存客户信息到用户管理
                    await saveCustomerToUsers(orderInfo);
                    
                    // 清除临时订单信息
                    localStorage.removeItem('pendingOrder');
                    
                    // 生成订单ID和二维码
                    const orderId = generateOrderId();
                    setGeneratedOrderId(orderId);
                    await generateQRCode(orderId);
                    
                    // 关闭支付模态框，显示订单成功模态框
                    setShowPaymentModal(false);
                    setShowOrderSuccessModal(true);
                  } else {
                    console.error('包裹创建失败，检查控制台获取详细错误信息');
                    alert('包裹创建失败，请检查网络连接或联系客服。\n错误信息已记录在控制台。');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                    color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  width: window.innerWidth < 768 ? '100%' : 'auto',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                }}
              >
                {t.ui.confirmPayment}
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
                color: '#A5C7FF',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                🎉 订单创建成功！
              </h2>
              <button
                onClick={() => setShowOrderSuccessModal(false)}
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

            {/* 订单信息 */}
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
                订单信息
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
                  订单号: {generatedOrderId}
                </p>
                <p style={{
                  margin: 0,
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  订单已发送给客户，我们会在1小时内联系您取件
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
                订单二维码
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
                快递员将扫描此二维码进行取件<br/>
                请妥善保管此二维码
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
                  gap: '0.5rem'
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
                    下载中...
                  </>
                ) : (
                  <>
                    📥 下载二维码
                  </>
                )}
              </button>
              <button
                onClick={() => setShowOrderSuccessModal(false)}
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
                  {Object.entries(myanmarCities).map(([key, city]) => (
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
                        // 地图加载完成后的提示
                        console.log('地图加载完成，可以开始定位');
                        
                        // 添加地图POI点击事件监听
                        map.addListener('click', async (e: any) => {
                          if (e.placeId) {
                            // 阻止默认行为（打开信息窗口）
                            e.stop();
                            
                            // 获取POI的详细信息
                            const service = new window.google.maps.places.PlacesService(map);
                            service.getDetails(
                              { placeId: e.placeId, fields: ['name', 'formatted_address', 'geometry'] },
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
                                }
                              }
                            );
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
                              const currentCity = myanmarCities[selectedCity as keyof typeof myanmarCities];
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
                            const currentCity = myanmarCities[selectedCity as keyof typeof myanmarCities];
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
                {mapClickPosition && (
                        <Marker
                          position={{ lat: mapClickPosition.lat, lng: mapClickPosition.lng }}
                          title="选择的位置"
                          icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="8" fill="#38a169" stroke="white" stroke-width="2"/>
                                <circle cx="12" cy="12" r="3" fill="white"/>
                              </svg>
                            `),
                            scaledSize: new window.google.maps.Size(32, 32),
                            anchor: new window.google.maps.Point(16, 16)
                          }}
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
                {t.order.mapTip}
              </div>
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
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
              />
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
                    
                    // 将地址填入对应的表单字段
                    const targetField = mapSelectionType === 'sender' ? 
                      document.querySelector('textarea[name="senderAddress"]') as HTMLTextAreaElement :
                      document.querySelector('textarea[name="receiverAddress"]') as HTMLTextAreaElement;
                    
                    if (targetField) {
                      targetField.value = completeAddress;
                      // 添加视觉反馈
                      targetField.style.borderColor = '#38a169';
                      targetField.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
                      
                      // 短暂显示成功提示
                      setTimeout(() => {
                        targetField.style.borderColor = '#e2e8f0';
                        targetField.style.boxShadow = 'none';
                      }, 2000);
                    }
                    
                    // 显示成功消息
                    alert(`✅ 地址已成功填入${mapSelectionType === 'sender' ? '寄件' : '收件'}地址字段！\n\n📍 ${completeAddress}`);
                    
                    // 清理状态并关闭模态窗口
                    setMapClickPosition(null);
                    setSelectedLocation(null);
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
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
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
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
            borderRadius: '20px',
            width: window.innerWidth < 768 ? '90%' : '400px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🕐</div>
              <h2 style={{ color: 'white', margin: 0 }}>
                {t.ui.selectDeliveryTime}
              </h2>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                color: 'white', 
                display: 'block', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                {t.ui.selectDate}
              </label>
              <input
                type="date"
                id="delivery-date"
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#2c5282',
                  fontWeight: '500'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                color: 'white', 
                display: 'block', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                {t.ui.selectTime}
              </label>
              <input
                type="time"
                id="delivery-time"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#2c5282',
                  fontWeight: '500'
                }}
              />
            </div>

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
                  padding: '0.8rem 1.5rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  flex: 1
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {t.ui.confirmTime}
              </button>
              
              <button
                onClick={() => {
                  setShowTimePickerModal(false);
                  setSelectedDeliverySpeed('');
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '2px solid white',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  flex: 1
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                {t.ui.cancel}
              </button>
            </div>
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
