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
import { RecurringOccurrencesScreen } from '@/features/finance/screens/recurring-occurrences-screen';
import { RecurringManagementScreen } from '@/features/finance/screens/recurring-management-screen';
import { useDashboard } from '@/features/finance/view-models/use-dashboard';
import { useOnboarding } from '@/features/finance/view-models/use-onboarding';
import { useTransactionForm } from '@/features/finance/view-models/use-transaction-form';
import { useTransactions } from '@/features/finance/view-models/use-transactions';
import { useReports } from '@/features/finance/view-models/use-reports';
import { useSettings } from '@/features/finance/view-models/use-settings';
import { useRecurringOccurrences } from '@/features/finance/view-models/use-recurring-occurrences';
import { useRecurringManagement } from '@/features/finance/view-models/use-recurring-management';
import { SyncScreen } from '@/features/sync/screens/sync-screen';
import {
  BottomNav,
  TransactionDetailSheet,
  TransactionFormSheet,
  type TransactionDetailData,
} from '@/components/finance';
import { formatVnd } from '@/core/domain/finance/money';
import type { Transaction } from '@/core/domain/finance/transaction';
import {
  formatDateLabel,
  maskAmountText,
  resolveCategoryColor,
  resolveCategoryIcon,
} from '@/features/finance/view-models/transaction-presentation';
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
  | { name: 'gold' }
  | { name: 'recurring' }
  | { name: 'recurringManagement' };

