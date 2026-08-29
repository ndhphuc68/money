import { randomUUID } from 'expo-crypto';

import { CreateAccount } from '@/core/application/finance/create-account';
import { CreateTransaction } from '@/core/application/finance/create-transaction';
import { DeleteTransaction } from '@/core/application/finance/delete-transaction';
import { GetDashboard } from '@/core/application/finance/get-dashboard';
import { GetReport } from '@/core/application/finance/get-report';
import {
  CreateCategory,
  HideCategory,
  ListCategories,
  UpdateCategory,
} from '@/core/application/finance/manage-categories';
import { Onboarding } from '@/core/application/finance/onboarding';
import { RestoreTransaction } from '@/core/application/finance/restore-transaction';
import { UpdateTransaction } from '@/core/application/finance/update-transaction';
import { WriteContext } from '@/core/application/ports/finance-repositories';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { AccountRepository } from '@/data/local/repositories/account-repository';
import { CategoryRepository } from '@/data/local/repositories/category-repository';
import { ProfileSettingsRepository } from '@/data/local/repositories/profile-settings-repository';
import { TransactionRepository } from '@/data/local/repositories/transaction-repository';
import { DeviceIdentity } from '@/infrastructure/expo/device-identity/device-identity';

export type FinanceDependencies = {
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
  profileSettingsRepository: ProfileSettingsRepository;
  createAccount: CreateAccount;
  createTransaction: CreateTransaction;
  updateTransaction: UpdateTransaction;
  deleteTransaction: DeleteTransaction;
  restoreTransaction: RestoreTransaction;
  getDashboard: GetDashboard;
  getReport: GetReport;
  createCategory: CreateCategory;
  updateCategory: UpdateCategory;
  hideCategory: HideCategory;
  listCategories: ListCategories;
  onboarding: Onboarding;
  /**
   * Builds a fresh `WriteContext` (origin device id, a new operation id, and
   * "now") for a syncable write that has no dedicated Task 4 use case of its
   * own — currently only account hide/deactivate (Task 9), which calls
   * `accountRepository.softDeleteOrHide` directly since no `manage-accounts`
   * use case exists yet. Mirrors the private `writeContext()` helper in
   * `manage-categories.ts`.
   */
  buildWriteContext(): WriteContext;
};

/**
 * Composes every Task 3 finance repository and Task 4 use case for a single
 * `LocalDatabaseClient`, wiring the shared `now`/`deviceId`/id-generation
 * dependencies each use case expects. Mirrors the composition pattern of
 * `createMobileSyncDependencies` (see
 * `src/infrastructure/expo/sync/create-mobile-sync-dependencies.ts`).
 *
 * Async (unlike its sync-dependencies sibling) because resolving a stable
 * device identity via `DeviceIdentity.get()` touches secure storage; callers
 * should call this once per database instance and reuse the result.
 */
export async function createFinanceDependencies(
  database: LocalDatabaseClient,
): Promise<FinanceDependencies> {
  const now = () => new Date().toISOString();
  const generateId = () => randomUUID();
  const deviceId = await new DeviceIdentity().get();
  const shared = { now, deviceId, generateId };

  const accountRepository = new AccountRepository(database);
  const categoryRepository = new CategoryRepository(database);
  const transactionRepository = new TransactionRepository(database);
  const profileSettingsRepository = new ProfileSettingsRepository(database);

  return {
    accountRepository,
    categoryRepository,
    transactionRepository,
    profileSettingsRepository,
    createAccount: new CreateAccount({ accountRepository, ...shared }),
    createTransaction: new CreateTransaction({ transactionRepository, ...shared }),
    updateTransaction: new UpdateTransaction({ transactionRepository, ...shared }),
    deleteTransaction: new DeleteTransaction({ transactionRepository, ...shared }),
    restoreTransaction: new RestoreTransaction({ transactionRepository, ...shared }),
    getDashboard: new GetDashboard({ accountRepository, transactionRepository }),
    getReport: new GetReport({ transactionRepository }),
    createCategory: new CreateCategory({ categoryRepository, ...shared }),
    updateCategory: new UpdateCategory({ categoryRepository, ...shared }),
    hideCategory: new HideCategory({ categoryRepository, ...shared }),
    listCategories: new ListCategories({ categoryRepository }),
    onboarding: new Onboarding({
      accountRepository,
      categoryRepository,
      profileSettingsRepository,
      ...shared,
    }),
    buildWriteContext: (): WriteContext => ({
      originDeviceId: deviceId,
      operationId: generateId(),
      now: now(),
    }),
  };
}
