import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import { formatDateTimeShort } from '../utils/dates';
import type { TransactionWithSplits, Category, Account } from '../models/types';

const BADGE_COLORS = [
  '#FC4C02', '#5C6BC0', '#26A69A', '#AB47BC', '#42A5F5',
  '#FF7043', '#78909C', '#8D6E63', '#EC407A', '#9CCC65',
];

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

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
          size={20}
          color={category?.color ?? colors.textSecondary}
        />
      </View>
      <View style={styles.details}>
        <Text variant="bodyLarge" numberOfLines={1} style={styles.title}>
          {category?.name ?? 'Unknown'}
        </Text>
        <View style={styles.badgeRow}>
          {transaction.splits.map((s) => {
            const acc = accountMap[s.accountId];
            const name = acc?.name ?? '?';
            const badgeColor = hashColor(name);
            return (
              <View key={s.id} style={[styles.badge, { backgroundColor: badgeColor + '22' }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>{name}</Text>
              </View>
            );
          })}
        </View>
        {transaction.note ? (
          <Text variant="bodySmall" style={styles.note} numberOfLines={1}>
            {transaction.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text variant="titleSmall" style={{ color: amountColor, fontWeight: '600' }}>
          {prefix}{formatMoney(transaction.totalAmountCents, transaction.currency)}
        </Text>
        <Text variant="bodySmall" style={styles.date}>
          {formatDateTimeShort(transaction.date)}
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
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: { flex: 1, marginLeft: spacing.md },
  title: { color: colors.text, fontWeight: '600', fontSize: 15 },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.capsule,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  note: { color: colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', marginLeft: 8 },
  date: { color: colors.textTertiary, marginTop: 2 },
});
