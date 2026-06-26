import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';

const copy = {
  zh: {
    title: 'ML Inventory 应用支持',
    subtitle: 'MARKET LINK EXPRESS 中转站库存管理 App 技术支持与账号说明',
    sections: [
      {
        heading: '应用用途',
        body: 'ML Inventory 供 MARKET LINK EXPRESS 跨境物流合作中转站工作人员使用，用于入库、打包、装车出库、条码扫描与云端库存同步。',
      },
      {
        heading: '如何获取登录账号',
        body: '本 App 不提供公开注册。合作中转站由 MARKET LINK 管理员在后台「跨境物流」模块创建店铺代码与密码，并交给站点负责人使用。',
      },
      {
        heading: '联系我们',
        body: '如需开通账号、重置密码或报告故障，请通过以下方式联系：',
        items: [
          '电话：(+95) 09788848928',
          '邮箱：marketlink982@gmail.com',
          '微信：AMT349',
          '地址：ChanMyaThaZi Mandalay, Myanmar',
        ],
      },
      {
        heading: '服务时间',
        body: '周一至周日 8:00 – 20:00（缅甸时间）',
      },
    ],
    contactLink: '更多联系方式',
    homeLink: '返回首页',
  },
  en: {
    title: 'ML Inventory App Support',
    subtitle: 'Technical support and account information for MARKET LINK EXPRESS transit inventory app',
    sections: [
      {
        heading: 'About the app',
        body: 'ML Inventory is used by authorized MARKET LINK EXPRESS cross-border transit station staff for inbound stock, packing, outbound loading, barcode scanning, and cloud inventory sync.',
      },
      {
        heading: 'How to get an account',
        body: 'Public sign-up is not available. Partner transit stations receive a store code and password from MARKET LINK administrators via the Cross-border Logistics admin console.',
      },
      {
        heading: 'Contact us',
        body: 'For account provisioning, password reset, or technical issues, please contact:',
        items: [
          'Phone: (+95) 09788848928',
          'Email: marketlink982@gmail.com',
          'WeChat: AMT349',
          'Address: ChanMyaThaZi Mandalay, Myanmar',
        ],
      },
      {
        heading: 'Support hours',
        body: 'Monday – Sunday, 8:00 AM – 8:00 PM (Myanmar time)',
      },
    ],
    contactLink: 'More contact options',
    homeLink: 'Back to home',
  },
  my: {
    title: 'ML Inventory App Support',
    subtitle: 'MARKET LINK EXPRESS transit inventory app — support & accounts',
    sections: [
      {
        heading: 'About the app',
        body: 'ML Inventory is for authorized MARKET LINK EXPRESS transit station staff: inbound, packing, outbound, barcode scan, and cloud sync.',
      },
      {
        heading: 'How to get an account',
        body: 'No public registration. Store code and password are issued by MARKET LINK administrators to partner stations.',
      },
      {
        heading: 'Contact us',
        body: 'For accounts, password reset, or issues:',
        items: [
          'Phone: (+95) 09788848928',
          'Email: marketlink982@gmail.com',
          'WeChat: AMT349',
        ],
      },
      {
        heading: 'Support hours',
        body: 'Mon – Sun, 8:00 – 20:00 (Myanmar time)',
      },
    ],
    contactLink: 'More contact options',
    homeLink: 'Back to home',
  },
};

export default function SupportPage() {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const lang = language === 'zh' ? 'zh' : language === 'my' ? 'my' : 'en';
  const t = copy[lang];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        position: 'relative',
        overflow: 'hidden',
        padding: window.innerWidth < 768 ? '12px' : '20px',
      }}
    >
      <NavigationBar
        language={language}
        onLanguageChange={handleLanguageChange}
        currentUser={null}
        onLogout={() => {}}
        onShowRegisterModal={(isLoginMode) => {
          navigate('/', { state: { showModal: true, isLoginMode } });
        }}
      />

      <section
        style={{
          position: 'relative',
          zIndex: 5,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.5s ease',
          color: 'white',
          maxWidth: 820,
          margin: '0 auto',
          padding: '2rem 0.5rem 4rem',
        }}
      >
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
              fontWeight: 800,
              margin: '0 0 0.5rem',
            }}
          >
            {t.title}
          </h1>
          <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>{t.subtitle}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {t.sections.map((section) => (
            <article
              key={section.heading}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 16,
                padding: '1.25rem 1.5rem',
                backdropFilter: 'blur(8px)',
              }}
            >
              <h2 style={{ margin: '0 0 0.65rem', fontSize: '1.1rem', fontWeight: 700 }}>
                {section.heading}
              </h2>
              <p style={{ margin: 0, lineHeight: 1.65, opacity: 0.95 }}>{section.body}</p>
              {'items' in section && section.items ? (
                <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            to="/"
            state={{ landingScrollTo: 'landing-contact' }}
            style={{ color: '#7dd3fc', fontWeight: 700, textDecoration: 'none' }}
          >
            {t.contactLink} →
          </Link>
          <Link
            to="/"
            style={{ color: '#e2e8f0', fontWeight: 600, textDecoration: 'none' }}
          >
            {t.homeLink}
          </Link>
        </div>
      </section>
    </div>
  );
}
