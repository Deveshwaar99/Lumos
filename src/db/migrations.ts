import type { SQLiteDatabase } from 'expo-sqlite';

export const SCHEMA_VERSION = 6;

async function createSchema(db: SQLiteDatabase): Promise<void> {
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
      type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
      total_amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      category_id TEXT,
      account_id TEXT,
      account2_id TEXT,
      note TEXT,
      date TEXT NOT NULL,
      linked_transaction_id TEXT,
      fd_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_splits (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      amount_cents INTEGER NOT NULL
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

    CREATE TABLE IF NOT EXISTS fixed_deposits (
      id TEXT PRIMARY KEY,
      fd_account_id TEXT NOT NULL REFERENCES accounts(id),
      source_account_id TEXT NOT NULL REFERENCES accounts(id),
      credit_account_id TEXT NOT NULL REFERENCES accounts(id),
      principal_cents INTEGER NOT NULL,
      annual_interest_rate REAL NOT NULL,
      start_date TEXT NOT NULL,
      maturity_date TEXT NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      note TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','matured','closed')),
      interest_category_id TEXT REFERENCES categories(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_splits_transaction_id ON transaction_splits(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_splits_account_id ON transaction_splits(account_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
    CREATE INDEX IF NOT EXISTS idx_fd_maturity_date ON fixed_deposits(maturity_date);
    CREATE INDEX IF NOT EXISTS idx_fd_status ON fixed_deposits(status);
  `);
}

async function migrateV2(db: SQLiteDatabase): Promise<void> {
  // V2 originally created tags/transaction_tags tables — now removed
}

async function migrateV3(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DROP TABLE IF EXISTS transaction_tags;
    DROP TABLE IF EXISTS tags;
  `);
}

async function migrateV4(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      total_amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      category_id TEXT,
      note TEXT,
      account_id TEXT NOT NULL,
      to_account_id TEXT,
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_due_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await db.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_recurring_next_due ON recurring_transactions(next_due_date);',
  );
  await db.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(is_active);',
  );
}
async function migrateV5(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;

    -- Add account2_id: "to" account for transfers (was only in transaction_splits as 2nd row).
    CREATE TABLE transactions__v5 (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
      total_amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      category_id TEXT,
      account_id TEXT,
      account2_id TEXT,
      note TEXT,
      date TEXT NOT NULL,
      linked_transaction_id TEXT,
      fd_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Copy all rows; account2_id is NULL until the transfer backfill below.
    INSERT INTO transactions__v5 (
      id,
      type,
      total_amount_cents,
      currency,
      category_id,
      account_id,
      account2_id,
      note,
      date,
      linked_transaction_id,
      fd_id,
      created_at,
      updated_at
    )
    SELECT
      id,
      type,
      total_amount_cents,
      currency,
      category_id,
      account_id,
      NULL,
      note,
      date,
      linked_transaction_id,
      fd_id,
      created_at,
      updated_at
    FROM transactions;

    -- Transfers: second split (by rowid order) is the counterparty account.
    UPDATE transactions__v5
    SET account2_id = (
      SELECT s.account_id
      FROM transaction_splits s
      WHERE s.transaction_id = transactions__v5.id
      ORDER BY s.rowid
      LIMIT 1 OFFSET 1
    )
    WHERE type = 'transfer';

    DROP TABLE transactions;
    ALTER TABLE transactions__v5 RENAME TO transactions;

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

async function migrateV6(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stock_sms_log (
      id TEXT PRIMARY KEY,
      provider_sms_id TEXT,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      body_hash TEXT NOT NULL UNIQUE,
      received_at INTEGER NOT NULL,
      parsed_at TEXT NOT NULL,
      parse_status TEXT NOT NULL CHECK(parse_status IN ('success', 'failed', 'ignored')),
      parse_error TEXT,
      movement_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_stock_sms_received_at
      ON stock_sms_log(received_at DESC);

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      sms_id TEXT REFERENCES stock_sms_log(id) ON DELETE SET NULL,
      stock_code TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      direction TEXT NOT NULL CHECK(direction IN ('buy', 'sell')),
      trade_date TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('sms', 'manual')),
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_stock_movements_code
      ON stock_movements(stock_code);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_date
      ON stock_movements(trade_date DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_sms_id
      ON stock_movements(sms_id);

    CREATE TABLE IF NOT EXISTS stock_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.runAsync(
    "INSERT OR IGNORE INTO stock_meta (key, value) VALUES ('senderId', 'CDS-Alerts')",
  );
  await db.runAsync(
    "INSERT OR IGNORE INTO stock_meta (key, value) VALUES ('firstSyncWindowDays', '365')",
  );
}

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL PRIMARY KEY
    );
  `);

  const versionResult = await db.getAllAsync<{ version: number | null }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1',
  );
  const currentVersion = versionResult[0]?.version ?? 0;
  const migrationFunctions = new Map<
    number,
    (db: SQLiteDatabase) => Promise<void>
  >([
    [1, createSchema],
    [2, migrateV2],
    [3, migrateV3],
    [4, migrateV4],
    [5, migrateV5],
    [6, migrateV6],
  ]);
  for (let i = currentVersion + 1; i <= SCHEMA_VERSION; i++) {
    const migrationFunc = migrationFunctions.get(i);
    if (migrationFunc) await migrationFunc(db);
  }
  if (currentVersion < SCHEMA_VERSION) {
    await db.runAsync(
      'INSERT OR REPLACE INTO schema_version (version) VALUES (?)',
      SCHEMA_VERSION,
    );
  }
}
