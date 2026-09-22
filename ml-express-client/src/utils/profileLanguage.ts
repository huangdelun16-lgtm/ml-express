export const PROFILE_LANGUAGES = [
  { code: 'zh' as const, nativeLabel: '中文' },
  { code: 'en' as const, nativeLabel: 'English' },
  { code: 'my' as const, nativeLabel: 'မြန်မာ' },
] as const;

export type ProfileLanguage = (typeof PROFILE_LANGUAGES)[number]['code'];

const LANG_SET = new Set<string>(PROFILE_LANGUAGES.map((item) => item.code));

export function isProfileLanguage(value: string): value is ProfileLanguage {
  return LANG_SET.has(value);
}

export function languageIndex(code: ProfileLanguage): number {
  const index = PROFILE_LANGUAGES.findIndex((item) => item.code === code);
  return index >= 0 ? index : 0;
}

export function languageNativeLabel(code: ProfileLanguage): string {
  return PROFILE_LANGUAGES[languageIndex(code)].nativeLabel;
}

export function languagePillMetrics(
  trackWidth: number,
  index: number,
  count = PROFILE_LANGUAGES.length,
  padding = 4,
): { width: number; x: number } {
  const inner = Math.max(0, trackWidth - padding * 2);
  const width = count > 0 ? inner / count : 0;
  return { width, x: padding + index * width };
}
