import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ml-express-language') || 'zh';
  });
  const [isVisible, setIsVisible] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
        admin: '管理后台'
      },
      features: {
        title: '服务特色',
        fast: '快速配送',
        safe: '安全可靠',
        convenient: '便捷服务',
        affordable: '价格实惠'
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
      features: {
        title: 'Service Features',
        fast: 'Fast Delivery',
        safe: 'Safe & Reliable',
        convenient: 'Convenient',
        affordable: 'Affordable'
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
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        zIndex: 1
      }} />

      {/* 导航栏 */}
      <nav style={{
        position: 'relative',
        zIndex: 10,
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        padding: window.innerWidth < 768 ? '1rem' : '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
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
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.home}</button>
          <button style={{ 
            color: '#FFD700', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>{t.nav.services}</button>
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
            transition: 'color 0.3s ease',
            background: 'rgba(255,255,255,0.2)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.3)'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
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

      {/* 主要内容区域 */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-in-out',
        padding: window.innerWidth < 768 ? '2rem 1rem' : '4rem 2rem'
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
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
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
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '2.5rem',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : `translateY(${30 + index * 10}px)`,
              transitionDelay: `${index * 0.1}s`
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-12px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
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
