import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Icon, Button, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useAccountStore } from '../stores/useAccountStore';
import { transactionService } from '../services/transactionService';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import { formatDate, formatTimeShort } from '../utils/dates';
import type { TransactionWithSplits } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';

export default function TransactionDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'TransactionDetail'>) {
  const { transactionId } = route.params;
  const { removeTransaction } = useTransactionStore();
  const { categories } = useCategoryStore();
  const { accounts } = useAccountStore();

  const [transaction, setTransaction] = useState<TransactionWithSplits | null>(null);

  useFocusEffect(
    useCallback(() => {
      transactionService.getById(transactionId).then(setTransaction);
    }, [transactionId])
  );

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const category = transaction ? categories.find((c) => c.id === transaction.categoryId) : null;

  if (!transaction) {
    return (
      <View style={styles.container}>
        <Text variant="bodyLarge" style={{ textAlign: 'center', marginTop: 40 }}>
          Transaction not found
        </Text>
      </View>
    );
  }

  const isIncome = transaction.type === 'income';
  const isSplit = transaction.splits.length > 1;

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
      ]
    );
  };

  const hasTime = transaction.date.includes('T');
  const dateLabel = formatDate(transaction.date);
  const timeLabel = hasTime ? formatTimeShort(transaction.date) : null;
  const heroBackground = isIncome ? '#1B5E20' : '#7F1D1D';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: heroBackground }]}>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Icon
              source={isIncome ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
              size={16}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.heroBadgeText}>
              {isIncome ? 'Income' : 'Expense'}
              {isSplit ? ' \u00B7 Split' : ''}
            </Text>
          </View>
        </View>
        <Text style={styles.heroAmount}>
          {isIncome ? '+' : '-'}
          {formatMoney(transaction.totalAmountCents, transaction.currency)}
        </Text>
        <View style={styles.heroDateRow}>
          <Icon source="calendar-outline" size={14} color="rgba(255,255,255,0.65)" />
          <Text style={styles.heroDateText}>{dateLabel}</Text>
          {timeLabel && (
            <>
              <Text style={styles.heroDot}>{'\u00B7'}</Text>
              <Icon source="clock-outline" size={14} color="rgba(255,255,255,0.65)" />
              <Text style={styles.heroDateText}>{timeLabel}</Text>
            </>
          )}
        </View>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.detailLabel}>Category</Text>
            <View style={styles.detailValue}>
              {category && (
                <Icon source={category.icon as any} size={18} color={category.color} />
              )}
              <Text variant="bodyLarge">{category?.name ?? 'Unknown'}</Text>
            </View>
          </View>

          <Divider />

          <Text variant="titleSmall" style={styles.splitHeader}>
            {isSplit ? 'Split Breakdown' : 'Account'}
          </Text>
          {transaction.splits.map((split, idx) => {
            const acc = accountMap[split.accountId];
            return (
              <View key={split.id} style={styles.splitRow}>
                <View style={styles.detailValue}>
                  {acc && <Icon source={acc.icon as any} size={18} color={idx === 0 ? colors.primary : colors.secondary} />}
                  <Text variant="bodyLarge">{acc?.name ?? 'Unknown'}</Text>
                </View>
                <Text variant="bodyLarge" style={{ fontWeight: '600' }}>
                  {formatMoney(split.amountCents, transaction.currency)}
                </Text>
              </View>
            );
          })}

          {transaction.note && (
            <View>
              <Divider style={{ marginTop: spacing.sm }} />
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>Note</Text>
                <Text variant="bodyLarge" style={{ flex: 1, textAlign: 'right' }}>{transaction.note}</Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="contained" onPress={handleEdit} style={styles.editButton} icon="pencil">
          Edit
        </Button>
        <Button mode="outlined" onPress={handleDelete} textColor={colors.error} style={styles.deleteButton} icon="delete">
          Delete
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },

  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.capsule,
  },
  heroBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroDateText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '500',
  },
  heroDot: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginHorizontal: spacing.xxs,
  },

  card: { marginBottom: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  detailLabel: { color: colors.textSecondary },
  detailValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  splitHeader: { marginTop: spacing.md, marginBottom: spacing.sm, color: colors.text },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  editButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.capsule },
  deleteButton: { flex: 1, borderColor: colors.error, borderRadius: radius.capsule },
});
