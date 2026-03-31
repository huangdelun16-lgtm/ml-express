import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';

const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t: allT } = useLanguage();
  const t = allT.terms;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
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

        {/* 条款内容 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: window.innerWidth < 768 ? '1.5rem' : '3rem',
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
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
            </div>
          ))}
        </div>

        {/* 页脚 */}
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', margin: 0 }}>
            © 2024 MARKET LINK EXPRESS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
