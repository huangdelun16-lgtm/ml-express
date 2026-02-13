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
      contact: '联系我们',
      mall: '同城商场',
      cart: '购物车',
    },
    hero: {
      title: '缅甸同城快递',
      subtitle: '快速、安全、可靠的同城快递服务',
      cta: '立即下单',
      mall: '同城商场',
      cart: '购物车'
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
    },
    cart: {
      title: '我的购物车',
      empty: '您的购物车是空的',
      backToMall: '返回商场',
      total: '订单总计',
      checkout: '立即结算下单',
      clear: '清空全部',
      price: '单价',
      quantity: '数量',
      items: '件商品'
    },
    mall: {
      title: '同城商场',
      subtitle: '发现您身边的优质商户',
      searchPlaceholder: '搜索商户名称或类型...',
      noStores: '该区域暂无商户',
      operatingHours: '营业时间',
      contact: '联系电话',
      visitStore: '进入店铺',
      loading: '正在为您加载...',
      all: '全部',
      region: '所在地区',
      openNow: '正在营业',
      closedNow: '休息中',
      closedToday: '今日暂停营业'
    },
    store: {
      loading: '正在加载商品...',
      addToCart: '加入购物车',
      noProducts: '该商店暂无商品',
      stock: '库存',
      infinite: '无限',
      addedToCart: '已加入购物车',
      cart: '购物车',
      back: '返回商场',
      merchantInfo: '商家信息',
      address: '详细地址',
      contact: '联系电话',
      hours: '营业时间',
      openNow: '正在营业',
      closedNow: '休息中',
      closedToday: '今日打烊'
    }
  },
  en: {
    nav: {
      home: 'Home',
      services: 'Services',
      tracking: 'Tracking',
      contact: 'Contact',
      mall: 'City Mall',
      cart: 'Cart',
    },
    hero: {
      title: 'Myanmar Same-Day Delivery',
      subtitle: 'Fast, Safe, and Reliable Same-Day Delivery Service',
      cta: 'Order Now',
      mall: 'City Mall',
      cart: 'Cart'
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
    },
    cart: {
      title: 'My Cart',
      empty: 'Your cart is empty',
      backToMall: 'Back to Mall',
      total: 'Order Total',
      checkout: 'Checkout Now',
      clear: 'Clear All',
      price: 'Price',
      quantity: 'Qty',
      items: 'Items'
    },
    mall: {
      title: 'City Mall',
      subtitle: 'Discover quality merchants around you',
      searchPlaceholder: 'Search store name or type...',
      noStores: 'No stores found in this region',
      operatingHours: 'Hours',
      contact: 'Phone',
      visitStore: 'Visit Store',
      loading: 'Loading for you...',
      all: 'All',
      region: 'Region',
      openNow: 'Open Now',
      closedNow: 'Closed',
      closedToday: 'Closed Today'
    },
    store: {
      loading: 'Loading products...',
      addToCart: 'Add to Cart',
      noProducts: 'No products in this store',
      stock: 'Stock',
      infinite: 'Infinite',
      addedToCart: 'Added to cart',
      cart: 'Cart',
      back: 'Back to Mall',
      merchantInfo: 'Merchant Info',
      address: 'Address',
      contact: 'Phone',
      hours: 'Hours',
      openNow: 'Open Now',
      closedNow: 'Closed',
      closedToday: 'Closed Today'
    }
  },
  my: {
    nav: {
      home: 'ပင်မ',
      services: 'ဝန်ဆောင်မှု',
      tracking: 'ထုပ်ပိုးခြင်း',
      contact: 'ဆက်သွယ်ရန်',
      mall: 'ဈေး',
      cart: 'ခြင်း',
    },
    hero: {
      title: 'မြန်မာမြို့တွင်းပို့ဆောင်ရေး',
      subtitle: 'မြန်ဆန်၊ လုံခြုံ၊ ယုံကြည်စိတ်ချရသော မြို့တွင်းပို့ဆောင်ရေး',
      cta: 'အခုပဲအမှာတင်ပါ',
      mall: 'ဈေး',
      cart: 'ခြင်း'
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
    },
    cart: {
      title: 'ကျွန်ုပ်၏ခြင်း',
      empty: 'ခြင်းထဲတွင် ပစ္စည်းမရှိသေးပါ',
      backToMall: 'ဈေးသို့ပြန်သွားရန်',
      total: 'စုစုပေါင်း',
      checkout: 'အခုပဲဝယ်မည်',
      clear: 'အားလုံးဖျက်ရန်',
      price: 'စျေးနှုန်း',
      quantity: 'အရေအတွက်',
      items: 'ခု'
    },
    mall: {
      title: 'မြို့တွင်းဈေးဝယ်စင်တာ',
      subtitle: 'သင့်အနီးနားရှိ အရည်အသွေးမြင့်ဆိုင်များကို ရှာဖွေပါ',
      searchPlaceholder: 'ဆိုင်အမည် သို့မဟုတ် အမျိုးအစားရှာရန်...',
      noStores: 'ဤဒေသတွင် ဆိုင်များမရှိသေးပါ',
      operatingHours: 'ဖွင့်ချိန်',
      contact: 'ဖုန်းနံပါတ်',
      visitStore: 'ဆိုင်သို့ဝင်ရန်',
      loading: 'ခေတ္တစောင့်ဆိုင်းပါ...',
      all: 'အားလုံး',
      region: 'ဒေသ',
      openNow: 'ဆိုင်ဖွင့်ထားသည်',
      closedNow: 'ဆိုင်ပိတ်ထားသည်',
      closedToday: 'ယနေ့ ဆိုင်ပိတ်သည်'
    },
    store: {
      loading: 'ကုန်ပစ္စည်းများရှာဖွေနေပါသည်...',
      addToCart: 'ခြင်းထဲသို့ထည့်ရန်',
      noProducts: 'ဤဆိုင်တွင် ကုန်ပစ္စည်းမရှိသေးပါ',
      stock: 'လက်ကျန်',
      infinite: 'အကန့်အသတ်မရှိ',
      addedToCart: 'ခြင်းထဲသို့ထည့်ပြီးပါပြီ',
      cart: 'ခြင်း',
      back: 'ဈေးသို့ပြန်သွားရန်',
      merchantInfo: 'ဆိုင်အချက်အလက်',
      address: 'လိပ်စာ',
      contact: 'ဖုန်းနံပါတ်',
      hours: 'ဖွင့်ချိန်',
      openNow: 'ဆိုင်ဖွင့်ထားသည်',
      closedNow: 'ဆိုင်ပိတ်ထားသည်',
      closedToday: 'ယနေ့ ဆိုင်ပိတ်သည်'
    }
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const savedLang = localStorage.getItem('ml-express-language');
    if (savedLang && (savedLang === 'zh' || savedLang === 'en' || savedLang === 'my')) {
      return savedLang;
    }
    return 'zh';
  });

  useEffect(() => {
    // 确保body属性与状态同步
    document.body.setAttribute('data-language', language);
  }, [language]);

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

