import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FilterBar from '../components/FilterBar';
import TransactionList from '../components/TransactionList';
import { GlassCard, GlowFAB } from '../components/ui';
import type { TransactionWithSplits } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';
import { useAccountStore } from '../stores/useAccountStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { colors, spacing } from '../theme';
import { clampMoneyDecimalPlaces } from '../utils/money';

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
      <GlassCard style={styles.headerCard} intensity={26} border>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Transactions
          </Text>
          <Text variant="bodySmall" style={styles.count}>
            {totalCount} total
          </Text>
        </View>
      </GlassCard>
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
      <GlowFAB
        icon="plus"
        bottomInset={insets.bottom + 16}
        onPress={() => navigation.navigate('AddTransaction')}
        accessibilityLabel="Add transaction"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerCard: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text },
  count: { color: colors.textSecondary },
  listContent: { paddingBottom: 100 },
});
