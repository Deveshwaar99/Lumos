import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Icon, Snackbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAccountStore } from '../stores/useAccountStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useFDStore } from '../stores/useFDStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { fdService } from '../services/fdService';
import { transactionService } from '../services/transactionService';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import {
  calculateFDInterest,
  calculateTDS,
  calculateNetInterest,
  getDaysRemaining,
  daysBetween,
} from '../utils/fdCalculator';
import type { RootStackScreenProps } from '../navigation/types';
import type { FixedDeposit, Transaction } from '../models/types';

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    color: colors.income,
    icon: 'clock-outline' as const,
  },
  matured: {
    label: 'Matured',
    color: colors.primary,
    icon: 'check-circle-outline' as const,
  },
  closed: {
    label: 'Closed',
    color: colors.textSecondary,
    icon: 'close-circle-outline' as const,
  },
};

export default function FDDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'FDDetail'>) {
  const { fdId } = route.params;
  const insets = useSafeAreaInsets();
  const { accounts } = useAccountStore();
  const { categories } = useCategoryStore();
  const { closeDeposit, removeDeposit, loadDeposits } = useFDStore();
  const { settings } = useSettingsStore();
  const sym = settings.currencySymbol;

  const [fd, setFd] = useState<FixedDeposit | null>(null);
  const [linkedTxns, setLinkedTxns] = useState<Transaction[]>([]);
  const [snackbar, setSnackbar] = useState('');

  const loadData = useCallback(async () => {
    const data = await fdService.getById(fdId);
    setFd(data);
    if (data) {
      const txns = await transactionService.getByFdId(fdId);
      setLinkedTxns(txns);
    }
  }, [fdId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const sourceAccount = useMemo(
    () => accounts.find((a) => a.id === fd?.sourceAccountId),
    [accounts, fd],
  );
  const creditAccount = useMemo(
    () => accounts.find((a) => a.id === fd?.creditAccountId),
    [accounts, fd],
  );
  const interestCategory = useMemo(
    () => categories.find((c) => c.id === fd?.interestCategoryId),
    [categories, fd],
  );

  const breakdown = useMemo(() => {
    if (!fd) return null;
    const gross = calculateFDInterest(
      fd.principalCents,
      fd.annualInterestRate,
      fd.startDate,
      fd.maturityDate,
    );
    const tds = calculateTDS(gross, fd.taxRate);
    const net = calculateNetInterest(gross, fd.taxRate);
    const daysLeft = getDaysRemaining(fd.maturityDate);
    const totalDays = daysBetween(fd.startDate, fd.maturityDate);
    const elapsed = totalDays - daysLeft;
    const progress = totalDays > 0 ? Math.min(1, elapsed / totalDays) : 1;
    return {
      gross,
      tds,
      net,
      maturityValue: fd.principalCents + net,
      daysLeft,
      totalDays,
      progress,
    };
  }, [fd]);

  const handleClose = useCallback(() => {
    if (!fd) return;
    Alert.alert(
      'Close FD Early',
      'This will return the principal without interest. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close FD',
          style: 'destructive',
          onPress: async () => {
            const success = await closeDeposit(fd.id);
            if (success) {
              await loadDeposits();
              navigation.goBack();
            } else {
              setSnackbar('Failed to close FD');
            }
          },
        },
      ],
    );
  }, [fd, closeDeposit, loadDeposits, navigation]);

  const handleDelete = useCallback(() => {
    if (!fd) return;
    Alert.alert(
      'Delete FD',
      'This will delete the FD and all linked transactions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeDeposit(fd.id);
            await loadDeposits();
            navigation.goBack();
          },
        },
      ],
    );
  }, [fd, removeDeposit, loadDeposits, navigation]);

  if (!fd || !breakdown) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[fd.status];
  const startLabel = format(
    new Date(fd.startDate + 'T00:00:00'),
    'MMM d, yyyy',
  );
  const maturityLabel = format(
    new Date(fd.maturityDate + 'T00:00:00'),
    'MMM d, yyyy',
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusCfg.color + '18' },
          ]}
        >
          <Icon source={statusCfg.icon} size={16} color={statusCfg.color} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>

        {/* Principal Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Principal</Text>
          <Text style={styles.heroAmount}>
            {formatMoney(fd.principalCents, sym, 2)}
          </Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroRate}>{fd.annualInterestRate}% p.a.</Text>
            <Text style={styles.heroDot}> · </Text>
            <Text style={styles.heroRate}>TDS {fd.taxRate}%</Text>
          </View>
        </View>

        {/* Progress (active only) */}
        {fd.status === 'active' && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                {breakdown.daysLeft} days remaining
              </Text>
              <Text style={styles.progressPct}>
                {Math.round(breakdown.progress * 100)}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(breakdown.progress * 100)}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Dates */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Icon source="calendar-start" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Start Date</Text>
              <Text style={styles.infoValue}>{startLabel}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Icon source="calendar-end" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Maturity Date</Text>
              <Text style={styles.infoValue}>{maturityLabel}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Icon source="calendar-range" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Tenure</Text>
              <Text style={styles.infoValue}>{breakdown.totalDays} days</Text>
            </View>
          </View>
        </View>

        {/* Accounts */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View
              style={[
                styles.infoIconWrap,
                { backgroundColor: colors.expense + '18' },
              ]}
            >
              <Icon
                source={sourceAccount?.icon ?? 'wallet'}
                size={18}
                color={colors.expense}
              />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Source Account</Text>
              <Text style={styles.infoValue}>{sourceAccount?.name ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View
              style={[
                styles.infoIconWrap,
                { backgroundColor: colors.income + '18' },
              ]}
            >
              <Icon
                source={creditAccount?.icon ?? 'wallet'}
                size={18}
                color={colors.income}
              />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Credit Account (on maturity)</Text>
              <Text style={styles.infoValue}>{creditAccount?.name ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View
              style={[
                styles.infoIconWrap,
                {
                  backgroundColor:
                    (interestCategory?.color ?? colors.primary) + '18',
                },
              ]}
            >
              <Icon
                source={(interestCategory?.icon as any) ?? 'tag-outline'}
                size={18}
                color={interestCategory?.color ?? colors.primary}
              />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Interest Category</Text>
              <Text style={styles.infoValue}>
                {interestCategory?.name ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Interest Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Interest Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Gross Interest</Text>
            <Text style={styles.breakdownValue}>
              {formatMoney(breakdown.gross, sym, 2)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>TDS ({fd.taxRate}%)</Text>
            <Text style={[styles.breakdownValue, { color: colors.expense }]}>
              -{formatMoney(breakdown.tds, sym, 2)}
            </Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { fontWeight: '700' }]}>
              Net Interest
            </Text>
            <Text
              style={[
                styles.breakdownValue,
                { color: colors.income, fontWeight: '800' },
              ]}
            >
              {formatMoney(breakdown.net, sym, 2)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { fontWeight: '700' }]}>
              Maturity Value
            </Text>
            <Text
              style={[
                styles.breakdownValue,
                { color: colors.primary, fontWeight: '800' },
              ]}
            >
              {formatMoney(breakdown.maturityValue, sym, 2)}
            </Text>
          </View>
        </View>

        {/* Linked Transactions */}
        {linkedTxns.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.txnSectionTitle}>Linked Transactions</Text>
            {linkedTxns.map((txn) => (
              <View key={txn.id} style={styles.txnRow}>
                <View
                  style={[
                    styles.txnDot,
                    {
                      backgroundColor:
                        txn.type === 'income' ? colors.income : colors.expense,
                    },
                  ]}
                />
                <View style={styles.txnInfo}>
                  <Text style={styles.txnNote} numberOfLines={1}>
                    {txn.note || txn.type}
                  </Text>
                  <Text style={styles.txnDate}>
                    {format(
                      new Date(txn.date.substring(0, 10) + 'T00:00:00'),
                      'MMM d, yyyy',
                    )}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txnAmount,
                    {
                      color:
                        txn.type === 'income' ? colors.income : colors.expense,
                    },
                  ]}
                >
                  {txn.type === 'income' ? '+' : '-'}
                  {formatMoney(txn.totalAmountCents, sym, 2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        {fd.status === 'active' && (
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <View style={styles.closeIconWrap}>
              <Icon
                source="lock-open-outline"
                size={18}
                color={colors.warning}
              />
            </View>
            <Text style={styles.closeText}>Close FD Early</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <View style={styles.deleteIconWrap}>
            <Icon source="trash-can-outline" size={18} color={colors.error} />
          </View>
          <Text style={styles.deleteText}>Delete FD</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

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
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.capsule,
    marginBottom: spacing.lg,
  },
  statusText: { fontSize: 13, fontWeight: '700' },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroAmount: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  heroRate: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  heroDot: { color: colors.textTertiary, fontSize: 14 },

  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  progressPct: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextCol: { flex: 1 },
  infoLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 36 + spacing.lg + spacing.md,
  },

  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  breakdownTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  breakdownLabel: { color: colors.textSecondary, fontSize: 14 },
  breakdownValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  breakdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  txnSectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  txnDot: { width: 8, height: 8, borderRadius: 4 },
  txnInfo: { flex: 1 },
  txnNote: { color: colors.text, fontSize: 14, fontWeight: '500' },
  txnDate: { color: colors.textTertiary, fontSize: 12, marginTop: 1 },
  txnAmount: { fontSize: 14, fontWeight: '700' },

  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.warning + '0A',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning + '20',
  },
  closeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warning + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: colors.warning, fontSize: 15, fontWeight: '600' },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.error + '0A',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error + '20',
  },
  deleteIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: { color: colors.error, fontSize: 15, fontWeight: '600' },
});
