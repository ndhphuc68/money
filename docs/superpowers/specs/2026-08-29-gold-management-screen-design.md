# Gold Management Screen — UI Design Spec

**Goal:** Build the React Native screen and its supporting components for personal gold tracking ("Quản lý vàng"), wiring the already-implemented backend (`src/core/domain/gold`, `src/core/application/gold`, `src/data/local/repositories/gold-*`) and view-model (`src/features/gold/view-models/use-gold-management.ts`) into a working screen that matches the visual prototype `design/Finance App.gold-management.dc.html`.

**Non-goal:** No new backend logic, no new use cases, no UI screen tests (per project convention — logic-only tests). Reference price provider, unrealized/realized P&L display, edit-existing-transaction flows, and history filters remain out of scope (already out of scope in the backend plan `docs/superpowers/plans/2026-08-27-gold-tracking-coding.md`).

## Context

- Backend + view-model already exist and expose everything the screen needs: `useGoldManagement` returns `overview`, `heldLots`, `trashedLots`, `trashedSales`, `brands`, `loading`, `error`, and action methods (`addBrand`, `removeBrand`, `createLot`, `sellLot`, `trashLot`, `trashSale`, `restoreLot`, `restoreSale`, `purgeLot`, `purgeSale`).
- Presentation helpers already exist: `formatGoldWeight`, `buildLotHistoryRow`, `buildSaleHistoryRow` in `src/features/gold/view-models/gold-presentation.ts`.
- `src/features/finance/screens/settings-screen.tsx` already renders a "Quản lý vàng" row wired to an `onOpenGoldManagement` prop, but `src/app/index.tsx` does not yet pass that prop or handle a gold view — this must be wired.
- The visual prototype (`design/Finance App.gold-management.dc.html`) defines the full interaction: overview card, transaction history list, FAB to add a transaction, an action-picker sheet (buy/sell), a buy/sell form sheet with a custom date field opening a hand-drawn calendar modal, brand/unit/lot dropdowns, a brand-management sheet, a detail sheet (view + move-to-trash), and a trash sheet (restore/purge).
- The project already has a native `DateField` component (`src/components/finance/DateField.tsx`) used elsewhere, but per explicit user decision this screen keeps the custom-drawn calendar grid from the prototype instead of switching to the native picker, to preserve the prototype's exact UX.
- i18n keys for this screen already exist in `src/i18n/locales/vi.ts` / `en.ts` (added by Task 12 of the backend plan). New keys are added only if something in the design has no existing key (e.g., a "no transactions yet" empty state, or a generic delete-transaction accessibility label not covered by the existing key list).

## Architecture

Thin orchestrating screen + reusable presentational components, mirroring the existing `src/components/finance/` pattern:

```
src/features/gold/screens/gold-management-screen.tsx   — entry: owns local UI state, composes components, calls view-model actions
src/components/gold/GoldOverviewCard.tsx                — gradient summary card (quantity + cost basis)
src/components/gold/GoldHistoryList.tsx                 — lot + sale rows, tap opens detail sheet
src/components/gold/GoldActionPickerSheet.tsx            — bottom sheet: choose Buy or Sell
src/components/gold/GoldFormSheet.tsx                    — bottom sheet: buy/sell form (date, brand/lot picker, quantity+unit, total)
src/components/gold/GoldCalendarModal.tsx                — custom month-grid calendar modal
src/components/gold/GoldBrandManageSheet.tsx             — bottom sheet: brand list + add/delete
src/components/gold/GoldDetailSheet.tsx                  — bottom sheet: lot/sale detail + move-to-trash
src/components/gold/GoldTrashSheet.tsx                   — bottom sheet: trashed lots/sales + restore/purge
```

The screen owns only UI-transient state (which sheet is open, current form draft values, which dropdown is expanded, selected calendar month). All persisted data and mutations flow through `useGoldManagement`. Components receive data and callbacks as props; they contain no repository/use-case calls.

### `gold-management-screen.tsx`

