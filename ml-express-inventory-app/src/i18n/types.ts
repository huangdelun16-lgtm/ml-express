export type Language = 'zh' | 'en' | 'my';

export const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
];

export const LANGUAGE_STORAGE_KEY = 'ml-express-language';
