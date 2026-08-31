import { sql } from 'drizzle-orm';

import { CreateAccount } from '@/core/application/finance/create-account';
import { CreateTransaction } from '@/core/application/finance/create-transaction';
import { DeleteTransaction } from '@/core/application/finance/delete-transaction';
import { GetDashboard } from '@/core/application/finance/get-dashboard';
import { GetReport } from '@/core/application/finance/get-report';
import { Onboarding } from '@/core/application/finance/onboarding';
import { RestoreTransaction } from '@/core/application/finance/restore-transaction';
import { UpdateTransaction } from '@/core/application/finance/update-transaction';
import { AccountRepository } from '@/data/local/repositories/account-repository';
import { CategoryRepository } from '@/data/local/repositories/category-repository';
import { ProfileSettingsRepository } from '@/data/local/repositories/profile-settings-repository';
import { TransactionRepository } from '@/data/local/repositories/transaction-repository';
import { openTestLocalDatabase, migrateLocalDatabase } from '@/data/local/db/client';
import { calculateAccountBalance } from '@/core/domain/finance/finance-calculations';

const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440099';
const NOW = '2026-08-25T08:00:00.000Z';

describe('income and expense MVP acceptance flow', () => {
  it('completes onboarding and keeps balances/reports correct through edit, delete and undo', async () => {
    const database = await openTestLocalDatabase();
    const accounts = new AccountRepository(database);
    const categories = new CategoryRepository(database);
    const transactions = new TransactionRepository(database);
    const profile = new ProfileSettingsRepository(database);
    let sequence = 0;
    const generateId = () => {
      sequence += 1;
      return `550e8400-e29b-41d4-a716-44665544${String(sequence).padStart(4, '0')}`;
    };
    const shared = { now: () => NOW, deviceId: DEVICE_ID, generateId };
    const onboarding = new Onboarding({
      accountRepository: accounts,
      categoryRepository: categories,
      profileSettingsRepository: profile,
      ...shared,
    });
    const createAccount = new CreateAccount({ accountRepository: accounts, ...shared });
    const createTransaction = new CreateTransaction({
      transactionRepository: transactions,
      ...shared,
    });
    const updateTransaction = new UpdateTransaction({
      transactionRepository: transactions,
      ...shared,
    });
    const deleteTransaction = new DeleteTransaction({
      transactionRepository: transactions,
      ...shared,
    });
    const restoreTransaction = new RestoreTransaction({
      transactionRepository: transactions,
      ...shared,
    });

    try {
      expect((await onboarding.resume()).step).toBe('display-name');
      await onboarding.saveDisplayName('Phuc');
      const source = await onboarding.createFirstAccount({
        name: 'Cash wallet',
        type: 'cash',
        openingBalance: 1_000_000,
      });
      const destination = await createAccount.execute({
        name: 'Savings',
        type: 'bank',
        openingBalance: 500_000,
      });
      const createdCategories = await onboarding.confirmDefaults();
      const incomeCategory = createdCategories.find((category) => category.type === 'income');
      const expenseCategory = createdCategories.find((category) => category.type === 'expense');
      expect(incomeCategory).toBeDefined();
      expect(expenseCategory).toBeDefined();
      expect((await onboarding.resume()).step).toBe('completed');

      const income = await createTransaction.execute({
        type: 'income',
        amount: 2_000_000,
        accountId: source.id,
        categoryId: incomeCategory!.id,
        date: '2026-08-05',
        name: 'Salary',
      });
      const expense = await createTransaction.execute({
        type: 'expense',
        amount: 300_000,
        accountId: source.id,
        categoryId: expenseCategory!.id,
        date: '2026-08-10',
        name: 'Lunch',
      });
      const transfer = await createTransaction.execute({
        type: 'transfer',
        amount: 400_000,
        accountId: source.id,
        destinationAccountId: destination.id,
        date: '2026-08-12',
        name: 'Move to savings',
      });

      expect(calculateAccountBalance(source, [income, expense, transfer])).toBe(2_300_000);
      expect(calculateAccountBalance(destination, [income, expense, transfer])).toBe(900_000);

      const updatedExpense = await updateTransaction.execute(expense.id, {
        amount: 350_000,
        name: 'Lunch and coffee',
      });
      expect(calculateAccountBalance(source, [income, updatedExpense, transfer])).toBe(2_250_000);
      expect(
        await new GetReport({ transactionRepository: transactions }).execute({ month: '2026-08' }),
      ).toMatchObject({ income: 2_000_000, expense: 350_000, netCashFlow: 1_650_000 });

      const deleted = await deleteTransaction.execute(updatedExpense.id);
      expect(deleted.deletedAt).toBe(NOW);
      expect(calculateAccountBalance(source, [income, deleted, transfer])).toBe(2_600_000);
      const restored = await restoreTransaction.execute(updatedExpense.id);
      expect(restored.deletedAt).toBeNull();
      expect(calculateAccountBalance(source, [income, restored, transfer])).toBe(2_250_000);

      const dashboard = await new GetDashboard({
        accountRepository: accounts,
        transactionRepository: transactions,
      }).execute('2026-08');
      expect(dashboard).toMatchObject({
        totalBalance: 3_150_000,
        income: 2_000_000,
        expense: 350_000,
        netCashFlow: 1_650_000,
      });
      expect(dashboard.categorySpending).toEqual([{ id: expenseCategory!.id, amount: 350_000 }]);
      expect(dashboard.recentTransactions.map((item) => item.id)).toEqual(
        expect.arrayContaining([income.id, restored.id, transfer.id]),
      );
    } finally {
      await database.close();
    }
  });

  it('applies migrations to a fresh database and preserves pre-existing sync tables', async () => {
    const database = await openTestLocalDatabase();
    try {
      const tables = await database.db.all<{ name: string }>(
        sql`SELECT name FROM sqlite_master WHERE type = 'table'`,
      );
      const names = tables.map((table) => table.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'accounts',
          'categories',
          'transactions',
          'profile_settings',
          'change_log',
          'example_records',
          'sync_metadata',
        ]),
      );
      await expect(migrateLocalDatabase(database.db)).resolves.toBeUndefined();
      const migrationRows = await database.db.all<{ count: number }>(
        sql`SELECT COUNT(*) AS count FROM __drizzle_migrations`,
      );
      expect(Number(migrationRows[0]?.count)).toBeGreaterThanOrEqual(3);
    } finally {
      await database.close();
    }
  });
});
