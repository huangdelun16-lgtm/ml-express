import {
  clearDrivingRouteCache,
  drivingRouteCacheKey,
  fetchDrivingRoute,
  normalizeDrivingTimings,
} from './googleDrivingDirections';

describe('googleDrivingDirections helpers', () => {
  afterEach(() => {
    clearDrivingRouteCache();
  });

  it('rounds cache keys so nearby GPS pings share one Directions call', () => {
    const a = drivingRouteCacheKey({ lat: 21.96001, lng: 96.09001 }, { lat: 21.97, lng: 96.1 });
    const b = drivingRouteCacheKey({ lat: 21.96004, lng: 96.09004 }, { lat: 21.97, lng: 96.1 });
    expect(a).toBe(b);
  });

  it('replaces implausible Google ETAs with urban motorcycle estimate', () => {
    const seconds = normalizeDrivingTimings(1400, 3600);
    expect(seconds).toBeLessThan(600);
    expect(seconds).toBeGreaterThan(60);
  });

  it('returns null in Node when Maps JS is not loaded', async () => {
    await expect(
      fetchDrivingRoute({ lat: 21.96, lng: 96.09 }, { lat: 21.97, lng: 96.1 }),
    ).resolves.toBeNull();
  });
});
