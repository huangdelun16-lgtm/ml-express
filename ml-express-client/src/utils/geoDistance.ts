export type LatLng = {
  latitude: number;
  longitude: number;
};

export function isValidLatLng(value: { latitude?: unknown; longitude?: unknown } | null | undefined): value is LatLng {
  const latitude = Number(value?.latitude);
  const longitude = Number(value?.longitude);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function toLatLng(value: { latitude?: unknown; longitude?: unknown } | null | undefined): LatLng | null {
  if (!isValidLatLng(value)) return null;
  return { latitude: Number(value.latitude), longitude: Number(value.longitude) };
}

export function formatCoordFallback(coords: LatLng): string {
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}

export function formatGeocodedPlace(place: {
  name?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
} | null | undefined): string {
  if (!place) return '';
  const parts = [place.name, place.street, place.district, place.city || place.subregion, place.region]
    .map((part) => String(part || '').trim())
    .filter(Boolean);
  return [...new Set(parts)].join(' · ');
}

/** Great-circle distance in meters. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const earthRadiusM = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}
