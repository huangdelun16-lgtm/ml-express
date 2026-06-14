import type { InventoryItem, StockMovement } from '../types/inventory';
import type { InventoryStoreSession } from './authService';
import { getDatabase, newId, nowIso } from './database';
import { isSupabaseConfigured } from './supabase';

export type TruckLoadQueueOrigin = { id: string; storeCode: string; storeName: string };

export type CloudSyncQueuePayload =
  | {
      type: 'item_and_movement';
      store: InventoryStoreSession;
      itemId: string;
      movementId?: string;
    }
  | {
      type: 'packed_shipment';
      store: InventoryStoreSession;
      packId: string;
    }
  | {
      type: 'truck_load';
      store: InventoryStoreSession;
      originStore: TruckLoadQueueOrigin;
      destinationCode: string;
      outboundDate: string;
      packBarcodes: string[];
      totalWeightKg: string;
      transportFee?: string;
    };

function rowToItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: String(row.id),
    barcode: String(row.barcode),
    input_barcode: String(row.input_barcode ?? ''),
    name: String(row.name),
    spec: String(row.spec ?? ''),
    unit: String(row.unit ?? ''),
    weight: String(row.weight ?? ''),
    qty_on_hand: Number(row.qty_on_hand) || 0,
    min_qty: Number(row.min_qty) || 0,
    note: String(row.note ?? ''),
    owner_store_code: String(row.owner_store_code ?? ''),
    recipient_name: String(row.recipient_name ?? ''),
    final_destination: String(row.final_destination ?? ''),
    hub_arrived_at: String(row.hub_arrived_at ?? ''),
    customer_signed_at: String(row.customer_signed_at ?? ''),
    packed_at: String(row.packed_at ?? ''),
    packed_bundle_barcode: String(row.packed_bundle_barcode ?? ''),
    hub_transit_released_at: String(row.hub_transit_released_at ?? ''),
    hub_transit_shipped_at: String(row.hub_transit_shipped_at ?? ''),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function rowToMovement(row: Record<string, unknown>): StockMovement {
  return {
    id: String(row.id),
    item_id: String(row.item_id),
    barcode: String(row.barcode),
    item_name: String(row.item_name),
    type: row.type as StockMovement['type'],
    qty: Number(row.qty) || 0,
    qty_before: Number(row.qty_before) || 0,
    qty_after: Number(row.qty_after) || 0,
    operator: String(row.operator),
    note: String(row.note ?? ''),
    recipient_name: String(row.recipient_name ?? ''),
    recipient_phone: String(row.recipient_phone ?? ''),
    destination: String(row.destination ?? ''),
    detail_address: String(row.detail_address ?? ''),
    packaging: String(row.packaging ?? ''),
    input_barcode: String(row.input_barcode ?? ''),
    origin_store_id: String(row.origin_store_id ?? ''),
    origin_store_code: String(row.origin_store_code ?? ''),
    origin_store_name: String(row.origin_store_name ?? ''),
    created_at: String(row.created_at),
  };
}

async function loadItem(itemId: string): Promise<InventoryItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM inventory_items WHERE id = ?',
    [itemId],
  );
  return row ? rowToItem(row) : null;
}

async function loadMovement(movementId: string): Promise<StockMovement | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM stock_movements WHERE id = ?',
    [movementId],
  );
  return row ? rowToMovement(row) : null;
}

export async function executeCloudSyncOp(payload: CloudSyncQueuePayload): Promise<void> {
  const {
    pushItemAndMovementToCloud,
    pushPackedShipmentToCloud,
    pushTruckLoadToCloud,
  } = await import('./inventoryCloudSync');

  switch (payload.type) {
    case 'item_and_movement': {
      const item = await loadItem(payload.itemId);
      if (!item) throw new Error('本地商品不存在');
      let movement: StockMovement | undefined;
      if (payload.movementId) {
        const m = await loadMovement(payload.movementId);
        if (m) movement = m;
      }
      await pushItemAndMovementToCloud(payload.store, item, movement);
      return;
    }
    case 'packed_shipment':
      await pushPackedShipmentToCloud(payload.store, payload.packId);
      return;
    case 'truck_load': {
      const {
        buildOrderInboundSnapshots,
        getPackedShipmentByBarcode,
      } = await import('./inventoryService');
      const packs = [];
      for (const bc of payload.packBarcodes) {
        const pack = await getPackedShipmentByBarcode(bc);
        if (pack) packs.push(pack);
      }
      if (packs.length === 0) throw new Error('本地快递包不存在');
      const orderSnapshots = await buildOrderInboundSnapshots(packs);
      await pushTruckLoadToCloud({
        store: payload.store,
        originStore: payload.originStore,
        destinationCode: payload.destinationCode,
        outboundDate: payload.outboundDate,
        packs,
        totalWeightKg: payload.totalWeightKg,
        transportFee: payload.transportFee,
        orderSnapshots,
      });
      return;
    }
    default:
      throw new Error('未知同步类型');
  }
}

