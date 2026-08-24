import { ImportSummary } from '@/core/application/ports/sync-transport';
import { SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';

export interface SyncPackageImporter {
  import(pkg: SyncPackageWithoutAuth): Promise<ImportSummary>;
}

export class ImportSyncPackage {
  constructor(private readonly importer: SyncPackageImporter) {}

  execute(pkg: SyncPackageWithoutAuth): Promise<ImportSummary> {
    return this.importer.import(pkg);
  }
}
