import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { FAB, Snackbar, Icon, Text, Menu } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { analyticsService } from '../services/analyticsService';
import { getCurrentMonth } from '../utils/dates';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import EmptyState from '../components/EmptyState';
import type { TabScreenProps } from '../navigation/types';
import type { Account, MonthSummary } from '../models/types';

export default function AccountsScreen({ navigation }: TabScreenProps<'Accounts'>) {
  const { accounts, balances, loading, loadAccounts, removeAccount } = useAccountStore();
  const { settings } = useSettingsStore();
  const [snackbar, setSnackbar] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [summary, setSummary] = useState<MonthSummary>({ totalIncome: 0, totalExpense: 0, net: 0 });
  const insets = useSafeAreaInsets();
  const currency = settings.baseCurrency;

  useFocusEffect(useCallback(() => {
    loadAccounts();
    analyticsService.getMonthSummary(getCurrentMonth()).then(setSummary).catch(() => {});
  }, []));

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + (balances[a.id] ?? a.openingBalanceCents), 0),
    [accounts, balances],
  );

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

  const renderOverallCard = () => (
    <View style={styles.overallCard}>
      <Text variant="labelMedium" style={styles.overallTitle}>OVERALL</Text>
      <View style={styles.overallRow}>
        <View style={styles.overallItem}>
          <Text variant="labelSmall" style={styles.overallLabel}>EXPENSE</Text>
          <Text variant="titleSmall" style={{ color: colors.expense, fontWeight: '700' }}>
            {formatMoney(summary.totalExpense, currency)}
          </Text>
        </View>
        <View style={styles.overallItem}>
          <Text variant="labelSmall" style={styles.overallLabel}>INCOME</Text>
          <Text variant="titleSmall" style={{ color: colors.income, fontWeight: '700' }}>
            {formatMoney(summary.totalIncome, currency)}
          </Text>
        </View>
        <View style={styles.overallItem}>
          <Text variant="labelSmall" style={styles.overallLabel}>BALANCE</Text>
          <Text variant="titleSmall" style={{ color: totalBalance >= 0 ? colors.income : colors.expense, fontWeight: '700' }}>
            {formatMoney(totalBalance, currency)}
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
          onPress={() => navigation.navigate('AccountForm', { accountId: item.id })}
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
          ListHeaderComponent={renderOverallCard}
          contentContainerStyle={styles.listContent}
        />
      )}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 76 }]}
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
  overallCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  overallTitle: {
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between' },
  overallItem: { flex: 1 },
  overallLabel: { color: colors.textSecondary, marginBottom: 4, letterSpacing: 0.5 },
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
