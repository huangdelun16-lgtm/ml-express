import { describe, expect, it } from 'vitest';
import { haversineMeters, isValidLatLng, formatCoordFallback, formatGeocodedPlace } from './geoDistance';

describe('haversineMeters', () => {
  it('is ~0 for the same point', () => {
    const p = { latitude: 21.9588, longitude: 96.0891 };
    expect(haversineMeters(p, p)).toBeLessThan(1);
  });

  it('treats 1500m as inside the nearby radius for a ~1.2km offset', () => {
    const origin = { latitude: 21.9588, longitude: 96.0891 };
    const nearby = { latitude: 21.9688, longitude: 96.0891 };
    const meters = haversineMeters(origin, nearby);
    expect(meters).toBeGreaterThan(1000);
    expect(meters).toBeLessThan(1500);
  });
});

describe('isValidLatLng', () => {
  it('rejects missing or 0,0 placeholders', () => {
    expect(isValidLatLng({ latitude: 0, longitude: 0 })).toBe(false);
    expect(isValidLatLng({ latitude: '21.9', longitude: '96.1' })).toBe(true);
  });
});

describe('formatGeocodedPlace', () => {
  it('joins unique address parts', () => {
    expect(
      formatGeocodedPlace({
        name: '71st',
        street: '71st Street',
        district: 'Chanayethazan',
        city: 'Mandalay',
        region: 'Mandalay',
      }),
    ).toContain('Mandalay');
  });
});

describe('formatCoordFallback', () => {
  it('prints 5 decimal places', () => {
    expect(formatCoordFallback({ latitude: 21.9588123, longitude: 96.0891456 })).toBe('21.95881, 96.08915');
  });
});
