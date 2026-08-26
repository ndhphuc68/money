import {
  AccountRepository,
  CategoryRepository,
  CreateAccountInput,
  CreateCategoryInput,
  CreateTransactionInput,
  ProfileSettingsRepository,
  TransactionListFilter,
  TransactionRepository,
  UpdateAccountInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
  WriteContext,
} from '@/core/application/ports/finance-repositories';
import { CreateAccount } from '@/core/application/finance/create-account';
import { CreateCategory } from '@/core/application/finance/manage-categories';
import { CreateTransaction } from '@/core/application/finance/create-transaction';
import { UpdateTransaction } from '@/core/application/finance/update-transaction';
import { DeleteTransaction } from '@/core/application/finance/delete-transaction';
import { RestoreTransaction } from '@/core/application/finance/restore-transaction';
import { GetDashboard } from '@/core/application/finance/get-dashboard';
import { GetReport } from '@/core/application/finance/get-report';
import { DEFAULT_CATEGORIES } from '@/core/application/finance/default-categories';
import { Onboarding } from '@/core/application/finance/onboarding';
import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { createDefaultProfileSettings, ProfileSettings } from '@/core/domain/finance/profile-settings';
import { Transaction, TransactionInput, validateTransactionInput } from '@/core/domain/finance/transaction';

const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440099';

// ---------------------------------------------------------------------------
// In-memory fake repository ports (Task 4 brief Step 1: keep these tests
// fast and focused on use-case logic, not persistence).
// ---------------------------------------------------------------------------

class FakeAccountRepository implements AccountRepository {
  private readonly store = new Map<string, Account>();

  async create(input: CreateAccountInput): Promise<Account> {
    const account: Account = {
      id: input.id,
      name: input.name,
      type: input.type,
      openingBalance: input.openingBalance,
      isArchived: false,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };
    this.store.set(account.id, account);
    return account;
  }

  async update(id: string, changes: UpdateAccountInput, context: WriteContext): Promise<Account> {
    const existing = this.requireById(id);
    const updated: Account = {
      ...existing,
      ...changes,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    this.store.set(id, updated);
    return updated;
  }

  async softDeleteOrHide(id: string, context: WriteContext): Promise<Account> {
    const existing = this.requireById(id);
    const updated: Account = { ...existing, deletedAt: context.now, updatedAt: context.now, revision: existing.revision + 1 };
    this.store.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<Account | null> {
    return this.store.get(id) ?? null;
  }

  async listActive(): Promise<Account[]> {
    return Array.from(this.store.values()).filter((account) => account.deletedAt === null);
  }

  async saveWithOperation(record: Account): Promise<void> {
    this.store.set(record.id, record);
  }

  private requireById(id: string): Account {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Account ${id} not found`);
    }
    return existing;
  }
}

class FakeCategoryRepository implements CategoryRepository {
  private readonly store = new Map<string, Category>();

  async create(input: CreateCategoryInput): Promise<Category> {
    const category: Category = {
      id: input.id,
      name: input.name,
      type: input.type,
      isArchived: false,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };
    this.store.set(category.id, category);
    return category;
  }

  async update(id: string, changes: UpdateCategoryInput, context: WriteContext): Promise<Category> {
    const existing = this.requireById(id);
    const updated: Category = { ...existing, ...changes, updatedAt: context.now, revision: existing.revision + 1 };
    this.store.set(id, updated);
    return updated;
  }

  async hide(id: string, context: WriteContext): Promise<Category> {
    const existing = this.requireById(id);
    const updated: Category = { ...existing, isArchived: true, updatedAt: context.now, revision: existing.revision + 1 };
    this.store.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<Category | null> {
    return this.store.get(id) ?? null;
  }

  async listActiveByType(type: Category['type']): Promise<Category[]> {
    return Array.from(this.store.values()).filter((category) => category.type === type && category.deletedAt === null);
  }

  async isUsedByTransaction(): Promise<boolean> {
    return false;
  }

  async saveWithOperation(record: Category): Promise<void> {
    this.store.set(record.id, record);
  }

  private requireById(id: string): Category {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Category ${id} not found`);
    }
    return existing;
  }
}

