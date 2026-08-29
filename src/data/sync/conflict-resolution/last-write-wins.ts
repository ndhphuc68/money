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
    const deviceOrder = compareDeviceIds(incoming.originDeviceId, local.originDeviceId);
    const contentOrder = compareCanonicalContent(incoming, local);

    if (
      timestampOrder > 0 ||
      (timestampOrder === 0 && (deviceOrder > 0 || (deviceOrder === 0 && contentOrder > 0)))
    ) {
      return { winner: 'incoming', record: incoming };
    }

    return { winner: 'local', record: local };
  }
}

function compareCanonicalContent(left: SyncableRecord, right: SyncableRecord): number {
  const leftContent = stableJson({
    ...left,
    id: left.id.toLowerCase(),
    originDeviceId: left.originDeviceId.toLowerCase(),
  });
  const rightContent = stableJson({
    ...right,
    id: right.id.toLowerCase(),
    originDeviceId: right.originDeviceId.toLowerCase(),
  });

  return leftContent === rightContent ? 0 : leftContent > rightContent ? 1 : -1;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left > right ? 1 : -1,
  );
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableJson(entryValue)}`).join(',')}}`;
}

function compareDeviceIds(left: string, right: string): number {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();

  return normalizedLeft === normalizedRight ? 0 : normalizedLeft > normalizedRight ? 1 : -1;
}
