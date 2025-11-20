import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 客户端网站翻译文本
const translations = {
  zh: {
    nav: {
      home: '首页',
      services: '服务',
      tracking: '包裹跟踪',
      contact: '联系我们'
    },
    hero: {
      title: '缅甸同城快递',
      subtitle: '快速、安全、可靠的同城快递服务',
      cta: '立即下单'
    },
    features: {
      title: '服务特色',
      fast: '快速配送',
      safe: '安全可靠',
      convenient: '便捷服务',
      affordable: '价格实惠'
    },
    tracking: {
      title: '包裹跟踪',
      placeholder: '请输入包裹单号',
      track: '查询',
      notFound: '未找到包裹信息'
    }
  },
  en: {
    nav: {
      home: 'Home',
      services: 'Services',
      tracking: 'Tracking',
      contact: 'Contact'
    },
    hero: {
      title: 'Myanmar Same-Day Delivery',
      subtitle: 'Fast, Safe, and Reliable Same-Day Delivery Service',
      cta: 'Order Now'
    },
    features: {
      title: 'Service Features',
      fast: 'Fast Delivery',
      safe: 'Safe & Secure',
      convenient: 'Convenient',
      affordable: 'Affordable'
    },
    tracking: {
      title: 'Package Tracking',
      placeholder: 'Enter tracking number',
      track: 'Track',
      notFound: 'Package not found'
    }
  },
  my: {
    nav: {
      home: 'ပင်မ',
      services: 'ဝန်ဆောင်မှု',
      tracking: 'ထုပ်ပိုးခြင်း',
      contact: 'ဆက်သွယ်ရန်'
    },
    hero: {
      title: 'မြန်မာမြို့တွင်းပို့ဆောင်ရေး',
      subtitle: 'မြန်ဆန်၊ လုံခြုံ၊ ယုံကြည်စိတ်ချရသော မြို့တွင်းပို့ဆောင်ရေး',
      cta: 'အခုပဲအမှာတင်ပါ'
    },
    features: {
      title: 'ဝန်ဆောင်မှုအထူးခြားမှု',
      fast: 'မြန်ဆန်သောပို့ဆောင်မှု',
      safe: 'လုံခြုံသော',
      convenient: 'အဆင်ပြေသော',
      affordable: 'စျေးနှုန်းသင့်တင့်သော'
    },
    tracking: {
      title: 'ထုပ်ပိုးခြင်း',
      placeholder: 'ထုပ်ပိုးနံပါတ်ကို ထည့်ပါ',
      track: 'ရှာဖွေပါ',
      notFound: 'ထုပ်ပိုးအချက်အလက် မတွေ့ပါ'
    }
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState('zh');

  useEffect(() => {
    const savedLang = localStorage.getItem('ml-express-language');
    if (savedLang && (savedLang === 'zh' || savedLang === 'en' || savedLang === 'my')) {
      setLanguageState(savedLang);
      // 设置body的data-language属性，用于CSS选择器
      document.body.setAttribute('data-language', savedLang);
    }
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('ml-express-language', lang);
    // 设置body的data-language属性，用于CSS选择器
    document.body.setAttribute('data-language', lang);
  };

  const t = translations[language as keyof typeof translations] || translations.zh;

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

