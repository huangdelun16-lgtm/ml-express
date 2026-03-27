import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../Logo';
import { useLanguage } from '../../contexts/LanguageContext';

interface NavigationBarProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  currentUser: any;
  onLogout: () => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  language,
  onLanguageChange,
  currentUser,
  onLogout
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  return (
    <nav style={{
      position: 'relative',
      zIndex: 9999,
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      padding: '1rem 2rem',
      borderRadius: '16px',
      marginBottom: '2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Logo size="small" />
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* 商家端主要导航 */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/')} style={navButtonStyle}>管理概况</button>
          <button onClick={() => navigate('/products')} style={navButtonStyle}>商品管理</button>
          <button onClick={() => navigate('/orders')} style={navButtonStyle}>订单列表</button>
        </div>

        <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.2)' }} />

        {/* 用户信息与语言 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
              {currentUser?.name}
            </span>
            <button onClick={onLogout} style={logoutButtonStyle}>
              {language === 'zh' ? '退出' : language === 'en' ? 'Logout' : 'ထွက်'}
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              style={langButtonStyle}
            >
              <span>{language === 'zh' ? '中文' : language === 'en' ? 'EN' : 'မြန်မာ'}</span>
              <span style={{ fontSize: '0.7rem' }}>▼</span>
            </button>
            
            {showLanguageDropdown && (
              <div style={dropdownStyle}>
                {[
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' },
                  { value: 'my', label: 'မြန်မာ' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onLanguageChange(option.value);
                      setShowLanguageDropdown(false);
                    }}
                    style={{
                      ...dropdownItemStyle,
                      background: language === option.value ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: language === option.value ? '#f59e0b' : 'white'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const navButtonStyle: React.CSSProperties = {
  color: 'white',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.95rem',
  fontWeight: '600',
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  transition: 'all 0.2s'
};

const langButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.2)',
  padding: '0.4rem 0.8rem',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
};

const logoutButtonStyle: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.1)',
  color: '#ef4444',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  padding: '0.3rem 0.8rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 'bold'
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  background: '#1e293b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  marginTop: '8px',
  zIndex: 1000,
  overflow: 'hidden',
  minWidth: '120px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
};

const dropdownItemStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.8rem 1rem',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: '0.9rem',
  border: 'none'
};

export default NavigationBar;
