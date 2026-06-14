import type { InventoryStoreSession } from './authService';
import { getDatabase, newId, nowIso } from './database';
import {
  fetchCloudMovementsForItems,
  fetchCloudPackedShipments,
  fetchCloudStoreItems,
  fetchCloudItemUpdatedAt,
  getCloudItemIdByBarcode,
  insertCloudStockMovement,
  upsertCloudPackedShipment,
  upsertCloudStoreItem,
  type CloudMovementRow,
  type CloudPackRow,
  type CloudStoreItemRow,
} from './inventoryCloudApi';
import type { InventoryItem, PackedShipmentDetail, StockMovement } from '../types/inventory';
import { isSupabaseConfigured, supabase } from './supabase';
import {
  listOutboundPackagesFromOrigin,
  pushTruckLoadTracking,
  type OrderInboundSnapshot,
} from './trackingService';
import { processCloudSyncQueue } from './inventoryCloudQueue';

let syncInFlight: Promise<void> | null = null;

function tsMs(value: string | undefined | null): number {
  if (!value?.trim()) return 0;
  const n = new Date(value).getTime();
  return Number.isNaN(n) ? 0 : n;
}

function emptyTs(value?: string | null): string {
  return value?.trim() ? value.trim() : '';
}

/** 中转站/目的站到站入库流水（与发站「打包入」出库区分） */
const HUB_STATION_INBOUND_NOTE_SQL = `(
  note LIKE '%中转站到站%' OR note LIKE '%中转站释放%' OR note LIKE '%到站交付%'
)`;

