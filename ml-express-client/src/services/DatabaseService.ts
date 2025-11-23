import * as SQLite from 'expo-sqlite';

type SyncStatus = 'pending' | 'synced';

interface OfflineOrderRow {
  id: string;
  data: string;
  status: string | null;
  sync_status: SyncStatus;
  error_message?: string | null;
  created_at: string;
  synced_at?: string | null;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  private async getDb() {
    if (this.db) return this.db;

    this.db = await SQLite.openDatabaseAsync('mlexpress.db');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_orders (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        status TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT
      );
    `);

    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_orders_sync_status
      ON offline_orders (sync_status);
    `);

    return this.db;
  }

  async saveOrder(order: any, options?: { syncStatus?: SyncStatus; errorMessage?: string }) {
    if (!order?.id) {
      console.warn('无法保存离线订单：缺少id');
      return;
    }

    const db = await this.getDb();
    const syncStatus = options?.syncStatus ?? 'pending';
    const payload = JSON.stringify(order);
    const fallbackStatus = order.status || order.sync_status || 'pending';
    const createdAt = order.create_time || new Date().toISOString();
    const syncedAt = syncStatus === 'synced' ? new Date().toISOString() : null;

    await db.runAsync(
      `INSERT OR REPLACE INTO offline_orders
        (id, data, status, sync_status, error_message, created_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        order.id,
        payload,
        fallbackStatus,
        syncStatus,
        options?.errorMessage || null,
        createdAt,
        syncedAt,
      ]
    );
  }

  async getPendingOrders(): Promise<OfflineOrderRow[]> {
    const db = await this.getDb();
    return await db.getAllAsync(
      `SELECT * FROM offline_orders WHERE sync_status != 'synced' ORDER BY created_at ASC`
    );
  }

  async markOrderSynced(id: string) {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE offline_orders SET sync_status = 'synced', synced_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  }

  async clearSyncedOrders() {
    const db = await this.getDb();
    await db.runAsync(`DELETE FROM offline_orders WHERE sync_status = 'synced'`);
  }
}

export const databaseService = new DatabaseService();

