import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { getDatabase } from '../db/database';
import type {
  AccountBalance,
  AccountPeriodBalance,
  AnalyticsSnapshot,
  AnomalyItem,
  BudgetOverlayItem,
  CategoryBreakdown,
  DailyCashFlow,
  InsightItem,
  MonthSummary,
  NetWorthPoint,
  PeriodTrendPoint,
  RangeComparison,
  TopMoverItem,
} from '../models/types';
import {
  getDaysInMonth,
  getDaysInRange,
  getMonthRange,
  getTimePeriodRange,
  stepAnchor,
  type TimePeriod,
} from '../utils/dates';

function parseDateStart(dateStr: string): Date {
  return parseISO(`${dateStr}T00:00:00`);
}

function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function getPreviousRange(
  start: string,
  end: string,
): {
  start: string;
  end: string;
} {
  const startDate = parseDateStart(start);
  const endDate = parseDateStart(end);
  const daySpan = Math.max(1, differenceInCalendarDays(endDate, startDate));
  return {
    start: toDateString(addDays(startDate, -daySpan)),
    end: start,
  };
}

function getDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

function getTrendPointLabel(start: string, period: TimePeriod): string {
  const date = parseDateStart(start);
  switch (period) {
    case 'day':
      return format(date, 'MMM d');
    case 'week':
      return format(date, 'MMM d');
    case 'month':
      return format(date, 'MMM');
    case '3months':
    case '6months':
      return format(date, 'MMM');
    case 'year':
      return format(date, 'yyyy');
  }
}

function mapCategoryRows(rows: any[]): CategoryBreakdown[] {
  return rows.map((r: any) => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName ?? 'Unknown',
    color: r.color ?? '#999999',
    icon: r.icon ?? 'help-circle',
    total: r.total ?? 0,
  }));
}

function buildTopMovers(
  current: CategoryBreakdown[],
  previous: CategoryBreakdown[],
): TopMoverItem[] {
  const previousMap = new Map(previous.map((item) => [item.categoryId, item]));
  return current
    .map((item) => {
      const prev = previousMap.get(item.categoryId);
      const previousTotalCents = prev?.total ?? 0;
      return {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        color: item.color,
        icon: item.icon,
        currentTotalCents: item.total,
        previousTotalCents,
        deltaCents: item.total - previousTotalCents,
        deltaPct: getDeltaPct(item.total, previousTotalCents),
      };
    })
    .filter((item) => item.currentTotalCents > 0 || item.previousTotalCents > 0)
    .sort((a, b) => Math.abs(b.deltaCents) - Math.abs(a.deltaCents))
    .slice(0, 3);
}

function buildAnomalies(
  expenseFlow: DailyCashFlow[],
  currentExpenseCategories: CategoryBreakdown[],
  previousExpenseCategories: CategoryBreakdown[],
): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];
  const totalExpense = currentExpenseCategories.reduce(
    (sum, item) => sum + item.total,
    0,
  );
  const nonZeroExpenseDays = expenseFlow.filter((day) => day.expense > 0);

  if (nonZeroExpenseDays.length >= 3 && totalExpense >= 5000) {
    const avgNonZeroExpense =
      nonZeroExpenseDays.reduce((sum, day) => sum + day.expense, 0) /
      nonZeroExpenseDays.length;
    const spikingDay = nonZeroExpenseDays
      .filter((day) => day.expense >= avgNonZeroExpense * 2)
      .sort((a, b) => b.expense - a.expense)[0];

    if (spikingDay && avgNonZeroExpense >= 1000) {
      anomalies.push({
        id: `day-${spikingDay.date}`,
        scope: 'day',
        label: spikingDay.date,
        amountCents: spikingDay.expense,
        baselineCents: Math.round(avgNonZeroExpense),
        deltaPct:
          ((spikingDay.expense - avgNonZeroExpense) / avgNonZeroExpense) * 100,
        date: spikingDay.date,
      });
    }
  }

  const previousMap = new Map(
    previousExpenseCategories.map((item) => [item.categoryId, item]),
  );
  const categoryCandidates = currentExpenseCategories.reduce<AnomalyItem[]>(
    (acc, item) => {
      const prev = previousMap.get(item.categoryId);
      const baselineCents = prev?.total ?? 0;
      if (baselineCents < 1000 || item.total < 2500) return acc;
      const ratio = baselineCents > 0 ? item.total / baselineCents : 0;
      if (ratio < 1.75) return acc;
      acc.push({
        id: `category-${item.categoryId}`,
        scope: 'category',
        label: item.categoryName,
        amountCents: item.total,
        baselineCents,
        deltaPct: ((item.total - baselineCents) / baselineCents) * 100,
        categoryId: item.categoryId,
        color: item.color,
        icon: item.icon,
      });
      return acc;
    },
    [],
  );

  const categorySpike = categoryCandidates.sort(
    (a, b) => b.deltaPct - a.deltaPct,
  )[0];

  if (categorySpike) {
    anomalies.push(categorySpike);
  }

  return anomalies.slice(0, 2);
}

