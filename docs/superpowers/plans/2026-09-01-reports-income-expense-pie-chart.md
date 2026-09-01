# Reports: Income/Expense Pie Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Xu hướng thu chi" line-chart section on the Reports screen (multi-period income/expense trend) with a donut pie chart showing the Thu (income) vs Chi (expense) split for the single period currently selected, and delete the now-unused `GetReportTrend` use case.

**Architecture:** No new use case or data fetch is needed — `report.income`/`report.expense` from the existing `GetReport.execute` call (already used for the summary card) feed the new chart directly. A new `ReportIncomeExpenseChart` component (`src/components/finance/`) replaces `ReportTrendChart`, following the same donut-chart-plus-legend shape as the existing `ReportCategoryChart`. `useReports` drops everything related to `GetReportTrend` (the trend-series use case, its per-period-kind wiring, `trendPoints`) and exposes a single `incomeExpenseChart: { income, expense }` value instead.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.9, Jest + `jest-expo` + `@testing-library/react-native`, `react-native-gifted-charts` (`PieChart`, already a dependency).

**Spec:** `docs/superpowers/specs/2026-09-01-reports-income-expense-pie-chart-design.md`.

## Global Constraints

- Icons come from `lucide-react-native` only (project rule, `CLAUDE.md` §Icons) — no emoji. This plan adds no new icons (the chart's legend uses a plain colored dot, like the current `ReportTrendChart`'s `LegendDot`, not `CategoryIcon`).
- All colors/spacing/radius/typography come from `@/theme` — no raw hex in new code.
- Every user-facing string must exist in both `src/i18n/locales/vi.ts` and `src/i18n/locales/en.ts`, verified by `tests/i18n/reports-component-keys.test.ts`.
- Feature components live in `src/components/finance/`, composed from `src/components/base` for structural chrome (project rule, `CLAUDE.md` §Component). This plan reuses the existing `Card` in `reports-screen.tsx`; the chart itself has no base-component building blocks to reuse beyond what `ReportCategoryChart` already establishes.
- `GetReportTrend` becomes fully unused after this plan — delete it, its `finance-dependencies.ts` wiring, and its dedicated test outright rather than leaving dead code (confirmed with user during brainstorming).
- Run `npx expo lint` before considering any task done (project rule, `CLAUDE.md` §ESLint).

## File Map

- Components: `src/components/finance/ReportIncomeExpenseChart.tsx` (new), `src/components/finance/ReportTrendChart.tsx` (delete), `src/components/finance/index.ts` (swap export)
- View-model/screen: `src/features/finance/view-models/use-reports.ts` (edit), `src/features/finance/screens/reports-screen.tsx` (edit)
- i18n: `src/i18n/locales/vi.ts`, `src/i18n/locales/en.ts` (edit `reportsTrendTitle` copy only — no key renames)
- Application layer: `src/core/application/finance/get-report-trend.ts` (delete), `src/features/finance/finance-dependencies.ts` (edit)
- Tests: `tests/components/finance/report-charts.test.tsx` (edit), `tests/features/finance/reports.test.tsx` (edit), `tests/core/finance/get-report-trend.test.ts` (delete)
- Docs: `docs/superpowers/STATUS.md` (edit)

---

### Task 1: `ReportIncomeExpenseChart` component

**Files:**

- Create: `src/components/finance/ReportIncomeExpenseChart.tsx`
- Delete: `src/components/finance/ReportTrendChart.tsx`
- Modify: `src/components/finance/index.ts:19-20`
- Modify: `tests/components/finance/report-charts.test.tsx:1-3,38-70`

**Interfaces:**

- Consumes: `colors`, `radius`, `spacing`, `typography` from `@/theme`; `formatVnd` from `@/core/domain/finance/money`; `PieChart` from `react-native-gifted-charts` (already mocked in `tests/mocks/react-native-gifted-charts.mock.tsx` as `<View testID="mock-pie-chart" />`, wired via `jest.config.js` `moduleNameMapper`).
- Produces: `ReportIncomeExpenseChart(props: ReportIncomeExpenseChartProps): JSX.Element` and `export type ReportIncomeExpenseChartProps = { income: number; expense: number; incomeLabel: string; expenseLabel: string; emptyLabel: string }` — consumed by Task 3.

