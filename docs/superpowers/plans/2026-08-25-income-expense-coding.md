# Income & Expense MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the local-first Vietnamese finance MVP for accounts, categories, income, expense, transfers, onboarding, dashboard, transaction history, reports, and settings while preserving correct balances and change-log atomicity.

**Architecture:** Keep business rules in pure domain/application code. React Native screens call view models/use cases; repositories are the only data-layer boundary. Accounts, categories, and transactions are syncable records with UUID/timestamp/revision metadata; profile/onboarding settings remain device-local. Every business write and its change-log operation is committed in one SQLite transaction.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.9, Drizzle ORM + Expo SQLite, Expo Router, Jest + React Native Testing Library, existing finance design tokens/components in `src/theme` and `src/components/finance`.

**Spec:** `docs/superpowers/specs/2026-08-25-income-expense-design.md`; visual source: `design/Finance App.dc.html` and `design/design_handoff_finance_app/Finance App.dc.html`.

## Global Constraints

- MVP is single-person, manual entry, local data, and VND only.
- Do not implement CSV/Excel import, bank connection, multi-device sync UX, household collaboration, recurring transactions, budgets, goals, PIN, biometrics, or multi-currency.
- Amounts are positive integer VND values; zero and negative amounts are invalid.
- Transactions are `income`, `expense`, or `transfer`; transfers have no category and do not contribute to income, expense, or net cash flow.
- Soft-deleted transactions are excluded from balances and reports; delete requires confirmation and exposes a short-lived Undo action.
- Source and destination accounts for a transfer must be different.
- Account/category/transaction write plus change-log append must use one SQLite transaction.
- Screens must not access SQLite directly and must use semantic theme tokens rather than raw colors.
- Preserve sync metadata (`id`, `createdAt`, `updatedAt`, `deletedAt`, `revision`, `originDeviceId`) on syncable business entities.

## File Map

Create domain/application units under `src/core/domain/finance` and `src/core/application/finance`; create Drizzle schemas/repositories under `src/data/local`; create feature view models/screens under `src/features/finance`; reuse and extend `src/components/finance`; keep tests mirrored under `tests/core/finance`, `tests/data/local/finance`, `tests/features/finance`, and `tests/components/finance`.

### Task 1: Lock domain entities and pure business rules

**Files:**

- Create: `src/core/domain/finance/finance-record.ts`
- Create: `src/core/domain/finance/account.ts`
- Create: `src/core/domain/finance/category.ts`
- Create: `src/core/domain/finance/transaction.ts`
- Create: `src/core/domain/finance/profile-settings.ts`
- Create: `src/core/domain/finance/money.ts`
- Create: `src/core/domain/finance/finance-calculations.ts`
- Test: `tests/core/finance/finance-domain.test.ts`

**Interfaces:**

- `Account`, `Category`, and `Transaction` extend `SyncableRecord` and use integer VND amounts.
- `Transaction.type` is `'income' | 'expense' | 'transfer'`; income/expense require `categoryId`, transfer requires `destinationAccountId` and forbids `categoryId`.
- `validateTransactionInput(input): void` rejects missing names, non-positive amounts, invalid dates, missing account/category fields, and same-account transfers.
- `calculateAccountBalance(account, transactions): number` applies opening balance plus income minus expense minus outgoing transfer plus incoming transfer, excluding tombstones.
- `calculatePeriodSummary(transactions, from, to): { income: number; expense: number; netCashFlow: number; byCategory: Record<string, number>; byAccount: Record<string, number> }` excludes transfers from income/expense/net cash flow.
- `formatVnd(amount): string` and `parseVndInput(value): number | null` are deterministic and never use floating-point arithmetic for stored values.

- [ ] **Step 1: Write failing tests for valid and invalid transaction shapes.** Cover income, expense, transfer, missing category, transfer category, same-account transfer, zero/negative amount, and blank name.
- [ ] **Step 2: Run `npm test -- --runInBand tests/core/finance/finance-domain.test.ts`; verify the new tests fail because finance types/functions do not exist.**
- [ ] **Step 3: Implement the entity types, validation, money helpers, balance formula, and period aggregation without database or React Native imports.**
- [ ] **Step 4: Add tests for tombstones, opening balances, transfer direction, month boundaries, category/account aggregation, and VND formatting; run the focused test until it passes.**
- [ ] **Step 5: Commit with `git add src/core/domain/finance tests/core/finance/finance-domain.test.ts; git commit -m "feat: add finance domain rules"`.**

