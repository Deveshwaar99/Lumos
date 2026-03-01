import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyticsService } from '../services/analyticsService';
import { useSettingsStore } from '../stores/useSettingsStore';
import CategoryDonutChart from '../components/charts/CategoryDonutChart';
import FlowLineChart from '../components/charts/FlowLineChart';
import CalendarGrid from '../components/charts/CalendarGrid';
import AccountAnalysisChart from '../components/charts/AccountAnalysisChart';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import { getCurrentMonth, getMonthLabel, addMonths } from '../utils/dates';
import type { TabScreenProps } from '../navigation/types';
import type {
  MonthSummary,
  CategoryBreakdown,
  DailyCashFlow,
  AccountPeriodBalance,
} from '../models/types';

type AnalysisView =
  | 'expense_overview'
  | 'income_overview'
  | 'expense_flow'
  | 'income_flow'
  | 'account_analysis';

const VIEW_LABELS: Record<AnalysisView, string> = {
  expense_overview: 'EXPENSE OVERVIEW',
  income_overview: 'INCOME OVERVIEW',
  expense_flow: 'EXPENSE FLOW',
  income_flow: 'INCOME FLOW',
  account_analysis: 'ACCOUNT ANALYSIS',
};

const VIEW_OPTIONS: { key: AnalysisView; label: string }[] = [
  { key: 'expense_overview', label: 'Expense overview' },
  { key: 'income_overview', label: 'Income overview' },
  { key: 'expense_flow', label: 'Expense flow' },
  { key: 'income_flow', label: 'Income flow' },
  { key: 'account_analysis', label: 'Account analysis' },
];

