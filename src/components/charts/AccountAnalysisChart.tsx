import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { colors, spacing, radius } from '../../theme';
import { formatMoney } from '../../utils/money';
import type { AccountPeriodBalance } from '../../models/types';

interface AccountAnalysisChartProps {
  data: AccountPeriodBalance[];
  currency: string;
}

const ACCOUNT_ICONS: Record<string, string> = {
  cash: 'cash',
  bank: 'bank',
  card: 'credit-card',
  savings: 'piggy-bank',
  other: 'wallet',
};

export default function AccountAnalysisChart({ data, currency }: AccountAnalysisChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>No accounts</Text>
      </View>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.periodIncome, d.periodExpense)),
    1
  );

  const chartHeight = 200;
  const paddingTop = 20;
  const paddingBottom = 50;
  const paddingLeft = 10;
  const barGroupWidth = 50;
  const barWidth = 16;
  const gap = 6;
  const chartWidth = Math.max(data.length * barGroupWidth + paddingLeft * 2, 300);
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const yTicks = 4;
  const yLabels: { val: number; y: number }[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const val = (maxVal / yTicks) * i;
    const y = paddingTop + plotHeight - (val / maxVal) * plotHeight;
    yLabels.push({ val, y });
  }

  return (
    <View style={styles.container}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
          <Text variant="labelSmall" style={styles.legendText}>Expense</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <Text variant="labelSmall" style={styles.legendText}>Income</Text>
        </View>
      </View>

      <View style={styles.chartRow}>
        <View style={styles.yAxisLabels}>
          {[...yLabels].reverse().map((label, i) => (
            <Text key={i} variant="labelSmall" style={styles.yLabel}>
              {formatMoney(label.val, currency)}
            </Text>
          ))}
        </View>

        <Svg width={chartWidth} height={chartHeight}>
          {yLabels.map((label, i) => (
            <Line
              key={`grid-${i}`}
              x1={0}
              y1={label.y}
              x2={chartWidth}
              y2={label.y}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
          ))}

          {data.map((item, idx) => {
            const groupX = paddingLeft + idx * barGroupWidth + barGroupWidth / 2;
            const expenseH = (item.periodExpense / maxVal) * plotHeight;
            const incomeH = (item.periodIncome / maxVal) * plotHeight;

            return (
              <React.Fragment key={item.accountId}>
                <Rect
                  x={groupX - barWidth - gap / 2}
                  y={paddingTop + plotHeight - expenseH}
                  width={barWidth}
                  height={Math.max(expenseH, 1)}
                  fill={colors.expense}
                  rx={2}
                />
                <Rect
                  x={groupX + gap / 2}
                  y={paddingTop + plotHeight - incomeH}
                  width={barWidth}
                  height={Math.max(incomeH, 1)}
                  fill={colors.income}
                  rx={2}
                />
                <SvgText
                  x={groupX}
                  y={chartHeight - 10}
                  fill={colors.textSecondary}
                  fontSize={8}
                  textAnchor="middle"
                  transform={`rotate(-45, ${groupX}, ${chartHeight - 10})`}
                >
                  {item.accountName.length > 8
                    ? item.accountName.slice(0, 8) + '..'
                    : item.accountName}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      <View style={styles.accountList}>
        {data.map((item) => (
          <View key={item.accountId} style={styles.accountRow}>
            <View style={styles.accountIconWrap}>
              <Icon
                source={item.icon || ACCOUNT_ICONS[item.type] || 'wallet'}
                size={24}
                color={colors.text}
              />
            </View>
            <View style={styles.accountInfo}>
              <Text variant="bodyLarge" style={styles.accountName}>{item.accountName}</Text>
              <View style={styles.periodRow}>
                <Text variant="labelSmall" style={styles.periodLabel}>This period:</Text>
                <View style={[styles.periodBadge, { borderColor: colors.expense }]}>
                  <Text variant="bodySmall" style={{ color: colors.expense }}>
                    -{formatMoney(item.periodExpense, currency)}
                  </Text>
                </View>
                <View style={[styles.periodBadge, { borderColor: colors.income }]}>
                  <Text variant="bodySmall" style={{ color: colors.income }}>
                    {formatMoney(item.periodIncome, currency)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 40 },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: colors.textSecondary, fontSize: 11 },
  chartRow: {
    flexDirection: 'row',
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 50,
    paddingRight: 4,
    width: 80,
  },
  yLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    textAlign: 'right',
  },
  accountList: {
    marginTop: spacing.md,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    gap: 12,
  },
  accountIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: { flex: 1 },
  accountName: { color: colors.text, fontWeight: '600', marginBottom: 4 },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  periodLabel: { color: colors.textSecondary },
  periodBadge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