export default function RootScreen() {
  const database = useLocalDatabase();
  const [locale, setLocale] = useState<Locale>('vi');
  const [dependencies, setDependencies] = useState<FinanceDependencies | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [splashReady, setSplashReady] = useState(false);
  const [view, setView] = useState<FinanceView>({ name: 'dashboard' });
  const t = useMemo(() => translate.bind(null, locale), [locale]);

  const databaseRef = useRef(database);
  databaseRef.current = database;

  useEffect(() => {
    let cancelled = false;
    createFinanceDependencies(databaseRef.current).then((financeDependencies) => {
      if (!cancelled) {
        setDependencies(financeDependencies);
        financeDependencies.notificationScheduler
          ?.requestPermissions()
          ?.then((granted) => {
            if (granted) {
              return financeDependencies.scanAndScheduleRecurringNotifications?.execute();
            }
          })
          .catch(() => {
            // Best-effort: notification failures never block the app (spec §Xử lý lỗi).
          });
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
  const [formVisible, setFormVisible] = useState(false);
  const [formSession, setFormSession] = useState(0);
  const [everOpenedForm, setEverOpenedForm] = useState(false);

  const [detailTransactionId, setDetailTransactionId] = useState<string | null>(null);
  const [detailSession, setDetailSession] = useState(0);
  const [everOpenedDetail, setEverOpenedDetail] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  function openAddForm() {
    setEverOpenedForm(true);
    setFormSession((session) => session + 1);
    setFormVisible(true);
  }
  function closeForm() {
    setFormVisible(false);
  }
  function handleFormSaved() {
    closeForm();
    setRefreshKey((key) => key + 1);
  }

  function openDetail(transactionId: string) {
    setEverOpenedDetail(true);
    setDetailSession((session) => session + 1);
    setDetailTransactionId(transactionId);
  }
  function closeDetail() {
    setDetailTransactionId(null);
  }
  function handleDetailDeleted() {
    closeDetail();
    setRefreshKey((key) => key + 1);
  }

  const formSheet = everOpenedForm ? (
    <ConfiguredTransactionFormSheet
      dependencies={dependencies}
      key={`form-${formSession}`}
      onClose={closeForm}
      onSaved={handleFormSaved}
      t={t}
      transactionId={null}
      visible={formVisible}
    />
  ) : null;

  const detailSheet = everOpenedDetail ? (
    <ConfiguredTransactionDetailSheet
      dependencies={dependencies}
      key={`detail-${detailSession}`}
      onClose={closeDetail}
      onDeleted={handleDetailDeleted}
      t={t}
      transactionId={detailTransactionId}
      visible={detailTransactionId !== null}
    />
  ) : null;

  if (view.name === 'transactions') {
    return (
      <>
        <ConfiguredTransactionsScreen
          dependencies={dependencies}
          key={refreshKey}
          onAddTransaction={openAddForm}
          onBack={() => setView({ name: 'dashboard' })}
          onSelectTransaction={openDetail}
          setView={setView}
          t={t}
        />
        {formSheet}
        {detailSheet}
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
          onAddTransaction={openAddForm}
          onOpenAccounts={() => setView({ name: 'accounts' })}
          onOpenCategories={() => setView({ name: 'categories' })}
          onOpenSync={() => router.push('/sync')}
          onBack={() => setView({ name: 'dashboard' })}
          setView={setView}
          t={t}
        />
        {formSheet}
        {detailSheet}
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
  if (view.name === 'recurring') {
    return (
      <>
        <ConfiguredRecurringOccurrencesScreen
          dependencies={dependencies}
          onAddRecurring={openAddForm}
          onBack={() => setView({ name: 'settings' })}
          onOpenManagement={() => setView({ name: 'recurringManagement' })}
          t={t}
        />
        {formSheet}
        {detailSheet}
      </>
    );
  }
  if (view.name === 'recurringManagement') {
    return (
      <ConfiguredRecurringManagementScreen
        dependencies={dependencies}
        onBack={() => setView({ name: 'recurring' })}
        t={t}
      />
    );
  }

  return (
    <>
      <ConfiguredDashboardScreen
        dependencies={dependencies}
        key={refreshKey}
        onAddTransaction={openAddForm}
        onOpenSync={() => router.push('/sync')}
        onOpenReports={() => setView({ name: 'reports' })}
        onOpenSettings={() => setView({ name: 'settings' })}
        onOpenTransactions={() => setView({ name: 'transactions' })}
        onSelectTransaction={openDetail}
        t={t}
      />
      {formSheet}
      {detailSheet}
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
          onOpenRecurring={() => setView({ name: 'recurring' })}
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

function ConfiguredRecurringOccurrencesScreen({
  dependencies,
  onBack,
  onOpenManagement,
  onAddRecurring,
  t,
}: {
  dependencies: FinanceDependencies;
  onBack(): void;
  onOpenManagement(): void;
  onAddRecurring?(): void;
  t: Translate;
}) {
  const viewModel = useRecurringOccurrences({ dependencies, t });
  return (
    <RecurringOccurrencesScreen
      {...viewModel}
      onAddRecurring={onAddRecurring}
      onBack={onBack}
      onOpenManagement={onOpenManagement}
      t={t}
    />
  );
}

function ConfiguredRecurringManagementScreen({
  dependencies,
  onBack,
  t,
}: {
  dependencies: FinanceDependencies;
  onBack(): void;
  t: Translate;
}) {
  const viewModel = useRecurringManagement({ dependencies, t });
  return <RecurringManagementScreen {...viewModel} onBack={onBack} t={t} />;
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

function ConfiguredTransactionDetailSheet({
  dependencies,
  t,
  transactionId,
  onClose,
  onDeleted,
  visible,
}: {
  dependencies: FinanceDependencies;
  t: Translate;
  transactionId: string | null;
  onClose(): void;
  onDeleted(): void;
  visible: boolean;
}) {
  const [detail, setDetail] = useState<TransactionDetailData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!transactionId) {
        setDetail(null);
        return;
      }
      setLoading(true);
      try {
        const [transaction, activeAccounts, expenseCategories, incomeCategories, settings] =
          await Promise.all([
            dependencies.transactionRepository.findById(transactionId),
            dependencies.accountRepository.listActive(),
            dependencies.categoryRepository.listActiveByType('expense'),
            dependencies.categoryRepository.listActiveByType('income'),
            dependencies.profileSettingsRepository.get(),
          ]);

        if (!transaction || cancelled) return;

        const allCategories = [...incomeCategories, ...expenseCategories];
        const account = activeAccounts.find((a) => a.id === transaction.accountId);
        const destinationAccount =
          transaction.type === 'transfer'
            ? activeAccounts.find((a) => a.id === transaction.destinationAccountId)
            : null;
        const category =
          transaction.type === 'transfer'
            ? null
            : allCategories.find((c) => c.id === transaction.categoryId);

        const typeLabels: Record<Transaction['type'], string> = {
          expense: t('transactionTypeExpense'),
          income: t('transactionTypeIncome'),
          transfer: t('transactionTypeTransfer'),
        };

        const positive = transaction.type === 'income';
        const sign = transaction.type === 'income' ? '+' : '-';
        const amountLabel = maskAmountText(
          settings.amountsHidden,
          `${sign}${formatVnd(transaction.amount)}`,
        );

        const detailData: TransactionDetailData = {
          id: transaction.id,
          name: transaction.name,
          type: transaction.type,
          typeLabel: typeLabels[transaction.type],
          amountLabel,
          positive,
          categoryLabel:
            category?.name ??
            (transaction.type === 'transfer' ? null : t('transactionUncategorized')),
          categoryIcon: resolveCategoryIcon(transaction.type, category ?? null),
          categoryColor: resolveCategoryColor(transaction.type, category ?? null),
          accountName: account?.name ?? '',
          destinationAccountName: destinationAccount?.name ?? null,
          dateLabel: formatDateLabel(transaction.date),
          note: transaction.note,
        };

        if (!cancelled) {
          setDetail(detailData);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [dependencies, t, transactionId]);

  async function handleDelete(id: string) {
    await dependencies.deleteTransaction.execute(id);
    onDeleted();
  }

  return (
    <TransactionDetailSheet
      closeLabel={t('transactionDetailClose')}
      deleteConfirmCancel={t('transactionsDeleteConfirmCancel')}
      deleteConfirmConfirm={t('transactionsDeleteConfirmConfirm')}
      deleteConfirmMessage={t('transactionsDeleteConfirmMessage')}
      deleteConfirmTitle={t('transactionsDeleteConfirmTitle')}
      deleteLabel={t('transactionDetailDeleteAction')}
      detail={detail}
      labels={{
        type: t('transactionDetailTypeLabel'),
        category: t('transactionDetailCategoryLabel'),
        account: t('transactionDetailAccountLabel'),
        destination: t('transactionDetailDestinationLabel'),
        date: t('transactionDetailDateLabel'),
        note: t('transactionDetailNoteLabel'),
      }}
      loading={loading}
      onClose={onClose}
      onDelete={handleDelete}
      title={t('transactionDetailTitle')}
      visible={visible}
    />
  );
}

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
