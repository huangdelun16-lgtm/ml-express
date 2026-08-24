import { isSupabaseConfigured, supabase } from '../services/supabase';
import { parseWeight } from './itemFieldFormat';

const DEFAULT_PER_KG = 0;

const ROUTE_HUB_ALIASES: Record<string, string> = {
  RUI: 'RUI',
  RUILI: 'RUI',
  MSE: 'MSE',
  MUSE: 'MSE',
  LSO: 'LSO',
  LASHIO: 'LSO',
  POL: 'POL',
  MDY: 'MDY',
  MANDALAY: 'MDY',
  NPW: 'NPW',
  NAYPYIDAW: 'NPW',
  TGI: 'TGI',
  TAUNGGYI: 'TGI',
  YGN: 'YGN',
  YANGON: 'YGN',
};

const PRICING_REGION_IDS = new Set([
  'mandalay',
  'maymyo',
  'yangon',
  'naypyidaw',
  'taunggyi',
  'lashio',
  'muse',
  'ruili',
]);

/** @deprecated 旧版按终点领区映射，仅作路线单价缺失时的兜底 */
const DESTINATION_TO_PRICING_REGION: Record<string, string> = {
  MDY: 'mandalay',
  YGN: 'yangon',
  POL: 'maymyo',
  TGI: 'taunggyi',
  LSO: 'lashio',
  MSE: 'muse',
  RUI: 'ruili',
  NPW: 'naypyidaw',
};

const DEFAULT_LEGACY_BASE_FEE = 2000;

function parsePricingValue(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object' && raw !== null && 'value' in (raw as object)) {
    return parsePricingValue((raw as { value: unknown }).value);
  }
  if (typeof raw === 'string') {
    try {
      return parsePricingValue(JSON.parse(raw));
    } catch {
      return parseFloat(raw) || 0;
    }
  }
  return 0;
}

export function normalizeRouteHubCode(raw: string): string {
  const upper = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s（）()]/g, '');
  if (!upper) return '';
  if (ROUTE_HUB_ALIASES[upper]) return ROUTE_HUB_ALIASES[upper];
  const prefix = upper.replace(/[0-9]/g, '').slice(0, 3);
  if (ROUTE_HUB_ALIASES[prefix]) return ROUTE_HUB_ALIASES[prefix];
  return prefix.slice(0, 3);
}

function buildRoutePerKgSettingsKey(
  origin: string,
  destination: string,
  customerCode?: string,
): string | null {
  const from = normalizeRouteHubCode(origin);
  const to = normalizeRouteHubCode(destination);
  if (!from || !to || from === to) return null;
  const customer = String(customerCode ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (customer) {
    return `pricing.cross_border.customer.${customer}.route.${from}.${to}.per_kg`;
  }
  return `pricing.cross_border.route.${from}.${to}.per_kg`;
}

export function pickRoutePerKgFromRows(
  rows: Array<{ settings_key?: string; settings_value?: unknown }>,
  origin: string,
  destination: string,
  customerCode?: string,
): { perKg: number; usedCustomerRate: boolean } | null {
  const customerKey = customerCode
    ? buildRoutePerKgSettingsKey(origin, destination, customerCode)
    : null;
  const globalKey = buildRoutePerKgSettingsKey(origin, destination);
  const byKey = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.settings_key ?? '');
    if (!key) continue;
    const n = parsePricingValue(row.settings_value);
    if (Number.isFinite(n)) byKey.set(key, n);
  }
  if (customerKey) {
    const customerVal = byKey.get(customerKey);
    if (customerVal != null && customerVal > 0) {
      return { perKg: customerVal, usedCustomerRate: true };
    }
  }
  if (globalKey) {
    const globalVal = byKey.get(globalKey);
    if (globalVal != null && globalVal > 0) {
      return { perKg: globalVal, usedCustomerRate: false };
    }
  }
  return null;
}

function resolvePricingRegionFromDestination(destination: string): string {
  const code = destination.trim().toUpperCase();
  if (DESTINATION_TO_PRICING_REGION[code]) return DESTINATION_TO_PRICING_REGION[code];
  const lower = code.toLowerCase();
  if (PRICING_REGION_IDS.has(lower)) return lower;
  return 'mandalay';
}

