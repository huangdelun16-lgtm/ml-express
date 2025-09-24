import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getTranslation, Translations } from '../i18n/translations';

export type Language = 'zh' | 'en' | 'my';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('zh');

  useEffect(() => {
    // 从 localStorage 读取保存的语言设置
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['zh', 'en', 'my'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    } else {
      // 根据浏览器语言自动设置
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.includes('en')) {
        setLanguageState('en');
      } else if (browserLang.includes('my')) {
        setLanguageState('my');
      } else {
        setLanguageState('zh');
      }
    }
  }, []);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const t = (key: keyof Translations) => {
    return getTranslation(key, language);
  };

  const value = {
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

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
