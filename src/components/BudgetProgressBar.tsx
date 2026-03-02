import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';

interface BudgetProgressBarProps {
  spent: number;
  limit: number;
  alertThreshold: number;
  currency?: string;
  currencySymbol?: string;
  showLabels?: boolean;
}

export default function BudgetProgressBar({
  spent,
  limit,
  alertThreshold,
  currency = 'USD',
  currencySymbol,
  showLabels = true,
}: BudgetProgressBarProps) {
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const progress = Math.min(percentage / 100, 1);

  let color: string = colors.success;
  if (percentage >= 100) color = colors.expense;
  else if (percentage >= alertThreshold) color = colors.warning;

  return (
    <View style={styles.container}>
      <ProgressBar progress={progress} color={color} style={styles.bar} />
      {showLabels && (
        <View style={styles.labels}>
          <Text variant="bodySmall" style={{ color }}>
            {formatMoney(spent, currency, 2, currencySymbol)} of{' '}
            {formatMoney(limit, currency, 2, currencySymbol)}
          </Text>
          <Text variant="bodySmall" style={{ color }}>
            {Math.round(percentage)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 6 },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceVariant },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});
