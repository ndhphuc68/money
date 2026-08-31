import { sql } from 'drizzle-orm';

import { SyncEngine } from '@/data/sync/sync-engine/sync-engine';
import { StableSyncPackageSerializer } from '@/data/sync/serializers/sync-package-serializer';
import { openTestLocalDatabase } from '@/data/local/db/client';
import { ChangeLogRepository } from '@/data/local/repositories/change-log-repository';
import { ExampleRecordRepository } from '@/data/local/repositories/example-record-repository';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';

const sourceDeviceId = '550e8400-e29b-41d4-a716-446655440001';
const localDeviceId = '550e8400-e29b-41d4-a716-446655440002';
const serializer = new StableSyncPackageSerializer();

function syncRecord(overrides: Partial<SyncableRecord> = {}): SyncableRecord {
  return {
    id: '550e8400-e29b-41d4-a716-446655440003',
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: sourceDeviceId,
    ...overrides,
  };
}

function operation(overrides: Partial<SyncOperation> = {}): SyncOperation {
  const payload = syncRecord(overrides.payload as Partial<SyncableRecord> | undefined);
  return {
    operationId: '550e8400-e29b-41d4-a716-446655440004',
    entityType: 'example-record',
    entityId: payload.id,
    operation: payload.deletedAt === null ? 'update' : 'delete',
    payload,
    originDeviceId: payload.originDeviceId,
    revision: payload.revision,
    createdAt: payload.updatedAt,
    ...overrides,
  };
}

function pkg(changes: SyncOperation[]): SyncPackageWithoutAuth {
  return serializer.withChecksum({
    format: 'app-sync',
    formatVersion: 2,
    appVersion: '1.0.0',
    schemaVersion: 1,
    sourceDeviceId,
    exportedAt: '2026-08-24T10:10:00.000Z',
    changes,
  });
}

function uppercaseIdentifiers(change: SyncOperation): SyncOperation {
  const payload = change.payload as SyncableRecord;

  return {
    ...change,
    operationId: change.operationId.toUpperCase(),
    entityId: change.entityId.toUpperCase(),
    originDeviceId: change.originDeviceId.toUpperCase(),
    payload: {
      ...payload,
      id: payload.id.toUpperCase(),
      originDeviceId: payload.originDeviceId.toUpperCase(),
    },
  };
}

