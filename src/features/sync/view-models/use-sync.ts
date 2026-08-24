import { useCallback, useState } from 'react';

import { ImportSyncPackage } from '@/core/application/use-cases/import-sync-package';
import { ExportSyncPackage } from '@/core/application/use-cases/export-sync-package';
import { SyncPackage } from '@/core/domain/sync/sync-package';

export type SyncDependencies = {
  exportSyncPackage: Pick<ExportSyncPackage, 'execute'>;
  importSyncPackage: Pick<ImportSyncPackage, 'execute'>;
  exportFile(pkg: SyncPackage): Promise<void>;
  importFile(): Promise<SyncPackage | null>;
};

export type SyncViewModel = {
  exportPackage(): Promise<void>;
  importPackage(): Promise<void>;
  isWorking: boolean;
  result: string | null;
  error: string | null;
  passphrase: string;
  setPassphrase(passphrase: string): void;
  isConfigured: boolean;
};

type UseSyncOptions = {
  dependencies: SyncDependencies | null;
  passphrase: string;
  setPassphrase(passphrase: string): void;
};

export function useSync({ dependencies, passphrase, setPassphrase }: UseSyncOptions): SyncViewModel {
  const [isWorking, setIsWorking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = dependencies !== null;

  const run = useCallback(async (operation: (configuredDependencies: SyncDependencies) => Promise<string>) => {
    if (dependencies === null) {
      setError('Set a shared passphrase before importing or exporting.');
      return;
    }

    setIsWorking(true);
    setResult(null);
    setError(null);

    try {
      setResult(await operation(dependencies));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sync action failed.');
    } finally {
      setIsWorking(false);
    }
  }, [dependencies]);

  const exportPackage = useCallback(async () => {
    await run(async (configuredDependencies) => {
      await configuredDependencies.exportFile(await configuredDependencies.exportSyncPackage.execute());
      return 'Sync package exported.';
    });
  }, [run]);

  const importPackage = useCallback(async () => {
    await run(async (configuredDependencies) => {
      const pkg = await configuredDependencies.importFile();
      if (pkg === null) {
        return 'Import canceled.';
      }

      const summary = await configuredDependencies.importSyncPackage.execute(pkg);
      return `Import complete: ${summary.applied} applied, ${summary.skipped} skipped, ${summary.conflicted} conflicted, ${summary.rejected} rejected.`;
    });
  }, [run]);

  return { exportPackage, importPackage, isWorking, result, error, passphrase, setPassphrase, isConfigured };
}
