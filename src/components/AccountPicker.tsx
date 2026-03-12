import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Modal, Portal, Divider } from 'react-native-paper';
import { colors, spacing, radius } from '../theme';
import type { Account } from '../models/types';

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
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text variant="titleMedium" style={styles.title}>
          {title ?? 'Select Account'}
        </Text>
        <ScrollView>
          {accounts.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <Divider />}
              <TouchableOpacity
                style={[styles.item, selectedId === item.id && styles.selected]}
                onPress={() => {
                  onSelect(item);
                  onDismiss();
                }}
              >
                <View style={styles.iconCircle}>
                  <Icon
                    source={item.icon as any}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text variant="bodyLarge" style={styles.itemText}>
                  {item.name}
                </Text>
                {selectedId === item.id && (
                  <Icon source="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
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
    backgroundColor: colors.primary + '15',
    marginRight: 12,
  },
  itemText: { flex: 1 },
});
