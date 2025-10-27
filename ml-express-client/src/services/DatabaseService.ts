import * as SQLite from 'expo-sqlite';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize() {
    this.db = await SQLite.openDatabaseAsync('mlexpress.db');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY, status TEXT, sender_name TEXT,
        receiver_name TEXT, data TEXT, created_at TEXT
      );
    `);
  }

  async saveOrder(order: any) {
    if (!this.db) await this.initialize();
  }

  async getAllOrders() {
    if (!this.db) await this.initialize();
    return await this.db!.getAllAsync('SELECT * FROM orders');
  }
}

export const databaseService = new DatabaseService();
