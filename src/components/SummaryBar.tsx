import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';

interface SummaryBarProps {
  income: number;
  expense: number;
  balance: number;
  currency?: string;
  currencySymbol?: string;
}

export default function SummaryBar({ income, expense, balance, currency = 'USD', currencySymbol }: SummaryBarProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.item, { backgroundColor: colors.expense + '14' }]}>
        <Text style={styles.label}>EXPENSE</Text>
        <Text style={[styles.amount, { color: colors.expense }]}>{formatMoney(expense, currency, 2, currencySymbol)}</Text>
      </View>
      <View style={[styles.item, { backgroundColor: colors.income + '14' }]}>
        <Text style={styles.label}>INCOME</Text>
        <Text style={[styles.amount, { color: colors.income }]}>{formatMoney(income, currency, 2, currencySymbol)}</Text>
      </View>
      <View style={[styles.item, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={styles.label}>BALANCE</Text>
        <Text style={styles.amount}>{formatMoney(balance, currency, 2, currencySymbol)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  amount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
