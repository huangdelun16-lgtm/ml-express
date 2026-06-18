/** 与 Inventory App destinationOptions / truckRouteFee 一致 */
export const INVENTORY_HUB_CODES = ['MSE', 'LSO', 'POL', 'MDY', 'YGN', 'TGI'] as const;

export type InventoryTruckRoutePair = { origin: string; destination: string };

/** 跨境常用装车路线（App 发站码可能是 MUSE 或 MSE） */
export const DEFAULT_INVENTORY_TRUCK_ROUTES: InventoryTruckRoutePair[] = [
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
