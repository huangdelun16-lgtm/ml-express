import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavigationBar from '../components/home/NavigationBar';
import ClientInteriorShell from '../components/layout/ClientInteriorShell';
import { useLanguage } from '../contexts/LanguageContext';

const copy = {
  zh: {
    title: 'ML Inventory 应用支持',
    subtitle: 'MARKET LINK EXPRESS 商业物流 App · 技术支持与合作伙伴开通',
    sections: [
      {
        heading: '应用用途',
        body: 'ML Inventory 是可在 App Store 下载的商业物流 App，帮助物流中转站完成入库、打包、装车出库、条码扫描与云端库存同步。适用于 MARKET LINK EXPRESS 合作网络内的独立站点。',
      },
      {
        heading: '如何登录',
        body: '已在合作网络内的站点，使用 MARKET LINK 分配的店铺代码与密码登录 App 即可。每个站点拥有独立账号，用于管理本站库存与物流操作。',
      },
      {
        heading: '申请成为合作站点（公开受理）',
        body: '尚未加入 MARKET LINK 物流网络的独立中转站/物流站点，可通过下方联系方式提交合作申请。审核通过后，我们将为您的站点开通店铺代码与密码，即可在 App Store 下载 ML Inventory 并使用。',
      },
      {
        heading: '联系我们',
        body: '账号开通、密码重置、合作申请或技术故障，请通过以下方式联系：',
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
    privacyLink: 'ML Inventory 隐私政策',
    homeLink: '返回首页',
  },
  en: {
    title: 'ML Inventory App Support',
    subtitle: 'Business logistics app · Support & partner station onboarding',
    sections: [
      {
        heading: 'About the app',
        body: 'ML Inventory is a business logistics app available on the App Store. It helps independent transit stations manage inbound stock, packing, truck loading, barcode scanning, and cloud inventory sync within the MARKET LINK EXPRESS partner network.',
      },
      {
        heading: 'How to sign in',
        body: 'Stations already enrolled in our network sign in with the store code and password issued to their station. Each station has its own account for inventory and logistics operations.',
      },
      {
        heading: 'Request partner station access (open to businesses)',
        body: 'Independent transit or logistics stations not yet on the MARKET LINK network may apply to join using the contact details below. After approval, we provision a store code and password so you can download ML Inventory from the App Store and sign in.',
      },
      {
        heading: 'Contact us',
        body: 'For onboarding, password reset, partnership inquiries, or technical support:',
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
    privacyLink: 'ML Inventory Privacy Policy',
    homeLink: 'Back to home',
  },
  my: {
    title: 'ML Inventory App Support',
    subtitle: 'Business logistics · Support & partner onboarding',
    sections: [
      {
        heading: 'About the app',
        body: 'ML Inventory is a business logistics app on the App Store for transit stations: inbound, packing, outbound, barcode scan, and cloud sync.',
      },
      {
        heading: 'Sign in',
        body: 'Enrolled stations sign in with their issued store code and password.',
      },
      {
        heading: 'Request partner access',
        body: 'Independent logistics stations may apply to join the MARKET LINK network via the contact details below. After approval, a store code will be issued.',
      },
      {
        heading: 'Contact us',
        body: 'For onboarding, support, or password reset:',
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
    privacyLink: 'ML Inventory Privacy Policy',
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
    <ClientInteriorShell>
    <div
      style={{
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
          color: '#1a2b48',
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
                background: '#ffffff',
                border: '1px solid rgba(26, 43, 72, 0.1)',
                borderRadius: 16,
                padding: '1.25rem 1.5rem',
                backdropFilter: 'blur(8px)',
              }}
            >
              <h2 style={{ margin: '0 0 0.65rem', fontSize: '1.1rem', fontWeight: 700 }}>
                {section.heading}
              </h2>
              <p style={{ margin: 0, lineHeight: 1.65, color: '#3d5270', fontWeight: 500 }}>{section.body}</p>
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
            to="/ml-inventory/privacy"
            style={{ color: '#1e7a86', fontWeight: 700, textDecoration: 'none' }}
          >
            {t.privacyLink} →
          </Link>
          <Link
            to="/"
            state={{ landingScrollTo: 'landing-contact' }}
            style={{ color: '#2c98a6', fontWeight: 700, textDecoration: 'none' }}
          >
            {t.contactLink} →
          </Link>
          <Link
            to="/"
            style={{ color: '#4a6280', fontWeight: 600, textDecoration: 'none' }}
          >
            {t.homeLink}
          </Link>
        </div>
      </section>
    </div>
    </ClientInteriorShell>
  );
}
