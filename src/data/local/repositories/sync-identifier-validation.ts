import { canonicalizeUuid, isUuid, SyncOperation } from '@/core/domain/sync/sync-operation';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';

export function assertValidSyncableRecordIdentifiers(record: SyncableRecord): void {
  assertUuid(record.id, 'Record id');
  assertUuid(record.originDeviceId, 'Record originDeviceId');
}

export function assertValidSyncOperationIdentifiers(operation: SyncOperation): void {
  assertUuid(operation.operationId, 'Operation operationId');
  assertUuid(operation.entityId, 'Operation entityId');
  assertUuid(operation.originDeviceId, 'Operation originDeviceId');
}

export function canonicalizeSyncableRecordIdentifiers(record: SyncableRecord): SyncableRecord {
  assertValidSyncableRecordIdentifiers(record);

  return {
    ...record,
    id: canonicalizeUuid(record.id),
    originDeviceId: canonicalizeUuid(record.originDeviceId),
  };
}

export function canonicalizeSyncOperationIdentifiers(operation: SyncOperation): SyncOperation {
  assertValidSyncOperationIdentifiers(operation);

  return {
    ...operation,
    operationId: canonicalizeUuid(operation.operationId),
    entityId: canonicalizeUuid(operation.entityId),
    originDeviceId: canonicalizeUuid(operation.originDeviceId),
  };
}

function assertUuid(value: string, label: string): void {
  if (!isUuid(value)) {
    throw new Error(`${label} must be a UUID`);
  }
}
