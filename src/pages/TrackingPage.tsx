import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('zh');
  const [isVisible, setIsVisible] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);

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
      tracking: {
        title: '包裹跟踪',
        placeholder: '请输入包裹单号',
        track: '查询',
        notFound: '未找到包裹信息',
        packageInfo: '包裹信息',
        trackingNumber: '单号',
        status: '状态',
        location: '当前位置',
        estimatedDelivery: '预计送达'
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
      tracking: {
        title: 'Package Tracking',
        placeholder: 'Enter tracking number',
        track: 'Track',
        notFound: 'Package not found',
        packageInfo: 'Package Information',
        trackingNumber: 'Number',
        status: 'Status',
        location: 'Current Location',
        estimatedDelivery: 'Estimated Delivery'
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

  const handleTracking = () => {
    if (!trackingNumber.trim()) {
      alert('请输入包裹单号');
      return;
    }

    // 模拟查询结果
    setTrackingResult({
      number: trackingNumber,
      status: '配送中',
      location: '曼德勒配送中心',
      estimatedDelivery: '2024年1月15日 14:00'
    });
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
          <button onClick={() => handleNavigation('/services')} style={{ 
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
          >{t.nav.services}</button>
          <button style={{ 
            color: '#FFD700', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>{t.nav.tracking}</button>
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
            {t.tracking.title}
          </h1>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
            实时查询您的包裹状态和位置信息
          </p>
        </div>

        {/* 跟踪查询区域 */}
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '3rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.3)'
        }}>
          {/* 查询输入区域 */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '2rem',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row'
          }}>
            <input
              type="text"
              placeholder={t.tracking.placeholder}
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              style={{
                flex: 1,
                padding: '1.2rem',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1.1rem',
                transition: 'border-color 0.3s ease',
                background: 'white'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={handleTracking}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '1.2rem 2.5rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                minWidth: window.innerWidth < 768 ? '100%' : 'auto',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
              }}
            >
              {t.tracking.track}
            </button>
          </div>
          
          {/* 查询结果 */}
          {trackingResult && (
            <div style={{
              background: 'linear-gradient(135deg, #e6f3ff 0%, #f0f8ff 100%)',
              padding: '2rem',
              borderRadius: '15px',
              border: '2px solid #667eea',
              animation: 'fadeInUp 0.5s ease-out'
            }}>
              <h3 style={{ 
                color: '#667eea', 
                marginBottom: '1.5rem', 
                fontSize: '1.3rem',
                fontWeight: '600'
              }}>
                📦 {t.tracking.packageInfo}
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
                gap: '1rem'
              }}>
                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                  <strong style={{ color: '#4a5568' }}>{t.tracking.trackingNumber}：</strong>
                  <span style={{ color: '#2d3748' }}>{trackingResult.number}</span>
                </div>
                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                  <strong style={{ color: '#4a5568' }}>{t.tracking.status}：</strong>
                  <span style={{ color: '#e53e3e', fontWeight: '600' }}>{trackingResult.status}</span>
                </div>
                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                  <strong style={{ color: '#4a5568' }}>{t.tracking.location}：</strong>
                  <span style={{ color: '#2d3748' }}>{trackingResult.location}</span>
                </div>
                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                  <strong style={{ color: '#4a5568' }}>{t.tracking.estimatedDelivery}：</strong>
                  <span style={{ color: '#38a169', fontWeight: '600' }}>{trackingResult.estimatedDelivery}</span>
                </div>
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <h4 style={{ color: '#667eea', marginBottom: '1rem', fontSize: '1.1rem' }}>
              💡 使用说明
            </h4>
            <ul style={{ color: '#4a5568', lineHeight: '1.6', margin: 0, paddingLeft: '1.5rem' }}>
              <li>输入您的包裹单号进行查询</li>
              <li>系统将显示包裹的实时状态和位置</li>
              <li>预计送达时间仅供参考，实际时间可能有所变化</li>
              <li>如有疑问，请联系客服获取更多帮助</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 添加CSS动画 */}
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default TrackingPage;