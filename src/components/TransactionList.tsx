import React, { useCallback, useMemo } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { ActivityIndicator, Divider } from 'react-native-paper';
import TransactionItem from './TransactionItem';
import EmptyState from './EmptyState';
import { colors, spacing } from '../theme';
import type { TransactionWithSplits, Category, Account } from '../models/types';

interface TransactionListProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
  accounts: Account[];
  loading: boolean;
  hasMore: boolean;
  currencySymbol?: string;
  onLoadMore: () => void;
  onRefresh: () => void;
  onItemPress: (transaction: TransactionWithSplits) => void;
  contentContainerStyle?: object;
}

export default function TransactionList({
  transactions,
  categories,
  accounts,
  loading,
  hasMore,
  currencySymbol,
  onLoadMore,
  onRefresh,
  onItemPress,
  contentContainerStyle,
}: TransactionListProps) {
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const renderItem = useCallback(
    ({ item }: { item: TransactionWithSplits }) => (
      <TransactionItem
        transaction={item}
        category={categoryMap[item.categoryId]}
        accountMap={accountMap}
        currencySymbol={currencySymbol}
        onPress={() => onItemPress(item)}
      />
    ),
    [categoryMap, accountMap, onItemPress],
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (transactions.length === 0 && !loading) {
    return (
      <EmptyState
        icon="swap-horizontal"
        title="No Transactions"
        subtitle="Add your first transaction"
      />
    );
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ItemSeparatorComponent={Divider}
      onEndReached={() => {
        if (hasMore && !loading) onLoadMore();
      }}
      onEndReachedThreshold={0.3}
      refreshing={loading}
      onRefresh={onRefresh}
      ListFooterComponent={renderFooter}
      contentContainerStyle={contentContainerStyle}
    />
  );
}

const styles = StyleSheet.create({
  footer: { padding: spacing.lg, alignItems: 'center' },
});
