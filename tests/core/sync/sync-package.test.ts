import { parseSyncPackage, SyncPackage } from '@/core/domain/sync/sync-package';
import { SyncOperation } from '@/core/domain/sync/sync-operation';

const change: SyncOperation = {
  operationId: '550e8400-e29b-41d4-a716-446655440000',
  entityType: 'note',
  entityId: '550e8400-e29b-41d4-a716-446655440001',
  operation: 'create',
  payload: { title: 'Offline note' },
  originDeviceId: '550e8400-e29b-41d4-a716-446655440002',
  revision: 1,
  createdAt: '2026-08-24T10:00:00.000Z',
};

const validPackage: SyncPackage = {
  format: 'app-sync',
  formatVersion: 2,
  appVersion: '1.0.0',
  schemaVersion: 1,
  sourceDeviceId: '550e8400-e29b-41d4-a716-446655440003',
  exportedAt: '2026-08-24T10:01:00.000Z',
  changes: [change],
  checksum: 'checksum',
  authTag: 'hmac-sha256:placeholder',
};

describe('SyncPackage', () => {
  it('round-trips a valid package and its changes through the validator', () => {
    expect(parseSyncPackage(validPackage)).toEqual(validPackage);
  });

  it.each([
    ['format', { format: 'wrong-format' }],
    ['formatVersion', { formatVersion: 1 }],
  ])('rejects a package with the wrong %s', (_, invalidFields) => {
    expect(() => parseSyncPackage({ ...validPackage, ...invalidFields })).toThrow();
  });
});
