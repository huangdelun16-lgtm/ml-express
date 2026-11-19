import Constants from 'expo-constants';
import { decodeEncodedPolyline } from '../utils/polylineDecode';

export type RouteCoordinate = { latitude: number; longitude: number };

export type RouteStep = {
  /** 在 location 处要做的动作，例如右转、直行 */
  instruction: string;
  /** 这一步本身的道路长度 */
  distanceMeters: number;
  location: RouteCoordinate;
};

export type ComputedRoute = {
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  durationInTrafficSeconds?: number;
  /** 是否来自道路路线（false 表示直线回退） */
  fromRoadNetwork: boolean;
  steps: RouteStep[];
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
    steps: [],
  };
}

export function haversineMeters(a: RouteCoordinate, b: RouteCoordinate): number {
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

const ROAD_ROUTE_TIMEOUT_MS = 8000;
const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org/route/v1/driving/',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving/',
];

async function fetchWithTimeout(url: string, timeoutMs = ROAD_ROUTE_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function maneuverPhrase(type: string, modifier: string, street: string, language: string): string {
  const key = `${type}:${modifier}`.toLowerCase();
  const zh: Record<string, string> = {
    'depart:': '从当前位置出发',
    'arrive:': '到达目的地',
    'turn:left': '左转',
    'turn:right': '右转',
    'turn:slight left': '稍向左转',
    'turn:slight right': '稍向右转',
    'turn:sharp left': '急左转',
    'turn:sharp right': '急右转',
    'turn:uturn': '掉头',
    'turn:straight': '直行',
    'continue:': '继续直行',
    'continue:straight': '继续直行',
    'new name:straight': '继续直行',
    'new name:': '继续前行',
    'fork:left': '靠左岔路',
    'fork:right': '靠右岔路',
    'end of road:left': '路口尽头左转',
    'end of road:right': '路口尽头右转',
    'roundabout:': '进入环岛',
    'rotary:': '进入环岛',
    'merge:': '并入主路',
    'merge:left': '向左并道',
    'merge:right': '向右并道',
  };
  const en: Record<string, string> = {
    'depart:': 'Depart',
    'arrive:': 'Arrive',
    'turn:left': 'Turn left',
    'turn:right': 'Turn right',
    'turn:slight left': 'Bear left',
    'turn:slight right': 'Bear right',
    'turn:sharp left': 'Sharp left',
    'turn:sharp right': 'Sharp right',
    'turn:uturn': 'Make a U-turn',
    'turn:straight': 'Go straight',
    'continue:': 'Continue',
    'continue:straight': 'Continue straight',
    'new name:straight': 'Continue straight',
    'new name:': 'Continue',
    'fork:left': 'Keep left',
    'fork:right': 'Keep right',
    'end of road:left': 'At the end, turn left',
    'end of road:right': 'At the end, turn right',
    'roundabout:': 'Enter the roundabout',
    'rotary:': 'Enter the roundabout',
    'merge:': 'Merge',
    'merge:left': 'Merge left',
    'merge:right': 'Merge right',
  };
  const table = language === 'en' ? en : language === 'my' ? en : zh;
  const phrase = table[key] || table[`${type}:`] || (language === 'en' || language === 'my' ? 'Continue' : '继续前行');
  if (!street) return phrase;
  if (language === 'en' || language === 'my') return `${phrase} onto ${street}`;
  return `${phrase}，进入${street}`;
}

function googleRouteSteps(legs: Array<{ steps?: Array<Record<string, unknown>> }>): RouteStep[] {
  const steps: RouteStep[] = [];
  for (const leg of legs) {
    for (const step of leg.steps || []) {
      const end = step.end_location as { lat?: number; lng?: number } | undefined;
      const start = step.start_location as { lat?: number; lng?: number } | undefined;
      const point = start?.lat != null ? start : end;
      const instruction = stripHtml(String(step.html_instructions || ''));
      if (!instruction || point?.lat == null || point.lng == null) continue;
      steps.push({
        instruction,
        distanceMeters: Number((step.distance as { value?: number } | undefined)?.value) || 0,
        location: { latitude: Number(point.lat), longitude: Number(point.lng) },
      });
    }
  }
  return steps;
}

function osrmRouteSteps(
  legs: Array<{ steps?: Array<Record<string, unknown>> }>,
  language: string,
): RouteStep[] {
  const flat = legs.flatMap((leg) => leg.steps || []);
  const steps: RouteStep[] = [];
  flat.forEach((step) => {
    const maneuver = (step.maneuver || {}) as {
      type?: string;
      modifier?: string;
      location?: [number, number];
    };
    const loc = maneuver.location;
    if (!loc || loc.length < 2) return;
    const street = String(step.name || '').trim();
    steps.push({
      instruction: maneuverPhrase(String(maneuver.type || ''), String(maneuver.modifier || ''), street, language),
      distanceMeters: Number(step.distance) || 0,
      location: { latitude: loc[1], longitude: loc[0] },
    });
  });
  return steps;
}

const PASSED_MANEUVER_M = 40;

/** 下一路口：还没到的第一个转弯点，以及到那里的直线距离。 */
export function pickUpcomingStep(
  steps: RouteStep[],
  rider: RouteCoordinate | null,
): { instruction: string; remainMeters: number; imminent: boolean; totalRemainMeters: number } | null {
  if (!steps.length) return null;
  const totalFrom = (index: number, lead: number) => {
    let total = lead;
    for (let i = index; i < steps.length; i += 1) total += steps[i].distanceMeters;
    return Math.round(total);
  };
  if (!rider) {
    return {
      instruction: steps[0].instruction,
      remainMeters: Math.max(0, Math.round(steps[0].distanceMeters)),
      imminent: true,
      totalRemainMeters: totalFrom(0, 0),
    };
  }
  for (let i = 0; i < steps.length; i += 1) {
    const remain = haversineMeters(rider, steps[i].location);
    const isLast = i === steps.length - 1;
    if (remain > PASSED_MANEUVER_M || isLast) {
      return {
        instruction: steps[i].instruction,
        remainMeters: Math.max(0, Math.round(remain)),
        imminent: remain <= PASSED_MANEUVER_M,
        totalRemainMeters: totalFrom(i, remain),
      };
    }
  }
  const last = steps[steps.length - 1];
  return {
    instruction: last.instruction,
    remainMeters: 0,
    imminent: true,
    totalRemainMeters: 0,
  };
}

/** 按街道行驶的路线。谷歌 Directions 失败时用，避免画成直线。 */
async function osrmDrivingRoute(
  origin: RouteCoordinate,
  stops: RouteCoordinate[],
  language: string,
): Promise<ComputedRoute | null> {
  const path = [origin, ...stops]
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(';');
  const query = `${encodeURI(path)}?overview=full&geometries=polyline&steps=true`;

  for (const endpoint of OSRM_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(`${endpoint}${query}`);
      if (!response.ok) continue;
      const data = await response.json();
      const geometry = data?.routes?.[0]?.geometry;
      if (data?.code !== 'Ok' || typeof geometry !== 'string') continue;
      const coordinates = decodeEncodedPolyline(geometry);
      if (coordinates.length < 2) continue;
      const distanceMeters = Number(data.routes[0].distance) || 0;
      const durationRaw = Number(data.routes[0].duration) || 0;
      const durationSeconds = isDurationPlausible(distanceMeters, durationRaw)
        ? durationRaw
        : estimateDurationFromDistance(distanceMeters);
      return {
        coordinates,
        distanceMeters,
        durationSeconds,
        fromRoadNetwork: true,
        steps: osrmRouteSteps(data.routes[0].legs || [], language),
      };
    } catch {
      /* 换下一个道路服务 */
    }
  }
  return null;
}

