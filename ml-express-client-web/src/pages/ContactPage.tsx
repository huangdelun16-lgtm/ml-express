import React, { useState, useEffect } from 'react';
import LoggerService from '../services/LoggerService';
// import { useNavigate } from 'react-router-dom';
import NavigationBar from '../components/home/NavigationBar';

const ContactPage: React.FC = () => {
  // const navigate = useNavigate();
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ml-express-language') || 'zh';
  });
  const [isVisible, setIsVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  useEffect(() => {
    setIsVisible(true);
    loadUserFromStorage();
  }, []);

  // 从本地存储加载用户信息
  const loadUserFromStorage = () => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        LoggerService.error('加载用户信息失败:', error);
      }
    }
  };

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    setCurrentUser(null);
    // 刷新页面以更新UI
    window.location.reload();
  };

  // 语言切换函数
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
  };

  const translations = {
    zh: {
      nav: {
        home: '首页',
        services: '服务',
        tracking: '包裹跟踪',
        contact: '联系我们',
        admin: '管理后台',
      },
      contact: {
        title: '联系我们',
        subtitle: '我们随时为您提供专业的快递服务支持',
        phone: '电话联系',
        email: '邮箱联系',
        address: '公司地址',
        businessHours: '营业时间',
        businessCooperation: '商务合作',
        phoneValue: '(+95) 09788848928',
        emailValue: 'marketlink982@gmail.com',
        addressValue: 'ChanMyaThaZi Mandalay',
        businessHoursValue: '周一至周日 8:00 - 20:00',
        wechatId: 'WeChat ID',
        wechatValue: 'AMT349',
        viber: 'Viber',
        viberValue: '09259369349'
      }
    },
    en: {
      nav: {
        home: 'Home',
        services: 'Services',
        tracking: 'Tracking',
        contact: 'Contact',
        admin: 'Admin',
      },
      contact: {
        title: 'Contact Us',
        subtitle: 'We are here to provide professional express service support',
        phone: 'Phone Contact',
        email: 'Email Contact',
        address: 'Company Address',
        businessHours: 'Business Hours',
        businessCooperation: 'Business Cooperation',
        businessHoursValue: 'Monday to Sunday 8:00 - 20:00',
        phoneValue: '(+95) 09788848928',
        emailValue: 'marketlink982@gmail.com',
        addressValue: 'ChanMyaThaZi Mandalay',
        wechatId: 'WeChat ID',
        wechatValue: 'AMT349',
        viber: 'Viber',
        viberValue: '09259369349'
      }
    },
    my: {
      nav: {
        home: 'ပင်မ',
        services: 'ဝန်ဆောင်မှု',
        tracking: 'ထုပ်ပိုးခြင်း',
        contact: 'ဆက်သွယ်ရန်',
        admin: 'စီမံခန့်ခွဲမှု',
      },
      contact: {
        title: 'ဆက်သွယ်ရန်',
        subtitle: 'ကျွန်ုပ်တို့သည် ပရော်ဖက်ရှင်နယ် ပို့ဆောင်မှု ဝန်ဆောင်မှုကို ပေးဆောင်ရန် ဤနေရာတွင် ရှိပါသည်',
        phone: 'ဖုန်းဆက်သွယ်ရန်',
        email: 'အီးမေးလ်ဆက်သွယ်ရန်',
        address: 'ကုမ္ပဏီလိပ်စာ',
        businessHours: 'အလုပ်ချိန်',
        businessCooperation: 'စီးပွားရေးပူးပေါင်းဆောင်ရွက်မှု',
        businessHoursValue: 'တနင်္လာမှ တနင်္ဂနွေ 8:00 - 20:00',
        phoneValue: '(+95) 09788848928',
        emailValue: 'marketlink982@gmail.com',
        addressValue: 'ChanMyaThaZi Mandalay',
        wechatId: 'WeChat ID',
        wechatValue: 'AMT349',
        viber: 'Viber',
        viberValue: '09259369349'
      }
    }
  };

  const t = translations[language as keyof typeof translations] || translations.zh;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
        }
      `}</style>
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
          currentUser={currentUser}
          onLogout={handleLogout}
          onShowRegisterModal={() => {}} 
          translations={t}
        />

        {/* 主要内容区域 */}
        <section style={{
          position: 'relative',
          zIndex: 5,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.6s ease-in-out',
          color: 'white'
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
              {t.contact.title}
            </h1>
            <p style={{
              fontSize: '1.2rem',
              color: 'rgba(255,255,255,0.9)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.6',
              fontWeight: '300'
            }}>
              {t.contact.subtitle}
            </p>
          </div>

          {/* 联系信息卡片 */}
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
            gap: 'var(--spacing-8)'
          }}>
            {[
              {
                icon: '📞',
                title: t.contact.phone,
                value: t.contact.phoneValue,
                color: '#ff6b6b',
                bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              },
              {
                icon: '📧',
                title: t.contact.email,
                value: t.contact.emailValue,
                color: '#4ecdc4',
                bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                iconBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              },
              {
                icon: '📍',
                title: t.contact.address,
                value: t.contact.addressValue,
                color: '#45b7d1',
                bgGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                iconBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              },
              {
                icon: '🕒',
                title: t.contact.businessHours,
                value: t.contact.businessHoursValue,
                color: '#f093fb',
                bgGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                iconBg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              },
              {
                icon: '🤝',
                title: t.contact.businessCooperation,
                value: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                    <div style={{ fontSize: '1.15rem', color: '#2d3748', fontWeight: '600', letterSpacing: '0.2px', textAlign: 'center' }}>
                      {t.contact.wechatId}: {t.contact.wechatValue}
                    </div>
                    <div style={{ fontSize: '1.15rem', color: '#2d3748', fontWeight: '600', letterSpacing: '0.2px', textAlign: 'center' }}>
                      {t.contact.viber}: {t.contact.viberValue}
                    </div>
                  </div>
                ),
                color: '#ffa726',
                bgGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                iconBg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                isBusiness: true
              }
            ].map((contact, index) => (
              <div key={index} style={{
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                padding: '2rem',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : `translateY(${30 + index * 10}px)`,
                transitionDelay: `${index * 0.1}s`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-12px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.6) inset';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = isVisible ? 'translateY(0)' : `translateY(${30 + index * 10}px)`;
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset';
              }}
              >
                {/* 高级装饰性背景 */}
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: contact.bgGradient,
                  opacity: '0.08',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '100px',
                  height: '100px',
                  background: contact.bgGradient,
                  opacity: '0.06',
                  filter: 'blur(30px)'
                }}></div>

                {/* 高级图标容器 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '80px',
                  height: '80px',
                  background: contact.iconBg || contact.bgGradient,
                  borderRadius: '20px',
                  justifyContent: 'center',
                  marginBottom: '1.5rem',
                  boxShadow: `0 10px 30px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.3) inset`,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%)',
                    animation: 'shimmer 3s infinite'
                  }}></div>
                  <span style={{ fontSize: '36px', position: 'relative', zIndex: 1 }}>{contact.icon}</span>
                </div>

                {/* 标题 */}
                <h3 style={{
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  color: 'transparent',
                  background: contact.bgGradient,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  marginBottom: contact.isBusiness ? '1.2rem' : '1rem',
                  letterSpacing: '-0.5px',
                  lineHeight: '1.3'
                }}>
                  {contact.title}
                </h3>

                {/* 内容 */}
                {typeof contact.value === 'string' ? (
                  <p style={{
                    fontSize: '1.15rem',
                    color: '#2d3748',
                    lineHeight: '1.7',
                    fontWeight: '600',
                    letterSpacing: '0.2px'
                  }}>
                    {contact.value}
                  </p>
                ) : (
                  contact.value
                )}

                {/* 高级底部装饰线 */}
                <div style={{
                  width: '40px',
                  height: '5px',
                  background: contact.bgGradient,
                  borderRadius: '3px',
                  marginTop: '1.8rem',
                  boxShadow: `0 2px 10px ${contact.bgGradient}`
                }}></div>
              </div>
            ))}
          </div>

          {/* 页脚信息 */}
          <div style={{
            textAlign: 'center',
            marginTop: 'var(--spacing-16)',
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
                  fontWeight: '900',
                  textShadow: '0 4px 8px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.2)',
                  background: 'linear-gradient(135deg, #ffffff 0%, #e6f2ff 50%, #b3d9ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Montserrat', 'Roboto', sans-serif",
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                }}>
                  MARKET LINK <span style={{ 
                    fontSize: '1em', 
                    fontStyle: 'italic', 
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    marginLeft: '4px'
                  }}>EXPRESS</span>
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontStyle: 'italic',
                  fontSize: '0.5rem',
                  fontWeight: '600',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.9)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  fontFamily: "'Roboto', sans-serif",
                  marginTop: '4px'
                }}>
                  <span style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-end',
                    marginRight: '6px',
                    gap: '2px',
                    justifyContent: 'center'
                  }}>
                    <span style={{ 
                      width: '16px',
                      height: '1.5px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      display: 'block'
                    }}></span>
                    <span style={{ 
                      width: '24px',
                      height: '1.5px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      display: 'block'
                    }}></span>
                    <span style={{ 
                      width: '32px',
                      height: '1.5px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      display: 'block'
                    }}></span>
                  </span>
                  DELIVERY SERVICES
                  <span style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-start',
                    marginLeft: '6px',
                    gap: '2px',
                    justifyContent: 'center'
                  }}>
                    <span style={{ 
                      width: '16px',
                      height: '1.5px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      display: 'block'
                    }}></span>
                    <span style={{ 
                      width: '24px',
                      height: '1.5px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      display: 'block'
                    }}></span>
                    <span style={{ 
                      width: '32px',
                      height: '1.5px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      display: 'block'
                    }}></span>
                  </span>
                </span>
              </div>
            </div>
            <p style={{ 
              color: 'rgba(255,255,255,0.8)',
              fontSize: '0.9rem',
              margin: '0.5rem 0'
            }}>
              &copy; 2024 MARKET LINK EXPRESS. All rights reserved.
            </p>
            <p style={{ 
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.8rem',
              margin: 0
            }}>
              专业的缅甸同城快递服务
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default ContactPage;
