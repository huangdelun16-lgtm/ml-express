import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageService, supabase, merchantService, Product, DeliveryStore, deliveryStoreService } from '../services/supabase';
import QRCode from 'qrcode';
import LoggerService from '../services/LoggerService';
import NavigationBar from '../components/home/NavigationBar';

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
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ml-express-language') || 'zh';
  });
  const [isVisible, setIsVisible] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPackages, setUserPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [packagesPerPage] = useState(5); // 每页显示5个包裹
  const [selectedPackage, setSelectedPackage] = useState<any>(null); // 选中的包裹详情
  const [showPackageDetailModal, setShowPackageDetailModal] = useState(false); // 显示包裹详情模态框
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(false); // 显示寄件码模态框
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>(''); // 二维码数据URL
  const [isPartnerStore, setIsPartnerStore] = useState(false); // 是否是合伙店铺账户
  const [showPasswordModal, setShowPasswordModal] = useState(false); // 显示密码修改模态框
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }); // 密码修改表单
  const [storeInfo, setStoreInfo] = useState<any>(null); // 合伙店铺信息
  const [partnerCODStats, setPartnerCODStats] = useState({
    totalCOD: 0,
    unclearedCOD: 0,
    unclearedCount: 0,
    settledCOD: 0,
    lastSettledAt: null as string | null,
  }); // 合伙店铺代收款统计
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
    stock: '-1',
    image_url: '',
    is_available: true
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      stock: '-1',
      image_url: '',
      is_available: true
    });
    setShowAddEditProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
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
      const productData = {
        store_id: currentUser.id,
        name: productForm.name,
        price: parseFloat(productForm.price),
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
        alert(t.statusUpdated);
      }
    } catch (error) {
      LoggerService.error('更新营业状态失败:', error);
    }
  };

  // 检查用户是否是合伙店铺账户
  // 注意：合伙店铺账号只能在admin web中注册，客户端web注册的账号都是普通客户账号
  // 判断逻辑：
  // 1. 如果 user_type === 'partner'，直接返回 true
  // 2. 如果用户有 store_code 或 store_id，返回 true
  // 3. 否则检查用户的邮箱或手机号是否在 delivery_stores 表中
  const checkIfPartnerStore = useCallback(async (user: any) => {
    if (!user) return false;
    
    // 方法1: 检查 user_type
    if (user.user_type === 'partner') {
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
        created_at: currentUser.created_at
      });
      
      // 传入用户的注册时间作为查询起始时间，避免新用户看到旧手机号的历史订单
      const packages = await packageService.getPackagesByUser(
        currentUser.email,
        currentUser.phone,
        currentUser.created_at // 传入注册时间
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
        setPartnerCODStats(stats);
      }
    } catch (error) {
      LoggerService.error('加载代收款统计失败:', error);
    }
  }, [currentUser, isPartnerStore, storeInfo, selectedMonth]);

  useEffect(() => {
    loadUserPackages();
    if (isPartnerStore) {
      loadPartnerCODStats();
      loadProducts(); // 🚀 新增：加载店铺商品
    }
  }, [loadUserPackages, isPartnerStore, loadPartnerCODStats]);

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
            language === 'en' ? 'Only partner store accounts can change password' : 
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

  const translations = {
    zh: {
      nav: {
        home: '首页',
        services: '服务',
        tracking: '跟踪',
        contact: '联系我们',
        profile: '我的账户'
      },
      title: '我的账户',
      userInfo: '用户信息',
      packages: '我的包裹',
      noPackages: '暂无包裹记录',
      packageId: '订单号',
      status: '状态',
      createTime: '创建时间',
      price: '跑腿费',
      viewDetails: '查看详情',
      logout: '退出登录',
      welcome: '欢迎',
      email: '邮箱',
      phone: '电话',
      address: '地址',
      name: '姓名',
      searchPackage: '搜索包裹',
      searchPlaceholder: '请输入订单号',
      search: '搜索',
      packageDetails: '包裹详情',
      sender: '寄件人',
      receiver: '收件人',
      close: '关闭',
      paymentMethod: '支付方式',
      qrPayment: '转账',
      cashPayment: '现金支付',
      cod: '代收款',
      totalAmount: '总金额',
      none: '无',
      totalOrders: '全部订单',
      accountDate: '开户日期',
      pendingPickup: '待取件',
      inTransit: '配送中',
      completed: '已完成',
      pickupCode: '寄件码',
      storeType: '店铺类型',
      storeCode: '店铺代码',
      codStats: '代收款统计',
      totalCOD: '本月已结清代收款',
      unclearedCOD: '待结清金额',
      unclearedCount: '待结清订单数',
      lastSettledAt: '上次结清日期',
      noSettlement: '暂无结清记录',
      view: '查看',
      codOrders: '代收款订单',
      codAmount: '代收金额',
      noProducts: '暂无商品',
      myProducts: '我的商品',
      addProduct: '添加商品',
      editProduct: '编辑商品',
      productName: '商品名称',
      productPrice: '商品价格',
      productStock: '商品库存',
      stockInfinite: '无限',
      isAvailable: '是否上架',
      onSale: '已上架',
      offShelf: '已下架',
      save: '保存',
      delete: '删除',
      deleteConfirm: '确定要删除这个商品吗？',
      uploadImage: '上传图片',
      uploading: '正在上传...',
      businessManagement: '营业状态管理',
      operatingHours: '营业时间设置',
      closedToday: '今日暂停营业',
      openNow: '正在营业',
      closedNow: '休息中',
      openingTime: '开门时间',
      closingTime: '打烊时间',
      statusUpdated: '营业状态已更新',
    },
    en: {
      nav: {
        home: 'Home',
        services: 'Services',
        tracking: 'Tracking',
        contact: 'Contact',
        profile: 'My Account'
      },
      title: 'My Account',
      userInfo: 'User Information',
      packages: 'My Packages',
      noPackages: 'No packages yet',
      packageId: 'Order ID',
      status: 'Status',
      createTime: 'Created',
      price: 'Delivery Fee',
      viewDetails: 'View Details',
      logout: 'Logout',
      welcome: 'Welcome',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      name: 'Name',
      searchPackage: 'Search Package',
      searchPlaceholder: 'Enter tracking number',
      search: 'Search',
      packageDetails: 'Package Details',
      sender: 'Sender',
      receiver: 'Receiver',
      close: 'Close',
      paymentMethod: 'Payment Method',
      qrPayment: 'Transfer',
      cashPayment: 'Cash',
      cod: 'Collection Amount',
      totalAmount: 'Total Amount',
      none: 'None',
      totalOrders: 'Total Orders',
      accountDate: 'Account Created',
      pendingPickup: 'Pending Pickup',
      inTransit: 'In Transit',
      completed: 'Completed',
      pickupCode: 'Pickup Code',
      storeType: 'Store Type',
      storeCode: 'Store Code',
      codStats: 'COD Statistics',
      totalCOD: 'Monthly Settled COD',
      unclearedCOD: 'Uncleared Amount',
      unclearedCount: 'Uncleared Orders',
      lastSettledAt: 'Last Settled Date',
      noSettlement: 'No Settlement Record',
      view: 'View',
      codOrders: 'COD Orders',
      codAmount: 'COD Amount',
      noProducts: 'No products yet',
      myProducts: 'My Products',
      addProduct: 'Add Product',
      editProduct: 'Edit Product',
      productName: 'Product Name',
      productPrice: 'Price',
      productStock: 'Stock',
      stockInfinite: 'Infinite',
      isAvailable: 'Available',
      onSale: 'On Sale',
      offShelf: 'Off Shelf',
      save: 'Save',
      delete: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this product?',
      uploadImage: 'Upload Image',
      uploading: 'Uploading...',
      businessManagement: 'Business Management',
      operatingHours: 'Business Hours Setting',
      closedToday: 'Closed Today',
      openNow: 'Open Now',
      closedNow: 'Closed',
      openingTime: 'Opening Time',
      closingTime: 'Closing Time',
      statusUpdated: 'Business status updated',
    },
    my: {
      nav: {
        home: 'ပင်မစာမျက်နှာ',
        services: 'ဝန်ဆောင်မှုများ',
        tracking: 'ခြေရာခံ',
        contact: 'ဆက်သွယ်ရန်',
        profile: 'ကျွန်ုပ်၏အကောင့်'
      },
      title: 'ကျွန်ုပ်၏အကောင့်',
      userInfo: 'အသုံးပြုသူအချက်အလက်',
      packages: 'ကျွန်ုပ်၏ပက်ကေ့ဂျ်များ',
      noPackages: 'ပက်ကေ့ဂျ်မရှိသေးပါ',
      packageId: 'အော်ဒါနံပါတ်',
      status: 'အခြေအနေ',
      createTime: 'ဖန်တီးထားသောအချိန်',
      price: 'ပို့ဆောင်ခ',
      viewDetails: 'အသေးစိတ်ကြည့်ရန်',
      logout: 'ထွက်ရန်',
      welcome: 'ကြိုဆိုပါတယ်',
      email: 'အီးမေးလ်',
      phone: 'ဖုန်း',
      address: 'လိပ်စာ',
      name: 'အမည်',
      searchPackage: 'ပက်ကေ့ဂျ်ရှာဖွေရန်',
      searchPlaceholder: 'အော်ဒါနံပါတ်ထည့်ပါ',
      search: 'ရှာဖွေရန်',
      packageDetails: 'ပက်ကေ့ဂျ်အသေးစိတ်',
      sender: 'ပို့ဆောင်သူ',
      receiver: 'လက်ခံသူ',
      close: 'ပိတ်ရန်',
      paymentMethod: 'ငွေပေးချေမှုနည်းလမ်း',
      qrPayment: 'ငွေလွှဲ',
      cashPayment: 'ငွေသား',
      cod: 'ငွေကောက်ခံမှု',
      totalAmount: 'စုစုပေါင်းငွေ',
      none: 'မရှိ',
      totalOrders: 'စုစုပေါင်းအော်ဒါ',
      accountDate: 'အကောင့်ဖွင့်ထားသောရက်စွဲ',
      pendingPickup: 'ကောက်ယူရန်စောင့်ဆိုင်းနေသည်',
      inTransit: 'ပို့ဆောင်နေသည်',
      completed: 'ပြီးစီးပြီး',
      pickupCode: 'ကောက်ယူမည့်ကုဒ်',
      storeType: 'ဆိုင်အမျိုးအစား',
      storeCode: 'ဆိုင်ကုဒ်',
      codStats: 'ငွေကောက်ခံမှုစာရင်း',
      totalCOD: 'လအလိုက် ငွေရှင်းပြီးသော ငွေကောက်ခံမှု',
      unclearedCOD: 'ရှင်းလင်းရန်စောင့်ဆိုင်းနေသောငွေ',
      unclearedCount: 'ရှင်းလင်းရန်စောင့်ဆိုင်းနေသောအော်ဒါ',
      lastSettledAt: 'နောက်ဆုံးရှင်းလင်းထားသောရက်စွဲ',
      noSettlement: 'ရှင်းလင်းမှုမှတ်တမ်းမရှိပါ',
      view: 'ကြည့်ရန်',
      codOrders: 'ငွေကောက်ခံရန်အော်ဒါများ',
      codAmount: 'ငွေကောက်ခံရန်ပမာဏ',
      noProducts: 'ကုန်ပစ္စည်းမရှိသေးပါ',
      myProducts: 'ကျွန်ုပ်၏ကုန်ပစ္စည်းများ',
      addProduct: 'ကုန်ပစ္စည်းအသစ်ထည့်ရန်',
      editProduct: 'ပြင်ဆင်ရန်',
      productName: 'အမည်',
      productPrice: 'စျေးနှုန်း',
      productStock: 'လက်ကျန်',
      stockInfinite: 'အကန့်အသတ်မရှိ',
      isAvailable: 'ရောင်းချရန်ရှိသည်',
      onSale: 'ရောင်းချနေသည်',
      offShelf: 'ခေတ္တရပ်နားထားသည်',
      save: 'သိမ်းရန်',
      delete: 'ဖျက်မည်',
      deleteConfirm: 'ဤကုန်ပစ္စည်းကို ဖျက်ရန် သေချาပါသလား?',
      uploadImage: 'ဓာတ်ပုံတင်ရန်',
      uploading: 'တင်နေသည်...',
      businessManagement: 'ဆိုင်ဖွင့်/ပိတ် စီမံခန့်ခွဲမှု',
      operatingHours: 'ဆိုင်ဖွင့်ချိန် သတ်မှတ်ချက်',
      closedToday: 'ယနေ့ ဆိုင်ပိတ်သည်',
      openNow: 'ဆိုင်ဖွင့်ထားသည်',
      closedNow: 'ဆိုင်ပိတ်ထားသည်',
      openingTime: 'ဆိုင်ဖွင့်ချိန်',
      closingTime: 'ဆိုင်ပိတ်ချိန်',
      statusUpdated: 'ဆိုင်အခြေအနေ ပြောင်းလဲပြီးပါပြီ',
    }
  };

  const t = translations[language as keyof typeof translations] || translations.zh;

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
      '待取件': '#f59e0b',
      '已取件': '#3b82f6',
      '运输中': '#8b5cf6',
      '已送达': '#10b981',
      '待收款': '#ef4444',
      '已完成': '#6b7280'
    };
    return statusMap[status] || '#6b7280';
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    if (status === '待收款') return language === 'zh' ? '待取件' : language === 'en' ? 'Pending Pickup' : 'ကောက်ယူရန်စောင့်ဆိုင်းနေသည်';
    return status;
  };

  // 获取支付方式文本
  const getPaymentMethodText = (paymentMethod?: string) => {
    if (paymentMethod === 'qr') {
      return language === 'zh' ? '转账' : language === 'en' ? 'Transfer' : 'ငွေလွှဲ';
    } else if (paymentMethod === 'cash') {
      return language === 'zh' ? '现金支付' : language === 'en' ? 'Cash' : 'ငွေသား';
    }
    return language === 'zh' ? '未知' : language === 'en' ? 'Unknown' : 'မသိရှိရ';
  };

  // 获取支付方式颜色
  const getPaymentMethodColor = (paymentMethod?: string) => {
    if (paymentMethod === 'qr') {
      return 'rgba(34, 197, 94, 0.3)'; // 绿色
    } else if (paymentMethod === 'cash') {
      return 'rgba(251, 191, 36, 0.3)'; // 黄色
    }
    return 'rgba(156, 163, 175, 0.3)'; // 灰色
  };

  // 获取支付方式边框颜色
  const getPaymentMethodBorderColor = (paymentMethod?: string) => {
    if (paymentMethod === 'qr') {
      return 'rgba(34, 197, 94, 0.5)';
    } else if (paymentMethod === 'cash') {
      return 'rgba(251, 191, 36, 0.5)';
    }
    return 'rgba(156, 163, 175, 0.5)';
  };

  // 计算订单统计
  const orderStats = {
    total: userPackages.length,
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
        translations={t as any}
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
                      : (currentUser.user_type === 'vip' 
                        ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)'
                        : (currentUser.user_type === 'admin' 
                          ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' 
                          : (currentUser.user_type === 'courier' 
                            ? 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' 
                            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'))),
                    boxShadow: isPartnerStore 
                      ? '0 4px 15px rgba(14, 165, 233, 0.4)' 
                      : (currentUser.user_type === 'vip'
                        ? '0 4px 15px rgba(251, 191, 36, 0.4)'
                        : (currentUser.user_type === 'admin'
                          ? '0 4px 15px rgba(249, 115, 22, 0.4)'
                          : (currentUser.user_type === 'courier'
                            ? '0 4px 15px rgba(168, 85, 247, 0.4)'
                            : '0 4px 15px rgba(59, 130, 246, 0.4)'))),
                    color: 'white',
                    padding: '0.4rem 1.2rem',
                    borderRadius: '14px',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    border: '1px solid rgba(255,255,255,0.3)',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    {isPartnerStore ? 'Partner' : (
                      currentUser.user_type === 'vip' 
                        ? (language === 'zh' ? 'VIP 会员' : language === 'en' ? 'VIP Member' : 'VIP အဖွဲ့ဝင်')
                        : (currentUser.user_type === 'admin' 
                          ? 'Admin' 
                          : (currentUser.user_type === 'courier' ? 'Courier' : 'Member'))
                    )}
                  </div>
                </div>
                
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
                      color: '#10b981',
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
            gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
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
                      <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                        财务收益与结算实时动态
                      </span>
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
                  gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
                  gap: '2.5rem'
                }}>
                  {/* 本月已结清 */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    padding: '2.5rem 2rem',
                    borderRadius: '35px',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.4s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', fontWeight: '800' }}>{t.totalCOD}</span>
                      {partnerCODStats.settledCOD > 0 && (
                        <button 
                          onClick={() => handleViewCODOrders(true)}
                          style={{ padding: '6px 16px', borderRadius: '12px', background: '#3b82f6', border: 'none', color: 'white', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}
                        >{t.view}</button>
                      )}
                    </div>
                    <div style={{ fontSize: '2.8rem', fontWeight: '950', color: 'white' }}>
                      {partnerCODStats.settledCOD.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.6 }}>MMK</span>
                    </div>
                    <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', fontSize: '6rem', opacity: 0.12, transform: 'rotate(-15deg)' }}>📈</div>
                  </div>

                  {/* 待结清金额 */}
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    padding: '2.5rem 2rem',
                    borderRadius: '35px',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.4s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', fontWeight: '800' }}>{t.unclearedCOD}</span>
                      {partnerCODStats.unclearedCount > 0 && (
                        <button 
                          onClick={() => handleViewCODOrders(false)}
                          style={{ padding: '6px 16px', borderRadius: '12px', background: '#f59e0b', border: 'none', color: 'white', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)' }}
                        >{t.view}</button>
                      )}
                    </div>
                    <div style={{ fontSize: '2.8rem', fontWeight: '950', color: '#fbbf24' }}>
                      {partnerCODStats.unclearedCOD.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.6 }}>MMK</span>
                    </div>
                    <div style={{ fontSize: '1rem', color: '#fbbf24', fontWeight: '900', background: 'rgba(251, 191, 36, 0.2)', alignSelf: 'flex-start', padding: '4px 14px', borderRadius: '12px' }}>
                      {partnerCODStats.unclearedCount} 笔待结算
                    </div>
                    <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', fontSize: '6rem', opacity: 0.12, transform: 'rotate(-15deg)' }}>⏳</div>
                  </div>

                  {/* 上次结算 */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    padding: '2.5rem 2rem',
                    borderRadius: '35px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.4s ease'
                  }}>
                    <span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', fontWeight: '800' }}>{t.lastSettledAt}</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: '950', color: 'white', marginTop: '0.5rem', lineHeight: '1.2' }}>
                      {partnerCODStats.lastSettledAt ? formatDate(partnerCODStats.lastSettledAt) : t.noSettlement}
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#10b981', fontWeight: '900', background: 'rgba(16, 185, 129, 0.2)', alignSelf: 'flex-start', padding: '4px 14px', borderRadius: '12px', marginTop: 'auto' }}>
                      ✓ 结算已自动同步
                    </div>
                    <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', fontSize: '6rem', opacity: 0.12, transform: 'rotate(-15deg)' }}>✅</div>
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
                  <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '950', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{t.businessManagement}</h3>
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
                    
                    {/* 🚀 修复开关：增强交互与视觉 */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Toggle clicked, current value:', storeInfo.is_closed_today);
                        handleUpdateStoreStatus({ is_closed_today: !storeInfo.is_closed_today });
                      }}
                      style={{
                        width: '68px',
                        height: '36px',
                        borderRadius: '18px',
                        backgroundColor: storeInfo.is_closed_today ? '#ef4444' : 'rgba(255,255,255,0.2)',
                        position: 'relative',
                        cursor: 'pointer',
                        border: '2px solid rgba(255,255,255,0.3)',
                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        padding: 0,
                        zIndex: 100,
                        boxShadow: storeInfo.is_closed_today ? '0 0 15px rgba(239, 68, 68, 0.5)' : 'none'
                      }}
                    >
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '13px',
                        backgroundColor: 'white',
                        position: 'absolute',
                        top: '3px',
                        left: storeInfo.is_closed_today ? '37px' : '3px',
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
                        <input 
                          type="time"
                          value={(storeInfo.operating_hours || '09:00 - 21:00').split(' - ')[0]}
                          onChange={(e) => {
                            const end = (storeInfo.operating_hours || '09:00 - 21:00').split(' - ')[1];
                            handleUpdateStoreStatus({ operating_hours: `${e.target.value} - ${end}` });
                          }}
                          style={{ 
                            background: 'white', 
                            border: 'none', 
                            borderRadius: '15px', 
                            padding: '12px', 
                            color: '#1e293b', 
                            outline: 'none', 
                            cursor: 'pointer', 
                            fontWeight: '900',
                            fontSize: '1rem',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.closingTime}</label>
                        <input 
                          type="time"
                          value={(storeInfo.operating_hours || '09:00 - 21:00').split(' - ')[1]}
                          onChange={(e) => {
                            const start = (storeInfo.operating_hours || '09:00 - 21:00').split(' - ')[0];
                            handleUpdateStoreStatus({ operating_hours: `${start} - ${e.target.value}` });
                          }}
                          style={{ 
                            background: 'white', 
                            border: 'none', 
                            borderRadius: '15px', 
                            padding: '12px', 
                            color: '#1e293b', 
                            outline: 'none', 
                            cursor: 'pointer', 
                            fontWeight: '900', 
                            fontSize: '1rem',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
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
          <h2 style={{
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
                  .map((pkg) => (
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
                        {pkg.price ? `${pkg.price} MMK` : '-'}
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

                    {/* 代收款 - 仅当是合伙店铺或有代收款时显示 */}
                    {(isPartnerStore || (pkg.cod_amount && pkg.cod_amount > 0)) && (
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
                        {t.cod}: {pkg.cod_amount > 0 ? `${pkg.cod_amount} MMK` : t.none}
                      </div>
                    )}
                  </div>

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
                      width: '100%',
                      maxWidth: '200px',
                      marginTop: '0.5rem',
                      display: 'block',
                      marginLeft: 'auto',
                      marginRight: 'auto'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {t.viewDetails}
                  </button>
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

              {/* 🚀 新增：从描述中解析“付给商家”并显示 */}
              {(() => {
                const payMatch = selectedPackage.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်): (.*?) MMK\]/);
                if (payMatch && payMatch[1]) {
                  return (
                    <div>
                      <label style={{ color: '#10b981', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        {language === 'zh' ? '付给商家' : language === 'en' ? 'Pay to Merchant' : 'ဆိုင်သို့ ပေးချေရန်'}
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
                padding: '1.5rem'
              }}>
                <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1rem' }}>
                  {t.sender}
                </h3>
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
                padding: '1.5rem'
              }}>
                <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1rem' }}>
                  {t.receiver}
                </h3>
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
                        {t.cod}
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
                codOrders.map((order, index) => (
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
                  {products.map(product => (
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
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '3rem' }}>🖼️</span>
                        )}
                      </div>
                      <h4 style={{ color: 'white', fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.75rem 0' }}>{product.name}</h4>
                      <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.5rem' }}>{product.price.toLocaleString()} MMK</div>
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
                onClick={() => fileInputRef.current?.click()}
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
                  ref={fileInputRef} 
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>{t.productPrice} (MMK) *</label>
                  <input 
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
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
    </div>
  );
};

export default ProfilePage;

