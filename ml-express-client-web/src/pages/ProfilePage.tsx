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
      const packages = await packageService.getPackagesByUser(
        currentUser.email,
        currentUser.phone
      );
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
      name: '姓名'
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
      close: 'Close'
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
      close: 'ပိတ်ရန်'
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
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0.5rem',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🚚 MARKET LINK EXPRESS
          </button>

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

        {/* 用户信息卡片 */}
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
          <h2 style={{
            color: 'white',
            fontSize: '1.5rem',
            marginBottom: '1.5rem',
            borderBottom: '2px solid rgba(255,255,255,0.3)',
            paddingBottom: '0.5rem'
          }}>
            {t.userInfo}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
            gap: '1.5rem'
          }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                {t.name}
              </label>
              <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 'bold' }}>
                {currentUser.name || '-'}
              </div>
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                {t.email}
              </label>
              <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 'bold' }}>
                {currentUser.email || '-'}
              </div>
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                {t.phone}
              </label>
              <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 'bold' }}>
                {currentUser.phone || '-'}
              </div>
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                {t.address}
              </label>
              <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 'bold' }}>
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
            <div style={{
              display: 'grid',
              gap: '1rem'
            }}>
              {userPackages.map((pkg) => (
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
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        {t.packageId}
                      </div>
                      <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {pkg.id}
                      </div>
                    </div>
                    <div style={{
                      background: getStatusColor(pkg.status === '待收款' ? '待取件' : pkg.status),
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      {pkg.status === '待收款' ? getStatusText(pkg.status) : pkg.status}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        {t.createTime}
                      </div>
                      <div style={{ color: 'white', fontSize: '1rem' }}>
                        {pkg.create_time || pkg.created_at || '-'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        {t.price}
                      </div>
                      <div style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>
                        {pkg.price ? `${pkg.price} MMK` : '-'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        {language === 'zh' ? '包裹类型' : language === 'en' ? 'Package Type' : 'ပက်ကေ့ဂျ်အမျိုးအစား'}
                      </div>
                      <div style={{ color: 'white', fontSize: '1rem' }}>
                        {pkg.package_type || '-'}
                      </div>
                    </div>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

