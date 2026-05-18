import { format } from 'date-fns';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Snackbar, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AccountPicker from '../components/AccountPicker';
import CategoryPicker from '../components/CategoryPicker';
import InlineCalendar from '../components/InlineCalendar';
import type { RecurrenceFrequency, TransactionType } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';
import { recurringTransactionService } from '../services/recurringTransactionService';
import { useAccountStore } from '../stores/useAccountStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useRecurringStore } from '../stores/useRecurringStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, radius, spacing } from '../theme';
import { dollarsToCents } from '../utils/money';

type CalendarTarget = 'start' | 'end';

const FREQUENCIES: { key: RecurrenceFrequency; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

export default function RecurringTransactionFormScreen({
  navigation,
  route,
}: RootStackScreenProps<'RecurringTransactionForm'>) {
  const insets = useSafeAreaInsets();
  const recurringId = route.params?.recurringId;

  const { addRecurring, updateRecurring } = useRecurringStore();
  const { categories, loadCategories } = useCategoryStore();
  const { accounts, loadAccounts } = useAccountStore();
  const { settings } = useSettingsStore();

  const [type, setType] = useState<TransactionType>('expense');
  const [expression, setExpression] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [account1Id, setAccount1Id] = useState('');
  const [account2Id, setAccount2Id] = useState('');
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string | null>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>('start');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [account1PickerVisible, setAccount1PickerVisible] = useState(false);
  const [account2PickerVisible, setAccount2PickerVisible] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [loaded, setLoaded] = useState(!recurringId);

  const isTransfer = type === 'transfer';
  const typeAnimVal = type === 'income' ? 0 : type === 'expense' ? 1 : 2;
  const typeAnim = useRef(new Animated.Value(typeAnimVal)).current;

  const filteredCategories = isTransfer
    ? []
    : categories.filter((c) => c.type === type);
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
    if (recurringId) {
      recurringTransactionService.getById(recurringId).then((rec) => {
        if (rec) {
          setType(rec.type);
          setExpression(String(rec.totalAmountCents / 100));
          setCategoryId(rec.categoryId ?? '');
          setAccount1Id(rec.accountId);
          setAccount2Id(rec.toAccountId ?? '');
          setNote(rec.note ?? '');
          setFrequency(rec.frequency);
          setStartDate(rec.startDate);
          setEndDate(rec.endDate);
        }
        setLoaded(true);
      });
    }
  }, [recurringId]);

  useEffect(() => {
    if (isTransfer) {
      setCategoryId('');
    } else if (selectedCategory && selectedCategory.type !== type) {
      setCategoryId('');
    }
    const toVal = type === 'income' ? 0 : type === 'expense' ? 1 : 2;
    Animated.timing(typeAnim, {
      toValue: toVal,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [type]);

  const openCalendar = useCallback(
    (target: CalendarTarget) => {
      Keyboard.dismiss();
      setCalendarTarget(target);
      setShowCalendar(true);
    },
    [],
  );

  const onSubmit = async () => {
    const totalDollars = parseFloat(expression) || 0;
    const totalCents = dollarsToCents(totalDollars);
    if (totalCents <= 0) {
      setSnackbar('Enter an amount');
      return;
    }
    if (!isTransfer && !categoryId) {
      setSnackbar('Select a category');
      return;
    }
    if (!account1Id) {
      setSnackbar(isTransfer ? 'Select a From account' : 'Select an account');
      return;
    }
    if (isTransfer && !account2Id) {
      setSnackbar('Select a To account');
      return;
    }
    if (isTransfer && account1Id === account2Id) {
      setSnackbar('From and To accounts must be different');
      return;
    }
    if (endDate && endDate < startDate) {
      setSnackbar('End date must be on or after start date');
      return;
    }

    try {
      const payload = {
        type,
        totalAmountCents: totalCents,
        currency: settings.currencyCode,
        categoryId: isTransfer ? null : categoryId,
        note: note || null,
        accountId: account1Id,
        toAccountId: isTransfer ? account2Id : null,
        frequency,
        startDate,
        endDate: endDate ?? null,
      };

      if (recurringId) {
        await updateRecurring(recurringId, payload);
      } else {
        await addRecurring(payload);
      }
      navigation.goBack();
    } catch (e: unknown) {
      setSnackbar((e as Error).message || 'Failed to save');
    }
  };

  if (!loaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  const amountColor =
    type === 'income'
      ? colors.income
      : type === 'expense'
        ? colors.expense
        : colors.transfer;

  const startLabel = format(new Date(startDate + 'T00:00:00'), 'MMM d, yyyy');
  const endLabel = endDate
    ? format(new Date(endDate + 'T00:00:00'), 'MMM d, yyyy')
    : 'No end date';

  const typeSwitcherBg = typeAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      colors.income + '20',
      colors.expense + '20',
      colors.transfer + '20',
    ],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          hitSlop={16}
          style={styles.headerBtn}
        >
          <Icon source="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {recurringId ? 'Edit Recurring' : 'New Recurring'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSubmit}
          hitSlop={16}
          style={styles.saveBtn}
        >
          <Icon source="check" size={18} color={colors.onPrimary} />
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Type Switcher */}
      <Animated.View
        style={[styles.typeSwitcher, { backgroundColor: typeSwitcherBg }]}
      >
        {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => {
          const iconMap = {
            expense: 'arrow-top-right',
            income: 'arrow-bottom-left',
            transfer: 'swap-horizontal',
          };
          return (
            <TouchableOpacity
              key={t}
              activeOpacity={0.7}
              style={[
                styles.typeTab,
                type === t && [
                  styles.typeTabActive,
                  {
                    backgroundColor:
                      t === 'income'
                        ? colors.income
                        : t === 'expense'
                          ? colors.expense
                          : colors.transfer,
                  },
                ],
              ]}
              onPress={() => setType(t)}
            >
              <Icon
                source={iconMap[t]}
                size={16}
                color={
                  type === t ? colors.onPrimary : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.typeTabText,
                  type === t && styles.typeTabTextActive,
                ]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
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
          {/* Amount */}
          <View
            style={[styles.amountHero, { borderColor: amountColor + '30' }]}
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
                  selectionColor={amountColor + '40'}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          {/* Account & Category */}
          <Text style={styles.sectionLabel}>DETAILS</Text>
          {isTransfer ? (
            <View style={styles.selectorsCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.selectorRow}
                onPress={() => setAccount1PickerVisible(true)}
              >
                <View
                  style={[
                    styles.selectorIconWrap,
                    { backgroundColor: colors.expense + '18' },
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
                <Icon
                  source="chevron-right"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              <View style={styles.selectorDivider} />
              <View style={styles.transferArrowRow}>
                <Icon source="arrow-down" size={18} color={colors.transfer} />
              </View>
              <View style={styles.selectorDivider} />

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.selectorRow}
                onPress={() => setAccount2PickerVisible(true)}
              >
                <View
                  style={[
                    styles.selectorIconWrap,
                    { backgroundColor: colors.income + '18' },
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
                <Icon
                  source="chevron-right"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectorsCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.selectorRow}
                onPress={() => setAccount1PickerVisible(true)}
              >
                <View
                  style={[
                    styles.selectorIconWrap,
                    { backgroundColor: colors.primary + '18' },
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
                  source="chevron-right"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              <View style={styles.selectorDivider} />

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.selectorRow}
                onPress={() => setCategoryPickerVisible(true)}
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
                  source="chevron-right"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Note */}
          <Text style={styles.sectionLabel}>NOTE (OPTIONAL)</Text>
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
              selectionColor={colors.primary + '40'}
              multiline
              maxLength={200}
            />
          </View>

          {/* Frequency */}
          <Text style={styles.sectionLabel}>FREQUENCY</Text>
          <View style={styles.frequencyRow}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.7}
                style={[
                  styles.frequencyChip,
                  frequency === f.key && styles.frequencyChipActive,
                ]}
                onPress={() => setFrequency(f.key)}
              >
                <Text
                  style={[
                    styles.frequencyChipText,
                    frequency === f.key && styles.frequencyChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dates */}
          <Text style={styles.sectionLabel}>SCHEDULE</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.dateChip,
                showCalendar &&
                  calendarTarget === 'start' &&
                  styles.dateChipActive,
              ]}
              onPress={() => openCalendar('start')}
            >
              <Icon
                source="calendar-start"
                size={18}
                color={
                  showCalendar && calendarTarget === 'start'
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <View>
                <Text style={styles.dateChipLabel}>Start Date</Text>
                <Text
                  style={[
                    styles.dateChipValue,
                    showCalendar &&
                      calendarTarget === 'start' && { color: colors.primary },
                  ]}
                >
                  {startLabel}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.dateChip,
                showCalendar &&
                  calendarTarget === 'end' &&
                  styles.dateChipActive,
              ]}
              onPress={() => openCalendar('end')}
            >
              <Icon
                source="calendar-end"
                size={18}
                color={
                  showCalendar && calendarTarget === 'end'
                    ? colors.primary
                    : endDate
                      ? colors.textSecondary
                      : colors.textTertiary
                }
              />
              <View>
                <Text style={styles.dateChipLabel}>End Date (optional)</Text>
                <Text
                  style={[
                    styles.dateChipValue,
                    !endDate && { color: colors.textTertiary },
                    showCalendar &&
                      calendarTarget === 'end' && { color: colors.primary },
                  ]}
                >
                  {endLabel}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Calendar Panel */}
      {showCalendar && (
        <View style={StyleSheet.absoluteFill}>
          <InlineCalendar
            selectedDate={
              calendarTarget === 'start'
                ? startDate
                : endDate ?? startDate
            }
            onDateSelect={(d) => {
              if (calendarTarget === 'start') {
                setStartDate(d);
              } else {
                setEndDate(d);
              }
            }}
            onDone={() => setShowCalendar(false)}
            onClear={
              calendarTarget === 'end'
                ? () => setEndDate(null)
                : undefined
            }
          />
        </View>
      )}

      {/* Modals */}
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
        title={isTransfer ? 'To Account' : undefined}
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

  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },

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

  sectionLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

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
    backgroundColor: colors.border,
    marginLeft: 40 + spacing.lg + spacing.md,
  },
  transferArrowRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },

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
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceVariant,
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

  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  frequencyChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  frequencyChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  frequencyChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  frequencyChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateChipActive: {
    borderColor: colors.primary + '50',
    backgroundColor: colors.primary + '0A',
  },
  dateChipLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dateChipValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },

});
