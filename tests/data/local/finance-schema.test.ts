import { eq } from 'drizzle-orm';

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

    const rows = await database.db.select().from(transactions).where(eq(transactions.id, transactionId));

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

    const rows = await database.db.select().from(transactions).where(eq(transactions.id, transactionId));

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

    const byAccount = await database.db.select().from(transactions).where(eq(transactions.accountId, accountId));
    const byDate = await database.db.select().from(transactions).where(eq(transactions.transactionDate, '2026-08-22'));
    const byType = await database.db.select().from(transactions).where(eq(transactions.type, 'expense'));
    const byCategory = await database.db.select().from(transactions).where(eq(transactions.categoryId, categoryId));

    expect(byAccount).toHaveLength(1);
    expect(byDate).toHaveLength(1);
    expect(byType).toHaveLength(1);
    expect(byCategory).toHaveLength(1);
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
