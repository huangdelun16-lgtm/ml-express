import { supabase } from './supabase';
import LoggerService from './LoggerService';
import { isCourierUnassigned } from './_shared/dialPhone';
import {
  isFreshCourierLocation,
  pickMerchantRiderApproach,
  type MerchantRiderApproachHit,
  type MerchantRiderApproachRow,
} from './_shared/merchantRiderApproach';

type CourierRow = {
  id: string;
  name?: string | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_location_update?: string | null;
};

type LocationRow = {
  courier_id: string;
  latitude?: number | null;
  longitude?: number | null;
  last_update?: string | null;
};

const COURIER_SELECTS = [
  'id,name,last_latitude,last_longitude,last_location_update',
  'id,name,last_latitude,last_longitude',
] as const;

async function fetchCouriersForKeys(keys: string[]): Promise<CourierRow[]> {
  for (const columns of COURIER_SELECTS) {
    const { data: byName, error } = await supabase
      .from('couriers')
      .select(columns as '*')
      .in('name', keys);
    if (error) continue;
    const rows = [...((byName || []) as CourierRow[])];
    const foundNames = new Set(rows.map((c) => String(c.name || '').trim()));
    const leftover = keys.filter((key) => !foundNames.has(key));
    if (leftover.length) {
      const { data: byId } = await supabase
        .from('couriers')
        .select(columns as '*')
        .in('id', leftover);
      rows.push(...((byId || []) as CourierRow[]));
    }
    return rows;
  }
  return [];
}

export async function fetchMerchantRiderApproachHit(
  storeId: string,
  storeLat: number,
  storeLng: number,
): Promise<MerchantRiderApproachHit | null> {
  if (!storeId) return null;

  const { data: packages, error: pkgError } = await supabase
    .from('packages')
    .select('id,status,courier')
    .eq('delivery_store_id', storeId)
    .in('status', ['打包中', '待取件', '待收款'])
    .limit(80);

  if (pkgError) {
    LoggerService.warn('商家骑手靠近：拉取取件单失败', pkgError);
    return null;
  }

  const assigned = (packages || []).filter(
    (row) => row?.id && !isCourierUnassigned(row.courier),
  );
  if (!assigned.length) return null;

  const keys = Array.from(
    new Set(assigned.map((row) => String(row.courier || '').trim()).filter(Boolean)),
  );
  if (!keys.length) return null;

  const couriers = await fetchCouriersForKeys(keys);
  if (!couriers.length) return null;

  const courierIds = couriers.map((c) => c.id).filter(Boolean);
  if (!courierIds.length) return null;

  const { data: locs } = await supabase
    .from('courier_locations')
    .select('courier_id,latitude,longitude,last_update')
    .in('courier_id', courierIds);

  const locById = new Map<string, LocationRow>();
  for (const loc of (locs || []) as LocationRow[]) {
    if (!loc?.courier_id || !isFreshCourierLocation(loc.last_update)) continue;
    locById.set(loc.courier_id, loc);
  }

  const courierByKey = new Map<string, CourierRow>();
  for (const courier of couriers) {
    if (courier.name) courierByKey.set(String(courier.name).trim(), courier);
    courierByKey.set(courier.id, courier);
  }

  const rows: MerchantRiderApproachRow[] = assigned.map((pkg) => {
    const key = String(pkg.courier || '').trim();
    const courier = courierByKey.get(key);
    const loc = courier ? locById.get(courier.id) : undefined;
    const fallbackOk = isFreshCourierLocation(courier?.last_location_update);
    return {
      packageId: String(pkg.id),
      status: pkg.status,
      courierName: courier?.name || key,
      courierLat: loc?.latitude ?? (fallbackOk ? courier?.last_latitude : null),
      courierLng: loc?.longitude ?? (fallbackOk ? courier?.last_longitude : null),
    };
  });

  return pickMerchantRiderApproach(storeLat, storeLng, rows);
}
