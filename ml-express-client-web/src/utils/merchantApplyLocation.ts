export type RegionHub = {
  id: string;
  lat: number;
  lng: number;
};

export type ParsedCoords =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: 'invalid' | 'out_of_range' };

/** Soft bounds covering Myanmar plus a little border slack. */
export const MYANMAR_LAT_MIN = 9.2;
export const MYANMAR_LAT_MAX = 28.8;
export const MYANMAR_LNG_MIN = 91.8;
export const MYANMAR_LNG_MAX = 101.6;

const HUB_EPSILON = 1e-4;

export function parseCoordinate(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = String(value).trim();
  if (!trimmed || !/^[+-]?\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function parseCoordinatePair(latText: string, lngText: string): ParsedCoords {
  const lat = parseCoordinate(latText);
  const lng = parseCoordinate(lngText);
  if (lat == null || lng == null) return { ok: false, reason: 'invalid' };
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, reason: 'out_of_range' };
  }
  return { ok: true, lat, lng };
}

export function isLikelyMyanmarCoord(lat: number, lng: number): boolean {
  return (
    lat >= MYANMAR_LAT_MIN &&
    lat <= MYANMAR_LAT_MAX &&
    lng >= MYANMAR_LNG_MIN &&
    lng <= MYANMAR_LNG_MAX
  );
}

export function isHubDefaultCoord(
  lat: number,
  lng: number,
  hubs: readonly RegionHub[],
): boolean {
  return hubs.some(
    (hub) => Math.abs(hub.lat - lat) < HUB_EPSILON && Math.abs(hub.lng - lng) < HUB_EPSILON,
  );
}

export function formatCoordPair(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function geocoderLanguage(lang: 'zh' | 'en' | 'my'): string {
  if (lang === 'en') return 'en';
  if (lang === 'my') return 'my';
  return 'zh-CN';
}

export function pickFormattedAddress(result: {
  formatted_address?: string;
  name?: string;
} | null | undefined): string {
  return String(result?.formatted_address || result?.name || '').trim();
}
