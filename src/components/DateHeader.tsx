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
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  label: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8,
  },
  line: {
    height: 1,
    backgroundColor: colors.border,
  },
});
