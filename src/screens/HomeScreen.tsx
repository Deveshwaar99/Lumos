import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  SectionList,
  StyleSheet,
  RefreshControl,
  Animated,
  TextInput as RNTextInput,
} from 'react-native';
import { Text, FAB, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { analyticsService } from '../services/analyticsService';
import TransactionItem from '../components/TransactionItem';
import PeriodNavigator from '../components/PeriodNavigator';
import TimePeriodPicker from '../components/TimePeriodPicker';
import SummaryBar from '../components/SummaryBar';
import DateHeader from '../components/DateHeader';
import { colors, spacing, radius, elevation } from '../theme';
import {
  getTimePeriodRange,
  getTimePeriodLabel,
  stepAnchor,
  type TimePeriod,
} from '../utils/dates';
import { transactionService } from '../services/transactionService';
import type { TabScreenProps } from '../navigation/types';
import type { TransactionWithSplits, MonthSummary } from '../models/types';

interface TransactionSection {
  title: string;
  data: TransactionWithSplits[];
}

export default function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const { loadCategories, categories } = useCategoryStore();
  const { accounts, loadAccounts } = useAccountStore();
  const { loadBudgets } = useBudgetStore();
  const { settings, loadSettings } = useSettingsStore();
  const insets = useSafeAreaInsets();

  const [anchor, setAnchor] = useState(() => new Date());
  const [period, setPeriod] = useState<TimePeriod>('month');
  const [filterVisible, setFilterVisible] = useState(false);
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [summary, setSummary] = useState<MonthSummary>({
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const range = useMemo(
    () => getTimePeriodRange(anchor, period),
    [anchor, period],
  );
  const navLabel = useMemo(
    () => getTimePeriodLabel(anchor, period),
    [anchor, period],
  );

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TransactionWithSplits[]>(
    [],
  );
  const searchInputRef = useRef<RNTextInput>(null);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSearch = useCallback(() => {
    setSearchActive(true);
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      searchInputRef.current?.focus();
    });
  }, [searchAnim]);

  const closeSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setSearchActive(false);
    });
  }, [searchAnim]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      const results = await transactionService.getAll(
        {
          dateFrom: null,
          dateTo: null,
          type: null,
          accountId: null,
          categoryId: null,
          searchQuery: searchQuery.trim(),
        },
        50,
      );
      setSearchResults(results);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    await Promise.all([
      loadCategories(),
      loadAccounts(),
      loadBudgets(),
      loadSettings(),
    ]);
    const [txns, rangeSummary] = await Promise.all([
      transactionService.getAll(
        {
          dateFrom: range.start,
          dateTo: range.end,
          type: null,
          accountId: null,
          categoryId: null,
        },
        500,
      ),
      analyticsService.getSummaryForRange(range.start, range.end),
    ]);
    setTransactions(txns);
    setSummary(rangeSummary);
  }, [range.start, range.end]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePrev = () => setAnchor((a) => stepAnchor(a, period, -1));
  const handleNext = () => setAnchor((a) => stepAnchor(a, period, 1));

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const sections: TransactionSection[] = useMemo(() => {
    const grouped = new Map<string, TransactionWithSplits[]>();
    for (const txn of transactions) {
      const dateKey = txn.date.includes('T')
        ? txn.date.substring(0, 10)
        : txn.date;
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(txn);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, data]) => ({ title: dateKey, data }));
  }, [transactions]);

  const searchSections: TransactionSection[] = useMemo(() => {
    const grouped = new Map<string, TransactionWithSplits[]>();
    for (const txn of searchResults) {
      const dateKey = txn.date.includes('T')
        ? txn.date.substring(0, 10)
        : txn.date;
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(txn);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, data]) => ({ title: dateKey, data }));
  }, [searchResults]);

  const displaySections =
    searchActive && searchQuery.trim() ? searchSections : sections;

  const handleItemPress = useCallback(
    (transactionId: string) => {
      navigation.navigate('TransactionDetail', { transactionId });
    },
    [navigation],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: TransactionSection }) => (
      <DateHeader dateStr={section.title} />
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: TransactionWithSplits; index: number }) => (
      <>
        {index > 0 && <View style={styles.itemDivider} />}
        <TransactionItem
          transaction={item}
          category={item.categoryId ? categoryMap[item.categoryId] : undefined}
          accountMap={accountMap}
          currencySymbol={settings.currencySymbol}
          onPress={() => handleItemPress(item.id)}
        />
      </>
    ),
    [categoryMap, accountMap, settings.currencySymbol, handleItemPress],
  );

  const keyExtractor = useCallback(
    (item: TransactionWithSplits) => item.id,
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        {searchActive ? (
          <View
            style={[styles.searchBar, { paddingTop: insets.top + spacing.xs }]}
          >
            <TouchableOpacity hitSlop={12} onPress={closeSearch}>
              <Icon source="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <RNTextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search transactions..."
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity hitSlop={12} onPress={() => setSearchQuery('')}>
                <Icon
                  source="close-circle"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View
              style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}
            >
              <TouchableOpacity
                hitSlop={12}
                onPress={() => navigation.navigate('Settings' as any)}
              >
                <Icon source="cog" size={24} color={colors.text} />
              </TouchableOpacity>
              <PeriodNavigator
                label={navLabel}
                onPrev={handlePrev}
                onNext={handleNext}
                onFilterPress={() => setFilterVisible(true)}
              />
              <TouchableOpacity hitSlop={12} onPress={openSearch}>
                <Icon source="magnify" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <SummaryBar
              income={summary.totalIncome}
              expense={summary.totalExpense}
              balance={summary.net}
              currencySymbol={settings.currencySymbol}
            />
          </>
        )}
      </View>

      <SectionList
        sections={displaySections}
        keyExtractor={keyExtractor}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Icon
                source={searchActive ? 'magnify' : 'receipt'}
                size={64}
                color={colors.primaryLight}
              />
            </View>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              {searchActive && searchQuery.trim()
                ? 'No matching transactions'
                : searchActive
                  ? 'Search your transactions'
                  : 'No transactions yet'}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {searchActive && searchQuery.trim()
                ? 'Try a different keyword or date range'
                : searchActive
                  ? 'Type to search across all transactions'
                  : 'Tap + to add your first transaction'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          searchActive ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          )
        }
        stickySectionHeadersEnabled={false}
        style={styles.list}
      />

      {!searchActive && (
        <FAB
          icon="plus"
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => navigation.navigate('AddTransaction')}
          color="#fff"
        />
      )}

      <TimePeriodPicker
        visible={filterVisible}
        onDismiss={() => setFilterVisible(false)}
        selected={period}
        onSelect={(p) => {
          setPeriod(p);
          setAnchor(new Date());
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerSection: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.sm,
    ...elevation.md,
    zIndex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  list: { flex: 1, marginTop: spacing.xs },
  listContent: { paddingBottom: 100 },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 74,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.xxl,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: colors.primary,
    opacity: 0.6,
    ...elevation.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.lg,
  },
});
