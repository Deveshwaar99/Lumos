import { getDatabase } from '../db/database';
import {
  MonthSummary,
  CategoryBreakdown,
  DailyCashFlow,
  AccountBalance,
  AccountPeriodBalance,
  NetWorthPoint,
} from '../models/types';
import { getMonthRange, getDaysInMonth } from '../utils/dates';

export const analyticsService = {
  async getMonthSummary(month: string): Promise<MonthSummary> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);

    const incomeResult = await db.getFirstAsync<{ total: number }>(
      "SELECT COALESCE(SUM(total_amount_cents), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date < ?",
      start, end
    );
    const expenseResult = await db.getFirstAsync<{ total: number }>(
      "SELECT COALESCE(SUM(total_amount_cents), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date < ?",
      start, end
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

    const rows = await db.getAllAsync<any>(
      `SELECT t.category_id as categoryId, c.name as categoryName, c.color, c.icon,
        SUM(t.total_amount_cents) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = ? AND t.date >= ? AND t.date < ?
      GROUP BY t.category_id`,
      type, start, end
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

    const rows = await db.getAllAsync<any>(
      `SELECT
        substr(t.date, 1, 10) as date,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.total_amount_cents ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.total_amount_cents ELSE 0 END), 0) as expense
      FROM transactions t
      WHERE t.date >= ? AND t.date < ?
      GROUP BY substr(t.date, 1, 10)`,
      start, end
    );

    const byDate = new Map<string, { income: number; expense: number }>();
    rows.forEach((r: any) => {
      byDate.set(r.date, { income: r.income ?? 0, expense: r.expense ?? 0 });
    });

    const days = getDaysInMonth(month);
    return days.map((dateStr) => {
      const data = byDate.get(dateStr) ?? { income: 0, expense: 0 };
      const net = data.income - data.expense;
      return { date: dateStr, income: data.income, expense: data.expense, net };
    });
  },

  async getAccountBalances(): Promise<AccountBalance[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT a.id as accountId, a.name as accountName, a.type,
        a.opening_balance_cents
        + COALESCE((SELECT SUM(s.amount_cents) FROM transaction_splits s
            JOIN transactions t ON s.transaction_id = t.id
            WHERE s.account_id = a.id AND t.type = 'income'), 0)
        - COALESCE((SELECT SUM(s.amount_cents) FROM transaction_splits s
            JOIN transactions t ON s.transaction_id = t.id
            WHERE s.account_id = a.id AND t.type = 'expense'), 0)
        + COALESCE((SELECT SUM(s.amount_cents) FROM transaction_splits s
            JOIN transactions t ON s.transaction_id = t.id
            WHERE s.account_id = a.id AND t.type = 'transfer'
              AND s.id != (SELECT s2.id FROM transaction_splits s2
                           WHERE s2.transaction_id = t.id
                           ORDER BY s2.rowid ASC LIMIT 1)), 0)
        - COALESCE((SELECT SUM(s.amount_cents) FROM transaction_splits s
            JOIN transactions t ON s.transaction_id = t.id
            WHERE s.account_id = a.id AND t.type = 'transfer'
              AND s.id = (SELECT s2.id FROM transaction_splits s2
                          WHERE s2.transaction_id = t.id
                          ORDER BY s2.rowid ASC LIMIT 1)), 0)
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

  async getDailyIncomeFlow(month: string): Promise<DailyCashFlow[]> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);

    const rows = await db.getAllAsync<any>(
      `SELECT substr(t.date, 1, 10) as date,
        COALESCE(SUM(t.total_amount_cents), 0) as income
      FROM transactions t
      WHERE t.type = 'income' AND t.date >= ? AND t.date < ?
      GROUP BY substr(t.date, 1, 10)`,
      start, end
    );

    const byDate = new Map<string, number>();
    rows.forEach((r: any) => byDate.set(r.date, r.income ?? 0));

    const days = getDaysInMonth(month);
    return days.map((dateStr) => ({
      date: dateStr,
      income: byDate.get(dateStr) ?? 0,
      expense: 0,
      net: byDate.get(dateStr) ?? 0,
    }));
  },

  async getDailyExpenseFlow(month: string): Promise<DailyCashFlow[]> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);

    const rows = await db.getAllAsync<any>(
      `SELECT substr(t.date, 1, 10) as date,
        COALESCE(SUM(t.total_amount_cents), 0) as expense
      FROM transactions t
      WHERE t.type = 'expense' AND t.date >= ? AND t.date < ?
      GROUP BY substr(t.date, 1, 10)`,
      start, end
    );

    const byDate = new Map<string, number>();
    rows.forEach((r: any) => byDate.set(r.date, r.expense ?? 0));

    const days = getDaysInMonth(month);
    return days.map((dateStr) => ({
      date: dateStr,
      income: 0,
      expense: byDate.get(dateStr) ?? 0,
      net: -(byDate.get(dateStr) ?? 0),
    }));
  },

  async getNetWorthHistory(currentMonth: string, monthsBack: number = 12): Promise<NetWorthPoint[]> {
    const db = await getDatabase();

    const openingBalanceResult = await db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(opening_balance_cents), 0) as total FROM accounts'
    );
    const openingBalance = openingBalanceResult?.total ?? 0;

    const firstTxnResult = await db.getFirstAsync<{ min_date: string }>(
      'SELECT MIN(date) as min_date FROM transactions'
    );

    const [yearStr, monthStr] = currentMonth.split('-').map(Number);
    const points: NetWorthPoint[] = [];

    for (let i = monthsBack; i >= 0; i--) {
      let m = monthStr - i;
      let y = yearStr;
      while (m <= 0) { m += 12; y--; }
      while (m > 12) { m -= 12; y++; }
      const monthKey = `${y}-${String(m).padStart(2, '0')}`;
      const { end } = getMonthRange(monthKey);

      const incomeResult = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(total_amount_cents), 0) as total FROM transactions WHERE type = 'income' AND date < ?",
        end,
      );
      const expenseResult = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(total_amount_cents), 0) as total FROM transactions WHERE type = 'expense' AND date < ?",
        end,
      );

      const netWorth = openingBalance + (incomeResult?.total ?? 0) - (expenseResult?.total ?? 0);
      points.push({ month: monthKey, netWorth });
    }

    return points;
  },

  async getAccountPeriodBalances(month: string): Promise<AccountPeriodBalance[]> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);

    const rows = await db.getAllAsync<any>(
      `SELECT a.id as accountId, a.name as accountName, a.type, a.icon,
        COALESCE((SELECT SUM(s.amount_cents) FROM transaction_splits s
            JOIN transactions t ON s.transaction_id = t.id
            WHERE s.account_id = a.id AND t.type = 'income'
              AND t.date >= ? AND t.date < ?), 0) as periodIncome,
        COALESCE((SELECT SUM(s.amount_cents) FROM transaction_splits s
            JOIN transactions t ON s.transaction_id = t.id
            WHERE s.account_id = a.id AND t.type = 'expense'
              AND t.date >= ? AND t.date < ?), 0) as periodExpense
      FROM accounts a ORDER BY a.name`,
      start, end, start, end
    );

    return rows.map((r: any) => ({
      accountId: r.accountId,
      accountName: r.accountName,
      type: r.type,
      icon: r.icon ?? 'wallet',
      periodIncome: r.periodIncome ?? 0,
      periodExpense: r.periodExpense ?? 0,
    }));
  },
};
