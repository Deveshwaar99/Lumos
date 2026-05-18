import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Divider, Icon, Modal, Portal, Text } from 'react-native-paper';
import { colors, radius, spacing } from '../theme';
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
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.panel}>
          <Text variant="titleMedium" style={styles.title}>
            Time Period
          </Text>
          <ScrollView>
            {OPTIONS.map((item, index) => {
              const isSelected = selected === item.key;
              return (
                <React.Fragment key={item.key}>
                  {index > 0 && <Divider style={styles.divider} />}
                  <TouchableOpacity
                    style={[styles.item, isSelected && styles.selected]}
                    onPress={() => {
                      onSelect(item.key);
                      onDismiss();
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        isSelected && styles.iconCircleSelected,
                      ]}
                    >
                      <Icon
                        source={item.icon as any}
                        size={20}
                        color={isSelected ? colors.onPrimary : colors.primary}
                      />
                    </View>
                    <Text
                      variant="bodyLarge"
                      style={[styles.itemText, isSelected && styles.itemTextSelected]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Icon source="check-circle" size={20} color={colors.onPrimary} />
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: spacing.lg,
    borderRadius: radius.md,
    maxHeight: '70%',
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardInset,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { marginBottom: 12, textAlign: 'center' },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    marginRight: 12,
  },
  iconCircleSelected: {
    backgroundColor: colors.primary,
  },
  itemText: { flex: 1, color: colors.text },
  itemTextSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
