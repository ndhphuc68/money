import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { goldLots } from './gold-lots';

export const goldSellTransactions = sqliteTable(
  'gold_sell_transactions',
  {
    id: text('id').primaryKey(),
    lotId: text('lot_id')
      .notNull()
      .references(() => goldLots.id),
    /** ISO calendar date (YYYY-MM-DD). */
    saleDate: text('sale_date').notNull(),
    /** Positive integer VND; the total amount actually received. */
    totalAmount: integer('total_amount').notNull(),
    note: text('note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [
    index('gold_sell_transactions_lot_id_idx').on(table.lotId),
    index('gold_sell_transactions_sale_date_idx').on(table.saleDate),
  ],
);
