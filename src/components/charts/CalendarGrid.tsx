import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing, radius } from '../../theme';
import { getMonthLabel } from '../../utils/dates';
import type { DailyCashFlow } from '../../models/types';

interface CalendarGridProps {
  month: string;
  data: DailyCashFlow[];
  valueKey: 'income' | 'expense' | 'net';
  valueColor: string;
}

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatCompact(cents: number): string {
  if (cents === 0) return '';
  const abs = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${abs.toFixed(abs < 10 ? 1 : 0)}`;
}

function CalendarGrid({
  month,
  data,
  valueKey,
  valueColor,
}: CalendarGridProps) {
  if (data.length === 0) return null;

  const firstDate = new Date(data[0].date + 'T00:00:00');
  const startDow = firstDate.getDay();

  const cells: (DailyCashFlow | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  cells.push(...data);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (DailyCashFlow | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={styles.title}>
        Daily Breakdown
      </Text>

      <View style={styles.headerRow}>
        {DAY_NAMES.map((d, i) => (
          <View key={i} style={styles.headerCell}>
            <Text variant="labelSmall" style={styles.headerText}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (!day) {
              return <View key={di} style={styles.cell} />;
            }
            const dayNum = parseInt(day.date.split('-')[2], 10);
            let val = 0;
            if (valueKey === 'income') val = day.income;
            else if (valueKey === 'expense') val = -day.expense;
            else val = day.net;

            const hasValue = val !== 0;

            return (
              <View
                key={di}
                style={[
                  styles.cell,
                  hasValue && { backgroundColor: valueColor + '10' },
                ]}
              >
                <Text variant="labelSmall" style={styles.dayNum}>
                  {dayNum}
                </Text>
                {hasValue ? (
                  <Text
                    variant="labelSmall"
                    style={[styles.dayVal, { color: valueColor }]}
                    numberOfLines={1}
                  >
                    {formatCompact(val)}
                  </Text>
                ) : (
                  <View style={styles.emptyDot} />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
  },
  title: {
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerText: {
    color: colors.textTertiary,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 40,
    borderRadius: 6,
  },
  dayNum: {
    color: colors.textSecondary,
    fontSize: 10,
    marginBottom: 2,
  },
  dayVal: {
    fontSize: 9,
    fontWeight: '700',
  },
  emptyDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
    marginTop: 1,
  },
});

export default React.memo(CalendarGrid);
