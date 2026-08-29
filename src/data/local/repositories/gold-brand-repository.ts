import { eq, isNull } from 'drizzle-orm';

import {
  CreateGoldBrandInput,
  GoldBrandRepository as GoldBrandRepositoryPort,
} from '@/core/application/ports/gold-repositories';
import { WriteContext } from '@/core/application/ports/finance-repositories';
import { GoldBrand, validateGoldBrandInput } from '@/core/domain/gold/gold-brand';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, goldBrands } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toGoldBrandEntity, toGoldBrandRowValues } from './gold-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import {
  canonicalizeSyncableRecordIdentifiers,
  canonicalizeSyncOperationIdentifiers,
} from './sync-identifier-validation';

export class GoldBrandRepository implements GoldBrandRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async create(input: CreateGoldBrandInput): Promise<GoldBrand> {
    const { id, originDeviceId, operationId, now, ...brandInput } = input;
    validateGoldBrandInput(brandInput);

    const brand: GoldBrand = {
      id,
      name: brandInput.name,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_brand',
      entityId: brand.id,
      operation: 'create',
      payload: brand,
      originDeviceId,
      revision: brand.revision,
      createdAt: now,
      operationId,
    });

    await this.saveWithOperation(brand, operation);
    return brand;
  }

  async softDelete(id: string, context: WriteContext): Promise<GoldBrand> {
    const existing = await this.requireById(id);
    const updated: GoldBrand = {
      ...existing,
      deletedAt: context.now,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_brand',
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

  async findById(id: string): Promise<GoldBrand | null> {
    const row = this.database.db.select().from(goldBrands).where(eq(goldBrands.id, id)).get();
    return row ? toGoldBrandEntity(row) : null;
  }

  async listActive(): Promise<GoldBrand[]> {
    const rows = this.database.db
      .select()
      .from(goldBrands)
      .where(isNull(goldBrands.deletedAt))
      .orderBy(goldBrands.name)
      .all();
    return rows.map(toGoldBrandEntity);
  }

  async saveWithOperation(record: GoldBrand, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as GoldBrand;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toGoldBrandRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(goldBrands)
        .values(values)
        .onConflictDoUpdate({ target: goldBrands.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async requireById(id: string): Promise<GoldBrand> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Gold brand ${id} not found`);
    }
    return existing;
  }
}
