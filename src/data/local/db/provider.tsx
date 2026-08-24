import { ReactNode, useMemo } from 'react';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';

import { createLocalDatabase, LocalDatabaseClient, migrateLocalDatabase } from './client';

type LocalDatabaseProviderProps = {
  children: ReactNode;
  databaseName?: string;
};

export function LocalDatabaseProvider({
  children,
  databaseName = 'offline-first-sync.db',
}: LocalDatabaseProviderProps) {
  return (
    <SQLiteProvider databaseName={databaseName} onInit={async (sqliteDatabase) => {
      await migrateLocalDatabase(createLocalDatabase(sqliteDatabase));
    }}>
      {children}
    </SQLiteProvider>
  );
}

export function useLocalDatabase(): LocalDatabaseClient {
  const sqliteDatabase = useSQLiteContext();
  const db = useMemo(() => createLocalDatabase(sqliteDatabase), [sqliteDatabase]);

  return useMemo(() => ({
    db,
    async close() {},
  }), [db]);
}
