import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { FAB, Snackbar, Icon, Text, Menu } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCategoryStore } from '../stores/useCategoryStore';
import { colors, spacing, radius, elevation } from '../theme';
import EmptyState from '../components/EmptyState';
import type { TabScreenProps } from '../navigation/types';
import type { Category } from '../models/types';

export default function CategoriesScreen({
  navigation,
}: TabScreenProps<'Categories'>) {
  const { categories, loadCategories, removeCategory } = useCategoryStore();
  const [selectedType, setSelectedType] = useState<'expense' | 'income'>(
    'expense',
  );
  const [snackbar, setSnackbar] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  }, [loadCategories]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, []),
  );

  const filtered = useMemo(
    () => categories.filter((c) => c.type === selectedType),
    [categories, selectedType],
  );

  const expenseCount = useMemo(
    () => categories.filter((c) => c.type === 'expense').length,
    [categories],
  );
  const incomeCount = useMemo(
    () => categories.filter((c) => c.type === 'income').length,
    [categories],
  );

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

  const renderSegmentedControl = () => (
    <View style={styles.segmentContainer}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.segmentTab,
          selectedType === 'expense' && styles.segmentTabActive,
        ]}
        onPress={() => setSelectedType('expense')}
      >
        <Icon
          source="arrow-down-bold-circle-outline"
          size={18}
          color={
            selectedType === 'expense' ? colors.onPrimary : colors.textSecondary
          }
        />
        <Text
          style={[
            styles.segmentText,
            selectedType === 'expense' && styles.segmentTextActive,
          ]}
        >
          Expense
        </Text>
        {expenseCount > 0 && (
          <View
            style={[
              styles.segmentBadge,
              selectedType === 'expense' && styles.segmentBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.segmentBadgeText,
                selectedType === 'expense' && styles.segmentBadgeTextActive,
              ]}
            >
              {expenseCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.segmentTab,
          selectedType === 'income' && styles.segmentTabActive,
        ]}
        onPress={() => setSelectedType('income')}
      >
        <Icon
          source="arrow-up-bold-circle-outline"
          size={18}
          color={
            selectedType === 'income' ? colors.onPrimary : colors.textSecondary
          }
        />
        <Text
          style={[
            styles.segmentText,
            selectedType === 'income' && styles.segmentTextActive,
          ]}
        >
          Income
        </Text>
        {incomeCount > 0 && (
          <View
            style={[
              styles.segmentBadge,
              selectedType === 'income' && styles.segmentBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.segmentBadgeText,
                selectedType === 'income' && styles.segmentBadgeTextActive,
              ]}
            >
              {incomeCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryCard}>
      <View style={[styles.categoryAccent, { backgroundColor: item.color }]} />
        <TouchableOpacity
        activeOpacity={0.7}
        style={styles.categoryContent}
        onPress={() =>
          (navigation as any).navigate('CategoryTransactions', {
            categoryId: item.id,
          })
        }
      >
        <View
          style={[styles.categoryIcon, { backgroundColor: item.color + '1A' }]}
        >
          <Icon source={item.icon as any} size={22} color={item.color} />
        </View>
        <View style={styles.categoryDetails}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.categoryType}>
            {selectedType === 'expense' ? 'Expense' : 'Income'}
          </Text>
        </View>
        <Menu
          visible={menuVisible === item.id}
          onDismiss={() => setMenuVisible(null)}
          anchor={
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setMenuVisible(item.id)}
              hitSlop={12}
              style={styles.menuTrigger}
            >
              <Icon
                source="dots-horizontal"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          }
          contentStyle={styles.menuContent}
        >
          <Menu.Item
            onPress={() => handleEdit(item)}
            title="Edit"
            leadingIcon="pencil"
          />
          <Menu.Item
            onPress={() => handleDelete(item)}
            title="Delete"
            leadingIcon="delete-outline"
          />
        </Menu>
      </TouchableOpacity>
    </View>
  );

  const ListHeader = () => <>{renderSegmentedControl()}</>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <ListHeader />
          <EmptyState
            icon="shape-outline"
            title="No Categories"
            subtitle={`Add your first ${selectedType} category`}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() =>
          navigation.navigate('CategoryForm', { categoryType: selectedType })
        }
        color={colors.onPrimary}
        accessibilityLabel="Add category"
      />
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
        style={{ marginBottom: 72 }}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },
  emptyWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  /* ── Segmented Control ── */
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 4,
    marginBottom: spacing.lg,
    ...elevation.sm,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.xl - 3,
    gap: spacing.xs + 2,
  },
  segmentTabActive: {
    backgroundColor: colors.primary,
    ...elevation.md,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  segmentBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  segmentBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  segmentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentBadgeTextActive: {
    color: colors.onPrimary,
  },

  /* ── Category Cards ── */
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    ...elevation.sm,
  },
  categoryAccent: {
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  categoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  categoryType: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  menuTrigger: {
    padding: spacing.sm,
  },
  menuContent: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
  },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: colors.primary,
    ...elevation.lg,
  },
});
