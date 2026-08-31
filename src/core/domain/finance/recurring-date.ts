// src/core/domain/finance/recurring-date.ts
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const STEP_MONTHS: Record<Exclude<RecurringFrequency, 'weekly'>, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Number of days in `month` (1-based) of `year`. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Derives the fixed anchor used to compute future occurrences: day-of-week
 * (0=Sun..6=Sat) for `weekly`, day-of-month (1-31) otherwise (spec §Mô hình
 * dữ liệu).
 */
export function deriveAnchorDay(date: string, frequency: RecurringFrequency): number {
  const { year, month, day } = parseIsoDate(date);
  if (frequency === 'weekly') {
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }
  return day;
}

/**
 * Computes the next occurrence date. Weekly adds 7 days. Monthly/quarterly/
 * yearly keep `anchorDay` fixed and clamp to the last day of the target
 * month when it is shorter than the anchor (spec §Tính ngày kỳ tiếp theo),
 * which also covers the 29 Feb leap-year case.
 */
export function computeNextOccurrenceDate(
  previousDate: string,
  frequency: RecurringFrequency,
  anchorDay: number,
): string {
  const { year, month, day } = parseIsoDate(previousDate);

  if (frequency === 'weekly') {
    const next = new Date(Date.UTC(year, month - 1, day));
    next.setUTCDate(next.getUTCDate() + 7);
    return formatIsoDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  }

  const stepMonths = STEP_MONTHS[frequency];
  const totalMonthIndex = month - 1 + stepMonths;
  const nextYear = year + Math.floor(totalMonthIndex / 12);
  const nextMonth = (totalMonthIndex % 12) + 1;
  const clampedDay = Math.min(anchorDay, daysInMonth(nextYear, nextMonth));
  return formatIsoDate(nextYear, nextMonth, clampedDay);
}

/**
 * True once generating a period on `candidateDate` would exceed the
 * schedule's `endDate` or `occurrenceLimit` (spec §Sinh kỳ tiếp theo).
 * `generatedCount` is the number of periods already created (including
 * period 1), so the candidate would be period `generatedCount + 1`.
 */
export function isBeyondScheduleLimit(params: {
  endDate: string | null;
  occurrenceLimit: number | null;
  generatedCount: number;
  candidateDate: string;
}): boolean {
  if (params.endDate !== null && params.candidateDate > params.endDate) {
    return true;
  }
  if (params.occurrenceLimit !== null && params.generatedCount + 1 >= params.occurrenceLimit) {
    return true;
  }

  return false;
}
