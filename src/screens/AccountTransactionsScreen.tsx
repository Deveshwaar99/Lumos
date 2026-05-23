import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { Divider, Icon, Snackbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateHeader from '../components/DateHeader';
import TransactionItem from '../components/TransactionItem';
import { GlowFAB } from '../components/ui';
import AmountText from '../components/ui/AmountText';
import type { TransactionWithSplits } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';
import { transactionService } from '../services/transactionService';
import { useAccountStore } from '../stores/useAccountStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, radius, spacing } from '../theme';
import { clampMoneyDecimalPlaces } from '../utils/money';

interface TransactionSection {
  title: string;
  data: TransactionWithSplits[];
}

export default function AccountTransactionsScreen({
  navigation,
  route,
}: RootStackScreenProps<'AccountTransactions'>) {
  const { accountId, dateFrom, dateTo } = route.params;
  const { accounts, balances } = useAccountStore();
  const { categories } = useCategoryStore();
  const { settings } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const moneyDecimals = clampMoneyDecimalPlaces(settings.decimalPlaces);

  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const account = accounts.find((a) => a.id === accountId);
  const balance = balances[accountId] ?? account?.openingBalanceCents ?? 0;

  const loadData = useCallback(async () => {
    try {
      const txns = await transactionService.getAll(
        {
          dateFrom: dateFrom ?? null,
          dateTo: dateTo ?? null,
          type: null,
          accountId,
          categoryId: null,
        },
        200,
        0,
      );
      setTransactions(txns);
    } catch {
      setSnackbar('Failed to load transactions');
    }
  }, [accountId, dateFrom, dateTo]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const sections: TransactionSection[] = useMemo(() => {
    const grouped = new Map<string, TransactionWithSplits[]>();
    for (const txn of transactions) {
      const dateKey = txn.date.includes('T')
        ? txn.date.substring(0, 10)
        : txn.date;
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(txn);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, data]) => ({ title: dateKey, data }));
  }, [transactions]);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <Icon
            source={account?.icon ?? 'wallet'}
            size={28}
            color={colors.primary}
          />
        </View>
        <Text style={styles.headerName} numberOfLines={1} ellipsizeMode="tail">
          {account?.name ?? 'Account'}
        </Text>
        <AmountText
          cents={balance}
          currencySymbol={settings.currencySymbol}
          decimalPlaces={moneyDecimals}
          tone={balance < 0 ? 'expense' : 'default'}
          size="hero"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.headerBalance}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <DateHeader dateStr={section.title} />
        )}
        renderItem={({ item, index }) => (
          <>
            {index > 0 && <Divider style={styles.itemDivider} />}
            <TransactionItem
              transaction={item}
              category={
                item.categoryId ? categoryMap[item.categoryId] : undefined
              }
              accountMap={accountMap}
              currencySymbol={settings.currencySymbol}
              decimalPlaces={moneyDecimals}
              onPress={() =>
                navigation.navigate('AddTransaction', {
                  transactionId: item.id,
                })
              }
            />
          </>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon source="receipt" size={48} color={colors.textTertiary} />
            <Text variant="bodyLarge" style={styles.emptyText}>
              No transactions for this account
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        stickySectionHeadersEnabled={false}
      />

      <GlowFAB
        icon="plus"
        bottomInset={insets.bottom + 16}
        onPress={() =>
          navigation.navigate('AddTransaction', {
            accountId,
          })
        }
        accessibilityLabel="Add transaction"
      />

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
        style={{ marginBottom: 72 }}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  headerCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  headerBalance: {
    color: colors.income,
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.xs,
  },

  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionHeaderText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  listContent: { paddingBottom: 100 },
  itemDivider: { backgroundColor: colors.border, marginLeft: 74 },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: { color: colors.textSecondary, marginTop: spacing.lg },
});
