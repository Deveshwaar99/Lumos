import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../../theme';
import { formatMoney } from '../../utils/money';

interface IncomeExpensePieProps {
  income: number;
  expense: number;
  currency?: string;
  currencySymbol?: string;
}

export default function IncomeExpensePie({
  income,
  expense,
  currency = 'USD',
  currencySymbol,
}: IncomeExpensePieProps) {
  const total = income + expense;
  if (total === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>
          No data for this month
        </Text>
      </View>
    );
  }

  const incomeRatio = income / total;
  const size = 200;
  const radius = 80;
  const strokeWidth = 30;
  const circumference = 2 * Math.PI * radius;
  const incomeArc = circumference * incomeRatio;
  const expenseArc = circumference * (1 - incomeRatio);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G transform={`rotate(-90 ${cx} ${cy})`}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={colors.income}
            strokeWidth={strokeWidth}
            strokeDasharray={`${incomeArc} ${circumference}`}
            fill="transparent"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={colors.expense}
            strokeWidth={strokeWidth}
            strokeDasharray={`${expenseArc} ${circumference}`}
            strokeDashoffset={-incomeArc}
            fill="transparent"
          />
        </G>
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.income }]} />
          <Text variant="bodySmall">
            Income: {formatMoney(income, currency, 2, currencySymbol)}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.expense }]} />
          <Text variant="bodySmall">
            Expense: {formatMoney(expense, currency, 2, currencySymbol)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 16 },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 40 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
