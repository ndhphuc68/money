# Base Component Layer — Design Spec

**Goal:** Introduce a shared "base component" layer (`src/components/base/`) that holds reusable, domain-agnostic UI building blocks, refactor the six highest-duplication UI patterns currently copy-pasted across `src/components/finance/` and `src/components/gold/` to build on top of it, and codify the base/feature-specific split as a project rule in `CLAUDE.md`.

**Non-goal:** Not touching the remaining four lower-duplication patterns found during the survey (SegmentedControl/FilterBar chip unification, the hardcoded gold-tone badge, ProgressBar, error text under a field) — these are recorded as backlog in the new rule instead. Not changing any feature component's public props/behavior; this is an internal-implementation refactor only, verified by the existing prop/text-based tests (not snapshot tests), so external behavior must stay identical.

## Context

- The project already has `src/components/shared/` (uncommitted) containing `Dropdown.tsx`, used only by `GoldFormSheet`. This gets folded into the new `base/` layer rather than staying a separate concept.
- A survey of all 24 files in `src/components/finance/` and `src/components/gold/` found 10 duplicated UI patterns (see below) and confirmed several one-off components that should NOT be abstracted (`BottomNav`'s overall layout, `UndoBanner`, `DateField`'s date logic, `GoldActionPickerSheet`'s buy/sell tiles, `FilterBar`'s month-shift row, `TransactionForm`'s business logic).
- Existing tests that must keep passing unchanged: `tests/components/finance/cards.test.tsx` (renders `BalanceCard`, `StatCard`, `TransactionRow`, `BudgetRow`, `GoalCard` and asserts on visible text and button role/name — not implementation details), plus `tests/components/finance/navigation.test.tsx` and `entry-controls.test.tsx`. These act as the regression safety net for the refactor.
- CLAUDE.md already has an "Icons" and an "ESLint và Prettier" section written in Vietnamese with the same structure (short intro + bullet list); the new rule section follows that convention.

## Duplicated patterns found (full survey)

Six are in scope for this refactor (highest duplication / clearest shared shape):

1. **Card** — a `View` with `backgroundColor` + `borderRadius` + `padding` + optional shadow, hand-rolled in `StatCard`, `BalanceCard`, `GoalCard`, `GoldOverviewCard`, `AmountInput`, `TransactionForm`, `FilterBar`.
2. **IconButton** — a circular (or square) `Pressable` with a centered icon and a pressed-state background override: 5 Gold\*Sheet close buttons, `BalanceCard`'s mask toggle, `BottomNav`'s FAB, `GoldBrandManageSheet`'s delete button.
3. **PrimaryButton** — a full-width CTA `Pressable` (`minHeight` ~52-54, disabled → `opacity: 0.5`): save buttons in `GoldBrandManageSheet`/`GoldFormSheet`/`TransactionForm`, delete button in `GoldDetailSheet`, confirm button in `DateField`.
4. **ListRow** — leading element + title/subtitle stack + trailing element, with a divider on all but the last row: `TransactionRow`, `SettingsList`, `GoldHistoryList`, `GoldBrandManageSheet`'s brand rows, `GoldTrashSheet`'s rows.
5. **PillChip** — a segmented-choice chip with active/pressed states; `AccountPicker` and `CategoryPicker` implement byte-for-byte identical `PickerChip` code.
6. **Sheet** (chrome only: backdrop + sheet container + optional handle + header with title/subtitle + close button) — `GoldActionPickerSheet`, `GoldBrandManageSheet`, `GoldFormSheet`, `GoldTrashSheet`, `GoldDetailSheet`, and `DateField`'s iOS inline-picker sheet. `GoldActionPickerSheet` differs visually (rounded on all 4 corners, no handle, padding on the backdrop) — modeled as a `variant` rather than forced into the bottom-sheet shape.

Out of scope this round (documented as backlog in the CLAUDE.md rule, not implemented):

7. SegmentedControl / FilterBar chip — two independently-implemented equal-width tab rows that could be unified later.
8. Badge — a colored circular label with 2-letter/icon text; 3 places hardcode the same gold-tone colors (`#FFF4D6` / `#A96308`) instead of a theme token.
9. ProgressBar — identical thin rounded track + clamped-percent fill logic in `GoalCard` and `BudgetRow`.
10. Error text under a field — identical `{color: status.negative, fontSize: caption, fontWeight: semibold}` + `accessibilityRole="alert"` text in `AccountPicker`, `CategoryPicker`, `AmountInput`, `TransactionForm`.

Confirmed one-offs, not touched: `BottomNav`'s overall 5-item nav layout, `UndoBanner`, `DateField`'s cross-platform date logic (only its sheet chrome overlaps pattern 6), `GoldActionPickerSheet`'s buy/sell tiles, `FilterBar`'s month-shift row, `TransactionForm`'s transfer-vs-category branching logic.

## Architecture

```
src/components/base/
  Card.tsx
  IconButton.tsx
  PrimaryButton.tsx
  ListRow.tsx
  PillChip.tsx
  Sheet.tsx
  Dropdown.tsx        — moved as-is from the current src/components/shared/Dropdown.tsx
  index.ts             — barrel export
```

`src/components/shared/` is removed; its one consumer (`GoldFormSheet.tsx`, which imports `Dropdown`) is repointed to `@/components/base`.

Feature components (`src/components/finance/*`, `src/components/gold/*`) keep their existing file names, exported names, and prop types unchanged — only their internals change to compose the new base components instead of hand-rolling `StyleSheet` blocks. This is why the existing prop/text-based tests are sufficient as a regression check; no test changes should be needed unless a test currently asserts on something only true of the old internal structure (to be verified during implementation, not assumed).

## Base component APIs

```ts
// base/Card.tsx — plain container: background + radius + shadow + padding
type CardProps = {
  children: ReactNode;
  elevation?: 'none' | 'card' | 'elevated'; // maps to shadows.card / shadows.elevated; default 'card'
  radius?: keyof typeof radius; // default 'lg'
  padding?: number; // default spacing[4]
  backgroundColor?: string; // default colors.surface.primary
  style?: StyleProp<ViewStyle>;
};

// base/IconButton.tsx — circular/square Pressable with a centered icon
type IconButtonProps = {
  icon: ReactNode; // caller passes e.g. <X color={...} size={20} />
  onPress?: () => void;
  size?: number; // default 44
  radius?: keyof typeof radius; // default 'circle'
  backgroundColor?: string;
  pressedBackgroundColor?: string;
  accessibilityLabel: string;
  disabled?: boolean;
};

// base/PrimaryButton.tsx — full-width CTA
type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  backgroundColor?: string; // default colors.content.primary
  textColor?: string; // default colors.content.inverse
  style?: StyleProp<ViewStyle>;
};

// base/ListRow.tsx — leading + title/subtitle + trailing, optional divider
type ListRowProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  showDivider?: boolean; // caller computes index < length - 1
  onPress?: () => void; // when present, the whole row is a Pressable
};

// base/PillChip.tsx — single-select chip (dedupes AccountPicker/CategoryPicker's identical code)
type PillChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

// base/Sheet.tsx — modal chrome only: backdrop + sheet + optional handle + header + close
type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  closeLabel: string;
  variant?: 'bottomSheet' | 'dialog'; // bottomSheet: top-only radius, handle, maxHeight 86% (default); dialog: all-corner radius, no handle, padded backdrop (GoldActionPickerSheet's shape)
  children: ReactNode; // feature component supplies body content and any action buttons
};
```

`Sheet` provides chrome only — the save/delete/confirm buttons and body content stay in each feature component (composed from `PrimaryButton` where applicable), since their labels, colors, and business logic differ per sheet.

## Migration scope (files touched)

New files: `src/components/base/{Card,IconButton,PrimaryButton,ListRow,PillChip,Sheet,Dropdown}.tsx`, `src/components/base/index.ts`.

Refactored internals (public props/exports unchanged):

- **Card** → `StatCard`, `BalanceCard`, `GoalCard`, `GoldOverviewCard`, `AmountInput`, `TransactionForm`, `FilterBar`
- **Sheet** → `GoldActionPickerSheet`, `GoldBrandManageSheet`, `GoldFormSheet`, `GoldTrashSheet`, `GoldDetailSheet`, `DateField` (iOS sheet portion only)
- **IconButton** → close buttons in the 5 Gold\*Sheet components, `BalanceCard`'s mask toggle, `GoldBrandManageSheet`'s delete button, `BottomNav`'s FAB
- **PrimaryButton** → save buttons in `GoldBrandManageSheet`/`GoldFormSheet`/`TransactionForm`, delete button in `GoldDetailSheet`, confirm button in `DateField`
- **PillChip** → `AccountPicker`, `CategoryPicker` (removes the duplicated `PickerChip` code)
- **ListRow** → `TransactionRow`, `SettingsList`, `GoldHistoryList`, `GoldBrandManageSheet`'s brand rows, `GoldTrashSheet`'s rows

Removed: `src/components/shared/` (folded into `base/`). Any import of `@/components/shared` (currently only `GoldFormSheet.tsx`) is repointed to `@/components/base`.

Not touched in this round: `BottomNav`'s overall layout, `UndoBanner`, `DateField`'s date logic, `GoldActionPickerSheet`'s buy/sell tiles, `FilterBar`'s month-shift row, `TransactionForm`'s business logic, and patterns 7–10 above.

## CLAUDE.md rule addition

A new `## Component: Base & Feature-specific` section, matching the existing Vietnamese bullet-list convention:

```markdown
## Component: Base & Feature-specific

Component chia làm 2 lớp:

- **Base component** (`src/components/base/`): building block UI thuần, không phụ thuộc domain logic, dùng chung cho toàn dự án (Card, IconButton, PrimaryButton, ListRow, PillChip, Sheet, Dropdown...).
- **Feature component** (`src/components/finance/`, `src/components/gold/`...): đặc thù cho 1 tính năng, compose lại từ base component qua props (`style`, `variant`, màu sắc...) thay vì copy-paste style riêng.

- Trước khi viết 1 UI element mới (card, button, list row, sheet, chip...), kiểm tra `src/components/base/` trước; nếu đã có pattern tương tự thì compose lại thay vì viết lại từ đầu.
- Nếu phát hiện ≥2 chỗ dùng cùng 1 pattern UI mà chưa có trong `base/`, tách nó ra `base/` ngay, không chờ lặp lần 3.
- Khi cần custom giao diện cho 1 base component ở 1 chỗ cụ thể, truyền prop để override, không tạo bản sao file khác.

Backlog (chưa tách trong đợt refactor hiện tại, cân nhắc tách khi đụng tới): hợp nhất SegmentedControl/FilterBar chip, Badge tròn màu (đang hardcode `#FFF4D6`/`#A96308` ở 3 chỗ), ProgressBar (GoalCard/BudgetRow), error text dưới field.
```

## Testing

No new tests are added for the base components themselves per project convention (no dedicated UI-only tests observed for existing presentational components beyond the prop/text-based ones). Verification is:

- `npm test` (Jest) — `tests/components/finance/cards.test.tsx`, `navigation.test.tsx`, `entry-controls.test.tsx` and the full suite must keep passing unchanged.
- `npx expo lint` and `npx tsc --noEmit` must pass.
- Manual smoke check in the running app (per project convention for UI changes) of: a finance card screen, the gold management screen's sheets (action picker, form, brand manage, detail, trash), and the account/category pickers — confirming no visual regression versus current behavior.
