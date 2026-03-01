import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TextInput,
  SegmentedButtons,
  Text,
  Icon,
  Snackbar,
  Switch,
} from 'react-native-paper';
import { format, parseISO } from 'date-fns';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { transactionService } from '../services/transactionService';
import CategoryPicker from '../components/CategoryPicker';
import AccountPicker from '../components/AccountPicker';
import CalculatorPad from '../components/CalculatorPad';
import InlineCalendar from '../components/InlineCalendar';
import { colors, spacing, radius } from '../theme';
import { dollarsToCents, formatMoney } from '../utils/money';
import type { RootStackScreenProps } from '../navigation/types';

type PanelType = 'none' | 'calculator' | 'calendar';

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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

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
  const [timeStr, setTimeStr] = useState(format(new Date(), 'HH:mm'));
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [split1Expression, setSplit1Expression] = useState('');
  const [split2Expression, setSplit2Expression] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [account1PickerVisible, setAccount1PickerVisible] = useState(false);
  const [account2PickerVisible, setAccount2PickerVisible] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const [activePanel, setActivePanel] = useState<PanelType>('none');
  const panelAnim = useRef(new Animated.Value(0)).current;

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
          if (txn.date.includes('T')) {
            const parsed = parseISO(txn.date);
            setTimeStr(format(parsed, 'HH:mm'));
          }
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

  const splitSumError = useMemo(() => {
    if (!splitEnabled) return '';
    const total = dollarsToCents(evalExpression(expression));
    const s1 = dollarsToCents(evalExpression(split1Expression));
    const s2 = dollarsToCents(evalExpression(split2Expression));
    if (total > 0 && (s1 + s2) > 0 && s1 + s2 !== total) {
      const diff = Math.abs(s1 + s2 - total);
      return `Split total is off by ${formatMoney(diff, settings.baseCurrency)}`;
    }
    return '';
  }, [splitEnabled, expression, split1Expression, split2Expression, settings.baseCurrency]);

  const handleSplit1Change = useCallback((val: string) => {
    setSplit1Expression(val);
    const total = evalExpression(expression);
    const s1 = evalExpression(val);
    if (total > 0 && s1 > 0 && s1 <= total) {
      const remainder = Math.round((total - s1) * 100) / 100;
      setSplit2Expression(String(remainder));
    }
  }, [expression]);

  const handleSplit2Change = useCallback((val: string) => {
    setSplit2Expression(val);
    const total = evalExpression(expression);
    const s2 = evalExpression(val);
    if (total > 0 && s2 > 0 && s2 <= total) {
      const remainder = Math.round((total - s2) * 100) / 100;
      setSplit1Expression(String(remainder));
    }
  }, [expression]);

  const togglePanel = useCallback((panel: PanelType) => {
    Keyboard.dismiss();
    setShowTimePicker(false);
    setActivePanel((prev) => {
      const next = prev === panel ? 'none' : panel;
      Animated.timing(panelAnim, {
        toValue: next === 'none' ? 0 : 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
      return next;
    });
  }, [panelAnim]);

  const closePanel = useCallback(() => {
    setActivePanel('none');
    Animated.timing(panelAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [panelAnim]);

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
    if (splitEnabled) {
      if (!account2Id) {
        setSnackbar('Select a second account for the split');
        return;
      }
      if (account1Id === account2Id) {
        setSnackbar('Accounts must be different');
        return;
      }
      const s1Dollars = evalExpression(split1Expression);
      const s2Dollars = evalExpression(split2Expression);
      const s1Cents = dollarsToCents(s1Dollars);
      const s2Cents = dollarsToCents(s2Dollars);
      if (s1Cents <= 0 || s2Cents <= 0) {
        setSnackbar('Both split amounts must be greater than zero');
        return;
      }
      if (s1Cents + s2Cents !== totalCents) {
        setSnackbar('Split amounts must equal total');
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
      const fullDate = `${dateStr}T${timeStr}:00`;
      const payload = {
        type,
        totalAmountCents: totalCents,
        currency: settings.baseCurrency,
        categoryId,
        note: note || null,
        date: fullDate,
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

  const amountColor = type === 'income' ? colors.income : colors.expense;
  const dateLabel = format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy');
  const [hh, mm] = timeStr.split(':').map(Number);
  const timeLabel = format(new Date(2000, 0, 1, hh, mm), 'h:mm a');
  const totalForSplit = evalExpression(expression);

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon source="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {isEditing ? 'Edit transaction' : 'Add transaction'}
        </Text>
        <TouchableOpacity onPress={onSubmit} hitSlop={12}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.typeSwitcherRow}>
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 80}
      >
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.selectorRow}>
            <TouchableOpacity
              style={styles.selectorCard}
              onPress={() => setAccount1PickerVisible(true)}
            >
              <View style={[styles.selectorIcon, { backgroundColor: colors.primary + '18' }]}>
                <Icon source={selectedAccount1?.icon ?? 'wallet'} size={20} color={colors.primary} />
              </View>
              <View style={styles.selectorTextCol}>
                <Text style={styles.selectorLabel}>Account</Text>
                <Text style={styles.selectorValue} numberOfLines={1}>
                  {selectedAccount1?.name ?? 'Select'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.selectorDivider} />

            <TouchableOpacity
              style={styles.selectorCard}
              onPress={() => setCategoryPickerVisible(true)}
            >
              <View style={[styles.selectorIcon, { backgroundColor: (selectedCategory?.color ?? colors.textSecondary) + '18' }]}>
                <Icon
                  source={(selectedCategory?.icon ?? 'shape') as any}
                  size={20}
                  color={selectedCategory?.color ?? colors.textSecondary}
                />
              </View>
              <View style={styles.selectorTextCol}>
                <Text style={styles.selectorLabel}>Category</Text>
                <Text style={styles.selectorValue} numberOfLines={1}>
                  {selectedCategory?.name ?? 'Select'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.noteAmountCard}>
            <View style={styles.noteRow}>
              <Icon source={(selectedCategory?.icon ?? 'pencil') as any} size={28} color={colors.textTertiary} />
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Description"
                placeholderTextColor={colors.textTertiary}
                mode="flat"
                style={styles.noteInput}
                underlineColor={colors.border}
                activeUnderlineColor={colors.textSecondary}
                textColor={colors.text}
              />
            </View>
            <View style={styles.amountRow}>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>{settings.currencySymbol}</Text>
              </View>
              <TextInput
                value={expression}
                onChangeText={setExpression}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                mode="flat"
                style={styles.amountInput}
                underlineColor={amountColor}
                activeUnderlineColor={amountColor}
                textColor={amountColor}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.splitToggle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.splitTitle}>Split Payment</Text>
              <Text style={styles.splitSubtitle}>Pay from two accounts</Text>
            </View>
            <Switch value={splitEnabled} onValueChange={setSplitEnabled} color={colors.primary} />
          </View>

          {splitEnabled && (
            <View style={styles.splitSection}>
              <View style={styles.splitCard}>
                <TouchableOpacity
                  style={styles.splitAccountChip}
                  onPress={() => setAccount1PickerVisible(true)}
                >
                  <Text style={styles.splitAccountText} numberOfLines={1}>
                    {selectedAccount1?.name ?? 'Account 1'}
                  </Text>
                  <Icon source="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.splitInputRow}>
                  <Text style={styles.splitCurrency}>{settings.currencySymbol}</Text>
                  <TextInput
                    value={split1Expression}
                    onChangeText={handleSplit1Change}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    mode="flat"
                    style={styles.splitAmountInput}
                    underlineColor={colors.border}
                    activeUnderlineColor={colors.primary}
                    textColor={colors.text}
                    dense
                  />
                </View>
              </View>

              <View style={styles.splitDividerRow}>
                <View style={styles.splitDividerLine} />
                <View style={styles.splitPlusCircle}>
                  <Icon source="plus" size={14} color={colors.textSecondary} />
                </View>
                <View style={styles.splitDividerLine} />
              </View>

              <View style={styles.splitCard}>
                <TouchableOpacity
                  style={styles.splitAccountChip}
                  onPress={() => setAccount2PickerVisible(true)}
                >
                  <Text style={styles.splitAccountText} numberOfLines={1}>
                    {selectedAccount2?.name ?? 'Account 2'}
                  </Text>
                  <Icon source="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.splitInputRow}>
                  <Text style={styles.splitCurrency}>{settings.currencySymbol}</Text>
                  <TextInput
                    value={split2Expression}
                    onChangeText={handleSplit2Change}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    mode="flat"
                    style={styles.splitAmountInput}
                    underlineColor={colors.border}
                    activeUnderlineColor={colors.primary}
                    textColor={colors.text}
                    dense
                  />
                </View>
              </View>

              {totalForSplit > 0 && (
                <Text style={styles.splitTotalLabel}>
                  Total: {settings.currencySymbol} {totalForSplit}
                </Text>
              )}

              {!!splitSumError && (
                <View style={styles.splitErrorRow}>
                  <Icon source="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={styles.splitErrorText}>{splitSumError}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateChip}
              onPress={() => togglePanel('calendar')}
            >
              <Icon source="calendar" size={18} color={colors.primary} />
              <Text style={styles.dateChipText}>{dateLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateChip}
              onPress={() => {
                Keyboard.dismiss();
                setShowTimePicker((v) => !v);
                if (activePanel !== 'none') closePanel();
              }}
            >
              <Icon source="clock-outline" size={18} color={colors.primary} />
              <Text style={styles.dateChipText}>{timeLabel}</Text>
            </TouchableOpacity>
          </View>

          {showTimePicker && (
            <View style={styles.timePickerContainer}>
              <View style={styles.timePickerHeader}>
                <Text style={styles.timePickerTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.timePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timePickerBody}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnLabel}>Hour</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {HOURS.map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.timeOption, hh === h && styles.timeOptionActive]}
                        onPress={() => setTimeStr(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)}
                      >
                        <Text style={[styles.timeOptionText, hh === h && styles.timeOptionTextActive]}>
                          {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnLabel}>Minute</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {MINUTES.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.timeOption, mm === m && styles.timeOptionActive]}
                        onPress={() => setTimeStr(`${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`)}
                      >
                        <Text style={[styles.timeOptionText, mm === m && styles.timeOptionTextActive]}>
                          {String(m).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}

          {isEditing && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Icon source="trash-can-outline" size={20} color={colors.error} />
              <Text style={styles.deleteText}>Delete Transaction</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {activePanel !== 'none' && (
        <Animated.View style={[styles.panelOverlay]}>
          {activePanel === 'calculator' && (
            <View style={styles.calcPanel}>
              <View style={styles.calcAmountRow}>
                <Text style={[styles.calcAmountText, { color: amountColor }]}>
                  {settings.currencySymbol} {expression || '0'}
                </Text>
              </View>
              <CalculatorPad
                onDigit={handleDigit}
                onOperator={handleOperator}
                onDecimal={handleDecimal}
                onBackspace={handleBackspace}
                onEquals={handleEquals}
                onClear={handleClear}
              />
            </View>
          )}
          {activePanel === 'calendar' && (
            <InlineCalendar
              selectedDate={dateStr}
              onDateSelect={(d) => setDateStr(d)}
              onDone={closePanel}
            />
          )}
        </Animated.View>
      )}

      <View style={[styles.bottomToolbar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity
          style={[styles.toolbarBtn, activePanel === 'calendar' && styles.toolbarBtnActive]}
          onPress={() => togglePanel('calendar')}
        >
          <Icon source="calendar-month" size={24} color={activePanel === 'calendar' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.toolbarLabel, activePanel === 'calendar' && { color: colors.primary }]}>
            Date
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarBtn, showTimePicker && styles.toolbarBtnActive]}
          onPress={() => {
            if (activePanel !== 'none') closePanel();
            setShowTimePicker((v) => !v);
          }}
        >
          <Icon source="clock-outline" size={24} color={showTimePicker ? colors.primary : colors.textSecondary} />
          <Text style={[styles.toolbarLabel, showTimePicker && { color: colors.primary }]}>
            Time
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarBtn, activePanel === 'calculator' && styles.toolbarBtnActive]}
          onPress={() => togglePanel('calculator')}
        >
          <Icon source="calculator" size={24} color={activePanel === 'calculator' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.toolbarLabel, activePanel === 'calculator' && { color: colors.primary }]}>
            Calculator
          </Text>
        </TouchableOpacity>
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
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  topBarTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  saveText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },

  typeSwitcherRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },

  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 120,
  },

  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  selectorCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorTextCol: {
    flex: 1,
  },
  selectorLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  selectorValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.xxs,
  },
  selectorDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },

  noteAmountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  noteInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 18,
    height: spacing.section,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currencyBadge: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  currencyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  amountInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 28,
    fontWeight: '700',
    height: 52,
  },

  splitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  splitTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  splitSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xxs,
  },

  splitSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  splitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  splitAccountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.capsule,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
    maxWidth: 140,
  },
  splitAccountText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  splitInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitCurrency: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginRight: spacing.xxs,
  },
  splitAmountInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
    height: 40,
  },
  splitDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  splitDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  splitPlusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  splitTotalLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  splitErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  splitErrorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '500',
  },

  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.capsule,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dateChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },

  timePickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  timePickerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  timePickerDone: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  timePickerBody: {
    flexDirection: 'row',
    height: 180,
  },
  timeColumn: {
    flex: 1,
  },
  timeColumnLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  timeScroll: {
    flex: 1,
  },
  timeOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  timeOptionActive: {
    backgroundColor: colors.primary + '18',
  },
  timeOptionText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  timeOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  deleteText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
  },

  panelOverlay: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  calcPanel: {
    paddingTop: spacing.sm,
  },
  calcAmountRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  calcAmountText: {
    fontSize: 36,
    fontWeight: '700',
  },

  bottomToolbar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  toolbarBtnActive: {
    backgroundColor: colors.primary + '15',
    borderRadius: radius.capsule,
  },
  toolbarLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
