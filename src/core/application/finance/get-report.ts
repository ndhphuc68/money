import {
  TransactionListFilter,
  TransactionRepository,
} from '@/core/application/ports/finance-repositories';
import { calculatePeriodSummary } from '@/core/domain/finance/finance-calculations';

import { AggregateTotal, aggregateExpenseTotals, resolveMonthRange } from './get-dashboard';

export type GetReportDeps = {
  transactionRepository: TransactionRepository;
};

export type ReportPeriod = { from: string; to: string } | { month: string };

export type ReportFilters = Pick<
  TransactionListFilter,
  'type' | 'categoryId' | 'categoryIds' | 'accountId' | 'query'
>;

export type ReportView = {
  income: number;
  expense: number;
  netCashFlow: number;
  /** Expense magnitude grouped by category id, largest first. */
  categoryTotals: AggregateTotal[];
  /** Expense magnitude grouped by account id, largest first. */
  accountTotals: AggregateTotal[];
};

function resolvePeriodRange(period: ReportPeriod): { from: string; to: string } {
  return 'month' in period ? resolveMonthRange(period.month) : period;
}

/**
 * Builds a report for an arbitrary date range (or calendar month) with
 * optional filters. Like `GetDashboard`, `categoryTotals`/`accountTotals`
 * are expense-only magnitudes recomputed from the raw transaction list
 * rather than `calculatePeriodSummary`'s signed `byCategory`/`byAccount`
 * (see `aggregateExpenseTotals` for why).
 */
export class GetReport {
  constructor(private readonly deps: GetReportDeps) {}

  async execute(period: ReportPeriod, filters: ReportFilters = {}): Promise<ReportView> {
    const { from, to } = resolvePeriodRange(period);
    const transactions = await this.deps.transactionRepository.list({
      ...filters,
      from,
      to,
      includeDeleted: false,
    });

    const summary = calculatePeriodSummary(transactions, from, to);
    const categoryTotals = aggregateExpenseTotals(transactions, (transaction) =>
      transaction.type === 'transfer' ? null : transaction.categoryId,
    );
    const accountTotals = aggregateExpenseTotals(
      transactions,
      (transaction) => transaction.accountId,
    );

    return {
      income: summary.income,
      expense: summary.expense,
      netCashFlow: summary.netCashFlow,
      categoryTotals,
      accountTotals,
    };
  }
}
