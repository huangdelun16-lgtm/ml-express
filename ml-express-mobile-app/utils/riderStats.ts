import { ACTIVE_PACKAGE_STATUSES } from '../constants/packageStatus';
import { yangonDayKey } from './yangonTime';

const DONE = new Set(['已送达', '已完成', 'Delivered']);
const CLOSED_FAIL = new Set(['已取消', '配送失败', 'Cancelled']);
const ACTIVE = new Set<string>([...ACTIVE_PACKAGE_STATUSES, '配送进行中']);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TRIP_MINUTES = 12 * 60;

export type RiderStatRow = {
  status?: string | null;
  pickup_time?: string | null;
  delivery_time?: string | null;
  customer_rating?: number | null;
};

export type RiderStats = {
  today: number;
  week: number;
  month: number;
  delivered: number;
  failed: number;
  active: number;
  rating: number | null;
  ratingCount: number;
  avgMinutes: number | null;
};

export const EMPTY_RIDER_STATS: RiderStats = {
  today: 0,
  week: 0,
  month: 0,
  delivered: 0,
  failed: 0,
  active: 0,
  rating: null,
  ratingCount: 0,
  avgMinutes: null,
};

function deliveryMs(row: RiderStatRow): number {
  const t = new Date(row.delivery_time || '').getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** 今日按仰光日历日。耗时只取「取件到送达」，没有取件时间就不拿下单时间冒充。 */
export function buildRiderStats(rows: RiderStatRow[], now = new Date()): RiderStats {
  const todayKey = yangonDayKey(now);
  const weekAgo = now.getTime() - WEEK_MS;
  const monthAgo = now.getTime() - MONTH_MS;
  const stats: RiderStats = { ...EMPTY_RIDER_STATS };
  const durations: number[] = [];
  let ratingSum = 0;

  rows.forEach((row) => {
    const status = row.status || '';
    if (ACTIVE.has(status)) stats.active += 1;
    if (CLOSED_FAIL.has(status)) stats.failed += 1;
    if (!DONE.has(status)) return;

    stats.delivered += 1;
    const deliveredAt = deliveryMs(row);
    if (yangonDayKey(row.delivery_time) === todayKey) stats.today += 1;
    if (deliveredAt >= weekAgo) stats.week += 1;
    if (deliveredAt >= monthAgo) stats.month += 1;

    const start = new Date(row.pickup_time || '').getTime();
    if (deliveredAt > start && !Number.isNaN(start)) {
      const minutes = (deliveredAt - start) / 60000;
      if (minutes > 0 && minutes < MAX_TRIP_MINUTES) durations.push(minutes);
    }

    const rating = Number(row.customer_rating);
    if (Number.isFinite(rating) && rating > 0) {
      ratingSum += rating;
      stats.ratingCount += 1;
    }
  });

  if (durations.length > 0) {
    stats.avgMinutes = durations.reduce((sum, minutes) => sum + minutes, 0) / durations.length;
  }
  if (stats.ratingCount > 0) stats.rating = ratingSum / stats.ratingCount;
  return stats;
}
