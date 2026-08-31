// tests/core/finance/recurring-domain.test.ts
import {
  computeNextOccurrenceDate,
  deriveAnchorDay,
  isBeyondScheduleLimit,
} from '@/core/domain/finance/recurring-date';

describe('deriveAnchorDay', () => {
  it('returns the day of month for monthly/quarterly/yearly', () => {
    expect(deriveAnchorDay('2026-01-31', 'monthly')).toBe(31);
    expect(deriveAnchorDay('2026-08-27', 'quarterly')).toBe(27);
    expect(deriveAnchorDay('2028-02-29', 'yearly')).toBe(29);
  });

  it('returns the day of week (0=Sun) for weekly', () => {
    expect(deriveAnchorDay('2026-08-27', 'weekly')).toBe(4); // Thursday
  });
});

describe('computeNextOccurrenceDate', () => {
  it('adds 7 days for weekly', () => {
    expect(computeNextOccurrenceDate('2026-08-27', 'weekly', 4)).toBe('2026-09-03');
  });

  it('keeps the anchor day for monthly, clamping to end of month', () => {
    expect(computeNextOccurrenceDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28');
    expect(computeNextOccurrenceDate('2026-02-28', 'monthly', 31)).toBe('2026-03-31');
    expect(computeNextOccurrenceDate('2026-03-31', 'monthly', 31)).toBe('2026-04-30');
  });

  it('steps by 3 months for quarterly and 12 months for yearly', () => {
    expect(computeNextOccurrenceDate('2026-08-27', 'quarterly', 27)).toBe('2026-11-27');
    expect(computeNextOccurrenceDate('2026-08-27', 'yearly', 27)).toBe('2027-08-27');
  });

  it('handles a 29 Feb leap-year anchor by falling back to 28 Feb the next year', () => {
    expect(computeNextOccurrenceDate('2028-02-29', 'yearly', 29)).toBe('2029-02-28');
  });

  it('rolls the year over for monthly in December', () => {
    expect(computeNextOccurrenceDate('2026-12-15', 'monthly', 15)).toBe('2027-01-15');
  });
});

describe('isBeyondScheduleLimit', () => {
  it('is false when neither endDate nor occurrenceLimit is set', () => {
    expect(
      isBeyondScheduleLimit({
        endDate: null,
        occurrenceLimit: null,
        generatedCount: 5,
        candidateDate: '2030-01-01',
      }),
    ).toBe(false);
  });

  it('is true once the candidate date passes endDate', () => {
    expect(
      isBeyondScheduleLimit({
        endDate: '2026-12-31',
        occurrenceLimit: null,
        generatedCount: 1,
        candidateDate: '2027-01-15',
      }),
    ).toBe(true);
    expect(
      isBeyondScheduleLimit({
        endDate: '2026-12-31',
        occurrenceLimit: null,
        generatedCount: 1,
        candidateDate: '2026-12-31',
      }),
    ).toBe(false);
  });

  it('is true once generating the candidate would exceed occurrenceLimit', () => {
    expect(
      isBeyondScheduleLimit({
        endDate: null,
        occurrenceLimit: 3,
        generatedCount: 3,
        candidateDate: '2026-10-01',
      }),
    ).toBe(true);
    expect(
      isBeyondScheduleLimit({
        endDate: null,
        occurrenceLimit: 3,
        generatedCount: 2,
        candidateDate: '2026-10-01',
      }),
    ).toBe(false);
  });
});
