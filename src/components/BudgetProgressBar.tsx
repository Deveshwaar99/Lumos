import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';
import { colors, radius, spacing } from '../theme';
import { formatMoney } from '../utils/money';

interface BudgetProgressBarProps {
  spent: number;
  limit: number;
  alertThreshold: number;
  currencySymbol?: string;
  decimalPlaces?: number;
  showLabels?: boolean;
}

function BudgetProgressBar({
  spent,
  limit,
  alertThreshold,
  currencySymbol,
  decimalPlaces,
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
          <Text numberOfLines={1} variant="bodySmall" style={{ color }}>
            {formatMoney(spent, currencySymbol, decimalPlaces)} of{' '}
            {formatMoney(limit, currencySymbol, decimalPlaces)}
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

export default React.memo(BudgetProgressBar);
