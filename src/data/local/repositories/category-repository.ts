import { and, eq, isNull } from 'drizzle-orm';

import {
  CategoryRepository as CategoryRepositoryPort,
  CreateCategoryInput,
  UpdateCategoryInput,
  WriteContext,
} from '@/core/application/ports/finance-repositories';
import { Category, CategoryType } from '@/core/domain/finance/category';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { categories, changeLog, recurringSchedules, transactions } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toCategoryEntity, toCategoryRowValues } from './finance-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import {
  canonicalizeSyncableRecordIdentifiers,
  canonicalizeSyncOperationIdentifiers,
} from './sync-identifier-validation';

export class CategoryRepository implements CategoryRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async create(input: CreateCategoryInput): Promise<Category> {
    const category: Category = {
      id: input.id,
      name: input.name,
      type: input.type,
      icon: input.icon || 'fa6:shapes',
      color: input.color || (input.type === 'income' ? '#10B981' : '#F2734A'),
      isArchived: false,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'category',
      entityId: category.id,
      operation: 'create',
      payload: category,
      originDeviceId: input.originDeviceId,
      revision: category.revision,
      createdAt: input.now,
      operationId: input.operationId,
    });

    await this.saveWithOperation(category, operation);
    return category;
  }

  async update(id: string, changes: UpdateCategoryInput, context: WriteContext): Promise<Category> {
    const existing = await this.requireById(id);
    const updated: Category = {
      ...existing,
      ...changes,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'category',
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

  /**
   * If the category is referenced by any transaction or recurring schedule,
   * archives it (isArchived = true) to preserve historical data.
   * If it is not used anywhere, soft-deletes it (deletedAt = now).
   */
  async hide(id: string, context: WriteContext): Promise<Category> {
    const existing = await this.requireById(id);
    const inUse = await this.isUsedByTransaction(id);

    const updated: Category = inUse
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
      entityType: 'category',
      entityId: updated.id,
      operation: inUse ? 'update' : 'delete',
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  async findById(id: string): Promise<Category | null> {
    const row = this.database.db.select().from(categories).where(eq(categories.id, id)).get();
    return row ? toCategoryEntity(row) : null;
  }

  async listActiveByType(type: CategoryType): Promise<Category[]> {
    const rows = this.database.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.type, type),
          isNull(categories.deletedAt),
          eq(categories.isArchived, false),
        ),
      )
      .all();
    return rows.map(toCategoryEntity);
  }

  /**
   * Reports whether any transaction or recurring schedule references this category.
   */
  async isUsedByTransaction(id: string): Promise<boolean> {
    const inTx = this.database.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.categoryId, id))
      .get();
    if (inTx !== undefined) return true;

    const inRecurring = this.database.db
      .select({ id: recurringSchedules.id })
      .from(recurringSchedules)
      .where(eq(recurringSchedules.categoryId, id))
      .get();
    return inRecurring !== undefined;
  }

  async saveWithOperation(record: Category, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as Category;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toCategoryRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(categories)
        .values(values)
        .onConflictDoUpdate({ target: categories.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async requireById(id: string): Promise<Category> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Category ${id} not found`);
    }
    return existing;
  }
}
