import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    icon: text('icon').notNull().default('fa6:shapes'),
    color: text('color').notNull().default('#2F6FED'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [check('categories_type_check', sql`${table.type} in ('income', 'expense')`)],
);
