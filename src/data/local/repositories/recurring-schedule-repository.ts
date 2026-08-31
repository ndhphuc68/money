// src/data/local/repositories/recurring-schedule-repository.ts
import { and, eq } from 'drizzle-orm';

import {
  RecurringScheduleRepository as RecurringScheduleRepositoryPort,
  UpdateRecurringScheduleInput,
} from '@/core/application/ports/recurring-repositories';
import { WriteContext } from '@/core/application/ports/finance-repositories';
import { RecurringSchedule, RecurringScheduleStatus } from '@/core/domain/finance/recurring-schedule';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, recurringSchedules } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toRecurringScheduleEntity, toRecurringScheduleRowValues } from './recurring-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import {
  canonicalizeSyncableRecordIdentifiers,
  canonicalizeSyncOperationIdentifiers,
} from './sync-identifier-validation';

export class RecurringScheduleRepository implements RecurringScheduleRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async findById(id: string): Promise<RecurringSchedule | null> {
    const row = this.database.db
      .select()
      .from(recurringSchedules)
      .where(eq(recurringSchedules.id, id))
      .get();
    return row ? toRecurringScheduleEntity(row) : null;
  }

  async list(filter: { status?: RecurringScheduleStatus } = {}): Promise<RecurringSchedule[]> {
    const conditions = [];
    if (filter.status) {
      conditions.push(eq(recurringSchedules.status, filter.status));
    }
    const query = this.database.db.select().from(recurringSchedules);
    const rows = (conditions.length > 0 ? query.where(and(...conditions)) : query).all();
    return rows.map(toRecurringScheduleEntity);
  }

  async update(
    id: string,
    changes: UpdateRecurringScheduleInput,
    context: WriteContext,
  ): Promise<RecurringSchedule> {
    const existing = await this.requireById(id);
    const updated: RecurringSchedule = {
      ...existing,
      displayName: changes.displayName ?? existing.displayName,
      accountId: changes.accountId ?? existing.accountId,
      categoryId: changes.categoryId ?? existing.categoryId,
      amount: changes.amount ?? existing.amount,
      frequency: changes.frequency ?? existing.frequency,
      anchorDay: changes.anchorDay ?? existing.anchorDay,
      endDate: changes.endDate !== undefined ? changes.endDate : existing.endDate,
      occurrenceLimit:
        changes.occurrenceLimit !== undefined ? changes.occurrenceLimit : existing.occurrenceLimit,
      remindDaysBefore: changes.remindDaysBefore ?? existing.remindDaysBefore,
      status: changes.status ?? existing.status,
      note: changes.note !== undefined ? (changes.note ?? null) : existing.note,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'recurring_schedule',
      entityId: updated.id,
      operation: 'update',
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  async saveWithOperation(record: RecurringSchedule, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as RecurringSchedule;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toRecurringScheduleRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(recurringSchedules)
        .values(values)
        .onConflictDoUpdate({ target: recurringSchedules.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async requireById(id: string): Promise<RecurringSchedule> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Recurring schedule ${id} not found`);
    }
    return existing;
  }
}
