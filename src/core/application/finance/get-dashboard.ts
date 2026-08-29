import {
  AccountRepository,
  TransactionRepository,
} from '@/core/application/ports/finance-repositories';
import {
  calculateAccountBalance,
  calculatePeriodSummary,
} from '@/core/domain/finance/finance-calculations';
import { Transaction } from '@/core/domain/finance/transaction';

export type GetDashboardDeps = {
  accountRepository: AccountRepository;
  transactionRepository: TransactionRepository;
};

export type DashboardChartPoint = {
  /** YYYY-MM */
  month: string;
  income: number;
  expense: number;
};

export type AggregateTotal = {
  id: string;
  amount: number;
};

export type DashboardView = {
  totalBalance: number;
  income: number;
  expense: number;
  netCashFlow: number;
  chartSeries: DashboardChartPoint[];
  categorySpending: AggregateTotal[];
  recentTransactions: Transaction[];
};

const CHART_MONTHS = 6;
const RECENT_TRANSACTIONS_LIMIT = 5;

/**
 * Returns the [from, to] inclusive ISO calendar-date bounds of a calendar
 * month formatted as YYYY-MM.
 */
export function resolveMonthRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const to = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

/** Shifts a YYYY-MM month string by `delta` months (may be negative). */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Sums transaction amounts of type "expense" grouped by a caller-chosen key
 * (category id or account id).
 *
 * This intentionally does NOT reuse `PeriodSummary.byCategory`/`byAccount`
 * from `calculatePeriodSummary`: those fields hold a *signed net* per key
 * (income positive, expense negative), which is the wrong shape for a
 * "spending by X" breakdown once income and expense share a key (this is
 * common for accounts, which are used by both income and expense
 * transactions). Recomputing directly from the raw transaction list avoids
 * that mismatch and only ever reflects true expense magnitude.
 */
export function aggregateExpenseTotals(
  transactions: Transaction[],
  keyOf: (transaction: Transaction) => string | null | undefined,
): AggregateTotal[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') {
      continue;
    }
    const key = keyOf(transaction);
    if (!key) {
      continue;
    }
    totals.set(key, (totals.get(key) ?? 0) + transaction.amount);
  }

  return Array.from(totals.entries())
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Builds the dashboard aggregate: total balance across active accounts
 * (all-time, not month-scoped), the current month's income/expense/net,
 * a trailing chart of the last `CHART_MONTHS` months, expense-by-category
 * spending for the month, and the most recent active transactions.
 */
export class GetDashboard {
  constructor(private readonly deps: GetDashboardDeps) {}

  async execute(month: string): Promise<DashboardView> {
    const [accounts, transactions] = await Promise.all([
      this.deps.accountRepository.listActive(),
      this.deps.transactionRepository.list({ includeDeleted: false }),
    ]);

    const totalBalance = accounts.reduce(
      (sum, account) => sum + calculateAccountBalance(account, transactions),
      0,
    );

    const { from, to } = resolveMonthRange(month);
    const periodTransactions = transactions.filter(
      (transaction) => transaction.date >= from && transaction.date <= to,
    );
    const summary = calculatePeriodSummary(periodTransactions, from, to);

    const chartSeries: DashboardChartPoint[] = [];
    for (let offset = CHART_MONTHS - 1; offset >= 0; offset -= 1) {
      const chartMonth = shiftMonth(month, -offset);
      const chartRange = resolveMonthRange(chartMonth);
      const chartSummary = calculatePeriodSummary(transactions, chartRange.from, chartRange.to);
      chartSeries.push({
        month: chartMonth,
        income: chartSummary.income,
        expense: chartSummary.expense,
      });
    }

    const categorySpending = aggregateExpenseTotals(periodTransactions, (transaction) =>
      transaction.type === 'transfer' ? null : transaction.categoryId,
    );

    const recentTransactions = transactions
      .slice()
      .sort((a, b) =>
        a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
      )
      .slice(0, RECENT_TRANSACTIONS_LIMIT);

    return {
      totalBalance,
      income: summary.income,
      expense: summary.expense,
      netCashFlow: summary.netCashFlow,
      chartSeries,
      categorySpending,
      recentTransactions,
    };
  }
}
