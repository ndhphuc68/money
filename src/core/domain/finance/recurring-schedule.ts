// src/core/domain/finance/recurring-schedule.ts
import { FinanceRecord } from './finance-record';
import { RecurringFrequency } from './recurring-date';

export type RecurringScheduleStatus = 'active' | 'paused' | 'ended';

export type RecurringSchedule = FinanceRecord & {
  displayName: string;
  /** MVP only ever creates `expense`; kept as a field to extend to income later. */
  type: 'expense';
  accountId: string;
  categoryId: string;
  /** Positive integer VNĐ default for future periods. */
  amount: number;
  frequency: RecurringFrequency;
  anchorDay: number;
  startDate: string;
  endDate: string | null;
  occurrenceLimit: number | null;
  remindDaysBefore: number;
  status: RecurringScheduleStatus;
  firstTransactionId: string;
  note: string | null;
  /** Number of periods created so far, including period 1. */
  generatedCount: number;
};

export type RecurringScheduleInput = {
  displayName: string;
  accountId: string;
  categoryId: string;
  amount: number;
  frequency: RecurringFrequency;
  anchorDay: number;
  startDate: string;
  endDate?: string | null;
  occurrenceLimit?: number | null;
  remindDaysBefore?: number;
  note?: string | null;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FREQUENCIES: RecurringFrequency[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_ONLY_PATTERN.test(value);
}

/** Validates a recurring schedule input against the MVP business rules (spec §Mô hình dữ liệu). */
export function validateRecurringScheduleInput(input: RecurringScheduleInput): void {
  if (!isNonEmptyString(input.displayName)) {
    throw new Error('Recurring schedule displayName must not be empty');
  }
  if (!isNonEmptyString(input.accountId)) {
    throw new Error('Recurring schedule accountId must not be empty');
  }
  if (!isNonEmptyString(input.categoryId)) {
    throw new Error('Recurring schedule categoryId must not be empty');
  }
  if (typeof input.amount !== 'number' || !Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Recurring schedule amount must be a positive integer');
  }
  if (!FREQUENCIES.includes(input.frequency)) {
    throw new Error('Recurring schedule frequency must be weekly, monthly, quarterly or yearly');
  }
  if (input.frequency === 'weekly') {
    if (!Number.isInteger(input.anchorDay) || input.anchorDay < 0 || input.anchorDay > 6) {
      throw new Error('Recurring schedule anchorDay must be between 0 and 6 for weekly frequency');
    }
  } else if (!Number.isInteger(input.anchorDay) || input.anchorDay < 1 || input.anchorDay > 31) {
    throw new Error(
      'Recurring schedule anchorDay must be between 1 and 31 for monthly, quarterly or yearly frequency',
    );
  }
  if (!isValidIsoDate(input.startDate)) {
    throw new Error('Recurring schedule startDate must be a valid ISO calendar date (YYYY-MM-DD)');
  }
  const remindDaysBefore = input.remindDaysBefore ?? 1;
  if (!Number.isInteger(remindDaysBefore) || remindDaysBefore < 0) {
    throw new Error('Recurring schedule remindDaysBefore must be a non-negative integer');
  }
  if (input.endDate != null && input.occurrenceLimit != null) {
    throw new Error('Recurring schedule cannot set both endDate and occurrenceLimit');
  }
  if (input.endDate != null && !isValidIsoDate(input.endDate)) {
    throw new Error('Recurring schedule endDate must be a valid ISO calendar date (YYYY-MM-DD)');
  }
  if (
    input.occurrenceLimit != null &&
    (!Number.isInteger(input.occurrenceLimit) || input.occurrenceLimit <= 0)
  ) {
    throw new Error('Recurring schedule occurrenceLimit must be a positive integer');
  }
}
