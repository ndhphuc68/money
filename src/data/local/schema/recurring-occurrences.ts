// src/data/local/schema/recurring-occurrences.ts
import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { accounts } from './accounts';
import { categories } from './categories';
import { recurringSchedules } from './recurring-schedules';
import { transactions } from './transactions';

export const recurringOccurrences = sqliteTable(
  'recurring_occurrences',
  {
    id: text('id').primaryKey(),
    scheduleId: text('schedule_id')
      .notNull()
      .references(() => recurringSchedules.id),
    scheduledDate: text('scheduled_date').notNull(),
    amount: integer('amount').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    displayName: text('display_name').notNull(),
    note: text('note'),
    status: text('status', { enum: ['pending', 'confirmed', 'skipped'] }).notNull(),
    transactionId: text('transaction_id').references(() => transactions.id),
    notifiedAt: text('notified_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [
    index('recurring_occurrences_schedule_id_idx').on(table.scheduleId),
    index('recurring_occurrences_status_idx').on(table.status),
    index('recurring_occurrences_scheduled_date_idx').on(table.scheduledDate),
    check(
      'recurring_occurrences_status_check',
      sql`${table.status} in ('pending', 'confirmed', 'skipped')`,
    ),
  ],
);
