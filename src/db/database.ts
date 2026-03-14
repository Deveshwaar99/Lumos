import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import { seedDatabase } from './seed';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('mymoney.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    try {
      await runMigrations(db);
    } catch (e) {
      console.error('[DB] Migration failed:', e);
    }
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM transaction_splits');
  await database.execAsync('DELETE FROM transactions');
  await database.execAsync('DELETE FROM fixed_deposits');
  await database.execAsync('DELETE FROM budgets');
  await database.execAsync('DELETE FROM categories');
  await database.execAsync('DELETE FROM accounts');
  await database.execAsync('DELETE FROM settings');
  await seedDatabase(database);
}
