import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  AccountRepository,
  CategoryRepository,
} from '@/core/application/ports/finance-repositories';
import { resolveMonthRange, shiftMonth } from '@/core/application/finance/get-dashboard';
import type { GetReport, ReportFilters } from '@/core/application/finance/get-report';
import type {
  GetReportTrend,
  ReportTrendKind,
  ReportTrendPoint,
} from '@/core/application/finance/get-report-trend';
import {
  previousPeriodOfSameLength,
  quarterOf,
  resolveQuarterRange,
  resolveWeekRange,
  resolveYearRange,
  shiftQuarter,
  shiftWeek,
  shiftYear,
  startOfWeek,
} from '@/core/application/finance/report-periods';
import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import { formatVnd } from '@/core/domain/finance/money';
import type { PeriodKind, TransactionTypeFilter } from '@/components/finance';
import type { Translate } from '@/i18n/translations';

import { currentMonth, todayIsoDate } from './transaction-presentation';

/** The subset of `FinanceDependencies` this view model drives. */
export type ReportsDependencies = {
  getReport: GetReport;
  getReportTrend: GetReportTrend;
  categoryRepository: CategoryRepository;
  accountRepository: AccountRepository;
};

export type ReportTotalItem = {
  id: string;
  label: string;
  amountLabel: string;
  color?: string;
  icon?: string;
};

export type ReportCategoryChartSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
  percentLabel: string;
  icon?: string;
};

export type ReportTrendChartPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
};

export type ChangeTone = 'positive' | 'negative' | 'neutral';

export type ReportComparison = {
  incomeChangeLabel: string;
  incomeChangeTone: ChangeTone;
  expenseChangeLabel: string;
  expenseChangeTone: ChangeTone;
  netChangeLabel: string;
  netChangeTone: ChangeTone;
};

export type ReportsViewModel = {
  loading: boolean;

  periodKind: PeriodKind;
  periodLabel: string;
  onPeriodKindChange(kind: PeriodKind): void;
  onPreviousPeriod(): void;
  onNextPeriod(): void;
  customFrom: string;
  customTo: string;
  onCustomFromChange(value: string): void;
  onCustomToChange(value: string): void;

  type: TransactionTypeFilter;
  onTypeChange(type: TransactionTypeFilter): void;
  categories: Category[];
  accounts: Account[];
  categoryId: string | null;
  categoryIds: string[];
  onCategoryChange(id: string | null | string[]): void;
  accountId: string | null;
  onAccountChange(id: string | null): void;
  search: string;
  onSearchChange(value: string): void;

  incomeLabel: string;
  expenseLabel: string;
  netLabel: string;
  netTone: 'positive' | 'negative';
  comparison: ReportComparison | null;

  categoryTotals: ReportTotalItem[];
  categoryChartSlices: ReportCategoryChartSlice[];
  accountTotals: ReportTotalItem[];

  showTrend: boolean;
  trendPoints: ReportTrendChartPoint[];

  refresh(): Promise<void>;
};

export type UseReportsOptions = {
  dependencies: ReportsDependencies;
  t: Translate;
  /** Injectable clock, overridable in tests. Defaults to `new Date()`. */
  now?: () => Date;
};

type PeriodState = {
  kind: PeriodKind;
  weekStart: string;
  month: string;
  quarter: string;
  year: string;
  customFrom: string;
  customTo: string;
};

type Filters = {
  type: TransactionTypeFilter;
  categoryId: string | null;
  categoryIds: string[];
  accountId: string | null;
  search: string;
};

type ReportState = {
  incomeLabel: string;
  expenseLabel: string;
  netLabel: string;
  netTone: 'positive' | 'negative';
  comparison: ReportComparison | null;
  categoryTotals: ReportTotalItem[];
  categoryChartSlices: ReportCategoryChartSlice[];
  accountTotals: ReportTotalItem[];
  trendPoints: ReportTrendChartPoint[];
};

const EMPTY_STATE: ReportState = {
  incomeLabel: formatVnd(0),
  expenseLabel: formatVnd(0),
  netLabel: formatVnd(0),
  netTone: 'positive',
  comparison: null,
  categoryTotals: [],
  categoryChartSlices: [],
  accountTotals: [],
  trendPoints: [],
};

const TREND_KIND_BY_PERIOD_KIND: Partial<Record<PeriodKind, ReportTrendKind>> = {
  week: 'week',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
};

function initialPeriodState(now: Date): PeriodState {
  const today = todayIsoDate(now);
  const month = currentMonth(now);
  const monthRange = resolveMonthRange(month);
  return {
    kind: 'month',
    weekStart: startOfWeek(today),
    month,
    quarter: quarterOf(today),
    year: String(now.getFullYear()),
    customFrom: monthRange.from,
    customTo: monthRange.to,
  };
}

