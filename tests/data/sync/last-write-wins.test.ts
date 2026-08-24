import { LastWriteWinsConflictResolver } from '@/data/sync/conflict-resolution/last-write-wins';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';

const deviceA = '550e8400-e29b-41d4-a716-446655440001';
const deviceB = '550e8400-e29b-41d4-a716-446655440002';

function record(overrides: Partial<SyncableRecord> = {}): SyncableRecord {
  return {
    id: '550e8400-e29b-41d4-a716-446655440003',
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: deviceA,
    ...overrides,
  };
}

describe('LastWriteWinsConflictResolver', () => {
  it('chooses the record with the newer updatedAt timestamp', () => {
    const resolver = new LastWriteWinsConflictResolver();
    const local = record({ updatedAt: '2026-08-24T10:01:00.000Z' });
    const incoming = record({ updatedAt: '2026-08-24T10:02:00.000Z', originDeviceId: deviceB });

    expect(resolver.resolve(local, incoming)).toEqual({ winner: 'incoming', record: incoming });
  });

  it('breaks equal timestamps by originDeviceId so both devices choose the same winner', () => {
    const resolver = new LastWriteWinsConflictResolver();
    const local = record({ originDeviceId: deviceA });
    const incoming = record({ originDeviceId: deviceB });

    expect(resolver.resolve(local, incoming)).toEqual({ winner: 'incoming', record: incoming });
  });

  it('allows a newer tombstone to replace a live record', () => {
    const resolver = new LastWriteWinsConflictResolver();
    const local = record({ updatedAt: '2026-08-24T10:01:00.000Z' });
    const incoming = record({
      updatedAt: '2026-08-24T10:02:00.000Z',
      deletedAt: '2026-08-24T10:02:00.000Z',
      originDeviceId: deviceB,
    });

    expect(resolver.resolve(local, incoming)).toEqual({ winner: 'incoming', record: incoming });
  });

  it('uses canonical record content to choose the same winner for tied live and tombstone records', () => {
    const resolver = new LastWriteWinsConflictResolver();
    const live = record();
    const tombstone = record({ deletedAt: '2026-08-24T10:00:00.000Z' });

    expect(resolver.resolve(live, tombstone)).toEqual({ winner: 'local', record: live });
    expect(resolver.resolve(tombstone, live)).toEqual({ winner: 'incoming', record: live });
  });
});
