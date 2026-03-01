import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Icon, Button, Divider } from 'react-native-paper';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useAccountStore } from '../stores/useAccountStore';
import { transactionService } from '../services/transactionService';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import { formatDate } from '../utils/dates';
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

  useEffect(() => {
    transactionService.getById(transactionId).then(setTransaction);
  }, [transactionId]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content style={styles.amountSection}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: isIncome ? colors.incomeBg : colors.expenseBg },
            ]}
          >
            <Text style={{ color: isIncome ? colors.income : colors.expense, fontWeight: '600' }}>
              {isIncome ? 'Income' : 'Expense'}
              {isSplit ? ' (Split)' : ''}
            </Text>
          </View>
          <Text
            variant="headlineLarge"
            style={{
              color: isIncome ? colors.income : colors.expense,
              fontWeight: 'bold',
              marginTop: spacing.sm,
            }}
          >
            {isIncome ? '+' : '-'}
            {formatMoney(transaction.totalAmountCents, transaction.currency)}
          </Text>
          <Text variant="bodyMedium" style={styles.date}>
            {formatDate(transaction.date)}
          </Text>
        </Card.Content>
      </Card>

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
  card: { marginBottom: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg },
  amountSection: { alignItems: 'center', paddingVertical: spacing.xxl },
  typeBadge: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.full },
  date: { color: colors.textSecondary, marginTop: spacing.xs },
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
