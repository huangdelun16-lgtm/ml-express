import type {
  InventoryItem,
  InventoryItemDetail,
  MovementType,
  PackedShipment,
  PackedShipmentDetail,
  PackedShipmentItem,
  StockMovement,
} from '../types/inventory';
import { buildPackageNumberBody, formatPackageSequence } from '../utils/packageNumber';
import { getDatabase, newId, nowIso } from './database';

const CUSTOMER_NAME_SUBQUERY = `(
  SELECT m.recipient_name FROM stock_movements m
  WHERE m.item_id = i.id AND m.type = 'in' AND TRIM(m.recipient_name) != ''
  ORDER BY m.created_at DESC LIMIT 1
)`;
const CUSTOMER_NAME_SELECT = `${CUSTOMER_NAME_SUBQUERY} AS customer_name`;

const DESTINATION_SUBQUERY = `(
  SELECT m.destination FROM stock_movements m
  WHERE m.item_id = i.id AND m.type = 'in' AND TRIM(m.destination) != ''
  ORDER BY m.created_at DESC LIMIT 1
)`;
const DESTINATION_SELECT = `${DESTINATION_SUBQUERY} AS destination`;
const ITEM_LIST_SELECT = `i.*, ${CUSTOMER_NAME_SELECT}, ${DESTINATION_SELECT}`;

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
    customer_name: String(row.customer_name ?? ''),
    destination: String(row.destination ?? ''),
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
    created_at: String(row.created_at),
  };
}

