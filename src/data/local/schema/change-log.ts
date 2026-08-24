import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const changeLog = sqliteTable('change_log', {
  operationId: text('operation_id').primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  operation: text('operation', { enum: ['create', 'update', 'delete'] }).notNull(),
  payload: text('payload').notNull(),
  originDeviceId: text('origin_device_id').notNull(),
  revision: integer('revision').notNull(),
  createdAt: text('created_at').notNull(),
  syncedAt: text('synced_at'),
});
