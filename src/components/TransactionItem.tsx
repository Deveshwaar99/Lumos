import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import { formatDateShort } from '../utils/dates';
import type { TransactionWithSplits, Category, Account } from '../models/types';

interface TransactionItemProps {
  transaction: TransactionWithSplits;
  category?: Category;
  accountMap: Record<string, Account>;
  onPress: () => void;
}

function TransactionItemComponent({
  transaction,
  category,
  accountMap,
  onPress,
}: TransactionItemProps) {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.income : colors.expense;
  const prefix = isIncome ? '+' : '-';

  const splitLabel = transaction.splits
    .map((s) => {
      const acc = accountMap[s.accountId];
      return `${acc?.name ?? '?'} ${formatMoney(s.amountCents, transaction.currency)}`;
    })
    .join(', ');

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: (category?.color ?? colors.textSecondary) + '18' },
        ]}
      >
        <Icon
          source={(category?.icon ?? 'help-circle') as any}
          size={22}
          color={category?.color ?? colors.textSecondary}
        />
      </View>
      <View style={styles.details}>
        <Text variant="bodyLarge" numberOfLines={1} style={styles.title}>
          {category?.name ?? 'Unknown'}
        </Text>
        <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
          {splitLabel}
          {transaction.note ? ` · ${transaction.note}` : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <Text variant="titleSmall" style={{ color: amountColor, fontWeight: '600' }}>
          {prefix}{formatMoney(transaction.totalAmountCents, transaction.currency)}
        </Text>
        <Text variant="bodySmall" style={styles.date}>
          {formatDateShort(transaction.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default memo(TransactionItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: { flex: 1, marginLeft: spacing.md },
  title: { color: colors.text, fontWeight: '600', fontSize: 15 },
  subtitle: { color: colors.textSecondary, marginTop: 3 },
  right: { alignItems: 'flex-end' },
  date: { color: colors.textTertiary, marginTop: 3 },
});
