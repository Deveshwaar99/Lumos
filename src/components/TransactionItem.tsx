import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import { formatDateTimeShort } from '../utils/dates';
import type { TransactionWithSplits, Category, Account } from '../models/types';

const BADGE_COLORS = [
  '#FC4C02',
  '#5C6BC0',
  '#26A69A',
  '#AB47BC',
  '#42A5F5',
  '#FF7043',
  '#78909C',
  '#8D6E63',
  '#EC407A',
  '#9CCC65',
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
  currencySymbol?: string;
  decimalPlaces?: number;
  onPress: () => void;
}

function TransactionItemComponent({
  transaction,
  category,
  accountMap,
  currencySymbol,
  decimalPlaces,
  onPress,
}: TransactionItemProps) {
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const amountColor = isTransfer
    ? colors.transfer
    : isIncome
      ? colors.income
      : colors.expense;
  const prefix = isTransfer ? '' : isIncome ? '+' : '-';

  const iconSource = isTransfer
    ? 'swap-horizontal'
    : (category?.icon ?? 'help-circle');
  const iconColor = isTransfer
    ? colors.transfer
    : (category?.color ?? colors.textSecondary);
  const iconBg = isTransfer
    ? `${colors.transfer}18`
    : `${category?.color ?? colors.textSecondary}18`;

  const titleText = isTransfer ? 'Transfer' : (category?.name ?? 'Unknown');

const { accountId: fromAid, account2Id: toAid } = transaction;
  const fromAcc =
    isTransfer && fromAid ? accountMap[fromAid] ?? null : null;
  const toAcc = isTransfer && toAid ? accountMap[toAid] ?? null : null;

  const amountStr = formatMoney(
    transaction.totalAmountCents,
    currencySymbol,
    decimalPlaces,
  );
  const accessibilityLabel = `${titleText}, ${prefix}${amountStr}`;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Icon source={iconSource as any} size={20} color={iconColor} />
      </View>
      <View style={styles.details}>
        <Text variant="bodyLarge" numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
          {titleText}
        </Text>
        {isTransfer ? (
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: `${colors.transfer}22` },
              ]}
            >
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.badgeText, { color: colors.transfer }]}>
                {fromAcc?.name ?? '?'} → {toAcc?.name ?? '?'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.badgeRow}>
            {transaction.splits.map((s) => {
              const acc = accountMap[s.accountId];
              const name = acc?.name ?? '?';
              const badgeColor = hashColor(name);
              return (
                <View
                  key={s.id}
                  style={[styles.badge, { backgroundColor: `${badgeColor}22` }]}
                >
                  <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.badgeText, { color: badgeColor }]}>
                    {name}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        {transaction.note ? (
          <Text variant="bodySmall" style={styles.note} numberOfLines={1} ellipsizeMode="tail">
            {transaction.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text
          variant="titleSmall"
          numberOfLines={1}
          style={{ color: amountColor, fontWeight: '600' }}
        >
          {prefix}
          {formatMoney(transaction.totalAmountCents, currencySymbol, decimalPlaces)}
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
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  right: { alignItems: 'flex-end', marginLeft: 8, flexShrink: 0 },
  date: { color: colors.textTertiary, marginTop: 2 },
});
