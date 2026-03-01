import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { format, parseISO } from 'date-fns';
import { colors, spacing } from '../theme';

interface DateHeaderProps {
  dateStr: string;
}

export default function DateHeader({ dateStr }: DateHeaderProps) {
  const date = dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
  const label = format(date, 'MMM dd, EEEE');

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text variant="labelMedium" style={styles.label}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
