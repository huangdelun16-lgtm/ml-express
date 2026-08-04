import type { InventoryStoreSession } from './authService';
import { ensureInventoryCloudAuth } from './authService';
import { svc } from '../errors/serviceError';
import { upsertCloudTransportFeePayment } from './inventoryCloudApi';
import { supabase } from './supabase';
import { isCloudReachable } from '../utils/networkReachability';
import { loadBatchGroupKey } from '../utils/tripTransportFee';
import {
  claimTripFeeAnchorIfUnset,
  clearTripFeeAnchorCache,
} from '../utils/tripFeeAnchor';

export { claimTripFeeAnchorIfUnset, clearTripFeeAnchorCache };

export function parseTransportFeeAmount(raw: string | undefined | null): number {
  const n = Number((raw ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
export function formatTransportFeeDisplay(raw: string | undefined | null): string {
  const n = parseTransportFeeAmount(raw);
  return n > 0 ? `${n % 1 === 0 ? n : n.toFixed(2)} MMK` : '未登记';
}
function code(value: string): string { return value.trim().toUpperCase(); }

const feePaidCache = new Map<string, boolean>();

export function primeHubTransportFeePaidCache(packBarcode: string, paid: boolean): void {
  feePaidCache.set(code(packBarcode), paid);
}

async function ready(): Promise<void> {
  if (!(await isCloudReachable())) throw new Error('网络不可用，无法连接 Supabase。请恢复网络后重试。');
  await ensureInventoryCloudAuth();
}

type TripSiblingRow = {
  pack_barcode: string;
  trip_number?: string | null;
  truck_loaded_at?: string | null;
  origin_store_code?: string | null;
  leg_destination_code?: string | null;
  destination_code?: string | null;
};

/** 同一车次 / 同一装车批次的全部 PKG（用于车费只付一次） */
export async function resolveTripSiblingBarcodes(packBarcode: string): Promise<string[]> {
  const packCode = code(packBarcode);
  if (!packCode) return [];
  await ready();

  const { data: pkgRow, error: pkgErr } = await supabase
    .from('inventory_pkg_tracking')
    .select(
      'pack_barcode, trip_number, truck_loaded_at, origin_store_code, leg_destination_code, destination_code',
    )
    .eq('pack_barcode', packCode)
    .maybeSingle();
  if (pkgErr) throw new Error(pkgErr.message);
  if (!pkgRow) return [packCode];

  const row = pkgRow as TripSiblingRow;
  const tripNumber = String(row.trip_number ?? '').trim().toUpperCase();
  if (tripNumber) {
    const { data: siblings, error: sibErr } = await supabase
      .from('inventory_pkg_tracking')
      .select('pack_barcode')
      .eq('trip_number', tripNumber);
    if (sibErr) throw new Error(sibErr.message);
    const codes = (siblings ?? [])
      .map((s) => code(String(s.pack_barcode ?? '')))
      .filter(Boolean);
    if (!codes.includes(packCode)) codes.push(packCode);
    return [...new Set(codes)].sort();
  }

  const batchKey = loadBatchGroupKey(row);
  if (!batchKey) return [packCode];

  const loaded = String(row.truck_loaded_at ?? '').trim();
  const ts = Date.parse(loaded);
  if (Number.isNaN(ts)) return [packCode];

  const windowStart = new Date(ts - 120_000).toISOString();
  const windowEnd = new Date(ts + 120_000).toISOString();
  const origin = String(row.origin_store_code ?? '').trim();
  const leg = String(row.leg_destination_code || row.destination_code || '').trim().toUpperCase();

  const { data: batchRows, error: batchErr } = await supabase
    .from('inventory_pkg_tracking')
    .select(
      'pack_barcode, trip_number, truck_loaded_at, origin_store_code, leg_destination_code, destination_code',
    )
    .eq('origin_store_code', origin)
    .gte('truck_loaded_at', windowStart)
    .lte('truck_loaded_at', windowEnd);
  if (batchErr) throw new Error(batchErr.message);

  const codes = (batchRows ?? [])
    .filter((s) => {
      const sibling = s as TripSiblingRow;
      if (String(sibling.trip_number ?? '').trim()) return false;
      const siblingLeg = String(
        sibling.leg_destination_code || sibling.destination_code || '',
      )
        .trim()
        .toUpperCase();
      if (leg && siblingLeg !== leg) return false;
      const siblingBatch = loadBatchGroupKey(sibling);
      return siblingBatch === batchKey;
    })
    .map((s) => code(String((s as TripSiblingRow).pack_barcode ?? '')))
    .filter(Boolean);

  if (!codes.includes(packCode)) codes.push(packCode);
  return [...new Set(codes)].sort();
}

/** 同一车次分组键（trip_number 或装车批次；单包则 pack:条码） */
export async function resolveTripGroupKey(packBarcode: string): Promise<string> {
  const packCode = code(packBarcode);
  if (!packCode) return '';
  await ready();

  const { data: pkgRow, error: pkgErr } = await supabase
    .from('inventory_pkg_tracking')
    .select(
      'pack_barcode, trip_number, truck_loaded_at, origin_store_code, leg_destination_code, destination_code',
    )
    .eq('pack_barcode', packCode)
    .maybeSingle();
  if (pkgErr) throw new Error(pkgErr.message);
  if (!pkgRow) return `pack:${packCode}`;

  const row = pkgRow as TripSiblingRow;
  const tripNumber = String(row.trip_number ?? '').trim().toUpperCase();
  if (tripNumber) return `trip:${tripNumber}`;
  const batchKey = loadBatchGroupKey(row);
  if (batchKey) return batchKey;
  return `pack:${packCode}`;
}

function markSiblingCachePaid(barcodes: string[]): void {
  for (const barcode of barcodes) feePaidCache.set(barcode, true);
}

async function anySiblingFeePaid(barcodes: string[]): Promise<boolean> {
  for (const barcode of barcodes) {
    const hit = feePaidCache.get(barcode);
    if (hit !== undefined) {
      if (hit) return true;
      continue;
    }
    const { data, error } = await supabase
      .from('inventory_hub_transport_fee_payments')
      .select('pack_barcode')
      .eq('pack_barcode', barcode)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) {
      markSiblingCachePaid(barcodes);
      return true;
    }
  }
  return false;
}

export async function isHubTransportFeePaid(packBarcode: string): Promise<boolean> {
  const packCode = code(packBarcode);
  if (!packCode) return false;
  const cached = feePaidCache.get(packCode);
  if (cached !== undefined) return cached;

  const siblings = await resolveTripSiblingBarcodes(packCode);
  const paid = await anySiblingFeePaid(siblings);
  if (paid) {
    markSiblingCachePaid(siblings);
    return true;
  }
  feePaidCache.set(packCode, false);
  return false;
}

export async function getHubTransportFeePaidBarcodeSet(): Promise<Set<string>> {
  return new Set((await getAllHubTransportFeePayments()).map((row) => code(row.pack_barcode)));
}
export async function getAllHubTransportFeePayments(): Promise<Array<{
  pack_barcode: string; fee: string; leg_destination: string; origin_store_code: string;
  operator: string; store_code: string; paid_at: string;
}>> {
  await ready();
  const { data, error } = await supabase.from('inventory_hub_transport_fee_payments')
    .select('pack_barcode, fee, leg_destination_code, origin_store_code, operator, store_code, paid_at')
    .order('paid_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    pack_barcode: String(row.pack_barcode), fee: String(row.fee ?? ''),
    leg_destination: String(row.leg_destination_code ?? ''), origin_store_code: String(row.origin_store_code ?? ''),
    operator: String(row.operator ?? ''), store_code: String(row.store_code ?? ''),
    paid_at: String(row.paid_at),
  }));
}
export async function markHubTransportFeePaid(params: {
  packBarcode: string; fee: string; legDestination: string; originStoreCode: string;
  operator: string; store: InventoryStoreSession;
}): Promise<void> {
  const fee = parseTransportFeeAmount(params.fee);
  if (!code(params.packBarcode)) throw svc('invalidPackBarcode');
  if (fee <= 0) throw svc('packNoTransportFee');
  await ready();

  const siblings = await resolveTripSiblingBarcodes(params.packBarcode);
  if (await anySiblingFeePaid(siblings)) {
    markSiblingCachePaid(siblings);
    return;
  }

  const primaryBarcode = code(params.packBarcode);
  await upsertCloudTransportFeePayment({
    packBarcode: primaryBarcode,
    fee: String(fee),
    legDestination: params.legDestination,
    originStoreCode: params.originStoreCode,
    operator: params.operator,
    storeCode: params.store.storeCode,
    paidAt: new Date().toISOString(),
  });
  markSiblingCachePaid(siblings);
}

/** Kept for API compatibility; there is no local queue to push. */
export async function pushLocalTransportFeePaymentsToCloud(): Promise<void> {}
