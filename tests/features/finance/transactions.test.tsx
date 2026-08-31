import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

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
import { CreateTransaction } from '@/core/application/finance/create-transaction';
import { DeleteTransaction } from '@/core/application/finance/delete-transaction';
import { RestoreTransaction } from '@/core/application/finance/restore-transaction';
import { UpdateTransaction } from '@/core/application/finance/update-transaction';
import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import {
  createDefaultProfileSettings,
  ProfileSettings,
} from '@/core/domain/finance/profile-settings';
import {
  Transaction,
  TransactionInput,
  validateTransactionInput,
} from '@/core/domain/finance/transaction';
import { TransactionFormSheet } from '@/components/finance';
import { TransactionsScreen } from '@/features/finance/screens/transactions-screen';
import { useTransactionForm } from '@/features/finance/view-models/use-transaction-form';
import { useTransactions } from '@/features/finance/view-models/use-transactions';
import { Locale, translate } from '@/i18n/translations';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// ---------------------------------------------------------------------------
// Minimal in-memory fakes, matching the pattern in
// tests/core/finance/finance-use-cases.test.ts.
// ---------------------------------------------------------------------------

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

function mergeTransactionInput(
  existing: Transaction,
  changes: UpdateTransactionInput,
): TransactionInput {
  const type = changes.type ?? existing.type;
  const existingDestinationAccountId =
    existing.type === 'transfer' ? existing.destinationAccountId : null;
  const existingCategoryId = existing.type === 'transfer' ? null : existing.categoryId;
  const destinationAccountId =
    changes.destinationAccountId !== undefined
      ? changes.destinationAccountId
      : type === 'transfer'
        ? existingDestinationAccountId
        : null;
  const categoryId =
    changes.categoryId !== undefined
      ? changes.categoryId
      : type === 'transfer'
        ? null
        : existingCategoryId;

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

  async update(
    id: string,
    changes: UpdateTransactionInput,
    context: WriteContext,
  ): Promise<Transaction> {
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
    if (filter.type) {
      items = items.filter((t) => t.type === filter.type);
    }
    if (filter.categoryId) {
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

    return items.sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
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
  const profileSettingsRepository = new FakeProfileSettingsRepository();
  const now = () => NOW;
  const generateId = makeIdFactory('id');
  const shared = { now, deviceId: DEVICE_ID, generateId };

  return {
    accountRepository,
    categoryRepository,
    transactionRepository,
    profileSettingsRepository,
    createTransaction: new CreateTransaction({ transactionRepository, ...shared }),
    updateTransaction: new UpdateTransaction({ transactionRepository, ...shared }),
    deleteTransaction: new DeleteTransaction({ transactionRepository, ...shared }),
    restoreTransaction: new RestoreTransaction({ transactionRepository, ...shared }),
    createRecurringExpense: {
      execute: jest.fn().mockResolvedValue({ schedule: {}, occurrence: {} }),
    } as any,
    generateId,
  };
}

type Repos = ReturnType<typeof makeRepos>;

async function seedAccountAndCategories(repos: Repos) {
  const account = await repos.accountRepository.create({
    id: repos.generateId(),
    name: 'Vi tien mat',
    type: 'cash',
    openingBalance: 1_000_000,
    originDeviceId: DEVICE_ID,
    operationId: repos.generateId(),
    now: NOW,
  });
  const secondAccount = await repos.accountRepository.create({
    id: repos.generateId(),
    name: 'Ngan hang',
    type: 'bank',
    openingBalance: 2_000_000,
    originDeviceId: DEVICE_ID,
    operationId: repos.generateId(),
    now: NOW,
  });
  const expenseCategory = await repos.categoryRepository.create({
    id: repos.generateId(),
    name: 'An uong',
    type: 'expense',
    originDeviceId: DEVICE_ID,
    operationId: repos.generateId(),
    now: NOW,
  });
  const incomeCategory = await repos.categoryRepository.create({
    id: repos.generateId(),
    name: 'Luong',
    type: 'income',
    originDeviceId: DEVICE_ID,
    operationId: repos.generateId(),
    now: NOW,
  });
  return { account, secondAccount, expenseCategory, incomeCategory };
}

function ListHarness({
  dependencies,
  onSelectTransaction,
}: {
  dependencies: Repos;
  onSelectTransaction?: (id: string) => void;
}) {
  const viewModel = useTransactions({ dependencies, now: () => new Date(NOW), t });
  return (
    <TransactionsScreen
      {...viewModel}
      onAddTransaction={() => {}}
      onBack={() => {}}
      onSelectTransaction={onSelectTransaction ?? (() => {})}
      t={t}
    />
  );
}

function FormHarness({
  dependencies,
  transactionId,
  onSaved,
}: {
  dependencies: Repos;
  transactionId?: string | null;
  onSaved: () => void;
}) {
  const viewModel = useTransactionForm({
    dependencies,
    now: () => new Date(NOW),
    onSaved,
    t,
    transactionId,
  });
  return <TransactionFormSheet {...viewModel} onClose={() => {}} t={t} visible />;
}

describe('transactions list + view model', () => {
  it('renders the prototype transaction hierarchy with compact filters', () => {
    const screen = render(
      <TransactionsScreen
        accounts={[]}
        amountsHidden={false}
        categories={[]}
        deleteTransaction={async () => undefined}
        dismissUndo={() => undefined}
        filters={{ accountId: null, categoryId: null, month: '2026-08', search: '', type: 'all' }}
        groups={[
          {
            date: '2026-08-25',
            dateLabel: 'HÔM NAY',
            items: [
              {
                amountLabel: '+18.000.000 ₫',
                categoryLabel: 'Thu nhập',
                date: '2026-08-25',
                icon: 'income',
                id: 'tx-1',
                meta: '07:00',
                name: 'Lương tháng 8',
                positive: true,
              },
            ],
          },
        ]}
        isEmpty={false}
        loading={false}
        onAddTransaction={() => undefined}
        onBack={() => undefined}
        onSelectTransaction={() => undefined}
        refresh={async () => undefined}
        setAccountId={() => undefined}
        setCategoryId={() => undefined}
        setMonth={() => undefined}
        setSearch={() => undefined}
        setType={() => undefined}
        undoDelete={async () => undefined}
        undoMessage={null}
        t={t}
      />,
    );

    expect(screen.getByText('Giao dịch')).toBeTruthy();
    expect(screen.getAllByText('Tất cả').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Thu nhập').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chi tiêu').length).toBeGreaterThan(0);
    expect(screen.getByText('Lương tháng 8')).toBeTruthy();
    expect(screen.getByLabelText('Bộ lọc nâng cao')).toBeTruthy();
  });

  it('shows an empty state, then a created transaction after a successful create', async () => {
    const repos = makeRepos();
    const { account, expenseCategory } = await seedAccountAndCategories(repos);

    const list = render(<ListHarness dependencies={repos} />);
    await waitFor(() => expect(list.getByText(t('transactionsEmpty'))).toBeTruthy());

    const onSaved = jest.fn();
    const form = render(<FormHarness dependencies={repos} onSaved={onSaved} />);

    await waitFor(() => expect(form.getByText('Danh mục')).toBeTruthy());
    fireEvent.changeText(form.getByLabelText(t('transactionFormAmountLabel')), '150.000');
    fireEvent.press(form.getByRole('button', { name: 'Danh mục' }));
    fireEvent.press(form.getByRole('button', { name: expenseCategory.name }));
    fireEvent.changeText(form.getByLabelText(t('transactionFormNoteLabel')), 'An trua');
    fireEvent.press(form.getByLabelText(t('transactionFormSave')));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const stored = await repos.transactionRepository.list({});
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      accountId: account.id,
      name: 'An trua',
      amount: 150_000,
      note: 'An trua',
      type: 'expense',
    });
  });

  it('filters by type, category, account and free-text search', async () => {
    const repos = makeRepos();
    const { account, secondAccount, expenseCategory, incomeCategory } =
      await seedAccountAndCategories(repos);

    await repos.createTransaction.execute({
      type: 'expense',
      amount: 100_000,
      accountId: account.id,
      categoryId: expenseCategory.id,
      date: '2026-08-05',
      name: 'An sang',
    });
    await repos.createTransaction.execute({
      type: 'expense',
      amount: 200_000,
      accountId: secondAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-08-06',
      name: 'Mua sam',
    });
    await repos.createTransaction.execute({
      type: 'income',
      amount: 5_000_000,
      accountId: account.id,
      categoryId: incomeCategory.id,
      date: '2026-08-07',
      name: 'Luong thang 8',
    });

    const screen = render(<ListHarness dependencies={repos} />);
    await waitFor(() => expect(screen.getByText('An sang')).toBeTruthy());
    expect(screen.getByText('Mua sam')).toBeTruthy();
    expect(screen.getByText('Luong thang 8')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Thu nhập'));
    await waitFor(() => expect(screen.queryByText('An sang')).toBeNull());
    expect(screen.getByText('Luong thang 8')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Chi tiêu'));
    await waitFor(() => expect(screen.getByText('An sang')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Bộ lọc nâng cao'));
    fireEvent.press(screen.getByLabelText(secondAccount.name));
    await waitFor(() => expect(screen.queryByText('An sang')).toBeNull());
    expect(screen.getByText('Mua sam')).toBeTruthy();
  });

  it('filters by free-text search against the transaction name', async () => {
    const repos = makeRepos();
    const { account, expenseCategory } = await seedAccountAndCategories(repos);

    await repos.createTransaction.execute({
      type: 'expense',
      amount: 100_000,
      accountId: account.id,
      categoryId: expenseCategory.id,
      date: '2026-08-05',
      name: 'An sang',
    });
    await repos.createTransaction.execute({
      type: 'expense',
      amount: 200_000,
      accountId: account.id,
      categoryId: expenseCategory.id,
      date: '2026-08-06',
      name: 'Mua sam',
    });

    const screen = render(<ListHarness dependencies={repos} />);
    await waitFor(() => expect(screen.getByText('An sang')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Bộ lọc nâng cao'));
    fireEvent.changeText(screen.getByLabelText('Tìm kiếm giao dịch'), 'sang');
    await waitFor(() => expect(screen.queryByText('Mua sam')).toBeNull());
    expect(screen.getByText('An sang')).toBeTruthy();
  });

  it('lets an existing transaction be edited, prefilling its current values', async () => {
    const repos = makeRepos();
    const { account, expenseCategory } = await seedAccountAndCategories(repos);
    const created = await repos.createTransaction.execute({
      type: 'expense',
      amount: 100_000,
      accountId: account.id,
      categoryId: expenseCategory.id,
      date: '2026-08-05',
      name: 'An sang',
    });

    const onSaved = jest.fn();
    const form = render(
      <FormHarness dependencies={repos} onSaved={onSaved} transactionId={created.id} />,
    );

    await waitFor(() => expect(form.getByLabelText(t('transactionFormNoteLabel'))).toBeTruthy());
    fireEvent.changeText(form.getByLabelText(t('transactionFormNoteLabel')), 'An sang o quan moi');
    fireEvent.press(form.getByLabelText(t('transactionFormSave')));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const updated = await repos.transactionRepository.findById(created.id);
    expect(updated?.name).toBe('An sang');
    expect(updated?.note).toBe('An sang o quan moi');
    expect(updated?.amount).toBe(100_000);
  });

  it('saves the compact add form using the note as its name and the first account by default', async () => {
    const repos = makeRepos();
    const { account, expenseCategory } = await seedAccountAndCategories(repos);
    const onSaved = jest.fn();
    const form = render(<FormHarness dependencies={repos} onSaved={onSaved} />);

    await waitFor(() => expect(form.getByText('Danh mục')).toBeTruthy());
    fireEvent.changeText(form.getByLabelText('Số tiền'), '50000');
    fireEvent.press(form.getByRole('button', { name: 'Danh mục' }));
    fireEvent.press(form.getByRole('button', { name: expenseCategory.name }));
    fireEvent.changeText(
      form.getByLabelText('Ghi chú (không bắt buộc)'),
      'Ăn trưa với đồng nghiệp',
    );
    fireEvent.press(form.getByRole('button', { name: 'Lưu giao dịch' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [created] = await repos.transactionRepository.list({});
    expect(created).toEqual(
      expect.objectContaining({
        accountId: account.id,
        categoryId: expenseCategory.id,
        date: '2026-08-25',
        name: 'Ăn trưa với đồng nghiệp',
        note: 'Ăn trưa với đồng nghiệp',
      }),
    );
  });

  it('keeps the note input above the keyboard with keyboard-aware insets', async () => {
    const repos = makeRepos();
    await seedAccountAndCategories(repos);
    const form = render(<FormHarness dependencies={repos} onSaved={() => {}} />);

    await waitFor(() => expect(form.getByText('Danh mục')).toBeTruthy());
    expect(
      form.getByTestId('transaction-form-scroll').props.automaticallyAdjustKeyboardInsets,
    ).toBe(true);
  });

  it('deletes a transaction via view model and restores it via Undo', async () => {
    const repos = makeRepos();
    const { account, expenseCategory } = await seedAccountAndCategories(repos);
    const created = await repos.createTransaction.execute({
      type: 'expense',
      amount: 100_000,
      accountId: account.id,
      categoryId: expenseCategory.id,
      date: '2026-08-05',
      name: 'An sang',
    });

    let viewModel!: ReturnType<typeof useTransactions>;
    function Harness() {
      viewModel = useTransactions({ dependencies: repos, now: () => new Date(NOW), t });
      return (
        <TransactionsScreen
          {...viewModel}
          onAddTransaction={() => {}}
          onBack={() => {}}
          onSelectTransaction={() => {}}
          t={t}
        />
      );
    }

    const screen = render(<Harness />);
    await waitFor(() => expect(screen.getByText('An sang')).toBeTruthy());

    await act(async () => {
      await viewModel.deleteTransaction(created.id);
    });

    await waitFor(() => expect(screen.queryByText('An sang')).toBeNull());
    expect(screen.getByText(t('transactionsDeleteUndoMessage'))).toBeTruthy();

    const [deleted] = await repos.transactionRepository.list({ includeDeleted: true });
    expect(deleted.deletedAt).not.toBeNull();

    fireEvent.press(screen.getByLabelText('Hoàn tác'));

    await waitFor(() => expect(screen.getByText('An sang')).toBeTruthy());
    const [restored] = await repos.transactionRepository.list({ includeDeleted: true });
    expect(restored.deletedAt).toBeNull();
  });

  describe('useTransactionForm recurring toggle', () => {
    it('defaults recurringEnabled to false and only allows enabling it for a new expense', async () => {
      const repos = makeRepos();
      await seedAccountAndCategories(repos);
      let hookResult!: ReturnType<typeof useTransactionForm>;

      function TestComponent() {
        hookResult = useTransactionForm({
          dependencies: repos,
          now: () => new Date(NOW),
          onSaved: () => {},
          t,
        });
        return null;
      }

      render(<TestComponent />);
      await waitFor(() => expect(hookResult.loading).toBe(false));

      expect(hookResult.values.recurringEnabled).toBe(false);
      expect(hookResult.canEnableRecurring).toBe(true);

      act(() => {
        hookResult.setType('income');
      });
      expect(hookResult.canEnableRecurring).toBe(false);
    });

    it('creates a recurring schedule instead of a plain transaction when recurringEnabled is true on save', async () => {
      const repos = makeRepos();
      const { account, expenseCategory } = await seedAccountAndCategories(repos);
      const executeMock = jest.fn().mockResolvedValue({ schedule: {}, occurrence: {} });
      repos.createRecurringExpense = { execute: executeMock } as any;

      let hookResult!: ReturnType<typeof useTransactionForm>;

      function TestComponent() {
        hookResult = useTransactionForm({
          dependencies: repos,
          now: () => new Date(NOW),
          onSaved: () => {},
          t,
        });
        return null;
      }

      render(<TestComponent />);
      await waitFor(() => expect(hookResult.loading).toBe(false));

      act(() => {
        hookResult.setAmount(179000);
        hookResult.setName('YouTube Premium');
        hookResult.setCategoryId(expenseCategory.id);
        hookResult.setAccountId(account.id);
        hookResult.setRecurringEnabled(true);
        hookResult.setRecurringFrequency('monthly');
      });

      await act(async () => {
        await hookResult.submit();
      });

      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction: expect.objectContaining({ amount: 179000, name: 'YouTube Premium' }),
          recurring: expect.objectContaining({
            frequency: 'monthly',
            remindDaysBefore: 1,
            endDate: null,
            occurrenceLimit: null,
          }),
        }),
      );
    });
  });
});
