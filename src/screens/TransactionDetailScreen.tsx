import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import type React from 'react';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, Text } from 'react-native-paper';
import type { TransactionWithSplits } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';
import { transactionService } from '../services/transactionService';
import { useAccountStore } from '../stores/useAccountStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { colors, elevation, radius, spacing } from '../theme';
import { formatDate, formatTimeShort } from '../utils/dates';
import { clampMoneyDecimalPlaces, formatMoney } from '../utils/money';

type TimelineNodeProps = {
  dotColor: string;
  label: string;
  isLast?: boolean;
  children: React.ReactNode;
};

function TimelineNode({ dotColor, label, isLast, children }: TimelineNodeProps) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineTrack}>
        <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={[styles.timelineContent, isLast && styles.timelineContentLast]}>
        <Text style={styles.nodeLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

export default function TransactionDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'TransactionDetail'>) {
  const { transactionId } = route.params;
  const { removeTransaction } = useTransactionStore();
  const { categories } = useCategoryStore();
  const { accounts } = useAccountStore();
  const { settings } = useSettingsStore();
  const moneyDecimals = clampMoneyDecimalPlaces(settings.decimalPlaces);

  const [transaction, setTransaction] = useState<TransactionWithSplits | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      transactionService.getById(transactionId).then((txn) => {
        setTransaction(txn);
        setLoading(false);
      });
    }, [transactionId]),
  );

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const category = transaction
    ? categories.find((c) => c.id === transaction.categoryId)
    : null;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!transaction) {
    return (
      <View style={styles.container}>
        <Text
          variant="bodyLarge"
          style={{ textAlign: 'center', marginTop: 40 }}
        >
          Transaction not found
        </Text>
      </View>
    );
  }

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const isSplit = !isTransfer && transaction.splits.length > 1;

  const handleEdit = () => {
    navigation.navigate('AddTransaction', { transactionId: transaction.id });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeTransaction(transaction.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const hasTime = transaction.date.includes('T');
  const dateLabel = formatDate(transaction.date);
  const timeLabel = hasTime ? formatTimeShort(transaction.date) : null;
  const heroIcon = isTransfer
    ? 'swap-horizontal-circle-outline'
    : isIncome
      ? 'arrow-down-circle-outline'
      : 'arrow-up-circle-outline';
  const heroLabel = isTransfer ? 'Transfer' : isIncome ? 'Income' : 'Expense';
  const amountPrefix = isTransfer ? '' : isIncome ? '+' : '-';
  const amountColor = isTransfer
    ? colors.transfer
    : isIncome
      ? colors.income
      : colors.expense;

  const { accountId: fromAid, account2Id: toAid } = transaction;
  const fromAcc =
    isTransfer && fromAid ? accountMap[fromAid] ?? null : null;
  const toAcc = isTransfer && toAid ? accountMap[toAid] ?? null : null;

  const hasNote = !!transaction.note;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Hero ── */}
      <LinearGradient
        colors={[...colors.cardGradient]}
        style={styles.hero}
      >
        <View style={[styles.heroIconCircle, { backgroundColor: amountColor + '25' }]}>
          <Icon source={heroIcon} size={30} color={amountColor} />
        </View>
        <View style={[styles.heroBadge, { backgroundColor: amountColor + '20' }]}>
          <Text style={[styles.heroBadgeText, { color: amountColor }]}>
            {heroLabel}
            {isSplit ? ' \u00B7 Split' : ''}
          </Text>
        </View>
        <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
          {amountPrefix}
          {formatMoney(
            transaction.totalAmountCents,
            settings.currencySymbol,
            moneyDecimals,
          )}
        </Text>
      </LinearGradient>

      {/* ── Timeline ── */}
      <View style={styles.timeline}>

        {/* Node: Date */}
        <TimelineNode
          dotColor={colors.textTertiary}
          label="Date"
          isLast={isTransfer ? !fromAcc && !toAcc && !hasNote : !category && transaction.splits.length === 0 && !hasNote}
        >
          <View style={styles.nodeCard}>
            <Icon source="calendar-month-outline" size={18} color={colors.textSecondary} />
            <Text variant="bodyLarge" style={styles.nodeValueText}>
              {dateLabel}
            </Text>
            {timeLabel && (
              <>
                <View style={styles.nodeDotSep} />
                <Icon source="clock-outline" size={16} color={colors.textSecondary} />
                <Text variant="bodyMedium" style={styles.nodeValueText}>
                  {timeLabel}
                </Text>
              </>
            )}
          </View>
        </TimelineNode>

        {/* Transfer: From / To nodes */}
        {isTransfer ? (
          <>
            <TimelineNode dotColor={colors.expense} label="From" isLast={false}>
              <View style={styles.nodeCard}>
                {fromAcc && (
                  <View style={[styles.iconBubble, { backgroundColor: colors.expense + '20' }]}>
                    <Icon source={fromAcc.icon as any} size={18} color={colors.expense} />
                  </View>
                )}
                <View style={styles.nodeCardBody}>
                  <Text variant="bodyLarge" style={styles.nodeValueText} numberOfLines={1}>
                    {fromAcc?.name ?? 'Unknown'}
                  </Text>
                  <Text variant="bodySmall" style={styles.nodeSubText}>
                    {formatMoney(transaction.totalAmountCents, settings.currencySymbol, moneyDecimals)}
                  </Text>
                </View>
              </View>
            </TimelineNode>

            <TimelineNode dotColor={colors.income} label="To" isLast={!hasNote}>
              <View style={styles.nodeCard}>
                {toAcc && (
                  <View style={[styles.iconBubble, { backgroundColor: colors.income + '20' }]}>
                    <Icon source={toAcc.icon as any} size={18} color={colors.income} />
                  </View>
                )}
                <View style={styles.nodeCardBody}>
                  <Text variant="bodyLarge" style={styles.nodeValueText} numberOfLines={1}>
                    {toAcc?.name ?? 'Unknown'}
                  </Text>
                  <Text variant="bodySmall" style={styles.nodeSubText}>
                    {formatMoney(transaction.totalAmountCents, settings.currencySymbol, moneyDecimals)}
                  </Text>
                </View>
              </View>
            </TimelineNode>
          </>
        ) : (
          <>
            {/* Node: Category */}
            <TimelineNode
              dotColor={category?.color ?? colors.primary}
              label="Category"
              isLast={false}
            >
              <View style={styles.nodeCard}>
                {category && (
                  <View style={[styles.iconBubble, { backgroundColor: (category.color ?? colors.primary) + '20' }]}>
                    <Icon source={category.icon as any} size={18} color={category.color} />
                  </View>
                )}
                <Text variant="bodyLarge" style={styles.nodeValueText} numberOfLines={1}>
                  {category?.name ?? 'Unknown'}
                </Text>
              </View>
            </TimelineNode>

            {/* Node: Account(s) / Split */}
            <TimelineNode
              dotColor={colors.primary}
              label={isSplit ? 'Split Breakdown' : 'Account'}
              isLast={!hasNote}
            >
              {transaction.splits.map((split, idx) => {
                const acc = accountMap[split.accountId];
                const tint = idx === 0 ? colors.primary : colors.secondary;
                return (
                  <View
                    key={split.id}
                    style={[styles.nodeCard, idx > 0 && { marginTop: spacing.sm }]}
                  >
                    {acc && (
                      <View style={[styles.iconBubble, { backgroundColor: tint + '20' }]}>
                        <Icon source={acc.icon as any} size={18} color={tint} />
                      </View>
                    )}
                    <View style={styles.nodeCardBody}>
                      <Text variant="bodyLarge" style={styles.nodeValueText} numberOfLines={1}>
                        {acc?.name ?? 'Unknown'}
                      </Text>
                      <Text variant="bodySmall" style={styles.nodeSubText}>
                        {formatMoney(split.amountCents, settings.currencySymbol, moneyDecimals)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </TimelineNode>
          </>
        )}

        {/* Node: Note (conditional) */}
        {hasNote && (
          <TimelineNode dotColor={amountColor} label="Note" isLast>
            <View style={styles.noteContainer}>
              <Text variant="bodyLarge" style={styles.noteText} numberOfLines={6}>
                {transaction.note}
              </Text>
            </View>
          </TimelineNode>
        )}
      </View>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleEdit}
          style={styles.editButton}
          labelStyle={styles.buttonLabel}
          icon="pencil"
        >
          Edit
        </Button>
        <Button
          mode="outlined"
          onPress={handleDelete}
          textColor={colors.error}
          style={styles.deleteButton}
          labelStyle={styles.buttonLabel}
          icon="delete"
        >
          Delete
        </Button>
      </View>
    </ScrollView>
  );
}

const TRACK_WIDTH = 24;
const DOT_SIZE = 12;
const LINE_WIDTH = 2;
const LINE_LEFT = (DOT_SIZE - LINE_WIDTH) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl },

  /* ── Hero ── */
  hero: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl + spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    ...elevation.lg,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.capsule,
    marginBottom: spacing.md,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroAmount: {
    color: colors.onPrimary,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },

  /* ── Timeline ── */
  timeline: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineTrack: {
    width: TRACK_WIDTH,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginTop: 2,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: DOT_SIZE + 2,
    bottom: 0,
    left: LINE_LEFT,
    width: LINE_WIDTH,
    backgroundColor: colors.outline,
    opacity: 0.25,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.xl,
    marginLeft: spacing.sm,
  },
  timelineContentLast: {
    paddingBottom: 0,
  },

  /* ── Node shared ── */
  nodeLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    ...elevation.sm,
  },
  nodeCardBody: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nodeValueText: {
    color: colors.text,
    fontWeight: '500',
    flexShrink: 1,
  },
  nodeSubText: {
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  nodeDotSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textTertiary,
  },

  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Note ── */
  noteContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...elevation.sm,
  },
  noteText: {
    color: colors.text,
    lineHeight: 22,
  },

  /* ── Actions ── */
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.capsule,
    ...elevation.md,
  },
  deleteButton: {
    flex: 1,
    borderColor: colors.error,
    borderRadius: radius.capsule,
  },
  buttonLabel: {
    paddingVertical: spacing.xs,
    fontWeight: '600',
    fontSize: 15,
  },
});
