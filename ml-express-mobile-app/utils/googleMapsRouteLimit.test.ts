import { describe, expect, it } from 'vitest';
import { GOOGLE_MAPS_MAX_STOPS, splitGoogleMapsStops } from './googleMapsRouteLimit';

describe('splitGoogleMapsStops', () => {
  it('keeps all stops when within the Google Maps limit', () => {
    const stops = Array.from({ length: 10 }, (_, i) => i + 1);
    expect(splitGoogleMapsStops(stops)).toEqual({
      navigable: stops,
      remaining: [],
      truncated: false,
    });
  });

  it('navigates the first 10 stops and leaves the rest for a second trip', () => {
    const stops = Array.from({ length: 15 }, (_, i) => `S${i + 1}`);
    const result = splitGoogleMapsStops(stops);
    expect(result.truncated).toBe(true);
    expect(result.navigable).toHaveLength(GOOGLE_MAPS_MAX_STOPS);
    expect(result.navigable[0]).toBe('S1');
    expect(result.navigable[9]).toBe('S10');
    expect(result.remaining).toEqual(['S11', 'S12', 'S13', 'S14', 'S15']);
  });
});
