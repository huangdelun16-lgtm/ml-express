export type SettlementMonthTone = 'confirmed' | 'missing' | 'current' | 'upcoming';

/** 年报月份：已确认 / 过期未结 / 本月未结 / 尚未到月 */
export function settlementMonthTone(
  month: number,
  year: number,
  missing: boolean,
  today: { y: number; m: number },
): SettlementMonthTone {
  if (!missing) return 'confirmed';
  if (year > today.y) return 'upcoming';
  if (year < today.y) return 'missing';
  if (month < today.m) return 'missing';
  if (month === today.m) return 'current';
  return 'upcoming';
}
