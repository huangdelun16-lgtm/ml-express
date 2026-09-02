import {
  MERCHANT_RIDER_APPROACH_M,
  MERCHANT_RIDER_NEAR_M,
  bandForDistanceMeters,
  isFreshCourierLocation,
  merchantRiderApproachAlertKind,
  merchantRiderApproachKey,
  pickMerchantRiderApproach,
} from '../services/_shared/merchantRiderApproach';

const STORE = { lat: 21.9588, lng: 96.0891 };

function offsetMeters(lat: number, lng: number, northM: number) {
  return { lat: lat + northM / 111320, lng };
}

describe('merchantRiderApproach', () => {
  it('bands 120 as near and 300 as approach', () => {
    expect(bandForDistanceMeters(80)).toBe('near');
    expect(bandForDistanceMeters(MERCHANT_RIDER_NEAR_M)).toBe('near');
    expect(bandForDistanceMeters(200)).toBe('approach');
    expect(bandForDistanceMeters(MERCHANT_RIDER_APPROACH_M)).toBe('approach');
    expect(bandForDistanceMeters(400)).toBeNull();
  });

  it('alerts on entering 300m then 120m, not when backing out', () => {
    expect(merchantRiderApproachAlertKind(null, 'approach')).toBe('approach');
    expect(merchantRiderApproachAlertKind('approach', 'near')).toBe('near');
    expect(merchantRiderApproachAlertKind(null, 'near')).toBe('near');
    expect(merchantRiderApproachAlertKind('near', 'approach')).toBeNull();
    expect(merchantRiderApproachAlertKind('approach', 'approach')).toBeNull();
    expect(merchantRiderApproachAlertKind('near', null)).toBeNull();
  });

  it('picks a rider within 120m for 待取件', () => {
    const near = offsetMeters(STORE.lat, STORE.lng, 80);
    const hit = pickMerchantRiderApproach(STORE.lat, STORE.lng, [
      {
        packageId: 'PKG-A',
        status: '待取件',
        courierName: 'Ko Ko',
        courierLat: near.lat,
        courierLng: near.lng,
      },
    ]);
    expect(hit?.packageId).toBe('PKG-A');
    expect(hit?.band).toBe('near');
    expect(merchantRiderApproachKey(hit)).toBe('PKG-A:near');
  });

  it('uses 300m band when farther than 120m', () => {
    const mid = offsetMeters(STORE.lat, STORE.lng, 220);
    const hit = pickMerchantRiderApproach(STORE.lat, STORE.lng, [
      {
        packageId: 'PKG-B',
        status: '打包中',
        courierName: 'Aung',
        courierLat: mid.lat,
        courierLng: mid.lng,
      },
    ]);
    expect(hit?.band).toBe('approach');
    expect(hit!.distanceMeters).toBeGreaterThan(MERCHANT_RIDER_NEAR_M);
    expect(hit!.distanceMeters).toBeLessThanOrEqual(MERCHANT_RIDER_APPROACH_M);
  });

  it('ignores 已取件 and 0,0 coords', () => {
    const near = offsetMeters(STORE.lat, STORE.lng, 50);
    expect(
      pickMerchantRiderApproach(STORE.lat, STORE.lng, [
        {
          packageId: 'GONE',
          status: '已取件',
          courierName: 'Ko Ko',
          courierLat: near.lat,
          courierLng: near.lng,
        },
        {
          packageId: 'BAD',
          status: '待取件',
          courierName: 'X',
          courierLat: 0,
          courierLng: 0,
        },
      ]),
    ).toBeNull();
  });

  it('prefers 待取件 when two riders are similarly close', () => {
    const a = offsetMeters(STORE.lat, STORE.lng, 90);
    const b = offsetMeters(STORE.lat, STORE.lng, 92);
    const hit = pickMerchantRiderApproach(STORE.lat, STORE.lng, [
      {
        packageId: 'PACK',
        status: '打包中',
        courierName: 'A',
        courierLat: a.lat,
        courierLng: a.lng,
      },
      {
        packageId: 'READY',
        status: '待取件',
        courierName: 'B',
        courierLat: b.lat,
        courierLng: b.lng,
      },
    ]);
    expect(hit?.packageId).toBe('READY');
  });

  it('treats courier GPS older than 10 minutes as stale', () => {
    const now = Date.parse('2026-09-01T12:00:00.000Z');
    expect(isFreshCourierLocation(null, now)).toBe(true);
    expect(isFreshCourierLocation('2026-09-01T11:51:00.000Z', now)).toBe(true);
    expect(isFreshCourierLocation('2026-09-01T11:49:00.000Z', now)).toBe(false);
  });
});
