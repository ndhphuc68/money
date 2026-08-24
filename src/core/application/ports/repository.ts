import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';

export interface Repository<T extends SyncableRecord = SyncableRecord> {
  save(record: T): Promise<void>;
  saveWithOperation(record: T, operation: SyncOperation): Promise<void>;
  findById(id: string): Promise<T | null>;
  listActive(): Promise<T[]>;
}

export interface ChangeLogRepository {
  append(operation: SyncOperation): Promise<void>;
  hasOperation(operationId: string): Promise<boolean>;
  listPending(): Promise<SyncOperation[]>;
}
