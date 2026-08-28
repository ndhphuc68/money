import { buildGoldCalendarCells, formatGoldCalendarMonthLabel } from '@/features/gold/view-models/gold-calendar';

describe('buildGoldCalendarCells', () => {
  it('produces leading blank cells for a Monday-first week and marks the selected day', () => {
    // 2026-08-01 is a Saturday -> weekday index (Mon=0..Sun=6) is 5
    const cells = buildGoldCalendarCells(2026, 7, '2026-08-24');

    const blanks = cells.filter((cell) => cell.iso === null);
    expect(blanks).toHaveLength(5);

    const dayCells = cells.filter((cell) => cell.iso !== null);
    expect(dayCells).toHaveLength(31);
    expect(dayCells[0]).toMatchObject({ iso: '2026-08-01', label: '1', isSelected: false });

    const selected = dayCells.find((cell) => cell.iso === '2026-08-24');
    expect(selected).toMatchObject({ label: '24', isSelected: true });
    expect(dayCells.filter((cell) => cell.isSelected)).toHaveLength(1);
  });

  it('handles a month starting on Monday with zero leading blanks', () => {
    // 2026-06-01 is a Monday -> weekday index 0
    const cells = buildGoldCalendarCells(2026, 5, '2026-06-15');
    expect(cells[0].iso).toBe('2026-06-01');
    expect(cells.filter((cell) => cell.iso === null)).toHaveLength(0);
  });

  it('produces unique keys for every cell', () => {
    const cells = buildGoldCalendarCells(2026, 1, '2026-02-10');
    const keys = new Set(cells.map((cell) => cell.key));
    expect(keys.size).toBe(cells.length);
  });
});

describe('formatGoldCalendarMonthLabel', () => {
  it('formats a 0-indexed month as "Tháng N YYYY"', () => {
    expect(formatGoldCalendarMonthLabel(2026, 7)).toBe('Tháng 8 2026');
    expect(formatGoldCalendarMonthLabel(2026, 0)).toBe('Tháng 1 2026');
  });
});
