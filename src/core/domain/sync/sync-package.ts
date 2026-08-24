import { isIsoTimestamp, isUuid, parseSyncOperation, SyncOperation } from './sync-operation';

export type SyncPackage = {
  format: 'app-sync';
  formatVersion: 1;
  appVersion: string;
  schemaVersion: number;
  sourceDeviceId: string;
  exportedAt: string;
  changes: SyncOperation[];
  checksum: string;
};

export function parseSyncPackage(value: unknown): SyncPackage {
  if (!isRecord(value)) {
    throw new Error('Sync package must be an object');
  }
  if (value.format !== 'app-sync') {
    throw new Error('Unsupported sync package format');
  }
  if (value.formatVersion !== 1) {
    throw new Error('Unsupported sync package version');
  }
  if (typeof value.appVersion !== 'string' || value.appVersion.trim() === '') {
    throw new Error('Sync package appVersion must not be empty');
  }
  if (typeof value.schemaVersion !== 'number' || !Number.isInteger(value.schemaVersion) || value.schemaVersion < 0) {
    throw new Error('Sync package schemaVersion must be a non-negative integer');
  }
  if (!isUuid(value.sourceDeviceId) || !isIsoTimestamp(value.exportedAt)) {
    throw new Error('Sync package sourceDeviceId or exportedAt is invalid');
  }
  if (!Array.isArray(value.changes)) {
    throw new Error('Sync package changes must be an array');
  }
  if (typeof value.checksum !== 'string' || value.checksum.trim() === '') {
    throw new Error('Sync package checksum must not be empty');
  }

  const changes = value.changes.map(parseSyncOperation);
  return { ...value, changes } as SyncPackage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
