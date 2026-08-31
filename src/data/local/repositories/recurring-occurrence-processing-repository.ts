// src/data/local/repositories/recurring-occurrence-processing-repository.ts
import { eq } from 'drizzle-orm';

import {
  ConfirmRecurringOccurrenceInput,
  CreateRecurringExpenseInput,
  RecurringOccurrenceProcessing,
  RecurringOccurrenceProcessingResult,
  SkipRecurringOccurrenceInput,
} from '@/core/application/ports/recurring-repositories';
import { computeNextOccurrenceDate, isBeyondScheduleLimit } from '@/core/domain/finance/recurring-date';
import {
  RecurringOccurrence,
  RecurringOccurrenceEdits,
  validateRecurringOccurrenceEdits,
} from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule, validateRecurringScheduleInput } from '@/core/domain/finance/recurring-schedule';
import { Transaction, validateTransactionInput } from '@/core/domain/finance/transaction';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, recurringOccurrences, recurringSchedules, transactions } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toTransactionRowValues } from './finance-record-mappers';
import { toRecurringOccurrenceRowValues, toRecurringScheduleRowValues } from './recurring-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';

type MergedOccurrenceFields = {
  amount: number;
  accountId: string;
  categoryId: string;
  displayName: string;
  note: string | null;
};

function mergeEdits(
  occurrence: Pick<RecurringOccurrence, 'amount' | 'accountId' | 'categoryId' | 'displayName' | 'note'>,
  edits: RecurringOccurrenceEdits,
): MergedOccurrenceFields {
  return {
    amount: edits.amount ?? occurrence.amount,
    accountId: edits.accountId ?? occurrence.accountId,
    categoryId: edits.categoryId ?? occurrence.categoryId,
    displayName: edits.displayName ?? occurrence.displayName,
    note: edits.note !== undefined ? edits.note : occurrence.note,
  };
}

export class RecurringOccurrenceProcessingRepository implements RecurringOccurrenceProcessing {
  constructor(private readonly database: LocalDatabaseClient) {}

  async createFirstPeriod(
    input: CreateRecurringExpenseInput,
  ): Promise<{ schedule: RecurringSchedule; occurrence: RecurringOccurrence }> {
    validateTransactionInput(input.transaction);
    validateRecurringScheduleInput(input.schedule);

    const transaction: Transaction = {
      id: input.transactionId,
      type: 'expense',
      amount: input.transaction.amount,
      accountId: input.transaction.accountId,
      categoryId: input.transaction.categoryId as string,
      destinationAccountId: null,
      date: input.transaction.date,
      name: input.transaction.name,
      note: input.transaction.note ?? null,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };

    const schedule: RecurringSchedule = {
      id: input.scheduleId,
      displayName: input.schedule.displayName,
      type: 'expense',
      accountId: input.schedule.accountId,
      categoryId: input.schedule.categoryId,
      amount: input.schedule.amount,
      frequency: input.schedule.frequency,
      anchorDay: input.schedule.anchorDay,
      startDate: input.schedule.startDate,
      endDate: input.schedule.endDate ?? null,
      occurrenceLimit: input.schedule.occurrenceLimit ?? null,
      remindDaysBefore: input.schedule.remindDaysBefore ?? 1,
      status: 'active',
      firstTransactionId: input.transactionId,
      note: input.schedule.note ?? null,
      generatedCount: 1,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };

    const occurrence: RecurringOccurrence = {
      id: input.occurrenceId,
      scheduleId: schedule.id,
      scheduledDate: computeNextOccurrenceDate(schedule.startDate, schedule.frequency, schedule.anchorDay),
      amount: schedule.amount,
      accountId: schedule.accountId,
      categoryId: schedule.categoryId,
      displayName: schedule.displayName,
      note: schedule.note,
      status: 'pending',
      transactionId: null,
      notifiedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };

    this.database.db.transaction((tx) => {
      insertTransaction(tx, transaction, input.transactionOperationId, input.originDeviceId, input.now);
      insertSchedule(tx, schedule, input.scheduleOperationId, input.originDeviceId, input.now);
      insertOccurrence(tx, occurrence, input.occurrenceOperationId, input.originDeviceId, input.now);
    });

    return { schedule, occurrence };
  }

