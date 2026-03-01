import {
  format,
  parse,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  addMonths as addMonthsFn,
  addDays,
  startOfDay,
  endOfDay,
} from 'date-fns';

/**
 * Returns current month in YYYY-MM format.
 */
export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

/**
 * Returns yyyy-MM-dd date strings for first and last day of the given month (YYYY-MM).
 */
export function getMonthRange(month: string): { start: string; end: string } {
  const date = parse(month + '-01', 'yyyy-MM-dd', new Date());
  const start = startOfMonth(date);
  const nextMonthStart = startOfMonth(addMonthsFn(date, 1));
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(nextMonthStart, 'yyyy-MM-dd'),
  };
}

/**
 * Returns yyyy-MM-dd date strings for the given preset range.
 */
export function getDateRangePreset(
  preset: 'today' | 'week' | 'month' | 'year'
): { start: string; end: string } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (preset) {
    case 'today':
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case 'week':
      startDate = startOfWeek(now);
      endDate = endOfWeek(now);
      break;
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'year':
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      break;
  }

  return {
    start: format(startOfDay(startDate), 'yyyy-MM-dd'),
    end: format(addDays(endOfDay(endDate), 1), 'yyyy-MM-dd'),
  };
}

/**
 * Parses date string (ISO or yyyy-MM-dd) to Date.
 */
function parseDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return parseISO(dateStr);
  }
  return parse(dateStr, 'yyyy-MM-dd', new Date());
}

/**
 * Formats ISO date string to 'MMM dd, yyyy'.
 */
export function formatDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return format(date, 'MMM dd, yyyy');
}

/**
 * Formats ISO date string to 'MMM dd'.
 */
export function formatDateShort(dateStr: string): string {
  const date = parseDate(dateStr);
  return format(date, 'MMM dd');
}

/**
 * Converts 'YYYY-MM' to full month label, e.g. 'March 2026'.
 */
export function getMonthLabel(month: string): string {
  const date = parse(month + '-01', 'yyyy-MM-dd', new Date());
  return format(date, 'MMMM yyyy');
}

/**
 * Returns array of yyyy-MM-dd date strings for each day in the given month (YYYY-MM).
 */
export function getDaysInMonth(month: string): string[] {
  const date = parse(month + '-01', 'yyyy-MM-dd', new Date());
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end });
  return days.map((d) => format(d, 'yyyy-MM-dd'));
}

/**
 * Formats ISO date string to 'MMM dd, h:mm a' e.g. "Mar 01, 2:30 PM".
 * Falls back to date-only format if no time component.
 */
export function formatDateTimeShort(dateStr: string): string {
  const date = parseDate(dateStr);
  if (dateStr.includes('T')) {
    return format(date, 'MMM dd, h:mm a');
  }
  return format(date, 'MMM dd');
}

/**
 * Extracts time portion as 'h:mm a' e.g. "2:30 PM".
 */
export function formatTimeShort(dateStr: string): string {
  const date = parseDate(dateStr);
  return format(date, 'h:mm a');
}

/**
 * Adds n months to YYYY-MM string, returns YYYY-MM.
 */
export function addMonths(month: string, n: number): string {
  const date = parse(month + '-01', 'yyyy-MM-dd', new Date());
  const result = addMonthsFn(date, n);
  return format(result, 'yyyy-MM');
}
