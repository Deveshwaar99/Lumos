import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../theme';
import AmountText from './ui/AmountText';
import { GlassCard } from './ui/GlassCard';

interface SummaryBarProps {
  income: number;
  expense: number;
  balance: number;
  currencySymbol?: string;
  decimalPlaces?: number;
}

function SummaryBar({
  income,
  expense,
  balance,
  currencySymbol,
  decimalPlaces,
}: SummaryBarProps) {
  return (
    <View style={styles.container}>
      <GlassCard style={styles.tile} intensity={22} border>
        <View style={styles.item}>
          <Text style={styles.label}>EXPENSE</Text>
          <AmountText
            cents={expense}
            currencySymbol={currencySymbol}
            decimalPlaces={decimalPlaces}
            tone="expense"
            size="title"
          />
        </View>
      </GlassCard>
      <GlassCard style={styles.tile} intensity={22} border>
        <View style={styles.item}>
          <Text style={styles.label}>INCOME</Text>
          <AmountText
            cents={income}
            currencySymbol={currencySymbol}
            decimalPlaces={decimalPlaces}
            tone="income"
            size="title"
          />
        </View>
      </GlassCard>
      <GlassCard style={styles.tile} intensity={22} border>
        <View style={styles.item}>
          <Text style={styles.label}>BALANCE</Text>
          <AmountText
            cents={balance}
            currencySymbol={currencySymbol}
            decimalPlaces={decimalPlaces}
            tone="default"
            size="title"
          />
        </View>
      </GlassCard>
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
  tile: {
    flex: 1,
  },
  item: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
});

export default React.memo(SummaryBar);
