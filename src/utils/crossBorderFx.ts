export const CROSS_BORDER_FX_SETTINGS_KEY = 'pricing.cross_border.fx.mmk_per_cny';
export const CROSS_BORDER_FX_HISTORY_SETTINGS_KEY = 'pricing.cross_border.fx.mmk_per_cny.history';

export const CROSS_BORDER_FX_HISTORY_LIMIT = 20;

export type CrossBorderFxHistoryEntry = {
  at: string;
  by: string;
  from: number | null;
  to: number;
};

const CUSTOMER_LEDGER_CATEGORIES = new Set([
  'pending_inflow',
  'collected',
  'manual_income',
  'order_income_cod',
  'order_prepaid',
  'order_collected',
]);

/** 1 CNY = X MMK。无效 / 未设时返回 null，禁止当 0 去折算。 */
export function parseMmkPerCnyRate(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return parseMmkPerCnyRate((raw as { value: unknown }).value);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return parseMmkPerCnyRate(JSON.parse(trimmed));
    } catch {
      const n = Number(trimmed.replace(/,/g, ''));
      return Number.isFinite(n) && n > 0 ? n : null;
    }
  }
  return null;
}

export function pickMmkPerCnyRate(
  rows: Array<{ settings_key?: string | null; settings_value?: unknown }>,
): number | null {
  for (const row of rows) {
    if (row.settings_key === CROSS_BORDER_FX_SETTINGS_KEY) {
      return parseMmkPerCnyRate(row.settings_value);
    }
  }
  return null;
}

export function mmkToCny(mmk: number, rate: number | null): number | null {
  if (rate == null || rate <= 0 || !Number.isFinite(rate) || !Number.isFinite(mmk)) return null;
  return mmk / rate;
}

/** 入库总费用取整口径，与 calculateCrossBorderTotalFee 一致 */
export function cnyToMmk(cny: number, rate: number | null): number | null {
  if (rate == null || rate <= 0 || !Number.isFinite(rate) || !Number.isFinite(cny)) return null;
  return Math.round(cny * rate);
}

export function formatCnyAmount(cny: number): string {
  if (!Number.isFinite(cny)) return '—';
  return cny.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatCnyInput(cny: number): string {
  if (!Number.isFinite(cny)) return '';
  if (Math.abs(cny - Math.round(cny)) < 1e-9) return String(Math.round(cny));
  return String(Number(cny.toFixed(4)));
}

export function isCustomerLedgerCategory(category: string): boolean {
  return CUSTOMER_LEDGER_CATEGORIES.has(category);
}

const SETTLED_CUSTOMER_CATEGORIES = new Set(['order_collected', 'order_prepaid', 'collected']);

export function isSettledCustomerCategory(category: string): boolean {
  return SETTLED_CUSTOMER_CATEGORIES.has(category);
}

/** 已收/预付用锁定汇率；待入账用活汇率。已收但没锁则返回 null，禁止用今天汇率改历史。 */
export function displayRateForCustomerCategory(
  category: string,
  lockedRate: number | null | undefined,
  liveRate: number | null,
): number | null {
  if (isSettledCustomerCategory(category)) {
    return lockedRate != null && lockedRate > 0 ? lockedRate : null;
  }
  return liveRate != null && liveRate > 0 ? liveRate : null;
}

export function customerExpressLedgerCategory(item: {
  paymentLabel?: string | null;
  paymentStatus?: string | null;
  customerSigned?: boolean;
}): string {
  if (item.paymentLabel === '预付' || item.paymentStatus === '已付款') return 'order_prepaid';
  if (item.customerSigned || item.paymentStatus === '已收款') return 'order_collected';
  return 'order_income_cod';
}

/** 客户账人民币：已收优先用实收 CNY，否则按锁定/活汇率折算；旧单无锁为 null。 */
export function resolveCustomerFeeCny(params: {
  category: string;
  mmk?: number | null;
  lockedRate?: number | null;
  paidCny?: number | null;
  liveRate: number | null;
}): number | null {
  if (
    isSettledCustomerCategory(params.category) &&
    params.paidCny != null &&
    Number.isFinite(params.paidCny) &&
    params.paidCny > 0
  ) {
    return params.paidCny;
  }
  const mmk = Number(params.mmk);
  if (!Number.isFinite(mmk)) return null;
  return mmkToCny(
    mmk,
    displayRateForCustomerCategory(params.category, params.lockedRate, params.liveRate),
  );
}

export function buildCrossBorderFxSetting(
  rate: number,
  updatedBy = 'admin-dashboard',
): {
  category: 'pricing';
  settings_key: string;
  settings_value: number;
  description: string;
  updated_by: string;
} {
  return {
    category: 'pricing',
    settings_key: CROSS_BORDER_FX_SETTINGS_KEY,
    settings_value: rate,
    description: '1 CNY = this many MMK (cross-border quote FX)',
    updated_by: updatedBy || 'admin-dashboard',
  };
}

export function parseCrossBorderFxHistory(raw: unknown): CrossBorderFxHistoryEntry[] {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && 'entries' in value) {
    value = (value as { entries: unknown }).entries;
  }
  if (!Array.isArray(value)) return [];

  const entries: CrossBorderFxHistoryEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const to = parseMmkPerCnyRate(rec.to);
    if (to == null) continue;
    const at = typeof rec.at === 'string' ? rec.at.trim() : '';
    if (!at) continue;
    const from =
      rec.from == null || rec.from === '' ? null : parseMmkPerCnyRate(rec.from);
    const by = typeof rec.by === 'string' && rec.by.trim() ? rec.by.trim() : '—';
    entries.push({ at, by, from, to });
  }
  entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return entries;
}

export function appendCrossBorderFxHistory(
  existing: CrossBorderFxHistoryEntry[],
  entry: CrossBorderFxHistoryEntry,
  limit = CROSS_BORDER_FX_HISTORY_LIMIT,
): CrossBorderFxHistoryEntry[] {
  return [entry, ...existing.filter((row) => row.at !== entry.at)].slice(0, limit);
}

export function buildCrossBorderFxHistorySetting(
  entries: CrossBorderFxHistoryEntry[],
  updatedBy = 'admin-dashboard',
): {
  category: 'pricing';
  settings_key: string;
  settings_value: CrossBorderFxHistoryEntry[];
  description: string;
  updated_by: string;
} {
  return {
    category: 'pricing',
    settings_key: CROSS_BORDER_FX_HISTORY_SETTINGS_KEY,
    settings_value: entries,
    description: 'Cross-border FX change history',
    updated_by: updatedBy || 'admin-dashboard',
  };
}
