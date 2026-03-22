import React, { useState, useEffect } from 'react';
import LoggerService from '../services/LoggerService';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
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
        LoggerService.error('加载用户信息失败:', error);
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
        top: '-10%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        zIndex: 1
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(66,153,225,0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        zIndex: 1
      }}></div>

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
      <section style={{
        position: 'relative',
        zIndex: 5,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-in-out',
        color: 'white'
      }}>
        {/* 页面标题 */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '5rem',
          marginTop: '2rem'
        }}>
          <h1 style={{
            fontSize: window.innerWidth < 768 ? '2.8rem' : '4.5rem',
            color: 'white',
            marginBottom: '1.5rem',
            fontWeight: '900',
            textShadow: '0 10px 20px rgba(0,0,0,0.2)',
            letterSpacing: '-2px',
            lineHeight: '1.1'
          }}>
            {t.features.title}
          </h1>
          <div style={{
            width: '80px',
            height: '6px',
            background: 'white',
            margin: '0 auto 2rem',
            borderRadius: '3px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}></div>
          <p style={{
            fontSize: window.innerWidth < 768 ? '1.1rem' : '1.4rem',
            color: 'rgba(255,255,255,0.95)',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6',
            fontWeight: '500',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {t.features.subtitle}
          </p>
        </div>

        {/* 服务特色卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1rem'
        }}
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
            },
            {
              icon: '🏙️', 
              title: t.services.sameday.title, 
              subtitle: t.services.sameday.subtitle,
              desc: t.services.sameday.desc,
              features: t.services.sameday.features,
              color: '#667eea',
              bgGradient: 'linear-gradient(135deg, #667eea, #764ba2)',
              iconBg: 'rgba(102, 126, 234, 0.2)'
            },
            {
              icon: '🛍️', 
              title: t.services.mall.title, 
              subtitle: t.services.mall.subtitle,
              desc: t.services.mall.desc,
              features: t.services.mall.features,
              color: '#f6ad55',
              bgGradient: 'linear-gradient(135deg, #f6ad55, #ed8936)',
              iconBg: 'rgba(246, 173, 85, 0.2)'
            },
            {
              icon: '💵', 
              title: t.services.cod.title, 
              subtitle: t.services.cod.subtitle,
              desc: t.services.cod.desc,
              features: t.services.cod.features,
              color: '#48bb78',
              bgGradient: 'linear-gradient(135deg, #48bb78, #38a169)',
              iconBg: 'rgba(72, 187, 120, 0.2)'
            },
            {
              icon: '👑', 
              title: t.services.vip.title, 
              subtitle: t.services.vip.subtitle,
              desc: t.services.vip.desc,
              features: t.services.vip.features,
              color: '#ecc94b',
              bgGradient: 'linear-gradient(135deg, #ecc94b, #d69e2e)',
              iconBg: 'rgba(236, 201, 75, 0.2)'
            }
          ].map((service: any, index: number) => (
            <div key={index} style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '24px',
              padding: '2rem',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              cursor: 'pointer',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : `translateY(50px)`,
              transitionDelay: `${index * 0.05}s`
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-15px) scale(1.03)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
              e.currentTarget.style.background = 'white';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
            }}
            >
              {/* 装饰性背景 */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: service.iconBg,
                borderRadius: '50%',
                filter: 'blur(20px)',
                opacity: '0.5'
              }}></div>

              {/* 图标区域 */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: service.bgGradient,
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '1.25rem',
                  boxShadow: `0 8px 15px ${service.color}44`
                }}>
                  <span style={{ fontSize: '26px' }}>{service.icon}</span>
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: '800',
                    color: '#1a202c',
                    margin: '0 0 2px 0',
                    letterSpacing: '-0.5px'
                  }}>
                    {service.title}
                  </h3>
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: service.color,
                    margin: 0,
                    fontWeight: '700',
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}>
                    {service.subtitle}
                  </p>
                </div>
              </div>

              {/* 描述 */}
              <p style={{ 
                fontSize: '0.95rem', 
                color: '#4a5568',
                marginBottom: '1.5rem',
                lineHeight: '1.6',
                fontWeight: '500',
                minHeight: '3rem'
              }}>
                {service.desc}
              </p>

              {/* 特色功能标签 */}
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '0.5rem',
                marginBottom: '1rem' 
              }}>
                {service.features.map((feature: string, idx: number) => (
                  <span key={idx} style={{
                    padding: '4px 12px',
                    background: `${service.color}11`,
                    color: service.color,
                    borderRadius: '100px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    border: `1px solid ${service.color}22`
                  }}>
                    {feature}
                  </span>
                ))}
              </div>

              {/* 底部装饰线 */}
              <div style={{
                width: '100%',
                height: '4px',
                background: '#f7fafc',
                borderRadius: '2px',
                marginTop: '1.5rem',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: '30%',
                  background: service.bgGradient,
                  borderRadius: '2px'
                }}></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
