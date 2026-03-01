import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { FAB, Snackbar, Icon, Text, Menu } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAccountStore } from '../stores/useAccountStore';
import { useFDStore } from '../stores/useFDStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import { getDaysRemaining, calculateFDInterest, calculateNetInterest } from '../utils/fdCalculator';
import EmptyState from '../components/EmptyState';
import type { TabScreenProps } from '../navigation/types';
import type { Account, FixedDeposit } from '../models/types';

type Tab = 'accounts' | 'investments';

const STATUS_COLORS: Record<string, string> = {
  active: colors.income,
  matured: colors.primary,
  closed: colors.textSecondary,
};

export default function AccountsScreen({ navigation }: TabScreenProps<'Accounts'>) {
  const { accounts, balances, loadAccounts, removeAccount } = useAccountStore();
  const { deposits, fdAccountIds, loadDeposits } = useFDStore();
  const { settings } = useSettingsStore();
  const [snackbar, setSnackbar] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('accounts');
  const insets = useSafeAreaInsets();
  const currency = settings.baseCurrency;

  useFocusEffect(useCallback(() => {
    loadAccounts();
    loadDeposits();
  }, []));

  const userAccounts = useMemo(
    () => accounts.filter((a) => !fdAccountIds.has(a.id)),
    [accounts, fdAccountIds]
  );

  const portfolioData = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const acc of userAccounts) {
      const bal = balances[acc.id] ?? acc.openingBalanceCents;
      if (acc.type === 'card' || bal < 0) {
        totalLiabilities += Math.abs(bal);
      } else {
        totalAssets += bal;
      }
    }

    for (const fd of deposits) {
      if (fd.status === 'active') {
        totalAssets += fd.principalCents;
      }
    }

    const netBalance = totalAssets - totalLiabilities;
    return { totalAssets, totalLiabilities, netBalance };
  }, [userAccounts, balances, deposits]);

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
        {formatMoney(portfolioData.netBalance, currency, 2, settings.currencySymbol)}
      </Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={styles.summaryHeader}>
            <View style={[styles.portfolioDot, { backgroundColor: colors.income }]} />
            <Text style={styles.summaryLabel}>Assets</Text>
          </View>
          <Text style={[styles.summaryAmount, { color: colors.income }]}>
            {formatMoney(portfolioData.totalAssets, currency, 2, settings.currencySymbol)}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <View style={styles.summaryHeader}>
            <View style={[styles.portfolioDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.summaryLabel}>Liabilities</Text>
          </View>
          <Text style={[styles.summaryAmount, { color: colors.warning }]}>
            {formatMoney(portfolioData.totalLiabilities, currency, 2, settings.currencySymbol)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSegmentedControl = () => (
    <View style={styles.segmentContainer}>
      <TouchableOpacity
        style={[styles.segmentTab, activeTab === 'accounts' && styles.segmentTabActive]}
        onPress={() => setActiveTab('accounts')}
      >
        <Icon
          source="wallet"
          size={16}
          color={activeTab === 'accounts' ? colors.onPrimary : colors.textSecondary}
        />
        <Text style={[styles.segmentText, activeTab === 'accounts' && styles.segmentTextActive]}>
          Accounts
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.segmentTab, activeTab === 'investments' && styles.segmentTabActive]}
        onPress={() => setActiveTab('investments')}
      >
        <Icon
          source="lock"
          size={16}
          color={activeTab === 'investments' ? colors.onPrimary : colors.textSecondary}
        />
        <Text style={[styles.segmentText, activeTab === 'investments' && styles.segmentTextActive]}>
          Investments
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAccountItem = ({ item }: { item: Account }) => {
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
              {formatMoney(balance, item.currency, 2, settings.currencySymbol)}
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

  const renderFDItem = ({ item }: { item: FixedDeposit }) => {
    const daysLeft = getDaysRemaining(item.maturityDate);
    const statusColor = STATUS_COLORS[item.status] ?? colors.textSecondary;
    const gross = calculateFDInterest(item.principalCents, item.annualInterestRate, item.startDate, item.maturityDate);
    const net = calculateNetInterest(gross, item.taxRate);
    const maturityLabel = format(new Date(item.maturityDate + 'T00:00:00'), 'MMM d, yyyy');

    return (
      <TouchableOpacity
        style={styles.fdCard}
        onPress={() => (navigation as any).navigate('FDDetail', { fdId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.fdHeader}>
          <View style={styles.fdIconWrap}>
            <Icon source="lock" size={22} color={colors.primary} />
          </View>
          <View style={styles.fdHeaderText}>
            <Text style={styles.fdLabel} numberOfLines={1}>
              {item.note || `FD — ${item.annualInterestRate}%`}
            </Text>
            <View style={[styles.fdStatusBadge, { backgroundColor: statusColor + '18' }]}>
              <Text style={[styles.fdStatusText, { color: statusColor }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.fdBody}>
          <View style={styles.fdStat}>
            <Text style={styles.fdStatLabel}>Principal</Text>
            <Text style={styles.fdStatValue}>
              {formatMoney(item.principalCents, currency, 2, settings.currencySymbol)}
            </Text>
          </View>
          <View style={styles.fdStatDivider} />
          <View style={styles.fdStat}>
            <Text style={styles.fdStatLabel}>Net Interest</Text>
            <Text style={[styles.fdStatValue, { color: colors.income }]}>
              {formatMoney(net, currency, 2, settings.currencySymbol)}
            </Text>
          </View>
        </View>

        <View style={styles.fdFooter}>
          <View style={styles.fdFooterItem}>
            <Icon source="percent-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.fdFooterText}>{item.annualInterestRate}% p.a.</Text>
          </View>
          <View style={styles.fdFooterItem}>
            <Icon source="calendar-end" size={14} color={colors.textTertiary} />
            <Text style={styles.fdFooterText}>{maturityLabel}</Text>
          </View>
          {item.status === 'active' && (
            <View style={styles.fdFooterItem}>
              <Icon source="clock-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.fdFooterText}>{daysLeft}d left</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderAccountsList = () => (
    <>
      {userAccounts.length === 0 ? (
        <EmptyState icon="wallet-outline" title="No Accounts" subtitle="Add your first account" />
      ) : (
        <FlatList
          data={userAccounts}
          keyExtractor={item => item.id}
          renderItem={renderAccountItem}
          ListHeaderComponent={<>{renderPortfolioCard()}{renderSegmentedControl()}</>}
          contentContainerStyle={styles.listContent}
        />
      )}
    </>
  );

  const renderInvestmentsList = () => (
    <>
      {deposits.length === 0 ? (
        <View style={styles.emptyInvestments}>
          {renderPortfolioCard()}
          {renderSegmentedControl()}
          <EmptyState icon="lock" title="No Fixed Deposits" subtitle="Create your first FD" />
        </View>
      ) : (
        <FlatList
          data={deposits}
          keyExtractor={item => item.id}
          renderItem={renderFDItem}
          ListHeaderComponent={<>{renderPortfolioCard()}{renderSegmentedControl()}</>}
          contentContainerStyle={styles.listContent}
        />
      )}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {activeTab === 'accounts' ? renderAccountsList() : renderInvestmentsList()}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 10 }]}
        onPress={() => {
          if (activeTab === 'investments') {
            (navigation as any).navigate('FDForm');
          } else {
            navigation.navigate('AccountForm');
          }
        }}
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
  emptyInvestments: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xl - 2,
    gap: spacing.xs + 1,
  },
  segmentTabActive: {
    backgroundColor: colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },

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

  fdCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  fdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  fdIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fdHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fdLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  fdStatusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.capsule,
  },
  fdStatusText: { fontSize: 11, fontWeight: '700' },

  fdBody: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  fdStat: { flex: 1 },
  fdStatLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fdStatValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  fdStatDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },

  fdFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.lg,
  },
  fdFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fdFooterText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
  },

  fab: { position: 'absolute', right: spacing.lg, backgroundColor: colors.primary },
});
