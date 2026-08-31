import type { InventoryStoreSession } from './authService';
import { ensureInventoryCloudAuth } from './authService';
import { getHubTransportFeePaidBarcodeSet } from './hubTransportFeeService';
import { isSupabaseConfigured, supabase } from './supabase';
import { listPkgTrackingStatusMap } from './trackingService';
import type { PkgTrackingStatus } from '../types/tracking';
import { chunkIds, fetchAllPages } from '../utils/supabasePager';
import {
  countPendingPackItems,
  countPendingTruckLoads,
  countSignableItems,
  countUnpaidTripFees,
  emptyHomeTodoCounts,
  normalizeTodoCount,
  settledCount,
  type HomeTodoCounts,
  type HomeTodoFeePack,
} from '../utils/homeTodoQueue';
import { countUnnotifiedSignableItems } from '../utils/arrivalNotify';
import { isMissingArrivalNotifiedColumnError } from './inventoryCloudApi';

const INBOUND_PACK_COLUMNS =
  'id, pack_barcode, trip_number, transport_fee, truck_loaded_at, origin_store_code, leg_destination_code, destination_code, status';

type InboundPackRow = HomeTodoFeePack & {
  id?: string;
  pack_barcode?: string | null;
  status?: string | null;
};

type SignCountRow = {
  barcode?: string | null;
  final_destination?: string | null;
  destination?: string | null;
  hub_arrived_at?: string | null;
  arrival_notified_at?: string | null;
  customer_signed_at?: string | null;
  owner_store_code?: string | null;
};

type PackCountRow = {
  barcode?: string | null;
  qty_on_hand?: number | null;
  packed_at?: string | null;
  packed_bundle_barcode?: string | null;
};

async function countHead(
  query: PromiseLike<{ count: number | null; error: { message?: string } | null }>,
): Promise<number> {
  const { count, error } = await query;
  if (error) throw new Error(error.message || 'count failed');
  return count ?? 0;
}

function mergeInboundPacks(byLeg: InboundPackRow[], byDest: InboundPackRow[]): InboundPackRow[] {
  const seen = new Set<string>();
  const merged: InboundPackRow[] = [];
  for (const row of [...byLeg, ...byDest]) {
    const barcode = String(row.pack_barcode ?? '').trim().toUpperCase();
    const id = String(row.id ?? barcode);
    const key = barcode || id;
    if (!key || seen.has(key) || seen.has(id)) continue;
    seen.add(key);
    seen.add(id);
    merged.push(row);
  }
  return merged;
}

async function listInboundPackRows(
  hubCode: string,
  statuses: PkgTrackingStatus[],
): Promise<InboundPackRow[]> {
  const dest = hubCode.trim().toUpperCase();
  const [byLeg, byDest] = await Promise.all([
    fetchAllPages<InboundPackRow>((from, to) =>
      supabase
        .from('inventory_pkg_tracking')
        .select(INBOUND_PACK_COLUMNS)
        .eq('leg_destination_code', dest)
        .in('status', statuses)
        .range(from, to),
    ),
    fetchAllPages<InboundPackRow>((from, to) =>
      supabase
        .from('inventory_pkg_tracking')
        .select(INBOUND_PACK_COLUMNS)
        .is('leg_destination_code', null)
        .eq('destination_code', dest)
        .in('status', statuses)
        .range(from, to),
    ),
  ]);
  return mergeInboundPacks(byLeg, byDest);
}

