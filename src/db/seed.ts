import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { generateId } from '../utils/uuid';
import { parseCdsAlert } from '../services/cdsSmsParser';
import {
  startOfMonth,
  endOfMonth,
  addDays,
  format,
  differenceInDays,
} from 'date-fns';

const EXPENSE_CATEGORIES = [
  { id: 'seed-exp-1', name: 'Food & Dining', icon: 'food', color: '#FF6B6B' },
  { id: 'seed-exp-2', name: 'Transport', icon: 'car', color: '#4ECDC4' },
  { id: 'seed-exp-3', name: 'Housing', icon: 'home', color: '#45B7D1' },
  { id: 'seed-exp-4', name: 'Shopping', icon: 'cart', color: '#96CEB4' },
  { id: 'seed-exp-5', name: 'Entertainment', icon: 'movie', color: '#FFEAA7' },
  { id: 'seed-exp-6', name: 'Health', icon: 'heart-pulse', color: '#DDA0DD' },
  { id: 'seed-exp-7', name: 'Education', icon: 'school', color: '#87CEEB' },
  { id: 'seed-exp-8', name: 'Utilities', icon: 'flash', color: '#FFB347' },
  { id: 'seed-exp-9', name: 'Personal', icon: 'account', color: '#C9B1FF' },
  {
    id: 'seed-exp-10',
    name: 'Other Expense',
    icon: 'dots-horizontal',
    color: '#B0BEC5',
  },
];

const INCOME_CATEGORIES = [
  { id: 'seed-inc-1', name: 'Salary', icon: 'cash', color: '#4CAF50' },
  { id: 'seed-inc-2', name: 'Freelance', icon: 'laptop', color: '#8BC34A' },
  {
    id: 'seed-inc-3',
    name: 'Investments',
    icon: 'chart-line',
    color: '#FF9800',
  },
  { id: 'seed-inc-4', name: 'Gifts', icon: 'gift', color: '#E91E63' },
  {
    id: 'seed-inc-5',
    name: 'Other Income',
    icon: 'cash-multiple',
    color: '#607D8B',
  },
  {
    id: 'seed-inc-6',
    name: 'Interest Income',
    icon: 'percent-outline',
    color: '#26A69A',
  },
];

const DEFAULT_ACCOUNTS = [
  {
    id: 'seed-acc-1',
    name: 'Cash',
    type: 'cash',
    icon: 'wallet',
    openingBalanceCents: 0,
  },
  {
    id: 'seed-acc-2',
    name: 'Bank Account',
    type: 'bank',
    icon: 'bank',
    openingBalanceCents: 0,
  },
  {
    id: 'seed-acc-3',
    name: 'Credit Card',
    type: 'card',
    icon: 'credit-card',
    openingBalanceCents: 0,
  },
];

const DEFAULT_SETTINGS: Record<string, string> = {
  decimalPlaces: '2',
  currencyCode: 'USD',
  currencySymbol: '$',
};

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const alreadySeeded = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'seeded'",
  );
  if (alreadySeeded) return;

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.runAsync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, value],
    );
  }

  for (const cat of EXPENSE_CATEGORIES) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
      [cat.id, cat.name, 'expense', cat.icon, cat.color],
    );
  }

  for (const cat of INCOME_CATEGORIES) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
      [cat.id, cat.name, 'income', cat.icon, cat.color],
    );
  }

  for (const acc of DEFAULT_ACCOUNTS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO accounts (id, name, type, icon, opening_balance_cents, currency) VALUES (?, ?, ?, ?, ?, ?)',
      [acc.id, acc.name, acc.type, acc.icon, acc.openingBalanceCents, 'USD'],
    );
  }

  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded', 'true')",
  );
}