function dedupeKey(payload: CloudSyncQueuePayload): string {
  switch (payload.type) {
    case 'item_and_movement':
      return `item:${payload.itemId}:${payload.movementId ?? ''}`;
    case 'packed_shipment':
      return `pack:${payload.packId}`;
    case 'truck_load':
      return `truck:${payload.packBarcodes.join(',')}:${payload.outboundDate}`;
    default:
      return newId();
  }
}

export async function getQueuedLocalPackIds(): Promise<Set<string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM cloud_sync_queue');
  const ids = new Set<string>();
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload) as CloudSyncQueuePayload;
      if (payload.type === 'packed_shipment') ids.add(payload.packId);
    } catch {
      // ignore corrupt row
    }
  }
  return ids;
}

export async function getQueuedLocalItemIds(): Promise<Set<string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM cloud_sync_queue');
  const ids = new Set<string>();
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload) as CloudSyncQueuePayload;
      if (payload.type === 'item_and_movement') ids.add(payload.itemId);
    } catch {
      // ignore corrupt row
    }
  }
  return ids;
}

export async function clearCloudSyncQueue(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM cloud_sync_queue');
  await db.execAsync('DELETE FROM cloud_sync_queue');
  return Number(row?.c) || 0;
}

export async function enqueueCloudSync(payload: CloudSyncQueuePayload): Promise<void> {
  const db = await getDatabase();
  const key = dedupeKey(payload);
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM cloud_sync_queue ORDER BY created_at ASC',
  );
  for (const row of rows) {
    try {
      const existing = JSON.parse(row.payload) as CloudSyncQueuePayload;
      if (dedupeKey(existing) === key) return;
    } catch {
      // ignore corrupt row
    }
  }

  await db.runAsync(
    `INSERT INTO cloud_sync_queue (id, op_type, payload, created_at, attempts, last_error)
     VALUES (?, ?, ?, ?, 0, '')`,
    [newId(), payload.type, JSON.stringify(payload), nowIso()],
  );
}

export async function getCloudSyncPendingCount(storeCode?: string): Promise<number> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM cloud_sync_queue');
  if (!storeCode?.trim()) return rows.length;
  const code = storeCode.trim().toUpperCase();
  let count = 0;
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload) as CloudSyncQueuePayload;
      if (payload.store.storeCode.trim().toUpperCase() === code) count += 1;
    } catch {
      count += 1;
    }
  }
  return count;
}

/** 按序重试离线队列；失败项保留并停止后续（保证顺序） */
export async function processCloudSyncQueue(store: InventoryStoreSession): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    payload: string;
    attempts: number;
  }>('SELECT id, payload, attempts FROM cloud_sync_queue ORDER BY created_at ASC');

  const storeCode = store.storeCode.trim().toUpperCase();
  let processed = 0;

  for (const row of rows) {
    let payload: CloudSyncQueuePayload;
    try {
      payload = JSON.parse(row.payload) as CloudSyncQueuePayload;
    } catch {
      await db.runAsync('DELETE FROM cloud_sync_queue WHERE id = ?', [row.id]);
      continue;
    }

    if (payload.store.storeCode.trim().toUpperCase() !== storeCode) continue;

    try {
      await executeCloudSyncOp(payload);
      await db.runAsync('DELETE FROM cloud_sync_queue WHERE id = ?', [row.id]);
      processed += 1;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '同步失败';
      await db.runAsync(
        'UPDATE cloud_sync_queue SET attempts = ?, last_error = ? WHERE id = ?',
        [Number(row.attempts) + 1, msg, row.id],
      );
      break;
    }
  }

  return processed;
}

/** 立即尝试上云；失败则写入离线队列 */
export function scheduleCloudSync(payload: CloudSyncQueuePayload): void {
  if (!isSupabaseConfigured()) return;
  void (async () => {
    try {
      await executeCloudSyncOp(payload);
    } catch {
      await enqueueCloudSync(payload);
    }
  })();
}
