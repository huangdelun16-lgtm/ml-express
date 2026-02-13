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
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
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
                width: '40px',
                height: '3px',
                background: service.bgGradient,
                borderRadius: '2px',
                marginTop: '1rem'
              }}></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
