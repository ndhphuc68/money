import { useMemo, useState } from 'react';

import { useLocalDatabase } from '@/data/local/db/provider';
import { SyncScreen } from '@/features/sync/screens/sync-screen';
import { useSync } from '@/features/sync/view-models/use-sync';
import { createMobileSyncDependencies } from '@/infrastructure/expo/sync/create-mobile-sync-dependencies';

export default function RootScreen() {
  return <ConfiguredSyncScreen />;
}

function ConfiguredSyncScreen() {
  const database = useLocalDatabase();
  const [passphrase, setPassphrase] = useState('');
  const dependencies = useMemo(
    () => passphrase.trim() === '' ? null : createMobileSyncDependencies(database, passphrase),
    [database, passphrase],
  );

  return <SyncScreen {...useSync({ dependencies, passphrase, setPassphrase })} />;
}
