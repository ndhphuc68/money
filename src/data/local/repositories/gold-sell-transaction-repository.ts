import { and, eq, isNull } from 'drizzle-orm';

import {
  CreateGoldSellTransactionInput,
  GoldSellTransactionListFilter,
  GoldSellTransactionRepository as GoldSellTransactionRepositoryPort,
} from '@/core/application/ports/gold-repositories';
import { WriteContext } from '@/core/application/ports/finance-repositories';
import {
  GoldSellTransaction,
  validateGoldSellTransactionInput,
} from '@/core/domain/gold/gold-sell-transaction';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, goldSellTransactions } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toGoldSellTransactionEntity, toGoldSellTransactionRowValues } from './gold-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import {
  canonicalizeSyncableRecordIdentifiers,
  canonicalizeSyncOperationIdentifiers,
} from './sync-identifier-validation';

export class GoldSellTransactionRepository implements GoldSellTransactionRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async create(input: CreateGoldSellTransactionInput): Promise<GoldSellTransaction> {
    const { id, originDeviceId, operationId, now, ...saleInput } = input;
    validateGoldSellTransactionInput(saleInput);

    const sale: GoldSellTransaction = {
      id,
      lotId: saleInput.lotId,
      saleDate: saleInput.saleDate,
      totalAmount: saleInput.totalAmount,
      note: saleInput.note ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_sell_transaction',
      entityId: sale.id,
      operation: 'create',
      payload: sale,
      originDeviceId,
      revision: sale.revision,
      createdAt: now,
      operationId,
    });

    await this.saveWithOperation(sale, operation);
    return sale;
  }

  async softDelete(id: string, context: WriteContext): Promise<GoldSellTransaction> {
    return this.applyPatch(id, { deletedAt: context.now }, context, 'delete');
  }

  async restore(id: string, context: WriteContext): Promise<GoldSellTransaction> {
    return this.applyPatch(id, { deletedAt: null }, context, 'update');
  }

  async findById(id: string): Promise<GoldSellTransaction | null> {
    const row = this.database.db
      .select()
      .from(goldSellTransactions)
      .where(eq(goldSellTransactions.id, id))
      .get();
    return row ? toGoldSellTransactionEntity(row) : null;
  }

  async findActiveByLotId(lotId: string): Promise<GoldSellTransaction | null> {
    const row = this.database.db
      .select()
      .from(goldSellTransactions)
      .where(and(eq(goldSellTransactions.lotId, lotId), isNull(goldSellTransactions.deletedAt)))
      .get();
    return row ? toGoldSellTransactionEntity(row) : null;
  }

  async list(filter: GoldSellTransactionListFilter = {}): Promise<GoldSellTransaction[]> {
    const query = this.database.db.select().from(goldSellTransactions);
    const rows = (
      filter.includeDeleted ? query : query.where(isNull(goldSellTransactions.deletedAt))
    )
      .orderBy(goldSellTransactions.saleDate)
      .all();
    return rows.map(toGoldSellTransactionEntity);
  }

  async saveWithOperation(record: GoldSellTransaction, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as GoldSellTransaction;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toGoldSellTransactionRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(goldSellTransactions)
        .values(values)
        .onConflictDoUpdate({ target: goldSellTransactions.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async applyPatch(
    id: string,
    patch: Partial<Pick<GoldSellTransaction, 'deletedAt'>>,
    context: WriteContext,
    operationKind: 'update' | 'delete',
  ): Promise<GoldSellTransaction> {
    const existing = await this.requireById(id);
    const updated: GoldSellTransaction = {
      ...existing,
      ...patch,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_sell_transaction',
      entityId: updated.id,
      operation: operationKind,
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  private async requireById(id: string): Promise<GoldSellTransaction> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Gold sell transaction ${id} not found`);
    }
    return existing;
  }
}
