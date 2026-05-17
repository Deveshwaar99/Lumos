import { format } from 'date-fns';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Snackbar, Text, TextInput } from 'react-native-paper';
import { getDatabase, resetDatabase } from '../db/database';
import { SCHEMA_VERSION } from '../db/migrations';
import { seedDemoStockData, seedDemoTransactions } from '../db/seed';
import type { AppSettings } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';
import { useAccountStore } from '../stores/useAccountStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useFDStore } from '../stores/useFDStore';
import { useRecurringStore } from '../stores/useRecurringStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useStockStore } from '../stores/useStockStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { colors, radius, spacing } from '../theme';

const DECIMAL_PLACE_OPTIONS = [0, 2, 3, 4] as const;

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

function formatAppMeta(dbSchemaVersion?: number | null): string {
  const version = Constants.expoConfig?.version ?? '—';
  const raw = Constants.expoConfig?.extra?.releaseDate;
  let dateLabel = '';
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    dateLabel = format(new Date(y, m - 1, d), 'MMM d, yyyy');
  }
  const schemaLabel =
    typeof dbSchemaVersion === 'number'
      ? `v${version} (${dbSchemaVersion})`
      : `v${version} (${SCHEMA_VERSION})`;
  const parts = [schemaLabel, dateLabel, 'Built by Devesh'].filter(Boolean);
  return parts.join(' · ');
}

export default function SettingsScreen({
  navigation,
}: RootStackScreenProps<'Settings'>) {
  const { settings, loadSettings, updateSetting } = useSettingsStore();
  const { loadTransactions } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { loadAccounts } = useAccountStore();
  const { loadBudgets } = useBudgetStore();
  const { loadDeposits } = useFDStore();
  const { loadRecurring } = useRecurringStore();
  const { loadAll: loadStocks } = useStockStore();
  const [snackbar, setSnackbar] = useState('');
  const [localName, setLocalName] = useState(settings.username);
  const [localCode, setLocalCode] = useState(settings.currencyCode);
  const [localSymbol, setLocalSymbol] = useState(settings.currencySymbol);
  const [dbSchemaVersion, setDbSchemaVersion] = useState<number | null>(null);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    loadSettings();
    getDatabase()
      .then((db) =>
        db.getFirstAsync<{ version: number | null }>(
          'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1',
        ),
      )
      .then((result) => {
        setDbSchemaVersion(result?.version ?? SCHEMA_VERSION);
      })
      .catch(() => {
        setDbSchemaVersion(SCHEMA_VERSION);
      });
    return () => {
      Object.values(debounceRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    setLocalName(settings.username);
    setLocalCode(settings.currencyCode);
    setLocalSymbol(settings.currencySymbol);
  }, [settings.username, settings.currencyCode, settings.currencySymbol]);

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
      'This will add ~20 sample transactions and demo CDS stock alerts (holdings). Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load',
          onPress: async () => {
            const db = await getDatabase();
            await seedDemoTransactions(db);
            await seedDemoStockData(db);
            await loadTransactions(true);
            await loadStocks();
            setSnackbar('Demo data loaded');
          },
        },
      ],
    );
  };

  const handleResetAll = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete ALL your transactions, accounts, categories, budgets, stocks/SMS import state, recurring rules, fixed deposits, and settings. This action cannot be undone.',
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
                    loadDeposits(),
                    loadRecurring(),
                    loadStocks(),
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
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
              icon="alphabetical-variant"
              title="Code"
              right={
                <TextInput
                  value={localCode}
                  onChangeText={(v) => {
                    const next = v.toUpperCase().replace(/[^A-Z]/g, '');
                    setLocalCode(next);
                    debouncedUpdate('currencyCode', next || 'USD');
                  }}
                  mode="flat"
                  style={styles.inlineInput}
                  contentStyle={styles.inlineInputContent}
                  underlineStyle={styles.inlineInputUnderline}
                  maxLength={3}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  cursorColor={colors.primary}
                  selectionColor={colors.primary + '40'}
                />
              }
            />
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

          <Text style={styles.sectionHeader}>Formatting</Text>
          <GroupedCard>
            <View style={styles.cardRow}>
              <Icon
                source="decimal"
                size={20}
                color={colors.textSecondary}
              />
              <Text variant="bodyLarge" style={styles.cardRowTitle}>
                Decimal Places
              </Text>
              <View style={styles.decimalOptions}>
                {DECIMAL_PLACE_OPTIONS.map((option) => {
                  const isSelected = settings.decimalPlaces === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.decimalChip,
                        isSelected && styles.decimalChipActive,
                      ]}
                      onPress={() => updateSetting('decimalPlaces', option)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.decimalChipText,
                          isSelected && styles.decimalChipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
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

          <View style={styles.footerDivider} />

          <View style={styles.footerArea}>
            <View style={styles.privacyBadge}>
              <Icon
                source="shield-check-outline"
                size={16}
                color={colors.tertiary}
              />
              <Text style={styles.privacyBadgeText}>
                100% offline — your data never leaves this device
              </Text>
            </View>

            <Text style={styles.appName}>Lumos</Text>
            <Text style={styles.appMeta}>{formatAppMeta(dbSchemaVersion)}</Text>
            <Text style={styles.copyright}>
              {'\u00A9'} 2026 Devesh. All rights reserved.
            </Text>
          </View>
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
    paddingVertical: spacing.cardInset,
    paddingHorizontal: spacing.cardInset,
    gap: spacing.md,
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
    height: 44,
    maxWidth: 160,
    textAlign: 'right',
  },
  inlineInput: {
    backgroundColor: 'transparent',
    height: 44,
    width: 72,
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
  decimalOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  decimalChip: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.capsule,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decimalChipActive: {
    backgroundColor: colors.primary,
  },
  decimalChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  decimalChipTextActive: {
    color: colors.onPrimary,
  },
  footerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xxl,
    marginTop: spacing.section,
    opacity: 0.5,
  },
  footerArea: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.capsule,
    marginBottom: spacing.xl,
  },
  privacyBadgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  appMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  copyright: {
    color: colors.textTertiary,
    fontSize: 11,
    textAlign: 'center',
  },
});
