import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../theme';
import { formatMoney } from '../utils/money';

interface SummaryBarProps {
  income: number;
  expense: number;
  balance: number;
  currency?: string;
}

export default function SummaryBar({ income, expense, balance, currency = 'USD' }: SummaryBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <Text variant="labelSmall" style={styles.expenseLabel}>
          EXPENSE
        </Text>
        <Text variant="titleMedium" style={styles.expenseAmount}>
          {formatMoney(expense, currency)}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text variant="labelSmall" style={styles.incomeLabel}>
          INCOME
        </Text>
        <Text variant="titleMedium" style={styles.incomeAmount}>
          {formatMoney(income, currency)}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text variant="labelSmall" style={styles.balanceLabel}>
          BALANCE
        </Text>
        <Text
          variant="titleMedium"
          style={[styles.balanceAmount, { color: balance >= 0 ? colors.income : colors.expense }]}
        >
          {formatMoney(balance, currency)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: 16,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  expenseLabel: { color: colors.expense, letterSpacing: 1.2, marginBottom: 6, fontSize: 10 },
  expenseAmount: { color: colors.expense, fontWeight: '700', fontSize: 17 },
  incomeLabel: { color: colors.income, letterSpacing: 1.2, marginBottom: 6, fontSize: 10 },
  incomeAmount: { color: colors.income, fontWeight: '700', fontSize: 17 },
  balanceLabel: { color: colors.textSecondary, letterSpacing: 1.2, marginBottom: 6, fontSize: 10 },
  balanceAmount: { fontWeight: '700', fontSize: 17 },
});