async function hasHubStationInboundMovement(itemId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM stock_movements
     WHERE item_id = ? AND type = 'in' AND ${HUB_STATION_INBOUND_NOTE_SQL}`,
    [itemId],
  );
  return Number(row?.c) > 0;
}

async function mergeCloudItem(row: CloudStoreItemRow): Promise<void> {
  const db = await getDatabase();
  const local = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM inventory_items WHERE barcode = ?',
    [row.barcode],
  );
  const cloudUpdated = tsMs(row.updated_at);
  const localUpdated = local ? tsMs(String(local.updated_at)) : 0;

  if (local && localUpdated > cloudUpdated) return;

  const localQty = local ? Number(local.qty_on_hand) || 0 : 0;
  const cloudQty = Number(row.qty_on_hand) || 0;
  const localTransitReleased = local
    ? String(local.hub_transit_released_at ?? '').trim()
    : '';
  const localTransitShipped = local
    ? String(local.hub_transit_shipped_at ?? '').trim()
    : '';
  if ((localTransitReleased || localTransitShipped) && localQty > 0) {
    row.qty_on_hand = localQty;
  }
  const localItemId = local ? String(local.id) : '';
  const localHubInbound = localItemId ? await hasHubStationInboundMovement(localItemId) : false;
  if (localHubInbound && localQty > 0) {
    row.qty_on_hand = localQty;
  }
  if (
    local &&
    localQty === 0 &&
    cloudQty > 0 &&
    !localTransitReleased &&
    !localTransitShipped &&
    !localHubInbound
  ) {
    const inPack = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) AS c FROM packed_shipment_items WHERE item_id = ?',
      [localItemId],
    );
    const packOut = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) AS c FROM stock_movements
       WHERE item_id = ? AND type = 'out' AND note LIKE '打包入 %'`,
      [localItemId],
    );
    const cloudPacked = Boolean(row.packed_at?.trim()) || Boolean(row.packed_bundle_barcode?.trim());
    if (Number(inPack?.c) > 0 || Number(packOut?.c) > 0 || cloudPacked) {
      row.qty_on_hand = 0;
    }
  }

  const cloudPackedAt = emptyTs(row.packed_at);
  const cloudPackedBundle = String(row.packed_bundle_barcode ?? '').trim();
  if (cloudPackedAt || cloudPackedBundle) {
    if (localTransitReleased || localTransitShipped || localHubInbound) {
      if (localQty > 0) row.qty_on_hand = localQty;
    } else if (!localHubInbound) {
      row.qty_on_hand = 0;
    }
  }

  const hubArrived = emptyTs(row.hub_arrived_at);
  const signedAt = emptyTs(row.customer_signed_at);
  const packedAt =
    cloudPackedAt ||
    (local ? String(local.packed_at ?? '').trim() : '');
  const packedBundle =
    cloudPackedBundle ||
    (local ? String(local.packed_bundle_barcode ?? '').trim() : '');
  const transitReleasedAt =
    localTransitReleased || emptyTs(row.hub_transit_released_at);
  const transitShippedAt =
    localTransitShipped || emptyTs(row.hub_transit_shipped_at);
  const ts = row.updated_at || nowIso();
  const created = row.created_at || ts;

  if (local) {
    await db.runAsync(
      `UPDATE inventory_items SET
         input_barcode = ?, name = ?, spec = ?, unit = ?, weight = ?,
         qty_on_hand = ?, min_qty = ?, note = ?, owner_store_code = ?,
         recipient_name = ?, final_destination = ?,
         hub_arrived_at = ?, customer_signed_at = ?,
         packed_at = ?, packed_bundle_barcode = ?,
         hub_transit_released_at = ?, hub_transit_shipped_at = ?, updated_at = ?
       WHERE barcode = ?`,
      [
        row.input_barcode,
        row.name,
        row.spec,
        row.unit,
        row.weight,
        row.qty_on_hand,
        row.min_qty,
        row.note,
        row.owner_store_code,
        row.recipient_name,
        row.final_destination,
        hubArrived,
        signedAt,
        packedAt,
        packedBundle,
        transitReleasedAt,
        transitShippedAt,
        ts,
        row.barcode,
      ],
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO inventory_items
     (id, barcode, input_barcode, name, spec, unit, weight, qty_on_hand, min_qty, note,
      owner_store_code, recipient_name, final_destination, hub_arrived_at, customer_signed_at,
      packed_at, packed_bundle_barcode, hub_transit_released_at, hub_transit_shipped_at,
      created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.barcode,
      row.input_barcode,
      row.name,
      row.spec,
      row.unit,
      row.weight,
      row.qty_on_hand,
      row.min_qty,
      row.note,
      row.owner_store_code,
      row.recipient_name,
      row.final_destination,
      hubArrived,
      signedAt,
      packedAt,
      packedBundle,
      transitReleasedAt,
      transitShippedAt,
      created,
      ts,
    ],
  );
}

async function mergeCloudMovement(row: CloudMovementRow, localItemId: string): Promise<void> {
  const db = await getDatabase();
  const dupId = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM stock_movements WHERE id = ?',
    [row.id],
  );
  if (Number(dupId?.c) > 0) return;

  const dup = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM stock_movements
     WHERE item_id = ? AND type = ? AND created_at = ? AND qty = ?`,
    [localItemId, row.type, row.created_at, row.qty],
  );
  if (Number(dup?.c) > 0) return;

  await db.runAsync(
    `INSERT INTO stock_movements
     (id, item_id, barcode, item_name, type, qty, qty_before, qty_after, operator, note,
      recipient_name, recipient_phone, destination, detail_address, packaging, input_barcode,
      origin_store_id, origin_store_code, origin_store_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      localItemId,
      row.barcode,
      row.item_name,
      row.type,
      row.qty,
      row.qty_before,
      row.qty_after,
      row.operator,
      row.note,
      row.recipient_name,
      row.recipient_phone,
      row.destination,
      row.detail_address,
      row.packaging,
      row.input_barcode,
      row.origin_store_id ?? '',
      row.origin_store_code,
      row.origin_store_name,
      row.created_at,
    ],
  );
}