### Task 2: Add local schema, migration, and profile/onboarding persistence

**Files:**

- Create: `src/data/local/schema/accounts.ts`
- Create: `src/data/local/schema/categories.ts`
- Create: `src/data/local/schema/transactions.ts`
- Create: `src/data/local/schema/profile-settings.ts`
- Modify: `src/data/local/schema/index.ts`
- Modify: `drizzle.config.ts` if schema discovery needs adjustment
- Create: generated `drizzle/0001_<generated-name>.sql` and update `drizzle/meta/*`
- Test: `tests/data/local/finance-schema.test.ts`

**Interfaces:**

- Tables are `accounts`, `categories`, `transactions`, and `profile_settings`.
- `accounts` stores name, account type, opening balance, active/hidden state, and sync metadata.
- `categories` stores name, `type` (`income | expense`), icon/color metadata, default/custom marker, active/hidden state, and sync metadata.
- `transactions` stores type, positive integer amount, source account, optional destination account/category, transaction date, name, optional note, and sync metadata.
- `profile_settings` stores one local device row with display name, hide-money flag, onboarding step/status, and updated timestamp; it is not added to the sync operation model.
- All foreign keys and indexes needed by account/date/type/category filters are defined in Drizzle schema.

- [ ] **Step 1: Write schema-level tests that open a fresh test database and assert all four tables can be created, queried, and constrained.**
- [ ] **Step 2: Run `npm test -- --runInBand tests/data/local/finance-schema.test.ts` and `npx drizzle-kit check`; verify failure before schema exists.**
- [ ] **Step 3: Implement the four Drizzle schemas, export them, generate the migration with `npx drizzle-kit generate`, and inspect the SQL for new and existing databases.**
- [ ] **Step 4: Add migration assertions for fresh and existing database startup, then run `npx drizzle-kit check` and `npm test -- --runInBand tests/data/local/finance-schema.test.ts`.**
- [ ] **Step 5: Commit schema and migration changes with `git add src/data/local/schema drizzle; git commit -m "feat: add finance database schema"`.**

### Task 3: Implement repositories and atomic change-log writes

**Files:**

- Create: `src/core/application/ports/finance-repositories.ts`
- Create: `src/data/local/repositories/account-repository.ts`
- Create: `src/data/local/repositories/category-repository.ts`
- Create: `src/data/local/repositories/transaction-repository.ts`
- Create: `src/data/local/repositories/profile-settings-repository.ts`
- Create: `src/data/local/repositories/finance-record-mappers.ts`
- Modify: `src/data/local/repositories/change-log-repository.ts` only for shared operation helpers if required
- Test: `tests/data/local/finance-repositories.test.ts`

**Interfaces:**

- `AccountRepository`: `create`, `update`, `softDeleteOrHide`, `findById`, `listActive`, `saveWithOperation`.
- `CategoryRepository`: `create`, `update`, `hide`, `findById`, `listActiveByType`, `isUsedByTransaction`, `saveWithOperation`; physical delete is forbidden when used.
- `TransactionRepository`: `create`, `update`, `softDelete`, `restore`, `findById`, `list(filter)`, `saveWithOperation`; filter supports month/range, type, category, account, and name query.
- `ProfileSettingsRepository`: `get`, `save` for the singleton local row.
- All syncable writes canonicalize UUIDs, increment revision on update/delete/restore, and append a serializable `SyncOperation` in the same transaction.

- [ ] **Step 1: Write repository integration tests for CRUD, filters, soft deletion, restore, category-in-use protection, and account/category references.**
- [ ] **Step 2: Add a failure test using a SQLite trigger to prove a duplicate/failing change-log insert rolls back the business row.**
- [ ] **Step 3: Run `npm test -- --runInBand tests/data/local/finance-repositories.test.ts`; verify the tests fail before repositories exist.**
- [ ] **Step 4: Implement repository ports, row mappers, queries, indexes-aware filters, and atomic `saveWithOperation` transactions following `ExampleRecordRepository`.**
- [ ] **Step 5: Run focused tests plus `npm run typecheck`; commit with `git commit -m "feat: add finance repositories"`.**

### Task 4: Add finance use cases and default data/onboarding state machine

**Files:**

