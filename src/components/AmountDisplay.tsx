import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../theme';

interface AmountDisplayProps {
  expression: string;
  currencySymbol: string;
  type: 'income' | 'expense';
}

export default function AmountDisplay({ expression, currencySymbol, type }: AmountDisplayProps) {
  const displayColor = type === 'income' ? colors.income : colors.expense;

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={[styles.amount, { color: displayColor }]}>
        {currencySymbol} {expression || '0'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'flex-end',
    minHeight: 72,
    justifyContent: 'center',
  },
  amount: {
    fontWeight: '700',
    fontSize: 42,
    letterSpacing: 0.5,
  },
});
