import { getDatabase } from '../db/database';
import type { Account } from '../models/types';
import { generateId } from '../utils/uuid';

function mapRow(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    openingBalanceCents: row.opening_balance_cents,
  };
}

export const accountService = {
  async getAll(): Promise<Account[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM accounts ORDER BY name',
    );
    return rows.map(mapRow);
  },

  async getById(id: string): Promise<Account | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM accounts WHERE id = ?',
      [id],
    );
    return row ? mapRow(row) : null;
  },

  async create(data: Omit<Account, 'id'>): Promise<Account> {
    const db = await getDatabase();
    const id = generateId();
    await db.runAsync(
      'INSERT INTO accounts (id, name, type, icon, opening_balance_cents, currency) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.name, data.type, data.icon, data.openingBalanceCents, 'USD'],
    );
    return { id, ...data };
  },

  async update(id: string, data: Partial<Omit<Account, 'id'>>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.icon !== undefined) {
      fields.push('icon = ?');
      values.push(data.icon);
    }
    if (data.openingBalanceCents !== undefined) {
      fields.push('opening_balance_cents = ?');
      values.push(data.openingBalanceCents);
    }
    if (fields.length === 0) return;
    values.push(id);
    await db.runAsync(
      `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  },

  async delete(id: string): Promise<{ success: boolean; message?: string }> {
    const db = await getDatabase();
    const usage = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transaction_splits WHERE account_id = ?',
      [id],
    );
    if (usage && usage.count > 0) {
      return {
        success: false,
        message: `Account is used by ${usage.count} transaction split(s). Please reassign or delete them first.`,
      };
    }
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
    return { success: true };
  },

  async getBalance(id: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ balance: number }>(
      `WITH account_totals AS (
        SELECT
          s.account_id,
          SUM(CASE WHEN t.type = 'income' THEN s.amount_cents ELSE 0 END) AS income_total,
          SUM(CASE WHEN t.type = 'expense' THEN s.amount_cents ELSE 0 END) AS expense_total,
          SUM(CASE WHEN t.type = 'transfer' AND t.account_id = s.account_id THEN s.amount_cents ELSE 0 END) AS transfer_out_total,
          SUM(CASE WHEN t.type = 'transfer' AND t.account2_id = s.account_id THEN s.amount_cents ELSE 0 END) AS transfer_in_total
        FROM transaction_splits s
        JOIN transactions t ON t.id = s.transaction_id
        GROUP BY s.account_id
      )
      SELECT
        a.opening_balance_cents
        + COALESCE(at.income_total, 0)
        - COALESCE(at.expense_total, 0)
        - COALESCE(at.transfer_out_total, 0)
        + COALESCE(at.transfer_in_total, 0) AS balance
      FROM accounts a
      LEFT JOIN account_totals at ON at.account_id = a.id
      WHERE a.id = ?`,
      [id],
    );
    return result?.balance ?? 0;
  },

  async getAllWithBalances(): Promise<Array<Account & { balance: number }>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `WITH account_totals AS (
        SELECT
          s.account_id,
          SUM(CASE WHEN t.type = 'income' THEN s.amount_cents ELSE 0 END) AS income_total,
          SUM(CASE WHEN t.type = 'expense' THEN s.amount_cents ELSE 0 END) AS expense_total,
          SUM(CASE WHEN t.type = 'transfer' AND t.account_id = s.account_id THEN s.amount_cents ELSE 0 END) AS transfer_out_total,
          SUM(CASE WHEN t.type = 'transfer' AND t.account2_id = s.account_id THEN s.amount_cents ELSE 0 END) AS transfer_in_total
        FROM transaction_splits s
        JOIN transactions t ON t.id = s.transaction_id
        GROUP BY s.account_id
      )
      SELECT
        a.*,
        a.opening_balance_cents
        + COALESCE(at.income_total, 0)
        - COALESCE(at.expense_total, 0)
        - COALESCE(at.transfer_out_total, 0)
        + COALESCE(at.transfer_in_total, 0) AS balance
      FROM accounts a
      LEFT JOIN account_totals at ON at.account_id = a.id
      ORDER BY a.name`,
    );
    return rows.map((row: any) => ({
      ...mapRow(row),
      balance: row.balance ?? 0,
    }));
  },
};
