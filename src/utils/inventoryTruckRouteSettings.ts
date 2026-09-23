/** 与 Inventory App destinationOptions / truckRouteFee 一致 */
export const INVENTORY_HUB_CODES = ['MSE', 'RUI', 'LSO', 'POL', 'MDY', 'YGN', 'TGI'] as const;

export type InventoryTruckRoutePair = { origin: string; destination: string };

/** 跨境常用装车路线（App 发站码可能是 MUSE 或 MSE） */
export const DEFAULT_INVENTORY_TRUCK_ROUTES: InventoryTruckRoutePair[] = [
  { origin: 'RUILI', destination: 'MSE' },
  { origin: 'RUI', destination: 'MSE' },
  { origin: 'RUILI', destination: 'MDY' },
  { origin: 'RUI', destination: 'MDY' },
  { origin: 'MUSE', destination: 'MDY' },
  { origin: 'MSE', destination: 'MDY' },
  { origin: 'MDY', destination: 'YGN' },
  { origin: 'MUSE', destination: 'YGN' },
  { origin: 'MSE', destination: 'YGN' },
  { origin: 'MDY', destination: 'MSE' },
  { origin: 'MDY', destination: 'LSO' },
  { origin: 'MDY', destination: 'POL' },
  { origin: 'MDY', destination: 'TGI' },
  { origin: 'LSO', destination: 'MDY' },
  { origin: 'POL', destination: 'MDY' },
  { origin: 'TGI', destination: 'MDY' },
];

export function truckFeeSettingsKey(origin: string, destination: string): string {
  return `inventory.truck_fee.${origin.trim().toUpperCase()}.${destination.trim().toUpperCase()}`;
}

export function parseTruckFeeAmount(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw.trim().replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  if (raw && typeof raw === 'object' && 'value' in (raw as object)) {
    return parseTruckFeeAmount((raw as { value: unknown }).value);
  }
  return 0;
}

export const TRUCK_FEE_KEY_PREFIX = 'inventory.truck_fee.';

export type TruckFeeHub = {
  code: string;
  aliases: string[];
  labelZh: string;
  labelEn: string;
};

/** 与 Inventory 打包目的地一致。木姐/瑞丽另写别名键，装车站码是 MUSE、RUILI 时也能读到。 */
export const TRUCK_FEE_HUBS: TruckFeeHub[] = [
  { code: 'MSE', aliases: ['MUSE'], labelZh: '木姐', labelEn: 'Muse' },
  { code: 'RUI', aliases: ['RUILI'], labelZh: '瑞丽', labelEn: 'Ruili' },
  { code: 'LSO', aliases: [], labelZh: '腊戌', labelEn: 'Lashio' },
  { code: 'POL', aliases: [], labelZh: '彬乌伦', labelEn: 'Pyin Oo Lwin' },
  { code: 'MDY', aliases: [], labelZh: '曼德勒', labelEn: 'Mandalay' },
  { code: 'YGN', aliases: [], labelZh: '仰光', labelEn: 'Yangon' },
  { code: 'TGI', aliases: [], labelZh: '东枝', labelEn: 'Taunggyi' },
];

const TRUCK_FEE_CANONICAL = new Map<string, string>(
  TRUCK_FEE_HUBS.flatMap((hub) => [
    [hub.code, hub.code] as const,
    ...hub.aliases.map((alias) => [alias, hub.code] as const),
  ]),
);

export type TruckFeeDraft = Record<string, Record<string, string>>;

export function emptyTruckFeeDraft(): TruckFeeDraft {
  const draft: TruckFeeDraft = {};
  for (const origin of TRUCK_FEE_HUBS) {
    draft[origin.code] = {};
    for (const dest of TRUCK_FEE_HUBS) {
      if (origin.code === dest.code) continue;
      draft[origin.code][dest.code] = '';
    }
  }
  return draft;
}

export function canonicalTruckHub(code: string): string {
  return TRUCK_FEE_CANONICAL.get(code.trim().toUpperCase()) || '';
}

export function truckFeeKeysForPair(origin: string, destination: string): string[] {
  const from = TRUCK_FEE_HUBS.find((hub) => hub.code === origin);
  const to = TRUCK_FEE_HUBS.find((hub) => hub.code === destination);
  if (!from || !to || from.code === to.code) return [];
  const origins = [from.code, ...from.aliases];
  const destinations = [to.code, ...to.aliases];
  const keys: string[] = [];
  for (const originCode of origins) {
    for (const destCode of destinations) {
      keys.push(truckFeeSettingsKey(originCode, destCode));
    }
  }
  return keys;
}

