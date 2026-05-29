import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Snackbar, Switch, Text, TextInput } from 'react-native-paper';
import AmountInput from '../components/AmountInput';
import CategoryPicker from '../components/CategoryPicker';
import type { Category } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, radius, spacing } from '../theme';
import { getCurrentMonth } from '../utils/dates';

export default function BudgetFormScreen({
  navigation,
  route,
}: RootStackScreenProps<'BudgetForm'>) {
  const {
    budgetId,
    month: routeMonth,
    categoryId: routeCategoryId,
  } = route.params ?? {};
  const budgets = useBudgetStore((state) => state.budgets);
  const addBudget = useBudgetStore((state) => state.addBudget);
  const updateBudget = useBudgetStore((state) => state.updateBudget);
  const removeBudget = useBudgetStore((state) => state.removeBudget);
  const loadBudgets = useBudgetStore((state) => state.loadBudgets);
  const categories = useCategoryStore((state) => state.categories);
  const loadCategories = useCategoryStore((state) => state.loadCategories);
  const settings = useSettingsStore((state) => state.settings);

  const existing = budgetId ? budgets.find((b) => b.id === budgetId) : null;
  const isEditing = !!existing;
  const month = existing?.month ?? routeMonth ?? getCurrentMonth();

  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? routeCategoryId ?? '',
  );
  const [limitCents, setLimitCents] = useState(existing?.limitCents ?? 0);
  const [alertThresholdPct, setAlertThresholdPct] = useState(
    String(existing?.alertThresholdPct ?? 80),
  );
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    void loadCategories();
    void loadBudgets(month);
  }, [loadBudgets, loadCategories, month]);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Budget' : 'New Budget' });
  }, [isEditing, navigation]);

  useEffect(() => {
    if (existing) {
      setCategoryId(existing.categoryId);
      setLimitCents(existing.limitCents);
      setAlertThresholdPct(String(existing.alertThresholdPct));
      setEnabled(existing.enabled);
    }
  }, [existing?.id]);

  useEffect(() => {
    if (!isEditing && routeCategoryId) {
      setCategoryId(routeCategoryId);
    }
  }, [isEditing, routeCategoryId]);

  // Only show expense categories without existing budgets for this month
  const existingCategoryIds = budgets
    .filter((b) => b.month === month && b.id !== budgetId)
    .map((b) => b.categoryId);
  const availableCategories = categories.filter(
    (c) => c.type === 'expense' && !existingCategoryIds.includes(c.id),
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSave = async () => {
    if (!categoryId) {
      setSnackbar('Please select a category');
      return;
    }
    if (limitCents <= 0) {
      setSnackbar('Please enter a budget amount');
      return;
    }
    const threshold = parseInt(alertThresholdPct, 10) || 80;

    try {
      if (isEditing && budgetId) {
        await updateBudget(budgetId, {
          limitCents,
          alertThresholdPct: Math.min(100, Math.max(1, threshold)),
          enabled,
        });
        navigation.goBack();
      } else {
        const result = await addBudget({
          month,
          categoryId,
          limitCents,
          alertThresholdPct: Math.min(100, Math.max(1, threshold)),
          enabled,
        });
        if (result.success) {
          navigation.goBack();
        } else {
          setSnackbar(result.message || 'Failed to save');
        }
      }
    } catch (e: unknown) {
      setSnackbar(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const handleDelete = () => {
    if (!budgetId) return;
    Alert.alert('Delete Budget', 'Remove this budget?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeBudget(budgetId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 80}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="titleSmall" style={styles.label}>
            Category
          </Text>
          <Button
            mode="outlined"
            onPress={() => setCategoryPickerVisible(true)}
            style={styles.pickerButton}
            disabled={isEditing}
            icon={selectedCategory ? (selectedCategory.icon as any) : undefined}
          >
            {selectedCategory?.name ?? 'Select expense category'}
          </Button>

          <Text variant="titleSmall" style={styles.label}>
            Monthly Limit
          </Text>
          <AmountInput
            value={limitCents}
            onChange={setLimitCents}
            currencySymbol={settings.currencySymbol}
          />

          <Text variant="titleSmall" style={styles.label}>
            Alert Threshold (%)
          </Text>
          <TextInput
            value={alertThresholdPct}
            onChangeText={setAlertThresholdPct}
            mode="outlined"
            keyboardType="number-pad"
            right={<TextInput.Affix text="%" />}
            style={styles.input}
            cursorColor={colors.primary}
            selectionColor={colors.primary + '40'}
          />

          <View style={styles.switchRow}>
            <Text variant="bodyLarge">Enabled</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              color={colors.primary}
            />
          </View>

          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
          >
            {isEditing ? 'Update' : 'Create'} Budget
          </Button>

          {isEditing && (
            <Button
              mode="outlined"
              onPress={handleDelete}
              textColor={colors.error}
              style={styles.deleteButton}
            >
              Delete Budget
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <CategoryPicker
        visible={categoryPickerVisible}
        onDismiss={() => setCategoryPickerVisible(false)}
        onSelect={(cat: Category) => setCategoryId(cat.id)}
        categories={availableCategories}
        selectedId={categoryId}
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
  scroll: { padding: 16, paddingBottom: 100 },
  label: { marginTop: 16, marginBottom: 8, color: colors.text },
  pickerButton: { borderColor: colors.border },
  input: { marginBottom: 4 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: radius.capsule,
  },
  deleteButton: {
    marginTop: 12,
    borderColor: colors.error,
    borderRadius: radius.capsule,
  },
});
