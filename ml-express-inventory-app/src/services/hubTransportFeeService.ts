import type { InventoryStoreSession } from './authService';
import { upsertCloudTransportFeePayment } from './inventoryCloudApi';
import { getDatabase, nowIso } from './database';

export function parseTransportFeeAmount(raw: string | undefined | null): number {
  if (!raw?.trim()) return 0;
  const n = Number(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function formatTransportFeeDisplay(raw: string | undefined | null): string {
  const n = parseTransportFeeAmount(raw);
  if (n <= 0) return '未登记';
  return `${n % 1 === 0 ? n : n.toFixed(2)} MMK`;
}

function normalizePackBarcode(barcode: string): string {
  return barcode.trim().toUpperCase();
}

export async function isHubTransportFeePaid(packBarcode: string): Promise<boolean> {
  const code = normalizePackBarcode(packBarcode);
  if (!code) return false;
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ pack_barcode: string }>(
    'SELECT pack_barcode FROM hub_transport_fee_payments WHERE pack_barcode = ?',
    [code],
  );
  return Boolean(row?.pack_barcode);
}

export async function getHubTransportFeePaidBarcodeSet(): Promise<Set<string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ pack_barcode: string }>(
    'SELECT pack_barcode FROM hub_transport_fee_payments',
  );
  return new Set(rows.map((r) => normalizePackBarcode(r.pack_barcode)).filter(Boolean));
}

export async function getAllHubTransportFeePayments(): Promise<
  Array<{
    pack_barcode: string;
    fee: string;
    leg_destination: string;
    origin_store_code: string;
    operator: string;
    store_code: string;
    paid_at: string;
  }>
> {
  const db = await getDatabase();
  return await db.getAllAsync<{
    pack_barcode: string;
    fee: string;
    leg_destination: string;
    origin_store_code: string;
    operator: string;
    store_code: string;
    paid_at: string;
  }>(
    'SELECT pack_barcode, fee, leg_destination, origin_store_code, operator, store_code, paid_at FROM hub_transport_fee_payments',
  );
}

export async function markHubTransportFeePaid(params: {
  packBarcode: string;
  fee: string;
  legDestination: string;
  originStoreCode: string;
  operator: string;
  store: InventoryStoreSession;
}): Promise<void> {
  const code = normalizePackBarcode(params.packBarcode);
  if (!code) throw new Error('包装号无效');

  const feeAmount = parseTransportFeeAmount(params.fee);
  if (feeAmount <= 0) throw new Error('该快递包未登记车费，无法支付');

  const db = await getDatabase();
  const paidAt = nowIso();
  await db.runAsync(
    `INSERT INTO hub_transport_fee_payments
     (pack_barcode, fee, leg_destination, origin_store_code, operator, store_code, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(pack_barcode) DO UPDATE SET
       fee = excluded.fee,
       leg_destination = excluded.leg_destination,
       origin_store_code = excluded.origin_store_code,
       operator = excluded.operator,
       store_code = excluded.store_code,
       paid_at = excluded.paid_at`,
    [
      code,
      String(feeAmount),
      params.legDestination.trim().toUpperCase(),
      params.originStoreCode.trim().toUpperCase(),
      params.operator.trim(),
      params.store.storeCode.trim().toUpperCase(),
      paidAt,
    ],
  );

  try {
    await upsertCloudTransportFeePayment({
      packBarcode: code,
      fee: String(feeAmount),
      legDestination: params.legDestination,
      originStoreCode: params.originStoreCode,
      operator: params.operator,
      storeCode: params.store.storeCode,
      paidAt,
    });
  } catch {
    // 本地已登记；云端同步失败时不阻断支付操作
  }
}

/** 将本机已登记的车费支付记录推送到云端（登录/同步时调用） */
export async function pushLocalTransportFeePaymentsToCloud(): Promise<void> {
  const rows = await getAllHubTransportFeePayments();
  for (const row of rows) {
    try {
      await upsertCloudTransportFeePayment({
        packBarcode: row.pack_barcode,
        fee: row.fee,
        legDestination: row.leg_destination,
        originStoreCode: row.origin_store_code,
        operator: row.operator,
        storeCode: row.store_code,
        paidAt: row.paid_at,
      });
    } catch {
      // 单条失败不阻断其余记录
    }
  }
}
