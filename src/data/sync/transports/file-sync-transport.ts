import { SyncPackageAuthenticationProvider } from '@/core/application/ports/sync-package-authentication';
import { SyncPackageSerializer } from '@/core/application/ports/sync-package-serializer';
import { ImportSummary, SyncTransport } from '@/core/application/ports/sync-transport';
import { SyncPackage, SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';

export type SyncPackageFilePort = {
  write(pkg: SyncPackage): Promise<string>;
  read(uri: string): Promise<SyncPackage>;
};

export type SyncPackageEngine = {
  exportChanges(): Promise<SyncPackageWithoutAuth>;
  importChanges(pkg: SyncPackageWithoutAuth): Promise<ImportSummary>;
};

export class FileSyncTransport implements SyncTransport {
  constructor(
    private readonly syncEngine: SyncPackageEngine,
    private readonly packageFile: SyncPackageFilePort,
    private readonly serializer: SyncPackageSerializer,
    private readonly authenticationProvider: SyncPackageAuthenticationProvider,
  ) {}

  async exportChanges(): Promise<SyncPackage> {
    const pkg = await this.syncEngine.exportChanges();
    return {
      ...pkg,
      authTag: this.authenticationProvider.authenticate(this.serializer.authenticationInput(pkg)),
    };
  }

  importChanges(pkg: SyncPackage): Promise<ImportSummary> {
    if (
      !this.authenticationProvider.verify(this.serializer.authenticationInput(pkg), pkg.authTag)
    ) {
      throw new Error('Sync package authentication failed');
    }

    const { authTag: _authTag, ...unsignedPackage } = pkg;
    return this.syncEngine.importChanges(unsignedPackage);
  }

  async exportToFile(): Promise<string> {
    return this.packageFile.write(await this.exportChanges());
  }

  async importFromFile(uri: string): Promise<ImportSummary> {
    return this.importChanges(await this.packageFile.read(uri));
  }
}
