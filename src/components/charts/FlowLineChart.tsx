import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Polyline,
  Stop,
  Circle as SvgCircle,
  Text as SvgText,
} from 'react-native-svg';
import type { DailyCashFlow } from '../../models/types';
import { colors, spacing } from '../../theme';
import { formatMoney } from '../../utils/money';

interface FlowLineChartProps {
  data: DailyCashFlow[];
  currencySymbol?: string;
  valueKey: 'income' | 'expense' | 'net';
  lineColor: string;
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

function FlowLineChart({
  data,
  currencySymbol,
  valueKey,
  lineColor,
}: FlowLineChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>
          No data for this month
        </Text>
      </View>
    );
  }

  const values = data.map((d) => {
    if (valueKey === 'expense') return -d.expense;
    return d[valueKey];
  });

  const chartWidth = Math.max(data.length * 14, 320);
  const chartHeight = 180;
  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 16;
  const paddingBottom = 28;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const yMin = Math.min(...values, 0);
  const yMax = Math.max(...values, 0);
  const yRange = Math.max(yMax - yMin, 1);

  const getY = (val: number) =>
    paddingTop + plotHeight - ((val - yMin) / yRange) * plotHeight;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * plotWidth;
    const val = valueKey === 'expense' ? -d.expense : d[valueKey];
    const y = getY(val);
    return { x, y, val };
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
    const val = yMin + (yRange / yTicks) * i;
    yLabels.push({ val, y: getY(val) });
  }

  const xLabelCount = Math.min(5, data.length);
  const xLabelIndices = [
    ...new Set(
      Array.from({ length: xLabelCount }, (_, i) =>
        Math.round((i / Math.max(xLabelCount - 1, 1)) * (data.length - 1)),
      ),
    ),
  ];

  return (
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
            <Defs>
              <LinearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={lineColor} stopOpacity="0.28" />
                <Stop offset="0.45" stopColor={colors.accent} stopOpacity="0.12" />
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

            <Polygon points={fillPoints} fill="url(#flowGrad)" />

            <Polyline
              points={polyPoints}
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {points
              .filter((p) => p.val !== 0)
              .map((p, i) => (
                <SvgCircle key={i} cx={p.x} cy={p.y} r={2.5} fill={lineColor} />
              ))}

            {xLabelIndices.map((idx) => {
              if (idx >= data.length) return null;
              const x =
                paddingLeft + (idx / Math.max(data.length - 1, 1)) * plotWidth;
              const dayNum = parseInt(data[idx].date.split('-')[2], 10);
              return (
                <SvgText
                  key={`xlabel-${idx}`}
                  x={x}
                  y={chartHeight - 6}
                  fill={colors.textSecondary}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {dayNum}
                </SvgText>
              );
            })}
          </Svg>
        </View>
      </ScrollView>
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

export default React.memo(FlowLineChart);
