import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import type { PeriodTrendPoint } from '../../models/types';
import { colors, radius } from '../../theme';

interface IncomeExpenseTrendChartProps {
  data: PeriodTrendPoint[];
  currencySymbol?: string;
}

function formatCompactY(val: number, currencySymbol?: string): string {
  const abs = Math.abs(val) / 100;
  const sign = val < 0 ? '-' : '';
  const sym = currencySymbol || '';
  if (abs === 0) return `${sym}0`;
  if (abs >= 100000) return `${sign}${sym}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}${sym}${(abs / 1000).toFixed(1)}K`;
  return `${sign}${sym}${abs.toFixed(0)}`;
}

function IncomeExpenseTrendChart({
  data,
  currencySymbol,
}: IncomeExpenseTrendChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>
          No data for this range
        </Text>
      </View>
    );
  }

  const slotWidth = 48;
  const barWidth = 16;
  const barGap = 4;
  const chartHeight = 190;
  const paddingTop = 16;
  const paddingBottom = 28;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const chartWidth = Math.max(data.length * slotWidth, 320);

  const yMax = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);

  const getBarHeight = (val: number) => (val / yMax) * plotHeight;
  const baselineY = paddingTop + plotHeight;

  const yTicks = 4;
  const yLabels: { val: number; y: number }[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const val = (yMax / yTicks) * i;
    const y = baselineY - (val / yMax) * plotHeight;
    yLabels.push({ val, y });
  }

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.income }]} />
          <Text variant="labelSmall" style={styles.legendText}>
            Income
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.expense }]} />
          <Text variant="labelSmall" style={styles.legendText}>
            Expense
          </Text>
        </View>
      </View>

      <View style={styles.container}>
        <View style={styles.yAxisLabels}>
          {[...yLabels].reverse().map((label, i) => (
            <Text key={i} variant="labelSmall" style={styles.yLabel}>
              {formatCompactY(label.val, currencySymbol)}
            </Text>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollWrap}
        >
          <View>
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

              {data.map((d, i) => {
                const slotCenter = i * slotWidth + slotWidth / 2;
                const incomeHeight = getBarHeight(d.income);
                const expenseHeight = getBarHeight(d.expense);
                const incomeX = slotCenter - barWidth - barGap / 2;
                const expenseX = slotCenter + barGap / 2;
                return (
                  <React.Fragment key={d.start}>
                    {d.income > 0 ? (
                      <Rect
                        x={incomeX}
                        y={baselineY - incomeHeight}
                        width={barWidth}
                        height={incomeHeight}
                        rx={2}
                        fill={colors.income}
                      />
                    ) : null}
                    {d.expense > 0 ? (
                      <Rect
                        x={expenseX}
                        y={baselineY - expenseHeight}
                        width={barWidth}
                        height={expenseHeight}
                        rx={2}
                        fill={colors.expense}
                      />
                    ) : null}
                    <SvgText
                      x={slotCenter}
                      y={chartHeight - 6}
                      fill={colors.textSecondary}
                      fontSize={10}
                      textAnchor="middle"
                    >
                      {d.label}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  empty: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 40,
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    color: colors.textSecondary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.capsule,
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 28,
    paddingRight: 6,
    width: 52,
  },
  yLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    textAlign: 'right',
  },
  scrollWrap: {
    flex: 1,
  },
});

export default React.memo(IncomeExpenseTrendChart);
