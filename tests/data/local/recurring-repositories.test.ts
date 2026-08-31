// tests/data/local/recurring-repositories.test.ts
import { openTestLocalDatabase, LocalDatabaseClient } from '@/data/local/db/client';
import { RecurringScheduleRepository } from '@/data/local/repositories/recurring-schedule-repository';
import { RecurringOccurrenceRepository } from '@/data/local/repositories/recurring-occurrence-repository';
import { RecurringOccurrenceProcessingRepository } from '@/data/local/repositories/recurring-occurrence-processing-repository';
import { toRecurringOccurrenceRowValues, toRecurringScheduleRowValues } from '@/data/local/repositories/recurring-record-mappers';
import { accounts, categories, changeLog, recurringOccurrences, recurringSchedules, transactions } from '@/data/local/schema';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { eq } from 'drizzle-orm';

const deviceId = '550e8400-e29b-41d4-a716-446655440020';
const now = '2026-08-27T09:00:00.000Z';

const scheduleId = '550e8400-e29b-41d4-a716-446655440001';
const occurrenceId = '550e8400-e29b-41d4-a716-446655440002';
const accountId = '550e8400-e29b-41d4-a716-446655440003';
const categoryId = '550e8400-e29b-41d4-a716-446655440004';
const firstTransactionId = '550e8400-e29b-41d4-a716-446655440005';
const secondTransactionId = '550e8400-e29b-41d4-a716-446655440006';
const nextOccurrenceId = '550e8400-e29b-41d4-a716-446655440007';

const opId1 = '550e8400-e29b-41d4-a716-446655440010';
const opId2 = '550e8400-e29b-41d4-a716-446655440011';
const opId3 = '550e8400-e29b-41d4-a716-446655440012';
const opId4 = '550e8400-e29b-41d4-a716-446655440013';
const opId5 = '550e8400-e29b-41d4-a716-446655440014';
const opId6 = '550e8400-e29b-41d4-a716-446655440015';

function seedAccountCategoryAndTransaction(database: LocalDatabaseClient) {
  database.db
    .insert(accounts)
    .values({ id: accountId, name: 'Ví chính', type: 'cash', openingBalance: 0, isArchived: false, createdAt: now, updatedAt: now, deletedAt: null, revision: 1, originDeviceId: deviceId })
    .run();
  database.db
    .insert(categories)
    .values({ id: categoryId, name: 'Hóa đơn', type: 'expense', isArchived: false, createdAt: now, updatedAt: now, deletedAt: null, revision: 1, originDeviceId: deviceId })
    .run();
  database.db
    .insert(transactions)
    .values({ id: firstTransactionId, type: 'expense', amount: 179000, accountId, destinationAccountId: null, categoryId, transactionDate: '2026-08-27', name: 'YouTube Premium', note: null, createdAt: now, updatedAt: now, deletedAt: null, revision: 1, originDeviceId: deviceId })
    .run();
}

const baseSchedule: RecurringSchedule = {
  id: scheduleId,
  displayName: 'YouTube Premium',
  type: 'expense',
  accountId,
  categoryId,
  amount: 179000,
  frequency: 'monthly',
  anchorDay: 27,
  startDate: '2026-08-27',
  endDate: null,
  occurrenceLimit: null,
  remindDaysBefore: 1,
  status: 'active',
  firstTransactionId,
  note: null,
  generatedCount: 1,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  revision: 1,
  originDeviceId: deviceId,
};

const baseOccurrence: RecurringOccurrence = {
  id: occurrenceId,
  scheduleId,
  scheduledDate: '2026-09-27',
  amount: 179000,
  accountId,
  categoryId,
  displayName: 'YouTube Premium',
  note: null,
  status: 'pending',
  transactionId: null,
  notifiedAt: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  revision: 1,
  originDeviceId: deviceId,
};

