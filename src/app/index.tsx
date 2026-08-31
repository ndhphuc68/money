import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { useLocalDatabase } from '@/data/local/db/provider';
import {
  createFinanceDependencies,
  FinanceDependencies,
} from '@/features/finance/finance-dependencies';
import { createGoldDependencies, GoldDependencies } from '@/features/gold/gold-dependencies';
import { GoldManagementScreen } from '@/features/gold/screens/gold-management-screen';
import { useGoldManagement } from '@/features/gold/view-models/use-gold-management';
import { DashboardScreen } from '@/features/finance/screens/dashboard-screen';
import { OnboardingScreen } from '@/features/finance/screens/onboarding-screen';
import { SplashScreen } from '@/features/finance/screens/splash-screen';
import { TransactionsScreen } from '@/features/finance/screens/transactions-screen';
import { ReportsScreen } from '@/features/finance/screens/reports-screen';
import { SettingsScreen } from '@/features/finance/screens/settings-screen';
import { AccountsScreen } from '@/features/finance/screens/accounts-screen';
import { CategoriesScreen } from '@/features/finance/screens/categories-screen';
import { useDashboard } from '@/features/finance/view-models/use-dashboard';
import { useOnboarding } from '@/features/finance/view-models/use-onboarding';
import { useTransactionForm } from '@/features/finance/view-models/use-transaction-form';
import { useTransactions } from '@/features/finance/view-models/use-transactions';
import { useReports } from '@/features/finance/view-models/use-reports';
import { useSettings } from '@/features/finance/view-models/use-settings';
import { SyncScreen } from '@/features/sync/screens/sync-screen';
import { BottomNav, TransactionFormSheet } from '@/components/finance';
import { useSync } from '@/features/sync/view-models/use-sync';
import { createMobileSyncDependencies } from '@/infrastructure/expo/sync/create-mobile-sync-dependencies';
import { Locale, Translate, translate } from '@/i18n/translations';

/** Which finance screen the root route shows once onboarding is complete. */
type FinanceView =
  | { name: 'dashboard' }
  | { name: 'transactions' }
  | { name: 'reports' }
  | { name: 'settings' }
  | { name: 'accounts' }
  | { name: 'categories' }
  | { name: 'gold' };

