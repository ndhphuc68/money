// src/data/local/repositories/recurring-occurrence-repository.ts
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { WriteContext } from '@/core/application/ports/finance-repositories';
import { RecurringOccurrenceRepository as RecurringOccurrenceRepositoryPort } from '@/core/application/ports/recurring-repositories';
import {
  RecurringOccurrence,
  RecurringOccurrenceEdits,
  RecurringOccurrenceStatus,
} from '@/core/domain/finance/recurring-occurrence';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, recurringOccurrences } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import {
  toRecurringOccurrenceEntity,
  toRecurringOccurrenceRowValues,
} from './recurring-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import {
  canonicalizeSyncableRecordIdentifiers,
  canonicalizeSyncOperationIdentifiers,
} from './sync-identifier-validation';

export class RecurringOccurrenceRepository implements RecurringOccurrenceRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async findById(id: string): Promise<RecurringOccurrence | null> {
    const row = this.database.db
      .select()
      .from(recurringOccurrences)
      .where(eq(recurringOccurrences.id, id))
      .get();
    return row ? toRecurringOccurrenceEntity(row) : null;
  }

  async findActiveByScheduleId(scheduleId: string): Promise<RecurringOccurrence | null> {
    const row = this.database.db
      .select()
      .from(recurringOccurrences)
      .where(
        and(
          eq(recurringOccurrences.scheduleId, scheduleId),
          eq(recurringOccurrences.status, 'pending'),
        ),
      )
      .get();
    return row ? toRecurringOccurrenceEntity(row) : null;
  }

  async listByStatus(statuses: RecurringOccurrenceStatus[]): Promise<RecurringOccurrence[]> {
    const rows = this.database.db
      .select()
      .from(recurringOccurrences)
      .where(
        and(isNull(recurringOccurrences.deletedAt), inArray(recurringOccurrences.status, statuses)),
      )
      .all();
    return rows.map(toRecurringOccurrenceEntity);
  }

  async listByScheduleId(scheduleId: string): Promise<RecurringOccurrence[]> {
    const rows = this.database.db
      .select()
      .from(recurringOccurrences)
      .where(eq(recurringOccurrences.scheduleId, scheduleId))
      .all();
    return rows.map(toRecurringOccurrenceEntity);
  }

  async markNotified(
    id: string,
    notifiedAt: string,
    context: WriteContext,
  ): Promise<RecurringOccurrence> {
    const existing = await this.requireById(id);
    const updated: RecurringOccurrence = {
      ...existing,
      notifiedAt,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'recurring_occurrence',
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

  async update(
    id: string,
    changes: RecurringOccurrenceEdits,
    context: WriteContext,
  ): Promise<RecurringOccurrence> {
    const existing = await this.requireById(id);
    const updated: RecurringOccurrence = {
      ...existing,
      amount: changes.amount ?? existing.amount,
      accountId: changes.accountId ?? existing.accountId,
      categoryId: changes.categoryId ?? existing.categoryId,
      displayName: changes.displayName ?? existing.displayName,
      note: changes.note !== undefined ? changes.note : existing.note,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'recurring_occurrence',
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

  async saveWithOperation(record: RecurringOccurrence, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as RecurringOccurrence;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toRecurringOccurrenceRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(recurringOccurrences)
        .values(values)
        .onConflictDoUpdate({ target: recurringOccurrences.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async requireById(id: string): Promise<RecurringOccurrence> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Recurring occurrence ${id} not found`);
    }
    return existing;
  }
}
