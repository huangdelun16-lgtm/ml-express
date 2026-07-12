import type { InventoryStoreSession } from './authService';
import { ensureInventoryCloudAuth } from './authService';
import { svc } from '../errors/serviceError';
import { upsertCloudTransportFeePayment } from './inventoryCloudApi';
import { supabase } from './supabase';
import { isCloudReachable } from '../utils/networkReachability';

export function parseTransportFeeAmount(raw: string | undefined | null): number {
  const n = Number((raw ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
export function formatTransportFeeDisplay(raw: string | undefined | null): string {
  const n = parseTransportFeeAmount(raw);
  return n > 0 ? `${n % 1 === 0 ? n : n.toFixed(2)} MMK` : '未登记';
}
function code(value: string): string { return value.trim().toUpperCase(); }
async function ready(): Promise<void> {
  if (!(await isCloudReachable())) throw new Error('网络不可用，无法连接 Supabase。请恢复网络后重试。');
  await ensureInventoryCloudAuth();
}
export async function isHubTransportFeePaid(packBarcode: string): Promise<boolean> {
  const rows = await getAllHubTransportFeePayments();
  return rows.some((row) => code(row.pack_barcode) === code(packBarcode));
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
  await upsertCloudTransportFeePayment({
    packBarcode: code(params.packBarcode), fee: String(fee), legDestination: params.legDestination,
    originStoreCode: params.originStoreCode, operator: params.operator,
    storeCode: params.store.storeCode, paidAt: new Date().toISOString(),
  });
}
/** Kept for API compatibility; there is no local queue to push. */
export async function pushLocalTransportFeePaymentsToCloud(): Promise<void> {}
