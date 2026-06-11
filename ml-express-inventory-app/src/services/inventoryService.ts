import type {
  InventoryItem,
  InventoryItemDetail,
  InventoryItemListRow,
  MovementType,
  PackedShipment,
  PackedShipmentDetail,
  PackedShipmentItem,
  PackedShipmentListRow,
  StockMovement,
  TrackOrderResult,
  TruckLoadInfo,
} from '../types/inventory';
import { normalizePackDestination } from '../constants/destinationOptions';
import { resolvePackDisplayStatus } from '../utils/packDisplayStatus';
import { todayIsoDate } from '../utils/dateFormat';
import { buildPackageNumberBody, formatPackageSequence } from '../utils/packageNumber';
import {
  canEditOwnedRecord,
  editDeniedMessage,
  inferOwnerKeyFromItem,
  normalizeOwnerKey,
  ownershipKeyFromStoreCode,
} from '../utils/storeOwnership';
import { getDatabase, newId, nowIso } from './database';
import type { PkgTrackingDetail } from '../types/tracking';
import type { InventoryStoreSession } from './authService';
import { pushTruckLoadTracking } from './trackingService';

export type OriginStoreRef = {
  id: string;
  storeCode: string;
  storeName: string;
};

const CUSTOMER_NAME_SUBQUERY = `(
  SELECT m.recipient_name FROM stock_movements m
  WHERE m.item_id = i.id AND m.type = 'in' AND TRIM(m.recipient_name) != ''
  ORDER BY m.created_at DESC LIMIT 1
)`;
const CUSTOMER_NAME_SELECT = `${CUSTOMER_NAME_SUBQUERY} AS customer_name`;

const DESTINATION_FALLBACK_SUBQUERY = `(
  SELECT m.destination FROM stock_movements m
  WHERE m.item_id = i.id AND m.type = 'in' AND TRIM(m.destination) != ''
  ORDER BY m.created_at ASC LIMIT 1
)`;
const DESTINATION_SELECT = `COALESCE(NULLIF(TRIM(i.final_destination), ''), ${DESTINATION_FALLBACK_SUBQUERY}) AS destination`;
const STOCKED_IN_SUBQUERY = `(
  SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM stock_movements m
  WHERE m.item_id = i.id AND m.type = 'in'
)`;
const PACKED_SUBQUERY = `(
  SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM packed_shipment_items psi
  WHERE psi.item_id = i.id
)`;
const PARENT_PACK_BARCODE_SUBQUERY = `(
  SELECT p.bundle_barcode FROM packed_shipment_items psi
  INNER JOIN packed_shipments p ON p.id = psi.pack_id
  WHERE psi.item_id = i.id
  ORDER BY p.created_at DESC LIMIT 1
)`;
const ITEM_LIST_SELECT = `i.*, ${CUSTOMER_NAME_SELECT}, ${DESTINATION_SELECT}, ${STOCKED_IN_SUBQUERY} AS stocked_in, ${PACKED_SUBQUERY} AS packed, ${PARENT_PACK_BARCODE_SUBQUERY} AS parent_pack_barcode`;
const NOT_EXPRESS_PACK_CLAUSE = `UPPER(i.barcode) NOT LIKE 'PKG%'`;

function persistFinalDestinationCode(raw: string): string {
  const normalized = normalizePackDestination(raw);
  if (normalized) return normalized;
  return raw.trim().toUpperCase().slice(0, 3);
}

function rowToListItem(row: Record<string, unknown>): InventoryItemListRow {
  return {
    ...rowToItem(row),
    stocked_in: Boolean(Number(row.stocked_in)),
    packed: Boolean(Number(row.packed)),
    parent_pack_barcode: String(row.parent_pack_barcode ?? ''),
  };
}

function rowToItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: String(row.id),
    barcode: String(row.barcode),
    input_barcode: String(row.input_barcode ?? ''),
    name: String(row.name),
    spec: String(row.spec ?? ''),
    unit: String(row.unit ?? '件'),
    weight: String(row.weight ?? ''),
    qty_on_hand: Number(row.qty_on_hand) || 0,
    min_qty: Number(row.min_qty) || 0,
    note: String(row.note ?? ''),
    owner_store_code: String(row.owner_store_code ?? ''),
    customer_name: String(row.customer_name ?? ''),
    final_destination: String(row.final_destination ?? ''),
    destination: String(row.destination ?? row.final_destination ?? ''),
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
    type: row.type as MovementType,
    qty: Number(row.qty) || 0,
    qty_before: Number(row.qty_before) || 0,
    qty_after: Number(row.qty_after) || 0,
    operator: String(row.operator),
    note: String(row.note ?? ''),
    recipient_name: String(row.recipient_name ?? ''),
    recipient_phone: String(row.recipient_phone ?? ''),
    destination: String(row.destination ?? ''),
    packaging: String(row.packaging ?? ''),
    input_barcode: String(row.input_barcode ?? ''),
    origin_store_id: String(row.origin_store_id ?? ''),
    origin_store_code: String(row.origin_store_code ?? ''),
    origin_store_name: String(row.origin_store_name ?? ''),
    created_at: String(row.created_at),
  };
}

export async function resolveItemOwnerStoreCode(itemId: string): Promise<string> {
  const db = await getDatabase();
  const item = await getItemById(itemId);
  if (!item) return '';

  if (item.owner_store_code?.trim()) {
    return ownershipKeyFromStoreCode(item.owner_store_code);
  }

  const inbound = await db.getFirstAsync<{
    origin_store_code: string;
    destination: string;
  }>(
    `SELECT origin_store_code, destination FROM stock_movements
     WHERE item_id = ? AND type = 'in'
     ORDER BY created_at ASC LIMIT 1`,
    [itemId],
  );

  let inferred = '';
  if (inbound?.origin_store_code?.trim()) {
    inferred = ownershipKeyFromStoreCode(inbound.origin_store_code);
  } else if (inbound?.destination?.trim()) {
    inferred = normalizeOwnerKey(inbound.destination);
  } else {
    inferred = inferOwnerKeyFromItem(item);
  }

  if (inferred) {
    await db.runAsync(
      `UPDATE inventory_items SET owner_store_code = ?
       WHERE id = ? AND (owner_store_code IS NULL OR TRIM(owner_store_code) = '')`,
      [inferred, itemId],
    );
  }

  return inferred;
}