- [ ] **Step 1: Write the failing component test**

Replace the `ReportTrendChart` import and its `describe` block in `tests/components/finance/report-charts.test.tsx`:

```tsx
// tests/components/finance/report-charts.test.tsx (lines 1-3)
import { render } from '@testing-library/react-native';

import { ReportCategoryChart, ReportIncomeExpenseChart } from '@/components/finance';
```

```tsx
// tests/components/finance/report-charts.test.tsx (replace lines 38-70, the whole
// `describe('ReportTrendChart', ...)` block, keeping the `ReportCategoryChart` block above it)
describe('ReportIncomeExpenseChart', () => {
  it('renders income/expense legend rows with percent and amount when there is data', () => {
    const screen = render(
      <ReportIncomeExpenseChart
        emptyLabel="Chưa có dữ liệu"
        expense={400000}
        expenseLabel="Chi tiêu"
        income={1000000}
        incomeLabel="Thu nhập"
      />,
    );

    expect(screen.getByText('Thu nhập')).toBeTruthy();
    expect(screen.getByText('Chi tiêu')).toBeTruthy();
    expect(screen.getByText('71%')).toBeTruthy(); // round(1,000,000 / 1,400,000 * 100)
    expect(screen.getByText('29%')).toBeTruthy(); // 100 - 71
    expect(screen.getByTestId('mock-pie-chart')).toBeTruthy();
  });

  it('shows the empty label and no chart when income and expense are both zero', () => {
    const screen = render(
      <ReportIncomeExpenseChart
        emptyLabel="Chưa có dữ liệu"
        expense={0}
        expenseLabel="Chi tiêu"
        income={0}
        incomeLabel="Thu nhập"
      />,
    );

    expect(screen.getByText('Chưa có dữ liệu')).toBeTruthy();
    expect(screen.queryByTestId('mock-pie-chart')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/components/finance/report-charts.test.tsx`
Expected: FAIL — `Element type is invalid` / module `@/components/finance` has no export `ReportIncomeExpenseChart`.

- [ ] **Step 3: Create the component**

```tsx
// src/components/finance/ReportIncomeExpenseChart.tsx
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { formatVnd } from '@/core/domain/finance/money';
import { colors, radius, spacing, typography } from '@/theme';

export type ReportIncomeExpenseChartProps = {
  income: number;
  expense: number;
  incomeLabel: string;
  expenseLabel: string;
  emptyLabel: string;
};

export function ReportIncomeExpenseChart({
  income,
  expense,
  incomeLabel,
  expenseLabel,
  emptyLabel,
}: ReportIncomeExpenseChartProps) {
  if (income === 0 && expense === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const total = income + expense;
  const incomePercent = total > 0 ? Math.round((income / total) * 100) : 0;
  const expensePercent = total > 0 ? 100 - incomePercent : 0;

  const pieData = [
    { value: income, color: colors.status.positive },
    { value: expense, color: colors.status.negative },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <PieChart data={pieData} donut innerRadius={56} radius={88} />
      </View>
      <View style={styles.legend}>
        <LegendRow
          amountLabel={formatVnd(income)}
          color={colors.status.positive}
          label={incomeLabel}
          percentLabel={`${incomePercent}%`}
        />
        <LegendRow
          amountLabel={formatVnd(expense)}
          color={colors.status.negative}
          divider
          label={expenseLabel}
          percentLabel={`${expensePercent}%`}
        />
      </View>
    </View>
  );
}

function LegendRow({
  color,
  label,
  percentLabel,
  amountLabel,
  divider,
}: {
  color: string;
  label: string;
  percentLabel: string;
  amountLabel: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.legendRow, divider && styles.legendRowDivider]}>
      <View style={styles.legendInfo}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.legendLabel}>{label}</Text>
      </View>
      <View style={styles.legendAmounts}>
        <Text style={styles.legendAmount}>{amountLabel}</Text>
        <Text style={styles.legendPercent}>{percentLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  container: {
    gap: spacing[4],
  },
  dot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[7],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  legend: {
    gap: spacing[1],
  },
  legendAmount: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  legendAmounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
  legendInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  legendLabel: {
    color: colors.content.primary,
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
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  legendRowDivider: {
    borderTopColor: colors.border.subtle,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
```

- [ ] **Step 4: Swap the export in the components barrel**

