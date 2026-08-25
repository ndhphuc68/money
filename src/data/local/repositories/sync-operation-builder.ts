import { SyncOperation, SyncOperationKind } from '@/core/domain/sync/sync-operation';

export function buildSyncOperation(params: {
  entityType: string;
  entityId: string;
  operation: SyncOperationKind;
  payload: unknown;
  originDeviceId: string;
  revision: number;
  createdAt: string;
  operationId: string;
}): SyncOperation {
  return {
    operationId: params.operationId,
    entityType: params.entityType,
    entityId: params.entityId,
    operation: params.operation,
    payload: params.payload,
    originDeviceId: params.originDeviceId,
    revision: params.revision,
    createdAt: params.createdAt,
  };
}
