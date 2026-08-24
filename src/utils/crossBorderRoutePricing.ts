import type { SystemSetting } from '../services/supabase';
import { parsePricingSettingValue } from '../services/_shared/pricing';

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

export function buildRouteMatrixPayload(
  matrix: RouteMatrixValues,
  customerCode?: string | null,
  options?: { destinations?: string[] },
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
      const key = buildRoutePerKgSettingsKey(origin.code, dest.code, customer || null);
      if (!key) continue;
      payload.push({
        category: 'pricing',
        settings_key: key,
        settings_value: numeric,
        description: `${customerPrefix}${origin.display} → ${dest.display} cross-border per kg (MMK)`,
        updated_by: 'admin-dashboard',
      });
    }
  }
  return payload;
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
