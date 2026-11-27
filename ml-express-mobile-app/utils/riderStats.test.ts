import { describe, expect, it } from 'vitest';
import { formatYangonStamp, yangonDayKey } from './yangonTime';
import { buildRiderStats } from './riderStats';

describe('yangon time', () => {
  it('formats the UTC stamp from the history screen as Yangon local time', () => {
    expect(formatYangonStamp('2026-11-27T14:55:57.861Z', new Date('2026-11-27T15:11:00.000Z'))).toBe('11-27 21:25');
    expect(yangonDayKey('2026-11-27T18:00:00.000Z')).toBe('2026-11-28');
  });
});

describe('buildRiderStats', () => {
  const now = new Date('2026-11-27T15:11:00.000Z');

  it('does not invent a rating or a 25 minute trip', () => {
    const stats = buildRiderStats([
      {
        status: '已送达',
        pickup_time: null,
        delivery_time: '2026-11-27T14:55:57.861Z',
        customer_rating: null,
      },
    ], now);
    expect(stats.delivered).toBe(1);
    expect(stats.today).toBe(1);
    expect(stats.rating).toBeNull();
    expect(stats.avgMinutes).toBeNull();
    expect(stats.failed).toBe(0);
  });

  it('counts completion without in-progress orders and uses pickup-to-delivery time', () => {
    const stats = buildRiderStats([
      {
        status: '配送中',
        delivery_time: null,
      },
      {
        status: '已取消',
        delivery_time: '2026-11-27T10:00:00.000Z',
      },
      {
        status: '已送达',
        pickup_time: '2026-11-27T14:30:00.000Z',
        delivery_time: '2026-11-27T14:55:00.000Z',
        customer_rating: 4,
      },
    ], now);
    expect(stats.active).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.delivered).toBe(1);
    expect(stats.avgMinutes).toBe(25);
    expect(stats.rating).toBe(4);
    expect(Math.round((stats.delivered / (stats.delivered + stats.failed)) * 100)).toBe(50);
  });
});
