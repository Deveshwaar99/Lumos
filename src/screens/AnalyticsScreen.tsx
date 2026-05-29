import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AccountAnalysisChart from '../components/charts/AccountAnalysisChart';
import CalendarGrid from '../components/charts/CalendarGrid';
import CategoryDonutChart from '../components/charts/CategoryDonutChart';
import FlowLineChart from '../components/charts/FlowLineChart';
import NetWorthChart from '../components/charts/NetWorthChart';
import PeriodNavigator from '../components/PeriodNavigator';
import TimePeriodPicker from '../components/TimePeriodPicker';
import TimePeriodTrigger from '../components/TimePeriodTrigger';
import AmountText from '../components/ui/AmountText';
import { GlassCard } from '../components/ui/GlassCard';
import type {
  AccountPeriodBalance,
  AnalyticsSnapshot,
  BudgetOverlayItem,
  CategoryBreakdown,
  DailyCashFlow,
  InsightDrillTarget,
  InsightItem,
  NetWorthPoint,
} from '../models/types';
import type { TabScreenProps } from '../navigation/types';
import { analyticsService } from '../services/analyticsService';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, radius, spacing, typography } from '../theme';
import {
  getDaysInRange,
  getTimePeriodLabel,
  getTimePeriodRange,
  stepAnchor,
  type TimePeriod,
} from '../utils/dates';
import { clampMoneyDecimalPlaces } from '../utils/money';

type AnalysisView =
  | 'analysis'
  | 'insights'
  | 'expense_overview'
  | 'income_overview'
  | 'expense_flow'
  | 'income_flow'
  | 'account_analysis'
  | 'net_worth';

const VIEW_OPTIONS: { key: AnalysisView; label: string; icon: string }[] = [
  { key: 'analysis', label: 'Analysis', icon: 'calculator-variant-outline' },
  { key: 'insights', label: 'Insights', icon: 'lightbulb-on-outline' },
  { key: 'expense_overview', label: 'Expenses', icon: 'chart-donut' },
  { key: 'income_overview', label: 'Income', icon: 'chart-donut' },
  { key: 'expense_flow', label: 'Exp. Flow', icon: 'chart-line' },
  { key: 'income_flow', label: 'Inc. Flow', icon: 'chart-line' },
  { key: 'account_analysis', label: 'Accounts', icon: 'chart-bar' },
  { key: 'net_worth', label: 'Net Worth', icon: 'chart-timeline-variant' },
];

const EMPTY_SNAPSHOT: AnalyticsSnapshot = {
  summary: { totalIncome: 0, totalExpense: 0, net: 0 },
  comparison: {
    previousStart: '',
    previousEnd: '',
    previousIncomeCents: 0,
    previousExpenseCents: 0,
    previousNetCents: 0,
    incomeDeltaCents: 0,
    expenseDeltaCents: 0,
    netDeltaCents: 0,
    incomeDeltaPct: 0,
    expenseDeltaPct: 0,
    netDeltaPct: 0,
  },
  topMovers: [],
  budgetSnapshot: [],
  anomalies: [],
  insights: [],
};

function getToneColor(tone: InsightItem['tone']) {
  switch (tone) {
    case 'income':
      return colors.income;
    case 'expense':
      return colors.expense;
    case 'warning':
      return colors.primary;
    default:
      return colors.textSecondary;
  }
}

function getToneBackground(tone: InsightItem['tone']) {
  switch (tone) {
    case 'income':
      return colors.incomeBg;
    case 'expense':
      return colors.expenseBg;
    case 'warning':
      return colors.warningContainer;
    default:
      return colors.surfaceVariant;
  }
}

function getInsightIcon(insight: InsightItem): string {
  switch (insight.kind) {
    case 'comparison':
      return 'swap-vertical';
    case 'trend':
      return 'trending-up';
    case 'budget':
      return 'target';
    case 'anomaly':
      return 'alert-circle-outline';
    case 'guide':
      return 'calendar-week';
    default:
      return 'lightbulb-on-outline';
  }
}

