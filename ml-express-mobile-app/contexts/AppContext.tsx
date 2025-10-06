import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation, LanguageTexts } from '../utils/i18n';
import { getTheme, ThemeColors } from '../utils/theme';

interface AppContextType {
  // 语言相关
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: LanguageTexts;
  
  // 主题相关
  themeMode: string;
  setThemeMode: (theme: string) => Promise<void>;
  theme: ThemeColors;
  
  // 设置相关
  settings: {
    notifications: boolean;
    language: string;
    theme: string;
  };
  updateSettings: (newSettings: any) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState('zh');
  const [themeMode, setThemeModeState] = useState('light');
  const [settings, setSettingsState] = useState({
    notifications: true,
    language: 'zh',
    theme: 'light',
  });

  const t = useTranslation(language);
  const theme = getTheme(themeMode);

  // 初始化加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettingsState(parsed);
        setLanguageState(parsed.language || 'zh');
        setThemeModeState(parsed.theme || 'light');
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const setLanguage = async (lang: string) => {
    try {
      const newSettings = { ...settings, language: lang };
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettingsState(newSettings);
      setLanguageState(lang);
    } catch (error) {
      console.error('保存语言设置失败:', error);
    }
  };

  const setThemeMode = async (theme: string) => {
    try {
      const newSettings = { ...settings, theme };
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettingsState(newSettings);
      setThemeModeState(theme);
    } catch (error) {
      console.error('保存主题设置失败:', error);
    }
  };

  const updateSettings = async (newSettings: any) => {
    try {
      const merged = { ...settings, ...newSettings };
      await AsyncStorage.setItem('appSettings', JSON.stringify(merged));
      setSettingsState(merged);
      
      if (newSettings.language) {
        setLanguageState(newSettings.language);
      }
      if (newSettings.theme) {
        setThemeModeState(newSettings.theme);
      }
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  const value: AppContextType = {
    language,
    setLanguage,
    t,
    themeMode,
    setThemeMode,
    theme,
    settings,
    updateSettings,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
