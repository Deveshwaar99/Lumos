import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { colors, spacing } from '../theme';

interface PeriodNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onFilterPress?: () => void;
  showFilterIndicator?: boolean;
  compact?: boolean;
}

function PeriodNavigator({
  label,
  onPrev,
  onNext,
  onFilterPress,
  showFilterIndicator = true,
  compact = false,
}: PeriodNavigatorProps) {
  const chevronSize = compact ? 20 : 28;

  return (
    <View style={compact ? styles.containerCompact : styles.container}>
      <TouchableOpacity
        onPress={onPrev}
        hitSlop={12}
        style={styles.arrowBtn}
        accessibilityLabel="Previous period"
        accessibilityRole="button"
      >
        <Icon source="chevron-left" size={chevronSize} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={compact ? styles.labelRowCompact : styles.labelRow}
        onPress={onFilterPress}
        activeOpacity={onFilterPress ? 0.6 : 1}
        disabled={!onFilterPress}
      >
        <Text
          variant={compact ? 'bodyMedium' : 'titleMedium'}
          style={compact ? styles.labelCompact : styles.label}
          accessibilityRole="header"
        >
          {label}
        </Text>
        {showFilterIndicator ? (
          <Icon
            source="chevron-down"
            size={compact ? 14 : 18}
            color={colors.textSecondary}
          />
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onNext}
        hitSlop={12}
        style={styles.arrowBtn}
        accessibilityLabel="Next period"
        accessibilityRole="button"
      >
        <Icon source="chevron-right" size={chevronSize} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  arrowBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

export default React.memo(PeriodNavigator);
