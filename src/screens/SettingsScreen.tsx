import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Text, Snackbar, TextInput, Icon } from 'react-native-paper';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettingsStore } from '../stores/useSettingsStore';
import { seedDemoTransactions } from '../db/seed';
import { getDatabase, resetDatabase } from '../db/database';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { colors, spacing, radius } from '../theme';
import type { AppSettings } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';

function GroupedCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.groupedCard}>{children}</View>;
}

function CardRow({
  icon,
  title,
  onPress,
  right,
  isLast,
}: {
  icon: string;
  title: string;
  onPress?: () => void;
  right?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <>
      <TouchableOpacity
        style={styles.cardRow}
        onPress={onPress}
        activeOpacity={onPress ? 0.6 : 1}
      >
        <Icon source={icon as any} size={20} color={colors.textSecondary} />
        <Text variant="bodyLarge" style={styles.cardRowTitle}>
          {title}
        </Text>
        <View style={styles.cardRowRight}>
          {right}
          {onPress && !right ? (
            <Icon
              source="chevron-right"
              size={20}
              color={colors.textTertiary}
            />
          ) : null}
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.cardDivider} />}
    </>
  );
}

export default function SettingsScreen({
  navigation,
}: RootStackScreenProps<'Settings'>) {
  const { settings, loadSettings, updateSetting } = useSettingsStore();
  const { loadTransactions } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { loadAccounts } = useAccountStore();
  const { loadBudgets } = useBudgetStore();
  const [snackbar, setSnackbar] = useState('');
  const [localName, setLocalName] = useState(settings.username);
  const [localSymbol, setLocalSymbol] = useState(settings.currencySymbol);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    loadSettings();
    return () => {
      Object.values(debounceRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    setLocalName(settings.username);
    setLocalSymbol(settings.currencySymbol);
  }, [settings.username, settings.currencySymbol]);

  const debouncedUpdate = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => {
      updateSetting(key, value);
    }, 500);
  };

  const handleScreenLockToggle = async (enable: boolean) => {
    if (!enable) {
      await updateSetting('screenLockEnabled', false);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert(
        'Not Available',
        'Your device does not support biometric authentication.',
      );
      return;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      Alert.alert(
        'No Fingerprint Enrolled',
        'Please set up a fingerprint in your device settings first.',
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify to enable Screen Lock',
      disableDeviceFallback: true,
    });

    if (result.success) {
      await updateSetting('screenLockEnabled', true);
    }
  };

  const handleSeedDemo = () => {
    Alert.alert(
      'Load Demo Data',
      'This will add ~20 sample transactions. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load',
          onPress: async () => {
            const db = await getDatabase();
            await seedDemoTransactions(db);
            await loadTransactions(true);
            setSnackbar('Demo data loaded');
          },
        },
      ],
    );
  };

  const handleResetAll = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete ALL your transactions, accounts, categories, budgets, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you sure?', 'All data will be lost forever.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, Reset',
                style: 'destructive',
                onPress: async () => {
                  await resetDatabase();
                  await Promise.all([
                    loadTransactions(true),
                    loadCategories(),
                    loadAccounts(),
                    loadBudgets(),
                    loadSettings(),
                  ]);
                  setSnackbar('All data has been reset');
                },
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionHeader}>Profile</Text>
          <GroupedCard>
            <CardRow
              icon="account-outline"
              title="Name"
              right={
                <TextInput
                  value={localName}
                  onChangeText={(v) => {
                    setLocalName(v);
                    debouncedUpdate('username', v);
                  }}
                  placeholder="Your name"
                  placeholderTextColor={colors.textTertiary}
                  mode="flat"
                  style={styles.nameInput}
                  contentStyle={styles.inlineInputContent}
                  underlineStyle={styles.inlineInputUnderline}
                  maxLength={20}
                  cursorColor={colors.primary}
                  selectionColor={colors.primary + '40'}
                />
              }
              isLast
            />
          </GroupedCard>

          <Text style={styles.sectionHeader}>Currency</Text>
          <GroupedCard>
            <CardRow
              icon="currency-usd"
              title="Symbol"
              right={
                <TextInput
                  value={localSymbol}
                  onChangeText={(v) => {
                    setLocalSymbol(v);
                    debouncedUpdate('currencySymbol', v);
                  }}
                  mode="flat"
                  style={styles.inlineInput}
                  contentStyle={styles.inlineInputContent}
                  underlineStyle={styles.inlineInputUnderline}
                  maxLength={3}
                  cursorColor={colors.primary}
                  selectionColor={colors.primary + '40'}
                />
              }
              isLast
            />
          </GroupedCard>

          <Text style={styles.sectionHeader}>Security</Text>
          <GroupedCard>
            <CardRow
              icon="fingerprint"
              title="Screen Lock"
              right={
                <Switch
                  value={settings.screenLockEnabled}
                  onValueChange={handleScreenLockToggle}
                  trackColor={{
                    false: colors.outline,
                    true: colors.primaryLight,
                  }}
                  thumbColor={
                    settings.screenLockEnabled
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
              }
              isLast
            />
          </GroupedCard>

          <Text style={styles.sectionHeader}>Data</Text>
          <GroupedCard>
            <CardRow
              icon="cloud-upload"
              title="Backup & Restore"
              onPress={() => navigation.navigate('BackupRestore')}
              right={<Text style={styles.cardRowValue}>Manage</Text>}
            />
            <CardRow
              icon="database-plus"
              title="Load Demo Data"
              onPress={handleSeedDemo}
            />
            <CardRow
              icon="delete-forever"
              title="Reset All Data"
              onPress={handleResetAll}
              right={
                <Text style={[styles.cardRowValue, { color: colors.error }]}>
                  Erase
                </Text>
              }
              isLast
            />
          </GroupedCard>

          <Text style={styles.sectionHeader}>Privacy</Text>
          <GroupedCard>
            <View style={styles.privacyInner}>
              <Text variant="bodyMedium" style={styles.privacyText}>
                Lumos stores all your data locally on your device. No data is
                sent to any server. No internet connection is required. Your
                financial data stays private and secure on your device.
              </Text>
            </View>
          </GroupedCard>

          <Text style={styles.sectionHeader}>About</Text>
          <GroupedCard>
            <CardRow
              icon="information-outline"
              title="Version"
              right={<Text style={styles.cardRowValue}>1.0.0</Text>}
            />
            <CardRow
              icon="heart-outline"
              title="Lumos"
              right={<Text style={styles.cardRowValue}>Finance Manager</Text>}
            />
            <CardRow
              icon="code-tags"
              title="Built by"
              right={<Text style={styles.cardRowValue}>Devesh</Text>}
              isLast
            />
          </GroupedCard>

          <Text style={styles.copyright}>
            {'\u00A9'} 2026 Devesh. All rights reserved.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40, paddingTop: spacing.sm },
  sectionHeader: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.section,
    marginBottom: spacing.md,
  },
  groupedCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: spacing.cardInset,
    gap: 12,
  },
  cardRowTitle: { flex: 1, color: colors.text, fontWeight: '500' },
  cardRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardRowValue: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.cardInset + 32,
  },
  nameInput: {
    backgroundColor: 'transparent',
    height: 36,
    maxWidth: 160,
    textAlign: 'right',
  },
  inlineInput: {
    backgroundColor: 'transparent',
    height: 36,
    width: 60,
    textAlign: 'right',
  },
  inlineInputContent: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'right',
  },
  inlineInputUnderline: {
    display: 'none',
  },
  privacyInner: { padding: spacing.cardInset },
  privacyText: { color: colors.textSecondary, lineHeight: 22 },
  copyright: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
