import {
  isDeliveryActionStatus,
  isMerchantGeofenceStatus,
  normalizePackageStatusZh,
} from "./packageStatusNormalize";

export const APPROACHING_RADIUS_M = 120;

export type ApproachingKind = "pickup" | "delivery";

export type ApproachingStop = {
  packageId: string;
  kind: ApproachingKind;
  distanceMeters: number;
  title: string;
};

export type ApproachingPackage = {
  id: string;
  status?: string | null;
  sender_name?: string | null;
  receiver_name?: string | null;
  pickupCoords?: { lat: number; lng: number; source?: string } | null;
  deliveryCoords?: { lat: number; lng: number; source?: string } | null;
};

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function isValidCoord(lat?: number | null, lng?: number | null): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(Number(lat) === 0 && Number(lng) === 0)
  );
}

function isUsableStopCoord(
  coord?: { lat: number; lng: number; source?: string } | null,
): boolean {
  if (!coord || coord.source === "fallback") return false;
  return isValidCoord(coord.lat, coord.lng);
}

/**
 * Among the rider's active orders, pick the nearest pickup or delivery stop
 * within `radiusM` (default 120m). Pickup applies to 待取件/待收款/打包中;
 * delivery applies to 已取件/配送中/异常上报.
 */
export function pickApproachingStop(
  packages: ApproachingPackage[],
  lat: number,
  lng: number,
  radiusM: number = APPROACHING_RADIUS_M,
): ApproachingStop | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !packages.length) {
    return null;
  }

  let best: ApproachingStop | null = null;

  for (const pkg of packages) {
    if (!pkg?.id) continue;
    const status = normalizePackageStatusZh(pkg.status);

    if (isMerchantGeofenceStatus(status) && isUsableStopCoord(pkg.pickupCoords)) {
      const distanceMeters = haversineMeters(
        lat,
        lng,
        pkg.pickupCoords!.lat,
        pkg.pickupCoords!.lng,
      );
      if (distanceMeters <= radiusM && (!best || distanceMeters < best.distanceMeters)) {
        best = {
          packageId: pkg.id,
          kind: "pickup",
          distanceMeters,
          title: String(pkg.sender_name || "").trim() || pkg.id.slice(-6),
        };
      }
    }

    if (isDeliveryActionStatus(status) && isUsableStopCoord(pkg.deliveryCoords)) {
      const distanceMeters = haversineMeters(
        lat,
        lng,
        pkg.deliveryCoords!.lat,
        pkg.deliveryCoords!.lng,
      );
      if (distanceMeters <= radiusM && (!best || distanceMeters < best.distanceMeters)) {
        best = {
          packageId: pkg.id,
          kind: "delivery",
          distanceMeters,
          title: String(pkg.receiver_name || "").trim() || pkg.id.slice(-6),
        };
      }
    }
  }

  return best;
}

export function approachingStopKey(stop: ApproachingStop | null): string {
  if (!stop) return "";
  return `${stop.packageId}:${stop.kind}`;
}