- Calls `useGoldManagement({ dependencies, t })`.
- Renders header (back button + title), `GoldOverviewCard`, `GoldHistoryList`, and the floating "Thêm giao dịch" CTA.
- Local state: `activeSheet: 'none' | 'actionPicker' | 'form' | 'brandManage' | 'detail' | 'trash'`, `formType: 'buy' | 'sell'`, `formDraft` (date, brandId/lotId, quantity, unit, totalAmount text, note), `calendarOpen`, `openDropdown: 'none' | 'brand' | 'unit' | 'lot'`, `detailTarget: {type:'lot'|'sale'; id:string} | null`, `formError: string | null`.
- On save: parses the total-amount text (VND, digits only) to a number, builds the appropriate `GoldLotInput`/`GoldSellTransactionInput`, calls `validateGoldLotInput`/`validateGoldSellTransactionInput` for early inline validation, then calls `createLot`/`sellLot`. Catches thrown errors (from validation or from the use case, e.g. "lot already sold") and shows them via `formError`.
- On move-to-trash from `GoldDetailSheet`: calls `trashLot`/`trashSale` depending on target type; a lot with an active sale is expected to throw (backend rule) — that error surfaces the same way as `goldTrashBlockedMessage`.
- Passes `t` (Translate) down to every component; no component calls `translate` directly — same convention as `finance` components.

### `GoldOverviewCard`

Props: `{ quantityLabel: string; costBasisLabel: string; title: string; subtitle: string }`. Pure presentational; `title`/`subtitle`/labels come from `t()` + `overview` computed in the screen (reusing `formatGoldWeight`/`formatVnd` already in `gold-presentation.ts` — extend that file with a small `buildGoldOverviewLabels(overview, t)` helper rather than inlining formatting in the screen).

### `GoldHistoryList`

Props: `{ lots: LotHistoryRow[]; sales: SaleHistoryRow[]; onSelectLot(id): void; onSelectSale(id): void; onOpenTrash(): void; emptyLabel: string }`. Renders the "Lịch sử giao dịch" section header with a "Thùng rác" link, then a merged, date-sorted list of lot and sale rows (each row already has `title/subtitle/amountLabel` from the existing presentation helpers). Empty state shown when both lists are empty.

### `GoldActionPickerSheet`

Props: `{ visible: boolean; onClose(): void; onSelectBuy(): void; onSelectSell(): void; sellDisabled: boolean }`. `sellDisabled` is true when there are no held lots (nothing to sell) — shows the sell option in a disabled state rather than hiding it, so the user understands why.

### `GoldFormSheet`

Props: everything needed to render either the buy or sell variant: `formType`, `dateLabel`, `onOpenCalendar()`, brand list + selected brand + dropdown open state + `onToggleBrandDropdown`/`onSelectBrand`/`onAddNewBrand` (buy only), held-lot list + selected lot for sell (`onToggleLotDropdown`/`onSelectLot`), quantity value + unit list/selected/dropdown (buy only), `totalLabel`/`totalValue`/`onChangeTotal`, `saveLabel`/`onSave`, `errorMessage`. Internally a plain `View`-based bottom sheet (no external modal library currently in the project for this — confirm via `Modal` from `react-native` used consistently with other sheets, or check whether the finance feature already has a shared bottom-sheet primitive before adding a new one).

### `GoldCalendarModal`

