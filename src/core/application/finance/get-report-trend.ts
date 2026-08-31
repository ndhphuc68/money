import { TransactionRepository } from '@/core/application/ports/finance-repositories';
import { calculatePeriodSummary } from '@/core/domain/finance/finance-calculations';

import { resolveMonthRange, shiftMonth } from './get-dashboard';
import { ReportFilters } from './get-report';
import {
  PeriodRange,
  resolveQuarterRange,
  resolveWeekRange,
  resolveYearRange,
  shiftQuarter,
  shiftWeek,
  shiftYear,
} from './report-periods';

export type ReportTrendKind = 'week' | 'month' | 'quarter' | 'year';

export type ReportTrendPoint = {
  /** Period key: Monday ISO date (week), YYYY-MM (month), YYYY-Qn (quarter), or YYYY (year). */
  key: string;
  from: string;
  to: string;
  income: number;
  expense: number;
};

export type GetReportTrendDeps = {
  transactionRepository: TransactionRepository;
};

export type GetReportTrendParams = {
  kind: ReportTrendKind;
  /** The most recent point's key — the series ends here. */
  anchor: string;
  /** Number of trailing points, including the anchor. Defaults per kind. */
  pointCount?: number;
  filters?: ReportFilters;
};

const DEFAULT_POINT_COUNT: Record<ReportTrendKind, number> = {
  week: 8,
  month: 6,
  quarter: 4,
  year: 5,
};

const RESOLVE_RANGE: Record<ReportTrendKind, (key: string) => PeriodRange> = {
  week: resolveWeekRange,
  month: resolveMonthRange,
  quarter: resolveQuarterRange,
  year: resolveYearRange,
};

const SHIFT: Record<ReportTrendKind, (key: string, delta: number) => string> = {
  week: shiftWeek,
  month: shiftMonth,
  quarter: shiftQuarter,
  year: shiftYear,
};

/**
 * Builds a trailing income/expense series ending on `anchor`, one
 * `transactionRepository.list` + `calculatePeriodSummary` call per point —
 * generalizes `GetDashboard.execute`'s `chartSeries` loop
 * (`get-dashboard.ts:120-130`) to all four period kinds.
 */
export class GetReportTrend {
  constructor(private readonly deps: GetReportTrendDeps) {}

  async execute(params: GetReportTrendParams): Promise<ReportTrendPoint[]> {
    const pointCount = params.pointCount ?? DEFAULT_POINT_COUNT[params.kind];
    const resolveRange = RESOLVE_RANGE[params.kind];
    const shift = SHIFT[params.kind];
    const points: ReportTrendPoint[] = [];

    for (let offset = pointCount - 1; offset >= 0; offset -= 1) {
      const key = offset === 0 ? params.anchor : shift(params.anchor, -offset);
      const range = resolveRange(key);
      const transactions = await this.deps.transactionRepository.list({
        ...params.filters,
        from: range.from,
        to: range.to,
        includeDeleted: false,
      });
      const summary = calculatePeriodSummary(transactions, range.from, range.to);
      points.push({
        key,
        from: range.from,
        to: range.to,
        income: summary.income,
        expense: summary.expense,
      });
    }

    return points;
  }
}
