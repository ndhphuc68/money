import { eq } from 'drizzle-orm';

import { Repository, ChangeLogRepository as ChangeLogRepositoryPort } from '@/core/application/ports/repository';
import { SyncPackageSerializer } from '@/core/application/ports/sync-package-serializer';
import { ImportSummary } from '@/core/application/ports/sync-transport';
import { canonicalizeUuid, isIsoTimestamp, isUuid, parseSyncOperation, SyncOperation } from '@/core/domain/sync/sync-operation';
import { parseSyncPackageWithoutAuth, SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { toChangeLogValues } from '@/data/local/repositories/change-log-repository';
import { changeLog, exampleRecords } from '@/data/local/schema';
import { ConflictResolver, LastWriteWinsConflictResolver } from '@/data/sync/conflict-resolution/last-write-wins';

export type SyncEngineOptions = {
  database: LocalDatabaseClient;
  records: Repository;
  changes: ChangeLogRepositoryPort;
  serializer: SyncPackageSerializer;
  appVersion: string;
  schemaVersion: number;
  sourceDeviceId: string;
  now: () => string;
  conflictResolver?: ConflictResolver;
};

export class SyncEngine {
  private readonly conflictResolver: ConflictResolver;

  constructor(private readonly options: SyncEngineOptions) {
    this.conflictResolver = options.conflictResolver ?? new LastWriteWinsConflictResolver();
  }

  async exportPending(): Promise<SyncPackageWithoutAuth> {
    const changes = await this.options.changes.listPending();
    const sortedChanges = [...changes].sort(compareOperations);

    return this.options.serializer.withChecksum({
      format: 'app-sync',
      formatVersion: 2,
      appVersion: this.options.appVersion,
      schemaVersion: this.options.schemaVersion,
      sourceDeviceId: canonicalizeUuid(this.options.sourceDeviceId),
      exportedAt: this.options.now(),
      changes: sortedChanges,
    });
  }

  async exportChanges(): Promise<SyncPackageWithoutAuth> {
    return this.exportPending();
  }

  async import(pkg: SyncPackageWithoutAuth): Promise<ImportSummary> {
    let validatedPackage: SyncPackageWithoutAuth;
    let incomingRecords: SyncableRecord[];

    try {
      validatedPackage = parseSyncPackageWithoutAuth(pkg);
      if (!this.options.serializer.verify(validatedPackage)) {
        throw new Error('Sync package checksum is invalid');
      }
      incomingRecords = validateIncomingRecords(validatedPackage.changes);
    } catch {
      return rejectedSummary(pkg);
    }

    return this.options.database.db.transaction((transaction) => {
      const summary: ImportSummary = { applied: 0, skipped: 0, conflicted: 0, rejected: 0 };

      for (const [index, operation] of validatedPackage.changes.entries()) {
        const imported = transaction
          .select({ operationId: changeLog.operationId })
          .from(changeLog)
          .where(eq(changeLog.operationId, operation.operationId))
          .get();

        if (imported !== undefined) {
          summary.skipped += 1;
          continue;
        }

        const incoming = incomingRecords[index];
        const local = transaction
          .select()
          .from(exampleRecords)
          .where(eq(exampleRecords.id, incoming.id))
          .get();
        const resolution = local === undefined ? { winner: 'incoming' as const, record: incoming } : this.conflictResolver.resolve(local, incoming);

        if (resolution.winner === 'incoming') {
          transaction
            .insert(exampleRecords)
            .values(incoming)
            .onConflictDoUpdate({
              target: exampleRecords.id,
              set: toUpdatedRecordValues(incoming),
            })
            .run();
          summary.applied += 1;
        } else {
          summary.conflicted += 1;
        }

        transaction
          .insert(changeLog)
          .values({ ...toChangeLogValues(operation), syncedAt: validatedPackage.exportedAt })
          .run();
      }

      return summary;
    });
  }

  async importChanges(pkg: SyncPackageWithoutAuth): Promise<ImportSummary> {
    return this.import(pkg);
  }
}

function validateIncomingRecords(changes: SyncOperation[]): SyncableRecord[] {
  const operationIds = new Set<string>();

  return changes.map((operation) => {
    const canonicalOperation = parseSyncOperation(operation);
    if (operation.entityType !== 'example-record') {
      throw new Error('Unsupported sync entity type');
    }
    if (operationIds.has(operation.operationId)) {
      throw new Error('Sync package contains duplicate operation IDs');
    }
    operationIds.add(operation.operationId);

    const record = parseSyncableRecord(operation.payload);
    if (
      record.id !== canonicalOperation.entityId ||
      record.originDeviceId !== canonicalOperation.originDeviceId ||
      record.revision !== canonicalOperation.revision ||
      (canonicalOperation.operation === 'delete' && record.deletedAt === null) ||
      (canonicalOperation.operation !== 'delete' && record.deletedAt !== null)
    ) {
      throw new Error('Sync operation does not match its record payload');
    }

    return record;
  });
}

function parseSyncableRecord(value: unknown): SyncableRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Sync operation payload must be a syncable record');
  }

  const record = value as Record<string, unknown>;
  if (
    !isUuid(record.id) ||
    !isUuid(record.originDeviceId) ||
    !isIsoTimestamp(record.createdAt) ||
    !isIsoTimestamp(record.updatedAt) ||
    (record.deletedAt !== null && !isIsoTimestamp(record.deletedAt)) ||
    typeof record.revision !== 'number' ||
    !Number.isInteger(record.revision) ||
    record.revision < 0
  ) {
    throw new Error('Sync operation payload contains an invalid syncable record');
  }

  return {
    ...record,
    id: canonicalizeUuid(record.id),
    originDeviceId: canonicalizeUuid(record.originDeviceId),
  } as SyncableRecord;
}

function compareOperations(left: SyncOperation, right: SyncOperation): number {
  if (left.createdAt !== right.createdAt) {
    return left.createdAt > right.createdAt ? 1 : -1;
  }

  return left.operationId === right.operationId ? 0 : left.operationId > right.operationId ? 1 : -1;
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

function rejectedSummary(value: unknown): ImportSummary {
  const rejected =
    typeof value === 'object' && value !== null && Array.isArray((value as { changes?: unknown }).changes)
      ? (value as { changes: unknown[] }).changes.length
      : 1;

  return { applied: 0, skipped: 0, conflicted: 0, rejected };
}
