import type { InventoryItem, StockMovement } from '../types/inventory';
import { isServiceError, svc } from '../errors/serviceError';
import { ensureInventoryCloudAuth, type InventoryStoreSession } from './authService';
import { requestAutoCloudSync } from './cloudAutoSync';
import { getDatabase, newId, nowIso } from './database';
import { isSupabaseConfigured } from './supabase';
import { resolveStoreHubCode } from '../utils/storeZone';
import { queueOpPriority } from '../utils/cloudSyncSla';

export type CloudSyncOpType = 'truck_load' | 'packed_shipment' | 'item_and_movement';

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

export async function executeCloudSyncOp(
  payload: CloudSyncQueuePayload,
  store: InventoryStoreSession,
): Promise<void> {
  const {
    pushItemAndMovementToCloud,
    pushPackedShipmentToCloud,
    pushTruckLoadToCloud,
  } = await import('./inventoryCloudSync');

  switch (payload.type) {
    case 'item_and_movement': {
      const item = await loadItem(payload.itemId);
      if (!item) throw svc('localItemNotFound');
      let movement: StockMovement | undefined;
      if (payload.movementId) {
        const m = await loadMovement(payload.movementId);
        if (m) movement = m;
      }
      await pushItemAndMovementToCloud(store, item, movement);
      return;
    }
    case 'packed_shipment':
      await pushPackedShipmentToCloud(store, payload.packId);
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
      if (packs.length === 0) throw svc('localPackNotFound');
      const orderSnapshots = await buildOrderInboundSnapshots(packs);
      await pushTruckLoadToCloud({
        store,
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
      throw svc('unknownSyncType');
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

  if (payload.type === 'truck_load') {
    const hub = resolveStoreHubCode(payload.store);
    if (hub) requestAutoCloudSync(payload.store, hub, { force: true });
  }
}

export async function getCloudSyncPendingCount(storeCode?: string): Promise<number> {
  const snapshot = await getCloudSyncQueueSnapshot(storeCode ?? '');
  return snapshot.pending;
}

export type CloudSyncQueueSnapshot = {
  pending: number;
  lastError: string | null;
  oldestType: string | null;
  highestPriorityType: CloudSyncOpType | null;
  pendingTruckLoad: number;
  pendingPack: number;
  pendingItem: number;
};

function sortQueueRows<
  T extends { op_type: string; created_at: string; payload: string },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byPriority = queueOpPriority(a.op_type) - queueOpPriority(b.op_type);
    if (byPriority !== 0) return byPriority;
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function getCloudSyncQueueSnapshot(
  storeCode: string,
): Promise<CloudSyncQueueSnapshot> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    payload: string;
    last_error: string;
    op_type: string;
    created_at: string;
  }>(
    'SELECT payload, last_error, op_type, created_at FROM cloud_sync_queue ORDER BY created_at ASC',
  );

  const code = storeCode.trim().toUpperCase();
  const empty: CloudSyncQueueSnapshot = {
    pending: 0,
    lastError: null,
    oldestType: null,
    highestPriorityType: null,
    pendingTruckLoad: 0,
    pendingPack: 0,
    pendingItem: 0,
  };
  if (!code) {
    return {
      ...empty,
      pending: rows.length,
      oldestType: (rows[0]?.op_type as CloudSyncOpType) ?? null,
      highestPriorityType: (rows[0]?.op_type as CloudSyncOpType) ?? null,
    };
  }

  let pending = 0;
  let lastError: string | null = null;
  let oldestType: CloudSyncOpType | null = null;
  let pendingTruckLoad = 0;
  let pendingPack = 0;
  let pendingItem = 0;
  const matched: typeof rows = [];

  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload) as CloudSyncQueuePayload;
      if (payload.store.storeCode.trim().toUpperCase() !== code) continue;
      matched.push(row);
      pending += 1;
      if (row.op_type === 'truck_load') pendingTruckLoad += 1;
      else if (row.op_type === 'packed_shipment') pendingPack += 1;
      else pendingItem += 1;
      const err = String(row.last_error ?? '').trim();
      if (err && !lastError) lastError = err;
    } catch {
      matched.push(row);
      pending += 1;
      pendingItem += 1;
    }
  }

  const sorted = sortQueueRows(matched);
  if (sorted[0]) {
    oldestType = sorted[0].op_type as CloudSyncOpType;
  }

  return {
    pending,
    lastError,
    oldestType,
    highestPriorityType:
      pendingTruckLoad > 0
        ? 'truck_load'
        : pendingPack > 0
          ? 'packed_shipment'
          : pendingItem > 0
            ? 'item_and_movement'
            : null,
    pendingTruckLoad,
    pendingPack,
    pendingItem,
  };
}

/** 按业务优先级 + 时间序重试离线队列；失败项保留并停止后续 */
export async function processCloudSyncQueue(store: InventoryStoreSession): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    payload: string;
    attempts: number;
    op_type: string;
    created_at: string;
  }>(
    'SELECT id, payload, attempts, op_type, created_at FROM cloud_sync_queue ORDER BY created_at ASC',
  );

  const storeCode = store.storeCode.trim().toUpperCase();
  const storeRows = rows.filter((row) => {
    try {
      const payload = JSON.parse(row.payload) as CloudSyncQueuePayload;
      return payload.store.storeCode.trim().toUpperCase() === storeCode;
    } catch {
      return true;
    }
  });
  const ordered = sortQueueRows(storeRows);
  let processed = 0;

  for (const row of ordered) {
    let payload: CloudSyncQueuePayload;
    try {
      payload = JSON.parse(row.payload) as CloudSyncQueuePayload;
    } catch {
      await db.runAsync('DELETE FROM cloud_sync_queue WHERE id = ?', [row.id]);
      continue;
    }

    try {
      await executeCloudSyncOp(payload, store);
      await db.runAsync('DELETE FROM cloud_sync_queue WHERE id = ?', [row.id]);
      processed += 1;
    } catch (e: unknown) {
      const msg = isServiceError(e)
        ? e.code
        : e instanceof Error
          ? e.message
          : 'syncFailed';
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
      const authStore = await ensureInventoryCloudAuth();
      await executeCloudSyncOp(payload, authStore);
    } catch {
      await enqueueCloudSync(payload);
      const hub = resolveStoreHubCode(payload.store);
      if (hub) requestAutoCloudSync(payload.store, hub);
    }
  })();
}
