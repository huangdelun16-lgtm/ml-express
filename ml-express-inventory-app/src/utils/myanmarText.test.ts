import { describe, expect, it } from 'vitest';
import { containsMyanmarText, splitTextRuns } from './myanmarText';

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
});
