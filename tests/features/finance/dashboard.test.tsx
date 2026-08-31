import { render, waitFor, fireEvent } from '@testing-library/react-native';

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
import { GetDashboard } from '@/core/application/finance/get-dashboard';
import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { formatVnd } from '@/core/domain/finance/money';
import {
  createDefaultProfileSettings,
  ProfileSettings,
} from '@/core/domain/finance/profile-settings';
import {
  Transaction,
  TransactionInput,
  validateTransactionInput,
} from '@/core/domain/finance/transaction';
import { DashboardScreen } from '@/features/finance/screens/dashboard-screen';
import { useDashboard } from '@/features/finance/view-models/use-dashboard';
import { Locale, translate } from '@/i18n/translations';

// ---------------------------------------------------------------------------
// Minimal in-memory fakes, matching the pattern in
// tests/core/finance/finance-use-cases.test.ts and
// tests/features/finance/onboarding.test.tsx.
// ---------------------------------------------------------------------------

const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440099';

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

  async update(
    _id: string,
    _changes: UpdateAccountInput,
    _context: WriteContext,
  ): Promise<Account> {
    throw new Error('not implemented');
  }

  async softDeleteOrHide(_id: string, _context: WriteContext): Promise<Account> {
    throw new Error('not implemented');
  }

  async findById(id: string): Promise<Account | null> {
    return this.store.get(id) ?? null;
  }

  async listActive(): Promise<Account[]> {
    return Array.from(this.store.values()).filter((account) => account.deletedAt === null);
  }

  async saveWithOperation(): Promise<void> {
    throw new Error('not implemented');
  }
}

class FakeCategoryRepository implements CategoryRepository {
  private readonly store = new Map<string, Category>();

