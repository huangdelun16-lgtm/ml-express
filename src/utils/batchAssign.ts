export const UNASSIGNED_COURIER_LABELS = new Set(['', '待分配', '未分配']);

export const ASSIGNABLE_PACKAGE_STATUSES = ['待取件', '待收款'] as const;

export type AssignablePackageLike = {
  id?: string;
  status?: string | null;
  courier?: string | null;
  sender_latitude?: number | null;
  sender_longitude?: number | null;
};

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type RankableCourier = {
  id: string;
  name: string;
  status?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  currentPackages?: number | null;
};

export type RankedCourier<T extends RankableCourier = RankableCourier> = T & {
  distance: number | null;
  score: number;
};

export type BatchAssignItemResult = {
  packageId: string;
  ok: boolean;
  notified: boolean;
  error?: string;
};

export type BatchAssignSummary = {
  success: number;
  failed: number;
  notified: number;
  successIds: string[];
  errors: string[];
};

export function isUnassignedCourier(courier?: string | null): boolean {
  return UNASSIGNED_COURIER_LABELS.has(String(courier ?? '').trim());
}

export function isAssignableStatus(status?: string | null): boolean {
  return (ASSIGNABLE_PACKAGE_STATUSES as readonly string[]).includes(String(status ?? '').trim());
}

export function isAssignablePackage(pkg: AssignablePackageLike): boolean {
  return isAssignableStatus(pkg.status) && isUnassignedCourier(pkg.courier);
}

export function isCourierOffline(status?: string | null): boolean {
  const s = String(status ?? '').trim().toLowerCase();
  return s === 'offline' || s === 'inactive';
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function readCourierGps(courier: RankableCourier): GeoPoint | null {
  const latitude = courier.latitude != null ? Number(courier.latitude) : NaN;
  const longitude = courier.longitude != null ? Number(courier.longitude) : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export function centroidOfPackages(packages: AssignablePackageLike[]): GeoPoint | null {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  for (const pkg of packages) {
    const lat = pkg.sender_latitude != null ? Number(pkg.sender_latitude) : NaN;
    const lng = pkg.sender_longitude != null ? Number(pkg.sender_longitude) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    sumLat += lat;
    sumLng += lng;
    count += 1;
  }
  if (count === 0) return null;
  return { latitude: sumLat / count, longitude: sumLng / count };
}

/**
 * 在线优先；有取件坐标时按距离 + 当前单量打分。
 * 无定位的骑手仍保留，排在有定位骑手后面，避免高峰时名单被滤空。
 */
export function rankCouriersForAssign<T extends RankableCourier>(
  couriers: T[],
  origin?: GeoPoint | null,
): RankedCourier<T>[] {
  const available = couriers.filter((c) => !isCourierOffline(c.status));
  const ranked = available.map((courier) => {
    const gps = readCourierGps(courier);
    const load = courier.currentPackages || 0;
    const distance =
      origin && gps
        ? calculateDistanceKm(origin.latitude, origin.longitude, gps.latitude, gps.longitude)
        : null;
    const distancePenalty = origin ? (distance == null ? 20 : distance) : 0;
    const score = 100 - distancePenalty * 5 - load * 10;
    return { ...courier, distance, score };
  });

  ranked.sort((a, b) => {
    if (origin) {
      const aHas = a.distance != null ? 1 : 0;
      const bHas = b.distance != null ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
    }
    if (b.score !== a.score) return b.score - a.score;
    const loadDiff = (a.currentPackages || 0) - (b.currentPackages || 0);
    if (loadDiff !== 0) return loadDiff;
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh');
  });

  return ranked;
}

export function pickLeastLoadedCourier<T extends RankableCourier>(couriers: T[]): T | null {
  const available = couriers
    .filter((c) => {
      const s = String(c.status ?? '').trim().toLowerCase();
      return s === 'online' || s === 'active' || s === 'busy';
    })
    .sort((a, b) => (a.currentPackages || 0) - (b.currentPackages || 0));
  return available[0] ?? null;
}

export function filterAssignableByIds<T extends AssignablePackageLike & { id: string }>(
  packages: T[],
  selectedIds: Iterable<string>,
): T[] {
  const ids = new Set(selectedIds);
  return packages.filter((pkg) => ids.has(pkg.id) && isAssignablePackage(pkg));
}

export function toggleSelectedId(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function toggleSelectAllIds(current: Set<string>, ids: string[]): Set<string> {
  if (ids.length > 0 && ids.every((id) => current.has(id))) {
    return new Set();
  }
  return new Set(ids);
}

export function pruneSelectedIds(current: Set<string>, validIds: Iterable<string>): Set<string> {
  const valid = new Set(validIds);
  const next = new Set<string>();
  current.forEach((id) => {
    if (valid.has(id)) next.add(id);
  });
  return next;
}

export function summarizeBatchAssign(results: BatchAssignItemResult[]): BatchAssignSummary {
  const successIds: string[] = [];
  const errors: string[] = [];
  let notified = 0;
  for (const item of results) {
    if (item.ok) {
      successIds.push(item.packageId);
      if (item.notified) notified += 1;
    } else {
      errors.push(`${item.packageId}：${item.error || '分配失败'}`);
    }
  }
  return {
    success: successIds.length,
    failed: errors.length,
    notified,
    successIds,
    errors,
  };
}

export function formatBatchAssignMessage(
  summary: BatchAssignSummary,
  courierName: string,
): string {
  const name = courierName.trim() || '骑手';
  if (summary.success === 0) {
    const detail = summary.errors.slice(0, 3).join('\n');
    return `❌ 派单失败\n\n骑手：${name}\n失败 ${summary.failed} 件${detail ? `\n${detail}` : ''}`;
  }
  if (summary.failed === 0 && summary.success === 1) {
    return `✅ 分配成功！\n\n📦 包裹：${summary.successIds[0]}\n🚚 骑手：${name}\n📲 通知：${
      summary.notified > 0 ? '已发送' : '发送失败'
    }`;
  }
  if (summary.failed === 0) {
    return `✅ 已派 ${summary.success} 件给 ${name}\n📲 通知 ${summary.notified}/${summary.success}`;
  }
  const detail = summary.errors.slice(0, 3).join('\n');
  return `⚠️ 已派 ${summary.success} 件给 ${name}，失败 ${summary.failed} 件\n📲 通知 ${summary.notified}${
    detail ? `\n${detail}` : ''
  }`;
}
