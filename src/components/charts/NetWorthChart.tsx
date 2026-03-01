import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
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
import { colors, spacing, radius } from '../../theme';
import { formatMoney } from '../../utils/money';
import type { NetWorthPoint } from '../../models/types';

interface NetWorthChartProps {
  data: NetWorthPoint[];
  currency: string;
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

export default function NetWorthChart({ data, currency, currencySymbol }: NetWorthChartProps) {
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
  const changePct = prevNetWorth !== 0 ? ((change / Math.abs(prevNetWorth)) * 100).toFixed(1) : '0';

  const chartWidth = Math.max(data.length * 50, 320);
  const chartHeight = 190;
  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 16;
  const paddingBottom = 28;
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
      {/* Summary header */}
      <View style={styles.summarySection}>
        <View style={styles.summaryMain}>
          <Text variant="labelSmall" style={styles.summaryLabel}>Current Net Worth</Text>
          <Text
            variant="headlineSmall"
            style={[styles.summaryValue, { color: currentNetWorth >= 0 ? colors.income : colors.expense }]}
          >
            {formatMoney(currentNetWorth, currency, 0, currencySymbol)}
          </Text>
        </View>
        <View style={[styles.changeBadge, { backgroundColor: (changePositive ? colors.income : colors.expense) + '14' }]}>
          <Icon
            source={changePositive ? 'trending-up' : 'trending-down'}
            size={16}
            color={changePositive ? colors.income : colors.expense}
          />
          <View>
            <Text style={[styles.changeText, { color: changePositive ? colors.income : colors.expense }]}>
              {changePositive ? '+' : ''}{formatMoney(change, currency, 0, currencySymbol)}
            </Text>
            <Text style={[styles.changeSubtext, { color: changePositive ? colors.income : colors.expense }]}>
              {changePositive ? '+' : ''}{changePct}% vs prev
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Chart */}
      <View style={styles.container}>
        <View style={styles.yAxisLabels}>
          {[...yLabels].reverse().map((label, i) => (
            <Text key={i} variant="labelSmall" style={styles.yLabel}>
              {formatCompactY(label.val, currencySymbol)}
            </Text>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollWrap}>
          <View>
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <LinearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={lineColor} stopOpacity="0.2" />
                  <Stop offset="1" stopColor={lineColor} stopOpacity="0.01" />
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
                  strokeWidth={i === points.length - 1 ? 0 : 1.5}
                />
              ))}

              {points.map((p, idx) => {
                const parts = p.month.split('-');
                const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const label = monthNames[parseInt(parts[1], 10)] || parts[1];
                const show = data.length <= 6 || idx % Math.ceil(data.length / 6) === 0 || idx === data.length - 1;
                if (!show) return null;
                return (
                  <SvgText
                    key={`xlabel-${idx}`}
                    x={p.x}
                    y={chartHeight - 6}
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
  wrapper: {},
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryMain: {},
  summaryLabel: {
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 4,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontWeight: '800',
    fontSize: 22,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  changeSubtext: {
    fontSize: 9,
    fontWeight: '500',
    opacity: 0.7,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  container: {
    flexDirection: 'row',
  },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 40, flex: 1 },
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