```tsx
// src/components/finance/index.ts (replace lines 19-20)
export { ReportIncomeExpenseChart } from './ReportIncomeExpenseChart';
export type { ReportIncomeExpenseChartProps } from './ReportIncomeExpenseChart';
```

- [ ] **Step 5: Delete the old component file**

```bash
rm src/components/finance/ReportTrendChart.tsx
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest tests/components/finance/report-charts.test.tsx`
Expected: PASS (4 tests: 2 `ReportCategoryChart`, 2 `ReportIncomeExpenseChart`)

- [ ] **Step 7: Commit**

```bash
git add src/components/finance/ReportIncomeExpenseChart.tsx src/components/finance/index.ts tests/components/finance/report-charts.test.tsx
git rm src/components/finance/ReportTrendChart.tsx
git commit -m "feat: replace ReportTrendChart with income/expense pie chart component"
```

---

### Task 2: `useReports` view-model

**Files:**

- Modify: `src/features/finance/view-models/use-reports.ts`

**Interfaces:**

- Consumes: `ReportIncomeExpenseChartProps` shape is not imported here, but this task must produce data matching it: `{ income: number; expense: number }`.
- Produces: `ReportsViewModel.incomeExpenseChart: { income: number; expense: number }` (replaces `showTrend`/`trendPoints`) — consumed by Task 3's `reports-screen.tsx`. `ReportsDependencies` no longer requires `getReportTrend`.

No new test file for this task — `tests/features/finance/reports.test.tsx` still passes unchanged after this task (it doesn't yet assert on the removed/added fields; that assertion work is Task 3's, since `reports-screen.tsx` is what actually renders `incomeExpenseChart`). This task is verified by running the full existing suite and the type checker.

- [ ] **Step 1: Remove the `GetReportTrend` import and dependency field**

```typescript
// src/features/finance/view-models/use-reports.ts — delete lines 9-13:
// import type {
//   GetReportTrend,
//   ReportTrendKind,
//   ReportTrendPoint,
// } from '@/core/application/finance/get-report-trend';
```

```typescript
// Replace the ReportsDependencies type (was lines 34-39):
export type ReportsDependencies = {
  getReport: GetReport;
  categoryRepository: CategoryRepository;
  accountRepository: AccountRepository;
};
```

- [ ] **Step 2: Remove `ReportTrendChartPoint` and replace `showTrend`/`trendPoints` in `ReportsViewModel`**

```typescript
// Delete the type (was lines 58-63):
// export type ReportTrendChartPoint = {
//   key: string;
//   label: string;
//   income: number;
//   expense: number;
// };
```

```typescript
// In ReportsViewModel, replace (was lines 111-112):
//   showTrend: boolean;
//   trendPoints: ReportTrendChartPoint[];
// with:
  incomeExpenseChart: { income: number; expense: number };
```

- [ ] **Step 3: Replace `trendPoints` with `incomeExpenseChart` in `ReportState` and `EMPTY_STATE`**

```typescript
// In ReportState, replace (was line 151):
//   trendPoints: ReportTrendChartPoint[];
// with:
  incomeExpenseChart: { income: number; expense: number };
```

```typescript
// In EMPTY_STATE, replace (was line 163):
//   trendPoints: [],
// with:
  incomeExpenseChart: { income: 0, expense: 0 },
```

- [ ] **Step 4: Delete the now-unused trend helpers**

```typescript
// Delete the TREND_KIND_BY_PERIOD_KIND constant (was lines 166-171):
// const TREND_KIND_BY_PERIOD_KIND: Partial<Record<PeriodKind, ReportTrendKind>> = {
//   week: 'week',
//   month: 'month',
//   quarter: 'quarter',
//   year: 'year',
// };
```

```typescript
// Delete the periodAnchorKey function (was lines 218-232):
// /** Anchor key to pass to `GetReportTrend`; unused/unreachable for 'custom' (no trend shown then). */
// function periodAnchorKey(state: PeriodState): string {
//   switch (state.kind) {
//     case 'week':
//       return state.weekStart;
//     case 'month':
//       return state.month;
//     case 'quarter':
//       return state.quarter;
//     case 'year':
//       return state.year;
//     case 'custom':
//       return state.month;
//   }
// }
```

