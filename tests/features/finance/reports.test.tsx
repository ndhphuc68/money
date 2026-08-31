import { render, waitFor, fireEvent } from '@testing-library/react-native';

import {
  AccountRepository,
  CategoryRepository,
  CreateAccountInput,
  CreateCategoryInput,
  CreateTransactionInput,
  TransactionListFilter,
  TransactionRepository,
  UpdateAccountInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
  WriteContext,
} from '@/core/application/ports/finance-repositories';
import { GetReport } from '@/core/application/finance/get-report';
import { GetReportTrend } from '@/core/application/finance/get-report-trend';
import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { formatVnd } from '@/core/domain/finance/money';
import {
  Transaction,
  TransactionInput,
  validateTransactionInput,
} from '@/core/domain/finance/transaction';
import { ReportsScreen } from '@/features/finance/screens/reports-screen';
import { useReports } from '@/features/finance/view-models/use-reports';
import { Locale, translate } from '@/i18n/translations';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440099';
const NOW = '2026-08-25T08:00:00.000Z';

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

  async update(_id: string, _changes: UpdateAccountInput, _context: WriteContext): Promise<Account> {
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

  async update(_id: string, _changes: UpdateCategoryInput, _context: WriteContext): Promise<Category> {
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

  async update(_id: string, _changes: UpdateTransactionInput, _context: WriteContext): Promise<Transaction> {
    throw new Error('not implemented');
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
    if (filter.categoryIds && filter.categoryIds.length > 0) {
      items = items.filter((t) => filter.categoryIds!.includes(t.categoryId ?? ''));
    } else if (filter.categoryId) {
      items = items.filter((t) => t.categoryId === filter.categoryId);
    }
    if (filter.accountId) {
      items = items.filter(
        (t) => t.accountId === filter.accountId || t.destinationAccountId === filter.accountId,
      );
    }
    if (filter.query) {
      items = items.filter((t) => t.name.toLowerCase().includes(filter.query!.toLowerCase()));
    }
    if (filter.from) {
      items = items.filter((t) => t.date >= filter.from!);
    }
    if (filter.to) {
      items = items.filter((t) => t.date <= filter.to!);
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
  meta: { createdAt: string; updatedAt: string; deletedAt: string | null; revision: number; originDeviceId: string },
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
    return { ...base, type: 'transfer', destinationAccountId: input.destinationAccountId as string, categoryId: null };
  }
  return { ...base, type: input.type, categoryId: input.categoryId as string, destinationAccountId: null };
}

function makeIdFactory(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

const t = translate.bind(null, 'vi' as Locale);

function makeRepos() {
  const accountRepository = new FakeAccountRepository();
  const categoryRepository = new FakeCategoryRepository();
  const transactionRepository = new FakeTransactionRepository();
  return { accountRepository, categoryRepository, transactionRepository };
}

type Repos = ReturnType<typeof makeRepos>;

function makeDependencies(repos: Repos) {
  return {
    ...repos,
    getReport: new GetReport(repos),
    getReportTrend: new GetReportTrend(repos),
  };
}

function Harness({
  dependencies,
  now,
}: {
  dependencies: ReturnType<typeof makeDependencies>;
  now?: () => Date;
}) {
  const viewModel = useReports({ dependencies, now: now ?? (() => new Date(NOW)), t });
  return <ReportsScreen {...viewModel} t={t} />;
}

async function seed(repos: Repos) {
  const generateId = makeIdFactory('id');
  const cashAccount = await repos.accountRepository.create({
    id: generateId(),
    name: 'Vi tien mat',
    type: 'cash',
    openingBalance: 1_000_000,
    originDeviceId: DEVICE_ID,
    operationId: generateId(),
    now: NOW,
  });
  const bankAccount = await repos.accountRepository.create({
    id: generateId(),
    name: 'Ngan hang',
    type: 'bank',
    openingBalance: 2_000_000,
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
  return { cashAccount, bankAccount, expenseCategory, incomeCategory, generateId };
}

describe('reports screen + view model', () => {
  it('shows income, expense, net cash flow, category chart legend and account totals for the current month, excluding transfers', async () => {
    const repos = makeRepos();
    const { cashAccount, bankAccount, expenseCategory, incomeCategory, generateId } = await seed(repos);

    await repos.transactionRepository.create({
      id: generateId(),
      type: 'income',
      amount: 5_000_000,
      accountId: cashAccount.id,
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
      accountId: cashAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-08-10',
      name: 'An trua',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'transfer',
      amount: 500_000,
      accountId: cashAccount.id,
      destinationAccountId: bankAccount.id,
      date: '2026-08-12',
      name: 'Chuyen tien',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    const dependencies = makeDependencies(repos);
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(formatVnd(5_000_000))).toBeTruthy());
    expect(screen.getByText(formatVnd(200_000))).toBeTruthy();
    expect(screen.getByText(formatVnd(5_000_000 - 200_000))).toBeTruthy();
    expect(screen.getByText('An uong')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy(); // only expense category -> 100% of the donut
    expect(screen.getByText('Vi tien mat')).toBeTruthy();
    expect(screen.queryByText(formatVnd(500_000))).toBeNull();
  });

  it('navigates to the previous and next period for the active kind (month by default)', async () => {
    const repos = makeRepos();
    const { cashAccount, expenseCategory, generateId } = await seed(repos);

    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 100_000,
      accountId: cashAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-07-15',
      name: 'Chi thang 7',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 300_000,
      accountId: cashAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-08-15',
      name: 'Chi thang 8',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    const dependencies = makeDependencies(repos);
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(formatVnd(300_000))).toBeTruthy());
    expect(screen.queryByText(formatVnd(100_000))).toBeNull();

    fireEvent.press(screen.getByLabelText(t('reportsPreviousPeriod')));

    await waitFor(() => expect(screen.getByText(formatVnd(100_000))).toBeTruthy());
    expect(screen.queryByText(formatVnd(300_000))).toBeNull();

    fireEvent.press(screen.getByLabelText(t('reportsNextPeriod')));

    await waitFor(() => expect(screen.getByText(formatVnd(300_000))).toBeTruthy());
  });

  it('switches to weekly view and shows the current-vs-previous-period comparison', async () => {
    const repos = makeRepos();
    const { cashAccount, expenseCategory, generateId } = await seed(repos);

    // Current week (2026-08-24..30) has 300,000; the previous week (2026-08-17..23) has 100,000
    // -> expense should read as up (previous > 0, current higher -> positive change label "+200%").
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 100_000,
      accountId: cashAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-08-18',
      name: 'Chi tuan truoc',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 300_000,
      accountId: cashAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-08-25',
      name: 'Chi tuan nay',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    const dependencies = makeDependencies(repos);
    const screen = render(<Harness dependencies={dependencies} />);
    await waitFor(() => expect(screen.queryByText(t('dashboardLoading'))).toBeNull()); // initial month load settled

    fireEvent.press(screen.getByLabelText(t('reportsPeriodWeek')));

    await waitFor(() => expect(screen.getByText(formatVnd(300_000))).toBeTruthy());
    expect(screen.getByText('+200%')).toBeTruthy();
  });

  it('filters by multiple categories via the compact FilterBar', async () => {
    const repos = makeRepos();
    const { cashAccount, generateId } = await seed(repos);
    const transportCategory = await repos.categoryRepository.create({
      id: generateId(),
      name: 'Di chuyen',
      type: 'expense',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    const billsCategory = await repos.categoryRepository.create({
      id: generateId(),
      name: 'Hoa don',
      type: 'expense',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 150_000,
      accountId: cashAccount.id,
      categoryId: transportCategory.id,
      date: '2026-08-05',
      name: 'Taxi',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 90_000,
      accountId: cashAccount.id,
      categoryId: billsCategory.id,
      date: '2026-08-06',
      name: 'Internet',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    const dependencies = makeDependencies(repos);
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(formatVnd(240_000))).toBeTruthy());

    fireEvent.press(screen.getByLabelText(t('filterAdvanced')));
    fireEvent.press(screen.getByLabelText(transportCategory.name));

    await waitFor(() => expect(screen.getByText(formatVnd(150_000))).toBeTruthy());
    expect(screen.queryByText(formatVnd(240_000))).toBeNull();
  });

  it('shows empty states when a period has no transactions', async () => {
    const repos = makeRepos();
    await seed(repos);
    const dependencies = makeDependencies(repos);
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(t('reportsCategoryEmpty'))).toBeTruthy());
    expect(screen.getByText(t('reportsAccountEmpty'))).toBeTruthy();
  });
});
