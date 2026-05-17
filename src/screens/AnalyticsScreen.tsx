import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AccountAnalysisChart from '../components/charts/AccountAnalysisChart';
import CalendarGrid from '../components/charts/CalendarGrid';
import CategoryDonutChart from '../components/charts/CategoryDonutChart';
import FlowLineChart from '../components/charts/FlowLineChart';
import NetWorthChart from '../components/charts/NetWorthChart';
import PeriodNavigator from '../components/PeriodNavigator';
import TimePeriodPicker from '../components/TimePeriodPicker';
import AmountText from '../components/ui/AmountText';
import { GlassCard } from '../components/ui/GlassCard';
import type {
  AccountPeriodBalance,
  CategoryBreakdown,
  DailyCashFlow,
  MonthSummary,
  NetWorthPoint,
} from '../models/types';
import type { TabScreenProps } from '../navigation/types';
import { analyticsService } from '../services/analyticsService';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, radius, spacing } from '../theme';
import {
  getDaysInRange,
  getTimePeriodLabel,
  getTimePeriodRange,
  stepAnchor,
  type TimePeriod,
} from '../utils/dates';
import { clampMoneyDecimalPlaces } from '../utils/money';

type AnalysisView =
  | 'expense_overview'
  | 'income_overview'
  | 'expense_flow'
  | 'income_flow'
  | 'account_analysis'
  | 'net_worth';

const VIEW_OPTIONS: { key: AnalysisView; label: string; icon: string }[] = [
  { key: 'expense_overview', label: 'Expenses', icon: 'chart-donut' },
  { key: 'income_overview', label: 'Income', icon: 'chart-donut' },
  { key: 'expense_flow', label: 'Exp. Flow', icon: 'chart-line' },
  { key: 'income_flow', label: 'Inc. Flow', icon: 'chart-line' },
  { key: 'account_analysis', label: 'Accounts', icon: 'chart-bar' },
  { key: 'net_worth', label: 'Net Worth', icon: 'chart-timeline-variant' },
];

