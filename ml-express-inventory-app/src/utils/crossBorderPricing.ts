import { isSupabaseConfigured, supabase } from '../services/supabase';
import { parseWeight } from './itemFieldFormat';

const PRICING_REGION_IDS = new Set([
  'mandalay',
  'maymyo',
  'yangon',
  'naypyidaw',
  'taunggyi',
  'lashio',
  'muse',
]);

/** 最终目的地代码 → Admin 计费规则领区 ID */
const DESTINATION_TO_PRICING_REGION: Record<string, string> = {
  MDY: 'mandalay',
  YGN: 'yangon',
  POL: 'maymyo',
  TGI: 'taunggyi',
  LSO: 'lashio',
  MSE: 'muse',
  NPW: 'naypyidaw',
};

const DEFAULT_BASE_FEE = 2000;

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

/** 根据入库「最终目的地」解析 Admin 领区（如 YGN → yangon） */
export function resolvePricingRegionFromDestination(destination: string): string {
  const code = destination.trim().toUpperCase();
  if (DESTINATION_TO_PRICING_REGION[code]) return DESTINATION_TO_PRICING_REGION[code];
  const lower = code.toLowerCase();
  if (PRICING_REGION_IDS.has(lower)) return lower;
  return 'mandalay';
}

/** 拉取指定最终目的地对应领区的「跨境起步价」 */
export async function fetchCrossBorderBaseFee(
  destination: string,
): Promise<{ baseFee: number; regionId: string; destinationCode: string; fromCloud: boolean }> {
  const destinationCode = destination.trim().toUpperCase();
  const regionId = resolvePricingRegionFromDestination(destination);
  let baseFee = DEFAULT_BASE_FEE;

  if (!isSupabaseConfigured()) {
    return { baseFee, regionId, destinationCode, fromCloud: false };
  }

  const { data, error } = await supabase
    .from('system_settings')
    .select('settings_key, settings_value')
    .like('settings_key', 'pricing.%');

  if (error || !data?.length) {
    return { baseFee, regionId, destinationCode, fromCloud: false };
  }

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

  return { baseFee, regionId, destinationCode, fromCloud: true };
}

/** 总费用 = 目的地领区跨境起步价 × 重量(kg) */
export function calculateCrossBorderTotalFee(baseFee: number, weightStr: string): number {
  const { n } = parseWeight(weightStr);
  const weightKg = Number(n) || 0;
  return Math.round(baseFee * weightKg);
}

export function formatCrossBorderFeeHint(
  destinationCode: string,
  baseFee: number,
  weightKg: number,
): string {
  return `${destinationCode} 领区跨境起步价 ${baseFee} × ${weightKg} kg`;
}
