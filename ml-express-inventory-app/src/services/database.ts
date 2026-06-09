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
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
