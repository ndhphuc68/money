import { StableSyncPackageSerializer } from '@/data/sync/serializers/sync-package-serializer';
import { SyncPackage } from '@/core/domain/sync/sync-package';

const serializer = new StableSyncPackageSerializer();

const pkg: SyncPackage = {
  format: 'app-sync',
  formatVersion: 1,
  appVersion: '1.0.0',
  schemaVersion: 1,
  sourceDeviceId: '550e8400-e29b-41d4-a716-446655440001',
  exportedAt: '2026-08-24T10:00:00.000Z',
  changes: [
    {
      operationId: '550e8400-e29b-41d4-a716-446655440002',
      entityType: 'example-record',
      entityId: '550e8400-e29b-41d4-a716-446655440003',
      operation: 'update',
      payload: { z: 1, a: { second: true, first: false } },
      originDeviceId: '550e8400-e29b-41d4-a716-446655440004',
      revision: 2,
      createdAt: '2026-08-24T10:00:00.000Z',
    },
  ],
  checksum: 'placeholder',
};

describe('StableSyncPackageSerializer', () => {
  it('serializes equivalent object keys identically and derives the same checksum', () => {
    const reordered: SyncPackage = {
      ...pkg,
      changes: [{ ...pkg.changes[0], payload: { a: { first: false, second: true }, z: 1 } }],
    };

    expect(serializer.serialize(pkg)).toBe(serializer.serialize(reordered));
    expect(serializer.checksum(pkg)).toBe(serializer.checksum(reordered));
  });

  it('creates and verifies a checksum from the canonical content instead of the checksum field', () => {
    const { checksum: _checksum, ...unsignedPackage } = pkg;
    const checksummed = serializer.withChecksum(unsignedPackage);

    expect(serializer.verify(checksummed)).toBe(true);
    expect(serializer.verify({ ...checksummed, appVersion: '2.0.0' })).toBe(false);
  });
});
