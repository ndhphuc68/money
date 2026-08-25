import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useLocalDatabase } from '@/data/local/db/provider';
import { createFinanceDependencies, FinanceDependencies } from '@/features/finance/finance-dependencies';
import { DashboardScreen } from '@/features/finance/screens/dashboard-screen';
import { OnboardingScreen } from '@/features/finance/screens/onboarding-screen';
import { TransactionFormScreen } from '@/features/finance/screens/transaction-form-screen';
import { TransactionsScreen } from '@/features/finance/screens/transactions-screen';
import { useDashboard } from '@/features/finance/view-models/use-dashboard';
import { useOnboarding } from '@/features/finance/view-models/use-onboarding';
import { useTransactionForm } from '@/features/finance/view-models/use-transaction-form';
import { useTransactions } from '@/features/finance/view-models/use-transactions';
import { SyncScreen } from '@/features/sync/screens/sync-screen';
import { useSync } from '@/features/sync/view-models/use-sync';
import { createMobileSyncDependencies } from '@/infrastructure/expo/sync/create-mobile-sync-dependencies';
import { Locale, Translate, translate } from '@/i18n/translations';
import { colors, spacing, typography } from '@/theme';

/** Which finance screen the root route shows once onboarding is complete. */
type FinanceView = { name: 'dashboard' } | { name: 'transactions' } | { name: 'form'; transactionId: string | null };

export default function RootScreen() {
  const database = useLocalDatabase();
  const [locale, setLocale] = useState<Locale>('vi');
  const [dependencies, setDependencies] = useState<FinanceDependencies | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [view, setView] = useState<FinanceView>({ name: 'dashboard' });
  const t = useMemo(() => translate.bind(null, locale), [locale]);

  // `database` comes from `useLocalDatabase()`, which in production is a
  // stable object for the lifetime of the provider. Deliberately fetched
  // once via a ref (not a `[database]` effect dependency): re-running this
  // effect on every render would be wrong if a caller (e.g. a test double)
  // ever returned a fresh object identity per render.
  const databaseRef = useRef(database);
  databaseRef.current = database;

  useEffect(() => {
    let cancelled = false;
    createFinanceDependencies(databaseRef.current).then((financeDependencies) => {
      if (!cancelled) {
        setDependencies(financeDependencies);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dependencies === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t('onboardingLoading')}</Text>
      </View>
    );
  }

  if (onboardingComplete) {
    return <ConfiguredFinanceScreen dependencies={dependencies} t={t} view={view} setView={setView} />;
  }

  return (
    <ConfiguredOnboardingScreen
      dependencies={dependencies}
      locale={locale}
      onComplete={() => setOnboardingComplete(true)}
      setLocale={setLocale}
      t={t}
    />
  );
}

function ConfiguredOnboardingScreen({
  dependencies,
  locale,
  setLocale,
  onComplete,
  t,
}: {
  dependencies: FinanceDependencies;
  locale: Locale;
  setLocale(locale: Locale): void;
  onComplete(): void;
  t: Translate;
}) {
  const viewModel = useOnboarding({ onboarding: dependencies.onboarding, t, onComplete });
  return <OnboardingScreen {...viewModel} locale={locale} setLocale={setLocale} t={t} />;
}

/**
 * Renders the dashboard/transactions/transaction-form screens and owns the
 * `FinanceView` navigation state, mirroring `ConfiguredOnboardingScreen`
 * below. Each branch renders a *different* component (not a conditional
 * hook call in one component, which would break the Rules of Hooks), so
 * switching `view` unmounts the previous screen and mounts the next — that
 * makes refresh-after-mutation trivial, since every screen's view model
 * re-fetches fresh data on mount.
 */
function ConfiguredFinanceScreen({
  dependencies,
  t,
  view,
  setView,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  view: FinanceView;
  setView(view: FinanceView): void;
}) {
  const router = useRouter();

  if (view.name === 'transactions') {
    return (
      <ConfiguredTransactionsScreen
        dependencies={dependencies}
        onAddTransaction={() => setView({ name: 'form', transactionId: null })}
        onBack={() => setView({ name: 'dashboard' })}
        onSelectTransaction={(id) => setView({ name: 'form', transactionId: id })}
        t={t}
      />
    );
  }

  if (view.name === 'form') {
    return (
      <ConfiguredTransactionFormScreen
        dependencies={dependencies}
        onCancel={() => setView({ name: 'dashboard' })}
        onSaved={() => setView({ name: 'dashboard' })}
        t={t}
        transactionId={view.transactionId}
      />
    );
  }

  return (
    <ConfiguredDashboardScreen
      dependencies={dependencies}
      onAddTransaction={() => setView({ name: 'form', transactionId: null })}
      onOpenSync={() => router.push('/sync')}
      onOpenTransactions={() => setView({ name: 'transactions' })}
      onSelectTransaction={(id) => setView({ name: 'form', transactionId: id })}
      t={t}
    />
  );
}

function ConfiguredDashboardScreen({
  dependencies,
  t,
  onOpenTransactions,
  onAddTransaction,
  onSelectTransaction,
  onOpenSync,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  onOpenTransactions(): void;
  onAddTransaction(): void;
  onSelectTransaction(id: string): void;
  onOpenSync(): void;
}) {
  const viewModel = useDashboard({ dependencies, t });
  return (
    <DashboardScreen
      {...viewModel}
      onAddTransaction={onAddTransaction}
      onOpenSync={onOpenSync}
      onOpenTransactions={onOpenTransactions}
      onSelectTransaction={onSelectTransaction}
      t={t}
    />
  );
}

function ConfiguredTransactionsScreen({
  dependencies,
  t,
  onBack,
  onAddTransaction,
  onSelectTransaction,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  onBack(): void;
  onAddTransaction(): void;
  onSelectTransaction(id: string): void;
}) {
  const viewModel = useTransactions({ dependencies, t });
  return (
    <TransactionsScreen
      {...viewModel}
      onAddTransaction={onAddTransaction}
      onBack={onBack}
      onSelectTransaction={onSelectTransaction}
      t={t}
    />
  );
}

function ConfiguredTransactionFormScreen({
  dependencies,
  t,
  transactionId,
  onCancel,
  onSaved,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  transactionId: string | null;
  onCancel(): void;
  onSaved(): void;
}) {
  const viewModel = useTransactionForm({ dependencies, onSaved, t, transactionId });
  return <TransactionFormScreen {...viewModel} onCancel={onCancel} t={t} />;
}

/**
 * Configures and renders the sync screen, shared by the dashboard's
 * temporary "sync data" link (see `onOpenSync` above; reachability of
 * `/sync` is expected to move to a proper Settings entry point in Task 9)
 * and the `/sync` route (`src/app/sync.tsx`).
 */
export function ConfiguredSyncScreen() {
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

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: colors.surface.canvas,
    flex: 1,
    gap: spacing[3],
    justifyContent: 'center',
    padding: spacing[4],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
