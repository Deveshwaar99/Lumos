import { format, parseISO } from 'date-fns';
import { getDatabase } from '../db/database';
import { Budget, BudgetWithSpent } from '../models/types';
import { generateId } from '../utils/uuid';
import { getMonthRange } from '../utils/dates';

function mapRow(row: any): Budget {
  return {
    id: row.id,
    month: row.month,
    categoryId: row.category_id,
    limitCents: row.limit_cents,
    alertThresholdPct: row.alert_threshold_pct,
    enabled: row.enabled === 1,
  };
}

export const budgetService = {
  async getByMonth(month: string): Promise<BudgetWithSpent[]> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);
    const dateFrom = format(parseISO(start), 'yyyy-MM-dd');
    const dateTo = format(parseISO(end), 'yyyy-MM-dd');

    const rows = await db.getAllAsync<any>(
      `SELECT b.*, 
        COALESCE((SELECT SUM(t.total_amount_cents) FROM transactions t
          WHERE t.category_id = b.category_id AND t.type = 'expense'
          AND t.date >= ? AND t.date <= ?), 0) as spent
      FROM budgets b WHERE b.month = ? AND b.enabled = 1`,
      dateFrom, dateTo, month
    );

    return rows.map((row) => {
      const budget = mapRow(row);
      const spent = row.spent ?? 0;
      const remaining = budget.limitCents - spent;
      const percentage = budget.limitCents > 0 ? (spent / budget.limitCents) * 100 : 0;
      return { ...budget, spent, remaining, percentage };
    });
  },

  async create(data: Omit<Budget, 'id'>): Promise<Budget> {
    const db = await getDatabase();
    const id = generateId();
    await db.runAsync(
      'INSERT INTO budgets (id, month, category_id, limit_cents, alert_threshold_pct, enabled) VALUES (?, ?, ?, ?, ?, ?)',
      id, data.month, data.categoryId, data.limitCents, data.alertThresholdPct, data.enabled ? 1 : 0
    );
    return { id, ...data };
  },

  async update(id: string, data: Partial<Omit<Budget, 'id'>>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    if (data.month !== undefined) { fields.push('month = ?'); values.push(data.month); }
    if (data.categoryId !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId); }
    if (data.limitCents !== undefined) { fields.push('limit_cents = ?'); values.push(data.limitCents); }
    if (data.alertThresholdPct !== undefined) { fields.push('alert_threshold_pct = ?'); values.push(data.alertThresholdPct); }
    if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (fields.length === 0) return;
    values.push(id);
    await db.runAsync(`UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`, ...values);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM budgets WHERE id = ?', id);
  },

  async getAlerts(month: string): Promise<BudgetWithSpent[]> {
    const budgets = await this.getByMonth(month);
    return budgets.filter((b) => b.percentage >= b.alertThresholdPct);
  },

  async getCount(month: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM budgets WHERE month = ? AND enabled = 1',
      month
    );
    return result?.count ?? 0;
  },
};
