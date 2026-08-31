/**
 * All internal date math uses UTC-anchored `Date` objects purely as a
 * calendar calculator (never wall-clock/timezone-sensitive) — mirrors the
 * convention in `get-dashboard.ts`'s `resolveMonthRange`/`shiftMonth`.
 */

export type PeriodRange = { from: string; to: string };

function parseIsoDateUtc(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDateUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysUtc(iso: string, days: number): string {
  const date = parseIsoDateUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDateUtc(date);
}

/** Returns the Monday (ISO date) of the week containing `isoDate`. */
export function startOfWeek(isoDate: string): string {
  const day = parseIsoDateUtc(isoDate).getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDaysUtc(isoDate, diffToMonday);
}

/** `weekStart` must already be a Monday (see `startOfWeek`). */
export function resolveWeekRange(weekStart: string): PeriodRange {
  return { from: weekStart, to: addDaysUtc(weekStart, 6) };
}

export function shiftWeek(weekStart: string, deltaWeeks: number): string {
  return addDaysUtc(weekStart, deltaWeeks * 7);
}

/** Returns `"YYYY-Qn"` for the quarter containing `isoDate`. */
export function quarterOf(isoDate: string): string {
  const date = parseIsoDateUtc(isoDate);
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${quarter}`;
}

function parseQuarterKey(quarter: string): { year: number; quarter: number } {
  const [yearPart, quarterPart] = quarter.split('-Q');
  return { year: Number(yearPart), quarter: Number(quarterPart) };
}

export function resolveQuarterRange(quarter: string): PeriodRange {
  const { year, quarter: q } = parseQuarterKey(quarter);
  const startMonth = (q - 1) * 3; // 0-indexed
  const from = toIsoDateUtc(new Date(Date.UTC(year, startMonth, 1)));
  const lastDay = new Date(Date.UTC(year, startMonth + 3, 0)).getUTCDate();
  const to = toIsoDateUtc(new Date(Date.UTC(year, startMonth + 2, lastDay)));
  return { from, to };
}

export function shiftQuarter(quarter: string, deltaQuarters: number): string {
  const { year, quarter: q } = parseQuarterKey(quarter);
  const absoluteQuarter = year * 4 + (q - 1) + deltaQuarters;
  const newYear = Math.floor(absoluteQuarter / 4);
  const newQuarter = (((absoluteQuarter % 4) + 4) % 4) + 1;
  return `${newYear}-Q${newQuarter}`;
}

export function resolveYearRange(year: string): PeriodRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function shiftYear(year: string, deltaYears: number): string {
  return String(Number(year) + deltaYears);
}

/**
 * The immediately preceding period with the same number of days as `range`
 * — e.g. for a 31-day month, the 31 days ending the day before `range.from`.
 * Deliberately day-count-based (not calendar-unit-based) per spec §Thuộc
 * phạm vi v1 item 4 ("kỳ trước liền kề cùng độ dài").
 */
export function previousPeriodOfSameLength(range: PeriodRange): PeriodRange {
  const fromDate = parseIsoDateUtc(range.from);
  const toDate = parseIsoDateUtc(range.to);
  const lengthDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  const previousTo = addDaysUtc(range.from, -1);
  const previousFrom = addDaysUtc(previousTo, -(lengthDays - 1));
  return { from: previousFrom, to: previousTo };
}
