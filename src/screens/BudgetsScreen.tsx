import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB, Card, Icon, Snackbar, Banner } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import BudgetProgressBar from '../components/BudgetProgressBar';
import EmptyState from '../components/EmptyState';
import { colors, spacing, radius } from '../theme';
import { formatMoney } from '../utils/money';
import { getMonthLabel, addMonths } from '../utils/dates';
import type { TabScreenProps } from '../navigation/types';
import type { BudgetWithSpent } from '../models/types';

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
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const handlePrevMonth = () => setMonth(addMonths(month, -1));
  const handleNextMonth = () => setMonth(addMonths(month, 1));

  const handleAddBudget = () => {
    navigation.navigate('BudgetForm', { month });
  };

  const renderItem = ({ item }: { item: BudgetWithSpent }) => {
    const cat = categoryMap[item.categoryId];
    const barColor = cat?.color ?? colors.primary;
    return (
      <TouchableOpacity
        style={styles.budgetItem}
        onPress={() => navigation.navigate('BudgetForm', { budgetId: item.id, month: item.month })}
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
                ? `${formatMoney(item.remaining, currency)} left`
                : `${formatMoney(Math.abs(item.remaining), currency)} over`}
            </Text>
          </View>
          <BudgetProgressBar
            spent={item.spent}
            limit={item.limitCents}
            alertThreshold={item.alertThresholdPct}
            currency={currency}
          />
        </View>
      </TouchableOpacity>
    );
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
        <Text variant="titleMedium" style={{ color: colors.primary, fontWeight: '700' }}>
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
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Budgeted
              </Text>
              <Text variant="titleMedium" style={{ color: colors.text }}>{formatMoney(totalBudgeted, currency)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Spent
              </Text>
              <Text
                variant="titleMedium"
                style={{ color: totalSpent > totalBudgeted ? colors.expense : colors.text }}
              >
                {formatMoney(totalSpent, currency)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {budgets.length === 0 ? (
        <EmptyState icon="calculator" title="No Budgets" subtitle="Set budgets to track your spending" />
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: spacing.lg }}
          refreshing={loading}
          onRefresh={() => loadBudgets()}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 76 }]}
        onPress={handleAddBudget}
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
  summaryContent: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: colors.textSecondary, marginBottom: 4 },
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
  budgetContent: {
    flex: 1,
    padding: spacing.lg,
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remaining: { color: colors.textSecondary },
  fab: { position: 'absolute', right: spacing.lg, backgroundColor: colors.primary },
});