  async confirmOccurrence(
    input: ConfirmRecurringOccurrenceInput,
  ): Promise<RecurringOccurrenceProcessingResult & { transactionId: string }> {
    validateRecurringOccurrenceEdits(input.edits);
    const { occurrence: existingOccurrence, schedule: existingSchedule } = this.requireOccurrenceAndSchedule(
      input.occurrenceId,
    );
    if (existingOccurrence.status !== 'pending') {
      throw new Error(`Recurring occurrence ${input.occurrenceId} is not pending`);
    }

    const merged = mergeEdits(existingOccurrence, input.edits);
    const today = input.now.slice(0, 10);

    const confirmedTransaction: Transaction = {
      id: input.transactionId,
      type: 'expense',
      amount: merged.amount,
      accountId: merged.accountId,
      categoryId: merged.categoryId,
      destinationAccountId: null,
      date: today,
      name: merged.displayName,
      note: merged.note,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };

    const confirmedOccurrence: RecurringOccurrence = {
      ...existingOccurrence,
      ...merged,
      status: 'confirmed',
      transactionId: input.transactionId,
      updatedAt: input.now,
      revision: existingOccurrence.revision + 1,
      originDeviceId: input.originDeviceId,
    };

    const scheduleWithScope: RecurringSchedule =
      input.applyScope === 'this_and_future'
        ? {
            ...existingSchedule,
            amount: merged.amount,
            accountId: merged.accountId,
            categoryId: merged.categoryId,
            displayName: merged.displayName,
            note: merged.note,
          }
        : existingSchedule;

    const { schedule: updatedSchedule, nextOccurrence } = buildNextPeriod({
      schedule: scheduleWithScope,
      previousScheduledDate: existingOccurrence.scheduledDate,
      now: input.now,
      originDeviceId: input.originDeviceId,
      scheduleOperationId: input.scheduleOperationId,
      nextOccurrenceId: input.nextOccurrenceId,
    });

    this.database.db.transaction((tx) => {
      insertTransaction(tx, confirmedTransaction, input.transactionOperationId, input.originDeviceId, input.now);
      updateOccurrence(tx, confirmedOccurrence, input.occurrenceOperationId, input.originDeviceId, input.now);
      updateSchedule(tx, updatedSchedule, input.scheduleOperationId, input.originDeviceId, input.now);
      if (nextOccurrence && input.nextOccurrenceOperationId) {
        insertOccurrence(tx, nextOccurrence, input.nextOccurrenceOperationId, input.originDeviceId, input.now);
      }
    });

    return {
      transactionId: input.transactionId,
      occurrence: confirmedOccurrence,
      schedule: updatedSchedule,
      nextOccurrence,
    };
  }

  async skipOccurrence(
    input: SkipRecurringOccurrenceInput,
  ): Promise<RecurringOccurrenceProcessingResult> {
    const { occurrence: existingOccurrence, schedule: existingSchedule } = this.requireOccurrenceAndSchedule(
      input.occurrenceId,
    );
    if (existingOccurrence.status !== 'pending') {
      throw new Error(`Recurring occurrence ${input.occurrenceId} is not pending`);
    }

    const skippedOccurrence: RecurringOccurrence = {
      ...existingOccurrence,
      status: 'skipped',
      updatedAt: input.now,
      revision: existingOccurrence.revision + 1,
      originDeviceId: input.originDeviceId,
    };

    const { schedule: updatedSchedule, nextOccurrence } = buildNextPeriod({
      schedule: existingSchedule,
      previousScheduledDate: existingOccurrence.scheduledDate,
      now: input.now,
      originDeviceId: input.originDeviceId,
      scheduleOperationId: input.scheduleOperationId,
      nextOccurrenceId: input.nextOccurrenceId,
    });

    this.database.db.transaction((tx) => {
      updateOccurrence(tx, skippedOccurrence, input.occurrenceOperationId, input.originDeviceId, input.now);
      updateSchedule(tx, updatedSchedule, input.scheduleOperationId, input.originDeviceId, input.now);
      if (nextOccurrence && input.nextOccurrenceOperationId) {
        insertOccurrence(tx, nextOccurrence, input.nextOccurrenceOperationId, input.originDeviceId, input.now);
      }
    });

    return { occurrence: skippedOccurrence, schedule: updatedSchedule, nextOccurrence };
  }

