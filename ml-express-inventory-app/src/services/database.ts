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

  const packCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(packed_shipments)');
  const packNames = new Set(packCols.map((c) => c.name));
  if (!packNames.has('owner_store_code')) {
    await db.execAsync(`ALTER TABLE packed_shipments ADD COLUMN owner_store_code TEXT DEFAULT ''`);
  }

  await backfillItemOwnerCodes(db);
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