export async function resolvePackOwnerStoreCode(packId: string): Promise<string> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    owner_store_code: string;
    bundle_item_id: string;
    bundle_barcode: string;
  }>('SELECT owner_store_code, bundle_item_id, bundle_barcode FROM packed_shipments WHERE id = ?', [
    packId,
  ]);
  if (!row) return '';
  if (row.owner_store_code?.trim()) {
    return ownershipKeyFromStoreCode(row.owner_store_code);
  }
  const fromBundle = await resolveItemOwnerStoreCode(row.bundle_item_id);
  if (fromBundle) return fromBundle;
  return inferOwnerKeyFromItem({ barcode: row.bundle_barcode });
}

export function assertCanEditItem(
  actingStore: InventoryStoreSession,
  ownerStoreCode: string | null | undefined,
): void {
  if (!canEditOwnedRecord(actingStore, ownerStoreCode)) {
    throw new Error(editDeniedMessage(ownerStoreCode));
  }
}

export async function assertCanEditItemById(
  actingStore: InventoryStoreSession,
  itemId: string,
): Promise<void> {
  const owner = await resolveItemOwnerStoreCode(itemId);
  assertCanEditItem(actingStore, owner);
}

export async function assertCanEditPackById(
  actingStore: InventoryStoreSession,
  packId: string,
): Promise<void> {
  const owner = await resolvePackOwnerStoreCode(packId);
  assertCanEditItem(actingStore, owner);
}

export async function listItems(search?: string): Promise<InventoryItemListRow[]> {
  const db = await getDatabase();
  const q = search?.trim();
  const rows = q
    ? await db.getAllAsync<Record<string, unknown>>(
        `SELECT ${ITEM_LIST_SELECT} FROM inventory_items i
         WHERE ${NOT_EXPRESS_PACK_CLAUSE}
           AND (i.barcode LIKE ? OR i.input_barcode LIKE ? OR i.name LIKE ? OR i.spec LIKE ?
             OR i.final_destination LIKE ? OR ${CUSTOMER_NAME_SUBQUERY} LIKE ? OR ${DESTINATION_FALLBACK_SUBQUERY} LIKE ?)
         ORDER BY i.updated_at DESC`,
        [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
      )
    : await db.getAllAsync<Record<string, unknown>>(
        `SELECT ${ITEM_LIST_SELECT} FROM inventory_items i
         WHERE ${NOT_EXPRESS_PACK_CLAUSE}
         ORDER BY i.updated_at DESC`,
      );
  return rows.map(rowToListItem);
}

export async function getItemById(id: string): Promise<InventoryItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM inventory_items WHERE id = ?',
    [id],
  );
  return row ? rowToItem(row) : null;
}

export async function getItemByBarcode(barcode: string): Promise<InventoryItem | null> {
  const code = barcode.trim();
  if (!code) return null;
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM inventory_items WHERE barcode = ? OR input_barcode = ?',
    [code, code],
  );
  return row ? rowToItem(row) : null;
}

