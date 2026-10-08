import type { SystemSetting } from '../services/supabase';
import { parsePricingSettingValue } from '../services/_shared/pricing';
import {
  cnyToMmk,
  formatCnyInput,
  mmkToCny,
  rateInEffectAt,
  repairFxHistory,
  type CrossBorderFxHistoryEntry,
} from './crossBorderFx';

/** 跨境路线计费站点（与 Inventory App 目的地码一致，RUI=MUSE 等用 hubCode） */
export const CROSS_BORDER_ROUTE_HUBS = [
  { code: 'RUI', labelZh: '瑞丽', labelEn: 'Ruili', display: 'RUILI' },
  { code: 'MSE', labelZh: '木姐', labelEn: 'Muse', display: 'MUSE' },
  { code: 'LSO', labelZh: '腊戌', labelEn: 'Lashio', display: 'LSO' },
  { code: 'POL', labelZh: '彬乌伦', labelEn: 'Pyin Oo Lwin', display: 'POL' },
  { code: 'MDY', labelZh: '曼德勒', labelEn: 'Mandalay', display: 'MDY' },
  { code: 'NPW', labelZh: '内比都', labelEn: 'Naypyidaw', display: 'NPW' },
  { code: 'TGI', labelZh: '东枝', labelEn: 'Taunggyi', display: 'TGI' },
  { code: 'YGN', labelZh: '仰光', labelEn: 'Yangon', display: 'YGN' },
] as const;

export type CrossBorderRouteHubCode = (typeof CROSS_BORDER_ROUTE_HUBS)[number]['code'];

const ROUTE_HUB_CODES = new Set<string>(CROSS_BORDER_ROUTE_HUBS.map((h) => h.code));

const HUB_ALIASES: Record<string, CrossBorderRouteHubCode> = {
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

export type RouteMatrixValues = Record<string, Record<string, string>>;

export type PricingCustomerOption = {
  code: string;
  name: string;
};

/** 空字符串 = 默认路线价（未单独配置的客户回退用） */
export const DEFAULT_PRICING_CUSTOMER_SCOPE = '';

export function normalizeCustomerPricingCode(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** 客户编码前缀 / 送货区域 → 计费终点（MDY00000 → MDY，对应 RUILI→MDY 等进入该站的路线） */
export function destinationHubFromCustomerCode(
  customerCode: string,
  deliveryAreaCode?: string,
): CrossBorderRouteHubCode | '' {
  const area = normalizeRouteHubCode(deliveryAreaCode ?? '');
  if (area) return area;
  const code = normalizeCustomerPricingCode(customerCode);
  if (!code) return '';
  if (code.startsWith('RUILI')) return 'RUI';
  if (code.startsWith('MUSE')) return 'MSE';
  return normalizeRouteHubCode(code.slice(0, 3));
}

export function collectPricingCustomerOptions(
  registered: Array<{ customer_code?: string | null; customer_name?: string | null }>,
  summaries: Array<{ customerCode?: string | null; customerName?: string | null }>,
): PricingCustomerOption[] {
  const names = new Map<string, string>();
  for (const row of summaries) {
    const code = normalizeCustomerPricingCode(row.customerCode ?? '');
    if (!code) continue;
    if (!names.has(code)) names.set(code, '');
    const name = String(row.customerName ?? '').trim();
    if (name && name !== '—') names.set(code, name);
  }
  for (const row of registered) {
    const code = normalizeCustomerPricingCode(row.customer_code ?? '');
    if (!code) continue;
    const name = String(row.customer_name ?? '').trim();
    if (name) names.set(code, name);
    else if (!names.has(code)) names.set(code, '');
  }
  return Array.from(names.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, name]) => ({ code, name }));
}

type ParsedRoutePerKgKey = {
  customerCode: string;
  origin: CrossBorderRouteHubCode;
  dest: CrossBorderRouteHubCode;
};

