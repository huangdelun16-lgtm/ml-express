import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DeleteAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ml-express-language') || 'zh';
  });
  const [isVisible, setIsVisible] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 语言切换函数
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
    setShowLanguageDropdown(false);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showLanguageDropdown && !target.closest('[data-language-dropdown]')) {
        setShowLanguageDropdown(false);
      }
    };

    if (showLanguageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageDropdown]);

  const translations = {
    zh: {
      nav: {
        home: '首页',
        services: '服务',
        tracking: '包裹跟踪',
        contact: '联系我们',
      },
      title: '账户删除请求',
      subtitle: 'MARKET LINK EXPRESS - 账户和数据删除说明',
      lastUpdated: '最后更新：2024年12月',
      appName: 'MARKET LINK EXPRESS',
      introduction: {
        title: '1. 引言',
        content: 'MARKET LINK EXPRESS（"我们"、"我们的"或"公司"）尊重您的隐私权。本页面说明了如何请求删除您的账户和相关数据。'
      },
      steps: {
        title: '2. 如何请求删除账户',
        subtitle: '要删除您的 MARKET LINK EXPRESS 账户和相关数据，请按照以下步骤操作：',
        items: [
          '通过应用内联系客服：打开 MARKET LINK EXPRESS 应用，进入"我的"页面，点击"联系我们"',
          '通过电子邮件：发送邮件至 marketlink982@gmail.com，主题注明"账户删除请求"',
          '通过电话：拨打 (+95) 09788848928，说明您要删除账户',
          '通过微信：添加微信 AMT349，发送"账户删除请求"',
          '在您的请求中，请提供以下信息：',
          '  - 您的注册邮箱或手机号',
          '  - 您的姓名',
          '  - 删除原因（可选）'
        ]
      },
      dataTypes: {
        title: '3. 删除的数据类型',
        subtitle: '删除账户后，我们将删除以下数据：',
        items: [
          '账户信息（姓名、邮箱、手机号、地址）',
          '订单历史记录（订单详情、配送记录）',
          '位置数据（GPS坐标、地址信息）',
          '应用使用记录',
          '客户服务交互记录',
          '个人偏好设置'
        ]
      },
      retainedData: {
        title: '4. 保留的数据',
        subtitle: '根据法律和会计要求，以下数据可能会被保留：',
        items: [
          '订单记录：7年（法律和会计要求）',
          '财务记录：7年（税务和会计要求）',
          '法律要求的其他记录'
        ],
        note: '这些数据将被匿名化处理，不会包含您的个人信息。'
      },
      processingTime: {
        title: '5. 处理时间',
        content: '我们将在收到您的删除请求后30天内处理您的请求。处理完成后，我们将通过您提供的联系方式通知您。'
      },
      consequences: {
        title: '6. 删除账户的后果',
        subtitle: '删除账户后：',
        items: [
          '您将无法再登录 MARKET LINK EXPRESS 应用',
          '您将无法访问之前的订单历史',
          '您将无法使用账户相关的服务',
          '所有账户相关的数据将被删除或匿名化',
          '如果您之后想使用我们的服务，需要重新注册账户'
        ]
      },
      contact: {
        title: '7. 联系我们',
        subtitle: '如果您对账户删除有任何疑问，请通过以下方式联系我们：',
        items: [
          '电子邮件：marketlink982@gmail.com',
          '电话：(+95) 09788848928',
          '微信：AMT349',
          '网站：www.market-link-express.com',
          '地址：Yangon, Myanmar'
        ],
        note: '我们将在合理的时间内回复您的询问。'
      },
      backToHome: '返回首页',
      language: '语言'
    },
    en: {
      nav: {
        home: 'Home',
        services: 'Services',
        tracking: 'Tracking',
        contact: 'Contact',
      },
      title: 'Account Deletion Request',
      subtitle: 'MARKET LINK EXPRESS - Account and Data Deletion Instructions',
      lastUpdated: 'Last Updated: December 2024',
      appName: 'MARKET LINK EXPRESS',
      introduction: {
        title: '1. Introduction',
        content: 'MARKET LINK EXPRESS ("we", "our", or "company") respects your privacy rights. This page explains how to request deletion of your account and associated data.'
      },
      steps: {
        title: '2. How to Request Account Deletion',
        subtitle: 'To delete your MARKET LINK EXPRESS account and associated data, please follow these steps:',
        items: [
          'Contact customer service through the app: Open the MARKET LINK EXPRESS app, go to "My" page, click "Contact Us"',
          'Via email: Send an email to marketlink982@gmail.com with the subject "Account Deletion Request"',
          'Via phone: Call (+95) 09788848928 and state that you want to delete your account',
          'Via WeChat: Add WeChat AMT349 and send "Account Deletion Request"',
          'In your request, please provide the following information:',
          '  - Your registered email or phone number',
          '  - Your name',
          '  - Reason for deletion (optional)'
        ]
      },
      dataTypes: {
        title: '3. Types of Data Deleted',
        subtitle: 'After account deletion, we will delete the following data:',
        items: [
          'Account information (name, email, phone number, address)',
          'Order history (order details, delivery records)',
          'Location data (GPS coordinates, address information)',
          'App usage records',
          'Customer service interaction records',
          'Personal preference settings'
        ]
      },
      retainedData: {
        title: '4. Retained Data',
        subtitle: 'According to legal and accounting requirements, the following data may be retained:',
        items: [
          'Order records: 7 years (legal and accounting requirements)',
          'Financial records: 7 years (tax and accounting requirements)',
          'Other records required by law'
        ],
        note: 'This data will be anonymized and will not contain your personal information.'
      },
      processingTime: {
        title: '5. Processing Time',
        content: 'We will process your deletion request within 30 days of receiving it. After processing is complete, we will notify you through the contact method you provided.'
      },
      consequences: {
        title: '6. Consequences of Account Deletion',
        subtitle: 'After account deletion:',
        items: [
          'You will no longer be able to log in to the MARKET LINK EXPRESS app',
          'You will not be able to access your previous order history',
          'You will not be able to use account-related services',
          'All account-related data will be deleted or anonymized',
          'If you want to use our services again in the future, you will need to register a new account'
        ]
      },
      contact: {
        title: '7. Contact Us',
        subtitle: 'If you have any questions about account deletion, please contact us through:',
        items: [
          'Email: marketlink982@gmail.com',
          'Phone: (+95) 09788848928',
          'WeChat: AMT349',
          'Website: www.market-link-express.com',
          'Address: Yangon, Myanmar'
        ],
        note: 'We will respond to your inquiry within a reasonable time.'
      },
      backToHome: 'Back to Home',
      language: 'Language'
    },
    my: {
      nav: {
        home: 'ပင်မစာမျက်နှာ',
        services: 'ဝန်ဆောင်မှုများ',
        tracking: 'ထုပ်ပိုးခြင်းခြေရာခံ',
        contact: 'ဆက်သွယ်ရန်',
      },
      title: 'အကောင့်ဖျက်ရန်တောင်းဆိုခြင်း',
      subtitle: 'MARKET LINK EXPRESS - အကောင့်နှင့်ဒေတာဖျက်ရန်လမ်းညွှန်',
      lastUpdated: 'နောက်ဆုံးအပ်ဒိတ်: 2024 ဒီဇင်ဘာ',
      appName: 'MARKET LINK EXPRESS',
      introduction: {
        title: '1. မိတ်ဆက်',
        content: 'MARKET LINK EXPRESS ("ကျွန်ုပ်တို့", "ကျွန်ုပ်တို့၏" သို့မဟုတ် "ကုမ္ပဏီ") သည် သင့်ကိုယ်ရေးလုံခြုံမှုအခွင့်အရေးကို လေးစားပါသည်။ ဤစာမျက်နှာသည် သင့်အကောင့်နှင့်ဆက်စပ်ဒေတာကို ဖျက်ရန်တောင်းဆိုနည်းကို ရှင်းပြပါသည်။'
      },
      steps: {
        title: '2. အကောင့်ဖျက်ရန်တောင်းဆိုနည်း',
        subtitle: 'သင့် MARKET LINK EXPRESS အကောင့်နှင့်ဆက်စပ်ဒေတာကို ဖျက်ရန် အောက်ပါအဆင့်များကို လိုက်နာပါ:',
        items: [
          'အက်ပ်မှတဆင့်ဖောက်သည်ဝန်ဆောင်မှုကို ဆက်သွယ်ရန်: MARKET LINK EXPRESS အက်ပ်ကို ဖွင့်ပါ၊ "ကျွန်ုပ်" စာမျက်နှာသို့သွားပါ၊ "ဆက်သွယ်ရန်" ကိုနှိပ်ပါ',
          'အီးမေးလ်မှတဆင့်: marketlink982@gmail.com သို့ "အကောင့်ဖျက်ရန်တောင်းဆိုခြင်း" ခေါင်းစဉ်ဖြင့် အီးမေးလ်ပို့ပါ',
          'ဖုန်းမှတဆင့်: (+95) 09788848928 သို့ခေါ်ဆိုပြီး အကောင့်ဖျက်လိုကြောင်း ပြောပါ',
          'WeChat မှတဆင့်: WeChat AMT349 ကိုထည့်ပြီး "အကောင့်ဖျက်ရန်တောင်းဆိုခြင်း" ပို့ပါ',
          'သင့်တောင်းဆိုမှုတွင် အောက်ပါအချက်အလက်များကို ပေးပါ:',
          '  - သင့်မှတ်ပုံတင်ထားသော အီးမေးလ် သို့မဟုတ် ဖုန်းနံပါတ်',
          '  - သင့်အမည်',
          '  - ဖျက်ရသည့်အကြောင်းရင်း (ရွေးချယ်ရန်)'
        ]
      },
      dataTypes: {
        title: '3. ဖျက်သိမ်းမည့်ဒေတာအမျိုးအစားများ',
        subtitle: 'အကောင့်ဖျက်ပြီးနောက် အောက်ပါဒေတာများကို ဖျက်သိမ်းပါမည်:',
        items: [
          'အကောင့်အချက်အလက် (အမည်၊ အီးမေးလ်၊ ဖုန်းနံပါတ်၊ လိပ်စာ)',
          'အော်ဒါမှတ်တမ်း (အော်ဒါအသေးစိတ်၊ ပို့ဆောင်မှုမှတ်တမ်းများ)',
          'တည်နေရာဒေတာ (GPS ကိုဩဒိနိတ်၊ လိပ်စာအချက်အလက်)',
          'အက်ပ်အသုံးပြုမှုမှတ်တမ်းများ',
          'ဖောက်သည်ဝန်ဆောင်မှု အပြန်အလှန်ဆက်သွယ်မှုမှတ်တမ်းများ',
          'ကိုယ်ရေးရွေးချယ်မှု ဆက်တင်များ'
        ]
      },
      retainedData: {
        title: '4. ထိန်းသိမ်းထားသောဒေတာ',
        subtitle: 'ဥပဒေနှင့်စာရင်းကိုင်လိုအပ်ချက်များအရ အောက်ပါဒေတာများကို ထိန်းသိမ်းထားနိုင်သည်:',
        items: [
          'အော်ဒါမှတ်တမ်းများ: 7 နှစ် (ဥပဒေနှင့်စာရင်းကိုင်လိုအပ်ချက်များ)',
          'ငွေကြေးမှတ်တမ်းများ: 7 နှစ် (အခွန်နှင့်စာရင်းကိုင်လိုအပ်ချက်များ)',
          'ဥပဒေအရလိုအပ်သော အခြားမှတ်တမ်းများ'
        ],
        note: 'ဤဒေတာကို အမည်မသိဖြစ်အောင် ပြုလုပ်ပြီး သင့်ကိုယ်ရေးအချက်အလက်များ မပါဝင်ပါ။'
      },
      processingTime: {
        title: '5. လုပ်ဆောင်ချိန်',
        content: 'ကျွန်ုပ်တို့သည် သင့်ဖျက်သိမ်းရန်တောင်းဆိုမှုကို လက်ခံရရှိပြီးနောက် 30 ရက်အတွင်း လုပ်ဆောင်ပါမည်။ လုပ်ဆောင်မှုပြီးစီးပြီးနောက် ကျွန်ုပ်တို့သည် သင်ပေးထားသော ဆက်သွယ်ရန်နည်းလမ်းမှတဆင့် အကြောင်းကြားပါမည်။'
      },
      consequences: {
        title: '6. အကောင့်ဖျက်သိမ်းခြင်း၏ အကျိုးဆက်များ',
        subtitle: 'အကောင့်ဖျက်ပြီးနောက်:',
        items: [
          'သင်သည် MARKET LINK EXPRESS အက်ပ်သို့ ထပ်မံဝင်ရောက်၍ မရပါ',
          'သင်သည် ယခင်အော်ဒါမှတ်တမ်းကို ဝင်ရောက်ကြည့်ရှု၍ မရပါ',
          'သင်သည် အကောင့်ဆက်စပ်ဝန်ဆောင်မှုများကို အသုံးပြု၍ မရပါ',
          'အကောင့်ဆက်စပ်ဒေတာအားလုံးကို ဖျက်သိမ်းပြီး သို့မဟုတ် အမည်မသိဖြစ်အောင် ပြုလုပ်ပါမည်',
          'အနာဂတ်တွင် ကျွန်ုပ်တို့၏ဝန်ဆောင်မှုများကို ထပ်မံအသုံးပြုလိုပါက အကောင့်အသစ်မှတ်ပုံတင်ရန် လိုအပ်ပါသည်'
        ]
      },
      contact: {
        title: '7. ဆက်သွယ်ရန်',
        subtitle: 'အကောင့်ဖျက်သိမ်းခြင်းနှင့်ပတ်သက်၍ မေးခွန်းများရှိပါက အောက်ပါနည်းလမ်းများမှတဆင့် ဆက်သွယ်ပါ:',
        items: [
          'အီးမေးလ်: marketlink982@gmail.com',
          'ဖုန်း: (+95) 09788848928',
          'WeChat: AMT349',
          'ဝက်ဘ်ဆိုဒ်: www.market-link-express.com',
          'လိပ်စာ: Yangon, Myanmar'
        ],
        note: 'ကျွန်ုပ်တို့သည် သင့်မေးမြန်းမှုကို သင့်လျော်သောအချိန်အတွင်း အကြောင်းပြန်ပါမည်။'
      },
      backToHome: 'ပင်မစာမျက်နှာသို့ပြန်သွားရန်',
      language: 'ဘာသာစကား'
    }
  };

  const t = translations[language as keyof typeof translations] || translations.zh;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: '20px',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out'
    }}>
      {/* 导航栏 */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#2E86AB',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← {t.backToHome}
          </button>
        </div>
        <div style={{ position: 'relative' }} data-language-dropdown>
          <button
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            style={{
              background: 'rgba(46, 134, 171, 0.1)',
              border: '2px solid #2E86AB',
              color: '#2E86AB',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {t.language} {language === 'zh' ? '中文' : language === 'en' ? 'English' : 'မြန်မာ'} ▼
          </button>
          {showLanguageDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden',
              zIndex: 1000,
              minWidth: '150px'
            }}>
              <button
                onClick={() => handleLanguageChange('zh')}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: language === 'zh' ? '#2E86AB' : 'white',
                  color: language === 'zh' ? 'white' : '#333',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: language === 'zh' ? '600' : '400'
                }}
              >
                中文
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: language === 'en' ? '#2E86AB' : 'white',
                  color: language === 'en' ? 'white' : '#333',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: language === 'en' ? '600' : '400',
                  borderTop: '1px solid #eee'
                }}
              >
                English
              </button>
              <button
                onClick={() => handleLanguageChange('my')}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: language === 'my' ? '#2E86AB' : 'white',
                  color: language === 'my' ? 'white' : '#333',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: language === 'my' ? '600' : '400',
                  borderTop: '1px solid #eee'
                }}
              >
                မြန်မာ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 主要内容 */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
      }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#2E86AB',
            marginBottom: '10px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.title}
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#666',
            marginBottom: '10px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.subtitle}
          </p>
          <p style={{
            fontSize: '14px',
            color: '#999',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.lastUpdated}
          </p>
        </div>

        {/* 引言 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.introduction.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.introduction.content}
          </p>
        </section>

        {/* 删除步骤 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.steps.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.steps.subtitle}
          </p>
          <ol style={{
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '2',
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.steps.items.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {item}
              </li>
            ))}
          </ol>
        </section>

        {/* 删除的数据类型 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.dataTypes.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.dataTypes.subtitle}
          </p>
          <ul style={{
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '2',
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.dataTypes.items.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 保留的数据 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.retainedData.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.retainedData.subtitle}
          </p>
          <ul style={{
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '2',
            color: '#333',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.retainedData.items.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {item}
              </li>
            ))}
          </ul>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.8',
            color: '#666',
            fontStyle: 'italic',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.retainedData.note}
          </p>
        </section>

        {/* 处理时间 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.processingTime.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.processingTime.content}
          </p>
        </section>

        {/* 删除后果 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.consequences.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.consequences.subtitle}
          </p>
          <ul style={{
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '2',
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.consequences.items.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 联系方式 */}
        <section style={{
          marginBottom: '40px',
          padding: '30px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '15px',
          color: 'white'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.contact.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            marginBottom: '20px',
            opacity: 0.95,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.contact.subtitle}
          </p>
          <ul style={{
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '2',
            opacity: 0.95,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.contact.items.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {item}
              </li>
            ))}
          </ul>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.8',
            marginTop: '20px',
            opacity: 0.9,
            fontStyle: 'italic',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.contact.note}
          </p>
        </section>

        {/* 返回首页按钮 */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '15px 40px',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }}
          >
            {t.backToHome}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountPage;

