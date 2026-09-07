import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  supabase,
} from '../services/supabase';

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

export function formatMmkAmount(mmk: number): string {
  if (!Number.isFinite(mmk)) return '—';
  return Math.round(mmk).toLocaleString('en-US');
}

export function isCustomerLedgerCategory(category: string): boolean {
  return CUSTOMER_LEDGER_CATEGORIES.has(category);
}

type FxRateCache = { value: number; at: number };

const FX_RATE_CACHE_MS = 5 * 60 * 1000;
let fxRateCache: FxRateCache | null = null;

function cacheFxRate(rate: number | null): number | null {
  if (rate != null && rate > 0) {
    fxRateCache = { value: rate, at: Date.now() };
  }
  return rate;
}

async function queryFxRateViaClient(): Promise<number | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('settings_key, settings_value, updated_at')
    .eq('settings_key', CROSS_BORDER_FX_SETTINGS_KEY)
    .limit(1);
  if (error || !data?.length) return null;
  return pickMmkPerCnyRate(data);
}

/** 只用 anon key，避开店铺 JWT / maybeSingle 的 406 代理缓存 */
async function queryFxRateViaAnon(): Promise<number | null> {
  const url = getSupabaseUrl().replace(/\/$/, '');
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;
  const endpoint =
    `${url}/rest/v1/system_settings?settings_key=eq.${encodeURIComponent(CROSS_BORDER_FX_SETTINGS_KEY)}` +
    '&select=settings_key,settings_value,updated_at&limit=1';
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    },
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as unknown;
  if (Array.isArray(rows)) return pickMmkPerCnyRate(rows);
  if (rows && typeof rows === 'object') {
    return pickMmkPerCnyRate([rows as { settings_key?: string; settings_value?: unknown }]);
  }
  return null;
}

export async function fetchCrossBorderFxRate(options?: { force?: boolean }): Promise<number | null> {
  const force = Boolean(options?.force);
  if (!force && fxRateCache && Date.now() - fxRateCache.at < FX_RATE_CACHE_MS) {
    return fxRateCache.value;
  }
  if (!isSupabaseConfigured()) return null;

  let rate = await queryFxRateViaClient();
  if (rate == null) {
    try {
      rate = await queryFxRateViaAnon();
    } catch {
      rate = null;
    }
  }
  return cacheFxRate(rate);
}
