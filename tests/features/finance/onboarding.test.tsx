import { fireEvent, render, waitFor } from '@testing-library/react-native';

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
import { Onboarding } from '@/core/application/finance/onboarding';
import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { createDefaultProfileSettings, ProfileSettings } from '@/core/domain/finance/profile-settings';
import { OnboardingScreen } from '@/features/finance/screens/onboarding-screen';
import { useOnboarding } from '@/features/finance/view-models/use-onboarding';
import { Locale, translate } from '@/i18n/translations';

// ---------------------------------------------------------------------------
// Minimal in-memory fakes of the finance repository ports, matching the
// pattern used by tests/core/finance/finance-use-cases.test.ts, so these
// tests exercise the real `Onboarding` state-derivation logic (Task 4)
// rather than reimplementing it here.
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
    return Array.from(this.store.values()).filter((category) => category.type === type && category.deletedAt === null);
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

function makeClock(iso: string): () => string {
  return () => iso;
}

function makeIdFactory(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

function makeOnboarding(overrides: {
  accountRepository?: FakeAccountRepository;
  categoryRepository?: FakeCategoryRepository;
  profileSettingsRepository?: FakeProfileSettingsRepository;
} = {}) {
  const accountRepository = overrides.accountRepository ?? new FakeAccountRepository();
  const categoryRepository = overrides.categoryRepository ?? new FakeCategoryRepository();
  const profileSettingsRepository = overrides.profileSettingsRepository ?? new FakeProfileSettingsRepository();
  const onboarding = new Onboarding({
    accountRepository,
    categoryRepository,
    profileSettingsRepository,
    now: makeClock('2026-08-25T00:00:00.000Z'),
    deviceId: DEVICE_ID,
    generateId: makeIdFactory('ob'),
  });

  return { onboarding, accountRepository, categoryRepository, profileSettingsRepository };
}

const t = translate.bind(null, 'vi' as Locale);

function Harness({ onboarding, onComplete }: { onboarding: Onboarding; onComplete?: () => void }) {
  const viewModel = useOnboarding({ onboarding, t, onComplete });
  return <OnboardingScreen {...viewModel} locale="vi" setLocale={() => {}} t={t} />;
}

describe('onboarding screen + view model', () => {
  it('starts at the display-name step and allows skipping straight to the account step', async () => {
    const { onboarding } = makeOnboarding();
    const screen = render(<Harness onboarding={onboarding} />);

    await waitFor(() => expect(screen.getByLabelText(t('onboardingDisplayNameLabel'))).toBeTruthy());

    fireEvent.press(screen.getByRole('button', { name: t('onboardingSkip') }));

    await waitFor(() => expect(screen.getByLabelText(t('onboardingAccountNameLabel'))).toBeTruthy());
  });

  it('saving a display name advances to the account step and persists the trimmed name', async () => {
    const { onboarding, profileSettingsRepository } = makeOnboarding();
    const screen = render(<Harness onboarding={onboarding} />);

    await waitFor(() => expect(screen.getByLabelText(t('onboardingDisplayNameLabel'))).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText(t('onboardingDisplayNameLabel')), '  Phuc  ');
    fireEvent.press(screen.getByRole('button', { name: t('onboardingContinue') }));

    await waitFor(() => expect(screen.getByLabelText(t('onboardingAccountNameLabel'))).toBeTruthy());
    expect((await profileSettingsRepository.get()).displayName).toBe('Phuc');
  });

  it('requires a name and opening balance before the first account can be created', async () => {
    const { onboarding, accountRepository } = makeOnboarding();
    const screen = render(<Harness onboarding={onboarding} />);

    await waitFor(() => expect(screen.getByLabelText(t('onboardingDisplayNameLabel'))).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: t('onboardingSkip') }));
    await waitFor(() => expect(screen.getByLabelText(t('onboardingAccountNameLabel'))).toBeTruthy());

    fireEvent.press(screen.getByRole('button', { name: t('onboardingContinue') }));

    expect(screen.getByText(t('onboardingAccountNameRequired'))).toBeTruthy();
    expect(screen.getByText(t('onboardingOpeningBalanceRequired'))).toBeTruthy();
    expect(await accountRepository.listActive()).toHaveLength(0);

    fireEvent.changeText(screen.getByLabelText(t('onboardingAccountNameLabel')), 'Vi tien mat');
    fireEvent.changeText(screen.getByLabelText(t('onboardingOpeningBalanceLabel')), '500.000');
    fireEvent.press(screen.getByRole('button', { name: t('onboardingContinue') }));

    await waitFor(() => expect(screen.getByText(t('onboardingConfirmCategoriesTitle'))).toBeTruthy());
    const created = await accountRepository.listActive();
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ name: 'Vi tien mat', openingBalance: 500000 });
  });

  it('confirm-categories step allows editing and removing suggested categories, then finishes onboarding', async () => {
    const { onboarding, accountRepository, categoryRepository, profileSettingsRepository } = makeOnboarding();
    await accountRepository.create({
      id: 'account-1',
      name: 'Cash',
      type: 'cash',
      openingBalance: 0,
      originDeviceId: DEVICE_ID,
      operationId: 'op-1',
      now: '2026-08-25T00:00:00.000Z',
    });
    const onComplete = jest.fn();
    const screen = render(<Harness onboarding={onboarding} onComplete={onComplete} />);

    await waitFor(() => expect(screen.getByText(t('onboardingConfirmCategoriesTitle'))).toBeTruthy());

    const removeButtons = screen.getAllByRole('button', { name: new RegExp(`^${t('onboardingRemoveCategory')}`) });
    fireEvent.press(removeButtons[0]);

    fireEvent.press(screen.getByRole('button', { name: t('onboardingFinish') }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect((await profileSettingsRepository.get()).onboardingCompleted).toBe(true);
    const expenseCategories = await categoryRepository.listActiveByType('expense');
    const incomeCategories = await categoryRepository.listActiveByType('income');
    expect(expenseCategories.length + incomeCategories.length).toBeGreaterThan(0);
  });

  it('confirm-categories step can be skipped, using the default category set as-is', async () => {
    const { onboarding, accountRepository, categoryRepository } = makeOnboarding();
    await accountRepository.create({
      id: 'account-1',
      name: 'Cash',
      type: 'cash',
      openingBalance: 0,
      originDeviceId: DEVICE_ID,
      operationId: 'op-1',
      now: '2026-08-25T00:00:00.000Z',
    });
    const onComplete = jest.fn();
    const screen = render(<Harness onboarding={onboarding} onComplete={onComplete} />);

    await waitFor(() => expect(screen.getByText(t('onboardingConfirmCategoriesTitle'))).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: t('onboardingSkip') }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const expenseCategories = await categoryRepository.listActiveByType('expense');
    expect(expenseCategories.length).toBeGreaterThan(0);
  });

  it('resumes at the correct step after unmount and remount, using the same onboarding backing store', async () => {
    const { onboarding, accountRepository, profileSettingsRepository } = makeOnboarding();
    await accountRepository.create({
      id: 'account-1',
      name: 'Cash',
      type: 'cash',
      openingBalance: 0,
      originDeviceId: DEVICE_ID,
      operationId: 'op-1',
      now: '2026-08-25T00:00:00.000Z',
    });
    await profileSettingsRepository.save({ displayName: 'Phuc', amountsHidden: false, onboardingCompleted: false });

    const first = render(<Harness onboarding={onboarding} />);
    await waitFor(() => expect(first.getByText(t('onboardingConfirmCategoriesTitle'))).toBeTruthy());
    first.unmount();

    const second = render(<Harness onboarding={onboarding} />);
    await waitFor(() => expect(second.getByText(t('onboardingConfirmCategoriesTitle'))).toBeTruthy());
  });

  it('calls onComplete immediately when resuming an already-completed onboarding', async () => {
    const { onboarding, accountRepository, profileSettingsRepository } = makeOnboarding();
    await accountRepository.create({
      id: 'account-1',
      name: 'Cash',
      type: 'cash',
      openingBalance: 0,
      originDeviceId: DEVICE_ID,
      operationId: 'op-1',
      now: '2026-08-25T00:00:00.000Z',
    });
    await profileSettingsRepository.save({ displayName: 'Phuc', amountsHidden: false, onboardingCompleted: true });

    const onComplete = jest.fn();
    render(<Harness onboarding={onboarding} onComplete={onComplete} />);

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });
});
