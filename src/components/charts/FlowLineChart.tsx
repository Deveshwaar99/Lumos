import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Polyline, Line, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme';
import { formatMoney } from '../../utils/money';
import type { DailyCashFlow } from '../../models/types';

interface FlowLineChartProps {
  data: DailyCashFlow[];
  currency: string;
  valueKey: 'income' | 'expense' | 'net';
  lineColor: string;
}

export default function FlowLineChart({ data, currency, valueKey, lineColor }: FlowLineChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>No data for this month</Text>
      </View>
    );
  }

  const values = data.map((d) => {
    if (valueKey === 'expense') return -d.expense;
    return d[valueKey];
  });

  const maxVal = Math.max(...values.map(Math.abs), 1);

  const chartWidth = Math.max(data.length * 14, 360);
  const chartHeight = 200;
  const paddingLeft = 10;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 30;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const yMin = Math.min(...values, 0);
  const yMax = Math.max(...values, 0);
  const yRange = Math.max(yMax - yMin, 1);

  const getY = (val: number) => {
    return paddingTop + plotHeight - ((val - yMin) / yRange) * plotHeight;
  };

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * plotWidth;
    const val = valueKey === 'expense' ? -d.expense : d[valueKey];
    const y = getY(val);
    return { x, y, val };
  });

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const yTicks = 4;
  const yLabels: { val: number; y: number }[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const val = yMin + (yRange / yTicks) * i;
    yLabels.push({ val, y: getY(val) });
  }

  const xLabelIndices = [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((3 * data.length) / 4), data.length - 1];

  const formatYLabel = (val: number) => {
    const abs = Math.abs(val);
    if (abs === 0) return formatMoney(0, currency);
    return formatMoney(val, currency);
  };

  return (
    <View style={styles.container}>
      <View style={styles.yAxisLabels}>
        {yLabels.reverse().map((label, i) => (
          <Text key={i} variant="labelSmall" style={styles.yLabel}>
            {formatYLabel(label.val)}
          </Text>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollWrap}>
        <View>
          <Svg width={chartWidth} height={chartHeight}>
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

            <Polyline
              points={polyPoints}
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
            />

            {points.filter((p) => p.val !== 0).map((p, i) => (
              <SvgCircle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3}
                fill={lineColor}
              />
            ))}

            {xLabelIndices.map((idx) => {
              if (idx >= data.length) return null;
              const x = paddingLeft + (idx / Math.max(data.length - 1, 1)) * plotWidth;
              const day = data[idx].date.split('-');
              const label = `${day[1]}/${day[2]}`;
              return (
                <SvgText
                  key={`xlabel-${idx}`}
                  x={x}
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
  );
}

const styles = StyleSheet.create({
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
