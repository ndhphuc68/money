import { useMemo } from 'react';

import { useLocalDatabase } from '@/data/local/db/provider';
import { SyncScreen } from '@/features/sync/screens/sync-screen';
import { SyncDependencies, useSync } from '@/features/sync/view-models/use-sync';
import { createMobileSyncDependencies } from '@/infrastructure/expo/sync/create-mobile-sync-dependencies';

type RootScreenProps = {
  dependencies?: SyncDependencies;
};

export default function RootScreen({ dependencies }: RootScreenProps) {
  return dependencies === undefined
    ? <ConfiguredSyncScreen />
    : <SyncScreenWithDependencies dependencies={dependencies} />;
}

function ConfiguredSyncScreen() {
  const database = useLocalDatabase();
  const dependencies = useMemo(() => createMobileSyncDependencies(database), [database]);

  return <SyncScreenWithDependencies dependencies={dependencies} />;
}

function SyncScreenWithDependencies({ dependencies }: { dependencies: SyncDependencies }) {
  return <SyncScreen {...useSync(dependencies)} />;
}
