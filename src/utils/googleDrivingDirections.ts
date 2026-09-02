import { roundRouteCoord, type RouteLatLng } from './routePrediction';

export type DrivingRouteResult = {
  path: RouteLatLng[];
  distanceMeters: number;
  durationSeconds: number;
  fromRoadNetwork: boolean;
};

const CACHE_TTL_MS = 3 * 60 * 1000;
const URBAN_DELIVERY_SPEED_KMH = 28;

const routeCache = new Map<string, { at: number; result: DrivingRouteResult }>();

export function drivingRouteCacheKey(origin: RouteLatLng, destination: RouteLatLng): string {
  return `${roundRouteCoord(origin.lat)},${roundRouteCoord(origin.lng)}>${roundRouteCoord(destination.lat)},${roundRouteCoord(destination.lng)}`;
}

export function clearDrivingRouteCache(): void {
  routeCache.clear();
}

function estimateDurationFromDistance(distanceMeters: number): number {
  if (distanceMeters <= 0) return 60;
  return Math.max(60, Math.round((distanceMeters / 1000 / URBAN_DELIVERY_SPEED_KMH) * 3600));
}

function isDurationPlausible(distanceMeters: number, durationSeconds: number): boolean {
  if (durationSeconds <= 0) return false;
  if (distanceMeters <= 0) return durationSeconds < 86400;
  const kmh = distanceMeters / 1000 / (durationSeconds / 3600);
  const maxAllowed = estimateDurationFromDistance(distanceMeters) * 3;
  return kmh >= 5 && kmh <= 80 && durationSeconds <= maxAllowed;
}

function toLiteral(point: { lat: () => number; lng: () => number } | RouteLatLng): RouteLatLng {
  if (typeof (point as { lat: unknown }).lat === 'function') {
    const g = point as { lat: () => number; lng: () => number };
    return { lat: g.lat(), lng: g.lng() };
  }
  return point as RouteLatLng;
}

export function normalizeDrivingTimings(
  distanceMeters: number,
  durationSeconds: number,
  durationInTrafficSeconds?: number,
): number {
  let base = durationSeconds;
  if (!isDurationPlausible(distanceMeters, base)) {
    base = estimateDurationFromDistance(distanceMeters);
  }
  if (!durationInTrafficSeconds || durationInTrafficSeconds <= 0) return base;
  if (
    !isDurationPlausible(distanceMeters, durationInTrafficSeconds) ||
    durationInTrafficSeconds > base * 2.5
  ) {
    return base;
  }
  return durationInTrafficSeconds;
}

function readCache(key: string): DrivingRouteResult | null {
  const hit = routeCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    routeCache.delete(key);
    return null;
  }
  return hit.result;
}

/**
 * 用已加载的 Google Maps JS DirectionsService 要沿路折线与 ETA。
 * 失败返回 null（不编造路线）。结果按起终点约 11m 网格缓存 3 分钟。
 */
export async function fetchDrivingRoute(
  origin: RouteLatLng,
  destination: RouteLatLng,
): Promise<DrivingRouteResult | null> {
  const key = drivingRouteCacheKey(origin, destination);
  const cached = readCache(key);
  if (cached) return cached;

  const maps = typeof window !== 'undefined' ? window.google?.maps : undefined;
  if (!maps?.DirectionsService) return null;

  try {
    const service = new maps.DirectionsService();
    const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      service.route(
        {
          origin,
          destination,
          travelMode: maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: maps.TrafficModel.BEST_GUESS,
          },
        },
        (res, status) => {
          if (status === maps.DirectionsStatus.OK && res) resolve(res);
          else reject(new Error(String(status)));
        },
      );
    });

    const route = result.routes?.[0];
    const leg = route?.legs?.[0];
    if (!route || !leg) return null;

    const path = (route.overview_path || []).map((p) => toLiteral(p));
    if (path.length < 2) return null;

    const distanceMeters = Number(leg.distance?.value) || 0;
    const trafficSeconds = Number(
      (leg as google.maps.DirectionsLeg & { duration_in_traffic?: { value?: number } })
        .duration_in_traffic?.value || 0,
    );
    const durationSeconds = normalizeDrivingTimings(
      distanceMeters,
      Number(leg.duration?.value) || 0,
      trafficSeconds,
    );

    const parsed: DrivingRouteResult = {
      path,
      distanceMeters,
      durationSeconds,
      fromRoadNetwork: true,
    };
    routeCache.set(key, { at: Date.now(), result: parsed });
    return parsed;
  } catch {
    return null;
  }
}
