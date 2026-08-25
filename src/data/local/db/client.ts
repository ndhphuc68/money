import { drizzle, ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import * as SQLite from 'expo-sqlite';

import migrations from '../../../../drizzle/migrations';
import * as schema from '../schema';

export type LocalDatabase = ExpoSQLiteDatabase<typeof schema>;

export type LocalDatabaseClient = {
  db: LocalDatabase;
  close(): Promise<void>;
};

export function createLocalDatabase(sqliteDatabase: SQLite.SQLiteDatabase): LocalDatabase {
  return drizzle(sqliteDatabase, { schema });
}

export async function migrateLocalDatabase(database: LocalDatabase): Promise<void> {
  await migrate(database, migrations);
}

export async function openLocalDatabase(databaseName = 'offline-first-sync.db'): Promise<LocalDatabaseClient> {
  const sqliteDatabase = SQLite.openDatabaseSync(databaseName);
  sqliteDatabase.prepareSync('PRAGMA foreign_keys = ON;').executeSync();
  const db = createLocalDatabase(sqliteDatabase);
  await migrateLocalDatabase(db);

  return {
    db,
    async close() {
      sqliteDatabase.closeSync();
    },
  };
}

let testDatabaseNumber = 0;

export async function openTestLocalDatabase(): Promise<LocalDatabaseClient> {
  testDatabaseNumber += 1;
  const databaseName = `offline-first-sync-test-${testDatabaseNumber}.db`;
  const client = await openLocalDatabase(databaseName);

  return {
    ...client,
    async close() {
      await client.close();
      SQLite.deleteDatabaseSync(databaseName);
    },
  };
}