export default function RootScreen() {
  const database = useLocalDatabase();
  const [locale, setLocale] = useState<Locale>('vi');
  const [dependencies, setDependencies] = useState<FinanceDependencies | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [splashReady, setSplashReady] = useState(false);
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSplashReady(true), 900);
    return () => clearTimeout(timer);
  }, []);

  if (dependencies === null || !splashReady) {
    return <SplashScreen t={t} />;
  }

  if (onboardingComplete) {
    return (
      <ConfiguredFinanceScreen dependencies={dependencies} t={t} view={view} setView={setView} />
    );
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
 *
 * A transaction can be added/edited from either the dashboard or the
 * transactions list, so its form sheet lives here (above the `view` switch)
 * as an overlay rather than as its own `FinanceView` — the underlying screen
 * stays mounted and visible behind it, matching how gold's sheets overlay
 * `GoldManagementScreen`. `formSession` is bumped on every open to force a
 * fresh `ConfiguredTransactionFormSheet` mount (so `useTransactionForm`
 * reloads instead of reusing a previous draft); `refreshKey` is bumped after
 * a save to remount the underlying screen so its view model re-fetches.
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
  const [formTarget, setFormTarget] = useState<{ transactionId: string | null } | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [everOpenedForm, setEverOpenedForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function openForm(transactionId: string | null) {
    setEverOpenedForm(true);
    setFormSession((session) => session + 1);
    setFormTarget({ transactionId });
  }
  function closeForm() {
    setFormTarget(null);
  }
  function handleFormSaved() {
    closeForm();
    setRefreshKey((key) => key + 1);
  }

  const formSheet = everOpenedForm ? (
    <ConfiguredTransactionFormSheet
      dependencies={dependencies}
      key={formSession}
      onClose={closeForm}
      onSaved={handleFormSaved}
      t={t}
      transactionId={formTarget?.transactionId ?? null}
      visible={formTarget !== null}
    />
  ) : null;

  if (view.name === 'transactions') {
    return (
      <>
        <ConfiguredTransactionsScreen
          dependencies={dependencies}
          key={refreshKey}
          onAddTransaction={() => openForm(null)}
          onBack={() => setView({ name: 'dashboard' })}
          onSelectTransaction={(id) => openForm(id)}
          setView={setView}
          t={t}
        />
        {formSheet}
      </>
    );
  }

  if (view.name === 'reports')
    return (
      <ConfiguredReportsScreen
        dependencies={dependencies}
        onBack={() => setView({ name: 'dashboard' })}
        t={t}
      />
    );
  if (view.name === 'settings')
    return (
      <>
        <ConfiguredSettingsScreen
          dependencies={dependencies}
          onAddTransaction={() => openForm(null)}
          onOpenAccounts={() => setView({ name: 'accounts' })}
          onOpenCategories={() => setView({ name: 'categories' })}
          onOpenSync={() => router.push('/sync')}
          onBack={() => setView({ name: 'dashboard' })}
          setView={setView}
          t={t}
        />
        {formSheet}
      </>
    );
  if (view.name === 'accounts')
    return (
      <ConfiguredAccountsScreen
        dependencies={dependencies}
        onBack={() => setView({ name: 'settings' })}
        t={t}
      />
    );
  if (view.name === 'categories')
    return (
      <ConfiguredCategoriesScreen
        dependencies={dependencies}
        onBack={() => setView({ name: 'settings' })}
        t={t}
      />
    );
  if (view.name === 'gold') {
    return <ConfiguredGoldManagementScreen onBack={() => setView({ name: 'settings' })} t={t} />;
  }

  return (
    <>
      <ConfiguredDashboardScreen
        dependencies={dependencies}
        key={refreshKey}
        onAddTransaction={() => openForm(null)}
        onOpenSync={() => router.push('/sync')}
        onOpenReports={() => setView({ name: 'reports' })}
        onOpenSettings={() => setView({ name: 'settings' })}
        onOpenTransactions={() => setView({ name: 'transactions' })}
        onSelectTransaction={(id) => openForm(id)}
        t={t}
      />
      {formSheet}
    </>
  );
}

function ConfiguredReportsScreen({
  dependencies,
  t,
  onBack,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  onBack(): void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <ReportsScreen {...useReports({ dependencies, t })} t={t} />
      <Text onPress={onBack} style={{ padding: 16 }}>
        {t('settingsBack')}
      </Text>
    </View>
  );
}
function ConfiguredSettingsScreen({
  dependencies,
  t,
  onAddTransaction,
  onBack,
  onOpenAccounts,
  onOpenCategories,
  onOpenSync,
  setView,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  onAddTransaction(): void;
  onBack(): void;
  onOpenAccounts(): void;
  onOpenCategories(): void;
  onOpenSync(): void;
  setView(view: FinanceView): void;
}) {
  const viewModel = useSettings({ dependencies, t });
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <SettingsScreen
          {...viewModel}
          onBack={onBack}
          onOpenAccounts={onOpenAccounts}
          onOpenCategories={onOpenCategories}
          onOpenGoldManagement={() => setView({ name: 'gold' })}
          onOpenSync={onOpenSync}
          t={t}
        />
      </View>
      <BottomNav
        activeKey="settings"
        addAccessibilityLabel={t('dashboardAddTransaction')}
        items={[
          { key: 'overview', label: t('navOverview'), icon: 'overview' },
          { key: 'transactions', label: t('navTransactions'), icon: 'list' },
          { key: 'reports', label: t('navReports'), icon: 'target' },
          { key: 'settings', label: t('navSettings'), icon: 'profile' },
        ]}
        onAdd={onAddTransaction}
        onChange={(key) => {
          if (key === 'overview') setView({ name: 'dashboard' });
          if (key === 'transactions') setView({ name: 'transactions' });
          if (key === 'reports') setView({ name: 'reports' });
        }}
      />
    </View>
  );
}
function ConfiguredAccountsScreen({
  dependencies,
  t,
  onBack,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  onBack(): void;
}) {
  return <AccountsScreen {...useSettings({ dependencies, t })} onBack={onBack} t={t} />;
}
function ConfiguredCategoriesScreen({
  dependencies,
  t,
  onBack,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  onBack(): void;
}) {
  return <CategoriesScreen {...useSettings({ dependencies, t })} onBack={onBack} t={t} />;
}

/**
 * Owns the gold feature's own dependency container (separate from
 * `FinanceDependencies`, mirroring how `createFinanceDependencies` is
 * created once via a ref-based effect in `RootScreen` above) since gold
 * repositories are independent of the finance ones.
 */