async function mergeCloudPack(row: CloudPackRow): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM packed_shipments WHERE bundle_barcode = ?',
    [row.bundle_barcode],
  );

  let packId = existing?.id ?? row.id;
  const cloudUpdated = tsMs(row.updated_at);
  if (existing) {
    const localPack = await db.getFirstAsync<{ updated_at: string }>(
      `SELECT i.updated_at FROM packed_shipments p
       INNER JOIN inventory_items i ON i.id = p.bundle_item_id
       WHERE p.id = ?`,
      [existing.id],
    );
    const localUpdated = tsMs(localPack?.updated_at);
    if (localUpdated > cloudUpdated) return;
    await db.runAsync(
      `UPDATE packed_shipments SET
         bundle_name = ?, operator = ?, note = ?, owner_store_code = ?,
         transport_fee = ?, truck_leg_destination = ?
       WHERE id = ?`,
      [
        row.bundle_name,
        row.operator,
        row.note,
        row.owner_store_code,
        row.transport_fee ?? '',
        row.truck_leg_destination ?? '',
        packId,
      ],
    );
  } else {
    let bundleItemId = '';
    const bundleItem = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM inventory_items WHERE barcode = ?',
      [row.bundle_barcode],
    );
    if (bundleItem?.id) {
      bundleItemId = bundleItem.id;
    } else {
      bundleItemId = row.bundle_item_id ?? newId();
      const ts = row.created_at || nowIso();
      await db.runAsync(
        `INSERT INTO inventory_items
         (id, barcode, name, spec, unit, weight, qty_on_hand, min_qty, note, owner_store_code, created_at, updated_at)
         VALUES (?, ?, ?, '', '1 Pcs', '', 0, 0, '', ?, ?, ?)`,
        [bundleItemId, row.bundle_barcode, row.bundle_name, row.owner_store_code, ts, ts],
      );
    }
    await db.runAsync(
      `INSERT INTO packed_shipments
       (id, bundle_item_id, bundle_barcode, bundle_name, operator, note, owner_store_code,
        transport_fee, truck_leg_destination, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        packId,
        bundleItemId,
        row.bundle_barcode,
        row.bundle_name,
        row.operator,
        row.note,
        row.owner_store_code,
        row.transport_fee ?? '',
        row.truck_leg_destination ?? '',
        row.created_at,
      ],
    );
  }

  await db.runAsync('DELETE FROM packed_shipment_items WHERE pack_id = ?', [packId]);
  const lines = row.inventory_packed_shipment_items ?? [];
  for (const line of lines) {
    const localItem = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM inventory_items WHERE barcode = ?',
      [line.item_barcode],
    );
    await db.runAsync(
      `INSERT INTO packed_shipment_items (id, pack_id, item_id, item_barcode, item_name, qty)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        line.id || newId(),
        packId,
        localItem?.id ?? '',
        line.item_barcode,
        line.item_name,
        line.qty,
      ],
    );
  }

  await syncPackedFlagsFromPackLines(packId, row.bundle_barcode, row.created_at || nowIso());
}

