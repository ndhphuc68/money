import { ImportSummary, SyncTransport } from '@/core/application/ports/sync-transport';
import { SyncPackage } from '@/core/domain/sync/sync-package';

export type SyncPackageFilePort = {
  write(pkg: SyncPackage): Promise<string>;
  read(uri: string): Promise<SyncPackage>;
};

export class FileSyncTransport implements SyncTransport {
  constructor(
    private readonly syncEngine: SyncTransport,
    private readonly packageFile: SyncPackageFilePort,
  ) {}

  exportChanges(): Promise<SyncPackage> {
    return this.syncEngine.exportChanges();
  }

  importChanges(pkg: SyncPackage): Promise<ImportSummary> {
    return this.syncEngine.importChanges(pkg);
  }

  async exportToFile(): Promise<string> {
    return this.packageFile.write(await this.syncEngine.exportChanges());
  }

  async importFromFile(uri: string): Promise<ImportSummary> {
    return this.syncEngine.importChanges(await this.packageFile.read(uri));
  }
}
