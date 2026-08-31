// tests/data/local/recurring-schema.test.ts
import { openTestLocalDatabase, LocalDatabaseClient } from '@/data/local/db/client';
import { accounts, categories, recurringOccurrences, recurringSchedules, transactions } from '@/data/local/schema';

const deviceId = '550e8400-e29b-41d4-a716-446655440020';
const now = '2026-08-27T09:00:00.000Z';

describe('recurring schema', () => {
  let database: LocalDatabaseClient;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    database.db
      .insert(accounts)
      .values({
        id: 'account-main',
        name: 'Ví chính',
        type: 'cash',
        openingBalance: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();
    database.db
      .insert(categories)
      .values({
        id: 'category-bills',
        name: 'Hóa đơn',
        type: 'expense',
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();
    database.db
      .insert(transactions)
      .values({
        id: 'transaction-first',
        type: 'expense',
        amount: 179000,
        accountId: 'account-main',
        destinationAccountId: null,
        categoryId: 'category-bills',
        transactionDate: '2026-08-27',
        name: 'YouTube Premium',
        note: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();
  });

  afterEach(async () => {
    await database.close();
  });

  it('inserts a recurring schedule referencing an account, category and its first transaction', () => {
    database.db
      .insert(recurringSchedules)
      .values({
        id: 'schedule-youtube',
        displayName: 'YouTube Premium',
        type: 'expense',
        accountId: 'account-main',
        categoryId: 'category-bills',
        amount: 179000,
        frequency: 'monthly',
        anchorDay: 27,
        startDate: '2026-08-27',
        endDate: null,
        occurrenceLimit: null,
        remindDaysBefore: 1,
        status: 'active',
        firstTransactionId: 'transaction-first',
        note: null,
        generatedCount: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();

    const row = database.db.select().from(recurringSchedules).get();
    expect(row).toMatchObject({ id: 'schedule-youtube', frequency: 'monthly', status: 'active' });
  });

  it('inserts a recurring occurrence referencing its schedule', () => {
    database.db
      .insert(recurringSchedules)
      .values({
        id: 'schedule-youtube',
        displayName: 'YouTube Premium',
        type: 'expense',
        accountId: 'account-main',
        categoryId: 'category-bills',
        amount: 179000,
        frequency: 'monthly',
        anchorDay: 27,
        startDate: '2026-08-27',
        endDate: null,
        occurrenceLimit: null,
        remindDaysBefore: 1,
        status: 'active',
        firstTransactionId: 'transaction-first',
        note: null,
        generatedCount: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();

    database.db
      .insert(recurringOccurrences)
      .values({
        id: 'occurrence-1',
        scheduleId: 'schedule-youtube',
        scheduledDate: '2026-09-27',
        amount: 179000,
        accountId: 'account-main',
        categoryId: 'category-bills',
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
      })
      .run();

    const row = database.db.select().from(recurringOccurrences).get();
    expect(row).toMatchObject({ id: 'occurrence-1', scheduleId: 'schedule-youtube', status: 'pending' });
  });
});
