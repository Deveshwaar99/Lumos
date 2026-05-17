import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Chip, Icon, Snackbar, Text } from 'react-native-paper';
import type { z } from 'zod';
import { accountSchema } from '../models/schemas';
import type { RootStackScreenProps } from '../navigation/types';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { colors, radius, spacing } from '../theme';
import { centsToDollars, dollarsToCents } from '../utils/money';

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'card', label: 'Card' },
  { value: 'savings', label: 'Savings' },
  { value: 'other', label: 'Other' },
] as const;

const ACCOUNT_ICONS = [
  // Cash
  'wallet',
  'cash',
  'cash-multiple',
  'hand-coin',
  // Bank accounts
  'bank',
  'bank-outline',
  'bank-transfer',
  'bank-check',
  // Cards
  'credit-card',
  'credit-card-chip',
  'credit-card-wireless',
  'contactless-payment',
  // Savings
  'piggy-bank',
  'safe',
  'lock',
  'gold',
  // Currencies
  'currency-usd',
  'currency-eur',
  'currency-gbp',
  'currency-inr',
  'currency-btc',
  'bitcoin',
  'ethereum',
  // Investments & funds
  'finance',
  'briefcase',
  'sack',
  'sack-percent',
  'cash-100',
  'account-cash',
  'sprout',
  'diamond-stone',
  'scale-balance',
  // Loans & property
  'home-city',
  'umbrella',
];

type FormData = z.infer<typeof accountSchema>;

const TypePicker = React.memo(function TypePicker({
  selectedType,
  setValue,
}: {
  selectedType: string;
  setValue: (name: 'type', val: FormData['type']) => void;
}) {
  return (
    <>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        Account Type
      </Text>
      <View style={styles.chipRow}>
        {ACCOUNT_TYPES.map((t) => (
          <Chip
            key={t.value}
            selected={selectedType === t.value}
            onPress={() => setValue('type', t.value)}
            style={[
              styles.chip,
              selectedType === t.value && styles.chipSelected,
            ]}
            textStyle={
              selectedType === t.value ? styles.chipTextSelected : undefined
            }
          >
            {t.label}
          </Chip>
        ))}
      </View>
    </>
  );
});

const IconPicker = React.memo(function IconPicker({
  selectedIcon,
  setValue,
}: {
  selectedIcon: string;
  setValue: (name: 'icon', val: string) => void;
}) {
  return (
    <>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        Icon
      </Text>
      <View style={styles.pickerGrid}>
        {ACCOUNT_ICONS.map((icon) => (
          <TouchableOpacity
            key={icon}
            activeOpacity={0.7}
            style={[
              styles.iconOption,
              selectedIcon === icon && {
                borderColor: colors.primary,
                borderWidth: 2,
              },
            ]}
            onPress={() => setValue('icon', icon)}
          >
            <Icon
              source={icon as any}
              size={24}
              color={selectedIcon === icon ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
});

export default function AccountFormScreen({
  navigation,
  route,
}: RootStackScreenProps<'AccountForm'>) {
  const { accountId } = route.params ?? {};
  const { accounts, addAccount, updateAccount } = useAccountStore();
  const { settings } = useSettingsStore();
  const isEditing = !!accountId;
  const existing = accountId ? accounts.find((a) => a.id === accountId) : null;
  const [snackbar, setSnackbar] = useState('');
  const [balanceText, setBalanceText] = useState(
    existing ? centsToDollars(existing.openingBalanceCents).toFixed(2) : '0.00',
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: existing?.name ?? '',
      type: existing?.type ?? 'cash',
      icon: existing?.icon ?? 'wallet',
      openingBalanceCents: existing?.openingBalanceCents ?? 0,
    },
  });

  const selectedType = useWatch({ control, name: 'type' });
  const selectedIcon = useWatch({ control, name: 'icon' });

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Account' : 'New Account',
    });
  }, [isEditing]);

  const handleBalanceChange = (text: string) => {
    setBalanceText(text);
    const num = parseFloat(text.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num)) {
      setValue('openingBalanceCents', dollarsToCents(num));
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && accountId) {
        await updateAccount(accountId, data);
      } else {
        await addAccount(data);
      }
      navigation.goBack();
    } catch (e: any) {
      setSnackbar(e.message || 'Failed to save');
    }
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
          <Text style={styles.label}>Account Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNTextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. Main Checking"
                placeholderTextColor={colors.textTertiary}
                style={[styles.textInput, errors.name && styles.textInputError]}
              />
            )}
          />
          {errors.name && (
            <Text style={styles.error}>{errors.name.message}</Text>
          )}

          <TypePicker selectedType={selectedType} setValue={setValue} />

          <IconPicker selectedIcon={selectedIcon} setValue={setValue} />

          <Text style={styles.label}>Opening Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.currencyPrefix}>{settings.currencySymbol}</Text>
            <RNTextInput
              value={balanceText}
              onChangeText={handleBalanceChange}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              style={[styles.textInput, { flex: 1 }]}
            />
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.saveButton}
          >
            {isEditing ? 'Update' : 'Create'} Account
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
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
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  textInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginBottom: spacing.xs,
  },
  textInputError: { borderColor: colors.error },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  currencyPrefix: {
    color: colors.textSecondary,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: { marginBottom: spacing.xs },
  chipSelected: { backgroundColor: colors.primary + '20' },
  chipTextSelected: { color: colors.primary },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconOption: {
    width: spacing.huge,
    height: spacing.huge,
    borderRadius: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.capsule,
  },
  error: { color: colors.error, fontSize: 12, marginBottom: spacing.sm },
});
