import { describe, expect, it } from 'vitest';
import { containsMyanmarText, myanmarCompatStyle, myanmarTypeAdjust, splitTextRuns } from './myanmarText';

describe('myanmarText', () => {
  it('detects Myanmar unicode', () => {
    expect(containsMyanmarText('ဆိုင်ကုဒ်')).toBe(true);
    expect(containsMyanmarText('Store code')).toBe(false);
  });

  it('splits mixed scripts', () => {
    const runs = splitTextRuns('YGN ရန်ကုန်');
    expect(runs.some((run) => run.myanmar)).toBe(true);
    expect(runs.some((run) => !run.myanmar)).toBe(true);
  });

  it('shrinks Myanmar type by two points and keeps a tall line height', () => {
    expect(myanmarTypeAdjust({ fontSize: 16, lineHeight: 24 })).toEqual({
      includeFontPadding: true,
      fontSize: 14,
      lineHeight: 26,
    });
    expect(myanmarTypeAdjust({ fontSize: 11 })?.fontSize).toBe(10);
  });

  it('caps synthetic fontWeight so Noto Myanmar is used', () => {
    expect(myanmarCompatStyle('bold')).toEqual({ fontWeight: '700', letterSpacing: 0 });
    expect(myanmarCompatStyle('regular')).toEqual({ fontWeight: '400', letterSpacing: 0 });
  });
});
