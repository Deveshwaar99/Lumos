import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Polyline, Line } from 'react-native-svg';
import { colors } from '../../theme';
import { formatMoney } from '../../utils/money';
import type { DailyCashFlow } from '../../models/types';

interface CashFlowLineProps {
  data: DailyCashFlow[];
  currencySymbol?: string;
}

export default function CashFlowLine({
  data,
  currencySymbol,
}: CashFlowLineProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>
          No data for this month
        </Text>
      </View>
    );
  }

  const values = data.map((d) => d.net);
  const maxVal = Math.max(...values.map(Math.abs), 1);
  const chartWidth = Math.max(data.length * 20, 300);
  const chartHeight = 160;
  const padding = 20;

  const points = data
    .map((d, i) => {
      const x =
        padding +
        (i / Math.max(data.length - 1, 1)) * (chartWidth - 2 * padding);
      const y =
        chartHeight / 2 - (d.net / maxVal) * (chartHeight / 2 - padding);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={chartWidth} height={chartHeight}>
          <Line
            x1={padding}
            y1={chartHeight / 2}
            x2={chartWidth - padding}
            y2={chartHeight / 2}
            stroke={colors.border}
            strokeWidth={1}
          />
          <Polyline
            points={points}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
          />
        </Svg>
      </ScrollView>
      <View style={styles.summary}>
        <Text variant="bodySmall" style={styles.summaryText}>
          Best day:{' '}
          {formatMoney(Math.max(...values), currencySymbol)}
        </Text>
        <Text variant="bodySmall" style={styles.summaryText}>
          Worst day:{' '}
          {formatMoney(Math.min(...values), currencySymbol)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 8 },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 40 },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  summaryText: { color: colors.textSecondary },
});
