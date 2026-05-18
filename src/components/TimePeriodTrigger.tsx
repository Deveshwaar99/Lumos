import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { colors, radius, spacing } from '../theme';
import { getTimePeriodOptionLabel, type TimePeriod } from '../utils/dates';

interface TimePeriodTriggerProps {
  period: TimePeriod;
  onPress: () => void;
  compact?: boolean;
}

function TimePeriodTrigger({
  period,
  onPress,
  compact = false,
}: TimePeriodTriggerProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, compact && styles.chipCompact]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Change time period, current ${getTimePeriodOptionLabel(period)}`}
    >
      <Text style={[styles.label, compact && styles.labelCompact]}>
        {getTimePeriodOptionLabel(period, compact)}
      </Text>
      <Icon
        source="chevron-down"
        size={compact ? 14 : 16}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 32,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.capsule,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  chipCompact: {
    minHeight: 30,
    paddingHorizontal: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelCompact: {
    fontSize: 11,
  },
});

export default React.memo(TimePeriodTrigger);
