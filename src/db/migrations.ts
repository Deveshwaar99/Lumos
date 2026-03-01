import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATIONS: Array<{ version: number; run: (db: SQLiteDatabase) => Promise<void> }> = [
  {
    version: 1,
    run: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income','expense')),
          icon TEXT NOT NULL,
          color TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('cash','bank','card','savings','other')),
          icon TEXT NOT NULL,
          opening_balance_cents INTEGER NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'USD'
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK(type IN ('income','expense')),
          amount_cents INTEGER NOT NULL,
          currency TEXT NOT NULL,
          category_id TEXT NOT NULL REFERENCES categories(id),
          account_id TEXT NOT NULL REFERENCES accounts(id),
          note TEXT,
          date TEXT NOT NULL,
          linked_transaction_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS budgets (
          id TEXT PRIMARY KEY,
          month TEXT NOT NULL,
          category_id TEXT NOT NULL REFERENCES categories(id),
          limit_cents INTEGER NOT NULL,
          alert_threshold_pct INTEGER NOT NULL DEFAULT 80,
          enabled INTEGER NOT NULL DEFAULT 1,
          UNIQUE(month, category_id)
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
        CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
      `);
    },
  },
  {
    version: 2,
    run: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS transaction_splits (
          id TEXT PRIMARY KEY,
          transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
          account_id TEXT NOT NULL REFERENCES accounts(id),
          amount_cents INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_splits_transaction_id ON transaction_splits(transaction_id);
        CREATE INDEX IF NOT EXISTS idx_splits_account_id ON transaction_splits(account_id);
      `);

      const rows = await db.getAllAsync<{
        id: string;
        account_id: string;
        amount_cents: number;
      }>('SELECT id, account_id, amount_cents FROM transactions');

      for (const row of rows) {
        const splitId = row.id + '_s0';
        await db.runAsync(
          'INSERT INTO transaction_splits (id, transaction_id, account_id, amount_cents) VALUES (?, ?, ?, ?)',
          splitId, row.id, row.account_id, row.amount_cents
        );
      }

      await db.execAsync(`
        ALTER TABLE transactions RENAME COLUMN amount_cents TO total_amount_cents;
      `);

      await db.execAsync(`
        DROP INDEX IF EXISTS idx_transactions_account_id;
      `);
    },
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL PRIMARY KEY
    );
  `);

  const versionResult = await db.getAllAsync<{ version: number | null }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  );
  let currentVersion = versionResult[0]?.version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      await migration.run(db);
      await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', migration.version);
      currentVersion = migration.version;
    }
  }
}
