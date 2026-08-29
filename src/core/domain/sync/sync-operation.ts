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

export function canonicalizeUuid(value: string): string {
  return value.toLowerCase();
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
  if (!isJsonValue(value.payload)) {
    throw new Error('Sync operation payload must be valid JSON data');
  }
  if (
    value.operation !== 'create' &&
    value.operation !== 'update' &&
    value.operation !== 'delete'
  ) {
    throw new Error('Sync operation kind is invalid');
  }
  if (
    typeof value.revision !== 'number' ||
    !Number.isInteger(value.revision) ||
    value.revision < 0
  ) {
    throw new Error('Sync operation revision must be a non-negative integer');
  }
  if (!isIsoTimestamp(value.createdAt)) {
    throw new Error('Sync operation createdAt must be an ISO timestamp');
  }

  return {
    ...value,
    operationId: canonicalizeUuid(value.operationId),
    entityId: canonicalizeUuid(value.entityId),
    originDeviceId: canonicalizeUuid(value.originDeviceId),
  } as SyncOperation;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isJsonValue(value: unknown): boolean {
  return isJsonValueWithin(value, new WeakSet<object>());
}

function isJsonValueWithin(value: unknown, ancestors: WeakSet<object>): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      return false;
    }
    ancestors.add(value);
    let isValid = true;
    for (let index = 0; index < value.length; index += 1) {
      if (
        !Object.prototype.hasOwnProperty.call(value, index) ||
        !isJsonValueWithin(value[index], ancestors)
      ) {
        isValid = false;
        break;
      }
    }
    ancestors.delete(value);
    return isValid;
  }
  if (
    !isRecord(value) ||
    !isPlainObject(value) ||
    Object.getOwnPropertySymbols(value).length > 0 ||
    ancestors.has(value)
  ) {
    return false;
  }

  ancestors.add(value);
  const isValid = Object.values(value).every((entry) => isJsonValueWithin(entry, ancestors));
  ancestors.delete(value);
  return isValid;
}

function isPlainObject(value: Record<string, unknown>): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
