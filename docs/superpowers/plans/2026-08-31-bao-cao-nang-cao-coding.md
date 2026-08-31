# Báo cáo nâng cao (Reports v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing bare-text `ReportsScreen` into "Reports v2": a flexible period selector (week/month/quarter/year/custom range), a category-spending donut chart, an income/expense trend line chart, and a current-vs-previous-period comparison — built on top of the existing `GetReport` use case and reusing `FilterBar`/`CategoryIcon`/theme tokens, per `docs/superpowers/specs/2026-08-31-bao-cao-nang-cao-design.md`.

**Architecture:** Follow the existing hexagonal layering used by the finance feature: pure period-math helpers in `src/core/application/finance/report-periods.ts`, a new trend use case in `src/core/application/finance/get-report-trend.ts` alongside the existing `GetReport`, composed into `FinanceDependencies` (`src/features/finance/finance-dependencies.ts`), driving a rewritten `useReports` view-model (`src/features/finance/view-models/use-reports.ts`) and `ReportsScreen` (`src/features/finance/screens/reports-screen.tsx`). No schema/DB changes — everything reads from the existing `transactions`/`categories`/`accounts` tables through `TransactionRepository.list`, which already supports `from`/`to`/`categoryIds` (spec §Dữ liệu, `finance-repositories.ts:76-89`).

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.9, Jest + `jest-expo`, `react-native-gifted-charts` (new dependency, Task 6) with its `react-native-svg`/`expo-linear-gradient` peer deps, existing base components (`Card`, `Sheet`, `PrimaryButton`) and finance components (`FilterBar`, `CategoryIcon`, `DateField`).

**Spec:** `docs/superpowers/specs/2026-08-31-bao-cao-nang-cao-design.md`.

## Global Constraints

