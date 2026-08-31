// src/core/application/ports/recurring-repositories.ts
import { WriteContext } from '@/core/application/ports/finance-repositories';
import {
  RecurringOccurrence,
  RecurringOccurrenceEdits,
} from '@/core/domain/finance/recurring-occurrence';
import {
  RecurringSchedule,
  RecurringScheduleInput,
  RecurringScheduleStatus,
} from '@/core/domain/finance/recurring-schedule';
import { TransactionInput } from '@/core/domain/finance/transaction';
import { SyncOperation } from '@/core/domain/sync/sync-operation';

export type UpdateRecurringScheduleInput = Partial<RecurringScheduleInput> & {
  status?: RecurringScheduleStatus;
};

/** Simple single-table reads/writes for `recurring_schedules`, mirrors `AccountRepository`. */
export interface RecurringScheduleRepository {
  findById(id: string): Promise<RecurringSchedule | null>;
  list(filter?: { status?: RecurringScheduleStatus }): Promise<RecurringSchedule[]>;
  update(
    id: string,
    changes: UpdateRecurringScheduleInput,
    context: WriteContext,
  ): Promise<RecurringSchedule>;
  saveWithOperation(record: RecurringSchedule, operation: SyncOperation): Promise<void>;
}

/** Simple single-table reads/writes for `recurring_occurrences`, mirrors `AccountRepository`. */
export interface RecurringOccurrenceRepository {
  findById(id: string): Promise<RecurringOccurrence | null>;
  /** The single unresolved (`pending`/not-yet-skipped-or-confirmed) occurrence for a schedule, if any. */
  findActiveByScheduleId(scheduleId: string): Promise<RecurringOccurrence | null>;
  listByStatus(statuses: RecurringOccurrence['status'][]): Promise<RecurringOccurrence[]>;
  listByScheduleId(scheduleId: string): Promise<RecurringOccurrence[]>;
  markNotified(id: string, notifiedAt: string, context: WriteContext): Promise<RecurringOccurrence>;
  /** Refreshes an unresolved occurrence's copied default fields, e.g. after editing its schedule (spec §Quản lý định kỳ). */
  update(
    id: string,
    changes: RecurringOccurrenceEdits,
    context: WriteContext,
  ): Promise<RecurringOccurrence>;
  saveWithOperation(record: RecurringOccurrence, operation: SyncOperation): Promise<void>;
}

/**
 * Multi-table, single-SQLite-transaction writes that span `transactions`,
 * `recurring_schedules` and `recurring_occurrences` at once (spec §Kiến trúc
 * triển khai: "Tạo lịch, xác nhận, bỏ qua và change log phải nằm trong cùng
 * SQLite transaction"). Deliberately separate from the two simple repository
 * ports above, which each open their own single-table transaction and so
 * cannot be composed together without nesting transactions.
 */
export type CreateRecurringExpenseInput = {
  originDeviceId: string;
  now: string;
  transactionId: string;
  transactionOperationId: string;
  /** Always `type: 'expense'`; validated by the use case before this is called. */
  transaction: TransactionInput;
  scheduleId: string;
  scheduleOperationId: string;
  schedule: RecurringScheduleInput;
  occurrenceId: string;
  occurrenceOperationId: string;
};

export type ConfirmRecurringOccurrenceInput = {
  occurrenceId: string;
  edits: RecurringOccurrenceEdits;
  applyScope: 'this_only' | 'this_and_future';
  originDeviceId: string;
  now: string;
  transactionId: string;
  transactionOperationId: string;
  occurrenceOperationId: string;
  scheduleOperationId: string;
  /** Pre-generated id/operationId for the next occurrence, or both null if the schedule is ending. */
  nextOccurrenceId: string | null;
  nextOccurrenceOperationId: string | null;
};

export type SkipRecurringOccurrenceInput = {
  occurrenceId: string;
  originDeviceId: string;
  now: string;
  occurrenceOperationId: string;
  scheduleOperationId: string;
  nextOccurrenceId: string | null;
  nextOccurrenceOperationId: string | null;
};

export type RecurringOccurrenceProcessingResult = {
  occurrence: RecurringOccurrence;
  schedule: RecurringSchedule;
  nextOccurrence: RecurringOccurrence | null;
};

export interface RecurringOccurrenceProcessing {
  createFirstPeriod(
    input: CreateRecurringExpenseInput,
  ): Promise<{ schedule: RecurringSchedule; occurrence: RecurringOccurrence }>;
  confirmOccurrence(
    input: ConfirmRecurringOccurrenceInput,
  ): Promise<RecurringOccurrenceProcessingResult & { transactionId: string }>;
  skipOccurrence(input: SkipRecurringOccurrenceInput): Promise<RecurringOccurrenceProcessingResult>;
}