export async function listItems(search?: string): Promise<InventoryItem[]> {
  const db = await getDatabase();
  const q = search?.trim();
  const rows = q
    ? await db.getAllAsync<Record<string, unknown>>(
        `SELECT ${ITEM_LIST_SELECT} FROM inventory_items i
         WHERE i.barcode LIKE ? OR i.input_barcode LIKE ? OR i.name LIKE ? OR i.spec LIKE ?
           OR ${CUSTOMER_NAME_SUBQUERY} LIKE ? OR ${DESTINATION_SUBQUERY} LIKE ?
         ORDER BY i.updated_at DESC`,
        [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
      )
    : await db.getAllAsync<Record<string, unknown>>(
        `SELECT ${ITEM_LIST_SELECT} FROM inventory_items i ORDER BY i.updated_at DESC`,
      );
  return rows.map(rowToItem);
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
): Promise<InventoryItem> {
  const db = await getDatabase();
  const existing = await getItemByBarcode(input.barcode);
  const ts = nowIso();
  if (existing) {
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
    return (await getItemByBarcode(input.barcode))!;
  }
  const id = input.id ?? newId();
  const qty = input.qty_on_hand ?? 0;
  await db.runAsync(
    `INSERT INTO inventory_items (id, barcode, input_barcode, name, spec, unit, weight, qty_on_hand, min_qty, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ts,
      ts,
    ],
  );
  return (await getItemByBarcode(input.barcode))!;
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
  createIfMissing?: { name: string; spec?: string; unit?: string };
}): Promise<{ item: InventoryItem; movement: StockMovement }> {
  const qty = Math.abs(params.qty);
  if (qty <= 0) throw new Error('数量必须大于 0');

  const db = await getDatabase();
  let item = await getItemByBarcode(params.barcode);

  if (!item && params.type === 'in' && params.createIfMissing) {
    item = await upsertItem({
      barcode: params.barcode,
      input_barcode: params.inputBarcode?.trim() ?? '',
      name: params.createIfMissing.name,
      spec: params.createIfMissing.spec ?? '',
      unit: '1 Pcs',
      weight: '',
      min_qty: 0,
      note: '',
      qty_on_hand: 0,
    });
  }

  if (!item) throw new Error('未找到该条码商品，请先在商品库建档或扫码入库时填写名称');

  const before = item.qty_on_hand;
  let after = before;
  if (params.type === 'in') after = before + qty;
  else if (params.type === 'out') {
    if (before < qty) throw new Error(`库存不足：当前 ${before}，需要出库 ${qty}`);
    after = before - qty;
  } else after = qty;

  const ts = nowIso();
  const inputCode = params.inputBarcode?.trim() ?? '';
  if (params.type === 'in' && inputCode) {
    await db.runAsync(
      'UPDATE inventory_items SET qty_on_hand=?, input_barcode=?, updated_at=? WHERE id=?',
      [after, inputCode, ts, item.id],
    );
    item = { ...item, input_barcode: inputCode, updated_at: ts };
  } else {
    await db.runAsync(
      'UPDATE inventory_items SET qty_on_hand=?, updated_at=? WHERE id=?',
      [after, ts, item.id],
    );
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
    created_at: ts,
  };

  await db.runAsync(
    `INSERT INTO stock_movements
     (id, item_id, barcode, item_name, type, qty, qty_before, qty_after, operator, note,
      recipient_name, recipient_phone, destination, packaging, input_barcode, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      movement.created_at,
    ],
  );

  return { item: { ...item, qty_on_hand: after, updated_at: ts }, movement };
}

/** 曾入库且仍有库存的商品，可用于打包快递 */
export async function listPackableItems(search?: string): Promise<InventoryItem[]> {
  const db = await getDatabase();
  const q = search?.trim();
  const rows = q
    ? await db.getAllAsync<Record<string, unknown>>(
        `SELECT DISTINCT ${ITEM_LIST_SELECT} FROM inventory_items i
         INNER JOIN stock_movements m ON m.item_id = i.id AND m.type = 'in'
         WHERE i.qty_on_hand > 0
           AND (i.barcode LIKE ? OR i.input_barcode LIKE ? OR i.name LIKE ? OR i.spec LIKE ?
             OR ${CUSTOMER_NAME_SUBQUERY} LIKE ? OR ${DESTINATION_SUBQUERY} LIKE ?)
         ORDER BY i.updated_at DESC`,
        [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
      )
    : await db.getAllAsync<Record<string, unknown>>(
        `SELECT DISTINCT ${ITEM_LIST_SELECT} FROM inventory_items i
         INNER JOIN stock_movements m ON m.item_id = i.id AND m.type = 'in'
         WHERE i.qty_on_hand > 0
         ORDER BY i.updated_at DESC`,
      );
  return rows.map(rowToItem);
}

export async function createPackedShipment(params: {
  operator: string;
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

  const bundleItem = await upsertItem({
    barcode: params.bundle.barcode.trim(),
    name: params.bundle.name.trim(),
    spec: params.bundle.spec,
    unit: params.bundle.unit,
    weight: params.bundle.weight,
    min_qty: 0,
    note: params.bundle.note,
    qty_on_hand: 1,
  });

  const packId = newId();
  const ts = nowIso();
  const pack: PackedShipment = {
    id: packId,
    bundle_item_id: bundleItem.id,
    bundle_barcode: bundleItem.barcode,
    bundle_name: bundleItem.name,
    operator: params.operator,
    note: params.bundle.note,
    created_at: ts,
  };

  await db.runAsync(
    `INSERT INTO packed_shipments
     (id, bundle_item_id, bundle_barcode, bundle_name, operator, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      pack.id,
      pack.bundle_item_id,
      pack.bundle_barcode,
      pack.bundle_name,
      pack.operator,
      pack.note,
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
    qty: Number(row.qty) || 0,
  };
}

const PACKED_ITEM_SELECT = `psi.*, ii.input_barcode AS item_input_barcode`;

export async function listPackedShipments(search?: string): Promise<PackedShipmentDetail[]> {
  const db = await getDatabase();
  const q = search?.trim();
  const rows = q
    ? await db.getAllAsync<Record<string, unknown>>(
        `SELECT p.*, i.spec, i.unit, i.weight
         FROM packed_shipments p
         LEFT JOIN inventory_items i ON i.id = p.bundle_item_id
         WHERE p.bundle_barcode LIKE ? OR p.bundle_name LIKE ? OR p.operator LIKE ? OR p.note LIKE ?
         ORDER BY p.created_at DESC`,
        [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
      )
    : await db.getAllAsync<Record<string, unknown>>(
        `SELECT p.*, i.spec, i.unit, i.weight
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
    result.push({
      id: String(row.id),
      bundle_item_id: String(row.bundle_item_id),
      bundle_barcode: String(row.bundle_barcode),
      bundle_name: String(row.bundle_name),
      operator: String(row.operator),
      note: String(row.note ?? ''),
      created_at: String(row.created_at),
      spec: String(row.spec ?? ''),
      unit: String(row.unit ?? ''),
      weight: String(row.weight ?? ''),
      items: itemRows.map(rowToPackedShipmentItem),
    });
  }
  return result;
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
  return {
    id: String(row.id),
    bundle_item_id: String(row.bundle_item_id),
    bundle_barcode: String(row.bundle_barcode),
    bundle_name: String(row.bundle_name),
    operator: String(row.operator),
    note: String(row.note ?? ''),
    created_at: String(row.created_at),
    spec: String(row.spec ?? ''),
    unit: String(row.unit ?? ''),
    weight: String(row.weight ?? ''),
    items: itemRows.map(rowToPackedShipmentItem),
  };
}

export async function getPackedShipmentByBundleItemId(
  bundleItemId: string,
): Promise<PackedShipmentDetail | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT p.*, i.spec, i.unit, i.weight
     FROM packed_shipments p
     LEFT JOIN inventory_items i ON i.id = p.bundle_item_id
     WHERE p.bundle_item_id = ?`,
    [bundleItemId],
  );
  if (!row) return null;
  return packedShipmentRowToDetail(row, db);
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
export async function cancelInventoryItem(id: string, operator: string): Promise<void> {
  const db = await getDatabase();
  const item = await getItemById(id);
  if (!item) throw new Error('订单不存在或已删除');

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
