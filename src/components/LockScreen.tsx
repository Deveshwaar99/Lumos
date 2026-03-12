import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, Button } from 'react-native-paper';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors, spacing } from '../theme';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [failed, setFailed] = useState(false);

  const authenticate = useCallback(async () => {
    setFailed(false);
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Lumos',
      disableDeviceFallback: true,
    });
    if (result.success) {
      onUnlock();
    } else {
      setFailed(true);
    }
  }, [onUnlock]);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon source="fingerprint" size={72} color={colors.primary} />
        </View>
        <Text variant="headlineSmall" style={styles.title}>
          Unlock Lumos
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Use your fingerprint to continue
        </Text>
        {failed && (
          <Button
            mode="contained"
            onPress={authenticate}
            style={styles.retryButton}
            labelStyle={styles.retryLabel}
          >
            Try Again
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
  },
  retryLabel: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
});
