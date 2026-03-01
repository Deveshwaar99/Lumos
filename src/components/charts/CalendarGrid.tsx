import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../../theme';
import { getMonthLabel } from '../../utils/dates';
import type { DailyCashFlow } from '../../models/types';

interface CalendarGridProps {
  month: string;
  data: DailyCashFlow[];
  valueKey: 'income' | 'expense' | 'net';
  valueColor: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatCompact(cents: number): string {
  if (cents === 0) return '.';
  const abs = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${abs.toFixed(abs < 10 ? 1 : 0)}`;
}

export default function CalendarGrid({ month, data, valueKey, valueColor }: CalendarGridProps) {
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
      <Text variant="titleSmall" style={styles.title}>{getMonthLabel(month)}</Text>

      <View style={styles.headerRow}>
        {DAY_NAMES.map((d) => (
          <View key={d} style={styles.cell}>
            <Text variant="labelSmall" style={styles.headerText}>{d}</Text>
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

            return (
              <View key={di} style={styles.cell}>
                <Text variant="labelSmall" style={styles.dayNum}>{dayNum}</Text>
                <Text
                  variant="labelSmall"
                  style={[
                    styles.dayVal,
                    { color: val === 0 ? colors.textTertiary : valueColor },
                  ]}
                  numberOfLines={1}
                >
                  {formatCompact(val)}
                </Text>
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
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.income,
    fontWeight: '700',
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingBottom: 6,
    marginBottom: 4,
  },
  headerText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 11,
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 42,
  },
  dayNum: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  dayVal: {
    fontSize: 10,
    fontWeight: '600',
  },
});