- Create: `src/core/application/finance/create-account.ts`
- Create: `src/core/application/finance/manage-categories.ts`
- Create: `src/core/application/finance/create-transaction.ts`
- Create: `src/core/application/finance/update-transaction.ts`
- Create: `src/core/application/finance/delete-transaction.ts`
- Create: `src/core/application/finance/restore-transaction.ts`
- Create: `src/core/application/finance/get-dashboard.ts`
- Create: `src/core/application/finance/get-report.ts`
- Create: `src/core/application/finance/onboarding.ts`
- Create: `src/core/application/finance/default-categories.ts`
- Test: `tests/core/finance/finance-use-cases.test.ts`

**Interfaces:**

- Use cases accept repository ports plus `now`, `deviceId`, and UUID factories; they return domain records or view-ready aggregates and do not import Drizzle/React Native.
- `CreateTransaction.execute(input)` validates type-specific fields, writes the transaction and matching create operation atomically, and returns the created transaction.
- `UpdateTransaction.execute(id, patch)` validates the merged record, writes one revised operation, and supports amount/account/category/date/name/note changes.
- `DeleteTransaction.execute(id)` creates a tombstone; `RestoreTransaction.execute(id)` clears `deletedAt` and creates an update operation.
- `GetDashboard.execute(month)` returns total balance, period income/expense/net, chart series, category spending, and recent active transactions.
- `GetReport.execute(period, filters)` returns income, expense, net cash flow, category totals, and account totals.
- `Onboarding` exposes `getState`, `saveDisplayName`, `createFirstAccount`, `confirmDefaults`, and `resume`; it cannot finish until at least one account exists.

- [ ] **Step 1: Write tests for create/update/delete/restore and dashboard/report aggregates using in-memory fake repository ports.**
- [ ] **Step 2: Add onboarding tests for resume-after-exit, optional display name, default-category confirmation/editing, and mandatory first account.**
- [ ] **Step 3: Run `npm test -- --runInBand tests/core/finance/finance-use-cases.test.ts`; verify failure.**
- [ ] **Step 4: Implement use cases, default categories, operation payload construction, and onboarding state transitions.**
- [ ] **Step 5: Run focused tests and `npm run typecheck`; commit with `git commit -m "feat: add finance use cases"`.**

### Task 5: Generalize sync for finance entities

**Files:**

- Modify: `src/data/sync/sync-engine/sync-engine.ts`
- Modify: `src/infrastructure/expo/sync/create-mobile-sync-dependencies.ts`
- Modify: `src/core/domain/sync/syncable-record.ts` only if a shared finance record type requires it
- Create/modify: `tests/data/sync/finance-sync.test.ts`

**Interfaces:**

- `SyncEngine` resolves `entityType` to account/category/transaction repositories and validates each payload against the matching domain parser.
- Supported sync entity types are `account`, `category`, and `transaction`; profile settings remain local-only.
- Import preserves current checksum, schema-version, idempotency, conflict-resolution, and all-or-nothing transaction behavior.
- Export includes pending finance operations in deterministic order.

- [ ] **Step 1: Write tests for export/import of one account, category, income, expense, and transfer; include tombstones, duplicate reimport, invalid type-specific payload, and rollback.**
- [ ] **Step 2: Run `npm test -- --runInBand tests/data/sync/finance-sync.test.ts`; verify the current example-record-only engine fails.**
- [ ] **Step 3: Implement entity dispatch and repository adapters without weakening existing example-record tests.**
- [ ] **Step 4: Wire all finance repositories into mobile sync dependencies and increment the schema version only if the package format requires it.**
- [ ] **Step 5: Run all sync tests and `npm run typecheck`; commit with `git commit -m "feat: sync finance records"`.**

### Task 6: Build reusable entry/filter/form UI primitives from the design handoff

**Files:**

- Create: `src/components/finance/AmountInput.tsx`
- Create: `src/components/finance/AccountPicker.tsx`
- Create: `src/components/finance/CategoryPicker.tsx`
- Create: `src/components/finance/DateField.tsx`
- Create: `src/components/finance/TransactionForm.tsx`
- Create: `src/components/finance/FilterBar.tsx`
- Create: `src/components/finance/UndoBanner.tsx`
- Modify: `src/components/finance/index.ts`
- Modify: `src/components/finance/TransactionRow.tsx` and existing cards only where needed to match real domain data
- Test: `tests/components/finance/entry-controls.test.tsx`

**Interfaces:**

- `TransactionForm` switches income/expense/transfer modes; category is rendered only for income/expense, destination account only for transfer.
- `AmountInput` emits positive integer VND or validation state; it never returns a float.
- Picker components expose selected ID and accessible labels; form fields show explicit validation messages.
- `FilterBar` supports month, type, category, account, and search; `UndoBanner` calls restore once and expires after the configured short window.

