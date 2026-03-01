import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { FAB, SegmentedButtons, Snackbar, Icon, Text, Menu } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCategoryStore } from '../stores/useCategoryStore';
import { colors, spacing, radius } from '../theme';
import EmptyState from '../components/EmptyState';
import type { TabScreenProps } from '../navigation/types';
import type { Category } from '../models/types';

export default function CategoriesScreen({ navigation }: TabScreenProps<'Categories'>) {
  const { categories, loadCategories, removeCategory } = useCategoryStore();
  const [selectedType, setSelectedType] = useState<'expense' | 'income'>('expense');
  const [snackbar, setSnackbar] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useFocusEffect(useCallback(() => {
    loadCategories();
  }, []));

  const filtered = categories.filter((c) => c.type === selectedType);

  const handleDelete = useCallback(
    (cat: Category) => {
      setMenuVisible(null);
      Alert.alert('Delete Category', `Delete "${cat.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await removeCategory(cat.id);
            if (!result.success) {
              setSnackbar(result.message || 'Cannot delete category');
            }
          },
        },
      ]);
    },
    [removeCategory],
  );

  const handleEdit = useCallback(
    (cat: Category) => {
      setMenuVisible(null);
      navigation.navigate('CategoryForm', { categoryId: cat.id });
    },
    [navigation],
  );

  const renderItem = ({ item }: { item: Category }) => (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowContent}
        onPress={() => navigation.navigate('CategoryForm', { categoryId: item.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <Icon source={item.icon as any} size={22} color={item.color} />
        </View>
        <Text style={styles.rowTitle}>{item.name}</Text>
      </TouchableOpacity>
      <Menu
        visible={menuVisible === item.id}
        onDismiss={() => setMenuVisible(null)}
        anchor={
          <TouchableOpacity onPress={() => setMenuVisible(item.id)} hitSlop={12}>
            <Icon source="dots-vertical" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        }
        contentStyle={styles.menuContent}
      >
        <Menu.Item onPress={() => handleEdit(item)} title="Edit" leadingIcon="pencil" />
        <Menu.Item onPress={() => handleDelete(item)} title="Delete" leadingIcon="delete-outline" />
      </Menu>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={selectedType}
          onValueChange={(v) => setSelectedType(v as 'expense' | 'income')}
          buttons={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="labelMedium" style={styles.sectionHeaderText}>
          {selectedType === 'expense' ? 'EXPENSE CATEGORIES' : 'INCOME CATEGORIES'}
        </Text>
        <Text variant="labelMedium" style={styles.countText}>
          {filtered.length}
        </Text>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="shape-outline"
          title="No Categories"
          subtitle={`Add your first ${selectedType} category`}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      )}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 10 }]}
        onPress={() => navigation.navigate('CategoryForm', { categoryType: selectedType })}
        color="#fff"
      />
      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  segmentContainer: { padding: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionHeaderText: {
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  countText: {
    color: colors.textTertiary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 54 + spacing.md },
  menuContent: { backgroundColor: colors.surfaceVariant },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: colors.primary,
  },
});
