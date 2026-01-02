import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const currentUserRole = sessionStorage.getItem('currentUserRole') || localStorage.getItem('currentUserRole') || 'operator';
  const currentUserPermissionsStr = sessionStorage.getItem('currentUserPermissions') || localStorage.getItem('currentUserPermissions') || '[]';
  const currentUserPermissions = JSON.parse(currentUserPermissionsStr);

  const menuItems = [
    {
      id: 'dashboard',
      path: '/admin/dashboard',
      title: language === 'zh' ? '仪表板' : language === 'en' ? 'Dashboard' : 'ဒက်ရှ်ဘုတ်',
      icon: '🏠',
      roles: ['admin', 'manager', 'operator', 'finance']
    },
    {
      id: 'city_packages',
      path: '/admin/city-packages',
      title: language === 'zh' ? '同城订单' : language === 'en' ? 'City Orders' : 'မြို့တွင်းအော်ဒါ',
      icon: '📦',
      roles: ['admin', 'manager', 'operator', 'finance']
    },
    {
      id: 'tracking',
      path: '/admin/realtime-tracking',
      title: language === 'zh' ? '实时跟踪' : language === 'en' ? 'Tracking' : 'ခြေရာခံမှု',
      icon: '📍',
      roles: ['admin', 'manager', 'operator', 'finance']
    },
    {
      id: 'users',
      path: '/admin/users',
      title: language === 'zh' ? '用户管理' : language === 'en' ? 'Users' : 'အသုံးပြုသူ',
      icon: '👥',
      roles: ['admin', 'manager']
    },
    {
      id: 'partner_stores',
      path: '/admin/delivery-stores',
      title: language === 'zh' ? '合伙店铺' : language === 'en' ? 'Stores' : 'ဆိုင်များ',
      icon: '🏪',
      roles: ['admin', 'manager']
    },
    {
      id: 'finance',
      path: '/admin/finance',
      title: language === 'zh' ? '财务管理' : language === 'en' ? 'Finance' : 'ဘဏ္ဍာရေး',
      icon: '💰',
      roles: ['admin', 'manager', 'finance']
    },
    {
      id: 'delivery_alerts',
      path: '/admin/delivery-alerts',
      title: language === 'zh' ? '配送警报' : language === 'en' ? 'Alerts' : 'သတိပေးချက်',
      icon: '🚨',
      roles: ['admin', 'manager', 'finance']
    },
    {
      id: 'banners',
      path: '/admin/banners',
      title: language === 'zh' ? '广告管理' : language === 'en' ? 'Banners' : 'ကြော်ငြာ',
      icon: '🖼️',
      roles: ['admin', 'manager']
    },
    {
      id: 'settings',
      path: '/admin/settings',
      title: language === 'zh' ? '系统设置' : language === 'en' ? 'Settings' : 'ချိန်ညှိမှု',
      icon: '⚙️',
      roles: ['admin']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (currentUserPermissions && Array.isArray(currentUserPermissions) && currentUserPermissions.length > 0) {
      if (currentUserPermissions.includes(item.id)) return true;
    }
    return item.roles.includes(currentUserRole);
  });

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const sidebarWidth = isCollapsed ? '80px' : '260px';

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 1100,
            background: '#1e293b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          {showMobileSidebar ? '✕' : '☰'}
        </button>
      )}

      {/* Sidebar Container */}
      <div
        style={{
          width: isMobile ? (showMobileSidebar ? '260px' : '0') : sidebarWidth,
          height: '100vh',
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1000,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '4px 0 15px rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        {/* Logo Section */}
        <div style={{
          padding: '30px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          whiteSpace: 'nowrap'
        }}>
          <div style={{
            minWidth: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 0 15px rgba(37, 99, 235, 0.4)'
          }}>ML</div>
          {!isCollapsed && (
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.5px' }}>
              MARKET LINK
            </span>
          )}
        </div>

        {/* Menu Items */}
        <div style={{ flex: 1, padding: '20px 10px', overflowY: 'auto' }}>
          {filteredMenuItems.map(item => (
            <div
              key={item.id}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setShowMobileSidebar(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 15px',
                marginBottom: '8px',
                borderRadius: '12px',
                cursor: 'pointer',
                background: isActive(item.path) ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isActive(item.path) ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                transition: 'all 0.2s ease',
                border: isActive(item.path) ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                }
              }}
            >
              <span style={{ fontSize: '1.4rem', minWidth: '35px', display: 'flex', justifyContent: 'center' }}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span style={{ marginLeft: '12px', fontWeight: 600, fontSize: '0.95rem' }}>
                  {item.title}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Collapse Toggle */}
        {!isMobile && (
          <div
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              padding: '20px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              color: 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >
            <span style={{ fontSize: '1.2rem' }}>
              {isCollapsed ? '➡' : '⬅'}
            </span>
            {!isCollapsed && <span style={{ marginLeft: '12px', fontSize: '0.9rem' }}>收起菜单</span>}
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {isMobile && showMobileSidebar && (
        <div
          onClick={() => setShowMobileSidebar(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 999
          }}
        />
      )}
    </>
  );
};

export default Sidebar;

