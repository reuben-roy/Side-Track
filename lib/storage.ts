import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import {
    initializeDatabase
} from './database';

// Re-export all database functions for easy access
export * from './database';

// Check if we're running on server (SSR) - SQLite doesn't work there
const isServer = typeof window === 'undefined' && Platform.OS === 'web';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Legacy database for migration purposes
const getDb = () => {
  if (isServer) {
    // Return a rejected promise on server to prevent SQLite usage
    return Promise.reject(new Error('SQLite is not available on server'));
  }
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('storage.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS key_value (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
      // Initialize new database (will migrate data)
      await initializeDatabase();
      return db;
    })();
  }
  return dbPromise;
};

// Server-safe storage - returns no-ops on server, real SQLite on client
export const sqliteStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isServer) return null;
    const database = await getDb();
    const result = await database.getFirstAsync<{ value: string }>(
      'SELECT value FROM key_value WHERE key = ?',
      [key]
    );
    return result ? result.value : null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isServer) return;
    const database = await getDb();
    await database.runAsync(
      'INSERT OR REPLACE INTO key_value (key, value) VALUES (?, ?)',
      [key, value]
    );
  },
  removeItem: async (key: string): Promise<void> => {
    if (isServer) return;
    const database = await getDb();
    await database.runAsync('DELETE FROM key_value WHERE key = ?', [key]);
  },
  getAllKeys: async (): Promise<string[]> => {
    if (isServer) return [];
    const database = await getDb();
    const result = await database.getAllAsync<{ key: string }>(
      'SELECT key FROM key_value'
    );
    return result.map((row) => row.key);
  },
  clear: async (): Promise<void> => {
    if (isServer) return;
    const database = await getDb();
    await database.runAsync('DELETE FROM key_value');
  },
};
