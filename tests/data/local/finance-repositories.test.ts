import { sql } from 'drizzle-orm';

import { ChangeLogRepository } from '@/data/local/repositories/change-log-repository';
import { AccountRepository } from '@/data/local/repositories/account-repository';
import { CategoryRepository } from '@/data/local/repositories/category-repository';
import { ProfileSettingsRepository } from '@/data/local/repositories/profile-settings-repository';
import { TransactionRepository } from '@/data/local/repositories/transaction-repository';
import { openTestLocalDatabase } from '@/data/local/db/client';
import { WriteContext } from '@/core/application/ports/finance-repositories';

const deviceId = '550e8400-e29b-41d4-a716-446655440010';

function id(suffix: string): string {
  return `550e8400-e29b-41d4-a716-4466554${suffix.padStart(5, '0')}`;
}

function ctx(overrides: Partial<WriteContext> = {}): WriteContext {
  return {
    originDeviceId: deviceId,
    operationId: id('90000'),
    now: '2026-08-24T10:00:00.000Z',
    ...overrides,
  };
}

describe('finance repositories', () => {
  let database: Awaited<ReturnType<typeof openTestLocalDatabase>>;
  let accounts: AccountRepository;
  let categories: CategoryRepository;
  let transactionsRepo: TransactionRepository;
  let profile: ProfileSettingsRepository;
  let changes: ChangeLogRepository;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    accounts = new AccountRepository(database);
    categories = new CategoryRepository(database);
    transactionsRepo = new TransactionRepository(database);
    profile = new ProfileSettingsRepository(database);
    changes = new ChangeLogRepository(database);
  });

  afterEach(async () => {
    await database.close();
  });

  describe('AccountRepository', () => {
    it('creates an account and appends a matching change operation', async () => {
      const account = await accounts.create({
        id: id('00001'),
        name: 'Cash wallet',
        type: 'cash',
        openingBalance: 100000,
        originDeviceId: deviceId,
        operationId: id('90001'),
        now: '2026-08-24T10:00:00.000Z',
      });

      expect(account).toMatchObject({
        name: 'Cash wallet',
        type: 'cash',
        isArchived: false,
        revision: 1,
      });
      await expect(accounts.findById(account.id)).resolves.toEqual(account);
      await expect(changes.hasOperation(id('90001'))).resolves.toBe(true);
      await expect(accounts.listActive()).resolves.toEqual([account]);
    });

    it('updates an account, bumping its revision', async () => {
      const account = await accounts.create({
        id: id('00002'),
        name: 'Bank',
        type: 'bank',
        openingBalance: 0,
        originDeviceId: deviceId,
        operationId: id('90002'),
        now: '2026-08-24T10:00:00.000Z',
      });

      const updated = await accounts.update(
        account.id,
        { name: 'Main bank' },
        ctx({ operationId: id('90003'), now: '2026-08-24T11:00:00.000Z' }),
      );

      expect(updated).toMatchObject({ name: 'Main bank', revision: 2 });
      await expect(accounts.findById(account.id)).resolves.toEqual(updated);
    });

    it('soft-deletes an unreferenced account (tombstone)', async () => {
      const account = await accounts.create({
        id: id('00003'),
        name: 'Unused',
        type: 'cash',
        openingBalance: 0,
        originDeviceId: deviceId,
        operationId: id('90004'),
        now: '2026-08-24T10:00:00.000Z',
      });

      const result = await accounts.softDeleteOrHide(
        account.id,
        ctx({ operationId: id('90005'), now: '2026-08-24T12:00:00.000Z' }),
      );

      expect(result.deletedAt).toBe('2026-08-24T12:00:00.000Z');
      expect(result.isArchived).toBe(false);
      await expect(accounts.listActive()).resolves.toEqual([]);
    });

    it('archives (hides) an account referenced by a transaction instead of tombstoning it', async () => {
      const account = await accounts.create({
        id: id('00004'),
        name: 'Referenced',
        type: 'cash',
        openingBalance: 0,
        originDeviceId: deviceId,
        operationId: id('90006'),
        now: '2026-08-24T10:00:00.000Z',
      });
      const category = await categories.create({
        id: id('01004'),
        name: 'Groceries',
        type: 'expense',
        originDeviceId: deviceId,
        operationId: id('90007'),
        now: '2026-08-24T10:00:00.000Z',
      });
      await transactionsRepo.create({
        id: id('02004'),
        type: 'expense',
        amount: 20000,
        accountId: account.id,
        categoryId: category.id,
        date: '2026-08-24',
        name: 'Lunch',
        originDeviceId: deviceId,
        operationId: id('90008'),
        now: '2026-08-24T10:05:00.000Z',
      });

      const result = await accounts.softDeleteOrHide(
        account.id,
        ctx({ operationId: id('90009'), now: '2026-08-24T12:00:00.000Z' }),
      );

      expect(result.isArchived).toBe(true);
      expect(result.deletedAt).toBeNull();
      await expect(accounts.listActive()).resolves.toEqual([result]);
    });
  });

  describe('CategoryRepository', () => {
    it('soft-deletes a category when it is not referenced by any transaction', async () => {
      const category = await categories.create({
        id: id('01001'),
        name: 'Salary',
        type: 'income',
        originDeviceId: deviceId,
        operationId: id('91001'),
        now: '2026-08-24T10:00:00.000Z',
      });

      await expect(categories.listActiveByType('income')).resolves.toEqual([category]);

      const deleted = await categories.hide(
        category.id,
        ctx({ operationId: id('91002'), now: '2026-08-24T11:00:00.000Z' }),
      );

      expect(deleted.deletedAt).toBe('2026-08-24T11:00:00.000Z');
      expect(deleted.isArchived).toBe(false);
      await expect(categories.listActiveByType('income')).resolves.toEqual([]);
    });

    it('archives (hides) a category when it is referenced by a transaction', async () => {
      const category = await categories.create({
        id: id('01002'),
        name: 'Food',
        type: 'expense',
        originDeviceId: deviceId,
        operationId: id('91003'),
        now: '2026-08-24T10:00:00.000Z',
      });
      const account = await accounts.create({
        id: id('00001'),
        name: 'Wallet',
        type: 'cash',
        openingBalance: 1000,
        originDeviceId: deviceId,
        operationId: id('90001'),
        now: '2026-08-24T10:00:00.000Z',
      });
      await transactionsRepo.create({
        id: id('02001'),
        type: 'expense',
        amount: 50,
        name: 'Lunch',
        date: '2026-08-24',
        accountId: account.id,
        categoryId: category.id,
        destinationAccountId: null,
        note: null,
        originDeviceId: deviceId,
        operationId: id('92001'),
        now: '2026-08-24T10:05:00.000Z',
      });

      const hidden = await categories.hide(
        category.id,
        ctx({ operationId: id('91004'), now: '2026-08-24T11:00:00.000Z' }),
      );

      expect(hidden.isArchived).toBe(true);
      expect(hidden.deletedAt).toBeNull();
      await expect(categories.findById(category.id)).resolves.toEqual(hidden);
    });

    it('creates and updates a category with custom icon and color', async () => {
      const category = await categories.create({
        id: id('01099'),
        name: 'TikTok Shop',
        type: 'expense',
        icon: 'fa6:tiktok',
        color: '#010101',
        originDeviceId: deviceId,
        operationId: id('91099'),
        now: '2026-08-24T10:00:00.000Z',
      });

      expect(category.icon).toBe('fa6:tiktok');
      expect(category.color).toBe('#010101');

      const updated = await categories.update(
        category.id,
        { name: 'TikTok Creator', icon: 'fa6:video', color: '#1DB954' },
        ctx({ operationId: id('91100'), now: '2026-08-24T11:00:00.000Z' }),
      );

      expect(updated.name).toBe('TikTok Creator');
      expect(updated.icon).toBe('fa6:video');
      expect(updated.color).toBe('#1DB954');
    });

    it('reports a category as unused before any transaction references it', async () => {
      const category = await categories.create({
        id: id('01002'),
        name: 'Dining',
        type: 'expense',
        originDeviceId: deviceId,
        operationId: id('91003'),
        now: '2026-08-24T10:00:00.000Z',
      });

      await expect(categories.isUsedByTransaction(category.id)).resolves.toBe(false);
    });

    it('reports a category as used once an active transaction references it, and still used after that transaction is soft-deleted', async () => {
      const account = await accounts.create({
        id: id('00010'),
        name: 'Bank',
        type: 'bank',
        openingBalance: 0,
        originDeviceId: deviceId,
        operationId: id('91004'),
        now: '2026-08-24T10:00:00.000Z',
      });
      const category = await categories.create({
        id: id('01003'),
        name: 'Dining',
        type: 'expense',
        originDeviceId: deviceId,
        operationId: id('91005'),
        now: '2026-08-24T10:00:00.000Z',
      });
      const transaction = await transactionsRepo.create({
        id: id('02003'),
        type: 'expense',
        amount: 30000,
        accountId: account.id,
        categoryId: category.id,
        date: '2026-08-24',
        name: 'Dinner',
        originDeviceId: deviceId,
        operationId: id('91006'),
        now: '2026-08-24T10:05:00.000Z',
      });

      await expect(categories.isUsedByTransaction(category.id)).resolves.toBe(true);

      await transactionsRepo.softDelete(
        transaction.id,
        ctx({ operationId: id('91007'), now: '2026-08-24T11:00:00.000Z' }),
      );

      await expect(categories.isUsedByTransaction(category.id)).resolves.toBe(true);
    });
  });

  describe('TransactionRepository', () => {
    async function seedAccountAndCategory(suffix: string) {
      const account = await accounts.create({
        id: id(`0${suffix}`),
        name: `Account ${suffix}`,
        type: 'bank',
        openingBalance: 0,
        originDeviceId: deviceId,
        operationId: id(`9${suffix}`),
        now: '2026-08-24T09:00:00.000Z',
      });
      const category = await categories.create({
        id: id(`1${suffix}`),
        name: `Category ${suffix}`,
        type: 'expense',
        originDeviceId: deviceId,
        operationId: id(`8${suffix}`),
        now: '2026-08-24T09:00:00.000Z',
      });
      return { account, category };
    }

    it('creates an income/expense transaction referencing an account and category', async () => {
      const { account, category } = await seedAccountAndCategory('3000');

      const transaction = await transactionsRepo.create({
        id: id('20001'),
        type: 'expense',
        amount: 50000,
        accountId: account.id,
        categoryId: category.id,
        date: '2026-08-20',
        name: 'Lunch',
        note: 'with friends',
        originDeviceId: deviceId,
        operationId: id('92001'),
        now: '2026-08-24T10:00:00.000Z',
      });

      expect(transaction).toMatchObject({
        type: 'expense',
        amount: 50000,
        categoryId: category.id,
        destinationAccountId: null,
      });
      await expect(transactionsRepo.findById(transaction.id)).resolves.toEqual(transaction);
    });

    it('creates a transfer transaction referencing source and destination accounts', async () => {
      const source = await accounts.create({
        id: id('00020'),
        name: 'Source',
        type: 'bank',
        openingBalance: 0,
        originDeviceId: deviceId,
        operationId: id('92002'),
        now: '2026-08-24T09:00:00.000Z',
      });
      const destination = await accounts.create({
        id: id('00021'),
        name: 'Destination',
        type: 'bank',
        openingBalance: 0,
        originDeviceId: deviceId,
        operationId: id('92003'),
        now: '2026-08-24T09:00:00.000Z',
      });

      const transaction = await transactionsRepo.create({
        id: id('20002'),
        type: 'transfer',
        amount: 200000,
        accountId: source.id,
        destinationAccountId: destination.id,
        date: '2026-08-21',
        name: 'Move to savings',
        originDeviceId: deviceId,
        operationId: id('92004'),
        now: '2026-08-24T10:00:00.000Z',
      });

      expect(transaction).toMatchObject({
        type: 'transfer',
        destinationAccountId: destination.id,
        categoryId: null,
      });
    });

    it('rejects an invalid transaction input before writing anything', async () => {
      const { account } = await seedAccountAndCategory('3010');

      await expect(
        transactionsRepo.create({
          id: id('20003'),
          type: 'income',
          amount: 1000,
          accountId: account.id,
          date: '2026-08-20',
          name: 'Missing category',
          originDeviceId: deviceId,
          operationId: id('92005'),
          now: '2026-08-24T10:00:00.000Z',
        }),
      ).rejects.toThrow('Income and expense transactions require a categoryId');

      await expect(transactionsRepo.findById(id('20003'))).resolves.toBeNull();
    });

    it('rejects a transaction referencing a non-existent account (foreign key enforcement)', async () => {
      await expect(
        transactionsRepo.create({
          id: id('20004'),
          type: 'expense',
          amount: 1000,
          accountId: id('99999'),
          categoryId: id('99998'),
          date: '2026-08-20',
          name: 'Bad account',
          originDeviceId: deviceId,
          operationId: id('92006'),
          now: '2026-08-24T10:00:00.000Z',
        }),
      ).rejects.toThrow();

      await expect(transactionsRepo.findById(id('20004'))).resolves.toBeNull();
    });

    it('updates a transaction, bumping its revision', async () => {
      const { account, category } = await seedAccountAndCategory('3020');
      const transaction = await transactionsRepo.create({
        id: id('20005'),
        type: 'expense',
        amount: 10000,
        accountId: account.id,
        categoryId: category.id,
        date: '2026-08-20',
        name: 'Coffee',
        originDeviceId: deviceId,
        operationId: id('92007'),
        now: '2026-08-24T10:00:00.000Z',
      });

      const updated = await transactionsRepo.update(
        transaction.id,
        { amount: 15000, name: 'Coffee and cake' },
        ctx({ operationId: id('92008'), now: '2026-08-24T11:00:00.000Z' }),
      );

      expect(updated).toMatchObject({ amount: 15000, name: 'Coffee and cake', revision: 2 });
      await expect(transactionsRepo.findById(transaction.id)).resolves.toEqual(updated);
    });

    it('soft-deletes and restores a transaction', async () => {
      const { account, category } = await seedAccountAndCategory('3030');
      const transaction = await transactionsRepo.create({
        id: id('20006'),
        type: 'expense',
        amount: 10000,
        accountId: account.id,
        categoryId: category.id,
        date: '2026-08-20',
        name: 'Snack',
        originDeviceId: deviceId,
        operationId: id('92009'),
        now: '2026-08-24T10:00:00.000Z',
      });

      const deleted = await transactionsRepo.softDelete(
        transaction.id,
        ctx({ operationId: id('92010'), now: '2026-08-24T11:00:00.000Z' }),
      );
      expect(deleted.deletedAt).toBe('2026-08-24T11:00:00.000Z');
      await expect(transactionsRepo.list()).resolves.toEqual([]);
      await expect(transactionsRepo.list({ includeDeleted: true })).resolves.toEqual([deleted]);

      const restored = await transactionsRepo.restore(
        transaction.id,
        ctx({ operationId: id('92011'), now: '2026-08-24T12:00:00.000Z' }),
      );
      expect(restored.deletedAt).toBeNull();
      expect(restored.revision).toBe(3);
      await expect(transactionsRepo.list()).resolves.toEqual([restored]);
    });

    it('filters transactions by month, type, category, account and name query', async () => {
      const { account, category } = await seedAccountAndCategory('3040');
      const otherAccount = await accounts.create({
        id: id('00040'),
        name: 'Other account',
        type: 'cash',
        openingBalance: 0,
        originDeviceId: deviceId,
        operationId: id('92012'),
        now: '2026-08-24T09:00:00.000Z',
      });

      const august = await transactionsRepo.create({
        id: id('20007'),
        type: 'expense',
        amount: 50000,
        accountId: account.id,
        categoryId: category.id,
        date: '2026-08-15',
        name: 'August lunch',
        originDeviceId: deviceId,
        operationId: id('92013'),
        now: '2026-08-24T10:00:00.000Z',
      });
      await transactionsRepo.create({
        id: id('20008'),
        type: 'expense',
        amount: 60000,
        accountId: otherAccount.id,
        categoryId: category.id,
        date: '2026-09-01',
        name: 'September dinner',
        originDeviceId: deviceId,
        operationId: id('92014'),
        now: '2026-08-24T10:00:00.000Z',
      });
      const income = await transactionsRepo.create({
        id: id('20009'),
        type: 'income',
        amount: 5000000,
        accountId: account.id,
        categoryId: category.id,
        date: '2026-08-16',
        name: 'August salary',
        originDeviceId: deviceId,
        operationId: id('92015'),
        now: '2026-08-24T10:00:00.000Z',
      });

      await expect(transactionsRepo.list({ month: '2026-08' })).resolves.toEqual(
        expect.arrayContaining([august, income]),
      );
      await expect(transactionsRepo.list({ month: '2026-08' })).resolves.toHaveLength(2);
      await expect(transactionsRepo.list({ type: 'income' })).resolves.toEqual([income]);
      await expect(transactionsRepo.list({ accountId: otherAccount.id })).resolves.toHaveLength(1);
      await expect(transactionsRepo.list({ categoryId: category.id })).resolves.toHaveLength(3);
      await expect(transactionsRepo.list({ query: 'salary' })).resolves.toEqual([income]);
      await expect(
        transactionsRepo.list({ from: '2026-08-16', to: '2026-08-31' }),
      ).resolves.toEqual([income]);
    });
  });

  describe('ProfileSettingsRepository', () => {
    it('returns default settings when no row exists yet', async () => {
      await expect(profile.get()).resolves.toEqual({
        displayName: '',
        amountsHidden: false,
        onboardingCompleted: false,
      });
    });

    it('saves and reloads profile settings without touching the sync change log', async () => {
      await profile.save(
        { displayName: 'Phuc', amountsHidden: true, onboardingCompleted: true },
        '2026-08-24T10:00:00.000Z',
      );

      await expect(profile.get()).resolves.toEqual({
        displayName: 'Phuc',
        amountsHidden: true,
        onboardingCompleted: true,
      });
      await expect(changes.listPending()).resolves.toEqual([]);
    });
  });

  describe('atomic saveWithOperation transactions', () => {
    it('rolls back the account row when the change-log insert fails inside the same transaction', async () => {
      const failingOperationId = id('99999');
      database.db.run(
        sql.raw(`
        CREATE TRIGGER fail_account_operation
        BEFORE INSERT ON change_log
        WHEN NEW.operation_id = '${failingOperationId}'
        BEGIN SELECT RAISE(ABORT, 'forced change-log failure'); END;
      `),
      );

      await expect(
        accounts.create({
          id: id('00099'),
          name: 'Should not persist',
          type: 'cash',
          openingBalance: 0,
          originDeviceId: deviceId,
          operationId: failingOperationId,
          now: '2026-08-24T10:00:00.000Z',
        }),
      ).rejects.toThrow('forced change-log failure');

      await expect(accounts.findById(id('00099'))).resolves.toBeNull();
    });

    it('rolls back the transaction row when the change-log insert fails inside the same transaction', async () => {
      const { account, category } = await seedAccountAndCategoryStandalone();
      const failingOperationId = id('99998');
      database.db.run(
        sql.raw(`
        CREATE TRIGGER fail_transaction_operation
        BEFORE INSERT ON change_log
        WHEN NEW.operation_id = '${failingOperationId}'
        BEGIN SELECT RAISE(ABORT, 'forced change-log failure'); END;
      `),
      );

      await expect(
        transactionsRepo.create({
          id: id('20099'),
          type: 'expense',
          amount: 1000,
          accountId: account.id,
          categoryId: category.id,
          date: '2026-08-20',
          name: 'Should not persist',
          originDeviceId: deviceId,
          operationId: failingOperationId,
          now: '2026-08-24T10:00:00.000Z',
        }),
      ).rejects.toThrow('forced change-log failure');

      await expect(transactionsRepo.findById(id('20099'))).resolves.toBeNull();
    });

    async function seedAccountAndCategoryStandalone() {
      const account = await accounts.create({
        id: id('00098'),
        name: 'Standalone account',
        type: 'bank',
        openingBalance: 0,
        originDeviceId: deviceId,
        operationId: id('92098'),
        now: '2026-08-24T09:00:00.000Z',
      });
      const category = await categories.create({
        id: id('01098'),
        name: 'Standalone category',
        type: 'expense',
        originDeviceId: deviceId,
        operationId: id('92099'),
        now: '2026-08-24T09:00:00.000Z',
      });
      return { account, category };
    }
  });
});
