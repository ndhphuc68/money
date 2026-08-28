import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

import {
  AccountRepository,
  CategoryRepository,
  CreateAccountInput,
  CreateCategoryInput,
  ProfileSettingsRepository,
  UpdateAccountInput,
  UpdateCategoryInput,
  WriteContext,
} from '@/core/application/ports/finance-repositories';
import { CreateAccount } from '@/core/application/finance/create-account';
import { CreateCategory, HideCategory, UpdateCategory } from '@/core/application/finance/manage-categories';
import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { createDefaultProfileSettings, ProfileSettings } from '@/core/domain/finance/profile-settings';
import { AccountsScreen } from '@/features/finance/screens/accounts-screen';
import { CategoriesScreen } from '@/features/finance/screens/categories-screen';
import { useSettings } from '@/features/finance/view-models/use-settings';
import { Locale, translate } from '@/i18n/translations';

// ---------------------------------------------------------------------------
// Minimal in-memory fakes, matching the pattern in
// tests/features/finance/dashboard.test.tsx, but with real (not stubbed)
// update/hide logic since these tests assert on the resulting state.
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

  async update(id: string, changes: UpdateAccountInput, context: WriteContext): Promise<Account> {
    const existing = this.requireById(id);
    const updated: Account = { ...existing, ...changes, updatedAt: context.now, revision: existing.revision + 1 };
    this.store.set(id, updated);
    return updated;
  }

  async softDeleteOrHide(id: string, context: WriteContext): Promise<Account> {
    const existing = this.requireById(id);
    const updated: Account = { ...existing, isArchived: true, deletedAt: context.now, updatedAt: context.now, revision: existing.revision + 1 };
    this.store.set(id, updated);
    return updated;
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
    const updated: Category = { ...existing, isArchived: true, deletedAt: context.now, updatedAt: context.now, revision: existing.revision + 1 };
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
    return true;
  }

  async saveWithOperation(): Promise<void> {
    throw new Error('not implemented');
  }

  private requireById(id: string): Category {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Category ${id} not found`);
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

function makeIdFactory(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

const t = translate.bind(null, 'vi' as Locale);

function makeDependencies() {
  const accountRepository = new FakeAccountRepository();
  const categoryRepository = new FakeCategoryRepository();
  const profileSettingsRepository = new FakeProfileSettingsRepository();
  const generateId = makeIdFactory('id');
  const now = () => NOW;
  const shared = { now, deviceId: DEVICE_ID, generateId };

  return {
    accountRepository,
    categoryRepository,
    profileSettingsRepository,
    createAccount: new CreateAccount({ accountRepository, ...shared }),
    createCategory: new CreateCategory({ categoryRepository, ...shared }),
    updateCategory: new UpdateCategory({ categoryRepository, ...shared }),
    hideCategory: new HideCategory({ categoryRepository, ...shared }),
    buildWriteContext: (): WriteContext => ({ originDeviceId: DEVICE_ID, operationId: generateId(), now: now() }),
  };
}

type Dependencies = ReturnType<typeof makeDependencies>;

function AccountsHarness({ dependencies }: { dependencies: Dependencies }) {
  const viewModel = useSettings({ dependencies, t });
  return <AccountsScreen {...viewModel} onBack={() => {}} t={t} />;
}

function CategoriesHarness({ dependencies }: { dependencies: Dependencies }) {
  const viewModel = useSettings({ dependencies, t });
  return <CategoriesScreen {...viewModel} onBack={() => {}} t={t} />;
}

async function seedAccountAndCategory(dependencies: Dependencies) {
  const account = await dependencies.createAccount.execute({ name: 'Vi tien mat', type: 'cash', openingBalance: 1_000_000 });
  const category = await dependencies.createCategory.execute({ name: 'An uong', type: 'expense' });
  return { account, category };
}

describe('settings screen + view model', () => {
  it('creates a new account with a name, type and opening balance', async () => {
    const dependencies = makeDependencies();
    const screen = render(<AccountsHarness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByLabelText(t('accountsNameLabel'))).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText(t('accountsNameLabel')), 'Ngan hang');
    fireEvent.press(screen.getByLabelText(t('onboardingAccountTypeBank')));
    fireEvent.changeText(screen.getByLabelText(t('accountsOpeningBalanceLabel')), '2.000.000');
    fireEvent.press(screen.getByLabelText(t('accountsAdd')));

    await waitFor(() => expect(screen.getByText('Ngan hang')).toBeTruthy());
    const stored = await dependencies.accountRepository.listActive();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: 'Ngan hang', type: 'bank', openingBalance: 2_000_000 });
  });

  it('hides (deactivates) an account, removing it from the active list', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((button) => button.style === 'destructive');
      confirm?.onPress?.();
    });

    const dependencies = makeDependencies();
    const { account } = await seedAccountAndCategory(dependencies);
    const screen = render(<AccountsHarness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(account.name)).toBeTruthy());
    fireEvent.press(screen.getByLabelText(t('accountsHideLabel', { name: account.name })));
    expect(alertSpy).toHaveBeenCalled();

    await waitFor(() => expect(screen.queryByText(account.name)).toBeNull());
    const stored = await dependencies.accountRepository.listActive();
    expect(stored).toHaveLength(0);

    alertSpy.mockRestore();
  });

  it('edits a category name (never offering physical deletion)', async () => {
    const dependencies = makeDependencies();
    const { category } = await seedAccountAndCategory(dependencies);
    const screen = render(<CategoriesHarness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(category.name)).toBeTruthy());
    expect(screen.queryByLabelText(t('categoriesDeleteLabel', { name: category.name }))).toBeNull();

    fireEvent.press(screen.getByLabelText(t('categoriesEditLabel', { name: category.name })));
    fireEvent.changeText(screen.getByLabelText(t('categoriesNameLabel')), 'An uong ngoai');
    fireEvent.press(screen.getByLabelText(t('categoriesSave')));

    await waitFor(() => expect(screen.getByText('An uong ngoai')).toBeTruthy());
    const updated = await dependencies.categoryRepository.findById(category.id);
    expect(updated?.name).toBe('An uong ngoai');
  });

  it('hides a category that is currently used by a transaction, instead of deleting it', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((button) => button.style === 'destructive');
      confirm?.onPress?.();
    });

    const dependencies = makeDependencies();
    const { category } = await seedAccountAndCategory(dependencies);
    const screen = render(<CategoriesHarness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(category.name)).toBeTruthy());
    fireEvent.press(screen.getByLabelText(t('categoriesHideLabel', { name: category.name })));
    expect(alertSpy).toHaveBeenCalled();

    await waitFor(() => expect(screen.queryByText(category.name)).toBeNull());
    const stored = await dependencies.categoryRepository.listActiveByType('expense');
    expect(stored).toHaveLength(0);
    // Not physically deleted: still resolvable by id (the repository layer only ever archives).
    const stillExists = await dependencies.categoryRepository.findById(category.id);
    expect(stillExists).not.toBeNull();

    alertSpy.mockRestore();
  });
});
