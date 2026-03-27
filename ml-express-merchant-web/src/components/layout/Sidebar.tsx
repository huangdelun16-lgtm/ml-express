import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../Logo';
import { useLanguage } from '../../contexts/LanguageContext';

const Sidebar: React.FC<{ currentUser: any; onLogout: () => void }> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);

  // 🚀 自动根据路径展开菜单
  useEffect(() => {
    if (location.pathname === '/') {
      setIsAccountExpanded(true);
    }
  }, [location.pathname]);

  const mainMenuItems = [
    { id: '/', label: language === 'zh' ? '我的账号' : language === 'en' ? 'My Account' : 'ကျွန်ုပ်၏အကောင့်', icon: '👤' },
    { id: '/orders', label: language === 'zh' ? '订单列表' : language === 'en' ? 'Orders' : 'အော်ဒါစာရင်း', icon: '📋' },
    { id: '/products', label: language === 'zh' ? '商品管理' : language === 'en' ? 'Products' : 'ကုန်ပစ္စည်းစီမံမှု', icon: '🛍️' },
  ];

  const subMenuItems = [
    { id: 'cod-stats', label: language === 'zh' ? '代收款统计' : language === 'en' ? 'COD Stats' : 'COD စာရင်းအင်း', icon: '💰' },
    { id: 'business-hours', label: language === 'zh' ? '营业时间' : language === 'en' ? 'Business Hours' : 'ဖွင့်ချိန်သတ်မှတ်ချက်', icon: '⏰' },
  ];

  const handleMenuClick = (id: string) => {
    if (id === '/') {
      setIsAccountExpanded(!isAccountExpanded);
      if (location.pathname !== '/') navigate('/');
      return;
    }

    if (id === 'cod-stats') {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.getElementById('cod-stats-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById('cod-stats-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (id === 'business-hours') {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.getElementById('business-hours-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById('business-hours-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(id);
    }
  };

  return (
    <div style={sidebarStyle}>
      <div style={{ padding: '2rem 1.5rem' }}>
        <Logo size="small" />
        <div style={badgeStyle}>MERCHANTS</div>
      </div>

      <div style={menuContainerStyle}>
        {mainMenuItems.map((item) => {
          const isActive = location.pathname === item.id;
          const hasSubMenu = item.id === '/';
          
          return (
            <React.Fragment key={item.id}>
              <div
                onClick={() => handleMenuClick(item.id)}
                style={{
                  ...menuItemStyle,
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.6)',
                  borderLeft: isActive ? '4px solid #3b82f6' : '4px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  <span style={{ fontWeight: isActive ? '800' : '500' }}>{item.label}</span>
                </div>
                {hasSubMenu && (
                  <span style={{ 
                    fontSize: '0.8rem', 
                    transform: isAccountExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                    opacity: 0.5
                  }}>▼</span>
                )}
              </div>

              {/* 🚀 子菜单区域 */}
              {hasSubMenu && isAccountExpanded && (
                <div style={subMenuWrapperStyle}>
                  {subMenuItems.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => handleMenuClick(sub.id)}
                      style={subMenuItemStyle}
                      onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                    >
                      <span style={{ fontSize: '1rem' }}>{sub.icon}</span>
                      <span>{sub.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={footerStyle}>
        {/* 🚀 语言切换选择器 */}
        <div style={languageSelectorStyle}>
          {[
            { id: 'zh', label: '中' },
            { id: 'en', label: '英' },
            { id: 'my', label: '缅' }
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              style={{
                ...langButtonStyle,
                background: language === lang.id ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                color: language === lang.id ? 'white' : 'rgba(255,255,255,0.4)',
                fontWeight: language === lang.id ? 'bold' : 'normal',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div style={userCardStyle}>
          <div style={avatarStyle}>{currentUser?.name?.charAt(0)}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={userNameStyle}>{currentUser?.name}</div>
            <div style={userRoleStyle}>Store Admin</div>
          </div>
        </div>
        <button onClick={onLogout} style={logoutButtonStyle}>
          {language === 'zh' ? '安全退出' : language === 'en' ? 'Logout' : 'ထွက်ရန်'}
        </button>
      </div>
    </div>
  );
};

const sidebarStyle: React.CSSProperties = {
  width: '260px',
  height: '100vh',
  background: 'rgba(15, 23, 42, 0.95)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRight: '1px solid rgba(255,255,255,0.05)',
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  left: 0,
  top: 0,
  zIndex: 1000,
};

const badgeStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  background: '#f59e0b',
  color: '#000',
  padding: '2px 8px',
  borderRadius: '4px',
  fontWeight: '900',
  display: 'inline-block',
  marginTop: '8px',
  letterSpacing: '1px',
};

const menuContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: '1rem 0',
};

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '0.8rem 1.5rem',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  fontSize: '0.95rem',
  marginBottom: '4px',
};

const subMenuWrapperStyle: React.CSSProperties = {
  paddingLeft: '3.2rem',
  marginBottom: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginTop: '8px',
  animation: 'fadeIn 0.3s ease-out',
};

const subMenuItemStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'rgba(255,255,255,0.4)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  transition: 'color 0.2s ease',
};

const footerStyle: React.CSSProperties = {
  padding: '1.5rem',
  borderTop: '1px solid rgba(255,255,255,0.05)',
};

const userCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '1rem',
  background: 'rgba(255,255,255,0.03)',
  padding: '10px',
  borderRadius: '12px',
};

const avatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  background: '#3b82f6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  color: 'white',
};

const userNameStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: '700',
  color: 'white',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const userRoleStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'rgba(255,255,255,0.4)',
};

const logoutButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.8rem',
  background: 'rgba(239, 68, 68, 0.1)',
  color: '#ef4444',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 'bold',
  transition: 'all 0.2s',
};

const languageSelectorStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '1.5rem',
  background: 'rgba(255,255,255,0.02)',
  padding: '4px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.05)',
};

const langButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.85rem',
  transition: 'all 0.2s ease',
};

export default Sidebar;
