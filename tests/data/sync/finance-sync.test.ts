import { sql } from 'drizzle-orm';

import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { Transaction } from '@/core/domain/finance/transaction';
import { SyncOperation, SyncOperationKind } from '@/core/domain/sync/sync-operation';
import { SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';
import { openTestLocalDatabase } from '@/data/local/db/client';
import { AccountRepository } from '@/data/local/repositories/account-repository';
import { CategoryRepository } from '@/data/local/repositories/category-repository';
import { ChangeLogRepository } from '@/data/local/repositories/change-log-repository';
import { TransactionRepository } from '@/data/local/repositories/transaction-repository';
import { StableSyncPackageSerializer } from '@/data/sync/serializers/sync-package-serializer';
import { SyncEngine } from '@/data/sync/sync-engine/sync-engine';

const sourceDeviceId = '550e8400-e29b-41d4-a716-446655440001';
const localDeviceId = '550e8400-e29b-41d4-a716-446655440002';
const serializer = new StableSyncPackageSerializer();

const accountId = '660e8400-e29b-41d4-a716-446655440010';
const destinationAccountId = '660e8400-e29b-41d4-a716-446655440011';
const incomeCategoryId = '660e8400-e29b-41d4-a716-446655440012';
const expenseCategoryId = '660e8400-e29b-41d4-a716-446655440013';
const incomeTransactionId = '660e8400-e29b-41d4-a716-446655440014';
const expenseTransactionId = '660e8400-e29b-41d4-a716-446655440015';
const transferTransactionId = '660e8400-e29b-41d4-a716-446655440016';

function accountRecord(overrides: Partial<Account> = {}): Account {
  return {
    id: accountId,
    name: 'Cash Wallet',
    type: 'cash',
    openingBalance: 500000,
    isArchived: false,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: sourceDeviceId,
    ...overrides,
  };
}

function destinationAccountRecord(overrides: Partial<Account> = {}): Account {
  return accountRecord({
    id: destinationAccountId,
    name: 'Bank Account',
    type: 'bank',
    openingBalance: 0,
    ...overrides,
  });
}

function categoryRecord(overrides: Partial<Category> = {}): Category {
  return {
    id: incomeCategoryId,
    name: 'Salary',
    type: 'income',
    isArchived: false,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: sourceDeviceId,
    ...overrides,
  };
}

function expenseCategoryRecord(overrides: Partial<Category> = {}): Category {
  return categoryRecord({
    id: expenseCategoryId,
    name: 'Groceries',
    type: 'expense',
    ...overrides,
  });
}

function incomeTransactionRecord(overrides: Record<string, unknown> = {}): Transaction {
  return {
    id: incomeTransactionId,
    type: 'income',
    amount: 2000000,
    accountId,
    categoryId: incomeCategoryId,
    destinationAccountId: null,
    date: '2026-08-24',
    name: 'Monthly salary',
    note: null,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: sourceDeviceId,
    ...overrides,
  } as Transaction;
}

function expenseTransactionRecord(overrides: Record<string, unknown> = {}): Transaction {
  return incomeTransactionRecord({
    id: expenseTransactionId,
    type: 'expense',
    amount: 150000,
    categoryId: expenseCategoryId,
    name: 'Weekly groceries',
    ...overrides,
  });
}

function transferTransactionRecord(overrides: Record<string, unknown> = {}): Transaction {
  return {
    id: transferTransactionId,
    type: 'transfer',
    amount: 300000,
    accountId,
    destinationAccountId,
    categoryId: null,
    date: '2026-08-24',
    name: 'Move to bank',
    note: null,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: sourceDeviceId,
    ...overrides,
  } as Transaction;
}

function operationFor(
  entityType: string,
  payload: SyncableRecord,
  overrides: Partial<SyncOperation> = {},
): SyncOperation {
  const kind: SyncOperationKind =
    overrides.operation ?? (payload.deletedAt === null ? 'create' : 'delete');

  return {
    operationId: overrides.operationId ?? payload.id,
    entityType,
    entityId: payload.id,
    operation: kind,
    payload,
    originDeviceId: payload.originDeviceId,
    revision: payload.revision,
    createdAt: payload.updatedAt,
    ...overrides,
  };
}

function pkg(
  changes: SyncOperation[],
  overrides: Partial<SyncPackageWithoutAuth> = {},
): SyncPackageWithoutAuth {
  return serializer.withChecksum({
    format: 'app-sync',
    formatVersion: 2,
    appVersion: '1.0.0',
    schemaVersion: 1,
    sourceDeviceId,
    exportedAt: '2026-08-24T10:10:00.000Z',
    changes,
    ...overrides,
  });
}

describe('SyncEngine — finance entities', () => {
  let database: Awaited<ReturnType<typeof openTestLocalDatabase>>;
  let accountRepo: AccountRepository;
  let categoryRepo: CategoryRepository;
  let transactionRepo: TransactionRepository;
  let changes: ChangeLogRepository;
  let engine: SyncEngine;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    accountRepo = new AccountRepository(database);
    categoryRepo = new CategoryRepository(database);
    transactionRepo = new TransactionRepository(database);
    changes = new ChangeLogRepository(database);
    engine = new SyncEngine({
      database,
      changes,
      serializer,
      appVersion: '1.0.0',
      schemaVersion: 1,
      sourceDeviceId: localDeviceId,
      now: () => '2026-08-24T10:10:00.000Z',
    });
  });

  afterEach(async () => {
    await database.close();
  });

  it('imports one account, one category, one income, one expense, and one transfer transaction in a single package', async () => {
    const account = accountRecord();
    const destination = destinationAccountRecord();
    const incomeCategory = categoryRecord();
    const expenseCategory = expenseCategoryRecord();
    const income = incomeTransactionRecord();
    const expense = expenseTransactionRecord();
    const transfer = transferTransactionRecord();

    // Accounts/categories must be applied before the transactions that
    // reference them, since transactions.account_id/category_id are foreign
    // keys enforced within the same import transaction.
    const changesToImport = [
      operationFor('account', account),
      operationFor('account', destination, { operationId: destinationAccountId }),
      operationFor('category', incomeCategory),
      operationFor('category', expenseCategory, { operationId: expenseCategoryId }),
      operationFor('transaction', income),
      operationFor('transaction', expense, { operationId: expenseTransactionId }),
      operationFor('transaction', transfer, { operationId: transferTransactionId }),
    ];

    await expect(engine.import(pkg(changesToImport))).resolves.toEqual({
      applied: 7,
      skipped: 0,
      conflicted: 0,
      rejected: 0,
    });

    await expect(accountRepo.findById(accountId)).resolves.toEqual(account);
    await expect(accountRepo.findById(destinationAccountId)).resolves.toEqual(destination);
    await expect(categoryRepo.findById(incomeCategoryId)).resolves.toEqual(incomeCategory);
    await expect(categoryRepo.findById(expenseCategoryId)).resolves.toEqual(expenseCategory);
    await expect(transactionRepo.findById(incomeTransactionId)).resolves.toEqual(income);
    await expect(transactionRepo.findById(expenseTransactionId)).resolves.toEqual(expense);
    await expect(transactionRepo.findById(transferTransactionId)).resolves.toEqual(transfer);
    await expect(engine.exportPending()).resolves.toMatchObject({ changes: [] });
  });

  it('persists a tombstone for a deleted account and excludes it from active listings', async () => {
    await accountRepo.create({
      id: accountId,
      name: 'Cash Wallet',
      type: 'cash',
      openingBalance: 500000,
      originDeviceId: sourceDeviceId,
      operationId: '660e8400-e29b-41d4-a716-446655440020',
      now: '2026-08-24T09:00:00.000Z',
    });

    const tombstone = accountRecord({
      updatedAt: '2026-08-24T10:02:00.000Z',
      deletedAt: '2026-08-24T10:02:00.000Z',
      revision: 2,
    });
    const operation = operationFor('account', tombstone, {
      operation: 'delete',
      operationId: '660e8400-e29b-41d4-a716-446655440021',
    });

    await expect(engine.import(pkg([operation]))).resolves.toEqual({
      applied: 1,
      skipped: 0,
      conflicted: 0,
      rejected: 0,
    });
    await expect(accountRepo.findById(accountId)).resolves.toEqual(tombstone);
    await expect(accountRepo.listActive()).resolves.toEqual([]);
  });

  it('persists a tombstone for a deleted transaction and excludes it from the active list', async () => {
    await accountRepo.create({
      id: accountId,
      name: 'Cash Wallet',
      type: 'cash',
      openingBalance: 500000,
      originDeviceId: sourceDeviceId,
      operationId: '660e8400-e29b-41d4-a716-446655440022',
      now: '2026-08-24T09:00:00.000Z',
    });
    await categoryRepo.create({
      id: incomeCategoryId,
      name: 'Salary',
      type: 'income',
      originDeviceId: sourceDeviceId,
      operationId: '660e8400-e29b-41d4-a716-446655440023',
      now: '2026-08-24T09:00:00.000Z',
    });
    await transactionRepo.create({
      id: incomeTransactionId,
      type: 'income',
      amount: 2000000,
      accountId,
      categoryId: incomeCategoryId,
      date: '2026-08-24',
      name: 'Monthly salary',
      originDeviceId: sourceDeviceId,
      operationId: '660e8400-e29b-41d4-a716-446655440024',
      now: '2026-08-24T09:05:00.000Z',
    });

    const tombstone = incomeTransactionRecord({
      updatedAt: '2026-08-24T10:02:00.000Z',
      deletedAt: '2026-08-24T10:02:00.000Z',
      revision: 2,
    });
    const operation = operationFor('transaction', tombstone, {
      operation: 'delete',
      operationId: '660e8400-e29b-41d4-a716-446655440025',
    });

    await expect(engine.import(pkg([operation]))).resolves.toEqual({
      applied: 1,
      skipped: 0,
      conflicted: 0,
      rejected: 0,
    });
    await expect(transactionRepo.findById(incomeTransactionId)).resolves.toEqual(tombstone);
    await expect(transactionRepo.list()).resolves.toEqual([]);
  });

  it('skips a duplicate reimport of the same finance operation', async () => {
    const category = categoryRecord();
    const operation = operationFor('category', category);
    const incomingPackage = pkg([operation]);

    await expect(engine.import(incomingPackage)).resolves.toEqual({
      applied: 1,
      skipped: 0,
      conflicted: 0,
      rejected: 0,
    });
    await expect(engine.import(incomingPackage)).resolves.toEqual({
      applied: 0,
      skipped: 1,
      conflicted: 0,
      rejected: 0,
    });
    await expect(categoryRepo.findById(incomeCategoryId)).resolves.toEqual(category);
  });

  it('rejects an account payload with an invalid account type before changing records or the operation log', async () => {
    const invalidAccount = { ...accountRecord(), type: 'crypto-wallet' };
    const operation = operationFor('account', invalidAccount as unknown as Account);

    await expect(engine.import(pkg([operation]))).resolves.toEqual({
      applied: 0,
      skipped: 0,
      conflicted: 0,
      rejected: 1,
    });
    await expect(accountRepo.findById(accountId)).resolves.toBeNull();
    await expect(changes.hasOperation(operation.operationId)).resolves.toBe(false);
  });

  it('rejects a category payload with an invalid category type before changing records or the operation log', async () => {
    const invalidCategory = { ...categoryRecord(), type: 'savings' };
    const operation = operationFor('category', invalidCategory as unknown as Category);

    await expect(engine.import(pkg([operation]))).resolves.toEqual({
      applied: 0,
      skipped: 0,
      conflicted: 0,
      rejected: 1,
    });
    await expect(categoryRepo.findById(incomeCategoryId)).resolves.toBeNull();
    await expect(changes.hasOperation(operation.operationId)).resolves.toBe(false);
  });

  it('rejects an income transaction payload missing categoryId before changing records or the operation log', async () => {
    const invalidTransaction = { ...incomeTransactionRecord(), categoryId: null };
    const operation = operationFor('transaction', invalidTransaction as unknown as Transaction);

    await expect(engine.import(pkg([operation]))).resolves.toEqual({
      applied: 0,
      skipped: 0,
      conflicted: 0,
      rejected: 1,
    });
    await expect(transactionRepo.findById(incomeTransactionId)).resolves.toBeNull();
    await expect(changes.hasOperation(operation.operationId)).resolves.toBe(false);
  });

  it('rejects a transfer transaction payload that also sets a categoryId before changing records or the operation log', async () => {
    const invalidTransfer = { ...transferTransactionRecord(), categoryId: incomeCategoryId };
    const operation = operationFor('transaction', invalidTransfer as unknown as Transaction);

    await expect(engine.import(pkg([operation]))).resolves.toEqual({
      applied: 0,
      skipped: 0,
      conflicted: 0,
      rejected: 1,
    });
    await expect(transactionRepo.findById(transferTransactionId)).resolves.toBeNull();
    await expect(changes.hasOperation(operation.operationId)).resolves.toBe(false);
  });

  it('rejects a transaction payload with an unsupported type enum before changing records or the operation log', async () => {
    const invalidTransaction = { ...incomeTransactionRecord(), type: 'reimbursement' };
    const operation = operationFor('transaction', invalidTransaction as unknown as Transaction);

    await expect(engine.import(pkg([operation]))).resolves.toEqual({
      applied: 0,
      skipped: 0,
      conflicted: 0,
      rejected: 1,
    });
    await expect(transactionRepo.findById(incomeTransactionId)).resolves.toBeNull();
    await expect(changes.hasOperation(operation.operationId)).resolves.toBe(false);
  });

  it('rolls back every accepted finance record when the imported operation log write fails', async () => {
    const account = accountRecord();
    const accountOperation = operationFor('account', account);
    const category = categoryRecord();
    const categoryOperation = operationFor('category', category, {
      operationId: '660e8400-e29b-41d4-a716-446655440030',
    });

    database.db.run(
      sql.raw(`
      CREATE TRIGGER fail_imported_finance_operation
      BEFORE INSERT ON change_log
      WHEN NEW.operation_id = '${categoryOperation.operationId}'
      BEGIN SELECT RAISE(ABORT, 'forced import failure'); END;
    `),
    );

    await expect(engine.import(pkg([accountOperation, categoryOperation]))).rejects.toThrow(
      'forced import failure',
    );
    await expect(accountRepo.findById(accountId)).resolves.toBeNull();
    await expect(categoryRepo.findById(incomeCategoryId)).resolves.toBeNull();
  });
});
