import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../components/home/NavigationBar';
import ClientInteriorShell from '../components/layout/ClientInteriorShell';
import { useLanguage } from '../contexts/LanguageContext';

const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t: allT } = useLanguage();
  const t = allT.privacy;
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

  return (
    <ClientInteriorShell>
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      padding: window.innerWidth < 768 ? '12px' : '20px'
    }}>
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
        color: '#1a2b48',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* 页面标题 */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: window.innerWidth < 768 ? '2.5rem' : '3.5rem',
            color: '#1a2b48',
            marginBottom: '1rem',
            fontWeight: '800',
            letterSpacing: '-1px'
          }}>
            {t.title}
          </h1>
          <p style={{
            fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem',
            color: '#4a6280',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
            {t.subtitle}
          </p>
          <p style={{
            fontSize: '0.9rem',
            color: '#6b7c93',
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
          background: '#ffffff',
          backdropFilter: 'blur(10px)',
          borderRadius: 'var(--card-radius-lg)',
          border: '1px solid rgba(26, 43, 72, 0.1)',
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
                color: '#1a2b48',
                fontSize: '1.6rem',
                fontWeight: '800',
                letterSpacing: '-1px',
                whiteSpace: 'nowrap'
              }}>
                MARKET LINK <span style={{ fontSize: '0.6em', fontStyle: 'italic', fontWeight: '400' }}>EXPRESS</span>
              </span>
              <span style={{
                color: '#4a6280',
                fontSize: '0.6rem',
                fontStyle: 'italic',
                fontWeight: '400',
                letterSpacing: '1px',
                marginTop: '-2px',
                textAlign: 'right',
                paddingRight: '4px'
              }}>
                Delivery Services
              </span>
            </div>
          </div>
          <p style={{ 
            color: '#4a6280',
            fontSize: '0.9rem',
            margin: '0.5rem 0'
          }}>
            © 2024 MARKET LINK EXPRESS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
    </ClientInteriorShell>
  );
};

export default PrivacyPolicyPage;