  async create(input: CreateCategoryInput): Promise<Category> {
    const category: Category = {
      id: input.id,
      name: input.name,
      type: input.type,
      icon: input.icon || 'fa6:shapes',
      color: input.color || (input.type === 'income' ? '#10B981' : '#F2734A'),
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

  async update(
    _id: string,
    _changes: UpdateCategoryInput,
    _context: WriteContext,
  ): Promise<Category> {
    throw new Error('not implemented');
  }

  async hide(_id: string, _context: WriteContext): Promise<Category> {
    throw new Error('not implemented');
  }

  async findById(id: string): Promise<Category | null> {
    return this.store.get(id) ?? null;
  }

  async listActiveByType(type: Category['type']): Promise<Category[]> {
    return Array.from(this.store.values()).filter(
      (category) => category.type === type && category.deletedAt === null,
    );
  }

  async isUsedByTransaction(): Promise<boolean> {
    return false;
  }

  async saveWithOperation(): Promise<void> {
    throw new Error('not implemented');
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

  async update(
    _id: string,
    _changes: UpdateTransactionInput,
    _context: WriteContext,
  ): Promise<Transaction> {
    throw new Error('not implemented');
  }

  async softDelete(id: string, context: WriteContext): Promise<Transaction> {
    const existing = this.requireById(id);
    const updated = {
      ...existing,
      deletedAt: context.now,
      updatedAt: context.now,
      revision: existing.revision + 1,
    } as Transaction;
    this.store.set(id, updated);
    return updated;
  }

  async restore(id: string, context: WriteContext): Promise<Transaction> {
    const existing = this.requireById(id);
    const updated = {
      ...existing,
      deletedAt: null,
      updatedAt: context.now,
      revision: existing.revision + 1,
    } as Transaction;
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
    return items;
  }

  async saveWithOperation(): Promise<void> {
    throw new Error('not implemented');
  }

  private requireById(id: string): Transaction {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Transaction ${id} not found`);
    }
    return existing;
  }
}

function buildTransaction(
  id: string,
  input: TransactionInput,
  meta: {
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    revision: number;
    originDeviceId: string;
  },
): Transaction {
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
    return {
      ...base,
      type: 'transfer',
      destinationAccountId: input.destinationAccountId as string,
      categoryId: null,
    };
  }
  return {
    ...base,
    type: input.type,
    categoryId: input.categoryId as string,
    destinationAccountId: null,
  };
}

function makeIdFactory(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

const t = translate.bind(null, 'vi' as Locale);
const NOW = '2026-08-25T08:00:00.000Z';

function makeRepos() {
  const accountRepository = new FakeAccountRepository();
  const categoryRepository = new FakeCategoryRepository();
  const transactionRepository = new FakeTransactionRepository();
  const profileSettingsRepository = new FakeProfileSettingsRepository();
  return {
    accountRepository,
    categoryRepository,
    transactionRepository,
    profileSettingsRepository,
  };
}

function Harness({
  dependencies,
}: {
  dependencies: ReturnType<typeof makeRepos> & { getDashboard: GetDashboard };
}) {
  const viewModel = useDashboard({ dependencies, now: () => new Date(NOW), t });
  return (
    <DashboardScreen
      {...viewModel}
      onAddTransaction={() => {}}
      onOpenTransactions={() => {}}
      onSelectTransaction={() => {}}
      t={t}
    />
  );
}

async function seedAccountAndCategory(repos: ReturnType<typeof makeRepos>) {
  const generateId = makeIdFactory('id');
  const account = await repos.accountRepository.create({
    id: generateId(),
    name: 'Vi tien mat',
    type: 'cash',
    openingBalance: 1_000_000,
    originDeviceId: DEVICE_ID,
    operationId: generateId(),
    now: NOW,
  });
  const expenseCategory = await repos.categoryRepository.create({
    id: generateId(),
    name: 'An uong',
    type: 'expense',
    originDeviceId: DEVICE_ID,
    operationId: generateId(),
    now: NOW,
  });
  const incomeCategory = await repos.categoryRepository.create({
    id: generateId(),
    name: 'Luong',
    type: 'income',
    originDeviceId: DEVICE_ID,
    operationId: generateId(),
    now: NOW,
  });
  return { account, expenseCategory, incomeCategory, generateId };
}

describe('dashboard screen + view model', () => {
  it('shows the personalized greeting from local profile settings', async () => {
    const repos = makeRepos();
    await repos.profileSettingsRepository.save({
      ...(await repos.profileSettingsRepository.get()),
      displayName: 'Minh Anh',
    });
    const dependencies = { ...repos, getDashboard: new GetDashboard(repos) };
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText('Minh Anh')).toBeTruthy());
    expect(screen.getByText(t('dashboardGreeting'))).toBeTruthy();
  });

  it('shows an empty state before any account or transaction exists', async () => {
    const repos = makeRepos();
    const dependencies = { ...repos, getDashboard: new GetDashboard(repos) };
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(t('dashboardBalanceLabel'))).toBeTruthy());
    expect(screen.getByLabelText(t('dashboardNotifications'))).toBeTruthy();
    expect(screen.queryByText(t('dashboardNetLabel'))).toBeNull();
    expect(screen.getAllByText(formatVnd(0)).length).toBeGreaterThan(0);
    expect(screen.getByText(t('dashboardRecentTransactionsEmpty'))).toBeTruthy();
    expect(screen.getByText(t('dashboardCategorySpendingEmpty'))).toBeTruthy();
  });

  it('renders total balance, month income/expense/net, category spending and recent transactions', async () => {
    const repos = makeRepos();
    const { account, expenseCategory, incomeCategory, generateId } =
      await seedAccountAndCategory(repos);

    await repos.transactionRepository.create({
      id: generateId(),
      type: 'income',
      amount: 5_000_000,
      accountId: account.id,
      categoryId: incomeCategory.id,
      date: '2026-08-05',
      name: 'Luong thang 8',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 200_000,
      accountId: account.id,
      categoryId: expenseCategory.id,
      date: '2026-08-10',
      name: 'An trua',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    const dependencies = { ...repos, getDashboard: new GetDashboard(repos) };
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText('An trua')).toBeTruthy());
    expect(screen.getByText('Luong thang 8')).toBeTruthy();
    expect(screen.getByLabelText('An trua · -200.000 ₫')).toBeTruthy();
    expect(screen.getByText(formatVnd(1_000_000 + 5_000_000 - 200_000))).toBeTruthy();
    expect(screen.getByText(`+${formatVnd(5_000_000)}`)).toBeTruthy();
    expect(screen.getByText(`-${formatVnd(200_000)}`)).toBeTruthy();
    expect(screen.getByText('An uong')).toBeTruthy();
  });

  it('masks amounts when the hide/show action is toggled, without altering the underlying totals', async () => {
    const repos = makeRepos();
    const { account, incomeCategory, generateId } = await seedAccountAndCategory(repos);
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'income',
      amount: 5_000_000,
      accountId: account.id,
      categoryId: incomeCategory.id,
      date: '2026-08-05',
      name: 'Luong thang 8',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    const dependencies = { ...repos, getDashboard: new GetDashboard(repos) };
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText('Luong thang 8')).toBeTruthy());
    expect(screen.getByText(formatVnd(6_000_000))).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Ẩn số dư'));

    await waitFor(() => expect(screen.queryByText(formatVnd(6_000_000))).toBeNull());
    expect((await repos.profileSettingsRepository.get()).amountsHidden).toBe(true);

    // the underlying dashboard aggregate is unaffected by masking
    const dashboard = await dependencies.getDashboard.execute('2026-08');
    expect(dashboard.totalBalance).toBe(6_000_000);
  });
});
