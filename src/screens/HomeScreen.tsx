import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, SectionList, StyleSheet, RefreshControl } from 'react-native';
import { Text, FAB, Icon, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { format, parseISO } from 'date-fns';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { analyticsService } from '../services/analyticsService';
import TransactionItem from '../components/TransactionItem';
import MonthNavigator from '../components/MonthNavigator';
import SummaryBar from '../components/SummaryBar';
import DateHeader from '../components/DateHeader';
import { colors, spacing } from '../theme';
import { getCurrentMonth, getMonthLabel, addMonths, getMonthRange } from '../utils/dates';
import { transactionService } from '../services/transactionService';
import type { TabScreenProps } from '../navigation/types';
import type { TransactionWithSplits, MonthSummary } from '../models/types';

interface TransactionSection {
  title: string;
  data: TransactionWithSplits[];
}

export default function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const { loadCategories, categories } = useCategoryStore();
  const { accounts, loadAccounts } = useAccountStore();
  const { loadBudgets } = useBudgetStore();
  const { settings, loadSettings } = useSettingsStore();
  const insets = useSafeAreaInsets();

  const [month, setMonth] = useState(getCurrentMonth());
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [summary, setSummary] = useState<MonthSummary>({ totalIncome: 0, totalExpense: 0, net: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([loadCategories(), loadAccounts(), loadBudgets(), loadSettings()]);
    const range = getMonthRange(month);
    const [monthTxns, monthSummary] = await Promise.all([
      transactionService.getAll(
        {
          dateFrom: range.start,
          dateTo: range.end,
          type: null,
          accountId: null,
          categoryId: null,
        },
        500,
      ),
      analyticsService.getMonthSummary(month),
    ]);
    setTransactions(monthTxns);
    setSummary(monthSummary);
  }, [month]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePrevMonth = () => setMonth((m) => addMonths(m, -1));
  const handleNextMonth = () => setMonth((m) => addMonths(m, 1));

  const categoryMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);

  const sections: TransactionSection[] = useMemo(() => {
    const grouped = new Map<string, TransactionWithSplits[]>();
    for (const txn of transactions) {
      const dateKey = txn.date.includes('T') ? txn.date.substring(0, 10) : txn.date;
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(txn);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, data]) => ({ title: dateKey, data }));
  }, [transactions]);

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
          <TouchableOpacity hitSlop={12} onPress={() => navigation.navigate('Settings' as any)}>
            <Icon source="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text variant="titleLarge" style={styles.appTitle}>
            {'L'}
            <Text style={styles.appTitleRest}>umos</Text>
          </Text>
          <TouchableOpacity hitSlop={12}>
            <Icon source="magnify" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <MonthNavigator
          label={getMonthLabel(month)}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
        />

        <SummaryBar
          income={summary.totalIncome}
          expense={summary.totalExpense}
          balance={summary.net}
          currency={settings.baseCurrency}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => <DateHeader dateStr={section.title} />}
        renderItem={({ item, index }) => (
          <>
            {index > 0 && <Divider style={styles.itemDivider} />}
            <TransactionItem
              transaction={item}
              category={item.categoryId ? categoryMap[item.categoryId] : undefined}
              accountMap={accountMap}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
            />
          </>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon source="receipt" size={48} color={colors.textTertiary} />
            <Text variant="bodyLarge" style={styles.emptyText}>
              No transactions this month
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        stickySectionHeadersEnabled={false}
        style={styles.list}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 10}]}
        onPress={() => navigation.navigate('AddTransaction')}
        color="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerSection: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.sm,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  appTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: colors.primaryLight,
    letterSpacing: 1.5,
  },
  appTitleRest: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  list: { flex: 1, marginTop: spacing.xs },
  listContent: { paddingBottom: 100 },
  itemDivider: { backgroundColor: colors.border, marginLeft: 76 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: { color: colors.textSecondary, marginTop: spacing.lg },
  fab: { position: 'absolute', right: spacing.lg, backgroundColor: colors.primary },
});
