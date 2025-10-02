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
