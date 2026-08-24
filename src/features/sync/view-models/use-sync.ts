import { useCallback, useState } from 'react';

import { ImportSyncPackage } from '@/core/application/use-cases/import-sync-package';
import { ExportSyncPackage } from '@/core/application/use-cases/export-sync-package';
import { SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';

export type SyncDependencies = {
  exportSyncPackage: Pick<ExportSyncPackage, 'execute'>;
  importSyncPackage: Pick<ImportSyncPackage, 'execute'>;
  exportFile(pkg: SyncPackageWithoutAuth): Promise<void>;
  importFile(): Promise<SyncPackageWithoutAuth | null>;
};

export type SyncViewModel = {
  exportPackage(): Promise<void>;
  importPackage(): Promise<void>;
  isWorking: boolean;
  result: string | null;
  error: string | null;
};

export function useSync(dependencies: SyncDependencies): SyncViewModel {
  const [isWorking, setIsWorking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (operation: () => Promise<string>) => {
    setIsWorking(true);
    setResult(null);
    setError(null);

    try {
      setResult(await operation());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sync action failed.');
    } finally {
      setIsWorking(false);
    }
  }, []);

  const exportPackage = useCallback(async () => {
    await run(async () => {
      await dependencies.exportFile(await dependencies.exportSyncPackage.execute());
      return 'Sync package exported.';
    });
  }, [dependencies, run]);

  const importPackage = useCallback(async () => {
    await run(async () => {
      const pkg = await dependencies.importFile();
      if (pkg === null) {
        return 'Import canceled.';
      }

      const summary = await dependencies.importSyncPackage.execute(pkg);
      return `Import complete: ${summary.applied} applied, ${summary.skipped} skipped, ${summary.conflicted} conflicted, ${summary.rejected} rejected.`;
    });
  }, [dependencies, run]);

  return { exportPackage, importPackage, isWorking, result, error };
}
