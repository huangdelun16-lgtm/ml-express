import { describe, expect, it } from 'vitest';
import { formatCourierDistance, sortCourierTasksByDistance } from './courierTaskDistance';

describe('courierTaskDistance', () => {
  it('puts the nearer pickup first and keeps tasks without coordinates last', () => {
    const tasks = [
      {
        status: '待取件',
        sender_latitude: 21.98,
        sender_longitude: 96.1,
        receiver_latitude: 22.2,
        receiver_longitude: 96.2,
      },
      {
        status: '待取件',
        sender_address: 'no coords',
      },
      {
        status: '待取件',
        sender_latitude: 21.96,
        sender_longitude: 96.08,
      },
    ];
    const sorted = sortCourierTasksByDistance(tasks, { lat: 21.9588, lng: 96.0895 });
    expect(sorted[0].sender_latitude).toBe(21.96);
    expect(sorted[1].sender_latitude).toBe(21.98);
    expect(sorted[2].sender_address).toBe('no coords');
  });

  it('formats meters and kilometers', () => {
    expect(formatCourierDistance(320, 'zh')).toBe('320 米');
    expect(formatCourierDistance(2400, 'en')).toBe('2.4 km');
  });
});