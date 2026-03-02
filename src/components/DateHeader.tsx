import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { colors, spacing } from '../theme';

interface DateHeaderProps {
  dateStr: string;
}

export default function DateHeader({ dateStr }: DateHeaderProps) {
  const date = dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
  const label = format(date, 'EEE, dd MMM');
  const relative = isToday(date)
    ? 'Today'
    : isYesterday(date)
      ? 'Yesterday'
      : null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{relative ?? label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
