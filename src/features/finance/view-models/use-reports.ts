import { useCallback, useEffect, useState } from 'react';

import type {
  AccountRepository,
  CategoryRepository,
} from '@/core/application/ports/finance-repositories';
import { shiftMonth } from '@/core/application/finance/get-dashboard';
import type { GetReport } from '@/core/application/finance/get-report';
import { formatVnd } from '@/core/domain/finance/money';
import type { Translate } from '@/i18n/translations';

import { currentMonth } from './transaction-presentation';

/** The subset of `FinanceDependencies` (Task 7) this view model drives. */
export type ReportsDependencies = {
  getReport: GetReport;
  categoryRepository: CategoryRepository;
  accountRepository: AccountRepository;
};

export type ReportTotalItem = {
  id: string;
  label: string;
  amountLabel: string;
};

export type ReportsViewModel = {
  loading: boolean;
  /** Calendar month currently shown, formatted YYYY-MM. */
  month: string;
  monthLabel: string;
  incomeLabel: string;
  expenseLabel: string;
  netLabel: string;
  netTone: 'positive' | 'negative';
  /** Expense magnitude grouped by category, largest first. Transfers are always excluded. */
  categoryTotals: ReportTotalItem[];
  /** Expense magnitude grouped by account, largest first. Transfers are always excluded. */
  accountTotals: ReportTotalItem[];
  goToPreviousMonth(): void;
  goToNextMonth(): void;
  refresh(): Promise<void>;
};

export type UseReportsOptions = {
  dependencies: ReportsDependencies;
  t: Translate;
  /** Calendar month to open the report on, formatted YYYY-MM. Defaults to the current month. */
  month?: string;
  /** Injectable clock, overridable in tests. Defaults to `new Date()`. */
  now?: () => Date;
};

type ReportState = {
  incomeLabel: string;
  expenseLabel: string;
  netLabel: string;
  netTone: 'positive' | 'negative';
  categoryTotals: ReportTotalItem[];
  accountTotals: ReportTotalItem[];
};

const EMPTY_STATE: ReportState = {
  incomeLabel: formatVnd(0),
  expenseLabel: formatVnd(0),
  netLabel: formatVnd(0),
  netTone: 'positive',
  categoryTotals: [],
  accountTotals: [],
};

/**
 * Thin UI view model over `GetReport` (Task 4): loads a single calendar
 * month's report on mount and whenever `goToPreviousMonth`/`goToNextMonth`
 * move the tracked month, always re-fetching fresh data for the new month
 * (no client-side caching of other months). `GetReport` already excludes
 * transfers from every total (see `aggregateExpenseTotals`, which only sums
 * `type === 'expense'` transactions), so this hook never has to re-apply
 * that filter itself.
 *
 * Category/account ids from the report's totals are resolved to display
 * names via `findById` (which resolves archived/hidden records too, since a
 * past transaction can reference a category or account no longer active),
 * mirroring `use-dashboard.ts`'s category-label lookup.
 */
export function useReports({ dependencies, t, month, now }: UseReportsOptions): ReportsViewModel {
  const [currentMonthValue, setCurrentMonthValue] = useState(
    month ?? currentMonth(now?.() ?? new Date()),
  );
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ReportState>(EMPTY_STATE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const report = await dependencies.getReport.execute({ month: currentMonthValue });

      const categoryTotals = await Promise.all(
        report.categoryTotals.map(async (entry): Promise<ReportTotalItem> => {
          const category = await dependencies.categoryRepository.findById(entry.id);
          return {
            id: entry.id,
            label: category?.name ?? t('transactionUncategorized'),
            amountLabel: formatVnd(entry.amount),
          };
        }),
      );
      const accountTotals = await Promise.all(
        report.accountTotals.map(async (entry): Promise<ReportTotalItem> => {
          const account = await dependencies.accountRepository.findById(entry.id);
          return {
            id: entry.id,
            label: account?.name ?? t('transactionUncategorized'),
            amountLabel: formatVnd(entry.amount),
          };
        }),
      );

      setState({
        incomeLabel: formatVnd(report.income),
        expenseLabel: formatVnd(report.expense),
        netLabel: formatVnd(report.netCashFlow),
        netTone: report.netCashFlow >= 0 ? 'positive' : 'negative',
        categoryTotals,
        accountTotals,
      });
    } finally {
      setLoading(false);
    }
  }, [dependencies, currentMonthValue, t]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    loading,
    month: currentMonthValue,
    monthLabel: currentMonthValue,
    ...state,
    goToPreviousMonth: () => setCurrentMonthValue((current) => shiftMonth(current, -1)),
    goToNextMonth: () => setCurrentMonthValue((current) => shiftMonth(current, 1)),
    refresh: load,
  };
}
