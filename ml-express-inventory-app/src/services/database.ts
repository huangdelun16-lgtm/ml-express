import * as SQLite from 'expo-sqlite';

const DB_NAME = 'ml_inventory.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS inventory_items (
          id TEXT PRIMARY KEY NOT NULL,
          barcode TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          spec TEXT DEFAULT '',
          unit TEXT DEFAULT '件',
          qty_on_hand REAL NOT NULL DEFAULT 0,
          min_qty REAL NOT NULL DEFAULT 0,
          note TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS stock_movements (
          id TEXT PRIMARY KEY NOT NULL,
          item_id TEXT NOT NULL,
          barcode TEXT NOT NULL,
          item_name TEXT NOT NULL,
          type TEXT NOT NULL,
          qty REAL NOT NULL,
          qty_before REAL NOT NULL,
          qty_after REAL NOT NULL,
          operator TEXT NOT NULL,
          note TEXT DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_items_barcode ON inventory_items(barcode);
        CREATE TABLE IF NOT EXISTS packed_shipments (
          id TEXT PRIMARY KEY NOT NULL,
          bundle_item_id TEXT NOT NULL,
          bundle_barcode TEXT NOT NULL,
          bundle_name TEXT NOT NULL,
          operator TEXT NOT NULL,
          note TEXT DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS packed_shipment_items (
          id TEXT PRIMARY KEY NOT NULL,
          pack_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          item_barcode TEXT NOT NULL,
          item_name TEXT NOT NULL,
          qty REAL NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_pack_created ON packed_shipments(created_at DESC);
        CREATE TABLE IF NOT EXISTS truck_route_fees (
          origin_code TEXT NOT NULL,
          destination_code TEXT NOT NULL,
          fee TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL,
          PRIMARY KEY (origin_code, destination_code)
        );
        CREATE TABLE IF NOT EXISTS cloud_sync_queue (
          id TEXT PRIMARY KEY NOT NULL,
          op_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_cloud_sync_queue_created ON cloud_sync_queue(created_at ASC);
        CREATE TABLE IF NOT EXISTS hub_transport_fee_payments (
          pack_barcode TEXT PRIMARY KEY NOT NULL,
          fee TEXT NOT NULL DEFAULT '',
          leg_destination TEXT DEFAULT '',
          origin_store_code TEXT DEFAULT '',
          operator TEXT NOT NULL,
          store_code TEXT NOT NULL DEFAULT '',
          paid_at TEXT NOT NULL
        );
      `);
      await migrateInventorySchema(db);
      return db;
    });
  }
  return dbPromise;
}

async function migrateInventorySchema(db: SQLite.SQLiteDatabase): Promise<void> {
  const itemCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(inventory_items)');
  const itemNames = new Set(itemCols.map((c) => c.name));
  if (!itemNames.has('weight')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN weight TEXT DEFAULT ''`);
  }
  if (!itemNames.has('input_barcode')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN input_barcode TEXT DEFAULT ''`);
  }

  const moveCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(stock_movements)');
  const moveNames = new Set(moveCols.map((c) => c.name));
  if (!moveNames.has('recipient_name')) {
    await db.execAsync(`ALTER TABLE stock_movements ADD COLUMN recipient_name TEXT DEFAULT ''`);
  }
  if (!moveNames.has('recipient_phone')) {
    await db.execAsync(`ALTER TABLE stock_movements ADD COLUMN recipient_phone TEXT DEFAULT ''`);
  }
  if (!moveNames.has('destination')) {
    await db.execAsync(`ALTER TABLE stock_movements ADD COLUMN destination TEXT DEFAULT ''`);
  }
  if (!moveNames.has('packaging')) {
    await db.execAsync(`ALTER TABLE stock_movements ADD COLUMN packaging TEXT DEFAULT ''`);
  }
  if (!moveNames.has('input_barcode')) {
    await db.execAsync(`ALTER TABLE stock_movements ADD COLUMN input_barcode TEXT DEFAULT ''`);
  }
  if (!moveNames.has('detail_address')) {
    await db.execAsync(`ALTER TABLE stock_movements ADD COLUMN detail_address TEXT DEFAULT ''`);
  }
  if (!moveNames.has('origin_store_id')) {
    await db.execAsync(`ALTER TABLE stock_movements ADD COLUMN origin_store_id TEXT DEFAULT ''`);
  }
  if (!moveNames.has('origin_store_code')) {
    await db.execAsync(`ALTER TABLE stock_movements ADD COLUMN origin_store_code TEXT DEFAULT ''`);
  }
  if (!moveNames.has('origin_store_name')) {
    await db.execAsync(`ALTER TABLE stock_movements ADD COLUMN origin_store_name TEXT DEFAULT ''`);
  }

  if (!itemNames.has('owner_store_code')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN owner_store_code TEXT DEFAULT ''`);
  }
  if (!itemNames.has('final_destination')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN final_destination TEXT DEFAULT ''`);
    await backfillFinalDestination(db);
  }
  if (!itemNames.has('hub_arrived_at')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN hub_arrived_at TEXT DEFAULT ''`);
  }
  if (!itemNames.has('recipient_name')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN recipient_name TEXT DEFAULT ''`);
    await backfillItemRecipientNames(db);
  }
  if (!itemNames.has('customer_signed_at')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN customer_signed_at TEXT DEFAULT ''`);
  }
  if (!itemNames.has('packed_at')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN packed_at TEXT DEFAULT ''`);
  }
  if (!itemNames.has('packed_bundle_barcode')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN packed_bundle_barcode TEXT DEFAULT ''`);
  }
  if (!itemNames.has('hub_transit_released_at')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN hub_transit_released_at TEXT DEFAULT ''`);
  }
  if (!itemNames.has('hub_transit_shipped_at')) {
    await db.execAsync(`ALTER TABLE inventory_items ADD COLUMN hub_transit_shipped_at TEXT DEFAULT ''`);
  }

  const packCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(packed_shipments)');
  const packNames = new Set(packCols.map((c) => c.name));
  if (!packNames.has('owner_store_code')) {
    await db.execAsync(`ALTER TABLE packed_shipments ADD COLUMN owner_store_code TEXT DEFAULT ''`);
  }
  if (!packNames.has('transport_fee')) {
    await db.execAsync(`ALTER TABLE packed_shipments ADD COLUMN transport_fee TEXT DEFAULT ''`);
  }
  if (!packNames.has('truck_leg_destination')) {
    await db.execAsync(`ALTER TABLE packed_shipments ADD COLUMN truck_leg_destination TEXT DEFAULT ''`);
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS hub_transport_fee_payments (
      pack_barcode TEXT PRIMARY KEY NOT NULL,
      fee TEXT NOT NULL DEFAULT '',
      leg_destination TEXT DEFAULT '',
      origin_store_code TEXT DEFAULT '',
      operator TEXT NOT NULL,
      store_code TEXT NOT NULL DEFAULT '',
      paid_at TEXT NOT NULL
    );
  `);

  await backfillItemOwnerCodes(db);
  await backfillItemRecipientNames(db);
  await backfillPackedItemFlags(db);
  await backfillHubTransitShippedFlags(db);
}

