export type TrackingCityPoint = { lat: number; lng: number };

function cityKeyFromRegion(region?: string | null): string | null {
  const value = String(region || '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'maymyo') return 'pyinoolwin';
  return value;
}

/** 店铺编码前缀 → 实时跟踪城市 key。木姐同时认 MSE 和 MUSE。 */
const STORE_CODE_PREFIXES: Array<{ prefix: string; city: string }> = [
  { prefix: 'MUSE', city: 'muse' },
  { prefix: 'MDY', city: 'mandalay' },
  { prefix: 'POL', city: 'pyinoolwin' },
  { prefix: 'YGN', city: 'yangon' },
  { prefix: 'NPW', city: 'naypyidaw' },
  { prefix: 'TGI', city: 'taunggyi' },
  { prefix: 'LSO', city: 'lashio' },
  { prefix: 'MSE', city: 'muse' },
];

const CITY_MATCH_KM = 50;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function cityFromStoreCode(storeCode?: string | null): string | null {
  const code = String(storeCode || '').trim().toUpperCase();
  if (!code) return null;
  const hit = STORE_CODE_PREFIXES.find((item) => code.startsWith(item.prefix));
  return hit ? hit.city : null;
}

export function nearestTrackingCity(
  lat: number,
  lng: number,
  cities: Record<string, TrackingCityPoint>,
  maxKm = CITY_MATCH_KM,
): string | null {
  let closest: string | null = null;
  let minKm = Infinity;
  for (const [cityKey, city] of Object.entries(cities)) {
    const km = haversineKm(lat, lng, city.lat, city.lng);
    if (km < minKm) {
      minKm = km;
      closest = cityKey;
    }
  }
  return closest != null && minKm <= maxKm ? closest : null;
}

export function trackingCityOfStore(
  store: {
    store_code?: string | null;
    region?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  },
  cities: Record<string, TrackingCityPoint>,
): string | null {
  const fromCode = cityFromStoreCode(store.store_code);
  if (fromCode) return fromCode;
  const fromRegion = cityKeyFromRegion(store.region);
  if (fromRegion && Object.prototype.hasOwnProperty.call(cities, fromRegion)) return fromRegion;
  const lat = Number(store.latitude);
  const lng = Number(store.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return nearestTrackingCity(lat, lng, cities);
}

export function storeMatchesTrackingCity(
  store: {
    store_code?: string | null;
    region?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  },
  cityKey: string,
  cities: Record<string, TrackingCityPoint>,
): boolean {
  return trackingCityOfStore(store, cities) === cityKey;
}
