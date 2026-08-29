import { eq, isNull, or } from 'drizzle-orm';

import {
  AccountRepository as AccountRepositoryPort,
  CreateAccountInput,
  UpdateAccountInput,
  WriteContext,
} from '@/core/application/ports/finance-repositories';
import { Account } from '@/core/domain/finance/account';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { accounts, changeLog, transactions } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toAccountEntity, toAccountRowValues } from './finance-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import {
  canonicalizeSyncableRecordIdentifiers,
  canonicalizeSyncOperationIdentifiers,
} from './sync-identifier-validation';

export class AccountRepository implements AccountRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

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
    const operation = buildSyncOperation({
      entityType: 'account',
      entityId: account.id,
      operation: 'create',
      payload: account,
      originDeviceId: input.originDeviceId,
      revision: account.revision,
      createdAt: input.now,
      operationId: input.operationId,
    });

    await this.saveWithOperation(account, operation);
    return account;
  }

  async update(id: string, changes: UpdateAccountInput, context: WriteContext): Promise<Account> {
    const existing = await this.requireById(id);
    const updated: Account = {
      ...existing,
      ...changes,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'account',
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

  async softDeleteOrHide(id: string, context: WriteContext): Promise<Account> {
    const existing = await this.requireById(id);
    const referenced = await this.isReferencedByTransaction(id);

    const updated: Account = referenced
      ? {
          ...existing,
          isArchived: true,
          updatedAt: context.now,
          revision: existing.revision + 1,
          originDeviceId: context.originDeviceId,
        }
      : {
          ...existing,
          deletedAt: context.now,
          updatedAt: context.now,
          revision: existing.revision + 1,
          originDeviceId: context.originDeviceId,
        };

    const operation = buildSyncOperation({
      entityType: 'account',
      entityId: updated.id,
      operation: referenced ? 'update' : 'delete',
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  async findById(id: string): Promise<Account | null> {
    const row = this.database.db.select().from(accounts).where(eq(accounts.id, id)).get();
    return row ? toAccountEntity(row) : null;
  }

  async listActive(): Promise<Account[]> {
    const rows = this.database.db.select().from(accounts).where(isNull(accounts.deletedAt)).all();
    return rows.map(toAccountEntity);
  }

  async saveWithOperation(record: Account, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as Account;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toAccountRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(accounts)
        .values(values)
        .onConflictDoUpdate({ target: accounts.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async requireById(id: string): Promise<Account> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Account ${id} not found`);
    }
    return existing;
  }

  private async isReferencedByTransaction(accountId: string): Promise<boolean> {
    const row = this.database.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        or(eq(transactions.accountId, accountId), eq(transactions.destinationAccountId, accountId)),
      )
      .get();
    return row !== undefined;
  }
}