async function backfillHubTransitShippedFlags(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(
    `UPDATE inventory_items
     SET hub_transit_shipped_at = packed_at,
         hub_transit_released_at = '',
         updated_at = packed_at
     WHERE TRIM(COALESCE(hub_transit_released_at, '')) != ''
       AND TRIM(COALESCE(packed_at, '')) != ''
       AND qty_on_hand = 0
       AND TRIM(COALESCE(hub_transit_shipped_at, '')) = ''`,
  );
}

async function backfillPackedItemFlags(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(
    `UPDATE inventory_items
     SET packed_at = updated_at
     WHERE TRIM(COALESCE(packed_at, '')) = ''
       AND id IN (SELECT item_id FROM packed_shipment_items)`,
  );
  await db.execAsync(
    `UPDATE inventory_items
     SET packed_bundle_barcode = (
       SELECT p.bundle_barcode FROM packed_shipment_items psi
       INNER JOIN packed_shipments p ON p.id = psi.pack_id
       WHERE psi.item_id = inventory_items.id
       ORDER BY p.created_at DESC LIMIT 1
     )
     WHERE TRIM(COALESCE(packed_bundle_barcode, '')) = ''
       AND id IN (SELECT item_id FROM packed_shipment_items)`,
  );
  await db.execAsync(
    `UPDATE inventory_items
     SET packed_at = (
       SELECT MAX(m.created_at) FROM stock_movements m
       WHERE m.item_id = inventory_items.id AND m.type = 'out' AND m.note LIKE '打包入 %'
     )
     WHERE TRIM(COALESCE(packed_at, '')) = ''
       AND qty_on_hand = 0
       AND TRIM(COALESCE(hub_arrived_at, '')) = ''
       AND TRIM(COALESCE(customer_signed_at, '')) = ''
       AND EXISTS (
         SELECT 1 FROM stock_movements m
         WHERE m.item_id = inventory_items.id AND m.type = 'out' AND m.note LIKE '打包入 %'
       )`,
  );
}