function formatDeltaPct(value: number | null): string {
  if (value == null) return 'new';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatDeltaLabel(value: number): string {
  if (value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

function getHelpCopy(
  view: AnalysisView,
  period: TimePeriod,
  hasTransactions: boolean,
): { icon: string; title: string; body: string } {
  if (!hasTransactions) {
    return {
      icon: 'chart-box-outline',
      title: 'Nothing to analyze yet',
      body:
        period === 'month'
          ? 'Add transactions this month to unlock trends, category mix, and budget context.'
          : 'This range has no matching transactions yet. Try another period or add activity first.',
    };
  }

  switch (view) {
    case 'analysis':
      return {
        icon: 'calculator-variant-outline',
        title: 'Analysis will appear here',
        body: 'This view keeps the calculated metrics together, including daily averages and previous-period comparisons.',
      };
    case 'insights':
      return {
        icon: 'lightbulb-on-outline',
        title: 'Insights will appear here',
        body: 'As your data builds up, this view will summarize the most important changes and call out what needs attention first.',
      };
    case 'expense_overview':
      return {
        icon: 'chart-donut',
        title: 'No expense categories yet',
        body: 'Try switching to month view or add categorized expenses to see where money is going.',
      };
    case 'income_overview':
      return {
        icon: 'cash-plus',
        title: 'No income categories yet',
        body: 'Add income transactions or switch to a wider range to see sources of inflow.',
      };
    case 'expense_flow':
    case 'income_flow':
      return {
        icon: 'chart-line',
        title: 'No daily trend available',
        body: 'The selected range has no visible daily movement yet. Try month view for clearer patterns.',
      };
    case 'account_analysis':
      return {
        icon: 'wallet-outline',
        title: 'No account movement yet',
        body: 'Once transactions hit your accounts, this view will highlight where inflows and outflows concentrate.',
      };
    case 'net_worth':
      return {
        icon: 'chart-timeline-variant',
        title: 'Net worth needs more history',
        body: 'Keep using the app over multiple periods to get a more meaningful net worth trend line.',
      };
  }
}

export default function AnalyticsScreen({
  navigation,
}: TabScreenProps<'Analytics'>) {
  const currencySymbol = useSettingsStore(
    (state) => state.settings.currencySymbol,
  );
  const moneyDecimals = clampMoneyDecimalPlaces(
    useSettingsStore((state) => state.settings.decimalPlaces),
  );
  const insets = useSafeAreaInsets();
  const [anchor, setAnchor] = useState(() => new Date());
  const [period, setPeriod] = useState<TimePeriod>('month');
  const [filterVisible, setFilterVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [activeView, setActiveView] = useState<AnalysisView>('insights');
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(EMPTY_SNAPSHOT);
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>(
    [],
  );
  const [incomeBreakdown, setIncomeBreakdown] = useState<CategoryBreakdown[]>(
    [],
  );
  const [expenseFlow, setExpenseFlow] = useState<DailyCashFlow[]>([]);
  const [incomeFlow, setIncomeFlow] = useState<DailyCashFlow[]>([]);
  const [accountPeriod, setAccountPeriod] = useState<AccountPeriodBalance[]>(
    [],
  );
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthPoint[]>([]);

  const range = useMemo(
    () => getTimePeriodRange(anchor, period),
    [anchor, period],
  );
  const navLabel = useMemo(
    () => getTimePeriodLabel(anchor, period),
    [anchor, period],
  );
  const monthKey = useMemo(() => format(anchor, 'yyyy-MM'), [anchor]);
  const periodDayCount = useMemo(
    () => Math.max(1, getDaysInRange(range.start, range.end).length),
    [range.start, range.end],
  );

  const summary = snapshot.summary;
  const avgIncomePerDay = useMemo(
    () => Math.round(summary.totalIncome / periodDayCount),
    [summary.totalIncome, periodDayCount],
  );
  const avgExpensePerDay = useMemo(
    () => Math.round(summary.totalExpense / periodDayCount),
    [summary.totalExpense, periodDayCount],
  );
  const avgNetPerDay = useMemo(
    () => Math.round(summary.net / periodDayCount),
    [summary.net, periodDayCount],
  );
  const netTone = summary.net >= 0 ? 'income' : 'expense';
  const avgNetTone = avgNetPerDay >= 0 ? 'income' : 'expense';

  const loadedViewRef = useRef<{
    view: AnalysisView;
    start: string;
    end: string;
  } | null>(null);

  const loadSnapshot = useCallback(async () => {
    setSnapshotLoading(true);
    try {
      const nextSnapshot = await analyticsService.getAnalyticsSnapshot({
        start: range.start,
        end: range.end,
        anchor,
        period,
      });
      setSnapshot(nextSnapshot);
    } catch (e) {
      console.error('Analytics snapshot load error:', e);
      setSnapshot(EMPTY_SNAPSHOT);
    } finally {
      setSnapshotLoading(false);
    }
  }, [anchor, period, range.end, range.start]);

  const loadViewData = useCallback(
    async (view: AnalysisView, options?: { force?: boolean }) => {
      const cacheKey = { view, start: range.start, end: range.end };
      const prev = loadedViewRef.current;
      if (
        !options?.force &&
        prev &&
        prev.view === cacheKey.view &&
        prev.start === cacheKey.start &&
        prev.end === cacheKey.end
      ) {
        return;
      }

      setLoading(true);
      try {
        switch (view) {
          case 'expense_overview': {
            const data = await analyticsService.getCategoryBreakdownForRange(
              range.start,
              range.end,
              'expense',
            );
            setExpenseBreakdown(data.sort((a, b) => b.total - a.total));
            break;
          }
          case 'income_overview': {
            const data = await analyticsService.getCategoryBreakdownForRange(
              range.start,
              range.end,
              'income',
            );
            setIncomeBreakdown(data.sort((a, b) => b.total - a.total));
            break;
          }
          case 'expense_flow': {
            const data = await analyticsService.getDailyExpenseFlowForRange(
              range.start,
              range.end,
            );
            setExpenseFlow(data);
            break;
          }
          case 'income_flow': {
            const data = await analyticsService.getDailyIncomeFlowForRange(
              range.start,
              range.end,
            );
            setIncomeFlow(data);
            break;
          }
          case 'account_analysis': {
            const data =
              await analyticsService.getAccountPeriodBalancesForRange(
                range.start,
                range.end,
              );
            setAccountPeriod(data);
            break;
          }
          case 'net_worth': {
            const data = await analyticsService.getNetWorthHistory(
              monthKey,
              12,
            );
            setNetWorthHistory(data);
            break;
          }
        }
        loadedViewRef.current = cacheKey;
      } catch (e) {
        console.error('Analytics view load error:', e);
      } finally {
        setLoading(false);
      }
    },
    [monthKey, range.end, range.start],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSnapshot();
    }, [loadSnapshot]),
  );

  useEffect(() => {
    loadedViewRef.current = null;
    void loadViewData(activeView, { force: true });
    // biome-ignore lint/correctness/useExhaustiveDependencies: activeView read for current chip when range changes
  }, [range.start, range.end, anchor, period, loadViewData]);

  useEffect(() => {
    void loadViewData(activeView);
  }, [activeView, loadViewData]);

  const totalExpenseForBar = expenseBreakdown.reduce((s, c) => s + c.total, 0);
  const totalIncomeForBar = incomeBreakdown.reduce((s, c) => s + c.total, 0);
  const hasTransactions = summary.totalIncome > 0 || summary.totalExpense > 0;
  const topExpenseShare = useMemo(() => {
    if (totalExpenseForBar <= 0 || expenseBreakdown.length === 0) return null;
    const topThreeTotal = expenseBreakdown
      .slice(0, 3)
      .reduce((sum, item) => sum + item.total, 0);
    return {
      share: (topThreeTotal / totalExpenseForBar) * 100,
      activeCount: expenseBreakdown.length,
    };
  }, [expenseBreakdown, totalExpenseForBar]);
  const topIncomeShare = useMemo(() => {
    if (totalIncomeForBar <= 0 || incomeBreakdown.length === 0) return null;
    const topThreeTotal = incomeBreakdown
      .slice(0, 3)
      .reduce((sum, item) => sum + item.total, 0);
    return {
      share: (topThreeTotal / totalIncomeForBar) * 100,
      activeCount: incomeBreakdown.length,
    };
  }, [incomeBreakdown, totalIncomeForBar]);

  const largestExpenseDay = useMemo(
    () => [...expenseFlow].sort((a, b) => b.expense - a.expense)[0] ?? null,
    [expenseFlow],
  );
  const largestIncomeDay = useMemo(
    () => [...incomeFlow].sort((a, b) => b.income - a.income)[0] ?? null,
    [incomeFlow],
  );
  const topAccountOutflow = useMemo(
    () =>
      [...accountPeriod].sort((a, b) => b.periodExpense - a.periodExpense)[0] ??
      null,
    [accountPeriod],
  );
  const topAccountInflow = useMemo(
    () =>
      [...accountPeriod].sort((a, b) => b.periodIncome - a.periodIncome)[0] ??
      null,
    [accountPeriod],
  );
  const netWorthTrend = useMemo(() => {
    if (netWorthHistory.length < 2) return null;
    const recent = netWorthHistory.slice(-6);
    let rising = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].netWorth >= recent[i - 1].netWorth) rising += 1;
    }
    return `Net worth rose in ${rising} of the last ${Math.max(
      recent.length - 1,
      1,
    )} periods.`;
  }, [netWorthHistory]);

  const activeViewIntro = useMemo(() => {
    switch (activeView) {
      case 'analysis':
        return `Averages and period-over-period changes for ${periodDayCount} day${periodDayCount === 1 ? '' : 's'}.`;
      case 'expense_overview':
        return topExpenseShare
          ? `Your top 3 expense categories make up ${topExpenseShare.share.toFixed(
              0,
            )}% of spending across ${topExpenseShare.activeCount} active categories.`
          : 'Explore how concentrated or spread out your spending is this period.';
      case 'income_overview':
        return topIncomeShare
          ? `Your top 3 income sources contribute ${topIncomeShare.share.toFixed(
              0,
            )}% of inflow across ${topIncomeShare.activeCount} active categories.`
          : 'Explore how concentrated your income sources are in this range.';
      case 'expense_flow':
        return largestExpenseDay?.expense
          ? `Peak expense day: ${largestExpenseDay.date}.`
          : 'Daily expense flow will appear once this range has activity.';
      case 'income_flow':
        return largestIncomeDay?.income
          ? `Peak income day: ${largestIncomeDay.date}.`
          : 'Daily income flow will appear once this range has activity.';
      case 'account_analysis':
        return topAccountOutflow?.periodExpense
          ? `${topAccountOutflow.accountName} carried the highest outflow this period.`
          : topAccountInflow?.periodIncome
            ? `${topAccountInflow.accountName} carried the highest inflow this period.`
            : 'See which accounts are doing most of the work in this range.';
      case 'net_worth':
        return (
          netWorthTrend ??
          'Net worth trends become more useful as more periods accumulate.'
        );
    }
  }, [
    activeView,
    largestExpenseDay,
    largestIncomeDay,
    netWorthTrend,
    topExpenseShare,
    topIncomeShare,
    topAccountInflow,
    topAccountOutflow,
  ]);

  const handleDrillTarget = useCallback(
    (target?: InsightDrillTarget) => {
      if (!target) return;
      if (target.screen === 'CategoryTransactions' && target.categoryId) {
        navigation.navigate('CategoryTransactions', {
          categoryId: target.categoryId,
          dateFrom: target.dateFrom,
          dateTo: target.dateTo,
        });
      }
      if (target.screen === 'AccountTransactions' && target.accountId) {
        navigation.navigate('AccountTransactions', {
          accountId: target.accountId,
          dateFrom: target.dateFrom,
          dateTo: target.dateTo,
        });
      }
    },
    [navigation],
  );

  const renderHelpState = useCallback(
    (view: AnalysisView) => {
      const help = getHelpCopy(view, period, hasTransactions);
      return (
        <View style={styles.helpCard}>
          <View style={styles.helpIcon}>
            <Icon source={help.icon as any} size={26} color={colors.primary} />
          </View>
          <Text style={styles.helpTitle}>{help.title}</Text>
          <Text style={styles.helpBody}>{help.body}</Text>
        </View>
      );
    },
    [hasTransactions, period],
  );

  const renderBreakdownList = (
    data: CategoryBreakdown[],
    total: number,
    isExpense: boolean,
  ) => {
    if (data.length === 0) {
      return renderHelpState(
        isExpense ? 'expense_overview' : 'income_overview',
      );
    }
    return (
      <View style={styles.breakdownCard}>
        {data.map((cat, idx) => {
          const pct = total > 0 ? (cat.total / total) * 100 : 0;
          return (
            <TouchableOpacity
              key={cat.categoryId}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('CategoryTransactions', {
                  categoryId: cat.categoryId,
                })
              }
              style={[
                styles.breakdownRow,
                idx < data.length - 1 && styles.breakdownRowBorder,
              ]}
            >
              <View
                style={[styles.catIcon, { backgroundColor: cat.color + '18' }]}
              >
                <Icon source={cat.icon as any} size={20} color={cat.color} />
              </View>
              <View style={styles.breakdownContent}>
                <View style={styles.breakdownHeader}>
                  <Text variant="bodyMedium" style={styles.catName}>
                    {cat.categoryName}
                  </Text>
                  <AmountText
                    cents={cat.total}
                    currencySymbol={currencySymbol}
                    decimalPlaces={moneyDecimals}
                    signPrefix={isExpense ? '-' : ''}
                    tone={isExpense ? 'expense' : 'income'}
                    size="body"
                    style={{ fontSize: 13, fontWeight: '700' }}
                  />
                </View>
                <View style={styles.barRow}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: cat.color,
                        },
                      ]}
                    />
                  </View>
                  <Text variant="labelSmall" style={styles.pctLabel}>
                    {pct.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderBudgetOverlay = (items: BudgetOverlayItem[]) => {
    if (period !== 'month' || items.length === 0) return null;
    return (
      <View style={styles.budgetCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Budget vs Actual</Text>
          <Text style={styles.sectionCaption}>Monthly only</Text>
        </View>
        {items.slice(0, 4).map((item, idx) => {
          const tone =
            item.percentage >= 100
              ? colors.expense
              : item.percentage >= 85
                ? colors.primary
                : colors.income;
          return (
            <TouchableOpacity
              key={item.categoryId}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('CategoryTransactions', {
                  categoryId: item.categoryId,
                  dateFrom: range.start,
                  dateTo: range.end,
                })
              }
              style={[
                styles.budgetRow,
                idx < Math.min(items.length, 4) - 1 &&
                  styles.breakdownRowBorder,
              ]}
            >
              <View
                style={[styles.catIcon, { backgroundColor: item.color + '18' }]}
              >
                <Icon source={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.budgetContent}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.catName}>{item.categoryName}</Text>
                  <Text style={[styles.budgetPct, { color: tone }]}>
                    {item.percentage.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(item.percentage, 100)}%`,
                        backgroundColor: tone,
                      },
                    ]}
                  />
                </View>
                <View style={styles.budgetAmounts}>
                  <Text style={styles.budgetMeta}>Spent</Text>
                  <AmountText
                    cents={item.spentCents}
                    currencySymbol={currencySymbol}
                    decimalPlaces={moneyDecimals}
                    signPrefix="-"
                    tone="expense"
                    size="body"
                    style={styles.budgetAmount}
                  />
                  <Text style={styles.budgetMeta}>of</Text>
                  <AmountText
                    cents={item.limitCents}
                    currencySymbol={currencySymbol}
                    decimalPlaces={moneyDecimals}
                    tone="default"
                    size="body"
                    style={styles.budgetAmount}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'analysis':
        return (
          <>
            <View style={styles.chartCard}>
              <View style={styles.analysisHero}>
                <View style={styles.analysisHeroBadge}>
                  <Icon
                    source="calculator-variant-outline"
                    size={16}
                    color={colors.primaryLight}
                  />
                  <Text style={styles.analysisHeroBadgeText}>Analysis</Text>
                </View>
                <Text style={styles.analysisHeroTitle}>Daily pace</Text>
                <Text style={styles.analysisHeroBody}>{activeViewIntro}</Text>
              </View>

              <View style={styles.analysisGrid}>
                <View
                  style={[
                    styles.analysisMetricCard,
                    styles.analysisMetricCardIncome,
                  ]}
                >
                  <View style={styles.analysisMetricHeader}>
                    <View
                      style={[
                        styles.analysisMetricIconWrap,
                        styles.analysisMetricIconIncome,
                      ]}
                    >
                      <Icon
                        source="arrow-bottom-left"
                        size={16}
                        color={colors.income}
                      />
                    </View>
                    <Text style={styles.analysisMetricLabel}>Avg In / day</Text>
                  </View>
                  <AmountText
                    cents={avgIncomePerDay}
                    currencySymbol={currencySymbol}
                    decimalPlaces={moneyDecimals}
                    tone="income"
                    size="body"
                    style={styles.analysisMetricValue}
                  />
                </View>
                <View
                  style={[
                    styles.analysisMetricCard,
                    styles.analysisMetricCardExpense,
                  ]}
                >
                  <View style={styles.analysisMetricHeader}>
                    <View
                      style={[
                        styles.analysisMetricIconWrap,
                        styles.analysisMetricIconExpense,
                      ]}
                    >
                      <Icon
                        source="arrow-top-right"
                        size={16}
                        color={colors.expense}
                      />
                    </View>
                    <Text style={styles.analysisMetricLabel}>
                      Avg Out / day
                    </Text>
                  </View>
                  <AmountText
                    cents={avgExpensePerDay}
                    currencySymbol={currencySymbol}
                    decimalPlaces={moneyDecimals}
                    tone="expense"
                    size="body"
                    style={styles.analysisMetricValue}
                  />
                </View>
                <View
                  style={[
                    styles.analysisMetricCard,
                    avgNetPerDay >= 0
                      ? styles.analysisMetricCardIncome
                      : styles.analysisMetricCardExpense,
                  ]}
                >
                  <View style={styles.analysisMetricHeader}>
                    <View
                      style={[
                        styles.analysisMetricIconWrap,
                        avgNetPerDay >= 0
                          ? styles.analysisMetricIconIncome
                          : styles.analysisMetricIconExpense,
                      ]}
                    >
                      <Icon
                        source={
                          avgNetPerDay >= 0 ? 'trending-up' : 'trending-down'
                        }
                        size={16}
                        color={
                          avgNetPerDay >= 0 ? colors.income : colors.expense
                        }
                      />
                    </View>
                    <Text style={styles.analysisMetricLabel}>
                      Avg Net / day
                    </Text>
                  </View>
                  <AmountText
                    cents={avgNetPerDay}
                    currencySymbol={currencySymbol}
                    decimalPlaces={moneyDecimals}
                    signPrefix={avgNetPerDay >= 0 ? '+' : ''}
                    tone={avgNetTone}
                    size="body"
                    style={styles.analysisMetricValue}
                  />
                  <Text style={styles.analysisMetricFootnote}>
                    {avgNetPerDay >= 0
                      ? 'Positive pace'
                      : 'Spending pace leads'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Vs Previous Period</Text>
                <Text style={styles.sectionCaption}>Momentum</Text>
              </View>
              <Text style={styles.chartNote}>
                Read this as direction first, then size of change.
              </Text>
              <View style={styles.analysisComparisonStack}>
                <View style={styles.analysisComparisonRow}>
                  <View style={styles.analysisComparisonLabelBlock}>
                    <Text style={styles.analysisComparisonLabel}>Income</Text>
                    <Text style={styles.analysisComparisonHint}>
                      {snapshot.comparison.incomeDeltaCents >= 0
                        ? 'Higher than last period'
                        : 'Lower than last period'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.analysisComparisonBadge,
                      snapshot.comparison.incomeDeltaCents >= 0
                        ? styles.analysisComparisonBadgeIncome
                        : styles.analysisComparisonBadgeExpense,
                    ]}
                  >
                    <Text
                      style={[
                        styles.analysisComparisonBadgeText,
                        {
                          color:
                            snapshot.comparison.incomeDeltaCents >= 0
                              ? colors.income
                              : colors.expense,
                        },
                      ]}
                    >
                      {formatDeltaPct(snapshot.comparison.incomeDeltaPct)}
                    </Text>
                  </View>
                </View>
                <View style={styles.analysisComparisonRow}>
                  <View style={styles.analysisComparisonLabelBlock}>
                    <Text style={styles.analysisComparisonLabel}>Expenses</Text>
                    <Text style={styles.analysisComparisonHint}>
                      {snapshot.comparison.expenseDeltaCents > 0
                        ? 'Higher spend than last period'
                        : 'Lower spend than last period'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.analysisComparisonBadge,
                      snapshot.comparison.expenseDeltaCents > 0
                        ? styles.analysisComparisonBadgeExpense
                        : styles.analysisComparisonBadgeIncome,
                    ]}
                  >
                    <Text
                      style={[
                        styles.analysisComparisonBadgeText,
                        {
                          color:
                            snapshot.comparison.expenseDeltaCents > 0
                              ? colors.expense
                              : colors.income,
                        },
                      ]}
                    >
                      {formatDeltaPct(snapshot.comparison.expenseDeltaPct)}
                    </Text>
                  </View>
                </View>
                <View style={styles.analysisComparisonRow}>
                  <View style={styles.analysisComparisonLabelBlock}>
                    <Text style={styles.analysisComparisonLabel}>Net</Text>
                    <Text style={styles.analysisComparisonHint}>
                      {snapshot.comparison.netDeltaCents >= 0
                        ? 'Net position improved'
                        : 'Net position softened'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.analysisComparisonBadge,
                      snapshot.comparison.netDeltaCents >= 0
                        ? styles.analysisComparisonBadgeIncome
                        : styles.analysisComparisonBadgeExpense,
                    ]}
                  >
                    <Text
                      style={[
                        styles.analysisComparisonBadgeText,
                        {
                          color:
                            snapshot.comparison.netDeltaCents >= 0
                              ? colors.income
                              : colors.expense,
                        },
                      ]}
                    >
                      {formatDeltaPct(snapshot.comparison.netDeltaPct)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Previous Totals</Text>
                <Text style={styles.sectionCaption}>Reference</Text>
              </View>
              <View style={styles.analysisReferenceRow}>
                <View style={styles.analysisReferenceItem}>
                  <Text style={styles.analysisReferenceLabel}>Previous In</Text>
                  <AmountText
                    cents={snapshot.comparison.previousIncomeCents}
                    currencySymbol={currencySymbol}
                    decimalPlaces={moneyDecimals}
                    tone="income"
                    size="body"
                    style={styles.analysisReferenceValue}
                  />
                </View>
                <View style={styles.analysisReferenceDivider} />
                <View style={styles.analysisReferenceItem}>
                  <Text style={styles.analysisReferenceLabel}>
                    Previous Out
                  </Text>
                  <AmountText
                    cents={snapshot.comparison.previousExpenseCents}
                    currencySymbol={currencySymbol}
                    decimalPlaces={moneyDecimals}
                    signPrefix="-"
                    tone="expense"
                    size="body"
                    style={styles.analysisReferenceValue}
                  />
                </View>
                <View style={styles.analysisReferenceDivider} />
                <View style={styles.analysisReferenceItem}>
                  <Text style={styles.analysisReferenceLabel}>
                    Previous Net
                  </Text>
                  <AmountText
                    cents={snapshot.comparison.previousNetCents}
                    currencySymbol={currencySymbol}
                    decimalPlaces={moneyDecimals}
                    signPrefix={
                      snapshot.comparison.previousNetCents >= 0 ? '+' : ''
                    }
                    tone={
                      snapshot.comparison.previousNetCents >= 0
                        ? 'income'
                        : 'expense'
                    }
                    size="body"
                    style={styles.analysisReferenceValue}
                  />
                </View>
              </View>
            </View>
          </>
        );

      case 'insights':
        return (
          <>
            <View style={styles.chartCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <Text style={styles.sectionCaption}>Story flow</Text>
              </View>
              <Text style={styles.chartNote}>{activeViewIntro}</Text>
              {snapshot.insights.length === 0 ? (
                renderHelpState('expense_overview')
              ) : (
                <View style={styles.inlineInsightsBlock}>
                  {(() => {
                    const featuredInsight = snapshot.insights[0];
                    const narrativeInsights = snapshot.insights.slice(1);
                    const toneColor = getToneColor(featuredInsight.tone);
                    const toneBackground = getToneBackground(
                      featuredInsight.tone,
                    );
                    const isPressable = !!featuredInsight.drillTarget;

                    return (
                      <>
                        <TouchableOpacity
                          activeOpacity={isPressable ? 0.75 : 1}
                          onPress={() =>
                            handleDrillTarget(featuredInsight.drillTarget)
                          }
                          disabled={!isPressable}
                          style={[
                            styles.insightCard,
                            styles.insightCardFeatured,
                          ]}
                        >
                          <View
                            style={[
                              styles.insightIconWrap,
                              styles.insightIconWrapFeatured,
                              { backgroundColor: toneBackground },
                            ]}
                          >
                            <Icon
                              source={getInsightIcon(featuredInsight) as any}
                              size={18}
                              color={toneColor}
                            />
                          </View>
                          <View style={styles.insightContent}>
                            <View style={styles.insightHeader}>
                              <Text style={styles.insightFeaturedLabel}>
                                Top takeaway
                              </Text>
                              <Text
                                style={[
                                  styles.insightKind,
                                  {
                                    color: toneColor,
                                    backgroundColor: toneBackground,
                                    borderColor: toneColor + '22',
                                  },
                                ]}
                              >
                                {featuredInsight.kind.replace('_', ' ')}
                              </Text>
                              {isPressable ? (
                                <Text style={styles.insightTapHint}>Tap</Text>
                              ) : null}
                            </View>
                            <Text
                              style={[
                                styles.insightTitle,
                                styles.insightTitleFeatured,
                              ]}
                            >
                              {featuredInsight.title}
                            </Text>
                            <Text
                              style={[
                                styles.insightBody,
                                styles.insightBodyFeatured,
                              ]}
                            >
                              {featuredInsight.body}
                            </Text>
                          </View>
                          {isPressable ? (
                            <Icon
                              source="chevron-right"
                              size={18}
                              color={colors.textTertiary}
                            />
                          ) : null}
                        </TouchableOpacity>

                        {narrativeInsights.length > 0 ? (
                          <View style={styles.insightTimeline}>
                            {narrativeInsights.map((insight, index) => {
                              const rowToneColor = getToneColor(insight.tone);
                              const rowToneBackground = getToneBackground(
                                insight.tone,
                              );
                              const rowPressable = !!insight.drillTarget;
                              const isLastRow =
                                index === narrativeInsights.length - 1;

                              return (
                                <View
                                  key={insight.id}
                                  style={styles.insightTimelineRow}
                                >
                                  <View style={styles.insightTimelineRail}>
                                    <View
                                      style={[
                                        styles.insightTimelineDot,
                                        { backgroundColor: rowToneColor },
                                      ]}
                                    />
                                    {!isLastRow ? (
                                      <View
                                        style={styles.insightTimelineLine}
                                      />
                                    ) : null}
                                  </View>
                                  <TouchableOpacity
                                    activeOpacity={rowPressable ? 0.75 : 1}
                                    onPress={() =>
                                      handleDrillTarget(insight.drillTarget)
                                    }
                                    disabled={!rowPressable}
                                    style={styles.insightTimelineCard}
                                  >
                                    <View style={styles.insightTimelineHeader}>
                                      <Text
                                        style={[
                                          styles.insightKind,
                                          styles.insightKindSubtle,
                                          {
                                            color: rowToneColor,
                                            backgroundColor: rowToneBackground,
                                            borderColor: rowToneColor + '1F',
                                          },
                                        ]}
                                      >
                                        {insight.kind.replace('_', ' ')}
                                      </Text>
                                      {rowPressable ? (
                                        <Text style={styles.insightTapHint}>
                                          Details
                                        </Text>
                                      ) : null}
                                    </View>
                                    <Text style={styles.insightTimelineTitle}>
                                      {insight.title}
                                    </Text>
                                    <Text style={styles.insightTimelineBody}>
                                      {insight.body}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              );
                            })}
                          </View>
                        ) : null}
                      </>
                    );
                  })()}
                </View>
              )}
            </View>
            {renderBudgetOverlay(snapshot.budgetSnapshot)}
          </>
        );

      case 'expense_overview':
        return (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.chartNote}>{activeViewIntro}</Text>
              <CategoryDonutChart
                data={expenseBreakdown}
                centerLabel="Expenses"
              />
            </View>
            {renderBreakdownList(expenseBreakdown, totalExpenseForBar, true)}
          </>
        );

      case 'income_overview':
        return (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.chartNote}>{activeViewIntro}</Text>
              <CategoryDonutChart
                data={incomeBreakdown}
                centerLabel="Incomes"
              />
            </View>
            {renderBreakdownList(incomeBreakdown, totalIncomeForBar, false)}
          </>
        );

      case 'expense_flow': {
        const hasFlow = expenseFlow.some((item) => item.expense > 0);
        if (!hasFlow) return renderHelpState('expense_flow');
        return (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.chartNote}>{activeViewIntro}</Text>
              <FlowLineChart
                data={expenseFlow}
                currencySymbol={currencySymbol}
                valueKey="expense"
                lineColor={colors.expense}
              />
            </View>
            <View style={styles.chartCard}>
              <CalendarGrid
                month={monthKey}
                data={expenseFlow}
                valueKey="expense"
                valueColor={colors.expense}
              />
            </View>
          </>
        );
      }

      case 'income_flow': {
        const hasFlow = incomeFlow.some((item) => item.income > 0);
        if (!hasFlow) return renderHelpState('income_flow');
        return (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.chartNote}>{activeViewIntro}</Text>
              <FlowLineChart
                data={incomeFlow}
                currencySymbol={currencySymbol}
                valueKey="income"
                lineColor={colors.income}
              />
            </View>
            <View style={styles.chartCard}>
              <CalendarGrid
                month={monthKey}
                data={incomeFlow}
                valueKey="income"
                valueColor={colors.income}
              />
            </View>
          </>
        );
      }

      case 'account_analysis': {
        const hasAccountActivity = accountPeriod.some(
          (item) => item.periodIncome > 0 || item.periodExpense > 0,
        );
        if (!hasAccountActivity) return renderHelpState('account_analysis');
        return (
          <View style={styles.chartCard}>
            <Text style={styles.chartNote}>{activeViewIntro}</Text>
            <AccountAnalysisChart
              data={accountPeriod}
              currencySymbol={currencySymbol}
            />
          </View>
        );
      }

      case 'net_worth':
        return (
          <View style={styles.chartCard}>
            <Text style={styles.chartNote}>{activeViewIntro}</Text>
            <NetWorthChart
              data={netWorthHistory}
              currencySymbol={currencySymbol}
              decimalPlaces={moneyDecimals}
            />
          </View>
        );
    }
  };

  const handlePrev = () => setAnchor((a) => stepAnchor(a, period, -1));
  const handleNext = () => setAnchor((a) => stepAnchor(a, period, 1));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.periodHeaderWrap}>
          <PeriodNavigator
            label={navLabel}
            onPrev={handlePrev}
            onNext={handleNext}
            showFilterIndicator={false}
            compact
            accessory={
              <TimePeriodTrigger
                compact
                period={period}
                onPress={() => setFilterVisible(true)}
              />
            }
          />
        </View>

        <GlassCard style={styles.summaryGlass} intensity={30} border>
          <View style={styles.summaryRow}>
            <View style={styles.summaryColumn}>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryLabel}>In</Text>
                <AmountText
                  cents={summary.totalIncome}
                  currencySymbol={currencySymbol}
                  decimalPlaces={moneyDecimals}
                  tone="income"
                  size="body"
                  style={styles.summaryMetricValue}
                />
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryColumn}>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryLabel}>Out</Text>
                <AmountText
                  cents={summary.totalExpense}
                  currencySymbol={currencySymbol}
                  decimalPlaces={moneyDecimals}
                  signPrefix="-"
                  tone="expense"
                  size="body"
                  style={styles.summaryMetricValue}
                />
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryColumn}>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryLabel}>Net</Text>
                <AmountText
                  cents={summary.net}
                  currencySymbol={currencySymbol}
                  decimalPlaces={moneyDecimals}
                  signPrefix={summary.net >= 0 ? '+' : ''}
                  tone={netTone}
                  size="body"
                  style={styles.summaryMetricValue}
                />
              </View>
            </View>
          </View>
        </GlassCard>

        <View style={styles.bodyContent}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipBar}
          >
            {VIEW_OPTIONS.map((opt) => {
              const isActive = activeView === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  activeOpacity={0.7}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setActiveView(opt.key)}
                >
                  <Icon
                    source={opt.icon as any}
                    size={16}
                    color={isActive ? colors.onPrimary : colors.textSecondary}
                  />
                  <Text
                    variant="labelMedium"
                    style={[
                      styles.chipLabel,
                      isActive && styles.chipLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading || snapshotLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text variant="bodySmall" style={styles.loadingText}>
                {snapshotLoading
                  ? 'Building insights...'
                  : 'Loading analytics...'}
              </Text>
            </View>
          ) : (
            renderActiveView()
          )}
        </View>
      </ScrollView>

      <TimePeriodPicker
        visible={filterVisible}
        onDismiss={() => setFilterVisible(false)}
        selected={period}
        onSelect={(nextPeriod) => {
          setPeriod(nextPeriod);
          setAnchor(new Date());
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 100 },
  periodHeaderWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.cardInset,
    marginBottom: spacing.xs,
  },

  summaryGlass: {
    marginHorizontal: spacing.cardInset,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  summaryColumn: {
    flex: 1,
    minWidth: 0,
  },
  summaryMetric: {
    alignItems: 'center',
    minHeight: 32,
    justifyContent: 'center',
  },
  summaryLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontSize: 9,
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  summaryMetricValue: {
    ...typography.titleSmall,
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    includeFontPadding: false,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  summaryColumnDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  summaryAvgBlock: {
    alignItems: 'center',
    minHeight: 28,
    justifyContent: 'center',
  },
  summaryMetaLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 9,
    letterSpacing: 0.2,
    marginBottom: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  summaryMetaValue: {
    ...typography.labelLarge,
    fontSize: 11,
    lineHeight: 15,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    includeFontPadding: false,
  },
  comparisonStrip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  comparisonLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  comparisonMetrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  comparisonItem: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  comparisonKey: {
    color: colors.textTertiary,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  comparisonValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  analysisHero: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    gap: 8,
  },
  analysisHeroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.capsule,
    backgroundColor: colors.primaryContainer,
  },
  analysisHeroBadgeText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  analysisHeroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  analysisHeroBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  analysisMetricCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 140,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  analysisMetricCardIncome: {
    borderColor: colors.income + '2A',
    backgroundColor: colors.incomeBg,
  },
  analysisMetricCardExpense: {
    borderColor: colors.expense + '2A',
    backgroundColor: colors.expenseBg,
  },
  analysisMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  analysisMetricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisMetricIconIncome: {
    backgroundColor: colors.income + '1A',
  },
  analysisMetricIconExpense: {
    backgroundColor: colors.expense + '1A',
  },
  analysisMetricLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  analysisMetricValue: {
    ...typography.titleSmall,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  analysisMetricFootnote: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  analysisComparisonStack: {
    gap: spacing.sm,
  },
  analysisComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  analysisComparisonLabelBlock: {
    flex: 1,
    gap: 2,
  },
  analysisComparisonLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  analysisComparisonHint: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  analysisComparisonBadge: {
    minWidth: 80,
    borderRadius: radius.capsule,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  analysisComparisonBadgeIncome: {
    backgroundColor: colors.incomeBg,
    borderColor: colors.income + '2A',
  },
  analysisComparisonBadgeExpense: {
    backgroundColor: colors.expenseBg,
    borderColor: colors.expense + '2A',
  },
  analysisComparisonBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  analysisReferenceRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  analysisReferenceItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  analysisReferenceDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  analysisReferenceLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  analysisReferenceValue: {
    ...typography.titleSmall,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },

  bodyContent: {
    paddingHorizontal: spacing.cardInset,
  },
  insightLoadingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.cardInset,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightCardFeatured: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primaryGlow,
    paddingVertical: spacing.md + 2,
  },
  insightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  insightIconWrapFeatured: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  insightContent: {
    flex: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  insightFeaturedLabel: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  insightTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  insightTitleFeatured: {
    fontSize: 16,
    lineHeight: 22,
  },
  insightKind: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.capsule,
    borderWidth: 1,
  },
  insightBody: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  insightBodyFeatured: {
    color: colors.text,
    opacity: 0.86,
    fontSize: 13,
    lineHeight: 20,
  },
  insightTapHint: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginLeft: 'auto',
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionCaption: {
    color: colors.textTertiary,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  inlineInsightsBlock: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  insightTimeline: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
    gap: spacing.sm,
  },
  insightTimelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  insightTimelineRail: {
    width: 18,
    alignItems: 'center',
    paddingTop: 6,
  },
  insightTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surface,
    zIndex: 1,
  },
  insightTimelineLine: {
    flex: 1,
    width: 1,
    marginTop: 4,
    backgroundColor: colors.border,
  },
  insightTimelineCard: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  insightTimelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  insightKindSubtle: {
    paddingVertical: 4,
  },
  insightTimelineTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightTimelineBody: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionIntro: {
    marginBottom: spacing.sm,
  },
  sectionBody: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  budgetCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.cardInset,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  budgetContent: {
    flex: 1,
    gap: 6,
  },
  budgetPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  budgetMeta: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  budgetAmount: {
    fontSize: 11,
    fontWeight: '700',
  },

  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
  },

  chipBar: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.capsule,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.onPrimary,
  },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.cardInset,
    marginBottom: spacing.md,
  },
  chartNote: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },

  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.cardInset,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  breakdownRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catName: {
    fontWeight: '600',
    color: colors.text,
    fontSize: 14,
  },
  breakdownContent: { flex: 1 },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barTrack: {
    flex: 1,
    height: 5,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: 5, borderRadius: 3 },
  pctLabel: {
    color: colors.textSecondary,
    width: 44,
    textAlign: 'right',
    fontSize: 11,
  },

  helpCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  helpIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  helpTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  helpBody: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
  },
});
