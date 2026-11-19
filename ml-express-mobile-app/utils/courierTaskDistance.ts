import { isNavigateMerchantFirstPhase, normalizePackageStatusZh } from './packageStatusNormalize';

export type GeoPoint = { lat: number; lng: number };

type TaskPointSource = {
  status?: string | null;
  sender_address?: string | null;
  sender_latitude?: number | string | null;
  sender_longitude?: number | string | null;
  receiver_address?: string | null;
  receiver_latitude?: number | string | null;
  receiver_longitude?: number | string | null;
};

function finitePoint(latRaw: unknown, lngRaw: unknown): GeoPoint | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return null;
  return { lat, lng };
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dp = ((b.lat - a.lat) * Math.PI) / 180;
  const dl = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function courierTaskPoint(pkg: TaskPointSource): GeoPoint | null {
  const merchantFirst = isNavigateMerchantFirstPhase(normalizePackageStatusZh(pkg.status));
  const sender = finitePoint(pkg.sender_latitude, pkg.sender_longitude);
  const receiver = finitePoint(pkg.receiver_latitude, pkg.receiver_longitude);
  if (merchantFirst && sender) return sender;
  if (receiver) return receiver;
  return sender;
}

export function formatCourierDistance(meters: number, language: string): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) {
    const rounded = Math.max(1, Math.round(meters));
    return language === 'my' ? `${rounded} m` : `${rounded} 米`;
  }
  const km = meters / 1000;
  const text = km >= 10 ? km.toFixed(0) : km.toFixed(1);
  return `${text} km`;
}

export function sortCourierTasksByDistance<T extends TaskPointSource>(
  tasks: T[],
  origin: GeoPoint | null,
): T[] {
  if (!origin) return tasks;
  return tasks
    .map((task, index) => {
      const point = courierTaskPoint(task);
      const meters = point ? haversineMeters(origin, point) : Number.POSITIVE_INFINITY;
      return { task, index, meters };
    })
    .sort((a, b) => a.meters - b.meters || a.index - b.index)
    .map((row) => row.task);
}

export type CourierTaskFilter = 'all' | 'today' | 'pickup' | 'delivering';

function isSameLocalDay(raw?: string | null, now = new Date()): boolean {
  if (!raw) return false;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function matchesCourierTaskFilter(
  task: TaskPointSource & { delivery_time?: string | null; pickup_time?: string | null; created_at?: string | null },
  filter: CourierTaskFilter,
  now = new Date(),
): boolean {
  const status = normalizePackageStatusZh(task.status);
  if (filter === 'pickup') return ['待取件', '待收款', '打包中', '待确认'].includes(status);
  if (filter === 'delivering') return ['已取件', '配送中', '异常上报'].includes(status);
  if (filter === 'today') {
    return (
      isSameLocalDay(task.delivery_time, now) ||
      isSameLocalDay(task.pickup_time, now) ||
      isSameLocalDay(task.created_at, now)
    );
  }
  return true;
}