export function parseRoutePerKgSettingsKey(settingsKey: string): ParsedRoutePerKgKey | null {
  const parts = String(settingsKey ?? '').split('.');
  if (parts[0] !== 'pricing' || parts[1] !== 'cross_border' || parts[parts.length - 1] !== 'per_kg') {
    return null;
  }
  if (parts.length === 6 && parts[2] === 'route') {
    const origin = normalizeRouteHubCode(parts[3]);
    const dest = normalizeRouteHubCode(parts[4]);
    if (!origin || !dest || origin === dest) return null;
    return { customerCode: '', origin, dest };
  }
  if (parts.length === 8 && parts[2] === 'customer' && parts[4] === 'route') {
    const customerCode = normalizeCustomerPricingCode(parts[3]);
    const origin = normalizeRouteHubCode(parts[5]);
    const dest = normalizeRouteHubCode(parts[6]);
    if (!customerCode || !origin || !dest || origin === dest) return null;
    return { customerCode, origin, dest };
  }
  return null;
}

export function normalizeRouteHubCode(raw: string): CrossBorderRouteHubCode | '' {
  const upper = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s（）()]/g, '');
  if (!upper) return '';
  if (HUB_ALIASES[upper]) return HUB_ALIASES[upper];
  const prefix = upper.replace(/[0-9]/g, '').slice(0, 3);
  if (HUB_ALIASES[prefix]) return HUB_ALIASES[prefix];
  if (ROUTE_HUB_CODES.has(prefix)) return prefix as CrossBorderRouteHubCode;
  return '';
}

export function routeHubDisplay(code: string, isEn = false): string {
  const normalized = normalizeRouteHubCode(code);
  const hub = CROSS_BORDER_ROUTE_HUBS.find((h) => h.code === normalized);
  if (!hub) return code.trim().toUpperCase();
  return isEn ? hub.display : hub.display;
}

export function buildRoutePerKgSettingsKey(
  origin: string,
  destination: string,
  customerCode?: string | null,
): string | null {
  const from = normalizeRouteHubCode(origin);
  const to = normalizeRouteHubCode(destination);
  if (!from || !to || from === to) return null;
  const customer = normalizeCustomerPricingCode(customerCode ?? '');
  if (customer) {
    return `pricing.cross_border.customer.${customer}.route.${from}.${to}.per_kg`;
  }
  return `pricing.cross_border.route.${from}.${to}.per_kg`;
}

/** 与 per_kg 平行的人民币单价。解析器只认最后一段是 per_kg，不会把它当成缅币。 */
export function buildRouteCnyPerKgSettingsKey(
  origin: string,
  destination: string,
  customerCode?: string | null,
): string | null {
  const mmkKey = buildRoutePerKgSettingsKey(origin, destination, customerCode);
  if (!mmkKey) return null;
  return mmkKey.replace(/\.per_kg$/, '.cny_per_kg');
}

export function emptyRouteMatrix(): RouteMatrixValues {
  const matrix: RouteMatrixValues = {};
  for (const origin of CROSS_BORDER_ROUTE_HUBS) {
    matrix[origin.code] = {};
    for (const dest of CROSS_BORDER_ROUTE_HUBS) {
      if (origin.code !== dest.code) {
        matrix[origin.code][dest.code] = '';
      }
    }
  }
  return matrix;
}

export function mergeRouteMatrixFromDb(
  incoming: SystemSetting[],
  customerCode?: string | null,
): RouteMatrixValues {
  const matrix = emptyRouteMatrix();
  const scope = normalizeCustomerPricingCode(customerCode ?? '');
  incoming.forEach((setting) => {
    const parsed = parseRoutePerKgSettingsKey(setting.settings_key);
    if (!parsed) return;
    if (parsed.customerCode !== scope) return;
    const numeric = parsePricingSettingValue(setting.settings_value);
    if (!Number.isFinite(numeric)) return;
    matrix[parsed.origin][parsed.dest] = String(numeric);
  });
  return matrix;
}

type PricingDisplaySetting = {
  settings_key?: string | null;
  settings_value?: unknown;
  updated_at?: string | null;
};

