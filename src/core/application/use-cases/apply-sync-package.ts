import { ImportSummary } from '@/core/application/ports/sync-transport';
import { SyncPackage } from '@/core/domain/sync/sync-package';

export interface ApplySyncPackage {
  execute(pkg: SyncPackage): Promise<ImportSummary>;
}
