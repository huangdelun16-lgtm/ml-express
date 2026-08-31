import type { InventoryStoreSession } from '../services/authService';
import type { PkgTrackingStatus } from '../types/tracking';
import { canMarkCustomerSigned, type CustomerSignItemRef } from './customerSign';
import { canSelectPackedShipmentForTruckLoad } from './packDisplayStatus';
import { isPackageBarcode } from './packageNumber';
import {
  buildTripFeeGroupMap,
  isTripTransportFeePaid,
  type TripFeeLoadBatchRef,
} from './tripTransportFee';

export const HOME_TODO_KEYS = [
  'hubArrive',
  'transportFee',
  'hubInbound',
  'exceptions',
  'notify',
  'sign',
  'pack',
  'truckLoad',
] as const;

export type HomeTodoKey = (typeof HOME_TODO_KEYS)[number];

export type HomeTodoScreen = 'HubReceive' | 'Exceptions' | 'Items' | 'StockOut';

export type HomeTodoCounts = Record<HomeTodoKey, number>;

export type HomeTodoItem = {
  key: HomeTodoKey;
  count: number;
  screen: HomeTodoScreen;
  itemsMode?: 'pack' | 'sign';
};

export const HOME_TODO_META: Record<
  HomeTodoKey,
  { screen: HomeTodoScreen; itemsMode?: 'pack' | 'sign' }
> = {
  hubArrive: { screen: 'HubReceive' },
  transportFee: { screen: 'HubReceive' },
  hubInbound: { screen: 'HubReceive' },
  exceptions: { screen: 'Exceptions' },
  notify: { screen: 'Items', itemsMode: 'sign' },
  sign: { screen: 'Items', itemsMode: 'sign' },
  pack: { screen: 'Items', itemsMode: 'pack' },
  truckLoad: { screen: 'StockOut' },
};

export function emptyHomeTodoCounts(): HomeTodoCounts {
  return {
    hubArrive: 0,
    transportFee: 0,
    hubInbound: 0,
    exceptions: 0,
    notify: 0,
    sign: 0,
    pack: 0,
    truckLoad: 0,
  };
}

export function normalizeTodoCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

/** count>0 才入队，顺序与站点日常流程一致 */
export function buildHomeTodoQueue(counts: Partial<HomeTodoCounts>): HomeTodoItem[] {
  return HOME_TODO_KEYS.map((key) => {
    const count = normalizeTodoCount(counts[key]);
    return { key, count, ...HOME_TODO_META[key] };
  }).filter((item) => item.count > 0);
}

export function sumHomeTodoCounts(items: Array<{ count: number }>): number {
  return items.reduce((sum, item) => sum + normalizeTodoCount(item.count), 0);
}

export type HomeTodoFeePack = TripFeeLoadBatchRef & {
  pack_barcode?: string | null;
  bundle_barcode?: string | null;
  trip_number?: string | null;
  transport_fee?: unknown;
};

/** 待付车费：有金额且同车次尚未付款的分组数 */
export function countUnpaidTripFees(
  packs: HomeTodoFeePack[],
  paidBarcodes: Iterable<string>,
): number {
  const paid = new Set(
    [...paidBarcodes].map((code) => code.trim().toUpperCase()).filter(Boolean),
  );
  const groups = buildTripFeeGroupMap(packs);
  let n = 0;
  for (const group of groups.values()) {
    if (group.fee <= 0) continue;
    if (isTripTransportFeePaid(group.packBarcodes, paid)) continue;
    n += 1;
  }
  return n;
}

export function countPendingInboundOrders(
  arrivedPackBarcodes: Iterable<string>,
  orders: Array<{ pack_barcode?: string | null; status?: string | null }>,
): number {
  const arrived = new Set(
    [...arrivedPackBarcodes].map((code) => code.trim().toUpperCase()).filter(Boolean),
  );
  let n = 0;
  for (const order of orders) {
    const pack = String(order.pack_barcode ?? '').trim().toUpperCase();
    if (!pack || !arrived.has(pack)) continue;
    if (String(order.status ?? '').trim() !== 'in_transit') continue;
    n += 1;
  }
  return n;
}

export function isPendingPackItem(item: {
  barcode?: string | null;
  qty_on_hand?: number | null;
  packed_at?: string | null;
  packed_bundle_barcode?: string | null;
}): boolean {
  const barcode = String(item.barcode ?? '').trim();
  if (!barcode || isPackageBarcode(barcode)) return false;
  if (!(Number(item.qty_on_hand) > 0)) return false;
  if (item.packed_at?.trim()) return false;
  if (item.packed_bundle_barcode?.trim()) return false;
  return true;
}

export function countPendingPackItems(
  items: Array<{
    barcode?: string | null;
    qty_on_hand?: number | null;
    packed_at?: string | null;
    packed_bundle_barcode?: string | null;
  }>,
): number {
  return items.filter(isPendingPackItem).length;
}

export function countPendingTruckLoads(
  packs: Array<{ loaded: boolean; cloud_status?: PkgTrackingStatus | null }>,
): number {
  return packs.filter((pack) => canSelectPackedShipmentForTruckLoad(pack)).length;
}

export function countSignableItems(
  store: InventoryStoreSession,
  items: CustomerSignItemRef[],
): number {
  return items.filter((item) => canMarkCustomerSigned(store, item)).length;
}

export function settledCount(result: PromiseSettledResult<number>): number {
  if (result.status !== 'fulfilled') return 0;
  return normalizeTodoCount(result.value);
}
