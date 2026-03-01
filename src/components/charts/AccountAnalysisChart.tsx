import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { colors, spacing, radius } from '../../theme';
import { formatMoney } from '../../utils/money';
import type { AccountPeriodBalance } from '../../models/types';

interface AccountAnalysisChartProps {
  data: AccountPeriodBalance[];
  currency: string;
  currencySymbol?: string;
}

const ACCOUNT_ICONS: Record<string, string> = {
  cash: 'cash',
  bank: 'bank',
  card: 'credit-card',
  savings: 'piggy-bank',
  other: 'wallet',
};

function formatCompactY(val: number, currencySymbol?: string): string {
  const abs = Math.abs(val) / 100;
  const sym = currencySymbol || '';
  if (abs === 0) return `${sym}0`;
  if (abs >= 100000) return `${sym}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sym}${(abs / 1000).toFixed(1)}K`;
  return `${sym}${abs.toFixed(0)}`;
}

export default function AccountAnalysisChart({ data, currency, currencySymbol }: AccountAnalysisChartProps) {
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

  const chartHeight = 180;
  const paddingTop = 16;
  const paddingBottom = 40;
  const paddingLeft = 8;
  const barGroupWidth = 52;
  const barWidth = 14;
  const gap = 4;
  const chartWidth = Math.max(data.length * barGroupWidth + paddingLeft * 2, 280);
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
        <View style={[styles.legendChip, { backgroundColor: colors.expense + '18' }]}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
          <Text variant="labelSmall" style={[styles.legendText, { color: colors.expense }]}>Expense</Text>
        </View>
        <View style={[styles.legendChip, { backgroundColor: colors.income + '18' }]}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <Text variant="labelSmall" style={[styles.legendText, { color: colors.income }]}>Income</Text>
        </View>
      </View>

      <View style={styles.chartRow}>
        <View style={styles.yAxisLabels}>
          {[...yLabels].reverse().map((label, i) => (
            <Text key={i} variant="labelSmall" style={styles.yLabel}>
              {formatCompactY(label.val, currencySymbol)}
            </Text>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollWrap}>
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
                    rx={3}
                  />
                  <Rect
                    x={groupX + gap / 2}
                    y={paddingTop + plotHeight - incomeH}
                    width={barWidth}
                    height={Math.max(incomeH, 1)}
                    fill={colors.income}
                    rx={3}
                  />
                  <SvgText
                    x={groupX}
                    y={chartHeight - 8}
                    fill={colors.textSecondary}
                    fontSize={9}
                    textAnchor="middle"
                  >
                    {item.accountName.length > 7
                      ? item.accountName.slice(0, 7) + '..'
                      : item.accountName}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </ScrollView>
      </View>

      <View style={styles.divider} />

      {data.map((item, idx) => {
        const net = item.periodIncome - item.periodExpense;
        return (
          <View
            key={item.accountId}
            style={[
              styles.accountRow,
              idx < data.length - 1 && styles.accountRowBorder,
            ]}
          >
            <View style={styles.accountIconWrap}>
              <Icon
                source={item.icon || ACCOUNT_ICONS[item.type] || 'wallet'}
                size={20}
                color={colors.text}
              />
            </View>
            <View style={styles.accountInfo}>
              <Text variant="bodyMedium" style={styles.accountName}>{item.accountName}</Text>
              <View style={styles.periodRow}>
                <Text variant="labelSmall" style={{ color: colors.income, fontSize: 11 }}>
                  +{formatMoney(item.periodIncome, currency, 0, currencySymbol)}
                </Text>
                <Text variant="labelSmall" style={{ color: colors.textTertiary, fontSize: 10 }}>/</Text>
                <Text variant="labelSmall" style={{ color: colors.expense, fontSize: 11 }}>
                  -{formatMoney(item.periodExpense, currency, 0, currencySymbol)}
                </Text>
              </View>
            </View>
            <Text
              variant="bodySmall"
              style={{
                color: net >= 0 ? colors.income : colors.expense,
                fontWeight: '700',
                fontSize: 12,
              }}
            >
              {net >= 0 ? '+' : ''}{formatMoney(net, currency, 0, currencySymbol)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 40 },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 11, fontWeight: '600' },
  chartRow: {
    flexDirection: 'row',
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 40,
    paddingRight: 6,
    width: 48,
  },
  yLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    textAlign: 'right',
  },
  scrollWrap: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  accountRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  accountIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: { flex: 1 },
  accountName: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
