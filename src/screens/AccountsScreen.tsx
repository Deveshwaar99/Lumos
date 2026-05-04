import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import {
  FAB,
  Snackbar,
  Icon,
  Text,
  Switch,
  Button,
  TextInput,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { format, formatDistanceToNow } from 'date-fns';
import { useAccountStore } from '../stores/useAccountStore';
import { useFDStore } from '../stores/useFDStore';
import { useRecurringStore } from '../stores/useRecurringStore';
import { useStockStore } from '../stores/useStockStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, spacing, radius, elevation } from '../theme';
import { clampMoneyDecimalPlaces, formatMoney } from '../utils/money';
import {
  getDaysRemaining,
  calculateFDInterest,
  calculateNetInterest,
} from '../utils/fdCalculator';
import EmptyState from '../components/EmptyState';
import { STOCK_MIN_AUTO_SYNC_INTERVAL_MS } from '../constants/stockSync';
import type { TabScreenProps } from '../navigation/types';
import type { Account, FixedDeposit, RecurringTransaction } from '../models/types';

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

type Tab = 'accounts' | 'investments' | 'recurring' | 'stocks';

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const TYPE_COLORS: Record<string, string> = {
  income: colors.income,
  expense: colors.expense,
  transfer: colors.transfer,
};

const TYPE_ICONS: Record<string, string> = {
  income: 'arrow-bottom-left',
  expense: 'arrow-top-right',
  transfer: 'swap-horizontal',
};

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
  const { recurringTransactions, loadRecurring, removeRecurring, toggleRecurring } =
    useRecurringStore();
  const {
    holdings,
    lastSyncAt,
    isSyncing: stocksSyncing,
    permissionStatus,
    sync,
    loadAll: loadStocks,
    syncError,
    setSenderId,
  } = useStockStore();
  const { settings } = useSettingsStore();
  const [snackbar, setSnackbar] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('accounts');
  const [refreshing, setRefreshing] = useState(false);
  const [senderEditorVisible, setSenderEditorVisible] = useState(false);
  const [senderInput, setSenderInput] = useState('CDS-Alerts');
  const insets = useSafeAreaInsets();
  const sym = settings.currencySymbol;
  const moneyDecimals = clampMoneyDecimalPlaces(settings.decimalPlaces);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadAccounts(),
      loadDeposits(),
      loadRecurring(),
      Platform.OS === 'android' ? loadStocks() : Promise.resolve(),
      Platform.OS === 'android' && activeTab === 'stocks'
        ? sync()
        : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [loadAccounts, loadDeposits, loadRecurring, loadStocks, sync, activeTab]);

  useFocusEffect(
    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useCallback(() => {
      loadAccounts();
      loadDeposits();
      loadRecurring();
      if (Platform.OS === 'android') {
        loadStocks();
      }
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
    const gross = totalAssets + totalLiabilities;
    const debtPctOfAssets =
      totalAssets > 0
        ? Math.min(100, Math.round((totalLiabilities / totalAssets) * 100))
        : null;
    return {
      totalAssets,
      totalLiabilities,
      netBalance,
      gross,
      debtPctOfAssets,
    };
  }, [userAccounts, balances, deposits]);

  useEffect(() => {
    if (Platform.OS !== 'android' || activeTab !== 'stocks') return;
    // ~1 CDS SMS/day: auto-sync at most every ~12h when visiting Stocks (manual Sync / pull-to-refresh always runs).
    if (
      !lastSyncAt ||
      Date.now() - lastSyncAt > STOCK_MIN_AUTO_SYNC_INTERVAL_MS
    ) {
      sync().catch(() => null);
    }
  }, [activeTab, lastSyncAt, sync]);

  const handleDelete = useCallback(
    async (acc: Account) => {
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

  const renderPortfolioCard = () => {
    const { totalAssets, totalLiabilities, netBalance, gross, debtPctOfAssets } =
      portfolioData;
    const showBar = gross > 0;

    return (
      <LinearGradient
        colors={[...colors.cardGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.portfolioCard}
      >
        <View style={styles.portfolioMetricsStrip}>
          <View style={styles.portfolioMetricCol}>
            <View style={styles.summaryHeader}>
              <View style={styles.portfolioMetricIcon}>
                <Icon source="chart-arc" size={14} color={colors.primaryLight} />
              </View>
              <Text style={styles.summaryLabel} numberOfLines={2}>
                Net worth
              </Text>
            </View>
            <Text
              style={[
                styles.portfolioMetricAmount,
                {
                  color:
                    netBalance >= 0 ? colors.income : colors.expense,
                },
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.45}
            >
              {formatMoney(netBalance, sym, moneyDecimals)}
            </Text>
          </View>

          <View style={styles.portfolioMetricDivider} />

          <View style={styles.portfolioMetricCol}>
            <View style={styles.summaryHeader}>
              <View style={styles.portfolioMetricIcon}>
                <Icon source="arrow-up-circle" size={14} color={colors.income} />
              </View>
              <Text style={styles.summaryLabel} numberOfLines={2}>
                Assets
              </Text>
            </View>
            <Text
              style={[styles.portfolioMetricAmount, { color: colors.income }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.45}
            >
              {formatMoney(totalAssets, sym, moneyDecimals)}
            </Text>
          </View>

          <View style={styles.portfolioMetricDivider} />

          <View style={styles.portfolioMetricCol}>
            <View style={styles.summaryHeader}>
              <View style={styles.portfolioMetricIcon}>
                <Icon
                  source="arrow-down-circle"
                  size={14}
                  color={colors.secondaryLight}
                />
              </View>
              <Text style={styles.summaryLabel} numberOfLines={2}>
                Liabilities
              </Text>
            </View>
            <Text
              style={[
                styles.portfolioMetricAmount,
                { color: colors.secondaryLight },
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.45}
            >
              {formatMoney(totalLiabilities, sym, moneyDecimals)}
            </Text>
          </View>
        </View>

        {debtPctOfAssets != null && totalLiabilities > 0 ? (
          <Text style={styles.portfolioInsight}>
            Liabilities are {debtPctOfAssets}% of assets
          </Text>
        ) : totalAssets === 0 && totalLiabilities > 0 ? (
          <Text style={styles.portfolioInsight}>No assets recorded</Text>
        ) : null}

        {showBar ? (
          <View style={styles.portfolioBarTrack}>
            <View style={styles.portfolioBarRow}>
              {totalAssets > 0 ? (
                <View
                  style={[
                    styles.portfolioBarSeg,
                    styles.portfolioBarAssets,
                    { flex: totalAssets },
                  ]}
                />
              ) : null}
              {totalLiabilities > 0 ? (
                <View
                  style={[
                    styles.portfolioBarSeg,
                    styles.portfolioBarLiab,
                    { flex: totalLiabilities },
                  ]}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </LinearGradient>
    );
  };

  const segmentTabs: { tab: Tab; label: string; icon: string; count: number }[] = [
    { tab: 'accounts', label: 'Accounts', icon: 'wallet', count: userAccounts.length },
    { tab: 'investments', label: 'Invest', icon: 'lock', count: deposits.length },
    {
      tab: 'recurring',
      label: 'Recurring',
      icon: 'autorenew',
      count: recurringTransactions.length,
    },
    ...(Platform.OS === 'android'
      ? [{ tab: 'stocks' as const, label: 'Stocks', icon: 'chart-line', count: holdings.length }]
      : []),
  ];

  const renderSegmentedControl = () => (
    <View style={styles.segmentContainer}>
      {segmentTabs.map(({ tab, label, icon, count }) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.segmentTab, isActive && styles.segmentTabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <View style={styles.segmentIconWrap}>
              <Icon
                source={icon}
                size={18}
                color={isActive ? colors.onPrimary : colors.textSecondary}
              />
              {count > 0 && (
                <View
                  style={[
                    styles.segmentBadge,
                    isActive && styles.segmentBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentBadgeText,
                      isActive && styles.segmentBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.segmentText, isActive && styles.segmentTextActive]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
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
        <View style={styles.accountContent}>
          <TouchableOpacity
            style={styles.accountMainTap}
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
                { backgroundColor: `${accentColor}1A` },
              ]}
            >
              <Icon
                source={(item.icon || getAccountTypeIcon(item.type)) as any}
                size={18}
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
          </TouchableOpacity>
          <View style={styles.accountRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.accountBalanceHit}
              onPress={() =>
                (navigation as any).navigate('AccountTransactions', {
                  accountId: item.id,
                })
              }
            >
              <Text
                style={[
                  styles.accountBalance,
                  balance < 0 && { color: colors.expense },
                ]}
              >
                {formatMoney(balance, sym, moneyDecimals)}
              </Text>
            </TouchableOpacity>
            <View style={styles.accountRowActions}>
              <TouchableOpacity
                style={styles.accountIconAction}
                onPress={() => handleEdit(item)}
                accessibilityRole="button"
                accessibilityLabel="Edit account"
              >
                <Icon
                  source="pencil"
                  size={16}
                  color={colors.primaryLight}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accountIconAction, styles.accountIconActionDelete]}
                onPress={() => handleDelete(item)}
                accessibilityRole="button"
                accessibilityLabel="Delete account"
              >
                <Icon
                  source="delete-outline"
                  size={16}
                  color={colors.expense}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
      new Date(`${item.maturityDate}T00:00:00`),
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
                { backgroundColor: `${statusColor}1A` },
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
                  { backgroundColor: `${statusColor}20` },
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
                {formatMoney(item.principalCents, sym, moneyDecimals)}
              </Text>
            </View>
            <View style={styles.fdStatDivider} />
            <View style={styles.fdStat}>
              <Text style={styles.fdStatLabel}>Net Interest</Text>
              <Text style={[styles.fdStatValue, { color: colors.income }]}>
                {formatMoney(net, sym, moneyDecimals)}
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

  const handleDeleteRecurring = useCallback(
    (rec: RecurringTransaction) => {
      Alert.alert('Delete Recurring Transaction', 'Stop all future occurrences?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeRecurring(rec.id);
            setSnackbar('Recurring transaction deleted');
          },
        },
      ]);
    },
    [removeRecurring],
  );

  const renderRecurringItem = ({ item }: { item: RecurringTransaction }) => {
    const accentColor = TYPE_COLORS[item.type] ?? colors.primary;
    const account = accounts.find((a) => a.id === item.accountId);
    const nextDueLabel = format(
      new Date(item.nextDueDate + 'T00:00:00'),
      'MMM d, yyyy',
    );

    return (
      <View style={styles.recurringCard}>
        <View style={[styles.accountAccent, { backgroundColor: accentColor }]} />
        <TouchableOpacity
          style={styles.recurringContent}
          onPress={() =>
            (navigation as any).navigate('RecurringTransactionForm', {
              recurringId: item.id,
            })
          }
          onLongPress={() => handleDeleteRecurring(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.recurringIcon, { backgroundColor: accentColor + '1A' }]}>
            <Icon
              source={TYPE_ICONS[item.type] ?? 'autorenew'}
              size={22}
              color={accentColor}
            />
          </View>
          <View style={styles.recurringDetails}>
            <View style={styles.recurringTopRow}>
              <Text style={styles.recurringAmount} numberOfLines={1}>
                {formatMoney(item.totalAmountCents, sym, moneyDecimals)}
              </Text>
              <View style={[styles.frequencyBadge, { backgroundColor: accentColor + '18' }]}>
                <Text style={[styles.frequencyBadgeText, { color: accentColor }]}>
                  {FREQUENCY_LABELS[item.frequency]}
                </Text>
              </View>
            </View>
            <Text style={styles.recurringNote} numberOfLines={1}>
              {item.note || account?.name || item.type}
            </Text>
            <View style={styles.recurringFooter}>
              <Icon source="calendar-clock" size={13} color={colors.textTertiary} />
              <Text style={styles.recurringFooterText}>Next: {nextDueLabel}</Text>
            </View>
          </View>
          <Switch
            value={item.isActive}
            onValueChange={(val) => toggleRecurring(item.id, val)}
            color={colors.primary}
            style={styles.recurringSwitch}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecurringList = () => (
    <>
      {recurringTransactions.length === 0 ? (
        <View style={styles.emptyInvestments}>
          {renderPortfolioCard()}
          {renderSegmentedControl()}
          <EmptyState
            icon="autorenew"
            title="No Recurring Transactions"
            subtitle="Set up transactions that repeat automatically"
          />
        </View>
      ) : (
        <FlatList
          data={recurringTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderRecurringItem}
          ListHeaderComponent={
            <>
              {renderPortfolioCard()}
              {renderSegmentedControl()}
            </>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </>
  );

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </>
  );

  const handleStocksSync = useCallback(async () => {
    const result = await sync();
    if (result.status === 'permission_denied') {
      setSnackbar('SMS permission is required to sync CDS-Alerts messages');
      return;
    }
    if (result.status === 'unsupported') {
      if (result.unsupportedReason !== 'expo_go') {
        setSnackbar('Stocks SMS sync is only available on Android');
      }
      return;
    }
    setSnackbar(
      `Synced ${result.newSms} new SMS · ${result.newMovements} new movements`,
    );
  }, [sync]);

  const handleSaveSender = useCallback(async () => {
    await setSenderId(senderInput.trim() || 'CDS-Alerts');
    setSenderEditorVisible(false);
    setSnackbar('Sender updated for future syncs');
  }, [senderInput, setSenderId]);

  const renderStockItem = ({ item }: { item: (typeof holdings)[number] }) => (
    <TouchableOpacity
      style={styles.stockCard}
      onPress={() => (navigation as any).navigate('StockDetail', { stockCode: item.stockCode })}
      activeOpacity={0.7}
    >
      <View style={styles.stockCodeWrap}>
        <Text style={styles.stockCodeText}>{item.stockCode}</Text>
        <Text style={styles.stockMetaText}>Last trade: {item.lastTradeDate}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.stockQtyText}>{item.netQuantity}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderStocksList = () => (
    <>
      <FlatList
        data={holdings}
        keyExtractor={(item) => item.stockCode}
        renderItem={renderStockItem}
        ListHeaderComponent={
          <>
            {renderPortfolioCard()}
            {renderSegmentedControl()}
            <View style={styles.stocksSummaryCard}>
              <View style={styles.stocksSummaryTop}>
                <View style={styles.stocksSummaryTextCol}>
                  <Text style={styles.stocksSummaryTitle}>
                    Stocks ({holdings.length})
                  </Text>
                  <Text style={styles.stocksSummaryMeta} numberOfLines={1}>
                    Last sync{' '}
                    {lastSyncAt
                      ? formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })
                      : 'never'}
                  </Text>
                </View>
                <View style={styles.stocksSyncBtnWrap}>
                  <Button
                    mode="contained-tonal"
                    loading={stocksSyncing}
                    disabled={stocksSyncing}
                    onPress={handleStocksSync}
                    icon="refresh"
                    compact
                  >
                    Sync
                  </Button>
                </View>
              </View>
              <View style={styles.stocksButtonsRow}>
                <Button
                  mode="outlined"
                  style={styles.stockAuxButton}
                  onPress={() => (navigation as any).navigate('StockSmsLog')}
                  icon="message-text"
                  compact
                >
                  SMS log
                </Button>
                <Button
                  mode="outlined"
                  style={styles.stockAuxButton}
                  onPress={() => setSenderEditorVisible((v) => !v)}
                  icon="account-edit"
                  compact
                >
                  Sender
                </Button>
              </View>
              {senderEditorVisible && (
                <View style={styles.senderEditor}>
                  <TextInput
                    mode="outlined"
                    label="Sender ID"
                    value={senderInput}
                    onChangeText={setSenderInput}
                  />
                  <Button mode="contained" onPress={handleSaveSender} style={{ marginTop: spacing.sm }}>
                    Save Sender
                  </Button>
                </View>
              )}
              {permissionStatus === 'denied' && (
                <View style={styles.permissionBanner}>
                  <Icon source="alert-circle-outline" size={16} color={colors.warning} />
                  <Text style={styles.permissionText}>SMS access denied. Tap sync to request again.</Text>
                </View>
              )}
              {permissionStatus === 'never_ask_again' && (
                <TouchableOpacity style={styles.permissionBanner} onPress={() => Linking.openSettings()}>
                  <Icon source="cog" size={16} color={colors.warning} />
                  <Text style={styles.permissionText}>SMS permission blocked. Open Settings.</Text>
                </TouchableOpacity>
              )}
              {syncError ? (
                <Text style={styles.syncErrorText} numberOfLines={2}>
                  {syncError}
                </Text>
              ) : null}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="chart-line"
            title="No Stocks Yet"
            subtitle="Tap Sync to import from CDS-Alerts SMS"
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || stocksSyncing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {activeTab === 'accounts'
        ? renderAccountsList()
        : activeTab === 'investments'
          ? renderInvestmentsList()
          : activeTab === 'recurring'
            ? renderRecurringList()
            : renderStocksList()}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => {
          if (activeTab === 'investments') {
            (navigation as any).navigate('FDForm');
          } else if (activeTab === 'recurring') {
            (navigation as any).navigate('RecurringTransactionForm');
          } else if (activeTab === 'stocks') {
            (navigation as any).navigate('StockMovementForm');
          } else {
            navigation.navigate('AccountForm');
          }
        }}
        color={colors.onPrimary}
        accessibilityLabel={
          activeTab === 'investments'
            ? 'Add fixed deposit'
            : activeTab === 'recurring'
              ? 'Add recurring transaction'
              : activeTab === 'stocks'
                ? 'Add stock movement'
                : 'Add account'
        }
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
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.lg - 2,
    gap: 4,
  },
  segmentTabActive: {
    backgroundColor: colors.primary,
    ...elevation.sm,
  },
  segmentIconWrap: {
    position: 'relative',
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  segmentTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  segmentBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary + '90',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  segmentBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  segmentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  segmentBadgeTextActive: {
    color: colors.onPrimary,
  },

  /* ── Portfolio Card ── */
  portfolioCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...elevation.sm,
  },
  portfolioMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  portfolioMetricCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  portfolioMetricDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: spacing.xxs,
  },
  portfolioMetricIcon: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioMetricAmount: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
    fontVariant: ['tabular-nums'],
    maxWidth: '100%',
  },
  portfolioInsight: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: 0,
    letterSpacing: 0.15,
  },
  portfolioBarTrack: {
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  portfolioBarRow: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  portfolioBarSeg: {
    minWidth: 2,
  },
  portfolioBarAssets: {
    backgroundColor: colors.income,
  },
  portfolioBarLiab: {
    backgroundColor: colors.secondaryLight,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 18,
    marginBottom: spacing.xxs,
    flexWrap: 'nowrap',
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    flex: 1,
    minWidth: 0,
  },

  /* ── Account Cards ── */
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    ...elevation.sm,
  },
  accountAccent: {
    width: 3,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  accountContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  accountMainTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  accountType: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  accountRight: {
    flexShrink: 0,
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  accountBalanceHit: {
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  accountBalance: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    lineHeight: 18,
    includeFontPadding: false,
  },
  accountRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'nowrap',
    gap: 0,
  },
  accountIconAction: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  accountIconActionDelete: {
    marginLeft: -11,
    alignItems: 'flex-end',
  },
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

  /* ── Recurring Cards ── */
  recurringCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    ...elevation.sm,
  },
  recurringContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  recurringIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recurringDetails: {
    flex: 1,
  },
  recurringTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  recurringAmount: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  frequencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.capsule,
    marginLeft: spacing.sm,
  },
  frequencyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  recurringNote: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  recurringFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recurringFooterText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  recurringSwitch: {
    marginLeft: spacing.xs,
  },

  stocksSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...elevation.sm,
  },
  stocksSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stocksSummaryTextCol: {
    flex: 1,
    minWidth: 0,
  },
  stocksSyncBtnWrap: {
    flexShrink: 0,
    paddingTop: 2,
  },
  stocksSummaryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  stocksSummaryMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  stocksButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stockAuxButton: {
    flex: 1,
  },
  senderEditor: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  permissionBanner: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.warning + '15',
  },
  permissionText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  syncErrorText: {
    marginTop: spacing.sm,
    color: colors.error,
    fontSize: 12,
  },
  stockCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...elevation.sm,
  },
  stockCodeWrap: { flex: 1 },
  stockCodeText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  stockQtyText: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  stockMetaText: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: colors.primary,
    ...elevation.lg,
  },
});
