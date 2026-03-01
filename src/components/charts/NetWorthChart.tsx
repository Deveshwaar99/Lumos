import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, {
  Polyline,
  Line,
  Circle as SvgCircle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Polygon,
} from 'react-native-svg';
import { colors, spacing } from '../../theme';
import { formatMoney } from '../../utils/money';
import type { NetWorthPoint } from '../../models/types';

interface NetWorthChartProps {
  data: NetWorthPoint[];
  currency: string;
}

export default function NetWorthChart({ data, currency }: NetWorthChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>No data available</Text>
      </View>
    );
  }

  const values = data.map((d) => d.netWorth);
  const currentNetWorth = values[values.length - 1];
  const prevNetWorth = values.length > 1 ? values[values.length - 2] : currentNetWorth;
  const change = currentNetWorth - prevNetWorth;
  const changePositive = change >= 0;

  const chartWidth = Math.max(data.length * 50, 360);
  const chartHeight = 220;
  const paddingLeft = 10;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 30;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const yMin = Math.min(...values);
  const yMax = Math.max(...values);
  const yPadding = Math.max((yMax - yMin) * 0.1, 100);
  const yStart = yMin - yPadding;
  const yEnd = yMax + yPadding;
  const yRange = Math.max(yEnd - yStart, 1);

  const getY = (val: number) => paddingTop + plotHeight - ((val - yStart) / yRange) * plotHeight;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * plotWidth;
    const y = getY(d.netWorth);
    return { x, y, val: d.netWorth, month: d.month };
  });

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const fillPoints = [
    `${points[0].x},${chartHeight - paddingBottom}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${chartHeight - paddingBottom}`,
  ].join(' ');

  const yTicks = 4;
  const yLabels: { val: number; y: number }[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const val = yStart + (yRange / yTicks) * i;
    yLabels.push({ val, y: getY(val) });
  }

  const lineColor = currentNetWorth >= 0 ? colors.income : colors.expense;

  return (
    <View style={styles.wrapper}>
      <View style={styles.summaryRow}>
        <View>
          <Text variant="labelSmall" style={styles.summaryLabel}>NET WORTH</Text>
          <Text variant="headlineSmall" style={[styles.summaryValue, { color: currentNetWorth >= 0 ? colors.income : colors.expense }]}>
            {formatMoney(currentNetWorth, currency)}
          </Text>
        </View>
        <View style={[styles.changeBadge, { backgroundColor: (changePositive ? colors.income : colors.expense) + '18' }]}>
          <Text style={[styles.changeText, { color: changePositive ? colors.income : colors.expense }]}>
            {changePositive ? '+' : ''}{formatMoney(change, currency)}
          </Text>
          <Text style={[styles.changeSubtext, { color: changePositive ? colors.income : colors.expense }]}>
            vs last month
          </Text>
        </View>
      </View>

      <View style={styles.container}>
        <View style={styles.yAxisLabels}>
          {[...yLabels].reverse().map((label, i) => (
            <Text key={i} variant="labelSmall" style={styles.yLabel}>
              {formatMoney(label.val, currency)}
            </Text>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollWrap}>
          <View>
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <LinearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={lineColor} stopOpacity="0.25" />
                  <Stop offset="1" stopColor={lineColor} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {yLabels.map((label, i) => (
                <Line
                  key={`grid-${i}`}
                  x1={paddingLeft}
                  y1={label.y}
                  x2={chartWidth - paddingRight}
                  y2={label.y}
                  stroke={colors.border}
                  strokeWidth={0.5}
                  strokeDasharray="4,4"
                />
              ))}

              <Polygon points={fillPoints} fill="url(#netWorthGrad)" />

              <Polyline
                points={polyPoints}
                fill="none"
                stroke={lineColor}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />

              {points.map((p, i) => (
                <SvgCircle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={i === points.length - 1 ? 5 : 3}
                  fill={i === points.length - 1 ? lineColor : colors.surface}
                  stroke={lineColor}
                  strokeWidth={i === points.length - 1 ? 0 : 2}
                />
              ))}

              {points.map((p, idx) => {
                const parts = p.month.split('-');
                const label = `${parts[1]}/${parts[0].slice(2)}`;
                const show = data.length <= 6 || idx % Math.ceil(data.length / 6) === 0 || idx === data.length - 1;
                if (!show) return null;
                return (
                  <SvgText
                    key={`xlabel-${idx}`}
                    x={p.x}
                    y={chartHeight - 5}
                    fill={colors.textSecondary}
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {label}
                  </SvgText>
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
  wrapper: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  summaryLabel: {
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: '800',
  },
  changeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  changeSubtext: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.7,
  },
  container: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 40, flex: 1 },
  yAxisLabels: {
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 30,
    paddingRight: 4,
    width: 90,
  },
  yLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'right',
  },
  scrollWrap: {
    flex: 1,
  },
});
