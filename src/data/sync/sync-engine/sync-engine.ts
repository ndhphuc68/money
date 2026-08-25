import { eq } from 'drizzle-orm';

import { ChangeLogRepository as ChangeLogRepositoryPort } from '@/core/application/ports/repository';
import { SyncPackageSerializer } from '@/core/application/ports/sync-package-serializer';
import { ImportSummary } from '@/core/application/ports/sync-transport';
import { canonicalizeUuid, parseSyncOperation, SyncOperation } from '@/core/domain/sync/sync-operation';
import { parseSyncPackageWithoutAuth, SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { toChangeLogValues } from '@/data/local/repositories/change-log-repository';
import { changeLog } from '@/data/local/schema';
import { ConflictResolver, LastWriteWinsConflictResolver } from '@/data/sync/conflict-resolution/last-write-wins';

import { defaultSyncEntityAdapters, SyncEntityAdapter } from './entity-adapters';

export type SyncEngineOptions = {
  database: LocalDatabaseClient;
  /**
   * Maps a `SyncOperation.entityType` (e.g. `'account'`, `'transaction'`) to
   * the adapter that validates and persists its payload. Defaults to the
   * built-in adapters covering `example-record`, `account`, `category` and
   * `transaction`; pass a custom map only to override or extend that set
   * (e.g. in tests).
   */
  records?: Record<string, SyncEntityAdapter>;
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
  private readonly entityAdapters: Record<string, SyncEntityAdapter>;

  constructor(private readonly options: SyncEngineOptions) {
    this.conflictResolver = options.conflictResolver ?? new LastWriteWinsConflictResolver();
    this.entityAdapters = options.records ?? defaultSyncEntityAdapters;
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
      if (validatedPackage.schemaVersion !== this.options.schemaVersion) {
        throw new Error('Sync package schema version is incompatible');
      }
      incomingRecords = this.validateIncomingRecords(validatedPackage.changes);
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

        const adapter = this.entityAdapters[operation.entityType];
        const incoming = incomingRecords[index];
        const local = adapter.readLocal(transaction, incoming.id);
        const resolution = local === undefined ? { winner: 'incoming' as const, record: incoming } : this.conflictResolver.resolve(local, incoming);

        if (resolution.winner === 'incoming') {
          adapter.upsert(transaction, incoming);
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

  private validateIncomingRecords(changes: SyncOperation[]): SyncableRecord[] {
    const operationIds = new Set<string>();

    return changes.map((operation) => {
      const canonicalOperation = parseSyncOperation(operation);
      const adapter = this.entityAdapters[operation.entityType];
      if (adapter === undefined) {
        throw new Error(`Unsupported sync entity type: ${operation.entityType}`);
      }
      if (operationIds.has(operation.operationId)) {
        throw new Error('Sync package contains duplicate operation IDs');
      }
      operationIds.add(operation.operationId);

      const record = adapter.parsePayload(operation.payload);
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
}

function compareOperations(left: SyncOperation, right: SyncOperation): number {
  if (left.createdAt !== right.createdAt) {
    return left.createdAt > right.createdAt ? 1 : -1;
  }

  return left.operationId === right.operationId ? 0 : left.operationId > right.operationId ? 1 : -1;
}

function rejectedSummary(value: unknown): ImportSummary {
  const rejected =
    typeof value === 'object' && value !== null && Array.isArray((value as { changes?: unknown }).changes)
      ? (value as { changes: unknown[] }).changes.length
      : 1;

  return { applied: 0, skipped: 0, conflicted: 0, rejected };
}
