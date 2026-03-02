import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme';
import { formatMoney } from '../../utils/money';
import type { AccountBalance } from '../../models/types';

const BAR_COLORS = [
  '#4CAF50',
  '#2196F3',
  '#FF9800',
  '#9C27B0',
  '#F44336',
  '#00BCD4',
];

interface AccountContributionBarProps {
  data: AccountBalance[];
  currency?: string;
  currencySymbol?: string;
}

export default function AccountContributionBar({
  data,
  currency = 'USD',
  currencySymbol,
}: AccountContributionBarProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>
          No accounts
        </Text>
      </View>
    );
  }

  const maxBalance = Math.max(...data.map((d) => Math.abs(d.balance)), 1);

  return (
    <View style={styles.container}>
      {data.map((item, index) => {
        const width = Math.max((Math.abs(item.balance) / maxBalance) * 100, 2);
        const color = BAR_COLORS[index % BAR_COLORS.length];
        return (
          <View key={item.accountId} style={styles.barRow}>
            <Text variant="bodySmall" style={styles.label} numberOfLines={1}>
              {item.accountName}
            </Text>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  { width: `${width}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text
              variant="bodySmall"
              style={[
                styles.value,
                item.balance < 0 && { color: colors.error },
              ]}
            >
              {formatMoney(item.balance, currency, 2, currencySymbol)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 40 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  label: { width: 80, color: colors.text, fontSize: 12 },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: colors.border + '40',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  bar: { height: 20, borderRadius: 4 },
  value: { width: 80, textAlign: 'right', color: colors.text, fontSize: 12 },
});
