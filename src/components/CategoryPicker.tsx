import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Portal, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Category } from '../models/types';
import { colors, radius, spacing } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = spacing.sm;
const CELL_W = (SCREEN_W - spacing.lg * 2 - GRID_GAP * 2) / 3;
const PICKER_SURFACE = '#171A24';
const PICKER_SURFACE_MUTED = '#22283A';
const PICKER_BORDER = 'rgba(255, 255, 255, 0.10)';
const PICKER_HAIRLINE = 'rgba(255, 255, 255, 0.08)';

interface CategoryPickerProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (category: Category) => void;
  categories: Category[];
  selectedId?: string;
}

export default function CategoryPicker({
  visible,
  onDismiss,
  onSelect,
  categories,
  selectedId,
}: CategoryPickerProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSearchOpen(false);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onDismiss}
      >
        <View style={styles.root}>
          <Pressable style={styles.backdrop} onPress={onDismiss} />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            <View style={styles.grabber} />

            {searchOpen ? (
              <View style={styles.searchBar}>
                <TextInput
                  mode="flat"
                  placeholder="Search categories"
                  value={query}
                  onChangeText={setQuery}
                  style={styles.searchInput}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  textColor={colors.text}
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                  dense
                  left={<TextInput.Icon icon="magnify" color={colors.textSecondary} />}
                />
                <TouchableOpacity
                  onPress={closeSearch}
                  hitSlop={12}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.titleRow}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  Category
                </Text>
                <TouchableOpacity
                  style={styles.searchIconBtn}
                  onPress={() => setSearchOpen(true)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Search categories"
                >
                  <Icon source="magnify" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>
                {categories.length === 0
                  ? 'No categories yet'
                  : 'No matches'}
              </Text>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.gridScroll}
              >
                <View style={styles.grid}>
                  {filtered.map((item) => {
                    const selected = selectedId === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.gridCell,
                          { width: CELL_W },
                          selected && styles.gridCellSelected,
                        ]}
                        onPress={() => {
                          onSelect(item);
                          onDismiss();
                        }}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.gridIconWrap,
                            { backgroundColor: `${item.color}22` },
                          ]}
                        >
                          <Icon
                            source={item.icon as any}
                            size={26}
                            color={item.color}
                          />
                        </View>
                        <Text style={styles.gridLabel} numberOfLines={2}>
                          {item.name}
                        </Text>
                        {selected && (
                          <View style={styles.checkBadge}>
                            <Icon
                              source="check"
                              size={14}
                              color={colors.onPrimary}
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: PICKER_SURFACE,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '82%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PICKER_BORDER,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
  },
  searchIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PICKER_SURFACE_MUTED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    backgroundColor: PICKER_SURFACE_MUTED,
    borderRadius: radius.lg,
    fontSize: 15,
    marginBottom: 0,
    maxHeight: 48,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xs,
  },
  cancelText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl * 2,
    fontSize: 15,
  },
  gridScroll: {
    paddingBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    justifyContent: 'flex-start',
  },
  gridCell: {
    borderRadius: radius.lg,
    backgroundColor: PICKER_SURFACE_MUTED,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PICKER_HAIRLINE,
  },
  gridCellSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  gridIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 15,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
