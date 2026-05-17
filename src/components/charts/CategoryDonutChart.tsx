import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import type { CategoryBreakdown } from '../../models/types';
import { colors, spacing } from '../../theme';

const CHART_SIZE = 150;
const RING_RADIUS = CHART_SIZE * 0.36;
const STROKE_WIDTH = CHART_SIZE * 0.16;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CX = CHART_SIZE / 2;
const CY = CHART_SIZE / 2;

interface CategoryDonutChartProps {
  data: CategoryBreakdown[];
  centerLabel: string;
}

function CategoryDonutChart({ data, centerLabel }: CategoryDonutChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>
          No data for this month
        </Text>
      </View>
    );
  }

  const total = data.reduce((s, c) => s + c.total, 0);

  let cumulativeOffset = 0;
  const segments = data.map((cat) => {
    const ratio = total > 0 ? cat.total / total : 0;
    const arc = CIRCUMFERENCE * ratio;
    const gap = data.length > 1 ? 2 : 0;
    const offset = -cumulativeOffset;
    cumulativeOffset += arc;
    return { ...cat, arc: Math.max(arc - gap, 0), offset, ratio };
  });

  return (
    <View style={styles.container}>
      <View style={styles.svgWrap}>
        <Svg
          width={CHART_SIZE}
          height={CHART_SIZE}
          viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
        >
          <G transform={`rotate(-90 ${CX} ${CY})`}>
            {segments.map((seg) => (
              <Circle
                key={seg.categoryId}
                cx={CX}
                cy={CY}
                r={RING_RADIUS}
                stroke={seg.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${seg.arc} ${CIRCUMFERENCE - seg.arc}`}
                strokeDashoffset={seg.offset}
                strokeLinecap="round"
                fill="transparent"
              />
            ))}
          </G>
        </Svg>
        <View style={styles.centerLabel}>
          <Text variant="labelSmall" style={styles.centerText}>
            {centerLabel}
          </Text>
          <Text variant="bodySmall" style={styles.centerCount}>
            {data.length} cat.
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        {data.map((cat) => {
          const pct = total > 0 ? ((cat.total / total) * 100).toFixed(1) : '0';
          return (
            <View key={cat.categoryId} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text
                variant="bodySmall"
                style={styles.legendText}
                numberOfLines={1}
              >
                {cat.categoryName}
              </Text>
              <Text variant="labelSmall" style={styles.legendPct}>
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 40 },
  svgWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: CHART_SIZE,
    height: CHART_SIZE,
    flexShrink: 0,
  },
  centerLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  centerCount: {
    color: colors.textTertiary,
    fontSize: 9,
    marginTop: 1,
  },
  legend: {
    flex: 1,
    maxHeight: CHART_SIZE,
    overflow: 'hidden',
    gap: 4,
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
  legendText: { color: colors.text, fontSize: 11, flex: 1 },
  legendPct: { color: colors.textSecondary, fontSize: 10 },
});

export default React.memo(CategoryDonutChart);