/** 合并云端快递包后，同步订单打包标记与库存（多设备一致） */
async function syncPackedFlagsFromPackLines(
  packId: string,
  bundleBarcode: string,
  packedAt: string,
): Promise<void> {
  const db = await getDatabase();
  const ts = packedAt.trim() || nowIso();
  const code = bundleBarcode.trim();
  const lines = await db.getAllAsync<{ item_id: string; item_barcode: string }>(
    `SELECT item_id, item_barcode FROM packed_shipment_items WHERE pack_id = ?`,
    [packId],
  );
  for (const line of lines) {
    let itemId = line.item_id?.trim();
    if (!itemId && line.item_barcode?.trim()) {
      const found = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM inventory_items WHERE barcode = ?',
        [line.item_barcode.trim()],
      );
      itemId = found?.id ?? '';
    }
    if (!itemId) continue;

    await db.runAsync(
      `UPDATE inventory_items
       SET packed_at = CASE WHEN TRIM(COALESCE(packed_at, '')) = '' THEN ? ELSE packed_at END,
           packed_bundle_barcode = CASE WHEN TRIM(COALESCE(packed_bundle_barcode, '')) = '' THEN ? ELSE packed_bundle_barcode END,
           updated_at = ?
       WHERE id = ?`,
      [ts, code, ts, itemId],
    );

    const qtyRow = await db.getFirstAsync<{ qty_on_hand: number }>(
      'SELECT qty_on_hand FROM inventory_items WHERE id = ?',
      [itemId],
    );
    const packOut = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) AS c FROM stock_movements
       WHERE item_id = ? AND type = 'out' AND note LIKE '打包入 %'`,
      [itemId],
    );
    const hubInbound = await hasHubStationInboundMovement(itemId);
    const releasedRow = await db.getFirstAsync<{ v: string }>(
      'SELECT hub_transit_released_at AS v FROM inventory_items WHERE id = ?',
      [itemId],
    );
    const transitReleased = Boolean(releasedRow?.v?.trim());
    if (
      Number(qtyRow?.qty_on_hand) > 0 &&
      Number(packOut?.c) > 0 &&
      !hubInbound &&
      !transitReleased
    ) {
      await db.runAsync(
        'UPDATE inventory_items SET qty_on_hand = 0, updated_at = ? WHERE id = ?',
        [ts, itemId],
      );
    }
  }
}

async function reconcilePackedItemStateFromCloud(): Promise<void> {
  const db = await getDatabase();
  const packs = await db.getAllAsync<{
    id: string;
    bundle_barcode: string;
    created_at: string;
  }>('SELECT id, bundle_barcode, created_at FROM packed_shipments');
  for (const pack of packs) {
    await syncPackedFlagsFromPackLines(pack.id, pack.bundle_barcode, pack.created_at);
  }
}

async function bundleItemLoadedAt(bundleItemId: string, fallbackTs: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ qty_on_hand: number }>(
    'SELECT qty_on_hand FROM inventory_items WHERE id = ?',
    [bundleItemId],
  );
  return Number(row?.qty_on_hand) === 0 ? fallbackTs : null;
}

async function pushLocalItemsForStore(store: InventoryStoreSession, hubCode: string): Promise<void> {
  const db = await getDatabase();
  const storeCode = store.storeCode.trim().toUpperCase();
  const hub = hubCode.trim().toUpperCase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM inventory_items
     WHERE UPPER(owner_store_code) = ? OR UPPER(final_destination) = ?`,
    [storeCode, hub],
  );
  for (const row of rows) {
    const item: InventoryItem = {
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

    const cloudUpdatedAt = await fetchCloudItemUpdatedAt(item.barcode);
    if (cloudUpdatedAt && tsMs(item.updated_at) < tsMs(cloudUpdatedAt)) continue;

    const cloudId = await upsertCloudStoreItem(store, item);
    const movements = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM stock_movements WHERE item_id = ? ORDER BY created_at DESC LIMIT 20`,
      [item.id],
    );
    for (const m of movements) {
      const movement: StockMovement = {
        id: String(m.id),
        item_id: String(m.item_id),
        barcode: String(m.barcode),
        item_name: String(m.item_name),
        type: m.type as StockMovement['type'],
        qty: Number(m.qty) || 0,
        qty_before: Number(m.qty_before) || 0,
        qty_after: Number(m.qty_after) || 0,
        operator: String(m.operator),
        note: String(m.note ?? ''),
        recipient_name: String(m.recipient_name ?? ''),
        recipient_phone: String(m.recipient_phone ?? ''),
        destination: String(m.destination ?? ''),
        detail_address: String(m.detail_address ?? ''),
        packaging: String(m.packaging ?? ''),
        input_barcode: String(m.input_barcode ?? ''),
        origin_store_id: String(m.origin_store_id ?? ''),
        origin_store_code: String(m.origin_store_code ?? ''),
        origin_store_name: String(m.origin_store_name ?? ''),
        created_at: String(m.created_at),
      };
      await insertCloudStockMovement(cloudId, movement);
    }
  }

  const packs = await db.getAllAsync<Record<string, unknown>>(
    `SELECT DISTINCT p.* FROM packed_shipments p
     LEFT JOIN packed_shipment_items psi ON psi.pack_id = p.id
     LEFT JOIN inventory_items i ON i.id = psi.item_id
     WHERE UPPER(p.owner_store_code) = ? OR UPPER(i.final_destination) = ?`,
    [storeCode, hub],
  );
  for (const packRow of packs) {
    const packId = String(packRow.id);
    const lineRows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM packed_shipment_items WHERE pack_id = ?',
      [packId],
    );
    const bundleCloudId = await getCloudItemIdByBarcode(String(packRow.bundle_barcode));
    const lines = lineRows.map((l) => ({
      item_barcode: String(l.item_barcode),
      item_name: String(l.item_name),
      qty: Number(l.qty) || 1,
      cloud_item_id: null as string | null,
    }));
    for (const line of lines) {
      line.cloud_item_id = await getCloudItemIdByBarcode(line.item_barcode);
    }
    const loadedAt = await bundleItemLoadedAt(String(packRow.bundle_item_id), String(packRow.created_at));
    await upsertCloudPackedShipment(
      store,
      {
        id: packId,
        bundle_item_id: String(packRow.bundle_item_id),
        bundle_barcode: String(packRow.bundle_barcode),
        bundle_name: String(packRow.bundle_name),
        operator: String(packRow.operator),
        note: String(packRow.note ?? ''),
        owner_store_code: String(packRow.owner_store_code ?? ''),
        transport_fee: String(packRow.transport_fee ?? ''),
        truck_leg_destination: String(packRow.truck_leg_destination ?? ''),
        created_at: String(packRow.created_at),
      },
      bundleCloudId,
      lines,
      loadedAt,
    );
  }
}

async function deleteLocalItemCascade(itemId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM packed_shipment_items WHERE item_id = ?', [itemId]);
  await db.runAsync('DELETE FROM stock_movements WHERE item_id = ?', [itemId]);
  await db.runAsync('DELETE FROM inventory_items WHERE id = ?', [itemId]);
}

/** 云端权威：移除本机范围内已不在云端的商品（避免其他设备清空后本机旧缓存再推回云端） */
async function reconcileLocalScopeWithCloud(
  store: InventoryStoreSession,
  hubCode: string,
  cloudItems: CloudStoreItemRow[],
  cloudPacks: CloudPackRow[],
): Promise<void> {
  const { getQueuedLocalItemIds, getQueuedLocalPackIds } = await import('./inventoryCloudQueue');
  const queuedItemIds = await getQueuedLocalItemIds();
  const queuedPackIds = await getQueuedLocalPackIds();

  const storeCode = store.storeCode.trim().toUpperCase();
  const hub = hubCode.trim().toUpperCase();
  const cloudBarcodes = new Set(
    cloudItems.map((row) => row.barcode.trim().toUpperCase()).filter(Boolean),
  );
  const cloudPackBarcodes = new Set(
    cloudPacks.map((row) => row.bundle_barcode.trim().toUpperCase()).filter(Boolean),
  );

  const db = await getDatabase();
  const localItems = await db.getAllAsync<{ id: string; barcode: string }>(
    `SELECT id, barcode FROM inventory_items
     WHERE UPPER(owner_store_code) = ? OR UPPER(final_destination) = ?`,
    [storeCode, hub],
  );

  for (const row of localItems) {
    if (queuedItemIds.has(row.id)) continue;
    const code = row.barcode.trim().toUpperCase();
    if (cloudBarcodes.has(code)) continue;
    await deleteLocalItemCascade(row.id);
  }

  const localPacks = await db.getAllAsync<{ id: string; bundle_barcode: string }>(
    `SELECT DISTINCT p.id, p.bundle_barcode FROM packed_shipments p
     LEFT JOIN packed_shipment_items psi ON psi.pack_id = p.id
     LEFT JOIN inventory_items i ON i.id = psi.item_id
     WHERE UPPER(p.owner_store_code) = ? OR UPPER(i.final_destination) = ?`,
    [storeCode, hub],
  );
  for (const pack of localPacks) {
    if (queuedPackIds.has(pack.id)) continue;
    const code = pack.bundle_barcode.trim().toUpperCase();
    if (cloudPackBarcodes.has(code)) continue;
    await db.runAsync('DELETE FROM packed_shipment_items WHERE pack_id = ?', [pack.id]);
    await db.runAsync('DELETE FROM packed_shipments WHERE id = ?', [pack.id]);
  }
}

/** 仅拉取云端并合并到 SQLite（Realtime / 后台刷新用，不推本机） */
export async function pullPlatformInventoryFromCloud(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const cloudItems = await fetchCloudStoreItems(store, hubCode);
  for (const row of cloudItems) {
    const { shouldMergeCloudItemToLocal } = await import('../utils/expressDetailsVisibility');
    if (!shouldMergeCloudItemToLocal(row, store, hubCode)) continue;
    await mergeCloudItem(row);
  }

  const cloudItemIds = cloudItems.map((r) => r.id);
  const movements = await fetchCloudMovementsForItems(cloudItemIds);
  const db = await getDatabase();
  for (const m of movements) {
    const localItem = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM inventory_items WHERE barcode = ?',
      [m.barcode],
    );
    if (!localItem?.id) continue;
    await mergeCloudMovement(m, localItem.id);
  }

  const packs = await fetchCloudPackedShipments(store, hubCode);
  for (const pack of packs) {
    const { shouldMergeCloudPackToLocal } = await import('../utils/expressDetailsVisibility');
    if (!shouldMergeCloudPackToLocal(pack, store, hubCode)) continue;
    await mergeCloudPack(pack);
  }

  await reconcilePackedItemStateFromCloud();
  await reconcileLocalScopeWithCloud(store, hubCode, cloudItems, packs);
  await reconcileTruckLoadFromCloud(store);

  const { pruneItemsOutsideExpressDetailsScope, prunePacksOutsideExpressDetailsScope } =
    await import('./inventoryService');
  await pruneItemsOutsideExpressDetailsScope(store, hubCode);
  await prunePacksOutsideExpressDetailsScope(store, hubCode);
}

/** 通过 Edge Function（Service Role）清空本站可见范围云端测试数据 */
export async function clearAllCloudTestDataViaEdge(): Promise<{
  items: number;
  packs: number;
  trackingPacks: number;
  trackingOrders: number;
} | null> {
  const { getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured, supabase } = await import(
    './supabase'
  );
  if (!isSupabaseConfigured()) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('请先登录后再清空云端数据');
  }

  const response = await fetch(`${getSupabaseUrl()}/functions/v1/inventory-clear-test-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: getSupabaseAnonKey(),
    },
    body: '{}',
  });

  const payload = (await response.json()) as {
    items?: number;
    packs?: number;
    trackingPacks?: number;
    trackingOrders?: number;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? '云端清空失败');
  }

  return {
    items: payload.items ?? 0,
    packs: payload.packs ?? 0,
    trackingPacks: payload.trackingPacks ?? 0,
    trackingOrders: payload.trackingOrders ?? 0,
  };
}