function resolveCurrentRange(state: PeriodState): { from: string; to: string } {
  switch (state.kind) {
    case 'week':
      return resolveWeekRange(state.weekStart);
    case 'month':
      return resolveMonthRange(state.month);
    case 'quarter':
      return resolveQuarterRange(state.quarter);
    case 'year':
      return resolveYearRange(state.year);
    case 'custom':
      return { from: state.customFrom, to: state.customTo };
  }
}

function shiftPeriod(state: PeriodState, delta: number): PeriodState {
  switch (state.kind) {
    case 'week':
      return { ...state, weekStart: shiftWeek(state.weekStart, delta) };
    case 'month':
      return { ...state, month: shiftMonth(state.month, delta) };
    case 'quarter':
      return { ...state, quarter: shiftQuarter(state.quarter, delta) };
    case 'year':
      return { ...state, year: shiftYear(state.year, delta) };
    case 'custom':
      return state;
  }
}

/** Anchor key to pass to `GetReportTrend`; unused/unreachable for 'custom' (no trend shown then). */
function periodAnchorKey(state: PeriodState): string {
  switch (state.kind) {
    case 'week':
      return state.weekStart;
    case 'month':
      return state.month;
    case 'quarter':
      return state.quarter;
    case 'year':
      return state.year;
    case 'custom':
      return state.month;
  }
}

function formatFullDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

function formatPeriodLabel(state: PeriodState, t: Translate): string {
  switch (state.kind) {
    case 'week': {
      const { from, to } = resolveWeekRange(state.weekStart);
      return t('reportsPeriodWeekLabel', { from: formatShortDate(from), to: formatFullDate(to) });
    }
    case 'month': {
      const [year, month] = state.month.split('-');
      return t('reportsPeriodMonthLabel', { month: Number(month), year });
    }
    case 'quarter': {
      const [year, quarter] = state.quarter.split('-Q');
      return t('reportsPeriodQuarterLabel', { quarter, year });
    }
    case 'year':
      return t('reportsPeriodYearLabel', { year: state.year });
    case 'custom':
      return t('reportsPeriodCustomLabel', {
        from: formatFullDate(state.customFrom),
        to: formatFullDate(state.customTo),
      });
  }
}

function trendPointLabel(kind: ReportTrendKind, point: ReportTrendPoint): string {
  switch (kind) {
    case 'week':
      return formatShortDate(point.from);
    case 'month':
      return point.key.split('-')[1];
    case 'quarter':
      return `Q${point.key.split('-Q')[1]}`;
    case 'year':
      return point.key;
  }
}

/**
 * `previous === 0` is treated as "no baseline": 0->0 is a flat 0%, any
 * nonzero current value is reported as a full +100%/-100% swing rather than
 * an undefined/Infinity percentage.
 */
function percentChange(current: number, previous: number): { label: string; tone: ChangeTone } {
  if (previous === 0) {
    if (current === 0) {
      return { label: '0%', tone: 'neutral' };
    }
    return { label: current > 0 ? '+100%' : '-100%', tone: current > 0 ? 'positive' : 'negative' };
  }
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  const tone: ChangeTone = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral';
  return { label: `${pct > 0 ? '+' : ''}${pct}%`, tone };
}

/**
 * For the expense row, "more spending" is bad news and "less spending" is
 * good news — the inverse of `percentChange`'s generic "increase = positive"
 * interpretation used for income/net. Flip the tone only, keep the label.
 */
function invertTone(tone: ChangeTone): ChangeTone {
  if (tone === 'positive') return 'negative';
  if (tone === 'negative') return 'positive';
  return 'neutral';
}

/**
 * Drives Reports v2: a period selector (week/month/quarter/year/custom, Task
 * 5), a category donut + income/expense trend line (Tasks 6-7), and a
 * current-vs-previous-period comparison — all on top of the existing
 * `GetReport` (extended in Task 2) and the new `GetReportTrend` (Task 3).
 * Every period-kind change or filter change re-fetches fresh data; there is
 * no client-side caching of other periods (same policy as the original
 * month-only view model).
 */
