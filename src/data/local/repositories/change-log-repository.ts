import { asc, eq, isNull } from 'drizzle-orm';

import { ChangeLogRepository as ChangeLogPort } from '@/core/application/ports/repository';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog } from '@/data/local/schema';

export class ChangeLogRepository implements ChangeLogPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async append(operation: SyncOperation): Promise<void> {
    this.database.db.insert(changeLog).values(toChangeLogValues(operation)).run();
  }

  async hasOperation(operationId: string): Promise<boolean> {
    const operation = this.database.db
      .select({ operationId: changeLog.operationId })
      .from(changeLog)
      .where(eq(changeLog.operationId, operationId))
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

    return rows.map((row) => ({
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
  return {
    operationId: operation.operationId,
    entityType: operation.entityType,
    entityId: operation.entityId,
    operation: operation.operation,
    payload: JSON.stringify(operation.payload),
    originDeviceId: operation.originDeviceId,
    revision: operation.revision,
    createdAt: operation.createdAt,
  };
}
