import { describe, expect, it } from 'vitest';
import {
  isProfileLanguage,
  languageIndex,
  languageNativeLabel,
  languagePillMetrics,
} from './profileLanguage';

describe('profileLanguage', () => {
  it('maps codes to native labels and index', () => {
    expect(isProfileLanguage('my')).toBe(true);
    expect(isProfileLanguage('fr')).toBe(false);
    expect(languageIndex('en')).toBe(1);
    expect(languageNativeLabel('zh')).toBe('中文');
    expect(languageNativeLabel('my')).toBe('မြန်မာ');
  });

  it('places the sliding pill in equal cells', () => {
    const first = languagePillMetrics(304, 0);
    expect(first.width).toBeCloseTo(98.67, 1);
    expect(first.x).toBe(4);
    const mid = languagePillMetrics(304, 1);
    expect(mid.width).toBeCloseTo(98.67, 1);
    expect(mid.x).toBeCloseTo(102.67, 1);
    const last = languagePillMetrics(304, 2);
    expect(last.x).toBeCloseTo(201.33, 1);
  });
});
