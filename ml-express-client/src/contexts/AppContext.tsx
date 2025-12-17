import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import LoggerService from '../services/LoggerService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'zh' | 'en' | 'my';
interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}
const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [language, setLanguageState] = useState<Language>('zh');
  // 从本地存储加载语言设置
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('ml-express-language');
        if (savedLang && (savedLang === 'zh' || savedLang === 'en' || savedLang === 'my')) {
          setLanguageState(savedLang as Language);
        }
      } catch (error) {
        LoggerService.error('加载语言设置失败:', error);
      }
    };
    loadLanguage();
  }, []);
  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('ml-express-language', lang);
    } catch (error) {
      LoggerService.error('保存语言设置失败:', error);
    }
  };
  return (
    <AppContext.Provider value={{ language, setLanguage }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
