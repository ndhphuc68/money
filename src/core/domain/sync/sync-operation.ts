export type SyncOperationKind = 'create' | 'update' | 'delete';

export type SyncOperation = {
  operationId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperationKind;
  payload: unknown;
  originDeviceId: string;
  revision: number;
  createdAt: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

export function parseSyncOperation(value: unknown): SyncOperation {
  if (!isRecord(value)) {
    throw new Error('Sync operation must be an object');
  }

  if (!isUuid(value.operationId) || !isUuid(value.entityId) || !isUuid(value.originDeviceId)) {
    throw new Error('Sync operation identifiers must be UUIDs');
  }
  if (typeof value.entityType !== 'string' || value.entityType.trim() === '') {
    throw new Error('Sync operation entityType must not be empty');
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'payload')) {
    throw new Error('Sync operation payload is required');
  }
  if (value.operation !== 'create' && value.operation !== 'update' && value.operation !== 'delete') {
    throw new Error('Sync operation kind is invalid');
  }
  if (typeof value.revision !== 'number' || !Number.isInteger(value.revision) || value.revision < 0) {
    throw new Error('Sync operation revision must be a non-negative integer');
  }
  if (!isIsoTimestamp(value.createdAt)) {
    throw new Error('Sync operation createdAt must be an ISO timestamp');
  }

  return value as SyncOperation;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