export async function upsertItem(
  input: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'qty_on_hand' | 'input_barcode'> & {
    id?: string;
    qty_on_hand?: number;
    input_barcode?: string;
  },
  options?: {
    actingStore?: InventoryStoreSession;
    /** 内部流程（打包生成包裹商品）跳过权限校验 */
    internal?: boolean;
    ownerStoreCode?: string;
  },
): Promise<InventoryItem> {
  const db = await getDatabase();
  const existing = input.id
    ? await getItemById(input.id)
    : await getItemByBarcode(input.barcode);
  const ts = nowIso();

  if (existing) {
    if (options?.actingStore && !options.internal) {
      await assertCanEditItemById(options.actingStore, existing.id);
    }
    await db.runAsync(
      `UPDATE inventory_items SET name=?, spec=?, unit=?, weight=?, min_qty=?, note=?, input_barcode=?, updated_at=?
       WHERE id=?`,
      [
        input.name.trim(),
        input.spec?.trim() ?? '',
        input.unit?.trim() || '件',
        input.weight?.trim() ?? '',
        input.min_qty ?? 0,
        input.note?.trim() ?? '',
        input.input_barcode?.trim() ?? existing.input_barcode ?? '',
        ts,
        existing.id,
      ],
    );
    return (await getItemById(existing.id))!;
  }

  const id = input.id ?? newId();
  const qty = input.qty_on_hand ?? 0;
  const ownerCode = options?.ownerStoreCode?.trim() ?? options?.actingStore?.storeCode ?? '';
  await db.runAsync(
    `INSERT INTO inventory_items
     (id, barcode, input_barcode, name, spec, unit, weight, qty_on_hand, min_qty, note, owner_store_code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.barcode.trim(),
      input.input_barcode?.trim() ?? '',
      input.name.trim(),
      input.spec?.trim() ?? '',
      input.unit?.trim() || '件',
      input.weight?.trim() ?? '',
      qty,
      input.min_qty ?? 0,
      input.note?.trim() ?? '',
      ownerCode,
      ts,
      ts,
    ],
  );
  return (await getItemById(id))!;
}

export async function applyStockMovement(params: {
  barcode: string;
  type: MovementType;
  qty: number;
  operator: string;
  note?: string;
  recipientName?: string;
  recipientPhone?: string;
  destination?: string;
  packaging?: string;
  /** 入库时扫码/手动填写的条码 */
  inputBarcode?: string;
  /** 入库时若条码不存在，用此信息自动建档 */
  createIfMissing?: { name: string; spec?: string; unit?: string; weight?: string };
  /** 入库登记日期（写入流水 created_at） */
  inboundAt?: string;
  /** 入库操作站（写入流水与商品归属） */
  originStore?: OriginStoreRef;
}): Promise<{ item: InventoryItem; movement: StockMovement }> {
  const qty = Math.abs(params.qty);
  if (qty <= 0) throw new Error('数量必须大于 0');

  const db = await getDatabase();
  let item = await getItemByBarcode(params.barcode);

  if (!item && params.type === 'in' && params.createIfMissing) {
    item = await upsertItem(
      {
        barcode: params.barcode,
        input_barcode: params.inputBarcode?.trim() ?? '',
        name: params.createIfMissing.name,
        spec: params.createIfMissing.spec ?? '',
        unit: params.createIfMissing.unit ?? '1 Pcs',
        weight: params.createIfMissing.weight ?? '',
        min_qty: 0,
        note: '',
        qty_on_hand: 0,
      },
      {
        internal: true,
        ownerStoreCode: params.originStore?.storeCode,
      },
    );
  }

  if (!item) throw new Error('未找到该条码商品，请先在商品库建档或扫码入库时填写名称');

  const before = item.qty_on_hand;
  let after = before;
  if (params.type === 'in') after = before + qty;
  else if (params.type === 'out') {
    if (before < qty) throw new Error(`库存不足：当前 ${before}，需要出库 ${qty}`);
    after = before - qty;
  } else after = qty;

  const ts = params.inboundAt?.trim() || nowIso();
  const inputCode = params.inputBarcode?.trim() ?? '';
  const originCode = params.originStore?.storeCode?.trim() ?? '';

  if (params.type === 'in' && originCode) {
    await db.runAsync(
      `UPDATE inventory_items SET owner_store_code = ?
       WHERE id = ? AND (owner_store_code IS NULL OR TRIM(owner_store_code) = '')`,
      [originCode, item.id],
    );
    if (!item.owner_store_code?.trim()) {
      item = { ...item, owner_store_code: originCode };
    }
  }

  const finalDest =
    params.type === 'in' && params.destination?.trim()
      ? persistFinalDestinationCode(params.destination)
      : '';

  if (params.type === 'in' && inputCode) {
    await db.runAsync(
      `UPDATE inventory_items SET qty_on_hand=?, input_barcode=?, updated_at=?${
        finalDest ? ', final_destination=?' : ''
      } WHERE id=?`,
      finalDest
        ? [after, inputCode, ts, finalDest, item.id]
        : [after, inputCode, ts, item.id],
    );
    item = {
      ...item,
      input_barcode: inputCode,
      updated_at: ts,
      ...(finalDest ? { final_destination: finalDest, destination: finalDest } : {}),
    };
  } else {
    await db.runAsync(
      `UPDATE inventory_items SET qty_on_hand=?, updated_at=?${
        finalDest ? ', final_destination=?' : ''
      } WHERE id=?`,
      finalDest ? [after, ts, finalDest, item.id] : [after, ts, item.id],
    );
    if (finalDest) {
      item = { ...item, final_destination: finalDest, destination: finalDest, updated_at: ts };
    }
  }

  const movement: StockMovement = {
    id: newId(),
    item_id: item.id,
    barcode: item.barcode,
    item_name: item.name,
    type: params.type,
    qty,
    qty_before: before,
    qty_after: after,
    operator: params.operator,
    note: params.note?.trim() ?? '',
    recipient_name: params.recipientName?.trim() ?? '',
    recipient_phone: params.recipientPhone?.trim() ?? '',
    destination: params.destination?.trim() ?? '',
    packaging: params.packaging?.trim() ?? '',
    input_barcode: params.inputBarcode?.trim() ?? '',
    origin_store_id: params.originStore?.id?.trim() ?? '',
    origin_store_code: originCode,
    origin_store_name: params.originStore?.storeName?.trim() ?? '',
    created_at: ts,
  };

  await db.runAsync(
    `INSERT INTO stock_movements
     (id, item_id, barcode, item_name, type, qty, qty_before, qty_after, operator, note,
      recipient_name, recipient_phone, destination, packaging, input_barcode,
      origin_store_id, origin_store_code, origin_store_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movement.id,
      movement.item_id,
      movement.barcode,
      movement.item_name,
      movement.type,
      movement.qty,
      movement.qty_before,
      movement.qty_after,
      movement.operator,
      movement.note,
      movement.recipient_name,
      movement.recipient_phone,
      movement.destination,
      movement.packaging,
      movement.input_barcode,
      movement.origin_store_id,
      movement.origin_store_code,
      movement.origin_store_name,
      movement.created_at,
    ],
  );

  return { item: { ...item, qty_on_hand: after, updated_at: ts }, movement };
}

