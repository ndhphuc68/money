import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const syncMetadata = sqliteTable('sync_metadata', {
  key: text('key').primaryKey(),
  deviceId: text('device_id'),
  schemaVersion: integer('schema_version').notNull(),
  lastImportedAt: text('last_imported_at'),
  lastExportedAt: text('last_exported_at'),
});