describe('SyncEngine', () => {
  let database: Awaited<ReturnType<typeof openTestLocalDatabase>>;
  let records: ExampleRecordRepository;
  let changes: ChangeLogRepository;
  let engine: SyncEngine;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    records = new ExampleRecordRepository(database);
    changes = new ChangeLogRepository(database);
    engine = new SyncEngine({
      database,
      changes,
      serializer,
      appVersion: '1.0.0',
      schemaVersion: 1,
      sourceDeviceId: localDeviceId,
      now: () => '2026-08-24T10:10:00.000Z',
    });
  });

  afterEach(async () => {
    await database.close();
  });

  it('exports pending operations in a checksummed package with a deterministic change order', async () => {
    const later = operation({
      operationId: '550e8400-e29b-41d4-a716-446655440006',
      createdAt: '2026-08-24T10:02:00.000Z',
    });
    const earlier = operation({
      operationId: '550e8400-e29b-41d4-a716-446655440005',
      createdAt: '2026-08-24T10:01:00.000Z',
    });
    await changes.append(later);
    await changes.append(earlier);

    const exported = await engine.exportPending();

    expect(exported.changes.map((change) => change.operationId)).toEqual([
      '550e8400-e29b-41d4-a716-446655440005',
      '550e8400-e29b-41d4-a716-446655440006',
    ]);
    expect(serializer.verify(exported)).toBe(true);
  });

  it('validates every package change before changing records or the operation log', async () => {
    const incoming = operation();
    const malformed = operation({
      operationId: '550e8400-e29b-41d4-a716-446655440005',
      entityId: '550e8400-e29b-41d4-a716-446655440006',
      payload: {},
    });
    const invalid = pkg([incoming, malformed]);

    await expect(engine.import(invalid)).resolves.toEqual({
      applied: 0,
      skipped: 0,
      conflicted: 0,
      rejected: 2,
    });
    await expect(records.findById(incoming.entityId)).resolves.toBeNull();
    await expect(changes.hasOperation(incoming.operationId)).resolves.toBe(false);
  });

  it('rejects a valid checksummed package with a different schema version before changing records or the operation log', async () => {
    const incoming = operation();
    const mismatchedSchemaPackage = serializer.withChecksum({
      format: 'app-sync',
      formatVersion: 2,
      appVersion: '1.0.0',
      schemaVersion: 2,
      sourceDeviceId,
      exportedAt: '2026-08-24T10:10:00.000Z',
      changes: [incoming],
    });

    expect(serializer.verify(mismatchedSchemaPackage)).toBe(true);
    await expect(engine.import(mismatchedSchemaPackage)).resolves.toEqual({
      applied: 0,
      skipped: 0,
      conflicted: 0,
      rejected: 1,
    });
    await expect(records.findById(incoming.entityId)).resolves.toBeNull();
    await expect(changes.hasOperation(incoming.operationId)).resolves.toBe(false);
  });

  it('records an applied operation so the same package is skipped on reimport', async () => {
    const incoming = operation();
    const incomingPackage = pkg([incoming]);

    await expect(engine.import(incomingPackage)).resolves.toEqual({
      applied: 1,
      skipped: 0,
      conflicted: 0,
      rejected: 0,
    });
    await expect(engine.import(incomingPackage)).resolves.toEqual({
      applied: 0,
      skipped: 1,
      conflicted: 0,
      rejected: 0,
    });
    await expect(records.findById(incoming.entityId)).resolves.toEqual(incoming.payload);
    await expect(engine.exportPending()).resolves.toMatchObject({ changes: [] });
  });

  it('skips an operation reimported with different UUID casing', async () => {
    const lowerCaseOperation = operation();
    const uppercaseOperation = uppercaseIdentifiers(lowerCaseOperation);

    await expect(engine.import(pkg([uppercaseOperation]))).resolves.toEqual({
      applied: 1,
      skipped: 0,
      conflicted: 0,
      rejected: 0,
    });
    await expect(engine.import(pkg([lowerCaseOperation]))).resolves.toEqual({
      applied: 0,
      skipped: 1,
      conflicted: 0,
      rejected: 0,
    });
    await expect(records.findById(lowerCaseOperation.entityId)).resolves.toEqual(
      lowerCaseOperation.payload,
    );
  });

  it('uses originDeviceId to retain the deterministic winner when timestamps are tied', async () => {
    const local = syncRecord({ originDeviceId: localDeviceId });
    const incoming = operation({ payload: syncRecord({ originDeviceId: sourceDeviceId }) });
    await records.save(local);

    await expect(engine.import(pkg([incoming]))).resolves.toEqual({
      applied: 0,
      skipped: 0,
      conflicted: 1,
      rejected: 0,
    });
    await expect(records.findById(local.id)).resolves.toEqual(local);
  });

  it('persists a newer tombstone and excludes it from active records', async () => {
    const local = syncRecord({
      updatedAt: '2026-08-24T10:01:00.000Z',
      originDeviceId: localDeviceId,
    });
    const tombstone = syncRecord({
      updatedAt: '2026-08-24T10:02:00.000Z',
      deletedAt: '2026-08-24T10:02:00.000Z',
    });
    const incoming = operation({
      payload: tombstone,
      operation: 'delete',
      revision: tombstone.revision,
    });
    await records.save(local);

    await expect(engine.import(pkg([incoming]))).resolves.toEqual({
      applied: 1,
      skipped: 0,
      conflicted: 0,
      rejected: 0,
    });
    await expect(records.findById(tombstone.id)).resolves.toEqual(tombstone);
    await expect(records.listActive()).resolves.toEqual([]);
  });

  it('rolls back every accepted record when the imported operation log write fails', async () => {
    const first = operation({ operationId: '550e8400-e29b-41d4-a716-446655440007' });
    const secondRecord = syncRecord({ id: '550e8400-e29b-41d4-a716-446655440008' });
    const second = operation({
      operationId: '550e8400-e29b-41d4-a716-446655440009',
      entityId: secondRecord.id,
      payload: secondRecord,
    });
    database.db.run(
      sql.raw(`
      CREATE TRIGGER fail_imported_operation
      BEFORE INSERT ON change_log
      WHEN NEW.operation_id = '${second.operationId}'
      BEGIN SELECT RAISE(ABORT, 'forced import failure'); END;
    `),
    );

    await expect(engine.import(pkg([first, second]))).rejects.toThrow('forced import failure');
    await expect(records.findById(first.entityId)).resolves.toBeNull();
    await expect(records.findById(second.entityId)).resolves.toBeNull();
  });
});
