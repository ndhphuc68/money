import { useMemo, useState } from 'react';

import { useLocalDatabase } from '@/data/local/db/provider';
import { SyncScreen } from '@/features/sync/screens/sync-screen';
import { useSync } from '@/features/sync/view-models/use-sync';
import { createMobileSyncDependencies } from '@/infrastructure/expo/sync/create-mobile-sync-dependencies';
import { Locale, translate } from '@/i18n/translations';

export default function RootScreen() {
  return <ConfiguredSyncScreen />;
}

function ConfiguredSyncScreen() {
  const database = useLocalDatabase();
  const [locale, setLocale] = useState<Locale>('vi');
  const [passphrase, setPassphrase] = useState('');
  const t = useMemo(() => translate.bind(null, locale), [locale]);
  const dependencies = useMemo(
    () => passphrase.trim() === '' ? null : createMobileSyncDependencies(database, passphrase),
    [database, passphrase],
  );

  return <SyncScreen {...useSync({ dependencies, passphrase, setPassphrase, t })} locale={locale} setLocale={setLocale} t={t} />;
}
