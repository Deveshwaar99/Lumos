import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, Button } from 'react-native-paper';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors, spacing, radius } from '../theme';

const { AuthenticationType } = LocalAuthentication;

type BiometricType = 'face' | 'fingerprint' | 'generic';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [failed, setFailed] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('generic');

  useEffect(() => {
    LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
      if (types.includes(AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('face');
      } else if (types.includes(AuthenticationType.FINGERPRINT)) {
        setBiometricType('fingerprint');
      } else {
        setBiometricType('generic');
      }
    });
  }, []);

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

  const iconName =
    biometricType === 'face'
      ? 'face-recognition'
      : biometricType === 'fingerprint'
        ? 'fingerprint'
        : 'lock';

  const subtitle =
    biometricType === 'face'
      ? 'Use Face ID to continue'
      : biometricType === 'fingerprint'
        ? 'Use your fingerprint to continue'
        : 'Use biometrics to continue';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon source={iconName} size={72} color={colors.primary} />
        </View>
        <Text variant="headlineSmall" style={styles.title}>
          Unlock Lumos
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {subtitle}
        </Text>
        {failed && (
          <Button
            mode="contained"
            onPress={authenticate}
            style={styles.retryButton}
            labelStyle={styles.retryLabel}
            accessibilityLabel="Try again"
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
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  retryLabel: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
});
