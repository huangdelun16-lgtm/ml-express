import { calculateDistanceKm, isUnassignedCourier } from './batchAssign';

export const ROUTE_PREDICTION_MAX_JOBS = 8;

export type RouteLatLng = { lat: number; lng: number };

export type RouteStopKind = 'pickup' | 'delivery';

export type RoutePredictionReason = 'urgent' | 'food' | 'both';

export type RoutePredictionPackage = {
  id: string;
  status?: string | null;
  courier?: string | null;
  package_type?: string | null;
  delivery_speed?: string | null;
  sender_latitude?: number | null;
  sender_longitude?: number | null;
  receiver_latitude?: number | null;
  receiver_longitude?: number | null;
  created_at?: string | null;
  create_time?: string | null;
};

export type RoutePredictionCourier = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type RouteJob = {
  courierId: string;
  courierName: string;
  packageId: string;
  origin: RouteLatLng;
  destination: RouteLatLng;
  stopKind: RouteStopKind;
  reason: RoutePredictionReason;
};

const PICKUP_STATUSES = new Set(['待取件', '待收款', '打包中', '待确认', '已分配']);

function finiteCoord(lat?: number | null, lng?: number | null): RouteLatLng | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la === 0 && ln === 0) return null;
  return { lat: la, lng: ln };
}

/** 下单选项「急送达」（含加急、英文 Express 标签） */
export function isUrgentDeliverySpeed(speed?: string | null): boolean {
  const s = String(speed ?? '').trim();
  if (!s) return false;
  if (s.includes('急送达') || s.includes('加急配送') || s.includes('加急')) return true;
  const lower = s.toLowerCase();
  if (lower.includes('urgent')) return true;
  if (/\bexpress\b/.test(lower) && !lower.includes('eco')) return true;
  return false;
}

/** 下单选项「食品和饮料」（含历史「食品饮料」及英/缅标签） */
export function isFoodAndBeveragePackageType(packageType?: string | null): boolean {
  const s = String(packageType ?? '').trim();
  if (!s) return false;
  if (s.includes('食品') && s.includes('饮料')) return true;
  if (s.includes('食品饮料')) return true;
  const lower = s.toLowerCase();
  if (lower.includes('food') && (lower.includes('drink') || lower.includes('beverage'))) return true;
  if (s.includes('အစားအသောက်')) return true;
  return false;
}

/** 急送达 或 食品和饮料：满足其一即自动走路线预测 */
export function packageQualifiesForRoutePrediction(
  pkg: Pick<RoutePredictionPackage, 'delivery_speed' | 'package_type'>,
): boolean {
  return isUrgentDeliverySpeed(pkg.delivery_speed) || isFoodAndBeveragePackageType(pkg.package_type);
}

export function routePredictionReason(
  pkg: Pick<RoutePredictionPackage, 'delivery_speed' | 'package_type'>,
): RoutePredictionReason | null {
  const urgent = isUrgentDeliverySpeed(pkg.delivery_speed);
  const food = isFoodAndBeveragePackageType(pkg.package_type);
  if (urgent && food) return 'both';
  if (urgent) return 'urgent';
  if (food) return 'food';
  return null;
}

export function nextStopForPackage(
  pkg: RoutePredictionPackage,
): { lat: number; lng: number; kind: RouteStopKind } | null {
  const status = String(pkg.status ?? '').trim();
  const preferPickup = !status || PICKUP_STATUSES.has(status);

  if (preferPickup) {
    const pickup = finiteCoord(pkg.sender_latitude, pkg.sender_longitude);
    if (pickup) return { ...pickup, kind: 'pickup' };
  }

  const dropoff = finiteCoord(pkg.receiver_latitude, pkg.receiver_longitude);
  if (dropoff) return { ...dropoff, kind: 'delivery' };

  if (!preferPickup) {
    const pickup = finiteCoord(pkg.sender_latitude, pkg.sender_longitude);
    if (pickup) return { ...pickup, kind: 'pickup' };
  }
  return null;
}

