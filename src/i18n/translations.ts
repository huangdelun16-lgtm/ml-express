export interface Translations {
  // Header & Navigation
  home: string;
  services: string;
  pricing: string;
  tracking: string;
  contact: string;
  directOrder: string;
  adminPanel: string;
  
  // Homepage
  heroTitle: string;
  heroSubtitle: string;
  trackPackage: string;
  learnServices: string;
  
  // Service Flow
  serviceFlow: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  step4Title: string;
  step4Desc: string;
  step5Title: string;
  step5Desc: string;
  
  // Quick Actions
  quickTrack: string;
  quickTrackDesc: string;
  trackNow: string;
  getBestPrice: string;
  getBestPriceDesc: string;
  getQuote: string;
  
  // Features
  featuresTitle: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  feature4Title: string;
  feature4Desc: string;
  
  // Admin
  welcome: string;
  logout: string;
  
  // Common
  loading: string;
  error: string;
  success: string;
  cancel: string;
  confirm: string;
  save: string;
  delete: string;
  edit: string;
  add: string;
  search: string;
}

export const translations: Record<'zh' | 'en' | 'my', Translations> = {
  zh: {
    // Header & Navigation
    home: '首页',
    services: '服务',
    pricing: '价格',
    tracking: '查询',
    contact: '联系',
    directOrder: '直接下单',
    adminPanel: '后台管理',
    
    // Homepage
    heroTitle: 'MARKET LINK',
    heroSubtitle: '专业的跨境快递服务，连接您与世界',
    trackPackage: '查询快递',
    learnServices: '了解服务',
    
    // Service Flow
    serviceFlow: '服务流程',
    step1Title: '下单',
    step1Desc: '客户通过网站或电话下单',
    step2Title: '揽收',
    step2Desc: '快递员上门揽收包裹',
    step3Title: '运输',
    step3Desc: '包裹进入物流网络运输',
    step4Title: '派送',
    step4Desc: '快递员派送包裹到收件人',
    step5Title: '签收',
    step5Desc: '收件人确认签收包裹',
    
    // Quick Actions
    quickTrack: '快速查询您的包裹',
    quickTrackDesc: '输入快递单号，实时跟踪包裹状态',
    trackNow: '立即查询',
    getBestPrice: '获取最优价格',
    getBestPriceDesc: '在线询价，专业客服为您提供个性化报价',
    getQuote: '立即询价',
    
    // Features
    featuresTitle: '为什么选择我们',
    feature1Title: '快速配送',
    feature1Desc: '专业的物流网络确保您的包裹快速送达目的地',
    feature2Title: '安全保障',
    feature2Desc: '全程保险覆盖，货物安全有保障，让您放心托付',
    feature3Title: '专业客服',
    feature3Desc: '24/7专业客服团队，随时为您解答问题和提供帮助',
    feature4Title: '准时送达',
    feature4Desc: '承诺送达时间，超时赔付，让您的时间更有保障',
    
    // Admin
    welcome: '欢迎',
    logout: '退出登录',
    
    // Common
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    search: '搜索',
  },
  
  en: {
    // Header & Navigation
    home: 'Home',
    services: 'Services',
    pricing: 'Pricing',
    tracking: 'Tracking',
    contact: 'Contact',
    directOrder: 'Order Now',
    adminPanel: 'Admin Panel',
    
    // Homepage
    heroTitle: 'MARKET LINK',
    heroSubtitle: 'Professional cross-border express service, connecting you with the world',
    trackPackage: 'Track Package',
    learnServices: 'Learn More',
    
    // Service Flow
    serviceFlow: 'Service Process',
    step1Title: 'Order',
    step1Desc: 'Place order via website or phone',
    step2Title: 'Pickup',
    step2Desc: 'Courier picks up package at your location',
    step3Title: 'Transit',
    step3Desc: 'Package enters logistics network for transport',
    step4Title: 'Delivery',
    step4Desc: 'Courier delivers package to recipient',
    step5Title: 'Received',
    step5Desc: 'Recipient confirms package receipt',
    
    // Quick Actions
    quickTrack: 'Track Your Package Quickly',
    quickTrackDesc: 'Enter tracking number for real-time package status',
    trackNow: 'Track Now',
    getBestPrice: 'Get Best Price',
    getBestPriceDesc: 'Online quote, professional service for personalized pricing',
    getQuote: 'Get Quote',
    
    // Features
    featuresTitle: 'Why Choose Us',
    feature1Title: 'Fast Delivery',
    feature1Desc: 'Professional logistics network ensures fast delivery to destination',
    feature2Title: 'Secure Service',
    feature2Desc: 'Full insurance coverage, safe cargo handling you can trust',
    feature3Title: 'Professional Support',
    feature3Desc: '24/7 professional customer service team ready to help',
    feature4Title: 'On-time Delivery',
    feature4Desc: 'Guaranteed delivery time with compensation for delays',
    
    // Admin
    welcome: 'Welcome',
    logout: 'Logout',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
  },
  
  my: {
    // Header & Navigation
    home: 'ပင်မစာမျက်နှာ',
    services: 'ဝန်ဆောင်မှုများ',
    pricing: 'စျေးနှုန်း',
    tracking: 'ခြေရာခံခြင်း',
    contact: 'ဆက်သွယ်ရန်',
    directOrder: 'မှာယူရန်',
    adminPanel: 'စီမံခန့်ခွဲမှု',
    
    // Homepage
    heroTitle: 'MARKET LINK',
    heroSubtitle: 'ကမ္ဘာ့နိုင်ငံများအကြား ပရော်ဖက်ရှင်နယ် စာပို့ဝန်ဆောင်မှု',
    trackPackage: 'ခြေရာခံရန်',
    learnServices: 'ပိုမိုလေ့လာရန်',
    
    // Service Flow
    serviceFlow: 'ဝန်ဆောင်မှုလုပ်ငန်းစဉ်',
    step1Title: 'မှာယူခြင်း',
    step1Desc: 'ဝက်ဘ်ဆိုဒ် သို့မဟုတ် ဖုန်းဖြင့် မှာယူနိုင်သည်',
    step2Title: 'ကောက်ယူခြင်း',
    step2Desc: 'စာပို့သမားက သင့်နေရာမှ ပစ္စည်းကို ကောက်ယူမည်',
    step3Title: 'ပို့ဆောင်ခြင်း',
    step3Desc: 'ပစ္စည်းများကို ပို့ဆောင်ရေးကွန်ယက်သို့ ထည့်သွင်းမည်',
    step4Title: 'ပေးပို့ခြင်း',
    step4Desc: 'စာပို့သမားက လက်ခံသူထံ ပစ္စည်းပေးပို့မည်',
    step5Title: 'လက်ခံခြင်း',
    step5Desc: 'လက်ခံသူက ပစ္စည်းရရှိကြောင်း အတည်ပြုမည်',
    
    // Quick Actions
    quickTrack: 'သင့်ပစ္စည်းကို လျင်မြန်စွာ ခြေရာခံပါ',
    quickTrackDesc: 'ခြေရာခံနံပါတ်ထည့်ပြီး အချိန်နှင့်တစ်ပြေးညီ အခြေအနေကြည့်ရှုပါ',
    trackNow: 'ယခုခြေရာခံရန်',
    getBestPrice: 'အကောင်းဆုံးစျေးနှုန်း ရယူရန်',
    getBestPriceDesc: 'အွန်လိုင်းစျေးနှုန်းမေးမြန်းမှု၊ ပရော်ဖက်ရှင်နယ် ဝန်ဆောင်မှုဖြင့် စိတ်ကြိုက်စျေးနှုန်း',
    getQuote: 'ယခုမေးမြန်းရန်',
    
    // Features
    featuresTitle: 'ကျွန်ုပ်တို့ကို အဘယ်ကြောင့် ရွေးချယ်ရမည်နည်း',
    feature1Title: 'လျင်မြန်သော ပို့ဆောင်မှု',
    feature1Desc: 'ပရော်ဖက်ရှင်နယ် ပို့ဆောင်ရေးကွန်ယက်က သင့်ပစ္စည်းများကို လျင်မြန်စွာ ပေးပို့သည်',
    feature2Title: 'ဘေးကင်းရေး အာမခံ',
    feature2Desc: 'အပြည့်အဝ အာမခံအကျုံးဝင်မှု၊ ကုန်ပစ္စည်းဘေးကင်းရေး အာမခံ',
    feature3Title: 'ပရော်ဖက်ရှင်နယ် ပံ့ပိုးမှု',
    feature3Desc: '၂၄/၇ ပရော်ဖက်ရှင်နယ် ဝန်ဆောင်မှုအဖွဲ့က အမြဲအဆင်သင့်',
    feature4Title: 'အချိန်နှင့်တစ်ပြေးညီ ပေးပို့မှု',
    feature4Desc: 'ပေးပို့ချိန်အာမခံ၊ နောက်ကျပါက လျော်ကြေးပေးမည်',
    
    // Admin
    welcome: 'ကြိုဆိုပါသည်',
    logout: 'ထွက်ရန်',
    
    // Common
    loading: 'လုပ်ဆောင်နေသည်...',
    error: 'အမှား',
    success: 'အောင်မြင်',
    cancel: 'ပယ်ဖျက်',
    confirm: 'အတည်ပြု',
    save: 'သိမ်းဆည်း',
    delete: 'ဖျက်',
    edit: 'ပြင်ဆင်',
    add: 'ထပ်ထည့်',
    search: 'ရှာဖွေ',
  },
};

export const getTranslation = (key: keyof Translations, language: 'zh' | 'en' | 'my' = 'zh'): string => {
  return translations[language][key] || translations.zh[key];
};