- [ ] **Step 1: Write component tests for conditional fields, required name/category, invalid amount, same-account transfer, date default, accessibility labels, and undo callback.**
- [ ] **Step 2: Run `npm test -- --runInBand tests/components/finance/entry-controls.test.tsx`; verify failure.**
- [ ] **Step 3: Implement the controls using existing tokens, `Pressable`, `TextInput`, and the native date-picker dependency selected for Expo SDK 54; add the dependency only if not already available.**
- [ ] **Step 4: Run focused component tests and `npm run typecheck`; verify the design handoff states: dark primary save CTA, segmented type control, card surfaces, centered FAB, VND formatting, and no budgets/goals UI in MVP.**
- [ ] **Step 5: Commit with `git commit -m "feat: add finance entry controls"`.**

### Task 7: Implement onboarding and app dependency composition

**Files:**

- Create: `src/features/finance/screens/onboarding-screen.tsx`
- Create: `src/features/finance/view-models/use-onboarding.ts`
- Create: `src/features/finance/finance-dependencies.ts`
- Modify: `src/app/index.tsx`
- Modify: `src/app/_layout.tsx` only if route/provider composition needs it
- Modify: `src/i18n/locales/vi.ts`
- Modify: `src/i18n/locales/en.ts`
- Test: `tests/features/finance/onboarding.test.tsx`
- Modify: `tests/smoke/navigation.test.tsx`

**Interfaces:**

- `createFinanceDependencies(database)` constructs repositories and use cases once per database instance and supplies device identity/UUID/time dependencies.
- `useOnboarding` exposes current step, values, validation errors, next/back/skip/finish actions, and resume state.
- Root route chooses onboarding when profile state is incomplete and dashboard when onboarding is complete; existing sync functionality remains reachable from settings/data tools.

- [ ] **Step 1: Write screen/view-model tests for four steps, optional name/default-category editing, required first account, and resume after unmount/remount.**
- [ ] **Step 2: Update smoke tests to assert a fresh database starts onboarding rather than the current sync screen.**
- [ ] **Step 3: Run `npm test -- --runInBand tests/features/finance/onboarding.test.tsx tests/smoke/navigation.test.tsx`; verify failure.**
- [ ] **Step 4: Implement dependency composition, onboarding view model, localized copy, and root conditional rendering.**
- [ ] **Step 5: Run focused tests, `npm run typecheck`, and `npx expo config --type public`; commit with `git commit -m "feat: add finance onboarding"`.**

### Task 8: Implement dashboard and transaction flows

**Files:**

- Create: `src/features/finance/screens/dashboard-screen.tsx`
- Create: `src/features/finance/screens/transactions-screen.tsx`
- Create: `src/features/finance/screens/transaction-form-screen.tsx`
- Create: `src/features/finance/view-models/use-dashboard.ts`
- Create: `src/features/finance/view-models/use-transactions.ts`
- Create: `src/features/finance/view-models/use-transaction-form.ts`
- Create: `tests/features/finance/dashboard.test.tsx`
- Create: `tests/features/finance/transactions.test.tsx`
- Modify: `src/app/index.tsx` or add Expo Router routes under `src/app/` according to the chosen navigation composition

**Interfaces:**

- Dashboard renders total balance, current-month income/expense/net, monthly income/expense chart, category spending, recent transactions, and hide/show-money action.
- Transactions renders date-grouped active records with filters/search and opens detail/edit.
- Form defaults date to today, supports income/expense/transfer, and returns to dashboard/list after save with all aggregates refreshed.
- Delete asks for confirmation, soft-deletes, then offers Undo; edit updates list, balance, dashboard, report, and change log consistently.

- [ ] **Step 1: Write view-model/screen tests for loading empty state, successful create, refresh after mutation, filters, search, edit, delete confirmation, and undo.**
- [ ] **Step 2: Run the focused feature tests and verify failure.**
- [ ] **Step 3: Implement view models with use cases and local state; add loading/error/empty states and avoid direct database access.**
- [ ] **Step 4: Implement screens against the handoff: `BalanceCard`, `StatCard`, `TransactionRow`, segmented type control, centered FAB, VND values, and current-month defaults.**
- [ ] **Step 5: Run focused tests plus `npm test -- --runInBand`; commit with `git commit -m "feat: add dashboard and transaction flows"`.**