describe('RecurringScheduleRepository', () => {
  let database: LocalDatabaseClient;
  let repository: RecurringScheduleRepository;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    seedAccountCategoryAndTransaction(database);
    repository = new RecurringScheduleRepository(database);
    database.db.insert(recurringSchedules).values(toRecurringScheduleRowValues(baseSchedule)).run();
  });

  afterEach(async () => {
    await database.close();
  });

  it('finds a schedule by id', async () => {
    await expect(repository.findById(scheduleId)).resolves.toMatchObject({ displayName: 'YouTube Premium', status: 'active' });
  });

  it('returns null for a missing schedule', async () => {
    await expect(repository.findById('550e8400-e29b-41d4-a716-446655440099')).resolves.toBeNull();
  });

  it('lists schedules, optionally filtered by status', async () => {
    await expect(repository.list()).resolves.toHaveLength(1);
    await expect(repository.list({ status: 'paused' })).resolves.toHaveLength(0);
    await expect(repository.list({ status: 'active' })).resolves.toHaveLength(1);
  });

  it('updates a schedule, bumps its revision and appends a change_log row', async () => {
    const updated = await repository.update(
      scheduleId,
      { status: 'paused' },
      { originDeviceId: deviceId, operationId: opId1, now: '2026-09-01T00:00:00.000Z' },
    );

    expect(updated).toMatchObject({ status: 'paused', revision: 2 });
    const logRows = database.db.select().from(changeLog).all();
    expect(logRows).toHaveLength(1);
    expect(logRows[0]).toMatchObject({ entityType: 'recurring_schedule', entityId: scheduleId, operation: 'update' });
  });
});

describe('RecurringOccurrenceRepository', () => {
  let database: LocalDatabaseClient;
  let repository: RecurringOccurrenceRepository;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    seedAccountCategoryAndTransaction(database);
    database.db.insert(recurringSchedules).values(toRecurringScheduleRowValues(baseSchedule)).run();
    database.db.insert(recurringOccurrences).values(toRecurringOccurrenceRowValues(baseOccurrence)).run();
    repository = new RecurringOccurrenceRepository(database);
  });

  afterEach(async () => {
    await database.close();
  });

  it('finds the single active (pending) occurrence for a schedule', async () => {
    await expect(repository.findActiveByScheduleId(scheduleId)).resolves.toMatchObject({ id: occurrenceId, status: 'pending' });
  });

  it('returns null when a schedule has no unresolved occurrence', async () => {
    await expect(repository.findActiveByScheduleId('550e8400-e29b-41d4-a716-446655440099')).resolves.toBeNull();
  });

  it('lists occurrences by status', async () => {
    await expect(repository.listByStatus(['pending'])).resolves.toHaveLength(1);
    await expect(repository.listByStatus(['confirmed', 'skipped'])).resolves.toHaveLength(0);
  });

  it('marks an occurrence notified, bumping revision and appending change_log', async () => {
    const updated = await repository.markNotified(occurrenceId, '2026-09-26T08:00:00.000Z', {
      originDeviceId: deviceId,
      operationId: opId2,
      now: '2026-09-26T08:00:00.000Z',
    });

    expect(updated).toMatchObject({ notifiedAt: '2026-09-26T08:00:00.000Z', revision: 2 });
    const logRows = database.db.select().from(changeLog).all();
    expect(logRows).toHaveLength(1);
    expect(logRows[0]).toMatchObject({ entityType: 'recurring_occurrence', operation: 'update' });
  });

  it('updates copied default fields, bumping revision and appending change_log', async () => {
    const updated = await repository.update(
      occurrenceId,
      { amount: 189000, displayName: 'YouTube Premium (mới)' },
      { originDeviceId: deviceId, operationId: opId3, now: '2026-09-01T00:00:00.000Z' },
    );

    expect(updated).toMatchObject({ amount: 189000, displayName: 'YouTube Premium (mới)', revision: 2 });
    const logRows = database.db.select().from(changeLog).all();
    expect(logRows).toHaveLength(1);
    expect(logRows[0]).toMatchObject({ entityType: 'recurring_occurrence', operation: 'update' });
  });
});

