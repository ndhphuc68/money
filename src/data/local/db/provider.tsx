import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { LocalDatabase, LocalDatabaseClient, openLocalDatabase } from './client';

type LocalDatabaseProviderProps = {
  children: ReactNode;
  databaseName?: string;
};

const LocalDatabaseContext = createContext<LocalDatabase | null>(null);

// expo-sqlite's <SQLiteProvider> closes the previous connection in an
// unawaited fire-and-forget call from its effect cleanup, then immediately
// opens a new one. On web, where the OPFS VFS only allows a single access
// handle per database file, this race throws NoModificationAllowedError
// (https://github.com/expo/expo/issues/41437). Opening the connection once at
// module scope and never closing/reopening it for the life of the tab avoids
// the race entirely.
let clientPromise: Promise<LocalDatabaseClient> | null = null;

function getLocalDatabaseClient(databaseName: string): Promise<LocalDatabaseClient> {
  if (!clientPromise) {
    clientPromise = openLocalDatabase(databaseName);
  }
  return clientPromise;
}

export function LocalDatabaseProvider({
  children,
  databaseName = 'offline-first-sync.db',
}: LocalDatabaseProviderProps) {
  const [db, setDb] = useState<LocalDatabase | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLocalDatabaseClient(databaseName).then((client) => {
      if (!cancelled) {
        setDb(client.db);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [databaseName]);

  if (!db) {
    return null;
  }

  return <LocalDatabaseContext.Provider value={db}>{children}</LocalDatabaseContext.Provider>;
}

export function useLocalDatabase(): LocalDatabaseClient {
  const db = useContext(LocalDatabaseContext);
  if (!db) {
    throw new Error('useLocalDatabase must be used within a LocalDatabaseProvider');
  }

  return {
    db,
    async close() {},
  };
}
