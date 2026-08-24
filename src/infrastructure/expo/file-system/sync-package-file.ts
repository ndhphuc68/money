import { File, Paths } from 'expo-file-system';

import { SyncPackageSerializer } from '@/core/application/ports/sync-package-serializer';
import { parseSyncPackage, SyncPackage } from '@/core/domain/sync/sync-package';
import { StableSyncPackageSerializer } from '@/data/sync/serializers/sync-package-serializer';

export class SyncPackageFile {
  constructor(
    private readonly serializer: SyncPackageSerializer = new StableSyncPackageSerializer(),
    private readonly filenameForPackage: (pkg: SyncPackage) => string = defaultFilename,
  ) {}

  async write(pkg: SyncPackage): Promise<string> {
    const validPackage = parseSyncPackage(pkg);
    const file = new File(Paths.document, this.filenameForPackage(validPackage));

    file.write(this.serializer.serialize(validPackage));

    return file.uri;
  }

  async read(uri: string): Promise<SyncPackage> {
    const contents = await new File(uri).text();
    let value: unknown;

    try {
      value = JSON.parse(contents);
    } catch {
      throw new Error('Sync package file is not valid JSON');
    }

    return parseSyncPackage(value);
  }
}

function defaultFilename(pkg: SyncPackage): string {
  return `sync-package-${pkg.exportedAt.replace(/[^0-9]/g, '')}.app-sync.json`;
}