- No schema/DB changes; no new repository methods. Every new query goes through the existing `TransactionRepository.list` (spec §Kiến trúc triển khai).
- `GetReport`'s existing `ReportPeriod = { from, to } | { month }` union is untouched (spec §Thuộc phạm vi v1 item 1) — the view-model always calls it with the concrete `{ from, to }` form computed by the new period helpers, for every period kind including month.
- **Out of scope for this plan** (carried over from the spec's own "Không thuộc phạm vi"/"Phase sau" sections, `docs/superpowers/specs/2026-08-31-bao-cao-nang-cao-design.md:12-18,29-35`):
  - Budget/Goal performance (no data model exists yet).
  - PDF/CSV export.
  - **Tổng hợp chi tiêu định kỳ (spec item 5)** — the underlying Recurring Expense feature itself has no plan execution yet (`docs/superpowers/STATUS.md`: recurring-expense-coding.md is "❌ Chưa code" as of 2026-08-31), so there is nothing to summarize. Revisit once recurring is built.
  - Multi-period (>2) comparison; multi-year year-over-year; forecasting upcoming recurring spend on the trend chart.
- Chart library: `react-native-gifted-charts` (`PieChart` in `donut` mode for category spending, `LineChart` with `data`/`data2` for the income-vs-expense trend) — chosen over Victory Native/hand-rolled SVG for its smaller footprint and documented dual-series `LineChart` API.
- Icons come from `lucide-react-native` only (project rule, `CLAUDE.md` §Icons) — no emoji.
- Only compose from `src/components/base` (`Card`, `Sheet`, `PrimaryButton`) for structural chrome; new feature-specific pieces (`PeriodSelector`, `ReportCategoryChart`, `ReportTrendChart`) go in `src/components/finance/` per the two-layer component rule (`CLAUDE.md` §Component).
- All colors/spacing/radius/typography come from `@/theme` — no raw hex in new code except where an existing pattern already does so as a documented fallback (e.g. `'#F2734A'` uncategorized-category fallback, copied verbatim from the current `use-reports.ts`).
- Every new user-facing string gets a camelCase key added to both `src/i18n/locales/vi.ts` and `src/i18n/locales/en.ts`, verified by an `it.each` test (established convention, `tests/i18n/finance-component-keys.test.ts`, `tests/i18n/recurring-component-keys.test.ts`).
- Screens must not access repositories directly — only through use cases/view-models (established convention, `src/features/finance/finance-dependencies.ts`).

## File Map

- Domain/application: `src/core/application/finance/report-periods.ts` (new), `src/core/application/finance/get-report.ts` (extend `ReportFilters`), `src/core/application/finance/get-report-trend.ts` (new)
- Dependencies: `src/features/finance/finance-dependencies.ts` (extend)
- Components: `src/components/finance/PeriodSelector.tsx` (new), `src/components/finance/ReportCategoryChart.tsx` (new), `src/components/finance/ReportTrendChart.tsx` (new), `src/components/finance/index.ts` (extend), `tests/mocks/lucide-react-native.tsx` (extend), `tests/mocks/react-native-gifted-charts.mock.tsx` (new), `jest.config.js` (extend `moduleNameMapper`)
- View-model/screen: `src/features/finance/view-models/use-reports.ts` (rewrite), `src/features/finance/screens/reports-screen.tsx` (rewrite)
- i18n: `src/i18n/locales/vi.ts`, `src/i18n/locales/en.ts` (extend + remove 2 obsolete keys)
- Tests: `tests/core/finance/report-periods.test.ts`, `tests/core/finance/get-report-trend.test.ts`, `tests/core/finance/finance-use-cases.test.ts` (extend `GetReport` describe block), `tests/components/finance/period-selector.test.tsx`, `tests/components/finance/report-charts.test.tsx`, `tests/features/finance/reports.test.tsx` (rewrite), `tests/i18n/reports-component-keys.test.ts` (new)
- Docs: `docs/superpowers/STATUS.md` (update)

---

### Task 1: Period-range math (`report-periods.ts`)

**Files:**

- Create: `src/core/application/finance/report-periods.ts`
- Test: `tests/core/finance/report-periods.test.ts`

**Interfaces:**

- Consumes: nothing (pure module, no imports from other new files).
- Produces:
  - `PeriodRange = { from: string; to: string }`
  - `startOfWeek(isoDate: string): string` — Monday of the week containing `isoDate`.
  - `resolveWeekRange(weekStart: string): PeriodRange` — `weekStart` (Monday) through the following Sunday.
  - `shiftWeek(weekStart: string, deltaWeeks: number): string`
  - `quarterOf(isoDate: string): string` — `"YYYY-Qn"`.
  - `resolveQuarterRange(quarter: string): PeriodRange`
  - `shiftQuarter(quarter: string, deltaQuarters: number): string`
  - `resolveYearRange(year: string): PeriodRange`
  - `shiftYear(year: string, deltaYears: number): string`
  - `previousPeriodOfSameLength(range: PeriodRange): PeriodRange` — the immediately preceding period with the same number of days.

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/core/finance/report-periods.test.ts
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

describe('startOfWeek', () => {
  it('returns the same Monday when given a Monday', () => {
    expect(startOfWeek('2026-08-24')).toBe('2026-08-24');
  });

  it('returns the Monday of the current week for any other weekday', () => {
    expect(startOfWeek('2026-08-27')).toBe('2026-08-24'); // Thursday
    expect(startOfWeek('2026-08-30')).toBe('2026-08-24'); // Sunday
  });
});

describe('resolveWeekRange / shiftWeek', () => {
  it('resolves Monday..Sunday inclusive', () => {
    expect(resolveWeekRange('2026-08-24')).toEqual({ from: '2026-08-24', to: '2026-08-30' });
  });

  it('shifts by 7 days per week, including across month/year boundaries', () => {
    expect(shiftWeek('2026-08-24', 1)).toBe('2026-08-31');
    expect(shiftWeek('2026-08-24', -1)).toBe('2026-08-17');
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
  });
});

describe('quarterOf / resolveQuarterRange / shiftQuarter', () => {
  it('derives the quarter key from a date', () => {
    expect(quarterOf('2026-01-15')).toBe('2026-Q1');
    expect(quarterOf('2026-08-27')).toBe('2026-Q3');
    expect(quarterOf('2026-12-31')).toBe('2026-Q4');
  });

  it('resolves a quarter key to its first..last day', () => {
    expect(resolveQuarterRange('2026-Q1')).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    expect(resolveQuarterRange('2026-Q3')).toEqual({ from: '2026-07-01', to: '2026-09-30' });
    expect(resolveQuarterRange('2026-Q4')).toEqual({ from: '2026-10-01', to: '2026-12-31' });
  });

  it('shifts across year boundaries in both directions', () => {
    expect(shiftQuarter('2026-Q3', 1)).toBe('2026-Q4');
    expect(shiftQuarter('2026-Q4', 1)).toBe('2027-Q1');
    expect(shiftQuarter('2026-Q1', -1)).toBe('2025-Q4');
  });
});

describe('resolveYearRange / shiftYear', () => {
  it('resolves a year to Jan 1..Dec 31', () => {
    expect(resolveYearRange('2026')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('shifts by whole years', () => {
    expect(shiftYear('2026', 1)).toBe('2027');
    expect(shiftYear('2026', -1)).toBe('2025');
  });
});

describe('previousPeriodOfSameLength', () => {
  it('returns the immediately preceding period of equal length for a full month', () => {
    expect(previousPeriodOfSameLength({ from: '2026-08-01', to: '2026-08-31' })).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });

  it('returns the immediately preceding period of equal length for a week', () => {
    expect(previousPeriodOfSameLength({ from: '2026-08-24', to: '2026-08-30' })).toEqual({
      from: '2026-08-17',
      to: '2026-08-23',
    });
  });

  it('returns the immediately preceding single day for a 1-day range', () => {
    expect(previousPeriodOfSameLength({ from: '2026-08-24', to: '2026-08-24' })).toEqual({
      from: '2026-08-23',
      to: '2026-08-23',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/core/finance/report-periods.test.ts`
Expected: FAIL with "Cannot find module '@/core/application/finance/report-periods'"

- [ ] **Step 3: Implement**

```typescript
// src/core/application/finance/report-periods.ts

/**
 * All internal date math uses UTC-anchored `Date` objects purely as a
 * calendar calculator (never wall-clock/timezone-sensitive) — mirrors the
 * convention in `get-dashboard.ts`'s `resolveMonthRange`/`shiftMonth`.
 */

export type PeriodRange = { from: string; to: string };

function parseIsoDateUtc(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDateUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysUtc(iso: string, days: number): string {
  const date = parseIsoDateUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDateUtc(date);
}

/** Returns the Monday (ISO date) of the week containing `isoDate`. */
export function startOfWeek(isoDate: string): string {
  const day = parseIsoDateUtc(isoDate).getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDaysUtc(isoDate, diffToMonday);
}

/** `weekStart` must already be a Monday (see `startOfWeek`). */
export function resolveWeekRange(weekStart: string): PeriodRange {
  return { from: weekStart, to: addDaysUtc(weekStart, 6) };
}

export function shiftWeek(weekStart: string, deltaWeeks: number): string {
  return addDaysUtc(weekStart, deltaWeeks * 7);
}

/** Returns `"YYYY-Qn"` for the quarter containing `isoDate`. */
export function quarterOf(isoDate: string): string {
  const date = parseIsoDateUtc(isoDate);
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${quarter}`;
}

function parseQuarterKey(quarter: string): { year: number; quarter: number } {
  const [yearPart, quarterPart] = quarter.split('-Q');
  return { year: Number(yearPart), quarter: Number(quarterPart) };
}

export function resolveQuarterRange(quarter: string): PeriodRange {
  const { year, quarter: q } = parseQuarterKey(quarter);
  const startMonth = (q - 1) * 3; // 0-indexed
  const from = toIsoDateUtc(new Date(Date.UTC(year, startMonth, 1)));
  const lastDay = new Date(Date.UTC(year, startMonth + 3, 0)).getUTCDate();
  const to = toIsoDateUtc(new Date(Date.UTC(year, startMonth + 2, lastDay)));
  return { from, to };
}

export function shiftQuarter(quarter: string, deltaQuarters: number): string {
  const { year, quarter: q } = parseQuarterKey(quarter);
  const absoluteQuarter = year * 4 + (q - 1) + deltaQuarters;
  const newYear = Math.floor(absoluteQuarter / 4);
  const newQuarter = (((absoluteQuarter % 4) + 4) % 4) + 1;
  return `${newYear}-Q${newQuarter}`;
}

export function resolveYearRange(year: string): PeriodRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function shiftYear(year: string, deltaYears: number): string {
  return String(Number(year) + deltaYears);
}

/**
 * The immediately preceding period with the same number of days as `range`
 * — e.g. for a 31-day month, the 31 days ending the day before `range.from`.
 * Deliberately day-count-based (not calendar-unit-based) per spec §Thuộc
 * phạm vi v1 item 4 ("kỳ trước liền kề cùng độ dài").
 */
export function previousPeriodOfSameLength(range: PeriodRange): PeriodRange {
  const fromDate = parseIsoDateUtc(range.from);
  const toDate = parseIsoDateUtc(range.to);
  const lengthDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  const previousTo = addDaysUtc(range.from, -1);
  const previousFrom = addDaysUtc(previousTo, -(lengthDays - 1));
  return { from: previousFrom, to: previousTo };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/core/finance/report-periods.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/application/finance/report-periods.ts tests/core/finance/report-periods.test.ts
git commit -m "feat: add week/quarter/year period-range math for reports"
```

---

### Task 2: `GetReport` — support multi-category filtering

**Files:**

- Modify: `src/core/application/finance/get-report.ts:15-18`
- Modify: `tests/core/finance/finance-use-cases.test.ts` (extend `FakeTransactionRepository.list`, add a `GetReport` test)

**Interfaces:**

- Consumes: `TransactionListFilter` (`src/core/application/ports/finance-repositories.ts:76-89`, already has `categoryIds?: readonly string[]`).
- Produces: `ReportFilters` now includes `categoryIds`.

- [ ] **Step 1: Write the failing test**

First, extend the shared `FakeTransactionRepository.list` in `tests/core/finance/finance-use-cases.test.ts` (around line 65-95) to also filter by `categoryIds`, matching the real repository's behavior used by `use-transactions.ts:126`:

```typescript
// tests/core/finance/finance-use-cases.test.ts
// Inside FakeTransactionRepository.list, after the existing `filter.categoryId` block:
    if (filter.categoryIds && filter.categoryIds.length > 0) {
      items = items.filter((t) => filter.categoryIds!.includes(t.categoryId ?? ''));
    }
```

Then add a new test in the `describe('GetReport', ...)` block (after the existing "applies additional filters" test, `finance-use-cases.test.ts:762-797`):

```typescript
  it('applies a multi-category filter (categoryIds)', async () => {
    const transactionRepository = new FakeTransactionRepository();
    const now = makeClock('2026-08-25T00:00:00.000Z');
    const generateId = makeIdFactory('rep3');
    const createTransaction = new CreateTransaction({
      transactionRepository,
      now,
      deviceId: DEVICE_ID,
      generateId,
    });

    await createTransaction.execute({
      type: 'expense',
      amount: 400000,
      accountId: 'account-cash',
      categoryId: 'category-food',
      date: '2026-08-02',
      name: 'Groceries',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 150000,
      accountId: 'account-cash',
      categoryId: 'category-transport',
      date: '2026-08-03',
      name: 'Taxi',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 90000,
      accountId: 'account-cash',
      categoryId: 'category-bills',
      date: '2026-08-04',
      name: 'Internet',
      note: null,
    });

    const report = new GetReport({ transactionRepository });
    const view = await report.execute(
      { month: '2026-08' },
      { categoryIds: ['category-food', 'category-transport'] },
    );

    expect(view.expense).toBe(550000);
    expect(view.categoryTotals).toEqual(
      expect.arrayContaining([
        { id: 'category-food', amount: 400000 },
        { id: 'category-transport', amount: 150000 },
      ]),
    );
    expect(view.categoryTotals).toHaveLength(2);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/core/finance/finance-use-cases.test.ts -t "applies a multi-category filter"`
Expected: FAIL — `view.expense` is `640000` (all three categories included) because `GetReport` doesn't forward `categoryIds` yet.

- [ ] **Step 3: Implement**

```typescript
// src/core/application/finance/get-report.ts
export type ReportFilters = Pick<
  TransactionListFilter,
  'type' | 'categoryId' | 'categoryIds' | 'accountId' | 'query'
>;
```

No other change needed: `GetReport.execute` already spreads `...filters` into `transactionRepository.list(...)` (`get-report.ts:46-51`), so `categoryIds` flows through automatically once it's part of the `ReportFilters` type.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/core/finance/finance-use-cases.test.ts`
Expected: PASS (all `GetReport`/`GetDashboard`/other tests in the file)

- [ ] **Step 5: Commit**

```bash
git add src/core/application/finance/get-report.ts tests/core/finance/finance-use-cases.test.ts
git commit -m "feat: support multi-category filtering in GetReport"
```

---

### Task 3: Trend use case (`get-report-trend.ts`)

**Files:**

- Create: `src/core/application/finance/get-report-trend.ts`
- Test: `tests/core/finance/get-report-trend.test.ts`

**Interfaces:**

- Consumes: `report-periods.ts` (Task 1) — `PeriodRange`, `resolveWeekRange`, `shiftWeek`, `resolveQuarterRange`, `shiftQuarter`, `resolveYearRange`, `shiftYear`; `get-dashboard.ts` — `resolveMonthRange`, `shiftMonth`; `get-report.ts` (Task 2) — `ReportFilters`; `finance-calculations.ts` — `calculatePeriodSummary`.
- Produces:
  - `ReportTrendKind = 'week' | 'month' | 'quarter' | 'year'`
  - `ReportTrendPoint = { key: string; from: string; to: string; income: number; expense: number }`
  - `GetReportTrendDeps = { transactionRepository: TransactionRepository }`
  - `GetReportTrendParams = { kind: ReportTrendKind; anchor: string; pointCount?: number; filters?: ReportFilters }`
  - `class GetReportTrend { constructor(deps: GetReportTrendDeps); execute(params: GetReportTrendParams): Promise<ReportTrendPoint[]> }` — returns `pointCount` (default per kind: week 8, month 6, quarter 4, year 5) trailing points, most recent last, ending on the period identified by `anchor`.

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/core/finance/get-report-trend.test.ts
import {
  CreateTransactionInput,
  TransactionListFilter,
  TransactionRepository,
  UpdateTransactionInput,
  WriteContext,
} from '@/core/application/ports/finance-repositories';
import { CreateTransaction } from '@/core/application/finance/create-transaction';
import { GetReportTrend } from '@/core/application/finance/get-report-trend';
import { Transaction, TransactionInput, validateTransactionInput } from '@/core/domain/finance/transaction';

const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440099';

class FakeTransactionRepository implements TransactionRepository {
  private readonly store = new Map<string, Transaction>();

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const { id, originDeviceId, operationId: _operationId, now, ...rest } = input;
    validateTransactionInput(rest);
    const transaction = buildTransaction(id, rest, {
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    });
    this.store.set(id, transaction);
    return transaction;
  }

  async update(): Promise<Transaction> {
    throw new Error('not implemented');
  }

  async softDelete(): Promise<Transaction> {
    throw new Error('not implemented');
  }

  async restore(): Promise<Transaction> {
    throw new Error('not implemented');
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter: TransactionListFilter = {}): Promise<Transaction[]> {
    let items = Array.from(this.store.values());
    if (!filter.includeDeleted) {
      items = items.filter((t) => t.deletedAt === null);
    }
    if (filter.categoryIds && filter.categoryIds.length > 0) {
      items = items.filter((t) => filter.categoryIds!.includes(t.categoryId ?? ''));
    } else if (filter.categoryId) {
      items = items.filter((t) => t.categoryId === filter.categoryId);
    }
    if (filter.from) {
      items = items.filter((t) => t.date >= filter.from!);
    }
    if (filter.to) {
      items = items.filter((t) => t.date <= filter.to!);
    }
    return items;
  }

  async saveWithOperation(): Promise<void> {
    throw new Error('not implemented');
  }
}

function buildTransaction(
  id: string,
  input: TransactionInput,
  meta: { createdAt: string; updatedAt: string; deletedAt: string | null; revision: number; originDeviceId: string },
): Transaction {
  const base = {
    id,
    amount: input.amount,
    accountId: input.accountId,
    date: input.date,
    name: input.name,
    note: input.note ?? null,
    ...meta,
  };
  if (input.type === 'transfer') {
    return { ...base, type: 'transfer', destinationAccountId: input.destinationAccountId as string, categoryId: null };
  }
  return { ...base, type: input.type, categoryId: input.categoryId as string, destinationAccountId: null };
}

function makeIdFactory(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

describe('GetReportTrend', () => {
  it('builds a trailing monthly series ending on the anchor month, defaulting to 6 points', async () => {
    const transactionRepository = new FakeTransactionRepository();
    const now = () => new Date('2026-08-25T00:00:00.000Z').toISOString();
    const generateId = makeIdFactory('trend');
    const createTransaction = new CreateTransaction({ transactionRepository, now, deviceId: DEVICE_ID, generateId });

    await createTransaction.execute({
      type: 'income',
      amount: 1000000,
      accountId: 'account-cash',
      categoryId: 'category-salary',
      date: '2026-08-05',
      name: 'Salary',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 200000,
      accountId: 'account-cash',
      categoryId: 'category-food',
      date: '2026-03-10',
      name: 'Groceries in March',
      note: null,
    });

    const trend = new GetReportTrend({ transactionRepository });
    const points = await trend.execute({ kind: 'month', anchor: '2026-08' });

    expect(points).toHaveLength(6);
    expect(points.map((p) => p.key)).toEqual([
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ]);
    expect(points[0]).toEqual({ key: '2026-03', from: '2026-03-01', to: '2026-03-31', income: 0, expense: 200000 });
    expect(points[5]).toEqual({ key: '2026-08', from: '2026-08-01', to: '2026-08-31', income: 1000000, expense: 0 });
  });

  it('respects an explicit pointCount and a weekly kind', async () => {
    const transactionRepository = new FakeTransactionRepository();
    const trend = new GetReportTrend({ transactionRepository });
    const points = await trend.execute({ kind: 'week', anchor: '2026-08-24', pointCount: 3 });

    expect(points.map((p) => p.key)).toEqual(['2026-08-10', '2026-08-17', '2026-08-24']);
    expect(points[2]).toEqual({ key: '2026-08-24', from: '2026-08-24', to: '2026-08-30', income: 0, expense: 0 });
  });

  it('applies filters to every point in a quarterly series', async () => {
    const transactionRepository = new FakeTransactionRepository();
    const now = () => new Date('2026-08-25T00:00:00.000Z').toISOString();
    const generateId = makeIdFactory('trendq');
    const createTransaction = new CreateTransaction({ transactionRepository, now, deviceId: DEVICE_ID, generateId });

    await createTransaction.execute({
      type: 'expense',
      amount: 300000,
      accountId: 'account-cash',
      categoryId: 'category-food',
      date: '2026-07-15',
      name: 'Q3 groceries',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 500000,
      accountId: 'account-cash',
      categoryId: 'category-bills',
      date: '2026-07-16',
      name: 'Q3 bills',
      note: null,
    });

    const trend = new GetReportTrend({ transactionRepository });
    const points = await trend.execute({
      kind: 'quarter',
      anchor: '2026-Q3',
      pointCount: 1,
      filters: { categoryId: 'category-food' },
    });

    expect(points).toEqual([
      { key: '2026-Q3', from: '2026-07-01', to: '2026-09-30', income: 0, expense: 300000 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/core/finance/get-report-trend.test.ts`
Expected: FAIL with "Cannot find module '@/core/application/finance/get-report-trend'"

- [ ] **Step 3: Implement**

```typescript
// src/core/application/finance/get-report-trend.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/core/finance/get-report-trend.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/application/finance/get-report-trend.ts tests/core/finance/get-report-trend.test.ts
git commit -m "feat: add GetReportTrend use case for trailing period series"
```

---

### Task 4: Wire `GetReportTrend` into `FinanceDependencies`

**Files:**

- Modify: `src/features/finance/finance-dependencies.ts`

**Interfaces:**

- Consumes: `GetReportTrend` (Task 3).
- Produces: `FinanceDependencies.getReportTrend: GetReportTrend`.

- [ ] **Step 1: Write the failing test**

There is no dedicated `finance-dependencies.test.ts` in this codebase (composition is exercised indirectly through feature tests). Instead, add a type-level check by using the new field in Task 8's `use-reports.ts` — for this task, verify by TypeScript compilation only.

Run: `npx tsc --noEmit -p tsconfig.json` — expect no new errors related to `getReportTrend` yet (it doesn't exist yet, so nothing references it — this step just confirms the baseline compiles before the change).

- [ ] **Step 2: (no separate failing-test run — see Step 4 for verification)**

- [ ] **Step 3: Implement**

```typescript
// src/features/finance/finance-dependencies.ts
// Add import alongside the existing GetReport import:
import { GetReportTrend } from '@/core/application/finance/get-report-trend';

// Add to the FinanceDependencies type, next to getReport:
  getReportTrend: GetReportTrend;

// Add to the object returned by createFinanceDependencies, next to getReport:
    getReportTrend: new GetReportTrend({ transactionRepository }),
```

- [ ] **Step 4: Run verification**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (the new field is additive; nothing yet consumes it in a way that would break).

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/finance-dependencies.ts
git commit -m "feat: wire GetReportTrend into FinanceDependencies"
```

---

### Task 5: `PeriodSelector` component

**Files:**

- Create: `src/components/finance/PeriodSelector.tsx`
- Modify: `src/components/finance/index.ts`
- Modify: `tests/mocks/lucide-react-native.tsx` (add `Calendar`)
- Test: `tests/components/finance/period-selector.test.tsx`

**Interfaces:**

- Consumes: `Card`, `Sheet`, `PrimaryButton` (`@/components/base`); `DateField` (`./DateField`); `colors`/`radius`/`spacing`/`typography` (`@/theme`).
- Produces:
  - `PeriodKind = 'week' | 'month' | 'quarter' | 'year' | 'custom'`
  - `PeriodSelectorProps` (see component code below)
  - `PeriodSelector(props: PeriodSelectorProps): JSX.Element`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/finance/period-selector.test.tsx
import { fireEvent, render } from '@testing-library/react-native';

import { PeriodSelector } from '@/components/finance';

const LABELS = {
  apply: 'Áp dụng',
  close: 'Đóng',
  custom: 'Tùy chọn',
  customFrom: 'Từ ngày',
  customTo: 'Đến ngày',
  month: 'Tháng',
  next: 'Kỳ sau',
  previous: 'Kỳ trước',
  quarter: 'Quý',
  week: 'Tuần',
  year: 'Năm',
};

describe('PeriodSelector', () => {
  it('shows the current kind, range label, and calls onKindChange when a chip is pressed', () => {
    const onKindChange = jest.fn();
    const screen = render(
      <PeriodSelector
        customFrom="2026-08-01"
        customTo="2026-08-31"
        kind="month"
        labels={LABELS}
        onCustomFromChange={jest.fn()}
        onCustomToChange={jest.fn()}
        onKindChange={onKindChange}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        rangeLabel="Tháng 8/2026"
      />,
    );

    expect(screen.getByText('Tháng 8/2026')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Quý'));
    expect(onKindChange).toHaveBeenCalledWith('quarter');
  });

  it('calls onPrevious/onNext when the nav arrows are pressed for a non-custom kind', () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    const screen = render(
      <PeriodSelector
        customFrom="2026-08-01"
        customTo="2026-08-31"
        kind="week"
        labels={LABELS}
        onCustomFromChange={jest.fn()}
        onCustomToChange={jest.fn()}
        onKindChange={jest.fn()}
        onNext={onNext}
        onPrevious={onPrevious}
        rangeLabel="Tuần 24/08 - 30/08/2026"
      />,
    );

    fireEvent.press(screen.getByLabelText('Kỳ trước'));
    fireEvent.press(screen.getByLabelText('Kỳ sau'));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('opens a custom-range sheet with two DateFields when the Custom chip is pressed', () => {
    const screen = render(
      <PeriodSelector
        customFrom="2026-08-01"
        customTo="2026-08-31"
        kind="week"
        labels={LABELS}
        onCustomFromChange={jest.fn()}
        onCustomToChange={jest.fn()}
        onKindChange={jest.fn()}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        rangeLabel="Tuần 24/08 - 30/08/2026"
      />,
    );

    fireEvent.press(screen.getByLabelText('Tùy chọn'));
    expect(screen.getByText('Từ ngày')).toBeTruthy();
    expect(screen.getByText('Đến ngày')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/components/finance/period-selector.test.tsx`
Expected: FAIL — `PeriodSelector` is not exported from `@/components/finance`.

- [ ] **Step 3: Implement**

Add `Calendar` to the lucide mock (`tests/mocks/lucide-react-native.tsx`), next to the other named exports:

```typescript
export const Calendar = createIcon();
```

...and to the `icons` map object in the same file:

```typescript
  Calendar,
```

Create the component:

```tsx
// src/components/finance/PeriodSelector.tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Card, PrimaryButton, Sheet } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

import { DateField } from './DateField';

export type PeriodKind = 'week' | 'month' | 'quarter' | 'year' | 'custom';

const KIND_ORDER: readonly PeriodKind[] = ['week', 'month', 'quarter', 'year', 'custom'];

export type PeriodSelectorLabels = {
  week: string;
  month: string;
  quarter: string;
  year: string;
  custom: string;
  previous: string;
  next: string;
  customFrom: string;
  customTo: string;
  apply: string;
  close: string;
};

export type PeriodSelectorProps = {
  kind: PeriodKind;
  onKindChange: (kind: PeriodKind) => void;
  rangeLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (isoDate: string) => void;
  onCustomToChange: (isoDate: string) => void;
  labels: PeriodSelectorLabels;
};

export function PeriodSelector({
  kind,
  onKindChange,
  rangeLabel,
  onPrevious,
  onNext,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  labels,
}: PeriodSelectorProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const kindLabels: Record<PeriodKind, string> = {
    week: labels.week,
    month: labels.month,
    quarter: labels.quarter,
    year: labels.year,
    custom: labels.custom,
  };

  const handleKindPress = (next: PeriodKind) => {
    onKindChange(next);
    if (next === 'custom') {
      setSheetOpen(true);
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.kindRow}>
        {KIND_ORDER.map((option) => {
          const active = option === kind;
          return (
            <Pressable
              accessibilityLabel={kindLabels[option]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option}
              onPress={() => handleKindPress(option)}
              style={({ pressed }) => [
                styles.kindChip,
                active && styles.kindChipActive,
                pressed && !active && styles.kindChipPressed,
              ]}>
              <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
                {kindLabels[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {kind === 'custom' ? (
        <Pressable
          accessibilityLabel={rangeLabel}
          accessibilityRole="button"
          onPress={() => setSheetOpen(true)}
          style={styles.rangeRow}>
          <Calendar color={colors.content.secondary} size={18} />
          <Text style={styles.rangeLabel}>{rangeLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.rangeRow}>
          <Pressable
            accessibilityLabel={labels.previous}
            accessibilityRole="button"
            onPress={onPrevious}
            style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
            <ChevronLeft color={colors.content.primary} size={20} />
          </Pressable>
          <Text style={styles.rangeLabel}>{rangeLabel}</Text>
          <Pressable
            accessibilityLabel={labels.next}
            accessibilityRole="button"
            onPress={onNext}
            style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
            <ChevronRight color={colors.content.primary} size={20} />
          </Pressable>
        </View>
      )}

      <Sheet closeLabel={labels.close} onClose={() => setSheetOpen(false)} title={labels.custom} visible={sheetOpen}>
        <DateField confirmLabel={labels.apply} label={labels.customFrom} onChange={onCustomFromChange} value={customFrom} />
        <DateField confirmLabel={labels.apply} label={labels.customTo} onChange={onCustomToChange} value={customTo} />
        <PrimaryButton
          backgroundColor={colors.brand.primary}
          label={labels.apply}
          onPress={() => setSheetOpen(false)}
          style={styles.applyButtonSpacing}
        />
      </Sheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  applyButtonSpacing: {
    marginTop: spacing[3],
  },
  container: {
    gap: spacing[3],
  },
  kindChip: {
    backgroundColor: colors.surface.muted,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: spacing[2],
  },
  kindChipActive: {
    backgroundColor: colors.content.primary,
  },
  kindChipPressed: {
    backgroundColor: colors.border.subtle,
  },
  kindChipText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  kindChipTextActive: {
    color: colors.content.inverse,
    fontWeight: typography.weights.bold,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  navButtonPressed: {
    backgroundColor: colors.border.subtle,
  },
  rangeLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  rangeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
  },
});
```

Export it from the barrel file:

```typescript
// src/components/finance/index.ts — add near the other component exports
export { PeriodSelector } from './PeriodSelector';
export type { PeriodKind, PeriodSelectorLabels, PeriodSelectorProps } from './PeriodSelector';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/components/finance/period-selector.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/PeriodSelector.tsx src/components/finance/index.ts tests/mocks/lucide-react-native.tsx tests/components/finance/period-selector.test.tsx
git commit -m "feat: add PeriodSelector component for week/month/quarter/year/custom"
```

---

### Task 6: Chart dependencies + `ReportCategoryChart`

**Files:**

- Modify: `package.json` (via `expo install`)
- Create: `tests/mocks/react-native-gifted-charts.mock.tsx`
- Modify: `jest.config.js`
- Create: `src/components/finance/ReportCategoryChart.tsx`
- Modify: `src/components/finance/index.ts`
- Test: `tests/components/finance/report-charts.test.tsx` (category-chart tests; Task 7 adds the trend-chart tests to the same file)

**Interfaces:**

- Consumes: `react-native-gifted-charts`'s `PieChart`; `CategoryIcon` (`./icons`).
- Produces:
  - `ReportCategoryChartSlice = { id: string; label: string; value: number; color: string; percentLabel: string; icon?: string }`
  - `ReportCategoryChart(props: { slices: ReportCategoryChartSlice[]; emptyLabel: string }): JSX.Element`

- [ ] **Step 1: Install dependencies and add the Jest mock**

Run: `npx expo install react-native-svg react-native-gifted-charts expo-linear-gradient`

This adds `react-native-svg` and `expo-linear-gradient` (`react-native-gifted-charts`'s two peer deps — `expo-linear-gradient` is the Expo-native substitute for the optional `react-native-linear-gradient` peer) at Expo-SDK-54-compatible versions, plus `react-native-gifted-charts` itself.

Create the mock (mirrors the existing `tests/mocks/lucide-react-native.tsx` / `tests/mocks/datetimepicker.mock.tsx` pattern — charts render real SVG via native code that Jest can't exercise, so tests assert on the surrounding legend/label markup instead):

```tsx
// tests/mocks/react-native-gifted-charts.mock.tsx
import { View } from 'react-native';

export function PieChart(props: any) {
  return <View testID="mock-pie-chart" />;
}

export function LineChart(props: any) {
  return <View testID="mock-line-chart" />;
}
```

Register it in `jest.config.js`'s `moduleNameMapper`:

```javascript
'^react-native-gifted-charts$': '<rootDir>/tests/mocks/react-native-gifted-charts.mock.tsx',
```

- [ ] **Step 2: Write the failing test**

```typescript
// tests/components/finance/report-charts.test.tsx
import { render } from '@testing-library/react-native';

import { ReportCategoryChart } from '@/components/finance';

describe('ReportCategoryChart', () => {
  it('renders a legend row per slice with label and percent', () => {
    const screen = render(
      <ReportCategoryChart
        emptyLabel="Chưa có chi tiêu"
        slices={[
          { id: 'c1', label: 'Ăn uống', value: 400000, color: '#F2734A', percentLabel: '73%', icon: 'fa6:utensils' },
          { id: 'c2', label: 'Di chuyển', value: 150000, color: '#14B8A6', percentLabel: '27%' },
        ]}
      />,
    );

    expect(screen.getByText('Ăn uống')).toBeTruthy();
    expect(screen.getByText('73%')).toBeTruthy();
    expect(screen.getByText('Di chuyển')).toBeTruthy();
    expect(screen.getByText('27%')).toBeTruthy();
  });

  it('shows the empty label and no chart when there are no slices', () => {
    const screen = render(<ReportCategoryChart emptyLabel="Chưa có chi tiêu" slices={[]} />);

    expect(screen.getByText('Chưa có chi tiêu')).toBeTruthy();
    expect(screen.queryByTestId('mock-pie-chart')).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest tests/components/finance/report-charts.test.tsx`
Expected: FAIL — `ReportCategoryChart` is not exported from `@/components/finance`.

- [ ] **Step 4: Implement**

```tsx
// src/components/finance/ReportCategoryChart.tsx
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { colors, spacing, typography } from '@/theme';

import { CategoryIcon } from './icons';

export type ReportCategoryChartSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
  percentLabel: string;
  icon?: string;
};

export type ReportCategoryChartProps = {
  slices: ReportCategoryChartSlice[];
  emptyLabel: string;
};

export function ReportCategoryChart({ slices, emptyLabel }: ReportCategoryChartProps) {
  if (slices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const pieData = slices.map((slice) => ({ value: slice.value, color: slice.color }));

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <PieChart data={pieData} donut innerRadius={45} radius={80} />
      </View>
      <View style={styles.legend}>
        {slices.map((slice) => (
          <View key={slice.id} style={styles.legendRow}>
            <CategoryIcon color={slice.color} icon={slice.icon} size={24} />
            <Text numberOfLines={1} style={styles.legendLabel}>
              {slice.label}
            </Text>
            <Text style={styles.legendPercent}>{slice.percentLabel}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  container: {
    gap: spacing[3],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[5],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
  },
  legend: {
    gap: spacing[2],
  },
  legendLabel: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
  legendPercent: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
});
```

```typescript
// src/components/finance/index.ts — add near the other component exports
export { ReportCategoryChart } from './ReportCategoryChart';
export type { ReportCategoryChartProps, ReportCategoryChartSlice } from './ReportCategoryChart';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest tests/components/finance/report-charts.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tests/mocks/react-native-gifted-charts.mock.tsx jest.config.js src/components/finance/ReportCategoryChart.tsx src/components/finance/index.ts tests/components/finance/report-charts.test.tsx
git commit -m "feat: add react-native-gifted-charts and ReportCategoryChart"
```

(Substitute `yarn.lock`/`pnpm-lock.yaml` for `package-lock.json` if this repo uses a different package manager — check which lockfile is present before staging.)

---

### Task 7: `ReportTrendChart`

**Files:**

- Create: `src/components/finance/ReportTrendChart.tsx`
- Modify: `src/components/finance/index.ts`
- Modify: `tests/components/finance/report-charts.test.tsx` (add trend-chart tests to the file created in Task 6)

**Interfaces:**

- Consumes: `react-native-gifted-charts`'s `LineChart` (Task 6's mock already covers it).
- Produces:
  - `ReportTrendChartPoint = { key: string; label: string; income: number; expense: number }`
  - `ReportTrendChart(props: { points: ReportTrendChartPoint[]; incomeLegendLabel: string; expenseLegendLabel: string; emptyLabel: string }): JSX.Element`

- [ ] **Step 1: Write the failing test**

Append to `tests/components/finance/report-charts.test.tsx`:

```typescript
import { ReportTrendChart } from '@/components/finance';

describe('ReportTrendChart', () => {
  it('renders income/expense legend labels when there are points', () => {
    const screen = render(
      <ReportTrendChart
        emptyLabel="Chưa có dữ liệu"
        expenseLegendLabel="Chi tiêu"
        incomeLegendLabel="Thu nhập"
        points={[
          { key: '2026-06', label: '06', income: 1000000, expense: 400000 },
          { key: '2026-07', label: '07', income: 1200000, expense: 500000 },
        ]}
      />,
    );

    expect(screen.getByText('Thu nhập')).toBeTruthy();
    expect(screen.getByText('Chi tiêu')).toBeTruthy();
    expect(screen.getByTestId('mock-line-chart')).toBeTruthy();
  });

  it('shows the empty label and no chart when there are no points', () => {
    const screen = render(
      <ReportTrendChart emptyLabel="Chưa có dữ liệu" expenseLegendLabel="Chi tiêu" incomeLegendLabel="Thu nhập" points={[]} />,
    );

    expect(screen.getByText('Chưa có dữ liệu')).toBeTruthy();
    expect(screen.queryByTestId('mock-line-chart')).toBeNull();
  });
});
```

(Add the `import { ReportTrendChart } from '@/components/finance';` line to the file's existing import block rather than inline — Jest/ESLint requires imports at module top.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/components/finance/report-charts.test.tsx -t "ReportTrendChart"`
Expected: FAIL — `ReportTrendChart` is not exported from `@/components/finance`.

- [ ] **Step 3: Implement**

```tsx
// src/components/finance/ReportTrendChart.tsx
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { colors, spacing, typography } from '@/theme';

export type ReportTrendChartPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
};

export type ReportTrendChartProps = {
  points: ReportTrendChartPoint[];
  incomeLegendLabel: string;
  expenseLegendLabel: string;
  emptyLabel: string;
};

export function ReportTrendChart({
  points,
  incomeLegendLabel,
  expenseLegendLabel,
  emptyLabel,
}: ReportTrendChartProps) {
  if (points.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const incomeData = points.map((point) => ({ value: point.income, label: point.label }));
  const expenseData = points.map((point) => ({ value: point.expense, label: point.label }));

  return (
    <View style={styles.container}>
      <LineChart
        color1={colors.status.positive}
        color2={colors.status.negative}
        data={incomeData}
        data2={expenseData}
        height={160}
        thickness1={2}
        thickness2={2}
      />
      <View style={styles.legendRow}>
        <LegendDot color={colors.status.positive} label={incomeLegendLabel} />
        <LegendDot color={colors.status.negative} label={expenseLegendLabel} />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendDotRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendDotLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[5],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
  },
  legendDotLabel: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  legendDotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing[4],
    justifyContent: 'center',
  },
});
```

```typescript
// src/components/finance/index.ts — add near the other component exports
export { ReportTrendChart } from './ReportTrendChart';
export type { ReportTrendChartPoint, ReportTrendChartProps } from './ReportTrendChart';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/components/finance/report-charts.test.tsx`
Expected: PASS (4 tests total: 2 from Task 6 + 2 from this task)

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/ReportTrendChart.tsx src/components/finance/index.ts tests/components/finance/report-charts.test.tsx
git commit -m "feat: add ReportTrendChart component"
```

---

### Task 8: Rewrite `useReports` view-model

**Files:**

- Modify: `src/features/finance/view-models/use-reports.ts` (full rewrite)

**Interfaces:**

- Consumes: `report-periods.ts` (Task 1), `get-report.ts`'s `ReportFilters` (Task 2), `get-report-trend.ts`'s `GetReportTrend`/`ReportTrendKind` (Task 3), `PeriodKind` (Task 5, `@/components/finance`), `TransactionTypeFilter` (`@/components/finance`), `currentMonth`/`todayIsoDate` (`./transaction-presentation`).
- Produces: `ReportsDependencies`, `ReportTotalItem`, `ReportCategoryChartSlice` (re-exported, same shape as `ReportCategoryChart`'s), `ReportTrendChartPoint` (re-exported, same shape as `ReportTrendChart`'s), `ReportComparison`, `ReportsViewModel`, `useReports(options: UseReportsOptions): ReportsViewModel` — full field list in the implementation below.

This task has no separate test file: it's verified end-to-end through the `ReportsScreen` in Task 9's `tests/features/finance/reports.test.tsx` (matching this codebase's existing convention — `use-reports.ts` was never unit-tested on its own; see the current `reports.test.tsx` testing the hook only via the rendered screen). Steps 1-2 below are therefore folded into Task 9.

- [ ] **Step 1: (verification deferred to Task 9 — see that task's Steps 1-2)**

- [ ] **Step 2: (verification deferred to Task 9 — see that task's Steps 1-2)**

- [ ] **Step 3: Implement**

```typescript
// src/features/finance/view-models/use-reports.ts
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  AccountRepository,
  CategoryRepository,
} from '@/core/application/ports/finance-repositories';
import { resolveMonthRange, shiftMonth } from '@/core/application/finance/get-dashboard';
import type { GetReport, ReportFilters } from '@/core/application/finance/get-report';
import type { GetReportTrend, ReportTrendKind, ReportTrendPoint } from '@/core/application/finance/get-report-trend';
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
 * Drives Reports v2: a period selector (week/month/quarter/year/custom, Task
 * 5), a category donut + income/expense trend line (Tasks 6-7), and a
 * current-vs-previous-period comparison — all on top of the existing
 * `GetReport` (extended in Task 2) and the new `GetReportTrend` (Task 3).
 * Every period-kind change or filter change re-fetches fresh data; there is
 * no client-side caching of other periods (same policy as the original
 * month-only view model).
 */
export function useReports({ dependencies, t, now }: UseReportsOptions): ReportsViewModel {
  const [period, setPeriod] = useState<PeriodState>(() => initialPeriodState(now?.() ?? new Date()));
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
      const totalCategoryExpense = report.categoryTotals.reduce((sum, entry) => sum + entry.amount, 0);

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
          expenseChangeTone: expense.tone,
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
```

- [ ] **Step 4: (verification deferred to Task 9)**

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/view-models/use-reports.ts
git commit -m "feat: rewrite useReports for period selection, comparison, and charts"
```

---

### Task 9: Rewrite `ReportsScreen` + i18n keys + tests

**Files:**

- Modify: `src/features/finance/screens/reports-screen.tsx` (full rewrite)
- Modify: `src/i18n/locales/vi.ts`, `src/i18n/locales/en.ts`
- Create: `tests/i18n/reports-component-keys.test.ts`
- Modify: `tests/features/finance/reports.test.tsx` (rewrite)

**Interfaces:**

- Consumes: `ReportsViewModel` (Task 8), `PeriodSelector` (Task 5), `ReportCategoryChart` (Task 6), `ReportTrendChart` (Task 7), `FilterBar`, `CategoryIcon` (existing).
- Produces: `ReportsScreen(props: ReportsViewModel & { t: Translate }): JSX.Element` (same export shape as before — `src/app/index.tsx:336` needs no change).

- [ ] **Step 1: Add the new i18n keys**

In `src/i18n/locales/vi.ts`, replace the two obsolete keys and add the new ones (keep everything else in the `reports*` block unchanged):

```typescript
// Remove these two lines:
//   reportsPreviousMonth: 'Tháng trước',
//   reportsNextMonth: 'Tháng sau',
// Add, in their place:
  reportsPreviousPeriod: 'Kỳ trước',
  reportsNextPeriod: 'Kỳ sau',
  reportsPeriodWeek: 'Tuần',
  reportsPeriodMonth: 'Tháng',
  reportsPeriodQuarter: 'Quý',
  reportsPeriodYear: 'Năm',
  reportsPeriodCustom: 'Tùy chọn',
  reportsPeriodClose: 'Đóng',
  reportsPeriodApply: 'Áp dụng',
  reportsCustomFromLabel: 'Từ ngày',
  reportsCustomToLabel: 'Đến ngày',
  reportsPeriodWeekLabel: 'Tuần {from} - {to}',
  reportsPeriodMonthLabel: 'Tháng {month}/{year}',
  reportsPeriodQuarterLabel: 'Quý {quarter}/{year}',
  reportsPeriodYearLabel: '{year}',
  reportsPeriodCustomLabel: '{from} - {to}',
  reportsComparisonTitle: 'So với kỳ trước',
  reportsTrendTitle: 'Xu hướng thu chi',
```

In `src/i18n/locales/en.ts`, mirror the same change:

```typescript
// Remove:
//   reportsPreviousMonth: 'Previous month',
//   reportsNextMonth: 'Next month',
// Add:
  reportsPreviousPeriod: 'Previous period',
  reportsNextPeriod: 'Next period',
  reportsPeriodWeek: 'Week',
  reportsPeriodMonth: 'Month',
  reportsPeriodQuarter: 'Quarter',
  reportsPeriodYear: 'Year',
  reportsPeriodCustom: 'Custom',
  reportsPeriodClose: 'Close',
  reportsPeriodApply: 'Apply',
  reportsCustomFromLabel: 'From date',
  reportsCustomToLabel: 'To date',
  reportsPeriodWeekLabel: 'Week {from} - {to}',
  reportsPeriodMonthLabel: 'Month {month}/{year}',
  reportsPeriodQuarterLabel: 'Quarter {quarter}/{year}',
  reportsPeriodYearLabel: '{year}',
  reportsPeriodCustomLabel: '{from} - {to}',
  reportsComparisonTitle: 'Compared to previous period',
  reportsTrendTitle: 'Income & expense trend',
```

Create the key-coverage test:

```typescript
// tests/i18n/reports-component-keys.test.ts
import { en } from '@/i18n/locales/en';
import { vi } from '@/i18n/locales/vi';

const componentKeys = [
  'reportsTitle',
  'reportsIncomeLabel',
  'reportsExpenseLabel',
  'reportsNetLabel',
  'reportsCategoryTitle',
  'reportsCategoryEmpty',
  'reportsAccountTitle',
  'reportsAccountEmpty',
  'reportsPreviousPeriod',
  'reportsNextPeriod',
  'reportsPeriodWeek',
  'reportsPeriodMonth',
  'reportsPeriodQuarter',
  'reportsPeriodYear',
  'reportsPeriodCustom',
  'reportsPeriodClose',
  'reportsPeriodApply',
  'reportsCustomFromLabel',
  'reportsCustomToLabel',
  'reportsPeriodWeekLabel',
  'reportsPeriodMonthLabel',
  'reportsPeriodQuarterLabel',
  'reportsPeriodYearLabel',
  'reportsPeriodCustomLabel',
  'reportsComparisonTitle',
  'reportsTrendTitle',
] as const;

describe('reports component translations', () => {
  it.each(componentKeys)('defines %s in every locale', (key) => {
    expect(en[key]).toEqual(expect.any(String));
    expect(vi[key]).toEqual(expect.any(String));
  });
});
```

Run: `npx jest tests/i18n/reports-component-keys.test.ts`
Expected: FAIL (keys not added to the locale files yet — do that now if you haven't, then re-run to confirm PASS before moving on).

- [ ] **Step 2: Rewrite the screen test, run it, confirm it fails**

```typescript
// tests/features/finance/reports.test.tsx
import { render, waitFor, fireEvent } from '@testing-library/react-native';

import {
  AccountRepository,
  CategoryRepository,
  CreateAccountInput,
  CreateCategoryInput,
  CreateTransactionInput,
  TransactionListFilter,
  TransactionRepository,
  UpdateAccountInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
  WriteContext,
} from '@/core/application/ports/finance-repositories';
import { GetReport } from '@/core/application/finance/get-report';
import { GetReportTrend } from '@/core/application/finance/get-report-trend';
import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { formatVnd } from '@/core/domain/finance/money';
import {
  Transaction,
  TransactionInput,
  validateTransactionInput,
} from '@/core/domain/finance/transaction';
import { ReportsScreen } from '@/features/finance/screens/reports-screen';
import { useReports } from '@/features/finance/view-models/use-reports';
import { Locale, translate } from '@/i18n/translations';

const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440099';
const NOW = '2026-08-25T08:00:00.000Z';

class FakeAccountRepository implements AccountRepository {
  private readonly store = new Map<string, Account>();

  async create(input: CreateAccountInput): Promise<Account> {
    const account: Account = {
      id: input.id,
      name: input.name,
      type: input.type,
      openingBalance: input.openingBalance,
      isArchived: false,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };
    this.store.set(account.id, account);
    return account;
  }

  async update(_id: string, _changes: UpdateAccountInput, _context: WriteContext): Promise<Account> {
    throw new Error('not implemented');
  }

  async softDeleteOrHide(_id: string, _context: WriteContext): Promise<Account> {
    throw new Error('not implemented');
  }

  async findById(id: string): Promise<Account | null> {
    return this.store.get(id) ?? null;
  }

  async listActive(): Promise<Account[]> {
    return Array.from(this.store.values()).filter((account) => account.deletedAt === null);
  }

  async saveWithOperation(): Promise<void> {
    throw new Error('not implemented');
  }
}

class FakeCategoryRepository implements CategoryRepository {
  private readonly store = new Map<string, Category>();

  async create(input: CreateCategoryInput): Promise<Category> {
    const category: Category = {
      id: input.id,
      name: input.name,
      type: input.type,
      icon: input.icon || 'fa6:shapes',
      color: input.color || (input.type === 'income' ? '#10B981' : '#F2734A'),
      isArchived: false,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };
    this.store.set(category.id, category);
    return category;
  }

  async update(_id: string, _changes: UpdateCategoryInput, _context: WriteContext): Promise<Category> {
    throw new Error('not implemented');
  }

  async hide(_id: string, _context: WriteContext): Promise<Category> {
    throw new Error('not implemented');
  }

  async findById(id: string): Promise<Category | null> {
    return this.store.get(id) ?? null;
  }

  async listActiveByType(type: Category['type']): Promise<Category[]> {
    return Array.from(this.store.values()).filter(
      (category) => category.type === type && category.deletedAt === null,
    );
  }

  async isUsedByTransaction(): Promise<boolean> {
    return false;
  }

  async saveWithOperation(): Promise<void> {
    throw new Error('not implemented');
  }
}

class FakeTransactionRepository implements TransactionRepository {
  private readonly store = new Map<string, Transaction>();

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const { id, originDeviceId, operationId: _operationId, now, ...rest } = input;
    validateTransactionInput(rest);
    const transaction = buildTransaction(id, rest, {
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    });
    this.store.set(id, transaction);
    return transaction;
  }

  async update(_id: string, _changes: UpdateTransactionInput, _context: WriteContext): Promise<Transaction> {
    throw new Error('not implemented');
  }

  async softDelete(id: string, context: WriteContext): Promise<Transaction> {
    const existing = this.requireById(id);
    const updated = { ...existing, deletedAt: context.now, updatedAt: context.now, revision: existing.revision + 1 } as Transaction;
    this.store.set(id, updated);
    return updated;
  }

  async restore(id: string, context: WriteContext): Promise<Transaction> {
    const existing = this.requireById(id);
    const updated = { ...existing, deletedAt: null, updatedAt: context.now, revision: existing.revision + 1 } as Transaction;
    this.store.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter: TransactionListFilter = {}): Promise<Transaction[]> {
    let items = Array.from(this.store.values());
    if (!filter.includeDeleted) {
      items = items.filter((t) => t.deletedAt === null);
    }
    if (filter.type) {
      items = items.filter((t) => t.type === filter.type);
    }
    if (filter.categoryIds && filter.categoryIds.length > 0) {
      items = items.filter((t) => filter.categoryIds!.includes(t.categoryId ?? ''));
    } else if (filter.categoryId) {
      items = items.filter((t) => t.categoryId === filter.categoryId);
    }
    if (filter.accountId) {
      items = items.filter(
        (t) => t.accountId === filter.accountId || t.destinationAccountId === filter.accountId,
      );
    }
    if (filter.query) {
      items = items.filter((t) => t.name.toLowerCase().includes(filter.query!.toLowerCase()));
    }
    if (filter.from) {
      items = items.filter((t) => t.date >= filter.from!);
    }
    if (filter.to) {
      items = items.filter((t) => t.date <= filter.to!);
    }
    return items;
  }

  async saveWithOperation(): Promise<void> {
    throw new Error('not implemented');
  }

  private requireById(id: string): Transaction {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Transaction ${id} not found`);
    }
    return existing;
  }
}

function buildTransaction(
  id: string,
  input: TransactionInput,
  meta: { createdAt: string; updatedAt: string; deletedAt: string | null; revision: number; originDeviceId: string },
): Transaction {
  const base = {
    id,
    amount: input.amount,
    accountId: input.accountId,
    date: input.date,
    name: input.name,
    note: input.note ?? null,
    ...meta,
  };
  if (input.type === 'transfer') {
    return { ...base, type: 'transfer', destinationAccountId: input.destinationAccountId as string, categoryId: null };
  }
  return { ...base, type: input.type, categoryId: input.categoryId as string, destinationAccountId: null };
}

function makeIdFactory(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

const t = translate.bind(null, 'vi' as Locale);

function makeRepos() {
  const accountRepository = new FakeAccountRepository();
  const categoryRepository = new FakeCategoryRepository();
  const transactionRepository = new FakeTransactionRepository();
  return { accountRepository, categoryRepository, transactionRepository };
}

type Repos = ReturnType<typeof makeRepos>;

function makeDependencies(repos: Repos) {
  return {
    ...repos,
    getReport: new GetReport(repos),
    getReportTrend: new GetReportTrend(repos),
  };
}

function Harness({
  dependencies,
  now,
}: {
  dependencies: ReturnType<typeof makeDependencies>;
  now?: () => Date;
}) {
  const viewModel = useReports({ dependencies, now: now ?? (() => new Date(NOW)), t });
  return <ReportsScreen {...viewModel} t={t} />;
}

async function seed(repos: Repos) {
  const generateId = makeIdFactory('id');
  const cashAccount = await repos.accountRepository.create({
    id: generateId(),
    name: 'Vi tien mat',
    type: 'cash',
    openingBalance: 1_000_000,
    originDeviceId: DEVICE_ID,
    operationId: generateId(),
    now: NOW,
  });
  const bankAccount = await repos.accountRepository.create({
    id: generateId(),
    name: 'Ngan hang',
    type: 'bank',
    openingBalance: 2_000_000,
    originDeviceId: DEVICE_ID,
    operationId: generateId(),
    now: NOW,
  });
  const expenseCategory = await repos.categoryRepository.create({
    id: generateId(),
    name: 'An uong',
    type: 'expense',
    originDeviceId: DEVICE_ID,
    operationId: generateId(),
    now: NOW,
  });
  const incomeCategory = await repos.categoryRepository.create({
    id: generateId(),
    name: 'Luong',
    type: 'income',
    originDeviceId: DEVICE_ID,
    operationId: generateId(),
    now: NOW,
  });
  return { cashAccount, bankAccount, expenseCategory, incomeCategory, generateId };
}

describe('reports screen + view model', () => {
  it('shows income, expense, net cash flow, category chart legend and account totals for the current month, excluding transfers', async () => {
    const repos = makeRepos();
    const { cashAccount, bankAccount, expenseCategory, incomeCategory, generateId } = await seed(repos);

    await repos.transactionRepository.create({
      id: generateId(),
      type: 'income',
      amount: 5_000_000,
      accountId: cashAccount.id,
      categoryId: incomeCategory.id,
      date: '2026-08-05',
      name: 'Luong thang 8',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 200_000,
      accountId: cashAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-08-10',
      name: 'An trua',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'transfer',
      amount: 500_000,
      accountId: cashAccount.id,
      destinationAccountId: bankAccount.id,
      date: '2026-08-12',
      name: 'Chuyen tien',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    const dependencies = makeDependencies(repos);
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(formatVnd(5_000_000))).toBeTruthy());
    expect(screen.getByText(formatVnd(200_000))).toBeTruthy();
    expect(screen.getByText(formatVnd(5_000_000 - 200_000))).toBeTruthy();
    expect(screen.getByText('An uong')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy(); // only expense category -> 100% of the donut
    expect(screen.getByText('Vi tien mat')).toBeTruthy();
    expect(screen.queryByText(formatVnd(500_000))).toBeNull();
  });

  it('navigates to the previous and next period for the active kind (month by default)', async () => {
    const repos = makeRepos();
    const { cashAccount, expenseCategory, generateId } = await seed(repos);

    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 100_000,
      accountId: cashAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-07-15',
      name: 'Chi thang 7',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 300_000,
      accountId: cashAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-08-15',
      name: 'Chi thang 8',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    const dependencies = makeDependencies(repos);
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(formatVnd(300_000))).toBeTruthy());
    expect(screen.queryByText(formatVnd(100_000))).toBeNull();

    fireEvent.press(screen.getByLabelText(t('reportsPreviousPeriod')));

    await waitFor(() => expect(screen.getByText(formatVnd(100_000))).toBeTruthy());
    expect(screen.queryByText(formatVnd(300_000))).toBeNull();

    fireEvent.press(screen.getByLabelText(t('reportsNextPeriod')));

    await waitFor(() => expect(screen.getByText(formatVnd(300_000))).toBeTruthy());
  });

  it('switches to weekly view and shows the current-vs-previous-period comparison', async () => {
    const repos = makeRepos();
    const { cashAccount, expenseCategory, generateId } = await seed(repos);

    // Current week (2026-08-24..30) has 300,000; the previous week (2026-08-17..23) has 100,000
    // -> expense should read as up (previous > 0, current higher -> positive change label "+200%").
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 100_000,
      accountId: cashAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-08-18',
      name: 'Chi tuan truoc',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 300_000,
      accountId: cashAccount.id,
      categoryId: expenseCategory.id,
      date: '2026-08-25',
      name: 'Chi tuan nay',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    const dependencies = makeDependencies(repos);
    const screen = render(<Harness dependencies={dependencies} />);
    await waitFor(() => expect(screen.queryByText(t('dashboardLoading'))).toBeNull()); // initial month load settled

    fireEvent.press(screen.getByLabelText(t('reportsPeriodWeek')));

    await waitFor(() => expect(screen.getByText(formatVnd(300_000))).toBeTruthy());
    expect(screen.getByText('+200%')).toBeTruthy();
  });

  it('filters by multiple categories via the compact FilterBar', async () => {
    const repos = makeRepos();
    const { cashAccount, generateId } = await seed(repos);
    const transportCategory = await repos.categoryRepository.create({
      id: generateId(),
      name: 'Di chuyen',
      type: 'expense',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    const billsCategory = await repos.categoryRepository.create({
      id: generateId(),
      name: 'Hoa don',
      type: 'expense',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 150_000,
      accountId: cashAccount.id,
      categoryId: transportCategory.id,
      date: '2026-08-05',
      name: 'Taxi',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });
    await repos.transactionRepository.create({
      id: generateId(),
      type: 'expense',
      amount: 90_000,
      accountId: cashAccount.id,
      categoryId: billsCategory.id,
      date: '2026-08-06',
      name: 'Internet',
      originDeviceId: DEVICE_ID,
      operationId: generateId(),
      now: NOW,
    });

    const dependencies = makeDependencies(repos);
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(formatVnd(240_000))).toBeTruthy());

    fireEvent.press(screen.getByLabelText(t('filterAdvanced')));
    fireEvent.press(screen.getByLabelText(transportCategory.name));

    await waitFor(() => expect(screen.getByText(formatVnd(150_000))).toBeTruthy());
    expect(screen.queryByText(formatVnd(240_000))).toBeNull();
  });

  it('shows empty states when a period has no transactions', async () => {
    const repos = makeRepos();
    await seed(repos);
    const dependencies = makeDependencies(repos);
    const screen = render(<Harness dependencies={dependencies} />);

    await waitFor(() => expect(screen.getByText(t('reportsCategoryEmpty'))).toBeTruthy());
    expect(screen.getByText(t('reportsAccountEmpty'))).toBeTruthy();
  });
});
```

Run: `npx jest tests/features/finance/reports.test.tsx`
Expected: FAIL — the current screen has no `PeriodSelector`/donut chart/comparison markup, `t('reportsPreviousPeriod')` doesn't exist yet, etc.

- [ ] **Step 3: Implement the screen**

```tsx
// src/features/finance/screens/reports-screen.tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/base';
import { CategoryIcon, FilterBar, PeriodSelector, ReportCategoryChart, ReportTrendChart } from '@/components/finance';
import type { ChangeTone, ReportsViewModel } from '@/features/finance/view-models/use-reports';
import type { Translate } from '@/i18n/translations';
import { colors, spacing, typography } from '@/theme';

export function ReportsScreen({ t, ...props }: ReportsViewModel & { t: Translate }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('reportsTitle')}</Text>

      <PeriodSelector
        customFrom={props.customFrom}
        customTo={props.customTo}
        kind={props.periodKind}
        labels={{
          apply: t('reportsPeriodApply'),
          close: t('reportsPeriodClose'),
          custom: t('reportsPeriodCustom'),
          customFrom: t('reportsCustomFromLabel'),
          customTo: t('reportsCustomToLabel'),
          month: t('reportsPeriodMonth'),
          next: t('reportsNextPeriod'),
          previous: t('reportsPreviousPeriod'),
          quarter: t('reportsPeriodQuarter'),
          week: t('reportsPeriodWeek'),
          year: t('reportsPeriodYear'),
        }}
        onCustomFromChange={props.onCustomFromChange}
        onCustomToChange={props.onCustomToChange}
        onKindChange={props.onPeriodKindChange}
        onNext={props.onNextPeriod}
        onPrevious={props.onPreviousPeriod}
        rangeLabel={props.periodLabel}
      />

      <FilterBar
        accountId={props.accountId}
        accounts={props.accounts}
        categories={props.categories}
        categoryId={props.categoryId}
        categoryIds={props.categoryIds}
        compact
        // `month`/`onMonthChange` are unused in compact mode (PeriodSelector
        // owns period navigation here) but required by FilterBarProps.
        month=""
        onAccountChange={props.onAccountChange}
        onCategoryChange={props.onCategoryChange}
        onMonthChange={() => {}}
        onSearchChange={props.onSearchChange}
        onTypeChange={props.onTypeChange}
        search={props.search}
        type={props.type}
        labels={{
          account: t('filterAccount'),
          advanced: t('filterAdvanced'),
          all: t('filterAll'),
          category: t('filterCategory'),
          expense: t('filterExpense'),
          income: t('filterIncome'),
          month: t('filterMonth'),
          nextMonth: t('filterNextMonth'),
          previousMonth: t('filterPreviousMonth'),
          searchLabel: t('filterSearchLabel'),
          searchPlaceholder: t('filterSearchPlaceholder'),
          transfer: t('filterTransfer'),
        }}
      />

      {props.loading ? (
        <Text>{t('dashboardLoading')}</Text>
      ) : (
        <>
          <Card style={styles.summaryCard}>
            <SummaryRow
              amountLabel={props.incomeLabel}
              changeLabel={props.comparison?.incomeChangeLabel}
              changeTone={props.comparison?.incomeChangeTone}
              label={t('reportsIncomeLabel')}
            />
            <SummaryRow
              amountLabel={props.expenseLabel}
              changeLabel={props.comparison?.expenseChangeLabel}
              changeTone={props.comparison?.expenseChangeTone}
              label={t('reportsExpenseLabel')}
            />
            <SummaryRow
              amountLabel={props.netLabel}
              changeLabel={props.comparison?.netChangeLabel}
              changeTone={props.comparison?.netChangeTone}
              label={t('reportsNetLabel')}
            />
          </Card>

          {props.showTrend ? (
            <Card>
              <Text style={styles.heading}>{t('reportsTrendTitle')}</Text>
              <ReportTrendChart
                emptyLabel={t('reportsCategoryEmpty')}
                expenseLegendLabel={t('reportsExpenseLabel')}
                incomeLegendLabel={t('reportsIncomeLabel')}
                points={props.trendPoints}
              />
            </Card>
          ) : null}

          <Card>
            <Text style={styles.heading}>{t('reportsCategoryTitle')}</Text>
            <ReportCategoryChart emptyLabel={t('reportsCategoryEmpty')} slices={props.categoryChartSlices} />
          </Card>

          <Totals
            compact
            empty={t('reportsAccountEmpty')}
            items={props.accountTotals}
            showEmpty={props.categoryChartSlices.length > 0}
            title={t('reportsAccountTitle')}
          />
        </>
      )}
    </ScrollView>
  );
}

function SummaryRow({
  label,
  amountLabel,
  changeLabel,
  changeTone,
}: {
  label: string;
  amountLabel: string;
  changeLabel?: string;
  changeTone?: ChangeTone;
}) {
  return (
    <View style={styles.row}>
      <Text>{label}</Text>
      <View style={styles.amountWithChange}>
        <Text style={styles.amountText}>{amountLabel}</Text>
        {changeLabel ? <Text style={changeTextStyle(changeTone)}>{changeLabel}</Text> : null}
      </View>
    </View>
  );
}

function changeTextStyle(tone?: ChangeTone) {
  return {
    color:
      tone === 'positive'
        ? colors.status.positive
        : tone === 'negative'
          ? colors.status.negative
          : colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  };
}

function Totals({
  title,
  empty,
  items,
  compact = false,
  showEmpty = true,
}: {
  title: string;
  empty: string;
  items: ReportsViewModel['accountTotals'];
  compact?: boolean;
  showEmpty?: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{title}</Text>
      {items.length ? (
        items.map((item) =>
          compact ? (
            <Text key={item.id}>{item.label}</Text>
          ) : (
            <View key={item.id} style={styles.row}>
              <View style={styles.itemInfo}>
                {item.icon ? <CategoryIcon color={item.color} icon={item.icon} size={28} /> : null}
                <Text style={styles.itemLabel}>{item.label}</Text>
              </View>
              <Text style={styles.itemAmount}>{item.amountLabel}</Text>
            </View>
          ),
        )
      ) : showEmpty ? (
        <Text>{empty}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  amountText: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  amountWithChange: {
    alignItems: 'flex-end',
    gap: 2,
  },
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: 16,
    gap: spacing[2],
    padding: spacing[4],
  },
  container: {
    backgroundColor: colors.surface.canvas,
    flexGrow: 1,
    gap: spacing[4],
    padding: spacing[4],
  },
  heading: { fontWeight: typography.weights.bold },
  itemAmount: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  itemInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  itemLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryCard: { gap: spacing[3] },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/features/finance/reports.test.tsx tests/i18n/reports-component-keys.test.ts tests/components/finance/period-selector.test.tsx tests/components/finance/report-charts.test.tsx tests/core/finance/report-periods.test.ts tests/core/finance/get-report-trend.test.ts tests/core/finance/finance-use-cases.test.ts`
Expected: PASS across all of them.

Also run the full suite and typecheck to catch any regression from the `use-reports.ts`/`reports-screen.tsx` rewrite touching shared exports:

Run: `npx jest`
Expected: PASS (no regressions elsewhere).

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

Run: `npx expo lint`
Expected: no errors (per `CLAUDE.md` §ESLint — required before considering any task done).

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/screens/reports-screen.tsx src/i18n/locales/vi.ts src/i18n/locales/en.ts tests/i18n/reports-component-keys.test.ts tests/features/finance/reports.test.tsx
git commit -m "feat: rewrite ReportsScreen with period selector, comparison, and charts"
```

---

### Task 10: Update `STATUS.md`

**Files:**

- Modify: `docs/superpowers/STATUS.md`

- [ ] **Step 1: (docs-only task, no test)**

- [ ] **Step 2: (n/a)**

- [ ] **Step 3: Update the row**

Find the row added for `bao-cao-nang-cao-design.md` (added when the spec was written) and update its "Plan coding" column to link this plan, and its status/notes to reflect that coding is complete once Task 9 lands — or, if this plan is being merged into STATUS.md right after being written (before execution starts), update only the plan-link and note that coding hasn't started yet:

```markdown
| 2026-08-31 | [bao-cao-nang-cao-design.md](specs/2026-08-31-bao-cao-nang-cao-design.md) | [2026-08-31-bao-cao-nang-cao-coding.md](plans/2026-08-31-bao-cao-nang-cao-coding.md) | ❌ Chưa code | Plan coding mới viết xong (10 task: period-range math → GetReport multi-category → GetReportTrend → dependencies wiring → PeriodSelector → chart lib + ReportCategoryChart → ReportTrendChart → useReports rewrite → ReportsScreen rewrite + i18n). Chưa bắt đầu code. Mục "tổng hợp chi tiêu định kỳ" (spec item 5) và Budget/Goal vẫn ngoài phạm vi. |
```

- [ ] **Step 4: (n/a)**

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/STATUS.md
git commit -m "docs: link Reports v2 coding plan in STATUS.md"
```
