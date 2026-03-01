import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, spacing } from '../../theme';
import type { CategoryBreakdown } from '../../models/types';

interface CategoryDonutChartProps {
  data: CategoryBreakdown[];
  centerLabel: string;
}

export default function CategoryDonutChart({ data, centerLabel }: CategoryDonutChartProps) {
  const { width: screenWidth } = useWindowDimensions();

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>No data for this month</Text>
      </View>
    );
  }

  const total = data.reduce((s, c) => s + c.total, 0);
  const size = Math.min(screenWidth * 0.48, 200);
  const ringRadius = size * 0.36;
  const strokeWidth = size * 0.16;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * ringRadius;

  let cumulativeOffset = 0;
  const segments = data.map((cat) => {
    const ratio = total > 0 ? cat.total / total : 0;
    const arc = circumference * ratio;
    const gap = data.length > 1 ? 2 : 0;
    const offset = -cumulativeOffset;
    cumulativeOffset += arc;
    return { ...cat, arc: Math.max(arc - gap, 0), offset, ratio };
  });

  const visibleLegend = data.slice(0, 6);
  const hasMore = data.length > 6;

  return (
    <View style={styles.container}>
      <View style={styles.svgWrap}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G transform={`rotate(-90 ${cx} ${cy})`}>
            {segments.map((seg) => (
              <Circle
                key={seg.categoryId}
                cx={cx}
                cy={cy}
                r={ringRadius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.arc} ${circumference - seg.arc}`}
                strokeDashoffset={seg.offset}
                strokeLinecap="round"
                fill="transparent"
              />
            ))}
          </G>
        </Svg>
        <View style={styles.centerLabel}>
          <Text variant="labelSmall" style={styles.centerText}>{centerLabel}</Text>
          <Text variant="bodySmall" style={styles.centerCount}>{data.length} categories</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {visibleLegend.map((cat) => {
          const pct = total > 0 ? ((cat.total / total) * 100).toFixed(1) : '0';
          return (
            <View key={cat.categoryId} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text variant="bodySmall" style={styles.legendText} numberOfLines={1}>
                {cat.categoryName}
              </Text>
              <Text variant="labelSmall" style={styles.legendPct}>{pct}%</Text>
            </View>
          );
        })}
        {hasMore && (
          <Text variant="labelSmall" style={styles.moreText}>
            +{data.length - 6} more
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 40 },
  svgWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  centerLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  centerCount: {
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.text, fontSize: 11, maxWidth: 80 },
  legendPct: { color: colors.textSecondary, fontSize: 10 },
  moreText: {
    color: colors.textTertiary,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
});
