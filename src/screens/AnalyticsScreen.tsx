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
  const [topCategories, setTopCategories] = useState<CategoryBreakdown[]>([]);

  const currency = settings.baseCurrency;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, cf, ab, tc] = await Promise.all([
        analyticsService.getMonthSummary(month),
        analyticsService.getDailyCashFlow(month),
        analyticsService.getAccountBalances(),
        analyticsService.getTopExpenseCategories(month, 5),
      ]);
      setSummary(s);
      setCashFlow(cf);
      setAccountBalances(ab);
      setTopCategories(tc);
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => setMonth(addMonths(month, -1))}>
          <Icon source="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text variant="titleMedium">{getMonthLabel(month)}</Text>
        <TouchableOpacity onPress={() => setMonth(addMonths(month, 1))}>
          <Icon source="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.cardTitle}>
                Monthly Summary
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text variant="bodySmall" style={styles.summaryLabel}>
                    Income
                  </Text>
                  <Text variant="titleMedium" style={{ color: colors.income }}>
                    {formatMoney(summary.totalIncome, currency)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text variant="bodySmall" style={styles.summaryLabel}>
                    Expense
                  </Text>
                  <Text variant="titleMedium" style={{ color: colors.expense }}>
                    {formatMoney(summary.totalExpense, currency)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text variant="bodySmall" style={styles.summaryLabel}>
                    Net
                  </Text>
                  <Text
                    variant="titleMedium"
                    style={{ color: summary.net >= 0 ? colors.income : colors.expense }}
                  >
                    {formatMoney(summary.net, currency)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.cardTitle}>
                Income vs Expense
              </Text>
              <IncomeExpensePie
                income={summary.totalIncome}
                expense={summary.totalExpense}
                currency={currency}
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.cardTitle}>
                Daily Cash Flow
              </Text>
              <CashFlowLine data={cashFlow} currency={currency} />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.cardTitle}>
                Account Balances
              </Text>
              <AccountContributionBar data={accountBalances} currency={currency} />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.cardTitle}>
                Top 5 Expense Categories
              </Text>
              {topCategories.length === 0 ? (
                <Text variant="bodyMedium" style={styles.emptyText}>
                  No expenses this month
                </Text>
              ) : (
                topCategories.map((cat, i) => (
                  <View key={cat.categoryId} style={styles.topCatRow}>
                    <View style={styles.topCatLeft}>
                      <Text variant="bodyMedium" style={styles.rank}>
                        #{i + 1}
                      </Text>
                      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      <Text variant="bodyMedium">{cat.categoryName}</Text>
                    </View>
                    <Text variant="bodyMedium" style={{ color: colors.expense }}>
                      {formatMoney(cat.total, currency)}
                    </Text>
                  </View>
                ))
              )}
            </Card.Content>
          </Card>

          <Button mode="outlined" icon="export" style={styles.exportButton}>
            Export Analytics
          </Button>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 100 },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  card: { marginBottom: spacing.lg, backgroundColor: colors.surface, borderRadius: 16 },
  cardTitle: { marginBottom: spacing.md, color: colors.primary, fontWeight: '700', fontSize: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.sm },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: colors.textSecondary, marginBottom: 6 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg },
  topCatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  topCatLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { color: colors.textSecondary, width: 24 },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  exportButton: { marginTop: spacing.md, borderColor: colors.primary },
});
