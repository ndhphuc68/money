import { ExportSyncPackage } from '@/core/application/use-cases/export-sync-package';
import { ImportSyncPackage } from '@/core/application/use-cases/import-sync-package';
import { ImportSummary } from '@/core/application/ports/sync-transport';
import { SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';

const pkg: SyncPackageWithoutAuth = {
  format: 'app-sync',
  formatVersion: 2,
  appVersion: '1.0.0',
  schemaVersion: 1,
  sourceDeviceId: '550e8400-e29b-41d4-a716-446655440001',
  exportedAt: '2026-08-24T10:00:00.000Z',
  changes: [],
  checksum: 'fnv1a-32:00000000',
};

describe('sync package use cases', () => {
  it('exports the pending package through the engine boundary', async () => {
    const useCase = new ExportSyncPackage({ exportPending: async () => pkg });

    await expect(useCase.execute()).resolves.toEqual(pkg);
  });

  it('imports a package through the engine boundary and returns its summary', async () => {
    const summary: ImportSummary = { applied: 1, skipped: 2, conflicted: 3, rejected: 4 };
    const useCase = new ImportSyncPackage({ import: async (incoming) => (incoming === pkg ? summary : Promise.reject(new Error())) });

    await expect(useCase.execute(pkg)).resolves.toEqual(summary);
  });
});
