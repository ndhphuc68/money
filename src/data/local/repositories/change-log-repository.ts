import { asc, eq, isNull } from 'drizzle-orm';

import { ChangeLogRepository as ChangeLogPort } from '@/core/application/ports/repository';
import { canonicalizeUuid, parseSyncOperation, SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog } from '@/data/local/schema';

import { canonicalizeSyncOperationIdentifiers } from './sync-identifier-validation';

export class ChangeLogRepository implements ChangeLogPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async append(operation: SyncOperation): Promise<void> {
    this.database.db.insert(changeLog).values(toChangeLogValues(canonicalizeSyncOperationIdentifiers(operation))).run();
  }

  async hasOperation(operationId: string): Promise<boolean> {
    const operation = this.database.db
      .select({ operationId: changeLog.operationId })
      .from(changeLog)
      .where(eq(changeLog.operationId, canonicalizeUuid(operationId)))
      .get();

    return operation !== undefined;
  }

  async listPending(): Promise<SyncOperation[]> {
    const rows = this.database.db
      .select()
      .from(changeLog)
      .where(isNull(changeLog.syncedAt))
      .orderBy(asc(changeLog.createdAt))
      .all();

    return rows.map((row) => parseSyncOperation({
      operationId: row.operationId,
      entityType: row.entityType,
      entityId: row.entityId,
      operation: row.operation,
      payload: JSON.parse(row.payload),
      originDeviceId: row.originDeviceId,
      revision: row.revision,
      createdAt: row.createdAt,
    }));
  }
}

export function toChangeLogValues(operation: SyncOperation) {
  const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);

  return {
    operationId: canonicalOperation.operationId,
    entityType: canonicalOperation.entityType,
    entityId: canonicalOperation.entityId,
    operation: canonicalOperation.operation,
    payload: JSON.stringify(canonicalOperation.payload),
    originDeviceId: canonicalOperation.originDeviceId,
    revision: canonicalOperation.revision,
    createdAt: canonicalOperation.createdAt,
  };
}
