import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';

const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
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
      overflow: 'hidden',
      padding: window.innerWidth < 768 ? '12px' : '20px'
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
        currentUser={null} 
        onLogout={() => {}} 
        onShowRegisterModal={(isLoginMode) => {
          navigate('/', { state: { showModal: true, isLoginMode } });
        }} 
        
      />

      {/* 主要内容区域 */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-in-out',
        color: 'white',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* 页面标题 */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: window.innerWidth < 768 ? '2.5rem' : '3.5rem',
            color: 'white',
            marginBottom: '1rem',
            fontWeight: '800',
            textShadow: '2px 2px 8px rgba(0,0,0,0.3)',
            letterSpacing: '-1px'
          }}>
            {t.title}
          </h1>
          <p style={{
            fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem',
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
            {t.subtitle}
          </p>
          <p style={{
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.7)',
            marginTop: '1rem'
          }}>
            {t.lastUpdated}
          </p>
        </div>

        {/* 隐私政策内容 */}
        <div style={{
          background: 'var(--card-bg)',
          backdropFilter: 'var(--card-backdrop)',
          borderRadius: 'var(--card-radius-lg)',
          padding: 'var(--card-padding-lg)',
          border: 'var(--card-border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '2rem'
        }}>
          {Object.values(t.sections).map((section: any, index: number) => (
            <div key={index} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#2d3748',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '2px solid #428cc9'
              }}>
                {section.title}
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#4a5568',
                lineHeight: '1.8',
                marginBottom: section.items ? '1rem' : 0
              }}>
                {section.content}
              </p>
              {section.items && (
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '1rem 0'
                }}>
                  {section.items.map((item: string, itemIndex: number) => (
                    <li key={itemIndex} style={{
                      padding: '0.5rem 0',
                      paddingLeft: '1.5rem',
                      position: 'relative',
                      fontSize: '1rem',
                      color: '#4a5568',
                      lineHeight: '1.8'
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: 0,
                        color: '#428cc9',
                        fontWeight: 'bold'
                      }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.note && (
                <div style={{
                  background: 'rgba(66, 140, 201, 0.1)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginTop: '1rem',
                  borderLeft: '4px solid #428cc9'
                }}>
                  <p style={{
                    fontSize: '0.95rem',
                    color: '#2d3748',
                    lineHeight: '1.6',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    {section.note}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 页脚信息 */}
        <div style={{
          textAlign: 'center',
          padding: 'var(--card-padding-lg)',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: 'var(--card-radius-lg)',
          border: 'var(--card-border)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1rem' }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ 
                width: '40px', 
                height: '40px' 
              }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ 
                color: 'white',
                fontSize: '1.6rem',
                fontWeight: '800',
                textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
                background: 'linear-gradient(45deg, #ffffff, #f0f8ff, #e6f3ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-1px',
                whiteSpace: 'nowrap'
              }}>
                MARKET LINK <span style={{ fontSize: '0.6em', fontStyle: 'italic', fontWeight: '400' }}>EXPRESS</span>
              </span>
              <span style={{
                color: 'white',
                fontSize: '0.6rem',
                fontStyle: 'italic',
                fontWeight: '400',
                letterSpacing: '1px',
                opacity: 0.9,
                marginTop: '-2px',
                textAlign: 'right',
                paddingRight: '4px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
              }}>
                Delivery Services
              </span>
            </div>
          </div>
          <p style={{ 
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.9rem',
            margin: '0.5rem 0'
          }}>
            © 2024 MARKET LINK EXPRESS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