export default function AnalyticsScreen({ navigation }: TabScreenProps<'Analytics'>) {
  const { settings } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<AnalysisView>('expense_overview');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [summary, setSummary] = useState<MonthSummary>({ totalIncome: 0, totalExpense: 0, net: 0 });
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([]);
  const [incomeBreakdown, setIncomeBreakdown] = useState<CategoryBreakdown[]>([]);
  const [expenseFlow, setExpenseFlow] = useState<DailyCashFlow[]>([]);
  const [incomeFlow, setIncomeFlow] = useState<DailyCashFlow[]>([]);
  const [accountPeriod, setAccountPeriod] = useState<AccountPeriodBalance[]>([]);

  const currency = settings.baseCurrency;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, eb, ib, ef, inf, ap] = await Promise.all([
        analyticsService.getMonthSummary(month),
        analyticsService.getCategoryBreakdown(month, 'expense'),
        analyticsService.getCategoryBreakdown(month, 'income'),
        analyticsService.getDailyExpenseFlow(month),
        analyticsService.getDailyIncomeFlow(month),
        analyticsService.getAccountPeriodBalances(month),
      ]);
      setSummary(s);
      setExpenseBreakdown(eb.sort((a, b) => b.total - a.total));
      setIncomeBreakdown(ib.sort((a, b) => b.total - a.total));
      setExpenseFlow(ef);
      setIncomeFlow(inf);
      setAccountPeriod(ap);
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const totalExpenseForBar = expenseBreakdown.reduce((s, c) => s + c.total, 0);
  const totalIncomeForBar = incomeBreakdown.reduce((s, c) => s + c.total, 0);

  const renderBreakdownList = (data: CategoryBreakdown[], total: number, isExpense: boolean) => {
    if (data.length === 0) {
      return (
        <Text variant="bodyMedium" style={styles.emptyText}>
          No {isExpense ? 'expenses' : 'income'} this month
        </Text>
      );
    }
    return data.map((cat) => {
      const pct = total > 0 ? (cat.total / total) * 100 : 0;
      return (
        <View key={cat.categoryId} style={styles.breakdownRow}>
          <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
            <Icon source={cat.icon as any} size={22} color={cat.color} />
          </View>
          <View style={styles.breakdownContent}>
            <View style={styles.breakdownHeader}>
              <Text variant="bodyLarge" style={{ fontWeight: '600', color: colors.text }}>
                {cat.categoryName}
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: isExpense ? colors.expense : colors.income,
                  fontWeight: '600',
                }}
              >
                {isExpense ? '-' : ''}{formatMoney(cat.total, currency)}
              </Text>
            </View>
            <View style={styles.barRow}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.min(pct, 100)}%`, backgroundColor: cat.color },
                  ]}
                />
              </View>
              <Text variant="bodySmall" style={styles.pctLabel}>
                {pct.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      );
    });
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'expense_overview':
        return (
          <>
            <CategoryDonutChart data={expenseBreakdown} centerLabel="Expenses" />
            {renderBreakdownList(expenseBreakdown, totalExpenseForBar, true)}
          </>
        );

      case 'income_overview':
        return (
          <>
            <CategoryDonutChart data={incomeBreakdown} centerLabel="Incomes" />
            {renderBreakdownList(incomeBreakdown, totalIncomeForBar, false)}
          </>
        );

      case 'expense_flow':
        return (
          <>
            <FlowLineChart
              data={expenseFlow}
              currency={currency}
              valueKey="expense"
              lineColor={colors.expense}
            />
            <CalendarGrid
              month={month}
              data={expenseFlow}
              valueKey="expense"
              valueColor={colors.expense}
            />
          </>
        );

      case 'income_flow':
        return (
          <>
            <FlowLineChart
              data={incomeFlow}
              currency={currency}
              valueKey="income"
              lineColor={colors.income}
            />
            <CalendarGrid
              month={month}
              data={incomeFlow}
              valueKey="income"
              valueColor={colors.income}
            />
          </>
        );

      case 'account_analysis':
        return (
          <AccountAnalysisChart data={accountPeriod} currency={currency} />
        );
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => setMonth(addMonths(month, -1))}>
              <Icon source="chevron-left" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>{getMonthLabel(month)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setMonth(addMonths(month, 1))}>
                <Icon source="chevron-right" size={28} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity>
                <Icon source="filter-variant" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={styles.summaryLabel}>EXPENSE</Text>
              <Text variant="titleSmall" style={{ color: colors.expense, fontWeight: '700' }}>
                {formatMoney(summary.totalExpense, currency)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={styles.summaryLabel}>INCOME</Text>
              <Text variant="titleSmall" style={{ color: colors.income, fontWeight: '700' }}>
                {formatMoney(summary.totalIncome, currency)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={styles.summaryLabel}>BALANCE</Text>
              <Text
                variant="titleSmall"
                style={{ color: summary.net >= 0 ? colors.income : colors.expense, fontWeight: '700' }}
              >
                {formatMoney(summary.net, currency)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bodyContent}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.viewToggle}
                onPress={() => setDropdownOpen(true)}
                activeOpacity={0.7}
              >
                <Icon source="chevron-down" size={20} color={colors.text} />
                <Text variant="titleSmall" style={styles.viewToggleLabel}>
                  {VIEW_LABELS[activeView]}
                </Text>
              </TouchableOpacity>

              {renderActiveView()}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDropdownOpen(false)}>
          <View style={styles.dropdownMenu}>
            {VIEW_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.dropdownItem,
                  activeView === opt.key && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setActiveView(opt.key);
                  setDropdownOpen(false);
                }}
              >
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.dropdownText,
                    activeView === opt.key && styles.dropdownTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 100 },
  headerSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: spacing.lg,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  summaryItem: { alignItems: 'flex-start' },
  summaryLabel: { color: colors.textSecondary, marginBottom: 4, letterSpacing: 0.5 },
  bodyContent: {
    paddingHorizontal: spacing.lg,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.capsule,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    marginBottom: spacing.md,
  },
  viewToggleLabel: { fontWeight: '700', color: colors.text, letterSpacing: 0.5 },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.xs,
    gap: 12,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
    height: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  pctLabel: { color: colors.textSecondary, width: 52, textAlign: 'right' },
  emptyText: { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 8,
    width: 260,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryContainer,
  },
  dropdownText: {
    color: colors.text,
    fontSize: 15,
  },
  dropdownTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
});
