import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../Logo';
import { useLanguage } from '../../contexts/LanguageContext';
import '../../styles/clientNav.css';

interface NavigationBarProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  currentUser: any;
  onLogout: () => void;
  onShowRegisterModal: (isLoginMode: boolean) => void;
  /** 首页专用：毛玻璃悬浮导航条 */
  variant?: 'default' | 'landing';
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  language,
  onLanguageChange,
  currentUser,
  onLogout,
  onShowRegisterModal,
  variant = 'default'
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (!showLanguageDropdown && !userMenuOpen) return;
    const close = (e: MouseEvent) => {
      const el = e.target as Element;
      if (showLanguageDropdown && !el.closest('[data-language-dropdown]')) {
        setShowLanguageDropdown(false);
      }
      if (userMenuOpen && !el.closest('[data-user-menu]')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showLanguageDropdown, userMenuOpen]);

  const handleNavigation = (path: string) => {
    const landingSectionMap: Record<string, string> = {
      '/services': 'landing-services',
      '/tracking': 'landing-tracking',
      '/contact': 'landing-contact',
    };
    const sectionId = landingSectionMap[path];
    if (sectionId) {
      if (location.pathname === '/') {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      navigate(path);
      return;
    }

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

  const navInner = (
    <>
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
            className="client-nav__link"
            onClick={() => handleNavigation('/')}
            style={{ fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)' }}
          >
            {t.nav.home}
          </button>
          <button
            type="button"
            className="client-nav__link"
            onClick={() => handleNavigation('/services')}
            style={{ fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)' }}
          >
            {t.nav.services}
          </button>
          <button
            type="button"
            className="client-nav__link"
            onClick={() => handleNavigation('/tracking')}
            style={{ fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)' }}
          >
            {t.nav.tracking}
          </button>
          <button
            type="button"
            className="client-nav__link"
            onClick={() => handleNavigation('/contact')}
            style={{ fontSize: window.innerWidth < 768 ? 'var(--font-size-sm)' : 'var(--font-size-base)' }}
          >
            {t.nav.contact}
          </button>
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
            <div style={{ position: 'relative' }} data-user-menu>
              {(() => {
                const rawName = String(currentUser.name || '').trim() || '?';
                const initial = rawName.charAt(0).toUpperCase();
                const nameMaxW = window.innerWidth < 640 ? 72 : 112;
                return (
                  <>
                    <button
                      type="button"
                      className="client-nav__user"
                      onClick={() => {
                        setShowLanguageDropdown(false);
                        setUserMenuOpen((o) => !o);
                      }}
                      aria-expanded={userMenuOpen}
                      aria-haspopup="menu"
                      style={{ maxWidth: `min(100%, ${nameMaxW + 52}px)` }}
                    >
                      <span className="client-nav__avatar" aria-hidden>
                        {initial}
                      </span>
                      <span
                        style={{
                          fontSize: window.innerWidth < 768 ? '0.78rem' : '0.82rem',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: '1 1 auto',
                          minWidth: 0,
                          textAlign: 'left',
                        }}
                        title={rawName}
                      >
                        {rawName}
                      </span>
                      <span style={{ fontSize: '0.55rem', opacity: 0.85, flexShrink: 0 }} aria-hidden>
                        ▼
                      </span>
                    </button>
                    {userMenuOpen && (
                      <div className="client-nav__menu" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          className="client-nav__menu-item"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/profile');
                          }}
                        >
                          {language === 'zh' ? '我的账户' : language === 'en' ? 'My Account' : 'ကျွန်ုပ်၏အကောင့်'}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="client-nav__menu-item client-nav__menu-item--danger"
                          onClick={() => {
                            setUserMenuOpen(false);
                            onLogout();
                          }}
                        >
                          {language === 'zh' ? '退出登录' : language === 'en' ? 'Log out' : 'ထွက်ရန်'}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              {/* 注册按钮 */}
              <button
                type="button"
                className="client-nav__register"
                onClick={() => {
                  onShowRegisterModal(false);
                }}
                style={{ fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem' }}
              >
                {language === 'zh' ? '注册' : language === 'en' ? 'Register' : 'အကောင့်ဖွင့်ရန်'}
              </button>
              <button
                type="button"
                className="client-nav__login"
                onClick={() => {
                  onShowRegisterModal(true);
                }}
                style={{ fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem' }}
              >
                {language === 'zh' ? '登录' : language === 'en' ? 'Login' : 'ဝင်ရန်'}
              </button>
            </div>
          )}
          
          {/* 语言选择器（放在用户卡片右侧） */}
          <div style={{ position: 'relative' }} data-language-dropdown>
            <button
              type="button"
              className="client-nav__lang"
              onClick={() => {
                setUserMenuOpen(false);
                setShowLanguageDropdown(!showLanguageDropdown);
              }}
              style={{ fontSize: window.innerWidth < 768 ? '0.75rem' : '0.85rem' }}
            >
              <span>{language === 'zh' ? '中文' : language === 'en' ? 'English' : 'မြန်မာ'}</span>
              <span style={{ fontSize: '0.7rem' }}>▼</span>
            </button>
            {showLanguageDropdown && (
              <div className="client-nav__lang-menu">
                {[
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' },
                  { value: 'my', label: 'မြန်မာ' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`client-nav__lang-item${language === option.value ? ' client-nav__lang-item--active' : ''}`}
                    onClick={() => {
                      onLanguageChange(option.value);
                      setShowLanguageDropdown(false);
                    }}
                    style={{ fontSize: window.innerWidth < 768 ? '0.75rem' : '0.85rem' }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return variant === 'landing' ? (
    <div className="home-nav-wrap home-nav-wrap--landing">
      <nav
        className="home-nav home-nav--landing"
        style={{
          position: 'relative',
          zIndex: 9999,
          pointerEvents: 'auto',
          background: 'transparent',
          color: '#1a2b48',
          padding: 0,
          marginBottom: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'none',
          gap: window.innerWidth < 768 ? 'var(--spacing-3)' : 'var(--spacing-4)',
          flexWrap: window.innerWidth < 1024 ? 'wrap' : 'nowrap',
          rowGap: 'var(--spacing-3)'
        }}
      >
        {navInner}
      </nav>
    </div>
  ) : (
    <nav
      style={{
        position: 'relative',
        zIndex: 9999,
        pointerEvents: 'auto',
        background: 'transparent',
        color: '#1a2b48',
        padding: 0,
        marginBottom: window.innerWidth < 768 ? '24px' : '40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'none',
        gap: window.innerWidth < 768 ? 'var(--spacing-3)' : 'var(--spacing-4)',
        flexWrap: window.innerWidth < 1024 ? 'wrap' : 'nowrap',
        rowGap: 'var(--spacing-3)'
      }}
    >
      {navInner}
    </nav>
  );
};

export default NavigationBar;

