import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../theme';

interface InlineCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onDone: () => void;
  onDismiss?: () => void;
  onClear?: () => void;
  surfaceColor?: string;
  /**
   * `fullscreen` — parent must have a bounded height (e.g. StyleSheet.absoluteFill).
   * Backdrop fills space above the sheet; tap dismisses.
   * `sheet` — intrinsic height only; use inside toolbars / scroll content without a fixed-height parent.
   */
  variant?: 'fullscreen' | 'sheet';
}

export default function InlineCalendar({
  selectedDate,
  onDateSelect,
  onDone,
  onDismiss,
  onClear,
  surfaceColor = colors.surface,
  variant = 'fullscreen',
}: InlineCalendarProps) {
  const handleDismiss = onDismiss ?? onDone;
  const isSheet = variant === 'sheet';

  const body = (
    <View style={[styles.container, { backgroundColor: surfaceColor }]}>
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
          calendarBackground: surfaceColor,
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
        style={[styles.calendar, { backgroundColor: surfaceColor }]}
      />
    </View>
  );

  if (isSheet) {
    return <View style={styles.wrapperSheet}>{body}</View>;
  }

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={handleDismiss}
        activeOpacity={1}
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  /** Intrinsic height; avoids flex collapse when parent has no bounded height. */
  wrapperSheet: {
    width: '100%',
  },
  backdrop: {
    flex: 1,
  },
  container: {
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
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
    paddingBottom: spacing.md,
  },
});