  private requireOccurrenceAndSchedule(
    occurrenceId: string,
  ): { occurrence: RecurringOccurrence; schedule: RecurringSchedule } {
    const occurrenceRow = this.database.db
      .select()
      .from(recurringOccurrences)
      .where(eq(recurringOccurrences.id, occurrenceId))
      .get();
    if (!occurrenceRow) {
      throw new Error(`Recurring occurrence ${occurrenceId} not found`);
    }
    const scheduleRow = this.database.db
      .select()
      .from(recurringSchedules)
      .where(eq(recurringSchedules.id, occurrenceRow.scheduleId))
      .get();
    if (!scheduleRow) {
      throw new Error(`Recurring schedule ${occurrenceRow.scheduleId} not found`);
    }
    return {
      occurrence: toEntityOccurrence(occurrenceRow),
      schedule: toEntitySchedule(scheduleRow),
    };
  }
}

/**
 * Shared "what happens to the schedule and the next occurrence" step used
 * by both confirm and skip (spec §Sinh kỳ tiếp theo): only schedules that
 * are still `active` and within `endDate`/`occurrenceLimit` generate a new
 * `pending` occurrence; otherwise the schedule may transition to `ended`.
 */
function buildNextPeriod(params: {
  schedule: RecurringSchedule;
  previousScheduledDate: string;
  now: string;
  originDeviceId: string;
  scheduleOperationId: string;
  nextOccurrenceId: string | null;
}): { schedule: RecurringSchedule; nextOccurrence: RecurringOccurrence | null } {
  const { schedule, previousScheduledDate, now, originDeviceId, nextOccurrenceId } = params;
  const candidateDate = computeNextOccurrenceDate(previousScheduledDate, schedule.frequency, schedule.anchorDay);
  const beyondLimit = isBeyondScheduleLimit({
    endDate: schedule.endDate,
    occurrenceLimit: schedule.occurrenceLimit,
    generatedCount: schedule.generatedCount,
    candidateDate,
  });

  if (schedule.status !== 'active' || beyondLimit || nextOccurrenceId === null) {
    return {
      schedule: {
        ...schedule,
        status: beyondLimit ? 'ended' : schedule.status,
        updatedAt: now,
        revision: schedule.revision + 1,
        originDeviceId,
      },
      nextOccurrence: null,
    };
  }

  const updatedSchedule: RecurringSchedule = {
    ...schedule,
    generatedCount: schedule.generatedCount + 1,
    updatedAt: now,
    revision: schedule.revision + 1,
    originDeviceId,
  };
  const nextOccurrence: RecurringOccurrence = {
    id: nextOccurrenceId,
    scheduleId: schedule.id,
    scheduledDate: candidateDate,
    amount: updatedSchedule.amount,
    accountId: updatedSchedule.accountId,
    categoryId: updatedSchedule.categoryId,
    displayName: updatedSchedule.displayName,
    note: updatedSchedule.note,
    status: 'pending',
    transactionId: null,
    notifiedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    revision: 1,
    originDeviceId,
  };

  return { schedule: updatedSchedule, nextOccurrence };
}

// Local aliases to the schema's inferred row types, to avoid depending on
// the Task 5 repository classes (which each own a transaction).
type SqliteTransactionArg = Parameters<LocalDatabaseClient['db']['transaction']>[0];
type SqliteTx = SqliteTransactionArg extends (tx: infer Tx) => unknown ? Tx : never;

