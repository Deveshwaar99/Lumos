import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { FAB, Snackbar, Icon, Text, Menu } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useAccountStore } from '../stores/useAccountStore';
import { useFDStore } from '../stores/useFDStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, spacing, radius, elevation } from '../theme';
import { formatMoney } from '../utils/money';
import {
  getDaysRemaining,
  calculateFDInterest,
  calculateNetInterest,
} from '../utils/fdCalculator';
import EmptyState from '../components/EmptyState';
import type { TabScreenProps } from '../navigation/types';
import type { Account, FixedDeposit } from '../models/types';

const ACCOUNT_TYPE_COLORS: Record<Account['type'], string> = {
  cash: '#4CAF50',
  bank: '#42A5F5',
  card: '#EF5350',
  savings: '#FFA726',
  other: '#78909C',
};

const ACCOUNT_TYPE_LABELS: Record<Account['type'], string> = {
  cash: 'Cash',
  bank: 'Bank Account',
  card: 'Credit Card',
  savings: 'Savings',
  other: 'Other',
};

type Tab = 'accounts' | 'investments';

const STATUS_COLORS: Record<string, string> = {
  active: colors.income,
  matured: colors.primary,
  closed: colors.textSecondary,
};

export default function AccountsScreen({
  navigation,
}: TabScreenProps<'Accounts'>) {
  const { accounts, balances, loadAccounts, removeAccount } = useAccountStore();
  const { deposits, fdAccountIds, loadDeposits } = useFDStore();
  const { settings } = useSettingsStore();
  const [snackbar, setSnackbar] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('accounts');
  const insets = useSafeAreaInsets();
  const currency = settings.baseCurrency;

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
      loadDeposits();
    }, []),
  );

  const userAccounts = useMemo(
    () => accounts.filter((a) => !fdAccountIds.has(a.id)),
    [accounts, fdAccountIds],
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

  const handleDelete = useCallback(
    async (acc: Account) => {
      setMenuVisible(null);
      Alert.alert('Delete Account', `Delete "${acc.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await removeAccount(acc.id);
            if (!result.success) {
              setSnackbar(result.message || 'Cannot delete account');
            }
          },
        },
      ]);
    },
    [removeAccount],
  );

  const handleEdit = useCallback(
    (acc: Account) => {
      setMenuVisible(null);
      navigation.navigate('AccountForm', { accountId: acc.id });
    },
    [navigation],
  );

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
    <LinearGradient
      colors={['#2E2660', '#1E1545', '#252540']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.portfolioCard}
    >
      <View style={styles.portfolioHeader}>
        <View style={styles.portfolioIconWrap}>
          <Icon source="chart-arc" size={20} color={colors.primaryLight} />
        </View>
        <Text style={styles.portfolioTitle}>My Portfolio</Text>
      </View>

      <Text style={styles.balanceCaption}>Net Worth</Text>
      <Text
        style={[
          styles.balanceHero,
          {
            color:
              portfolioData.netBalance >= 0 ? colors.income : colors.expense,
          },
        ]}
      >
        {formatMoney(
          portfolioData.netBalance,
          currency,
          2,
          settings.currencySymbol,
        )}
      </Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={styles.summaryHeader}>
            <Icon source="arrow-up-circle" size={16} color={colors.income} />
            <Text style={styles.summaryLabel}>Assets</Text>
          </View>
          <Text style={[styles.summaryAmount, { color: colors.income }]}>
            {formatMoney(
              portfolioData.totalAssets,
              currency,
              2,
              settings.currencySymbol,
            )}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <View style={styles.summaryHeader}>
            <Icon source="arrow-down-circle" size={16} color={colors.warning} />
            <Text style={styles.summaryLabel}>Liabilities</Text>
          </View>
          <Text style={[styles.summaryAmount, { color: colors.warning }]}>
            {formatMoney(
              portfolioData.totalLiabilities,
              currency,
              2,
              settings.currencySymbol,
            )}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderSegmentedControl = () => (
    <View style={styles.segmentContainer}>
      <TouchableOpacity
        style={[
          styles.segmentTab,
          activeTab === 'accounts' && styles.segmentTabActive,
        ]}
        onPress={() => setActiveTab('accounts')}
        activeOpacity={0.8}
      >
        <Icon
          source="wallet"
          size={18}
          color={
            activeTab === 'accounts' ? colors.onPrimary : colors.textSecondary
          }
        />
        <Text
          style={[
            styles.segmentText,
            activeTab === 'accounts' && styles.segmentTextActive,
          ]}
        >
          Accounts
        </Text>
        {userAccounts.length > 0 && (
          <View
            style={[
              styles.segmentBadge,
              activeTab === 'accounts' && styles.segmentBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.segmentBadgeText,
                activeTab === 'accounts' && styles.segmentBadgeTextActive,
              ]}
            >
              {userAccounts.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.segmentTab,
          activeTab === 'investments' && styles.segmentTabActive,
        ]}
        onPress={() => setActiveTab('investments')}
        activeOpacity={0.8}
      >
        <Icon
          source="lock"
          size={18}
          color={
            activeTab === 'investments'
              ? colors.onPrimary
              : colors.textSecondary
          }
        />
        <Text
          style={[
            styles.segmentText,
            activeTab === 'investments' && styles.segmentTextActive,
          ]}
        >
          Investments
        </Text>
        {deposits.length > 0 && (
          <View
            style={[
              styles.segmentBadge,
              activeTab === 'investments' && styles.segmentBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.segmentBadgeText,
                activeTab === 'investments' && styles.segmentBadgeTextActive,
              ]}
            >
              {deposits.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderAccountItem = ({ item }: { item: Account }) => {
    const balance = balances[item.id] ?? item.openingBalanceCents;
    const accentColor = ACCOUNT_TYPE_COLORS[item.type];
    return (
      <View style={styles.accountCard}>
        <View
          style={[styles.accountAccent, { backgroundColor: accentColor }]}
        />
        <TouchableOpacity
          style={styles.accountContent}
          onPress={() =>
            (navigation as any).navigate('AccountTransactions', {
              accountId: item.id,
            })
          }
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.accountIcon,
              { backgroundColor: accentColor + '1A' },
            ]}
          >
            <Icon
              source={getAccountTypeIcon(item.type) as any}
              size={22}
              color={accentColor}
            />
          </View>
          <View style={styles.accountDetails}>
            <Text style={styles.accountName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.accountType}>
              {ACCOUNT_TYPE_LABELS[item.type]}
            </Text>
          </View>
          <View style={styles.accountRight}>
            <Text
              style={[
                styles.accountBalance,
                balance < 0 && { color: colors.expense },
              ]}
            >
              {formatMoney(balance, item.currency, 2, settings.currencySymbol)}
            </Text>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <TouchableOpacity
                  onPress={() => setMenuVisible(item.id)}
                  hitSlop={12}
                  style={styles.menuTrigger}
                >
                  <Icon
                    source="dots-horizontal"
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              }
              contentStyle={styles.menuContent}
            >
              <Menu.Item
                onPress={() => handleEdit(item)}
                title="Edit"
                leadingIcon="pencil"
              />
              <Menu.Item
                onPress={() => handleDelete(item)}
                title="Delete"
                leadingIcon="delete-outline"
              />
            </Menu>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFDItem = ({ item }: { item: FixedDeposit }) => {
    const daysLeft = getDaysRemaining(item.maturityDate);
    const statusColor = STATUS_COLORS[item.status] ?? colors.textSecondary;
    const gross = calculateFDInterest(
      item.principalCents,
      item.annualInterestRate,
      item.startDate,
      item.maturityDate,
    );
    const net = calculateNetInterest(gross, item.taxRate);
    const maturityLabel = format(
      new Date(item.maturityDate + 'T00:00:00'),
      'MMM d, yyyy',
    );

    return (
      <View style={styles.fdCard}>
        <View style={[styles.fdAccent, { backgroundColor: statusColor }]} />
        <TouchableOpacity
          style={styles.fdTouchable}
          onPress={() =>
            (navigation as any).navigate('FDDetail', { fdId: item.id })
          }
          activeOpacity={0.7}
        >
          <View style={styles.fdHeader}>
            <View
              style={[
                styles.fdIconWrap,
                { backgroundColor: statusColor + '1A' },
              ]}
            >
              <Icon source="lock" size={20} color={statusColor} />
            </View>
            <View style={styles.fdHeaderText}>
              <Text style={styles.fdLabel} numberOfLines={1}>
                {item.note || `FD — ${item.annualInterestRate}%`}
              </Text>
              <View
                style={[
                  styles.fdStatusBadge,
                  { backgroundColor: statusColor + '20' },
                ]}
              >
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
                {formatMoney(
                  item.principalCents,
                  currency,
                  2,
                  settings.currencySymbol,
                )}
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
              <Icon
                source="percent-outline"
                size={14}
                color={colors.textTertiary}
              />
              <Text style={styles.fdFooterText}>
                {item.annualInterestRate}% p.a.
              </Text>
            </View>
            <View style={styles.fdFooterItem}>
              <Icon
                source="calendar-end"
                size={14}
                color={colors.textTertiary}
              />
              <Text style={styles.fdFooterText}>{maturityLabel}</Text>
            </View>
            {item.status === 'active' && (
              <View style={styles.fdFooterItem}>
                <Icon
                  source="clock-outline"
                  size={14}
                  color={colors.textTertiary}
                />
                <Text style={styles.fdFooterText}>{daysLeft}d left</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAccountsList = () => (
    <>
      {userAccounts.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="No Accounts"
          subtitle="Add your first account"
        />
      ) : (
        <FlatList
          data={userAccounts}
          keyExtractor={(item) => item.id}
          renderItem={renderAccountItem}
          ListHeaderComponent={
            <>
              {renderPortfolioCard()}
              {renderSegmentedControl()}
            </>
          }
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
          <EmptyState
            icon="lock"
            title="No Fixed Deposits"
            subtitle="Create your first FD"
          />
        </View>
      ) : (
        <FlatList
          data={deposits}
          keyExtractor={(item) => item.id}
          renderItem={renderFDItem}
          ListHeaderComponent={
            <>
              {renderPortfolioCard()}
              {renderSegmentedControl()}
            </>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {activeTab === 'accounts'
        ? renderAccountsList()
        : renderInvestmentsList()}
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
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },
  emptyInvestments: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  /* ── Segmented Control ── */
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 4,
    marginBottom: spacing.lg,
    ...elevation.sm,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.xl - 3,
    gap: spacing.xs + 2,
  },
  segmentTabActive: {
    backgroundColor: colors.primary,
    ...elevation.md,
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
  segmentBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  segmentBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  segmentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentBadgeTextActive: {
    color: colors.onPrimary,
  },

  /* ── Portfolio Card ── */
  portfolioCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...elevation.md,
  },
  portfolioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  portfolioIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139,125,209,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  balanceCaption: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceHero: {
    fontSize: 34,
    fontWeight: '800',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    letterSpacing: -0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.2)',
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
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: spacing.xxs,
  },

  /* ── Account Cards ── */
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    ...elevation.sm,
  },
  accountAccent: {
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  accountContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  accountType: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  accountRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  accountBalance: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  menuTrigger: {
    padding: spacing.xxs,
  },
  menuContent: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
  },

  /* ── FD Cards ── */
  fdCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    ...elevation.sm,
  },
  fdAccent: {
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  fdTouchable: {
    flex: 1,
  },
  fdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  fdIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
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
  fdStatusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  fdBody: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.md,
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

  fab: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: colors.primary,
    ...elevation.lg,
  },
});
