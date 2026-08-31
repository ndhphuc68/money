import {
  previousPeriodOfSameLength,
  quarterOf,
  resolveQuarterRange,
  resolveWeekRange,
  resolveYearRange,
  shiftQuarter,
  shiftWeek,
  shiftYear,
  startOfWeek,
} from '@/core/application/finance/report-periods';

describe('startOfWeek', () => {
  it('returns the same Monday when given a Monday', () => {
    expect(startOfWeek('2026-08-24')).toBe('2026-08-24');
  });

  it('returns the Monday of the current week for any other weekday', () => {
    expect(startOfWeek('2026-08-27')).toBe('2026-08-24'); // Thursday
    expect(startOfWeek('2026-08-30')).toBe('2026-08-24'); // Sunday
  });
});

describe('resolveWeekRange / shiftWeek', () => {
  it('resolves Monday..Sunday inclusive', () => {
    expect(resolveWeekRange('2026-08-24')).toEqual({ from: '2026-08-24', to: '2026-08-30' });
  });

  it('shifts by 7 days per week, including across month/year boundaries', () => {
    expect(shiftWeek('2026-08-24', 1)).toBe('2026-08-31');
    expect(shiftWeek('2026-08-24', -1)).toBe('2026-08-17');
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
  });
});

describe('quarterOf / resolveQuarterRange / shiftQuarter', () => {
  it('derives the quarter key from a date', () => {
    expect(quarterOf('2026-01-15')).toBe('2026-Q1');
    expect(quarterOf('2026-08-27')).toBe('2026-Q3');
    expect(quarterOf('2026-12-31')).toBe('2026-Q4');
  });

  it('resolves a quarter key to its first..last day', () => {
    expect(resolveQuarterRange('2026-Q1')).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    expect(resolveQuarterRange('2026-Q3')).toEqual({ from: '2026-07-01', to: '2026-09-30' });
    expect(resolveQuarterRange('2026-Q4')).toEqual({ from: '2026-10-01', to: '2026-12-31' });
  });

  it('shifts across year boundaries in both directions', () => {
    expect(shiftQuarter('2026-Q3', 1)).toBe('2026-Q4');
    expect(shiftQuarter('2026-Q4', 1)).toBe('2027-Q1');
    expect(shiftQuarter('2026-Q1', -1)).toBe('2025-Q4');
  });
});

describe('resolveYearRange / shiftYear', () => {
  it('resolves a year to Jan 1..Dec 31', () => {
    expect(resolveYearRange('2026')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('shifts by whole years', () => {
    expect(shiftYear('2026', 1)).toBe('2027');
    expect(shiftYear('2026', -1)).toBe('2025');
  });
});

describe('previousPeriodOfSameLength', () => {
  it('returns the immediately preceding period of equal length for a full month', () => {
    expect(previousPeriodOfSameLength({ from: '2026-08-01', to: '2026-08-31' })).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });

  it('returns the immediately preceding period of equal length for a week', () => {
    expect(previousPeriodOfSameLength({ from: '2026-08-24', to: '2026-08-30' })).toEqual({
      from: '2026-08-17',
      to: '2026-08-23',
    });
  });

  it('returns the immediately preceding single day for a 1-day range', () => {
    expect(previousPeriodOfSameLength({ from: '2026-08-24', to: '2026-08-24' })).toEqual({
      from: '2026-08-23',
      to: '2026-08-23',
    });
  });
});
