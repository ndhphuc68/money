import { eq, sql } from 'drizzle-orm';

import { openTestLocalDatabase } from '@/data/local/db/client';
import { accounts } from '@/data/local/schema/accounts';
import { categories } from '@/data/local/schema/categories';
import { transactions } from '@/data/local/schema/transactions';
import { profileSettings } from '@/data/local/schema/profile-settings';

const deviceId = '550e8400-e29b-41d4-a716-446655440010';

function syncFields(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: deviceId,
    ...overrides,
  };
}

describe('finance database schema', () => {
  let database: Awaited<ReturnType<typeof openTestLocalDatabase>>;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
  });

  afterEach(async () => {
    await database.close();
  });

  it('creates and queries an account row', async () => {
    const accountId = '550e8400-e29b-41d4-a716-446655440001';

    await database.db.insert(accounts).values({
      id: accountId,
      name: 'Cash wallet',
      type: 'cash',
      openingBalance: 100000,
      isArchived: false,
      ...syncFields(),
    });

    const rows = await database.db.select().from(accounts).where(eq(accounts.id, accountId));

    expect(rows).toEqual([
      {
        id: accountId,
        name: 'Cash wallet',
        type: 'cash',
        openingBalance: 100000,
        isArchived: false,
        ...syncFields(),
      },
    ]);
  });

  it('creates and queries a category row', async () => {
    const categoryId = '550e8400-e29b-41d4-a716-446655440002';

    await database.db.insert(categories).values({
      id: categoryId,
      name: 'Groceries',
      type: 'expense',
      isArchived: false,
      ...syncFields(),
    });

    const rows = await database.db.select().from(categories).where(eq(categories.id, categoryId));

    expect(rows).toEqual([
      {
        id: categoryId,
        name: 'Groceries',
        type: 'expense',
        isArchived: false,
        ...syncFields(),
      },
    ]);
  });

  it('creates an income transaction referencing an account and category', async () => {
    const accountId = '550e8400-e29b-41d4-a716-446655440003';
    const categoryId = '550e8400-e29b-41d4-a716-446655440004';
    const transactionId = '550e8400-e29b-41d4-a716-446655440005';

    await database.db.insert(accounts).values({
      id: accountId,
      name: 'Bank',
      type: 'bank',
      openingBalance: 0,
      isArchived: false,
      ...syncFields(),
    });
    await database.db.insert(categories).values({
      id: categoryId,
      name: 'Salary',
      type: 'income',
      isArchived: false,
      ...syncFields(),
    });

    await database.db.insert(transactions).values({
      id: transactionId,
      type: 'income',
      amount: 5000000,
      accountId,
      categoryId,
      destinationAccountId: null,
      transactionDate: '2026-08-20',
      name: 'August salary',
      note: null,
      ...syncFields(),
    });

    const rows = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    expect(rows).toEqual([
      {
        id: transactionId,
        type: 'income',
        amount: 5000000,
        accountId,
        categoryId,
        destinationAccountId: null,
        transactionDate: '2026-08-20',
        name: 'August salary',
        note: null,
        ...syncFields(),
      },
    ]);
  });

  it('creates a transfer transaction referencing source and destination accounts', async () => {
    const accountId = '550e8400-e29b-41d4-a716-446655440006';
    const destinationAccountId = '550e8400-e29b-41d4-a716-446655440007';
    const transactionId = '550e8400-e29b-41d4-a716-446655440008';

    await database.db.insert(accounts).values([
      {
        id: accountId,
        name: 'Bank',
        type: 'bank',
        openingBalance: 0,
        isArchived: false,
        ...syncFields(),
      },
      {
        id: destinationAccountId,
        name: 'Savings',
        type: 'bank',
        openingBalance: 0,
        isArchived: false,
        ...syncFields(),
      },
    ]);

    await database.db.insert(transactions).values({
      id: transactionId,
      type: 'transfer',
      amount: 200000,
      accountId,
      categoryId: null,
      destinationAccountId,
      transactionDate: '2026-08-21',
      name: 'Move to savings',
      note: 'Monthly transfer',
      ...syncFields(),
    });

    const rows = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    expect(rows).toEqual([
      {
        id: transactionId,
        type: 'transfer',
        amount: 200000,
        accountId,
        categoryId: null,
        destinationAccountId,
        transactionDate: '2026-08-21',
        name: 'Move to savings',
        note: 'Monthly transfer',
        ...syncFields(),
      },
    ]);
  });

  it('supports filtering transactions by account, date, type and category', async () => {
    const accountId = '550e8400-e29b-41d4-a716-446655440009';
    const categoryId = '550e8400-e29b-41d4-a716-446655440021';

    await database.db.insert(accounts).values({
      id: accountId,
      name: 'Bank',
      type: 'bank',
      openingBalance: 0,
      isArchived: false,
      ...syncFields(),
    });
    await database.db.insert(categories).values({
      id: categoryId,
      name: 'Dining',
      type: 'expense',
      isArchived: false,
      ...syncFields(),
    });

    await database.db.insert(transactions).values({
      id: '550e8400-e29b-41d4-a716-446655440022',
      type: 'expense',
      amount: 50000,
      accountId,
      categoryId,
      destinationAccountId: null,
      transactionDate: '2026-08-22',
      name: 'Lunch',
      note: null,
      ...syncFields(),
    });

    const byAccount = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId));
    const byDate = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionDate, '2026-08-22'));
    const byType = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.type, 'expense'));
    const byCategory = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.categoryId, categoryId));

    expect(byAccount).toHaveLength(1);
    expect(byDate).toHaveLength(1);
    expect(byType).toHaveLength(1);
    expect(byCategory).toHaveLength(1);
  });

  it('rejects an account row with a null name (not-null constraint)', async () => {
    await expect(
      database.db.insert(accounts).values({
        id: '550e8400-e29b-41d4-a716-446655440030',
        name: null as unknown as string,
        type: 'cash',
        openingBalance: 0,
        isArchived: false,
        ...syncFields(),
      }),
    ).rejects.toThrow();
  });

  it('rejects a category row with a null type (not-null constraint)', async () => {
    await expect(
      database.db.insert(categories).values({
        id: '550e8400-e29b-41d4-a716-446655440031',
        name: 'Untyped',
        type: null as unknown as 'income',
        isArchived: false,
        ...syncFields(),
      }),
    ).rejects.toThrow();
  });

  it('rejects a transaction row with an invalid type enum value (CHECK constraint)', async () => {
    const accountId = '550e8400-e29b-41d4-a716-446655440032';
    await database.db.insert(accounts).values({
      id: accountId,
      name: 'Bank',
      type: 'bank',
      openingBalance: 0,
      isArchived: false,
      ...syncFields(),
    });

    await expect(
      database.db.insert(transactions).values({
        id: '550e8400-e29b-41d4-a716-446655440033',
        type: 'not-a-real-type' as unknown as 'expense',
        amount: 1000,
        accountId,
        categoryId: null,
        destinationAccountId: null,
        transactionDate: '2026-08-23',
        name: 'Invalid type',
        note: null,
        ...syncFields(),
      }),
    ).rejects.toThrow();
  });

  it('rejects a transaction row with a null amount (not-null constraint)', async () => {
    const accountId = '550e8400-e29b-41d4-a716-446655440034';
    await database.db.insert(accounts).values({
      id: accountId,
      name: 'Bank',
      type: 'bank',
      openingBalance: 0,
      isArchived: false,
      ...syncFields(),
    });

    await expect(
      database.db.insert(transactions).values({
        id: '550e8400-e29b-41d4-a716-446655440035',
        type: 'expense',
        amount: null as unknown as number,
        accountId,
        categoryId: null,
        destinationAccountId: null,
        transactionDate: '2026-08-23',
        name: 'Missing amount',
        note: null,
        ...syncFields(),
      }),
    ).rejects.toThrow();
  });

  it('enables foreign key enforcement explicitly on the connection opened by openTestLocalDatabase', async () => {
    const row = await database.db.get<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`);

    expect(row?.foreign_keys).toBe(1);
  });

  it('rejects a transaction row that references a non-existent account (foreign key)', async () => {
    await expect(
      database.db.insert(transactions).values({
        id: '550e8400-e29b-41d4-a716-446655440036',
        type: 'expense',
        amount: 1000,
        accountId: '550e8400-e29b-41d4-a716-446655440099',
        categoryId: null,
        destinationAccountId: null,
        transactionDate: '2026-08-23',
        name: 'Bad account ref',
        note: null,
        ...syncFields(),
      }),
    ).rejects.toThrow();
  });

  it('rejects a transaction row that references a non-existent category (foreign key)', async () => {
    const accountId = '550e8400-e29b-41d4-a716-446655440037';
    await database.db.insert(accounts).values({
      id: accountId,
      name: 'Bank',
      type: 'bank',
      openingBalance: 0,
      isArchived: false,
      ...syncFields(),
    });

    await expect(
      database.db.insert(transactions).values({
        id: '550e8400-e29b-41d4-a716-446655440038',
        type: 'expense',
        amount: 1000,
        accountId,
        categoryId: '550e8400-e29b-41d4-a716-446655440098',
        destinationAccountId: null,
        transactionDate: '2026-08-23',
        name: 'Bad category ref',
        note: null,
        ...syncFields(),
      }),
    ).rejects.toThrow();
  });

  it('rejects a profile settings row with a null display name (not-null constraint)', async () => {
    await expect(
      database.db.insert(profileSettings).values({
        id: 'local-invalid',
        displayName: null as unknown as string,
        amountsHidden: false,
        onboardingCompleted: false,
        updatedAt: '2026-08-24T10:00:00.000Z',
      }),
    ).rejects.toThrow();
  });

  it('creates, updates, and reads the single local profile settings row', async () => {
    await database.db.insert(profileSettings).values({
      id: 'local',
      displayName: 'Phuc',
      amountsHidden: false,
      onboardingCompleted: false,
      updatedAt: '2026-08-24T10:00:00.000Z',
    });

    await database.db
      .update(profileSettings)
      .set({ onboardingCompleted: true, updatedAt: '2026-08-24T11:00:00.000Z' })
      .where(eq(profileSettings.id, 'local'));

    const rows = await database.db.select().from(profileSettings);

    expect(rows).toEqual([
      {
        id: 'local',
        displayName: 'Phuc',
        amountsHidden: false,
        onboardingCompleted: true,
        updatedAt: '2026-08-24T11:00:00.000Z',
      },
    ]);
  });
});
