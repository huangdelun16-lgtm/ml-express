export function formatTrackDate(dateString?: string) {
  if (!dateString) return '--';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatHm(dateString?: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function calculateEtaMinutes(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  const avgSpeed = 25;
  const timeInHours = distance / avgSpeed;
  const timeInMinutes = Math.round(timeInHours * 60) + 5;
  return Math.max(2, timeInMinutes);
}

export type CourierLatLng = { latitude: number; longitude: number };

export function toCourierLatLng(row: { latitude?: unknown; longitude?: unknown } | null | undefined): CourierLatLng | null {
  if (!row) return null;
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/** ~8m — skip GPS jitter so the map does not re-render every poll */
export function sameLatLng(
  a: CourierLatLng | null | undefined,
  b: CourierLatLng | null | undefined,
  epsilon = 0.00008,
): boolean {
  if (!a || !b) return false;
  return Math.abs(a.latitude - b.latitude) < epsilon && Math.abs(a.longitude - b.longitude) < epsilon;
}

export function collectTrackingCoordinates(order: {
  sender_latitude?: number | string | null;
  sender_longitude?: number | string | null;
  receiver_latitude?: number | string | null;
  receiver_longitude?: number | string | null;
} | null | undefined, rider?: CourierLatLng | null): CourierLatLng[] {
  const points: CourierLatLng[] = [];
  const push = (lat?: number | string | null, lng?: number | string | null) => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (latitude === 0 && longitude === 0) return;
    points.push({ latitude, longitude });
  };
  push(order?.sender_latitude, order?.sender_longitude);
  push(order?.receiver_latitude, order?.receiver_longitude);
  if (rider) push(rider.latitude, rider.longitude);
  return points;
}