Props: `{ visible: boolean; year: number; month: number; selectedDate: string; onSelectDate(iso): void; onPrevMonth(): void; onNextMonth(): void; onClose(): void }`. The calendar-cell-building logic (blank leading cells for month offset, day cells with an ISO date) is a pure function — extract it as `buildCalendarCells(year, month, selectedDate)` in a small `gold-calendar.ts` helper (mirrors the prototype's `buildCalendarCells`), so it's independently testable as logic (per the no-UI-tests convention, this pure function *can* get a unit test; the modal rendering does not).

### `GoldBrandManageSheet`

Props: `{ visible: boolean; brands: GoldBrand[]; newBrandName: string; onChangeNewBrandName(text): void; onAddBrand(): void; addDisabled: boolean; onDeleteBrand(id): void; onClose(): void }`.

### `GoldDetailSheet`

Props: `{ visible: boolean; kind: 'lot' | 'sale'; title: string; subtitle: string; weightLabel: string; totalLabel: string; extraLabel: string; extraValue: string; blockedMessage: string | null; onMoveToTrash(): void; onClose(): void }`. `blockedMessage` is non-null (and the trash button disabled) when trying to trash a lot that has an active sale — the screen determines this by checking whether any held/active sale references the lot before rendering.

### `GoldTrashSheet`

Props: `{ visible: boolean; trashedLots: LotHistoryRow[]; trashedSales: SaleHistoryRow[]; onRestoreLot(id): void; onRestoreSale(id): void; onPurgeLot(id): void; onPurgeSale(id): void; onClose(): void }`. Purge requires an explicit native confirm (`Alert.alert` with a "cannot be undone" message using `goldPurgeConfirmMessage`) before calling `onPurgeLot`/`onPurgeSale` — matches the backend's "always requires an explicit cannot-be-undone confirmation" rule.

## Data flow

```
gold-management-screen.tsx
  useGoldManagement(...) → { overview, heldLots, trashedLots, trashedSales, brands, actions }
  local UI state (sheets, dropdowns, form draft)
       │
       ├─ GoldOverviewCard        (overview → labels)
       ├─ GoldHistoryList         (heldLots/soldLots + sales → rows, tap → open GoldDetailSheet)
       ├─ GoldActionPickerSheet   (open form as buy/sell)
       ├─ GoldFormSheet           (draft state → validate → createLot/sellLot)
       │     └─ GoldCalendarModal (date picking)
       │     └─ (brand "add new" option) → GoldBrandManageSheet
       ├─ GoldBrandManageSheet    (brands → addBrand/removeBrand)
       ├─ GoldDetailSheet         (selected lot/sale → trashLot/trashSale)
       └─ GoldTrashSheet          (trashedLots/trashedSales → restoreLot/restoreSale/purgeLot/purgeSale)
```

No component reaches into `dependencies`/repositories directly — enforced the same way the finance feature enforces it (screens/components only see the view-model's returned data and functions).

## Error handling

- Form validation errors (from `validateGoldLotInput`/`validateGoldSellTransactionInput`, or thrown by `createLot`/`sellLot`, e.g. selling an already-sold lot) are caught in the screen and shown as inline text in `GoldFormSheet` via `errorMessage`, without closing the sheet.
- Trashing a lot with an active sale throws from `trashLot`; caught in the screen and shown via `GoldDetailSheet`'s `blockedMessage` — but the screen also proactively disables the trash button by checking for an active sale before the user even attempts it (double-guard: UI hint + backend enforcement).
- Purge requires a native `Alert.alert` confirmation before calling the use case, per backend rule that permanent deletion always needs explicit confirmation.
- `useGoldManagement`'s top-level `error` (e.g., initial load failure) is shown as a full-screen error state on the main screen, consistent with how other finance screens handle a `loading`/`error` view-model shape (check `dashboard-screen.tsx` or `transactions-screen.tsx` for the existing convention and match it).

## Wiring into the app shell

- `src/app/index.tsx`: extend the `FinanceView` union with `{ name: 'gold' }`.
- Add a `ConfiguredGoldManagementScreen` component that creates `createGoldDependencies(database)` once (via a ref-based effect, mirroring how `createFinanceDependencies` is created) and renders `useGoldManagement` + `GoldManagementScreen`.
- Wire `onOpenGoldManagement={() => setView({ name: 'gold' })}` into `ConfiguredSettingsScreen`'s render of `SettingsScreen`.
- Add the `'gold'` branch to `ConfiguredFinanceScreen`'s view switch, rendering `ConfiguredGoldManagementScreen` with a back handler returning to `{ name: 'settings' }`.

## i18n

Reuse the existing `gold*` keys from `vi.ts`/`en.ts` (Task 12 of the backend plan) wherever they match. Add new keys only for gaps discovered during implementation (e.g., an empty-history state, a generic "delete brand" accessibility label, an error message for "lot already sold"/"lot not found" if the use cases throw plain `Error` messages that aren't yet mapped to translation keys) — each new key gets added to both locale files and covered by the existing `it.each` pattern in `tests/i18n/gold-component-keys.test.ts` (extend that file's key list, do not create a second i18n test file).

## Testing

Per project convention (no UI/render tests — logic only):
- No render tests for `gold-management-screen.tsx` or any `src/components/gold/*` component.
- Unit test the pure `buildCalendarCells(year, month, selectedDate)` helper in `gold-calendar.ts` (calendar cell generation is non-trivial logic worth covering, same spirit as the existing `gold-domain.test.ts` suite).
- Unit test `buildGoldOverviewLabels` if it contains any non-trivial branching (skip if it's a one-line passthrough of already-tested `formatVnd`/`formatGoldWeight`).
- Extend `tests/i18n/gold-component-keys.test.ts` for any new i18n keys.
- Manual verification: run the app (`run` skill) and click through the golden path (add a purchase lot, add a sale against it, trash the sale, restore it, trash the lot, purge it, add/remove a brand) since this is UI work that automated tests won't cover.

## Self-review notes

- Placeholder scan: no TBD/TODO; every component's props and responsibility are stated.
- Scope check: single screen + its direct sub-components, backend untouched — appropriately scoped for one implementation plan.
- Consistency: component names match their file names; `useGoldManagement`'s existing return shape is not modified, only consumed.
- Ambiguity resolved: date picker explicitly stays custom-drawn (user decision), file structure explicitly component-per-concern under `src/components/gold/` (user decision).
