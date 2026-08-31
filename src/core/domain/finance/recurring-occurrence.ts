// src/core/domain/finance/recurring-occurrence.ts
import { FinanceRecord } from './finance-record';

export type RecurringOccurrenceStatus = 'pending' | 'confirmed' | 'skipped';
export type RecurringOccurrenceDisplayStatus = RecurringOccurrenceStatus | 'overdue';

export type RecurringOccurrence = FinanceRecord & {
  scheduleId: string;
  scheduledDate: string;
  amount: number;
  accountId: string;
  categoryId: string;
  displayName: string;
  note: string | null;
  status: RecurringOccurrenceStatus;
  /** Set once `confirmed`; the real Transaction it produced. */
  transactionId: string | null;
  /** Set once a reminder notification has been sent for this occurrence. */
  notifiedAt: string | null;
};

export type RecurringOccurrenceEdits = {
  amount?: number;
  accountId?: string;
  categoryId?: string;
  displayName?: string;
  note?: string | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** Validates in-place edits made while confirming an occurrence (spec §Chỉnh sửa khi xác nhận). */
export function validateRecurringOccurrenceEdits(edits: RecurringOccurrenceEdits): void {
  if (
    edits.amount !== undefined &&
    (typeof edits.amount !== 'number' || !Number.isInteger(edits.amount) || edits.amount <= 0)
  ) {
    throw new Error('Recurring occurrence amount must be a positive integer');
  }
  if (edits.accountId !== undefined && !isNonEmptyString(edits.accountId)) {
    throw new Error('Recurring occurrence accountId must not be empty');
  }
  if (edits.categoryId !== undefined && !isNonEmptyString(edits.categoryId)) {
    throw new Error('Recurring occurrence categoryId must not be empty');
  }
  if (edits.displayName !== undefined && !isNonEmptyString(edits.displayName)) {
    throw new Error('Recurring occurrence displayName must not be empty');
  }
}

/**
 * `overdue` is derived, never stored: a `pending` occurrence whose
 * `scheduledDate` has passed reads as overdue but is still confirmable or
 * skippable exactly like `pending` (spec §Xử lý kỳ dự kiến).
 */
export function deriveOccurrenceDisplayStatus(
  occurrence: Pick<RecurringOccurrence, 'status' | 'scheduledDate'>,
  today: string,
): RecurringOccurrenceDisplayStatus {
  if (occurrence.status === 'pending' && occurrence.scheduledDate < today) {
    return 'overdue';
  }
  return occurrence.status;
}
