import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { analyticsService } from '../services/analyticsService';
import { useSettingsStore } from '../stores/useSettingsStore';
import PeriodNavigator from '../components/PeriodNavigator';
import TimePeriodPicker from '../components/TimePeriodPicker';
import CategoryDonutChart from '../components/charts/CategoryDonutChart';
import FlowLineChart from '../components/charts/FlowLineChart';
import CalendarGrid from '../components/charts/CalendarGrid';
import AccountAnalysisChart from '../components/charts/AccountAnalysisChart';
import NetWorthChart from '../components/charts/NetWorthChart';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import {
  getTimePeriodRange,
  getTimePeriodLabel,
  stepAnchor,
  type TimePeriod,
} from '../utils/dates';
import type { TabScreenProps } from '../navigation/types';
import type {
  MonthSummary,
  CategoryBreakdown,
  DailyCashFlow,
  AccountPeriodBalance,
  NetWorthPoint,
} from '../models/types';

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

  const currency = settings.baseCurrency;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, eb, ib, ef, inf, ap, nw] = await Promise.all([
        analyticsService.getSummaryForRange(range.start, range.end),
        analyticsService.getCategoryBreakdownForRange(
          range.start,
          range.end,
          'expense',
        ),
        analyticsService.getCategoryBreakdownForRange(
          range.start,
          range.end,
          'income',
        ),
        analyticsService.getDailyExpenseFlowForRange(range.start, range.end),
        analyticsService.getDailyIncomeFlowForRange(range.start, range.end),
        analyticsService.getAccountPeriodBalancesForRange(
          range.start,
          range.end,
        ),
        analyticsService.getNetWorthHistory(monthKey, 12),
      ]);
      setSummary(s);
      setExpenseBreakdown(eb.sort((a, b) => b.total - a.total));
      setIncomeBreakdown(ib.sort((a, b) => b.total - a.total));
      setExpenseFlow(ef);
      setIncomeFlow(inf);
      setAccountPeriod(ap);
      setNetWorthHistory(nw);
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end, monthKey]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

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
            <View
              key={cat.categoryId}
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
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: isExpense ? colors.expense : colors.income,
                      fontWeight: '700',
                      fontSize: 13,
                    }}
                  >
                    {isExpense ? '-' : ''}
                    {formatMoney(
                      cat.total,
                      currency,
                      2,
                      settings.currencySymbol,
                    )}
                  </Text>
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
            </View>
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
                currency={currency}
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
                currency={currency}
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
              currency={currency}
              currencySymbol={settings.currencySymbol}
            />
          </View>
        );

      case 'net_worth':
        return (
          <View style={styles.chartCard}>
            <NetWorthChart
              data={netWorthHistory}
              currency={currency}
              currencySymbol={settings.currencySymbol}
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
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.income }]}>
              {formatMoney(
                summary.totalIncome,
                currency,
                0,
                settings.currencySymbol,
              )}
            </Text>
            <Text style={styles.summaryLabel}>Income</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              {formatMoney(
                summary.totalExpense,
                currency,
                0,
                settings.currencySymbol,
              )}
            </Text>
            <Text style={styles.summaryLabel}>Spent</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryValue,
                { color: summary.net >= 0 ? colors.income : colors.expense },
              ]}
            >
              {summary.net >= 0 ? '+' : ''}
              {formatMoney(summary.net, currency, 0, settings.currencySymbol)}
            </Text>
            <Text style={styles.summaryLabel}>Net</Text>
          </View>
        </View>

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
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setActiveView(opt.key)}
                  activeOpacity={0.7}
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

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.cardInset,
    borderRadius: radius.lg,
    paddingVertical: 10,
    marginBottom: spacing.md,
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
