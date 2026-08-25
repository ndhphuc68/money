import { Account, AccountType } from '@/core/domain/finance/account';
import { Category, CategoryType } from '@/core/domain/finance/category';
import { ProfileSettings } from '@/core/domain/finance/profile-settings';
import { Transaction, TransactionInput, TransactionType } from '@/core/domain/finance/transaction';
import { SyncOperation } from '@/core/domain/sync/sync-operation';

/**
 * Caller-supplied identifiers/timestamps for a syncable write. The
 * repository is responsible for bumping `revision` and building the
 * `SyncOperation`, but id generation and "now" belong to the caller so that
 * repositories stay deterministic and easy to test.
 */
export type WriteContext = {
  originDeviceId: string;
  operationId: string;
  now: string;
};

export type CreateAccountInput = WriteContext & {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
};

export type UpdateAccountInput = {
  name?: string;
  type?: AccountType;
  openingBalance?: number;
};

export interface AccountRepository {
  create(input: CreateAccountInput): Promise<Account>;
  update(id: string, changes: UpdateAccountInput, context: WriteContext): Promise<Account>;
  /**
   * Archives (hides) the account when it is referenced by any transaction,
   * otherwise soft-deletes (tombstones) it. Never performs a physical delete.
   */
  softDeleteOrHide(id: string, context: WriteContext): Promise<Account>;
  findById(id: string): Promise<Account | null>;
  listActive(): Promise<Account[]>;
  saveWithOperation(record: Account, operation: SyncOperation): Promise<void>;
}

export type CreateCategoryInput = WriteContext & {
  id: string;
  name: string;
  type: CategoryType;
};

export type UpdateCategoryInput = {
  name?: string;
  type?: CategoryType;
};

export interface CategoryRepository {
  create(input: CreateCategoryInput): Promise<Category>;
  update(id: string, changes: UpdateCategoryInput, context: WriteContext): Promise<Category>;
  /** Archives (hides) the category. Physical deletion is never exposed by this repository. */
  hide(id: string, context: WriteContext): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  listActiveByType(type: CategoryType): Promise<Category[]>;
  /** True when any transaction (active or soft-deleted) references this category. */
  isUsedByTransaction(id: string): Promise<boolean>;
  saveWithOperation(record: Category, operation: SyncOperation): Promise<void>;
}

export type CreateTransactionInput = WriteContext & TransactionInput & { id: string };

export type UpdateTransactionInput = Partial<TransactionInput>;

export type TransactionListFilter = {
  /** Inclusive ISO calendar date (YYYY-MM-DD) lower bound. */
  from?: string;
  /** Inclusive ISO calendar date (YYYY-MM-DD) upper bound. */
  to?: string;
  /** Convenience filter for a whole calendar month, formatted YYYY-MM. */
  month?: string;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  /** Case-insensitive substring match against the transaction name. */
  query?: string;
  /** When true, includes soft-deleted transactions. Defaults to false. */
  includeDeleted?: boolean;
};

export interface TransactionRepository {
  create(input: CreateTransactionInput): Promise<Transaction>;
  update(id: string, changes: UpdateTransactionInput, context: WriteContext): Promise<Transaction>;
  softDelete(id: string, context: WriteContext): Promise<Transaction>;
  restore(id: string, context: WriteContext): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  list(filter?: TransactionListFilter): Promise<Transaction[]>;
  saveWithOperation(record: Transaction, operation: SyncOperation): Promise<void>;
}

export interface ProfileSettingsRepository {
  get(): Promise<ProfileSettings>;
  save(settings: ProfileSettings): Promise<void>;
}