/** 清空云端平台库存表（测试重置；需已登录 Supabase Auth，RLS 可能删不掉他站发到本 hub 的订单） */
export async function clearAllCloudPlatformInventory(
  store: InventoryStoreSession,
  hubCode?: string,
): Promise<{ items: number; packs: number }> {
  if (!isSupabaseConfigured()) return { items: 0, packs: 0 };

  const storeCode = store.storeCode.trim().toUpperCase();
  const hub = hubCode?.trim().toUpperCase() ?? '';

  let packs = 0;
  const { count: packById, error: packIdErr } = await supabase
    .from('inventory_packed_shipments')
    .delete({ count: 'exact' })
    .eq('owner_store_id', store.id);
  if (packIdErr) throw new Error(packIdErr.message);
  packs += packById ?? 0;

  const { count: packByCode, error: packCodeErr } = await supabase
    .from('inventory_packed_shipments')
    .delete({ count: 'exact' })
    .eq('owner_store_code', storeCode);
  if (packCodeErr) throw new Error(packCodeErr.message);
  packs += packByCode ?? 0;

  let items = 0;
  const { count: itemById, error: itemIdErr } = await supabase
    .from('inventory_store_items')
    .delete({ count: 'exact' })
    .eq('owner_store_id', store.id);
  if (itemIdErr) throw new Error(itemIdErr.message);
  items += itemById ?? 0;

  const { count: itemByCode, error: itemCodeErr } = await supabase
    .from('inventory_store_items')
    .delete({ count: 'exact' })
    .eq('owner_store_code', storeCode);
  if (itemCodeErr) throw new Error(itemCodeErr.message);
  items += itemByCode ?? 0;

  if (hub) {
    const { count: hubItems, error: hubErr } = await supabase
      .from('inventory_store_items')
      .delete({ count: 'exact' })
      .eq('final_destination', hub);
    if (hubErr) throw new Error(hubErr.message);
    items += hubItems ?? 0;
  }

  return { items, packs };
}