/** 曾入库且仍有库存的商品，可用于打包快递 */
export async function listPackableItems(search?: string): Promise<InventoryItemListRow[]> {
  const db = await getDatabase();
  const q = search?.trim();
  const rows = q
    ? await db.getAllAsync<Record<string, unknown>>(
        `SELECT DISTINCT ${ITEM_LIST_SELECT} FROM inventory_items i
         INNER JOIN stock_movements m ON m.item_id = i.id AND m.type = 'in'
         WHERE i.qty_on_hand > 0
           AND ${NOT_EXPRESS_PACK_CLAUSE}
           AND (i.barcode LIKE ? OR i.input_barcode LIKE ? OR i.name LIKE ? OR i.spec LIKE ?
             OR i.final_destination LIKE ? OR ${CUSTOMER_NAME_SUBQUERY} LIKE ? OR ${DESTINATION_FALLBACK_SUBQUERY} LIKE ?)
         ORDER BY i.updated_at DESC`,
        [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
      )
    : await db.getAllAsync<Record<string, unknown>>(
        `SELECT DISTINCT ${ITEM_LIST_SELECT} FROM inventory_items i
         INNER JOIN stock_movements m ON m.item_id = i.id AND m.type = 'in'
         WHERE i.qty_on_hand > 0
           AND ${NOT_EXPRESS_PACK_CLAUSE}
         ORDER BY i.updated_at DESC`,
      );
  return rows.map(rowToListItem);
}

export async function createPackedShipment(params: {
  operator: string;
  originStore: OriginStoreRef;
  itemIds: string[];
  bundle: {
    barcode: string;
    name: string;
    spec: string;
    unit: string;
    weight: string;
    note: string;
  };
}): Promise<{ bundleItem: InventoryItem; pack: PackedShipment }> {
  const ids = [...new Set(params.itemIds)];
  if (ids.length === 0) throw new Error('请至少选择一个入库商品');

  const db = await getDatabase();
  const picked: InventoryItem[] = [];
  for (const id of ids) {
    const item = await getItemById(id);
    if (!item) throw new Error('商品不存在或已删除');
    if (item.qty_on_hand < 1) throw new Error(`${item.name} 库存不足，无法打包`);
    const hasIn = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM stock_movements WHERE item_id = ? AND type = 'in'`,
      [id],
    );
    if (!hasIn?.c) throw new Error(`${item.name} 未入库，无法打包`);
    picked.push(item);
  }

  const bundleItem = await upsertItem(
    {
      barcode: params.bundle.barcode.trim(),
      name: params.bundle.name.trim(),
      spec: params.bundle.spec,
      unit: params.bundle.unit,
      weight: params.bundle.weight,
      min_qty: 0,
      note: params.bundle.note,
      qty_on_hand: 1,
    },
    {
      internal: true,
      ownerStoreCode: params.originStore.storeCode,
    },
  );

  const packId = newId();
  const ts = nowIso();
  const pack: PackedShipment = {
    id: packId,
    bundle_item_id: bundleItem.id,
    bundle_barcode: bundleItem.barcode,
    bundle_name: bundleItem.name,
    operator: params.operator,
    note: params.bundle.note,
    owner_store_code: params.originStore.storeCode,
    created_at: ts,
  };

  await db.runAsync(
    `INSERT INTO packed_shipments
     (id, bundle_item_id, bundle_barcode, bundle_name, operator, note, owner_store_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pack.id,
      pack.bundle_item_id,
      pack.bundle_barcode,
      pack.bundle_name,
      pack.operator,
      pack.note,
      pack.owner_store_code,
      pack.created_at,
    ],
  );

  for (const item of picked) {
    await db.runAsync(
      `INSERT INTO packed_shipment_items
       (id, pack_id, item_id, item_barcode, item_name, qty)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId(), packId, item.id, item.barcode, item.name, 1],
    );
    await applyStockMovement({
      barcode: item.barcode,
      type: 'out',
      qty: 1,
      operator: params.operator,
      note: `打包入 ${bundleItem.barcode}`,
    });
  }

  return { bundleItem, pack };
}

/** 按目的地与件数生成唯一包装号，如 PKG26YGN20001 */
export async function generatePackageNumber(
  destination: string,
  itemCount: number,
): Promise<string> {
  const dest = destination.trim();
  if (!dest) throw new Error('请选择目的地');
  if (itemCount <= 0) throw new Error('请至少选择一个入库商品');
  const body = buildPackageNumberBody(dest, itemCount);
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COALESCE(MAX(CAST(SUBSTR(bundle_barcode, -4) AS INTEGER)), 0) AS n
     FROM packed_shipments
     WHERE SUBSTR(bundle_barcode, -4) GLOB '[0-9][0-9][0-9][0-9]'`,
  );
  let seq = (row?.n ?? 0) + 1;

  for (let i = 0; i < 50; i += 1) {
    const candidate = `${body}${formatPackageSequence(seq)}`;
    const taken = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) AS c FROM packed_shipments WHERE bundle_barcode = ?',
      [candidate],
    );
    const itemTaken = await getItemByBarcode(candidate);
    if (!taken?.c && !itemTaken) return candidate;
    seq += 1;
  }
  throw new Error('无法生成包装号，请重试');
}

function rowToPackedShipmentItem(row: Record<string, unknown>): PackedShipmentItem {
  return {
    id: String(row.id),
    pack_id: String(row.pack_id),
    item_id: String(row.item_id),
    item_barcode: String(row.item_barcode),
    input_barcode: String(row.item_input_barcode ?? ''),
    item_name: String(row.item_name),
    destination: String(row.item_destination ?? ''),
    qty: Number(row.qty) || 0,
  };
}

const PACKED_ITEM_DESTINATION_SUBQUERY = `COALESCE(NULLIF(TRIM(ii.final_destination), ''), (
  SELECT m.destination FROM stock_movements m
  WHERE m.item_id = ii.id AND m.type = 'in' AND TRIM(m.destination) != ''
  ORDER BY m.created_at ASC LIMIT 1
))`;
const PACKED_ITEM_SELECT = `psi.*, ii.input_barcode AS item_input_barcode, ${PACKED_ITEM_DESTINATION_SUBQUERY} AS item_destination`;
const PACKED_SHIPMENT_SELECT = `p.*, i.spec, i.unit, i.weight, i.qty_on_hand`;

function mapPackDetailFromRow(
  row: Record<string, unknown>,
  items: PackedShipmentItem[],
): PackedShipmentDetail {
  const qty = Number(row.qty_on_hand ?? 1) || 0;
  return {
    id: String(row.id),
    bundle_item_id: String(row.bundle_item_id),
    bundle_barcode: String(row.bundle_barcode),
    bundle_name: String(row.bundle_name),
    operator: String(row.operator),
    note: String(row.note ?? ''),
    owner_store_code: String(row.owner_store_code ?? ''),
    created_at: String(row.created_at),
    spec: String(row.spec ?? ''),
    unit: String(row.unit ?? ''),
    weight: String(row.weight ?? ''),
    items,
    bundle_qty_on_hand: qty,
    loaded: qty <= 0,
  };
}

