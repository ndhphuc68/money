import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type', { enum: ['cash', 'bank', 'e-wallet', 'credit-card', 'other'] }).notNull(),
    openingBalance: integer('opening_balance').notNull(),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [
    check(
      'accounts_type_check',
      sql`${table.type} in ('cash', 'bank', 'e-wallet', 'credit-card', 'other')`,
    ),
  ],
);
