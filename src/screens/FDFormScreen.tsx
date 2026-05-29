import { format } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Icon, Snackbar, Text, TextInput } from 'react-native-paper';
import AccountPicker from '../components/AccountPicker';
import CategoryPicker from '../components/CategoryPicker';
import InlineCalendar from '../components/InlineCalendar';
import type { RootStackScreenProps } from '../navigation/types';
import { fdService } from '../services/fdService';
import { useAccountStore } from '../stores/useAccountStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useFDStore } from '../stores/useFDStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, radius, spacing } from '../theme';
import {
  calculateFDInterest,
  calculateNetInterest,
  calculateTDS,
} from '../utils/fdCalculator';
import {
  clampMoneyDecimalPlaces,
  dollarsToCents,
  formatMoney,
} from '../utils/money';

type CalendarTarget = 'none' | 'start' | 'maturity';

export default function FDFormScreen({
  navigation,
  route,
}: RootStackScreenProps<'FDForm'>) {
  const { fdId } = route.params ?? {};
  const isEditing = !!fdId;

  const accounts = useAccountStore((state) => state.accounts);
  const loadAccounts = useAccountStore((state) => state.loadAccounts);
  const fdAccountIds = useFDStore((state) => state.fdAccountIds);
  const addDeposit = useFDStore((state) => state.addDeposit);
  const categories = useCategoryStore((state) => state.categories);
  const loadCategories = useCategoryStore((state) => state.loadCategories);
  const settings = useSettingsStore((state) => state.settings);

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  );

  const userAccounts = useMemo(
    () => accounts.filter((a) => !fdAccountIds.has(a.id)),
    [accounts, fdAccountIds],
  );

  const [label, setLabel] = useState('');
  const [amountText, setAmountText] = useState('');
  const [rateText, setRateText] = useState('');
  const [taxRateText, setTaxRateText] = useState('10');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [maturityDate, setMaturityDate] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [interestCategoryId, setInterestCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>('none');
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [creditPickerVisible, setCreditPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  useEffect(() => {
    void loadAccounts();
    void loadCategories();
  }, [loadAccounts, loadCategories]);

  useEffect(() => {
    if (userAccounts.length > 0 && !sourceAccountId) {
      setSourceAccountId(userAccounts[0].id);
      setCreditAccountId(userAccounts[0].id);
    }
  }, [userAccounts]);

  useEffect(() => {
    if (fdId) {
      fdService.getById(fdId).then((fd) => {
        if (fd) {
          setLabel(fd.note ?? '');
          setAmountText(String(fd.principalCents / 100));
          setRateText(String(fd.annualInterestRate));
          setTaxRateText(String(fd.taxRate));
          setStartDate(fd.startDate);
          setMaturityDate(fd.maturityDate);
          setSourceAccountId(fd.sourceAccountId);
          setCreditAccountId(fd.creditAccountId);
          setInterestCategoryId(fd.interestCategoryId);
        }
      });
    }
  }, [fdId]);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Fixed Deposit' : 'New Fixed Deposit',
    });
  }, [isEditing]);

  const preview = useMemo(() => {
    const principal = dollarsToCents(parseFloat(amountText) || 0);
    const rate = parseFloat(rateText) || 0;
    const tax = parseFloat(taxRateText) || 0;
    if (principal <= 0 || rate <= 0 || !startDate || !maturityDate) return null;
    if (maturityDate <= startDate) return null;

    const gross = calculateFDInterest(principal, rate, startDate, maturityDate);
    const tds = calculateTDS(gross, tax);
    const net = calculateNetInterest(gross, tax);
    return {
      grossInterest: gross,
      tds,
      netInterest: net,
      maturityValue: principal + net,
    };
  }, [amountText, rateText, taxRateText, startDate, maturityDate]);

  const selectedSource = userAccounts.find((a) => a.id === sourceAccountId);
  const selectedCredit = userAccounts.find((a) => a.id === creditAccountId);
  const selectedCategory = incomeCategories.find(
    (c) => c.id === interestCategoryId,
  );
  const sym = settings.currencySymbol;
  const moneyDecimals = clampMoneyDecimalPlaces(settings.decimalPlaces);

  const handleSubmit = useCallback(async () => {
    const principal = dollarsToCents(parseFloat(amountText) || 0);
    const rate = parseFloat(rateText) || 0;
    const tax = parseFloat(taxRateText) || 0;

    if (!label.trim()) {
      setSnackbar('Enter a label for the FD');
      return;
    }
    if (principal <= 0) {
      setSnackbar('Enter a valid amount');
      return;
    }
    if (rate <= 0 || rate > 100) {
      setSnackbar('Enter a valid interest rate');
      return;
    }
    if (!maturityDate || maturityDate <= startDate) {
      setSnackbar('Maturity date must be after start date');
      return;
    }
    if (!sourceAccountId) {
      setSnackbar('Select a source account');
      return;
    }
    if (!creditAccountId) {
      setSnackbar('Select a credit account');
      return;
    }
    if (!interestCategoryId) {
      setSnackbar('Select an interest category');
      return;
    }

    try {
      await addDeposit({
        label: label.trim(),
        sourceAccountId,
        creditAccountId,
        interestCategoryId,
        principalCents: principal,
        annualInterestRate: rate,
        startDate,
        maturityDate,
        taxRate: tax,
        currency: settings.currencyCode,
        note: note || null,
      });
      navigation.goBack();
    } catch (e: any) {
      setSnackbar(e.message || 'Failed to create FD');
    }
  }, [
    label,
    amountText,
    rateText,
    taxRateText,
    startDate,
    maturityDate,
    sourceAccountId,
    creditAccountId,
    interestCategoryId,
    note,
    addDeposit,
    navigation,
  ]);

  const startDateLabel = startDate
    ? format(new Date(startDate + 'T00:00:00'), 'MMM d, yyyy')
    : 'Select date';
  const maturityDateLabel = maturityDate
    ? format(new Date(maturityDate + 'T00:00:00'), 'MMM d, yyyy')
    : 'Select date';

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
          <TextInput
            label="FD Label"
            value={label}
            onChangeText={setLabel}
            mode="outlined"
            placeholder="e.g. HDFC 1-Year FD"
            style={styles.input}
            cursorColor={colors.primary}
            selectionColor={colors.primary + '40'}
          />

          <TextInput
            label="Principal Amount"
            value={amountText}
            onChangeText={setAmountText}
            mode="outlined"
            keyboardType="decimal-pad"
            left={<TextInput.Affix text={settings.currencySymbol} />}
            style={styles.input}
            cursorColor={colors.primary}
            selectionColor={colors.primary + '40'}
          />

          <View style={styles.row}>
            <TextInput
              label="Interest Rate (%)"
              value={rateText}
              onChangeText={setRateText}
              mode="outlined"
              keyboardType="decimal-pad"
              right={<TextInput.Affix text="%" />}
              style={[styles.input, styles.halfInput]}
              cursorColor={colors.primary}
              selectionColor={colors.primary + '40'}
            />
            <TextInput
              label="TDS Rate (%)"
              value={taxRateText}
              onChangeText={setTaxRateText}
              mode="outlined"
              keyboardType="decimal-pad"
              right={<TextInput.Affix text="%" />}
              style={[styles.input, styles.halfInput]}
              cursorColor={colors.primary}
              selectionColor={colors.primary + '40'}
            />
          </View>

          <Text variant="titleSmall" style={styles.sectionTitle}>
            Dates
          </Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[
                styles.dateChip,
                calendarTarget === 'start' && styles.dateChipActive,
              ]}
              onPress={() =>
                setCalendarTarget((p) => (p === 'start' ? 'none' : 'start'))
              }
            >
              <Icon
                source="calendar-start"
                size={18}
                color={
                  calendarTarget === 'start'
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <View>
                <Text style={styles.dateLabel}>Start Date</Text>
                <Text
                  style={[
                    styles.dateValue,
                    calendarTarget === 'start' && { color: colors.primary },
                  ]}
                >
                  {startDateLabel}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateChip,
                calendarTarget === 'maturity' && styles.dateChipActive,
              ]}
              onPress={() =>
                setCalendarTarget((p) =>
                  p === 'maturity' ? 'none' : 'maturity',
                )
              }
            >
              <Icon
                source="calendar-end"
                size={18}
                color={
                  calendarTarget === 'maturity'
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <View>
                <Text style={styles.dateLabel}>Maturity Date</Text>
                <Text
                  style={[
                    styles.dateValue,
                    calendarTarget === 'maturity' && { color: colors.primary },
                  ]}
                >
                  {maturityDateLabel}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {calendarTarget !== 'none' && (
            <InlineCalendar
              variant="sheet"
              selectedDate={
                calendarTarget === 'start'
                  ? startDate
                  : maturityDate || startDate
              }
              onDateSelect={(d) => {
                if (calendarTarget === 'start') setStartDate(d);
                else setMaturityDate(d);
              }}
              onDone={() => setCalendarTarget('none')}
            />
          )}

          <Text variant="titleSmall" style={styles.sectionTitle}>
            Accounts
          </Text>
          <View style={styles.selectorsCard}>
            <TouchableOpacity
              style={styles.selectorRow}
              onPress={() => setSourcePickerVisible(true)}
            >
              <View
                style={[
                  styles.selectorIconWrap,
                  { backgroundColor: colors.expense + '18' },
                ]}
              >
                <Icon
                  source={selectedSource?.icon ?? 'wallet'}
                  size={20}
                  color={colors.expense}
                />
              </View>
              <View style={styles.selectorTextCol}>
                <Text style={styles.selectorLabel}>Source Account</Text>
                <Text style={styles.selectorValue}>
                  {selectedSource?.name ?? 'Select account'}
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
              style={styles.selectorRow}
              onPress={() => setCreditPickerVisible(true)}
            >
              <View
                style={[
                  styles.selectorIconWrap,
                  { backgroundColor: colors.income + '18' },
                ]}
              >
                <Icon
                  source={selectedCredit?.icon ?? 'wallet'}
                  size={20}
                  color={colors.income}
                />
              </View>
              <View style={styles.selectorTextCol}>
                <Text style={styles.selectorLabel}>
                  Credit Account (on maturity)
                </Text>
                <Text style={styles.selectorValue}>
                  {selectedCredit?.name ?? 'Select account'}
                </Text>
              </View>
              <Icon
                source="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <Text variant="titleSmall" style={styles.sectionTitle}>
            Interest Category
          </Text>
          <TouchableOpacity
            style={styles.categoryRow}
            onPress={() => setCategoryPickerVisible(true)}
          >
            {selectedCategory ? (
              <View
                style={[
                  styles.selectorIconWrap,
                  { backgroundColor: selectedCategory.color + '18' },
                ]}
              >
                <Icon
                  source={selectedCategory.icon as any}
                  size={20}
                  color={selectedCategory.color}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.selectorIconWrap,
                  { backgroundColor: colors.primary + '18' },
                ]}
              >
                <Icon source="tag-outline" size={20} color={colors.primary} />
              </View>
            )}
            <View style={styles.selectorTextCol}>
              <Text style={styles.selectorLabel}>
                Category for interest income
              </Text>
              <Text style={styles.selectorValue}>
                {selectedCategory?.name ?? 'Select category'}
              </Text>
            </View>
            <Icon
              source="chevron-right"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          <TextInput
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            style={styles.input}
            cursorColor={colors.primary}
            selectionColor={colors.primary + '40'}
          />

          {preview && (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Interest Preview</Text>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Gross Interest</Text>
                <Text style={styles.previewValue}>
                  {formatMoney(preview.grossInterest, sym, moneyDecimals)}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>
                  TDS ({taxRateText || '0'}%)
                </Text>
                <Text style={[styles.previewValue, { color: colors.expense }]}>
                  -{formatMoney(preview.tds, sym, moneyDecimals)}
                </Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Net Interest</Text>
                <Text
                  style={[
                    styles.previewValue,
                    { color: colors.income, fontWeight: '800' },
                  ]}
                >
                  {formatMoney(preview.netInterest, sym, moneyDecimals)}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Maturity Value</Text>
                <Text
                  style={[
                    styles.previewValue,
                    { color: colors.primary, fontWeight: '800' },
                  ]}
                >
                  {formatMoney(preview.maturityValue, sym, moneyDecimals)}
                </Text>
              </View>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.saveButton}
          >
            {isEditing ? 'Update' : 'Create'} Fixed Deposit
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountPicker
        visible={sourcePickerVisible}
        onDismiss={() => setSourcePickerVisible(false)}
        onSelect={(acc) => setSourceAccountId(acc.id)}
        accounts={userAccounts}
        selectedId={sourceAccountId}
        title="Source Account"
      />
      <AccountPicker
        visible={creditPickerVisible}
        onDismiss={() => setCreditPickerVisible(false)}
        onSelect={(acc) => setCreditAccountId(acc.id)}
        accounts={userAccounts}
        selectedId={creditAccountId}
        title="Credit Account (on maturity)"
      />
      <CategoryPicker
        visible={categoryPickerVisible}
        onDismiss={() => setCategoryPickerVisible(false)}
        onSelect={(cat) => setInterestCategoryId(cat.id)}
        categories={incomeCategories}
        selectedId={interestCategoryId}
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
  scroll: { padding: spacing.cardInset, paddingBottom: 100 },
  input: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  halfInput: { flex: 1 },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.text,
  },

  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateChipActive: {
    borderColor: colors.primary + '50',
    backgroundColor: colors.primary + '0A',
  },
  dateLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
    marginBottom: spacing.lg,
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
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorTextCol: { flex: 1 },
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

  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  previewTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  previewLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  previewValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  previewDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  saveButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.capsule,
  },
});
