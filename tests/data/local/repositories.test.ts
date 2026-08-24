import { openTestLocalDatabase } from '@/data/local/db/client';
import { ChangeLogRepository } from '@/data/local/repositories/change-log-repository';
import { ExampleRecordRepository } from '@/data/local/repositories/example-record-repository';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';

const deviceId = '550e8400-e29b-41d4-a716-446655440010';
const recordId = '550e8400-e29b-41d4-a716-446655440011';

function record(overrides: Partial<SyncableRecord> = {}): SyncableRecord {
  return {
    id: recordId,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: deviceId,
    ...overrides,
  };
}

function operation(overrides: Partial<SyncOperation> = {}): SyncOperation {
  return {
    operationId: '550e8400-e29b-41d4-a716-446655440012',
    entityType: 'example-record',
    entityId: recordId,
    operation: 'create',
    payload: { label: 'First local record' },
    originDeviceId: deviceId,
    revision: 1,
    createdAt: '2026-08-24T10:00:00.000Z',
    ...overrides,
  };
}

describe('local repositories', () => {
  let database: Awaited<ReturnType<typeof openTestLocalDatabase>>;
  let changes: ChangeLogRepository;
  let records: ExampleRecordRepository;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    changes = new ChangeLogRepository(database);
    records = new ExampleRecordRepository(database);
  });

  afterEach(async () => {
    await database.close();
  });

  it('inserts and loads a syncable record by UUID', async () => {
    const saved = record();

    await records.save(saved);

    await expect(records.findById(saved.id)).resolves.toEqual(saved);
    await expect(records.listActive()).resolves.toEqual([saved]);
  });

  it('updates an existing record revision without creating a second record', async () => {
    await records.save(record());
    const revised = record({ revision: 2, updatedAt: '2026-08-24T10:05:00.000Z' });

    await records.save(revised);

    await expect(records.findById(revised.id)).resolves.toEqual(revised);
    await expect(records.listActive()).resolves.toEqual([revised]);
  });

  it('appends a pending change operation and reports its idempotency key', async () => {
    const pending = operation();

    await changes.append(pending);

    await expect(changes.hasOperation(pending.operationId)).resolves.toBe(true);
    await expect(changes.listPending()).resolves.toEqual([pending]);
  });

  it('preserves a tombstone while excluding it from active records', async () => {
    const tombstone = record({ deletedAt: '2026-08-24T10:10:00.000Z', revision: 2 });

    await records.save(tombstone);

    await expect(records.findById(tombstone.id)).resolves.toEqual(tombstone);
    await expect(records.listActive()).resolves.toEqual([]);
  });

  it('rejects a duplicate change operation id', async () => {
    const pending = operation();
    await changes.append(pending);

    await expect(changes.append(pending)).rejects.toThrow();
  });

  it('rolls back a record write when its duplicate change operation cannot be appended', async () => {
    const pending = operation();
    await changes.append(pending);
    const unsaved = record({ id: '550e8400-e29b-41d4-a716-446655440013' });

    await expect(records.saveWithOperation(unsaved, pending)).rejects.toThrow();
    await expect(records.findById(unsaved.id)).resolves.toBeNull();
  });
});
