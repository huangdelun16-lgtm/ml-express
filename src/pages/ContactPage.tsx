import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ContactPage: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('zh');
  const [isVisible, setIsVisible] = useState(false);

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
      contact: {
        title: '联系我们',
        subtitle: '我们随时为您提供专业的快递服务支持',
        phone: '电话联系',
        email: '邮箱联系',
        address: '公司地址',
        businessHours: '营业时间',
        phoneValue: '+95 9 123 456 789',
        emailValue: 'info@marketlinkexpress.com',
        addressValue: '曼德勒市，缅甸',
        businessHoursValue: '周一至周日 8:00 - 20:00'
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
      contact: {
        title: 'Contact Us',
        subtitle: 'We are here to provide professional express service support',
        phone: 'Phone Contact',
        email: 'Email Contact',
        address: 'Company Address',
        businessHours: 'Business Hours',
        phoneValue: '+95 9 123 456 789',
        emailValue: 'info@marketlinkexpress.com',
        addressValue: 'Mandalay, Myanmar',
        businessHoursValue: 'Monday to Sunday 8:00 - 20:00'
      }
    },
    my: {
      nav: {
        home: 'ပင်မ',
        services: 'ဝန်ဆောင်မှု',
        tracking: 'ထုပ်ပိုးခြင်း',
        contact: 'ဆက်သွယ်ရန်',
        admin: 'စီမံခန့်ခွဲမှု'
      },
      contact: {
        title: 'ဆက်သွယ်ရန်',
        subtitle: 'ကျွန်ုပ်တို့သည် ပရော်ဖက်ရှင်နယ် ပို့ဆောင်မှု ဝန်ဆောင်မှုကို ပေးဆောင်ရန် ဤနေရာတွင် ရှိပါသည်',
        phone: 'ဖုန်းဆက်သွယ်ရန်',
        email: 'အီးမေးလ်ဆက်သွယ်ရန်',
        address: 'ကုမ္ပဏီလိပ်စာ',
        businessHours: 'အလုပ်ချိန်',
        phoneValue: '+95 9 123 456 789',
        emailValue: 'info@marketlinkexpress.com',
        addressValue: 'မန္တလေး၊ မြန်မာ',
        businessHoursValue: 'တနင်္လာမှ တနင်္ဂနွေ 8:00 - 20:00'
      }
    }
  };

  const t = translations[language as keyof typeof translations] || translations.zh;


  const handleNavigation = (path: string) => {
    setIsVisible(false);
    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
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
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
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
            fontSize: window.innerWidth < 768 ? '1.6rem' : '2.2rem',
            fontWeight: '800',
            textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
            background: 'linear-gradient(45deg, #ffffff, #f0f8ff, #e6f3ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-1px',
            lineHeight: '1.1',
            whiteSpace: 'nowrap'
          }}>
            MARKET LINK <span style={{ fontSize: '0.6em', fontStyle: 'italic', fontWeight: '400' }}>EXPRESS</span>
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
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
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
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.services}</button>
          <button onClick={() => handleNavigation('/tracking')} style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.tracking}</button>
          <button style={{ 
            color: '#FFD700', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>{t.nav.contact}</button>
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
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.5rem',
              borderRadius: '5px',
              fontWeight: 'bold',
              fontSize: window.innerWidth < 768 ? '0.8rem' : '1rem',
              backdropFilter: 'blur(10px)',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          >
            <option value="zh" style={{ background: 'rgba(0,0,0,0.8)', color: 'white' }}>中文</option>
            <option value="en" style={{ background: 'rgba(0,0,0,0.8)', color: 'white' }}>English</option>
            <option value="my" style={{ background: 'rgba(0,0,0,0.8)', color: 'white' }}>မြန်မာ</option>
          </select>
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
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
          gap: '2rem'
        }}>
          {[
            {
              icon: '📞',
              title: t.contact.phone,
              value: t.contact.phoneValue,
              color: '#ff6b6b',
              bgGradient: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)'
            },
            {
              icon: '📧',
              title: t.contact.email,
              value: t.contact.emailValue,
              color: '#4ecdc4',
              bgGradient: 'linear-gradient(135deg, #4ecdc4, #44a08d)'
            },
            {
              icon: '📍',
              title: t.contact.address,
              value: t.contact.addressValue,
              color: '#45b7d1',
              bgGradient: 'linear-gradient(135deg, #45b7d1, #96c93d)'
            },
            {
              icon: '🕒',
              title: t.contact.businessHours,
              value: t.contact.businessHoursValue,
              color: '#f093fb',
              bgGradient: 'linear-gradient(135deg, #f093fb, #f5576c)'
            }
          ].map((contact, index) => (
            <div key={index} style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '2.5rem',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : `translateY(${30 + index * 10}px)`,
              transitionDelay: `${index * 0.1}s`
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
            }}
            >
              {/* 装饰性背景 */}
              <div style={{
                position: 'absolute',
                top: '-30px',
                right: '-30px',
                width: '100px',
                height: '100px',
                background: contact.bgGradient,
                opacity: '0.1',
                borderRadius: '50%'
              }}></div>

              {/* 图标 */}
              <div style={{
                width: '70px',
                height: '70px',
                background: contact.bgGradient,
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
              }}>
                <span style={{ fontSize: '32px' }}>{contact.icon}</span>
              </div>

              {/* 标题 */}
              <h3 style={{
                fontSize: '1.3rem',
                fontWeight: '700',
                color: '#2d3748',
                marginBottom: '1rem',
                letterSpacing: '-0.5px'
              }}>
                {contact.title}
              </h3>

              {/* 内容 */}
              <p style={{
                fontSize: '1.1rem',
                color: '#4a5568',
                lineHeight: '1.6',
                fontWeight: '500'
              }}>
                {contact.value}
              </p>

              {/* 底部装饰线 */}
              <div style={{
                height: '4px',
                background: contact.bgGradient,
                borderRadius: '2px',
                marginTop: '1.5rem'
              }}></div>
            </div>
          ))}
        </div>

        {/* 页脚信息 */}
        <div style={{
          textAlign: 'center',
          marginTop: '4rem',
          padding: '2rem',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.2)'
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
            <span style={{ 
              color: 'white',
              fontSize: '1.6rem',
              fontWeight: '800',
              textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
              background: 'linear-gradient(45deg, #ffffff, #f0f8ff, #e6f3ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-1px',
              lineHeight: '1.1',
              whiteSpace: 'nowrap'
            }}>
              MARKET LINK <span style={{ fontSize: '0.6em', fontStyle: 'italic', fontWeight: '400' }}>EXPRESS</span>
            </span>
          </div>
          <p style={{ 
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.9rem',
            margin: '0.5rem 0'
          }}>
            © 2024 MARKET LINK EXPRESS. All rights reserved.
          </p>
          <p style={{ 
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.8rem',
            margin: 0
          }}>
            专业的缅甸同城快递服务
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
