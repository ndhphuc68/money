import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const exampleRecords = sqliteTable('example_records', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  revision: integer('revision').notNull(),
  originDeviceId: text('origin_device_id').notNull(),
});
