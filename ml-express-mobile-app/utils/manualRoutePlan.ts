import { haversineMeters, type RouteCoordinate } from '../services/routingService';

export type PlanStop = {
  id: string;
  latitude: number;
  longitude: number;
  kind?: 'pickup' | 'delivery';
};

export function isPickupStop(stop: PlanStop): boolean {
  return stop.kind === 'pickup' || stop.id.endsWith('-pickup');
}

export function isDeliveryStop(stop: PlanStop): boolean {
  return stop.kind === 'delivery' || stop.id.endsWith('-delivery');
}

export function packageKeyFromStopId(id: string): string {
  return id.replace(/-pickup$|-delivery$/, '');
}

export function pickupIdForStop(stop: PlanStop): string {
  return `${packageKeyFromStopId(stop.id)}-pickup`;
}

export function formatShortDistance(meters: number, language: string): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) {
    return language === 'zh' ? `${Math.round(meters)}米` : `${Math.round(meters)}m`;
  }
  const km = meters / 1000;
  return language === 'zh' ? `${km.toFixed(1)}公里` : `${km.toFixed(1)}km`;
}

export function distanceFromPoint(point: RouteCoordinate | null, stop: PlanStop): number {
  if (!point) return Number.POSITIVE_INFINITY;
  return haversineMeters(point, {
    latitude: stop.latitude,
    longitude: stop.longitude,
  });
}

function canVisitStop(
  stop: PlanStop,
  selectedIds: Set<string>,
  pool: PlanStop[],
): boolean {
  if (!isDeliveryStop(stop)) return true;
  const pickupId = pickupIdForStop(stop);
  const pickupInPool = pool.some((s) => s.id === pickupId);
  if (!pickupInPool) return true;
  return selectedIds.has(pickupId);
}

/** 从当前位置按最近优先补全未选站点；已选顺序保持不变。送货不会排到同单取货之前。 */
export function fillRemainingNearest(
  origin: RouteCoordinate | null,
  orderedIds: string[],
  pool: PlanStop[],
): string[] {
  const selected = [...orderedIds];
  const selectedSet = new Set(selected);
  const last = selected.length
    ? pool.find((s) => s.id === selected[selected.length - 1])
    : null;
  let pos: RouteCoordinate | null = last
    ? { latitude: last.latitude, longitude: last.longitude }
    : origin;

  while (true) {
    const remaining = pool.filter((s) => !selectedSet.has(s.id));
    const feasible = remaining.filter((s) => canVisitStop(s, selectedSet, pool));
    if (feasible.length === 0) break;

    let best = feasible[0];
    let bestD = Number.POSITIVE_INFINITY;
    for (const s of feasible) {
      const d = distanceFromPoint(pos, s);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    selected.push(best.id);
    selectedSet.add(best.id);
    pos = { latitude: best.latitude, longitude: best.longitude };
  }

  return selected;
}

export function nextNearestStopId(
  origin: RouteCoordinate | null,
  orderedIds: string[],
  pool: PlanStop[],
): string | null {
  const selectedSet = new Set(orderedIds);
  const last = orderedIds.length
    ? pool.find((s) => s.id === orderedIds[orderedIds.length - 1])
    : null;
  const pos: RouteCoordinate | null = last
    ? { latitude: last.latitude, longitude: last.longitude }
    : origin;
  const remaining = pool.filter((s) => !selectedSet.has(s.id));
  const feasible = remaining.filter((s) => canVisitStop(s, selectedSet, pool));
  if (feasible.length === 0) return null;
  let best = feasible[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const s of feasible) {
    const d = distanceFromPoint(pos, s);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best.id;
}