function ConfiguredGoldManagementScreen({ t, onBack }: { t: Translate; onBack(): void }) {
  const database = useLocalDatabase();
  const [goldDependencies, setGoldDependencies] = useState<GoldDependencies | null>(null);
  const databaseRef = useRef(database);
  databaseRef.current = database;

  useEffect(() => {
    let cancelled = false;
    createGoldDependencies(databaseRef.current).then((deps) => {
      if (!cancelled) setGoldDependencies(deps);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!goldDependencies) {
    return (
      <View style={{ flex: 1 }}>
        <Text style={{ padding: 16 }}>{t('dashboardLoading')}</Text>
      </View>
    );
  }

  return (
    <GoldManagementScreenWithViewModel dependencies={goldDependencies} onBack={onBack} t={t} />
  );
}

function GoldManagementScreenWithViewModel({
  dependencies,
  t,
  onBack,
}: {
  dependencies: GoldDependencies;
  t: Translate;
  onBack(): void;
}) {
  const viewModel = useGoldManagement({ dependencies, t });
  return <GoldManagementScreen {...viewModel} onBack={onBack} t={t} />;
}

function ConfiguredDashboardScreen({
  dependencies,
  t,
  onOpenTransactions,
  onAddTransaction,
  onSelectTransaction,
  onOpenSync,
  onOpenReports,
  onOpenSettings,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  onOpenTransactions(): void;
  onAddTransaction(): void;
  onSelectTransaction(id: string): void;
  onOpenSync(): void;
  onOpenReports(): void;
  onOpenSettings(): void;
}) {
  const viewModel = useDashboard({ dependencies, t });
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <DashboardScreen
          {...viewModel}
          onAddTransaction={onAddTransaction}
          onOpenSync={onOpenSync}
          onOpenReports={onOpenReports}
          onOpenSettings={onOpenSettings}
          onOpenTransactions={onOpenTransactions}
          onSelectTransaction={onSelectTransaction}
          t={t}
        />
      </View>
      <BottomNav
        activeKey="overview"
        addAccessibilityLabel={t('dashboardAddTransaction')}
        items={[
          { key: 'overview', label: t('navOverview'), icon: 'overview' },
          { key: 'transactions', label: t('navTransactions'), icon: 'list' },
          { key: 'reports', label: t('navReports'), icon: 'target' },
          { key: 'settings', label: t('navSettings'), icon: 'profile' },
        ]}
        onAdd={onAddTransaction}
        onChange={(key) => {
          if (key === 'transactions') onOpenTransactions();
          if (key === 'reports') onOpenReports();
          if (key === 'settings') onOpenSettings();
        }}
      />
    </View>
  );
}

function ConfiguredTransactionsScreen({
  dependencies,
  t,
  onBack,
  onAddTransaction,
  onSelectTransaction,
  setView,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  onBack(): void;
  onAddTransaction(): void;
  onSelectTransaction(id: string): void;
  setView(view: FinanceView): void;
}) {
  const viewModel = useTransactions({ dependencies, t });
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <TransactionsScreen
          {...viewModel}
          onAddTransaction={onAddTransaction}
          onBack={onBack}
          onSelectTransaction={onSelectTransaction}
          t={t}
        />
      </View>
      <BottomNav
        activeKey="transactions"
        addAccessibilityLabel={t('transactionsAdd')}
        items={[
          { key: 'overview', label: t('navOverview'), icon: 'overview' },
          { key: 'transactions', label: t('navTransactions'), icon: 'list' },
          { key: 'reports', label: t('navReports'), icon: 'target' },
          { key: 'settings', label: t('navSettings'), icon: 'profile' },
        ]}
        onAdd={onAddTransaction}
        onChange={(key) => {
          if (key === 'overview') onBack();
          if (key === 'reports') setView({ name: 'reports' });
          if (key === 'settings') setView({ name: 'settings' });
        }}
      />
    </View>
  );
}

function ConfiguredTransactionFormSheet({
  dependencies,
  t,
  transactionId,
  onClose,
  onSaved,
  visible,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  transactionId: string | null;
  onClose(): void;
  onSaved(): void;
  visible: boolean;
}) {
  const viewModel = useTransactionForm({ dependencies, onSaved, t, transactionId });
  return <TransactionFormSheet {...viewModel} onClose={onClose} t={t} visible={visible} />;
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
    () => (passphrase.trim() === '' ? null : createMobileSyncDependencies(database, passphrase)),
    [database, passphrase],
  );

  return (
    <SyncScreen
      {...useSync({ dependencies, passphrase, setPassphrase, t })}
      locale={locale}
      setLocale={setLocale}
      t={t}
    />
  );
}
