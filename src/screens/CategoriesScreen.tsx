import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { FAB, Snackbar, Icon, Text, Menu } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
  const insets = useSafeAreaInsets();

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

  const renderSummaryCard = () => (
    <LinearGradient
      colors={['#2E2660', '#1E1545', '#252540']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.summaryCard}
    >
      <View style={styles.summaryHeader}>
        <View style={styles.summaryIconWrap}>
          <Icon source="shape-outline" size={20} color={colors.primaryLight} />
        </View>
        <Text style={styles.summaryTitle}>Categories</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Icon source="arrow-down-circle" size={16} color={colors.expense} />
          <View>
            <Text style={styles.statValue}>{expenseCount}</Text>
            <Text style={styles.statLabel}>Expense</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Icon source="arrow-up-circle" size={16} color={colors.income} />
          <View>
            <Text style={styles.statValue}>{incomeCount}</Text>
            <Text style={styles.statLabel}>Income</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Icon source="sigma" size={16} color={colors.primaryLight} />
          <View>
            <Text style={styles.statValue}>{categories.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const renderSegmentedControl = () => (
    <View style={styles.segmentContainer}>
      <TouchableOpacity
        style={[
          styles.segmentTab,
          selectedType === 'expense' && styles.segmentTabActive,
        ]}
        onPress={() => setSelectedType('expense')}
        activeOpacity={0.8}
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
        style={[
          styles.segmentTab,
          selectedType === 'income' && styles.segmentTabActive,
        ]}
        onPress={() => setSelectedType('income')}
        activeOpacity={0.8}
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
        style={styles.categoryContent}
        onPress={() =>
          navigation.navigate('CategoryForm', { categoryId: item.id })
        }
        activeOpacity={0.7}
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

  const ListHeader = () => (
    <>
      {renderSummaryCard()}
      {renderSegmentedControl()}
    </>
  );

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
        />
      )}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 10 }]}
        onPress={() =>
          navigation.navigate('CategoryForm', { categoryType: selectedType })
        }
        color="#fff"
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },
  emptyWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  /* ── Summary Card ── */
  summaryCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...elevation.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139,125,209,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: '60%' as any,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

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
    padding: spacing.xxs,
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
