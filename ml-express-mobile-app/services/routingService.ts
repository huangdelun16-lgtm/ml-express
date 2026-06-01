import Constants from 'expo-constants';
import { decodeEncodedPolyline } from '../utils/polylineDecode';

export type RouteCoordinate = { latitude: number; longitude: number };

export type ComputedRoute = {
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  durationInTrafficSeconds?: number;
  /** 是否来自 Google 道路路线（false 表示直线回退） */
  fromRoadNetwork: boolean;
};

function getGoogleMapsApiKey(): string {
  return (
    Constants.expoConfig?.extra?.googleMapsApiKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''
  );
}

function toLatLng(point: RouteCoordinate): string {
  return `${point.latitude},${point.longitude}`;
}

/** 缅甸城区配送/摩托平均时速（km/h） */
const URBAN_DELIVERY_SPEED_KMH = 28;

function estimateDurationFromDistance(distanceMeters: number): number {
  if (distanceMeters <= 0) return 60;
  return Math.max(
    60,
    Math.round((distanceMeters / 1000 / URBAN_DELIVERY_SPEED_KMH) * 3600),
  );
}

function impliedSpeedKmh(distanceMeters: number, durationSeconds: number): number {
  if (durationSeconds <= 0 || distanceMeters <= 0) return 0;
  return (distanceMeters / 1000) / (durationSeconds / 3600);
}

/** 过滤 Google 返回的异常 ETA（如 1.4km 却显示 1 小时） */
function isDurationPlausible(distanceMeters: number, durationSeconds: number): boolean {
  if (durationSeconds <= 0) return false;
  if (distanceMeters <= 0) return durationSeconds < 86400;
  const speed = impliedSpeedKmh(distanceMeters, durationSeconds);
  const maxAllowed = estimateDurationFromDistance(distanceMeters) * 3;
  return speed >= 5 && speed <= 80 && durationSeconds <= maxAllowed;
}

function normalizeRouteTimings(
  distanceMeters: number,
  durationSeconds: number,
  durationInTrafficSeconds?: number,
): { durationSeconds: number; durationInTrafficSeconds?: number } {
  let base = durationSeconds;
  if (!isDurationPlausible(distanceMeters, base)) {
    base = estimateDurationFromDistance(distanceMeters);
  }

  if (!durationInTrafficSeconds || durationInTrafficSeconds <= 0) {
    return { durationSeconds: base };
  }

  if (
    !isDurationPlausible(distanceMeters, durationInTrafficSeconds) ||
    durationInTrafficSeconds > base * 2.5
  ) {
    return { durationSeconds: base };
  }

  return { durationSeconds: base, durationInTrafficSeconds };
}

/** 用于 UI 展示的 ETA（秒），已做合理性校验 */
export function pickRouteEtaSeconds(route: {
  distanceMeters: number;
  durationSeconds: number;
  durationInTrafficSeconds?: number;
}): number {
  const normalized = normalizeRouteTimings(
    route.distanceMeters,
    route.durationSeconds,
    route.durationInTrafficSeconds,
  );
  return normalized.durationInTrafficSeconds ?? normalized.durationSeconds;
}

function straightLineFallback(
  origin: RouteCoordinate,
  stops: RouteCoordinate[],
): ComputedRoute {
  const coordinates = [origin, ...stops];
  let distanceMeters = 0;
  let prev = origin;
  for (const stop of stops) {
    distanceMeters += haversineMeters(prev, stop);
    prev = stop;
  }
  const durationSeconds = estimateDurationFromDistance(distanceMeters);
  return {
    coordinates,
    distanceMeters,
    durationSeconds,
    fromRoadNetwork: false,
  };
}

function haversineMeters(a: RouteCoordinate, b: RouteCoordinate): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function sumLegDurations(legs: Array<{ duration?: { value?: number }; duration_in_traffic?: { value?: number } }>) {
  let durationSeconds = 0;
  let durationInTrafficSeconds = 0;
  let hasTraffic = false;
  for (const leg of legs) {
    durationSeconds += leg.duration?.value || 0;
    if (leg.duration_in_traffic?.value) {
      durationInTrafficSeconds += leg.duration_in_traffic.value;
      hasTraffic = true;
    } else {
      durationInTrafficSeconds += leg.duration?.value || 0;
    }
  }
  return {
    durationSeconds,
    durationInTrafficSeconds: hasTraffic ? durationInTrafficSeconds : undefined,
  };
}

/**
 * 计算驾车路线（优先 Google Directions，含实时路况 ETA；失败时回退直线）
 */
export async function computeDrivingRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  intermediates: RouteCoordinate[] = [],
): Promise<ComputedRoute> {
  const allStops = [...intermediates, destination];
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return straightLineFallback(origin, allStops);
  }

  try {
    const params = new URLSearchParams({
      origin: toLatLng(origin),
      destination: toLatLng(destination),
      mode: 'driving',
      departure_time: String(Math.floor(Date.now() / 1000)),
      traffic_model: 'best_guess',
      key: apiKey,
    });

    if (intermediates.length > 0) {
      params.set(
        'waypoints',
        intermediates.map((p) => toLatLng(p)).join('|'),
      );
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
    );
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.[0]) {
      console.warn('Directions API:', data.status, data.error_message);
      return straightLineFallback(origin, allStops);
    }

    const route = data.routes[0];
    const encoded = route.overview_polyline?.points as string | undefined;
    const coordinates = encoded ? decodeEncodedPolyline(encoded) : straightLineFallback(origin, allStops).coordinates;

    let distanceMeters = 0;
    const legs = route.legs || [];
    for (const leg of legs) {
      distanceMeters += leg.distance?.value || 0;
    }
    const { durationSeconds, durationInTrafficSeconds } = sumLegDurations(legs);
    const normalized = normalizeRouteTimings(
      distanceMeters,
      durationSeconds,
      durationInTrafficSeconds,
    );

    return {
      coordinates,
      distanceMeters,
      durationSeconds: normalized.durationSeconds,
      durationInTrafficSeconds: normalized.durationInTrafficSeconds,
      fromRoadNetwork: true,
    };
  } catch (error) {
    console.warn('computeDrivingRoute failed:', error);
    return straightLineFallback(origin, allStops);
  }
}

export function formatRouteDistance(meters: number, language: string): string {
  const km = meters / 1000;
  if (km < 1) {
    return language === 'zh' ? `${Math.round(meters)} 米` : `${Math.round(meters)} m`;
  }
  return language === 'zh' ? `${km.toFixed(1)} 公里` : `${km.toFixed(1)} km`;
}

export function formatRouteDuration(seconds: number, language: string): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) {
    return language === 'zh' ? `${totalMinutes} 分钟` : `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (language === 'zh') {
    return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
  }
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
