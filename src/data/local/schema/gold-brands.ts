import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const goldBrands = sqliteTable('gold_brands', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  revision: integer('revision').notNull(),
  originDeviceId: text('origin_device_id').notNull(),
});
