// tests/core/finance/recurring-domain.test.ts
import {
  computeNextOccurrenceDate,
  deriveAnchorDay,
  isBeyondScheduleLimit,
} from '@/core/domain/finance/recurring-date';
import {
  RecurringScheduleInput,
  validateRecurringScheduleInput,
} from '@/core/domain/finance/recurring-schedule';
import {
  deriveOccurrenceDisplayStatus,
  RecurringOccurrenceEdits,
  validateRecurringOccurrenceEdits,
} from '@/core/domain/finance/recurring-occurrence';

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
        generatedCount: 2,
        candidateDate: '2026-10-01',
      }),
    ).toBe(true);
    expect(
      isBeyondScheduleLimit({
        endDate: null,
        occurrenceLimit: 3,
        generatedCount: 1,
        candidateDate: '2026-10-01',
      }),
    ).toBe(false);
  });
});


const validScheduleInput: RecurringScheduleInput = {
  displayName: 'YouTube Premium',
  accountId: 'account-main',
  categoryId: 'category-bills',
  amount: 179000,
  frequency: 'monthly',
  anchorDay: 27,
  startDate: '2026-08-27',
};

describe('validateRecurringScheduleInput', () => {
  it('accepts a minimal valid input', () => {
    expect(() => validateRecurringScheduleInput(validScheduleInput)).not.toThrow();
  });

  it('rejects a non-positive or non-integer amount', () => {
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, amount: 0 })).toThrow(
      'Recurring schedule amount must be a positive integer',
    );
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, amount: 1.5 })).toThrow(
      'Recurring schedule amount must be a positive integer',
    );
  });

  it('rejects an empty displayName, accountId or categoryId', () => {
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, displayName: '' })).toThrow(
      'Recurring schedule displayName must not be empty',
    );
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, accountId: '' })).toThrow(
      'Recurring schedule accountId must not be empty',
    );
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, categoryId: '' })).toThrow(
      'Recurring schedule categoryId must not be empty',
    );
  });

  it('rejects an unknown frequency', () => {
    expect(() =>
      validateRecurringScheduleInput({ ...validScheduleInput, frequency: 'daily' as never }),
    ).toThrow('Recurring schedule frequency must be weekly, monthly, quarterly or yearly');
  });

  it('rejects an out-of-range anchorDay for the given frequency', () => {
    expect(() =>
      validateRecurringScheduleInput({ ...validScheduleInput, frequency: 'weekly', anchorDay: 7 }),
    ).toThrow('Recurring schedule anchorDay must be between 0 and 6 for weekly frequency');
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, anchorDay: 32 })).toThrow(
      'Recurring schedule anchorDay must be between 1 and 31 for monthly, quarterly or yearly frequency',
    );
  });

  it('rejects a negative or non-integer remindDaysBefore', () => {
    expect(() =>
      validateRecurringScheduleInput({ ...validScheduleInput, remindDaysBefore: -1 }),
    ).toThrow('Recurring schedule remindDaysBefore must be a non-negative integer');
  });

  it('rejects setting both endDate and occurrenceLimit', () => {
    expect(() =>
      validateRecurringScheduleInput({
        ...validScheduleInput,
        endDate: '2027-01-01',
        occurrenceLimit: 6,
      }),
    ).toThrow('Recurring schedule cannot set both endDate and occurrenceLimit');
  });

  it('rejects a non-positive occurrenceLimit', () => {
    expect(() =>
      validateRecurringScheduleInput({ ...validScheduleInput, occurrenceLimit: 0 }),
    ).toThrow('Recurring schedule occurrenceLimit must be a positive integer');
  });
});

describe('validateRecurringOccurrenceEdits', () => {
  it('accepts an empty edits object', () => {
    expect(() => validateRecurringOccurrenceEdits({})).not.toThrow();
  });

  it('rejects a non-positive amount when provided', () => {
    const edits: RecurringOccurrenceEdits = { amount: 0 };
    expect(() => validateRecurringOccurrenceEdits(edits)).toThrow(
      'Recurring occurrence amount must be a positive integer',
    );
  });

  it('rejects an empty displayName when provided', () => {
    expect(() => validateRecurringOccurrenceEdits({ displayName: '  ' })).toThrow(
      'Recurring occurrence displayName must not be empty',
    );
  });
});

describe('deriveOccurrenceDisplayStatus', () => {
  it('returns overdue when pending and past the scheduled date', () => {
    expect(
      deriveOccurrenceDisplayStatus({ status: 'pending', scheduledDate: '2026-08-26' }, '2026-08-27'),
    ).toBe('overdue');
  });

  it('returns pending when not yet due', () => {
    expect(
      deriveOccurrenceDisplayStatus({ status: 'pending', scheduledDate: '2026-08-27' }, '2026-08-27'),
    ).toBe('pending');
  });

  it('returns the stored status for confirmed/skipped regardless of date', () => {
    expect(
      deriveOccurrenceDisplayStatus({ status: 'confirmed', scheduledDate: '2020-01-01' }, '2026-08-27'),
    ).toBe('confirmed');
  });
});