function readNonNegativeSetting(row: PricingDisplaySetting | undefined): number | null {
  if (!row) return null;
  const n = parsePricingSettingValue(row.settings_value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * 计价窗口里的格子。有人民币键就原样显示，改汇率不会改它。
 * 只有缅币的旧数据，按这条单价保存当时的汇率还原人民币，不用今天的汇率倒除。
 * 没设汇率时格子仍是缅币。
 */
export function buildPricingDisplayMatrix(input: {
  settings: PricingDisplaySetting[];
  customerCode?: string | null;
  /** false：客户还没有专属价，预览默认矩阵 */
  useCustomerRates: boolean;
  liveRate: number | null;
  history: CrossBorderFxHistoryEntry[];
}): RouteMatrixValues {
  const history = repairFxHistory(input.history);
  const matrix = emptyRouteMatrix();
  const scope = input.useCustomerRates
    ? normalizeCustomerPricingCode(input.customerCode ?? '')
    : '';
  const byKey = new Map<string, PricingDisplaySetting>();
  for (const row of input.settings) {
    const key = String(row.settings_key || '').trim();
    if (key) byKey.set(key, row);
  }

  for (const origin of CROSS_BORDER_ROUTE_HUBS) {
    for (const dest of CROSS_BORDER_ROUTE_HUBS) {
      if (origin.code === dest.code) continue;
      const mmkKey = buildRoutePerKgSettingsKey(origin.code, dest.code, scope || null);
      if (!mmkKey) continue;
      const cnyKey = mmkKey.replace(/\.per_kg$/, '.cny_per_kg');
      const cnyRow = byKey.get(cnyKey);
      const storedCny = readNonNegativeSetting(cnyRow);
      if (cnyRow && storedCny != null) {
        matrix[origin.code][dest.code] = input.liveRate
          ? formatCnyInput(storedCny)
          : String(storedCny);
        continue;
      }
      const mmkRow = byKey.get(mmkKey);
      const mmk = readNonNegativeSetting(mmkRow);
      if (mmk == null) continue;
      if (!input.liveRate) {
        matrix[origin.code][dest.code] = String(mmk);
        continue;
      }
      const savedRate = rateInEffectAt(history, null, mmkRow?.updated_at);
      const cny = mmkToCny(mmk, savedRate);
      matrix[origin.code][dest.code] = cny == null ? '' : formatCnyInput(cny);
    }
  }
  return matrix;
}

/** 汇率变更后，只重算已经有人民币键的路线缅币。没有人民币键的旧数据不动，避免把被汇率改过的数字锁死。 */
export function buildFxMmkRepricePayload(
  settings: PricingDisplaySetting[],
  nextRate: number,
  updatedBy = 'admin-dashboard',
): Array<Omit<SystemSetting, 'id'>> {
  if (!Number.isFinite(nextRate) || nextRate <= 0) return [];
  const payload: Array<Omit<SystemSetting, 'id'>> = [];
  for (const row of settings) {
    const cnyKey = String(row.settings_key || '').trim();
    if (!cnyKey.endsWith('.cny_per_kg')) continue;
    const mmkKey = cnyKey.replace(/\.cny_per_kg$/, '.per_kg');
    const parsed = parseRoutePerKgSettingsKey(mmkKey);
    if (!parsed) continue;
    const cny = readNonNegativeSetting(row);
    if (cny == null) continue;
    const mmk = cnyToMmk(cny, nextRate);
    if (mmk == null) continue;
    const origin = CROSS_BORDER_ROUTE_HUBS.find((hub) => hub.code === parsed.origin);
    const dest = CROSS_BORDER_ROUTE_HUBS.find((hub) => hub.code === parsed.dest);
    const customerPrefix = parsed.customerCode ? `${parsed.customerCode} · ` : '';
    payload.push({
      category: 'pricing',
      settings_key: mmkKey,
      settings_value: mmk,
      description: `${customerPrefix}${origin?.display ?? parsed.origin} → ${dest?.display ?? parsed.dest} cross-border per kg (MMK)`,
      updated_by: updatedBy || 'admin-dashboard',
    });
  }
  return payload;
}

export type RouteRateSetting = {
  settings_key?: string | null;
  settings_value?: unknown;
  updated_at?: string | null;
};

function routeSettingAmount(
  row: RouteRateSetting | undefined,
): { value: number; updatedAt: string | null } | null {
  if (!row) return null;
  const n = parsePricingSettingValue(row.settings_value);
  if (!Number.isFinite(n) || n < 0) return null;
  return { value: n, updatedAt: row.updated_at ?? null };
}

/**
 * 跟客户定价窗口同一个人民币单价。
 * 有人民币键就用它；旧数据按这条单价保存时的汇率还原，不用今天的汇率倒除。
 * 下面的缅币按当前汇率折算，和定价窗口格子下的数字一致。
 */
export function resolveRouteUnitQuote(input: {
  settings: RouteRateSetting[];
  origin: string;
  destination: string;
  customerCode?: string | null;
  history?: CrossBorderFxHistoryEntry[];
  liveRate: number | null;
}): { cnyPerKg: number | null; mmkPerKg: number | null } {
  const history = repairFxHistory(input.history ?? []);
  const byKey = new Map<string, RouteRateSetting>();
  for (const row of input.settings) {
    const key = String(row.settings_key || '').trim();
    if (key) byKey.set(key, row);
  }
  const customerMmkKey = buildRoutePerKgSettingsKey(
    input.origin,
    input.destination,
    input.customerCode,
  );
  const customerCnyKey = customerMmkKey
    ? customerMmkKey.replace(/\.per_kg$/, '.cny_per_kg')
    : null;
  const hasCustomer =
    Boolean(customerMmkKey && byKey.has(customerMmkKey)) ||
    Boolean(customerCnyKey && byKey.has(customerCnyKey));
  const mmkKey = hasCustomer
    ? customerMmkKey
    : buildRoutePerKgSettingsKey(input.origin, input.destination);
  if (!mmkKey) return { cnyPerKg: null, mmkPerKg: null };
  const cnyKey = mmkKey.replace(/\.per_kg$/, '.cny_per_kg');
  const storedCny = routeSettingAmount(byKey.get(cnyKey));
  const storedMmk = routeSettingAmount(byKey.get(mmkKey));
  let cny = storedCny ? storedCny.value : null;
  if (cny == null && storedMmk) {
    cny = mmkToCny(storedMmk.value, rateInEffectAt(history, null, storedMmk.updatedAt));
  }
  if (cny == null) {
    return { cnyPerKg: null, mmkPerKg: storedMmk ? storedMmk.value : null };
  }
  const locked = Number(formatCnyInput(cny));
  if (Number.isFinite(locked)) cny = locked;
  const mmkPerKg =
    input.liveRate != null ? cnyToMmk(cny, input.liveRate) : storedMmk ? storedMmk.value : null;
  return { cnyPerKg: cny, mmkPerKg };
}

/** 还没有人民币键的旧路线，按保存时的汇率写成定死的人民币。已有的人民币键不动。 */
export function buildMissingRouteCnyPayload(
  settings: RouteRateSetting[],
  history: CrossBorderFxHistoryEntry[] = [],
): Array<Omit<SystemSetting, 'id'>> {
  const keys = new Set(settings.map((row) => String(row.settings_key || '').trim()));
  const payload: Array<Omit<SystemSetting, 'id'>> = [];
  for (const row of settings) {
    const key = String(row.settings_key || '').trim();
    const parsed = parseRoutePerKgSettingsKey(key);
    if (!parsed) continue;
    const cnyKey = key.replace(/\.per_kg$/, '.cny_per_kg');
    if (keys.has(cnyKey)) continue;
    const quote = resolveRouteUnitQuote({
      settings,
      origin: parsed.origin,
      destination: parsed.dest,
      customerCode: parsed.customerCode || null,
      history,
      liveRate: null,
    });
    if (quote.cnyPerKg == null) continue;
    const origin = CROSS_BORDER_ROUTE_HUBS.find((hub) => hub.code === parsed.origin);
    const dest = CROSS_BORDER_ROUTE_HUBS.find((hub) => hub.code === parsed.dest);
    const customerPrefix = parsed.customerCode ? `${parsed.customerCode} · ` : '';
    payload.push({
      category: 'pricing',
      settings_key: cnyKey,
      settings_value: quote.cnyPerKg,
      description: `${customerPrefix}${origin?.display ?? parsed.origin} → ${dest?.display ?? parsed.dest} cross-border per kg (CNY)`,
      updated_by: 'admin-dashboard',
    });
  }
  return payload;
}

/** 未签收、没有入库报价时，费用人民币 = 定价 × 重量。 */
export function feeFromRouteUnit(
  cnyPerKg: number,
  weightKg: number,
  liveRate: number | null,
): { cny: number; mmk: number | null } {
  const cny = cnyPerKg * weightKg;
  return { cny, mmk: cnyToMmk(cny, liveRate) };
}

/** 客户专属路线价优先；没有专属价时用默认路线。显式 0 是免费，不再回退默认价。 */
export function resolveRoutePerKgMmk(
  settings: RouteRateSetting[],
  origin: string,
  destination: string,
  customerCode?: string | null,
): number | null {
  const byKey = new Map<string, unknown>();
  for (const row of settings) {
    const key = String(row.settings_key || '').trim();
    if (key) byKey.set(key, row.settings_value);
  }
  const read = (key: string | null): number | null => {
    if (!key || !byKey.has(key)) return null;
    const n = parsePricingSettingValue(byKey.get(key));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const customerKey = buildRoutePerKgSettingsKey(origin, destination, customerCode);
  if (customerKey && byKey.has(customerKey)) return read(customerKey);
  return read(buildRoutePerKgSettingsKey(origin, destination));
}

/**
 * 明细里的定价。未签收跟客户定价窗口同一个人民币，缅币按当天汇率。
 * 已签收只按该单自己的费用和重量，人民币只用签收当天锁定的汇率。
 */
export function resolveExpressItemUnitPrice(input: {
  origin: string;
  destination: string;
  customerCode?: string | null;
  settings: RouteRateSetting[];
  signed: boolean;
  weightKg: number;
  feeMmk: number;
  lockedRate: number | null;
  liveRate: number | null;
  history?: CrossBorderFxHistoryEntry[];
}): { mmkPerKg: number | null; cnyPerKg: number | null } {
  if (input.signed) {
    const mmkPerKg =
      input.weightKg > 0 && input.feeMmk > 0 ? input.feeMmk / input.weightKg : null;
    return {
      mmkPerKg,
      cnyPerKg: mmkPerKg == null ? null : mmkToCny(mmkPerKg, input.lockedRate),
    };
  }
  return resolveRouteUnitQuote({
    settings: input.settings,
    origin: input.origin,
    destination: input.destination,
    customerCode: input.customerCode,
    history: input.history,
    liveRate: input.liveRate,
  });
}

export function customerHasRoutePricing(
  incoming: SystemSetting[],
  customerCode: string,
): boolean {
  const scope = normalizeCustomerPricingCode(customerCode);
  if (!scope) return false;
  return incoming.some((setting) => {
    const parsed = parseRoutePerKgSettingsKey(setting.settings_key);
    return Boolean(parsed && parsed.customerCode === scope);
  });
}

export type RoutePricingSummary = {
  defaultRouteCount: number;
  defaultUpdatedAt: string | null;
  defaultUpdatedBy: string | null;
  customCustomerCount: number;
};

export function summarizeRoutePricing(
  settings: Array<{
    settings_key?: string | null;
    updated_at?: string | null;
    updated_by?: string | null;
  }>,
): RoutePricingSummary {
  let defaultRouteCount = 0;
  let defaultUpdatedAt: string | null = null;
  let defaultUpdatedBy: string | null = null;
  const customers = new Set<string>();

  for (const setting of settings) {
    const parsed = parseRoutePerKgSettingsKey(setting.settings_key ?? '');
    if (!parsed) continue;
    if (parsed.customerCode) {
      customers.add(parsed.customerCode);
      continue;
    }
    defaultRouteCount += 1;
    const at = setting.updated_at ?? '';
    if (at && (!defaultUpdatedAt || at > defaultUpdatedAt)) {
      defaultUpdatedAt = at;
      defaultUpdatedBy = setting.updated_by ?? null;
    }
  }

  return {
    defaultRouteCount,
    defaultUpdatedAt,
    defaultUpdatedBy,
    customCustomerCount: customers.size,
  };
}

export function buildRouteMatrixPayload(
  matrix: RouteMatrixValues,
  customerCode?: string | null,
  options?: { destinations?: string[]; unit?: 'mmk' | 'cny' },
): Array<Omit<SystemSetting, 'id'>> {
  const payload: Array<Omit<SystemSetting, 'id'>> = [];
  const customer = normalizeCustomerPricingCode(customerCode ?? '');
  const customerPrefix = customer ? `${customer} · ` : '';
  const destFilter = new Set(
    (options?.destinations ?? [])
      .map((code) => normalizeRouteHubCode(code))
      .filter((code): code is CrossBorderRouteHubCode => Boolean(code)),
  );
  for (const origin of CROSS_BORDER_ROUTE_HUBS) {
    for (const dest of CROSS_BORDER_ROUTE_HUBS) {
      if (origin.code === dest.code) continue;
      if (destFilter.size > 0 && !destFilter.has(dest.code)) continue;
      const raw = matrix[origin.code]?.[dest.code] ?? '';
      const trimmed = String(raw).trim();
      if (!trimmed) continue;
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric) || numeric < 0) continue;
      const mmkKey = buildRoutePerKgSettingsKey(origin.code, dest.code, customer || null);
      if (!mmkKey) continue;
      const storeCny = options?.unit === 'cny';
      payload.push({
        category: 'pricing',
        settings_key: storeCny ? mmkKey.replace(/\.per_kg$/, '.cny_per_kg') : mmkKey,
        settings_value: numeric,
        description: `${customerPrefix}${origin.display} → ${dest.display} cross-border per kg (${storeCny ? 'CNY' : 'MMK'})`,
        updated_by: 'admin-dashboard',
      });
    }
  }
  return payload;
}

/** 矩阵里留空的路线键。只应删除数据库里已经存在的键，避免把没配过的路线当成删除。 */
export function blankRoutePricingKeys(
  matrix: RouteMatrixValues,
  customerCode?: string | null,
  options?: { destinations?: string[] },
): string[] {
  const customer = normalizeCustomerPricingCode(customerCode ?? '');
  const destFilter = new Set(
    (options?.destinations ?? [])
      .map((code) => normalizeRouteHubCode(code))
      .filter((code): code is CrossBorderRouteHubCode => Boolean(code)),
  );
  const keys: string[] = [];
  for (const origin of CROSS_BORDER_ROUTE_HUBS) {
    for (const dest of CROSS_BORDER_ROUTE_HUBS) {
      if (origin.code === dest.code) continue;
      if (destFilter.size > 0 && !destFilter.has(dest.code)) continue;
      const trimmed = String(matrix[origin.code]?.[dest.code] ?? '').trim();
      if (trimmed) continue;
      const key = buildRoutePerKgSettingsKey(origin.code, dest.code, customer || null);
      if (key) {
        keys.push(key);
        keys.push(key.replace(/\.per_kg$/, '.cny_per_kg'));
      }
    }
  }
  return keys;
}

export function parseRouteMatrixForSave(matrix: RouteMatrixValues): {
  ok: true;
  numeric: Record<string, Record<string, number>>;
} | {
  ok: false;
  message: string;
  messageEn: string;
} {
  const numeric: Record<string, Record<string, number>> = {};
  for (const origin of CROSS_BORDER_ROUTE_HUBS) {
    numeric[origin.code] = {};
    for (const dest of CROSS_BORDER_ROUTE_HUBS) {
      if (origin.code === dest.code) continue;
      const raw = matrix[origin.code]?.[dest.code] ?? '';
      const trimmed = String(raw).trim();
      if (!trimmed) continue;
      const value = Number(trimmed);
      if (!Number.isFinite(value) || value < 0) {
        return {
          ok: false,
          message: `${origin.display} → ${dest.display} 的单价必须是 ≥ 0 的数字。`,
          messageEn: `${origin.display} → ${dest.display} must be a number ≥ 0.`,
        };
      }
      numeric[origin.code][dest.code] = value;
    }
  }
  return { ok: true, numeric };
}