export async function listPackedShipments(search?: string): Promise<PackedShipmentDetail[]> {
  const db = await getDatabase();
  const q = search?.trim();
  const rows = q
    ? await db.getAllAsync<Record<string, unknown>>(
        `SELECT ${PACKED_SHIPMENT_SELECT}
         FROM packed_shipments p
         LEFT JOIN inventory_items i ON i.id = p.bundle_item_id
         WHERE p.bundle_barcode LIKE ? OR p.bundle_name LIKE ? OR p.operator LIKE ? OR p.note LIKE ?
         ORDER BY p.created_at DESC`,
        [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
      )
    : await db.getAllAsync<Record<string, unknown>>(
        `SELECT ${PACKED_SHIPMENT_SELECT}
         FROM packed_shipments p
         LEFT JOIN inventory_items i ON i.id = p.bundle_item_id
         ORDER BY p.created_at DESC`,
      );

  const result: PackedShipmentDetail[] = [];
  for (const row of rows) {
    const itemRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT ${PACKED_ITEM_SELECT}
       FROM packed_shipment_items psi
       LEFT JOIN inventory_items ii ON ii.id = psi.item_id
       WHERE psi.pack_id = ? ORDER BY psi.item_name`,
      [String(row.id)],
    );
    result.push(mapPackDetailFromRow(row, itemRows.map(rowToPackedShipmentItem)));
  }
  return result;
}

/** 打包列表（合并云端在途状态） */
export async function listPackedShipmentRows(search?: string): Promise<PackedShipmentListRow[]> {
  const list = await listPackedShipments(search);
  const { listPkgTrackingStatusMap } = await import('./trackingService');
  let statusMap: Record<string, import('../types/tracking').PkgTrackingStatus> = {};
  try {
    statusMap = await listPkgTrackingStatusMap(list.map((p) => p.bundle_barcode));
  } catch {
    // 离线或未配置 Supabase 时仅显示本地装车状态
  }
  return list.map((pack) => {
    const cloud = statusMap[pack.bundle_barcode.trim().toUpperCase()] ?? null;
    return {
      ...pack,
      cloud_status: cloud,
      display_status: resolvePackDisplayStatus(pack, cloud),
    };
  });
}

export async function updatePackedShipment(
  packId: string,
  params: { bundle_name: string; spec: string; unit: string; weight: string },
  actingStore?: InventoryStoreSession,
): Promise<void> {
  const db = await getDatabase();
  const name = params.bundle_name.trim();
  if (!name) throw new Error('快递包名称不能为空');

  if (actingStore) {
    await assertCanEditPackById(actingStore, packId);
  }

  const row = await db.getFirstAsync<{ bundle_item_id: string }>(
    'SELECT bundle_item_id FROM packed_shipments WHERE id = ?',
    [packId],
  );
  if (!row) throw new Error('包裹不存在');

  await db.runAsync('UPDATE packed_shipments SET bundle_name = ? WHERE id = ?', [name, packId]);
  await db.runAsync(
    'UPDATE inventory_items SET name = ?, spec = ?, unit = ?, weight = ? WHERE id = ?',
    [name, params.spec, params.unit, params.weight, row.bundle_item_id],
  );
}

/** 装车出库：批量扣减多个 PKG 包裹库存 */
export async function applyTruckLoadOutbound(params: {
  operator: string;
  destination: string;
  outboundDate: string;
  packs: PackedShipmentDetail[];
  totalWeightKg: string;
  note?: string;
  originStore?: { id: string; storeCode: string; storeName: string };
}): Promise<{ count: number; cloudSynced: boolean; cloudError?: string }> {
  if (params.packs.length === 0) throw new Error('请至少选择一个包装号');

  const barcodes = params.packs.map((p) => p.bundle_barcode);
  const loadNote = [
    '装车出库',
    `日期 ${params.outboundDate}`,
    `目的地 ${params.destination}`,
    `包装 ${params.packs.length} 包`,
    params.totalWeightKg ? `总重 ${params.totalWeightKg} Kg` : '',
    barcodes.join(', '),
    params.note?.trim() ?? '',
  ]
    .filter(Boolean)
    .join('\n');

  for (const pack of params.packs) {
    await applyStockMovement({
      barcode: pack.bundle_barcode,
      type: 'out',
      qty: 1,
      operator: params.operator,
      destination: params.destination,
      note: loadNote,
    });
  }

  let cloudSynced = false;
  let cloudError: string | undefined;
  if (params.originStore) {
    try {
      await pushTruckLoadTracking({
        originStore: params.originStore,
        destinationCode: params.destination,
        outboundDate: params.outboundDate,
        packs: params.packs,
        totalWeightKg: params.totalWeightKg,
      });
      cloudSynced = true;
    } catch (e: unknown) {
      cloudError = e instanceof Error ? e.message : '云端同步失败';
    }
  }

  return { count: params.packs.length, cloudSynced, cloudError };
}

/** 可出库的 PKG 包裹（包装商品仍有库存） */
export async function listOutboundPackages(): Promise<PackedShipmentDetail[]> {
  const all = await listPackedShipments();
  return all.filter((pack) => !pack.loaded);
}

async function packedShipmentRowToDetail(
  row: Record<string, unknown>,
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<PackedShipmentDetail> {
  const itemRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${PACKED_ITEM_SELECT}
     FROM packed_shipment_items psi
     LEFT JOIN inventory_items ii ON ii.id = psi.item_id
     WHERE psi.pack_id = ? ORDER BY psi.item_name`,
    [String(row.id)],
  );
  return mapPackDetailFromRow(row, itemRows.map(rowToPackedShipmentItem));
}

export async function getPackedShipmentByBundleItemId(
  bundleItemId: string,
): Promise<PackedShipmentDetail | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PACKED_SHIPMENT_SELECT}
     FROM packed_shipments p
     LEFT JOIN inventory_items i ON i.id = p.bundle_item_id
     WHERE p.bundle_item_id = ?`,
    [bundleItemId],
  );
  if (!row) return null;
  return packedShipmentRowToDetail(row, db);
}

export async function getPackedShipmentByBarcode(
  barcode: string,
): Promise<PackedShipmentDetail | null> {
  const code = barcode.trim().toUpperCase();
  if (!code) return null;
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PACKED_SHIPMENT_SELECT}
     FROM packed_shipments p
     LEFT JOIN inventory_items i ON i.id = p.bundle_item_id
     WHERE UPPER(p.bundle_barcode) = ?`,
    [code],
  );
  if (!row) return null;
  return packedShipmentRowToDetail(row, db);
}

/** 已装车但未同步云端时，从本地出库记录补传追踪数据 */
export async function resyncLoadedPackToCloud(
  packBarcode: string,
  originStore: OriginStoreRef,
): Promise<void> {
  const pack = await getPackedShipmentByBarcode(packBarcode);
  if (!pack) throw new Error('未找到该快递包');
  if (!pack.loaded) throw new Error('该包裹尚未装车出库，请先在「装车出库」完成操作');

  const movement = await getLatestTruckLoadMovement(pack.bundle_item_id);
  if (!movement) throw new Error('未找到装车出库记录');

  const truckLoad = parseTruckLoadFromMovement(movement);
  if (!truckLoad?.destination?.trim()) {
    throw new Error('无法解析装车目的地，请重新装车出库');
  }

  await pushTruckLoadTracking({
    originStore,
    destinationCode: truckLoad.destination.trim(),
    outboundDate: truckLoad.outboundDate?.trim() || todayIsoDate(),
    packs: [pack],
    totalWeightKg: pack.weight ?? '',
  });
}

