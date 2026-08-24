import { eq, isNull } from 'drizzle-orm';

import { Repository } from '@/core/application/ports/repository';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, exampleRecords } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import {
  assertValidSyncableRecordIdentifiers,
  assertValidSyncOperationIdentifiers,
} from './sync-identifier-validation';

export class ExampleRecordRepository implements Repository {
  constructor(private readonly database: LocalDatabaseClient) {}

  async save(record: SyncableRecord): Promise<void> {
    assertValidSyncableRecordIdentifiers(record);
    this.database.db
      .insert(exampleRecords)
      .values(record)
      .onConflictDoUpdate({
        target: exampleRecords.id,
        set: toUpdatedRecordValues(record),
      })
      .run();
  }

  async saveWithOperation(record: SyncableRecord, operation: SyncOperation): Promise<void> {
    assertValidSyncableRecordIdentifiers(record);
    assertValidSyncOperationIdentifiers(operation);
    this.database.db.transaction((transaction) => {
      transaction
        .insert(exampleRecords)
        .values(record)
        .onConflictDoUpdate({
          target: exampleRecords.id,
          set: toUpdatedRecordValues(record),
        })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(operation)).run();
    });
  }

  async findById(id: string): Promise<SyncableRecord | null> {
    const record = this.database.db
      .select()
      .from(exampleRecords)
      .where(eq(exampleRecords.id, id))
      .get();

    return record ?? null;
  }

  async listActive(): Promise<SyncableRecord[]> {
    return this.database.db
      .select()
      .from(exampleRecords)
      .where(isNull(exampleRecords.deletedAt))
      .all();
  }
}

function toUpdatedRecordValues(record: SyncableRecord) {
  return {
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
    revision: record.revision,
    originDeviceId: record.originDeviceId,
  };
}