export function useReports({ dependencies, t, now }: UseReportsOptions): ReportsViewModel {
  const [period, setPeriod] = useState<PeriodState>(() =>
    initialPeriodState(now?.() ?? new Date()),
  );
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    categoryId: null,
    categoryIds: [],
    accountId: null,
    search: '',
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ReportState>(EMPTY_STATE);

  const reportFilters: ReportFilters = useMemo(
    () => ({
      type: filters.type === 'all' ? undefined : filters.type,
      categoryIds: filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
      categoryId:
        filters.categoryIds.length === 0 && filters.categoryId ? filters.categoryId : undefined,
      accountId: filters.accountId ?? undefined,
      query: filters.search.trim() === '' ? undefined : filters.search.trim(),
    }),
    [filters],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = resolveCurrentRange(period);
      const trendKind = TREND_KIND_BY_PERIOD_KIND[period.kind];

      const [expenseCategories, incomeCategories, activeAccounts, report, previousReport, trend] =
        await Promise.all([
          dependencies.categoryRepository.listActiveByType('expense'),
          dependencies.categoryRepository.listActiveByType('income'),
          dependencies.accountRepository.listActive(),
          dependencies.getReport.execute(range, reportFilters),
          dependencies.getReport.execute(previousPeriodOfSameLength(range), reportFilters),
          trendKind
            ? dependencies.getReportTrend.execute({
                kind: trendKind,
                anchor: periodAnchorKey(period),
                filters: reportFilters,
              })
            : Promise.resolve<ReportTrendPoint[]>([]),
        ]);

      const allCategories = [...incomeCategories, ...expenseCategories];
      setCategories(allCategories);
      setAccounts(activeAccounts);

      const categoriesById = new Map(allCategories.map((category) => [category.id, category]));
      const totalCategoryExpense = report.categoryTotals.reduce(
        (sum, entry) => sum + entry.amount,
        0,
      );

      const categoryTotals: ReportTotalItem[] = report.categoryTotals.map((entry) => {
        const category = categoriesById.get(entry.id);
        return {
          id: entry.id,
          label: category?.name ?? t('transactionUncategorized'),
          amountLabel: formatVnd(entry.amount),
          color: category?.color ?? '#F2734A',
          icon: category?.icon ?? 'fa6:shapes',
        };
      });

      const categoryChartSlices: ReportCategoryChartSlice[] = report.categoryTotals.map((entry) => {
        const category = categoriesById.get(entry.id);
        const percent =
          totalCategoryExpense > 0 ? Math.round((entry.amount / totalCategoryExpense) * 100) : 0;
        return {
          id: entry.id,
          label: category?.name ?? t('transactionUncategorized'),
          value: entry.amount,
          color: category?.color ?? '#F2734A',
          percentLabel: `${percent}%`,
          icon: category?.icon ?? 'fa6:shapes',
        };
      });

      const accountsById = new Map(activeAccounts.map((account) => [account.id, account]));
      const accountTotals: ReportTotalItem[] = await Promise.all(
        report.accountTotals.map(async (entry): Promise<ReportTotalItem> => {
          const account =
            accountsById.get(entry.id) ?? (await dependencies.accountRepository.findById(entry.id));
          return {
            id: entry.id,
            label: account?.name ?? t('transactionUncategorized'),
            amountLabel: formatVnd(entry.amount),
          };
        }),
      );

      const trendPoints: ReportTrendChartPoint[] = trendKind
        ? trend.map((point) => ({
            key: point.key,
            label: trendPointLabel(trendKind, point),
            income: point.income,
            expense: point.expense,
          }))
        : [];

      const income = percentChange(report.income, previousReport.income);
      const expense = percentChange(report.expense, previousReport.expense);
      const net = percentChange(report.netCashFlow, previousReport.netCashFlow);

      setState({
        incomeLabel: formatVnd(report.income),
        expenseLabel: formatVnd(report.expense),
        netLabel: formatVnd(report.netCashFlow),
        netTone: report.netCashFlow >= 0 ? 'positive' : 'negative',
        comparison: {
          incomeChangeLabel: income.label,
          incomeChangeTone: income.tone,
          expenseChangeLabel: expense.label,
          expenseChangeTone: invertTone(expense.tone),
          netChangeLabel: net.label,
          netChangeTone: net.tone,
        },
        categoryTotals,
        categoryChartSlices,
        accountTotals,
        trendPoints,
      });
    } finally {
      setLoading(false);
    }
  }, [dependencies, period, reportFilters, t]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    loading,

    periodKind: period.kind,
    periodLabel: formatPeriodLabel(period, t),
    onPeriodKindChange: (kind) => setPeriod((current) => ({ ...current, kind })),
    onPreviousPeriod: () => setPeriod((current) => shiftPeriod(current, -1)),
    onNextPeriod: () => setPeriod((current) => shiftPeriod(current, 1)),
    customFrom: period.customFrom,
    customTo: period.customTo,
    onCustomFromChange: (value) => setPeriod((current) => ({ ...current, customFrom: value })),
    onCustomToChange: (value) => setPeriod((current) => ({ ...current, customTo: value })),

    type: filters.type,
    onTypeChange: (type) => setFilters((current) => ({ ...current, type })),
    categories,
    accounts,
    categoryId: filters.categoryId,
    categoryIds: filters.categoryIds,
    onCategoryChange: (val) =>
      setFilters((current) => {
        if (Array.isArray(val)) {
          return { ...current, categoryIds: val, categoryId: val.length === 1 ? val[0] : null };
        }
        if (val === null) {
          return { ...current, categoryId: null, categoryIds: [] };
        }
        return { ...current, categoryId: val, categoryIds: [val] };
      }),
    accountId: filters.accountId,
    onAccountChange: (accountId) => setFilters((current) => ({ ...current, accountId })),
    search: filters.search,
    onSearchChange: (search) => setFilters((current) => ({ ...current, search })),

    ...state,

    showTrend: TREND_KIND_BY_PERIOD_KIND[period.kind] !== undefined,

    refresh: load,
  };
}