export default function AnalyticsScreen({
  navigation,
}: TabScreenProps<'Analytics'>) {
  const { settings } = useSettingsStore();
  const moneyDecimals = clampMoneyDecimalPlaces(settings.decimalPlaces);
  const insets = useSafeAreaInsets();
  const [anchor, setAnchor] = useState(() => new Date());
  const [period, setPeriod] = useState<TimePeriod>('month');
  const [filterVisible, setFilterVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] =
    useState<AnalysisView>('expense_overview');

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

  const [summary, setSummary] = useState<MonthSummary>({
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
  });
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

  const loadedViewRef = useRef<{
    view: AnalysisView;
    start: string;
    end: string;
  } | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const s = await analyticsService.getSummaryForRange(
        range.start,
        range.end,
      );
      setSummary(s);
    } catch (e) {
      console.error('Analytics summary load error:', e);
    }
  }, [range.start, range.end]);

  const loadViewData = useCallback(
    async (view: AnalysisView) => {
      const cacheKey = { view, start: range.start, end: range.end };
      const prev = loadedViewRef.current;
      if (
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
            const eb = await analyticsService.getCategoryBreakdownForRange(
              range.start,
              range.end,
              'expense',
            );
            setExpenseBreakdown(eb.sort((a, b) => b.total - a.total));
            break;
          }
          case 'income_overview': {
            const ib = await analyticsService.getCategoryBreakdownForRange(
              range.start,
              range.end,
              'income',
            );
            setIncomeBreakdown(ib.sort((a, b) => b.total - a.total));
            break;
          }
          case 'expense_flow': {
            const ef = await analyticsService.getDailyExpenseFlowForRange(
              range.start,
              range.end,
            );
            setExpenseFlow(ef);
            break;
          }
          case 'income_flow': {
            const inf = await analyticsService.getDailyIncomeFlowForRange(
              range.start,
              range.end,
            );
            setIncomeFlow(inf);
            break;
          }
          case 'account_analysis': {
            const ap = await analyticsService.getAccountPeriodBalancesForRange(
              range.start,
              range.end,
            );
            setAccountPeriod(ap);
            break;
          }
          case 'net_worth': {
            const nw = await analyticsService.getNetWorthHistory(monthKey, 12);
            setNetWorthHistory(nw);
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
    [range.start, range.end, monthKey],
  );

  useFocusEffect(
    useCallback(() => {
      loadedViewRef.current = null;
      loadSummary();
      loadViewData(activeView);
    }, [loadSummary, loadViewData, activeView]),
  );

  useEffect(() => {
    loadViewData(activeView);
  }, [activeView, loadViewData]);

  const totalExpenseForBar = expenseBreakdown.reduce((s, c) => s + c.total, 0);
  const totalIncomeForBar = incomeBreakdown.reduce((s, c) => s + c.total, 0);

  const renderBreakdownList = (
    data: CategoryBreakdown[],
    total: number,
    isExpense: boolean,
  ) => {
    if (data.length === 0) {
      return (
        <Text variant="bodyMedium" style={styles.emptyText}>
          No {isExpense ? 'expenses' : 'income'} in this period
        </Text>
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
                    currencySymbol={settings.currencySymbol}
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

  const renderActiveView = () => {
    switch (activeView) {
      case 'expense_overview':
        return (
          <>
            <View style={styles.chartCard}>
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
              <CategoryDonutChart
                data={incomeBreakdown}
                centerLabel="Incomes"
              />
            </View>
            {renderBreakdownList(incomeBreakdown, totalIncomeForBar, false)}
          </>
        );

      case 'expense_flow':
        return (
          <>
            <View style={styles.chartCard}>
              <FlowLineChart
                data={expenseFlow}
                currencySymbol={settings.currencySymbol}
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

      case 'income_flow':
        return (
          <>
            <View style={styles.chartCard}>
              <FlowLineChart
                data={incomeFlow}
                currencySymbol={settings.currencySymbol}
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

      case 'account_analysis':
        return (
          <View style={styles.chartCard}>
            <AccountAnalysisChart
              data={accountPeriod}
              currencySymbol={settings.currencySymbol}
            />
          </View>
        );

      case 'net_worth':
        return (
          <View style={styles.chartCard}>
            <NetWorthChart
              data={netWorthHistory}
              currencySymbol={settings.currencySymbol}
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
        <PeriodNavigator
          label={navLabel}
          onPrev={handlePrev}
          onNext={handleNext}
          onFilterPress={() => setFilterVisible(true)}
        />

        {/* Summary figures */}
        <GlassCard style={styles.summaryGlass} intensity={30} border>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <AmountText
                cents={summary.totalIncome}
                currencySymbol={settings.currencySymbol}
                decimalPlaces={moneyDecimals}
                tone="income"
                size="body"
                style={styles.summaryValue}
              />
              <Text style={styles.summaryLabel}>Income</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AmountText
                cents={summary.totalExpense}
                currencySymbol={settings.currencySymbol}
                decimalPlaces={moneyDecimals}
                signPrefix="-"
                tone="expense"
                size="body"
                style={styles.summaryValue}
              />
              <Text style={styles.summaryLabel}>Spent</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AmountText
                cents={summary.net}
                currencySymbol={settings.currencySymbol}
                decimalPlaces={moneyDecimals}
                signPrefix={summary.net >= 0 ? '+' : ''}
                tone={summary.net >= 0 ? 'income' : 'expense'}
                size="body"
                style={styles.summaryValue}
              />
              <Text style={styles.summaryLabel}>Net</Text>
            </View>
          </View>
          <View style={styles.summaryFooter}>
            <View style={styles.summaryFooterItem}>
              <Text style={styles.summaryFooterLabel}>Daily Avg In</Text>
              <AmountText
                cents={avgIncomePerDay}
                currencySymbol={settings.currencySymbol}
                decimalPlaces={moneyDecimals}
                tone="income"
                size="body"
                style={styles.summaryFooterValue}
              />
            </View>
            <View style={styles.summaryFooterDivider} />
            <View style={styles.summaryFooterItem}>
              <Text style={styles.summaryFooterLabel}>Daily Avg Out</Text>
              <AmountText
                cents={avgExpensePerDay}
                currencySymbol={settings.currencySymbol}
                decimalPlaces={moneyDecimals}
                tone="expense"
                size="body"
                style={styles.summaryFooterValue}
              />
            </View>
            <View style={styles.summaryFooterDivider} />
            <View style={styles.summaryFooterItem}>
              <Text style={styles.summaryFooterLabel}>Daily Avg Net</Text>
              <AmountText
                cents={avgNetPerDay}
                currencySymbol={settings.currencySymbol}
                decimalPlaces={moneyDecimals}
                signPrefix={avgNetPerDay >= 0 ? '+' : ''}
                tone={avgNetPerDay >= 0 ? 'income' : 'expense'}
                size="body"
                style={styles.summaryFooterValue}
              />
            </View>
          </View>
        </GlassCard>

        {/* View selector + chart body */}
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

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text variant="bodySmall" style={styles.loadingText}>
                Loading analytics...
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
        onSelect={(p) => {
          setPeriod(p);
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

  summaryGlass: {
    marginHorizontal: spacing.cardInset,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontWeight: '800',
    fontSize: 14,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
  },
  summaryFooterItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryFooterLabel: {
    color: colors.textTertiary,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.25,
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryFooterValue: {
    fontWeight: '700',
    fontSize: 11,
  },
  summaryFooterDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },

  bodyContent: {
    paddingHorizontal: spacing.cardInset,
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
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
});
