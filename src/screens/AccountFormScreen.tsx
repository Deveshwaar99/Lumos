import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Icon, Chip, Snackbar } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAccountStore } from '../stores/useAccountStore';
import { accountSchema } from '../models/schemas';
import { colors, spacing, radius } from '../theme';
import { dollarsToCents, centsToDollars } from '../utils/money';
import type { RootStackScreenProps } from '../navigation/types';

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'card', label: 'Card' },
  { value: 'savings', label: 'Savings' },
  { value: 'other', label: 'Other' },
] as const;

const ACCOUNT_ICONS = [
  // Cards
  'credit-card', 'credit-card-chip', 'credit-card-wireless', 'credit-card-multiple',
  'contactless-payment', 'credit-card-fast',
  // Banking & savings
  'bank', 'bank-transfer', 'piggy-bank', 'safe',
  // Cash & wallet
  'wallet', 'cash', 'cash-multiple', 'hand-coin', 'cash-register',
  // Currencies & crypto
  'currency-usd', 'currency-eur', 'currency-gbp', 'currency-inr',
  'currency-btc', 'bitcoin', 'ethereum',
  // Investments & charts
  'chart-line', 'chart-donut', 'gold', 'briefcase',
  // Lifestyle & spending
  'store', 'storefront', 'shopping', 'food', 'car',
  'home', 'cellphone', 'medical-bag', 'school', 'airplane',
];

type FormData = {
  name: string;
  type: 'cash' | 'bank' | 'card' | 'savings' | 'other';
  icon: string;
  openingBalanceCents: number;
  currency: string;
};

export default function AccountFormScreen({ navigation, route }: RootStackScreenProps<'AccountForm'>) {
  const { accountId } = route.params ?? {};
  const { accounts, addAccount, updateAccount } = useAccountStore();
  const isEditing = !!accountId;
  const existing = accountId ? accounts.find(a => a.id === accountId) : null;
  const [snackbar, setSnackbar] = useState('');
  const [balanceText, setBalanceText] = useState(
    existing ? centsToDollars(existing.openingBalanceCents).toFixed(2) : '0.00'
  );

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: existing?.name ?? '',
      type: existing?.type ?? 'cash',
      icon: existing?.icon ?? 'wallet',
      openingBalanceCents: existing?.openingBalanceCents ?? 0,
      currency: existing?.currency ?? 'USD',
    },
  });

  const selectedType = watch('type');
  const selectedIcon = watch('icon');

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Account' : 'New Account' });
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 80}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Account Name" value={value} onChangeText={onChange} mode="outlined" error={!!errors.name} style={styles.input} />
          )}
        />
        {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

        <Text variant="titleSmall" style={styles.sectionTitle}>Account Type</Text>
        <View style={styles.chipRow}>
          {ACCOUNT_TYPES.map(t => (
            <Chip
              key={t.value}
              selected={selectedType === t.value}
              onPress={() => setValue('type', t.value)}
              style={[styles.chip, selectedType === t.value && styles.chipSelected]}
              textStyle={selectedType === t.value ? styles.chipTextSelected : undefined}
            >
              {t.label}
            </Chip>
          ))}
        </View>

        <Text variant="titleSmall" style={styles.sectionTitle}>Icon</Text>
        <View style={styles.pickerGrid}>
          {ACCOUNT_ICONS.map(icon => (
            <TouchableOpacity
              key={icon}
              style={[styles.iconOption, selectedIcon === icon && { borderColor: colors.primary, borderWidth: 2 }]}
              onPress={() => setValue('icon', icon)}
            >
              <Icon source={icon as any} size={24} color={selectedIcon === icon ? colors.primary : colors.text} />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          label="Opening Balance"
          value={balanceText}
          onChangeText={handleBalanceChange}
          mode="outlined"
          keyboardType="decimal-pad"
          left={<TextInput.Affix text="$" />}
          style={styles.input}
        />

        <Controller
          control={control}
          name="currency"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Currency Code" value={value} onChangeText={onChange} mode="outlined" style={styles.input} maxLength={3} autoCapitalize="characters" />
          )}
        />

        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={styles.saveButton}>
          {isEditing ? 'Update' : 'Create'} Account
        </Button>
      </ScrollView>
      </KeyboardAvoidingView>
      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.cardInset, paddingBottom: 100 },
  input: { marginBottom: spacing.xs },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm, color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { marginBottom: spacing.xs },
  chipSelected: { backgroundColor: colors.primary + '20' },
  chipTextSelected: { color: colors.primary },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  iconOption: {
    width: spacing.huge, height: spacing.huge, borderRadius: spacing.xl,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  saveButton: { marginTop: spacing.xl, backgroundColor: colors.primary, borderRadius: radius.capsule },
  error: { color: colors.error, fontSize: 12, marginBottom: spacing.sm },
});
