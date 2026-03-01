import React, { useCallback, useMemo } from 'react';
import { View, SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB, Card, Icon, Snackbar, Banner } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import BudgetProgressBar from '../components/BudgetProgressBar';
import { colors, spacing, radius } from '../theme';
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

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.limitCents, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
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

  const renderBudgetedItem = (item: BudgetWithSpent) => {
    const cat = categoryMap[item.categoryId];
    const barColor = cat?.color ?? colors.primary;
    return (
      <TouchableOpacity
        style={styles.budgetItem}
        onPress={() => navigation.navigate('BudgetForm', { budgetId: item.id, month: item.month })}
        activeOpacity={0.7}
      >
        <View style={[styles.colorBar, { backgroundColor: barColor }]} />
        <View style={styles.budgetContent}>
          <View style={styles.budgetHeader}>
            <View style={styles.budgetLeft}>
              {cat && (
                <View style={[styles.iconCircle, { backgroundColor: cat.color + '20' }]}>
                  <Icon source={cat.icon as any} size={20} color={cat.color} />
                </View>
              )}
              <Text variant="titleSmall" style={{ color: colors.text }}>{cat?.name ?? 'Unknown'}</Text>
            </View>
            <Text variant="bodySmall" style={styles.remaining}>
              {item.remaining >= 0
                ? `${formatMoney(item.remaining, currency, 2, settings.currencySymbol)} left`
                : `${formatMoney(Math.abs(item.remaining), currency, 2, settings.currencySymbol)} over`}
            </Text>
          </View>
          <BudgetProgressBar
            spent={item.spent}
            limit={item.limitCents}
            alertThreshold={item.alertThresholdPct}
            currency={currency}
            currencySymbol={settings.currencySymbol}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderUnbudgetedItem = (cat: Category) => {
    return (
      <View style={styles.unbudgetedItem}>
        <View style={styles.budgetLeft}>
          <View style={[styles.iconCircle, { backgroundColor: cat.color + '20' }]}>
            <Icon source={cat.icon as any} size={20} color={cat.color} />
          </View>
          <Text variant="bodyLarge" style={{ color: colors.text, fontWeight: '600' }}>{cat.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.setBudgetBtn}
          onPress={() => navigation.navigate('BudgetForm', { month })}
          activeOpacity={0.7}
        >
          <Text style={styles.setBudgetText}>SET BUDGET</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item, section }: { item: SectionItem; section: BudgetSection }) => {
    if (section.type === 'budgeted') {
      return renderBudgetedItem(item as BudgetWithSpent);
    }
    return renderUnbudgetedItem(item as Category);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {alerts.length > 0 && (
        <Banner
          visible
          icon="alert-circle"
          style={styles.alertBanner}
          actions={[{ label: 'OK', onPress: () => {} }]}
        >
          {alerts.length} budget(s) at or over limit!
        </Banner>
      )}

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={handlePrevMonth}>
          <Icon source="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          {getMonthLabel(month)}
        </Text>
        <TouchableOpacity onPress={handleNextMonth}>
          <Icon source="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {budgets.length > 0 && (
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={styles.summaryLabel}>BUDGETED</Text>
              <Text variant="titleSmall" style={{ color: colors.text, fontWeight: '700' }}>
                {formatMoney(totalBudgeted, currency, 2, settings.currencySymbol)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={styles.summaryLabel}>SPENT</Text>
              <Text
                variant="titleSmall"
                style={{ color: totalSpent > totalBudgeted ? colors.expense : colors.text, fontWeight: '700' }}
              >
                {formatMoney(totalSpent, currency, 2, settings.currencySymbol)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={styles.summaryLabel}>REMAINING</Text>
              <Text
                variant="titleSmall"
                style={{
                  color: totalBudgeted - totalSpent >= 0 ? colors.income : colors.expense,
                  fontWeight: '700',
                }}
              >
                {formatMoney(totalBudgeted - totalSpent, currency, 2, settings.currencySymbol)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => (item as { id: string }).id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text variant="labelMedium" style={styles.sectionHeaderText}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: spacing.lg }}
        refreshing={loading}
        onRefresh={() => loadBudgets()}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon source="calculator" size={48} color={colors.textTertiary} />
            <Text variant="bodyLarge" style={styles.emptyText}>
              No budgets set. Start tracking!
            </Text>
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
  alertBanner: { backgroundColor: colors.warning + '20' },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  summaryContent: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  summaryItem: { alignItems: 'flex-start', flex: 1 },
  summaryLabel: { color: colors.textSecondary, marginBottom: 4, letterSpacing: 0.5 },
  sectionHeader: {
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionHeaderText: {
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  budgetItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  colorBar: {
    width: 5,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  budgetContent: { flex: 1, padding: spacing.lg },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remaining: { color: colors.textSecondary },
  unbudgetedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  setBudgetBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.capsule,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  setBudgetText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: { color: colors.textSecondary, marginTop: spacing.lg },
  fab: { position: 'absolute', right: spacing.lg, backgroundColor: colors.primary },
});
