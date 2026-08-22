import type { FinanceLedgerEntry } from '../types/financeLedger';

export type FinanceTabKey = 'all' | 'transport' | 'agency' | 'pending' | 'manual';

export function formatMmk(n: number): string {
  if (n <= 0) return '0';
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export function formatMmkWithUnit(n: number): string {
  return `${formatMmk(n)} MMK`;
}

export function isAgencyEntry(entry: FinanceLedgerEntry, currentKey: string): boolean {
  const originKey = String(entry.originKey || '').trim();
  if (!originKey || originKey === currentKey) return false;
  return entry.category === 'order_collected' || entry.category === 'order_prepaid';
}

export function isCrossStationCodPending(entry: FinanceLedgerEntry, currentKey: string): boolean {
  if (entry.category !== 'order_income_cod') return false;
  const originKey = String(entry.originKey || '').trim();
  return Boolean(originKey && originKey !== currentKey);
}

export function filterByTab(
  entries: FinanceLedgerEntry[],
  tab: FinanceTabKey,
  currentKey: string,
): FinanceLedgerEntry[] {
  if (tab === 'all') return entries;
  if (tab === 'transport') {
    return entries.filter(
      (e) => e.category === 'transport_cost' && e.transportDirection !== 'outbound',
    );
  }
  if (tab === 'agency') return entries.filter((e) => isAgencyEntry(e, currentKey));
  if (tab === 'pending') {
    return entries.filter((e) => isCrossStationCodPending(e, currentKey));
  }
  return entries.filter(
    (e) => e.category === 'manual_income' || e.category === 'manual_expense',
  );
}
