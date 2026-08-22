import type { Language } from './types';
import { translations, type TranslationDict } from './translations';

let currentLanguage: Language = 'zh';

export function setRuntimeLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function tRuntime(): TranslationDict {
  return translations[currentLanguage];
}
