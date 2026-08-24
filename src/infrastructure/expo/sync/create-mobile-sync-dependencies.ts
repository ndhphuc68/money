import { ExportSyncPackage } from '@/core/application/use-cases/export-sync-package';
import { ImportSyncPackage } from '@/core/application/use-cases/import-sync-package';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { ChangeLogRepository } from '@/data/local/repositories/change-log-repository';
import { ExampleRecordRepository } from '@/data/local/repositories/example-record-repository';
import { HmacSha256AuthenticationProvider } from '@/data/sync/authentication/hmac-sha256-authentication-provider';
import { StableSyncPackageSerializer } from '@/data/sync/serializers/sync-package-serializer';
import { SyncEngine } from '@/data/sync/sync-engine/sync-engine';
import { FileSyncTransport } from '@/data/sync/transports/file-sync-transport';
import type { SyncDependencies } from '@/features/sync/view-models/use-sync';
import { DeviceIdentity } from '@/infrastructure/expo/device-identity/device-identity';
import { SyncPackageFile } from '@/infrastructure/expo/file-system/sync-package-file';
import { SystemFilePicker } from '@/infrastructure/expo/file-system/system-file-picker';
import { SystemShare } from '@/infrastructure/expo/sharing/system-share';

export function createMobileSyncDependencies(
  database: LocalDatabaseClient,
  passphrase: string,
): SyncDependencies {
  const serializer = new StableSyncPackageSerializer();
  const packageFile = new SyncPackageFile(serializer);
  const filePicker = new SystemFilePicker();
  const share = new SystemShare();
  const identity = new DeviceIdentity();
  const authenticationProvider = new HmacSha256AuthenticationProvider(passphrase);

  const createTransport = async () => new FileSyncTransport(
    new SyncEngine({
      database,
      records: new ExampleRecordRepository(database),
      changes: new ChangeLogRepository(database),
      serializer,
      appVersion: '1.0.0',
      schemaVersion: 1,
      sourceDeviceId: await identity.get(),
      now: () => new Date().toISOString(),
    }),
    packageFile,
    serializer,
    authenticationProvider,
  );

  return {
    exportSyncPackage: new ExportSyncPackage({
      exportPending: async () => (await createTransport()).exportChanges(),
    }),
    importSyncPackage: new ImportSyncPackage({
      import: async (pkg) => (await createTransport()).importChanges(pkg),
    }),
    exportFile: async (pkg) => {
      const uri = await packageFile.write(pkg);
      await share.shareFile(uri);
    },
    importFile: async () => {
      const uri = await filePicker.pickSyncPackage();
      return uri === null ? null : packageFile.read(uri);
    },
  };
}
