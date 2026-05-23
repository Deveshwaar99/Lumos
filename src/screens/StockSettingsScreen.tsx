import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Snackbar, Text, TextInput } from 'react-native-paper';
import type { RootStackScreenProps } from '../navigation/types';
import { stockService } from '../services/stockService';
import { useStockStore } from '../stores/useStockStore';
import { colors, radius, spacing } from '../theme';

function splitEditorValues(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

type SettingsPillTone = 'default' | 'primary' | 'destructive';

function SettingsActionsBar({ children }: { children: React.ReactNode }) {
  return <View style={styles.actionsRow}>{children}</View>;
}

function SettingsPill({
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  tone = 'default',
}: {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: SettingsPillTone;
}) {
  const toneStyles =
    tone === 'destructive'
      ? styles.pillDestructive
      : tone === 'primary'
        ? styles.pillPrimary
        : null;
  const labelStyles =
    tone === 'destructive'
      ? styles.pillLabelDestructive
      : tone === 'primary'
        ? styles.pillLabelPrimary
        : null;
  const iconColor =
    tone === 'destructive'
      ? colors.error
      : tone === 'primary'
        ? colors.primary
        : colors.textSecondary;

  return (
    <View style={styles.actionSlot}>
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.pill,
          toneStyles,
          (disabled || loading) && styles.pillDisabled,
          pressed && !(disabled || loading) && styles.pillPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {loading ? (
          <ActivityIndicator size={14} color={iconColor} />
        ) : (
          <Icon source={icon} size={14} color={iconColor} />
        )}
        <Text style={[styles.pillLabel, labelStyles]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

export default function StockSettingsScreen({
  navigation,
}: RootStackScreenProps<'StockSettings'>) {
  const brokerFundingSenderIds = useStockStore(
    (state) => state.brokerFundingSenderIds,
  );
  const brokerFundingKeywords = useStockStore(
    (state) => state.brokerFundingKeywords,
  );
  const isSyncing = useStockStore((state) => state.isSyncing);
  const isBrokerFundingSyncing = useStockStore(
    (state) => state.isBrokerFundingSyncing,
  );
  const setSenderId = useStockStore((state) => state.setSenderId);
  const setBrokerFundingSenderIds = useStockStore(
    (state) => state.setBrokerFundingSenderIds,
  );
  const setBrokerFundingKeywords = useStockStore(
    (state) => state.setBrokerFundingKeywords,
  );
  const sync = useStockStore((state) => state.sync);
  const syncBrokerFunding = useStockStore((state) => state.syncBrokerFunding);
  const clearTradeSmsLogs = useStockStore((state) => state.clearTradeSmsLogs);
  const clearBrokerFundingSmsLogs = useStockStore(
    (state) => state.clearBrokerFundingSmsLogs,
  );
  const [tradeSenderInput, setTradeSenderInput] = useState('CDS-Alerts');
  const [brokerSenderInput, setBrokerSenderInput] = useState('');
  const [brokerKeywordInput, setBrokerKeywordInput] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [clearingTrade, setClearingTrade] = useState(false);
  const [clearingFunding, setClearingFunding] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: 'Stocks Settings' });
    }, [navigation]),
  );

  useEffect(() => {
    setBrokerSenderInput(brokerFundingSenderIds.join('\n'));
  }, [brokerFundingSenderIds]);

  useEffect(() => {
    setBrokerKeywordInput(brokerFundingKeywords.join('\n'));
  }, [brokerFundingKeywords]);

  useEffect(() => {
    stockService
      .getMeta('senderId')
      .then((value) => {
        if (value?.trim()) {
          setTradeSenderInput(value);
        }
      })
      .catch(() => null);
  }, []);

  const busy =
    isSyncing ||
    isBrokerFundingSyncing ||
    clearingTrade ||
    clearingFunding ||
    saving;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await Promise.all([
        setSenderId(tradeSenderInput.trim() || 'CDS-Alerts'),
        setBrokerFundingSenderIds(splitEditorValues(brokerSenderInput)),
        setBrokerFundingKeywords(splitEditorValues(brokerKeywordInput)),
      ]);
      setSnackbar('Stocks settings saved');
    } catch {
      setSnackbar('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [
    brokerKeywordInput,
    brokerSenderInput,
    setBrokerFundingKeywords,
    setBrokerFundingSenderIds,
    setSenderId,
    tradeSenderInput,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => void handleSave()}
          disabled={busy}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          style={[styles.headerSavePill, busy && styles.headerSavePillDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Save settings"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.headerSaveText}>Save</Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSave, busy, saving]);

  const formatSyncResult = useCallback(
    (
      result:
        | Awaited<ReturnType<typeof sync>>
        | Awaited<ReturnType<typeof syncBrokerFunding>>,
      kind: 'trade' | 'funding',
    ): string | null => {
      if (result.status === 'permission_denied') {
        return 'SMS permission denied';
      }
      if (result.status === 'unsupported') {
        return 'SMS sync is not supported in this build';
      }
      if (kind === 'funding' && result.status === 'no_senders') {
        return 'Add funding sender IDs before resyncing';
      }
      if (kind === 'trade' && result.status === 'ok') {
        const tradeResult = result as Awaited<ReturnType<typeof sync>>;
        return `Trade SMS resynced: ${tradeResult.newSms} new, ${tradeResult.newMovements} movements`;
      }
      if (kind === 'funding' && result.status === 'ok') {
        const fundingResult = result as Awaited<
          ReturnType<typeof syncBrokerFunding>
        >;
        return `Funding SMS resynced: ${fundingResult.scanned} scanned, ${fundingResult.matched} matched`;
      }
      return null;
    },
    [],
  );

  const runClearTradeSmsOnly = useCallback(async () => {
    setClearingTrade(true);
    try {
      await clearTradeSmsLogs();
      setSnackbar('Trade SMS log cleared');
    } catch {
      setSnackbar('Failed to clear trade SMS log');
    } finally {
      setClearingTrade(false);
    }
  }, [clearTradeSmsLogs]);

  const runResyncTradeSms = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setSnackbar('SMS resync is only available on Android');
      return;
    }
    const result = await sync();
    const message = formatSyncResult(result, 'trade');
    if (message) setSnackbar(message);
  }, [formatSyncResult, sync]);

  const runClearFundingSmsOnly = useCallback(async () => {
    setClearingFunding(true);
    try {
      await clearBrokerFundingSmsLogs();
      setSnackbar('Funding SMS log cleared');
    } catch {
      setSnackbar('Failed to clear funding SMS log');
    } finally {
      setClearingFunding(false);
    }
  }, [clearBrokerFundingSmsLogs]);

  const runResyncFundingSms = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setSnackbar('SMS resync is only available on Android');
      return;
    }
    const result = await syncBrokerFunding();
    const message = formatSyncResult(result, 'funding');
    if (message) setSnackbar(message);
  }, [formatSyncResult, syncBrokerFunding]);

  const confirmClearTradeSmsOnly = useCallback(() => {
    Alert.alert(
      'Clear trade SMS log?',
      'This deletes the trade SMS log and all stock movements imported from SMS. It does not scan your inbox until you tap Resync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => void runClearTradeSmsOnly(),
        },
      ],
    );
  }, [runClearTradeSmsOnly]);

  const confirmClearFundingSmsOnly = useCallback(() => {
    Alert.alert(
      'Clear funding SMS log?',
      'This deletes all broker funding review entries. It does not scan your inbox until you tap Resync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => void runClearFundingSmsOnly(),
        },
      ],
    );
  }, [runClearFundingSmsOnly]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trade SMS Import</Text>
          <Text style={styles.helperText}>
            Used for stock trade messages like CDS alerts.
          </Text>
          <TextInput
            mode="outlined"
            label="Trade sender ID"
            value={tradeSenderInput}
            onChangeText={setTradeSenderInput}
          />
          <SettingsActionsBar>
            <SettingsPill
              label="SMS log"
              icon="message-text-outline"
              onPress={() => navigation.navigate('StockSmsLog')}
              disabled={busy}
            />
            <SettingsPill
              label="Resync"
              icon="sync"
              onPress={() => void runResyncTradeSms()}
              disabled={busy}
              loading={isSyncing}
              tone="primary"
            />
            <SettingsPill
              label="Clear"
              icon="delete-outline"
              onPress={confirmClearTradeSmsOnly}
              disabled={busy}
              loading={clearingTrade}
              tone="destructive"
            />
          </SettingsActionsBar>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Broker Funding Detection</Text>
          <Text style={styles.helperText}>
            Enter possible senders separated by commas or new lines. Funding
            sync only checks messages from these senders (exact match after
            normalization — GENIE will not match GenieSTOCKS) and rescans when
            the list changes.
          </Text>
          <TextInput
            mode="outlined"
            label="Possible sender IDs"
            value={brokerSenderInput}
            onChangeText={setBrokerSenderInput}
            multiline
            placeholder={'GENIE, ALERTS\nBANKALERTS'}
          />
          <TextInput
            mode="outlined"
            label="Broker keywords"
            value={brokerKeywordInput}
            onChangeText={setBrokerKeywordInput}
            multiline
            placeholder={'SOFTLOGIC\nSOFTLOGIC STOCKBROKERS'}
            style={styles.secondInput}
          />
          <SettingsActionsBar>
            <SettingsPill
              label="Review"
              icon="message-text-outline"
              onPress={() => navigation.navigate('BrokerFundingReview')}
              disabled={busy}
            />
            <SettingsPill
              label="Resync"
              icon="sync"
              onPress={() => void runResyncFundingSms()}
              disabled={busy}
              loading={isBrokerFundingSyncing}
              tone="primary"
            />
            <SettingsPill
              label="Clear"
              icon="delete-outline"
              onPress={confirmClearFundingSmsOnly}
              disabled={busy}
              loading={clearingFunding}
              tone="destructive"
            />
          </SettingsActionsBar>
        </View>
      </ScrollView>
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={2500}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  secondInput: {
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  actionSlot: {
    flex: 1,
    minWidth: 0,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.capsule,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceVariant,
  },
  pillPrimary: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  pillDestructive: {
    borderColor: `${colors.error}66`,
    backgroundColor: colors.errorContainer,
  },
  pillDisabled: {
    opacity: 0.45,
  },
  pillPressed: {
    opacity: 0.75,
  },
  pillLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillLabelPrimary: {
    color: colors.onPrimaryContainer,
  },
  pillLabelDestructive: {
    color: colors.error,
  },
  headerSavePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.capsule,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  headerSavePillDisabled: {
    opacity: 0.5,
  },
  headerSaveText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
