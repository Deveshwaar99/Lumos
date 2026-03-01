import { format, parseISO } from 'date-fns';
import { getDatabase } from '../db/database';
import {
  MonthSummary,
  CategoryBreakdown,
  DailyCashFlow,
  AccountBalance,
} from '../models/types';
import { getMonthRange, getDaysInMonth } from '../utils/dates';

export const analyticsService = {
  async getMonthSummary(month: string): Promise<MonthSummary> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);
    const dateFrom = format(parseISO(start), 'yyyy-MM-dd');
    const dateTo = format(parseISO(end), 'yyyy-MM-dd');

    const incomeResult = await db.getFirstAsync<{ total: number }>(
      "SELECT COALESCE(SUM(total_amount_cents), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date <= ?",
      dateFrom, dateTo
    );
    const expenseResult = await db.getFirstAsync<{ total: number }>(
      "SELECT COALESCE(SUM(total_amount_cents), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?",
      dateFrom, dateTo
    );

    const totalIncome = incomeResult?.total ?? 0;
    const totalExpense = expenseResult?.total ?? 0;
    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
    };
  },

  async getCategoryBreakdown(month: string, type: 'income' | 'expense'): Promise<CategoryBreakdown[]> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);
    const dateFrom = format(parseISO(start), 'yyyy-MM-dd');
    const dateTo = format(parseISO(end), 'yyyy-MM-dd');

    const rows = await db.getAllAsync<any>(
      `SELECT t.category_id as categoryId, c.name as categoryName, c.color, c.icon,
        SUM(t.total_amount_cents) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = ? AND t.date >= ? AND t.date <= ?
      GROUP BY t.category_id`,
      type, dateFrom, dateTo
    );

    return rows.map((r: any) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName ?? 'Unknown',
      color: r.color ?? '#999999',
      icon: r.icon ?? 'help-circle',
      total: r.total ?? 0,
    }));
  },

  async getDailyCashFlow(month: string): Promise<DailyCashFlow[]> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);
    const dateFrom = format(parseISO(start), 'yyyy-MM-dd');
    const dateTo = format(parseISO(end), 'yyyy-MM-dd');

    const rows = await db.getAllAsync<any>(
      `SELECT
        substr(t.date, 1, 10) as date,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.total_amount_cents ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.total_amount_cents ELSE 0 END), 0) as expense
      FROM transactions t
      WHERE t.date >= ? AND t.date <= ?
      GROUP BY substr(t.date, 1, 10)`,
      dateFrom, dateTo
    );

    const byDate = new Map<string, { income: number; expense: number }>();
    rows.forEach((r: any) => {
      byDate.set(r.date, { income: r.income ?? 0, expense: r.expense ?? 0 });
    });

    const days = getDaysInMonth(month);
    return days.map((iso) => {
      const dateStr = format(parseISO(iso), 'yyyy-MM-dd');
      const data = byDate.get(dateStr) ?? { income: 0, expense: 0 };
      const net = data.income - data.expense;
      return { date: dateStr, income: data.income, expense: data.expense, net };
    });
  },

  async getAccountBalances(): Promise<AccountBalance[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT a.id as accountId, a.name as accountName, a.type,
        a.opening_balance_cents +
        COALESCE((SELECT SUM(s.amount_cents) FROM transaction_splits s
          JOIN transactions t ON s.transaction_id = t.id
          WHERE s.account_id = a.id AND t.type = 'income'), 0) -
        COALESCE((SELECT SUM(s.amount_cents) FROM transaction_splits s
          JOIN transactions t ON s.transaction_id = t.id
          WHERE s.account_id = a.id AND t.type = 'expense'), 0)
        as balance
      FROM accounts a ORDER BY a.name`
    );

    return rows.map((r: any) => ({
      accountId: r.accountId,
      accountName: r.accountName,
      type: r.type,
      balance: r.balance ?? 0,
    }));
  },

  async getTopExpenseCategories(month: string, limit: number = 5): Promise<CategoryBreakdown[]> {
    const breakdown = await this.getCategoryBreakdown(month, 'expense');
    return breakdown
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  },
};
