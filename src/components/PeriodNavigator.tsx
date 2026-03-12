import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { colors, spacing } from '../theme';

interface PeriodNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onFilterPress?: () => void;
  compact?: boolean;
}

export default function PeriodNavigator({
  label,
  onPrev,
  onNext,
  onFilterPress,
  compact = false,
}: PeriodNavigatorProps) {
  const chevronSize = compact ? 20 : 28;

  return (
    <View style={compact ? styles.containerCompact : styles.container}>
      <TouchableOpacity onPress={onPrev} hitSlop={12}>
        <Icon source="chevron-left" size={chevronSize} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={compact ? styles.labelRowCompact : styles.labelRow}
        onPress={onFilterPress}
        activeOpacity={0.6}
      >
        <Text
          variant={compact ? 'bodyMedium' : 'titleMedium'}
          style={compact ? styles.labelCompact : styles.label}
        >
          {label}
        </Text>
        <Icon
          source="chevron-down"
          size={compact ? 14 : 18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={onNext} hitSlop={12}>
        <Icon source="chevron-right" size={chevronSize} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 8,
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 17,
  },
  labelCompact: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
});
