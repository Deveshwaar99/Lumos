import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { colors, spacing, radius } from '../theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  onAction?: () => void;
  actionLabel?: string;
}

function EmptyState({ icon, title, subtitle, onAction, actionLabel }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon source={icon as any} size={64} color={colors.textSecondary} />
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="bodyMedium" style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
      {onAction && actionLabel && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  title: {
    marginTop: spacing.cardInset,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.capsule,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  actionText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default React.memo(EmptyState);
