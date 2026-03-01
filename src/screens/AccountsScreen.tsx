import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { FAB, Snackbar, Icon, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccountStore } from '../stores/useAccountStore';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import EmptyState from '../components/EmptyState';
import type { TabScreenProps } from '../navigation/types';
import type { Account } from '../models/types';

export default function AccountsScreen({ navigation }: TabScreenProps<'Accounts'>) {
  const { accounts, balances, loading, loadAccounts, removeAccount } = useAccountStore();
  const [snackbar, setSnackbar] = useState('');
  const insets = useSafeAreaInsets();

  useFocusEffect(useCallback(() => { loadAccounts(); }, []));

  const handleDelete = useCallback(async (acc: Account) => {
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

  const getAccountTypeLabel = (type: Account['type']) => {
    const labels: Record<string, string> = { cash: 'Cash', bank: 'Bank', card: 'Card', savings: 'Savings', other: 'Other' };
    return labels[type] || type;
  };

  const renderItem = ({ item, index }: { item: Account; index: number }) => {
    const balance = balances[item.id] ?? item.openingBalanceCents;
    const isLast = index === accounts.length - 1;
    return (
      <>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('AccountForm', { accountId: item.id })}
          onLongPress={() => handleDelete(item)}
          activeOpacity={0.6}
        >
          <View style={styles.iconContainer}>
            <Icon source={item.icon as any} size={22} color={colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text variant="bodyLarge" style={styles.rowTitle}>{item.name}</Text>
            <Text variant="bodySmall" style={styles.rowSubtitle}>{getAccountTypeLabel(item.type)}</Text>
          </View>
          <Text variant="titleMedium" style={[styles.balance, balance < 0 && styles.negative]}>
            {formatMoney(balance, item.currency)}
          </Text>
        </TouchableOpacity>
        {!isLast && <View style={styles.divider} />}
      </>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: spacing.cardInset,
    backgroundColor: colors.surface,
    gap: 12,
  },
  iconContainer: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.primaryContainer,
  },
  rowContent: { flex: 1 },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowSubtitle: { color: colors.textSecondary, marginTop: 2 },
  balance: { color: colors.text, fontWeight: '700' },
  negative: { color: colors.error },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.cardInset + 54 },
  fab: { position: 'absolute', right: spacing.lg, backgroundColor: colors.primary },
});
