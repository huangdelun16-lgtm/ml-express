import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavigationBar from '../components/home/NavigationBar';
import ClientInteriorShell from '../components/layout/ClientInteriorShell';
import { useLanguage } from '../contexts/LanguageContext';

const copy = {
  zh: {
    title: 'ML Inventory 隐私政策',
    subtitle: 'MARKET LINK EXPRESS · 中转站库存管理 App',
    updated: '最后更新：2025年6月',
    sections: [
      {
        heading: '适用范围',
        body: '本政策适用于 iOS/Android 应用「ML Inventory」（com.mlexpress.inventory）。本 App 为物流中转站提供入库、打包、出库与条码扫描等业务功能。',
      },
      {
        heading: '我们收集的信息',
        body: '在您使用 App 时，我们可能处理：店铺代码与登录凭证（用于身份验证）、扫描的条码与订单信息、库存与操作记录、设备相机（仅用于条码扫描，不存储无关照片）。',
      },
      {
        heading: '信息的使用',
        body: '数据用于库存管理、云端同步、物流追踪及客户支持。我们不会将您的业务数据出售给第三方。',
      },
      {
        heading: '数据存储与安全',
        body: '业务数据存储于加密云数据库（Supabase）。本地 SQLite 缓存用于离线操作，登录凭证保存在设备安全存储中。',
      },
      {
        heading: '您的权利',
        body: '合作站点可联系 MARKET LINK 请求更正或删除与其站点相关的业务数据。注销 App 账号请联系 support 邮箱。',
      },
      {
        heading: '联系我们',
        body: '隐私相关问题：marketlink982@gmail.com · (+95) 09788848928',
      },
    ],
    supportLink: '应用支持页',
    homeLink: '返回首页',
  },
  en: {
    title: 'ML Inventory Privacy Policy',
    subtitle: 'MARKET LINK EXPRESS · Transit station inventory app',
    updated: 'Last updated: June 2025',
    sections: [
      {
        heading: 'Scope',
        body: 'This policy applies to the ML Inventory mobile app (com.mlexpress.inventory) on iOS and Android. The app provides inbound stock, packing, outbound logistics, and barcode scanning for logistics transit stations.',
      },
      {
        heading: 'Information we collect',
        body: 'When you use the app we may process: store code and login credentials (authentication), scanned barcodes and order data, inventory and operation records, and camera access used only for barcode scanning (we do not store unrelated photos).',
      },
      {
        heading: 'How we use information',
        body: 'Data is used for inventory management, cloud sync, shipment tracking, and customer support. We do not sell your business data to third parties.',
      },
      {
        heading: 'Storage and security',
        body: 'Business data is stored in encrypted cloud infrastructure (Supabase). Local SQLite cache supports offline work; credentials are stored in the device secure store.',
      },
      {
        heading: 'Your rights',
        body: 'Partner stations may contact MARKET LINK to request correction or deletion of station-related business data. To deactivate an account, email our support team.',
      },
      {
        heading: 'Contact',
        body: 'Privacy inquiries: marketlink982@gmail.com · (+95) 09788848928',
      },
    ],
    supportLink: 'App support',
    homeLink: 'Back to home',
  },
  my: {
    title: 'ML Inventory Privacy Policy',
    subtitle: 'MARKET LINK EXPRESS transit inventory app',
    updated: 'Last updated: June 2025',
    sections: [
      {
        heading: 'Scope',
        body: 'This policy covers the ML Inventory app (com.mlexpress.inventory) for logistics transit stations.',
      },
      {
        heading: 'Data collected',
        body: 'Store login, barcodes, inventory records, and camera use for scanning only.',
      },
      {
        heading: 'Use of data',
        body: 'Inventory, cloud sync, and support. We do not sell business data.',
      },
      {
        heading: 'Security',
        body: 'Cloud storage (Supabase) and secure local credentials.',
      },
      {
        heading: 'Contact',
        body: 'marketlink982@gmail.com · (+95) 09788848928',
      },
    ],
    supportLink: 'App support',
    homeLink: 'Back to home',
  },
};

export default function InventoryPrivacyPage() {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const lang = language === 'zh' ? 'zh' : language === 'my' ? 'my' : 'en';
  const t = copy[lang];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <ClientInteriorShell>
    <div
      style={{
        padding: window.innerWidth < 768 ? '12px' : '20px',
      }}
    >
      <NavigationBar
        language={language}
        onLanguageChange={(l) => {
          setLanguage(l);
          localStorage.setItem('ml-express-language', l);
        }}
        currentUser={null}
        onLogout={() => {}}
        onShowRegisterModal={(isLoginMode) => {
          navigate('/', { state: { showModal: true, isLoginMode } });
        }}
      />

      <section
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.5s ease',
          color: '#1a2b48',
          maxWidth: 820,
          margin: '0 auto',
          padding: '2rem 0.5rem 4rem',
        }}
      >
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 800, margin: '0 0 0.5rem' }}>
            {t.title}
          </h1>
          <p style={{ margin: '0 0 0.35rem', opacity: 0.9 }}>{t.subtitle}</p>
          {'updated' in t && t.updated ? (
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.75 }}>{t.updated}</p>
          ) : null}
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
              }}
            >
              <h2 style={{ margin: '0 0 0.65rem', fontSize: '1.1rem', fontWeight: 700 }}>
                {section.heading}
              </h2>
              <p style={{ margin: 0, lineHeight: 1.65, opacity: 0.95 }}>{section.body}</p>
            </article>
          ))}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/support" style={{ color: '#1e7a86', fontWeight: 700, textDecoration: 'none' }}>
            {t.supportLink} →
          </Link>
          <Link to="/" style={{ color: '#4a6280', fontWeight: 600, textDecoration: 'none' }}>
            {t.homeLink}
          </Link>
        </div>
      </section>
    </div>
    </ClientInteriorShell>
  );
}
