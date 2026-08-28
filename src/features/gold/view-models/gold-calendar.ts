export type GoldCalendarCell = {
  key: string;
  label: string;
  iso: string | null;
  isSelected: boolean;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Builds a Monday-first calendar grid for `year`/`month` (0-indexed, matches
 * `Date`), with leading blank cells so the first real day lands in its
 * correct weekday column.
 */
export function buildGoldCalendarCells(year: number, month: number, selectedDate: string): GoldCalendarCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const mondayFirstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: GoldCalendarCell[] = [];
  for (let i = 0; i < mondayFirstWeekday; i++) {
    cells.push({ key: `blank-${i}`, label: '', iso: null, isSelected: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    cells.push({ key: iso, label: String(day), iso, isSelected: iso === selectedDate });
  }
  return cells;
}

/** Formats a 0-indexed month/year as "Tháng N YYYY" (matches the prototype's Vietnamese-only calendar header). */
export function formatGoldCalendarMonthLabel(year: number, month: number): string {
  return `Tháng ${month + 1} ${year}`;
}
