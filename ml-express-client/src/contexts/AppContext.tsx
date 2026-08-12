import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import LoggerService from '../services/LoggerService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { Alert } from 'react-native';
import { APP_CONFIG } from '../config/constants';
import { feedbackService } from '../services/FeedbackService';

type Language = 'zh' | 'en' | 'my';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  refreshSession: () => Promise<void>;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  isGuest: boolean;
  setIsGuest: (isGuest: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

const MERCHANT_SESSION_KEYS = [
  'currentUser',
  'userId',
  'userEmail',
  'userName',
  'userPhone',
  'userType',
  'currentStoreCode',
  'currentSessionId',
];

function isMerchantUserType(userType: unknown): boolean {
  const t = String(userType || '').toLowerCase();
  return t === 'merchant' || t === 'merchants' || t === 'partner';
}

async function clearMerchantSession(reason?: string) {
  await AsyncStorage.multiRemove(MERCHANT_SESSION_KEYS);
  if (reason) {
    feedbackService.info(reason);
  }
}

export function AppProvider({ children }: AppProviderProps) {
  const [language, setLanguageState] = useState<Language>('zh');
  const [isDarkMode, setIsDarkModeState] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInitialData = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('ml-express-language');
      if (savedLang && (savedLang === 'zh' || savedLang === 'en' || savedLang === 'my')) {
        setLanguageState(savedLang as Language);
      }

      const savedDarkMode = await AsyncStorage.getItem('ml-express-dark-mode');
      if (savedDarkMode) {
        setIsDarkModeState(savedDarkMode === 'true');
      }

      const guestFlag = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.IS_GUEST);
      setIsGuest(guestFlag === 'true');

      const currentUserStr = await AsyncStorage.getItem('currentUser');
      if (currentUserStr) {
        const user = JSON.parse(currentUserStr);
        if (isMerchantUserType(user.user_type)) {
          await clearMerchantSession(
            language === 'en'
              ? 'Merchant accounts use MARKET LINK MERCHANT. Please sign in there.'
              : language === 'my'
                ? 'ဆိုင်အကောင့်များကို Merchant App တွင်သာ အသုံးပြုပါ။'
                : '商家账号请使用商家端 App 登录。'
          );
        }
      }
    } catch (error) {
      LoggerService.error('加载初始设置失败:', error);
    }
  };

  /** 会员 App 仅维护 customer 会话校验（不再监听商家新单） */
  const setupCustomerSessionGuard = async () => {
    try {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }

      const currentUserStr = await AsyncStorage.getItem('currentUser');
      if (!currentUserStr) return;

      const user = JSON.parse(currentUserStr);
      if (isMerchantUserType(user.user_type)) {
        await clearMerchantSession(
          language === 'en'
            ? 'Merchant accounts use MARKET LINK MERCHANT. Please sign in there.'
            : language === 'my'
              ? 'ဆိုင်အကောင့်များကို Merchant App တွင်သာ အသုံးပြုပါ။'
              : '商家账号请使用商家端 App 登录。'
        );
        return;
      }

      const checkSession = async () => {
        try {
          const localSessionId = await AsyncStorage.getItem('currentSessionId');
          if (!user.id || !localSessionId) return;

          const { data, error } = await supabase
            .from('users')
            .select('current_session_id')
            .eq('id', user.id)
            .single();

          if (!error && data && data.current_session_id && data.current_session_id !== localSessionId) {
            if (sessionTimerRef.current) {
              clearInterval(sessionTimerRef.current);
            }

            Alert.alert(
              language === 'en' ? 'Signed out' : language === 'my' ? 'အကောင့်ထွက်ပြီး' : '登录状态异常',
              language === 'en'
                ? 'Your account signed in on another device.'
                : language === 'my'
                  ? 'ဤအကောင့်ကို အခြားစက်တွင် ဝင်ရောက်ထားပါသည်။'
                  : '您的账号已在其他设备登录，当前设备已被强制下线。',
              [
                {
                  text: language === 'en' ? 'OK' : language === 'my' ? 'OK' : '确定',
                  onPress: async () => {
                    await AsyncStorage.multiRemove(MERCHANT_SESSION_KEYS);
                    try {
                      const Updates = require('expo-updates');
                      Updates.reloadAsync();
                    } catch {
                      // ignore
                    }
                  },
                },
              ],
              { cancelable: false }
            );
          }
        } catch (e) {
          LoggerService.warn('检查会话失败:', e);
        }
      };

      sessionTimerRef.current = setInterval(checkSession, 30000);
      setTimeout(checkSession, 5000);
    } catch (error) {
      LoggerService.warn('建立会话守卫失败:', error);
    }
  };

  const refreshSession = async () => {
    await setupCustomerSessionGuard();
  };

  useEffect(() => {
    loadInitialData();
    setupCustomerSessionGuard();

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [language]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('ml-express-language', lang);
    } catch (error) {
      LoggerService.error('保存语言设置失败:', error);
    }
  };

  const setIsDarkMode = async (isDark: boolean) => {
    setIsDarkModeState(isDark);
    try {
      await AsyncStorage.setItem('ml-express-dark-mode', isDark.toString());
    } catch (error) {
      LoggerService.error('保存主题设置失败:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        refreshSession,
        isDarkMode,
        setIsDarkMode,
        isGuest,
        setIsGuest,
      }}
    >
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
