import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { FAB, Snackbar, Icon, Text, Menu } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import EmptyState from '../components/EmptyState';
import type { TabScreenProps } from '../navigation/types';
import type { Account } from '../models/types';

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  savings: '#4CAF50',
  bank: '#42A5F5',
  cash: '#FFA726',
  card: '#EF5350',
  other: '#AB47BC',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  savings: 'Savings',
  bank: 'Bank',
  cash: 'Cash / Wallet',
  card: 'Credit Cards',
  other: 'Other',
};

export default function AccountsScreen({ navigation }: TabScreenProps<'Accounts'>) {
  const { accounts, balances, loadAccounts, removeAccount } = useAccountStore();
  const { settings } = useSettingsStore();
  const [snackbar, setSnackbar] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const currency = settings.baseCurrency;

  useFocusEffect(useCallback(() => {
    loadAccounts();
  }, []));

  const portfolioData = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    const typeGroups: Record<string, number> = {};

    for (const acc of accounts) {
      const bal = balances[acc.id] ?? acc.openingBalanceCents;
      const accType = acc.type;

      if (!typeGroups[accType]) typeGroups[accType] = 0;
      typeGroups[accType] += bal;

      if (accType === 'card' || bal < 0) {
        totalLiabilities += Math.abs(bal);
      } else {
        totalAssets += bal;
      }
    }

    const typeEntries = Object.entries(typeGroups)
      .filter(([, amount]) => amount !== 0 || accounts.some(a => a.type === Object.keys(typeGroups).find(k => typeGroups[k] === amount)))
      .map(([type, amount]) => ({
        type,
        label: ACCOUNT_TYPE_LABELS[type] || type,
        color: ACCOUNT_TYPE_COLORS[type] || '#AB47BC',
        amount,
      }));

    return { totalAssets, totalLiabilities, typeEntries };
  }, [accounts, balances]);

  const handleDelete = useCallback(async (acc: Account) => {
    setMenuVisible(null);
    Alert.alert('Delete Account', `Delete "${acc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const result = await removeAccount(acc.id);
          if (!result.success) {
            setSnackbar(result.message || 'Cannot delete account');
          }
        },
      },
    ]);
  }, [removeAccount]);

  const handleEdit = useCallback((acc: Account) => {
    setMenuVisible(null);
    navigation.navigate('AccountForm', { accountId: acc.id });
  }, [navigation]);

  const getAccountTypeIcon = (type: Account['type']) => {
    const icons: Record<string, string> = {
      cash: 'cash',
      bank: 'bank',
      card: 'credit-card-outline',
      savings: 'piggy-bank-outline',
      other: 'wallet-outline',
    };
    return icons[type] || 'wallet-outline';
  };

  const renderPortfolioCard = () => (
    <View style={styles.portfolioCard}>
      <Text style={styles.portfolioTitle}>My Portfolio</Text>

      <View style={styles.portfolioRow}>
        <View style={[styles.portfolioDot, { backgroundColor: colors.income }]} />
        <Text style={styles.portfolioLabel}>Total Assets</Text>
      </View>
      <Text style={styles.portfolioAssetAmount}>
        {formatMoney(portfolioData.totalAssets, currency)}
      </Text>

      <View style={[styles.portfolioRow, { marginTop: spacing.md }]}>
        <View style={[styles.portfolioDot, { backgroundColor: colors.warning }]} />
        <Text style={styles.portfolioLabel}>Total Liabilities</Text>
      </View>
      <Text style={styles.portfolioLiabilityAmount}>
        {formatMoney(portfolioData.totalLiabilities, currency)}
      </Text>

      {portfolioData.typeEntries.length > 0 && (
        <View style={styles.typeGrid}>
          {portfolioData.typeEntries.map((entry) => (
            <View key={entry.type} style={styles.typeGridItem}>
              <View style={[styles.typeDot, { backgroundColor: entry.color }]} />
              <Text style={styles.typeLabel}>{entry.label}</Text>
              <Text style={[
                styles.typeAmount,
                entry.amount < 0 && { color: colors.expense },
              ]}>
                {formatMoney(entry.amount, currency)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: Account }) => {
    const balance = balances[item.id] ?? item.openingBalanceCents;
    return (
      <View style={styles.accountCard}>
        <TouchableOpacity
          style={styles.accountContent}
          onPress={() => (navigation as any).navigate('AccountTransactions', { accountId: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.accountIcon}>
            <Icon source={getAccountTypeIcon(item.type) as any} size={24} color={colors.primary} />
          </View>
          <View style={styles.accountDetails}>
            <Text variant="bodyLarge" style={styles.accountName}>{item.name}</Text>
            <Text variant="titleMedium" style={[styles.accountBalance, balance < 0 && { color: colors.expense }]}>
              {formatMoney(balance, item.currency)}
            </Text>
          </View>
          <Menu
            visible={menuVisible === item.id}
            onDismiss={() => setMenuVisible(null)}
            anchor={
              <TouchableOpacity onPress={() => setMenuVisible(item.id)} hitSlop={12}>
                <Icon source="dots-vertical" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            }
            contentStyle={styles.menuContent}
          >
            <Menu.Item onPress={() => handleEdit(item)} title="Edit" leadingIcon="pencil" />
            <Menu.Item onPress={() => handleDelete(item)} title="Delete" leadingIcon="delete-outline" />
          </Menu>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {accounts.length === 0 ? (
        <EmptyState icon="wallet-outline" title="No Accounts" subtitle="Add your first account" />
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderPortfolioCard}
          contentContainerStyle={styles.listContent}
        />
      )}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 10 }]}
        onPress={() => navigation.navigate('AccountForm')}
        color="#fff"
      />
      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 100 },

  portfolioCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  portfolioTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  portfolioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  portfolioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  portfolioLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  portfolioAssetAmount: {
    color: colors.income,
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginLeft: spacing.lg,
  },
  portfolioLiabilityAmount: {
    color: colors.warning,
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginLeft: spacing.lg,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  typeGridItem: {
    width: '50%',
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  typeLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  typeAmount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },

  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: 14,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountDetails: { flex: 1 },
  accountName: { color: colors.text, fontWeight: '600' },
  accountBalance: { color: colors.text, fontWeight: '700', marginTop: 2 },
  menuContent: { backgroundColor: colors.surfaceVariant },
  fab: { position: 'absolute', right: spacing.lg, backgroundColor: colors.primary },
});
