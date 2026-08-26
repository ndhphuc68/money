import { useCallback, useEffect, useState } from 'react';

import type { AccountRepository, CategoryRepository, ProfileSettingsRepository } from '@/core/application/ports/finance-repositories';
import type { GetDashboard } from '@/core/application/finance/get-dashboard';
import { formatVnd } from '@/core/domain/finance/money';
import type { Translate } from '@/i18n/translations';

import { buildTransactionListItem, currentMonth, indexById, maskAmountText, todayIsoDate, TransactionListItem } from './transaction-presentation';

/** The subset of `FinanceDependencies` (Task 7) this view model drives. */
export type DashboardDependencies = {
  getDashboard: GetDashboard;
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  profileSettingsRepository: ProfileSettingsRepository;
};

export type DashboardCategorySpendingItem = {
  id: string;
  label: string;
  amountLabel: string;
};

export type DashboardViewModel = {
  loading: boolean;
  displayNameLabel: string;
  amountsHidden: boolean;
  toggleAmountsHidden(): Promise<void>;
  totalBalanceLabel: string;
  accountCountLabel: string;
  asOfLabel: string;
  incomeLabel: string;
  expenseLabel: string;
  netLabel: string;
  netTone: 'positive' | 'negative';
  categorySpending: DashboardCategorySpendingItem[];
  recentTransactions: TransactionListItem[];
  refresh(): Promise<void>;
};

export type UseDashboardOptions = {
  dependencies: DashboardDependencies;
  t: Translate;
  /** Calendar month to summarize, formatted YYYY-MM. Defaults to the current month. */
  month?: string;
  /** Injectable clock, overridable in tests. Defaults to `new Date()`. */
  now?: () => Date;
};

type DashboardState = {
  displayNameLabel: string;
  totalBalanceLabel: string;
  accountCountLabel: string;
  asOfLabel: string;
  incomeLabel: string;
  expenseLabel: string;
  netLabel: string;
  netTone: 'positive' | 'negative';
  categorySpending: DashboardCategorySpendingItem[];
  recentTransactions: TransactionListItem[];
};

const EMPTY_STATE: DashboardState = {
  displayNameLabel: '',
  totalBalanceLabel: formatVnd(0),
  accountCountLabel: '',
  asOfLabel: '',
  incomeLabel: formatVnd(0),
  expenseLabel: formatVnd(0),
  netLabel: formatVnd(0),
  netTone: 'positive',
  categorySpending: [],
  recentTransactions: [],
};

/**
 * Thin UI view model over `GetDashboard` (Task 4): loads the current-month
 * dashboard aggregate on mount, resolves category/account ids into display
 * labels, and applies `ProfileSettings.amountsHidden` masking purely at the
 * presentation layer (the underlying totals are never altered).
 */
export function useDashboard({ dependencies, t, month, now }: UseDashboardOptions): DashboardViewModel {
  const resolvedMonth = month ?? currentMonth(now?.() ?? new Date());
  const [loading, setLoading] = useState(true);
  const [amountsHidden, setAmountsHidden] = useState(false);
  const [state, setState] = useState(EMPTY_STATE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, accounts, expenseCategories, settings] = await Promise.all([
        dependencies.getDashboard.execute(resolvedMonth),
        dependencies.accountRepository.listActive(),
        dependencies.categoryRepository.listActiveByType('expense'),
        dependencies.profileSettingsRepository.get(),
      ]);

      const hidden = settings.amountsHidden;
      const categoriesById = indexById(expenseCategories);
      const accountsById = indexById(accounts);

      const categorySpending: DashboardCategorySpendingItem[] = dashboard.categorySpending.map((entry) => ({
        id: entry.id,
        label: categoriesById.get(entry.id)?.name ?? t('transactionUncategorized'),
        amountLabel: maskAmountText(hidden, formatVnd(entry.amount)),
      }));

      const recentTransactions = dashboard.recentTransactions.map((transaction) =>
        buildTransactionListItem(transaction, accountsById, categoriesById, hidden, t),
      );

      setAmountsHidden(hidden);
      setState({
        displayNameLabel: settings.displayName.trim() || t('dashboardGuestName'),
        totalBalanceLabel: maskAmountText(hidden, formatVnd(dashboard.totalBalance)),
        accountCountLabel: t('dashboardAccountsCount', { count: accounts.length }),
        asOfLabel: t('dashboardAsOf', { date: todayIsoDate(now?.() ?? new Date()) }),
        incomeLabel: maskAmountText(hidden, formatVnd(dashboard.income)),
        expenseLabel: maskAmountText(hidden, formatVnd(dashboard.expense)),
        netLabel: maskAmountText(hidden, formatVnd(dashboard.netCashFlow)),
        netTone: dashboard.netCashFlow >= 0 ? 'positive' : 'negative',
        categorySpending,
        recentTransactions,
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies, resolvedMonth, t]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAmountsHidden = useCallback(async () => {
    const settings = await dependencies.profileSettingsRepository.get();
    await dependencies.profileSettingsRepository.save({ ...settings, amountsHidden: !settings.amountsHidden });
    await load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies, load]);

  return {
    loading,
    amountsHidden,
    toggleAmountsHidden,
    ...state,
    refresh: load,
  };
}