async function countInboundPacks(hubCode: string, status: PkgTrackingStatus): Promise<number> {
  const dest = hubCode.trim().toUpperCase();
  const [byLeg, byDest] = await Promise.all([
    countHead(
      supabase
        .from('inventory_pkg_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('leg_destination_code', dest)
        .eq('status', status),
    ),
    countHead(
      supabase
        .from('inventory_pkg_tracking')
        .select('id', { count: 'exact', head: true })
        .is('leg_destination_code', null)
        .eq('destination_code', dest)
        .eq('status', status),
    ),
  ]);
  return byLeg + byDest;
}

async function countPendingInboundOrdersForPacks(packs: InboundPackRow[]): Promise<number> {
  const barcodes = [
    ...new Set(
      packs
        .map((row) => String(row.pack_barcode ?? '').trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (barcodes.length === 0) return 0;
  let total = 0;
  for (const chunk of chunkIds(barcodes, 80)) {
    total += await countHead(
      supabase
        .from('inventory_order_tracking')
        .select('id', { count: 'exact', head: true })
        .in('pack_barcode', chunk)
        .eq('status', 'in_transit'),
    );
  }
  return total;
}

async function hubReceivedInboundWork(hubCode: string): Promise<{
  unpaidTrips: number;
  pendingInbound: number;
}> {
  const packs = await listInboundPackRows(hubCode, ['hub_received']);
  const [paidResult, inboundResult] = await Promise.allSettled([
    getHubTransportFeePaidBarcodeSet(),
    countPendingInboundOrdersForPacks(packs),
  ]);
  const paid = paidResult.status === 'fulfilled' ? paidResult.value : new Set<string>();
  return {
    unpaidTrips:
      paidResult.status === 'fulfilled' ? countUnpaidTripFees(packs, paid) : 0,
    pendingInbound: inboundResult.status === 'fulfilled' ? inboundResult.value : 0,
  };
}

async function countOpenExceptions(): Promise<number> {
  try {
    return await countHead(
      supabase
        .from('inventory_exceptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
    );
  } catch {
    return 0;
  }
}

async function countPendingSignsAndNotify(
  store: InventoryStoreSession,
): Promise<{ sign: number; notify: number }> {
  const mapRows = (rows: SignCountRow[], includeNotify: boolean) =>
    rows.map((row) => ({
      barcode: String(row.barcode ?? ''),
      final_destination: String(row.final_destination ?? ''),
      destination: String(row.final_destination ?? ''),
      hub_arrived_at: row.hub_arrived_at ?? '',
      arrival_notified_at: includeNotify ? row.arrival_notified_at ?? '' : '',
      customer_signed_at: row.customer_signed_at ?? '',
      owner_store_code: String(row.owner_store_code ?? ''),
    }));

  let rows: SignCountRow[];
  let includeNotify = true;
  try {
    rows = await fetchAllPages<SignCountRow>((from, to) =>
      supabase
        .from('inventory_store_items')
        .select(
          'barcode, final_destination, hub_arrived_at, arrival_notified_at, customer_signed_at, owner_store_code' as '*',
        )
        .not('hub_arrived_at', 'is', null)
        .is('customer_signed_at', null)
        .range(from, to),
    );
  } catch (error) {
    if (!isMissingArrivalNotifiedColumnError(error)) throw error;
    includeNotify = false;
    rows = await fetchAllPages<SignCountRow>((from, to) =>
      supabase
        .from('inventory_store_items')
        .select('barcode, final_destination, hub_arrived_at, customer_signed_at, owner_store_code')
        .not('hub_arrived_at', 'is', null)
        .is('customer_signed_at', null)
        .range(from, to),
    );
  }

  const mapped = mapRows(rows, includeNotify);
  const sign = countSignableItems(store, mapped);
  const notify = includeNotify ? countUnnotifiedSignableItems(store, mapped) : sign;
  return { sign, notify };
}

async function countPackQueue(): Promise<number> {
  const rows = await fetchAllPages<PackCountRow>((from, to) =>
    supabase
      .from('inventory_store_items')
      .select('barcode, qty_on_hand, packed_at, packed_bundle_barcode')
      .gt('qty_on_hand', 0)
      .range(from, to),
  );
  return countPendingPackItems(rows);
}

async function countTruckLoadQueue(): Promise<number> {
  const packs = await fetchAllPages<{ bundle_barcode?: string | null; loaded_at?: string | null }>(
    (from, to) =>
      supabase
        .from('inventory_packed_shipments')
        .select('bundle_barcode, loaded_at')
        .is('loaded_at', null)
        .range(from, to),
  );
  const barcodes = packs
    .map((row) => String(row.bundle_barcode ?? '').trim().toUpperCase())
    .filter(Boolean);
  const statuses = await listPkgTrackingStatusMap(barcodes).catch(
    () => ({} as Awaited<ReturnType<typeof listPkgTrackingStatusMap>>),
  );
  return countPendingTruckLoads(
    packs.map((row) => {
      const code = String(row.bundle_barcode ?? '').trim().toUpperCase();
      return {
        loaded: Boolean(String(row.loaded_at ?? '').trim()),
        cloud_status: statuses[code] ?? null,
      };
    }),
  );
}

/**
 * 首页待办计数。单项失败记 0，不拖垮整页。
 * 不用 listInboundPackages：那会按包拉订单。
 */
export async function fetchHomeTodoCounts(params: {
  store: InventoryStoreSession;
  hubCode: string;
}): Promise<HomeTodoCounts> {
  const counts = emptyHomeTodoCounts();
  if (!isSupabaseConfigured()) return counts;
  const hubCode = params.hubCode.trim().toUpperCase();
  if (!hubCode) return counts;
  await ensureInventoryCloudAuth();

  const results = await Promise.allSettled([
    countInboundPacks(hubCode, 'in_transit'),
    hubReceivedInboundWork(hubCode),
    countOpenExceptions(),
    countPendingSignsAndNotify(params.store),
    countPackQueue(),
    countTruckLoadQueue(),
  ]);

  counts.hubArrive = settledCount(results[0]);
  if (results[1].status === 'fulfilled') {
    counts.transportFee = normalizeTodoCount(results[1].value.unpaidTrips);
    counts.hubInbound = normalizeTodoCount(results[1].value.pendingInbound);
  }
  counts.exceptions = settledCount(results[2]);
  if (results[3].status === 'fulfilled') {
    counts.sign = normalizeTodoCount(results[3].value.sign);
    counts.notify = normalizeTodoCount(results[3].value.notify);
  }
  counts.pack = settledCount(results[4]);
  counts.truckLoad = settledCount(results[5]);
  return counts;
}
