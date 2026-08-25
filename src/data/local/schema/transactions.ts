import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { accounts } from './accounts';
import { categories } from './categories';

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['income', 'expense', 'transfer'] }).notNull(),
    /** Positive integer VND amount. */
    amount: integer('amount').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    destinationAccountId: text('destination_account_id').references(() => accounts.id),
    categoryId: text('category_id').references(() => categories.id),
    /** ISO calendar date (YYYY-MM-DD), distinct from createdAt/updatedAt timestamps. */
    transactionDate: text('transaction_date').notNull(),
    name: text('name').notNull(),
    note: text('note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [
    index('transactions_account_id_idx').on(table.accountId),
    index('transactions_transaction_date_idx').on(table.transactionDate),
    index('transactions_type_idx').on(table.type),
    index('transactions_category_id_idx').on(table.categoryId),
  ],
);
