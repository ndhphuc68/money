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
import { categories, changeLog, transactions } from '@/data/local/schema';

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
   * Archives the category so it is hidden from pickers but preserved for
   * history. Physical deletion is intentionally not exposed by this
   * repository, regardless of whether the category is in use.
   */
  async hide(id: string, context: WriteContext): Promise<Category> {
    const existing = await this.requireById(id);
    const updated: Category = {
      ...existing,
      isArchived: true,
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

  async findById(id: string): Promise<Category | null> {
    const row = this.database.db.select().from(categories).where(eq(categories.id, id)).get();
    return row ? toCategoryEntity(row) : null;
  }

  async listActiveByType(type: CategoryType): Promise<Category[]> {
    const rows = this.database.db
      .select()
      .from(categories)
      .where(and(eq(categories.type, type), isNull(categories.deletedAt)))
      .all();
    return rows.map(toCategoryEntity);
  }

  /**
   * Reports whether any transaction — active or soft-deleted — references
   * this category. A soft-deleted transaction is a tombstone, not a physical
   * removal: it can still be inspected in history and (per the domain model)
   * restored, so a category it references is still meaningfully "in use" and
   * must not be treated as safe to physically remove.
   */
  async isUsedByTransaction(id: string): Promise<boolean> {
    const row = this.database.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.categoryId, id))
      .get();
    return row !== undefined;
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
