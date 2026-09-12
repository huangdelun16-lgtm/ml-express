import { CROSS_BORDER_HUBS, storeBelongsToCrossBorderHub } from './crossBorderHubs';

export type StationFilterStore = {
  store_code?: string | null;
  region?: string | null;
};

export function sanitizeStationKey(value: string): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

export function stationFilterKeys(store: StationFilterStore | null | undefined): string[] {
  if (!store) return [];
  const keys = new Set<string>();
  const code = sanitizeStationKey(String(store.store_code || ''));
  if (code) keys.add(code);
  const region = sanitizeStationKey(String(store.region || ''));
  if (region) keys.add(region);
  const hub = CROSS_BORDER_HUBS.find((item) =>
    storeBelongsToCrossBorderHub(
      {
        store_code: store.store_code || undefined,
        region: store.region || undefined,
      },
      item,
    ),
  );
  if (hub) {
    keys.add(sanitizeStationKey(hub.hubCode));
    keys.add(sanitizeStationKey(hub.prefix));
  }
  return Array.from(keys).filter(Boolean);
}

export function packTouchesStation(
  pack: {
    origin_store_code?: string | null;
    destination_code?: string | null;
    leg_destination_code?: string | null;
    hub_received_by_store_code?: string | null;
  },
  keys: string[],
): boolean {
  if (!keys.length) return true;
  const set = new Set(keys.map(sanitizeStationKey).filter(Boolean));
  const fields = [
    pack.origin_store_code,
    pack.destination_code,
    pack.leg_destination_code,
    pack.hub_received_by_store_code,
  ];
  return fields.some((field) => set.has(sanitizeStationKey(String(field || ''))));
}

export function orderTouchesStation(
  order: {
    destination_code?: string | null;
    hub_received_by_store_code?: string | null;
  },
  keys: string[],
): boolean {
  if (!keys.length) return true;
  const set = new Set(keys.map(sanitizeStationKey).filter(Boolean));
  return [order.destination_code, order.hub_received_by_store_code].some((field) =>
    set.has(sanitizeStationKey(String(field || ''))),
  );
}