/** 到站全部订单确认后，将云端快递包写入本地区域账号（供打包 / 装车出库继续中转） */
export async function importHubReceivedPackToLocal(
  detail: PkgTrackingDetail,
  store: InventoryStoreSession,
  operator: string,
): Promise<boolean> {
  if (!detail.orders.every((o) => o.status === 'hub_received')) return false;

  const existing = await getPackedShipmentByBarcode(detail.pack_barcode);
  if (existing) return false;

  const db = await getDatabase();
  const packNote = `到站收货 · ${detail.origin_store_code} → ${detail.destination_code}`;
  const hubOrigin: OriginStoreRef = {
    id: store.id,
    storeCode: store.storeCode,
    storeName: store.storeName,
  };

  let bundleItem = await getItemByBarcode(detail.pack_barcode);
  if (!bundleItem) {
    bundleItem = await upsertItem(
      {
        barcode: detail.pack_barcode,
        name: detail.pack_name?.trim() || detail.pack_barcode,
        spec: '',
        unit: `${detail.item_count} Pcs`,
        weight: detail.total_weight?.trim() || '',
        min_qty: 0,
        note: packNote,
        qty_on_hand: 0,
      },
      { internal: true, ownerStoreCode: store.storeCode },
    );
  }

  if (bundleItem.qty_on_hand < 1) {
    await applyStockMovement({
      barcode: detail.pack_barcode,
      type: 'in',
      qty: 1,
      operator,
      note: `到站收货入库 · 内含 ${detail.item_count} 件`,
      destination: detail.destination_code,
      originStore: hubOrigin,
      inboundAt: detail.hub_received_at ?? undefined,
    });
    bundleItem = (await getItemByBarcode(detail.pack_barcode))!;
  }

  const packId = newId();
  const ts = detail.hub_received_at || nowIso();

  await db.runAsync(
    `INSERT INTO packed_shipments
     (id, bundle_item_id, bundle_barcode, bundle_name, operator, note, owner_store_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      packId,
      bundleItem.id,
      detail.pack_barcode,
      detail.pack_name?.trim() || detail.pack_barcode,
      operator,
      packNote,
      store.storeCode,
      ts,
    ],
  );

  for (const order of detail.orders) {
    let childItem = await getItemByBarcode(order.order_barcode);
    if (!childItem) {
      childItem = await upsertItem(
        {
          barcode: order.order_barcode,
          name: order.order_name?.trim() || order.order_barcode,
          spec: '',
          unit: `${order.qty} Pcs`,
          weight: '',
          min_qty: 0,
          note: packNote,
          input_barcode: order.express_barcode?.trim() || '',
          qty_on_hand: 0,
        },
        {
          internal: true,
          ownerStoreCode: detail.origin_store_code?.trim() || store.storeCode,
        },
      );
    }

    const childDest = persistFinalDestinationCode(order.destination_code || '');
    if (childDest) {
      await db.runAsync('UPDATE inventory_items SET final_destination = ? WHERE id = ?', [
        childDest,
        childItem.id,
      ]);
    }

    await db.runAsync(
      `INSERT INTO packed_shipment_items
       (id, pack_id, item_id, item_barcode, item_name, qty)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        packId,
        childItem.id,
        order.order_barcode,
        order.order_name?.trim() || order.order_barcode,
        order.qty,
      ],
    );
  }

  return true;
}

/** 拉取本站已到站/已完成的云端包裹并补写入本地打包列表 */
export async function syncInboundHubPacksToLocal(
  store: InventoryStoreSession,
  hubCode: string,
  operator: string,
): Promise<number> {
  const { listInboundPackages } = await import('./trackingService');
  const inbound = await listInboundPackages(hubCode, ['hub_received', 'completed']);
  let imported = 0;
  for (const pkg of inbound) {
    if (pkg.status === 'split_at_hub') continue;
    if (!pkg.orders.every((o) => o.status === 'hub_received')) continue;
    if (await importHubReceivedPackToLocal(pkg, store, operator)) imported += 1;
  }
  return imported;
}

/** 中转站释放非本站订单：云端标记 + 本地入库供重新打包 */
export async function releaseHubTransitOrders(params: {
  packBarcode: string;
  store: InventoryStoreSession;
  hubCode: string;
  operator: string;
}): Promise<{ releasedCount: number }> {
  const { releaseTransitOrdersAtHub } = await import('./trackingService');
  const { resolveOrderDestinationCode } = await import('../utils/orderDestination');
  const { extractDestinationCode } = await import('../utils/inboundBarcode');

  const pkg = await releaseTransitOrdersAtHub(
    params.packBarcode,
    params.store,
    params.hubCode,
  );

  const hub = params.hubCode.trim().toUpperCase();
  const released = pkg.orders.filter(
    (o) => o.status === 'released_at_hub' && resolveOrderDestinationCode(o) !== hub,
  );
  if (released.length === 0) return { releasedCount: 0 };

  const db = await getDatabase();
  const localPack = await getPackedShipmentByBarcode(params.packBarcode);
  const hubOrigin: OriginStoreRef = {
    id: params.store.id,
    storeCode: params.store.storeCode,
    storeName: params.store.storeName,
  };

  for (const order of released) {
    let item = await getItemByBarcode(order.order_barcode);
    const orderDest = resolveOrderDestinationCode(order);
    if (!item) {
      item = await upsertItem(
        {
          barcode: order.order_barcode,
          name: order.order_name?.trim() || order.order_barcode,
          spec: '',
          unit: `${order.qty} Pcs`,
          weight: '',
          min_qty: 0,
          note: `中转释放 · 原包 ${params.packBarcode}`,
          input_barcode: order.express_barcode?.trim() || '',
          qty_on_hand: 0,
        },
        { internal: true, ownerStoreCode: params.store.storeCode },
      );
    }

    if (orderDest) {
      const code = persistFinalDestinationCode(orderDest);
      await db.runAsync('UPDATE inventory_items SET final_destination = ? WHERE id = ?', [
        code,
        item.id,
      ]);
    }

    if (localPack) {
      await db.runAsync(
        'DELETE FROM packed_shipment_items WHERE pack_id = ? AND item_barcode = ?',
        [localPack.id, order.order_barcode],
      );
    }

    const stillPacked = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) AS c FROM packed_shipment_items WHERE item_barcode = ?',
      [order.order_barcode],
    );
    const packedCount = Number(stillPacked?.c) || 0;

    if (packedCount === 0 && item.qty_on_hand < 1) {
      await applyStockMovement({
        barcode: order.order_barcode,
        type: 'in',
        qty: 1,
        operator: params.operator,
        note: `中转站释放待转出 · 原包 ${params.packBarcode}`,
        destination: orderDest || extractDestinationCode(order.order_barcode),
        originStore: hubOrigin,
      });
    }
  }

  return { releasedCount: released.length };
}

