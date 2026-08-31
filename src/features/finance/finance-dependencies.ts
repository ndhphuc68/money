import { randomUUID } from 'expo-crypto';

import { ConfirmRecurringOccurrence } from '@/core/application/finance/confirm-recurring-occurrence';
import { CreateAccount } from '@/core/application/finance/create-account';
import { CreateRecurringExpense } from '@/core/application/finance/create-recurring-expense';
import { CreateTransaction } from '@/core/application/finance/create-transaction';
import { DeleteTransaction } from '@/core/application/finance/delete-transaction';
import { GetDashboard } from '@/core/application/finance/get-dashboard';
import { GetRecurringOverview } from '@/core/application/finance/get-recurring-overview';
import { GetReport } from '@/core/application/finance/get-report';
import {
  CreateCategory,
  HideCategory,
  ListCategories,
  UpdateCategory,
} from '@/core/application/finance/manage-categories';
import {
  EndRecurringSchedule,
  PauseRecurringSchedule,
  ResumeRecurringSchedule,
  UpdateRecurringSchedule,
} from '@/core/application/finance/manage-recurring-schedule';
import { Onboarding } from '@/core/application/finance/onboarding';
import { RestoreTransaction } from '@/core/application/finance/restore-transaction';
import { SkipRecurringOccurrence } from '@/core/application/finance/skip-recurring-occurrence';
import { ScanAndScheduleRecurringNotifications } from '@/core/application/finance/sync-recurring-notifications';
import { UpdateTransaction } from '@/core/application/finance/update-transaction';
import { WriteContext } from '@/core/application/ports/finance-repositories';
import { NotificationScheduler } from '@/core/application/ports/notification-scheduler';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { AccountRepository } from '@/data/local/repositories/account-repository';
import { CategoryRepository } from '@/data/local/repositories/category-repository';
import { ProfileSettingsRepository } from '@/data/local/repositories/profile-settings-repository';
import { RecurringOccurrenceProcessingRepository } from '@/data/local/repositories/recurring-occurrence-processing-repository';
import { RecurringOccurrenceRepository } from '@/data/local/repositories/recurring-occurrence-repository';
import { RecurringScheduleRepository } from '@/data/local/repositories/recurring-schedule-repository';
import { TransactionRepository } from '@/data/local/repositories/transaction-repository';
import { DeviceIdentity } from '@/infrastructure/expo/device-identity/device-identity';
import { RecurringNotificationScheduler } from '@/infrastructure/expo/notifications/recurring-notification-scheduler';

export type FinanceDependencies = {
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
  profileSettingsRepository: ProfileSettingsRepository;
  recurringScheduleRepository: RecurringScheduleRepository;
  recurringOccurrenceRepository: RecurringOccurrenceRepository;
  recurringOccurrenceProcessing: RecurringOccurrenceProcessingRepository;
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
  createRecurringExpense: CreateRecurringExpense;
  confirmRecurringOccurrence: ConfirmRecurringOccurrence;
  skipRecurringOccurrence: SkipRecurringOccurrence;
  pauseRecurringSchedule: PauseRecurringSchedule;
  resumeRecurringSchedule: ResumeRecurringSchedule;
  endRecurringSchedule: EndRecurringSchedule;
  updateRecurringSchedule: UpdateRecurringSchedule;
  getRecurringOverview: GetRecurringOverview;
  notificationScheduler: NotificationScheduler;
  scanAndScheduleRecurringNotifications: ScanAndScheduleRecurringNotifications;
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
  const recurringScheduleRepository = new RecurringScheduleRepository(database);
  const recurringOccurrenceRepository = new RecurringOccurrenceRepository(database);
  const recurringOccurrenceProcessing = new RecurringOccurrenceProcessingRepository(database);
  const notificationScheduler = new RecurringNotificationScheduler();

  return {
    accountRepository,
    categoryRepository,
    transactionRepository,
    profileSettingsRepository,
    recurringScheduleRepository,
    recurringOccurrenceRepository,
    recurringOccurrenceProcessing,
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
    createRecurringExpense: new CreateRecurringExpense({
      processing: recurringOccurrenceProcessing,
      ...shared,
    }),
    confirmRecurringOccurrence: new ConfirmRecurringOccurrence({
      processing: recurringOccurrenceProcessing,
      occurrenceRepository: recurringOccurrenceRepository,
      scheduleRepository: recurringScheduleRepository,
      ...shared,
    }),
    skipRecurringOccurrence: new SkipRecurringOccurrence({
      processing: recurringOccurrenceProcessing,
      occurrenceRepository: recurringOccurrenceRepository,
      ...shared,
    }),
    pauseRecurringSchedule: new PauseRecurringSchedule({
      scheduleRepository: recurringScheduleRepository,
      ...shared,
    }),
    resumeRecurringSchedule: new ResumeRecurringSchedule({
      scheduleRepository: recurringScheduleRepository,
      ...shared,
    }),
    endRecurringSchedule: new EndRecurringSchedule({
      scheduleRepository: recurringScheduleRepository,
      ...shared,
    }),
    updateRecurringSchedule: new UpdateRecurringSchedule({
      scheduleRepository: recurringScheduleRepository,
      occurrenceRepository: recurringOccurrenceRepository,
      ...shared,
    }),
    getRecurringOverview: new GetRecurringOverview({
      scheduleRepository: recurringScheduleRepository,
      occurrenceRepository: recurringOccurrenceRepository,
    }),
    notificationScheduler,
    scanAndScheduleRecurringNotifications: new ScanAndScheduleRecurringNotifications({
      occurrenceRepository: recurringOccurrenceRepository,
      scheduleRepository: recurringScheduleRepository,
      notificationScheduler,
      ...shared,
    }),
    buildWriteContext: (): WriteContext => ({
      originDeviceId: deviceId,
      operationId: generateId(),
      now: now(),
    }),
  };
}
