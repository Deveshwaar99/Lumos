import React, { useCallback, useMemo } from 'react';
import { View, SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB, Icon, Snackbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import BudgetProgressBar from '../components/BudgetProgressBar';
import { colors, spacing, radius, elevation } from '../theme';
import { formatMoney } from '../utils/money';
import { getMonthLabel, addMonths } from '../utils/dates';
import type { TabScreenProps } from '../navigation/types';
import type { BudgetWithSpent, Category } from '../models/types';

type SectionItem = BudgetWithSpent | Category;
interface BudgetSection {
  title: string;
  data: SectionItem[];
  type: 'budgeted' | 'not_budgeted';
}

export default function BudgetsScreen({ navigation }: TabScreenProps<'Budgets'>) {
  const { budgets, month, alerts, loading, loadBudgets, setMonth } = useBudgetStore();
  const { categories, loadCategories } = useCategoryStore();
  const { settings } = useSettingsStore();
  const [snackbar, setSnackbar] = React.useState('');
  const insets = useSafeAreaInsets();
  const currency = settings.baseCurrency;

  useFocusEffect(useCallback(() => {
    loadCategories();
    loadBudgets();
  }, []));

  const totalBudgeted = useMemo(() => budgets.reduce((sum, b) => sum + b.limitCents, 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((sum, b) => sum + b.spent, 0), [budgets]);
  const totalRemaining = totalBudgeted - totalSpent;

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const budgetedCategoryIds = useMemo(
    () => new Set(budgets.map((b) => b.categoryId)),
    [budgets],
  );

  const unbudgetedExpenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense' && !budgetedCategoryIds.has(c.id)),
    [categories, budgetedCategoryIds],
  );

  const sections: BudgetSection[] = useMemo(() => {
    const result: BudgetSection[] = [];
    if (budgets.length > 0) {
      result.push({ title: 'BUDGETED', data: budgets, type: 'budgeted' });
    }
    if (unbudgetedExpenseCategories.length > 0) {
      result.push({ title: 'NOT BUDGETED', data: unbudgetedExpenseCategories, type: 'not_budgeted' });
    }
    return result;
  }, [budgets, unbudgetedExpenseCategories]);

  const handlePrevMonth = () => setMonth(addMonths(month, -1));
  const handleNextMonth = () => setMonth(addMonths(month, 1));

  const overallPct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  const renderSummaryCard = () => (
    <LinearGradient
      colors={['#2E2660', '#1E1545', '#252540']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.summaryCard}
    >
      <View style={styles.summaryHeader}>
        <View style={styles.summaryIconWrap}>
          <Icon source="calculator-variant" size={20} color={colors.primaryLight} />
        </View>
        <Text style={styles.summaryTitle}>Budget Overview</Text>
      </View>

      {budgets.length > 0 ? (
        <>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroCaption}>Remaining</Text>
              <Text style={[
                styles.heroAmount,
                { color: totalRemaining >= 0 ? colors.income : colors.expense },
              ]}>
                {formatMoney(totalRemaining, currency, 2, settings.currencySymbol)}
              </Text>
            </View>
            <View style={styles.heroPctWrap}>
              <Text style={[
                styles.heroPct,
                { color: overallPct >= 100 ? colors.expense : overallPct >= 80 ? colors.warning : colors.income },
              ]}>
                {overallPct}%
              </Text>
              <Text style={styles.heroPctLabel}>used</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Icon source="target" size={14} color={colors.primaryLight} />
                <Text style={styles.statLabel}>Budgeted</Text>
              </View>
              <Text style={styles.statValue}>
                {formatMoney(totalBudgeted, currency, 2, settings.currencySymbol)}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Icon source="cash-minus" size={14} color={colors.expense} />
                <Text style={styles.statLabel}>Spent</Text>
              </View>
              <Text style={[styles.statValue, totalSpent > totalBudgeted && { color: colors.expense }]}>
                {formatMoney(totalSpent, currency, 2, settings.currencySymbol)}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.emptyHero}>
          <Icon source="chart-line-variant" size={32} color={colors.textTertiary} />
          <Text style={styles.emptyHeroText}>No budgets set this month</Text>
        </View>
      )}
    </LinearGradient>
  );

  const renderMonthSelector = () => (
    <View style={styles.monthSelector}>
      <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow} activeOpacity={0.7}>
        <Icon source="chevron-left" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.monthLabelWrap}>
        <Icon source="calendar-month" size={18} color={colors.primaryLight} />
        <Text style={styles.monthLabel}>{getMonthLabel(month)}</Text>
      </View>
      <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow} activeOpacity={0.7}>
        <Icon source="chevron-right" size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  const renderAlertBanner = () => {
    if (alerts.length === 0) return null;
    return (
      <View style={styles.alertBanner}>
        <View style={styles.alertAccent} />
        <View style={styles.alertContent}>
          <Icon source="alert-circle" size={20} color={colors.warning} />
          <Text style={styles.alertText}>
            {alerts.length} budget{alerts.length > 1 ? 's' : ''} at or over limit!
          </Text>
        </View>
      </View>
    );
  };

  const renderBudgetedItem = (item: BudgetWithSpent) => {
    const cat = categoryMap[item.categoryId];
    const barColor = cat?.color ?? colors.primary;
    const isOver = item.remaining < 0;
    return (
      <TouchableOpacity
        style={styles.budgetCard}
        onPress={() => navigation.navigate('BudgetForm', { budgetId: item.id, month: item.month })}
        activeOpacity={0.7}
      >
        <View style={[styles.budgetAccent, { backgroundColor: barColor }]} />
        <View style={styles.budgetInner}>
          <View style={styles.budgetHeader}>
            <View style={styles.budgetLeft}>
              {cat && (
                <View style={[styles.budgetIcon, { backgroundColor: cat.color + '1A' }]}>
                  <Icon source={cat.icon as any} size={20} color={cat.color} />
                </View>
              )}
              <View>
                <Text style={styles.budgetName}>{cat?.name ?? 'Unknown'}</Text>
                <Text style={styles.budgetMeta}>
                  {formatMoney(item.spent, currency, 2, settings.currencySymbol)} of{' '}
                  {formatMoney(item.limitCents, currency, 2, settings.currencySymbol)}
                </Text>
              </View>
            </View>
            <View style={styles.budgetRight}>
              <Text style={[styles.remainingAmount, { color: isOver ? colors.expense : colors.income }]}>
                {isOver
                  ? `−${formatMoney(Math.abs(item.remaining), currency, 2, settings.currencySymbol)}`
                  : formatMoney(item.remaining, currency, 2, settings.currencySymbol)}
              </Text>
              <Text style={[styles.remainingLabel, { color: isOver ? colors.expense : colors.textTertiary }]}>
                {isOver ? 'over' : 'left'}
              </Text>
            </View>
          </View>
          <BudgetProgressBar
            spent={item.spent}
            limit={item.limitCents}
            alertThreshold={item.alertThresholdPct}
            currency={currency}
            currencySymbol={settings.currencySymbol}
            showLabels={false}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderUnbudgetedItem = (cat: Category) => (
    <View style={styles.unbudgetedCard}>
      <View style={[styles.unbudgetedAccent, { backgroundColor: colors.textTertiary }]} />
      <View style={styles.unbudgetedInner}>
        <View style={styles.budgetLeft}>
          <View style={[styles.budgetIcon, { backgroundColor: cat.color + '1A' }]}>
            <Icon source={cat.icon as any} size={20} color={cat.color} />
          </View>
          <Text style={styles.unbudgetedName}>{cat.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.setBudgetBtn}
          onPress={() => navigation.navigate('BudgetForm', { month })}
          activeOpacity={0.7}
        >
          <Icon source="plus" size={14} color="#fff" />
          <Text style={styles.setBudgetText}>Budget</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item, section }: { item: SectionItem; section: BudgetSection }) => {
    if (section.type === 'budgeted') {
      return renderBudgetedItem(item as BudgetWithSpent);
    }
    return renderUnbudgetedItem(item as Category);
  };

  const ListHeader = () => (
    <>
      {renderAlertBanner()}
      {renderSummaryCard()}
      {renderMonthSelector()}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => (item as { id: string }).id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[
                styles.sectionDot,
                { backgroundColor: section.type === 'budgeted' ? colors.primary : colors.textTertiary },
              ]} />
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
            </View>
          </View>
        )}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={() => loadBudgets()}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Icon source="calculator" size={48} color={colors.primaryLight} />
            </View>
            <Text style={styles.emptyTitle}>No budgets yet</Text>
            <Text style={styles.emptySubtext}>Tap + to start tracking your spending</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 10 }]}
        onPress={() => navigation.navigate('BudgetForm', { month })}
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

  /* ── Alert Banner ── */
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...elevation.sm,
  },
  alertAccent: {
    width: 4,
    backgroundColor: colors.warning,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  alertContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  alertText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  /* ── Summary Card ── */
  summaryCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...elevation.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139,125,209,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroCaption: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroAmount: {
    fontSize: 30,
    fontWeight: '800',
    marginTop: spacing.xs,
    letterSpacing: -0.5,
  },
  heroPctWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPct: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  heroPctLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statItem: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: spacing.xxs,
  },
  emptyHero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyHeroText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  /* ── Month Selector ── */
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 4,
    marginBottom: spacing.lg,
    ...elevation.sm,
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  /* ── Section Headers ── */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeaderText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  sectionBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  sectionBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  /* ── Budget Cards ── */
  budgetCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...elevation.sm,
  },
  budgetAccent: {
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  budgetInner: {
    flex: 1,
    padding: spacing.md,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  budgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  budgetIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  budgetMeta: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  budgetRight: {
    alignItems: 'flex-end',
  },
  remainingAmount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  remainingLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },

  /* ── Unbudgeted Cards ── */
  unbudgetedCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...elevation.sm,
  },
  unbudgetedAccent: {
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  unbudgetedInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
  },
  unbudgetedName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  setBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.capsule,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  setBudgetText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },

  /* ── Empty State ── */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.xxl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  fab: { position: 'absolute', right: spacing.lg, backgroundColor: colors.primary, ...elevation.lg },
});