/** 登录 / 下拉：先处理离线队列、推本机再拉云端 */
export async function syncPlatformInventoryFromCloud(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  syncInFlight = (async () => {
    await processCloudSyncQueue(store);
    await pullPlatformInventoryFromCloud(store, hubCode);
    await pushLocalItemsForStore(store, hubCode);
  })();

  try {
    await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

export async function pushItemAndMovementToCloud(
  store: InventoryStoreSession,
  item: InventoryItem,
  movement?: StockMovement,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const cloudItemId = await upsertCloudStoreItem(store, item);
  if (movement) {
    await insertCloudStockMovement(cloudItemId, movement);
  }
}

export async function pushPackedShipmentToCloud(
  store: InventoryStoreSession,
  packId: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const db = await getDatabase();
  const packRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM packed_shipments WHERE id = ?',
    [packId],
  );
  if (!packRow) return;
  const lineRows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM packed_shipment_items WHERE pack_id = ?',
    [packId],
  );
  const bundleCloudId = await getCloudItemIdByBarcode(String(packRow.bundle_barcode));
  const lines = lineRows.map((l) => ({
    item_barcode: String(l.item_barcode),
    item_name: String(l.item_name),
    qty: Number(l.qty) || 1,
    cloud_item_id: null as string | null,
  }));
  for (const line of lines) {
    line.cloud_item_id = await getCloudItemIdByBarcode(line.item_barcode);
  }
  const loadedAt = await bundleItemLoadedAt(String(packRow.bundle_item_id), String(packRow.created_at));
  await upsertCloudPackedShipment(
    store,
    {
      id: String(packRow.id),
      bundle_item_id: String(packRow.bundle_item_id),
      bundle_barcode: String(packRow.bundle_barcode),
      bundle_name: String(packRow.bundle_name),
      operator: String(packRow.operator),
      note: String(packRow.note ?? ''),
      owner_store_code: String(packRow.owner_store_code ?? ''),
      transport_fee: String(packRow.transport_fee ?? ''),
      truck_leg_destination: String(packRow.truck_leg_destination ?? ''),
      created_at: String(packRow.created_at),
    },
    bundleCloudId,
    lines,
    loadedAt,
  );
}