```typescript
// Delete the trendPointLabel function (was lines 268-279):
// function trendPointLabel(kind: ReportTrendKind, point: ReportTrendPoint): string {
//   switch (kind) {
//     case 'week':
//       return formatShortDate(point.from);
//     case 'month':
//       return point.key.split('-')[1];
//     case 'quarter':
//       return `Q${point.key.split('-Q')[1]}`;
//     case 'year':
//       return point.key;
//   }
// }
```

- [ ] **Step 5: Simplify `load()` — drop the trend fetch, add `incomeExpenseChart`**

```typescript
// Replace the top of load() (was lines 346-366):
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = resolveCurrentRange(period);

      const [expenseCategories, incomeCategories, activeAccounts, report, previousReport] =
        await Promise.all([
          dependencies.categoryRepository.listActiveByType('expense'),
          dependencies.categoryRepository.listActiveByType('income'),
          dependencies.accountRepository.listActive(),
          dependencies.getReport.execute(range, reportFilters),
          dependencies.getReport.execute(previousPeriodOfSameLength(range), reportFilters),
        ]);
```

```typescript
// Delete the trendPoints computation block (was lines 416-423):
//       const trendPoints: ReportTrendChartPoint[] = trendKind
//         ? trend.map((point) => ({
//             key: point.key,
//             label: trendPointLabel(trendKind, point),
//             income: point.income,
//             expense: point.expense,
//           }))
//         : [];
```

```typescript
// Immediately after computing accountTotals (was right before "const income = percentChange(...)"),
// add:
      const incomeExpenseChart = { income: report.income, expense: report.expense };
```

```typescript
// In the setState(...) call, replace (was line 445):
//         trendPoints,
// with:
        incomeExpenseChart,
```

- [ ] **Step 6: Remove `showTrend` from the returned view-model**

```typescript
// In the returned object, delete (was line 492, plus its blank line):
//     showTrend: TREND_KIND_BY_PERIOD_KIND[period.kind] !== undefined,
```

- [ ] **Step 7: Update the stale doc comment on `useReports`**

```typescript
// Replace the comment above `export function useReports` (was lines 309-317):
/**
 * Drives Reports v2: a period selector (week/month/quarter/year/custom), a
 * category donut + income/expense pie chart, and a current-vs-previous-period
 * comparison — all on top of the existing `GetReport`. Every period-kind
 * change or filter change re-fetches fresh data; there is no client-side
 * caching of other periods (same policy as the original month-only view
 * model).
 */
```

- [ ] **Step 8: Run the full test suite and the type checker**

