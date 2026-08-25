import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Single local-device row of profile preferences. Not a SyncableRecord and
 * intentionally not wired into the change-log / sync operation machinery.
 */
export const profileSettings = sqliteTable('profile_settings', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  amountsHidden: integer('amounts_hidden', { mode: 'boolean' }).notNull(),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).notNull(),
  updatedAt: text('updated_at').notNull(),
});