function buildInsights(
  summary: MonthSummary,
  comparison: RangeComparison,
  topMovers: TopMoverItem[],
  budgetSnapshot: BudgetOverlayItem[],
  anomalies: AnomalyItem[],
  expenseFlow: DailyCashFlow[],
  range: { start: string; end: string },
): InsightItem[] {
  const insights: InsightItem[] = [];

  insights.push({
    id: 'expense-comparison',
    kind: 'comparison',
    title:
      comparison.expenseDeltaCents === 0
        ? 'Spending held steady'
        : `Spending ${
            comparison.expenseDeltaCents > 0 ? 'up' : 'down'
          } vs previous period`,
    body:
      comparison.expenseDeltaPct == null
        ? `Expenses changed from a zero baseline in the previous period.`
        : `Expenses moved by ${Math.abs(comparison.expenseDeltaPct).toFixed(
            1,
          )}% compared with the previous matching range.`,
    tone:
      comparison.expenseDeltaCents > 0
        ? 'expense'
        : comparison.expenseDeltaCents < 0
          ? 'income'
          : 'neutral',
  });

  insights.push({
    id: 'income-comparison',
    kind: 'comparison',
    title:
      comparison.incomeDeltaCents === 0
        ? 'Income stayed stable'
        : `Income ${
            comparison.incomeDeltaCents > 0 ? 'up' : 'down'
          } vs previous period`,
    body:
      comparison.incomeDeltaPct == null
        ? `Income changed from a zero baseline in the previous period.`
        : `Income moved by ${Math.abs(comparison.incomeDeltaPct).toFixed(
            1,
          )}% over the previous matching range.`,
    tone:
      comparison.incomeDeltaCents > 0
        ? 'income'
        : comparison.incomeDeltaCents < 0
          ? 'expense'
          : 'neutral',
  });

  insights.push({
    id: 'net-comparison',
    kind: 'trend',
    title: `Net ${comparison.netDeltaCents >= 0 ? 'improved' : 'softened'}`,
    body:
      comparison.netDeltaPct == null
        ? `Net changed from a zero prior baseline to ${
            summary.net >= 0 ? 'a surplus' : 'a deficit'
          } this period.`
        : `Net moved by ${Math.abs(comparison.netDeltaPct).toFixed(
            1,
          )}% compared with the previous matching range.`,
    tone: comparison.netDeltaCents >= 0 ? 'income' : 'expense',
  });

  const strongestMover = topMovers[0];
  if (strongestMover) {
    insights.push({
      id: 'top-mover',
      kind: 'trend',
      title: `${strongestMover.categoryName} shifted the most`,
      body:
        strongestMover.deltaPct == null
          ? `This category moved sharply from a zero baseline in the previous period.`
          : `It changed by ${Math.abs(strongestMover.deltaPct).toFixed(
              1,
            )}% compared with the previous matching range.`,
      tone: strongestMover.deltaCents > 0 ? 'expense' : 'income',
      drillTarget:
        strongestMover.currentTotalCents > 0
          ? {
              screen: 'CategoryTransactions',
              categoryId: strongestMover.categoryId,
              dateFrom: range.start,
              dateTo: range.end,
            }
          : undefined,
    });
  }

  const highestExpenseDay = [...expenseFlow].sort(
    (a, b) => b.expense - a.expense,
  )[0];
  if (highestExpenseDay && highestExpenseDay.expense > 0) {
    insights.push({
      id: 'highest-expense-day',
      kind: 'trend',
      title: 'Highest spending day',
      body: `${highestExpenseDay.date} carried the largest expense total in this range.`,
      tone: 'warning',
    });
  }

  const weekdayStats = expenseFlow.reduce<
    Map<string, { label: string; total: number; count: number }>
  >((acc, day) => {
    const key = format(parseDateStart(day.date), 'i');
    const current = acc.get(key);
    const next = {
      label: format(parseDateStart(day.date), 'EEEE'),
      total: (current?.total ?? 0) + day.expense,
      count: (current?.count ?? 0) + 1,
    };
    acc.set(key, next);
    return acc;
  }, new Map());
  const weekdayAverages = [...weekdayStats.values()]
    .map((item) => ({
      ...item,
      average: item.count > 0 ? item.total / item.count : 0,
    }))
    .sort((a, b) => b.average - a.average);
  const highestWeekday = weekdayAverages[0];
  const lowestWeekday = weekdayAverages[weekdayAverages.length - 1];
  if (
    highestWeekday &&
    lowestWeekday &&
    highestWeekday.average > 0 &&
    highestWeekday.label !== lowestWeekday.label
  ) {
    insights.push({
      id: 'expense-weekday-pattern',
      kind: 'guide',
      title: `${highestWeekday.label}s carry your heaviest spend`,
      body:
        lowestWeekday.average <= 0
          ? `On average, ${highestWeekday.label}s are your biggest spending day, while ${lowestWeekday.label}s stay the lightest.`
          : `On average, you spend the most on ${highestWeekday.label}s and the least on ${lowestWeekday.label}s in this range.`,
      tone: 'warning',
    });
  }

  const budgetAlert = budgetSnapshot
    .filter((item) => item.limitCents > 0 && item.spentCents > 0)
    .sort((a, b) => b.percentage - a.percentage)[0];
  if (budgetAlert && budgetAlert.percentage >= 85) {
    insights.push({
      id: 'budget-alert',
      kind: 'budget',
      title:
        budgetAlert.percentage >= 100
          ? `${budgetAlert.categoryName} is over budget`
          : `${budgetAlert.categoryName} is close to budget`,
      body: `Spending has reached ${budgetAlert.percentage.toFixed(
        0,
      )}% of the monthly limit.`,
      tone: budgetAlert.percentage >= 100 ? 'expense' : 'warning',
      drillTarget: {
        screen: 'CategoryTransactions',
        categoryId: budgetAlert.categoryId,
        dateFrom: range.start,
        dateTo: range.end,
      },
    });
  }

  anomalies.forEach((anomaly) => {
    insights.push({
      id: `anomaly-${anomaly.id}`,
      kind: 'anomaly',
      title:
        anomaly.scope === 'day'
          ? 'Spending spike detected'
          : `${anomaly.label} looks unusual`,
      body:
        anomaly.scope === 'day'
          ? `${anomaly.label} spent ${Math.abs(anomaly.deltaPct).toFixed(
              0,
            )}% above your usual non-zero daily expense.`
          : `${anomaly.label} is up ${Math.abs(anomaly.deltaPct).toFixed(
              0,
            )}% versus the previous comparable period.`,
      tone: 'warning',
      drillTarget:
        anomaly.scope === 'category' && anomaly.categoryId
          ? {
              screen: 'CategoryTransactions',
              categoryId: anomaly.categoryId,
              dateFrom: range.start,
              dateTo: range.end,
            }
          : undefined,
    });
  });

  return insights.slice(0, 6);
}