### Task 9: Implement reports and settings/account/category management

**Files:**

- Create: `src/features/finance/screens/reports-screen.tsx`
- Create: `src/features/finance/screens/settings-screen.tsx`
- Create: `src/features/finance/screens/accounts-screen.tsx`
- Create: `src/features/finance/screens/categories-screen.tsx`
- Create: `src/features/finance/view-models/use-reports.ts`
- Create: `src/features/finance/view-models/use-settings.ts`
- Create: `tests/features/finance/reports.test.tsx`
- Create: `tests/features/finance/settings.test.tsx`

**Interfaces:**

- Reports default to the current month and can move previous/next month; display total income, expense, net cash flow, category spending, and account spending.
- Settings manages accounts, hides/deactivates accounts, manages categories, edits display name, toggles hide/show money, and exposes local data/sync entry points.
- Categories currently used by a transaction can be hidden/edited but not physically deleted.

- [ ] **Step 1: Write tests for month navigation, transfer exclusion, category/account totals, account creation/opening balance, category hide/edit, and money visibility persistence.**
- [ ] **Step 2: Run focused reports/settings tests and verify failure.**
- [ ] **Step 3: Implement view models and screens with existing `SettingsList`, cards, tokens, localized copy, and confirmation/error states.**
- [ ] **Step 4: Connect reports/settings to bottom navigation and ensure hiding money changes presentation only, never stored amounts or calculations.**
- [ ] **Step 5: Run focused tests and commit with `git commit -m "feat: add reports and finance settings"`.**

### Task 10: End-to-end acceptance, migration verification, and UX input-speed checkpoint

**Files:**

- Create: `tests/acceptance/income-expense-mvp.test.ts`
- Modify: `tests/smoke/app-starts.test.ts`
- Modify: `README.md` with finance validation commands and MVP exclusions if needed
- Optional prototype evidence: `design/prototypes/income-expense-entry.md` or an existing design artifact; do not add production behavior from an unapproved experiment

**Interfaces:**

- Acceptance test uses a real test SQLite database and composed use cases/repositories, then verifies UI-facing aggregates.
- The test covers onboarding → first account → income → expense → outgoing/incoming transfer → edit → soft delete → undo → report/dashboard refresh.

- [ ] **Step 1: Write the full acceptance scenario with fixed dates and amounts, asserting each intermediate account balance and monthly summary.**
- [ ] **Step 2: Add migration tests for a fresh database and a database containing the pre-existing sync tables; run `npx drizzle-kit check`.**
- [ ] **Step 3: Run `npm test -- --runInBand`, `npm run typecheck`, `npx drizzle-kit check`, and `npx expo config --type public`; fix failures without weakening domain assertions.**
- [ ] **Step 4: Validate the design handoff on a device/emulator: add flow takes only the required fields, transfer never exposes category, delete/undo is clear, and money masking is visual-only.**
- [ ] **Step 5: Run `git diff --check`, review the complete spec-to-test coverage, and commit with `git commit -m "test: verify income expense MVP"`.**

## Verification Matrix

| Requirement                                     | Primary coverage                                             |
| ----------------------------------------------- | ------------------------------------------------------------ |
| Correct balance formula                         | `tests/core/finance/finance-domain.test.ts`, acceptance test |
| Income/expense/transfer validation              | domain and entry-control tests                               |
| Atomic business write + change log              | `tests/data/local/finance-repositories.test.ts`              |
| Soft delete and undo                            | use-case, repository, and transaction-flow tests             |
| Transfer excluded from totals                   | domain, reports, acceptance tests                            |
| Current/previous/next month reports             | `tests/features/finance/reports.test.ts`                     |
| Category in-use cannot be physically deleted    | repository/settings tests                                    |
| Onboarding resume and first-account requirement | onboarding tests                                             |
| Hide/show money does not alter data             | settings/dashboard tests                                     |
| Migration fresh/existing database               | schema and acceptance tests                                  |
| Finance entity sync compatibility               | `tests/data/sync/finance-sync.test.ts`                       |

## Self-review

- All MVP entities and flows from the spec map to Tasks 1–9.
- Excluded MVP features are explicitly constrained and not represented in production screens.
- Every implementation task has concrete files, interfaces, failing-test-first steps, commands, and a commit boundary.
- No task relies on an undefined finance function; shared signatures are defined in the task that introduces them.
- The open UX risk is isolated to Task 6/10: validate entry speed with a prototype/device check without changing the approved required-field rules.
