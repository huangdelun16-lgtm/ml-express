import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ml-express-language') || 'zh';
  });
  const [isVisible, setIsVisible] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setIsVisible(true);
    loadUserFromStorage();
  }, []);

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

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    setCurrentUser(null);
    // 刷新页面以更新UI
    window.location.reload();
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

  const translations = {
    zh: {
      nav: {
        home: '首页',
        services: '服务',
        tracking: '包裹跟踪',
        contact: '联系我们',
        admin: '管理后台',
      },
      features: {
        title: '服务特色',
        subtitle: '专业、高效、值得信赖的快递服务体验',
        fast: '快速配送',
        safe: '安全可靠',
        convenient: '便捷服务',
        affordable: '价格实惠'
      },
      services: {
        lightning: {
          title: '闪电配送',
          subtitle: 'LIGHTNING DELIVERY',
          desc: '30分钟内上门取件，极速送达',
          features: ['实时定位', '智能路线', '即时通知']
        },
        secure: {
          title: '安全护航',
          subtitle: 'SECURE ESCORT',
          desc: '全程保险保障，零风险配送',
          features: ['全程保险', '实时监控', '安全认证']
        },
        smart: {
          title: '智能服务',
          subtitle: 'SMART SERVICE',
          desc: '在线下单，实时跟踪，智能客服',
          features: ['在线下单', '实时跟踪', 'AI客服']
        },
        transparent: {
          title: '透明定价',
          subtitle: 'TRANSPARENT PRICING',
          desc: '价格透明，无隐藏费用，物超所值',
          features: ['透明定价', '无隐藏费', '优惠活动']
        }
      }
    },
    en: {
      nav: {
        home: 'Home',
        services: 'Services',
        tracking: 'Tracking',
        contact: 'Contact',
        admin: 'Admin',
      },
      features: {
        title: 'Service Features',
        subtitle: 'Professional, efficient, and trustworthy express delivery service experience',
        fast: 'Fast Delivery',
        safe: 'Safe & Reliable',
        convenient: 'Convenient',
        affordable: 'Affordable'
      },
      services: {
        lightning: {
          title: 'Lightning Delivery',
          subtitle: 'LIGHTNING DELIVERY',
          desc: 'Door-to-door pickup within 30 minutes, ultra-fast delivery',
          features: ['Real-time Location', 'Smart Routing', 'Instant Notifications']
        },
        secure: {
          title: 'Secure Escort',
          subtitle: 'SECURE ESCORT',
          desc: 'Full insurance coverage, zero-risk delivery',
          features: ['Full Insurance', 'Real-time Monitoring', 'Security Certification']
        },
        smart: {
          title: 'Smart Service',
          subtitle: 'SMART SERVICE',
          desc: 'Online ordering, real-time tracking, smart customer service',
          features: ['Online Ordering', 'Real-time Tracking', 'AI Customer Service']
        },
        transparent: {
          title: 'Transparent Pricing',
          subtitle: 'TRANSPARENT PRICING',
          desc: 'Transparent pricing, no hidden fees, great value',
          features: ['Transparent Pricing', 'No Hidden Fees', 'Special Offers']
        }
      }
    },
    my: {
      nav: {
        home: 'ပင်မ',
        services: 'ဝန်ဆောင်မှု',
        tracking: 'ထုပ်ပိုးခြင်း',
        contact: 'ဆက်သွယ်ရန်',
        admin: 'စီမံခန့်ခွဲမှု',
      },
      features: {
        title: 'ဝန်ဆောင်မှုများ',
        subtitle: 'ပရော်ဖက်ရှင်နယ်၊ ထိရောက်သော၊ ယုံကြည်စိတ်ချရသော ပို့ဆောင်မှု အတွေ့အကြုံ',
        fast: 'မြန်ဆန်သော ပို့ဆောင်မှု',
        safe: 'လုံခြုံသော ဝန်ဆောင်မှု',
        convenient: 'အဆင်ပြေသော ဝန်ဆောင်မှု',
        affordable: 'စျေးနှုန်းသင့်တင့်သော'
      },
      services: {
        lightning: {
          title: 'မြန်ဆန်သော ပို့ဆောင်မှု',
          subtitle: 'LIGHTNING DELIVERY',
          desc: 'မိနစ် ၃၀ အတွင်း အိမ်တွင်းလာယူ၊ အလျင်အမြန် ပို့ဆောင်ခြင်း',
          features: ['လက်ရှိတည်နေရာ', 'ဉာဏ်ရည်တု လမ်းကြောင်း', 'ချက်ချင်း အကြောင်းကြားခြင်း']
        },
        secure: {
          title: 'လုံခြုံသော စောင့်ရှောက်မှု',
          subtitle: 'SECURE ESCORT',
          desc: 'တစ်လျှောက်လုံး အာမခံအကာအကွယ်၊ အန္တရာယ်မရှိသော ပို့ဆောင်မှု',
          features: ['တစ်လျှောက်လုံး အာမခံ', 'လက်ရှိ စောင့်ကြည့်ခြင်း', 'လုံခြုံမှု အတည်ပြုခြင်း']
        },
        smart: {
          title: 'ဉာဏ်ရည်တု ဝန်ဆောင်မှု',
          subtitle: 'SMART SERVICE',
          desc: 'အွန်လိုင်း အမှာတင်ခြင်း၊ လက်ရှိ စောင့်ကြည့်ခြင်း၊ ဉာဏ်ရည်တု ဖောက်သည်ဝန်ဆောင်မှု',
          features: ['အွန်လိုင်း အမှာတင်ခြင်း', 'လက်ရှိ စောင့်ကြည့်ခြင်း', 'AI ဖောက်သည်ဝန်ဆောင်မှု']
        },
        transparent: {
          title: 'ပွင့်လင်းသော စျေးနှုန်းသတ်မှတ်ခြင်း',
          subtitle: 'TRANSPARENT PRICING',
          desc: 'စျေးနှုန်း ပွင့်လင်းမြင်သာမှု၊ ဖုံးကွယ်ထားသော ကုန်ကျစရိတ်မရှိ၊ တန်ဖိုးရှိသော',
          features: ['ပွင့်လင်းသော စျေးနှုန်းသတ်မှတ်ခြင်း', 'ဖုံးကွယ်ထားသော ကုန်ကျစရိတ်မရှိ', 'အထူးလျော့စျေးများ']
        }
      }
    }
  };

  const t = translations[language as keyof typeof translations] || translations.zh;


  const handleNavigation = (path: string) => {
    setIsVisible(false);
    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: window.innerWidth < 768 ? '12px' : '20px',
      position: 'relative',
      overflow: 'hidden'
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

      {/* 导航栏 */}
      <nav style={{
        position: 'relative',
        zIndex: 10,
        background: 'transparent',
        padding: 0,
        marginBottom: window.innerWidth < 768 ? '24px' : '40px',
          display: 'flex',
          justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'none'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              width: window.innerWidth < 768 ? '40px' : '50px', 
              height: window.innerWidth < 768 ? '40px' : '50px' 
            }} 
          />
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
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <button onClick={() => handleNavigation('/')} style={{ 
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
          >{t.nav.home}</button>
          <button style={{ 
            color: '#FFD700', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-bold)',
            textAlign: 'center',
            padding: 'var(--spacing-2) var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            transition: 'all var(--transition-fast)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            lineHeight: 'var(--line-height-normal)'
          }}>{t.nav.services}</button>
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
          
          {/* 注册/登录按钮（放在语言选择器右侧） */}
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
          ) : null}
          
          {/* 自定义语言选择器 */}
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
      </nav>

      {/* 主要内容区域 */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-in-out',
        color: 'white'
      }}>
        {/* 页面标题 */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{
            fontSize: window.innerWidth < 768 ? '2.5rem' : '3.5rem',
            color: 'white',
            marginBottom: '1rem',
            fontWeight: '800',
            textShadow: '2px 2px 8px rgba(0,0,0,0.3)',
            letterSpacing: '-1px'
          }}>
            {t.features.title}
          </h1>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
            {t.features.subtitle}
          </p>
        </div>

        {/* 服务特色卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--spacing-8)',
          maxWidth: '1200px',
          margin: '0 auto'
        }}
        className="grid grid-2"
        >
          {[
            { 
              icon: '⚡', 
              title: t.services.lightning.title, 
              subtitle: t.services.lightning.subtitle,
              desc: t.services.lightning.desc,
              features: t.services.lightning.features,
              color: '#ff6b6b',
              bgGradient: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
              iconBg: 'rgba(255, 107, 107, 0.2)'
            },
            { 
              icon: '🛡️', 
              title: t.services.secure.title, 
              subtitle: t.services.secure.subtitle,
              desc: t.services.secure.desc,
              features: t.services.secure.features,
              color: '#4ecdc4',
              bgGradient: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
              iconBg: 'rgba(78, 205, 196, 0.2)'
            },
            { 
              icon: '📱', 
              title: t.services.smart.title, 
              subtitle: t.services.smart.subtitle,
              desc: t.services.smart.desc,
              features: t.services.smart.features,
              color: '#45b7d1',
              bgGradient: 'linear-gradient(135deg, #45b7d1, #96c93d)',
              iconBg: 'rgba(69, 183, 209, 0.2)'
            },
            { 
              icon: '💎', 
              title: t.services.transparent.title, 
              subtitle: t.services.transparent.subtitle,
              desc: t.services.transparent.desc,
              features: t.services.transparent.features,
              color: '#f093fb',
              bgGradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
              iconBg: 'rgba(240, 147, 251, 0.2)'
            }
          ].map((service, index) => (
            <div key={index} style={{
              background: 'var(--card-bg)',
              backdropFilter: 'var(--card-backdrop)',
              borderRadius: 'var(--card-radius-lg)',
              padding: 'var(--card-padding-lg)',
              position: 'relative',
              overflow: 'hidden',
              border: 'var(--card-border)',
              boxShadow: 'var(--shadow-card)',
              transition: 'all var(--transition-base)',
              cursor: 'pointer',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : `translateY(${30 + index * 10}px)`,
              transitionDelay: `${index * 0.1}s`
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-12px) scale(1.02)';
              e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = isVisible ? 'translateY(0)' : `translateY(${30 + index * 10}px)`;
              e.currentTarget.style.boxShadow = 'var(--shadow-card)';
            }}
            >
              {/* 装饰性背景 */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '120px',
                height: '120px',
                background: service.iconBg,
                borderRadius: '50%',
                opacity: '0.6'
              }}></div>

              {/* 图标区域 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: service.bgGradient,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '1rem',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                }}>
                  <span style={{ fontSize: '28px' }}>{service.icon}</span>
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#2d3748',
                    margin: '0 0 4px 0',
                    letterSpacing: '-0.5px'
                  }}>
                    {service.title}
                  </h3>
                  <p style={{ 
                    fontSize: '0.8rem', 
                    color: '#718096',
                    margin: 0,
                    fontWeight: '500',
                    letterSpacing: '1px'
                  }}>
                    {service.subtitle}
                  </p>
                </div>
              </div>

              {/* 描述 */}
              <p style={{ 
                fontSize: '1rem', 
                color: '#4a5568',
                marginBottom: '1.5rem',
                lineHeight: '1.6',
                fontWeight: '400'
              }}>
                {service.desc}
              </p>

              {/* 特色功能列表 */}
              <div style={{ marginBottom: '1.5rem' }}>
                {service.features.map((feature, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: '#4a5568'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      background: service.color,
                      borderRadius: '50%',
                      marginRight: '0.75rem'
                    }}></div>
                    <span style={{ fontWeight: '500' }}>{feature}</span>
                  </div>
                ))}
              </div>

              {/* 底部装饰线 */}
              <div style={{
                height: '3px',
                background: service.bgGradient,
                borderRadius: '2px',
                marginTop: '1rem'
              }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
