import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '../i18n/types';
import { LANGUAGE_STORAGE_KEY } from '../i18n/types';
import { setRuntimeLanguage } from '../i18n/runtime';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguage(value: string | null): value is Language {
  return value === 'zh' || value === 'en' || value === 'my';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (isLanguage(saved)) {
          setRuntimeLanguage(saved);
          setLanguageState(saved);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setRuntimeLanguage(lang);
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore persistence errors
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, ready }),
    [language, setLanguage, ready],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
