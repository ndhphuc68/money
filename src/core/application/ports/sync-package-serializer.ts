import { SyncPackage } from '@/core/domain/sync/sync-package';

export interface ChecksumCalculator {
  calculate(content: string): string;
}

export interface SyncPackageSerializer {
  serialize(pkg: SyncPackage): string;
  checksum(pkg: Omit<SyncPackage, 'checksum'> | SyncPackage): string;
  withChecksum(pkg: Omit<SyncPackage, 'checksum'>): SyncPackage;
  verify(pkg: SyncPackage): boolean;
}
