import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, radius, spacing } from '../theme';
import type { TimePeriod } from '../utils/dates';

const PERIOD_OPTIONS: {
  key: TimePeriod;
  label: string;
  compactLabel?: string;
}[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: '3months', label: '3 Months', compactLabel: '3M' },
  { key: '6months', label: '6 Months', compactLabel: '6M' },
  { key: 'year', label: 'Year' },
];

interface TimePeriodTabsProps {
  selected: TimePeriod;
  onSelect: (period: TimePeriod) => void;
  compact?: boolean;
}

function TimePeriodTabs({
  selected,
  onSelect,
  compact = false,
}: TimePeriodTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        compact ? styles.containerCompact : styles.containerDefault,
      ]}
    >
      {PERIOD_OPTIONS.map((option) => {
        const isSelected = option.key === selected;
        return (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.chip,
              compact ? styles.chipCompact : styles.chipDefault,
              isSelected && styles.chipSelected,
            ]}
            onPress={() => onSelect(option.key)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.chipText,
                compact ? styles.chipTextCompact : styles.chipTextDefault,
                isSelected && styles.chipTextSelected,
              ]}
            >
              {compact ? (option.compactLabel ?? option.label) : option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  containerDefault: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  containerCompact: {
    paddingHorizontal: spacing.cardInset,
    paddingBottom: spacing.md,
  },
  chip: {
    borderRadius: radius.capsule,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  chipDefault: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  chipCompact: {
    minHeight: 30,
    paddingHorizontal: spacing.sm + 2,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chipTextDefault: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  chipTextCompact: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  chipTextSelected: {
    color: colors.onPrimary,
  },
});

export default React.memo(TimePeriodTabs);
