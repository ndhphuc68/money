import { and, eq, isNull } from 'drizzle-orm';

import {
  CreateGoldLotInput,
  GoldLotListFilter,
  GoldLotRepository as GoldLotRepositoryPort,
} from '@/core/application/ports/gold-repositories';
import { WriteContext } from '@/core/application/ports/finance-repositories';
import { GoldLot, validateGoldLotInput } from '@/core/domain/gold/gold-lot';
import { normalizeGoldWeightToGrams } from '@/core/domain/gold/gold-weight';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, goldLots } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toGoldLotEntity, toGoldLotRowValues } from './gold-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import {
  canonicalizeSyncableRecordIdentifiers,
  canonicalizeSyncOperationIdentifiers,
} from './sync-identifier-validation';

export class GoldLotRepository implements GoldLotRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async create(input: CreateGoldLotInput): Promise<GoldLot> {
    const { id, originDeviceId, operationId, now, ...lotInput } = input;
    validateGoldLotInput(lotInput);

    const lot: GoldLot = {
      id,
      brandId: lotInput.brandId,
      purchaseDate: lotInput.purchaseDate,
      quantity: lotInput.quantity,
      unit: lotInput.unit,
      quantityGrams: normalizeGoldWeightToGrams(lotInput.quantity, lotInput.unit),
      totalAmount: lotInput.totalAmount,
      note: lotInput.note ?? null,
      status: 'held',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_lot',
      entityId: lot.id,
      operation: 'create',
      payload: lot,
      originDeviceId,
      revision: lot.revision,
      createdAt: now,
      operationId,
    });

    await this.saveWithOperation(lot, operation);
    return lot;
  }

  async softDelete(id: string, context: WriteContext): Promise<GoldLot> {
    return this.applyPatch(id, { deletedAt: context.now }, context, 'delete');
  }

  async restore(id: string, context: WriteContext): Promise<GoldLot> {
    return this.applyPatch(id, { deletedAt: null }, context, 'update');
  }

  async markSold(id: string, context: WriteContext): Promise<GoldLot> {
    return this.applyPatch(id, { status: 'sold' }, context, 'update');
  }

  async markHeld(id: string, context: WriteContext): Promise<GoldLot> {
    return this.applyPatch(id, { status: 'held' }, context, 'update');
  }

  async findById(id: string): Promise<GoldLot | null> {
    const row = this.database.db.select().from(goldLots).where(eq(goldLots.id, id)).get();
    return row ? toGoldLotEntity(row) : null;
  }

  async list(filter: GoldLotListFilter = {}): Promise<GoldLot[]> {
    const conditions = [];
    if (!filter.includeDeleted) {
      conditions.push(isNull(goldLots.deletedAt));
    }
    if (filter.status) {
      conditions.push(eq(goldLots.status, filter.status));
    }

    const query = this.database.db.select().from(goldLots);
    const rows = (conditions.length > 0 ? query.where(and(...conditions)) : query)
      .orderBy(goldLots.purchaseDate)
      .all();
    return rows.map(toGoldLotEntity);
  }

  async saveWithOperation(record: GoldLot, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as GoldLot;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toGoldLotRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(goldLots)
        .values(values)
        .onConflictDoUpdate({ target: goldLots.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async applyPatch(
    id: string,
    patch: Partial<Pick<GoldLot, 'deletedAt' | 'status'>>,
    context: WriteContext,
    operationKind: 'update' | 'delete',
  ): Promise<GoldLot> {
    const existing = await this.requireById(id);
    const updated: GoldLot = {
      ...existing,
      ...patch,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_lot',
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

  private async requireById(id: string): Promise<GoldLot> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Gold lot ${id} not found`);
    }
    return existing;
  }
}
