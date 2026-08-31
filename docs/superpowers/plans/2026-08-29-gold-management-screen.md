# Gold Management Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React Native "Quản lý vàng" (gold management) screen and its supporting components, wiring the already-implemented backend (`src/core/domain/gold`, `src/core/application/gold`, `src/data/local/repositories/gold-*`) and view-model (`src/features/gold/view-models/use-gold-management.ts`) into a working screen matching `design/Finance App.gold-management.dc.html`.

**Architecture:** Thin orchestrating screen (`src/features/gold/screens/gold-management-screen.tsx`) that owns transient UI state (which sheet is open, form draft, dropdown state) and composes small presentational components under `src/components/gold/`, mirroring the existing `src/components/finance/` pattern. All persisted data and mutations flow through `useGoldManagement`; no component reaches repositories or use cases directly.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.9, existing `src/theme` tokens (`colors`, `radius`, `shadows`, `spacing`, `typography`), React Native's built-in `Modal`.

**Spec:** `docs/superpowers/specs/2026-08-29-gold-management-screen-design.md`; visual source: `design/Finance App.gold-management.dc.html`.

## Global Constraints

- No UI/render tests for any screen or component in this plan (project convention) — only pure-logic helpers get unit tests.
- Every new user-facing string gets a camelCase key in both `src/i18n/locales/vi.ts` and `src/i18n/locales/en.ts`, covered by `tests/i18n/gold-component-keys.test.ts`'s `it.each` list (extend the existing array, do not add a second test file).
- Reuse existing i18n keys from `src/i18n/locales/vi.ts`/`en.ts` (already added under the `gold*` prefix) wherever they match; do not duplicate a key under a new name.
- Screens/components must not access SQLite or repositories directly — only through `useGoldManagement`'s returned data/functions (established convention, see `src/features/finance/finance-dependencies.ts` usage in `src/app/index.tsx`).
- Use existing theme tokens (`colors`, `radius`, `shadows`, `spacing`, `typography` from `@/theme`) — no raw hex values in screens/components.
- The custom-drawn calendar grid from the prototype is kept as-is (explicit product decision) — do not replace it with `src/components/finance/DateField.tsx`'s native picker.
- Purge (permanent delete) always requires an explicit native confirm dialog with a "cannot be undone" message before calling `purgeLot`/`purgeSale`.
- `git status` currently shows uncommitted work-in-progress changes to `src/app/index.tsx`, `src/features/finance/screens/settings-screen.tsx`, `src/i18n/locales/en.ts`, `src/i18n/locales/vi.ts`, `src/theme/colors.ts`, and two test files — inspect these files fresh at the start of each task (do not assume their contents from this plan's snippets) and preserve their existing pending edits; do not `git checkout`/discard them.

## File Map

- Domain (existing, read-only in this plan): `src/core/domain/gold/*`, `src/core/application/gold/*`, `src/core/application/ports/gold-repositories.ts`
- View-model (existing, read-only): `src/features/gold/gold-dependencies.ts`, `src/features/gold/view-models/gold-presentation.ts`, `src/features/gold/view-models/use-gold-management.ts`
- New pure logic: `src/features/gold/view-models/gold-calendar.ts`
- New components: `src/components/gold/GoldOverviewCard.tsx`, `src/components/gold/GoldHistoryList.tsx`, `src/components/gold/GoldActionPickerSheet.tsx`, `src/components/gold/GoldFormSheet.tsx`, `src/components/gold/GoldCalendarModal.tsx`, `src/components/gold/GoldBrandManageSheet.tsx`, `src/components/gold/GoldDetailSheet.tsx`, `src/components/gold/GoldTrashSheet.tsx`, `src/components/gold/index.ts`
- New screen: `src/features/gold/screens/gold-management-screen.tsx`
- Modified: `src/app/index.tsx` (add `'gold'` view + wiring), `src/i18n/locales/vi.ts`, `src/i18n/locales/en.ts`
- Tests: `tests/features/gold/gold-calendar.test.ts`, `tests/i18n/gold-component-keys.test.ts` (extend)

---

### Task 1: Calendar cell logic (`gold-calendar.ts`)

**Files:**

- Create: `src/features/gold/view-models/gold-calendar.ts`
- Test: `tests/features/gold/gold-calendar.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces:
  - `type GoldCalendarCell = { key: string; label: string; iso: string | null; isSelected: boolean }`
  - `buildGoldCalendarCells(year: number, month: number, selectedDate: string): GoldCalendarCell[]` — `month` is 0-indexed (matches JS `Date`). Returns leading blank cells (Mon-first week, `iso: null`, empty `label`) followed by one cell per day of the month (`iso` as `YYYY-MM-DD`, `label` as the day number string).
  - `formatGoldCalendarMonthLabel(year: number, month: number): string` — e.g. `"Tháng 8 2026"` for `month === 7`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/features/gold/gold-calendar.test.ts
import {
  buildGoldCalendarCells,
  formatGoldCalendarMonthLabel,
} from '@/features/gold/view-models/gold-calendar';

describe('buildGoldCalendarCells', () => {
  it('produces leading blank cells for a Monday-first week and marks the selected day', () => {
    // 2026-08-01 is a Saturday -> weekday index (Mon=0..Sun=6) is 5
    const cells = buildGoldCalendarCells(2026, 7, '2026-08-24');

    const blanks = cells.filter((cell) => cell.iso === null);
    expect(blanks).toHaveLength(5);

    const dayCells = cells.filter((cell) => cell.iso !== null);
    expect(dayCells).toHaveLength(31);
    expect(dayCells[0]).toMatchObject({ iso: '2026-08-01', label: '1', isSelected: false });

    const selected = dayCells.find((cell) => cell.iso === '2026-08-24');
    expect(selected).toMatchObject({ label: '24', isSelected: true });
    expect(dayCells.filter((cell) => cell.isSelected)).toHaveLength(1);
  });

  it('handles a month starting on Monday with zero leading blanks', () => {
    // 2026-06-01 is a Monday -> weekday index 0
    const cells = buildGoldCalendarCells(2026, 5, '2026-06-15');
    expect(cells[0].iso).toBe('2026-06-01');
    expect(cells.filter((cell) => cell.iso === null)).toHaveLength(0);
  });

  it('produces unique keys for every cell', () => {
    const cells = buildGoldCalendarCells(2026, 1, '2026-02-10');
    const keys = new Set(cells.map((cell) => cell.key));
    expect(keys.size).toBe(cells.length);
  });
});

describe('formatGoldCalendarMonthLabel', () => {
  it('formats a 0-indexed month as "Tháng N YYYY"', () => {
    expect(formatGoldCalendarMonthLabel(2026, 7)).toBe('Tháng 8 2026');
    expect(formatGoldCalendarMonthLabel(2026, 0)).toBe('Tháng 1 2026');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/features/gold/gold-calendar.test.ts`
Expected: FAIL with "Cannot find module '@/features/gold/view-models/gold-calendar'"

- [ ] **Step 3: Implement `gold-calendar.ts`**

```typescript
// src/features/gold/view-models/gold-calendar.ts
export type GoldCalendarCell = {
  key: string;
  label: string;
  iso: string | null;
  isSelected: boolean;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Builds a Monday-first calendar grid for `year`/`month` (0-indexed, matches
 * `Date`), with leading blank cells so the first real day lands in its
 * correct weekday column.
 */
export function buildGoldCalendarCells(
  year: number,
  month: number,
  selectedDate: string,
): GoldCalendarCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const mondayFirstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: GoldCalendarCell[] = [];
  for (let i = 0; i < mondayFirstWeekday; i++) {
    cells.push({ key: `blank-${i}`, label: '', iso: null, isSelected: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    cells.push({ key: iso, label: String(day), iso, isSelected: iso === selectedDate });
  }
  return cells;
}

/** Formats a 0-indexed month/year as "Tháng N YYYY" (matches the prototype's Vietnamese-only calendar header). */
export function formatGoldCalendarMonthLabel(year: number, month: number): string {
  return `Tháng ${month + 1} ${year}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/features/gold/gold-calendar.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/gold/view-models/gold-calendar.ts tests/features/gold/gold-calendar.test.ts
git commit -m "feat: add gold calendar cell-building logic"
```

---

### Task 2: i18n keys for the screen's remaining copy

**Files:**

- Modify: `src/i18n/locales/vi.ts`
- Modify: `src/i18n/locales/en.ts`
- Modify: `tests/i18n/gold-component-keys.test.ts`

**Interfaces:**

- Consumes: the existing `goldComponentKeys` array in `tests/i18n/gold-component-keys.test.ts` and existing `gold*` keys in both locale files (added by the backend plan's Task 12 — do not duplicate any of: `goldUnitLuong`, `goldUnitChi`, `goldUnitPhan`, `goldUnitGram`, `goldSaleLabel`, `goldOverviewTitle`, `goldOverviewSubtitle`, `goldQuantityLabel`, `goldCostBasisLabel`, `goldHistoryTitle`, `goldTrashLabel`, `goldAddTransactionTitle`, `goldAddTransactionSubtitle`, `goldBuyActionTitle`, `goldBuyActionSubtitle`, `goldSellActionTitle`, `goldSellActionSubtitle`, `goldBuyFormTitle`, `goldSellFormTitle`, `goldDateFieldLabel`, `goldBrandFieldLabel`, `goldSellPlaceLabel`, `goldAddNewBrandOption`, `goldLotFieldLabel`, `goldQuantityFieldLabel`, `goldUnitFieldLabel`, `goldBuyTotalLabel`, `goldSellTotalLabel`, `goldSaveBuyLabel`, `goldSaveSellLabel`, `goldManageBrandsTitle`, `goldManageBrandsSubtitle`, `goldAddBrandLabel`, `goldAddBrandPlaceholder`, `goldSaveBrandLabel`, `goldTrashSheetTitle`, `goldTrashSheetSubtitle`, `goldRestoreLabel`, `goldPurgeConfirmMessage`, `goldTrashBlockedMessage`).
- Produces: the following new keys added to both locale files: `goldBackLabel`, `goldEmptyHistory`, `goldDeleteBrandLabel`, `goldCloseLabel`, `goldRealizedGainLabel`, `goldRemainingLabel`, `goldPurgeLabel`, `goldSellDisabledHint`, `goldLotAlreadySoldError`, `goldLotNotFoundError`, `goldSaleDateBeforePurchaseError`, `goldRestoreUnavailableError`, `goldAmountRequiredError`, `goldBrandRequiredError`, `goldLotRequiredError`.

- [ ] **Step 1: Write the failing test**

Read the current top of `tests/i18n/gold-component-keys.test.ts` first (it already has a `goldComponentKeys` array from the backend plan) and append the new keys to that same array — do not create a second array or file.

```typescript
// tests/i18n/gold-component-keys.test.ts — extend the existing goldComponentKeys array with:
  'goldBackLabel',
  'goldEmptyHistory',
  'goldDeleteBrandLabel',
  'goldCloseLabel',
  'goldRealizedGainLabel',
  'goldRemainingLabel',
  'goldPurgeLabel',
  'goldSellDisabledHint',
  'goldLotAlreadySoldError',
  'goldLotNotFoundError',
  'goldSaleDateBeforePurchaseError',
  'goldRestoreUnavailableError',
  'goldAmountRequiredError',
  'goldBrandRequiredError',
  'goldLotRequiredError',
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/i18n/gold-component-keys.test.ts`
Expected: FAIL — the new keys are `undefined` in both `en`/`vi`.

- [ ] **Step 3: Add the keys to both locale files**

Read `src/i18n/locales/vi.ts` and `src/i18n/locales/en.ts` first to find the existing `gold*` block (added by the backend plan) and append these keys immediately after it, inside the same exported object.

Append to `src/i18n/locales/vi.ts`:

```typescript
  goldBackLabel: 'Quay lại',
  goldEmptyHistory: 'Chưa có giao dịch vàng nào.',
  goldDeleteBrandLabel: 'Xoá thương hiệu',
  goldCloseLabel: 'Đóng',
  goldRealizedGainLabel: 'Lời đã thực hiện',
  goldRemainingLabel: 'Lượng còn lại',
  goldPurgeLabel: 'Xoá vĩnh viễn',
  goldSellDisabledHint: 'Chưa có lô vàng nào để bán',
  goldLotAlreadySoldError: 'Lô vàng này đã được bán.',
  goldLotNotFoundError: 'Không tìm thấy lô vàng này.',
  goldSaleDateBeforePurchaseError: 'Ngày bán không được trước ngày mua.',
  goldRestoreUnavailableError: 'Không thể khôi phục vì lô vàng không còn khả dụng.',
  goldAmountRequiredError: 'Vui lòng nhập số tiền hợp lệ.',
  goldBrandRequiredError: 'Vui lòng chọn thương hiệu.',
  goldLotRequiredError: 'Vui lòng chọn lô vàng cần bán.',
```

Append to `src/i18n/locales/en.ts`:

```typescript
  goldBackLabel: 'Back',
  goldEmptyHistory: 'No gold transactions yet.',
  goldDeleteBrandLabel: 'Delete brand',
  goldCloseLabel: 'Close',
  goldRealizedGainLabel: 'Realized gain',
  goldRemainingLabel: 'Remaining',
  goldPurgeLabel: 'Delete permanently',
  goldSellDisabledHint: 'No purchased gold available to sell yet',
  goldLotAlreadySoldError: 'This lot has already been sold.',
  goldLotNotFoundError: 'This gold lot could not be found.',
  goldSaleDateBeforePurchaseError: 'The sale date cannot be before the purchase date.',
  goldRestoreUnavailableError: 'Cannot restore because the gold lot is no longer available.',
  goldAmountRequiredError: 'Please enter a valid amount.',
  goldBrandRequiredError: 'Please select a brand.',
  goldLotRequiredError: 'Please select the lot to sell.',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/i18n/gold-component-keys.test.ts`
Expected: PASS (54 cases: 39 existing + 15 new)

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/vi.ts src/i18n/locales/en.ts tests/i18n/gold-component-keys.test.ts
git commit -m "feat: add remaining gold management screen i18n keys"
```

---

### Task 3: `GoldOverviewCard` and `GoldHistoryList` components

**Files:**

- Create: `src/components/gold/GoldOverviewCard.tsx`
- Create: `src/components/gold/GoldHistoryList.tsx`
- Create: `src/components/gold/index.ts`

**Interfaces:**

- Consumes: `LotHistoryRow`, `SaleHistoryRow` types from `@/features/gold/view-models/gold-presentation` (existing); `colors`, `radius`, `shadows`, `spacing`, `typography` from `@/theme`.
- Produces:
  - `GoldOverviewCardProps = { title: string; subtitle: string; quantityLabel: string; quantityValue: string; costBasisLabel: string; costBasisValue: string }`
  - `function GoldOverviewCard(props: GoldOverviewCardProps): JSX.Element`
  - `type GoldHistoryRowKind = 'lot' | 'sale'`
  - `type GoldHistoryItem = { kind: GoldHistoryRowKind; id: string; title: string; subtitle: string; amountLabel: string; amountTone: 'neutral' | 'positive' }`
  - `GoldHistoryListProps = { items: GoldHistoryItem[]; emptyLabel: string; historyTitle: string; trashLabel: string; onSelectItem(item: GoldHistoryItem): void; onOpenTrash(): void }`
  - `function GoldHistoryList(props: GoldHistoryListProps): JSX.Element`
  - `src/components/gold/index.ts` re-exports both.

This task has no test of its own (pure presentational components, no branching logic worth unit-testing — per the no-UI-tests convention). Verified via `npm run typecheck` and later manual run-through in Task 9.

- [ ] **Step 1: Implement `GoldOverviewCard.tsx`**

```typescript
// src/components/gold/GoldOverviewCard.tsx
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type GoldOverviewCardProps = {
  title: string;
  subtitle: string;
  quantityLabel: string;
  quantityValue: string;
  costBasisLabel: string;
  costBasisValue: string;
};

export function GoldOverviewCard({ title, subtitle, quantityLabel, quantityValue, costBasisLabel, costBasisValue }: GoldOverviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Au</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{quantityLabel}</Text>
          <Text numberOfLines={1} style={styles.statValue}>{quantityValue}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{costBasisLabel}</Text>
          <Text numberOfLines={1} style={styles.statValue}>{costBasisValue}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  badgeText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  card: {
    backgroundColor: colors.category.gold,
    borderRadius: radius.xl,
    padding: spacing[5],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[4],
    justifyContent: 'space-between',
    marginBottom: spacing[5],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  stat: {
    minWidth: 0,
  },
  statLabel: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[1],
    opacity: 0.92,
  },
  statValue: {
    color: colors.content.inverse,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[5],
  },
  subtitle: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.small,
    opacity: 0.9,
  },
  title: {
    color: colors.content.inverse,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    marginBottom: spacing[1],
  },
});
```

- [ ] **Step 2: Implement `GoldHistoryList.tsx`**

```typescript
// src/components/gold/GoldHistoryList.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

export type GoldHistoryRowKind = 'lot' | 'sale';

export type GoldHistoryItem = {
  kind: GoldHistoryRowKind;
  id: string;
  title: string;
  subtitle: string;
  amountLabel: string;
  amountTone: 'neutral' | 'positive';
};

export type GoldHistoryListProps = {
  items: GoldHistoryItem[];
  emptyLabel: string;
  historyTitle: string;
  trashLabel: string;
  onSelectItem(item: GoldHistoryItem): void;
  onOpenTrash(): void;
};

export function GoldHistoryList({ items, emptyLabel, historyTitle, trashLabel, onSelectItem, onOpenTrash }: GoldHistoryListProps) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{historyTitle}</Text>
        <Pressable accessibilityLabel={trashLabel} accessibilityRole="button" onPress={onOpenTrash}>
          <Text style={styles.trashLink}>{trashLabel}</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {items.map((item, index) => (
            <Pressable
              key={`${item.kind}-${item.id}`}
              accessibilityRole="button"
              onPress={() => onSelectItem(item)}
              style={({ pressed }) => [
                styles.row,
                index < items.length - 1 && styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={[styles.rowBadge, item.kind === 'sale' ? styles.rowBadgeSale : styles.rowBadgeLot]}>
                <Text style={[styles.rowBadgeText, item.kind === 'sale' && styles.rowBadgeTextSale]}>
                  {item.kind === 'sale' ? '↗' : 'Au'}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={[styles.rowAmount, item.amountTone === 'positive' && styles.rowAmountPositive]}>
                {item.amountLabel}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
  },
  emptyCard: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    padding: spacing[5],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  headerTitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 64,
    paddingVertical: spacing[3],
  },
  rowAmount: {
    color: colors.content.primary,
    flexShrink: 0,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    textAlign: 'right',
  },
  rowAmountPositive: {
    color: colors.status.positive,
  },
  rowBadge: {
    alignItems: 'center',
    borderRadius: radius.circle,
    flexShrink: 0,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowBadgeLot: {
    backgroundColor: '#FFF4D6',
  },
  rowBadgeSale: {
    backgroundColor: colors.status.positiveSoft,
  },
  rowBadgeText: {
    color: '#A96308',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  rowBadgeTextSale: {
    color: colors.status.positive,
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  rowPressed: {
    backgroundColor: colors.surface.muted,
  },
  rowSubtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  trashLink: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 3: Create the barrel export**

```typescript
// src/components/gold/index.ts
export { GoldOverviewCard } from './GoldOverviewCard';
export type { GoldOverviewCardProps } from './GoldOverviewCard';
export { GoldHistoryList } from './GoldHistoryList';
export type { GoldHistoryItem, GoldHistoryListProps, GoldHistoryRowKind } from './GoldHistoryList';
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/gold/GoldOverviewCard.tsx src/components/gold/GoldHistoryList.tsx src/components/gold/index.ts
git commit -m "feat: add gold overview card and history list components"
```

---

### Task 4: `GoldActionPickerSheet` and `GoldCalendarModal` components

**Files:**

- Create: `src/components/gold/GoldActionPickerSheet.tsx`
- Create: `src/components/gold/GoldCalendarModal.tsx`
- Modify: `src/components/gold/index.ts`

**Interfaces:**

- Consumes: `GoldCalendarCell`, `buildGoldCalendarCells`, `formatGoldCalendarMonthLabel` from Task 1 (`@/features/gold/view-models/gold-calendar`).
- Produces:
  - `GoldActionPickerSheetProps = { visible: boolean; title: string; subtitle: string; buyTitle: string; buySubtitle: string; sellTitle: string; sellSubtitle: string; sellDisabled: boolean; sellDisabledHint: string; closeLabel: string; onSelectBuy(): void; onSelectSell(): void; onClose(): void }`
  - `function GoldActionPickerSheet(props): JSX.Element`
  - `GoldCalendarModalProps = { visible: boolean; titleLabel: string; year: number; month: number; selectedDate: string; weekdayLabels: string[]; onSelectDate(iso: string): void; onPrevMonth(): void; onNextMonth(): void; onClose(): void }`
  - `function GoldCalendarModal(props): JSX.Element`

No dedicated test (presentational + already-tested pure logic underneath). Verified via `npm run typecheck`.

- [ ] **Step 1: Implement `GoldActionPickerSheet.tsx`**

```typescript
// src/components/gold/GoldActionPickerSheet.tsx
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type GoldActionPickerSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  buyTitle: string;
  buySubtitle: string;
  sellTitle: string;
  sellSubtitle: string;
  sellDisabled: boolean;
  sellDisabledHint: string;
  closeLabel: string;
  onSelectBuy(): void;
  onSelectSell(): void;
  onClose(): void;
};

