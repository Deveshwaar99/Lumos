import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../theme';

interface InlineCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onDone: () => void;
  onDismiss?: () => void;
  onClear?: () => void;
}

export default function InlineCalendar({
  selectedDate,
  onDateSelect,
  onDone,
  onDismiss,
  onClear,
}: InlineCalendarProps) {
  const handleDismiss = onDismiss ?? onDone;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={handleDismiss}
        activeOpacity={1}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          {onClear ? (
            <TouchableOpacity
              onPress={() => {
                onClear();
                onDone();
              }}
            >
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onDone}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Choose date</Text>
          <TouchableOpacity onPress={onDone}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <Calendar
        current={selectedDate}
        onDayPress={(day: DateData) => onDateSelect(day.dateString)}
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: colors.primary,
            selectedTextColor: '#FFFFFF',
          },
        }}
        theme={{
          calendarBackground: colors.surface,
          monthTextColor: colors.text,
          textMonthFontWeight: '700' as const,
          textMonthFontSize: 16,
          arrowColor: colors.primary,
          dayTextColor: colors.text,
          textDayFontSize: 15,
          textDayFontWeight: '500' as const,
          todayTextColor: colors.primary,
          textDisabledColor: colors.textTertiary,
          textSectionTitleColor: colors.textSecondary,
          textDayHeaderFontSize: 12,
          textDayHeaderFontWeight: '600' as const,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#FFFFFF',
        }}
        style={styles.calendar}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  cancelText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  clearText: {
    color: '#EF5350',
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  doneText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  calendar: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.md,
  },
});