export function roundRouteCoord(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function routeJobSignature(job: RouteJob): string {
  return [
    job.courierId,
    job.packageId,
    `${roundRouteCoord(job.origin.lat)},${roundRouteCoord(job.origin.lng)}`,
    `${roundRouteCoord(job.destination.lat)},${roundRouteCoord(job.destination.lng)}`,
  ].join('|');
}

function createdStamp(pkg: RoutePredictionPackage): string {
  return String(pkg.created_at || pkg.create_time || '');
}

/**
 * 每位已派骑手最多一条：优先取件阶段，再选离骑手最近的急送达/餐饮下一站。
 * 选中骑手优先占名额；总数默认不超过 8，避免刷爆 Directions 配额。
 */
export function buildRouteJobs(input: {
  packages: RoutePredictionPackage[];
  couriers: RoutePredictionCourier[];
  selectedCourierId?: string | null;
  maxJobs?: number;
}): RouteJob[] {
  const maxJobs = input.maxJobs ?? ROUTE_PREDICTION_MAX_JOBS;
  const couriersByName = new Map<string, RoutePredictionCourier>();
  for (const courier of input.couriers) {
    const lat = Number(courier.latitude);
    const lng = Number(courier.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const name = String(courier.name || '').trim();
    if (!name) continue;
    couriersByName.set(name, courier);
  }

  const grouped = new Map<string, RoutePredictionPackage[]>();
  for (const pkg of input.packages) {
    if (!packageQualifiesForRoutePrediction(pkg)) continue;
    if (isUnassignedCourier(pkg.courier)) continue;
    if (!nextStopForPackage(pkg)) continue;
    const name = String(pkg.courier).trim();
    if (!couriersByName.has(name)) continue;
    const list = grouped.get(name);
    if (list) list.push(pkg);
    else grouped.set(name, [pkg]);
  }

  const jobs: RouteJob[] = [];
  grouped.forEach((pkgs, name) => {
    const courier = couriersByName.get(name);
    if (!courier) return;
    const originLat = Number(courier.latitude);
    const originLng = Number(courier.longitude);

    let best: {
      pkg: RoutePredictionPackage;
      stop: { lat: number; lng: number; kind: RouteStopKind };
      pickupRank: number;
      dist: number;
    } | null = null;

    for (let i = 0; i < pkgs.length; i += 1) {
      const pkg = pkgs[i];
      const stop = nextStopForPackage(pkg);
      if (!stop) continue;
      const pickupRank = stop.kind === 'pickup' ? 0 : 1;
      const dist = calculateDistanceKm(originLat, originLng, stop.lat, stop.lng);
      if (
        !best ||
        pickupRank < best.pickupRank ||
        (pickupRank === best.pickupRank && dist < best.dist) ||
        (pickupRank === best.pickupRank &&
          dist === best.dist &&
          createdStamp(pkg) < createdStamp(best.pkg))
      ) {
        best = { pkg, stop, pickupRank, dist };
      }
    }
    if (!best) return;

    const reason = routePredictionReason(best.pkg);
    if (!reason) return;

    jobs.push({
      courierId: String(courier.id),
      courierName: name,
      packageId: best.pkg.id,
      origin: { lat: originLat, lng: originLng },
      destination: { lat: best.stop.lat, lng: best.stop.lng },
      stopKind: best.stop.kind,
      reason,
    });
  });

  const selectedId = input.selectedCourierId ? String(input.selectedCourierId) : '';
  jobs.sort((a, b) => {
    const aSel = a.courierId === selectedId ? 0 : 1;
    const bSel = b.courierId === selectedId ? 0 : 1;
    if (aSel !== bSel) return aSel - bSel;
    const aUrgent = a.reason === 'food' ? 1 : 0;
    const bUrgent = b.reason === 'food' ? 1 : 0;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    return a.packageId.localeCompare(b.packageId);
  });

  return jobs.slice(0, Math.max(0, maxJobs));
}

export function formatRouteEtaLabel(input: {
  durationSeconds: number;
  distanceMeters: number;
  fromRoadNetwork?: boolean;
}): string {
  const minutes = Math.max(1, Math.round(input.durationSeconds / 60));
  const km = input.distanceMeters / 1000;
  const distText =
    km < 0.1 ? `${Math.round(input.distanceMeters)} 米` : `${km.toFixed(1)} 公里`;
  const prefix = input.fromRoadNetwork === false ? '直线约' : '约';
  return `${prefix} ${minutes} 分钟 · ${distText}`;
}

export function routeReasonLabel(reason: RoutePredictionReason): string {
  if (reason === 'both') return '急送达 · 食品和饮料';
  if (reason === 'food') return '食品和饮料';
  return '急送达';
}
