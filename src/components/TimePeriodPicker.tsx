import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Modal, Portal, Divider } from 'react-native-paper';
import { colors, spacing } from '../theme';
import type { TimePeriod } from '../utils/dates';

interface TimePeriodPickerProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (period: TimePeriod) => void;
  selected: TimePeriod;
}

const OPTIONS: { key: TimePeriod; label: string; icon: string }[] = [
  { key: 'day', label: 'Day', icon: 'calendar-today' },
  { key: 'week', label: 'Week', icon: 'calendar-week' },
  { key: 'month', label: 'Month', icon: 'calendar-month' },
  { key: '3months', label: '3 Months', icon: 'calendar-range' },
  { key: '6months', label: '6 Months', icon: 'calendar-range' },
  { key: 'year', label: 'Year', icon: 'calendar' },
];

export default function TimePeriodPicker({
  visible,
  onDismiss,
  onSelect,
  selected,
}: TimePeriodPickerProps) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Text variant="titleMedium" style={styles.title}>
          Time Period
        </Text>
        <FlatList
          data={OPTIONS}
          keyExtractor={(item) => item.key}
          ItemSeparatorComponent={Divider}
          renderItem={({ item }) => {
            const isSelected = selected === item.key;
            return (
              <TouchableOpacity
                style={[styles.item, isSelected && styles.selected]}
                onPress={() => {
                  onSelect(item.key);
                  onDismiss();
                }}
              >
                <View style={styles.iconCircle}>
                  <Icon source={item.icon as any} size={20} color={colors.primary} />
                </View>
                <Text variant="bodyLarge" style={styles.itemText}>
                  {item.label}
                </Text>
                {isSelected && <Icon source="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          }}
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
    backgroundColor: colors.primary + '15',
    marginRight: 12,
  },
  itemText: { flex: 1 },
});
