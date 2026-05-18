import { getDatabase } from '../db/database';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilter,
  TransactionSplit,
  TransactionWithSplits,
} from '../models/types';
import { generateId } from '../utils/uuid';

function mapRow(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    totalAmountCents: row.total_amount_cents,
    currency: row.currency,
    categoryId: row.category_id,
    accountId: row.account_id ?? null,
    account2Id: row.account2_id ?? null,
    note: row.note,
    date: row.date,
    linkedTransactionId: row.linked_transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSplitRow(row: any): TransactionSplit {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    accountId: row.account_id,
    amountCents: row.amount_cents,
  };
}

function buildWhereClause(filter: TransactionFilter): {
  sql: string;
  params: any[];
} {
  const conditions: string[] = [];
  const params: any[] = [];
  if (filter.dateFrom) {
    conditions.push('t.date >= ?');
    params.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    conditions.push('t.date < ?');
    params.push(filter.dateTo);
  }
  if (filter.type) {
    conditions.push('t.type = ?');
    params.push(filter.type);
  }
  if (filter.categoryId) {
    conditions.push('t.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.accountId) {
    conditions.push(
      '(t.account_id = ? OR t.account2_id = ? OR t.id IN (SELECT transaction_id FROM transaction_splits WHERE account_id = ?))',
    );
    params.push(filter.accountId, filter.accountId, filter.accountId);
  }
  if (filter.searchQuery) {
    const q = `%${filter.searchQuery}%`;
    conditions.push(
      `(t.note LIKE ? OR t.total_amount_cents LIKE ? OR t.category_id IN (SELECT id FROM categories WHERE name LIKE ?))`,
    );
    params.push(q, q, q);
  }
  const sql = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  return { sql, params };
}

export const transactionService = {
  async getAll(
    filter: TransactionFilter,
    limit: number = 20,
    offset: number = 0,
  ): Promise<TransactionWithSplits[]> {
    const db = await getDatabase();
    const { sql, params } = buildWhereClause(filter);
    const query = `SELECT t.* FROM transactions t${sql} ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`;
    const rows = await db.getAllAsync<any>(query, [...params, limit, offset]);
    const txns = rows.map(mapRow);
    return this._attachSplits(txns);
  },

  async getById(id: string): Promise<TransactionWithSplits | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM transactions WHERE id = ?',
      [id],
    );
    if (!row) return null;
    const txn = mapRow(row);
    const splits = await db.getAllAsync<any>(
      'SELECT * FROM transaction_splits WHERE transaction_id = ?',
      [id],
    );
    return { ...txn, splits: splits.map(mapSplitRow) };
  },

  async create(
    data: CreateTransactionInput,
    options?: { fdId?: string | null },
  ): Promise<TransactionWithSplits> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    const account2Id =
      data.type === 'transfer' ? (data.splits[1]?.accountId ?? null) : null;
    await db.runAsync(
      `INSERT INTO transactions (id, type, total_amount_cents, currency, category_id, account_id, account2_id, note, date, linked_transaction_id, fd_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.type,
        data.totalAmountCents,
        data.currency,
        data.categoryId ?? null,
        data.splits[0].accountId,
        account2Id,
        data.note ?? null,
        data.date,
        null,
        options?.fdId ?? null,
        now,
        now,
      ],
    );

    const splits: TransactionSplit[] = [];
    for (const sp of data.splits) {
      const splitId = generateId();
      await db.runAsync(
        'INSERT INTO transaction_splits (id, transaction_id, account_id, amount_cents) VALUES (?, ?, ?, ?)',
        [splitId, id, sp.accountId, sp.amountCents],
      );
      splits.push({
        id: splitId,
        transactionId: id,
        accountId: sp.accountId,
        amountCents: sp.amountCents,
      });
    }

    return {
      id,
      type: data.type,
      totalAmountCents: data.totalAmountCents,
      currency: data.currency,
      categoryId: data.categoryId ?? null,
      accountId: data.splits[0].accountId,
      account2Id,
      note: data.note ?? null,
      date: data.date,
      linkedTransactionId: null,
      createdAt: now,
      updatedAt: now,
      splits,
    };
  },

  async update(
    id: string,
    data: Partial<CreateTransactionInput>,
  ): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [new Date().toISOString()];
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.totalAmountCents !== undefined) {
      fields.push('total_amount_cents = ?');
      values.push(data.totalAmountCents);
    }
    if (data.currency !== undefined) {
      fields.push('currency = ?');
      values.push(data.currency);
    }
    if (data.categoryId !== undefined) {
      fields.push('category_id = ?');
      values.push(data.categoryId ?? null);
    }
    if (data.note !== undefined) {
      fields.push('note = ?');
      values.push(data.note);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.splits !== undefined && data.splits.length > 0) {
      fields.push('account_id = ?');
      fields.push('account2_id = ?');
      values.push(data.splits[0].accountId);
      values.push(data.splits[1]?.accountId ?? null);
    }
    values.push(id);
    await db.runAsync(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );

    if (data.splits) {
      await db.runAsync(
        'DELETE FROM transaction_splits WHERE transaction_id = ?',
        [id],
      );
      for (const sp of data.splits) {
        const splitId = generateId();
        await db.runAsync(
          'INSERT INTO transaction_splits (id, transaction_id, account_id, amount_cents) VALUES (?, ?, ?, ?)',
          [splitId, id, sp.accountId, sp.amountCents],
        );
      }
    }
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const txn = await db.getFirstAsync<any>(
      'SELECT linked_transaction_id FROM transactions WHERE id = ?',
      [id],
    );
    if (txn?.linked_transaction_id) {
      await db.runAsync(
        'DELETE FROM transaction_splits WHERE transaction_id = ?',
        [txn.linked_transaction_id],
      );
      await db.runAsync('DELETE FROM transactions WHERE id = ?', [
        txn.linked_transaction_id,
      ]);
    }
    await db.runAsync(
      'DELETE FROM transaction_splits WHERE transaction_id = ?',
      [id],
    );
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  },

  async getCount(filter: TransactionFilter): Promise<number> {
    const db = await getDatabase();
    const { sql, params } = buildWhereClause(filter);
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions t${sql}`,
      params,
    );
    return result?.count ?? 0;
  },

  async getRecent(limit: number): Promise<TransactionWithSplits[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?',
      [limit],
    );
    const txns = rows.map(mapRow);
    return this._attachSplits(txns);
  },

  async getSplitsForAccount(
    accountId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Array<TransactionSplit & { transaction: Transaction }>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT s.*, t.type, t.total_amount_cents, t.currency, t.category_id, t.account_id, t.account2_id,
              t.note, t.date, t.linked_transaction_id, t.created_at, t.updated_at
       FROM transaction_splits s
       JOIN transactions t ON s.transaction_id = t.id
       WHERE s.account_id = ?
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT ? OFFSET ?`,
      [accountId, limit, offset],
    );
    return rows.map((r: any) => ({
      ...mapSplitRow(r),
      transaction: {
        id: r.transaction_id,
        type: r.type,
        totalAmountCents: r.total_amount_cents,
        currency: r.currency,
        categoryId: r.category_id,
        accountId: r.account_id ?? null,
        account2Id: r.account2_id ?? null,
        note: r.note,
        date: r.date,
        linkedTransactionId: r.linked_transaction_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    }));
  },

  async transfer(
    fromAccountId: string,
    toAccountId: string,
    amountCents: number,
    currency: string,
    note: string,
    date: string,
    fdId?: string,
  ): Promise<{ expenseId: string; incomeId: string }> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const expenseId = generateId();
    const incomeId = generateId();

    await db.runAsync(
      `INSERT INTO transactions (id, type, total_amount_cents, currency, category_id, account_id, account2_id, note, date, linked_transaction_id, fd_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseId,
        'expense',
        amountCents,
        currency,
        null,
        fromAccountId,
        null,
        note,
        date,
        incomeId,
        fdId ?? null,
        now,
        now,
      ],
    );
    await db.runAsync(
      'INSERT INTO transaction_splits (id, transaction_id, account_id, amount_cents) VALUES (?, ?, ?, ?)',
      [generateId(), expenseId, fromAccountId, amountCents],
    );

    await db.runAsync(
      `INSERT INTO transactions (id, type, total_amount_cents, currency, category_id, account_id, account2_id, note, date, linked_transaction_id, fd_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incomeId,
        'income',
        amountCents,
        currency,
        null,
        toAccountId,
        null,
        note,
        date,
        expenseId,
        fdId ?? null,
        now,
        now,
      ],
    );
    await db.runAsync(
      'INSERT INTO transaction_splits (id, transaction_id, account_id, amount_cents) VALUES (?, ?, ?, ?)',
      [generateId(), incomeId, toAccountId, amountCents],
    );

    return { expenseId, incomeId };
  },

  async getByFdId(fdId: string): Promise<Transaction[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM transactions WHERE fd_id = ? ORDER BY date ASC',
      [fdId],
    );
    return rows.map(mapRow);
  },

  async _attachSplits(txns: Transaction[]): Promise<TransactionWithSplits[]> {
    if (txns.length === 0) return [];
    const db = await getDatabase();
    const ids = txns.map((t) => t.id);
    const placeholders = ids.map(() => '?').join(',');
    const splitRows = await db.getAllAsync<any>(
      `SELECT * FROM transaction_splits WHERE transaction_id IN (${placeholders})`,
      ids,
    );
    const splitMap = new Map<string, TransactionSplit[]>();
    for (const row of splitRows) {
      const split = mapSplitRow(row);
      const existing = splitMap.get(split.transactionId) ?? [];
      existing.push(split);
      splitMap.set(split.transactionId, existing);
    }
    return txns.map((t) => ({ ...t, splits: splitMap.get(t.id) ?? [] }));
  },
};
