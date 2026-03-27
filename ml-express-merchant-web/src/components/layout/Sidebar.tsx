import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../Logo';
import { useLanguage } from '../../contexts/LanguageContext';

const Sidebar: React.FC<{ currentUser: any; onLogout: () => void }> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  const menuItems = [
    { id: '/', label: language === 'zh' ? '我的账号' : 'My Account', icon: '👤' },
    { id: '/orders', label: language === 'zh' ? '订单列表' : 'Orders', icon: '📋' },
    { id: '/products', label: language === 'zh' ? '商品管理' : 'Products', icon: '🛍️' },
    { id: 'cod-stats', label: language === 'zh' ? '代收款统计' : 'COD Stats', icon: '💰' },
    { id: 'business-hours', label: language === 'zh' ? '营业时间' : 'Business Hours', icon: '⏰' },
  ];

  const handleMenuClick = (id: string) => {
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
        {menuItems.map((item) => {
          const isActive = location.pathname === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              style={{
                ...menuItemStyle,
                background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.6)',
                borderRight: isActive ? '3px solid #3b82f6' : 'none',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              <span style={{ fontWeight: isActive ? '800' : '500' }}>{item.label}</span>
            </div>
          );
        })}
      </div>

      <div style={footerStyle}>
        <div style={userCardStyle}>
          <div style={avatarStyle}>{currentUser?.name?.charAt(0)}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={userNameStyle}>{currentUser?.name}</div>
            <div style={userRoleStyle}>Store Admin</div>
          </div>
        </div>
        <button onClick={onLogout} style={logoutButtonStyle}>
          {language === 'zh' ? '安全退出' : 'Logout'} 退出
        </button>
      </div>
    </div>
  );
};

const sidebarStyle: React.CSSProperties = {
  width: '260px',
  height: '100vh',
  background: 'rgba(15, 23, 42, 0.8)',
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
  gap: '12px',
  padding: '1rem 1.5rem',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  fontSize: '0.95rem',
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

export default Sidebar;
