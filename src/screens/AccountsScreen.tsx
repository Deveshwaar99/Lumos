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

    for (const acc of accounts) {
      const bal = balances[acc.id] ?? acc.openingBalanceCents;

      if (acc.type === 'card' || bal < 0) {
        totalLiabilities += Math.abs(bal);
      } else {
        totalAssets += bal;
      }
    }

    const netBalance = totalAssets - totalLiabilities;
    return { totalAssets, totalLiabilities, netBalance };
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

      <Text style={styles.balanceCaption}>Total Balance</Text>
      <Text style={[
        styles.balanceHero,
        { color: portfolioData.netBalance >= 0 ? colors.income : colors.expense },
      ]}>
        {formatMoney(portfolioData.netBalance, currency)}
      </Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={styles.summaryHeader}>
            <View style={[styles.portfolioDot, { backgroundColor: colors.income }]} />
            <Text style={styles.summaryLabel}>Assets</Text>
          </View>
          <Text style={[styles.summaryAmount, { color: colors.income }]}>
            {formatMoney(portfolioData.totalAssets, currency)}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <View style={styles.summaryHeader}>
            <View style={[styles.portfolioDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.summaryLabel}>Liabilities</Text>
          </View>
          <Text style={[styles.summaryAmount, { color: colors.warning }]}>
            {formatMoney(portfolioData.totalLiabilities, currency)}
          </Text>
        </View>
      </View>
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
  balanceCaption: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceHero: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryItem: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xxs,
  },
  portfolioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
