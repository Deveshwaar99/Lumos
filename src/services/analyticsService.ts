import { getDatabase } from '../db/database';
import type {
  AccountBalance,
  AccountPeriodBalance,
  CategoryBreakdown,
  DailyCashFlow,
  MonthSummary,
  NetWorthPoint,
} from '../models/types';
import { getDaysInMonth, getDaysInRange, getMonthRange } from '../utils/dates';

export const analyticsService = {
  async getMonthSummary(month: string): Promise<MonthSummary> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);

    const [incomeResult, expenseResult] = await Promise.all([
      db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(total_amount_cents), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date < ?",
        [start, end],
      ),
      db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(total_amount_cents), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date < ?",
        [start, end],
      ),
    ]);

    const totalIncome = incomeResult?.total ?? 0;
    const totalExpense = expenseResult?.total ?? 0;
    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
    };
  },

  async getCategoryBreakdown(
    month: string,
    type: 'income' | 'expense',
  ): Promise<CategoryBreakdown[]> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);

    const rows = await db.getAllAsync<any>(
      `SELECT t.category_id as categoryId, c.name as categoryName, c.color, c.icon,
        SUM(t.total_amount_cents) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = ? AND t.date >= ? AND t.date < ?
      GROUP BY t.category_id`,
      [type, start, end],
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
      [start, end],
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
        a.id as accountId,
        a.name as accountName,
        a.type,
        a.opening_balance_cents
        + COALESCE(at.income_total, 0)
        - COALESCE(at.expense_total, 0)
        - COALESCE(at.transfer_out_total, 0)
        + COALESCE(at.transfer_in_total, 0) as balance
      FROM accounts a
      LEFT JOIN account_totals at ON at.account_id = a.id
      ORDER BY a.name`,
    );

    return rows.map((r: any) => ({
      accountId: r.accountId,
      accountName: r.accountName,
      type: r.type,
      balance: r.balance ?? 0,
    }));
  },

  async getTopExpenseCategories(
    month: string,
    limit: number = 5,
  ): Promise<CategoryBreakdown[]> {
    const breakdown = await this.getCategoryBreakdown(month, 'expense');
    return breakdown.sort((a, b) => b.total - a.total).slice(0, limit);
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
      [start, end],
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
      [start, end],
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

  async getNetWorthHistory(
    currentMonth: string,
    monthsBack: number = 12,
  ): Promise<NetWorthPoint[]> {
    const db = await getDatabase();

    const [yearNum, monthNum] = currentMonth.split('-').map(Number);

    const months: string[] = [];
    for (let i = monthsBack; i >= 0; i--) {
      let m = monthNum - i;
      let y = yearNum;
      while (m <= 0) {
        m += 12;
        y--;
      }
      while (m > 12) {
        m -= 12;
        y++;
      }
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }

    const lastMonth = months[months.length - 1];
    const { end: cutoff } = getMonthRange(lastMonth);

    const [openingBalanceResult, monthlyRows] = await Promise.all([
      db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(opening_balance_cents), 0) as total FROM accounts',
      ),
      db.getAllAsync<{ month: string; income: number; expense: number }>(
        `SELECT
          substr(date, 1, 7) AS month,
          COALESCE(SUM(CASE WHEN type = 'income' THEN total_amount_cents ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN total_amount_cents ELSE 0 END), 0) AS expense
        FROM transactions
        WHERE date < ?
        GROUP BY substr(date, 1, 7)
        ORDER BY month ASC`,
        [cutoff],
      ),
    ]);

    const openingBalance = openingBalanceResult?.total ?? 0;

    const monthlyMap = new Map<string, { income: number; expense: number }>();
    for (const row of monthlyRows) {
      monthlyMap.set(row.month, { income: row.income, expense: row.expense });
    }

    let cumulativeIncome = 0;
    let cumulativeExpense = 0;

    const allMonthsSorted = Array.from(monthlyMap.keys()).sort();
    const firstNeeded = months[0];

    for (const m of allMonthsSorted) {
      if (m >= firstNeeded) break;
      const data = monthlyMap.get(m)!;
      cumulativeIncome += data.income;
      cumulativeExpense += data.expense;
    }

    const points: NetWorthPoint[] = [];
    for (const monthKey of months) {
      const data = monthlyMap.get(monthKey);
      if (data) {
        cumulativeIncome += data.income;
        cumulativeExpense += data.expense;
      }
      points.push({
        month: monthKey,
        netWorth: openingBalance + cumulativeIncome - cumulativeExpense,
      });
    }

    return points;
  },

  async getAccountPeriodBalances(
    month: string,
  ): Promise<AccountPeriodBalance[]> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);

    const rows = await db.getAllAsync<any>(
      `WITH period_totals AS (
        SELECT
          s.account_id,
          SUM(CASE WHEN t.type = 'income' THEN s.amount_cents ELSE 0 END) AS periodIncome,
          SUM(CASE WHEN t.type = 'expense' THEN s.amount_cents ELSE 0 END) AS periodExpense
        FROM transaction_splits s
        JOIN transactions t ON t.id = s.transaction_id
        WHERE t.date >= ? AND t.date < ?
        GROUP BY s.account_id
      )
      SELECT
        a.id as accountId,
        a.name as accountName,
        a.type,
        a.icon,
        COALESCE(pt.periodIncome, 0) as periodIncome,
        COALESCE(pt.periodExpense, 0) as periodExpense
      FROM accounts a
      LEFT JOIN period_totals pt ON pt.account_id = a.id
      ORDER BY a.name`,
      [start, end],
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

  // --- Range-based overloads (start/end as yyyy-MM-dd, half-open) ---

  async getSummaryForRange(start: string, end: string): Promise<MonthSummary> {
    const db = await getDatabase();

    const [incomeResult, expenseResult] = await Promise.all([
      db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(total_amount_cents), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date < ?",
        [start, end],
      ),
      db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(total_amount_cents), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date < ?",
        [start, end],
      ),
    ]);

    const totalIncome = incomeResult?.total ?? 0;
    const totalExpense = expenseResult?.total ?? 0;
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  },

  async getCategoryBreakdownForRange(
    start: string,
    end: string,
    type: 'income' | 'expense',
  ): Promise<CategoryBreakdown[]> {
    const db = await getDatabase();

    const rows = await db.getAllAsync<any>(
      `SELECT t.category_id as categoryId, c.name as categoryName, c.color, c.icon,
        SUM(t.total_amount_cents) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = ? AND t.date >= ? AND t.date < ?
      GROUP BY t.category_id`,
      [type, start, end],
    );

    return rows.map((r: any) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName ?? 'Unknown',
      color: r.color ?? '#999999',
      icon: r.icon ?? 'help-circle',
      total: r.total ?? 0,
    }));
  },

  async getDailyExpenseFlowForRange(
    start: string,
    end: string,
  ): Promise<DailyCashFlow[]> {
    const db = await getDatabase();

    const rows = await db.getAllAsync<any>(
      `SELECT substr(t.date, 1, 10) as date,
        COALESCE(SUM(t.total_amount_cents), 0) as expense
      FROM transactions t
      WHERE t.type = 'expense' AND t.date >= ? AND t.date < ?
      GROUP BY substr(t.date, 1, 10)`,
      [start, end],
    );

    const byDate = new Map<string, number>();
    rows.forEach((r: any) => byDate.set(r.date, r.expense ?? 0));

    const days = getDaysInRange(start, end);
    return days.map((dateStr) => ({
      date: dateStr,
      income: 0,
      expense: byDate.get(dateStr) ?? 0,
      net: -(byDate.get(dateStr) ?? 0),
    }));
  },

  async getDailyIncomeFlowForRange(
    start: string,
    end: string,
  ): Promise<DailyCashFlow[]> {
    const db = await getDatabase();

    const rows = await db.getAllAsync<any>(
      `SELECT substr(t.date, 1, 10) as date,
        COALESCE(SUM(t.total_amount_cents), 0) as income
      FROM transactions t
      WHERE t.type = 'income' AND t.date >= ? AND t.date < ?
      GROUP BY substr(t.date, 1, 10)`,
      [start, end],
    );

    const byDate = new Map<string, number>();
    rows.forEach((r: any) => byDate.set(r.date, r.income ?? 0));

    const days = getDaysInRange(start, end);
    return days.map((dateStr) => ({
      date: dateStr,
      income: byDate.get(dateStr) ?? 0,
      expense: 0,
      net: byDate.get(dateStr) ?? 0,
    }));
  },

  async getAccountPeriodBalancesForRange(
    start: string,
    end: string,
  ): Promise<AccountPeriodBalance[]> {
    const db = await getDatabase();

    const rows = await db.getAllAsync<any>(
      `WITH period_totals AS (
        SELECT
          s.account_id,
          SUM(CASE WHEN t.type = 'income' THEN s.amount_cents ELSE 0 END) AS periodIncome,
          SUM(CASE WHEN t.type = 'expense' THEN s.amount_cents ELSE 0 END) AS periodExpense
        FROM transaction_splits s
        JOIN transactions t ON t.id = s.transaction_id
        WHERE t.date >= ? AND t.date < ?
        GROUP BY s.account_id
      )
      SELECT
        a.id as accountId,
        a.name as accountName,
        a.type,
        a.icon,
        COALESCE(pt.periodIncome, 0) as periodIncome,
        COALESCE(pt.periodExpense, 0) as periodExpense
      FROM accounts a
      LEFT JOIN period_totals pt ON pt.account_id = a.id
      ORDER BY a.name`,
      [start, end],
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