async function fetchLegacyDestinationBaseFee(destination: string): Promise<number> {
  const regionId = resolvePricingRegionFromDestination(destination);
  let baseFee = DEFAULT_LEGACY_BASE_FEE;

  if (!isSupabaseConfigured()) return baseFee;

  const { data, error } = await supabase
    .from('system_settings')
    .select('settings_key, settings_value')
    .like('settings_key', 'pricing.%');

  if (error || !data?.length) return baseFee;

  data.forEach((row) => {
    const key = (row as { settings_key: string }).settings_key;
    const parts = key.split('.');
    if (parts.length === 3 && parts[1] === 'cross_border' && parts[2] === 'base_fee') {
      baseFee = parsePricingValue((row as { settings_value: unknown }).settings_value);
      return;
    }
    if (
      parts.length === 4 &&
      parts[2] === 'cross_border' &&
      parts[3] === 'base_fee' &&
      parts[1] === regionId
    ) {
      baseFee = parsePricingValue((row as { settings_value: unknown }).settings_value);
    }
  });

  return baseFee;
}

/** 拉取「发站 → 终点」路线每公斤单价；优先客户专属价，其次默认路线价，再回退旧版终点领区起步价 */
export async function fetchCrossBorderRoutePerKg(
  originHub: string,
  destination: string,
  customerCode?: string,
): Promise<{
  perKg: number;
  originCode: string;
  destinationCode: string;
  fromCloud: boolean;
  usedLegacyFallback: boolean;
  usedCustomerRate: boolean;
}> {
  const originCode = normalizeRouteHubCode(originHub);
  const destinationCode = normalizeRouteHubCode(destination);
  const normalizedCustomer = String(customerCode ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const customerKey = normalizedCustomer
    ? buildRoutePerKgSettingsKey(originCode, destinationCode, normalizedCustomer)
    : null;
  const globalKey = buildRoutePerKgSettingsKey(originCode, destinationCode);
  const keys = [customerKey, globalKey].filter((key): key is string => Boolean(key));

  if (!keys.length || !isSupabaseConfigured()) {
    const legacy = await fetchLegacyDestinationBaseFee(destinationCode);
    return {
      perKg: legacy,
      originCode,
      destinationCode,
      fromCloud: false,
      usedLegacyFallback: true,
      usedCustomerRate: false,
    };
  }

  const { data, error } = await supabase
    .from('system_settings')
    .select('settings_key, settings_value')
    .in('settings_key', keys);

  if (!error && data?.length) {
    const picked = pickRoutePerKgFromRows(data, originCode, destinationCode, normalizedCustomer);
    if (picked) {
      return {
        perKg: picked.perKg,
        originCode,
        destinationCode,
        fromCloud: true,
        usedLegacyFallback: false,
        usedCustomerRate: picked.usedCustomerRate,
      };
    }
  }

  const legacy = await fetchLegacyDestinationBaseFee(destinationCode);
  return {
    perKg: legacy,
    originCode,
    destinationCode,
    fromCloud: false,
    usedLegacyFallback: true,
    usedCustomerRate: false,
  };
}

/** @deprecated 使用 fetchCrossBorderRoutePerKg(origin, destination) */
export async function fetchCrossBorderBaseFee(
  destination: string,
): Promise<{ baseFee: number; regionId: string; destinationCode: string; fromCloud: boolean }> {
  const destinationCode = normalizeRouteHubCode(destination);
  const regionId = resolvePricingRegionFromDestination(destinationCode);
  const baseFee = await fetchLegacyDestinationBaseFee(destinationCode);
  return { baseFee, regionId, destinationCode, fromCloud: isSupabaseConfigured() };
}

/** 总费用 = 路线单价 (MMK/kg) × 重量(kg) */
export function calculateCrossBorderTotalFee(perKg: number, weightStr: string): number {
  const { n } = parseWeight(weightStr);
  const weightKg = Number(n) || 0;
  return Math.round(perKg * weightKg);
}

export function formatCrossBorderFeeHint(
  originCode: string,
  destinationCode: string,
  perKg: number,
  weightKg: number,
  usedLegacyFallback = false,
  customerCode = '',
): string {
  const origin = originCode || '—';
  const dest = destinationCode || '—';
  const customerPrefix = customerCode ? `${customerCode} · ` : '';
  if (usedLegacyFallback) {
    return `${customerPrefix}${dest} 领区兜底起步价 ${perKg} × ${weightKg} kg`;
  }
  return `${customerPrefix}${origin} → ${dest} ${perKg} MMK/kg × ${weightKg} kg`;
}
