import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Icon, ActivityIndicator, Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyticsService } from '../services/analyticsService';
import { useSettingsStore } from '../stores/useSettingsStore';
import IncomeExpensePie from '../components/charts/IncomeExpensePie';
import CashFlowLine from '../components/charts/CashFlowLine';
import AccountContributionBar from '../components/charts/AccountContributionBar';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import { getCurrentMonth, getMonthLabel, addMonths } from '../utils/dates';
import type { TabScreenProps } from '../navigation/types';
import type { MonthSummary, CategoryBreakdown, DailyCashFlow, AccountBalance } from '../models/types';

export default function AnalyticsScreen({ navigation }: TabScreenProps<'Analytics'>) {
  const { settings } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<MonthSummary>({ totalIncome: 0, totalExpense: 0, net: 0 });
  const [cashFlow, setCashFlow] = useState<DailyCashFlow[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([]);
  const [overviewExpanded, setOverviewExpanded] = useState(true);

  const currency = settings.baseCurrency;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, cf, ab, eb] = await Promise.all([
        analyticsService.getMonthSummary(month),
        analyticsService.getDailyCashFlow(month),
        analyticsService.getAccountBalances(),
        analyticsService.getCategoryBreakdown(month, 'expense'),
      ]);
      setSummary(s);
      setCashFlow(cf);
      setAccountBalances(ab);
      setExpenseBreakdown(eb.sort((a, b) => b.total - a.total));
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const totalExpenseForBar = expenseBreakdown.reduce((s, c) => s + c.total, 0);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
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
            <Text variant="titleSmall" style={{ color: summary.net >= 0 ? colors.income : colors.expense, fontWeight: '700' }}>
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
            style={styles.overviewToggle}
            onPress={() => setOverviewExpanded(!overviewExpanded)}
            activeOpacity={0.7}
          >
            <Icon
              source={overviewExpanded ? 'chevron-down' : 'chevron-right'}
              size={20}
              color={colors.text}
            />
            <Text variant="titleSmall" style={styles.overviewLabel}>
              EXPENSE OVERVIEW
            </Text>
          </TouchableOpacity>

          {overviewExpanded && (
            <Card style={styles.chartCard}>
              <Card.Content>
                <IncomeExpensePie
                  income={summary.totalIncome}
                  expense={summary.totalExpense}
                  currency={currency}
                />
              </Card.Content>
            </Card>
          )}

          {expenseBreakdown.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No expenses this month
            </Text>
          ) : (
            expenseBreakdown.map((cat) => {
              const pct = totalExpenseForBar > 0 ? (cat.total / totalExpenseForBar) * 100 : 0;
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
                      <Text variant="bodyMedium" style={{ color: colors.expense, fontWeight: '600' }}>
                        -{formatMoney(cat.total, currency)}
                      </Text>
                    </View>
                    <View style={styles.barRow}>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: cat.color }]} />
                      </View>
                      <Text variant="bodySmall" style={styles.pctLabel}>
                        {pct.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <Card style={[styles.chartCard, { marginTop: spacing.lg }]}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.cardTitle}>Daily Cash Flow</Text>
              <CashFlowLine data={cashFlow} currency={currency} />
            </Card.Content>
          </Card>

          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.cardTitle}>Account Balances</Text>
              <AccountContributionBar data={accountBalances} currency={currency} />
            </Card.Content>
          </Card>

          <Button mode="outlined" icon="export" style={styles.exportButton}>
            Export Analytics
          </Button>
        </>
      )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  bodyContent: {
    paddingHorizontal: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  summaryItem: { alignItems: 'flex-start' },
  summaryLabel: { color: colors.textSecondary, marginBottom: 4, letterSpacing: 0.5 },
  overviewToggle: {
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
  overviewLabel: { fontWeight: '700', color: colors.text, letterSpacing: 0.5 },
  chartCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  cardTitle: { marginBottom: spacing.md, color: colors.primary, fontWeight: '700', fontSize: 16 },
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
  exportButton: { marginTop: spacing.md, borderColor: colors.primary },
});