export const analyticsService = {
  async getMonthSummary(month: string): Promise<MonthSummary> {
    const { start, end } = getMonthRange(month);
    return this.getSummaryForRange(start, end);
  },

  async getCategoryBreakdown(
    month: string,
    type: 'income' | 'expense',
  ): Promise<CategoryBreakdown[]> {
    const { start, end } = getMonthRange(month);
    return this.getCategoryBreakdownForRange(start, end, type);
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
      return {
        date: dateStr,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      };
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
    const { start, end } = getMonthRange(month);
    return this.getDailyIncomeFlowForRange(start, end);
  },

  async getDailyExpenseFlow(month: string): Promise<DailyCashFlow[]> {
    const { start, end } = getMonthRange(month);
    return this.getDailyExpenseFlowForRange(start, end);
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

    for (const monthKey of allMonthsSorted) {
      if (monthKey >= firstNeeded) break;
      const data = monthlyMap.get(monthKey)!;
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

  async getIncomeExpenseTrend({
    anchor,
    period,
    count = 12,
  }: {
    anchor: Date;
    period: TimePeriod;
    count?: number;
  }): Promise<PeriodTrendPoint[]> {
    const anchors: Date[] = [];
    let cursor = anchor;
    for (let i = 0; i < count; i++) {
      anchors.push(cursor);
      cursor = stepAnchor(cursor, period, -1);
    }
    anchors.reverse();

    const points = await Promise.all(
      anchors.map(async (periodAnchor) => {
        const range = getTimePeriodRange(periodAnchor, period);
        const summary = await this.getSummaryForRange(range.start, range.end);
        return {
          label: getTrendPointLabel(range.start, period),
          start: range.start,
          income: summary.totalIncome,
          expense: summary.totalExpense,
          net: summary.net,
        };
      }),
    );

    return points;
  },

  async getAccountPeriodBalances(
    month: string,
  ): Promise<AccountPeriodBalance[]> {
    const { start, end } = getMonthRange(month);
    return this.getAccountPeriodBalancesForRange(start, end);
  },

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

    return mapCategoryRows(rows);
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

  async getComparisonForRange(
    start: string,
    end: string,
  ): Promise<RangeComparison> {
    const previousRange = getPreviousRange(start, end);
    const [currentSummary, previousSummary] = await Promise.all([
      this.getSummaryForRange(start, end),
      this.getSummaryForRange(previousRange.start, previousRange.end),
    ]);

    return {
      previousStart: previousRange.start,
      previousEnd: previousRange.end,
      previousIncomeCents: previousSummary.totalIncome,
      previousExpenseCents: previousSummary.totalExpense,
      previousNetCents: previousSummary.net,
      incomeDeltaCents:
        currentSummary.totalIncome - previousSummary.totalIncome,
      expenseDeltaCents:
        currentSummary.totalExpense - previousSummary.totalExpense,
      netDeltaCents: currentSummary.net - previousSummary.net,
      incomeDeltaPct: getDeltaPct(
        currentSummary.totalIncome,
        previousSummary.totalIncome,
      ),
      expenseDeltaPct: getDeltaPct(
        currentSummary.totalExpense,
        previousSummary.totalExpense,
      ),
      netDeltaPct: getDeltaPct(currentSummary.net, previousSummary.net),
    };
  },

  async getBudgetOverlayForMonth(month: string): Promise<BudgetOverlayItem[]> {
    const db = await getDatabase();
    const { start, end } = getMonthRange(month);
    const rows = await db.getAllAsync<any>(
      `SELECT
        b.category_id as categoryId,
        c.name as categoryName,
        c.color,
        c.icon,
        b.limit_cents as limitCents,
        COALESCE((
          SELECT SUM(t.total_amount_cents)
          FROM transactions t
          WHERE t.category_id = b.category_id
            AND t.type = 'expense'
            AND t.date >= ?
            AND t.date < ?
        ), 0) as spentCents
      FROM budgets b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.month = ? AND b.enabled = 1
      ORDER BY spentCents DESC, c.name ASC`,
      [start, end, month],
    );

    return rows.map((row) => {
      const limitCents = row.limitCents ?? 0;
      const spentCents = row.spentCents ?? 0;
      return {
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? 'Unknown',
        color: row.color ?? '#999999',
        icon: row.icon ?? 'help-circle',
        limitCents,
        spentCents,
        remainingCents: limitCents - spentCents,
        percentage: limitCents > 0 ? (spentCents / limitCents) * 100 : 0,
      };
    });
  },

  async getInsightsForRange(
    start: string,
    end: string,
    period: TimePeriod,
  ): Promise<InsightItem[]> {
    const previousRange = getPreviousRange(start, end);
    const [
      summary,
      comparison,
      currentExpenseCategories,
      previousExpenseCategories,
      expenseFlow,
    ] = await Promise.all([
      this.getSummaryForRange(start, end),
      this.getComparisonForRange(start, end),
      this.getCategoryBreakdownForRange(start, end, 'expense'),
      this.getCategoryBreakdownForRange(
        previousRange.start,
        previousRange.end,
        'expense',
      ),
      this.getDailyExpenseFlowForRange(start, end),
    ]);
    const topMovers = buildTopMovers(
      currentExpenseCategories,
      previousExpenseCategories,
    );
    const budgetSnapshot =
      period === 'month'
        ? await this.getBudgetOverlayForMonth(start.slice(0, 7))
        : [];
    const anomalies = buildAnomalies(
      expenseFlow,
      currentExpenseCategories,
      previousExpenseCategories,
    );

    return buildInsights(
      summary,
      comparison,
      topMovers,
      budgetSnapshot,
      anomalies,
      expenseFlow,
      { start, end },
    );
  },

  async getAnalyticsSnapshot({
    start,
    end,
    anchor,
    period,
  }: {
    start: string;
    end: string;
    anchor: Date;
    period: TimePeriod;
  }): Promise<AnalyticsSnapshot> {
    const previousRange = getPreviousRange(start, end);
    const month =
      period === 'month' ? format(anchor, 'yyyy-MM') : start.slice(0, 7);
    const [
      summary,
      comparison,
      currentExpenseCategories,
      previousExpenseCategories,
      expenseFlow,
      budgetSnapshot,
    ] = await Promise.all([
      this.getSummaryForRange(start, end),
      this.getComparisonForRange(start, end),
      this.getCategoryBreakdownForRange(start, end, 'expense'),
      this.getCategoryBreakdownForRange(
        previousRange.start,
        previousRange.end,
        'expense',
      ),
      this.getDailyExpenseFlowForRange(start, end),
      period === 'month'
        ? this.getBudgetOverlayForMonth(month)
        : Promise.resolve([] as BudgetOverlayItem[]),
    ]);

    const topMovers = buildTopMovers(
      currentExpenseCategories,
      previousExpenseCategories,
    );
    const anomalies = buildAnomalies(
      expenseFlow,
      currentExpenseCategories,
      previousExpenseCategories,
    );
    const insights = buildInsights(
      summary,
      comparison,
      topMovers,
      budgetSnapshot,
      anomalies,
      expenseFlow,
      { start, end },
    );

    return {
      summary,
      comparison,
      topMovers,
      budgetSnapshot,
      anomalies,
      insights,
    };
  },
};
