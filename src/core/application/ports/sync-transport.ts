import { SyncPackage } from '@/core/domain/sync/sync-package';

export type ImportSummary = {
  applied: number;
  skipped: number;
  conflicted: number;
  rejected: number;
};

export interface SyncTransport {
  exportChanges(): Promise<SyncPackage>;
  importChanges(pkg: SyncPackage): Promise<ImportSummary>;
}