function toEntitySchedule(row: typeof recurringSchedules.$inferSelect): RecurringSchedule {
  return {
    id: row.id,
    displayName: row.displayName,
    type: row.type,
    accountId: row.accountId,
    categoryId: row.categoryId,
    amount: row.amount,
    frequency: row.frequency,
    anchorDay: row.anchorDay,
    startDate: row.startDate,
    endDate: row.endDate,
    occurrenceLimit: row.occurrenceLimit,
    remindDaysBefore: row.remindDaysBefore,
    status: row.status,
    firstTransactionId: row.firstTransactionId,
    note: row.note,
    generatedCount: row.generatedCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

function toEntityOccurrence(row: typeof recurringOccurrences.$inferSelect): RecurringOccurrence {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    scheduledDate: row.scheduledDate,
    amount: row.amount,
    accountId: row.accountId,
    categoryId: row.categoryId,
    displayName: row.displayName,
    note: row.note,
    status: row.status,
    transactionId: row.transactionId,
    notifiedAt: row.notifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

function insertTransaction(
  tx: SqliteTx,
  transaction: Transaction,
  operationId: string,
  originDeviceId: string,
  now: string,
): void {
  const values = toTransactionRowValues(transaction);
  tx.insert(transactions).values(values).onConflictDoUpdate({ target: transactions.id, set: values }).run();
  const operation = buildSyncOperation({
    entityType: 'transaction',
    entityId: transaction.id,
    operation: 'create',
    payload: transaction,
    originDeviceId,
    revision: transaction.revision,
    createdAt: now,
    operationId,
  });
  tx.insert(changeLog).values(toChangeLogValues(operation)).run();
}

function insertSchedule(
  tx: SqliteTx,
  schedule: RecurringSchedule,
  operationId: string,
  originDeviceId: string,
  now: string,
): void {
  const values = toRecurringScheduleRowValues(schedule);
  tx.insert(recurringSchedules)
    .values(values)
    .onConflictDoUpdate({ target: recurringSchedules.id, set: values })
    .run();
  const operation = buildSyncOperation({
    entityType: 'recurring_schedule',
    entityId: schedule.id,
    operation: 'create',
    payload: schedule,
    originDeviceId,
    revision: schedule.revision,
    createdAt: now,
    operationId,
  });
  tx.insert(changeLog).values(toChangeLogValues(operation)).run();
}

function updateSchedule(
  tx: SqliteTx,
  schedule: RecurringSchedule,
  operationId: string,
  originDeviceId: string,
  now: string,
): void {
  const values = toRecurringScheduleRowValues(schedule);
  tx.insert(recurringSchedules)
    .values(values)
    .onConflictDoUpdate({ target: recurringSchedules.id, set: values })
    .run();
  const operation = buildSyncOperation({
    entityType: 'recurring_schedule',
    entityId: schedule.id,
    operation: 'update',
    payload: schedule,
    originDeviceId,
    revision: schedule.revision,
    createdAt: now,
    operationId,
  });
  tx.insert(changeLog).values(toChangeLogValues(operation)).run();
}

function insertOccurrence(
  tx: SqliteTx,
  occurrence: RecurringOccurrence,
  operationId: string,
  originDeviceId: string,
  now: string,
): void {
  const values = toRecurringOccurrenceRowValues(occurrence);
  tx.insert(recurringOccurrences)
    .values(values)
    .onConflictDoUpdate({ target: recurringOccurrences.id, set: values })
    .run();
  const operation = buildSyncOperation({
    entityType: 'recurring_occurrence',
    entityId: occurrence.id,
    operation: 'create',
    payload: occurrence,
    originDeviceId,
    revision: occurrence.revision,
    createdAt: now,
    operationId,
  });
  tx.insert(changeLog).values(toChangeLogValues(operation)).run();
}

function updateOccurrence(
  tx: SqliteTx,
  occurrence: RecurringOccurrence,
  operationId: string,
  originDeviceId: string,
  now: string,
): void {
  const values = toRecurringOccurrenceRowValues(occurrence);
  tx.insert(recurringOccurrences)
    .values(values)
    .onConflictDoUpdate({ target: recurringOccurrences.id, set: values })
    .run();
  const operation = buildSyncOperation({
    entityType: 'recurring_occurrence',
    entityId: occurrence.id,
    operation: 'update',
    payload: occurrence,
    originDeviceId,
    revision: occurrence.revision,
    createdAt: now,
    operationId,
  });
  tx.insert(changeLog).values(toChangeLogValues(operation)).run();
}
