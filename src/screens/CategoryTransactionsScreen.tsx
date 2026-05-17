import React, { useState, useCallback, useMemo } from 'react';
import { View, SectionList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Icon, Divider, FAB } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAccountStore } from '../stores/useAccountStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { transactionService } from '../services/transactionService';
import TransactionItem from '../components/TransactionItem';
import DateHeader from '../components/DateHeader';
import { colors, spacing, radius } from '../theme';
import { clampMoneyDecimalPlaces, formatMoney } from '../utils/money';
import type { RootStackScreenProps } from '../navigation/types';
import type { TransactionWithSplits } from '../models/types';

interface TransactionSection {
  title: string;
  data: TransactionWithSplits[];
}

export default function CategoryTransactionsScreen({
  navigation,
  route,
}: RootStackScreenProps<'CategoryTransactions'>) {
  const { categoryId } = route.params;
  const { accounts } = useAccountStore();
  const { categories } = useCategoryStore();
  const { settings } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const moneyDecimals = clampMoneyDecimalPlaces(settings.decimalPlaces);

  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const category = categories.find((c) => c.id === categoryId);

  const loadData = useCallback(async () => {
    const txns = await transactionService.getAll(
      { dateFrom: null, dateTo: null, type: null, accountId: null, categoryId },
      200,
      0,
    );
    setTransactions(txns);
  }, [categoryId]);

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

  const catColor = category?.color ?? colors.primary;
  const iconBg = category ? category.color + '1A' : colors.primaryContainer;

  const stats = useMemo(() => {
    const count = transactions.length;
    const total = transactions.reduce((s, t) => s + t.totalAmountCents, 0);
    return { count, total };
  }, [transactions]);

  const fmt = (cents: number) =>
    formatMoney(cents, settings.currencySymbol, moneyDecimals);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={[styles.headerIcon, { backgroundColor: iconBg }]}>
          <Icon
            source={(category?.icon as any) ?? 'shape-outline'}
            size={24}
            color={catColor}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {category?.name ?? 'Category'}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.headerTotal}
          >
            {fmt(stats.total)}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {stats.count} txn{stats.count !== 1 ? 's' : ''}
          </Text>
        </View>
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
              No transactions for this category
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

      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => navigation.navigate('AddTransaction', { categoryId })}
        color={colors.onPrimary}
        accessibilityLabel="Add transaction"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  headerTotal: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 1,
  },
  headerBadgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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

  fab: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: colors.primary,
  },
});
