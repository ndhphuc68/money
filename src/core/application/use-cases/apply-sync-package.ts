import { ImportSummary } from '@/core/application/ports/sync-transport';
import { SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';

export interface ApplySyncPackage {
  execute(pkg: SyncPackageWithoutAuth): Promise<ImportSummary>;
}
