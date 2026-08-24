import { SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';

export interface PendingSyncPackageExporter {
  exportPending(): Promise<SyncPackageWithoutAuth>;
}

export class ExportSyncPackage {
  constructor(private readonly exporter: PendingSyncPackageExporter) {}

  execute(): Promise<SyncPackageWithoutAuth> {
    return this.exporter.exportPending();
  }
}
