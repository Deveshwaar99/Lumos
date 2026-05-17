import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import TransactionList from '../components/TransactionList';
import FilterBar from '../components/FilterBar';
import { colors, spacing } from '../theme';
import { clampMoneyDecimalPlaces } from '../utils/money';
import type { RootStackScreenProps } from '../navigation/types';
import type { TransactionWithSplits } from '../models/types';

export default function TransactionsScreen({
  navigation,
}: {
  navigation: any;
}) {
  const {
    transactions,
    filter,
    loading,
    hasMore,
    totalCount,
    loadTransactions,
    setFilter,
    loadMore,
  } = useTransactionStore();
  const { categories, loadCategories } = useCategoryStore();
  const { accounts, loadAccounts } = useAccountStore();
  const { settings } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const moneyDecimals = clampMoneyDecimalPlaces(settings.decimalPlaces);

  useEffect(() => {
    loadCategories();
    loadAccounts();
    loadTransactions(true);
  }, []);

  const handleItemPress = useCallback(
    (txn: TransactionWithSplits) => {
      navigation.navigate('TransactionDetail', { transactionId: txn.id });
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Transactions
        </Text>
        <Text variant="bodySmall" style={styles.count}>
          {totalCount} total
        </Text>
      </View>
      <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        categories={categories}
        accounts={accounts}
      />
      <TransactionList
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        loading={loading}
        hasMore={hasMore}
        currencySymbol={settings.currencySymbol}
        decimalPlaces={moneyDecimals}
        onLoadMore={loadMore}
        onRefresh={() => loadTransactions(true)}
        onItemPress={handleItemPress}
        contentContainerStyle={styles.listContent}
      />
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => navigation.navigate('AddTransaction')}
        color={colors.onPrimary}
        accessibilityLabel="Add transaction"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: 0,
  },
  title: { color: colors.text },
  count: { color: colors.textSecondary },
  listContent: { paddingBottom: 100 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: colors.primary,
  },
});