/** 查找包含该入库商品的 PKG 包裹 */
export async function getPackedShipmentContainingItem(
  itemId: string,
): Promise<PackedShipmentDetail | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PACKED_SHIPMENT_SELECT}
     FROM packed_shipment_items psi
     INNER JOIN packed_shipments p ON p.id = psi.pack_id
     LEFT JOIN inventory_items i ON i.id = p.bundle_item_id
     WHERE psi.item_id = ?
     ORDER BY p.created_at DESC LIMIT 1`,
    [itemId],
  );
  if (!row) return null;
  return packedShipmentRowToDetail(row, db);
}

function parseTruckLoadFromMovement(m: StockMovement): TruckLoadInfo | null {
  if (!m.note.includes('装车出库')) return null;
  const dateMatch = m.note.match(/日期\s+(\d{4}-\d{2}-\d{2})/);
  const destMatch = m.note.match(/目的地\s+(\S+)/);
  return {
    outboundDate: dateMatch?.[1] ?? '',
    destination: m.destination || destMatch?.[1] || '',
    operator: m.operator,
    created_at: m.created_at,
  };
}

async function getLatestTruckLoadMovement(bundleItemId: string): Promise<StockMovement | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM stock_movements
     WHERE item_id = ? AND type = 'out' AND note LIKE '%装车出库%'
     ORDER BY created_at DESC LIMIT 1`,
    [bundleItemId],
  );
  return row ? rowToMovement(row) : null;
}

export async function listMovementsForItem(itemId: string, limit = 10): Promise<StockMovement[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM stock_movements WHERE item_id = ? ORDER BY created_at DESC LIMIT ?',
    [itemId, limit],
  );
  return rows.map(rowToMovement);
}

/** 按快递单或入库条码追踪订单详情 */
export async function trackOrderByCode(code: string): Promise<TrackOrderResult | null> {
  const q = code.trim();
  if (!q) return null;

  const item = await getItemByBarcode(q);
  if (!item) return null;

  const detail = await getItemDetail(item.id);
  if (!detail) return null;

  const isPackage = item.barcode.toUpperCase().startsWith('PKG');
  const parentPack = isPackage ? null : await getPackedShipmentContainingItem(item.id);

  const packForLoad = detail.pack ?? parentPack;
  let truckLoad: TruckLoadInfo | null = null;
  if (packForLoad?.loaded) {
    const movement = await getLatestTruckLoadMovement(packForLoad.bundle_item_id);
    if (movement) truckLoad = parseTruckLoadFromMovement(movement);
  }

  const matchType: TrackOrderResult['matchType'] = isPackage
    ? 'package'
    : item.input_barcode === q
      ? 'express'
      : 'inbound';

  const recentMovements = await listMovementsForItem(item.id, 8);

  return {
    query: q,
    matchType,
    detail,
    parentPack,
    truckLoad,
    recentMovements,
  };
}

/** 入库页：按快递单或入库条码带出历史登记信息 */
export async function getStockInPrefillByCode(code: string): Promise<{
  item: InventoryItem;
  productName: string;
  spec: string;
  weight: string;
  packaging: string;
  recipientName: string;
  recipientPhone: string;
  destination: string;
  qty: number;
  note: string;
  matchLabel: 'express' | 'inbound';
} | null> {
  const q = code.trim();
  if (!q) return null;

  const item = await getItemByBarcode(q);
  if (!item) return null;

  const detail = await getItemDetail(item.id);
  if (!detail) return null;

  const db = await getDatabase();
  const lastIn = await db.getFirstAsync<{ qty: number; recipient_name: string }>(
    `SELECT qty, recipient_name FROM stock_movements
     WHERE item_id = ? AND type = 'in' ORDER BY created_at DESC LIMIT 1`,
    [item.id],
  );

  return {
    item,
    productName: detail.name,
    spec: item.spec,
    weight: item.weight,
    packaging: detail.packaging,
    recipientName: detail.customer_name?.trim() || String(lastIn?.recipient_name ?? '').trim(),
    recipientPhone: detail.recipient_phone,
    destination: detail.destination?.trim() ?? '',
    qty: lastIn?.qty && lastIn.qty > 0 ? lastIn.qty : 1,
    note: detail.note,
    matchLabel: item.input_barcode === q ? 'express' : 'inbound',
  };
}

/** 订单首次入库日期（编辑页展示） */
export async function getItemFirstInboundDate(itemId: string): Promise<Date | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ created_at: string }>(
    `SELECT created_at FROM stock_movements
     WHERE item_id = ? AND type = 'in' ORDER BY created_at ASC LIMIT 1`,
    [itemId],
  );
  if (!row?.created_at) return null;
  const d = new Date(row.created_at);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 编辑订单：更新商品信息与最近入库登记的收发资料 */
