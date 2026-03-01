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
  addWeeks,
  addYears,
  startOfDay,
  endOfDay,
  isSameYear,
} from 'date-fns';

export type TimePeriod = 'day' | 'week' | 'month' | '3months' | '6months' | 'year';

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

/**
 * Computes an exclusive date range { start, end } for the given anchor + period.
 * `end` is the day AFTER the last included day (half-open), matching getMonthRange convention.
 */
export function getTimePeriodRange(
  anchor: Date,
  period: TimePeriod,
): { start: string; end: string } {
  let s: Date;
  let e: Date;

  switch (period) {
    case 'day':
      s = startOfDay(anchor);
      e = addDays(s, 1);
      break;
    case 'week':
      s = startOfWeek(anchor);
      e = addDays(endOfWeek(anchor), 1);
      break;
    case 'month':
      s = startOfMonth(anchor);
      e = startOfMonth(addMonthsFn(anchor, 1));
      break;
    case '3months': {
      const q = Math.floor(anchor.getMonth() / 3) * 3;
      s = new Date(anchor.getFullYear(), q, 1);
      e = startOfMonth(addMonthsFn(s, 3));
      break;
    }
    case '6months': {
      const h = Math.floor(anchor.getMonth() / 6) * 6;
      s = new Date(anchor.getFullYear(), h, 1);
      e = startOfMonth(addMonthsFn(s, 6));
      break;
    }
    case 'year':
      s = startOfYear(anchor);
      e = startOfYear(addYears(anchor, 1));
      break;
  }

  return {
    start: format(s, 'yyyy-MM-dd'),
    end: format(e, 'yyyy-MM-dd'),
  };
}

/**
 * Moves the anchor forward or backward by one step of the given period.
 */
export function stepAnchor(
  anchor: Date,
  period: TimePeriod,
  direction: 1 | -1,
): Date {
  switch (period) {
    case 'day':
      return addDays(anchor, direction);
    case 'week':
      return addWeeks(anchor, direction);
    case 'month':
      return addMonthsFn(anchor, direction);
    case '3months':
      return addMonthsFn(anchor, direction * 3);
    case '6months':
      return addMonthsFn(anchor, direction * 6);
    case 'year':
      return addYears(anchor, direction);
  }
}

/**
 * Returns a human-readable label for the navigator display.
 */
export function getTimePeriodLabel(anchor: Date, period: TimePeriod): string {
  switch (period) {
    case 'day':
      return format(anchor, 'MMM dd, yyyy');
    case 'week': {
      const ws = startOfWeek(anchor);
      const we = endOfWeek(anchor);
      if (isSameYear(ws, we)) {
        return `${format(ws, 'MMM dd')} - ${format(we, 'MMM dd')}`;
      }
      return `${format(ws, 'MMM dd, yyyy')} - ${format(we, 'MMM dd, yyyy')}`;
    }
    case 'month':
      return format(startOfMonth(anchor), 'MMMM yyyy');
    case '3months': {
      const q = Math.floor(anchor.getMonth() / 3) * 3;
      const qs = new Date(anchor.getFullYear(), q, 1);
      const qe = addMonthsFn(qs, 2);
      if (isSameYear(qs, qe)) {
        return `${format(qs, 'MMM')} - ${format(qe, 'MMM yyyy')}`;
      }
      return `${format(qs, 'MMM yyyy')} - ${format(qe, 'MMM yyyy')}`;
    }
    case '6months': {
      const h = Math.floor(anchor.getMonth() / 6) * 6;
      const hs = new Date(anchor.getFullYear(), h, 1);
      const he = addMonthsFn(hs, 5);
      if (isSameYear(hs, he)) {
        return `${format(hs, 'MMM')} - ${format(he, 'MMM yyyy')}`;
      }
      return `${format(hs, 'MMM yyyy')} - ${format(he, 'MMM yyyy')}`;
    }
    case 'year':
      return format(anchor, 'yyyy');
  }
}

/**
 * Returns array of yyyy-MM-dd strings for each day in an arbitrary [start, end) range.
 */
export function getDaysInRange(start: string, end: string): string[] {
  const s = parse(start, 'yyyy-MM-dd', new Date());
  const e = addDays(parse(end, 'yyyy-MM-dd', new Date()), -1);
  if (e < s) return [];
  return eachDayOfInterval({ start: s, end: e }).map((d) => format(d, 'yyyy-MM-dd'));
}
