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
        <Text style={styles.label}>EXPENSE</Text>
        <Text style={[styles.amount, { color: colors.expense }]}>{formatMoney(expense, currency)}</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>INCOME</Text>
        <Text style={styles.amount}>{formatMoney(income, currency)}</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>BALANCE</Text>
        <Text style={styles.amount}>{formatMoney(balance, currency)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
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
    fontWeight: '500',
  },
});