describe('RecurringOccurrenceProcessingRepository', () => {
  let database: LocalDatabaseClient;
  let processing: RecurringOccurrenceProcessingRepository;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    database.db
      .insert(accounts)
      .values({ id: accountId, name: 'Ví chính', type: 'cash', openingBalance: 0, isArchived: false, createdAt: now, updatedAt: now, deletedAt: null, revision: 1, originDeviceId: deviceId })
      .run();
    database.db
      .insert(categories)
      .values({ id: categoryId, name: 'Hóa đơn', type: 'expense', isArchived: false, createdAt: now, updatedAt: now, deletedAt: null, revision: 1, originDeviceId: deviceId })
      .run();
    processing = new RecurringOccurrenceProcessingRepository(database);
  });

  afterEach(async () => {
    await database.close();
  });

  it('createFirstPeriod inserts the transaction, schedule and first occurrence together with 3 change_log rows', async () => {
    const result = await processing.createFirstPeriod({
      originDeviceId: deviceId,
      now: '2026-08-27T09:00:00.000Z',
      transactionId: firstTransactionId,
      transactionOperationId: opId1,
      transaction: {
        type: 'expense',
        amount: 179000,
        accountId,
        categoryId,
        date: '2026-08-27',
        name: 'YouTube Premium',
        note: null,
      },
      scheduleId,
      scheduleOperationId: opId2,
      schedule: {
        displayName: 'YouTube Premium',
        accountId,
        categoryId,
        amount: 179000,
        frequency: 'monthly',
        anchorDay: 27,
        startDate: '2026-08-27',
      },
      occurrenceId,
      occurrenceOperationId: opId3,
    });

    expect(result.schedule).toMatchObject({ id: scheduleId, status: 'active', generatedCount: 1 });
    expect(result.occurrence).toMatchObject({ id: occurrenceId, scheduleId, status: 'pending', scheduledDate: '2026-09-27' });

    const logRows = database.db.select().from(changeLog).all();
    expect(logRows).toHaveLength(3);
    expect(logRows.map((row) => row.entityType).sort()).toEqual(['recurring_occurrence', 'recurring_schedule', 'transaction']);
  });

  async function createFirstPeriod() {
    return processing.createFirstPeriod({
      originDeviceId: deviceId,
      now: '2026-08-27T09:00:00.000Z',
      transactionId: firstTransactionId,
      transactionOperationId: opId1,
      transaction: { type: 'expense', amount: 179000, accountId, categoryId, date: '2026-08-27', name: 'YouTube Premium', note: null },
      scheduleId,
      scheduleOperationId: opId2,
      schedule: { displayName: 'YouTube Premium', accountId, categoryId, amount: 179000, frequency: 'monthly', anchorDay: 27, startDate: '2026-08-27' },
      occurrenceId,
      occurrenceOperationId: opId3,
    });
  }

  it('confirmOccurrence with this_only records the edited amount but leaves the schedule and next occurrence at the old default', async () => {
    await createFirstPeriod();

    const result = await processing.confirmOccurrence({
      occurrenceId,
      edits: { amount: 189000 },
      applyScope: 'this_only',
      originDeviceId: deviceId,
      now: '2026-09-27T08:00:00.000Z',
      transactionId: secondTransactionId,
      transactionOperationId: opId4,
      occurrenceOperationId: opId5,
      scheduleOperationId: opId6,
      nextOccurrenceId,
      nextOccurrenceOperationId: '550e8400-e29b-41d4-a716-446655440016',
    });

    expect(result.transactionId).toBe(secondTransactionId);
    expect(result.occurrence).toMatchObject({ status: 'confirmed', amount: 189000, transactionId: secondTransactionId });
    expect(result.schedule).toMatchObject({ amount: 179000, generatedCount: 2 });
    expect(result.nextOccurrence).toMatchObject({ id: nextOccurrenceId, amount: 179000, scheduledDate: '2026-10-27', status: 'pending' });

    const insertedTransaction = database.db.select().from(transactions).where(eq(transactions.id, secondTransactionId)).get();
    expect(insertedTransaction).toMatchObject({ amount: 189000, transactionDate: '2026-09-27' });
  });

  it('confirmOccurrence with this_and_future updates the schedule default and the next occurrence', async () => {
    await createFirstPeriod();

    const result = await processing.confirmOccurrence({
      occurrenceId,
      edits: { amount: 189000 },
      applyScope: 'this_and_future',
      originDeviceId: deviceId,
      now: '2026-09-27T08:00:00.000Z',
      transactionId: secondTransactionId,
      transactionOperationId: opId4,
      occurrenceOperationId: opId5,
      scheduleOperationId: opId6,
      nextOccurrenceId,
      nextOccurrenceOperationId: '550e8400-e29b-41d4-a716-446655440016',
    });

    expect(result.schedule).toMatchObject({ amount: 189000 });
    expect(result.nextOccurrence).toMatchObject({ amount: 189000 });
  });

  it('confirmOccurrence does not generate a next occurrence when the schedule is paused', async () => {
    await createFirstPeriod();
    await database.db
      .update(recurringSchedules)
      .set({ status: 'paused' })
      .where(eq(recurringSchedules.id, scheduleId))
      .run();

    const result = await processing.confirmOccurrence({
      occurrenceId,
      edits: {},
      applyScope: 'this_only',
      originDeviceId: deviceId,
      now: '2026-09-27T08:00:00.000Z',
      transactionId: secondTransactionId,
      transactionOperationId: opId4,
      occurrenceOperationId: opId5,
      scheduleOperationId: opId6,
      nextOccurrenceId: null,
      nextOccurrenceOperationId: null,
    });

    expect(result.nextOccurrence).toBeNull();
    expect(result.schedule).toMatchObject({ status: 'paused', generatedCount: 1 });
  });

  it('confirmOccurrence ends the schedule once occurrenceLimit is reached', async () => {
    await processing.createFirstPeriod({
      originDeviceId: deviceId,
      now: '2026-08-27T09:00:00.000Z',
      transactionId: firstTransactionId,
      transactionOperationId: opId1,
      transaction: { type: 'expense', amount: 179000, accountId, categoryId, date: '2026-08-27', name: 'YouTube Premium', note: null },
      scheduleId,
      scheduleOperationId: opId2,
      schedule: { displayName: 'YouTube Premium', accountId, categoryId, amount: 179000, frequency: 'monthly', anchorDay: 27, startDate: '2026-08-27', occurrenceLimit: 2 },
      occurrenceId,
      occurrenceOperationId: opId3,
    });

    const result = await processing.confirmOccurrence({
      occurrenceId,
      edits: {},
      applyScope: 'this_only',
      originDeviceId: deviceId,
      now: '2026-09-27T08:00:00.000Z',
      transactionId: secondTransactionId,
      transactionOperationId: opId4,
      occurrenceOperationId: opId5,
      scheduleOperationId: opId6,
      nextOccurrenceId: null,
      nextOccurrenceOperationId: null,
    });

    expect(result.schedule).toMatchObject({ status: 'ended', generatedCount: 1 });
    expect(result.nextOccurrence).toBeNull();
  });

  it('skipOccurrence marks the occurrence skipped without creating a transaction, and generates the next occurrence', async () => {
    await createFirstPeriod();

    const result = await processing.skipOccurrence({
      occurrenceId,
      originDeviceId: deviceId,
      now: '2026-09-27T08:00:00.000Z',
      occurrenceOperationId: opId5,
      scheduleOperationId: opId6,
      nextOccurrenceId,
      nextOccurrenceOperationId: '550e8400-e29b-41d4-a716-446655440016',
    });

    expect(result.occurrence).toMatchObject({ status: 'skipped', transactionId: null });
    expect(result.nextOccurrence).toMatchObject({ id: nextOccurrenceId, scheduledDate: '2026-10-27', status: 'pending' });
    expect(result.schedule).toMatchObject({ generatedCount: 2 });

    const transactionRows = database.db.select().from(transactions).all();
    expect(transactionRows).toHaveLength(1); // only period 1's transaction — skip never creates one
  });
});
