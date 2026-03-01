import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { colors, spacing } from '../theme';

interface MonthNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

export default function MonthNavigator({ label, onPrev, onNext }: MonthNavigatorProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPrev} hitSlop={12}>
        <Icon source="chevron-left" size={28} color={colors.text} />
      </TouchableOpacity>
      <Text variant="titleMedium" style={styles.label}>
        {label}
      </Text>
      <View style={styles.rightGroup}>
        <TouchableOpacity onPress={onNext} hitSlop={12}>
          <Icon source="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity hitSlop={12} style={styles.filterBtn}>
          <Icon source="filter-variant" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 17,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterBtn: {
    marginLeft: 4,
  },
});
