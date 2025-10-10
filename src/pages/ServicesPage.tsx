import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('zh');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
    }
  };

  const t = translations[language as keyof typeof translations] || translations.zh;

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };

  const handleNavigation = (path: string) => {
    setIsVisible(false);
    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            fontSize: window.innerWidth < 768 ? '1.2rem' : '1.5rem', 
            fontWeight: 'bold' 
          }}>
            MARKET LINK EXPRESS
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
          onMouseOut={(e) => e.currentTarget.style.color = 'white')}
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
          onMouseOut={(e) => e.currentTarget.style.color = 'white')}
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
          onMouseOut={(e) => e.currentTarget.style.color = 'white')}
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
          
          {/* 语言切换 */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['zh', 'en'].map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                style={{
                  background: language === lang ? 'rgba(255,255,255,0.3)' : 'transparent',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = language === lang ? 'rgba(255,255,255,0.3)' : 'transparent'}
              >
                {lang.toUpperCase()}
              </button>
            ))}
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
            专业、高效、值得信赖的快递服务体验
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
              title: '闪电配送', 
              subtitle: 'LIGHTNING DELIVERY',
              desc: '30分钟内上门取件，极速送达',
              features: ['实时定位', '智能路线', '即时通知'],
              color: '#ff6b6b',
              bgGradient: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
              iconBg: 'rgba(255, 107, 107, 0.2)'
            },
            { 
              icon: '🛡️', 
              title: '安全护航', 
              subtitle: 'SECURE ESCORT',
              desc: '全程保险保障，零风险配送',
              features: ['全程保险', '实时监控', '安全认证'],
              color: '#4ecdc4',
              bgGradient: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
              iconBg: 'rgba(78, 205, 196, 0.2)'
            },
            { 
              icon: '📱', 
              title: '智能服务', 
              subtitle: 'SMART SERVICE',
              desc: '在线下单，实时跟踪，智能客服',
              features: ['在线下单', '实时跟踪', 'AI客服'],
              color: '#45b7d1',
              bgGradient: 'linear-gradient(135deg, #45b7d1, #96c93d)',
              iconBg: 'rgba(69, 183, 209, 0.2)'
            },
            { 
              icon: '💎', 
              title: '透明定价', 
              subtitle: 'TRANSPARENT PRICING',
              desc: '价格透明，无隐藏费用，物超所值',
              features: ['透明定价', '无隐藏费', '优惠活动'],
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
