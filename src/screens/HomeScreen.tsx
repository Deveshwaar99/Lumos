import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  RefreshControl,
  TextInput as RNTextInput,
  SectionList,
  type SectionListProps,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Snackbar, Text } from 'react-native-paper';
import AnimatedReanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateHeader from '../components/DateHeader';
import PeriodNavigator from '../components/PeriodNavigator';
import TimePeriodPicker from '../components/TimePeriodPicker';
import TimePeriodTrigger from '../components/TimePeriodTrigger';
import TransactionItem from '../components/TransactionItem';
import { GlowFAB, HeroBalanceCard } from '../components/ui';
import type { MonthSummary, TransactionWithSplits } from '../models/types';
import type { TabScreenProps } from '../navigation/types';
import { analyticsService } from '../services/analyticsService';
import { transactionService } from '../services/transactionService';
import { useAccountStore } from '../stores/useAccountStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, radius, spacing } from '../theme';
import {
  getTimePeriodLabel,
  getTimePeriodRange,
  stepAnchor,
  type TimePeriod,
} from '../utils/dates';
import { clampMoneyDecimalPlaces } from '../utils/money';

type HomeSectionListProps = SectionListProps<
  TransactionWithSplits,
  TransactionSection
>;

const AnimatedSectionList =
  AnimatedReanimated.createAnimatedComponent(SectionList) as unknown as ComponentType<
    HomeSectionListProps
  >;

interface TransactionSection {
  title: string;
  data: TransactionWithSplits[];
}

export default function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const categories = useCategoryStore((state) => state.categories);
  const loadCategories = useCategoryStore((state) => state.loadCategories);
  const accounts = useAccountStore((state) => state.accounts);
  const loadAccounts = useAccountStore((state) => state.loadAccounts);
  const loadBudgets = useBudgetStore((state) => state.loadBudgets);
  const settings = useSettingsStore((state) => state.settings);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const insets = useSafeAreaInsets();
  const moneyDecimals = clampMoneyDecimalPlaces(settings.decimalPlaces);

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
  const [snackbar, setSnackbar] = useState('');

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
    try {
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
    } catch {
      setSnackbar('Failed to load data');
    }
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
          decimalPlaces={moneyDecimals}
          onPress={() => handleItemPress(item.id)}
        />
      </>
    ),
    [
      categoryMap,
      accountMap,
      settings.currencySymbol,
      moneyDecimals,
      handleItemPress,
    ],
  );

  const keyExtractor = useCallback(
    (item: TransactionWithSplits) => item.id,
    [],
  );

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerStack, { paddingTop: insets.top }]}>
        {searchActive ? (
          <View style={styles.searchBar}>
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
          <View style={styles.topBar}>
            <View style={styles.topBarRow}>
              <TouchableOpacity
                hitSlop={8}
                onPress={() => navigation.navigate('Settings' as any)}
                accessibilityLabel="Open settings"
                accessibilityRole="button"
              >
                <Icon source="cog" size={24} color={colors.text} />
              </TouchableOpacity>
              <PeriodNavigator
                label={navLabel}
                onPrev={handlePrev}
                onNext={handleNext}
                showFilterIndicator={false}
                compact
                accessory={
                  <TimePeriodTrigger
                    compact
                    period={period}
                    onPress={() => setFilterVisible(true)}
                  />
                }
              />
              <TouchableOpacity
                hitSlop={8}
                onPress={openSearch}
                accessibilityLabel="Search transactions"
                accessibilityRole="button"
              >
                <Icon source="magnify" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        {!searchActive ? (
          <HeroBalanceCard
            income={summary.totalIncome}
            expense={summary.totalExpense}
            balance={summary.net}
            periodLabel={navLabel}
            currencySymbol={settings.currencySymbol}
            decimalPlaces={moneyDecimals}
          />
        ) : null}
      </View>
    ),
    [
      insets.top,
      closeSearch,
      searchQuery,
      navigation,
      navLabel,
      handlePrev,
      handleNext,
      openSearch,
      searchInputRef,
      setFilterVisible,
      period,
      searchActive,
      summary.totalIncome,
      summary.totalExpense,
      summary.net,
      settings.currencySymbol,
      moneyDecimals,
    ],
  );

  return (
    <View style={styles.container}>
      <AnimatedSectionList
        sections={displaySections}
        keyExtractor={keyExtractor}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[...colors.gradientPrimary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyRing}
            >
              <View style={styles.emptyIconInner}>
                <Icon
                  source={searchActive ? 'magnify' : 'receipt'}
                  size={64}
                  color={colors.primaryLight}
                />
              </View>
            </LinearGradient>
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
        <GlowFAB
          icon="plus"
          bottomInset={insets.bottom + 16}
          onPress={() => navigation.navigate('AddTransaction')}
          accessibilityLabel="Add transaction"
        />
      )}

      <TimePeriodPicker
        visible={filterVisible}
        onDismiss={() => setFilterVisible(false)}
        selected={period}
        onSelect={(nextPeriod) => {
          setPeriod(nextPeriod);
          setAnchor(new Date());
        }}
      />

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
        style={{ marginBottom: 72 }}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerStack: {
    paddingBottom: spacing.xs,
  },
  topBar: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: { flex: 1 },
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
  emptyRing: {
    padding: 2,
    borderRadius: 50,
    marginBottom: spacing.lg,
  },
  emptyIconInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
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
