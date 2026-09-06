export const CROSS_BORDER_FX_SETTINGS_KEY = 'pricing.cross_border.fx.mmk_per_cny';

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

export function buildCrossBorderFxSetting(rate: number): {
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
    updated_by: 'admin-dashboard',
  };
}