export function parseTruckFeeSettingsKey(
  key: string,
): { origin: string; destination: string; canonical: boolean } | null {
  const prefix = TRUCK_FEE_KEY_PREFIX;
  if (!key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  const dot = rest.indexOf('.');
  if (dot <= 0) return null;
  const originRaw = rest.slice(0, dot).trim().toUpperCase();
  const destRaw = rest.slice(dot + 1).trim().toUpperCase();
  if (!originRaw || !destRaw || destRaw.includes('.')) return null;
  const origin = canonicalTruckHub(originRaw);
  const destination = canonicalTruckHub(destRaw);
  if (!origin || !destination || origin === destination) return null;
  return { origin, destination, canonical: originRaw === origin && destRaw === destination };
}

/** 空值视为未设置；0 是有效车费。 */
export function readTruckFeeAmount(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return readTruckFeeAmount(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
    const n = Number(trimmed.replace(/[^\d.]/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  if (typeof raw === 'object' && raw && 'value' in raw) {
    return readTruckFeeAmount((raw as { value: unknown }).value);
  }
  return null;
}

function formatTruckFeeInput(amount: number): string {
  return amount % 1 === 0 ? String(amount) : String(amount);
}

export function truckFeeDraftFromSettings(
  rows: Array<{ settings_key: string; settings_value: unknown }>,
): { draft: TruckFeeDraft; keys: string[] } {
  const draft = emptyTruckFeeDraft();
  const keys: string[] = [];
  const canonicalHit = new Set<string>();
  for (const row of rows) {
    const parsed = parseTruckFeeSettingsKey(row.settings_key);
    if (!parsed) continue;
    const amount = readTruckFeeAmount(row.settings_value);
    if (amount == null) continue;
    keys.push(row.settings_key);
    const cell = `${parsed.origin}|${parsed.destination}`;
    if (canonicalHit.has(cell) && !parsed.canonical) continue;
    draft[parsed.origin][parsed.destination] = formatTruckFeeInput(amount);
    if (parsed.canonical) canonicalHit.add(cell);
  }
  return { draft, keys };
}

export function planTruckFeeSave(
  draft: TruckFeeDraft,
  existingKeys: string[],
):
  | {
      ok: true;
      upserts: Array<{ origin: string; destination: string; amount: number; keys: string[] }>;
      deleteKeys: string[];
    }
  | { ok: false; message: string; messageEn: string } {
  const upserts: Array<{ origin: string; destination: string; amount: number; keys: string[] }> = [];
  const deleteKeys = new Set<string>();
  const existing = new Set(existingKeys);

  for (const origin of TRUCK_FEE_HUBS) {
    for (const dest of TRUCK_FEE_HUBS) {
      if (origin.code === dest.code) continue;
      const raw = String(draft[origin.code]?.[dest.code] ?? '').trim();
      const keys = truckFeeKeysForPair(origin.code, dest.code);
      if (!raw) {
        if (keys.some((key) => existing.has(key))) {
          for (const key of keys) deleteKeys.add(key);
        }
        continue;
      }
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount < 0) {
        const route = `${origin.labelZh} → ${dest.labelZh}`;
        return {
          ok: false,
          message: `${route} 的车费必须是 ≥ 0 的数字。`,
          messageEn: `${origin.labelEn} → ${dest.labelEn} must be a number ≥ 0.`,
        };
      }
      upserts.push({ origin: origin.code, destination: dest.code, amount, keys });
    }
  }

  return { ok: true, upserts, deleteKeys: Array.from(deleteKeys) };
}

export function mergeTruckFeeRows(
  existing: Array<{ key: string; origin: string; destination: string; amountMmK: number }>,
): Array<{ key: string; origin: string; destination: string; amountMmK: number }> {
  const map = new Map<string, { key: string; origin: string; destination: string; amountMmK: number }>();

  for (const pair of DEFAULT_INVENTORY_TRUCK_ROUTES) {
    const key = truckFeeSettingsKey(pair.origin, pair.destination);
    map.set(key, { key, origin: pair.origin, destination: pair.destination, amountMmK: 0 });
  }

  for (const row of existing) {
    if (!row.origin || !row.destination) continue;
    const key = row.key || truckFeeSettingsKey(row.origin, row.destination);
    map.set(key, {
      key,
      origin: row.origin.toUpperCase(),
      destination: row.destination.toUpperCase(),
      amountMmK: row.amountMmK ?? 0,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    `${a.origin}${a.destination}`.localeCompare(`${b.origin}${b.destination}`),
  );
}
