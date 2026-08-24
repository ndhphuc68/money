import { ImportSummary } from '@/core/application/ports/sync-transport';
import { SyncPackage } from '@/core/domain/sync/sync-package';

export interface SyncPackageImporter {
  import(pkg: SyncPackage): Promise<ImportSummary>;
}

export class ImportSyncPackage {
  constructor(private readonly importer: SyncPackageImporter) {}

  execute(pkg: SyncPackage): Promise<ImportSummary> {
    return this.importer.import(pkg);
  }
}
