import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Modal, Portal, Divider } from 'react-native-paper';
import { colors, spacing, radius } from '../theme';
import type { Category } from '../models/types';

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
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text variant="titleMedium" style={styles.title}>
          Select Category
        </Text>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={Divider}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, selectedId === item.id && styles.selected]}
              onPress={() => {
                onSelect(item);
                onDismiss();
              }}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: item.color + '20' },
                ]}
              >
                <Icon source={item.icon as any} size={20} color={item.color} />
              </View>
              <Text variant="bodyLarge" style={styles.itemText}>
                {item.name}
              </Text>
              {selectedId === item.id && (
                <Icon source="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 12,
    maxHeight: '70%',
    padding: 16,
  },
  title: { marginBottom: 12, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  selected: { backgroundColor: colors.primary + '10' },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemText: { flex: 1 },
});
