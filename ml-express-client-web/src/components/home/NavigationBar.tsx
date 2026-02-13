import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Logo from '../Logo';
import { useLanguage } from '../../contexts/LanguageContext';

interface NavigationBarProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  currentUser: any;
  onLogout: () => void;
  onShowRegisterModal: (isLoginMode: boolean) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  language,
  onLanguageChange,
  currentUser,
  onLogout,
  onShowRegisterModal
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const handleNavigation = (path: string) => {
    if (path === '/') {
      if (location.pathname === '/') {
        // 如果已经在首页，滚动到顶部/home
        const element = document.querySelector('#home');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        // 如果不在首页，直接使用 navigate 导航
        navigate('/');
      }
      return;
    }

    if (path.startsWith('#')) {
      // 锚点链接，平滑滚动
      const element = document.querySelector(path);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // 路由导航
      navigate(path);
    }
  };

  return (
    <nav style={{
      position: 'relative',
      zIndex: 9999,
      pointerEvents: 'auto',
      background: 'transparent',
      color: 'white',
      padding: 0,
      marginBottom: window.innerWidth < 768 ? '24px' : '40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: 'none',
      gap: window.innerWidth < 768 ? 'var(--spacing-3)' : 'var(--spacing-4)',
      flexWrap: window.innerWidth < 1024 ? 'wrap' : 'nowrap',
      rowGap: 'var(--spacing-3)'
    }}>
      <Logo size="small" />
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: window.innerWidth < 768 ? '1rem' : '1.5rem',
        flexWrap: window.innerWidth < 1024 ? 'wrap' : 'nowrap',
        justifyContent: window.innerWidth < 1024 ? 'flex-start' : 'flex-end',
        rowGap: '0.5rem',
        width: window.innerWidth < 1024 ? '100%' : 'auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: window.innerWidth < 768 ? '1rem' : '1.5rem',
          flexWrap: window.innerWidth < 640 ? 'wrap' : 'nowrap',
          rowGap: '0.4rem'
        }}>
          <button 
            type="button"
            onClick={() => handleNavigation('/')} 
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)',
              textAlign: 'center',
              padding: 'var(--spacing-2) var(--spacing-3)',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--transition-fast)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              lineHeight: 'var(--line-height-normal)',
              display: 'inline-block'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {t.nav.home}
          </button>
          <button onClick={() => handleNavigation('/services')} style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-medium)',
            textAlign: 'center',
            padding: 'var(--spacing-2) var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            transition: 'all var(--transition-fast)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            lineHeight: 'var(--line-height-normal)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          >{t.nav.services}</button>
          <button onClick={() => handleNavigation('/tracking')} style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-medium)',
            textAlign: 'center',
            padding: 'var(--spacing-2) var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            transition: 'all var(--transition-fast)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            lineHeight: 'var(--line-height-normal)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          >{t.nav.tracking}</button>
          <button onClick={() => handleNavigation('/contact')} style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-medium)',
            textAlign: 'center',
            padding: 'var(--spacing-2) var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            transition: 'all var(--transition-fast)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            lineHeight: 'var(--line-height-normal)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          >{t.nav.contact}</button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: window.innerWidth < 1024 ? 'flex-start' : 'flex-end',
          rowGap: '0.5rem'
        }}>
          {/* 注册/登录按钮（放在语言选择器左侧） */}
          {currentUser ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(72, 187, 120, 0.2)',
              border: '2px solid rgba(72, 187, 120, 0.5)',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              backdropFilter: 'blur(10px)'
            }}>
              <button
                onClick={() => navigate('/profile')}
                style={{
                  background: 'rgba(59, 130, 246, 0.3)',
                  color: 'white',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
                }}
              >
                {language === 'zh' ? '我的账户' : language === 'en' ? 'My Account' : 'ကျွန်ုပ်၏အကောင့်'}
              </button>
              <span style={{ 
                color: 'white',
                fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem',
                fontWeight: 'bold'
              }}>
                {language === 'zh' ? `欢迎，${currentUser.name}` : 
                 language === 'en' ? `Welcome, ${currentUser.name}` : 
                 'ကြိုဆိုပါတယ်, ' + currentUser.name}
              </span>
              <button
                onClick={onLogout}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                {language === 'zh' ? '退出' : language === 'en' ? 'Logout' : 'ထွက်'}
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              {/* 注册按钮 */}
              <button
                onClick={() => {
                  console.log('Register button clicked');
                  onShowRegisterModal(false);
                }}
                style={{
                  background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(72, 187, 120, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(72, 187, 120, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(72, 187, 120, 0.3)';
                }}
              >
                {language === 'zh' ? '注册' : language === 'en' ? 'Register' : 'အကောင့်ဖွင့်ရန်'}
              </button>
              
              {/* 登录按钮 */}
              <button
                onClick={() => {
                  console.log('Login button clicked');
                  onShowRegisterModal(true);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem',
                  fontWeight: 'bold',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                {language === 'zh' ? '登录' : language === 'en' ? 'Login' : 'ဝင်ရန်'}
              </button>
            </div>
          )}
          
          {/* 语言选择器（放在用户卡片右侧） */}
          <div style={{ position: 'relative' }} data-language-dropdown>
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '0.35rem 0.6rem',
                borderRadius: '5px',
                fontWeight: '600',
                fontSize: window.innerWidth < 768 ? '0.75rem' : '0.85rem',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                minWidth: '90px',
                justifyContent: 'space-between'
              }}
            >
              <span>{language === 'zh' ? '中文' : language === 'en' ? 'English' : 'မြန်မာ'}</span>
              <span style={{ fontSize: '0.7rem' }}>▼</span>
            </button>
            
            {showLanguageDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '5px',
                marginTop: '2px',
                zIndex: 1000,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                {[
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' },
                  { value: 'my', label: 'မြန်မာ' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      console.log('Language changed to:', option.value);
                      onLanguageChange(option.value);
                      setShowLanguageDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      background: language === option.value ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.5rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: window.innerWidth < 768 ? '0.75rem' : '0.85rem',
                      transition: 'all 0.2s ease',
                      fontWeight: language === option.value ? '600' : '400'
                    }}
                    onMouseOver={(e) => {
                      if (language !== option.value) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (language !== option.value) {
                        e.currentTarget.style.background = 'transparent';
                      } else {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
                      }
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

export default NavigationBar;

