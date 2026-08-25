import { eq } from 'drizzle-orm';

import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { Transaction } from '@/core/domain/finance/transaction';
import { canonicalizeUuid, isIsoTimestamp, isUuid } from '@/core/domain/sync/sync-operation';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';
import { LocalDatabaseClient } from '@/data/local/db/client';
import {
  toAccountRowValues,
  toCategoryRowValues,
  toTransactionEntity,
  toTransactionRowValues,
} from '@/data/local/repositories/finance-record-mappers';
import { accounts, categories, exampleRecords, transactions } from '@/data/local/schema';

import { parseAccountPayload, parseCategoryPayload, parseTransactionPayload } from './finance-payload-validators';

/**
 * The object `LocalDatabaseClient['db'].transaction()` hands its callback —
 * derived rather than imported from `drizzle-orm` directly so it always
 * matches the concrete `db` type used by this app (including its schema).
 */
type LocalDatabase = LocalDatabaseClient['db'];
type TransactionCallback = Parameters<LocalDatabase['transaction']>[0];
export type SqliteTransaction = TransactionCallback extends (tx: infer Tx) => unknown ? Tx : never;

/**
 * Per-entity-type adapter the sync engine dispatches to for every incoming
 * change. Deliberately independent from the Task 3 application repositories
 * (`AccountRepository`, `CategoryRepository`, `TransactionRepository`):
 * those expose an async, self-transactional CRUD API meant for use-cases,
 * while the sync engine needs synchronous, transaction-scoped reads/writes
 * so a whole package can be applied or rolled back atomically inside one
 * `better-sqlite3` transaction. Reuses the same row mappers those
 * repositories use (`finance-record-mappers.ts`) so the on-disk shape stays
 * identical either way.
 */
export type SyncEntityAdapter<T extends SyncableRecord = SyncableRecord> = {
  /** Validates and canonicalizes an incoming payload against the domain shape. */
  parsePayload(value: unknown): T;
  /** Reads the current local row (if any) within the active import transaction. */
  readLocal(tx: SqliteTransaction, id: string): T | undefined;
  /** Inserts or updates the row within the active import transaction. */
  upsert(tx: SqliteTransaction, record: T): void;
};

function toSyncableRecordValues(record: SyncableRecord) {
  return {
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
    revision: record.revision,
    originDeviceId: record.originDeviceId,
  };
}

export const exampleRecordSyncAdapter: SyncEntityAdapter<SyncableRecord> = {
  parsePayload: parseSyncableRecord,
  readLocal: (tx, id) => tx.select().from(exampleRecords).where(eq(exampleRecords.id, canonicalizeUuid(id))).get(),
  upsert: (tx, record) => {
    tx.insert(exampleRecords)
      .values(record)
      .onConflictDoUpdate({ target: exampleRecords.id, set: toSyncableRecordValues(record) })
      .run();
  },
};

export const accountSyncAdapter: SyncEntityAdapter<Account> = {
  parsePayload: parseAccountPayload,
  readLocal: (tx, id) => tx.select().from(accounts).where(eq(accounts.id, canonicalizeUuid(id))).get(),
  upsert: (tx, record) => {
    const values = toAccountRowValues(record);
    tx.insert(accounts).values(values).onConflictDoUpdate({ target: accounts.id, set: values }).run();
  },
};

export const categorySyncAdapter: SyncEntityAdapter<Category> = {
  parsePayload: parseCategoryPayload,
  readLocal: (tx, id) => tx.select().from(categories).where(eq(categories.id, canonicalizeUuid(id))).get(),
  upsert: (tx, record) => {
    const values = toCategoryRowValues(record);
    tx.insert(categories).values(values).onConflictDoUpdate({ target: categories.id, set: values }).run();
  },
};

export const transactionSyncAdapter: SyncEntityAdapter<Transaction> = {
  parsePayload: parseTransactionPayload,
  readLocal: (tx, id) => {
    const row = tx.select().from(transactions).where(eq(transactions.id, canonicalizeUuid(id))).get();
    return row === undefined ? undefined : toTransactionEntity(row);
  },
  upsert: (tx, record) => {
    const values = toTransactionRowValues(record);
    tx.insert(transactions).values(values).onConflictDoUpdate({ target: transactions.id, set: values }).run();
  },
};

export const defaultSyncEntityAdapters: Record<string, SyncEntityAdapter> = {
  'example-record': exampleRecordSyncAdapter,
  account: accountSyncAdapter,
  category: categorySyncAdapter,
  transaction: transactionSyncAdapter,
};

function parseSyncableRecord(value: unknown): SyncableRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Sync operation payload must be a syncable record');
  }

  const record = value as Record<string, unknown>;
  if (
    !isUuid(record.id) ||
    !isUuid(record.originDeviceId) ||
    !isIsoTimestamp(record.createdAt) ||
    !isIsoTimestamp(record.updatedAt) ||
    (record.deletedAt !== null && !isIsoTimestamp(record.deletedAt)) ||
    typeof record.revision !== 'number' ||
    !Number.isInteger(record.revision) ||
    record.revision < 0
  ) {
    throw new Error('Sync operation payload contains an invalid syncable record');
  }

  return {
    ...record,
    id: canonicalizeUuid(record.id),
    originDeviceId: canonicalizeUuid(record.originDeviceId),
  } as SyncableRecord;
}
