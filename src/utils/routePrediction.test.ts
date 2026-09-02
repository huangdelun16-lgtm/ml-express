import {
  buildRouteJobs,
  formatRouteEtaLabel,
  isFoodAndBeveragePackageType,
  isUrgentDeliverySpeed,
  nextStopForPackage,
  packageQualifiesForRoutePrediction,
  routeJobSignature,
  routePredictionReason,
} from './routePrediction';

describe('routePrediction eligibility', () => {
  it('treats 急送达 and 加急 as urgent', () => {
    expect(isUrgentDeliverySpeed('急送达')).toBe(true);
    expect(isUrgentDeliverySpeed('急送达（订单后30分钟送达）')).toBe(true);
    expect(isUrgentDeliverySpeed('加急配送')).toBe(true);
    expect(isUrgentDeliverySpeed('Urgent')).toBe(true);
    expect(isUrgentDeliverySpeed('准时达')).toBe(false);
    expect(isUrgentDeliverySpeed('Eco Way')).toBe(false);
    expect(isUrgentDeliverySpeed('定时达')).toBe(false);
  });

  it('recognizes food-and-beverage package types across labels', () => {
    expect(isFoodAndBeveragePackageType('食品和饮料')).toBe(true);
    expect(isFoodAndBeveragePackageType('食品饮料')).toBe(true);
    expect(isFoodAndBeveragePackageType('Food & Drinks')).toBe(true);
    expect(isFoodAndBeveragePackageType('标准件（45x60x15cm）和（5KG）以内')).toBe(false);
    expect(isFoodAndBeveragePackageType('易碎品')).toBe(false);
  });

  it('qualifies when either urgent or food', () => {
    expect(
      packageQualifiesForRoutePrediction({ delivery_speed: '急送达', package_type: '标准件' }),
    ).toBe(true);
    expect(
      packageQualifiesForRoutePrediction({
        delivery_speed: '准时达',
        package_type: '食品和饮料',
      }),
    ).toBe(true);
    expect(
      packageQualifiesForRoutePrediction({ delivery_speed: '准时达', package_type: '易碎品' }),
    ).toBe(false);
    expect(
      routePredictionReason({ delivery_speed: '急送达', package_type: '食品和饮料' }),
    ).toBe('both');
  });
});

describe('nextStopForPackage', () => {
  it('sends pending pickup to sender coords', () => {
    expect(
      nextStopForPackage({
        id: 'a',
        status: '待取件',
        sender_latitude: 21.9,
        sender_longitude: 96.1,
        receiver_latitude: 21.8,
        receiver_longitude: 96.2,
      }),
    ).toEqual({ lat: 21.9, lng: 96.1, kind: 'pickup' });
  });

  it('sends in-transit to receiver coords', () => {
    expect(
      nextStopForPackage({
        id: 'b',
        status: '配送中',
        sender_latitude: 21.9,
        sender_longitude: 96.1,
        receiver_latitude: 21.8,
        receiver_longitude: 96.2,
      }),
    ).toEqual({ lat: 21.8, lng: 96.2, kind: 'delivery' });
  });
});

describe('buildRouteJobs', () => {
  const rider = {
    id: 'c1',
    name: 'AUNG MOE WIN',
    latitude: 21.96,
    longitude: 96.09,
  };

  it('skips 准时达 and unassigned packages', () => {
    const jobs = buildRouteJobs({
      couriers: [rider],
      packages: [
        {
          id: 'std',
          status: '待取件',
          courier: 'AUNG MOE WIN',
          delivery_speed: '准时达',
          package_type: '易碎品',
          sender_latitude: 21.97,
          sender_longitude: 96.1,
        },
        {
          id: 'food-open',
          status: '待取件',
          courier: '待分配',
          delivery_speed: '准时达',
          package_type: '食品和饮料',
          sender_latitude: 21.97,
          sender_longitude: 96.1,
        },
      ],
    });
    expect(jobs).toEqual([]);
  });

  it('builds one job per rider, preferring pickup then nearest', () => {
    const jobs = buildRouteJobs({
      couriers: [rider],
      packages: [
        {
          id: 'far-urgent',
          status: '配送中',
          courier: 'AUNG MOE WIN',
          delivery_speed: '急送达',
          package_type: '标准件',
          receiver_latitude: 22.2,
          receiver_longitude: 96.4,
        },
        {
          id: 'near-pickup',
          status: '待取件',
          courier: 'AUNG MOE WIN',
          delivery_speed: '准时达',
          package_type: '食品和饮料',
          sender_latitude: 21.961,
          sender_longitude: 96.091,
          receiver_latitude: 22.2,
          receiver_longitude: 96.4,
        },
      ],
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].packageId).toBe('near-pickup');
    expect(jobs[0].stopKind).toBe('pickup');
    expect(jobs[0].reason).toBe('food');
  });

  it('caps jobs and keeps the selected courier', () => {
    const couriers = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      name: `Rider ${i}`,
      latitude: 21.96,
      longitude: 96.09,
    }));
    const packages = couriers.map((c, i) => ({
      id: `p${i}`,
      status: '配送中' as const,
      courier: c.name,
      delivery_speed: '急送达',
      receiver_latitude: 21.97,
      receiver_longitude: 96.1,
    }));
    const jobs = buildRouteJobs({
      couriers,
      packages,
      selectedCourierId: 'c9',
      maxJobs: 8,
    });
    expect(jobs).toHaveLength(8);
    expect(jobs[0].courierId).toBe('c9');
  });

  it('formats ETA labels', () => {
    expect(formatRouteEtaLabel({ durationSeconds: 720, distanceMeters: 3200 })).toBe(
      '约 12 分钟 · 3.2 公里',
    );
    expect(
      formatRouteEtaLabel({ durationSeconds: 40, distanceMeters: 80, fromRoadNetwork: false }),
    ).toBe('直线约 1 分钟 · 80 米');
  });

  it('keeps signature stable after tiny GPS jitter within rounding', () => {
    const job = {
      courierId: 'c1',
      courierName: 'A',
      packageId: 'p1',
      origin: { lat: 21.96001, lng: 96.09002 },
      destination: { lat: 21.97, lng: 96.1 },
      stopKind: 'pickup' as const,
      reason: 'urgent' as const,
    };
    const shifted = {
      ...job,
      origin: { lat: 21.96002, lng: 96.09003 },
    };
    expect(routeJobSignature(job)).toBe(routeJobSignature(shifted));
  });
});
