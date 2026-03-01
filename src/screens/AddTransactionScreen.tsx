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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TextInput,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const typeAnim = useRef(new Animated.Value(initialType === 'income' ? 0 : 1)).current;

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
    Animated.timing(typeAnim, {
      toValue: type === 'income' ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
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
  const amountBg = type === 'income' ? colors.incomeBg : colors.expenseBg;
  const dateLabel = format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy');
  const [hh, mm] = timeStr.split(':').map(Number);
  const timeLabel = format(new Date(2000, 0, 1, hh, mm), 'h:mm a');
  const totalForSplit = evalExpression(expression);

  const typeSwitcherBg = typeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.income + '20', colors.expense + '20'],
  });

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={16}
          style={styles.headerBtn}
        >
          <Icon source="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Transaction' : 'New Transaction'}
        </Text>
        <TouchableOpacity onPress={onSubmit} hitSlop={16} style={styles.saveBtn}>
          <Icon source="check" size={18} color={colors.onPrimary} />
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* ── Type Switcher ── */}
      <Animated.View style={[styles.typeSwitcher, { backgroundColor: typeSwitcherBg }]}>
        <TouchableOpacity
          style={[
            styles.typeTab,
            type === 'expense' && [styles.typeTabActive, { backgroundColor: colors.expense }],
          ]}
          onPress={() => setType('expense')}
          activeOpacity={0.7}
        >
          <Icon
            source="arrow-top-right"
            size={16}
            color={type === 'expense' ? '#fff' : colors.textSecondary}
          />
          <Text style={[styles.typeTabText, type === 'expense' && styles.typeTabTextActive]}>
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeTab,
            type === 'income' && [styles.typeTabActive, { backgroundColor: colors.income }],
          ]}
          onPress={() => setType('income')}
          activeOpacity={0.7}
        >
          <Icon
            source="arrow-bottom-left"
            size={16}
            color={type === 'income' ? '#fff' : colors.textSecondary}
          />
          <Text style={[styles.typeTabText, type === 'income' && styles.typeTabTextActive]}>
            Income
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Amount Hero ── */}
          <View style={[styles.amountHero, { borderColor: amountColor + '30' }]}>
            <View style={[styles.amountAccent, { backgroundColor: amountColor }]} />
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
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.calcTrigger, { backgroundColor: amountColor + '18' }]}
              onPress={() => togglePanel('calculator')}
              activeOpacity={0.7}
            >
              <Icon source="calculator-variant" size={22} color={amountColor} />
            </TouchableOpacity>
          </View>

          {/* ── Account & Category Selectors ── */}
          <Text style={styles.sectionLabel}>DETAILS</Text>
          <View style={styles.selectorsCard}>
            <TouchableOpacity
              style={styles.selectorRow}
              onPress={() => setAccount1PickerVisible(true)}
              activeOpacity={0.6}
            >
              <View style={[styles.selectorIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Icon source={selectedAccount1?.icon ?? 'wallet'} size={20} color={colors.primary} />
              </View>
              <View style={styles.selectorTextCol}>
                <Text style={styles.selectorLabel}>Account</Text>
                <Text style={styles.selectorValue} numberOfLines={1}>
                  {selectedAccount1?.name ?? 'Select account'}
                </Text>
              </View>
              <Icon source="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.selectorDivider} />

            <TouchableOpacity
              style={styles.selectorRow}
              onPress={() => setCategoryPickerVisible(true)}
              activeOpacity={0.6}
            >
              <View
                style={[
                  styles.selectorIconWrap,
                  { backgroundColor: (selectedCategory?.color ?? colors.textSecondary) + '18' },
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
              <Icon source="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
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
            />
          </View>

          {/* ── Date & Time ── */}
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[
                styles.dateTimeChip,
                activePanel === 'calendar' && styles.dateTimeChipActive,
              ]}
              onPress={() => togglePanel('calendar')}
              activeOpacity={0.7}
            >
              <Icon
                source="calendar-month-outline"
                size={18}
                color={activePanel === 'calendar' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.dateTimeText,
                  activePanel === 'calendar' && { color: colors.primary },
                ]}
              >
                {dateLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateTimeChip, showTimePicker && styles.dateTimeChipActive]}
              onPress={() => {
                Keyboard.dismiss();
                setShowTimePicker((v) => !v);
                if (activePanel !== 'none') closePanel();
              }}
              activeOpacity={0.7}
            >
              <Icon
                source="clock-outline"
                size={18}
                color={showTimePicker ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[styles.dateTimeText, showTimePicker && { color: colors.primary }]}
              >
                {timeLabel}
              </Text>
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
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {HOURS.map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.timeOption, hh === h && styles.timeOptionActive]}
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
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.timeColumnDivider} />
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnLabel}>Minute</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {MINUTES.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.timeOption, mm === m && styles.timeOptionActive]}
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
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}

          {/* ── Split Payment ── */}
          <Text style={styles.sectionLabel}>PAYMENT</Text>
          <View style={styles.splitToggleCard}>
            <View style={styles.splitToggleLeft}>
              <View style={[styles.splitToggleIcon, { backgroundColor: colors.transfer + '18' }]}>
                <Icon source="call-split" size={18} color={colors.transfer} />
              </View>
              <View>
                <Text style={styles.splitTitle}>Split Payment</Text>
                <Text style={styles.splitSubtitle}>Pay from two accounts</Text>
              </View>
            </View>
            <Switch value={splitEnabled} onValueChange={setSplitEnabled} color={colors.primary} />
          </View>

          {splitEnabled && (
            <View style={styles.splitSection}>
              <View style={styles.splitAccountCard}>
                <View style={styles.splitAccountHeader}>
                  <View style={[styles.splitDot, { backgroundColor: colors.primary }]} />
                  <TouchableOpacity
                    style={styles.splitAccountChip}
                    onPress={() => setAccount1PickerVisible(true)}
                  >
                    <Text style={styles.splitAccountText} numberOfLines={1}>
                      {selectedAccount1?.name ?? 'Account 1'}
                    </Text>
                    <Icon source="chevron-down" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.splitInputRow}>
                  <Text style={styles.splitCurrency}>{settings.currencySymbol}</Text>
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
                    dense
                  />
                </View>
              </View>

              <View style={styles.splitConnector}>
                <View style={styles.splitConnectorLine} />
                <View style={styles.splitPlusCircle}>
                  <Icon source="plus" size={12} color={colors.textSecondary} />
                </View>
                <View style={styles.splitConnectorLine} />
              </View>

              <View style={styles.splitAccountCard}>
                <View style={styles.splitAccountHeader}>
                  <View style={[styles.splitDot, { backgroundColor: colors.transfer }]} />
                  <TouchableOpacity
                    style={styles.splitAccountChip}
                    onPress={() => setAccount2PickerVisible(true)}
                  >
                    <Text style={styles.splitAccountText} numberOfLines={1}>
                      {selectedAccount2?.name ?? 'Account 2'}
                    </Text>
                    <Icon source="chevron-down" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.splitInputRow}>
                  <Text style={styles.splitCurrency}>{settings.currencySymbol}</Text>
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
                    dense
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
                  <Icon source="alert-circle-outline" size={14} color={colors.error} />
                  <Text style={styles.splitErrorText}>{splitSumError}</Text>
                </View>
              )}
            </View>
          )}

          {isEditing && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <View style={styles.deleteIconWrap}>
                <Icon source="trash-can-outline" size={18} color={colors.error} />
              </View>
              <Text style={styles.deleteText}>Delete Transaction</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Panels ── */}
      {activePanel !== 'none' && (
        <Animated.View style={styles.panelOverlay}>
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
              selectedDate={dateStr}
              onDateSelect={(d) => setDateStr(d)}
              onDone={closePanel}
            />
          )}
        </Animated.View>
      )}

      {/* ── Bottom Toolbar ── */}
      <View style={[styles.bottomToolbar, { paddingBottom: insets.bottom + spacing.xs }]}>
        <TouchableOpacity
          style={[styles.toolbarBtn, activePanel === 'calendar' && styles.toolbarBtnActive]}
          onPress={() => togglePanel('calendar')}
          activeOpacity={0.7}
        >
          <Icon
            source="calendar-month"
            size={22}
            color={activePanel === 'calendar' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.toolbarLabel,
              activePanel === 'calendar' && { color: colors.primary },
            ]}
          >
            Date
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarBtn, showTimePicker && styles.toolbarBtnActive]}
          onPress={() => {
            if (activePanel !== 'none') closePanel();
            setShowTimePicker((v) => !v);
          }}
          activeOpacity={0.7}
        >
          <Icon
            source="clock-outline"
            size={22}
            color={showTimePicker ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.toolbarLabel, showTimePicker && { color: colors.primary }]}
          >
            Time
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarBtn, activePanel === 'calculator' && styles.toolbarBtnActive]}
          onPress={() => togglePanel('calculator')}
          activeOpacity={0.7}
        >
          <Icon
            source="calculator"
            size={22}
            color={activePanel === 'calculator' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.toolbarLabel,
              activePanel === 'calculator' && { color: colors.primary },
            ]}
          >
            Calc
          </Text>
        </TouchableOpacity>
      </View>

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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.capsule,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    gap: spacing.xs + 1,
  },
  saveBtnText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
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
    color: '#fff',
    fontWeight: '700',
  },

  /* ── Scroll ── */
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },

  /* ── Amount Hero ── */
  amountHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
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
    borderRadius: 24,
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
    backgroundColor: colors.surface,
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
    borderRadius: 20,
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
    backgroundColor: colors.border,
    marginLeft: 40 + spacing.lg + spacing.md,
  },

  /* ── Note ── */
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  noteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 15,
    height: 50,
    paddingHorizontal: 0,
  },

  /* ── Date & Time ── */
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dateTimeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateTimeChipActive: {
    borderColor: colors.primary + '50',
    backgroundColor: colors.primary + '0A',
  },
  dateTimeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Time Picker ── */
  timePickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    marginTop: -spacing.md,
    overflow: 'hidden',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  timePickerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  timePickerDone: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  timePickerBody: {
    flexDirection: 'row',
    height: 180,
  },
  timeColumn: {
    flex: 1,
  },
  timeColumnDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
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
    marginHorizontal: spacing.xs,
    borderRadius: radius.sm,
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

  /* ── Split Payment ── */
  splitToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  splitAccountCard: {
    backgroundColor: colors.surfaceVariant,
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
    height: 40,
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
    backgroundColor: colors.border,
  },
  splitPlusCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  splitTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
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
    backgroundColor: colors.error + '10',
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
    backgroundColor: colors.error + '0A',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error + '20',
  },
  deleteIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
  },

  /* ── Panel ── */
  panelOverlay: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
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

  /* ── Bottom Toolbar ── */
  bottomToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.capsule,
  },
  toolbarBtnActive: {
    backgroundColor: colors.primary + '15',
  },
  toolbarLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
