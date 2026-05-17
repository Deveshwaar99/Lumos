import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import type { Account, Category, TransactionWithSplits } from '../models/types';
import { colors, spacing } from '../theme';
import { formatDateTimeShort } from '../utils/dates';
import { formatMoney } from '../utils/money';
import AmountText from './ui/AmountText';
import { Chip } from './ui/Chip';

const BADGE_COLORS = [
  '#FC4C02',
  '#6FB7FF',
  '#34D8C9',
  '#AB47BC',
  '#42A5F5',
  '#FF8A65',
  '#78909C',
  '#A1887F',
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
  const signPrefix = isTransfer ? '' : isIncome ? '+' : '-';

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
  const accessibilityLabel = `${titleText}, ${signPrefix}${amountStr}`;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: iconBg, borderColor: `${iconColor}40` },
        ]}
      >
        <Icon source={iconSource as any} size={20} color={iconColor} />
      </View>
      <View style={styles.details}>
        <Text variant="bodyLarge" numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
          {titleText}
        </Text>
        {isTransfer ? (
          <View style={styles.badgeRow}>
            <Chip
              label={`${fromAcc?.name ?? '?'} → ${toAcc?.name ?? '?'}`}
              backgroundColor={`${colors.transfer}22`}
              textColor={colors.transfer}
            />
          </View>
        ) : (
          <View style={styles.badgeRow}>
            {transaction.splits.map((s) => {
              const acc = accountMap[s.accountId];
              const name = acc?.name ?? '?';
              const badgeColor = hashColor(name);
              return (
                <Chip
                  key={s.id}
                  label={name}
                  backgroundColor={`${badgeColor}22`}
                  textColor={badgeColor}
                />
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
        <AmountText
          cents={transaction.totalAmountCents}
          currencySymbol={currencySymbol}
          decimalPlaces={decimalPlaces}
          signPrefix={signPrefix}
          tone="custom"
          customColor={amountColor}
          size="body"
          numberOfLines={1}
        />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  details: { flex: 1, marginLeft: spacing.md },
  title: { color: colors.text, fontWeight: '600', fontSize: 15 },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  note: { color: colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', marginLeft: 8, flexShrink: 0 },
  date: { color: colors.textTertiary, marginTop: 2 },
});
