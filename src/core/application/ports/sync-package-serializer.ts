import { SyncPackage, SyncPackageContent, SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';

export interface ChecksumCalculator {
  calculate(content: string): string;
}

export interface SyncPackageSerializer {
  serialize(pkg: SyncPackageWithoutAuth | SyncPackage): string;
  checksum(pkg: SyncPackageContent | SyncPackageWithoutAuth | SyncPackage): string;
  authenticationInput(pkg: SyncPackageWithoutAuth | SyncPackage): string;
  withChecksum(pkg: SyncPackageContent): SyncPackageWithoutAuth;
  verify(pkg: SyncPackageWithoutAuth | SyncPackage): boolean;
}
