import { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Language } from './types';
import { translations, type TranslationDict } from './translations';
import { fmt } from './format';
import type { PackDisplayStatus } from '../utils/packDisplayStatus';

export function useTranslation(): {
  t: TranslationDict;
  language: Language;
  fmt: typeof fmt;
} {
  const { language } = useLanguage();
  const t = useMemo(() => translations[language], [language]);
  return { t, language, fmt };
}

export function getPackStatusLabel(
  language: Language,
  status: PackDisplayStatus,
): string {
  return translations[language].packStatus[status];
}
