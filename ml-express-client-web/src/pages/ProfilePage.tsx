import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageService } from '../services/supabase';

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
  const [searchTrackingNumber, setSearchTrackingNumber] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [packagesPerPage] = useState(5); // 每页显示5个包裹

  // 从本地存储加载用户信息
  const loadUserFromStorage = useCallback(() => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('加载用户信息失败:', error);
        setCurrentUser(null);
      }
    } else {
      // 如果未登录，重定向到首页
      navigate('/');
    }
  }, [navigate]);

  // 加载用户的包裹列表
  const loadUserPackages = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('开始加载用户包裹，用户信息:', {
        email: currentUser.email,
        phone: currentUser.phone,
        name: currentUser.name
      });
      
      const packages = await packageService.getPackagesByUser(
        currentUser.email,
        currentUser.phone
      );
      
      console.log('查询到的包裹数量:', packages.length);
      console.log('包裹列表:', packages);
      
      setUserPackages(packages);
    } catch (error) {
      console.error('加载包裹列表失败:', error);
      setUserPackages([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    setIsVisible(true);
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  useEffect(() => {
    loadUserPackages();
  }, [loadUserPackages]);

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

  // 语言切换函数
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
  };

  // 搜索包裹
  const handleSearchPackage = async () => {
    if (!searchTrackingNumber.trim()) {
      alert(language === 'zh' ? '请输入订单号' : language === 'en' ? 'Please enter tracking number' : 'အော်ဒါနံပါတ်ထည့်ပါ');
      return;
    }

    setSearching(true);
    try {
      const result = await packageService.searchPackage(searchTrackingNumber.trim());
      if (result) {
        setSearchResult(result);
        setShowSearchModal(true);
      } else {
        alert(language === 'zh' ? '未找到该订单' : language === 'en' ? 'Package not found' : 'အော်ဒါမတွေ့ရှိပါ');
      }
    } catch (error) {
      console.error('搜索包裹失败:', error);
      alert(language === 'zh' ? '搜索失败，请稍后重试' : language === 'en' ? 'Search failed, please try again' : 'ရှာဖွေမှုမအောင်မြင်ပါ');
    } finally {
      setSearching(false);
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
      price: '价格',
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
      qrPayment: '二维码支付',
      cashPayment: '现金支付',
      totalOrders: '全部订单',
      accountDate: '开户日期',
      pendingPickup: '待取件',
      inTransit: '配送中',
      completed: '已完成'
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
      price: 'Price',
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
      qrPayment: 'QR Code',
      cashPayment: 'Cash',
      totalOrders: 'Total Orders',
      accountDate: 'Account Created',
      pendingPickup: 'Pending Pickup',
      inTransit: 'In Transit',
      completed: 'Completed'
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
      price: 'စျေးနှုန်း',
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
      qrPayment: 'QR Code',
      cashPayment: 'ငွေသား',
      totalOrders: 'စုစုပေါင်းအော်ဒါ',
      accountDate: 'အကောင့်ဖွင့်ထားသောရက်စွဲ',
      pendingPickup: 'ကောက်ယူရန်စောင့်ဆိုင်းနေသည်',
      inTransit: 'ပို့ဆောင်နေသည်',
      completed: 'ပြီးစီးပြီး'
    }
  };

  const t = translations[language as keyof typeof translations] || translations.zh;

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
      return language === 'zh' ? '二维码支付' : language === 'en' ? 'QR Code' : 'QR Code';
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
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          flexWrap: 'wrap'
        }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              cursor: 'pointer',
              transition: 'opacity 0.3s ease'
            }}
            onClick={() => navigate('/')}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            {/* LOGO图片 */}
            <img 
              src="/logo.png" 
              alt="ML Express Logo"
              style={{
                width: window.innerWidth < 768 ? '40px' : '50px',
                height: window.innerWidth < 768 ? '40px' : '50px',
                objectFit: 'contain'
              }}
            />
            
            {/* 公司名称 - 与其他页面一致的单行显示 */}
            <span style={{
              color: 'white',
              fontSize: window.innerWidth < 768 ? '1.6rem' : '2.2rem',
              fontWeight: '800',
              textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
              background: 'linear-gradient(45deg, #ffffff, #f0f8ff, #e6f3ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-1px',
              lineHeight: '1.1',
              whiteSpace: 'nowrap'
            }}>
              MARKET LINK <span style={{ fontSize: '0.6em', fontStyle: 'italic', fontWeight: '400' }}>EXPRESS</span>
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >{t.nav.home}</button>
            <button
              onClick={() => navigate('/services')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >{t.nav.services}</button>
            <button
              onClick={() => navigate('/tracking')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >{t.nav.tracking}</button>
            <button
              onClick={() => navigate('/contact')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >{t.nav.contact}</button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: window.innerWidth < 1024 ? 'flex-start' : 'flex-end',
          rowGap: '0.5rem'
        }}>
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
            <span style={{ 
              color: 'white',
              fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem',
              fontWeight: 'bold'
            }}>
              {t.welcome}, {currentUser.name}
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
              {t.logout}
            </button>
          </div>
          
          {/* 语言选择器 */}
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
      </nav>

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
          textAlign: 'center',
          marginBottom: '3rem',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'all 0.6s ease'
        }}>
          <h1 style={{
            color: 'white',
            fontSize: '3rem',
            marginBottom: '1rem',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            {t.title}
          </h1>
        </div>

        {/* 用户信息卡片 - 参考客户端app样式 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.3)',
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
            borderBottom: '2px solid rgba(255,255,255,0.3)'
          }}>
            {/* 头像 */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid rgba(255, 255, 255, 0.5)',
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'white',
              flexShrink: 0
            }}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            
            {/* 用户基本信息 */}
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {currentUser.name || '-'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                {currentUser.email || '-'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>
                {currentUser.phone || '-'}
              </div>
            </div>
          </div>

          {/* 订单统计卡片 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* 全部订单 */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              padding: '1rem',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {t.totalOrders}
              </div>
              <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {orderStats.total}
              </div>
            </div>

            {/* 待取件 */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              padding: '1rem',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {t.pendingPickup}
              </div>
              <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {orderStats.pendingPickup}
              </div>
            </div>

            {/* 配送中 */}
            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              borderRadius: '12px',
              padding: '1rem',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {t.inTransit}
              </div>
              <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {orderStats.inTransit}
              </div>
            </div>

            {/* 已完成 */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: '12px',
              padding: '1rem',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {t.completed}
              </div>
              <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {orderStats.completed}
              </div>
            </div>
          </div>

          {/* 详细信息网格 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
            gap: '1.5rem'
          }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                {t.accountDate}
              </label>
              <div style={{ color: 'white', fontSize: '1rem' }}>
                {currentUser.created_at 
                  ? new Date(currentUser.created_at).toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'my-MM', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : '-'}
              </div>
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                {t.address}
              </label>
              <div style={{ color: 'white', fontSize: '1rem' }}>
                {currentUser.address || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* 搜索包裹功能 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease 0.3s'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '1.5rem',
            marginBottom: '1.5rem',
            borderBottom: '2px solid rgba(255,255,255,0.3)',
            paddingBottom: '0.5rem'
          }}>
            {t.searchPackage}
          </h2>
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              value={searchTrackingNumber}
              onChange={(e) => setSearchTrackingNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearchPackage();
                }
              }}
              placeholder={t.searchPlaceholder}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '1rem',
                backdropFilter: 'blur(10px)'
              }}
            />
            <button
              onClick={handleSearchPackage}
              disabled={searching}
              style={{
                background: 'rgba(59, 130, 246, 0.5)',
                color: 'white',
                border: '1px solid rgba(59, 130, 246, 0.7)',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                cursor: searching ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                opacity: searching ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!searching) {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.7)';
                }
              }}
              onMouseOut={(e) => {
                if (!searching) {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.5)';
                }
              }}
            >
              {searching ? (language === 'zh' ? '搜索中...' : language === 'en' ? 'Searching...' : 'ရှာဖွေနေသည်...') : t.search}
            </button>
          </div>
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
                  </div>

                  <button
                    onClick={() => navigate(`/tracking?trackingNumber=${pkg.id}`)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.3)',
                      color: 'white',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      padding: '0.5rem 1.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      width: '100%'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.5)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
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
                  : `${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, userPackages.length)} ကို ပြသထားသည်၊ စုစုပေါင်း ${userPackages.length}`
                }
              </div>
            </>
          )}
        </div>
      </div>

      {/* 搜索结果显示模态框 */}
      {showSearchModal && searchResult && (
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
        onClick={() => setShowSearchModal(false)}
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
                onClick={() => setShowSearchModal(false)}
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
                  {searchResult.id}
                </div>
              </div>

              {/* 状态 */}
              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                  {t.status}
                </label>
                <div style={{
                  display: 'inline-block',
                  background: getStatusColor(searchResult.status === '待收款' ? '待取件' : searchResult.status),
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}>
                  {searchResult.status === '待收款' ? getStatusText(searchResult.status) : searchResult.status}
                </div>
              </div>

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
                      {searchResult.sender_name || '-'}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                      {t.phone}
                    </label>
                    <div style={{ color: 'white', fontSize: '1rem' }}>
                      {searchResult.sender_phone || '-'}
                    </div>
                  </div>
                  <div style={{ gridColumn: window.innerWidth < 768 ? '1' : '1 / -1' }}>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                      {t.address}
                    </label>
                    <div style={{ color: 'white', fontSize: '1rem' }}>
                      {searchResult.sender_address || '-'}
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
                      {searchResult.receiver_name || '-'}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                      {t.phone}
                    </label>
                    <div style={{ color: 'white', fontSize: '1rem' }}>
                      {searchResult.receiver_phone || '-'}
                    </div>
                  </div>
                  <div style={{ gridColumn: window.innerWidth < 768 ? '1' : '1 / -1' }}>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                      {t.address}
                    </label>
                    <div style={{ color: 'white', fontSize: '1rem' }}>
                      {searchResult.receiver_address || '-'}
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
                    {searchResult.package_type || '-'}
                  </div>
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                    {language === 'zh' ? '重量' : language === 'en' ? 'Weight' : 'အလေးချိန်'}
                  </label>
                  <div style={{ color: 'white', fontSize: '1rem' }}>
                    {searchResult.weight || '-'}
                  </div>
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                    {t.price}
                  </label>
                  <div style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>
                    {searchResult.price || '-'}
                  </div>
                </div>
              </div>

              {/* 查看详情按钮 */}
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  navigate(`/tracking?trackingNumber=${searchResult.id}`);
                }}
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
                {t.viewDetails}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

