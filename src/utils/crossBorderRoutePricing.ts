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
): string | null {
  const from = normalizeRouteHubCode(origin);
  const to = normalizeRouteHubCode(destination);
  if (!from || !to || from === to) return null;
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

export function mergeRouteMatrixFromDb(incoming: SystemSetting[]): RouteMatrixValues {
  const matrix = emptyRouteMatrix();
  incoming.forEach((setting) => {
    const parts = setting.settings_key.split('.');
    if (
      parts.length !== 6 ||
      parts[0] !== 'pricing' ||
      parts[1] !== 'cross_border' ||
      parts[2] !== 'route' ||
      parts[5] !== 'per_kg'
    ) {
      return;
    }
    const origin = normalizeRouteHubCode(parts[3]);
    const dest = normalizeRouteHubCode(parts[4]);
    if (!origin || !dest || origin === dest) return;
    const numeric = parsePricingSettingValue(setting.settings_value);
    if (!Number.isFinite(numeric)) return;
    matrix[origin][dest] = String(numeric);
  });
  return matrix;
}

export function buildRouteMatrixPayload(matrix: RouteMatrixValues): Array<Omit<SystemSetting, 'id'>> {
  const payload: Array<Omit<SystemSetting, 'id'>> = [];
  for (const origin of CROSS_BORDER_ROUTE_HUBS) {
    for (const dest of CROSS_BORDER_ROUTE_HUBS) {
      if (origin.code === dest.code) continue;
      const raw = matrix[origin.code]?.[dest.code] ?? '';
      const trimmed = String(raw).trim();
      if (!trimmed) continue;
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric) || numeric < 0) continue;
      const key = buildRoutePerKgSettingsKey(origin.code, dest.code);
      if (!key) continue;
      payload.push({
        category: 'pricing',
        settings_key: key,
        settings_value: numeric,
        description: `${origin.display} → ${dest.display} cross-border per kg (MMK)`,
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