export async function updateItemInboundProfile(
  itemId: string,
  params: {
    name: string;
    spec: string;
    unit: string;
    weight: string;
    note: string;
    packaging: string;
    recipientName: string;
    recipientPhone: string;
    destination: string;
  },
  actingStore: InventoryStoreSession,
): Promise<void> {
  await assertCanEditItemById(actingStore, itemId);
  const item = await getItemById(itemId);
  if (!item) throw new Error('订单不存在或已删除');

  const finalDest = persistFinalDestinationCode(params.destination);

  await upsertItem(
    {
      id: itemId,
      barcode: item.barcode,
      name: params.name.trim(),
      spec: params.spec,
      unit: params.unit,
      weight: params.weight,
      min_qty: item.min_qty,
      note: params.note.trim(),
      input_barcode: item.input_barcode,
    },
    { actingStore },
  );

  const db = await getDatabase();
  if (finalDest) {
    await db.runAsync('UPDATE inventory_items SET final_destination = ? WHERE id = ?', [
      finalDest,
      itemId,
    ]);
  }
  const lastIn = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM stock_movements
     WHERE item_id = ? AND type = 'in' ORDER BY created_at DESC LIMIT 1`,
    [itemId],
  );
  if (lastIn) {
    await db.runAsync(
      `UPDATE stock_movements
       SET recipient_name = ?, recipient_phone = ?, destination = ?, packaging = ?, item_name = ?
       WHERE id = ?`,
      [
        params.recipientName.trim(),
        params.recipientPhone.trim(),
        params.destination.trim(),
        params.packaging,
        params.name.trim(),
        lastIn.id,
      ],
    );
  }
}

export async function getItemDetail(id: string): Promise<InventoryItemDetail | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${ITEM_LIST_SELECT} FROM inventory_items i WHERE i.id = ?`,
    [id],
  );
  if (!row) return null;

  const lastIn = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT recipient_phone, packaging FROM stock_movements
     WHERE item_id = ? AND type = 'in' ORDER BY created_at DESC LIMIT 1`,
    [id],
  );
  const pack = await getPackedShipmentByBundleItemId(id);

  return {
    ...rowToItem(row),
    recipient_phone: String(lastIn?.recipient_phone ?? ''),
    packaging: String(lastIn?.packaging ?? ''),
    pack,
  };
}

/** 取消订单：删除商品记录；若为包裹则退回内含商品库存 */
export async function cancelInventoryItem(
  id: string,
  operator: string,
  actingStore?: InventoryStoreSession,
): Promise<void> {
  const db = await getDatabase();
  const item = await getItemById(id);
  if (!item) throw new Error('订单不存在或已删除');

  if (actingStore) {
    await assertCanEditItemById(actingStore, id);
  }

  const pack = await getPackedShipmentByBundleItemId(id);
  if (pack) {
    for (const line of pack.items) {
      const inner = await getItemById(line.item_id);
      if (!inner) continue;
      await applyStockMovement({
        barcode: inner.barcode,
        type: 'in',
        qty: line.qty,
        operator,
        note: `取消包裹 ${item.barcode}，退回库存`,
      });
    }
    await db.runAsync('DELETE FROM packed_shipment_items WHERE pack_id = ?', [pack.id]);
    await db.runAsync('DELETE FROM packed_shipments WHERE id = ?', [pack.id]);
  }

  await db.runAsync('DELETE FROM stock_movements WHERE item_id = ?', [id]);
  await db.runAsync('DELETE FROM inventory_items WHERE id = ?', [id]);
}

export async function listMovements(limit = 100): Promise<StockMovement[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(rowToMovement);
}

export async function getStats(): Promise<{
  itemCount: number;
  totalQty: number;
  lowStockCount: number;
  todayIn: number;
  todayOut: number;
  packCount: number;
}> {
  const db = await getDatabase();
  const items = await db.getFirstAsync<{ c: number; q: number; low: number }>(
    `SELECT COUNT(*) as c, COALESCE(SUM(qty_on_hand),0) as q,
      SUM(CASE WHEN qty_on_hand <= min_qty AND min_qty > 0 THEN 1 ELSE 0 END) as low
     FROM inventory_items`,
  );
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startIso = start.toISOString();
  const inRow = await db.getFirstAsync<{ n: number }>(
    `SELECT COALESCE(SUM(qty),0) as n FROM stock_movements WHERE type='in' AND created_at >= ?`,
    [startIso],
  );
  const outRow = await db.getFirstAsync<{ n: number }>(
    `SELECT COALESCE(SUM(qty),0) as n FROM stock_movements WHERE type='out' AND created_at >= ?`,
    [startIso],
  );
  const packRow = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM packed_shipments',
  );
  return {
    itemCount: items?.c ?? 0,
    totalQty: items?.q ?? 0,
    lowStockCount: items?.low ?? 0,
    todayIn: inRow?.n ?? 0,
    todayOut: outRow?.n ?? 0,
    packCount: packRow?.c ?? 0,
  };
}

/** 清空本机全部库存 / 订单 / 包裹 / 流水（测试重置用） */
export async function clearAllLocalInventoryData(): Promise<{
  items: number;
  movements: number;
  packs: number;
  packLines: number;
}> {
  const db = await getDatabase();

  const packLines = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM packed_shipment_items',
  );
  const packs = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM packed_shipments',
  );
  const movements = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM stock_movements',
  );
  const items = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM inventory_items',
  );

  await db.execAsync(`
    DELETE FROM packed_shipment_items;
    DELETE FROM packed_shipments;
    DELETE FROM stock_movements;
    DELETE FROM inventory_items;
  `);

  return {
    items: items?.c ?? 0,
    movements: movements?.c ?? 0,
    packs: packs?.c ?? 0,
    packLines: packLines?.c ?? 0,
  };
}

/** 清空本机 + 云端全部订单与包裹数据（测试重置用） */
export async function clearAllTestData(): Promise<{
  local: Awaited<ReturnType<typeof clearAllLocalInventoryData>>;
  cloud: { orders: number; packs: number } | null;
  cloudError?: string;
}> {
  const local = await clearAllLocalInventoryData();

  let cloud: { orders: number; packs: number } | null = null;
  let cloudError: string | undefined;
  try {
    const { clearAllCloudTracking } = await import('./trackingService');
    cloud = await clearAllCloudTracking();
  } catch (e: unknown) {
    cloudError = e instanceof Error ? e.message : '云端清空失败';
  }

  return { local, cloud, cloudError };
}