Run: `npx jest tests/features/finance/reports.test.tsx tests/components/finance/report-charts.test.tsx && npx tsc --noEmit`
Expected: All tests PASS (the `reports.test.tsx` suite doesn't reference `trendPoints`/`showTrend` directly, only the screen does — Task 3 updates that), no type errors.

- [ ] **Step 9: Commit**

```bash
git add src/features/finance/view-models/use-reports.ts
git commit -m "refactor: drop GetReportTrend from useReports, expose incomeExpenseChart"
```

---

### Task 3: `ReportsScreen` + i18n copy + integration test fixes

**Files:**

- Modify: `src/features/finance/screens/reports-screen.tsx`
- Modify: `src/i18n/locales/vi.ts:156`
- Modify: `src/i18n/locales/en.ts:161`
- Modify: `tests/features/finance/reports.test.tsx`

**Interfaces:**

- Consumes: `ReportIncomeExpenseChart` (Task 1), `ReportsViewModel.incomeExpenseChart` (Task 2).
- Produces: nothing new consumed by later tasks — this is the last UI-facing change.

- [ ] **Step 1: Swap the component import and JSX in `reports-screen.tsx`**

```tsx
// src/features/finance/screens/reports-screen.tsx (replace lines 6-12)
import {
  CategoryIcon,
  FilterBar,
  PeriodSelector,
  ReportCategoryChart,
  ReportIncomeExpenseChart,
} from '@/components/finance';
```

```tsx
// src/features/finance/screens/reports-screen.tsx (replace lines 113-123, the
// `{props.showTrend ? (...) : null}` block — always render now, no period-kind gate)
          <Card style={styles.sectionCard}>
            <Text style={styles.heading}>{t('reportsTrendTitle')}</Text>
            <ReportIncomeExpenseChart
              emptyLabel={t('reportsCategoryEmpty')}
              expense={props.incomeExpenseChart.expense}
              expenseLabel={t('reportsExpenseLabel')}
              income={props.incomeExpenseChart.income}
              incomeLabel={t('reportsIncomeLabel')}
            />
          </Card>
```

- [ ] **Step 2: Update the section title copy (same key, new wording)**

```typescript
// src/i18n/locales/vi.ts:156
  reportsTrendTitle: 'Tỷ trọng thu chi',
```

```typescript
// src/i18n/locales/en.ts:161
  reportsTrendTitle: 'Income vs expense',
```

- [ ] **Step 3: Fix the now-duplicated amount assertions in `reports.test.tsx`**

The income/expense chart's legend now renders the same `formatVnd(...)` amount that the summary card already shows, so several single-match `getByText` assertions become two-match `getAllByText` assertions.

```tsx
// tests/features/finance/reports.test.tsx — in the first test
// ("shows income, expense, net cash flow, ..."), replace (was lines 398-400):
    // Income/expense amounts now render twice: once in the summary card, once in the new
    // income-vs-expense pie chart's legend (reports-screen.tsx's income/expense section).
    await waitFor(() => expect(screen.getAllByText(formatVnd(5_000_000))).toHaveLength(2));
    expect(screen.getAllByText(formatVnd(200_000))).toHaveLength(2);
    expect(screen.getByText(formatVnd(5_000_000 - 200_000))).toBeTruthy();
```

```tsx
// tests/features/finance/reports.test.tsx — in the second test
// ("navigates to the previous and next period..."), replace (was lines 443-453):
    await waitFor(() => expect(screen.getAllByText(formatVnd(300_000))).toHaveLength(2));
    expect(screen.queryByText(formatVnd(100_000))).toBeNull();

    fireEvent.press(screen.getByLabelText(t('reportsPreviousPeriod')));

    await waitFor(() => expect(screen.getAllByText(formatVnd(100_000))).toHaveLength(2));
    expect(screen.queryByText(formatVnd(300_000))).toBeNull();

    fireEvent.press(screen.getByLabelText(t('reportsNextPeriod')));

    await waitFor(() => expect(screen.getAllByText(formatVnd(300_000))).toHaveLength(2));
```

```tsx
// tests/features/finance/reports.test.tsx — in the third test
// ("switches to weekly view..."), replace (was line 493):
    await waitFor(() => expect(screen.getAllByText(formatVnd(300_000))).toHaveLength(2));
```

```tsx
// tests/features/finance/reports.test.tsx — in the fourth test
// ("filters by multiple categories..."), replace (was lines 572,578-580):
    await waitFor(() => expect(screen.getAllByText(formatVnd(300_000))).toHaveLength(2));

    fireEvent.press(screen.getByLabelText(t('filterAdvanced')));
    fireEvent.press(screen.getByLabelText(transportCategory.name));
    fireEvent.press(screen.getByLabelText(billsCategory.name));

    await waitFor(() => expect(screen.getAllByText(formatVnd(240_000))).toHaveLength(2));
    expect(screen.queryByText(formatVnd(300_000))).toBeNull();
    expect(screen.queryByText(formatVnd(60_000))).toBeNull();
```

```tsx
// tests/features/finance/reports.test.tsx — in the fifth test
// ("shows empty states when a period has no transactions"), replace (was lines 589-593):
    // Both the category donut and the new income/expense pie chart show the same empty-state
    // copy when they have nothing to render (categoryChartSlices empty, income=expense=0) — the
    // account section suppresses its own empty text in that case too
    // (reports-screen.tsx: showEmpty={props.categoryChartSlices.length > 0}), so exactly 2
    // copies render (category chart + income/expense chart), not 3.
    await waitFor(() => expect(screen.getAllByText(t('reportsCategoryEmpty'))).toHaveLength(2));
```

- [ ] **Step 4: Run the tests**

Run: `npx jest tests/features/finance/reports.test.tsx tests/i18n/reports-component-keys.test.ts`
Expected: PASS (5 tests in `reports.test.tsx`, all `reports-component-keys` key checks — `reportsTrendTitle` still exists, only its copy changed).

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/screens/reports-screen.tsx src/i18n/locales/vi.ts src/i18n/locales/en.ts tests/features/finance/reports.test.tsx
git commit -m "feat: show income/expense pie chart on Reports screen for every period kind"
```

---

### Task 4: Delete the unused `GetReportTrend` use case

**Files:**

- Delete: `src/core/application/finance/get-report-trend.ts`
- Delete: `tests/core/finance/get-report-trend.test.ts`
- Modify: `src/features/finance/finance-dependencies.ts`
- Modify: `tests/features/finance/reports.test.tsx`

**Interfaces:**

- Consumes: nothing (pure cleanup — after Task 2, no source file imports `GetReportTrend`).
- Produces: nothing (terminal cleanup task).

- [ ] **Step 1: Confirm nothing else references it**

Run: `grep -rn "GetReportTrend\|get-report-trend" src tests --include="*.ts" --include="*.tsx"`
Expected: only the 4 files this task touches (the two to delete, `finance-dependencies.ts`, `reports.test.tsx`).

- [ ] **Step 2: Remove the wiring from `finance-dependencies.ts`**

```typescript
// src/features/finance/finance-dependencies.ts — delete line 11:
// import { GetReportTrend } from '@/core/application/finance/get-report-trend';
```

```typescript
// src/features/finance/finance-dependencies.ts — in the FinanceDependencies type,
// delete (was line 57):
//   getReportTrend: GetReportTrend;
```

```typescript
// src/features/finance/finance-dependencies.ts — in createFinanceDependencies's
// returned object, delete (was line 127):
//     getReportTrend: new GetReportTrend({ transactionRepository }),
```

- [ ] **Step 3: Remove the now-unused import/wiring from `reports.test.tsx`**

```typescript
// tests/features/finance/reports.test.tsx — delete line 18:
// import { GetReportTrend } from '@/core/application/finance/get-report-trend';
```

```typescript
// tests/features/finance/reports.test.tsx — in makeDependencies(), delete (was line 298):
//     getReportTrend: new GetReportTrend(repos),
```

- [ ] **Step 4: Delete the use case and its dedicated test**

```bash
git rm src/core/application/finance/get-report-trend.ts
git rm tests/core/finance/get-report-trend.test.ts
```

- [ ] **Step 5: Run the full suite and the type checker**

Run: `npx jest && npx tsc --noEmit`
Expected: All tests PASS, no type errors, no reference to `GetReportTrend` remains anywhere.

- [ ] **Step 6: Commit**

Stage only the files this task touched — there is an unrelated pre-existing
uncommitted change to `src/components/finance/PeriodSelector.tsx` in the
working tree that must NOT be swept into this commit:

```bash
git add src/features/finance/finance-dependencies.ts tests/features/finance/reports.test.tsx
git commit -m "chore: remove unused GetReportTrend use case and its wiring"
```

---

### Task 5: Update `STATUS.md`

**Files:**

- Modify: `docs/superpowers/STATUS.md`

**Interfaces:**

- Consumes: nothing.
- Produces: nothing (documentation only).

- [ ] **Step 1: Add a row for this spec/plan**

```markdown
<!-- docs/superpowers/STATUS.md — add as a new row after the 2026-08-31 bao-cao-nang-cao row -->
| 2026-09-01 | [reports-income-expense-pie-chart-design.md](specs/2026-09-01-reports-income-expense-pie-chart-design.md) | [2026-09-01-reports-income-expense-pie-chart.md](plans/2026-09-01-reports-income-expense-pie-chart.md) | ✅ Done | "Xu hướng thu chi" line chart đổi thành donut pie Thu/Chi cho đúng 1 kỳ đang chọn (`ReportIncomeExpenseChart`), luôn hiển thị kể cả period kind `custom`. `GetReportTrend` (chuỗi nhiều kỳ) đã bị xóa hẳn — không còn tính năng "xu hướng nhiều kỳ" nào trên Reports screen. |
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/STATUS.md
git commit -m "docs: mark reports income/expense pie chart plan as done in STATUS.md"
```

---

## Final Verification

After Task 5, run the full check once more to confirm the whole change set is coherent:

```bash
npx jest
npx tsc --noEmit
npx expo lint
```

Expected: everything passes, and `grep -rn "ReportTrendChart\|GetReportTrend\|showTrend\|trendPoints" src tests` returns no matches.
