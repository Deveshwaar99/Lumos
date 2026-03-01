import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Text, Icon, TextInput } from 'react-native-paper';
import { colors, spacing, radius } from '../theme';
import { useTagStore } from '../stores/useTagStore';
import type { Tag } from '../models/types';

const TAG_PALETTE = [
  '#FF7043', '#42A5F5', '#AB47BC', '#26A69A', '#EC407A',
  '#FFA726', '#78909C', '#5C6BC0', '#9CCC65', '#EF5350',
];

interface TagPickerProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export default function TagPicker({ selectedTagIds, onTagsChange }: TagPickerProps) {
  const { tags, loadTags, addTag, removeTag } = useTagStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);

  useEffect(() => { loadTags(); }, []);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;
    const tag = await addTag(trimmed, newTagColor);
    onTagsChange([...selectedTagIds, tag.id]);
    setNewTagName('');
    setNewTagColor(TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)]);
  };

  const handleDeleteTag = async (id: string) => {
    await removeTag(id);
    onTagsChange(selectedTagIds.filter((tid) => tid !== id));
  };

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.6}
      >
        <View style={[styles.triggerIconWrap, { backgroundColor: colors.warning + '18' }]}>
          <Icon source="tag-multiple" size={20} color={colors.warning} />
        </View>
        <View style={styles.triggerTextCol}>
          <Text style={styles.triggerLabel}>Tags</Text>
          {selectedTags.length > 0 ? (
            <View style={styles.chipRow}>
              {selectedTags.map((tag) => (
                <View key={tag.id} style={[styles.miniChip, { backgroundColor: tag.color + '22' }]}>
                  <Text style={[styles.miniChipText, { color: tag.color }]}>{tag.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.triggerValue}>Add tags</Text>
          )}
        </View>
        <Icon source="chevron-right" size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text variant="titleMedium" style={styles.sheetTitle}>Tags</Text>

            <View style={styles.createRow}>
              <TextInput
                value={newTagName}
                onChangeText={setNewTagName}
                placeholder="New tag name..."
                placeholderTextColor={colors.textTertiary}
                mode="flat"
                style={styles.createInput}
                underlineColor="transparent"
                activeUnderlineColor={colors.primary}
                textColor={colors.text}
                dense
                onSubmitEditing={handleCreateTag}
                returnKeyType="done"
              />
              <View style={styles.paletteRow}>
                {TAG_PALETTE.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.paletteCircle,
                      { backgroundColor: c },
                      newTagColor === c && styles.paletteCircleActive,
                    ]}
                    onPress={() => setNewTagColor(c)}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateTag}
              >
                <Icon source="plus" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tagList} showsVerticalScrollIndicator={false}>
              {tags.length === 0 ? (
                <Text style={styles.emptyText}>No tags yet. Create one above.</Text>
              ) : (
                tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <View key={tag.id} style={styles.tagRow}>
                      <TouchableOpacity
                        style={[
                          styles.tagChip,
                          { borderColor: tag.color + '40' },
                          isSelected && { backgroundColor: tag.color + '22', borderColor: tag.color },
                        ]}
                        onPress={() => toggleTag(tag.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                        <Text style={[styles.tagName, isSelected && { color: tag.color, fontWeight: '700' }]}>
                          {tag.name}
                        </Text>
                        {isSelected && <Icon source="check" size={16} color={tag.color} />}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteTag(tag.id)}
                        hitSlop={8}
                      >
                        <Icon source="close" size={14} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  triggerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerTextCol: { flex: 1 },
  triggerLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  triggerValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.capsule,
  },
  miniChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },

  createRow: {
    marginBottom: spacing.md,
  },
  createInput: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
    fontSize: 15,
    height: 44,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  paletteCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  paletteCircleActive: {
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.capsule,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  tagList: {
    flex: 1,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tagChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tagName: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },

  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
