import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { FAB, SegmentedButtons, Snackbar, Icon } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { TouchableOpacity, Text } from 'react-native';
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
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filtered = categories.filter((c) => c.type === selectedType);

  const handleDelete = useCallback(
    (cat: Category) => {
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
    [removeCategory]
  );

  const renderRightActions = useCallback(
    (_progress: unknown, _dragX: unknown, _swipeable: unknown, item: Category) => (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    ),
    [handleDelete]
  );

  const renderItem = ({ item, index }: { item: Category; index: number }) => {
    const isLast = index === filtered.length - 1;
    return (
      <Swipeable
        renderRightActions={(progress, dragX, swipeable) =>
          renderRightActions(progress, dragX, swipeable, item)
        }
      >
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('CategoryForm', { categoryId: item.id })}
          activeOpacity={0.6}
        >
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <Icon source={item.icon as any} size={22} color={item.color} />
          </View>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Icon source="chevron-right" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
        {!isLast && <View style={styles.divider} />}
      </Swipeable>
    );
  };

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
        />
      )}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 76 }]}
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
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: spacing.cardInset,
    backgroundColor: colors.surface,
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
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.cardInset + 54 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
