import { format, parseISO } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Icon,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFDStore } from '@/stores/useFDStore';
import AccountPicker from '../components/AccountPicker';
import CalculatorPad from '../components/CalculatorPad';
import CategoryPicker from '../components/CategoryPicker';
import InlineCalendar from '../components/InlineCalendar';
import type { SplitInput, TransactionType } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';
import { transactionService } from '../services/transactionService';
import { useAccountStore } from '../stores/useAccountStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { colors, radius, spacing } from '../theme';
import { dollarsToCents, formatMoney } from '../utils/money';

type PanelType = 'none' | 'calculator' | 'calendar';

function evalExpression(expr: string): number {
  try {
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    if (/[^0-9+\-*/.() ]/.test(sanitized)) return 0;
    const result = Function(`"use strict"; return (${sanitized})`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) return 0;
    return Math.max(0, result);
  } catch {
    return 0;
  }
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const FORM_SURFACE = '#171A24';
const FORM_SURFACE_ELEVATED = '#1D2230';
const FORM_SURFACE_MUTED = '#23293A';
const FORM_BORDER = 'rgba(255, 255, 255, 0.10)';
const FORM_HAIRLINE = 'rgba(255, 255, 255, 0.08)';

/** Snap to 5-minute steps used by the picker wheels */
function normalizeMinuteForPicker(mm: number): number {
  if (!Number.isFinite(mm)) return 0;
  const r = Math.round(mm / 5) * 5;
  if (r >= 60) return 55;
  if (r < 0) return 0;
  return r;
}

function parseTimeStr(timeStr: string): { hh: number; mm: number } {
  const now = new Date();
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(timeStr.trim());
  if (!match) {
    return {
      hh: now.getHours(),
      mm: normalizeMinuteForPicker(now.getMinutes()),
    };
  }
  let hh = parseInt(match[1], 10);
  let mm = parseInt(match[2], 10);
  if (!Number.isFinite(hh) || hh < 0 || hh > 23) hh = now.getHours();
  if (!Number.isFinite(mm) || mm < 0 || mm > 59) mm = now.getMinutes();
  return { hh, mm: normalizeMinuteForPicker(mm) };
}

const TIME_PICKER_ROW_H = 44;

const isTransfer = (t: TransactionType) => t === 'transfer';

export default function AddTransactionScreen({
  navigation,
  route,
}: RootStackScreenProps<'AddTransaction'>) {
  const insets = useSafeAreaInsets();
  const params = route.params;

  const {
    transactionId,
    accountId: initialAccountId = '',
    categoryId: initialCategoryId = '',
    type: initialType = 'expense',
  } = params ?? {};

  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore(
    (state) => state.updateTransaction,
  );
  const removeTransaction = useTransactionStore(
    (state) => state.removeTransaction,
  );
  const categories = useCategoryStore((state) => state.categories);
  const loadCategories = useCategoryStore((state) => state.loadCategories);
  const accounts = useAccountStore((state) => state.accounts);
  const loadAccounts = useAccountStore((state) => state.loadAccounts);
  const fdAccountIds = useFDStore((state) => state.fdAccountIds);
  const loadDeposits = useFDStore((state) => state.loadDeposits);
  const settings = useSettingsStore((state) => state.settings);

  const [existing, setExisting] = useState<Awaited<
    ReturnType<typeof transactionService.getById>
  > | null>(null);
  const [loaded, setLoaded] = useState(!transactionId);
  const isEditing = !!existing;

  const [type, setType] = useState<TransactionType>(initialType);
  const [expression, setExpression] = useState('');
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [account1Id, setAccount1Id] = useState(initialAccountId);
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

  const filteredCategories = isTransfer(type)
    ? []
    : categories.filter((c) => c.type === type);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedAccount1 = accounts.find((a) => a.id === account1Id);
  const selectedAccount2 = accounts.find((a) => a.id === account2Id);

  useEffect(() => {
    void loadCategories();
    void loadAccounts();
    void loadDeposits();
  }, [loadAccounts, loadCategories, loadDeposits]);
  //Set default account when there is no account
  useEffect(() => {
    if (accounts.length > 0 && !account1Id) {
      setAccount1Id(accounts[0].id);
    }
  }, [accounts, account1Id]);

  useEffect(() => {
    if (transactionId) {
      transactionService.getById(transactionId).then((txn) => {
        if (txn) {
          setExisting(txn);
          setType(txn.type);
          setExpression(String(txn.totalAmountCents / 100));
          setCategoryId(txn.categoryId ?? '');
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
          if (txn.type === 'transfer' && txn.splits.length > 1) {
            setAccount2Id(txn.splits[1].accountId);
          } else if (txn.splits.length > 1) {
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
    if (isTransfer(type)) {
      setCategoryId('');
      setSplitEnabled(false);
    } else if (selectedCategory && selectedCategory.type !== type) {
      setCategoryId('');
    }
  }, [type]);

  const userAccounts = useMemo(
    () => accounts.filter((acc) => !fdAccountIds.has(acc.id)),
    [accounts, fdAccountIds],
  );

  const pickerTime = useMemo(() => parseTimeStr(timeStr), [timeStr]);

  const hourListRef = useRef<FlatList<number>>(null);
  const minuteListRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    if (!showTimePicker) return;
    const { hh, mm } = parseTimeStr(timeStr);
    const safeMi = Math.max(0, MINUTES.indexOf(mm));

    const align = () => {
      hourListRef.current?.scrollToIndex({
        index: hh,
        animated: false,
        viewPosition: 0.45,
      });
      minuteListRef.current?.scrollToIndex({
        index: safeMi,
        animated: false,
        viewPosition: 0.45,
      });
    };

    const t = setTimeout(align, 60);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll wheels only when modal opens (timeStr read from opening render)
  }, [showTimePicker]);

  const splitSumError = useMemo(() => {
    if (!splitEnabled) return '';
    const total = dollarsToCents(evalExpression(expression));
    const s1 = dollarsToCents(evalExpression(split1Expression));
    const s2 = dollarsToCents(evalExpression(split2Expression));
    if (total > 0 && s1 + s2 > 0 && s1 + s2 !== total) {
      const diff = Math.abs(s1 + s2 - total);
      return `Split total is off by ${formatMoney(diff, settings.currencySymbol)}`;
    }
    return '';
  }, [
    splitEnabled,
    expression,
    split1Expression,
    split2Expression,
    settings.currencySymbol,
  ]);

  const handleSplit1Change = useCallback(
    (val: string) => {
      setSplit1Expression(val);
      const total = evalExpression(expression);
      const s1 = evalExpression(val);
      if (total > 0 && s1 > 0 && s1 <= total) {
        const remainder = Math.round((total - s1) * 100) / 100;
        setSplit2Expression(String(remainder));
      }
    },
    [expression],
  );

  const handleSplit2Change = useCallback(
    (val: string) => {
      setSplit2Expression(val);
      const total = evalExpression(expression);
      const s2 = evalExpression(val);
      if (total > 0 && s2 > 0 && s2 <= total) {
        const remainder = Math.round((total - s2) * 100) / 100;
        setSplit1Expression(String(remainder));
      }
    },
    [expression],
  );

  const togglePanel = useCallback((panel: PanelType) => {
    Keyboard.dismiss();
    setShowTimePicker(false);
    setActivePanel((prev) => (prev === panel ? 'none' : panel));
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel('none');
  }, []);

  const handleTimePress = useCallback(() => {
    Keyboard.dismiss();
    setActivePanel('none');
    setShowTimePicker((v) => !v);
  }, []);

  const handleDigit = useCallback(
    (d: string) => setExpression((e) => e + d),
    [],
  );
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
      return `${e}.`;
    });
  }, []);
  const handleBackspace = useCallback(
    () => setExpression((e) => e.slice(0, -1)),
    [],
  );
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
    if (!isTransfer(type) && !categoryId) {
      setSnackbar('Select a category');
      return;
    }
    if (!account1Id) {
      setSnackbar(
        isTransfer(type) ? 'Select a From account' : 'Select an account',
      );
      return;
    }

    let splits: SplitInput[];

    if (isTransfer(type)) {
      if (!account2Id) {
        setSnackbar('Select a To account');
        return;
      }
      if (account1Id === account2Id) {
        setSnackbar('From and To accounts must be different');
        return;
      }
      splits = [
        { accountId: account1Id, amountCents: totalCents },
        { accountId: account2Id, amountCents: totalCents },
      ];
    } else if (splitEnabled) {
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
      const { hh: saveH, mm: saveM } = parseTimeStr(timeStr);
      const fullDate = `${dateStr}T${String(saveH).padStart(2, '0')}:${String(saveM).padStart(2, '0')}:00`;
      const payload = {
        type,
        totalAmountCents: totalCents,
        currency: settings.currencyCode,
        categoryId: isTransfer(type) ? null : categoryId,
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

  if (!loaded) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const amountColor =
    type === 'income'
      ? colors.income
      : type === 'expense'
        ? colors.expense
        : colors.transfer;
  const dateLabel = format(new Date(`${dateStr}T00:00:00`), 'MMM d, yyyy');
  const { hh, mm } = pickerTime;
  const timeLabel = format(new Date(2000, 0, 1, hh, mm), 'h:mm a');
  const totalForSplit = evalExpression(expression);

  const typeSwitcherTint =
    type === 'income'
      ? `${colors.income}20`
      : type === 'expense'
        ? `${colors.expense}20`
        : `${colors.transfer}20`;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={16}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon source="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text
          style={styles.headerTitle}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {isEditing ? 'Edit transaction' : 'New transaction'}
        </Text>
        <TouchableOpacity
          onPress={onSubmit}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          style={[styles.headerSaveHit, styles.headerSavePill]}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Save changes' : 'Save'}
        >
          <Text style={styles.headerSaveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        {/* ── Type Switcher ── */}
        <View
          style={[styles.typeSwitcher, { backgroundColor: typeSwitcherTint }]}
        >
          <TouchableOpacity
            style={[
              styles.typeTab,
              type === 'expense' && [
                styles.typeTabActive,
                { backgroundColor: colors.expense },
              ],
            ]}
            onPress={() => setType('expense')}
            activeOpacity={0.7}
          >
            <Icon
              source="arrow-top-right"
              size={16}
              color={
                type === 'expense' ? colors.onPrimary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.typeTabText,
                type === 'expense' && styles.typeTabTextActive,
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeTab,
              type === 'income' && [
                styles.typeTabActive,
                { backgroundColor: colors.income },
              ],
            ]}
            onPress={() => setType('income')}
            activeOpacity={0.7}
          >
            <Icon
              source="arrow-bottom-left"
              size={16}
              color={type === 'income' ? colors.onPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.typeTabText,
                type === 'income' && styles.typeTabTextActive,
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeTab,
              type === 'transfer' && [
                styles.typeTabActive,
                { backgroundColor: colors.transfer },
              ],
            ]}
            onPress={() => setType('transfer')}
            activeOpacity={0.7}
          >
            <Icon
              source="swap-horizontal"
              size={16}
              color={
                type === 'transfer' ? colors.onPrimary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.typeTabText,
                type === 'transfer' && styles.typeTabTextActive,
              ]}
            >
              Transfer
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Amount Hero ── */}
          <View
            style={[styles.amountHero, { borderColor: `${amountColor}30` }]}
          >
            <View
              style={[styles.amountAccent, { backgroundColor: amountColor }]}
            />
            <View style={styles.amountContent}>
              <Text style={styles.amountLabel}>Amount</Text>
              <View style={styles.amountInputRow}>
                <Text style={[styles.currencySymbol, { color: amountColor }]}>
                  {settings.currencySymbol}
                </Text>
                <TextInput
                  value={expression}
                  onChangeText={setExpression}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  mode="flat"
                  style={styles.amountInput}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  textColor={amountColor}
                  cursorColor={amountColor}
                  selectionColor={`${amountColor}40`}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.calcTrigger,
                { backgroundColor: `${amountColor}18` },
              ]}
              onPress={() => togglePanel('calculator')}
              activeOpacity={0.7}
            >
              <Icon source="calculator-variant" size={22} color={amountColor} />
            </TouchableOpacity>
          </View>

          {/* ── Account & Category Selectors ── */}
          <Text style={styles.sectionLabel}>DETAILS</Text>
          {isTransfer(type) ? (
            <View style={styles.selectorsCard}>
              <TouchableOpacity
                style={styles.selectorRow}
                onPress={() => setAccount1PickerVisible(true)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.selectorIconWrap,
                    { backgroundColor: `${colors.expense}18` },
                  ]}
                >
                  <Icon
                    source={selectedAccount1?.icon ?? 'wallet'}
                    size={20}
                    color={colors.expense}
                  />
                </View>
                <View style={styles.selectorTextCol}>
                  <Text style={styles.selectorLabel}>From Account</Text>
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {selectedAccount1?.name ?? 'Select account'}
                  </Text>
                </View>
                <Icon source="menu-down" size={22} color={colors.textTertiary} />
              </TouchableOpacity>

              <View style={styles.selectorDivider} />

              <View style={styles.transferArrowRow}>
                <Icon source="arrow-down" size={18} color={colors.transfer} />
              </View>

              <View style={styles.selectorDivider} />

              <TouchableOpacity
                style={styles.selectorRow}
                onPress={() => setAccount2PickerVisible(true)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.selectorIconWrap,
                    { backgroundColor: `${colors.income}18` },
                  ]}
                >
                  <Icon
                    source={selectedAccount2?.icon ?? 'wallet'}
                    size={20}
                    color={colors.income}
                  />
                </View>
                <View style={styles.selectorTextCol}>
                  <Text style={styles.selectorLabel}>To Account</Text>
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {selectedAccount2?.name ?? 'Select account'}
                  </Text>
                </View>
                <Icon source="menu-down" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectorsCard}>
              <TouchableOpacity
                style={styles.selectorRow}
                onPress={() => setCategoryPickerVisible(true)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.selectorIconWrap,
                    {
                      backgroundColor:
                        (selectedCategory?.color ?? colors.textSecondary) +
                        '18',
                    },
                  ]}
                >
                  <Icon
                    source={(selectedCategory?.icon ?? 'shape') as any}
                    size={20}
                    color={selectedCategory?.color ?? colors.textSecondary}
                  />
                </View>
                <View style={styles.selectorTextCol}>
                  <Text style={styles.selectorLabel}>Category</Text>
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {selectedCategory?.name ?? 'Select category'}
                  </Text>
                </View>
                <Icon
                  source="menu-down"
                  size={22}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              <View style={styles.selectorDivider} />

              <TouchableOpacity
                style={styles.selectorRow}
                onPress={() => setAccount1PickerVisible(true)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.selectorIconWrap,
                    { backgroundColor: `${colors.primary}18` },
                  ]}
                >
                  <Icon
                    source={selectedAccount1?.icon ?? 'wallet'}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.selectorTextCol}>
                  <Text style={styles.selectorLabel}>Account</Text>
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {selectedAccount1?.name ?? 'Select account'}
                  </Text>
                </View>
                <Icon
                  source="menu-down"
                  size={22}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionLabel}>WHEN</Text>
          <View style={styles.whenCard}>
            <View style={styles.whenCombinedRow}>
              <TouchableOpacity
                style={[
                  styles.whenHalf,
                  activePanel === 'calendar' && styles.whenHalfActive,
                ]}
                onPress={() => togglePanel('calendar')}
                activeOpacity={0.65}
                accessibilityRole="button"
                accessibilityLabel={`Date ${dateLabel}`}
              >
                <Icon
                  source="calendar-month-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.whenCombinedValue} numberOfLines={1}>
                  {dateLabel}
                </Text>
              </TouchableOpacity>

              <Text style={styles.whenMiddleDot}>·</Text>

              <TouchableOpacity
                style={[
                  styles.whenHalf,
                  showTimePicker && styles.whenHalfActive,
                ]}
                onPress={handleTimePress}
                activeOpacity={0.65}
                accessibilityRole="button"
                accessibilityLabel={`Time ${timeLabel}`}
              >
                <Icon source="clock-outline" size={18} color={colors.primary} />
                <Text style={styles.whenCombinedValue} numberOfLines={1}>
                  {timeLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Note ── */}
          <View style={styles.noteCard}>
            <View style={styles.noteIconWrap}>
              <Icon source="text" size={18} color={colors.textTertiary} />
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note..."
              placeholderTextColor={colors.textTertiary}
              mode="flat"
              style={styles.noteInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              textColor={colors.text}
              cursorColor={colors.primary}
              selectionColor={`${colors.primary}40`}
              multiline
              maxLength={200}
            />
          </View>

          {/* ── Split Payment (hidden for transfers) ── */}
          {!isTransfer(type) && (
            <>
              <Text style={styles.sectionLabel}>PAYMENT</Text>
              <View style={styles.splitToggleCard}>
                <View style={styles.splitToggleLeft}>
                  <View
                    style={[
                      styles.splitToggleIcon,
                      { backgroundColor: `${colors.transfer}18` },
                    ]}
                  >
                    <Icon
                      source="call-split"
                      size={18}
                      color={colors.transfer}
                    />
                  </View>
                  <View>
                    <Text style={styles.splitTitle}>Split Payment</Text>
                    <Text style={styles.splitSubtitle}>
                      Pay from two accounts
                    </Text>
                  </View>
                </View>
                <Switch
                  value={splitEnabled}
                  onValueChange={setSplitEnabled}
                  color={colors.primary}
                />
              </View>

              {splitEnabled && (
                <View style={styles.splitSection}>
                  <View style={styles.splitAccountCard}>
                    <View style={styles.splitAccountHeader}>
                      <View
                        style={[
                          styles.splitDot,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                      <TouchableOpacity
                        style={styles.splitAccountChip}
                        onPress={() => setAccount1PickerVisible(true)}
                      >
                        <Text style={styles.splitAccountText} numberOfLines={1}>
                          {selectedAccount1?.name ?? 'Account 1'}
                        </Text>
                        <Icon
                          source="chevron-down"
                          size={14}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.splitInputRow}>
                      <Text style={styles.splitCurrency}>
                        {settings.currencySymbol}
                      </Text>
                      <TextInput
                        value={split1Expression}
                        onChangeText={handleSplit1Change}
                        placeholder="0.00"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="decimal-pad"
                        mode="flat"
                        style={styles.splitAmountInput}
                        underlineColor="transparent"
                        activeUnderlineColor={colors.primary}
                        textColor={colors.text}
                        cursorColor={colors.primary}
                        selectionColor={`${colors.primary}40`}
                      />
                    </View>
                  </View>

                  <View style={styles.splitConnector}>
                    <View style={styles.splitConnectorLine} />
                    <View style={styles.splitPlusCircle}>
                      <Icon
                        source="plus"
                        size={12}
                        color={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.splitConnectorLine} />
                  </View>

                  <View style={styles.splitAccountCard}>
                    <View style={styles.splitAccountHeader}>
                      <View
                        style={[
                          styles.splitDot,
                          { backgroundColor: colors.transfer },
                        ]}
                      />
                      <TouchableOpacity
                        style={styles.splitAccountChip}
                        onPress={() => setAccount2PickerVisible(true)}
                      >
                        <Text style={styles.splitAccountText} numberOfLines={1}>
                          {selectedAccount2?.name ?? 'Account 2'}
                        </Text>
                        <Icon
                          source="chevron-down"
                          size={14}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.splitInputRow}>
                      <Text style={styles.splitCurrency}>
                        {settings.currencySymbol}
                      </Text>
                      <TextInput
                        value={split2Expression}
                        onChangeText={handleSplit2Change}
                        placeholder="0.00"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="decimal-pad"
                        mode="flat"
                        style={styles.splitAmountInput}
                        underlineColor="transparent"
                        activeUnderlineColor={colors.primary}
                        textColor={colors.text}
                        cursorColor={colors.primary}
                        selectionColor={`${colors.primary}40`}
                      />
                    </View>
                  </View>

                  {totalForSplit > 0 && (
                    <View style={styles.splitTotalRow}>
                      <Text style={styles.splitTotalLabel}>Total</Text>
                      <Text style={styles.splitTotalValue}>
                        {settings.currencySymbol} {totalForSplit}
                      </Text>
                    </View>
                  )}

                  {!!splitSumError && (
                    <View style={styles.splitErrorRow}>
                      <Icon
                        source="alert-circle-outline"
                        size={14}
                        color={colors.error}
                      />
                      <Text style={styles.splitErrorText}>{splitSumError}</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {isEditing && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <View style={styles.deleteIconWrap}>
                <Icon
                  source="trash-can-outline"
                  size={18}
                  color={colors.error}
                />
              </View>
              <Text style={styles.deleteText}>Delete Transaction</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

      {/* ── Sheets (calculator / calendar / time) ── */}
      {activePanel !== 'none' && (
        <View style={styles.sheetSurface}>
          {activePanel === 'calculator' && (
            <View style={styles.calcPanel}>
              <View style={styles.calcHeader}>
                <Text style={styles.calcHeaderLabel}>Calculator</Text>
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
              variant="sheet"
              selectedDate={dateStr}
              onDateSelect={(d) => setDateStr(d)}
              onDone={closePanel}
              surfaceColor={FORM_SURFACE_ELEVATED}
            />
          )}
        </View>
      )}

      </KeyboardAvoidingView>

      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.timeModalRoot}>
          <Pressable
            style={styles.timeModalBackdrop}
            onPress={() => setShowTimePicker(false)}
          />
          <View
            style={[
              styles.timeModalSheet,
              {
                paddingBottom: Math.max(insets.bottom, spacing.md),
                marginBottom: spacing.md,
              },
            ]}
          >
            <View style={styles.timeModalGrabber} />
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.timePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timePickerBody}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>Hour</Text>
                <FlatList
                  ref={hourListRef}
                  data={HOURS}
                  keyExtractor={(item) => `h-${item}`}
                  showsVerticalScrollIndicator={false}
                  style={styles.timeScroll}
                  getItemLayout={(_, index) => ({
                    length: TIME_PICKER_ROW_H,
                    offset: TIME_PICKER_ROW_H * index,
                    index,
                  })}
                  onScrollToIndexFailed={(info) => {
                    const offset = info.averageItemLength * info.index;
                    setTimeout(() => {
                      hourListRef.current?.scrollToOffset({
                        offset,
                        animated: false,
                      });
                    }, 120);
                  }}
                  renderItem={({ item: h }) => (
                    <TouchableOpacity
                      style={[
                        styles.timeOption,
                        hh === h && styles.timeOptionActive,
                      ]}
                      onPress={() =>
                        setTimeStr(
                          `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          hh === h && styles.timeOptionTextActive,
                        ]}
                      >
                        {h === 0
                          ? '12 AM'
                          : h < 12
                            ? `${h} AM`
                            : h === 12
                              ? '12 PM'
                              : `${h - 12} PM`}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              <View style={styles.timeColumnDivider} />
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>Minute</Text>
                <FlatList
                  ref={minuteListRef}
                  data={MINUTES}
                  keyExtractor={(item) => `m-${item}`}
                  showsVerticalScrollIndicator={false}
                  style={styles.timeScroll}
                  getItemLayout={(_, index) => ({
                    length: TIME_PICKER_ROW_H,
                    offset: TIME_PICKER_ROW_H * index,
                    index,
                  })}
                  onScrollToIndexFailed={(info) => {
                    const offset = info.averageItemLength * info.index;
                    setTimeout(() => {
                      minuteListRef.current?.scrollToOffset({
                        offset,
                        animated: false,
                      });
                    }, 120);
                  }}
                  renderItem={({ item: m }) => (
                    <TouchableOpacity
                      style={[
                        styles.timeOption,
                        mm === m && styles.timeOptionActive,
                      ]}
                      onPress={() =>
                        setTimeStr(
                          `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          mm === m && styles.timeOptionTextActive,
                        ]}
                      >
                        {String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modals ── */}
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
        accounts={userAccounts}
        selectedId={account1Id}
      />
      <AccountPicker
        visible={account2PickerVisible}
        onDismiss={() => setAccount2PickerVisible(false)}
        onSelect={(acc) => setAccount2Id(acc.id)}
        accounts={userAccounts.filter((a) => a.id !== account1Id)}
        selectedId={account2Id}
        title={isTransfer(type) ? 'To Account' : undefined}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: FORM_SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSaveHit: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerSavePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.capsule,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* ── Type Switcher ── */
  typeSwitcher: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    padding: 3,
    marginBottom: spacing.lg,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xl - 2,
    gap: spacing.xs + 1,
  },
  typeTabActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  typeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeTabTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },

  /* ── Scroll ── */
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },

  /* ── Amount Hero ── */
  amountHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FORM_SURFACE,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  amountAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  amountContent: {
    flex: 1,
    paddingLeft: spacing.lg,
    paddingVertical: spacing.md,
  },
  amountLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '800',
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 32,
    fontWeight: '800',
    height: 52,
    paddingHorizontal: 0,
  },
  calcTrigger: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  /* ── Section Labels ── */
  sectionLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  /* ── Selectors ── */
  selectorsCard: {
    backgroundColor: FORM_SURFACE,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  selectorIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg + 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorTextCol: {
    flex: 1,
  },
  selectorLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  selectorValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  selectorDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: FORM_HAIRLINE,
    marginLeft: 40 + spacing.lg + spacing.md,
  },
  transferArrowRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },

  whenCard: {
    backgroundColor: FORM_SURFACE,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  whenCombinedRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 52,
  },
  whenHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.sm,
  },
  whenHalfActive: {
    backgroundColor: `${colors.primary}10`,
  },
  whenMiddleDot: {
    alignSelf: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.textTertiary,
    paddingHorizontal: spacing.xxs,
  },
  whenCombinedValue: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  /* ── Note ── */
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FORM_SURFACE,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  noteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    backgroundColor: FORM_SURFACE_MUTED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 0,
  },

  timeModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  timeModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  timeModalSheet: {
    backgroundColor: FORM_SURFACE_ELEVATED,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '56%',
  },
  timeModalGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    marginBottom: spacing.md,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    marginBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FORM_HAIRLINE,
  },
  timePickerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  timePickerDone: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  timePickerBody: {
    flexDirection: 'row',
    height: 168,
  },
  timeColumn: {
    flex: 1,
  },
  timeColumnDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: FORM_HAIRLINE,
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
    height: TIME_PICKER_ROW_H,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  timeOptionActive: {
    backgroundColor: `${colors.primary}22`,
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

  /* ── Split Payment ── */
  splitToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: FORM_SURFACE,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  splitToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  splitToggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  splitSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },

  splitSection: {
    backgroundColor: FORM_SURFACE,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  splitAccountCard: {
    backgroundColor: FORM_SURFACE_MUTED,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  splitAccountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  splitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splitAccountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  splitAccountText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  splitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  splitCurrency: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    marginRight: spacing.xxs,
  },
  splitAmountInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 20,
    fontWeight: '700',
    height: 48,
    paddingHorizontal: 0,
  },
  splitConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  splitConnectorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: FORM_HAIRLINE,
  },
  splitPlusCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: FORM_SURFACE_MUTED,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: FORM_BORDER,
  },
  splitTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FORM_HAIRLINE,
  },
  splitTotalLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  splitTotalValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  splitErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    backgroundColor: `${colors.error}10`,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
  },
  splitErrorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '500',
  },

  /* ── Delete ── */
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    backgroundColor: `${colors.error}0A`,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.error}20`,
  },
  deleteIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.error}18`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
  },

  /* ── Sheets (inline panels) ── */
  sheetSurface: {
    backgroundColor: FORM_SURFACE_ELEVATED,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FORM_BORDER,
  },
  calcPanel: {
    paddingTop: spacing.xs,
  },
  calcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  calcHeaderLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  calcAmountText: {
    fontSize: 28,
    fontWeight: '800',
  },

});
