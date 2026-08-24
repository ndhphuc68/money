import { SyncPackage } from '@/core/domain/sync/sync-package';

export interface PendingSyncPackageExporter {
  exportPending(): Promise<SyncPackage>;
}

export class ExportSyncPackage {
  constructor(private readonly exporter: PendingSyncPackageExporter) {}

  execute(): Promise<SyncPackage> {
    return this.exporter.exportPending();
  }
}
