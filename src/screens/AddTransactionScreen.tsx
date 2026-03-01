import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  SegmentedButtons,
  Text,
  Icon,
  Snackbar,
  Switch,
  Divider,
} from 'react-native-paper';
import { format } from 'date-fns';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { transactionService } from '../services/transactionService';
import CategoryPicker from '../components/CategoryPicker';
import AccountPicker from '../components/AccountPicker';
import AmountDisplay from '../components/AmountDisplay';
import CalculatorPad from '../components/CalculatorPad';
import { colors, spacing, radius } from '../theme';
import { dollarsToCents } from '../utils/money';
import type { RootStackScreenProps } from '../navigation/types';

function evalExpression(expr: string): number {
  try {
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    if (/[^0-9+\-*/.() ]/.test(sanitized)) return 0;
    const result = Function(`"use strict"; return (${sanitized})`)();
    if (typeof result !== 'number' || !isFinite(result)) return 0;
    return Math.max(0, result);
  } catch {
    return 0;
  }
}

export default function AddTransactionScreen({
  navigation,
  route,
}: RootStackScreenProps<'AddTransaction'>) {
  const insets = useSafeAreaInsets();
  const params = route.params;
  const transactionId = params?.transactionId;
  const initialType = params?.type ?? 'expense';

  const { addTransaction, updateTransaction, removeTransaction } = useTransactionStore();
  const { categories, loadCategories } = useCategoryStore();
  const { accounts, loadAccounts } = useAccountStore();
  const { settings } = useSettingsStore();

  const [existing, setExisting] = useState<Awaited<ReturnType<typeof transactionService.getById>> | null>(null);
  const [loaded, setLoaded] = useState(!transactionId);
  const isEditing = !!existing;

  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [expression, setExpression] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [account1Id, setAccount1Id] = useState('');
  const [account2Id, setAccount2Id] = useState('');
  const [note, setNote] = useState('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [split1Expression, setSplit1Expression] = useState('');
  const [split2Expression, setSplit2Expression] = useState('');

  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [account1PickerVisible, setAccount1PickerVisible] = useState(false);
  const [account2PickerVisible, setAccount2PickerVisible] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const filteredCategories = categories.filter((c) => c.type === type);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedAccount1 = accounts.find((a) => a.id === account1Id);
  const selectedAccount2 = accounts.find((a) => a.id === account2Id);

  useEffect(() => {
    loadCategories();
    loadAccounts();
  }, []);

  useEffect(() => {
    if (accounts.length > 0 && !account1Id) {
      setAccount1Id(accounts[0].id);
    }
  }, [accounts]);

  useEffect(() => {
    if (transactionId) {
      transactionService.getById(transactionId).then((txn) => {
        if (txn) {
          setExisting(txn);
          setType(txn.type);
          setExpression(String(txn.totalAmountCents / 100));
          setCategoryId(txn.categoryId);
          setNote(txn.note ?? '');
          setDateStr(txn.date.substring(0, 10));
          if (txn.splits.length > 0) {
            setAccount1Id(txn.splits[0].accountId);
            setSplit1Expression(String(txn.splits[0].amountCents / 100));
          }
          if (txn.splits.length > 1) {
            setSplitEnabled(true);
            setAccount2Id(txn.splits[1].accountId);
            setSplit2Expression(String(txn.splits[1].amountCents / 100));
          }
        }
        setLoaded(true);
      });
    }
  }, [transactionId]);

  useEffect(() => {
    if (selectedCategory && selectedCategory.type !== type) {
      setCategoryId('');
    }
  }, [type]);

  const handleDigit = useCallback((d: string) => setExpression((e) => e + d), []);
  const handleOperator = useCallback((op: string) => {
    setExpression((e) => {
      if (e.length === 0) return e;
      const last = e[e.length - 1];
      if (['+', '-', '*', '/'].includes(last)) return e.slice(0, -1) + op;
      return e + op;
    });
  }, []);
  const handleDecimal = useCallback(() => {
    setExpression((e) => {
      const parts = e.split(/[+\-*/]/);
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('.')) return e;
      return e + '.';
    });
  }, []);
  const handleBackspace = useCallback(() => setExpression((e) => e.slice(0, -1)), []);
  const handleClear = useCallback(() => setExpression(''), []);
  const handleEquals = useCallback(() => {
    const result = evalExpression(expression);
    if (result > 0) {
      setExpression(String(Math.round(result * 100) / 100));
    }
  }, [expression]);

  const onSubmit = async () => {
    const totalDollars = evalExpression(expression);
    const totalCents = dollarsToCents(totalDollars);
    if (totalCents <= 0) {
      setSnackbar('Enter an amount');
      return;
    }
    if (!categoryId) {
      setSnackbar('Select a category');
      return;
    }
    if (!account1Id) {
      setSnackbar('Select an account');
      return;
    }

    let splits;
    if (splitEnabled && account2Id) {
      const s1Dollars = evalExpression(split1Expression);
      const s2Dollars = evalExpression(split2Expression);
      const s1Cents = dollarsToCents(s1Dollars);
      const s2Cents = dollarsToCents(s2Dollars);
      if (s1Cents + s2Cents !== totalCents) {
        setSnackbar('Split amounts must equal total');
        return;
      }
      if (account1Id === account2Id) {
        setSnackbar('Accounts must be different');
        return;
      }
      splits = [
        { accountId: account1Id, amountCents: s1Cents },
        { accountId: account2Id, amountCents: s2Cents },
      ];
    } else {
      splits = [{ accountId: account1Id, amountCents: totalCents }];
    }

    try {
      const payload = {
        type,
        totalAmountCents: totalCents,
        currency: settings.baseCurrency,
        categoryId,
        note: note || null,
        date: dateStr,
        splits,
      };

      if (isEditing && transactionId) {
        await updateTransaction(transactionId, payload);
      } else {
        await addTransaction(payload);
      }
      navigation.goBack();
    } catch (e: unknown) {
      setSnackbar((e as Error).message || 'Failed to save');
    }
  };

  const handleDelete = () => {
    if (!transactionId) return;
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeTransaction(transactionId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!loaded) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text variant="titleMedium" style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.segmentWrapper}>
          <SegmentedButtons
            value={type}
            onValueChange={(v) => setType(v as 'income' | 'expense')}
            buttons={[
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expense' },
            ]}
            density="small"
          />
        </View>
        <TouchableOpacity onPress={onSubmit}>
          <Text variant="titleMedium" style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <View style={styles.selectorRow}>
          <TouchableOpacity
            style={styles.selectorCard}
            onPress={() => setAccount1PickerVisible(true)}
          >
            <Icon source={selectedAccount1?.icon ?? 'wallet'} size={24} color={colors.primary} />
            <Text variant="bodySmall" style={styles.selectorLabel}>Account</Text>
            <Text variant="bodyMedium" style={styles.selectorValue} numberOfLines={1}>
              {selectedAccount1?.name ?? 'Select'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectorCard}
            onPress={() => setCategoryPickerVisible(true)}
          >
            <Icon
              source={(selectedCategory?.icon ?? 'shape') as any}
              size={24}
              color={selectedCategory?.color ?? colors.textSecondary}
            />
            <Text variant="bodySmall" style={styles.selectorLabel}>Category</Text>
            <Text variant="bodyMedium" style={styles.selectorValue} numberOfLines={1}>
              {selectedCategory?.name ?? 'Select'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noteCard}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note..."
            placeholderTextColor={colors.textTertiary}
            mode="flat"
            style={styles.noteInput}
            underlineColor="transparent"
            activeUnderlineColor={colors.primary}
            textColor={colors.text}
          />
        </View>

        <View style={styles.splitToggle}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: colors.text }}>Split Payment</Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              Pay from two accounts
            </Text>
          </View>
          <Switch value={splitEnabled} onValueChange={setSplitEnabled} color={colors.primary} />
        </View>

        {splitEnabled && (
          <View style={styles.splitSection}>
            <View style={styles.splitRow}>
              <TouchableOpacity
                style={styles.splitAccountBtn}
                onPress={() => setAccount1PickerVisible(true)}
              >
                <Text variant="bodySmall" style={styles.splitAccountLabel}>
                  {selectedAccount1?.name ?? 'Account 1'}
                </Text>
              </TouchableOpacity>
              <TextInput
                value={split1Expression}
                onChangeText={setSplit1Expression}
                keyboardType="decimal-pad"
                mode="outlined"
                style={styles.splitAmountInput}
                dense
                textColor={colors.text}
              />
            </View>
            <View style={styles.splitRow}>
              <TouchableOpacity
                style={styles.splitAccountBtn}
                onPress={() => setAccount2PickerVisible(true)}
              >
                <Text variant="bodySmall" style={styles.splitAccountLabel}>
                  {selectedAccount2?.name ?? 'Account 2'}
                </Text>
              </TouchableOpacity>
              <TextInput
                value={split2Expression}
                onChangeText={setSplit2Expression}
                keyboardType="decimal-pad"
                mode="outlined"
                style={styles.splitAmountInput}
                dense
                textColor={colors.text}
              />
            </View>
          </View>
        )}

        <View style={styles.dateRow}>
          <Icon source="calendar" size={20} color={colors.textSecondary} />
          <TextInput
            value={dateStr}
            onChangeText={setDateStr}
            mode="flat"
            style={styles.dateInput}
            underlineColor="transparent"
            activeUnderlineColor={colors.primary}
            textColor={colors.text}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {isEditing && (
          <Button
            mode="outlined"
            onPress={handleDelete}
            textColor={colors.error}
            style={styles.deleteButton}
          >
            Delete Transaction
          </Button>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomSection}>
        <AmountDisplay
          expression={expression}
          currencySymbol={settings.currencySymbol}
          type={type}
        />
        <CalculatorPad
          onDigit={handleDigit}
          onOperator={handleOperator}
          onDecimal={handleDecimal}
          onBackspace={handleBackspace}
          onEquals={handleEquals}
          onClear={handleClear}
        />
      </View>

      <CategoryPicker
        visible={categoryPickerVisible}
        onDismiss={() => setCategoryPickerVisible(false)}
        onSelect={(cat) => setCategoryId(cat.id)}
        categories={filteredCategories}
        selectedId={categoryId}
      />
      <AccountPicker
        visible={account1PickerVisible}
        onDismiss={() => setAccount1PickerVisible(false)}
        onSelect={(acc) => setAccount1Id(acc.id)}
        accounts={accounts}
        selectedId={account1Id}
      />
      <AccountPicker
        visible={account2PickerVisible}
        onDismiss={() => setAccount2PickerVisible(false)}
        onSelect={(acc) => setAccount2Id(acc.id)}
        accounts={accounts.filter((a) => a.id !== account1Id)}
        selectedId={account2Id}
      />
      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  cancelText: { color: colors.textSecondary, fontSize: 16 },
  saveText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  segmentWrapper: { flex: 1, marginHorizontal: spacing.md },
  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.md },
  selectorRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  selectorCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  selectorLabel: { color: colors.textSecondary, fontSize: 11 },
  selectorValue: { color: colors.text, fontWeight: '600' },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  noteInput: {
    backgroundColor: 'transparent',
    fontSize: 15,
  },
  splitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  splitSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  splitAccountBtn: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  splitAccountLabel: { color: colors.text },
  splitAmountInput: {
    width: 100,
    backgroundColor: 'transparent',
    height: 40,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  dateInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 15,
  },
  deleteButton: {
    marginTop: spacing.lg,
    borderColor: colors.error,
  },
  bottomSection: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.sm,
  },
});
