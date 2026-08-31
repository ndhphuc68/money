// src/data/local/schema/recurring-schedules.ts
import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { accounts } from './accounts';
import { categories } from './categories';
import { transactions } from './transactions';

export const recurringSchedules = sqliteTable(
  'recurring_schedules',
  {
    id: text('id').primaryKey(),
    displayName: text('display_name').notNull(),
    type: text('type', { enum: ['expense'] }).notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    /** Positive integer VNĐ default for future periods. */
    amount: integer('amount').notNull(),
    frequency: text('frequency', { enum: ['weekly', 'monthly', 'quarterly', 'yearly'] }).notNull(),
    anchorDay: integer('anchor_day').notNull(),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    occurrenceLimit: integer('occurrence_limit'),
    remindDaysBefore: integer('remind_days_before').notNull(),
    status: text('status', { enum: ['active', 'paused', 'ended'] }).notNull(),
    firstTransactionId: text('first_transaction_id')
      .notNull()
      .references(() => transactions.id),
    note: text('note'),
    generatedCount: integer('generated_count').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [
    index('recurring_schedules_account_id_idx').on(table.accountId),
    index('recurring_schedules_status_idx').on(table.status),
    check('recurring_schedules_type_check', sql`${table.type} in ('expense')`),
    check(
      'recurring_schedules_frequency_check',
      sql`${table.frequency} in ('weekly', 'monthly', 'quarterly', 'yearly')`,
    ),
    check(
      'recurring_schedules_status_check',
      sql`${table.status} in ('active', 'paused', 'ended')`,
    ),
  ],
);
