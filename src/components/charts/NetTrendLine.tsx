import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, {
  Line,
  Polyline,
  Circle as SvgCircle,
  Text as SvgText,
} from 'react-native-svg';
import type { PeriodTrendPoint } from '../../models/types';
import { colors } from '../../theme';

interface NetTrendLineProps {
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

function NetTrendLine({ data, currencySymbol }: NetTrendLineProps) {
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
  const chartWidth = Math.max(data.length * slotWidth, 320);
  const chartHeight = 170;
  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 16;
  const paddingBottom = 28;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const values = data.map((d) => d.net);
  const yMin = Math.min(...values, 0);
  const yMax = Math.max(...values, 0);
  const yRange = Math.max(yMax - yMin, 1);

  const getY = (val: number) =>
    paddingTop + plotHeight - ((val - yMin) / yRange) * plotHeight;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * plotWidth;
    return { x, y: getY(d.net), val: d.net, label: d.label, start: d.start };
  });

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const yTicks = 4;
  const yLabels: { val: number; y: number }[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const val = yMin + (yRange / yTicks) * i;
    yLabels.push({ val, y: getY(val) });
  }

  const zeroY = getY(0);

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

            <Line
              x1={paddingLeft}
              y1={zeroY}
              x2={chartWidth - paddingRight}
              y2={zeroY}
              stroke={colors.textTertiary}
              strokeWidth={1}
            />

            <Polyline
              points={polyPoints}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {points.map((p, i) => (
              <SvgCircle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3}
                fill={p.val >= 0 ? colors.income : colors.expense}
              />
            ))}

            {points.map((p, i) => (
              <SvgText
                key={`xlabel-${i}`}
                x={p.x}
                y={chartHeight - 6}
                fill={colors.textSecondary}
                fontSize={10}
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            ))}
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

export default React.memo(NetTrendLine);
