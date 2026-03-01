import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  SegmentedButtons,
  Text,
  Icon,
  Snackbar,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCategoryStore } from '../stores/useCategoryStore';
import { categorySchema } from '../models/schemas';
import { colors, spacing, radius, CATEGORY_COLORS } from '../theme';
import { CATEGORY_ICONS } from '../constants/icons';
import type { RootStackScreenProps } from '../navigation/types';
import type { z } from 'zod';

type FormData = z.infer<typeof categorySchema>;

export default function CategoryFormScreen({
  navigation,
  route,
}: RootStackScreenProps<'CategoryForm'>) {
  const { categoryId, categoryType } = route.params ?? {};
  const { categories, loadCategories, addCategory, updateCategory } = useCategoryStore();
  const isEditing = !!categoryId;
  const existing = categoryId ? categories.find((c) => c.id === categoryId) : null;
  const [snackbar, setSnackbar] = useState('');

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: existing?.name ?? '',
      type: existing?.type ?? categoryType ?? 'expense',
      icon: existing?.icon ?? CATEGORY_ICONS[0].name,
      color: existing?.color ?? CATEGORY_COLORS[0],
    },
  });

  const selectedIcon = watch('icon');
  const selectedColor = watch('color');

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Category' : 'New Category' });
  }, [isEditing, navigation]);

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        type: existing.type,
        icon: existing.icon,
        color: existing.color,
      });
    }
  }, [existing, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && categoryId) {
        await updateCategory(categoryId, data);
      } else {
        await addCategory(data);
      }
      navigation.goBack();
    } catch (e: any) {
      setSnackbar(e.message || 'Failed to save');
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Category Name"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              error={!!errors.name}
              style={styles.input}
            />
          )}
        />
        {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

        <Text variant="titleSmall" style={styles.sectionTitle}>
          Type
        </Text>
        <Controller
          control={control}
          name="type"
          render={({ field: { onChange, value } }) => (
            <SegmentedButtons
              value={value}
              onValueChange={(v) => onChange(v as 'income' | 'expense')}
              buttons={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
            />
          )}
        />

        <Text variant="titleSmall" style={styles.sectionTitle}>
          Icon
        </Text>
        <View style={styles.pickerGrid}>
          {CATEGORY_ICONS.map((icon) => (
            <TouchableOpacity
              key={icon.name}
              style={[
                styles.iconOption,
                selectedIcon === icon.name && {
                  borderColor: colors.primary,
                  borderWidth: 2,
                },
              ]}
              onPress={() => setValue('icon', icon.name)}
            >
              <Icon
                source={icon.name as any}
                size={24}
                color={selectedIcon === icon.name ? colors.primary : colors.text}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text variant="titleSmall" style={styles.sectionTitle}>
          Color
        </Text>
        <View style={styles.pickerGrid}>
          {CATEGORY_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.colorSelected,
              ]}
              onPress={() => setValue('color', color)}
            >
              {selectedColor === color && <Icon source="check" size={18} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          style={styles.saveButton}
        >
          {isEditing ? 'Update' : 'Create'} Category
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
  scroll: { padding: 16 },
  input: { marginBottom: 4 },
  sectionTitle: { marginTop: 20, marginBottom: 8, color: colors.text },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: { borderWidth: 3, borderColor: '#fff', elevation: 4 },
  saveButton: { marginTop: 24, backgroundColor: colors.primary, borderRadius: radius.capsule },
  error: { color: colors.error, fontSize: 12, marginBottom: 8 },
});
