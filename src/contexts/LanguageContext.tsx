import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 网站翻译文本
const translations = {
  zh: {
    // 导航和通用
    dashboard: '管理仪表板',
    packages: '同城包裹',
    users: '用户管理',
    couriers: '快递员管理',
    finance: '财务管理',
    tracking: '实时跟踪',
    settings: '系统设置',
    accounts: '账号管理',
    supervision: '员工监督',
    logout: '退出登录',
    
    // 统计相关
    total: '总数',
    pending: '待取件',
    picked: '已取件',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
    
    // 操作相关
    add: '添加',
    edit: '编辑',
    delete: '删除',
    save: '保存',
    cancel: '取消',
    search: '搜索',
    filter: '筛选',
    refresh: '刷新',
    
    // 表单字段
    name: '姓名',
    phone: '电话',
    email: '邮箱',
    address: '地址',
    department: '部门',
    position: '职位',
    role: '角色',
    status: '状态',
    
    // 消息
    success: '成功',
    error: '错误',
    warning: '警告',
    confirm: '确认',
    loading: '加载中...',

    // 财务管理 (Finance Management)
    financeOverview: '财务总览',
    financialRecords: '收支记录',
    dataAnalysis: '数据分析',
    packageFinanceRecords: '包裹收支记录',
    courierFinanceRecords: '骑手收支记录',
    dailyCollection: '当日收款管理',
    merchantsCollection: '合伙代收款',
    totalIncome: '总收入',
    totalExpense: '总支出',
    netProfit: '净利润',
    pendingAmount: '待处理金额',
    orderIncome: '订单收入',
    courierKmCost: '骑手送货费',
    income: '收入',
    expense: '支出',
    recordId: '记录ID',
    type: '类型',
    category: '分类',
    amount: '金额',
    currency: '币种',
    orderCourier: '订单/快递员',
    date: '日期',
    notes: '备注',
    action: '操作',
    addRecord: '添加记录',
    allStatus: '所有状态',
    allType: '所有类型',
    startDate: '开始日期',
    endDate: '结束日期',
    unsettled: '未结清',
    settled: '已结清',
    settleConfirm: '确认结清',
    lastSettled: '上次结清',
    riderId: '骑手ID',
    settlementPeriod: '结算周期',
    baseSalary: '基本工资',
    kmFee: '公里费',
    deliveryBonus: '配送奖金',
    deliveryCount: '配送单数',
    audit: '审核',
    generateSalaries: '生成工资',
    dailyAvg: '日均',
    profitMargin: '利润率',
    recentIncome: '近期收入',
    recentExpense: '近期支出',
    recentPackages: '近期包裹',
    recentProfit: '近期利润',
    analysisPeriod: '分析周期',
    last7Days: '最近7天',
    last30Days: '最近30天',
    last90Days: '最近90天',
    all: '全部',
  },
  en: {
    // 导航和通用
    dashboard: 'Management Dashboard',
    packages: 'City Packages',
    users: 'User Management',
    couriers: 'Courier Management',
    finance: 'Finance Management',
    tracking: 'Real-time Tracking',
    settings: 'System Settings',
    accounts: 'Account Management',
    supervision: 'Employee Supervision',
    logout: 'Logout',
    
    // 统计相关
    total: 'Total',
    pending: 'Pending',
    picked: 'Picked Up',
    delivering: 'In Transit',
    completed: 'Completed',
    cancelled: 'Cancelled',
    
    // 操作相关
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    filter: 'Filter',
    refresh: 'Refresh',
    
    // 表单字段
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    department: 'Department',
    position: 'Position',
    role: 'Role',
    status: 'Status',
    
    // 消息
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    confirm: 'Confirm',
    loading: 'Loading...',

    // Finance Management
    financeOverview: 'Overview',
    financialRecords: 'Records',
    dataAnalysis: 'Analytics',
    packageFinanceRecords: 'Package Records',
    courierFinanceRecords: 'Courier Records',
    dailyCollection: 'Daily Cash',
    merchantsCollection: 'MERCHANTS COD',
    totalIncome: 'Total Income',
    totalExpense: 'Total Expense',
    netProfit: 'Net Profit',
    pendingAmount: 'Pending',
    orderIncome: 'Order Income',
    courierKmCost: 'Courier Fee',
    income: 'Income',
    expense: 'Expense',
    recordId: 'ID',
    type: 'Type',
    category: 'Category',
    amount: 'Amount',
    currency: 'Currency',
    orderCourier: 'Order/Courier',
    date: 'Date',
    notes: 'Notes',
    action: 'Action',
    addRecord: 'Add Record',
    allStatus: 'All Status',
    allType: 'All Types',
    startDate: 'Start Date',
    endDate: 'End Date',
    unsettled: 'Unsettled',
    settled: 'Settled',
    settleConfirm: 'Settle Now',
    lastSettled: 'Last Settled',
    riderId: 'Rider ID',
    settlementPeriod: 'Period',
    baseSalary: 'Base Salary',
    kmFee: 'KM Fee',
    deliveryBonus: 'Bonus',
    deliveryCount: 'Orders',
    audit: 'Approve',
    generateSalaries: 'Generate',
    dailyAvg: 'Daily Avg',
    profitMargin: 'Margin',
    recentIncome: 'Recent Income',
    recentExpense: 'Recent Expense',
    recentPackages: 'Recent Packages',
    recentProfit: 'Recent Profit',
    analysisPeriod: 'Period',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    last90Days: 'Last 90 Days',
    all: 'All',
  },
  my: {
    // 导航和通用
    dashboard: 'စီမံခန့်ခွဲမှု ဒက်ရှ်ဘုတ်',
    packages: 'မြို့တွင်း ပစ္စည်းများ',
    users: 'အသုံးပြုသူ စီမံခန့်ခွဲမှု',
    couriers: 'ပို့ဆောင်သူ စီမံခန့်ခွဲမှု',
    finance: 'ဘဏ္ဍာရေး စီမံခန့်ခွဲမှု',
    tracking: 'အချိန်နှင့်တစ်ပြေးညီ ခြေရာခံခြင်း',
    settings: 'စနစ် ဆက်တင်များ',
    accounts: 'အကောင့် စီမံခန့်ခွဲမှု',
    supervision: 'ဝန်ထမ်း စောင့်ကြည့်ခြင်း',
    logout: 'ထွက်ရန်',
    
    // 统计相关
    total: 'စုစုပေါင်း',
    pending: 'စောင့်ဆိုင်းဆဲ',
    picked: 'လက်ခံရရှိပြီး',
    delivering: 'ပို့ဆောင်ဆဲ',
    completed: 'ပြီးစီးသည်',
    cancelled: 'ပယ်ဖျက်သည်',
    
    // 操作相关
    add: 'ထည့်ရန်',
    edit: 'ပြင်ဆင်ရန်',
    delete: 'ဖျက်ရန်',
    save: 'သိမ်းဆည်းရန်',
    cancel: 'ပယ်ဖျက်ရန်',
    search: 'ရှာဖွေရန်',
    filter: 'စစ်ထုတ်ရန်',
    refresh: 'ပြန်လည်စတင်ရန်',
    
    // 表单字段
    name: 'အမည်',
    phone: 'ဖုန်းနံပါတ်',
    email: 'အီးမေးလ်',
    address: 'လိပ်စာ',
    department: 'ဌာန',
    position: 'ရာထူး',
    role: 'အခန်းကဏ္ဍ',
    status: 'အခြေအနေ',
    
    // 消息
    success: 'အောင်မြင်သည်',
    error: 'မှားယွင်းသည်',
    warning: 'သတိပေးချက်',
    confirm: 'အတည်ပြုရန်',
    loading: 'လုပ်ဆောင်နေဆဲ...',

    // Finance Management (Burmese)
    financeOverview: 'ဘဏ္ဍာရေးခြုံငုံသုံးသပ်ချက်',
    financialRecords: 'ဝင်ငွေထွက်ငွေမှတ်တမ်း',
    dataAnalysis: 'ဒေတာခွဲခြမ်းစိတ်ဖြာခြင်း',
    packageFinanceRecords: 'ပစ္စည်းပို့ဆောင်ခမှတ်တမ်း',
    courierFinanceRecords: 'ဝန်ထမ်းလစာမှတ်တမ်း',
    dailyCollection: 'နေ့စဉ်ငွေကောက်ခံမှု',
    merchantsCollection: 'မိတ်ဖက်ဆိုင်ငွေလွှဲမှု',
    totalIncome: 'စုစုပေါင်းဝင်ငွေ',
    totalExpense: 'စုစုပေါင်းအသုံးစရိတ်',
    netProfit: 'အသားတင်အမြတ်',
    pendingAmount: 'စောင့်ဆိုင်းဆဲပမာဏ',
    orderIncome: 'အော်ဒါဝင်ငွေ',
    courierKmCost: 'ဝန်ထမ်းပို့ဆောင်ခ',
    income: 'ဝင်ငွေ',
    expense: 'အသုံးစရိတ်',
    recordId: 'မှတ်တမ်းနံပါတ်',
    type: 'အမျိုးအစား',
    category: 'ကဏ္ဍ',
    amount: 'ပမာဏ',
    currency: 'ငွေကြေး',
    orderCourier: 'အော်ဒါ/ဝန်ထမ်း',
    date: 'ရက်စွဲ',
    notes: 'မှတ်ချက်',
    action: 'လုပ်ဆောင်ချက်',
    addRecord: 'မှတ်တမ်းထည့်ရန်',
    allStatus: 'အခြေအနေအားလုံး',
    allType: 'အမျိုးအစားအားလုံး',
    startDate: 'စတင်ရက်',
    endDate: 'ပြီးဆုံးရက်',
    unsettled: 'မရှင်းလင်းရသေး',
    settled: 'ရှင်းလင်းပြီး',
    settleConfirm: 'ငွေရှင်းမည်',
    lastSettled: 'နောက်ဆုံးရှင်းလင်းမှု',
    riderId: 'ဝန်ထမ်းနံပါတ်',
    settlementPeriod: 'ကာလ',
    baseSalary: 'အခြေခံလစာ',
    kmFee: 'ကီလိုမီတာကြေး',
    deliveryBonus: 'ဆုကြေးငွေ',
    deliveryCount: 'အော်ဒါအရေအတွက်',
    audit: 'အတည်ပြုရန်',
    generateSalaries: 'လစာထုတ်ပေးရန်',
    dailyAvg: 'နေ့စဉ်ပျမ်းမျှ',
    profitMargin: 'အမြတ်နှုန်း',
    recentIncome: 'လတ်တလောဝင်ငွေ',
    recentExpense: 'လတ်တလောအသုံးစရိတ်',
    recentPackages: 'လတ်တလောပစ္စည်းများ',
    recentProfit: 'လတ်တလောအမြတ်',
    analysisPeriod: 'ခွဲခြမ်းစိတ်ဖြာမှုကာလ',
    last7Days: 'လွန်ခဲ့သော ၇ ရက်',
    last30Days: 'လွန်ခဲ့သော ရက် ၃၀',
    last90Days: 'လွန်ခဲ့သော ရက် ၉၀',
    all: 'အားလုံး',
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState('zh');

  useEffect(() => {
    // 从localStorage读取保存的语言设置
    const savedLang = localStorage.getItem('siteLanguage');
    if (savedLang && (savedLang === 'zh' || savedLang === 'en')) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('siteLanguage', lang);
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
