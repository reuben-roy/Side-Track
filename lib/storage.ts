import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('storage.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS key_value (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
      return db;
    })();
  }
  return dbPromise;
};

export const sqliteStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const database = await getDb();
    const result = await database.getFirstAsync<{ value: string }>(
      'SELECT value FROM key_value WHERE key = ?',
      [key]
    );
    return result ? result.value : null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const database = await getDb();
    await database.runAsync(
      'INSERT OR REPLACE INTO key_value (key, value) VALUES (?, ?)',
      [key, value]
    );
  },
  removeItem: async (key: string): Promise<void> => {
    const database = await getDb();
    await database.runAsync('DELETE FROM key_value WHERE key = ?', [key]);
  },
  getAllKeys: async (): Promise<string[]> => {
    const database = await getDb();
    const result = await database.getAllAsync<{ key: string }>(
      'SELECT key FROM key_value'
    );
    return result.map((row) => row.key);
  },
  clear: async (): Promise<void> => {
    const database = await getDb();
    await database.runAsync('DELETE FROM key_value');
  },
};