type TruckLoadOriginRef = { id: string; storeCode: string; storeName: string };

/** 装车出库统一双写：inventory_pkg_tracking + inventory_packed_shipments + 出库流水 */
export async function pushTruckLoadToCloud(params: {
  store: InventoryStoreSession;
  originStore: TruckLoadOriginRef;
  destinationCode: string;
  outboundDate: string;
  packs: PackedShipmentDetail[];
  totalWeightKg: string;
  transportFee?: string;
  orderSnapshots?: Record<string, OrderInboundSnapshot>;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const fee = params.transportFee?.trim() ?? '';
  const transportFees: Record<string, string> = {};
  for (const pack of params.packs) {
    transportFees[pack.bundle_barcode] = fee;
  }

  await pushTruckLoadTracking({
    originStore: params.originStore,
    destinationCode: params.destinationCode,
    outboundDate: params.outboundDate,
    packs: params.packs,
    totalWeightKg: params.totalWeightKg,
    orderSnapshots: params.orderSnapshots,
    transportFees,
  });

  const {
    getPackedShipmentByBarcode,
    getItemById,
    getLatestTruckLoadMovement,
  } = await import('./inventoryService');

  for (const pack of params.packs) {
    const detail = await getPackedShipmentByBarcode(pack.bundle_barcode);
    if (!detail) continue;

    const movement = await getLatestTruckLoadMovement(detail.bundle_item_id);
    const bundleItem = await getItemById(detail.bundle_item_id);
    if (bundleItem && movement) {
      await pushItemAndMovementToCloud(params.store, bundleItem, movement);
    }
    await pushPackedShipmentToCloud(params.store, detail.id);
  }
}

/** 从 inventory_pkg_tracking 合并装车状态：补本地出库与车费/目的地元数据 */
export async function reconcileTruckLoadFromCloud(store: InventoryStoreSession): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const cloudPkgs = await listOutboundPackagesFromOrigin(store.storeCode, [
    'in_transit',
    'hub_received',
    'completed',
  ]);

  const {
    getPackedShipmentByBarcode,
    applyStockMovement,
    markHubTransitOrdersShippedAfterLoad,
  } = await import('./inventoryService');
  const { resolveStoreHubCode } = await import('../utils/storeZone');
  const hubCode = resolveStoreHubCode(store);

  const db = await getDatabase();
  for (const cloudPkg of cloudPkgs) {
    if (!cloudPkg.truck_loaded_at) continue;

    const leg =
      cloudPkg.leg_destination_code?.trim().toUpperCase() ||
      cloudPkg.destination_code?.trim().toUpperCase();
    const fee = cloudPkg.transport_fee?.trim() ?? '';
    const barcode = cloudPkg.pack_barcode.trim().toUpperCase();

    const local = await getPackedShipmentByBarcode(barcode);
    if (!local) continue;

    await db.runAsync(
      `UPDATE packed_shipments SET transport_fee = ?, truck_leg_destination = ? WHERE bundle_barcode = ?`,
      [fee, leg, barcode],
    );

    if (!local.loaded) {
      const loadNote = [
        '装车出库（云端同步）',
        cloudPkg.truck_outbound_date ? `日期 ${cloudPkg.truck_outbound_date}` : '',
        leg ? `目的地 ${leg}` : '',
        fee ? `车费 ${fee} MMK` : '',
      ]
        .filter(Boolean)
        .join('\n');

      await applyStockMovement({
        barcode: local.bundle_barcode,
        type: 'out',
        qty: 1,
        operator: '云端同步',
        destination: leg,
        note: loadNote,
        actingStore: store,
        syncToCloud: false,
      });
      await markHubTransitOrdersShippedAfterLoad([local], hubCode, cloudPkg.truck_loaded_at || nowIso());
    }
  }
}