function mergeTransactionInput(existing: Transaction, changes: UpdateTransactionInput): TransactionInput {
  const type = changes.type ?? existing.type;
  const existingDestinationAccountId = existing.type === 'transfer' ? existing.destinationAccountId : null;
  const existingCategoryId = existing.type === 'transfer' ? null : existing.categoryId;

  const destinationAccountId =
    changes.destinationAccountId !== undefined
      ? changes.destinationAccountId
      : type === 'transfer'
        ? existingDestinationAccountId
        : null;
  const categoryId = changes.categoryId !== undefined ? changes.categoryId : type === 'transfer' ? null : existingCategoryId;

  return {
    type,
    amount: changes.amount ?? existing.amount,
    accountId: changes.accountId ?? existing.accountId,
    destinationAccountId,
    categoryId,
    date: changes.date ?? existing.date,
    name: changes.name ?? existing.name,
    note: changes.note !== undefined ? changes.note : (existing.note ?? null),
  };
}

type TransactionMeta = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  revision: number;
  originDeviceId: string;
};

function buildTransaction(id: string, input: TransactionInput, meta: TransactionMeta): Transaction {
  const base = {
    id,
    amount: input.amount,
    accountId: input.accountId,
    date: input.date,
    name: input.name,
    note: input.note ?? null,
    ...meta,
  };

  if (input.type === 'transfer') {
    return { ...base, type: 'transfer', destinationAccountId: input.destinationAccountId as string, categoryId: null };
  }
  return { ...base, type: input.type, categoryId: input.categoryId as string, destinationAccountId: null };
}

function monthRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const from = `${month}-01`;
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  const to = nextMonth.toISOString().slice(0, 10);
  return { from, to };
}

