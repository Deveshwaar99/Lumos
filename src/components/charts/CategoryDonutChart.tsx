import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../../theme';
import type { CategoryBreakdown } from '../../models/types';

interface CategoryDonutChartProps {
  data: CategoryBreakdown[];
  centerLabel: string;
}

export default function CategoryDonutChart({ data, centerLabel }: CategoryDonutChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>No data for this month</Text>
      </View>
    );
  }

  const total = data.reduce((s, c) => s + c.total, 0);
  const size = 220;
  const radius = 80;
  const strokeWidth = 36;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segments = data.map((cat) => {
    const ratio = total > 0 ? cat.total / total : 0;
    const arc = circumference * ratio;
    const offset = -cumulativeOffset;
    cumulativeOffset += arc;
    return { ...cat, arc, offset, ratio };
  });

  return (
    <View style={styles.container}>
      <View style={styles.chartRow}>
        <View style={styles.svgWrap}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <G transform={`rotate(-90 ${cx} ${cy})`}>
              {segments.map((seg) => (
                <Circle
                  key={seg.categoryId}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${seg.arc} ${circumference - seg.arc}`}
                  strokeDashoffset={seg.offset}
                  fill="transparent"
                />
              ))}
            </G>
          </Svg>
          <View style={styles.centerLabel}>
            <Text variant="bodyMedium" style={styles.centerText}>{centerLabel}</Text>
          </View>
        </View>

        <View style={styles.legend}>
          {data.map((cat) => (
            <View key={cat.categoryId} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text variant="bodySmall" style={styles.legendText} numberOfLines={1}>
                {cat.categoryName}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 12 },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 40 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  svgWrap: {
    position: 'relative',
    width: 220,
    height: 220,
  },
  centerLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  legend: {
    flex: 1,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.text, fontSize: 12, flexShrink: 1 },
});
