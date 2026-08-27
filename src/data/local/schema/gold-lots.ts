import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { goldBrands } from './gold-brands';

export const goldLots = sqliteTable(
  'gold_lots',
  {
    id: text('id').primaryKey(),
    brandId: text('brand_id')
      .notNull()
      .references(() => goldBrands.id),
    /** ISO calendar date (YYYY-MM-DD). */
    purchaseDate: text('purchase_date').notNull(),
    /** Quantity in the unit the user entered (not grams). */
    quantity: real('quantity').notNull(),
    unit: text('unit', { enum: ['luong', 'chi', 'phan', 'gram'] }).notNull(),
    /** Quantity normalized to grams for cross-unit reasoning. */
    quantityGrams: real('quantity_grams').notNull(),
    /** Positive integer VND; this is the lot's cost basis. */
    totalAmount: integer('total_amount').notNull(),
    note: text('note'),
    /** 'held' while unsold; 'sold' once exactly one active sell transaction links to it. */
    status: text('status', { enum: ['held', 'sold'] }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [
    index('gold_lots_brand_id_idx').on(table.brandId),
    index('gold_lots_status_idx').on(table.status),
    index('gold_lots_purchase_date_idx').on(table.purchaseDate),
    check('gold_lots_unit_check', sql`${table.unit} in ('luong', 'chi', 'phan', 'gram')`),
    check('gold_lots_status_check', sql`${table.status} in ('held', 'sold')`),
  ],
);