export function GoldActionPickerSheet({
  visible,
  title,
  subtitle,
  buyTitle,
  buySubtitle,
  sellTitle,
  sellSubtitle,
  sellDisabled,
  sellDisabledHint,
  closeLabel,
  onSelectBuy,
  onSelectSell,
  onClose,
}: GoldActionPickerSheetProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onSelectBuy} style={styles.buyAction}>
              <Text style={styles.buyActionTitle}>{buyTitle}</Text>
              <Text style={styles.buyActionSubtitle}>{buySubtitle}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: sellDisabled }}
              disabled={sellDisabled}
              onPress={onSelectSell}
              style={[styles.sellAction, sellDisabled && styles.sellActionDisabled]}
            >
              <Text style={styles.sellActionTitle}>{sellTitle}</Text>
              <Text style={styles.sellActionSubtitle}>{sellDisabled ? sellDisabledHint : sellSubtitle}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing[5],
  },
  buyAction: {
    backgroundColor: '#FFF4D6',
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 96,
    padding: spacing[4],
  },
  buyActionSubtitle: {
    color: '#A96308',
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  buyActionTitle: {
    color: '#A96308',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  sellAction: {
    backgroundColor: colors.status.positiveSoft,
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 96,
    padding: spacing[4],
  },
  sellActionDisabled: {
    opacity: 0.5,
  },
  sellActionSubtitle: {
    color: colors.status.positive,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  sellActionTitle: {
    color: colors.status.positive,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  sheet: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.xl,
    padding: spacing[5],
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 2: Implement `GoldCalendarModal.tsx`**

```typescript
// src/components/gold/GoldCalendarModal.tsx
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { buildGoldCalendarCells, formatGoldCalendarMonthLabel } from '@/features/gold/view-models/gold-calendar';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldCalendarModalProps = {
  visible: boolean;
  titleLabel: string;
  year: number;
  month: number;
  selectedDate: string;
  weekdayLabels: string[];
  onSelectDate(iso: string): void;
  onPrevMonth(): void;
  onNextMonth(): void;
  onClose(): void;
};

export function GoldCalendarModal({
  visible,
  titleLabel,
  year,
  month,
  selectedDate,
  weekdayLabels,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onClose,
}: GoldCalendarModalProps) {
  const cells = buildGoldCalendarCells(year, month, selectedDate);
  const monthLabel = formatGoldCalendarMonthLabel(year, month);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{titleLabel}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.monthNav}>
            <Pressable accessibilityRole="button" onPress={onPrevMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable accessibilityRole="button" onPress={onNextMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.weekdayRow}>
            {weekdayLabels.map((label) => (
              <Text key={label} style={styles.weekdayLabel}>{label}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((cell) => (
              <Pressable
                accessibilityRole={cell.iso ? 'button' : undefined}
                disabled={cell.iso === null}
                key={cell.key}
                onPress={cell.iso ? () => onSelectDate(cell.iso as string) : undefined}
                style={[styles.cell, cell.isSelected && styles.cellSelected]}
              >
                <Text style={[styles.cellText, cell.isSelected && styles.cellTextSelected]}>{cell.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,24,40,0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing[5],
  },
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.xl,
    maxWidth: 320,
    padding: spacing[4],
    width: '100%',
  },
  cell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radius.sm,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  cellSelected: {
    backgroundColor: colors.category.gold,
  },
  cellText: {
    color: colors.content.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  cellTextSelected: {
    color: colors.content.inverse,
    fontWeight: typography.weights.black,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  monthLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  monthNav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navButtonText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.black,
  },
  weekdayLabel: {
    color: colors.content.faint,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.black,
    paddingVertical: spacing[1],
    textAlign: 'center',
    width: `${100 / 7}%`,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
});
```

- [ ] **Step 3: Extend the barrel export**

```typescript
// src/components/gold/index.ts — add these two lines
export { GoldActionPickerSheet } from './GoldActionPickerSheet';
export type { GoldActionPickerSheetProps } from './GoldActionPickerSheet';
export { GoldCalendarModal } from './GoldCalendarModal';
export type { GoldCalendarModalProps } from './GoldCalendarModal';
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/gold/GoldActionPickerSheet.tsx src/components/gold/GoldCalendarModal.tsx src/components/gold/index.ts
git commit -m "feat: add gold action picker sheet and calendar modal components"
```

---

### Task 5: `GoldFormSheet` component (buy/sell form)

**Files:**

- Create: `src/components/gold/GoldFormSheet.tsx`
- Modify: `src/components/gold/index.ts`

**Interfaces:**

- Consumes: `AmountInput` from `@/components/finance` (existing, used for the total-amount field); `GoldWeightUnit` from `@/core/domain/gold/gold-weight`.
- Produces:
  - `type GoldDropdownOption = { key: string; label: string; isActive: boolean }`
  - `GoldFormSheetProps = { visible: boolean; formType: 'buy' | 'sell'; title: string; subtitle: string; closeLabel: string; dateLabel: string; dateValueLabel: string; onOpenCalendar(): void; brandFieldLabel: string; brandValueLabel: string; brandDropdownOpen: boolean; brandOptions: GoldDropdownOption[]; addNewBrandLabel: string; onToggleBrandDropdown(): void; onSelectBrand(key: string): void; onSelectAddNewBrand(): void; lotFieldLabel: string; lotValueLabel: string; lotDropdownOpen: boolean; lotOptions: GoldDropdownOption[]; onToggleLotDropdown(): void; onSelectLot(key: string): void; quantityLabel: string; quantityValue: string; onChangeQuantity(text: string): void; unitFieldLabel: string; unitValueLabel: string; unitDropdownOpen: boolean; unitOptions: GoldDropdownOption[]; onToggleUnitDropdown(): void; onSelectUnit(key: string): void; totalLabel: string; totalPlaceholder: string; totalAmount: number | null; onChangeTotalAmount(amount: number | null): void; totalInvalidMessage: string; saveLabel: string; errorMessage: string | null; onSave(): void }`
  - `function GoldFormSheet(props): JSX.Element`

No dedicated test (presentational; all branching is `formType === 'buy' | 'sell'` conditionals with no independent logic). Verified via `npm run typecheck`.

- [ ] **Step 1: Implement `GoldFormSheet.tsx`**

```typescript
// src/components/gold/GoldFormSheet.tsx
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AmountInput } from '@/components/finance';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export type GoldDropdownOption = {
  key: string;
  label: string;
  isActive: boolean;
};

export type GoldFormSheetProps = {
  visible: boolean;
  formType: 'buy' | 'sell';
  title: string;
  subtitle: string;
  closeLabel: string;
  dateLabel: string;
  dateValueLabel: string;
  onOpenCalendar(): void;
  brandFieldLabel: string;
  brandValueLabel: string;
  brandDropdownOpen: boolean;
  brandOptions: GoldDropdownOption[];
  addNewBrandLabel: string;
  onToggleBrandDropdown(): void;
  onSelectBrand(key: string): void;
  onSelectAddNewBrand(): void;
  lotFieldLabel: string;
  lotValueLabel: string;
  lotDropdownOpen: boolean;
  lotOptions: GoldDropdownOption[];
  onToggleLotDropdown(): void;
  onSelectLot(key: string): void;
  quantityLabel: string;
  quantityValue: string;
  onChangeQuantity(text: string): void;
  unitFieldLabel: string;
  unitValueLabel: string;
  unitDropdownOpen: boolean;
  unitOptions: GoldDropdownOption[];
  onToggleUnitDropdown(): void;
  onSelectUnit(key: string): void;
  totalLabel: string;
  totalPlaceholder: string;
  totalAmount: number | null;
  onChangeTotalAmount(amount: number | null): void;
  totalInvalidMessage: string;
  saveLabel: string;
  errorMessage: string | null;
  onSave(): void;
};

function Dropdown({
  fieldLabel,
  valueLabel,
  open,
  options,
  onToggle,
  onSelect,
  extraOption,
}: {
  fieldLabel: string;
  valueLabel: string;
  open: boolean;
  options: GoldDropdownOption[];
  onToggle(): void;
  onSelect(key: string): void;
  extraOption?: { label: string; onSelect(): void };
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{fieldLabel}</Text>
      <Pressable accessibilityRole="button" onPress={onToggle} style={[styles.dropdownField, open && styles.dropdownFieldOpen]}>
        <Text numberOfLines={1} style={styles.dropdownValue}>{valueLabel}</Text>
        <Text style={styles.chevron}>{open ? '︿' : '﹀'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.key}
              onPress={() => onSelect(option.key)}
              style={styles.dropdownOption}
            >
              <Text style={[styles.dropdownOptionText, option.isActive && styles.dropdownOptionTextActive]} numberOfLines={1}>
                {option.label}
              </Text>
              {option.isActive ? <Text style={styles.dropdownCheck}>✓</Text> : null}
            </Pressable>
          ))}
          {extraOption ? (
            <Pressable accessibilityRole="button" onPress={extraOption.onSelect} style={styles.dropdownOption}>
              <Text style={styles.dropdownAddNew}>{extraOption.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function GoldFormSheet(props: GoldFormSheetProps) {
  const { visible, formType, title, subtitle, closeLabel, onSave } = props;

  return (
    <Modal animationType="fade" onRequestClose={props.onSave} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={props.onSave} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{props.dateLabel}</Text>
              <Pressable accessibilityRole="button" onPress={props.onOpenCalendar} style={styles.dateField}>
                <Text style={styles.dropdownValue}>{props.dateValueLabel}</Text>
              </Pressable>
            </View>

            {formType === 'buy' ? (
              <Dropdown
                extraOption={{ label: props.addNewBrandLabel, onSelect: props.onSelectAddNewBrand }}
                fieldLabel={props.brandFieldLabel}
                onSelect={props.onSelectBrand}
                onToggle={props.onToggleBrandDropdown}
                open={props.brandDropdownOpen}
                options={props.brandOptions}
                valueLabel={props.brandValueLabel}
              />
            ) : (
              <Dropdown
                fieldLabel={props.lotFieldLabel}
                onSelect={props.onSelectLot}
                onToggle={props.onToggleLotDropdown}
                open={props.lotDropdownOpen}
                options={props.lotOptions}
                valueLabel={props.lotValueLabel}
              />
            )}

            {formType === 'buy' ? (
              <View style={styles.row}>
                <View style={[styles.field, styles.rowField]}>
                  <Text style={styles.label}>{props.quantityLabel}</Text>
                  <View style={styles.quantityInputWrapper}>
                    <Text
                      onPress={undefined}
                      style={styles.quantityInputText}
                    >
                      {props.quantityValue}
                    </Text>
                  </View>
                </View>
                <View style={[styles.field, styles.rowField]}>
                  <Dropdown
                    fieldLabel={props.unitFieldLabel}
                    onSelect={props.onSelectUnit}
                    onToggle={props.onToggleUnitDropdown}
                    open={props.unitDropdownOpen}
                    options={props.unitOptions}
                    valueLabel={props.unitValueLabel}
                  />
                </View>
              </View>
            ) : null}

            <AmountInput
              errorMessage={null}
              invalidMessage={props.totalInvalidMessage}
              label={props.totalLabel}
              onChange={props.onChangeTotalAmount}
              placeholder={props.totalPlaceholder}
              value={props.totalAmount}
            />

            {props.errorMessage ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}

            <Pressable accessibilityRole="button" onPress={onSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>{props.saveLabel}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  chevron: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  dateField: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  dropdownAddNew: {
    color: colors.brand.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  dropdownCheck: {
    color: colors.brand.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  dropdownField: {
    alignItems: 'center',
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
  },
  dropdownFieldOpen: {
    borderColor: colors.brand.primary,
  },
  dropdownMenu: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
    marginTop: spacing[1],
    maxHeight: 240,
    padding: spacing[1],
  },
  dropdownOption: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing[2],
  },
  dropdownOptionText: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  dropdownOptionTextActive: {
    color: colors.brand.primary,
    fontWeight: typography.weights.black,
  },
  dropdownValue: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  errorText: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  field: {
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border.strong,
    borderRadius: radius.sm,
    height: 5,
    marginBottom: spacing[3],
    width: 44,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  quantityInputText: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  quantityInputWrapper: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  rowField: {
    flex: 1,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.category.gold,
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 54,
  },
  saveButtonText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  sheet: {
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '86%',
    padding: spacing[5],
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
});
```

**Note for the implementer:** the prototype's quantity field is a plain numeric `TextInput`, not a read-only `Text`. Replace the `quantityInputWrapper`/`quantityInputText` block above with a real `TextInput` (`keyboardType="numeric"`, `value={props.quantityValue}`, `onChangeText={props.onChangeQuantity}`) when wiring — the placeholder `Text` above exists only to keep this plan's snippet compilable standalone; import `TextInput` from `react-native` alongside the other RN imports.

- [ ] **Step 2: Fix the quantity field to use a real `TextInput`**

Edit the `View` block under `formType === 'buy' ?` so the quantity field is:

```typescript
                <View style={[styles.field, styles.rowField]}>
                  <Text style={styles.label}>{props.quantityLabel}</Text>
                  <TextInput
                    accessibilityLabel={props.quantityLabel}
                    keyboardType="numeric"
                    onChangeText={props.onChangeQuantity}
                    style={styles.quantityInput}
                    value={props.quantityValue}
                  />
                </View>
```

Add `TextInput` to the `react-native` import at the top of the file, remove the now-unused `quantityInputWrapper`/`quantityInputText` style keys, and add:

```typescript
  quantityInput: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    height: 48,
    paddingHorizontal: spacing[3],
  },
```

- [ ] **Step 3: Extend the barrel export**

```typescript
// src/components/gold/index.ts — add
export { GoldFormSheet } from './GoldFormSheet';
export type { GoldDropdownOption, GoldFormSheetProps } from './GoldFormSheet';
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/gold/GoldFormSheet.tsx src/components/gold/index.ts
git commit -m "feat: add gold buy/sell form sheet component"
```

---

### Task 6: `GoldBrandManageSheet`, `GoldDetailSheet`, `GoldTrashSheet` components

**Files:**

- Create: `src/components/gold/GoldBrandManageSheet.tsx`
- Create: `src/components/gold/GoldDetailSheet.tsx`
- Create: `src/components/gold/GoldTrashSheet.tsx`
- Modify: `src/components/gold/index.ts`

**Interfaces:**

- Consumes: `LotHistoryRow`, `SaleHistoryRow` from `@/features/gold/view-models/gold-presentation`; `GoldBrand` from `@/core/domain/gold/gold-brand`.
- Produces:
  - `GoldBrandManageSheetProps = { visible: boolean; title: string; subtitle: string; closeLabel: string; brands: GoldBrand[]; deleteBrandLabel: string; onDeleteBrand(id: string): void; newBrandName: string; onChangeNewBrandName(text: string): void; addBrandLabel: string; addBrandPlaceholder: string; addDisabled: boolean; saveBrandLabel: string; onAddBrand(): void; onClose(): void }`
  - `GoldDetailSheetProps = { visible: boolean; title: string; subtitle: string; closeLabel: string; weightLabel: string; weightValue: string; totalLabel: string; totalValue: string; extraLabel: string; extraValue: string; blockedMessage: string | null; deleteDisabled: boolean; deleteLabel: string; onMoveToTrash(): void; onClose(): void }`
  - `GoldTrashSheetProps = { visible: boolean; title: string; subtitle: string; closeLabel: string; restoreLabel: string; purgeLabel: string; deletedOnLabel(date: string): string; trashedLots: LotHistoryRow[]; trashedSales: SaleHistoryRow[]; onRestoreLot(id: string): void; onRestoreSale(id: string): void; onPurgeLot(id: string): void; onPurgeSale(id: string): void; onClose(): void }`

No dedicated test (presentational). Verified via `npm run typecheck`.

- [ ] **Step 1: Implement `GoldBrandManageSheet.tsx`**

```typescript
// src/components/gold/GoldBrandManageSheet.tsx
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { GoldBrand } from '@/core/domain/gold/gold-brand';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export type GoldBrandManageSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  closeLabel: string;
  brands: GoldBrand[];
  deleteBrandLabel: string;
  onDeleteBrand(id: string): void;
  newBrandName: string;
  onChangeNewBrandName(text: string): void;
  addBrandLabel: string;
  addBrandPlaceholder: string;
  addDisabled: boolean;
  saveBrandLabel: string;
  onAddBrand(): void;
  onClose(): void;
};

export function GoldBrandManageSheet({
  visible,
  title,
  subtitle,
  closeLabel,
  brands,
  deleteBrandLabel,
  onDeleteBrand,
  newBrandName,
  onChangeNewBrandName,
  addBrandLabel,
  addBrandPlaceholder,
  addDisabled,
  saveBrandLabel,
  onAddBrand,
  onClose,
}: GoldBrandManageSheetProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              {brands.map((brand, index) => (
                <View key={brand.id} style={[styles.row, index < brands.length - 1 && styles.rowDivider]}>
                  <View style={styles.rowBadge}>
                    <Text style={styles.rowBadgeText}>{brand.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.rowText}>{brand.name}</Text>
                  <Pressable
                    accessibilityLabel={deleteBrandLabel}
                    accessibilityRole="button"
                    onPress={() => onDeleteBrand(brand.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{addBrandLabel}</Text>
              <TextInput
                accessibilityLabel={addBrandLabel}
                onChangeText={onChangeNewBrandName}
                placeholder={addBrandPlaceholder}
                placeholderTextColor={colors.content.placeholder}
                style={styles.input}
                value={newBrandName}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: addDisabled }}
              disabled={addDisabled}
              onPress={onAddBrand}
              style={[styles.saveButton, addDisabled && styles.saveButtonDisabled]}
            >
              <Text style={styles.saveButtonText}>{saveBrandLabel}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.status.negativeSoft,
    borderRadius: radius.md,
    flexShrink: 0,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  deleteButtonText: {
    color: colors.status.negative,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  field: {
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border.strong,
    borderRadius: radius.sm,
    height: 5,
    marginBottom: spacing[3],
    width: 44,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    height: 48,
    paddingHorizontal: spacing[3],
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 60,
  },
  rowBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF4D6',
    borderRadius: radius.circle,
    flexShrink: 0,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rowBadgeText: {
    color: '#A96308',
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  rowText: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    minWidth: 0,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.category.gold,
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 54,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  sheet: {
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '86%',
    padding: spacing[5],
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 2: Implement `GoldDetailSheet.tsx`**

```typescript
// src/components/gold/GoldDetailSheet.tsx
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type GoldDetailSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  closeLabel: string;
  weightLabel: string;
  weightValue: string;
  totalLabel: string;
  totalValue: string;
  extraLabel: string;
  extraValue: string;
  blockedMessage: string | null;
  deleteDisabled: boolean;
  deleteLabel: string;
  onMoveToTrash(): void;
  onClose(): void;
};

export function GoldDetailSheet({
  visible,
  title,
  subtitle,
  closeLabel,
  weightLabel,
  weightValue,
  totalLabel,
  totalValue,
  extraLabel,
  extraValue,
  blockedMessage,
  deleteDisabled,
  deleteLabel,
  onMoveToTrash,
  onClose,
}: GoldDetailSheetProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={[styles.row, styles.rowDivider]}>
              <Text style={styles.rowLabel}>{weightLabel}</Text>
              <Text style={styles.rowValue}>{weightValue}</Text>
            </View>
            <View style={[styles.row, styles.rowDivider]}>
              <Text style={styles.rowLabel}>{totalLabel}</Text>
              <Text style={styles.rowValue}>{totalValue}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{extraLabel}</Text>
              <Text style={styles.rowValue}>{extraValue}</Text>
            </View>
          </View>

          {blockedMessage ? (
            <View style={styles.blockedBanner}>
              <Text style={styles.blockedBannerText}>{blockedMessage}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: deleteDisabled }}
            disabled={deleteDisabled}
            onPress={onMoveToTrash}
            style={[styles.deleteButton, deleteDisabled && styles.deleteButtonDisabled]}
          >
            <Text style={styles.deleteButtonText}>{deleteLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  blockedBanner: {
    backgroundColor: colors.status.negativeSoft,
    borderRadius: radius.md,
    marginTop: spacing[4],
    padding: spacing[3],
  },
  blockedBannerText: {
    color: colors.status.negative,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.small,
  },
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.status.negative,
    borderRadius: radius.lg,
    justifyContent: 'center',
    marginTop: spacing[4],
    minHeight: 52,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border.strong,
    borderRadius: radius.sm,
    height: 5,
    marginBottom: spacing[3],
    width: 44,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  rowLabel: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  rowValue: {
    color: colors.content.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  sheet: {
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '86%',
    padding: spacing[5],
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 3: Implement `GoldTrashSheet.tsx`**

```typescript
// src/components/gold/GoldTrashSheet.tsx
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { LotHistoryRow, SaleHistoryRow } from '@/features/gold/view-models/gold-presentation';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export type GoldTrashSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  closeLabel: string;
  restoreLabel: string;
  purgeLabel: string;
  trashedLots: LotHistoryRow[];
  trashedSales: SaleHistoryRow[];
  onRestoreLot(id: string): void;
  onRestoreSale(id: string): void;
  onPurgeLot(id: string): void;
  onPurgeSale(id: string): void;
  onClose(): void;
};

type TrashRow = {
  key: string;
  title: string;
  subtitle: string;
  onRestore(): void;
  onPurge(): void;
};

export function GoldTrashSheet({
  visible,
  title,
  subtitle,
  closeLabel,
  restoreLabel,
  purgeLabel,
  trashedLots,
  trashedSales,
  onRestoreLot,
  onRestoreSale,
  onPurgeLot,
  onPurgeSale,
  onClose,
}: GoldTrashSheetProps) {
  const rows: TrashRow[] = [
    ...trashedLots.map((lot) => ({
      key: `lot-${lot.id}`,
      title: lot.title,
      subtitle: lot.subtitle,
      onRestore: () => onRestoreLot(lot.id),
      onPurge: () => onPurgeLot(lot.id),
    })),
    ...trashedSales.map((sale) => ({
      key: `sale-${sale.id}`,
      title: sale.title,
      subtitle: sale.subtitle,
      onRestore: () => onRestoreSale(sale.id),
      onPurge: () => onPurgeSale(sale.id),
    })),
  ];

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              {rows.map((row, index) => (
                <View key={row.key} style={[styles.row, index < rows.length - 1 && styles.rowDivider]}>
                  <View style={styles.rowText}>
                    <Text numberOfLines={1} style={styles.rowTitle}>{row.title}</Text>
                    <Text numberOfLines={1} style={styles.rowSubtitle}>{row.subtitle}</Text>
                  </View>
                  <Pressable accessibilityRole="button" onPress={row.onRestore} style={styles.restoreButton}>
                    <Text style={styles.restoreButtonText}>{restoreLabel}</Text>
                  </Pressable>
                  <Pressable accessibilityLabel={purgeLabel} accessibilityRole="button" onPress={row.onPurge} style={styles.purgeButton}>
                    <Text style={styles.purgeButtonText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border.strong,
    borderRadius: radius.sm,
    height: 5,
    marginBottom: spacing[3],
    width: 44,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  purgeButton: {
    alignItems: 'center',
    backgroundColor: colors.status.negativeSoft,
    borderRadius: radius.md,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  purgeButtonText: {
    color: colors.status.negative,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  restoreButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.md,
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  restoreButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 68,
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  rowSubtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  sheet: {
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '86%',
    padding: spacing[5],
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 4: Extend the barrel export**

```typescript
// src/components/gold/index.ts — add
export { GoldBrandManageSheet } from './GoldBrandManageSheet';
export type { GoldBrandManageSheetProps } from './GoldBrandManageSheet';
export { GoldDetailSheet } from './GoldDetailSheet';
export type { GoldDetailSheetProps } from './GoldDetailSheet';
export { GoldTrashSheet } from './GoldTrashSheet';
export type { GoldTrashSheetProps } from './GoldTrashSheet';
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/gold/GoldBrandManageSheet.tsx src/components/gold/GoldDetailSheet.tsx src/components/gold/GoldTrashSheet.tsx src/components/gold/index.ts
git commit -m "feat: add gold brand management, detail, and trash sheet components"
```

---

### Task 7: `gold-management-screen.tsx` — orchestrating screen

**Files:**

- Create: `src/features/gold/screens/gold-management-screen.tsx`

**Interfaces:**

- Consumes: `GoldManagementViewModel` from `@/features/gold/view-models/use-gold-management` (existing); `formatGoldWeight` from `@/features/gold/view-models/gold-presentation` (existing); `validateGoldLotInput`, `GoldLotInput` from `@/core/domain/gold/gold-lot` (existing); `validateGoldSellTransactionInput`, `GoldSellTransactionInput` from `@/core/domain/gold/gold-sell-transaction` (existing); `GoldWeightUnit` from `@/core/domain/gold/gold-weight` (existing); `formatVnd` from `@/core/domain/finance/money` (existing); every component from Task 3–6 (`@/components/gold`).
- Produces: `GoldManagementScreenProps = GoldManagementViewModel & { t: Translate; onBack(): void }`, `function GoldManagementScreen(props: GoldManagementScreenProps): JSX.Element`.

No dedicated test (screen composition + UI state, no independently-testable pure logic beyond what Task 1 already covers). Verified via `npm run typecheck` and Task 9's manual run-through.

- [ ] **Step 1: Implement `gold-management-screen.tsx`**

```typescript
// src/features/gold/screens/gold-management-screen.tsx
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  GoldActionPickerSheet,
  GoldBrandManageSheet,
  GoldCalendarModal,
  GoldDetailSheet,
  GoldFormSheet,
  GoldHistoryList,
  GoldOverviewCard,
  GoldTrashSheet,
  type GoldDropdownOption,
  type GoldHistoryItem,
} from '@/components/gold';
import { formatVnd } from '@/core/domain/finance/money';
import { validateGoldLotInput, type GoldLotInput } from '@/core/domain/gold/gold-lot';
import { validateGoldSellTransactionInput, type GoldSellTransactionInput } from '@/core/domain/gold/gold-sell-transaction';
import { type GoldWeightUnit } from '@/core/domain/gold/gold-weight';
import { formatGoldWeight } from '@/features/gold/view-models/gold-presentation';
import type { GoldManagementViewModel } from '@/features/gold/view-models/use-gold-management';
import type { Translate } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type GoldManagementScreenProps = GoldManagementViewModel & {
  t: Translate;
  onBack(): void;
};

type SheetKind = 'none' | 'actionPicker' | 'form' | 'brandManage' | 'detail' | 'trash';
type FormType = 'buy' | 'sell';
type DropdownKind = 'none' | 'brand' | 'unit' | 'lot';
type DetailTarget = { kind: 'lot' | 'sale'; id: string };

const UNITS: GoldWeightUnit[] = ['chi', 'luong', 'phan', 'gram'];

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDmy(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * `heldLots`/`trashedLots`/`trashedSales` below are the view-model's
 * presentation rows (`LotHistoryRow`/`SaleHistoryRow` — id/title/subtitle/
 * amountLabel), NOT the raw `GoldLot`/`GoldSellTransaction` domain records.
 * `overview.heldLots` (inside `GoldOverview`) IS the raw `GoldLot[]` domain
 * list — the two "heldLots" names refer to different shapes; this screen
 * only ever needs the presentation rows, so `overview` is read solely for
 * its `totalQuantityGrams`/`totalCostBasis` numbers.
 */
export function GoldManagementScreen(props: GoldManagementScreenProps) {
  const { t, onBack, overview, heldLots, trashedLots, trashedSales, brands, loading, error } = props;

  const [sheet, setSheet] = useState<SheetKind>('none');
  const [formType, setFormType] = useState<FormType>('buy');
  const [openDropdown, setOpenDropdown] = useState<DropdownKind>('none');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => Number(todayIso().slice(0, 4)));
  const [calendarMonth, setCalendarMonth] = useState(() => Number(todayIso().slice(5, 7)) - 1);
  const [formError, setFormError] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [draftDate, setDraftDate] = useState(todayIso());
  const [draftBrandId, setDraftBrandId] = useState<string | null>(null);
  const [draftLotId, setDraftLotId] = useState<string | null>(null);
  const [draftQuantity, setDraftQuantity] = useState('1');
  const [draftUnit, setDraftUnit] = useState<GoldWeightUnit>('chi');
  const [draftTotalAmount, setDraftTotalAmount] = useState<number | null>(null);
  const [newBrandName, setNewBrandName] = useState('');

  const brandNameById = useMemo(() => new Map(brands.map((brand) => [brand.id, brand.name] as const)), [brands]);
  const trashedLotById = useMemo(() => new Map(trashedLots.map((lot) => [lot.id, lot] as const)), [trashedLots]);
  const trashedSaleById = useMemo(() => new Map(trashedSales.map((sale) => [sale.id, sale] as const)), [trashedSales]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>{t('dashboardLoading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const historyItems: GoldHistoryItem[] = heldLots.map((lot) => ({
    kind: 'lot' as const,
    id: lot.id,
    title: lot.title,
    subtitle: lot.subtitle,
    amountLabel: lot.amountLabel,
    amountTone: 'neutral' as const,
  }));

  function resetForm() {
    setDraftDate(todayIso());
    setDraftBrandId(brands[0]?.id ?? null);
    setDraftLotId(heldLots[0]?.id ?? null);
    setDraftQuantity('1');
    setDraftUnit('chi');
    setDraftTotalAmount(null);
    setFormError(null);
    setOpenDropdown('none');
  }

  function openBuyForm() {
    resetForm();
    setFormType('buy');
    setSheet('form');
  }

  function openSellForm() {
    if (heldLots.length === 0) return;
    resetForm();
    setFormType('sell');
    setSheet('form');
  }

  function closeAllSheets() {
    setSheet('none');
    setOpenDropdown('none');
    setCalendarOpen(false);
    setDetailTarget(null);
    setDetailError(null);
  }

  async function handleSave() {
    setFormError(null);
    try {
      if (formType === 'buy') {
        if (!draftBrandId) {
          setFormError(t('goldBrandRequiredError'));
          return;
        }
        if (draftTotalAmount === null) {
          setFormError(t('goldAmountRequiredError'));
          return;
        }
        const input: GoldLotInput = {
          brandId: draftBrandId,
          purchaseDate: draftDate,
          quantity: Number(draftQuantity),
          unit: draftUnit,
          totalAmount: draftTotalAmount,
        };
        validateGoldLotInput(input);
        await props.createLot(input);
      } else {
        if (!draftLotId) {
          setFormError(t('goldLotRequiredError'));
          return;
        }
        if (draftTotalAmount === null) {
          setFormError(t('goldAmountRequiredError'));
          return;
        }
        const input: GoldSellTransactionInput = {
          lotId: draftLotId,
          saleDate: draftDate,
          totalAmount: draftTotalAmount,
        };
        validateGoldSellTransactionInput(input);
        await props.sellLot(input);
      }
      closeAllSheets();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function openDetailForLot(id: string) {
    setDetailError(null);
    setDetailTarget({ kind: 'lot', id });
    setSheet('detail');
  }

  function openDetailForSale(id: string) {
    setDetailError(null);
    setDetailTarget({ kind: 'sale', id });
    setSheet('detail');
  }

  /**
   * `GoldManagementViewModel` has no per-lot "does this lot have an active
   * sale" lookup, so the trash-blocked rule (a lot with an active sale
   * cannot be trashed — enforced by `TrashGoldLot`) is surfaced by
   * attempting the trash action and showing the backend's rejection
   * message, rather than a client-side pre-check.
   */
  async function handleMoveToTrash() {
    if (!detailTarget) return;
    setDetailError(null);
    try {
      if (detailTarget.kind === 'lot') {
        await props.trashLot(detailTarget.id);
      } else {
        await props.trashSale(detailTarget.id);
      }
      closeAllSheets();
    } catch (caught) {
      setDetailError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function confirmPurge(run: () => Promise<void>) {
    Alert.alert(t('goldPurgeConfirmMessage'), undefined, [
      { text: t('goldCloseLabel'), style: 'cancel' },
      { text: t('goldPurgeLabel'), style: 'destructive', onPress: () => void run() },
    ]);
  }

  const brandOptions: GoldDropdownOption[] = brands.map((brand) => ({ key: brand.id, label: brand.name, isActive: brand.id === draftBrandId }));
  const unitOptions: GoldDropdownOption[] = UNITS.map((unit) => ({
    key: unit,
    label: formatGoldWeight(1, unit, t).replace(/^1 /, ''),
    isActive: unit === draftUnit,
  }));
  const lotOptions: GoldDropdownOption[] = heldLots.map((lot) => ({
    key: lot.id,
    label: `${lot.title} · ${lot.subtitle}`,
    isActive: lot.id === draftLotId,
  }));

  const detailLotRow = detailTarget?.kind === 'lot' ? (heldLots.find((row) => row.id === detailTarget.id) ?? trashedLotById.get(detailTarget.id) ?? null) : null;
  const detailSaleRow = detailTarget?.kind === 'sale' ? trashedSaleById.get(detailTarget.id) ?? null : null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel={t('goldBackLabel')} accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('settingsManageGold')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <GoldOverviewCard
          costBasisLabel={t('goldCostBasisLabel')}
          costBasisValue={overview ? formatVnd(overview.totalCostBasis) : formatVnd(0)}
          quantityLabel={t('goldQuantityLabel')}
          quantityValue={overview ? formatGoldWeight(overview.totalQuantityGrams, 'gram', t) : formatGoldWeight(0, 'gram', t)}
          subtitle={t('goldOverviewSubtitle')}
          title={t('goldOverviewTitle')}
        />

        <View style={styles.section}>
          <GoldHistoryList
            emptyLabel={t('goldEmptyHistory')}
            historyTitle={t('goldHistoryTitle')}
            items={historyItems}
            onOpenTrash={() => setSheet('trash')}
            onSelectItem={(item) => (item.kind === 'lot' ? openDetailForLot(item.id) : openDetailForSale(item.id))}
            trashLabel={t('goldTrashLabel')}
          />
        </View>
      </ScrollView>

      <View style={styles.ctaWrapper}>
        <Pressable accessibilityLabel={t('goldAddTransactionTitle')} accessibilityRole="button" onPress={() => setSheet('actionPicker')} style={styles.cta}>
          <View>
            <Text style={styles.ctaTitle}>{t('goldAddTransactionTitle')}</Text>
            <Text style={styles.ctaSubtitle}>{t('goldAddTransactionSubtitle')}</Text>
          </View>
          <Text style={styles.ctaIcon}>+</Text>
        </Pressable>
      </View>

      <GoldActionPickerSheet
        buySubtitle={t('goldBuyActionSubtitle')}
        buyTitle={t('goldBuyActionTitle')}
        closeLabel={t('goldCloseLabel')}
        onClose={closeAllSheets}
        onSelectBuy={openBuyForm}
        onSelectSell={openSellForm}
        sellDisabled={heldLots.length === 0}
        sellDisabledHint={t('goldSellDisabledHint')}
        sellSubtitle={t('goldSellActionSubtitle')}
        sellTitle={t('goldSellActionTitle')}
        subtitle={t('goldAddTransactionSubtitle')}
        title={t('goldAddTransactionTitle')}
        visible={sheet === 'actionPicker'}
      />

      <GoldFormSheet
        addNewBrandLabel={t('goldAddNewBrandOption')}
        brandDropdownOpen={openDropdown === 'brand'}
        brandFieldLabel={t('goldBrandFieldLabel')}
        brandOptions={brandOptions}
        brandValueLabel={draftBrandId ? (brandNameById.get(draftBrandId) ?? '') : t('goldBrandFieldLabel')}
        closeLabel={t('goldCloseLabel')}
        dateLabel={t('goldDateFieldLabel')}
        dateValueLabel={formatDmy(draftDate)}
        errorMessage={formError}
        formType={formType}
        lotDropdownOpen={openDropdown === 'lot'}
        lotFieldLabel={t('goldLotFieldLabel')}
        lotOptions={lotOptions}
        lotValueLabel={draftLotId ? (lotOptions.find((option) => option.key === draftLotId)?.label ?? '') : t('goldLotFieldLabel')}
        onChangeQuantity={setDraftQuantity}
        onChangeTotalAmount={setDraftTotalAmount}
        onOpenCalendar={() => setCalendarOpen(true)}
        onSave={handleSave}
        onSelectAddNewBrand={() => {
          setOpenDropdown('none');
          setSheet('brandManage');
        }}
        onSelectBrand={(key) => {
          setDraftBrandId(key);
          setOpenDropdown('none');
        }}
        onSelectLot={(key) => {
          setDraftLotId(key);
          setOpenDropdown('none');
        }}
        onSelectUnit={(key) => {
          setDraftUnit(key as GoldWeightUnit);
          setOpenDropdown('none');
        }}
        onToggleBrandDropdown={() => setOpenDropdown(openDropdown === 'brand' ? 'none' : 'brand')}
        onToggleLotDropdown={() => setOpenDropdown(openDropdown === 'lot' ? 'none' : 'lot')}
        onToggleUnitDropdown={() => setOpenDropdown(openDropdown === 'unit' ? 'none' : 'unit')}
        quantityLabel={t('goldQuantityFieldLabel')}
        quantityValue={draftQuantity}
        saveLabel={formType === 'buy' ? t('goldSaveBuyLabel') : t('goldSaveSellLabel')}
        subtitle={t('settingsManageGold')}
        title={formType === 'buy' ? t('goldBuyFormTitle') : t('goldSellFormTitle')}
        totalAmount={draftTotalAmount}
        totalInvalidMessage={t('goldAmountRequiredError')}
        totalLabel={formType === 'buy' ? t('goldBuyTotalLabel') : t('goldSellTotalLabel')}
        totalPlaceholder="0"
        unitDropdownOpen={openDropdown === 'unit'}
        unitFieldLabel={t('goldUnitFieldLabel')}
        unitOptions={unitOptions}
        unitValueLabel={formatGoldWeight(1, draftUnit, t).replace(/^1 /, '')}
        visible={sheet === 'form'}
      />

      <GoldCalendarModal
        month={calendarMonth}
        onClose={() => setCalendarOpen(false)}
        onNextMonth={() => {
          if (calendarMonth === 11) {
            setCalendarMonth(0);
            setCalendarYear(calendarYear + 1);
          } else {
            setCalendarMonth(calendarMonth + 1);
          }
        }}
        onPrevMonth={() => {
          if (calendarMonth === 0) {
            setCalendarMonth(11);
            setCalendarYear(calendarYear - 1);
          } else {
            setCalendarMonth(calendarMonth - 1);
          }
        }}
        onSelectDate={(iso) => {
          setDraftDate(iso);
          setCalendarOpen(false);
        }}
        selectedDate={draftDate}
        titleLabel={t('goldDateFieldLabel')}
        visible={calendarOpen}
        weekdayLabels={['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']}
        year={calendarYear}
      />

      <GoldBrandManageSheet
        addBrandLabel={t('goldAddBrandLabel')}
        addBrandPlaceholder={t('goldAddBrandPlaceholder')}
        addDisabled={newBrandName.trim() === ''}
        brands={brands}
        closeLabel={t('goldCloseLabel')}
        deleteBrandLabel={t('goldDeleteBrandLabel')}
        newBrandName={newBrandName}
        onAddBrand={() => {
          const name = newBrandName.trim();
          if (!name) return;
          void props.addBrand(name).then(() => setNewBrandName(''));
        }}
        onChangeNewBrandName={setNewBrandName}
        onClose={() => setSheet('none')}
        onDeleteBrand={(id) => void props.removeBrand(id)}
        saveBrandLabel={t('goldSaveBrandLabel')}
        subtitle={t('goldManageBrandsSubtitle')}
        title={t('goldManageBrandsTitle')}
        visible={sheet === 'brandManage'}
      />

      <GoldDetailSheet
        blockedMessage={detailError}
        closeLabel={t('goldCloseLabel')}
        deleteDisabled={detailTarget === null}
        deleteLabel={t('goldTrashLabel')}
        extraLabel={detailTarget?.kind === 'sale' ? t('goldRealizedGainLabel') : t('goldRemainingLabel')}
        extraValue={detailTarget?.kind === 'sale' ? (detailSaleRow?.amountLabel ?? '') : (detailLotRow?.subtitle ?? '')}
        onClose={closeAllSheets}
        onMoveToTrash={handleMoveToTrash}
        subtitle={detailLotRow?.title ?? detailSaleRow?.title ?? ''}
        title={detailTarget?.kind === 'sale' ? t('goldSellFormTitle') : t('goldBuyFormTitle')}
        totalLabel={detailTarget?.kind === 'sale' ? t('goldSellTotalLabel') : t('goldCostBasisLabel')}
        totalValue={detailLotRow?.amountLabel ?? detailSaleRow?.amountLabel ?? ''}
        visible={sheet === 'detail'}
        weightLabel={t('goldQuantityLabel')}
        weightValue={detailLotRow?.subtitle ?? detailSaleRow?.subtitle ?? ''}
      />

      <GoldTrashSheet
        closeLabel={t('goldCloseLabel')}
        onClose={() => setSheet('none')}
        onPurgeLot={(id) => confirmPurge(() => props.purgeLot(id))}
        onPurgeSale={(id) => confirmPurge(() => props.purgeSale(id))}
        onRestoreLot={(id) => void props.restoreLot(id)}
        onRestoreSale={(id) => void props.restoreSale(id)}
        purgeLabel={t('goldPurgeLabel')}
        restoreLabel={t('goldRestoreLabel')}
        subtitle={t('goldTrashSheetSubtitle')}
        title={t('goldTrashSheetTitle')}
        trashedLots={trashedLots}
        trashedSales={trashedSales}
        visible={sheet === 'trash'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...shadows.card,
  },
  backButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: colors.surface.canvas,
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    gap: spacing[6],
    padding: spacing[4],
    paddingBottom: 140,
  },
  cta: {
    ...shadows.fab,
    alignItems: 'center',
    backgroundColor: colors.content.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: spacing[4],
  },
  ctaIcon: {
    color: colors.content.inverse,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  ctaSubtitle: {
    color: colors.border.strong,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  ctaTitle: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  ctaWrapper: {
    bottom: 0,
    left: 0,
    padding: spacing[4],
    position: 'absolute',
    right: 0,
  },
  errorText: {
    color: colors.status.negative,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    padding: spacing[4],
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: 58,
  },
  headerTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
  loadingText: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  screen: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  section: {
    gap: spacing[2],
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/gold/screens/gold-management-screen.tsx
git commit -m "feat: add gold management screen"
```

---

### Task 8: Wire the screen into the app shell

**Files:**

- Modify: `src/app/index.tsx`

**Interfaces:**

- Consumes: `createGoldDependencies`, `GoldDependencies` from `@/features/gold/gold-dependencies` (existing); `useGoldManagement` from `@/features/gold/view-models/use-gold-management` (existing); `GoldManagementScreen` from `@/features/gold/screens/gold-management-screen` (Task 7).
- Produces: a `'gold'` member of the `FinanceView` union; a `ConfiguredGoldManagementScreen` component; `onOpenGoldManagement` wired from `SettingsScreen` through to `setView({ name: 'gold' })`.

Before starting, read the CURRENT contents of `src/app/index.tsx` and `src/features/finance/screens/settings-screen.tsx` — both have uncommitted work-in-progress changes (per the Global Constraints note) that already introduce a `setView` prop on `ConfiguredSettingsScreen` and an `onOpenGoldManagement` prop on `SettingsScreen`. Adapt the exact snippets below to whatever those files' current state actually is; the snippets show the _intent_ (add a `'gold'` view branch and wire the callback), not a byte-for-byte diff to apply blindly.

No dedicated test (app-shell wiring; no independently-testable logic). Verified via `npm run typecheck` and Task 9's manual run-through.

- [ ] **Step 1: Read the current file state**

Read `src/app/index.tsx` in full and confirm: (a) the exact current shape of the `FinanceView` union, (b) whether `ConfiguredSettingsScreen` already accepts a `setView` prop, (c) whether `SettingsScreen` is already rendered with an `onOpenGoldManagement` prop. Read `src/features/finance/screens/settings-screen.tsx` and confirm its current `SettingsScreenProps` already includes `onOpenGoldManagement?(): void`.

- [ ] **Step 2: Add the `'gold'` view type and imports**

In `src/app/index.tsx`, extend the `FinanceView` union (wherever it currently lives, matching its current member style) to add `| { name: 'gold' }`, and add these imports near the other `@/features/gold` or screen imports:

```typescript
import { createGoldDependencies, GoldDependencies } from '@/features/gold/gold-dependencies';
import { GoldManagementScreen } from '@/features/gold/screens/gold-management-screen';
import { useGoldManagement } from '@/features/gold/view-models/use-gold-management';
```

- [ ] **Step 3: Add the `'gold'` branch to `ConfiguredFinanceScreen`'s view switch**

Add this branch alongside the existing `if (view.name === 'accounts') ...` / `if (view.name === 'categories') ...` lines:

```typescript
  if (view.name === 'gold') {
    return <ConfiguredGoldManagementScreen onBack={() => setView({ name: 'settings' })} t={t} />;
  }
```

- [ ] **Step 4: Wire `onOpenGoldManagement` into `ConfiguredSettingsScreen`'s render of `SettingsScreen`**

Find where `ConfiguredSettingsScreen` renders `<SettingsScreen ... />` and add `onOpenGoldManagement={() => setView({ name: 'gold' })}` to its props (this requires `ConfiguredSettingsScreen` to receive `setView` — if the current file's version doesn't already thread it through per Step 1's finding, add a `setView(view: FinanceView): void` parameter to `ConfiguredSettingsScreen`'s prop type and pass `setView={setView}` at its call site in Step 3's sibling branch, i.e. `if (view.name === 'settings') return <ConfiguredSettingsScreen ... setView={setView} t={t} />;`).

- [ ] **Step 5: Add the `ConfiguredGoldManagementScreen` component**

Add this component near the other `Configured*Screen` components (e.g. after `ConfiguredCategoriesScreen`):

```typescript
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!goldDependencies) {
    return (
      <View style={{ flex: 1 }}>
        <Text style={{ padding: 16 }}>{t('dashboardLoading')}</Text>
      </View>
    );
  }

  return <GoldManagementScreenWithViewModel dependencies={goldDependencies} onBack={onBack} t={t} />;
}

function GoldManagementScreenWithViewModel({ dependencies, t, onBack }: { dependencies: GoldDependencies; t: Translate; onBack(): void }) {
  const viewModel = useGoldManagement({ dependencies, t });
  return <GoldManagementScreen {...viewModel} onBack={onBack} t={t} />;
}
```

This uses `useLocalDatabase`, `useState`, `useRef`, `useEffect`, and `View`/`Text` — all already imported at the top of `src/app/index.tsx`; do not re-import them.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If `useSettings`'s `SettingsViewModel` or `SettingsScreenProps` mismatches surface (from the uncommitted WIP changes noted in Step 1), fix them minimally to satisfy the compiler without reverting any WIP change.

- [ ] **Step 7: Commit**

```bash
git add src/app/index.tsx
git commit -m "feat: wire gold management screen into the app shell"
```

---

### Task 9: Full test suite, typecheck, and manual verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS across all test files (existing finance + gold backend suites, plus this plan's `gold-calendar.test.ts` and the extended `gold-component-keys.test.ts`).

- [ ] **Step 2: Typecheck the whole project**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Manually run the app and verify the golden path**

Use the `run` skill (or `npx expo start`, per whatever the project's existing run convention is) to launch the app, navigate to Settings → Quản lý vàng, and verify:

- Overview card shows `0` quantity/cost basis on a fresh database.
- Tapping "Thêm giao dịch" → "Mua vàng" opens the buy form; selecting a date via the calendar, picking/adding a brand, entering quantity+unit+total, and saving creates a lot that appears in the history list and updates the overview card.
- Tapping "Thêm giao dịch" → "Bán vàng" (now enabled) opens the sell form; selecting the lot and entering a total, saving creates a sale, and the lot disappears from the "held" history rows.
- Opening the lot's detail sheet while it has an active sale and pressing "Chuyển vào thùng rác" shows the blocked-message error (from the backend's `TrashGoldLot` rejection).
- Opening Thùng rác, trashing the sale first via its own detail sheet, then trashing the lot succeeds; both appear in the trash sheet.
- Restoring the sale from the trash sheet re-links it to the lot; purging (with the confirm dialog) permanently removes an entry and it no longer reappears.
- Adding and deleting a brand in the brand-management sheet updates the brand dropdown in the buy form without needing to reopen the screen.

Document any bug found during this manual pass, fix it, and re-run `npm test`/`npm run typecheck` before considering the task done. This step cannot be automated (project convention: no UI/render tests) — do not skip it.

- [ ] **Step 4: Final commit if manual verification produced fixes**

```bash
git add -A
git commit -m "fix: address issues found during gold management screen manual verification"
```

(Skip this commit if Step 3 found no issues.)

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers the calendar logic named in the spec's `GoldCalendarModal` section. Task 2 covers the spec's i18n section (new keys beyond the backend plan's Task 12). Task 3 covers `GoldOverviewCard`/`GoldHistoryList`. Task 4 covers `GoldActionPickerSheet`/`GoldCalendarModal`. Task 5 covers `GoldFormSheet`. Task 6 covers `GoldBrandManageSheet`/`GoldDetailSheet`/`GoldTrashSheet`. Task 7 covers the orchestrating screen and its data flow exactly as diagrammed in the spec. Task 8 covers the "Wiring into the app shell" section. Task 9 covers the spec's "Testing" section's manual-verification requirement.
- **Placeholder scan:** no TBD/TODO. Task 7's `GoldDetailSheet` wiring is fully resolved in its single implementation step (Step 1) — no interim placeholder values.
- **Type consistency:** `GoldManagementViewModel`'s field names (`overview`, `heldLots`, `trashedLots`, `trashedSales`, `brands`, `loading`, `error`, `createLot`, `sellLot`, `trashLot`, `trashSale`, `restoreLot`, `restoreSale`, `purgeLot`, `purgeSale`, `addBrand`, `removeBrand`) are used identically in Task 7 to their existing definition in `use-gold-management.ts` (read during planning, not guessed). Component prop names introduced in Tasks 3–6 are used with matching names in Task 7's consumption.
- **Scope check:** single screen + its direct sub-components; no backend changes. Appropriately scoped for one implementation pass across 9 tasks.
- **Known simplification flagged inline:** `GoldManagementViewModel` doesn't expose a proactive "does this lot have an active sale" check, so the spec's "double-guard" language is implemented in Task 7 as attempt-then-show-backend-error rather than a client-side pre-check — called out explicitly in a code comment in Task 7 Step 1, not silently diverging from the spec.
