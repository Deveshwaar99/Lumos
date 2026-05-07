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
import { colors, spacing, radius } from '../theme';
import type { Account } from '../models/types';

const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = spacing.sm;
/** Three tiny pills per row within each category section */
const PILL_W = (SCREEN_W - spacing.lg * 2 - GRID_GAP * 2) / 3;

const TYPE_ORDER: Account['type'][] = [
  'cash',
  'bank',
  'card',
  'savings',
  'other',
];

function accentForAccountType(t: Account['type']): string {
  switch (t) {
    case 'cash':
      return colors.income;
    case 'bank':
      return colors.secondaryLight;
    case 'card':
      return colors.primaryLight;
    case 'savings':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}

function typeLabel(t: Account['type']): string {
  switch (t) {
    case 'cash':
      return 'Cash';
    case 'bank':
      return 'Bank';
    case 'card':
      return 'Card';
    case 'savings':
      return 'Savings';
    default:
      return 'Other';
  }
}

interface AccountPickerProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (account: Account) => void;
  accounts: Account[];
  selectedId?: string;
  title?: string;
}

export default function AccountPicker({
  visible,
  onDismiss,
  onSelect,
  accounts,
  selectedId,
  title,
}: AccountPickerProps) {
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
    if (!q) return accounts;
    return accounts.filter((a) => a.name.toLowerCase().includes(q));
  }, [accounts, query]);

  const groupedSections = useMemo(() => {
    const map = new Map<Account['type'], Account[]>();
    for (const t of TYPE_ORDER) map.set(t, []);
    for (const a of filtered) {
      map.get(a.type)?.push(a);
    }
    return TYPE_ORDER.map((type) => ({
      type,
      accounts: map.get(type) ?? [],
    })).filter((s) => s.accounts.length > 0);
  }, [filtered]);

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
                  placeholder="Search accounts"
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
                  {title ?? 'Account'}
                </Text>
                <TouchableOpacity
                  style={styles.searchIconBtn}
                  onPress={() => setSearchOpen(true)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Search accounts"
                >
                  <Icon source="magnify" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {accounts.length === 0 ? (
              <Text style={styles.emptyText}>No accounts yet</Text>
            ) : filtered.length === 0 ? (
              <Text style={styles.emptyText}>No matches</Text>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listScroll}
              >
                {groupedSections.map(({ type, accounts: sectionAccounts }) => {
                  const accent = accentForAccountType(type);
                  return (
                    <View key={type} style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View
                          style={[styles.sectionAccent, { backgroundColor: accent }]}
                        />
                        <Text style={styles.sectionTitle}>{typeLabel(type)}</Text>
                        <Text style={styles.sectionCount}>{sectionAccounts.length}</Text>
                      </View>
                      <View style={styles.pillGrid}>
                        {sectionAccounts.map((item) => {
                          const selected = selectedId === item.id;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[
                                styles.pill,
                                { width: PILL_W },
                                {
                                  borderColor: `${accent}50`,
                                  backgroundColor: `${accent}14`,
                                },
                                selected && styles.pillSelected,
                              ]}
                              onPress={() => {
                                onSelect(item);
                                onDismiss();
                              }}
                              activeOpacity={0.75}
                            >
                              <Icon
                                source={item.icon as any}
                                size={16}
                                color={accent}
                              />
                              <Text
                                style={styles.pillLabel}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                              {selected ? (
                                <Icon
                                  source="check"
                                  size={16}
                                  color={colors.primary}
                                />
                              ) : (
                                <View style={styles.pillCheckSpacer} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '82%',
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
    backgroundColor: colors.surfaceVariant,
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
    backgroundColor: colors.surfaceVariant,
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
  listScroll: {
    paddingBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.sm + 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs + 2,
    paddingHorizontal: spacing.xxs,
  },
  sectionAccent: {
    width: 4,
    height: 14,
    borderRadius: 2,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.capsule,
    borderWidth: 1,
    maxWidth: '100%',
  },
  pillSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: `${colors.primary}18`,
  },
  pillLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
  },
  pillCheckSpacer: {
    width: 16,
    height: 16,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl * 2,
    fontSize: 15,
  },
});
