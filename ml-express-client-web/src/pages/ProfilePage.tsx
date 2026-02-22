import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageService, supabase, merchantService, Product, DeliveryStore, deliveryStoreService, rechargeService, reviewService, StoreReview } from '../services/supabase';
import QRCode from 'qrcode';
import LoggerService from '../services/LoggerService';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';

// 注入样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spinner {
      animation: spin 1s linear infinite;
    }
  `;
  document.head.appendChild(style);
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t: allT } = useLanguage();
  const t = allT.profile;
  const [isVisible, setIsVisible] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0); // 🚀 新增：余额状态
  const [showRechargeModal, setShowRechargeModal] = useState(false); // 🚀 新增：充值模态框
  const [rechargeAmount, setRechargeAmount] = useState(''); // 🚀 新增：充值金额
  const [showPaymentQRModal, setShowPaymentQRModal] = useState(false); // 🚀 新增：支付二维码模态框
  const [selectedRechargeAmount, setSelectedRechargeAmount] = useState<number | null>(null);
  const [rechargeProof, setRechargeProof] = useState<File | null>(null);
  const [rechargeProofPreview, setRechargeProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userPackages, setUserPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [packagesPerPage] = useState(5); // 每页显示5个包裹
  const [selectedPackage, setSelectedPackage] = useState<any>(null); // 选中的包裹详情
  const [showPackageDetailModal, setShowPackageDetailModal] = useState(false); // 显示包裹详情模态框
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(false); // 显示寄件码模态框
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>(''); // 二维码数据URL
  const [isPartnerStore, setIsPartnerStore] = useState(false); // 是否是合伙店铺账户
  const [showPackingModal, setShowPackingModal] = useState(false); // 🚀 新增：显示打包模态框
  const [showPackingListModal, setShowPackingListModal] = useState(false); // 🚀 新增：显示待打包订单列表模态框
  const [showPendingAcceptListModal, setShowPendingAcceptListModal] = useState(false); // 🚀 新增：显示待接单订单列表模态框
  const [packingOrderData, setPackingOrderData] = useState<any>(null); // 🚀 新增：打包订单数据
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({}); // 🚀 新增：打包清单选中项
  const [showPasswordModal, setShowPasswordModal] = useState(false); // 显示密码修改模态框
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }); // 密码修改表单
  const [storeInfo, setStoreInfo] = useState<any>(null); // 合伙店铺信息
  const [merchantCODStats, setMerchantCODStats] = useState({
    totalCOD: 0,
    unclearedCOD: 0,
    unclearedCount: 0,
    settledCOD: 0,
    lastSettledAt: null as string | null,
  }); // 合伙店铺代收款统计
  const [lastOrderCheckTime, setLastOrderCheckTime] = useState<number>(Date.now()); // 🚀 新增：上次订单检测时间
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false); // 🚀 新增：是否开启语音提醒
  const [pendingMerchantOrdersCount, setPendingMerchantOrdersCount] = useState(0); // 🚀 新增：待处理订单数
  
  // 🚀 新增：评价管理状态
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // 🚀 新增：客户评价提交状态
  const [showReviewSubmitModal, setShowReviewSubmitModal] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isUploadingReviewImage, setIsUploadingReviewImage] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const reviewImageInputRef = useRef<HTMLInputElement>(null);

  const lastBroadcastCountRef = useRef<number>(0); // 🚀 新增：上次播报的订单数
  const lastVoiceTimeRef = useRef<number>(0); // 🚀 新增：上次播报的时间
  const voiceActivationRef = useRef<HTMLAudioElement | null>(null); // 🚀 新增：用于激活音频上下文的引用

  // 🚀 新增：语音播报函数
  const speakNotification = (text: string) => {
    if ('speechSynthesis' in window) {
      // 停止当前的，防止堆叠
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
      lastVoiceTimeRef.current = Date.now();
      console.log('🗣️ 正在播报:', text);
    }
  };

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showCODOrdersModal, setShowCODOrdersModal] = useState(false);
  const [codOrders, setCodOrders] = useState<Array<{orderId: string, codAmount: number, deliveryTime?: string}>>([]);
  const [codModalTitle, setCodModalTitle] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  // 🚀 新增：店铺商品管理状态
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showAddEditProductModal, setShowAddEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    discount_percent: '',
    stock: '-1',
    image_url: '',
    is_available: true
  });
  const [isUploading, setIsUploading] = useState(false);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  // 🚀 新增：店铺营业状态临时状态（用于保存前修改）
  const [businessStatus, setBusinessStatus] = useState({
    is_closed_today: false,
    operating_hours: '09:00 - 21:00'
  });

  // 🚀 24小时时间解析助手
  const parseTimeParts = (timeStr: string, defaultTime: string) => {
    try {
      if (!timeStr) return defaultTime.split(':');
      const parts = timeStr.trim().split(':');
      if (parts.length < 2) return defaultTime.split(':');
      return [parts[0].padStart(2, '0'), parts[1].padStart(2, '0')];
    } catch (e) {
      return defaultTime.split(':');
    }
  };

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  // 🚀 新增：店铺商品管理逻辑
  const loadProducts = async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingProducts(true);
      const data = await merchantService.getStoreProducts(currentUser.id);
      setProducts(data);
    } catch (error) {
      LoggerService.error('加载商品失败:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: '',
      discount_percent: '',
      stock: '-1',
      image_url: '',
      is_available: true
    });
    setShowAddEditProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    
    // 计算优惠百分比
    let discountPercent = '';
    if (product.original_price && product.original_price > product.price) {
      discountPercent = Math.round((1 - product.price / product.original_price) * 100).toString();
    }

    setProductForm({
      name: product.name,
      price: product.price.toString(),
      discount_percent: discountPercent,
      stock: product.stock.toString(),
      image_url: product.image_url || '',
      is_available: product.is_available
    });
    setShowAddEditProductModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    try {
      setIsUploading(true);
      const url = await merchantService.uploadProductImage(currentUser.id, file);
      if (url) {
        setProductForm(prev => ({ ...prev, image_url: url }));
      }
    } catch (error) {
      LoggerService.error('图片上传失败:', error);
      alert('图片上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price || !currentUser?.id) {
      alert('请填写必要信息');
      return;
    }

    try {
      setLoadingProducts(true);
      
      const price = parseFloat(productForm.price);
      const discountPercent = parseFloat(productForm.discount_percent);
      let originalPrice = undefined;
      
      if (!isNaN(discountPercent) && discountPercent > 0 && discountPercent < 100) {
        originalPrice = Math.round(price / (1 - discountPercent / 100));
      }

      const productData = {
        store_id: currentUser.id,
        name: productForm.name,
        price: price,
        original_price: originalPrice,
        stock: parseInt(productForm.stock),
        image_url: productForm.image_url,
        is_available: productForm.is_available,
        description: ''
      };

      let result;
      if (editingProduct) {
        result = await merchantService.updateProduct(editingProduct.id, productData);
      } else {
        result = await merchantService.addProduct(productData);
      }

      if (result.success) {
        setShowAddEditProductModal(false);
        await loadProducts();
      } else {
        alert('保存失败，请重试');
      }
    } catch (error) {
      LoggerService.error('保存商品失败:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('确定要删除这个商品吗？')) return;

    try {
      setLoadingProducts(true);
      const result = await merchantService.deleteProduct(productId);
      if (result.success) {
        await loadProducts();
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      LoggerService.error('删除商品失败:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const result = await merchantService.updateProduct(product.id, { 
        is_available: !product.is_available 
      });
      if (result.success) {
        await loadProducts();
      }
    } catch (error) {
      LoggerService.error('更新状态失败:', error);
    }
  };

  // 🚀 新增：更新店铺营业状态
  const handleUpdateStoreStatus = async (updates: Partial<DeliveryStore>) => {
    if (!storeInfo?.id) return;
    try {
      const result = await deliveryStoreService.updateStoreInfo(storeInfo.id, updates);
      if (result.success) {
        setStoreInfo((prev: any) => ({ ...prev, ...result.data }));
        // 🚀 优化：根据状态显示不同的通知
        if (updates.is_closed_today !== undefined) {
          alert(updates.is_closed_today 
            ? (language === 'zh' ? '今日暂停服务已开启' : language === 'en' ? 'Service suspended today' : 'ယနေ့ ဝန်ဆောင်မှု ရပ်နားထားပါသည်')
            : (language === 'zh' ? '营业状态已恢复' : language === 'en' ? 'Business resumed' : 'လုပ်ငန်း ပြန်လည်စတင်ပါပြီ')
          );
        } else {
          alert(language === 'zh' ? '营业时间设置成功' : language === 'en' ? 'Operating hours set successfully' : 'ဖွင့်လှစ်ချိန် သတ်မှတ်မှု အောင်မြင်ပါသည်');
        }
      }
    } catch (error) {
      LoggerService.error('更新营业状态失败:', error);
    }
  };

  // 检查用户是否是合伙店铺账户
  // 注意：合伙店铺账号只能在admin web中注册，客户端web注册的账号都是普通客户账号
  // 判断逻辑：
  // 1. 如果 user_type === 'merchant'，直接返回 true
  // 2. 如果用户有 store_code 或 store_id，返回 true
  // 3. 否则检查用户的邮箱或手机号是否在 delivery_stores 表中
  const checkIfPartnerStore = useCallback(async (user: any) => {
    if (!user) return false;
    
    // 方法1: 检查 user_type
    if (user.user_type === 'merchant') {
      return true;
    }
    
    // 方法2: 检查是否有 store_code 或 store_id
    if (user.store_code || user.store_id) {
      return true;
    }
    
    try {
      // 方法3: 构建查询条件，检查用户的邮箱或手机号是否在 delivery_stores 表中
      const conditions: string[] = [];
      if (user.email) {
        conditions.push(`email.eq.${user.email}`);
      }
      if (user.phone) {
        conditions.push(`phone.eq.${user.phone}`);
      }
      
      // 如果没有邮箱和手机号，无法判断
      if (conditions.length === 0) {
        return false;
      }
      
      // 检查用户的邮箱或手机号是否在 delivery_stores 表中
      // 只有admin web中创建的合伙店铺账号才会在delivery_stores表中有记录
      const { data, error } = await supabase
        .from('delivery_stores')
        .select('id')
        .or(conditions.join(','))
        .limit(1);
      
      if (error) {
        LoggerService.error('检查合伙店铺失败:', error);
        return false;
      }
      
      // 如果找到匹配的记录，说明是合伙店铺账号（在admin web中注册的）
      return data && data.length > 0;
    } catch (error) {
      LoggerService.error('检查合伙店铺异常:', error);
      return false;
    }
  }, []);

  // 从本地存储加载用户信息
  const loadUserFromStorage = useCallback(async () => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setUserBalance(user.balance || 0); // 🚀 获取余额

        // 🚀 实时从数据库同步最新余额和用户信息
        if (user.id) {
          try {
            const { data: latestUser } = await supabase
              .from('users')
              .select('balance, user_type')
              .eq('id', user.id)
              .maybeSingle();
            
            if (latestUser) {
              setUserBalance(latestUser.balance || 0);
              // 如果需要，这里可以更新 localStorage
            }
          } catch (error) {
            console.warn('获取最新余额失败');
          }
        }
        
        // 检查是否是合伙店铺账户
        const isPartner = await checkIfPartnerStore(user);
        setIsPartnerStore(isPartner);
        
        // 如果是合伙店铺，加载店铺信息
        if (isPartner && (user.store_code || user.store_id)) {
          try {
            const { data: store, error } = await supabase
              .from('delivery_stores')
              .select('*')
              .eq('store_code', user.store_code || '')
              .or(`id.eq.${user.store_id || ''}`)
              .maybeSingle();
            
            if (!error && store) {
              setStoreInfo(store);
              setBusinessStatus({
                is_closed_today: store.is_closed_today || false,
                operating_hours: store.operating_hours || '09:00 - 21:00'
              });
            }
          } catch (error) {
            LoggerService.error('加载店铺信息失败:', error);
          }
        }
      } catch (error) {
        LoggerService.error('加载用户信息失败:', error);
        setCurrentUser(null);
        setIsPartnerStore(false);
      }
    } else {
      // 如果未登录，重定向到首页
      navigate('/');
    }
  }, [navigate, checkIfPartnerStore]);

  // 加载用户的包裹列表
  const loadUserPackages = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      LoggerService.debug('开始加载用户包裹，用户信息:', {
        email: currentUser.email,
        phone: currentUser.phone,
        name: currentUser.name,
        created_at: currentUser.created_at,
        isPartner: isPartnerStore,
        storeId: currentUser.store_id || currentUser.id
      });
      
      // 传入用户的注册时间作为查询起始时间，避免新用户看到旧手机号的历史订单
      const packages = await packageService.getPackagesByUser(
        currentUser.email,
        currentUser.phone,
        currentUser.created_at, // 传入注册时间
        isPartnerStore ? (currentUser.store_id || currentUser.id) : undefined // 🚀 商家账号同时加载关联订单
      );
      
      LoggerService.debug('查询到的包裹数量:', packages.length);
      LoggerService.debug('包裹列表:', packages);
      
      setUserPackages(packages);
    } catch (error) {
      LoggerService.error('加载包裹列表失败:', error);
      setUserPackages([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    setIsVisible(true);
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  // 加载合伙店铺代收款统计
  const loadPartnerCODStats = useCallback(async () => {
    if (!currentUser || !isPartnerStore) {
      return;
    }

    try {
      const storeName = currentUser.name || storeInfo?.store_name;
      const userId = currentUser.id || storeInfo?.id;
      
      if (userId) {
        const stats = await packageService.getPartnerStats(userId, storeName, selectedMonth);
        setMerchantCODStats(stats);
      }
    } catch (error) {
      LoggerService.error('加载代收款统计失败:', error);
    }
  }, [currentUser, isPartnerStore, storeInfo, selectedMonth]);

  // 🚀 新增：加载店铺评价逻辑
  const loadStoreReviews = useCallback(async () => {
    if (!currentUser?.id || !isPartnerStore) return;
    try {
      setLoadingReviews(true);
      const [reviews, stats] = await Promise.all([
        reviewService.getStoreReviews(currentUser.id),
        reviewService.getStoreReviewStats(currentUser.id)
      ]);
      setStoreReviews(reviews);
      setReviewStats(stats);
    } catch (error) {
      LoggerService.error('加载评价失败:', error);
    } finally {
      setLoadingReviews(false);
    }
  }, [currentUser, isPartnerStore]);

  // 🚀 新增：商家回复评价逻辑
  const handleReplyReview = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      const result = await reviewService.replyToReview(reviewId, replyText);
      if (result.success) {
        alert(language === 'zh' ? '回复成功' : language === 'en' ? 'Reply sent' : 'ပြန်လည်ဖြေကြားပြီးပါပြီ');
        setReplyText('');
        setReplyingToId(null);
        await loadStoreReviews(); // 重新加载
      }
    } catch (error) {
      LoggerService.error('回复失败:', error);
    }
  };

  useEffect(() => {
    loadUserPackages();
    if (isPartnerStore) {
      loadPartnerCODStats();
      loadProducts(); // 🚀 新增：加载店铺商品
      loadStoreReviews(); // 🚀 新增：加载评价
    }
  }, [loadUserPackages, isPartnerStore, loadPartnerCODStats, loadStoreReviews]);

  // 🚀 新增：商家订单实时监控逻辑
  useEffect(() => {
    if (!isPartnerStore || !currentUser?.id) return;

    // 每 15 秒轮询一次新订单
    const timer = setInterval(async () => {
      try {
        const storeId = currentUser.store_id || currentUser.id;
        
        // 🚀 修正：仅查询该商家的“待确认”订单（从商城进来的新订单）
        const { count, error } = await supabase
          .from('packages')
          .select('id', { count: 'exact' })
          .eq('delivery_store_id', storeId)
          .eq('status', '待确认');

        if (!error && count !== null) {
          setPendingMerchantOrdersCount(count);

          // 🚀 核心优化：检测到有待接单订单时，自动开启语音提醒功能
          if (count > 0 && !isVoiceEnabled) {
            console.log('🚨 检测到待确认订单，自动开启语音提醒状态');
            setIsVoiceEnabled(true);
          }

          // 🚀 播报逻辑
          if (count > 0 && isVoiceEnabled) {
            const now = Date.now();
            
            // 情况1：有新订单进来（数量增加）
            if (count > lastBroadcastCountRef.current) {
              console.log('🚨 检测到新待确认订单!', count);
              speakNotification('你有新的订单 请接单');
              // 🚀 核心：自动刷新包裹列表，让新订单“弹出来”显示在卡片里
              loadUserPackages();
            } 
            // 情况2：仍然有待确认订单，且距离上次播报超过 60 秒
            else if (now - lastVoiceTimeRef.current >= 60000) {
              console.log('📢 60秒周期性播报提醒...');
              speakNotification('你有新的订单 请接单');
            }
          } 
          // 🚀 核心逻辑：假如没有了 “待确认” 状态的订单，且之前是开启状态，则语音播报功能自动关闭
          else if (count === 0 && isVoiceEnabled) {
            console.log('✅ 所有订单已处理，自动关闭语音提醒');
            setIsVoiceEnabled(false);
            speakNotification(language === 'zh' ? '订单已全部接单 语音提醒已关闭' : 'All orders accepted, voice alert disabled');
          }
          
          lastBroadcastCountRef.current = count;
        }
      } catch (err) {
        console.error('监控商家订单失败:', err);
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [isPartnerStore, currentUser, isVoiceEnabled, language]);

  // 查看代收款订单
  const handleViewCODOrders = async (settled?: boolean) => {
    if (!currentUser || !isPartnerStore) return;
    
    try {
      const storeName = currentUser.name || storeInfo?.store_name;
      const userId = currentUser.id || storeInfo?.id;
      
      if (userId) {
        // 设置模态框标题
        if (settled === true) {
          setCodModalTitle(language === 'zh' ? '本月已结清订单' : language === 'en' ? 'Monthly Settled Orders' : 'လအလိုက် ငွေရှင်းပြီးသော အော်ဒါများ');
        } else if (settled === false) {
          setCodModalTitle(language === 'zh' ? '待结清订单' : language === 'en' ? 'Uncleared Orders' : 'ရှင်းလင်းရန် စောင့်ဆိုင်းနေသော အော်ဒါများ');
        } else {
          setCodModalTitle(language === 'zh' ? '代收款订单' : language === 'en' ? 'COD Orders' : 'ငွေကောက်ခံရန် အော်商များ');
        }

        // 分页获取第一页
        const { orders } = await packageService.getPartnerCODOrders(userId, storeName, selectedMonth, settled);
        setCodOrders(orders);
        setShowCODOrdersModal(true);
      }
    } catch (error) {
      LoggerService.error('加载代收款订单失败:', error);
      alert('加载订单列表失败');
    }
  };

  // 当包裹列表变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [userPackages.length]);

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    setCurrentUser(null);
    navigate('/');
  };

  // 处理密码修改
  const handlePasswordChange = async () => {
    if (!isPartnerStore || !storeInfo) {
      alert(language === 'zh' ? '只有合伙店铺账户可以修改密码' : 
            language === 'en' ? 'Only merchants store accounts can change password' : 
            'လုပ်ဖော်ကိုင်ဖက်ဆိုင်အကောင့်သာ စကားဝှက်ကို ပြောင်းလဲနိုင်သည်');
      return;
    }

    // 验证输入
    if (!passwordForm.currentPassword) {
      alert(language === 'zh' ? '请输入当前密码' : 
            language === 'en' ? 'Please enter current password' : 
            'လက်ရှိစကားဝှက်ထည့်ပါ');
      return;
    }

    if (!passwordForm.newPassword) {
      alert(language === 'zh' ? '请输入新密码' : 
            language === 'en' ? 'Please enter new password' : 
            'စကားဝှက်အသစ်ထည့်ပါ');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert(language === 'zh' ? '新密码至少需要6位' : 
            language === 'en' ? 'New password must be at least 6 characters' : 
            'စကားဝှက်အသစ်သည် အနည်းဆုံး ၆ လုံးရှိရမည်');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert(language === 'zh' ? '两次输入的密码不一致' : 
            language === 'en' ? 'Passwords do not match' : 
            'စကားဝှက်များ မတူညီပါ');
      return;
    }

    // 验证当前密码
    if (storeInfo.password !== passwordForm.currentPassword) {
      alert(language === 'zh' ? '当前密码错误' : 
            language === 'en' ? 'Current password is incorrect' : 
            'လက်ရှိစကားဝှက် မှားနေပါသည်');
      return;
    }

    try {
      // 更新密码
      const { error } = await supabase
        .from('delivery_stores')
        .update({ password: passwordForm.newPassword })
        .eq('id', storeInfo.id);

      if (error) {
        LoggerService.error('更新密码失败:', error);
        alert(language === 'zh' ? '更新密码失败，请稍后重试' : 
              language === 'en' ? 'Failed to update password, please try again later' : 
              'စကားဝှက် ပြောင်းလဲရန် မအောင်မြင်ပါ');
        return;
      }

      // 更新本地存储的店铺信息
      setStoreInfo({ ...storeInfo, password: passwordForm.newPassword });
      
      // 清空表单并关闭模态框
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordModal(false);
      
      alert(language === 'zh' ? '密码修改成功！' : 
            language === 'en' ? 'Password changed successfully!' : 
            'စကားဝှက် ပြောင်းလဲခြင်း အောင်မြင်ပါသည်!');
    } catch (error) {
      LoggerService.error('更新密码异常:', error);
      alert(language === 'zh' ? '更新密码失败，请稍后重试' : 
            language === 'en' ? 'Failed to update password, please try again later' : 
            'စကားဝှက် ပြောင်းလဲရန် မအောင်မြင်ပါ');
    }
  };

  // 🚀 新增：客户评价相关逻辑
  const handleOpenReviewModal = (pkg: any) => {
    setReviewOrder(pkg);
    setReviewRating(5);
    setReviewComment('');
    setReviewImages([]);
    setShowReviewSubmitModal(true);
  };

  const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser?.id) return;

    try {
      setIsUploadingReviewImage(true);
      const uploadPromises = Array.from(files).map(file => 
        reviewService.uploadReviewImage(currentUser.id, file)
      );
      
      const urls = await Promise.all(uploadPromises);
      const validUrls = urls.filter((url): url is string => url !== null);
      
      setReviewImages(prev => [...prev, ...validUrls].slice(0, 6)); // 最多6张
    } catch (error) {
      LoggerService.error('上传评价图片失败:', error);
    } finally {
      setIsUploadingReviewImage(false);
    }
  };

  const handleRemoveReviewImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (!reviewOrder || !currentUser?.id) return;
    if (!reviewComment.trim()) {
      alert(language === 'zh' ? '请输入评价内容' : 'Please enter review comment');
      return;
    }

    try {
      setIsSubmittingReview(true);
      const reviewData = {
        store_id: reviewOrder.delivery_store_id || '00000000-0000-0000-0000-000000000000', // 使用 UUID 格式的零值作为 fallback
        order_id: reviewOrder.id,
        user_id: currentUser.id,
        user_name: currentUser.name || 'User',
        rating: reviewRating,
        comment: reviewComment,
        images: reviewImages,
        is_anonymous: false
      };

      const result = await reviewService.createReview(reviewData);
      if (result.success) {
        alert(language === 'zh' ? '评价提交成功！感谢您的反馈。' : 'Review submitted! Thank you.');
        setShowReviewSubmitModal(false);
        // 刷新包裹列表以更新状态（如果需要显示已评价标签）
        await loadUserPackages();
      } else {
        throw new Error('Submit failed');
      }
    } catch (error) {
      LoggerService.error('提交评价失败:', error);
      alert(language === 'zh' ? '提交失败，请重试' : 'Submission failed, please try again');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // 🚀 新增：商家接单功能
  const handleAcceptOrder = async (targetPkg?: any) => {
    const pkgToAccept = targetPkg || selectedPackage;
    if (!pkgToAccept?.id) return;
    
    try {
      setLoading(true);
      
      // 检查当前状态是否是待确认
      if (pkgToAccept.status !== '待确认') {
        alert(language === 'zh' ? '该订单状态已变更，无法接单' : 'Order status has changed, cannot accept');
        return;
      }

      // 更新状态为“打包中”
      const success = await packageService.updatePackageStatus(pkgToAccept.id, '打包中');
      
      if (success) {
        alert(language === 'zh' ? '接单成功！请开始打包商品。' : 'Order accepted! Please start packing the items.');
        // 刷新本地数据
        const updatedPackage = { ...pkgToAccept, status: '打包中' };
        if (!targetPkg) setSelectedPackage(updatedPackage);
        setUserPackages(prev => prev.map(p => p.id === pkgToAccept.id ? updatedPackage : p));
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      LoggerService.error('接单失败:', error);
      alert(language === 'zh' ? '接单失败，请重试' : 'Accept failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 新增：商家取消订单功能（商品卖完时）
  const handleCancelOrder = async (pkg: any) => {
    if (!pkg?.id) return;
    
    const confirmMsg = language === 'zh' 
      ? '确定要取消此订单吗？（此操作不可逆，通常用于商品已售罄的情况）' 
      : language === 'en' 
      ? 'Are you sure you want to cancel this order? (This action is irreversible, typically used when items are sold out)' 
      : 'ဤအော်ဒါကို ပယ်ဖျက်ရန် သေချာပါသလား? (ပစ္စည်းပြတ်လပ်သွားသောအခါတွင် အသုံးပြုရန်)';
      
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      
      // 更新状态为“已取消”
      const success = await packageService.updatePackageStatus(pkg.id, '已取消');
      
      if (success) {
        alert(language === 'zh' ? '订单已成功取消' : language === 'en' ? 'Order cancelled successfully' : 'အော်ဒါကို ပယ်ဖျက်ပြီးပါပြီ');
        // 刷新本地数据
        const updatedPackage = { ...pkg, status: '已取消' };
        setUserPackages(prev => prev.map(p => p.id === pkg.id ? updatedPackage : p));
      } else {
        throw new Error('Cancel failed');
      }
    } catch (error) {
      LoggerService.error('取消订单失败:', error);
      alert(language === 'zh' ? '操作失败，请重试' : 'Operation failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 新增：开始打包功能
  const handleStartPacking = (pkg: any) => {
    setPackingOrderData(pkg);
    setCheckedItems({});
    setShowPackingModal(true);
    setShowPackageDetailModal(false);
  };

  // 🚀 新增：切换打包项勾选状态
  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // 🚀 新增：完成打包逻辑
  const handleCompletePacking = async () => {
    if (!packingOrderData) return;

    try {
      setLoading(true);
      
      // 确定新的状态：如果已支付（如 VIP 余额支付）则进入待取件，否则进入待收款
      // 实际上对于商家，统称为“待取件”或“待收款”，我们这里统一逻辑
      const isPaid = packingOrderData.payment_method === 'balance' || packingOrderData.payment_status === 'paid';
      const nextStatus = isPaid ? '待取件' : '待收款';
      
      const success = await packageService.updatePackageStatus(packingOrderData.id, nextStatus);
      
      if (success) {
        alert(language === 'zh' ? '打包完成！快递员将很快上门取件。' : 'Packing complete! Courier will arrive soon.');
        setShowPackingModal(false);
        setPackingOrderData(null);
        // 刷新本地列表
        setUserPackages(prev => prev.map(p => p.id === packingOrderData.id ? { ...p, status: nextStatus } : p));
      } else {
        throw new Error('Status update failed');
      }
    } catch (error) {
      LoggerService.error('打包完成更新失败:', error);
      alert(language === 'zh' ? '提交失败，请重试' : 'Submission failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  // 语言切换函数
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
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

  // 如果未登录，不显示内容
  if (!currentUser) {
    return null;
  }

  // 获取店铺类型文本
  const getStoreTypeLabel = (type: string) => {
    const typeMap: { [key: string]: { zh: string; en: string; my: string } } = {
      restaurant: { zh: '餐厅', en: 'Restaurant', my: 'စားသောက်ဆိုင်' },
      tea_shop: { zh: '茶馆', en: 'Tea Shop', my: 'လက်ဖက်ရည်ဆိုင်' },
      drinks_snacks: { zh: '饮料小吃', en: 'Drinks & Snacks', my: 'အချိုရည်နှင့်မုန့်' },
      grocery: { zh: '杂货店', en: 'Grocery', my: 'ကုန်စုံဆိုင်' },
      transit_station: { zh: '中转站', en: 'Transit Station', my: 'သယ်ယူပို့ဆောင်ရေးစခန်း' }
    };
    const labels = typeMap[type] || { zh: type, en: type, my: type };
    return language === 'zh' ? labels.zh : language === 'en' ? labels.en : labels.my;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'my-MM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: string } = {
      '待确认': '#fbbf24', // 🚀 琥珀色
      '打包中': '#10b981', // 🚀 绿色
      '待取件': '#f59e0b',
      '已取件': '#3b82f6',
      '运输中': '#8b5cf6',
      '已送达': '#10b981',
      '待收款': '#ef4444',
      '已取消': '#94a3b8', // 🚀 灰色
      '已完成': '#6b7280'
    };
    return statusMap[status] || '#6b7280';
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    if (status === '待收款') return language === 'zh' ? '待取件' : language === 'en' ? 'Pending Pickup' : 'ကောက်ယူရန်စောင့်ဆိုင်းနေသည်';
    if (status === '待确认') return language === 'zh' ? '待接单' : language === 'en' ? 'Pending Accept' : 'လက်ခံရန်စောင့်ဆိုင်းနေသည်';
    if (status === '打包中') return language === 'zh' ? '打包中' : language === 'en' ? 'Packing' : 'ထုပ်ပိုးနေသည်';
    if (status === '已取消') return language === 'zh' ? '已取消' : language === 'en' ? 'Cancelled' : 'ပယ်ဖျက်လိုက်သည်';
    return status;
  };

  // 获取支付方式文本
  const getPaymentMethodText = (paymentMethod?: string) => {
    if (paymentMethod === 'qr') {
      return language === 'zh' ? '转账' : language === 'en' ? 'Transfer' : 'ငွေလွှဲ';
    } else if (paymentMethod === 'cash') {
      return language === 'zh' ? '现金支付' : language === 'en' ? 'Cash' : 'ငွေသား';
    } else if (paymentMethod === 'balance') {
      return language === 'zh' ? '余额支付' : language === 'en' ? 'Balance' : 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း';
    }
    return language === 'zh' ? '未知' : language === 'en' ? 'Unknown' : 'မသိရှိရ';
  };

  // 获取支付方式颜色
  const getPaymentMethodColor = (paymentMethod?: string) => {
    if (paymentMethod === 'qr') {
      return 'rgba(34, 197, 94, 0.3)'; // 绿色
    } else if (paymentMethod === 'cash') {
      return 'rgba(251, 191, 36, 0.3)'; // 黄色
    } else if (paymentMethod === 'balance') {
      return 'rgba(59, 130, 246, 0.3)'; // 蓝色
    }
    return 'rgba(156, 163, 175, 0.3)'; // 灰色
  };

  // 获取支付方式边框颜色
  const getPaymentMethodBorderColor = (paymentMethod?: string) => {
    if (paymentMethod === 'qr') {
      return 'rgba(34, 197, 94, 0.5)';
    } else if (paymentMethod === 'cash') {
      return 'rgba(251, 191, 36, 0.5)';
    } else if (paymentMethod === 'balance') {
      return 'rgba(59, 130, 246, 0.5)';
    }
    return 'rgba(156, 163, 175, 0.5)';
  };

  // 计算订单统计
  const orderStats = {
    total: userPackages.length,
    pendingConfirmation: userPackages.filter(pkg => pkg.status === '待确认').length, // 🚀 待确认
    packing: userPackages.filter(pkg => pkg.status === '打包中').length, // 🚀 打包中
    pendingPickup: userPackages.filter(pkg => pkg.status === '待取件' || pkg.status === '待收款').length,
    inTransit: userPackages.filter(pkg => pkg.status === '运输中' || pkg.status === '已取件').length,
    completed: userPackages.filter(pkg => pkg.status === '已送达' || pkg.status === '已完成').length
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
      LoggerService.error('生成二维码失败:', error);
    }
  };

  // 显示寄件码
  const showPickupCode = async (pkg: any) => {
    await generateQRCode(pkg.id);
    setShowPickupCodeModal(true);
  };

  // 关闭寄件码模态框
  const closePickupCodeModal = () => {
    setShowPickupCodeModal(false);
    setQrCodeDataUrl('');
  };

  // 保存二维码
  const saveQRCode = () => {
    if (qrCodeDataUrl && selectedPackage) {
      const link = document.createElement('a');
      link.download = `寄件码_${selectedPackage.id}.png`;
      link.href = qrCodeDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 🚀 新增：处理充值逻辑
  // 🚀 核心优化：充值流程
  const handleOpenPaymentQR = () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(language === 'zh' ? '请输入有效的充值金额' : 'Please enter a valid amount');
      return;
    }
    setSelectedRechargeAmount(amount);
    setShowRechargeModal(false);
    setShowPaymentQRModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRechargeProof(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRechargeProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmRecharge = async () => {
    if (!selectedRechargeAmount || !currentUser?.id) return;
    if (!rechargeProof) {
      alert(language === 'zh' ? '请上传汇款凭证截图' : 'Please upload payment proof');
      return;
    }

    try {
      setLoading(true);
      
      // 1. 上传图片
      const proofUrl = await rechargeService.uploadProof(currentUser.id, rechargeProof);
      if (!proofUrl) throw new Error('Upload failed');

      // 2. 创建申请记录
      const result = await rechargeService.createRequest({
        user_id: currentUser.id,
        user_name: currentUser.name || 'User',
        amount: selectedRechargeAmount,
        proof_url: proofUrl,
        status: 'pending',
        notes: `Web端充值申请: ${selectedRechargeAmount} MMK`
      });

      if (result.success) {
        alert(language === 'zh' ? '提交成功！管理员审核通过后余额将自动到账。' : 'Submitted! Balance will be updated after admin review.');
        setShowPaymentQRModal(false);
        setRechargeAmount('');
        setRechargeProof(null);
        setRechargeProofPreview(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Recharge failed:', error);
      alert(language === 'zh' ? '提交失败，请稍后重试' : 'Submission failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQRCode = () => {
    const link = document.createElement('a');
    link.href = `/kbz_qr_${selectedRechargeAmount}.png`;
    link.download = `kbz_qr_${selectedRechargeAmount}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      {/* 导航栏 */}
      <NavigationBar
        language={language}
        onLanguageChange={handleLanguageChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        onShowRegisterModal={(isLoginMode) => {
          navigate('/', { state: { showModal: true, isLoginMode } });
        }} 
        
      />

      {/* 主要内容区域 */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* 页面标题 */}
        <div style={{
          textAlign: 'left',
          marginBottom: '2rem',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'all 0.6s ease'
        }}>
          <h1 style={{
            color: 'white',
            fontSize: '1.75rem',
            marginBottom: '0.5rem',
            fontWeight: '700',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {t.title}
          </h1>
        </div>

        {/* 用户信息卡片 - 参考客户端app样式 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease 0.2s'
        }}>
          {/* 用户头像和基本信息 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.15)'
          }}>
            {/* 头像 */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '2rem',
              fontWeight: '700',
              color: '#0284c7',
              flexShrink: 0
            }}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            
            {/* 用户基本信息 */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <div style={{ color: 'white', fontSize: '1.4rem', fontWeight: '700' }}>
                    {currentUser.name || '-'}
                  </div>
                  <div style={{
                    background: isPartnerStore 
                      ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' 
                      : (userBalance > 0 || currentUser.user_type === 'vip' 
                        ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)'
                        : (currentUser.user_type === 'admin' 
                          ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' 
                          : (currentUser.user_type === 'courier' 
                            ? 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' 
                            : 'linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)'))),
                    boxShadow: isPartnerStore 
                      ? '0 4px 15px rgba(14, 165, 233, 0.4)' 
                      : (userBalance > 0 || currentUser.user_type === 'vip'
                        ? '0 4px 15px rgba(251, 191, 36, 0.4)'
                        : (currentUser.user_type === 'admin'
                          ? '0 4px 15px rgba(249, 115, 22, 0.4)'
                          : (currentUser.user_type === 'courier'
                            ? '0 4px 15px rgba(168, 85, 247, 0.4)'
                            : '0 4px 15px rgba(127, 140, 141, 0.4)'))),
                    color: 'white',
                    padding: '0.4rem 1.2rem',
                    borderRadius: '14px',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    border: '1px solid rgba(255,255,255,0.3)',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    {isPartnerStore ? 'MERCHANTS' : (
                      (userBalance > 0 || currentUser.user_type === 'vip') 
                        ? 'VIP'
                        : (currentUser.user_type === 'admin' 
                          ? 'Admin' 
                          : (currentUser.user_type === 'courier' ? 'Courier' : 'MEMBER'))
                    )}
                  </div>
                </div>

                {/* 🚀 新增：余额显示和充值按钮 */}
                {!isPartnerStore && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      background: 'rgba(251, 191, 36, 0.15)',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '14px',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>💰</span>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                          {language === 'zh' ? '账户余额' : language === 'en' ? 'Account Balance' : 'လက်ကျန်ငွေ'}
                        </div>
                        <div style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: '900' }}>
                          {userBalance.toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>MMK</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setShowRechargeModal(true)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '0.8rem 1.8rem',
                        borderRadius: '14px',
                        fontSize: '1rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.5)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
                      }}
                    >
                      {language === 'zh' ? '立即充值' : language === 'en' ? 'Recharge' : 'ငွေဖြည့်မည်'}
                    </button>
                  </div>
                )}
                
                {/* 合伙店铺：修改密码按钮 */}
                {isPartnerStore && (
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '14px',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      whiteSpace: 'nowrap',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>🔐</span>
                    {language === 'zh' ? '安全设置' : language === 'en' ? 'Security' : 'လုံခြုံရေး'}
                  </button>
                )}

                {/* 🚀 新增：我的商品管理按钮 */}
                {isPartnerStore && (
                  <button
                    onClick={() => setShowProductsModal(true)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '14px',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      whiteSpace: 'nowrap',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.6)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>🛍️</span>
                    {t.myProducts}
                  </button>
                )}
              </div>
              
              {isPartnerStore && storeInfo ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
                  gap: '1.25rem',
                  marginTop: '2rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1.75rem',
                  borderRadius: '28px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(15px)',
                  boxShadow: 'inset 0 0 30px rgba(255, 255, 255, 0.03)'
                }}>
                  {/* 第一行：店铺代码, 店铺类型, 电话 */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.6rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '1.25rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'transform 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🆔</div>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.storeCode}</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '800', fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '1px' }}>
                      {storeInfo.store_code}
                    </span>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.6rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '1.25rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🏪</div>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.storeType}</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '1.25rem' }}>
                      {getStoreTypeLabel(storeInfo.store_type)}
                    </span>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.6rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '1.25rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📞</div>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.phone}</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '1.25rem' }}>
                      {storeInfo.manager_phone || currentUser.phone}
                    </span>
                  </div>

                  {/* 第二行：地址, 开户日期 */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.6rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '1.25rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    gridColumn: window.innerWidth < 768 ? '1' : '1 / span 2',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📍</div>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.address}</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem', lineHeight: '1.5' }}>
                      {storeInfo.address}
                    </span>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.6rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '1.25rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🗓️</div>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.accountDate}</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '1.25rem' }}>
                      {formatDate(storeInfo.created_at)}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ fontSize: '1.1rem', opacity: 0.9 }}>📧</span>
                    <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: '1rem', fontWeight: '500' }}>
                      {currentUser.email || '未绑定邮箱'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ fontSize: '1.1rem', opacity: 0.9 }}>📞</span>
                    <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: '1rem', fontWeight: '500' }}>
                      {currentUser.phone || '未绑定电话'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 订单统计卡片 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 
              ? 'repeat(2, 1fr)' 
              : (orderStats.pendingConfirmation > 0 ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)'),
            gap: '1.5rem',
            marginBottom: '3rem'
          }}>
            {/* 全部订单 */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)',
              borderRadius: '24px',
              padding: '1.75rem',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              textAlign: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default',
              boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 12px 25px rgba(59, 130, 246, 0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
            }}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>📦</div>
              <div style={{ color: 'white', fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.25rem', letterSpacing: '-1px' }}>
                {orderStats.total}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {t.totalOrders}
              </div>
            </div>

            {/* 待接单 (仅当有待接单订单时显示) */}
            {orderStats.pendingConfirmation > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)',
                borderRadius: '24px',
                padding: '1.75rem',
                border: '2px solid #fbbf24',
                textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
                animation: 'pulse-border 2s infinite',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => {
                setShowPendingAcceptListModal(true);
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 15px 30px rgba(251, 191, 36, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.3)';
              }}
              >
                <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '1.2rem' }}>🚨</div>
                <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>🔔</div>
                <div style={{ color: '#fbbf24', fontSize: '2.2rem', fontWeight: '950', marginBottom: '0.25rem', letterSpacing: '-1px' }}>
                  {orderStats.pendingConfirmation}
                </div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {t.pendingAccept}
                </div>
              </div>
            )}

            {/* 打包中 (仅限合伙店铺显示) */}
            {isPartnerStore && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
                borderRadius: '24px',
                padding: '1.75rem',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
              }}
              onClick={() => setShowPackingListModal(true)}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 25px rgba(16, 185, 129, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
              }}
              >
                <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>📦</div>
                <div style={{ color: '#10b981', fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.25rem', letterSpacing: '-1px' }}>
                  {orderStats.packing}
                </div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {language === 'zh' ? '打包中' : language === 'en' ? 'Packing' : 'ထုပ်ပိုးနေသည်'}
                </div>
              </div>
            )}

            {/* 待取件 */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)',
              borderRadius: '24px',
              padding: '1.75rem',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              textAlign: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default',
              boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 12px 25px rgba(245, 158, 11, 0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
            }}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>⏳</div>
              <div style={{ color: 'white', fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.25rem', letterSpacing: '-1px' }}>
                {orderStats.pendingPickup}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {t.pendingPickup}
              </div>
            </div>

            {/* 配送中 */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%)',
              borderRadius: '24px',
              padding: '1.75rem',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              textAlign: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default',
              boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 12px 25px rgba(139, 92, 246, 0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
            }}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>🚚</div>
              <div style={{ color: 'white', fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.25rem', letterSpacing: '-1px' }}>
                {orderStats.inTransit}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {t.inTransit}
              </div>
            </div>

            {/* 已完成 */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)',
              borderRadius: '24px',
              padding: '1.75rem',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              textAlign: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default',
              boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 12px 25px rgba(16, 185, 129, 0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
            }}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>✅</div>
              <div style={{ color: 'white', fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.25rem', letterSpacing: '-1px' }}>
                {orderStats.completed}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {t.completed}
              </div>
            </div>

            {/* 🚀 新增：店铺评价 (仅限合伙店铺显示) */}
            {isPartnerStore && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)',
                borderRadius: '24px',
                padding: '1.75rem',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
              }}
              onClick={() => setShowReviewsModal(true)}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 25px rgba(251, 191, 36, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
              }}
              >
                <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>⭐</div>
                <div style={{ color: '#fbbf24', fontSize: '2.2rem', fontWeight: '950', marginBottom: '0.25rem', letterSpacing: '-1px' }}>
                  {reviewStats.average || '0.0'}
                </div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {language === 'zh' ? `${reviewStats.count} 条评价` : language === 'en' ? `${reviewStats.count} Reviews` : `${reviewStats.count} ခု မှတ်ချက်`}
                </div>
              </div>
            )}
          </div>

          {/* 代收款统计卡片 - 仅合伙店铺显示 */}
          {isPartnerStore && storeInfo && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1fr 380px',
              gap: '2rem',
              marginBottom: '3rem'
            }}>
              {/* 左侧：代收款统计 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(30px)',
                borderRadius: '40px',
                padding: '3rem',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '3rem', 
                  flexWrap: 'wrap', 
                  gap: '2rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                  paddingBottom: '2rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      borderRadius: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.2rem',
                      boxShadow: '0 12px 24px rgba(245, 158, 11, 0.4)'
                    }}>💰</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{
                        color: 'white',
                        fontSize: '2.2rem',
                        fontWeight: '950',
                        margin: 0,
                        textShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        letterSpacing: '-0.5px'
                      }}>
                        {t.codStats}
                      </h3>
                      {/* 🚀 修正：上次结算日期 - 非卡片样式 */}
                      <div style={{ 
                        fontSize: '1rem', 
                        color: 'rgba(255,255,255,0.6)', 
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>📅 {t.lastSettledAt}:</span>
                          <span style={{ color: '#10b981' }}>
                            {merchantCODStats.lastSettledAt ? formatDate(merchantCODStats.lastSettledAt) : t.noSettlement}
                          </span>
                        </div>

                        {/* 🚀 新增：语音播报开启按钮 */}
                        <button
                          onClick={() => {
                            if (!isVoiceEnabled) {
                              speakNotification('语音提醒功能已开启');
                              alert(language === 'zh' ? '✅ 语音提醒已开启！当有“待确认”新订单时，系统将自动为您播放播报并刷新列表。' : 'Voice Alert Active! List will auto-refresh on new orders.');
                            }
                            setIsVoiceEnabled(!isVoiceEnabled);
                          }}
                          style={{
                            background: isVoiceEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: isVoiceEnabled ? '#10b981' : 'white',
                            border: `1px solid ${isVoiceEnabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
                            padding: '6px 15px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {isVoiceEnabled ? '🔔' : '🔕'} {isVoiceEnabled ? (language === 'zh' ? '语音监控中' : t.voiceActive) : t.enableVoice}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '10px 24px',
                    borderRadius: '22px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    <button 
                      onClick={handlePrevMonth}
                      style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: 'none',
                        borderRadius: '14px',
                        width: '36px',
                        height: '36px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        zIndex: 10
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                    >‹</button>
                    
                    <div 
                      onClick={() => dateInputRef.current?.showPicker()}
                      style={{ 
                        color: 'white', 
                        fontSize: '1.25rem', 
                        fontWeight: '900', 
                        cursor: 'pointer',
                        minWidth: '120px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        letterSpacing: '1px'
                      }}
                    >
                      {selectedMonth}
                      <input
                        ref={dateInputRef}
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0 }}
                      />
                    </div>

                    <button 
                      onClick={handleNextMonth}
                      style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: 'none',
                        borderRadius: '14px',
                        width: '36px',
                        height: '36px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        zIndex: 10
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                    >›</button>
                  </div>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
                  gap: '2.5rem'
                }}>
                  {/* 本月已结清 */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '2.5rem 2rem',
                    borderRadius: '35px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.4s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', fontWeight: '800' }}>{t.totalCOD}</span>
                    </div>
                    <div style={{ fontSize: '2.8rem', fontWeight: '950', color: 'white', flex: 1 }}>
                      {merchantCODStats.settledCOD.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.6 }}>MMK</span>
                    </div>
                    <button 
                      onClick={() => handleViewCODOrders(true)}
                      style={{ 
                        padding: '10px 20px', 
                        borderRadius: '14px', 
                        background: '#3b82f6', 
                        border: 'none', 
                        color: 'white', 
                        fontSize: '1rem', 
                        fontWeight: '900', 
                        cursor: 'pointer', 
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                        alignSelf: 'stretch',
                        marginTop: '1rem',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >{t.view}</button>
                    <div style={{ position: 'absolute', right: '-15px', bottom: '40px', fontSize: '6rem', opacity: 0.08, transform: 'rotate(-15deg)', pointerEvents: 'none' }}>📈</div>
                  </div>

                  {/* 待结清金额 */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '2.5rem 2rem',
                    borderRadius: '35px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.4s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', fontWeight: '800' }}>{t.unclearedCOD}</span>
                      <div style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: '900', background: 'rgba(251, 191, 36, 0.2)', padding: '4px 14px', borderRadius: '12px' }}>
                        {merchantCODStats.unclearedCount} 笔待结算
                      </div>
                    </div>
                    <div style={{ fontSize: '2.8rem', fontWeight: '950', color: '#fbbf24', flex: 1 }}>
                      {merchantCODStats.unclearedCOD.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.6 }}>MMK</span>
                    </div>
                    <button 
                      onClick={() => handleViewCODOrders(false)}
                      style={{ 
                        padding: '10px 20px', 
                        borderRadius: '14px', 
                        background: '#f59e0b', 
                        border: 'none', 
                        color: 'white', 
                        fontSize: '1rem', 
                        fontWeight: '900', 
                        cursor: 'pointer', 
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                        alignSelf: 'stretch',
                        marginTop: '1rem',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >{t.view}</button>
                    <div style={{ position: 'absolute', right: '-15px', bottom: '40px', fontSize: '6rem', opacity: 0.08, transform: 'rotate(-15deg)', pointerEvents: 'none' }}>⏳</div>
                  </div>

                </div>
              </div>

              {/* 右侧：营业状态管理 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(30px)',
                borderRadius: '40px',
                padding: '3rem 2.5rem',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '2rem' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    borderRadius: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    boxShadow: '0 10px 20px rgba(239, 68, 68, 0.4)'
                  }}>⏰</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '950', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{t.businessManagement}</h3>
                    {storeInfo?.updated_at && (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: '600', marginTop: '4px' }}>
                        ⏱️ {t.lastUpdated}: {new Date(storeInfo.updated_at).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* 今日营业开关 */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.3)',
                    padding: '1.8rem',
                    borderRadius: '30px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ color: 'white', fontWeight: '900', fontSize: '1.2rem', marginBottom: '6px' }}>{t.closedToday}</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: '500', lineHeight: '1.4' }}>开启后用户将看到“休息中”，无法下单</div>
                    </div>
                    
                    {/* 🚀 修正：使用 businessStatus 本地状态，点击后即刻有反应 */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setBusinessStatus(prev => ({ ...prev, is_closed_today: !prev.is_closed_today }));
                      }}
                      style={{
                        width: '68px',
                        height: '36px',
                        borderRadius: '18px',
                        backgroundColor: businessStatus.is_closed_today ? '#ef4444' : 'rgba(255,255,255,0.2)',
                        position: 'relative',
                        cursor: 'pointer',
                        border: '2px solid rgba(255,255,255,0.3)',
                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        padding: 0,
                        zIndex: 100,
                        boxShadow: businessStatus.is_closed_today ? '0 0 15px rgba(239, 68, 68, 0.5)' : 'none'
                      }}
                    >
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '13px',
                        backgroundColor: 'white',
                        position: 'absolute',
                        top: '3px',
                        left: businessStatus.is_closed_today ? '37px' : '3px',
                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                      }} />
                    </button>
                  </div>

                  {/* 营业时间设置 */}
                  <div style={{ 
                    background: 'rgba(15, 23, 42, 0.3)',
                    padding: '2rem',
                    borderRadius: '30px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ color: 'white', fontWeight: '900', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>📝</span> {t.operatingHours}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.openingTime}</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <select 
                            value={parseTimeParts(businessStatus.operating_hours.split(' - ')[0], '09:00')[0]}
                          onChange={(e) => {
                              const [_, oldMin] = parseTimeParts(businessStatus.operating_hours.split(' - ')[0], '00');
                              const end = businessStatus.operating_hours.split(' - ')[1] || '21:00';
                              setBusinessStatus(prev => ({ ...prev, operating_hours: `${e.target.value}:${oldMin} - ${end}` }));
                          }}
                          style={{ 
                              flex: 1,
                            background: 'white', 
                            border: 'none', 
                            borderRadius: '15px', 
                            padding: '12px', 
                            color: '#1e293b', 
                            outline: 'none', 
                            cursor: 'pointer', 
                            fontWeight: '900',
                            fontSize: '1rem',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                              appearance: 'none',
                              textAlign: 'center'
                            }}
                          >
                            {Array.from({ length: 24 }).map((_, i) => (
                              <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                            ))}
                          </select>
                          <span style={{ color: 'white', fontWeight: 'bold', alignSelf: 'center' }}>:</span>
                          <select 
                            value={parseTimeParts(businessStatus.operating_hours.split(' - ')[0], '09:00')[1]}
                            onChange={(e) => {
                              const [oldHour, _] = parseTimeParts(businessStatus.operating_hours.split(' - ')[0], '09:00');
                              const end = businessStatus.operating_hours.split(' - ')[1] || '21:00';
                              setBusinessStatus(prev => ({ ...prev, operating_hours: `${oldHour}:${e.target.value} - ${end}` }));
                            }}
                            style={{ 
                              flex: 1,
                              background: 'white', 
                              border: 'none', 
                              borderRadius: '15px', 
                              padding: '12px', 
                              color: '#1e293b', 
                              outline: 'none', 
                              cursor: 'pointer', 
                              fontWeight: '900',
                              fontSize: '1rem',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                              appearance: 'none',
                              textAlign: 'center'
                            }}
                          >
                            {Array.from({ length: 60 }).map((_, i) => (
                              <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.closingTime}</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <select 
                            value={parseTimeParts(businessStatus.operating_hours.split(' - ')[1], '21:00')[0]}
                          onChange={(e) => {
                              const start = businessStatus.operating_hours.split(' - ')[0] || '09:00';
                              const [_, oldMin] = parseTimeParts(businessStatus.operating_hours.split(' - ')[1], '00');
                              setBusinessStatus(prev => ({ ...prev, operating_hours: `${start} - ${e.target.value}:${oldMin}` }));
                          }}
                          style={{ 
                              flex: 1,
                            background: 'white', 
                            border: 'none', 
                            borderRadius: '15px', 
                            padding: '12px', 
                            color: '#1e293b', 
                            outline: 'none', 
                            cursor: 'pointer', 
                            fontWeight: '900', 
                            fontSize: '1rem',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                              appearance: 'none',
                              textAlign: 'center'
                            }}
                          >
                            {Array.from({ length: 24 }).map((_, i) => (
                              <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                            ))}
                          </select>
                          <span style={{ color: 'white', fontWeight: 'bold', alignSelf: 'center' }}>:</span>
                          <select 
                            value={parseTimeParts(businessStatus.operating_hours.split(' - ')[1], '21:00')[1]}
                            onChange={(e) => {
                              const start = businessStatus.operating_hours.split(' - ')[0] || '09:00';
                              const [oldHour, _] = parseTimeParts(businessStatus.operating_hours.split(' - ')[1], '21:00');
                              setBusinessStatus(prev => ({ ...prev, operating_hours: `${start} - ${oldHour}:${e.target.value}` }));
                            }}
                            style={{ 
                              flex: 1,
                              background: 'white', 
                              border: 'none', 
                              borderRadius: '15px', 
                              padding: '12px', 
                              color: '#1e293b', 
                              outline: 'none', 
                              cursor: 'pointer', 
                              fontWeight: '900',
                              fontSize: '1rem',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                              appearance: 'none',
                              textAlign: 'center'
                            }}
                          >
                            {Array.from({ length: 60 }).map((_, i) => (
                              <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 🚀 新增：保存按钮 */}
                  <button
                    onClick={() => handleUpdateStoreStatus(businessStatus)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '1.2rem',
                      fontSize: '1.2rem',
                      fontWeight: '900',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.8rem',
                      marginTop: '1rem'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 15px 30px rgba(16, 185, 129, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 10px 20px rgba(16, 185, 129, 0.3)';
                    }}
                  >
                    <span>💾</span> {t.save}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 详细信息网格 - 仅非合伙店铺显示 */}
          {!isPartnerStore && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              padding: '1.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
                gap: '1.5rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '1.25rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ fontSize: '1.8rem', background: 'rgba(255,255,255,0.1)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗓️</div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {t.accountDate}
                    </label>
                    <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700' }}>
                      {currentUser.created_at 
                        ? new Date(currentUser.created_at).toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'my-MM', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : '-'}
                    </div>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '1.25rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ fontSize: '1.8rem', background: 'rgba(255,255,255,0.1)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📍</div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {t.address}
                    </label>
                    <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700' }}>
                      {currentUser.address || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 包裹列表 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease 0.4s'
        }}>
          <h2 id="packages-section" style={{
            color: 'white',
            fontSize: '1.5rem',
            marginBottom: '1.5rem',
            borderBottom: '2px solid rgba(255,255,255,0.3)',
            paddingBottom: '0.5rem'
          }}>
            {t.packages}
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'white' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <div>{language === 'zh' ? '加载中...' : language === 'en' ? 'Loading...' : 'ဖွင့်နေသည်...'}</div>
            </div>
          ) : userPackages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'white' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
              <div style={{ fontSize: '1.2rem' }}>{t.noPackages}</div>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gap: '1rem'
              }}>
                {userPackages
                  .slice((currentPage - 1) * packagesPerPage, currentPage * packagesPerPage)
                  .map((pkg: any) => (
                <div
                  key={pkg.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* 顶部：订单号、创建时间、价格、包裹类型 - 一行显示 */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {/* 订单号 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                        {t.packageId}:
                      </span>
                      <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: 'bold' }}>
                        {pkg.id}
                      </span>
                    </div>

                    {/* 分隔符 */}
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>|</span>

                    {/* 创建时间 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                        {t.createTime}:
                      </span>
                      <span style={{ color: 'white', fontSize: '0.95rem' }}>
                        {pkg.create_time || pkg.created_at || '-'}
                      </span>
                    </div>

                    {/* 分隔符 */}
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>|</span>

                    {/* 价格 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                        {t.price}:
                      </span>
                      <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: 'bold' }}>
                        {pkg.price ? `${pkg.price.replace('MMK', '').trim()} MMK` : '-'}
                      </span>
                    </div>

                    {/* 分隔符 */}
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>|</span>

                    {/* 包裹类型 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                        {language === 'zh' ? '包裹类型' : language === 'en' ? 'Package Type' : 'ပက်ကေ့ဂျ်အမျိုးအစား'}:
                      </span>
                      <span style={{ color: 'white', fontSize: '0.95rem' }}>
                        {pkg.package_type || '-'}
                      </span>
                    </div>
                  </div>

                  {/* 状态和支付方式按钮 */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '1rem'
                  }}>
                    {/* 状态按钮 */}
                    <div style={{
                      background: getStatusColor(pkg.status === '待收款' ? '待取件' : pkg.status),
                      color: 'white',
                      padding: '0.4rem 0.9rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>
                      {pkg.status === '待收款' ? getStatusText(pkg.status) : pkg.status}
                    </div>
                    
                    {/* 支付方式按钮 */}
                    {pkg.payment_method && (
                      <div style={{
                        background: getPaymentMethodColor(pkg.payment_method),
                        color: 'white',
                        border: `1px solid ${getPaymentMethodBorderColor(pkg.payment_method)}`,
                        padding: '0.4rem 0.9rem',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}>
                        {getPaymentMethodText(pkg.payment_method)}
                      </div>
                    )}

                    {/* 🚀 新增：商品费用 - 仅限 VIP/普通账号显示 */}
                    {!isPartnerStore && (() => {
                      const itemMatch = pkg.description?.match(/\[(?:商品费用（仅余额支付）|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)): (.*?) MMK\]/);
                      if (itemMatch && itemMatch[1]) {
                        return (
                          <div style={{
                            background: 'rgba(251, 191, 36, 0.2)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            padding: '0.4rem 0.9rem',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                          }}>
                            🛍️ {language === 'zh' ? '商品费用' : language === 'en' ? 'Item Cost' : 'ကုန်ပစ္စည်းဖိုး'}: {itemMatch[1]} MMK ({language === 'zh' ? '余额支付' : language === 'en' ? 'Balance' : 'လက်ကျန်ငွေ'})
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 🚀 修正：代收款 - 仅限商家账号显示 */}
                    {isPartnerStore && (pkg.cod_amount && pkg.cod_amount > 0) && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#fca5a5',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '0.4rem 0.9rem',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}>
                        💰 {t.cod}: {pkg.cod_amount.toLocaleString()} MMK
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    marginTop: '1rem'
                  }}>
                    <button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setShowPackageDetailModal(true);
                      }}
                      style={{
                        background: 'rgba(59, 130, 246, 0.25)',
                        color: 'white',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        padding: '0.5rem 1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        flex: 1,
                        maxWidth: '150px'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.4)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {t.viewDetails}
                    </button>

                    {/* 🚀 新增：评价订单按钮 - 仅限已完成/已送达订单 */}
                    {!isPartnerStore && (pkg.status === '已送达' || pkg.status === '已完成') && (
                      <button
                        onClick={() => handleOpenReviewModal(pkg)}
                        style={{
                          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1.5rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          transition: 'all 0.3s ease',
                          flex: 1,
                          maxWidth: '150px',
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 15px rgba(245, 158, 11, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                        }}
                      >
                        ⭐ {language === 'zh' ? '评价订单' : language === 'en' ? 'Rate Order' : 'မှတ်ချက်ပေးရန်'}
                      </button>
                    )}

                    {/* 🚀 新增：打包中状态显示“开始打包”按钮 */}
                    {isPartnerStore && pkg.status === '打包中' && (
                      <button
                        onClick={() => handleStartPacking(pkg)}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1.5rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '900',
                          transition: 'all 0.3s ease',
                          flex: 1,
                          maxWidth: '150px',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 15px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                        }}
                      >
                        📦 {language === 'zh' ? '开始打包' : language === 'en' ? 'Start Packing' : 'ထုပ်ပိုးရန်စတင်ပါ'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              </div>

              {/* 分页控件 */}
              {userPackages.length > packagesPerPage && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '2rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      background: currentPage === 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(59, 130, 246, 0.5)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                    onMouseOver={(e) => {
                      if (currentPage !== 1) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.7)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (currentPage !== 1) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.5)';
                      }
                    }}
                  >
                    {language === 'zh' ? '上一页' : language === 'en' ? 'Previous' : 'ယခင်စာမျက်နှာ'}
                  </button>

                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                  }}>
                    {Array.from({ length: Math.ceil(userPackages.length / packagesPerPage) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          background: currentPage === page ? 'rgba(59, 130, 246, 0.7)' : 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          border: `1px solid ${currentPage === page ? 'rgba(59, 130, 246, 0.9)' : 'rgba(255, 255, 255, 0.3)'}`,
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: currentPage === page ? 'bold' : 'normal',
                          transition: 'all 0.3s ease',
                          minWidth: '40px'
                        }}
                        onMouseOver={(e) => {
                          if (currentPage !== page) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (currentPage !== page) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(userPackages.length / packagesPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(userPackages.length / packagesPerPage)}
                    style={{
                      background: currentPage === Math.ceil(userPackages.length / packagesPerPage) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(59, 130, 246, 0.5)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: currentPage === Math.ceil(userPackages.length / packagesPerPage) ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      opacity: currentPage === Math.ceil(userPackages.length / packagesPerPage) ? 0.5 : 1
                    }}
                    onMouseOver={(e) => {
                      if (currentPage !== Math.ceil(userPackages.length / packagesPerPage)) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.7)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (currentPage !== Math.ceil(userPackages.length / packagesPerPage)) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.5)';
                      }
                    }}
                  >
                    {language === 'zh' ? '下一页' : language === 'en' ? 'Next' : 'နောက်စာမျက်နှာ'}
                  </button>
                </div>
              )}

              {/* 显示当前页信息 */}
              <div style={{
                textAlign: 'center',
                marginTop: '1rem',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem'
              }}>
                {language === 'zh' 
                  ? `显示第 ${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, userPackages.length)} 条，共 ${userPackages.length} 条`
                  : language === 'en'
                  ? `Showing ${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, userPackages.length)} of ${userPackages.length}`
                  : ((currentPage - 1) * packagesPerPage + 1) + '-' + Math.min(currentPage * packagesPerPage, userPackages.length) + ' ကို ပြသထားသည်၊ စုစုပေါင်း ' + userPackages.length
                }
              </div>
            </>
          )}
        </div>
      </div>

      {/* 包裹详情模态框 */}
      {showPackageDetailModal && selectedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
        onClick={() => setShowPackageDetailModal(false)}
        >
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              borderBottom: '2px solid rgba(255,255,255,0.3)',
              paddingBottom: '1rem'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: '1.5rem',
                margin: 0
              }}>
                {t.packageDetails}
              </h2>
              <button
                onClick={() => setShowPackageDetailModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {t.close}
              </button>
            </div>

            <div style={{
              display: 'grid',
              gap: '1.5rem'
            }}>
              {/* 订单号 */}
              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                  {t.packageId}
                </label>
                <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {selectedPackage.id}
                </div>
              </div>

              {/* 状态 */}
              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                  {t.status}
                </label>
                <div style={{
                  display: 'inline-block',
                  background: getStatusColor(selectedPackage.status === '待收款' ? '待取件' : selectedPackage.status),
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}>
                  {selectedPackage.status === '待收款' ? getStatusText(selectedPackage.status) : selectedPackage.status}
                </div>
              </div>

              {/* 🚀 修正：从描述中解析“余额支付”并显示 */}
              {(() => {
                const payMatch = selectedPackage.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/);
                if (payMatch && payMatch[1]) {
                  return (
                    <div>
                      <label style={{ color: '#10b981', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        {language === 'zh' ? '余额支付' : language === 'en' ? 'Balance Payment' : 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း'}
                      </label>
                      <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: '900' }}>
                        {payMatch[1]} MMK
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* 寄件人信息 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>
                    {t.sender}
                  </h3>
                  {/* 🚀 新增：寄件人卡片中的身份标识 */}
                  {selectedPackage.description?.includes('[下单身份: 商家]') && (
                    <div style={{ 
                      background: 'rgba(59, 130, 246, 0.2)', 
                      color: '#93c5fd', 
                      padding: '4px 12px', 
                      borderRadius: '8px', 
                      fontSize: '0.75rem', 
                      fontWeight: '800',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                      {language === 'zh' ? '下单账号：MERCHANTS' : 'Order Account: MERCHANTS'}
                    </div>
                  )}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
                  gap: '1rem'
                }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                      {t.name}
                    </label>
                    <div style={{ color: 'white', fontSize: '1rem' }}>
                      {selectedPackage.sender_name || '-'}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                      {t.phone}
                    </label>
                    <div style={{ color: 'white', fontSize: '1rem' }}>
                      {selectedPackage.sender_phone || '-'}
                    </div>
                  </div>
                  <div style={{ gridColumn: window.innerWidth < 768 ? '1' : '1 / -1' }}>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                      {t.address}
                    </label>
                    <div style={{ color: 'white', fontSize: '1rem' }}>
                      {selectedPackage.sender_address || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 收件人信息 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>
                    {t.receiver}
                  </h3>
                  {/* 🚀 新增：收件人卡片中的身份标识 */}
                  {selectedPackage.description?.includes('[下单身份: VIP]') && (
                    <div style={{ 
                      background: 'rgba(251, 191, 36, 0.2)', 
                      color: '#fbbf24', 
                      padding: '4px 12px', 
                      borderRadius: '8px', 
                      fontSize: '0.75rem', 
                      fontWeight: '800',
                      border: '1px solid rgba(251, 191, 36, 0.3)'
                    }}>
                      {language === 'zh' ? '下单账号：VIP' : 'Order Account: VIP'}
                    </div>
                  )}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
                  gap: '1rem'
                }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                      {t.name}
                    </label>
                    <div style={{ color: 'white', fontSize: '1rem' }}>
                      {selectedPackage.receiver_name || '-'}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                      {t.phone}
                    </label>
                    <div style={{ color: 'white', fontSize: '1rem' }}>
                      {selectedPackage.receiver_phone || '-'}
                    </div>
                  </div>
                  <div style={{ gridColumn: window.innerWidth < 768 ? '1' : '1 / -1' }}>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                      {t.address}
                    </label>
                    <div style={{ color: 'white', fontSize: '1rem' }}>
                      {selectedPackage.receiver_address || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 包裹信息 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
                gap: '1rem'
              }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                    {language === 'zh' ? '包裹类型' : language === 'en' ? 'Package Type' : 'ပက်ကေ့ဂျ်အမျိုးအစား'}
                  </label>
                  <div style={{ color: 'white', fontSize: '1rem' }}>
                    {selectedPackage.package_type || '-'}
                  </div>
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                    {language === 'zh' ? '重量' : language === 'en' ? 'Weight' : 'အလေးချိန်'}
                  </label>
                  <div style={{ color: 'white', fontSize: '1rem' }}>
                    {selectedPackage.weight || '-'}
                  </div>
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                    {t.price}
                  </label>
                  <div style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>
                    {selectedPackage.price || '-'}
                  </div>
                </div>

                {(isPartnerStore || (selectedPackage.cod_amount && selectedPackage.cod_amount > 0)) && (
                  <>
                    <div>
                      <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                        {language === 'zh' ? '商品费用' : language === 'en' ? 'Item Cost' : 'ကုန်ပစ္စည်းဖိုး'}
                      </label>
                      <div style={{ color: '#fca5a5', fontSize: '1rem', fontWeight: 'bold' }}>
                        {selectedPackage.cod_amount > 0 ? `${selectedPackage.cod_amount} MMK` : t.none}
                      </div>
                    </div>
                    <div>
                      <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                        {t.totalAmount}
                      </label>
                      <div style={{ color: '#93c5fd', fontSize: '1.1rem', fontWeight: 'bold' }}>
                        {(parseFloat(selectedPackage.price?.replace(/[^\d.]/g, '') || '0') + (selectedPackage.cod_amount || 0)).toLocaleString()} MMK
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 🚀 新增：商家接单/开始打包功能按钮 */}
              {isPartnerStore && (
                <>
                  {selectedPackage.status === '待确认' && (
                    <button
                      onClick={handleAcceptOrder}
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '1rem 2rem',
                        borderRadius: '12px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '1.1rem',
                        fontWeight: '900',
                        transition: 'all 0.3s ease',
                        width: '100%',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      {loading ? (
                        <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      ) : (
                        <>✅ {language === 'zh' ? '立即接单' : language === 'en' ? 'Accept Order' : 'အော်ဒါလက်ခံရန်'}</>
                      )}
                    </button>
                  )}

                  {selectedPackage.status === '打包中' && (
                    <button
                      onClick={() => handleStartPacking(selectedPackage)}
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '1rem 2rem',
                        borderRadius: '12px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '1.1rem',
                        fontWeight: '900',
                        transition: 'all 0.3s ease',
                        width: '100%',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <>📦 {language === 'zh' ? '开始打包' : language === 'en' ? 'Start Packing' : 'ထုပ်ပိုးရန်စတင်ပါ'}</>
                    </button>
                  )}
                </>
              )}

              {/* 关闭按钮 */}
              <button
                onClick={() => setShowPackageDetailModal(false)}
                style={{
                  background: 'rgba(59, 130, 246, 0.5)',
                  color: 'white',
                  border: '1px solid rgba(59, 130, 246, 0.7)',
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  width: '100%'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.7)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.5)';
                }}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 寄件码模态框 */}
      {showPickupCodeModal && selectedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          zIndex: 1001,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem'
        }}
        onClick={closePickupCodeModal}
        >
          <div style={{
            background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
            borderRadius: '15px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'white' }}>
                📱 {t.pickupCode}
              </h2>
              <button
                onClick={closePickupCodeModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
              >
                ✕ {t.close}
              </button>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '20px',
              borderRadius: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '1.1rem' }}>
                📦 {language === 'zh' ? '包裹信息' : language === 'en' ? 'Package Information' : 'ပက်ကေ့ဂျ်အချက်အလက်'}
              </h3>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', marginBottom: '15px' }}>
                <p style={{ margin: '5px 0' }}><strong>{language === 'zh' ? '包裹编号' : language === 'en' ? 'Package ID' : 'ပက်ကေ့ဂျ်နံပါတ်'}:</strong> {selectedPackage.id}</p>
                <p style={{ margin: '5px 0' }}><strong>{language === 'zh' ? '包裹类型' : language === 'en' ? 'Package Type' : 'ပက်ကေ့ဂျ်အမျိုးအစား'}:</strong> {selectedPackage.package_type || '-'}</p>
                <p style={{ margin: '5px 0' }}><strong>{t.sender}:</strong> {selectedPackage.sender_name || '-'}</p>
                <p style={{ margin: '5px 0' }}><strong>{t.receiver}:</strong> {selectedPackage.receiver_name || '-'}</p>
              </div>
              
              <div style={{
                background: 'white',
                padding: '25px',
                borderRadius: '15px',
                marginBottom: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(0, 0, 0, 0.1)',
                  color: '#666',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: '500'
                }}>
                  {selectedPackage.id}
                </div>
                
                {qrCodeDataUrl ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <img 
                      src={qrCodeDataUrl} 
                      alt={t.pickupCode}
                      style={{
                        width: '220px',
                        height: '220px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <p style={{
                      color: '#666',
                      fontSize: '0.8rem',
                      margin: 0,
                      textAlign: 'center'
                    }}>
                      {language === 'zh' ? '扫描此二维码完成取件' : language === 'en' ? 'Scan this QR code to complete pickup' : 'ဤ QR code ကို စကင်န်ဖတ်၍ ကောက်ယူမှု ပြီးစီးပါ'}
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    width: '220px', 
                    height: '220px', 
                    background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto',
                    borderRadius: '8px',
                    border: '2px dashed #ccc'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '2rem',
                        marginBottom: '10px'
                      }}>⏳</div>
                      <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
                        {language === 'zh' ? '生成中...' : language === 'en' ? 'Generating...' : 'ထုတ်လုပ်နေသည်...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '15px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h4 style={{ color: '#A5C7FF', margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                  💡 {language === 'zh' ? '使用说明' : language === 'en' ? 'Instructions' : 'အသုံးပြုမှုညွှန်ကြားချက်'}
                </h4>
                <ul style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: '0.85rem', 
                  textAlign: 'left',
                  margin: 0,
                  paddingLeft: '20px',
                  lineHeight: '1.6'
                }}>
                  <li>{language === 'zh' ? '配送员扫描此二维码完成取件' : language === 'en' ? 'Courier scans this QR code to complete pickup' : 'ပို့ဆောင်သူသည် ဤ QR code ကို စကင်န်ဖတ်၍ ကောက်ယူမှု ပြီးစီးပါ'}</li>
                  <li>{language === 'zh' ? '您也可以保存二维码图片备用' : language === 'en' ? 'You can also save the QR code image as backup' : 'သင်သည် QR code ပုံကို သိမ်းဆည်းထားနိုင်သည်'}</li>
                </ul>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center'
            }}>
              <button
                onClick={saveQRCode}
                disabled={!qrCodeDataUrl}
                style={{
                  background: qrCodeDataUrl ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: qrCodeDataUrl ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  opacity: qrCodeDataUrl ? 1 : 0.5
                }}
                onMouseOver={(e) => {
                  if (qrCodeDataUrl) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  if (qrCodeDataUrl) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
              >
                💾 {language === 'zh' ? '保存二维码' : language === 'en' ? 'Save QR Code' : 'QR code သိမ်းဆည်းရန်'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 密码修改模态框 */}
      {showPasswordModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPasswordModal(false);
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9))',
              borderRadius: '24px',
              padding: '2.5rem',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h2 style={{
                color: '#1e293b',
                fontSize: '1.8rem',
                fontWeight: '800',
                margin: 0
              }}>
                {language === 'zh' ? '修改密码' : language === 'en' ? 'Change Password' : 'စကားဝှက် ပြောင်းလဲရန်'}
              </h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                style={{
                  background: 'rgba(0, 0, 0, 0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 当前密码 */}
              <div>
                <label style={{
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  {language === 'zh' ? '当前密码' : language === 'en' ? 'Current Password' : 'လက်ရှိစကားဝှက်'}
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder={language === 'zh' ? '请输入当前密码' : language === 'en' ? 'Enter current password' : 'လက်ရှိစကားဝှက်ထည့်ပါ'}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* 新密码 */}
              <div>
                <label style={{
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  {language === 'zh' ? '新密码' : language === 'en' ? 'New Password' : 'စကားဝှက်အသစ်'}
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder={language === 'zh' ? '请输入新密码（至少6位）' : language === 'en' ? 'Enter new password (at least 6 characters)' : 'စကားဝှက်အသစ်ထည့်ပါ (အနည်းဆုံး ၆ လုံး)'}
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* 确认新密码 */}
              <div>
                <label style={{
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  {language === 'zh' ? '确认新密码' : language === 'en' ? 'Confirm New Password' : 'စကားဝှက်အသစ် အတည်ပြုရန်'}
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder={language === 'zh' ? '请再次输入新密码' : language === 'en' ? 'Enter new password again' : 'စကားဝှက်အသစ် ထပ်မံထည့်ပါ'}
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* 按钮 */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1rem'
              }}>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.05)',
                    color: '#475569',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                  }}
                >
                  {language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်ရန်'}
                </button>
                <button
                  onClick={handlePasswordChange}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  {language === 'zh' ? '确认修改' : language === 'en' ? 'Confirm Change' : 'အတည်ပြုရန်'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 代收款订单列表模态框 */}
      {showCODOrdersModal && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(26, 54, 93, 0.3)'
          }}>
            <h2 style={{
              color: '#2c5282',
              marginTop: 0,
              marginBottom: '1.5rem',
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              {codModalTitle || t.codOrders}
            </h2>
            
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {codOrders.length > 0 ? (
                codOrders.map((order: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      marginBottom: '0.75rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    <div>
                      <div style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        {t.packageId}
                      </div>
                      <div style={{ color: '#1e293b', fontSize: '1rem', fontWeight: '600' }}>
                        {order.orderId}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        {t.codAmount}
                      </div>
                      <div style={{ color: '#3b82f6', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {order.codAmount.toLocaleString()} MMK
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  {language === 'zh' ? '暂无订单' : language === 'en' ? 'No orders' : 'အော်ဒါမရှိပါ'}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowCODOrdersModal(false)}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '0.875rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* 🚀 新增：店铺商品管理大模态框 */}
      {showProductsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(15px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1500,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '32px',
            padding: '2.5rem',
            width: '95%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 30px 70px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  boxShadow: '0 10px 20px rgba(5, 150, 105, 0.4)'
                }}>🏪</div>
                <h3 style={{ color: 'white', fontSize: '2rem', fontWeight: '900', margin: 0 }}>{t.myProducts}</h3>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={handleOpenAddProduct}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: 'white',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(5, 150, 105, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  + {t.addProduct}
                </button>
                <button 
                  onClick={() => setShowProductsModal(false)}
                  style={{ position: 'relative', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '48px', height: '48px', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
                >✕</button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
              {loadingProducts ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                  <div className="spinner" style={{ border: '5px solid rgba(255,255,255,0.1)', borderTop: '5px solid #10b981', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                </div>
              ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>📦</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{t.noProducts}</div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '2rem'
                }}>
                  {products.map((product: any) => (
                    <div 
                      key={product.id}
                      onClick={() => handleOpenEditProduct(product)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '28px',
                        padding: '1.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.transform = 'translateY(-10px)';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                      }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '20px', background: '#000', marginBottom: '1.25rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {product.image_url && !product.image_url.startsWith('file://') ? (
                          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '3rem' }}>🖼️</span>
                        )}
                      </div>
                      <h4 style={{ color: 'white', fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.75rem 0' }}>{product.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.5rem' }}>{product.price.toLocaleString()} MMK</div>
                        {product.original_price && product.original_price > product.price && (
                          <div style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', fontSize: '0.9rem', fontWeight: '600' }}>
                            {product.original_price.toLocaleString()}
                          </div>
                        )}
                      </div>
                      {product.original_price && product.original_price > product.price && (
                        <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '900', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', zIndex: 2 }}>
                          {Math.round((1 - product.price / product.original_price) * 100)}% OFF
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                          {t.productStock}: {product.stock === -1 ? t.stockInfinite : product.stock}
                        </div>
                        <div style={{ 
                          padding: '4px 12px', 
                          borderRadius: '10px', 
                          fontSize: '0.75rem', 
                          fontWeight: '800',
                          backgroundColor: product.is_available ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: product.is_available ? '#10b981' : '#ef4444'
                        }}>
                          {product.is_available ? t.onSale : t.offShelf}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：添加/编辑商品模态框 */}
      {showAddEditProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '32px',
            padding: '2.5rem',
            width: '100%',
            maxWidth: '550px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowAddEditProductModal(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>

            <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '900', margin: '0 0 2rem 0', textAlign: 'center' }}>
              {editingProduct ? t.editProduct : t.addProduct}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 图片上传区域 */}
              <div 
                onClick={() => productFileInputRef.current?.click()}
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '20px',
                  border: '2px dashed rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {productForm.image_url ? (
                  <img src={productForm.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📸</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                      {isUploading ? t.uploading : t.uploadImage}
                    </div>
                  </>
                )}
                <input 
                  type="file" 
                  ref={productFileInputRef} 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>{t.productName} *</label>
                <input 
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  placeholder="如：冰镇可乐 330ml"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>{t.productPrice} (MMK) *</label>
                <input 
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                  placeholder="输入价格"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>{t.productDiscount} (%)</label>
                <input 
                  type="number"
                  value={productForm.discount_percent}
                  onChange={(e) => setProductForm({...productForm, discount_percent: e.target.value})}
                  placeholder="输入优惠百分比 (如 10)"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>{t.productStock} (-1={t.stockInfinite})</label>
                <input 
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>{t.isAvailable}</span>
                <input 
                  type="checkbox"
                  checked={productForm.is_available}
                  onChange={(e) => setProductForm({...productForm, is_available: e.target.checked})}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {editingProduct && (
                  <button 
                    onClick={() => handleDeleteProduct(editingProduct.id)}
                    style={{ flex: 1, padding: '14px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontWeight: '800', cursor: 'pointer' }}
                  >🗑️ {t.delete}</button>
                )}
                <button 
                  onClick={handleSaveProduct}
                  style={{ flex: 2, padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)' }}
                >💾 {t.save}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 🚀 新增：充值余额模态框 */}
      {/* 🚀 新增：充值余额模态框 */}
      {showRechargeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)', // 🚀 加深背景
          backdropFilter: 'blur(15px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999, // 🚀 极高 Z-Index，确保在所有元素（包括 Header）上方
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '32px',
            padding: '2.5rem',
            width: '100%',
            maxWidth: '450px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 30px 70px rgba(0, 0, 0, 0.6)',
            position: 'relative',
            animation: 'fadeInUp 0.4s ease-out'
          }}>
            <button 
              onClick={() => setShowRechargeModal(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >✕</button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💰</div>
              <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>
                {language === 'zh' ? '账户充值' : language === 'en' ? 'Recharge Balance' : 'ငွေဖြည့်သွင်းခြင်း'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                {language === 'zh' ? '请选择充值卡金额' : language === 'en' ? 'Please select recharge amount' : 'ငွေဖြည့်ကတ် ပမာဏကို ရွေးချယ်ပါ'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {[10000, 50000, 100000, 300000, 500000, 1000000].map((amount: number) => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(amount.toString())}
                    style={{
                      padding: '1.2rem',
                      borderRadius: '18px',
                      background: rechargeAmount === amount.toString() ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255,255,255,0.05)',
                      border: '2px solid',
                      borderColor: rechargeAmount === amount.toString() ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '1.1rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transform: rechargeAmount === amount.toString() ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: rechargeAmount === amount.toString() ? '0 10px 20px rgba(59, 130, 246, 0.3)' : 'none'
                    }}
                  >
                    <span>{amount.toLocaleString()}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>MMK</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={handleOpenPaymentQR}
                disabled={loading || !rechargeAmount || parseFloat(rechargeAmount) <= 0}
                style={{ 
                  marginTop: '1rem',
                  padding: '18px', 
                  borderRadius: '18px', 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  border: 'none', 
                  color: 'white', 
                  fontSize: '1.1rem',
                  fontWeight: '800', 
                  cursor: (loading || !rechargeAmount) ? 'not-allowed' : 'pointer', 
                  boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
                  opacity: (loading || !rechargeAmount) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.8rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => !loading && rechargeAmount && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => !loading && rechargeAmount && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {language === 'zh' ? '下一步' : 'Next Step'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：支付二维码模态框 */}
      {showPaymentQRModal && selectedRechargeAmount && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(15px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100000, // 🚀 确保在最高层
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '32px',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 30px 70px rgba(0, 0, 0, 0.6)',
            position: 'relative',
            animation: 'fadeInUp 0.4s ease-out'
          }}>
            <button 
              onClick={() => setShowPaymentQRModal(false)}
              style={{ position: 'absolute', top: '20px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer' }}
            >✕</button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>扫描二维码支付</h3>
              <p style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: '900', marginTop: '0.5rem' }}>
                {selectedRechargeAmount.toLocaleString()} MMK
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'white', padding: '15px', borderRadius: '24px', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <img 
                  src={`/kbz_qr_${selectedRechargeAmount}.png`} 
                  alt="KBZPay QR" 
                  style={{ width: '220px', height: '220px', objectFit: 'contain' }}
                />
                <button 
                  onClick={handleSaveQRCode}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: '#3b82f6', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}
                  title="保存图片"
                >💾</button>
              </div>

              <div style={{ width: '100%' }}>
                <p style={{ color: 'white', fontSize: '0.9rem', marginBottom: '10px', fontWeight: '600' }}>上传支付凭证截图：</p>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    width: '100%', 
                    height: '140px', 
                    border: '2px dashed rgba(255,255,255,0.2)', 
                    borderRadius: '18px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: rechargeProofPreview ? `url(${rechargeProofPreview}) center/contain no-repeat` : 'rgba(255,255,255,0.02)',
                    backgroundColor: rechargeProofPreview ? '#000' : 'transparent',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden'
                  }}
                >
                  {!rechargeProofPreview && (
                    <>
                      <span style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📸</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontWeight: '600' }}>点击上传汇款记录</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
              </div>

              <button 
                onClick={handleConfirmRecharge}
                disabled={loading || !rechargeProof}
                style={{ 
                  width: '100%', 
                  padding: '18px', 
                  borderRadius: '18px', 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                  border: 'none', 
                  color: 'white', 
                  fontSize: '1.1rem',
                  fontWeight: '800', 
                  cursor: (loading || !rechargeProof) ? 'not-allowed' : 'pointer', 
                  boxShadow: '0 8px 25px rgba(37, 99, 235, 0.3)',
                  opacity: (loading || !rechargeProof) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.8rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => !loading && rechargeProof && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => !loading && rechargeProof && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {loading ? <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> : '确认已支付'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：待打包订单列表模态框 */}
      {showPackingListModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(10px)'
        }}
        onClick={() => setShowPackingListModal(false)}
        >
          <div style={{
            background: 'rgba(30, 41, 59, 0.95)',
            padding: '2.5rem',
            borderRadius: '32px',
            maxWidth: '700px',
            width: '95%',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>📦</div>
                <h2 style={{
                  color: 'white',
                  margin: 0,
                  fontSize: '1.75rem',
                  fontWeight: '800'
                }}>
                  {language === 'zh' ? '待打包订单' : language === 'en' ? 'Orders to Pack' : 'ထုပ်ပိုးရန်ကျန်သောအော်ဒါများ'}
                </h2>
              </div>
              <button
                onClick={() => setShowPackingListModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >✕</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {userPackages.filter(pkg => pkg.status === '打包中').length > 0 ? (
                userPackages.filter(pkg => pkg.status === '打包中').map((pkg: any) => (
                  <div
                    key={pkg.id}
                    style={{
                      padding: '1.5rem',
                      marginBottom: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 'bold' }}>
                        {t.packageId}
                      </div>
                      <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: '800', marginBottom: '8px' }}>
                        {pkg.id}
                      </div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                          📅 {pkg.create_time || pkg.created_at || '-'}
                        </div>
                        {pkg.cod_amount > 0 && (
                          <div style={{ color: '#fca5a5', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            💰 {pkg.cod_amount.toLocaleString()} MMK
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowPackingListModal(false);
                        handleStartPacking(pkg);
                      }}
                      style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '800',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        boxShadow: '0 8px 15px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.3s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      📦 {language === 'zh' ? '开始打包' : language === 'en' ? 'Start Packing' : 'ထုပ်ပိုးရန်စတင်ပါ'}
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '1.2rem', fontWeight: '700' }}>
                    {language === 'zh' ? '暂无待打包订单' : language === 'en' ? 'No orders to pack' : 'ထုပ်ပိုးရန်အော်ဒါမရှိပါ'}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
              <button
                onClick={() => setShowPackingListModal(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：待接单订单列表模态框 */}
      {showPendingAcceptListModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(10px)'
        }}
        onClick={() => setShowPendingAcceptListModal(false)}
        >
          <div style={{
            background: 'rgba(30, 41, 59, 0.95)',
            padding: '2.5rem',
            borderRadius: '32px',
            maxWidth: '700px',
            width: '95%',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>🔔</div>
                <h2 style={{
                  color: 'white',
                  margin: 0,
                  fontSize: '1.75rem',
                  fontWeight: '800'
                }}>
                  {language === 'zh' ? '待接单订单' : language === 'en' ? 'Pending Accept' : 'လက်ခံရန်စောင့်ဆိုင်းနေသည်'}
                </h2>
              </div>
              <button
                onClick={() => setShowPendingAcceptListModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >✕</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {userPackages.filter(pkg => pkg.status === '待确认').length > 0 ? (
                userPackages.filter(pkg => pkg.status === '待确认').map((pkg: any) => (
                  <div
                    key={pkg.id}
                    style={{
                      padding: '1.5rem',
                      marginBottom: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 'bold' }}>
                        {t.packageId}
                      </div>
                      <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: '800', marginBottom: '8px' }}>
                        {pkg.id}
                      </div>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                          📅 {pkg.create_time || pkg.created_at || '-'}
                        </div>
                        {pkg.cod_amount > 0 && (
                          <div style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            💰 {pkg.cod_amount.toLocaleString()} MMK
                          </div>
                        )}
                        <div style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}>
                          💵 {pkg.price ? `${pkg.price.replace('MMK', '').trim()} MMK` : '-'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleCancelOrder(pkg)}
                        style={{
                          padding: '12px 20px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#fca5a5',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '12px',
                          fontWeight: '800',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        ✕ {language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်'}
                      </button>
                      <button
                        onClick={() => handleAcceptOrder(pkg)}
                        style={{
                          padding: '12px 24px',
                          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: '800',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          boxShadow: '0 8px 15px rgba(245, 158, 11, 0.3)',
                          transition: 'all 0.3s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        🤝 {language === 'zh' ? '立即接单' : language === 'en' ? 'Accept' : 'လက်ခံရန်'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '1.2rem', fontWeight: '700' }}>
                    {language === 'zh' ? '暂无待接单订单' : language === 'en' ? 'No pending orders' : 'လက်ခံရန်အော်ဒါမရှိပါ'}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
              <button
                onClick={() => setShowPendingAcceptListModal(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：打包模态框 (PackingModal) */}
      {showPackingModal && packingOrderData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
        onClick={() => !loading && setShowPackingModal(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '35px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* 打包窗口页眉 */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📦</div>
              <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: '950', margin: 0 }}>
                {language === 'zh' ? '订单打包中' : language === 'en' ? 'Order Packing' : 'အော်ဒါထုပ်ပိုးနေသည်'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginTop: '0.5rem', fontWeight: '600' }}>
                {t.packageId}: {packingOrderData.id}
              </p>
              {!loading && (
                <button 
                  onClick={() => setShowPackingModal(false)}
                  style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.2)', border: 'none', width: '36px', height: '36px', borderRadius: '18px', color: 'white', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
                >✕</button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              {/* 商品清单 */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📋 {language === 'zh' ? '核对商品清单' : language === 'en' ? 'Checklist' : 'ပစ္စည်းစာရင်းစစ်ဆေးရန်'}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(() => {
                    // 解析商品信息
                    const productsMatch = packingOrderData.description?.match(/\[商品清单: (.*?)\]/);
                    const productItems = productsMatch ? productsMatch[1].split(', ') : [];
                    
                    if (productItems.length === 0) {
                      return (
                        <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
                          <p style={{ color: '#64748b', fontWeight: '600' }}>
                            {language === 'zh' ? '暂无详细商品清单，请核对包裹内容' : 'No detailed list, please check package content'}
                          </p>
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '1rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={checkedItems['default']} 
                              onChange={() => toggleItem('default')}
                              style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>
                              {language === 'zh' ? '确认商品已备齐' : 'Confirm all items ready'}
                            </span>
                          </label>
                        </div>
                      );
                    }

                    return productItems.map((item: string, index: number) => (
                      <div 
                        key={index}
                        onClick={() => toggleItem(`item-${index}`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px',
                          padding: '1.2rem',
                          background: checkedItems[`item-${index}`] ? 'rgba(16, 185, 129, 0.05)' : '#f8fafc',
                          borderRadius: '18px',
                          border: `2px solid ${checkedItems[`item-${index}`] ? '#10b981' : '#f1f5f9'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          border: `2px solid ${checkedItems[`item-${index}`] ? '#10b981' : '#cbd5e1'}`,
                          backgroundColor: checkedItems[`item-${index}`] ? '#10b981' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1rem'
                        }}>
                          {checkedItems[`item-${index}`] && '✓'}
                        </div>
                        <span style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: '700', 
                          color: checkedItems[`item-${index}`] ? '#64748b' : '#1e293b',
                          textDecoration: checkedItems[`item-${index}`] ? 'line-through' : 'none',
                          flex: 1
                        }}>
                          {item}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* 订单备注 */}
              {packingOrderData.description && !packingOrderData.description.includes('商品清单') && (
                <div style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '20px', border: '1px solid #fde68a', marginBottom: '2rem' }}>
                  <h4 style={{ color: '#92400e', margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '900' }}>💡 {language === 'zh' ? '客户备注' : 'Customer Note'}</h4>
                  <p style={{ color: '#b45309', margin: 0, fontSize: '1rem', fontWeight: '600' }}>{packingOrderData.description}</p>
                </div>
              )}
            </div>

            {/* 底部操作栏 */}
            <div style={{ padding: '2rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={handleCompletePacking}
                disabled={loading || (() => {
                  const productsMatch = packingOrderData.description?.match(/\[商品清单: (.*?)\]/);
                  const productItems = productsMatch ? productsMatch[1].split(', ') : [];
                  if (productItems.length === 0) return !checkedItems['default'];
                  return productItems.some((_: any, index: number) => !checkedItems[`item-${index}`]);
                })()}
                style={{
                  width: '100%',
                  padding: '1.2rem',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  fontSize: '1.2rem',
                  fontWeight: '950',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: (() => {
                    const productsMatch = packingOrderData.description?.match(/\[商品清单: (.*?)\]/);
                    const productItems = productsMatch ? productsMatch[1].split(', ') : [];
                    const allChecked = productItems.length === 0 ? checkedItems['default'] : !productItems.some((_: any, index: number) => !checkedItems[`item-${index}`]);
                    return allChecked && !loading ? 1 : 0.6;
                  })()
                }}
              >
                {loading ? (
                  <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                ) : (
                  language === 'zh' ? '确认打包完成' : 'Confirm Packing Done'
                )}
              </button>
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '1rem', fontWeight: '600' }}>
                {language === 'zh' ? '请确保所有商品已备齐并打包好' : 'Please ensure all items are packed securely'}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* 🚀 新增：店铺评价管理模态框 (ReviewsModal) */}
      {showReviewsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(10px)'
        }}
        onClick={() => setShowReviewsModal(false)}
        >
          <div style={{
            background: 'rgba(30, 41, 59, 0.95)',
            padding: '2.5rem',
            borderRadius: '32px',
            maxWidth: '800px',
            width: '95%',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* 页眉 */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  boxShadow: '0 10px 20px rgba(245, 158, 11, 0.3)'
                }}>⭐</div>
                <div>
                  <h2 style={{ color: 'white', margin: 0, fontSize: '1.75rem', fontWeight: '800' }}>
                    {language === 'zh' ? '店铺评价管理' : language === 'en' ? 'Review Management' : 'ဆိုင်မှတ်ချက်များ စီမံခန့်ခွဲမှု'}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: '900' }}>{reviewStats.average} / 5.0</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>• {reviewStats.count} {language === 'zh' ? '条评价' : 'Reviews'}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowReviewsModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >✕</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {loadingReviews ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                  <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #fbbf24', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                </div>
              ) : storeReviews.length > 0 ? (
                storeReviews.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      padding: '1.5rem',
                      marginBottom: '1.5rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '24px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {/* 用户信息和评分 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569' }}>
                          {review.is_anonymous ? '匿' : (review.user_name?.charAt(0).toUpperCase() || 'U')}
                        </div>
                        <div>
                          <div style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>
                            {review.is_anonymous ? (language === 'zh' ? '匿名用户' : 'Anonymous') : review.user_name}
                          </div>
                          <div style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
                            {'⭐'.repeat(review.rating)}
                          </div>
                        </div>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                        {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>

                    {/* 评论内容 */}
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.25rem', whiteSpace: 'pre-wrap' }}>
                      {review.comment}
                    </div>

                    {/* 图片预览 */}
                    {review.images && review.images.length > 0 && (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                        {review.images.map((img, idx) => (
                          <img 
                            key={idx} 
                            src={img} 
                            alt="Review" 
                            style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', cursor: 'zoom-in', border: '1px solid rgba(255,255,255,0.1)' }} 
                            onClick={() => window.open(img, '_blank')}
                          />
                        ))}
                      </div>
                    )}

                    {/* 商家回复部分 */}
                    {review.reply_text ? (
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '18px', borderLeft: '4px solid #fbbf24' }}>
                        <div style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: '800', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{language === 'zh' ? '商家回复' : 'Merchant Reply'}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'normal' }}>
                            {review.replied_at ? new Date(review.replied_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                          {review.reply_text}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '1rem' }}>
                        {replyingToId === review.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={language === 'zh' ? '输入您的回复内容...' : 'Type your reply...'}
                              style={{ width: '100%', minHeight: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                onClick={() => setReplyingToId(null)}
                                style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}
                              >{t.close}</button>
                              <button
                                onClick={() => handleReplyReview(review.id)}
                                style={{ flex: 2, padding: '10px', background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}
                              >{language === 'zh' ? '提交回复' : 'Submit Reply'}</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReplyingToId(review.id);
                              setReplyText('');
                            }}
                            style={{ padding: '8px 20px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                          >
                            💬 {language === 'zh' ? '回复评价' : 'Reply'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✨</div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '1.2rem', fontWeight: '700' }}>
                    {language === 'zh' ? '店铺暂无评价' : 'No reviews yet'}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
              <button
                onClick={() => setShowReviewsModal(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：客户提交评价模态框 (ReviewSubmitModal) */}
      {showReviewSubmitModal && reviewOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
        onClick={() => !isSubmittingReview && setShowReviewSubmitModal(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '35px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* 页眉 */}
            <div style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              padding: '2rem',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⭐</div>
              <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: '950', margin: 0 }}>
                {language === 'zh' ? '评价您的订单' : 'Rate Your Order'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                {t.packageId}: {reviewOrder.id}
              </p>
              {!isSubmittingReview && (
                <button 
                  onClick={() => setShowReviewSubmitModal(false)}
                  style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.1)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'white', cursor: 'pointer' }}
                >✕</button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              {/* 星级评分 */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ color: '#475569', fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>
                  {language === 'zh' ? '总体满意度' : 'Overall Satisfaction'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star}
                      onClick={() => setReviewRating(star)}
                      style={{ 
                        fontSize: '2.5rem', 
                        cursor: 'pointer',
                        color: star <= reviewRating ? '#fbbf24' : '#e2e8f0',
                        transition: 'transform 0.2s ease',
                        transform: star <= reviewRating ? 'scale(1.1)' : 'scale(1)'
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <div style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: '800', marginTop: '0.5rem' }}>
                  {reviewRating === 5 ? (language === 'zh' ? '非常满意' : 'Excellent') :
                   reviewRating === 4 ? (language === 'zh' ? '满意' : 'Good') :
                   reviewRating === 3 ? (language === 'zh' ? '一般' : 'Average') :
                   reviewRating === 2 ? (language === 'zh' ? '不满意' : 'Poor') :
                   (language === 'zh' ? '非常不满意' : 'Very Poor')}
                </div>
              </div>

              {/* 评价文字 */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ color: '#1e293b', fontSize: '1rem', fontWeight: '800', display: 'block', marginBottom: '0.75rem' }}>
                  {language === 'zh' ? '您的评价' : 'Your Review'}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={language === 'zh' ? '写下您的真实评价，帮助我们做得更好...' : 'Share your experience...'}
                  style={{ 
                    width: '100%', 
                    minHeight: '120px', 
                    background: '#f8fafc', 
                    border: '2px solid #f1f5f9', 
                    borderRadius: '20px', 
                    padding: '1rem', 
                    color: '#1e293b', 
                    fontSize: '1rem', 
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              {/* 图片上传 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#1e293b', fontSize: '1rem', fontWeight: '800', display: 'block', marginBottom: '0.75rem' }}>
                  {language === 'zh' ? '上传照片 (选填)' : 'Upload Photos (Optional)'}
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {reviewImages.map((img, index) => (
                    <div key={index} style={{ position: 'relative', width: '80px', height: '80px' }}>
                      <img src={img} alt="Preview" style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                      <button 
                        onClick={() => handleRemoveReviewImage(index)}
                        style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                      >✕</button>
                    </div>
                  ))}
                  {reviewImages.length < 6 && (
                    <div 
                      onClick={() => !isUploadingReviewImage && reviewImageInputRef.current?.click()}
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        border: '2px dashed #cbd5e1', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'pointer',
                        background: '#f8fafc'
                      }}
                    >
                      {isUploadingReviewImage ? (
                        <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTop: '2px solid #fbbf24', borderRadius: '50%' }}></div>
                      ) : (
                        <>
                          <span style={{ fontSize: '1.5rem', color: '#94a3b8' }}>+</span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>照片</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  ref={reviewImageInputRef} 
                  onChange={handleReviewImageUpload} 
                  style={{ display: 'none' }} 
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div style={{ padding: '2rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || !reviewComment.trim()}
                style={{
                  width: '100%',
                  padding: '1.2rem',
                  borderRadius: '20px',
                  background: isSubmittingReview || !reviewComment.trim() ? '#cbd5e1' : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: 'white',
                  border: 'none',
                  fontSize: '1.2rem',
                  fontWeight: '950',
                  cursor: isSubmittingReview || !reviewComment.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: isSubmittingReview || !reviewComment.trim() ? 'none' : '0 10px 25px rgba(245, 158, 11, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                {isSubmittingReview ? (
                  <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                ) : (
                  language === 'zh' ? '提交评价' : 'Submit Review'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