async function roadRouteOrStraight(
  origin: RouteCoordinate,
  stops: RouteCoordinate[],
  language: string,
): Promise<ComputedRoute> {
  return (await osrmDrivingRoute(origin, stops, language)) ?? straightLineFallback(origin, stops);
}

/**
 * 计算驾车路线（优先 Google Directions，含实时路况 ETA；失败时改走街道路线，最后才用直线）
 */
export async function computeDrivingRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  intermediates: RouteCoordinate[] = [],
  language = 'zh',
): Promise<ComputedRoute> {
  const allStops = [...intermediates, destination];
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return roadRouteOrStraight(origin, allStops, language);
  }

  try {
    const params = new URLSearchParams({
      origin: toLatLng(origin),
      destination: toLatLng(destination),
      mode: 'driving',
      language: language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh-CN',
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

    const response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
    );
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.[0]) {
      console.warn('Directions API:', data.status, data.error_message);
      return roadRouteOrStraight(origin, allStops, language);
    }

    const route = data.routes[0];
    const encoded = route.overview_polyline?.points as string | undefined;
    const coordinates = encoded ? decodeEncodedPolyline(encoded) : [];
    if (coordinates.length < 2) {
      return roadRouteOrStraight(origin, allStops, language);
    }

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
      steps: googleRouteSteps(legs),
    };
  } catch (error) {
    console.warn('computeDrivingRoute failed:', error);
    return roadRouteOrStraight(origin, allStops, language);
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
