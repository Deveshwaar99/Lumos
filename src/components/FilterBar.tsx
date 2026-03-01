import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Chip, Menu } from 'react-native-paper';
import { colors, spacing, radius } from '../theme';
import type { TransactionFilter, Category, Account } from '../models/types';

interface FilterBarProps {
  filter: TransactionFilter;
  onFilterChange: (filter: Partial<TransactionFilter>) => void;
  categories: Category[];
  accounts: Account[];
}

export default function FilterBar({
  filter,
  onFilterChange,
  categories,
  accounts,
}: FilterBarProps) {
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [periodMenuVisible, setPeriodMenuVisible] = useState(false);

  const typeLabel = filter.type ? (filter.type === 'income' ? 'Income' : 'Expense') : 'All Types';
  const selectedCategory = filter.categoryId ? categories.find((c) => c.id === filter.categoryId) : null;
  const selectedAccount = filter.accountId ? accounts.find((a) => a.id === filter.accountId) : null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Menu
        visible={typeMenuVisible}
        onDismiss={() => setTypeMenuVisible(false)}
        anchor={
          <Chip
            onPress={() => setTypeMenuVisible(true)}
            selected={!!filter.type}
            style={styles.chip}
            icon="filter-variant"
          >
            {typeLabel}
          </Chip>
        }
      >
        <Menu.Item
          onPress={() => {
            onFilterChange({ type: null });
            setTypeMenuVisible(false);
          }}
          title="All Types"
        />
        <Menu.Item
          onPress={() => {
            onFilterChange({ type: 'income' });
            setTypeMenuVisible(false);
          }}
          title="Income"
        />
        <Menu.Item
          onPress={() => {
            onFilterChange({ type: 'expense' });
            setTypeMenuVisible(false);
          }}
          title="Expense"
        />
      </Menu>

      <Menu
        visible={periodMenuVisible}
        onDismiss={() => setPeriodMenuVisible(false)}
        anchor={
          <Chip
            onPress={() => setPeriodMenuVisible(true)}
            style={styles.chip}
            icon="calendar"
          >
            {filter.dateFrom ? 'Filtered' : 'All Time'}
          </Chip>
        }
      >
        <Menu.Item
          onPress={() => {
            onFilterChange({ dateFrom: null, dateTo: null });
            setPeriodMenuVisible(false);
          }}
          title="All Time"
        />
        <Menu.Item
          onPress={() => {
            const today = new Date().toISOString().split('T')[0];
            onFilterChange({ dateFrom: today, dateTo: today });
            setPeriodMenuVisible(false);
          }}
          title="Today"
        />
        <Menu.Item
          onPress={() => {
            const now = new Date();
            const start = new Date(now);
            start.setDate(now.getDate() - 7);
            onFilterChange({
              dateFrom: start.toISOString().split('T')[0],
              dateTo: now.toISOString().split('T')[0],
            });
            setPeriodMenuVisible(false);
          }}
          title="This Week"
        />
        <Menu.Item
          onPress={() => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            onFilterChange({
              dateFrom: start.toISOString().split('T')[0],
              dateTo: now.toISOString().split('T')[0],
            });
            setPeriodMenuVisible(false);
          }}
          title="This Month"
        />
      </Menu>

      {selectedCategory && (
        <Chip onClose={() => onFilterChange({ categoryId: null })} style={styles.chip}>
          {selectedCategory.name}
        </Chip>
      )}

      {selectedAccount && (
        <Chip onClose={() => onFilterChange({ accountId: null })} style={styles.chip}>
          {selectedAccount.name}
        </Chip>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: 50 },
  content: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  chip: { marginRight: 4 },
});
