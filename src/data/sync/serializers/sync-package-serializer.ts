import {
  ChecksumCalculator,
  SyncPackageSerializer as SyncPackageSerializerPort,
} from '@/core/application/ports/sync-package-serializer';
import {
  parseSyncPackage,
  parseSyncPackageContent,
  parseSyncPackageWithoutAuth,
  SyncPackage,
  SyncPackageContent,
  SyncPackageWithoutAuth,
} from '@/core/domain/sync/sync-package';

export class StableSyncPackageSerializer implements SyncPackageSerializerPort {
  constructor(
    private readonly checksumCalculator: ChecksumCalculator = new Fnv1aChecksumCalculator(),
  ) {}

  serialize(pkg: SyncPackageWithoutAuth | SyncPackage): string {
    return stableJson(hasAuthTag(pkg) ? parseSyncPackage(pkg) : parseSyncPackageWithoutAuth(pkg));
  }

  checksum(pkg: SyncPackageContent | SyncPackageWithoutAuth | SyncPackage): string {
    return this.checksumCalculator.calculate(stableJson(parseSyncPackageContent(pkg)));
  }

  authenticationInput(pkg: SyncPackageWithoutAuth | SyncPackage): string {
    return stableJson(parseSyncPackageWithoutAuth(pkg));
  }

  withChecksum(pkg: SyncPackageContent): SyncPackageWithoutAuth {
    const content = parseSyncPackageContent(pkg);
    return { ...content, checksum: this.checksum(content) };
  }

  verify(pkg: SyncPackageWithoutAuth | SyncPackage): boolean {
    const validatedPackage = parseSyncPackageWithoutAuth(pkg);
    return validatedPackage.checksum === this.checksum(validatedPackage);
  }
}

function hasAuthTag(pkg: SyncPackageWithoutAuth | SyncPackage): pkg is SyncPackage {
  return Object.prototype.hasOwnProperty.call(pkg, 'authTag');
}

export class Fnv1aChecksumCalculator implements ChecksumCalculator {
  calculate(content: string): string {
    let hash = 0x811c9dc5;

    for (let index = 0; index < content.length; index += 1) {
      hash ^= content.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }

    return `fnv1a-32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }
}

function stableJson(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Sync package values must be finite numbers');
    }

    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => (leftKey > rightKey ? 1 : leftKey < rightKey ? -1 : 0));

    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableJson(entryValue)}`).join(',')}}`;
  }

  throw new Error('Sync package values must be JSON serializable');
}