class FakeTransactionRepository implements TransactionRepository {
  private readonly store = new Map<string, Transaction>();

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const { id, originDeviceId, operationId: _operationId, now, ...rest } = input;
    validateTransactionInput(rest);
    const transaction = buildTransaction(id, rest, {
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    });
    this.store.set(id, transaction);
    return transaction;
  }

  async update(id: string, changes: UpdateTransactionInput, context: WriteContext): Promise<Transaction> {
    const existing = this.requireById(id);
    const merged = mergeTransactionInput(existing, changes);
    validateTransactionInput(merged);
    const updated = buildTransaction(existing.id, merged, {
      createdAt: existing.createdAt,
      updatedAt: context.now,
      deletedAt: existing.deletedAt,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    });
    this.store.set(id, updated);
    return updated;
  }

  async softDelete(id: string, context: WriteContext): Promise<Transaction> {
    const existing = this.requireById(id);
    const updated = { ...existing, deletedAt: context.now, updatedAt: context.now, revision: existing.revision + 1 } as Transaction;
    this.store.set(id, updated);
    return updated;
  }

  async restore(id: string, context: WriteContext): Promise<Transaction> {
    const existing = this.requireById(id);
    const updated = { ...existing, deletedAt: null, updatedAt: context.now, revision: existing.revision + 1 } as Transaction;
    this.store.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter: TransactionListFilter = {}): Promise<Transaction[]> {
    let items = Array.from(this.store.values());

    if (!filter.includeDeleted) {
      items = items.filter((t) => t.deletedAt === null);
    }
    if (filter.type) {
      items = items.filter((t) => t.type === filter.type);
    }
    if (filter.categoryId) {
      items = items.filter((t) => t.categoryId === filter.categoryId);
    }
    if (filter.accountId) {
      items = items.filter((t) => t.accountId === filter.accountId || t.destinationAccountId === filter.accountId);
    }
    if (filter.query) {
      items = items.filter((t) => t.name.toLowerCase().includes(filter.query!.toLowerCase()));
    }
    if (filter.month) {
      const { from, to } = monthRange(filter.month);
      items = items.filter((t) => t.date >= from && t.date < to);
    } else {
      if (filter.from) {
        items = items.filter((t) => t.date >= filter.from!);
      }
      if (filter.to) {
        items = items.filter((t) => t.date <= filter.to!);
      }
    }

    return items.sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
  }

  async saveWithOperation(record: Transaction): Promise<void> {
    this.store.set(record.id, record);
  }

  private requireById(id: string): Transaction {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Transaction ${id} not found`);
    }
    return existing;
  }
}

class FakeProfileSettingsRepository implements ProfileSettingsRepository {
  private settings: ProfileSettings = createDefaultProfileSettings();

  async get(): Promise<ProfileSettings> {
    return this.settings;
  }

  async save(settings: ProfileSettings): Promise<void> {
    this.settings = settings;
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeIdFactory(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

function makeClock(startIso: string): () => string {
  let current = new Date(startIso).getTime();
  return () => {
    const iso = new Date(current).toISOString();
    current += 1000;
    return iso;
  };
}

// ---------------------------------------------------------------------------
// CreateAccount
// ---------------------------------------------------------------------------

describe('CreateAccount', () => {
  it('creates an account with the supplied fields', async () => {
    const accountRepository = new FakeAccountRepository();
    const useCase = new CreateAccount({
      accountRepository,
      now: makeClock('2026-08-25T00:00:00.000Z'),
      deviceId: DEVICE_ID,
      generateId: makeIdFactory('id'),
    });

    const account = await useCase.execute({ name: '  Cash  ', type: 'cash', openingBalance: 1000000 });

    expect(account.name).toBe('Cash');
    expect(account.type).toBe('cash');
    expect(account.openingBalance).toBe(1000000);
    expect(account.isArchived).toBe(false);
    expect(await accountRepository.findById(account.id)).toEqual(account);
  });

  it('rejects a blank name', async () => {
    const useCase = new CreateAccount({
      accountRepository: new FakeAccountRepository(),
      now: makeClock('2026-08-25T00:00:00.000Z'),
      deviceId: DEVICE_ID,
      generateId: makeIdFactory('id'),
    });

    await expect(useCase.execute({ name: '   ', type: 'cash', openingBalance: 0 })).rejects.toThrow();
  });

  it('rejects a non-integer opening balance', async () => {
    const useCase = new CreateAccount({
      accountRepository: new FakeAccountRepository(),
      now: makeClock('2026-08-25T00:00:00.000Z'),
      deviceId: DEVICE_ID,
      generateId: makeIdFactory('id'),
    });

    await expect(useCase.execute({ name: 'Cash', type: 'cash', openingBalance: 1.5 })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// CreateTransaction / UpdateTransaction / DeleteTransaction / RestoreTransaction
// ---------------------------------------------------------------------------

describe('finance transaction use cases', () => {
  function setup() {
    const transactionRepository = new FakeTransactionRepository();
    const now = makeClock('2026-08-25T00:00:00.000Z');
    const generateId = makeIdFactory('tx');
    return {
      transactionRepository,
      createTransaction: new CreateTransaction({ transactionRepository, now, deviceId: DEVICE_ID, generateId }),
      updateTransaction: new UpdateTransaction({ transactionRepository, now, deviceId: DEVICE_ID, generateId }),
      deleteTransaction: new DeleteTransaction({ transactionRepository, now, deviceId: DEVICE_ID, generateId }),
      restoreTransaction: new RestoreTransaction({ transactionRepository, now, deviceId: DEVICE_ID, generateId }),
    };
  }

  const expenseInput: TransactionInput = {
    type: 'expense',
    amount: 50000,
    accountId: 'account-cash',
    categoryId: 'category-food',
    date: '2026-08-10',
    name: 'Lunch',
    note: null,
  };

  it('writes the transaction and returns it, atomically via the repository', async () => {
    const { createTransaction, transactionRepository } = setup();

    const created = await createTransaction.execute(expenseInput);

    expect(created.name).toBe('Lunch');
    expect(created.amount).toBe(50000);
    expect(created.revision).toBe(1);
    expect(await transactionRepository.findById(created.id)).toEqual(created);
  });

  it('rejects an invalid transaction before it reaches the repository', async () => {
    const { createTransaction } = setup();

    await expect(createTransaction.execute({ ...expenseInput, amount: 0 })).rejects.toThrow();
  });

  it('updates amount, account, category, date, name and note', async () => {
    const { createTransaction, updateTransaction } = setup();
    const created = await createTransaction.execute(expenseInput);

    const updated = await updateTransaction.execute(created.id, {
      amount: 75000,
      accountId: 'account-bank',
      categoryId: 'category-transport',
      date: '2026-08-11',
      name: 'Taxi',
      note: 'evening ride',
    });

    expect(updated.amount).toBe(75000);
    expect(updated.accountId).toBe('account-bank');
    if (updated.type !== 'transfer') {
      expect(updated.categoryId).toBe('category-transport');
    }
    expect(updated.date).toBe('2026-08-11');
    expect(updated.name).toBe('Taxi');
    expect(updated.note).toBe('evening ride');
    expect(updated.revision).toBe(created.revision + 1);
  });

  it('rejects an update that produces an invalid merged record', async () => {
    const { createTransaction, updateTransaction } = setup();
    const created = await createTransaction.execute(expenseInput);

    await expect(updateTransaction.execute(created.id, { amount: -1 })).rejects.toThrow();
  });

  it('deletes a transaction as a tombstone and can restore it', async () => {
    const { createTransaction, deleteTransaction, restoreTransaction, transactionRepository } = setup();
    const created = await createTransaction.execute(expenseInput);

    const deleted = await deleteTransaction.execute(created.id);
    expect(deleted.deletedAt).not.toBeNull();
    expect((await transactionRepository.list({})).find((t) => t.id === created.id)).toBeUndefined();
    expect((await transactionRepository.list({ includeDeleted: true })).find((t) => t.id === created.id)).toBeDefined();

    const restored = await restoreTransaction.execute(created.id);
    expect(restored.deletedAt).toBeNull();
    expect((await transactionRepository.list({})).find((t) => t.id === created.id)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// GetDashboard / GetReport
// ---------------------------------------------------------------------------

describe('GetDashboard', () => {
  async function seed() {
    const accountRepository = new FakeAccountRepository();
    const transactionRepository = new FakeTransactionRepository();
    const now = makeClock('2026-08-25T00:00:00.000Z');
    const generateId = makeIdFactory('seed');

    const cash = await accountRepository.create({
      id: 'account-cash',
      name: 'Cash',
      type: 'cash',
      openingBalance: 1000000,
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: now(),
    });
    const bank = await accountRepository.create({
      id: 'account-bank',
      name: 'Bank',
      type: 'bank',
      openingBalance: 0,
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: now(),
    });

    const createTransaction = new CreateTransaction({ transactionRepository, now, deviceId: DEVICE_ID, generateId });

    await createTransaction.execute({
      type: 'income',
      amount: 5000000,
      accountId: cash.id,
      categoryId: 'category-salary',
      date: '2026-08-05',
      name: 'Salary',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 200000,
      accountId: cash.id,
      categoryId: 'category-food',
      date: '2026-08-10',
      name: 'Lunch',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 100000,
      accountId: cash.id,
      categoryId: 'category-food',
      date: '2026-08-12',
      name: 'Dinner',
      note: null,
    });
    await createTransaction.execute({
      type: 'transfer',
      amount: 300000,
      accountId: cash.id,
      destinationAccountId: bank.id,
      date: '2026-08-15',
      name: 'Move to bank',
      note: null,
    });
    // Previous month, should not affect the August summary.
    await createTransaction.execute({
      type: 'expense',
      amount: 999999,
      accountId: cash.id,
      categoryId: 'category-food',
      date: '2026-07-20',
      name: 'Old expense',
      note: null,
    });

    const deleteTransaction = new DeleteTransaction({ transactionRepository, now, deviceId: DEVICE_ID, generateId });
    const deletedOne = await createTransaction.execute({
      type: 'expense',
      amount: 500000,
      accountId: cash.id,
      categoryId: 'category-food',
      date: '2026-08-18',
      name: 'Should be excluded',
      note: null,
    });
    await deleteTransaction.execute(deletedOne.id);

    return { accountRepository, transactionRepository };
  }

  it('returns total balance, period totals, chart series, category spending and recent transactions', async () => {
    const { accountRepository, transactionRepository } = await seed();
    const dashboard = new GetDashboard({ accountRepository, transactionRepository });

    const view = await dashboard.execute('2026-08');

    // totalBalance is all-time (not month-scoped), so it also reflects the
    // previous-month expense (-999,999) seeded above.
    // Cash: 1,000,000 + 5,000,000 - 200,000 - 100,000 - 300,000(transfer out) - 999,999(July) = 4,400,001
    // Bank: 0 + 300,000(transfer in) = 300,000
    expect(view.totalBalance).toBe(4700001);
    expect(view.income).toBe(5000000);
    expect(view.expense).toBe(300000);
    expect(view.netCashFlow).toBe(4700000);

    expect(view.chartSeries).toHaveLength(6);
    expect(view.chartSeries[view.chartSeries.length - 1]).toEqual({ month: '2026-08', income: 5000000, expense: 300000 });

    expect(view.categorySpending).toEqual([{ id: 'category-food', amount: 300000 }]);

    expect(view.recentTransactions.some((t) => t.name === 'Should be excluded')).toBe(false);
    expect(view.recentTransactions[0].name).toBe('Move to bank');
  });
});

describe('GetReport', () => {
  it('computes income/expense/net and expense breakdowns by category and account for a month', async () => {
    const transactionRepository = new FakeTransactionRepository();
    const now = makeClock('2026-08-25T00:00:00.000Z');
    const generateId = makeIdFactory('rep');
    const createTransaction = new CreateTransaction({ transactionRepository, now, deviceId: DEVICE_ID, generateId });

    await createTransaction.execute({
      type: 'income',
      amount: 2000000,
      accountId: 'account-cash',
      categoryId: 'category-salary',
      date: '2026-08-01',
      name: 'Salary',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 400000,
      accountId: 'account-cash',
      categoryId: 'category-food',
      date: '2026-08-02',
      name: 'Groceries',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 100000,
      accountId: 'account-bank',
      categoryId: 'category-food',
      date: '2026-08-03',
      name: 'Snacks',
      note: null,
    });

    const report = new GetReport({ transactionRepository });
    const view = await report.execute({ month: '2026-08' });

    expect(view.income).toBe(2000000);
    expect(view.expense).toBe(500000);
    expect(view.netCashFlow).toBe(1500000);
    expect(view.categoryTotals).toEqual([{ id: 'category-food', amount: 500000 }]);
    expect(view.accountTotals).toEqual(
      expect.arrayContaining([
        { id: 'account-cash', amount: 400000 },
        { id: 'account-bank', amount: 100000 },
      ]),
    );
  });

  it('applies additional filters (e.g. accountId) on top of the period', async () => {
    const transactionRepository = new FakeTransactionRepository();
    const now = makeClock('2026-08-25T00:00:00.000Z');
    const generateId = makeIdFactory('rep2');
    const createTransaction = new CreateTransaction({ transactionRepository, now, deviceId: DEVICE_ID, generateId });

    await createTransaction.execute({
      type: 'expense',
      amount: 400000,
      accountId: 'account-cash',
      categoryId: 'category-food',
      date: '2026-08-02',
      name: 'Groceries',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 100000,
      accountId: 'account-bank',
      categoryId: 'category-food',
      date: '2026-08-03',
      name: 'Snacks',
      note: null,
    });

    const report = new GetReport({ transactionRepository });
    const view = await report.execute({ month: '2026-08' }, { accountId: 'account-bank' });

    expect(view.expense).toBe(100000);
    expect(view.accountTotals).toEqual([{ id: 'account-bank', amount: 100000 }]);
  });
});

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

describe('Onboarding', () => {
  function setup() {
    const accountRepository = new FakeAccountRepository();
    const categoryRepository = new FakeCategoryRepository();
    const profileSettingsRepository = new FakeProfileSettingsRepository();
    const now = makeClock('2026-08-25T00:00:00.000Z');
    const generateId = makeIdFactory('ob');
    const onboarding = new Onboarding({ accountRepository, categoryRepository, profileSettingsRepository, now, deviceId: DEVICE_ID, generateId });
    return { onboarding, accountRepository, categoryRepository, profileSettingsRepository };
  }

  it('starts at the display-name step for a brand new profile', async () => {
    const { onboarding } = setup();

    const state = await onboarding.getState();

    expect(state.step).toBe('display-name');
    expect(state.hasAccount).toBe(false);
    expect(state.onboardingCompleted).toBe(false);
  });

  it('display name is optional: it can be skipped and onboarding still proceeds', async () => {
    const { onboarding } = setup();

    // No saveDisplayName call at all; caller advances straight to account creation.
    const account = await onboarding.createFirstAccount({ name: 'Cash', type: 'cash', openingBalance: 0 });
    expect(account.name).toBe('Cash');

    const state = await onboarding.getState();
    expect(state.step).toBe('confirm-categories');
    expect(state.displayName).toBe('');
  });

  it('moves to the first-account step once a display name has been saved', async () => {
    const { onboarding } = setup();

    await onboarding.saveDisplayName('  Phuc  ');
    const state = await onboarding.getState();

    expect(state.step).toBe('first-account');
    expect(state.displayName).toBe('Phuc');
  });

  it('requires at least one account before onboarding can finish', async () => {
    const { onboarding } = setup();

    await expect(onboarding.confirmDefaults()).rejects.toThrow();
  });

  it('confirms the default category set and completes onboarding once an account exists', async () => {
    const { onboarding, categoryRepository, profileSettingsRepository } = setup();

    await onboarding.createFirstAccount({ name: 'Cash', type: 'cash', openingBalance: 500000 });
    const created = await onboarding.confirmDefaults();

    expect(created).toHaveLength(DEFAULT_CATEGORIES.length);
    expect((await categoryRepository.listActiveByType('expense')).length).toBeGreaterThan(0);
    expect((await profileSettingsRepository.get()).onboardingCompleted).toBe(true);

    const state = await onboarding.getState();
    expect(state.step).toBe('completed');
  });

  it('supports editing the default category selection (e.g. dropping or renaming one)', async () => {
    const { onboarding, categoryRepository } = setup();
    await onboarding.createFirstAccount({ name: 'Cash', type: 'cash', openingBalance: 0 });

    const edited = [
      { name: 'Ăn uống', type: 'expense' as const },
      { name: 'Lương tháng', type: 'income' as const },
    ];
    const created = await onboarding.confirmDefaults(edited);

    expect(created).toHaveLength(2);
    expect(created.map((c) => c.name).sort()).toEqual(['Lương tháng', 'Ăn uống'].sort());
    expect(await categoryRepository.listActiveByType('income')).toHaveLength(1);
  });

  it('restarts from display-name after an exit when onboarding is incomplete', async () => {
    const { accountRepository, profileSettingsRepository } = setup();

    await accountRepository.create({
      id: 'account-existing',
      name: 'Cash',
      type: 'cash',
      openingBalance: 0,
      originDeviceId: DEVICE_ID,
      operationId: 'op-1',
      now: '2026-08-25T00:00:00.000Z',
    });
    await profileSettingsRepository.save({ displayName: 'Phuc', amountsHidden: false, onboardingCompleted: false });

    // A fresh Onboarding instance simulates re-entering the app after exiting mid-flow.
    const resumed = new Onboarding({
      accountRepository,
      categoryRepository: new FakeCategoryRepository(),
      profileSettingsRepository,
      now: makeClock('2026-08-25T01:00:00.000Z'),
      deviceId: DEVICE_ID,
      generateId: makeIdFactory('resume'),
    });

    const state = await resumed.resume();
    expect(state.step).toBe('display-name');
    expect(state.hasAccount).toBe(true);
    expect(state.displayName).toBe('Phuc');
  });

  it('resumes at completed once onboarding has finished, even across a fresh Onboarding instance', async () => {
    const { accountRepository, categoryRepository, profileSettingsRepository } = setup();
    await accountRepository.create({
      id: 'account-existing',
      name: 'Cash',
      type: 'cash',
      openingBalance: 0,
      originDeviceId: DEVICE_ID,
      operationId: 'op-1',
      now: '2026-08-25T00:00:00.000Z',
    });
    await profileSettingsRepository.save({ displayName: 'Phuc', amountsHidden: false, onboardingCompleted: true });

    const resumed = new Onboarding({
      accountRepository,
      categoryRepository,
      profileSettingsRepository,
      now: makeClock('2026-08-25T01:00:00.000Z'),
      deviceId: DEVICE_ID,
      generateId: makeIdFactory('resume2'),
    });

    expect((await resumed.resume()).step).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// CreateCategory (manage-categories.ts), sanity check used by onboarding flow
// ---------------------------------------------------------------------------

describe('CreateCategory', () => {
  it('creates a category with a trimmed name', async () => {
    const categoryRepository = new FakeCategoryRepository();
    const useCase = new CreateCategory({
      categoryRepository,
      now: makeClock('2026-08-25T00:00:00.000Z'),
      deviceId: DEVICE_ID,
      generateId: makeIdFactory('cat'),
    });

    const category = await useCase.execute({ name: '  Ăn uống  ', type: 'expense' });

    expect(category.name).toBe('Ăn uống');
    expect(category.type).toBe('expense');
  });

  it('rejects a blank category name', async () => {
    const useCase = new CreateCategory({
      categoryRepository: new FakeCategoryRepository(),
      now: makeClock('2026-08-25T00:00:00.000Z'),
      deviceId: DEVICE_ID,
      generateId: makeIdFactory('cat'),
    });

    await expect(useCase.execute({ name: '  ', type: 'expense' })).rejects.toThrow();
  });
});
