import { and, desc, eq, gte, isNull, like, lt, lte, or } from 'drizzle-orm';

import {
  CreateTransactionInput,
  TransactionListFilter,
  TransactionRepository as TransactionRepositoryPort,
  UpdateTransactionInput,
  WriteContext,
} from '@/core/application/ports/finance-repositories';
import { Transaction, TransactionInput, validateTransactionInput } from '@/core/domain/finance/transaction';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, transactions } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toTransactionEntity, toTransactionRowValues } from './finance-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import { canonicalizeSyncableRecordIdentifiers, canonicalizeSyncOperationIdentifiers } from './sync-identifier-validation';

type TransactionMeta = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  revision: number;
  originDeviceId: string;
};

export class TransactionRepository implements TransactionRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const { id, originDeviceId, operationId, now, ...transactionInput } = input;
    validateTransactionInput(transactionInput);

    const transaction = toTransactionFromInput(id, transactionInput, {
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    });
    const operation = buildSyncOperation({
      entityType: 'transaction',
      entityId: transaction.id,
      operation: 'create',
      payload: transaction,
      originDeviceId,
      revision: transaction.revision,
      createdAt: now,
      operationId,
    });

    await this.saveWithOperation(transaction, operation);
    return transaction;
  }

  async update(id: string, changes: UpdateTransactionInput, context: WriteContext): Promise<Transaction> {
    const existing = await this.requireById(id);
    const merged = mergeTransactionInput(existing, changes);
    validateTransactionInput(merged);

    const updated = toTransactionFromInput(existing.id, merged, {
      createdAt: existing.createdAt,
      updatedAt: context.now,
      deletedAt: existing.deletedAt,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    });
    const operation = buildSyncOperation({
      entityType: 'transaction',
      entityId: updated.id,
      operation: 'update',
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  async softDelete(id: string, context: WriteContext): Promise<Transaction> {
    const existing = await this.requireById(id);
    const updated: Transaction = {
      ...existing,
      deletedAt: context.now,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    } as Transaction;
    const operation = buildSyncOperation({
      entityType: 'transaction',
      entityId: updated.id,
      operation: 'delete',
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  async restore(id: string, context: WriteContext): Promise<Transaction> {
    const existing = await this.requireById(id);
    const updated: Transaction = {
      ...existing,
      deletedAt: null,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    } as Transaction;
    const operation = buildSyncOperation({
      entityType: 'transaction',
      entityId: updated.id,
      operation: 'update',
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = this.database.db.select().from(transactions).where(eq(transactions.id, id)).get();
    return row ? toTransactionEntity(row) : null;
  }

  async list(filter: TransactionListFilter = {}): Promise<Transaction[]> {
    const conditions = [];

    if (!filter.includeDeleted) {
      conditions.push(isNull(transactions.deletedAt));
    }
    if (filter.type) {
      conditions.push(eq(transactions.type, filter.type));
    }
    if (filter.categoryId) {
      conditions.push(eq(transactions.categoryId, filter.categoryId));
    }
    if (filter.accountId) {
      conditions.push(
        or(eq(transactions.accountId, filter.accountId), eq(transactions.destinationAccountId, filter.accountId)),
      );
    }
    if (filter.query) {
      conditions.push(like(transactions.name, `%${filter.query}%`));
    }
    if (filter.month) {
      const { from, to } = monthRange(filter.month);
      conditions.push(gte(transactions.transactionDate, from));
      conditions.push(lt(transactions.transactionDate, to));
    } else {
      if (filter.from) {
        conditions.push(gte(transactions.transactionDate, filter.from));
      }
      if (filter.to) {
        conditions.push(lte(transactions.transactionDate, filter.to));
      }
    }

    const query = this.database.db.select().from(transactions);
    const rows = (conditions.length > 0 ? query.where(and(...conditions)) : query)
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
      .all();

    return rows.map(toTransactionEntity);
  }

  async saveWithOperation(record: Transaction, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as Transaction;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toTransactionRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(transactions)
        .values(values)
        .onConflictDoUpdate({ target: transactions.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async requireById(id: string): Promise<Transaction> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Transaction ${id} not found`);
    }
    return existing;
  }
}

function toTransactionFromInput(id: string, input: TransactionInput, meta: TransactionMeta): Transaction {
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

function mergeTransactionInput(existing: Transaction, changes: UpdateTransactionInput): TransactionInput {
  const type = changes.type ?? existing.type;
  const existingDestinationAccountId = existing.type === 'transfer' ? existing.destinationAccountId : null;
  const existingCategoryId = existing.type === 'transfer' ? null : existing.categoryId;

  const destinationAccountId =
    changes.destinationAccountId !== undefined
      ? changes.destinationAccountId
      : type === 'transfer'
        ? existingDestinationAccountId
        : null;
  const categoryId =
    changes.categoryId !== undefined ? changes.categoryId : type === 'transfer' ? null : existingCategoryId;

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

function monthRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const from = `${month}-01`;
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  const to = nextMonth.toISOString().slice(0, 10);
  return { from, to };
}
