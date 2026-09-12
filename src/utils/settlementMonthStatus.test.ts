import { settlementMonthTone } from './settlementMonthStatus';

const today = { y: 2026, m: 9 };

describe('settlementMonthTone', () => {
  it('keeps confirmed months even in the past', () => {
    expect(settlementMonthTone(3, 2026, false, today)).toBe('confirmed');
  });

  it('marks overdue unconfirmed months as missing', () => {
    expect(settlementMonthTone(8, 2026, true, today)).toBe('missing');
    expect(settlementMonthTone(12, 2025, true, today)).toBe('missing');
  });

  it('does not treat the current or future months as missing', () => {
    expect(settlementMonthTone(9, 2026, true, today)).toBe('current');
    expect(settlementMonthTone(10, 2026, true, today)).toBe('upcoming');
    expect(settlementMonthTone(1, 2027, true, today)).toBe('upcoming');
  });
});
