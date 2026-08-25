import { Account, AccountType } from '@/core/domain/finance/account';
import { Category, CategoryType } from '@/core/domain/finance/category';
import { Transaction, TransactionInput, validateTransactionInput } from '@/core/domain/finance/transaction';
import { canonicalizeUuid, isIsoTimestamp, isUuid } from '@/core/domain/sync/sync-operation';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';

/**
 * Pure, DB-free payload validators for the finance sync entity types. Each
 * validator checks the generic `SyncableRecord` envelope (the same checks
 * `sync-engine.ts` already applies to `example-record`) and then the
 * entity-specific domain shape, throwing a descriptive `Error` for any
 * violation so `SyncEngine` can reject the whole package before it writes
 * anything.
 */

const ACCOUNT_TYPES: readonly AccountType[] = ['cash', 'bank', 'e-wallet', 'credit-card', 'other'];
const CATEGORY_TYPES: readonly CategoryType[] = ['income', 'expense'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function parseSyncableEnvelope(value: unknown): { fields: Record<string, unknown>; base: SyncableRecord } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Sync operation payload must be a syncable record');
  }

  const fields = value as Record<string, unknown>;
  if (
    !isUuid(fields.id) ||
    !isUuid(fields.originDeviceId) ||
    !isIsoTimestamp(fields.createdAt) ||
    !isIsoTimestamp(fields.updatedAt) ||
    (fields.deletedAt !== null && !isIsoTimestamp(fields.deletedAt)) ||
    typeof fields.revision !== 'number' ||
    !Number.isInteger(fields.revision) ||
    fields.revision < 0
  ) {
    throw new Error('Sync operation payload contains an invalid syncable record');
  }

  return {
    fields,
    base: {
      id: canonicalizeUuid(fields.id),
      originDeviceId: canonicalizeUuid(fields.originDeviceId),
      createdAt: fields.createdAt,
      updatedAt: fields.updatedAt,
      deletedAt: fields.deletedAt as string | null,
      revision: fields.revision,
    },
  };
}

export function parseAccountPayload(value: unknown): Account {
  const { fields, base } = parseSyncableEnvelope(value);

  if (!isNonEmptyString(fields.name)) {
    throw new Error('Account payload name must not be empty');
  }
  if (typeof fields.type !== 'string' || !ACCOUNT_TYPES.includes(fields.type as AccountType)) {
    throw new Error('Account payload type is invalid');
  }
  if (typeof fields.openingBalance !== 'number' || !Number.isInteger(fields.openingBalance)) {
    throw new Error('Account payload openingBalance must be an integer');
  }
  if (typeof fields.isArchived !== 'boolean') {
    throw new Error('Account payload isArchived must be a boolean');
  }

  return {
    ...base,
    name: fields.name,
    type: fields.type as AccountType,
    openingBalance: fields.openingBalance,
    isArchived: fields.isArchived,
  };
}

export function parseCategoryPayload(value: unknown): Category {
  const { fields, base } = parseSyncableEnvelope(value);

  if (!isNonEmptyString(fields.name)) {
    throw new Error('Category payload name must not be empty');
  }
  if (typeof fields.type !== 'string' || !CATEGORY_TYPES.includes(fields.type as CategoryType)) {
    throw new Error('Category payload type is invalid');
  }
  if (typeof fields.isArchived !== 'boolean') {
    throw new Error('Category payload isArchived must be a boolean');
  }

  return {
    ...base,
    name: fields.name,
    type: fields.type as CategoryType,
    isArchived: fields.isArchived,
  };
}

export function parseTransactionPayload(value: unknown): Transaction {
  const { fields, base } = parseSyncableEnvelope(value);

  const input: TransactionInput = {
    type: fields.type as TransactionInput['type'],
    amount: fields.amount as number,
    accountId: fields.accountId as string,
    destinationAccountId: (fields.destinationAccountId as string | null | undefined) ?? null,
    categoryId: (fields.categoryId as string | null | undefined) ?? null,
    date: fields.date as string,
    name: fields.name as string,
    note: (fields.note as string | null | undefined) ?? null,
  };

  // Reuses the Task 1 domain validator rather than re-deriving
  // transaction-shape rules here; it throws a descriptive Error on any
  // violation (wrong type enum, missing categoryId for income/expense,
  // missing/duplicate destinationAccountId for transfers, etc).
  validateTransactionInput(input);

  const common = {
    ...base,
    amount: input.amount,
    accountId: input.accountId,
    date: input.date,
    name: input.name,
    note: input.note ?? null,
  };

  if (input.type === 'transfer') {
    return {
      ...common,
      type: 'transfer',
      destinationAccountId: input.destinationAccountId as string,
      categoryId: null,
    };
  }

  return {
    ...common,
    type: input.type,
    categoryId: input.categoryId as string,
    destinationAccountId: null,
  };
}
