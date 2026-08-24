import {
  ChecksumCalculator,
  SyncPackageSerializer as SyncPackageSerializerPort,
} from '@/core/application/ports/sync-package-serializer';
import { SyncPackage } from '@/core/domain/sync/sync-package';
import { canonicalizeUuid, isUuid } from '@/core/domain/sync/sync-operation';

export class StableSyncPackageSerializer implements SyncPackageSerializerPort {
  constructor(private readonly checksumCalculator: ChecksumCalculator = new Fnv1aChecksumCalculator()) {}

  serialize(pkg: SyncPackage): string {
    return stableJson(canonicalizePackageIdentifiers(pkg));
  }

  checksum(pkg: Omit<SyncPackage, 'checksum'> | SyncPackage): string {
    const unsignedPackage: Record<string, unknown> = { ...canonicalizePackageIdentifiers(pkg) };
    delete unsignedPackage.checksum;

    return this.checksumCalculator.calculate(stableJson(unsignedPackage));
  }

  withChecksum(pkg: Omit<SyncPackage, 'checksum'>): SyncPackage {
    return { ...pkg, checksum: this.checksum(pkg) };
  }

  verify(pkg: SyncPackage): boolean {
    return pkg.checksum === this.checksum(pkg);
  }
}

function canonicalizePackageIdentifiers<T extends Omit<SyncPackage, 'checksum'> | SyncPackage>(pkg: T): T {
  return {
    ...pkg,
    sourceDeviceId: canonicalizeIdentifier(pkg.sourceDeviceId),
    changes: pkg.changes.map((change) => ({
      ...change,
      operationId: canonicalizeIdentifier(change.operationId),
      entityId: canonicalizeIdentifier(change.entityId),
      originDeviceId: canonicalizeIdentifier(change.originDeviceId),
    })),
  } as T;
}

function canonicalizeIdentifier(value: string): string {
  return isUuid(value) ? canonicalizeUuid(value) : value;
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
