import { SyncableRecord } from '@/core/domain/sync/syncable-record';

export type ConflictResolution = {
  winner: 'local' | 'incoming';
  record: SyncableRecord;
};

export interface ConflictResolver {
  resolve(local: SyncableRecord, incoming: SyncableRecord): ConflictResolution;
}

export class LastWriteWinsConflictResolver implements ConflictResolver {
  resolve(local: SyncableRecord, incoming: SyncableRecord): ConflictResolution {
    const timestampOrder = Date.parse(incoming.updatedAt) - Date.parse(local.updatedAt);

    if (timestampOrder > 0 || (timestampOrder === 0 && compareDeviceIds(incoming.originDeviceId, local.originDeviceId) > 0)) {
      return { winner: 'incoming', record: incoming };
    }

    return { winner: 'local', record: local };
  }
}

function compareDeviceIds(left: string, right: string): number {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();

  return normalizedLeft === normalizedRight ? 0 : normalizedLeft > normalizedRight ? 1 : -1;
}