export async function seedDemoTransactions(db: SQLiteDatabase): Promise<void> {
  const categoriesResult = await db.getAllAsync<{ id: string; type: string }>(
    'SELECT id, type FROM categories',
  );
  const accountsResult = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM accounts',
  );

  if (categoriesResult.length === 0 || accountsResult.length === 0) return;

  const expenseCategories = categoriesResult.filter(
    (c) => c.type === 'expense',
  );
  const incomeCategories = categoriesResult.filter((c) => c.type === 'income');
  const accountIds = accountsResult.map((a) => a.id);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;

  const expenseAmounts = [500, 1200, 3500, 250, 800, 150, 45, 3200, 90, 75];
  const incomeAmounts = [350000, 15000, 5000, 20000, 1000];

  const sampleExpenses = [
    { note: 'Lunch at cafe', catIndex: 0 },
    { note: 'Uber to work', catIndex: 1 },
    { note: 'Monthly rent', catIndex: 2 },
    { note: 'Groceries', catIndex: 0 },
    { note: 'Coffee shop', catIndex: 0 },
    { note: 'Gym membership', catIndex: 5 },
    { note: 'Gas station', catIndex: 1 },
    { note: 'Electric bill', catIndex: 7 },
    { note: 'Netflix subscription', catIndex: 4 },
    { note: 'Book purchase', catIndex: 6 },
    { note: 'Pharmacy', catIndex: 5 },
    { note: 'Restaurant dinner', catIndex: 0 },
    { note: 'Bus pass', catIndex: 1 },
    { note: 'Haircut', catIndex: 8 },
    { note: 'Misc supplies', catIndex: 9 },
  ];

  const sampleIncomes = [
    { note: 'Monthly salary', catIndex: 0 },
    { note: 'Side project', catIndex: 1 },
    { note: 'Dividend payout', catIndex: 2 },
    { note: 'Birthday gift', catIndex: 3 },
    { note: 'Refund', catIndex: 4 },
  ];

  const targetCount = 20;

  for (let i = 0; i < targetCount; i++) {
    const isIncome = i % 4 === 0;
    const categories = isIncome ? incomeCategories : expenseCategories;
    const samples = isIncome ? sampleIncomes : sampleExpenses;

    const cat =
      categories[samples[i % samples.length].catIndex % categories.length];
    const accountId = accountIds[i % accountIds.length];
    const sample = samples[i % samples.length];
    const amounts = isIncome ? incomeAmounts : expenseAmounts;
    const amountCents = amounts[i % amounts.length];

    const dayOffset = Math.floor(Math.random() * daysInMonth);
    const date = addDays(monthStart, dayOffset);
    const dateStr = format(date, 'yyyy-MM-dd');
    const nowStr = format(now, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    const txnId = generateId();
    const isSplitDemo = !isIncome && i % 7 === 3 && accountIds.length >= 2;
    const split1Amount = isSplitDemo
      ? Math.floor(amountCents * 0.7)
      : amountCents;
    const split2Amount = isSplitDemo ? amountCents - split1Amount : 0;

    await db.runAsync(
      `INSERT OR IGNORE INTO transactions (
        id, type, total_amount_cents, currency, category_id, account_id, account2_id,
        note, date, linked_transaction_id, fd_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txnId,
        isIncome ? 'income' : 'expense',
        amountCents,
        'USD',
        cat.id,
        accountId,
        null,
        sample.note,
        dateStr,
        null,
        null,
        nowStr,
        nowStr,
      ],
    );

    const splitId1 = generateId();
    await db.runAsync(
      'INSERT OR IGNORE INTO transaction_splits (id, transaction_id, account_id, amount_cents) VALUES (?, ?, ?, ?)',
      [splitId1, txnId, accountId, split1Amount],
    );

    if (isSplitDemo) {
      const secondAccountId = accountIds[(i + 1) % accountIds.length];
      const splitId2 = generateId();
      await db.runAsync(
        'INSERT OR IGNORE INTO transaction_splits (id, transaction_id, account_id, amount_cents) VALUES (?, ?, ?, ?)',
        [splitId2, txnId, secondAccountId, split2Amount],
      );
    }
  }
}

const DEMO_CDS_SENDER = 'CDS-Alerts';

/** Sample CDS-style alerts + movements for demo mode (idempotent by fixed sms ids). */
export async function seedDemoStockData(db: SQLiteDatabase): Promise<void> {
  const tableExists = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='stock_sms_log'",
  );
  if (!tableExists) return;

  const nowMs = Date.now();
  const parsedAt = new Date().toISOString();

  const demos: { id: string; body: string; daysAgo: number }[] = [
    {
      id: 'demo-stock-sms-1',
      body:
        'ARR XXXXXXX27 LI 0 24-APR-26 PURCHASES JKH 3000 NTB 235 SALES JKH 200 NTB 10',
      daysAgo: 14,
    },
    {
      id: 'demo-stock-sms-2',
      body:
        'ARR XXXXXXX27 LI 0 27-APR-26 PURCHASES NTB 20 ALUM 2250 SALES ALUM 150 NTB 5',
      daysAgo: 11,
    },
    {
      id: 'demo-stock-sms-3',
      body:
        'ARR XXXXXXX27 LI 0 30-APR-26 PURCHASES COCR 4 JKH 25 VONE 6 SALES JKH 10 VONE 2',
      daysAgo: 8,
    },
    {
      id: 'demo-stock-sms-4',
      body:
        'ARR XXXXXXX27 LI 0 02-MAY-26 PURCHASES LIOC 500 CAR 120 SALES LIOC 80 CAR 40',
      daysAgo: 5,
    },
    {
      id: 'demo-stock-sms-5',
      body:
        'ARR XXXXXXX27 LI 0 03-MAY-26 PURCHASES JKH 50 SALES JKH 50',
      daysAgo: 2,
    },
  ];

  for (const demo of demos) {
    const exists = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM stock_sms_log WHERE id = ?',
      [demo.id],
    );
    if (exists) continue;

    const bodyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      demo.body,
    );
    const receivedAt = nowMs - demo.daysAgo * 24 * 60 * 60 * 1000;

    await db.runAsync(
      `INSERT INTO stock_sms_log (
        id, provider_sms_id, sender, body, body_hash, received_at,
        parsed_at, parse_status, parse_error, movement_count
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, 'success', NULL, 0)`,
      [
        demo.id,
        DEMO_CDS_SENDER,
        demo.body,
        bodyHash,
        receivedAt,
        parsedAt,
      ],
    );

    const parsed = parseCdsAlert(demo.body);
    if (!parsed?.movements.length) continue;

    for (const mov of parsed.movements) {
      await db.runAsync(
        `INSERT INTO stock_movements (
          id, sms_id, stock_code, quantity, direction, trade_date, source, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'sms', NULL, ?, ?)`,
        [
          generateId(),
          demo.id,
          mov.stockCode,
          mov.quantity,
          mov.direction,
          parsed.tradeDate,
          parsedAt,
          parsedAt,
        ],
      );
    }

    await db.runAsync(
      'UPDATE stock_sms_log SET movement_count = ? WHERE id = ?',
      [parsed.movements.length, demo.id],
    );
  }
}