async function backfillItemRecipientNames(db: SQLite.SQLiteDatabase): Promise<void> {
  const richness = `(
    CASE
      WHEN TRIM(m.note) LIKE '%总费用%' THEN 0
      WHEN TRIM(m.recipient_name) != '' OR TRIM(m.recipient_phone) != '' THEN 1
      WHEN TRIM(m.packaging) != '' THEN 2
      ELSE 3
    END)`;
  await db.execAsync(
    `UPDATE inventory_items
     SET recipient_name = (
       SELECT m.recipient_name FROM stock_movements m
       WHERE m.item_id = inventory_items.id AND m.type = 'in' AND TRIM(m.recipient_name) != ''
       ORDER BY ${richness}, m.created_at DESC LIMIT 1
     )
     WHERE TRIM(COALESCE(recipient_name, '')) = ''`,
  );
}

async function backfillFinalDestination(db: SQLite.SQLiteDatabase): Promise<void> {
  const { normalizePackDestination } = await import('../constants/destinationOptions');
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM inventory_items WHERE TRIM(COALESCE(final_destination, '')) = ''`,
  );
  for (const row of rows) {
    const destRow = await db.getFirstAsync<{ destination: string }>(
      `SELECT destination FROM stock_movements
       WHERE item_id = ? AND type = 'in' AND TRIM(destination) != ''
       ORDER BY created_at ASC LIMIT 1`,
      [row.id],
    );
    if (!destRow?.destination?.trim()) continue;
    const code =
      normalizePackDestination(destRow.destination) ||
      destRow.destination.trim().toUpperCase().slice(0, 3);
    if (!code) continue;
    await db.runAsync('UPDATE inventory_items SET final_destination = ? WHERE id = ?', [
      code,
      row.id,
    ]);
  }
}

async function backfillItemOwnerCodes(db: SQLite.SQLiteDatabase): Promise<void> {
  const { inferOwnerKeyFromItem } = await import('../utils/storeOwnership');
  const rows = await db.getAllAsync<{ id: string; barcode: string }>(
    `SELECT id, barcode FROM inventory_items
     WHERE owner_store_code IS NULL OR TRIM(owner_store_code) = ''`,
  );

  for (const row of rows) {
    const destRow = await db.getFirstAsync<{ destination: string }>(
      `SELECT destination FROM stock_movements
       WHERE item_id = ? AND type = 'in' AND TRIM(destination) != ''
       ORDER BY created_at ASC LIMIT 1`,
      [row.id],
    );
    const key = inferOwnerKeyFromItem({
      barcode: row.barcode,
      destination: destRow?.destination,
    });
    if (!key) continue;
    await db.runAsync('UPDATE inventory_items SET owner_store_code = ? WHERE id = ?', [
      key,
      row.id,
    ]);
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
