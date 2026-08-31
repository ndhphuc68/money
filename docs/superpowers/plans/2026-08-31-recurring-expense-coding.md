# Chi Tiêu Định Kỳ (Recurring Expense) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the local-first backend and UI for recurring expenses (subscriptions, fixed bills) — creating a schedule from the expense form, generating one pending occurrence at a time, confirming/skipping occurrences into real transactions, managing schedules (pause/resume/end/edit), and local reminders — matching `docs/superpowers/specs/2026-08-28-recurring-expense-design.md` and the UI prototype embedded in `design/Finance App.dc.html` (screens reachable via `initialRecurringView`: `list`, `detail`, `scope`, `success`).

**Architecture:** Follow the existing hexagonal layering used by the finance feature: pure domain types/validation/date-math in `src/core/domain/finance`, use cases + repository ports in `src/core/application/finance` and `src/core/application/ports`, Drizzle+SQLite schema/repositories in `src/data/local`, and React Native screens/view-models in `src/features/finance`, composed by extending `finance-dependencies.ts`. Every business write that spans more than one table (create-first-period, confirm, skip) runs inside one `database.db.transaction(...)` callback alongside its `change_log` row(s), exactly like `TransactionRepository.saveWithOperation`.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.9, Drizzle ORM + Expo SQLite, Jest + `jest-expo`, `expo-notifications` (new dependency, added in Task 8), existing sync primitives in `src/core/domain/sync` and `src/data/local/repositories` (`buildSyncOperation`, `canonicalizeSyncableRecordIdentifiers`, `toChangeLogValues`, `openTestLocalDatabase`).

**Spec:** `docs/superpowers/specs/2026-08-28-recurring-expense-design.md`; visual source: `design/Finance App.dc.html` (search `isRecurringList` / `isRecurringDetail` / `isRecurringScope` / `isRecurringSuccess`) and `design/All Screens.dc.html` (screen index).

## Global Constraints

- MVP is a single person, VNĐ only, local-first data, **expense only** (spec §Không thuộc MVP: no recurring income, no auto-detection, no auto-confirm, no recurring transfers, no custom N-day/week cycles, no "last business day", no multi-currency).
- `amount` is always a positive integer VNĐ (spec §Mô hình dữ liệu, matching `validateTransactionInput`'s existing amount rule).
- Frequencies are exactly `weekly | monthly | quarterly | yearly` (spec §Mô hình dữ liệu). Weekly advances by 7 days; monthly/quarterly/yearly keep a fixed `anchorDay` and fall back to the **last day of the target month** when that month is shorter (spec §Tính ngày kỳ tiếp theo) — including the 29/02 leap-year case.
- Each `RecurringSchedule` has **at most one** unresolved (`pending`/`overdue`) `RecurringOccurrence` at a time; the next one is only generated after the current one is `confirmed` or `skipped` (spec §Sinh kỳ tiếp theo).
- `RecurringOccurrence` rows never touch the `transactions` table or the balance/report totals until confirmed (spec §Kỳ dự kiến, §Số dư và báo cáo) — they live in their own `recurring_occurrences` table.
- Creating the schedule always creates a real `Transaction` for period 1 immediately (spec §Tạo lịch từ form thêm chi tiêu) — the transaction being entered in the form **is** period 1, not a preview.
- Confirming/skipping an occurrence, generating the next occurrence, and updating the schedule's `generatedCount`/`status` must commit in the **same SQLite transaction** as their `change_log` rows; on any failure nothing is persisted (spec §Kiến trúc triển khai, §Xử lý lỗi).
- `paused` schedules generate no new occurrences but their current unresolved occurrence can still be confirmed/skipped; `ended` schedules never generate again; neither ever deletes past confirmed transactions (spec §Quản lý định kỳ).
- Reaching `endDate` or `occurrenceLimit` ends the schedule and stops generation (spec §Sinh kỳ tiếp theo).
- Editing a schedule's defaults (Quản lý định kỳ) applies to the schedule and to its current unresolved occurrence's copied fields, never to already-confirmed past transactions (spec §Quản lý định kỳ).
- Deleting the first transaction of a schedule never auto-deletes the schedule; the schedule keeps its (soft-deleted) `firstTransactionId` link (spec §Xóa giao dịch kỳ đầu tiên) — this plan only needs to *not break* on that case, no special UI is required for it here.
- Local notifications use `remindDaysBefore` (default 1) per schedule, never send twice for the same occurrence (`notifiedAt`), and never auto-confirm (spec §Thông báo).
- Screens must not access SQLite or repositories directly — only through use cases/view-models (established codebase convention, `src/features/finance/finance-dependencies.ts`).
- Preserve sync metadata (`id`, `createdAt`, `updatedAt`, `deletedAt`, `revision`, `originDeviceId`) on every syncable business entity (established codebase convention, `src/core/domain/sync/syncable-record.ts`); registering the new entity types in the sync engine (`src/data/sync/sync-engine/entity-adapters.ts`) is **out of scope** for this plan (spec §Kiến trúc triển khai explicitly defers sync expansion — "giữ metadata sync hiện tại... để mở rộng sync sau này").
- Every new user-facing string gets a camelCase key added to both `src/i18n/locales/vi.ts` and `src/i18n/locales/en.ts`, verified by an `it.each` test enumerating the required keys (established codebase convention, `tests/i18n/finance-component-keys.test.ts`).
- Icons come from `lucide-react-native` only (project rule, `CLAUDE.md` §Icons) — no emoji.
- Only compose from `src/components/base` (`Card`, `Sheet`, `PrimaryButton`, `ListRow`, `PillChip`, `IconButton`, `Dropdown`); do not fork copies of these (project rule, `CLAUDE.md` §Component).

## Out of Scope For This Plan

- Wiring `recurring_schedules`/`recurring_occurrences` into the multi-device sync engine (`entity-adapters.ts`, payload validators) — the schema carries full sync metadata so this is additive later, per spec.
- The "Xóa giao dịch kỳ đầu" guidance banner (spec §Xóa giao dịch kỳ đầu tiên) — not building new UI for it; existing soft-delete behavior already satisfies "app không tự xóa lịch".
- Push/remote notifications — only local `expo-notifications` reminders.

## File Map

- Domain: `src/core/domain/finance/recurring-date.ts`, `src/core/domain/finance/recurring-schedule.ts`, `src/core/domain/finance/recurring-occurrence.ts`
- Application ports: `src/core/application/ports/recurring-repositories.ts` (extends `finance-repositories.ts`'s `WriteContext`)
- Application use cases: `src/core/application/finance/create-recurring-expense.ts`, `confirm-recurring-occurrence.ts`, `skip-recurring-occurrence.ts`, `manage-recurring-schedule.ts`, `get-recurring-overview.ts`, `sync-recurring-notifications.ts`
- Data schema: `src/data/local/schema/recurring-schedules.ts`, `src/data/local/schema/recurring-occurrences.ts`, `src/data/local/schema/index.ts` (extend)
- Data: `src/data/local/repositories/recurring-record-mappers.ts`, `src/data/local/repositories/recurring-schedule-repository.ts`, `src/data/local/repositories/recurring-occurrence-repository.ts`, `src/data/local/repositories/recurring-occurrence-processing-repository.ts`
- Notifications infra: `src/infrastructure/expo/notifications/recurring-notification-scheduler.ts`
- Feature wiring: `src/features/finance/finance-dependencies.ts` (extend)
- View models: `src/features/finance/view-models/use-transaction-form.ts` (extend), `src/features/finance/view-models/recurring-presentation.ts`, `src/features/finance/view-models/use-recurring-occurrences.ts`, `src/features/finance/view-models/use-recurring-management.ts`
- Screens/components: `src/components/finance/TransactionFormSheet.tsx` (extend), `src/features/finance/screens/recurring-occurrences-screen.tsx`, `src/features/finance/screens/recurring-occurrence-detail-screen.tsx`, `src/features/finance/screens/recurring-scope-screen.tsx`, `src/features/finance/screens/recurring-success-screen.tsx`, `src/features/finance/screens/recurring-management-screen.tsx`, `src/features/finance/screens/settings-screen.tsx` (extend)
- App wiring: `src/app/index.tsx` (extend `FinanceView`)
- i18n: `src/i18n/locales/vi.ts`, `src/i18n/locales/en.ts` (extend), `tests/i18n/recurring-component-keys.test.ts`
- Tests: `tests/core/finance/recurring-domain.test.ts`, `tests/core/finance/recurring-use-cases.test.ts`, `tests/data/local/recurring-schema.test.ts`, `tests/data/local/recurring-repositories.test.ts`, `tests/features/finance/use-recurring-occurrences.test.ts`, `tests/features/finance/use-recurring-management.test.ts`

---

### Task 1: Recurrence date math (`recurring-date.ts`)

**Files:**
- Create: `src/core/domain/finance/recurring-date.ts`
- Test: `tests/core/finance/recurring-domain.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no imports from other new files).
- Produces:
  - `RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'`
  - `deriveAnchorDay(date: string, frequency: RecurringFrequency): number` — day-of-week (0=Sun..6=Sat) for `weekly`, day-of-month (1-31) otherwise.
  - `computeNextOccurrenceDate(previousDate: string, frequency: RecurringFrequency, anchorDay: number): string` — returns the next ISO date (`YYYY-MM-DD`).
  - `isBeyondScheduleLimit(params: { endDate: string | null; occurrenceLimit: number | null; generatedCount: number; candidateDate: string }): boolean`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/core/finance/recurring-domain.test.ts
import {
  computeNextOccurrenceDate,
  deriveAnchorDay,
  isBeyondScheduleLimit,
} from '@/core/domain/finance/recurring-date';

describe('deriveAnchorDay', () => {
  it('returns the day of month for monthly/quarterly/yearly', () => {
    expect(deriveAnchorDay('2026-01-31', 'monthly')).toBe(31);
    expect(deriveAnchorDay('2026-08-27', 'quarterly')).toBe(27);
    expect(deriveAnchorDay('2028-02-29', 'yearly')).toBe(29);
  });

  it('returns the day of week (0=Sun) for weekly', () => {
    expect(deriveAnchorDay('2026-08-27', 'weekly')).toBe(4); // Thursday
  });
});

describe('computeNextOccurrenceDate', () => {
  it('adds 7 days for weekly', () => {
    expect(computeNextOccurrenceDate('2026-08-27', 'weekly', 4)).toBe('2026-09-03');
  });

  it('keeps the anchor day for monthly, clamping to end of month', () => {
    expect(computeNextOccurrenceDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28');
    expect(computeNextOccurrenceDate('2026-02-28', 'monthly', 31)).toBe('2026-03-31');
    expect(computeNextOccurrenceDate('2026-03-31', 'monthly', 31)).toBe('2026-04-30');
  });

  it('steps by 3 months for quarterly and 12 months for yearly', () => {
    expect(computeNextOccurrenceDate('2026-08-27', 'quarterly', 27)).toBe('2026-11-27');
    expect(computeNextOccurrenceDate('2026-08-27', 'yearly', 27)).toBe('2027-08-27');
  });

  it('handles a 29 Feb leap-year anchor by falling back to 28 Feb the next year', () => {
    expect(computeNextOccurrenceDate('2028-02-29', 'yearly', 29)).toBe('2029-02-28');
  });

  it('rolls the year over for monthly in December', () => {
    expect(computeNextOccurrenceDate('2026-12-15', 'monthly', 15)).toBe('2027-01-15');
  });
});

describe('isBeyondScheduleLimit', () => {
  it('is false when neither endDate nor occurrenceLimit is set', () => {
    expect(
      isBeyondScheduleLimit({
        endDate: null,
        occurrenceLimit: null,
        generatedCount: 5,
        candidateDate: '2030-01-01',
      }),
    ).toBe(false);
  });

  it('is true once the candidate date passes endDate', () => {
    expect(
      isBeyondScheduleLimit({
        endDate: '2026-12-31',
        occurrenceLimit: null,
        generatedCount: 1,
        candidateDate: '2027-01-15',
      }),
    ).toBe(true);
    expect(
      isBeyondScheduleLimit({
        endDate: '2026-12-31',
        occurrenceLimit: null,
        generatedCount: 1,
        candidateDate: '2026-12-31',
      }),
    ).toBe(false);
  });

  it('is true once generating the candidate would exceed occurrenceLimit', () => {
    expect(
      isBeyondScheduleLimit({
        endDate: null,
        occurrenceLimit: 3,
        generatedCount: 3,
        candidateDate: '2026-10-01',
      }),
    ).toBe(true);
    expect(
      isBeyondScheduleLimit({
        endDate: null,
        occurrenceLimit: 3,
        generatedCount: 2,
        candidateDate: '2026-10-01',
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/finance/recurring-domain.test.ts`
Expected: FAIL with "Cannot find module '@/core/domain/finance/recurring-date'"

- [ ] **Step 3: Implement `recurring-date.ts`**

```typescript
// src/core/domain/finance/recurring-date.ts
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const STEP_MONTHS: Record<Exclude<RecurringFrequency, 'weekly'>, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Number of days in `month` (1-based) of `year`. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Derives the fixed anchor used to compute future occurrences: day-of-week
 * (0=Sun..6=Sat) for `weekly`, day-of-month (1-31) otherwise (spec §Mô hình
 * dữ liệu).
 */
export function deriveAnchorDay(date: string, frequency: RecurringFrequency): number {
  const { year, month, day } = parseIsoDate(date);
  if (frequency === 'weekly') {
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }
  return day;
}

/**
 * Computes the next occurrence date. Weekly adds 7 days. Monthly/quarterly/
 * yearly keep `anchorDay` fixed and clamp to the last day of the target
 * month when it is shorter than the anchor (spec §Tính ngày kỳ tiếp theo),
 * which also covers the 29 Feb leap-year case.
 */
export function computeNextOccurrenceDate(
  previousDate: string,
  frequency: RecurringFrequency,
  anchorDay: number,
): string {
  const { year, month, day } = parseIsoDate(previousDate);

  if (frequency === 'weekly') {
    const next = new Date(Date.UTC(year, month - 1, day));
    next.setUTCDate(next.getUTCDate() + 7);
    return formatIsoDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  }

  const stepMonths = STEP_MONTHS[frequency];
  const totalMonthIndex = month - 1 + stepMonths;
  const nextYear = year + Math.floor(totalMonthIndex / 12);
  const nextMonth = (totalMonthIndex % 12) + 1;
  const clampedDay = Math.min(anchorDay, daysInMonth(nextYear, nextMonth));
  return formatIsoDate(nextYear, nextMonth, clampedDay);
}

/**
 * True once generating a period on `candidateDate` would exceed the
 * schedule's `endDate` or `occurrenceLimit` (spec §Sinh kỳ tiếp theo).
 * `generatedCount` is the number of periods already created (including
 * period 1), so the candidate would be period `generatedCount + 1`.
 */
export function isBeyondScheduleLimit(params: {
  endDate: string | null;
  occurrenceLimit: number | null;
  generatedCount: number;
  candidateDate: string;
}): boolean {
  if (params.endDate !== null && params.candidateDate > params.endDate) {
    return true;
  }
  if (params.occurrenceLimit !== null && params.generatedCount + 1 > params.occurrenceLimit) {
    return true;
  }
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/finance/recurring-domain.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/finance/recurring-date.ts tests/core/finance/recurring-domain.test.ts
git commit -m "feat: add recurring occurrence date math"
```

---

### Task 2: Domain entities — `RecurringSchedule` and `RecurringOccurrence`

**Files:**
- Create: `src/core/domain/finance/recurring-schedule.ts`
- Create: `src/core/domain/finance/recurring-occurrence.ts`
- Test: `tests/core/finance/recurring-domain.test.ts` (append)

**Interfaces:**
- Consumes: `FinanceRecord` from `@/core/domain/finance/finance-record` (existing); `RecurringFrequency` from `./recurring-date` (Task 1).
- Produces:
  - `RecurringScheduleStatus = 'active' | 'paused' | 'ended'`
  - `RecurringSchedule = FinanceRecord & { displayName: string; type: 'expense'; accountId: string; categoryId: string; amount: number; frequency: RecurringFrequency; anchorDay: number; startDate: string; endDate: string | null; occurrenceLimit: number | null; remindDaysBefore: number; status: RecurringScheduleStatus; firstTransactionId: string; note: string | null; generatedCount: number }`
  - `RecurringScheduleInput = { displayName: string; accountId: string; categoryId: string; amount: number; frequency: RecurringFrequency; anchorDay: number; startDate: string; endDate?: string | null; occurrenceLimit?: number | null; remindDaysBefore?: number; note?: string | null }`
  - `validateRecurringScheduleInput(input: RecurringScheduleInput): void`
  - `RecurringOccurrenceStatus = 'pending' | 'confirmed' | 'skipped'`
  - `RecurringOccurrenceDisplayStatus = RecurringOccurrenceStatus | 'overdue'`
  - `RecurringOccurrence = FinanceRecord & { scheduleId: string; scheduledDate: string; amount: number; accountId: string; categoryId: string; displayName: string; note: string | null; status: RecurringOccurrenceStatus; transactionId: string | null; notifiedAt: string | null }`
  - `RecurringOccurrenceEdits = { amount?: number; accountId?: string; categoryId?: string; displayName?: string; note?: string | null }`
  - `validateRecurringOccurrenceEdits(edits: RecurringOccurrenceEdits): void`
  - `deriveOccurrenceDisplayStatus(occurrence: Pick<RecurringOccurrence, 'status' | 'scheduledDate'>, today: string): RecurringOccurrenceDisplayStatus` — `'overdue'` when `status === 'pending' && scheduledDate < today`, else `status`.

- [ ] **Step 1: Write the failing tests**

```typescript
// append to tests/core/finance/recurring-domain.test.ts
import {
  RecurringScheduleInput,
  validateRecurringScheduleInput,
} from '@/core/domain/finance/recurring-schedule';
import {
  deriveOccurrenceDisplayStatus,
  RecurringOccurrenceEdits,
  validateRecurringOccurrenceEdits,
} from '@/core/domain/finance/recurring-occurrence';

const validScheduleInput: RecurringScheduleInput = {
  displayName: 'YouTube Premium',
  accountId: 'account-main',
  categoryId: 'category-bills',
  amount: 179000,
  frequency: 'monthly',
  anchorDay: 27,
  startDate: '2026-08-27',
};

describe('validateRecurringScheduleInput', () => {
  it('accepts a minimal valid input', () => {
    expect(() => validateRecurringScheduleInput(validScheduleInput)).not.toThrow();
  });

  it('rejects a non-positive or non-integer amount', () => {
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, amount: 0 })).toThrow(
      'Recurring schedule amount must be a positive integer',
    );
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, amount: 1.5 })).toThrow(
      'Recurring schedule amount must be a positive integer',
    );
  });

  it('rejects an empty displayName, accountId or categoryId', () => {
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, displayName: '' })).toThrow(
      'Recurring schedule displayName must not be empty',
    );
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, accountId: '' })).toThrow(
      'Recurring schedule accountId must not be empty',
    );
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, categoryId: '' })).toThrow(
      'Recurring schedule categoryId must not be empty',
    );
  });

  it('rejects an unknown frequency', () => {
    expect(() =>
      validateRecurringScheduleInput({ ...validScheduleInput, frequency: 'daily' as never }),
    ).toThrow('Recurring schedule frequency must be weekly, monthly, quarterly or yearly');
  });

  it('rejects an out-of-range anchorDay for the given frequency', () => {
    expect(() =>
      validateRecurringScheduleInput({ ...validScheduleInput, frequency: 'weekly', anchorDay: 7 }),
    ).toThrow('Recurring schedule anchorDay must be between 0 and 6 for weekly frequency');
    expect(() => validateRecurringScheduleInput({ ...validScheduleInput, anchorDay: 32 })).toThrow(
      'Recurring schedule anchorDay must be between 1 and 31 for monthly, quarterly or yearly frequency',
    );
  });

  it('rejects a negative or non-integer remindDaysBefore', () => {
    expect(() =>
      validateRecurringScheduleInput({ ...validScheduleInput, remindDaysBefore: -1 }),
    ).toThrow('Recurring schedule remindDaysBefore must be a non-negative integer');
  });

  it('rejects setting both endDate and occurrenceLimit', () => {
    expect(() =>
      validateRecurringScheduleInput({
        ...validScheduleInput,
        endDate: '2027-01-01',
        occurrenceLimit: 6,
      }),
    ).toThrow('Recurring schedule cannot set both endDate and occurrenceLimit');
  });

  it('rejects a non-positive occurrenceLimit', () => {
    expect(() =>
      validateRecurringScheduleInput({ ...validScheduleInput, occurrenceLimit: 0 }),
    ).toThrow('Recurring schedule occurrenceLimit must be a positive integer');
  });
});

describe('validateRecurringOccurrenceEdits', () => {
  it('accepts an empty edits object', () => {
    expect(() => validateRecurringOccurrenceEdits({})).not.toThrow();
  });

  it('rejects a non-positive amount when provided', () => {
    const edits: RecurringOccurrenceEdits = { amount: 0 };
    expect(() => validateRecurringOccurrenceEdits(edits)).toThrow(
      'Recurring occurrence amount must be a positive integer',
    );
  });

  it('rejects an empty displayName when provided', () => {
    expect(() => validateRecurringOccurrenceEdits({ displayName: '  ' })).toThrow(
      'Recurring occurrence displayName must not be empty',
    );
  });
});

describe('deriveOccurrenceDisplayStatus', () => {
  it('returns overdue when pending and past the scheduled date', () => {
    expect(
      deriveOccurrenceDisplayStatus({ status: 'pending', scheduledDate: '2026-08-26' }, '2026-08-27'),
    ).toBe('overdue');
  });

  it('returns pending when not yet due', () => {
    expect(
      deriveOccurrenceDisplayStatus({ status: 'pending', scheduledDate: '2026-08-27' }, '2026-08-27'),
    ).toBe('pending');
  });

  it('returns the stored status for confirmed/skipped regardless of date', () => {
    expect(
      deriveOccurrenceDisplayStatus({ status: 'confirmed', scheduledDate: '2020-01-01' }, '2026-08-27'),
    ).toBe('confirmed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/finance/recurring-domain.test.ts`
Expected: FAIL with "Cannot find module '@/core/domain/finance/recurring-schedule'"

- [ ] **Step 3: Implement `recurring-schedule.ts`**

```typescript
// src/core/domain/finance/recurring-schedule.ts
import { FinanceRecord } from './finance-record';
import { RecurringFrequency } from './recurring-date';

export type RecurringScheduleStatus = 'active' | 'paused' | 'ended';

export type RecurringSchedule = FinanceRecord & {
  displayName: string;
  /** MVP only ever creates `expense`; kept as a field to extend to income later. */
  type: 'expense';
  accountId: string;
  categoryId: string;
  /** Positive integer VNĐ default for future periods. */
  amount: number;
  frequency: RecurringFrequency;
  anchorDay: number;
  startDate: string;
  endDate: string | null;
  occurrenceLimit: number | null;
  remindDaysBefore: number;
  status: RecurringScheduleStatus;
  firstTransactionId: string;
  note: string | null;
  /** Number of periods created so far, including period 1. */
  generatedCount: number;
};

export type RecurringScheduleInput = {
  displayName: string;
  accountId: string;
  categoryId: string;
  amount: number;
  frequency: RecurringFrequency;
  anchorDay: number;
  startDate: string;
  endDate?: string | null;
  occurrenceLimit?: number | null;
  remindDaysBefore?: number;
  note?: string | null;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FREQUENCIES: RecurringFrequency[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_ONLY_PATTERN.test(value);
}

/** Validates a recurring schedule input against the MVP business rules (spec §Mô hình dữ liệu). */
export function validateRecurringScheduleInput(input: RecurringScheduleInput): void {
  if (!isNonEmptyString(input.displayName)) {
    throw new Error('Recurring schedule displayName must not be empty');
  }
  if (!isNonEmptyString(input.accountId)) {
    throw new Error('Recurring schedule accountId must not be empty');
  }
  if (!isNonEmptyString(input.categoryId)) {
    throw new Error('Recurring schedule categoryId must not be empty');
  }
  if (typeof input.amount !== 'number' || !Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Recurring schedule amount must be a positive integer');
  }
  if (!FREQUENCIES.includes(input.frequency)) {
    throw new Error('Recurring schedule frequency must be weekly, monthly, quarterly or yearly');
  }
  if (input.frequency === 'weekly') {
    if (!Number.isInteger(input.anchorDay) || input.anchorDay < 0 || input.anchorDay > 6) {
      throw new Error('Recurring schedule anchorDay must be between 0 and 6 for weekly frequency');
    }
  } else if (!Number.isInteger(input.anchorDay) || input.anchorDay < 1 || input.anchorDay > 31) {
    throw new Error(
      'Recurring schedule anchorDay must be between 1 and 31 for monthly, quarterly or yearly frequency',
    );
  }
  if (!isValidIsoDate(input.startDate)) {
    throw new Error('Recurring schedule startDate must be a valid ISO calendar date (YYYY-MM-DD)');
  }
  const remindDaysBefore = input.remindDaysBefore ?? 1;
  if (!Number.isInteger(remindDaysBefore) || remindDaysBefore < 0) {
    throw new Error('Recurring schedule remindDaysBefore must be a non-negative integer');
  }
  if (input.endDate != null && input.occurrenceLimit != null) {
    throw new Error('Recurring schedule cannot set both endDate and occurrenceLimit');
  }
  if (input.endDate != null && !isValidIsoDate(input.endDate)) {
    throw new Error('Recurring schedule endDate must be a valid ISO calendar date (YYYY-MM-DD)');
  }
  if (
    input.occurrenceLimit != null &&
    (!Number.isInteger(input.occurrenceLimit) || input.occurrenceLimit <= 0)
  ) {
    throw new Error('Recurring schedule occurrenceLimit must be a positive integer');
  }
}
```

- [ ] **Step 4: Implement `recurring-occurrence.ts`**

```typescript
// src/core/domain/finance/recurring-occurrence.ts
import { FinanceRecord } from './finance-record';

export type RecurringOccurrenceStatus = 'pending' | 'confirmed' | 'skipped';
export type RecurringOccurrenceDisplayStatus = RecurringOccurrenceStatus | 'overdue';

export type RecurringOccurrence = FinanceRecord & {
  scheduleId: string;
  scheduledDate: string;
  amount: number;
  accountId: string;
  categoryId: string;
  displayName: string;
  note: string | null;
  status: RecurringOccurrenceStatus;
  /** Set once `confirmed`; the real Transaction it produced. */
  transactionId: string | null;
  /** Set once a reminder notification has been sent for this occurrence. */
  notifiedAt: string | null;
};

export type RecurringOccurrenceEdits = {
  amount?: number;
  accountId?: string;
  categoryId?: string;
  displayName?: string;
  note?: string | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** Validates in-place edits made while confirming an occurrence (spec §Chỉnh sửa khi xác nhận). */
export function validateRecurringOccurrenceEdits(edits: RecurringOccurrenceEdits): void {
  if (
    edits.amount !== undefined &&
    (typeof edits.amount !== 'number' || !Number.isInteger(edits.amount) || edits.amount <= 0)
  ) {
    throw new Error('Recurring occurrence amount must be a positive integer');
  }
  if (edits.accountId !== undefined && !isNonEmptyString(edits.accountId)) {
    throw new Error('Recurring occurrence accountId must not be empty');
  }
  if (edits.categoryId !== undefined && !isNonEmptyString(edits.categoryId)) {
    throw new Error('Recurring occurrence categoryId must not be empty');
  }
  if (edits.displayName !== undefined && !isNonEmptyString(edits.displayName)) {
    throw new Error('Recurring occurrence displayName must not be empty');
  }
}

/**
 * `overdue` is derived, never stored: a `pending` occurrence whose
 * `scheduledDate` has passed reads as overdue but is still confirmable or
 * skippable exactly like `pending` (spec §Xử lý kỳ dự kiến).
 */
export function deriveOccurrenceDisplayStatus(
  occurrence: Pick<RecurringOccurrence, 'status' | 'scheduledDate'>,
  today: string,
): RecurringOccurrenceDisplayStatus {
  if (occurrence.status === 'pending' && occurrence.scheduledDate < today) {
    return 'overdue';
  }
  return occurrence.status;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/finance/recurring-domain.test.ts`
Expected: PASS (22 tests total)

- [ ] **Step 6: Commit**

```bash
git add src/core/domain/finance/recurring-schedule.ts src/core/domain/finance/recurring-occurrence.ts tests/core/finance/recurring-domain.test.ts
git commit -m "feat: add RecurringSchedule and RecurringOccurrence domain types"
```

---

### Task 3: Drizzle schema and migration

**Files:**
- Create: `src/data/local/schema/recurring-schedules.ts`
- Create: `src/data/local/schema/recurring-occurrences.ts`
- Modify: `src/data/local/schema/index.ts`
- Test: `tests/data/local/recurring-schema.test.ts`

**Interfaces:**
- Consumes: `accounts`, `categories`, `transactions` tables from `./accounts`, `./categories`, `./transactions` (existing).
- Produces: `recurringSchedules` and `recurringOccurrences` Drizzle table objects, exported from `src/data/local/schema/index.ts` alongside the existing tables.

- [ ] **Step 1: Write the failing schema test**

```typescript
// tests/data/local/recurring-schema.test.ts
import { openTestLocalDatabase, LocalDatabaseClient } from '@/data/local/db/client';
import { accounts, categories, recurringOccurrences, recurringSchedules, transactions } from '@/data/local/schema';

const deviceId = '550e8400-e29b-41d4-a716-446655440020';
const now = '2026-08-27T09:00:00.000Z';

describe('recurring schema', () => {
  let database: LocalDatabaseClient;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    database.db
      .insert(accounts)
      .values({
        id: 'account-main',
        name: 'Ví chính',
        type: 'cash',
        openingBalance: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();
    database.db
      .insert(categories)
      .values({
        id: 'category-bills',
        name: 'Hóa đơn',
        type: 'expense',
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();
    database.db
      .insert(transactions)
      .values({
        id: 'transaction-first',
        type: 'expense',
        amount: 179000,
        accountId: 'account-main',
        destinationAccountId: null,
        categoryId: 'category-bills',
        transactionDate: '2026-08-27',
        name: 'YouTube Premium',
        note: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();
  });

  afterEach(async () => {
    await database.close();
  });

  it('inserts a recurring schedule referencing an account, category and its first transaction', () => {
    database.db
      .insert(recurringSchedules)
      .values({
        id: 'schedule-youtube',
        displayName: 'YouTube Premium',
        type: 'expense',
        accountId: 'account-main',
        categoryId: 'category-bills',
        amount: 179000,
        frequency: 'monthly',
        anchorDay: 27,
        startDate: '2026-08-27',
        endDate: null,
        occurrenceLimit: null,
        remindDaysBefore: 1,
        status: 'active',
        firstTransactionId: 'transaction-first',
        note: null,
        generatedCount: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();

    const row = database.db.select().from(recurringSchedules).get();
    expect(row).toMatchObject({ id: 'schedule-youtube', frequency: 'monthly', status: 'active' });
  });

  it('inserts a recurring occurrence referencing its schedule', () => {
    database.db
      .insert(recurringSchedules)
      .values({
        id: 'schedule-youtube',
        displayName: 'YouTube Premium',
        type: 'expense',
        accountId: 'account-main',
        categoryId: 'category-bills',
        amount: 179000,
        frequency: 'monthly',
        anchorDay: 27,
        startDate: '2026-08-27',
        endDate: null,
        occurrenceLimit: null,
        remindDaysBefore: 1,
        status: 'active',
        firstTransactionId: 'transaction-first',
        note: null,
        generatedCount: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();

    database.db
      .insert(recurringOccurrences)
      .values({
        id: 'occurrence-1',
        scheduleId: 'schedule-youtube',
        scheduledDate: '2026-09-27',
        amount: 179000,
        accountId: 'account-main',
        categoryId: 'category-bills',
        displayName: 'YouTube Premium',
        note: null,
        status: 'pending',
        transactionId: null,
        notifiedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();

    const row = database.db.select().from(recurringOccurrences).get();
    expect(row).toMatchObject({ id: 'occurrence-1', scheduleId: 'schedule-youtube', status: 'pending' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/data/local/recurring-schema.test.ts`
Expected: FAIL with "Cannot find module '@/data/local/schema'" export `recurringSchedules` (module resolves, named export missing/undefined)

- [ ] **Step 3: Implement `recurring-schedules.ts`**

```typescript
// src/data/local/schema/recurring-schedules.ts
import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { accounts } from './accounts';
import { categories } from './categories';
import { transactions } from './transactions';

export const recurringSchedules = sqliteTable(
  'recurring_schedules',
  {
    id: text('id').primaryKey(),
    displayName: text('display_name').notNull(),
    type: text('type', { enum: ['expense'] }).notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    /** Positive integer VNĐ default for future periods. */
    amount: integer('amount').notNull(),
    frequency: text('frequency', { enum: ['weekly', 'monthly', 'quarterly', 'yearly'] }).notNull(),
    anchorDay: integer('anchor_day').notNull(),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    occurrenceLimit: integer('occurrence_limit'),
    remindDaysBefore: integer('remind_days_before').notNull(),
    status: text('status', { enum: ['active', 'paused', 'ended'] }).notNull(),
    firstTransactionId: text('first_transaction_id')
      .notNull()
      .references(() => transactions.id),
    note: text('note'),
    generatedCount: integer('generated_count').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [
    index('recurring_schedules_account_id_idx').on(table.accountId),
    index('recurring_schedules_status_idx').on(table.status),
    check(
      'recurring_schedules_type_check',
      sql`${table.type} in ('expense')`,
    ),
    check(
      'recurring_schedules_frequency_check',
      sql`${table.frequency} in ('weekly', 'monthly', 'quarterly', 'yearly')`,
    ),
    check(
      'recurring_schedules_status_check',
      sql`${table.status} in ('active', 'paused', 'ended')`,
    ),
  ],
);
```

- [ ] **Step 4: Implement `recurring-occurrences.ts`**

```typescript
// src/data/local/schema/recurring-occurrences.ts
import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { accounts } from './accounts';
import { categories } from './categories';
import { recurringSchedules } from './recurring-schedules';
import { transactions } from './transactions';

export const recurringOccurrences = sqliteTable(
  'recurring_occurrences',
  {
    id: text('id').primaryKey(),
    scheduleId: text('schedule_id')
      .notNull()
      .references(() => recurringSchedules.id),
    scheduledDate: text('scheduled_date').notNull(),
    amount: integer('amount').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    displayName: text('display_name').notNull(),
    note: text('note'),
    status: text('status', { enum: ['pending', 'confirmed', 'skipped'] }).notNull(),
    transactionId: text('transaction_id').references(() => transactions.id),
    notifiedAt: text('notified_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [
    index('recurring_occurrences_schedule_id_idx').on(table.scheduleId),
    index('recurring_occurrences_status_idx').on(table.status),
    index('recurring_occurrences_scheduled_date_idx').on(table.scheduledDate),
    check(
      'recurring_occurrences_status_check',
      sql`${table.status} in ('pending', 'confirmed', 'skipped')`,
    ),
  ],
);
```

- [ ] **Step 5: Register both tables in the schema barrel**

Read `src/data/local/schema/index.ts` first to match its existing re-export style exactly, then add two more lines mirroring the existing ones, e.g.:

```typescript
// src/data/local/schema/index.ts (add alongside the existing exports)
export * from './recurring-schedules';
export * from './recurring-occurrences';
```

- [ ] **Step 6: Run test to verify it fails on missing migration, then generate it**

Run: `npm test -- --runInBand tests/data/local/recurring-schema.test.ts`
Expected: FAIL with a SQLite error such as "no such table: recurring_schedules" (schema module now exports the tables, but no migration has created them yet)

Run: `npm run db:generate`
Expected: a new numbered SQL file appears under `/drizzle` (e.g. `0004_<generated_name>.sql`) creating `recurring_schedules` and `recurring_occurrences`, and `drizzle/meta/_journal.json` gains an entry for it. Open `drizzle/migrations.js` and confirm the new migration was added automatically; if `drizzle-kit generate` did not update it for the Expo driver, add the `mNNNN` import/entry by hand, following the exact pattern of the existing `m0000`..`m0003` entries.

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- --runInBand tests/data/local/recurring-schema.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git add src/data/local/schema/recurring-schedules.ts src/data/local/schema/recurring-occurrences.ts src/data/local/schema/index.ts drizzle/ tests/data/local/recurring-schema.test.ts
git commit -m "feat: add recurring_schedules and recurring_occurrences tables"
```

---

### Task 4: Repository ports

**Files:**
- Create: `src/core/application/ports/recurring-repositories.ts`

**Interfaces:**
- Consumes: `WriteContext` from `@/core/application/ports/finance-repositories` (existing); `RecurringSchedule`, `RecurringScheduleInput`, `RecurringScheduleStatus` from `@/core/domain/finance/recurring-schedule`; `RecurringOccurrence`, `RecurringOccurrenceEdits`, `RecurringOccurrenceStatus` from `@/core/domain/finance/recurring-occurrence`; `TransactionInput` from `@/core/domain/finance/transaction`.
- Produces (this task has no test — it is a type-only file; its correctness is proven by every later task that implements/consumes it type-checking and by `npm run lint` catching unused/mismatched types):
  - `RecurringScheduleRepository` — simple single-table CRUD/read port, mirrors `AccountRepository`.
  - `RecurringOccurrenceRepository` — simple single-table CRUD/read port, mirrors `AccountRepository`.
  - `RecurringOccurrenceProcessing` — the atomic multi-table port (create-first-period, confirm, skip).

- [ ] **Step 1: Write `recurring-repositories.ts`**

```typescript
// src/core/application/ports/recurring-repositories.ts
import { WriteContext } from '@/core/application/ports/finance-repositories';
import {
  RecurringOccurrence,
  RecurringOccurrenceEdits,
} from '@/core/domain/finance/recurring-occurrence';
import {
  RecurringSchedule,
  RecurringScheduleInput,
  RecurringScheduleStatus,
} from '@/core/domain/finance/recurring-schedule';
import { TransactionInput } from '@/core/domain/finance/transaction';
import { SyncOperation } from '@/core/domain/sync/sync-operation';

export type UpdateRecurringScheduleInput = Partial<RecurringScheduleInput> & {
  status?: RecurringScheduleStatus;
};

/** Simple single-table reads/writes for `recurring_schedules`, mirrors `AccountRepository`. */
export interface RecurringScheduleRepository {
  findById(id: string): Promise<RecurringSchedule | null>;
  list(filter?: { status?: RecurringScheduleStatus }): Promise<RecurringSchedule[]>;
  update(
    id: string,
    changes: UpdateRecurringScheduleInput,
    context: WriteContext,
  ): Promise<RecurringSchedule>;
  saveWithOperation(record: RecurringSchedule, operation: SyncOperation): Promise<void>;
}

/** Simple single-table reads/writes for `recurring_occurrences`, mirrors `AccountRepository`. */
export interface RecurringOccurrenceRepository {
  findById(id: string): Promise<RecurringOccurrence | null>;
  /** The single unresolved (`pending`/not-yet-skipped-or-confirmed) occurrence for a schedule, if any. */
  findActiveByScheduleId(scheduleId: string): Promise<RecurringOccurrence | null>;
  listByStatus(statuses: RecurringOccurrence['status'][]): Promise<RecurringOccurrence[]>;
  listByScheduleId(scheduleId: string): Promise<RecurringOccurrence[]>;
  markNotified(id: string, notifiedAt: string, context: WriteContext): Promise<RecurringOccurrence>;
  /** Refreshes an unresolved occurrence's copied default fields, e.g. after editing its schedule (spec §Quản lý định kỳ). */
  update(id: string, changes: RecurringOccurrenceEdits, context: WriteContext): Promise<RecurringOccurrence>;
  saveWithOperation(record: RecurringOccurrence, operation: SyncOperation): Promise<void>;
}

/**
 * Multi-table, single-SQLite-transaction writes that span `transactions`,
 * `recurring_schedules` and `recurring_occurrences` at once (spec §Kiến trúc
 * triển khai: "Tạo lịch, xác nhận, bỏ qua và change log phải nằm trong cùng
 * SQLite transaction"). Deliberately separate from the two simple repository
 * ports above, which each open their own single-table transaction and so
 * cannot be composed together without nesting transactions.
 */
export type CreateRecurringExpenseInput = {
  originDeviceId: string;
  now: string;
  transactionId: string;
  transactionOperationId: string;
  /** Always `type: 'expense'`; validated by the use case before this is called. */
  transaction: TransactionInput;
  scheduleId: string;
  scheduleOperationId: string;
  schedule: RecurringScheduleInput;
  occurrenceId: string;
  occurrenceOperationId: string;
};

export type ConfirmRecurringOccurrenceInput = {
  occurrenceId: string;
  edits: RecurringOccurrenceEdits;
  applyScope: 'this_only' | 'this_and_future';
  originDeviceId: string;
  now: string;
  transactionId: string;
  transactionOperationId: string;
  occurrenceOperationId: string;
  scheduleOperationId: string;
  /** Pre-generated id/operationId for the next occurrence, or both null if the schedule is ending. */
  nextOccurrenceId: string | null;
  nextOccurrenceOperationId: string | null;
};

export type SkipRecurringOccurrenceInput = {
  occurrenceId: string;
  originDeviceId: string;
  now: string;
  occurrenceOperationId: string;
  scheduleOperationId: string;
  nextOccurrenceId: string | null;
  nextOccurrenceOperationId: string | null;
};

export type RecurringOccurrenceProcessingResult = {
  occurrence: RecurringOccurrence;
  schedule: RecurringSchedule;
  nextOccurrence: RecurringOccurrence | null;
};

export interface RecurringOccurrenceProcessing {
  createFirstPeriod(
    input: CreateRecurringExpenseInput,
  ): Promise<{ schedule: RecurringSchedule; occurrence: RecurringOccurrence }>;
  confirmOccurrence(
    input: ConfirmRecurringOccurrenceInput,
  ): Promise<RecurringOccurrenceProcessingResult & { transactionId: string }>;
  skipOccurrence(input: SkipRecurringOccurrenceInput): Promise<RecurringOccurrenceProcessingResult>;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors — this file only introduces new types, nothing consumes it yet)

- [ ] **Step 3: Commit**

```bash
git add src/core/application/ports/recurring-repositories.ts
git commit -m "feat: add recurring repository ports"
```

---

### Task 5: Row mappers and simple CRUD repositories

**Files:**
- Create: `src/data/local/repositories/recurring-record-mappers.ts`
- Create: `src/data/local/repositories/recurring-schedule-repository.ts`
- Create: `src/data/local/repositories/recurring-occurrence-repository.ts`
- Test: `tests/data/local/recurring-repositories.test.ts`

**Interfaces:**
- Consumes: `recurringSchedules`, `recurringOccurrences`, `changeLog` from `@/data/local/schema` (Task 3); `RecurringScheduleRepository`, `RecurringOccurrenceRepository`, `UpdateRecurringScheduleInput` ports from `@/core/application/ports/recurring-repositories` (Task 4); `buildSyncOperation`, `toChangeLogValues`, `canonicalizeSyncableRecordIdentifiers`, `canonicalizeSyncOperationIdentifiers` (existing, reused verbatim from `transaction-repository.ts`).
- Produces:
  - `toRecurringScheduleEntity(row): RecurringSchedule`, `toRecurringScheduleRowValues(schedule): RecurringScheduleRow`
  - `toRecurringOccurrenceEntity(row): RecurringOccurrence`, `toRecurringOccurrenceRowValues(occurrence): RecurringOccurrenceRow`
  - `class RecurringScheduleRepository implements RecurringScheduleRepositoryPort`
  - `class RecurringOccurrenceRepository implements RecurringOccurrenceRepositoryPort`

- [ ] **Step 1: Write the failing repository tests**

```typescript
// tests/data/local/recurring-repositories.test.ts
import { openTestLocalDatabase, LocalDatabaseClient } from '@/data/local/db/client';
import { RecurringScheduleRepository } from '@/data/local/repositories/recurring-schedule-repository';
import { RecurringOccurrenceRepository } from '@/data/local/repositories/recurring-occurrence-repository';
import { toRecurringOccurrenceRowValues, toRecurringScheduleRowValues } from '@/data/local/repositories/recurring-record-mappers';
import { accounts, categories, changeLog, transactions } from '@/data/local/schema';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';

const deviceId = '550e8400-e29b-41d4-a716-446655440020';
const now = '2026-08-27T09:00:00.000Z';

function seedAccountCategoryAndTransaction(database: LocalDatabaseClient) {
  database.db
    .insert(accounts)
    .values({ id: 'account-main', name: 'Ví chính', type: 'cash', openingBalance: 0, isArchived: false, createdAt: now, updatedAt: now, deletedAt: null, revision: 1, originDeviceId: deviceId })
    .run();
  database.db
    .insert(categories)
    .values({ id: 'category-bills', name: 'Hóa đơn', type: 'expense', isArchived: false, createdAt: now, updatedAt: now, deletedAt: null, revision: 1, originDeviceId: deviceId })
    .run();
  database.db
    .insert(transactions)
    .values({ id: 'transaction-first', type: 'expense', amount: 179000, accountId: 'account-main', destinationAccountId: null, categoryId: 'category-bills', transactionDate: '2026-08-27', name: 'YouTube Premium', note: null, createdAt: now, updatedAt: now, deletedAt: null, revision: 1, originDeviceId: deviceId })
    .run();
}

const baseSchedule: RecurringSchedule = {
  id: 'schedule-youtube',
  displayName: 'YouTube Premium',
  type: 'expense',
  accountId: 'account-main',
  categoryId: 'category-bills',
  amount: 179000,
  frequency: 'monthly',
  anchorDay: 27,
  startDate: '2026-08-27',
  endDate: null,
  occurrenceLimit: null,
  remindDaysBefore: 1,
  status: 'active',
  firstTransactionId: 'transaction-first',
  note: null,
  generatedCount: 1,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  revision: 1,
  originDeviceId: deviceId,
};

const baseOccurrence: RecurringOccurrence = {
  id: 'occurrence-1',
  scheduleId: 'schedule-youtube',
  scheduledDate: '2026-09-27',
  amount: 179000,
  accountId: 'account-main',
  categoryId: 'category-bills',
  displayName: 'YouTube Premium',
  note: null,
  status: 'pending',
  transactionId: null,
  notifiedAt: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  revision: 1,
  originDeviceId: deviceId,
};

describe('RecurringScheduleRepository', () => {
  let database: LocalDatabaseClient;
  let repository: RecurringScheduleRepository;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    seedAccountCategoryAndTransaction(database);
    repository = new RecurringScheduleRepository(database);
    database.db.insert((await import('@/data/local/schema')).recurringSchedules).values(toRecurringScheduleRowValues(baseSchedule)).run();
  });

  afterEach(async () => {
    await database.close();
  });

  it('finds a schedule by id', async () => {
    await expect(repository.findById('schedule-youtube')).resolves.toMatchObject({ displayName: 'YouTube Premium', status: 'active' });
  });

  it('returns null for a missing schedule', async () => {
    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('lists schedules, optionally filtered by status', async () => {
    await expect(repository.list()).resolves.toHaveLength(1);
    await expect(repository.list({ status: 'paused' })).resolves.toHaveLength(0);
    await expect(repository.list({ status: 'active' })).resolves.toHaveLength(1);
  });

  it('updates a schedule, bumps its revision and appends a change_log row', async () => {
    const updated = await repository.update(
      'schedule-youtube',
      { status: 'paused' },
      { originDeviceId: deviceId, operationId: 'op-pause-1', now: '2026-09-01T00:00:00.000Z' },
    );

    expect(updated).toMatchObject({ status: 'paused', revision: 2 });
    const logRows = database.db.select().from(changeLog).all();
    expect(logRows).toHaveLength(1);
    expect(logRows[0]).toMatchObject({ entityType: 'recurring_schedule', entityId: 'schedule-youtube', operation: 'update' });
  });
});

describe('RecurringOccurrenceRepository', () => {
  let database: LocalDatabaseClient;
  let repository: RecurringOccurrenceRepository;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    seedAccountCategoryAndTransaction(database);
    database.db.insert((await import('@/data/local/schema')).recurringSchedules).values(toRecurringScheduleRowValues(baseSchedule)).run();
    database.db.insert((await import('@/data/local/schema')).recurringOccurrences).values(toRecurringOccurrenceRowValues(baseOccurrence)).run();
    repository = new RecurringOccurrenceRepository(database);
  });

  afterEach(async () => {
    await database.close();
  });

  it('finds the single active (pending) occurrence for a schedule', async () => {
    await expect(repository.findActiveByScheduleId('schedule-youtube')).resolves.toMatchObject({ id: 'occurrence-1', status: 'pending' });
  });

  it('returns null when a schedule has no unresolved occurrence', async () => {
    await expect(repository.findActiveByScheduleId('missing-schedule')).resolves.toBeNull();
  });

  it('lists occurrences by status', async () => {
    await expect(repository.listByStatus(['pending'])).resolves.toHaveLength(1);
    await expect(repository.listByStatus(['confirmed', 'skipped'])).resolves.toHaveLength(0);
  });

  it('marks an occurrence notified, bumping revision and appending change_log', async () => {
    const updated = await repository.markNotified('occurrence-1', '2026-09-26T08:00:00.000Z', {
      originDeviceId: deviceId,
      operationId: 'op-notify-1',
      now: '2026-09-26T08:00:00.000Z',
    });

    expect(updated).toMatchObject({ notifiedAt: '2026-09-26T08:00:00.000Z', revision: 2 });
    const logRows = database.db.select().from(changeLog).all();
    expect(logRows).toHaveLength(1);
    expect(logRows[0]).toMatchObject({ entityType: 'recurring_occurrence', operation: 'update' });
  });

  it('updates copied default fields, bumping revision and appending change_log', async () => {
    const updated = await repository.update(
      'occurrence-1',
      { amount: 189000, displayName: 'YouTube Premium (mới)' },
      { originDeviceId: deviceId, operationId: 'op-edit-1', now: '2026-09-01T00:00:00.000Z' },
    );

    expect(updated).toMatchObject({ amount: 189000, displayName: 'YouTube Premium (mới)', revision: 2 });
    const logRows = database.db.select().from(changeLog).all();
    expect(logRows).toHaveLength(1);
    expect(logRows[0]).toMatchObject({ entityType: 'recurring_occurrence', operation: 'update' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/data/local/recurring-repositories.test.ts`
Expected: FAIL with "Cannot find module '@/data/local/repositories/recurring-record-mappers'"

- [ ] **Step 3: Implement `recurring-record-mappers.ts`**

```typescript
// src/data/local/repositories/recurring-record-mappers.ts
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';
import { recurringOccurrences, recurringSchedules } from '@/data/local/schema';

type RecurringScheduleRow = typeof recurringSchedules.$inferSelect;
type RecurringOccurrenceRow = typeof recurringOccurrences.$inferSelect;

export function toRecurringScheduleEntity(row: RecurringScheduleRow): RecurringSchedule {
  return {
    id: row.id,
    displayName: row.displayName,
    type: row.type,
    accountId: row.accountId,
    categoryId: row.categoryId,
    amount: row.amount,
    frequency: row.frequency,
    anchorDay: row.anchorDay,
    startDate: row.startDate,
    endDate: row.endDate,
    occurrenceLimit: row.occurrenceLimit,
    remindDaysBefore: row.remindDaysBefore,
    status: row.status,
    firstTransactionId: row.firstTransactionId,
    note: row.note,
    generatedCount: row.generatedCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toRecurringScheduleRowValues(schedule: RecurringSchedule): RecurringScheduleRow {
  return {
    id: schedule.id,
    displayName: schedule.displayName,
    type: schedule.type,
    accountId: schedule.accountId,
    categoryId: schedule.categoryId,
    amount: schedule.amount,
    frequency: schedule.frequency,
    anchorDay: schedule.anchorDay,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    occurrenceLimit: schedule.occurrenceLimit,
    remindDaysBefore: schedule.remindDaysBefore,
    status: schedule.status,
    firstTransactionId: schedule.firstTransactionId,
    note: schedule.note,
    generatedCount: schedule.generatedCount,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
    deletedAt: schedule.deletedAt,
    revision: schedule.revision,
    originDeviceId: schedule.originDeviceId,
  };
}

export function toRecurringOccurrenceEntity(row: RecurringOccurrenceRow): RecurringOccurrence {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    scheduledDate: row.scheduledDate,
    amount: row.amount,
    accountId: row.accountId,
    categoryId: row.categoryId,
    displayName: row.displayName,
    note: row.note,
    status: row.status,
    transactionId: row.transactionId,
    notifiedAt: row.notifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toRecurringOccurrenceRowValues(occurrence: RecurringOccurrence): RecurringOccurrenceRow {
  return {
    id: occurrence.id,
    scheduleId: occurrence.scheduleId,
    scheduledDate: occurrence.scheduledDate,
    amount: occurrence.amount,
    accountId: occurrence.accountId,
    categoryId: occurrence.categoryId,
    displayName: occurrence.displayName,
    note: occurrence.note,
    status: occurrence.status,
    transactionId: occurrence.transactionId,
    notifiedAt: occurrence.notifiedAt,
    createdAt: occurrence.createdAt,
    updatedAt: occurrence.updatedAt,
    deletedAt: occurrence.deletedAt,
    revision: occurrence.revision,
    originDeviceId: occurrence.originDeviceId,
  };
}
```

- [ ] **Step 4: Implement `recurring-schedule-repository.ts`**

```typescript
// src/data/local/repositories/recurring-schedule-repository.ts
import { and, eq } from 'drizzle-orm';

import {
  RecurringScheduleRepository as RecurringScheduleRepositoryPort,
  UpdateRecurringScheduleInput,
} from '@/core/application/ports/recurring-repositories';
import { WriteContext } from '@/core/application/ports/finance-repositories';
import { RecurringSchedule, RecurringScheduleStatus } from '@/core/domain/finance/recurring-schedule';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, recurringSchedules } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toRecurringScheduleEntity, toRecurringScheduleRowValues } from './recurring-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import {
  canonicalizeSyncableRecordIdentifiers,
  canonicalizeSyncOperationIdentifiers,
} from './sync-identifier-validation';

export class RecurringScheduleRepository implements RecurringScheduleRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async findById(id: string): Promise<RecurringSchedule | null> {
    const row = this.database.db
      .select()
      .from(recurringSchedules)
      .where(eq(recurringSchedules.id, id))
      .get();
    return row ? toRecurringScheduleEntity(row) : null;
  }

  async list(filter: { status?: RecurringScheduleStatus } = {}): Promise<RecurringSchedule[]> {
    const conditions = [];
    if (filter.status) {
      conditions.push(eq(recurringSchedules.status, filter.status));
    }
    const query = this.database.db.select().from(recurringSchedules);
    const rows = (conditions.length > 0 ? query.where(and(...conditions)) : query).all();
    return rows.map(toRecurringScheduleEntity);
  }

  async update(
    id: string,
    changes: UpdateRecurringScheduleInput,
    context: WriteContext,
  ): Promise<RecurringSchedule> {
    const existing = await this.requireById(id);
    const updated: RecurringSchedule = {
      ...existing,
      displayName: changes.displayName ?? existing.displayName,
      accountId: changes.accountId ?? existing.accountId,
      categoryId: changes.categoryId ?? existing.categoryId,
      amount: changes.amount ?? existing.amount,
      frequency: changes.frequency ?? existing.frequency,
      anchorDay: changes.anchorDay ?? existing.anchorDay,
      endDate: changes.endDate !== undefined ? changes.endDate : existing.endDate,
      occurrenceLimit:
        changes.occurrenceLimit !== undefined ? changes.occurrenceLimit : existing.occurrenceLimit,
      remindDaysBefore: changes.remindDaysBefore ?? existing.remindDaysBefore,
      status: changes.status ?? existing.status,
      note: changes.note !== undefined ? (changes.note ?? null) : existing.note,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'recurring_schedule',
      entityId: updated.id,
      operation: 'update',
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  async saveWithOperation(record: RecurringSchedule, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as RecurringSchedule;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toRecurringScheduleRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(recurringSchedules)
        .values(values)
        .onConflictDoUpdate({ target: recurringSchedules.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async requireById(id: string): Promise<RecurringSchedule> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Recurring schedule ${id} not found`);
    }
    return existing;
  }
}
```

- [ ] **Step 5: Implement `recurring-occurrence-repository.ts`**

```typescript
// src/data/local/repositories/recurring-occurrence-repository.ts
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { WriteContext } from '@/core/application/ports/finance-repositories';
import { RecurringOccurrenceRepository as RecurringOccurrenceRepositoryPort } from '@/core/application/ports/recurring-repositories';
import {
  RecurringOccurrence,
  RecurringOccurrenceEdits,
  RecurringOccurrenceStatus,
} from '@/core/domain/finance/recurring-occurrence';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, recurringOccurrences } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toRecurringOccurrenceEntity, toRecurringOccurrenceRowValues } from './recurring-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import {
  canonicalizeSyncableRecordIdentifiers,
  canonicalizeSyncOperationIdentifiers,
} from './sync-identifier-validation';

export class RecurringOccurrenceRepository implements RecurringOccurrenceRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async findById(id: string): Promise<RecurringOccurrence | null> {
    const row = this.database.db
      .select()
      .from(recurringOccurrences)
      .where(eq(recurringOccurrences.id, id))
      .get();
    return row ? toRecurringOccurrenceEntity(row) : null;
  }

  async findActiveByScheduleId(scheduleId: string): Promise<RecurringOccurrence | null> {
    const row = this.database.db
      .select()
      .from(recurringOccurrences)
      .where(
        and(eq(recurringOccurrences.scheduleId, scheduleId), eq(recurringOccurrences.status, 'pending')),
      )
      .get();
    return row ? toRecurringOccurrenceEntity(row) : null;
  }

  async listByStatus(statuses: RecurringOccurrenceStatus[]): Promise<RecurringOccurrence[]> {
    const rows = this.database.db
      .select()
      .from(recurringOccurrences)
      .where(and(isNull(recurringOccurrences.deletedAt), inArray(recurringOccurrences.status, statuses)))
      .all();
    return rows.map(toRecurringOccurrenceEntity);
  }

  async listByScheduleId(scheduleId: string): Promise<RecurringOccurrence[]> {
    const rows = this.database.db
      .select()
      .from(recurringOccurrences)
      .where(eq(recurringOccurrences.scheduleId, scheduleId))
      .all();
    return rows.map(toRecurringOccurrenceEntity);
  }

  async markNotified(
    id: string,
    notifiedAt: string,
    context: WriteContext,
  ): Promise<RecurringOccurrence> {
    const existing = await this.requireById(id);
    const updated: RecurringOccurrence = {
      ...existing,
      notifiedAt,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'recurring_occurrence',
      entityId: updated.id,
      operation: 'update',
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  async update(
    id: string,
    changes: RecurringOccurrenceEdits,
    context: WriteContext,
  ): Promise<RecurringOccurrence> {
    const existing = await this.requireById(id);
    const updated: RecurringOccurrence = {
      ...existing,
      amount: changes.amount ?? existing.amount,
      accountId: changes.accountId ?? existing.accountId,
      categoryId: changes.categoryId ?? existing.categoryId,
      displayName: changes.displayName ?? existing.displayName,
      note: changes.note !== undefined ? changes.note : existing.note,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'recurring_occurrence',
      entityId: updated.id,
      operation: 'update',
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  async saveWithOperation(record: RecurringOccurrence, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as RecurringOccurrence;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toRecurringOccurrenceRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(recurringOccurrences)
        .values(values)
        .onConflictDoUpdate({ target: recurringOccurrences.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async requireById(id: string): Promise<RecurringOccurrence> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Recurring occurrence ${id} not found`);
    }
    return existing;
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --runInBand tests/data/local/recurring-repositories.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 7: Commit**

```bash
git add src/data/local/repositories/recurring-record-mappers.ts src/data/local/repositories/recurring-schedule-repository.ts src/data/local/repositories/recurring-occurrence-repository.ts tests/data/local/recurring-repositories.test.ts
git commit -m "feat: add recurring schedule/occurrence repositories"
```

---

### Task 6: Atomic multi-table repository — create, confirm, skip

This is the business-critical piece: creating the schedule from the form, confirming an occurrence, and skipping an occurrence each write to more than one table and must commit or fail together (spec §Kiến trúc triển khai). It does **not** call the Task 5 repositories' methods (each of those opens its own transaction, and SQLite/better-sqlite3 transactions cannot nest) — it does raw Drizzle inserts against the same tables inside one outer `database.db.transaction(...)`.

**Files:**
- Create: `src/data/local/repositories/recurring-occurrence-processing-repository.ts`
- Test: `tests/data/local/recurring-repositories.test.ts` (append)

**Interfaces:**
- Consumes: `RecurringOccurrenceProcessing` port and its input/result types from `@/core/application/ports/recurring-repositories` (Task 4); `computeNextOccurrenceDate`, `isBeyondScheduleLimit` from `@/core/domain/finance/recurring-date` (Task 1); `validateTransactionInput` from `@/core/domain/finance/transaction`; `validateRecurringScheduleInput` from `@/core/domain/finance/recurring-schedule`; `validateRecurringOccurrenceEdits` from `@/core/domain/finance/recurring-occurrence`; row mappers from Task 5 plus `toTransactionRowValues` from `finance-record-mappers.ts` (existing); `buildSyncOperation`, `toChangeLogValues` (existing).
- Produces: `class RecurringOccurrenceProcessingRepository implements RecurringOccurrenceProcessing`.

- [ ] **Step 1: Write the failing tests**

```typescript
// append to tests/data/local/recurring-repositories.test.ts
import { RecurringOccurrenceProcessingRepository } from '@/data/local/repositories/recurring-occurrence-processing-repository';
import { recurringOccurrences, recurringSchedules } from '@/data/local/schema';

describe('RecurringOccurrenceProcessingRepository', () => {
  let database: LocalDatabaseClient;
  let processing: RecurringOccurrenceProcessingRepository;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    seedAccountCategoryAndTransaction(database);
    processing = new RecurringOccurrenceProcessingRepository(database);
  });

  afterEach(async () => {
    await database.close();
  });

  it('createFirstPeriod inserts the transaction, schedule and first occurrence together with 3 change_log rows', async () => {
    const result = await processing.createFirstPeriod({
      originDeviceId: deviceId,
      now: '2026-08-27T09:00:00.000Z',
      transactionId: 'transaction-first',
      transactionOperationId: 'op-tx-1',
      transaction: {
        type: 'expense',
        amount: 179000,
        accountId: 'account-main',
        categoryId: 'category-bills',
        date: '2026-08-27',
        name: 'YouTube Premium',
        note: null,
      },
      scheduleId: 'schedule-youtube',
      scheduleOperationId: 'op-schedule-1',
      schedule: {
        displayName: 'YouTube Premium',
        accountId: 'account-main',
        categoryId: 'category-bills',
        amount: 179000,
        frequency: 'monthly',
        anchorDay: 27,
        startDate: '2026-08-27',
      },
      occurrenceId: 'occurrence-1',
      occurrenceOperationId: 'op-occurrence-1',
    });

    expect(result.schedule).toMatchObject({ id: 'schedule-youtube', status: 'active', generatedCount: 1 });
    expect(result.occurrence).toMatchObject({ id: 'occurrence-1', scheduleId: 'schedule-youtube', status: 'pending', scheduledDate: '2026-09-27' });

    const logRows = database.db.select().from(changeLog).all();
    expect(logRows).toHaveLength(3);
    expect(logRows.map((row) => row.entityType).sort()).toEqual(['recurring_occurrence', 'recurring_schedule', 'transaction']);
  });

  async function createFirstPeriod() {
    return processing.createFirstPeriod({
      originDeviceId: deviceId,
      now: '2026-08-27T09:00:00.000Z',
      transactionId: 'transaction-first',
      transactionOperationId: 'op-tx-1',
      transaction: { type: 'expense', amount: 179000, accountId: 'account-main', categoryId: 'category-bills', date: '2026-08-27', name: 'YouTube Premium', note: null },
      scheduleId: 'schedule-youtube',
      scheduleOperationId: 'op-schedule-1',
      schedule: { displayName: 'YouTube Premium', accountId: 'account-main', categoryId: 'category-bills', amount: 179000, frequency: 'monthly', anchorDay: 27, startDate: '2026-08-27' },
      occurrenceId: 'occurrence-1',
      occurrenceOperationId: 'op-occurrence-1',
    });
  }

  it('confirmOccurrence with this_only records the edited amount but leaves the schedule and next occurrence at the old default', async () => {
    await createFirstPeriod();

    const result = await processing.confirmOccurrence({
      occurrenceId: 'occurrence-1',
      edits: { amount: 189000 },
      applyScope: 'this_only',
      originDeviceId: deviceId,
      now: '2026-09-27T08:00:00.000Z',
      transactionId: 'transaction-period-2',
      transactionOperationId: 'op-tx-2',
      occurrenceOperationId: 'op-occurrence-1-confirm',
      scheduleOperationId: 'op-schedule-2',
      nextOccurrenceId: 'occurrence-2',
      nextOccurrenceOperationId: 'op-occurrence-2',
    });

    expect(result.transactionId).toBe('transaction-period-2');
    expect(result.occurrence).toMatchObject({ status: 'confirmed', amount: 189000, transactionId: 'transaction-period-2' });
    expect(result.schedule).toMatchObject({ amount: 179000, generatedCount: 2 });
    expect(result.nextOccurrence).toMatchObject({ id: 'occurrence-2', amount: 179000, scheduledDate: '2026-10-27', status: 'pending' });

    const insertedTransaction = database.db.select().from(transactions).where(eq(transactions.id, 'transaction-period-2')).get();
    expect(insertedTransaction).toMatchObject({ amount: 189000, transactionDate: '2026-09-27' });
  });

  it('confirmOccurrence with this_and_future updates the schedule default and the next occurrence', async () => {
    await createFirstPeriod();

    const result = await processing.confirmOccurrence({
      occurrenceId: 'occurrence-1',
      edits: { amount: 189000 },
      applyScope: 'this_and_future',
      originDeviceId: deviceId,
      now: '2026-09-27T08:00:00.000Z',
      transactionId: 'transaction-period-2',
      transactionOperationId: 'op-tx-2',
      occurrenceOperationId: 'op-occurrence-1-confirm',
      scheduleOperationId: 'op-schedule-2',
      nextOccurrenceId: 'occurrence-2',
      nextOccurrenceOperationId: 'op-occurrence-2',
    });

    expect(result.schedule).toMatchObject({ amount: 189000 });
    expect(result.nextOccurrence).toMatchObject({ amount: 189000 });
  });

  it('confirmOccurrence does not generate a next occurrence when the schedule is paused', async () => {
    await createFirstPeriod();
    await database.db
      .update(recurringSchedules)
      .set({ status: 'paused' })
      .where(eq(recurringSchedules.id, 'schedule-youtube'))
      .run();

    const result = await processing.confirmOccurrence({
      occurrenceId: 'occurrence-1',
      edits: {},
      applyScope: 'this_only',
      originDeviceId: deviceId,
      now: '2026-09-27T08:00:00.000Z',
      transactionId: 'transaction-period-2',
      transactionOperationId: 'op-tx-2',
      occurrenceOperationId: 'op-occurrence-1-confirm',
      scheduleOperationId: 'op-schedule-2',
      nextOccurrenceId: null,
      nextOccurrenceOperationId: null,
    });

    expect(result.nextOccurrence).toBeNull();
    expect(result.schedule).toMatchObject({ status: 'paused', generatedCount: 1 });
  });

  it('confirmOccurrence ends the schedule once occurrenceLimit is reached', async () => {
    await processing.createFirstPeriod({
      originDeviceId: deviceId,
      now: '2026-08-27T09:00:00.000Z',
      transactionId: 'transaction-first',
      transactionOperationId: 'op-tx-1',
      transaction: { type: 'expense', amount: 179000, accountId: 'account-main', categoryId: 'category-bills', date: '2026-08-27', name: 'YouTube Premium', note: null },
      scheduleId: 'schedule-youtube',
      scheduleOperationId: 'op-schedule-1',
      schedule: { displayName: 'YouTube Premium', accountId: 'account-main', categoryId: 'category-bills', amount: 179000, frequency: 'monthly', anchorDay: 27, startDate: '2026-08-27', occurrenceLimit: 2 },
      occurrenceId: 'occurrence-1',
      occurrenceOperationId: 'op-occurrence-1',
    });

    const result = await processing.confirmOccurrence({
      occurrenceId: 'occurrence-1',
      edits: {},
      applyScope: 'this_only',
      originDeviceId: deviceId,
      now: '2026-09-27T08:00:00.000Z',
      transactionId: 'transaction-period-2',
      transactionOperationId: 'op-tx-2',
      occurrenceOperationId: 'op-occurrence-1-confirm',
      scheduleOperationId: 'op-schedule-2',
      nextOccurrenceId: null,
      nextOccurrenceOperationId: null,
    });

    expect(result.schedule).toMatchObject({ status: 'ended', generatedCount: 1 });
    expect(result.nextOccurrence).toBeNull();
  });

  it('skipOccurrence marks the occurrence skipped without creating a transaction, and generates the next occurrence', async () => {
    await createFirstPeriod();

    const result = await processing.skipOccurrence({
      occurrenceId: 'occurrence-1',
      originDeviceId: deviceId,
      now: '2026-09-27T08:00:00.000Z',
      occurrenceOperationId: 'op-occurrence-1-skip',
      scheduleOperationId: 'op-schedule-2',
      nextOccurrenceId: 'occurrence-2',
      nextOccurrenceOperationId: 'op-occurrence-2',
    });

    expect(result.occurrence).toMatchObject({ status: 'skipped', transactionId: null });
    expect(result.nextOccurrence).toMatchObject({ id: 'occurrence-2', scheduledDate: '2026-10-27', status: 'pending' });
    expect(result.schedule).toMatchObject({ generatedCount: 2 });

    const transactionRows = database.db.select().from(transactions).all();
    expect(transactionRows).toHaveLength(1); // only period 1's transaction — skip never creates one
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/data/local/recurring-repositories.test.ts`
Expected: FAIL with "Cannot find module '@/data/local/repositories/recurring-occurrence-processing-repository'"

- [ ] **Step 3: Implement `recurring-occurrence-processing-repository.ts`**

```typescript
// src/data/local/repositories/recurring-occurrence-processing-repository.ts
import { eq } from 'drizzle-orm';

import {
  ConfirmRecurringOccurrenceInput,
  CreateRecurringExpenseInput,
  RecurringOccurrenceProcessing,
  RecurringOccurrenceProcessingResult,
  SkipRecurringOccurrenceInput,
} from '@/core/application/ports/recurring-repositories';
import { computeNextOccurrenceDate, isBeyondScheduleLimit } from '@/core/domain/finance/recurring-date';
import {
  RecurringOccurrence,
  RecurringOccurrenceEdits,
  validateRecurringOccurrenceEdits,
} from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule, validateRecurringScheduleInput } from '@/core/domain/finance/recurring-schedule';
import { Transaction, validateTransactionInput } from '@/core/domain/finance/transaction';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, recurringOccurrences, recurringSchedules, transactions } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toTransactionRowValues } from './finance-record-mappers';
import { toRecurringOccurrenceRowValues, toRecurringScheduleRowValues } from './recurring-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';

type MergedOccurrenceFields = {
  amount: number;
  accountId: string;
  categoryId: string;
  displayName: string;
  note: string | null;
};

function mergeEdits(
  occurrence: Pick<RecurringOccurrence, 'amount' | 'accountId' | 'categoryId' | 'displayName' | 'note'>,
  edits: RecurringOccurrenceEdits,
): MergedOccurrenceFields {
  return {
    amount: edits.amount ?? occurrence.amount,
    accountId: edits.accountId ?? occurrence.accountId,
    categoryId: edits.categoryId ?? occurrence.categoryId,
    displayName: edits.displayName ?? occurrence.displayName,
    note: edits.note !== undefined ? edits.note : occurrence.note,
  };
}

export class RecurringOccurrenceProcessingRepository implements RecurringOccurrenceProcessing {
  constructor(private readonly database: LocalDatabaseClient) {}

  async createFirstPeriod(
    input: CreateRecurringExpenseInput,
  ): Promise<{ schedule: RecurringSchedule; occurrence: RecurringOccurrence }> {
    validateTransactionInput(input.transaction);
    validateRecurringScheduleInput(input.schedule);

    const transaction: Transaction = {
      id: input.transactionId,
      type: 'expense',
      amount: input.transaction.amount,
      accountId: input.transaction.accountId,
      categoryId: input.transaction.categoryId as string,
      destinationAccountId: null,
      date: input.transaction.date,
      name: input.transaction.name,
      note: input.transaction.note ?? null,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };

    const schedule: RecurringSchedule = {
      id: input.scheduleId,
      displayName: input.schedule.displayName,
      type: 'expense',
      accountId: input.schedule.accountId,
      categoryId: input.schedule.categoryId,
      amount: input.schedule.amount,
      frequency: input.schedule.frequency,
      anchorDay: input.schedule.anchorDay,
      startDate: input.schedule.startDate,
      endDate: input.schedule.endDate ?? null,
      occurrenceLimit: input.schedule.occurrenceLimit ?? null,
      remindDaysBefore: input.schedule.remindDaysBefore ?? 1,
      status: 'active',
      firstTransactionId: input.transactionId,
      note: input.schedule.note ?? null,
      generatedCount: 1,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };

    const occurrence: RecurringOccurrence = {
      id: input.occurrenceId,
      scheduleId: schedule.id,
      scheduledDate: computeNextOccurrenceDate(schedule.startDate, schedule.frequency, schedule.anchorDay),
      amount: schedule.amount,
      accountId: schedule.accountId,
      categoryId: schedule.categoryId,
      displayName: schedule.displayName,
      note: schedule.note,
      status: 'pending',
      transactionId: null,
      notifiedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };

    this.database.db.transaction((tx) => {
      insertTransaction(tx, transaction, input.transactionOperationId, input.originDeviceId, input.now);
      insertSchedule(tx, schedule, input.scheduleOperationId, input.originDeviceId, input.now);
      insertOccurrence(tx, occurrence, input.occurrenceOperationId, input.originDeviceId, input.now);
    });

    return { schedule, occurrence };
  }

  async confirmOccurrence(
    input: ConfirmRecurringOccurrenceInput,
  ): Promise<RecurringOccurrenceProcessingResult & { transactionId: string }> {
    validateRecurringOccurrenceEdits(input.edits);
    const { occurrence: existingOccurrence, schedule: existingSchedule } = this.requireOccurrenceAndSchedule(
      input.occurrenceId,
    );
    if (existingOccurrence.status !== 'pending') {
      throw new Error(`Recurring occurrence ${input.occurrenceId} is not pending`);
    }

    const merged = mergeEdits(existingOccurrence, input.edits);
    const today = input.now.slice(0, 10);

    const confirmedTransaction: Transaction = {
      id: input.transactionId,
      type: 'expense',
      amount: merged.amount,
      accountId: merged.accountId,
      categoryId: merged.categoryId,
      destinationAccountId: null,
      date: today,
      name: merged.displayName,
      note: merged.note,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
      revision: 1,
      originDeviceId: input.originDeviceId,
    };

    const confirmedOccurrence: RecurringOccurrence = {
      ...existingOccurrence,
      ...merged,
      status: 'confirmed',
      transactionId: input.transactionId,
      updatedAt: input.now,
      revision: existingOccurrence.revision + 1,
      originDeviceId: input.originDeviceId,
    };

    const scheduleWithScope: RecurringSchedule =
      input.applyScope === 'this_and_future'
        ? {
            ...existingSchedule,
            amount: merged.amount,
            accountId: merged.accountId,
            categoryId: merged.categoryId,
            displayName: merged.displayName,
            note: merged.note,
          }
        : existingSchedule;

    const { schedule: updatedSchedule, nextOccurrence } = buildNextPeriod({
      schedule: scheduleWithScope,
      previousScheduledDate: existingOccurrence.scheduledDate,
      now: input.now,
      originDeviceId: input.originDeviceId,
      scheduleOperationId: input.scheduleOperationId,
      nextOccurrenceId: input.nextOccurrenceId,
    });

    this.database.db.transaction((tx) => {
      insertTransaction(tx, confirmedTransaction, input.transactionOperationId, input.originDeviceId, input.now);
      updateOccurrence(tx, confirmedOccurrence, input.occurrenceOperationId, input.originDeviceId, input.now);
      updateSchedule(tx, updatedSchedule, input.scheduleOperationId, input.originDeviceId, input.now);
      if (nextOccurrence && input.nextOccurrenceOperationId) {
        insertOccurrence(tx, nextOccurrence, input.nextOccurrenceOperationId, input.originDeviceId, input.now);
      }
    });

    return {
      transactionId: input.transactionId,
      occurrence: confirmedOccurrence,
      schedule: updatedSchedule,
      nextOccurrence,
    };
  }

  async skipOccurrence(
    input: SkipRecurringOccurrenceInput,
  ): Promise<RecurringOccurrenceProcessingResult> {
    const { occurrence: existingOccurrence, schedule: existingSchedule } = this.requireOccurrenceAndSchedule(
      input.occurrenceId,
    );
    if (existingOccurrence.status !== 'pending') {
      throw new Error(`Recurring occurrence ${input.occurrenceId} is not pending`);
    }

    const skippedOccurrence: RecurringOccurrence = {
      ...existingOccurrence,
      status: 'skipped',
      updatedAt: input.now,
      revision: existingOccurrence.revision + 1,
      originDeviceId: input.originDeviceId,
    };

    const { schedule: updatedSchedule, nextOccurrence } = buildNextPeriod({
      schedule: existingSchedule,
      previousScheduledDate: existingOccurrence.scheduledDate,
      now: input.now,
      originDeviceId: input.originDeviceId,
      scheduleOperationId: input.scheduleOperationId,
      nextOccurrenceId: input.nextOccurrenceId,
    });

    this.database.db.transaction((tx) => {
      updateOccurrence(tx, skippedOccurrence, input.occurrenceOperationId, input.originDeviceId, input.now);
      updateSchedule(tx, updatedSchedule, input.scheduleOperationId, input.originDeviceId, input.now);
      if (nextOccurrence && input.nextOccurrenceOperationId) {
        insertOccurrence(tx, nextOccurrence, input.nextOccurrenceOperationId, input.originDeviceId, input.now);
      }
    });

    return { occurrence: skippedOccurrence, schedule: updatedSchedule, nextOccurrence };
  }

  private requireOccurrenceAndSchedule(
    occurrenceId: string,
  ): { occurrence: RecurringOccurrence; schedule: RecurringSchedule } {
    const occurrenceRow = this.database.db
      .select()
      .from(recurringOccurrences)
      .where(eq(recurringOccurrences.id, occurrenceId))
      .get();
    if (!occurrenceRow) {
      throw new Error(`Recurring occurrence ${occurrenceId} not found`);
    }
    const scheduleRow = this.database.db
      .select()
      .from(recurringSchedules)
      .where(eq(recurringSchedules.id, occurrenceRow.scheduleId))
      .get();
    if (!scheduleRow) {
      throw new Error(`Recurring schedule ${occurrenceRow.scheduleId} not found`);
    }
    return {
      occurrence: toEntityOccurrence(occurrenceRow),
      schedule: toEntitySchedule(scheduleRow),
    };
  }
}

/**
 * Shared "what happens to the schedule and the next occurrence" step used
 * by both confirm and skip (spec §Sinh kỳ tiếp theo): only schedules that
 * are still `active` and within `endDate`/`occurrenceLimit` generate a new
 * `pending` occurrence; otherwise the schedule may transition to `ended`.
 */
function buildNextPeriod(params: {
  schedule: RecurringSchedule;
  previousScheduledDate: string;
  now: string;
  originDeviceId: string;
  scheduleOperationId: string;
  nextOccurrenceId: string | null;
}): { schedule: RecurringSchedule; nextOccurrence: RecurringOccurrence | null } {
  const { schedule, previousScheduledDate, now, originDeviceId, nextOccurrenceId } = params;
  const candidateDate = computeNextOccurrenceDate(previousScheduledDate, schedule.frequency, schedule.anchorDay);
  const beyondLimit = isBeyondScheduleLimit({
    endDate: schedule.endDate,
    occurrenceLimit: schedule.occurrenceLimit,
    generatedCount: schedule.generatedCount,
    candidateDate,
  });

  if (schedule.status !== 'active' || beyondLimit || nextOccurrenceId === null) {
    return {
      schedule: {
        ...schedule,
        status: beyondLimit ? 'ended' : schedule.status,
        updatedAt: now,
        revision: schedule.revision + 1,
        originDeviceId,
      },
      nextOccurrence: null,
    };
  }

  const updatedSchedule: RecurringSchedule = {
    ...schedule,
    generatedCount: schedule.generatedCount + 1,
    updatedAt: now,
    revision: schedule.revision + 1,
    originDeviceId,
  };
  const nextOccurrence: RecurringOccurrence = {
    id: nextOccurrenceId,
    scheduleId: schedule.id,
    scheduledDate: candidateDate,
    amount: updatedSchedule.amount,
    accountId: updatedSchedule.accountId,
    categoryId: updatedSchedule.categoryId,
    displayName: updatedSchedule.displayName,
    note: updatedSchedule.note,
    status: 'pending',
    transactionId: null,
    notifiedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    revision: 1,
    originDeviceId,
  };

  return { schedule: updatedSchedule, nextOccurrence };
}

// Local aliases to the schema's inferred row types, to avoid depending on
// the Task 5 repository classes (which each own a transaction).
type SqliteTransactionArg = Parameters<LocalDatabaseClient['db']['transaction']>[0];
type SqliteTx = SqliteTransactionArg extends (tx: infer Tx) => unknown ? Tx : never;

function toEntitySchedule(row: typeof recurringSchedules.$inferSelect): RecurringSchedule {
  return {
    id: row.id,
    displayName: row.displayName,
    type: row.type,
    accountId: row.accountId,
    categoryId: row.categoryId,
    amount: row.amount,
    frequency: row.frequency,
    anchorDay: row.anchorDay,
    startDate: row.startDate,
    endDate: row.endDate,
    occurrenceLimit: row.occurrenceLimit,
    remindDaysBefore: row.remindDaysBefore,
    status: row.status,
    firstTransactionId: row.firstTransactionId,
    note: row.note,
    generatedCount: row.generatedCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

function toEntityOccurrence(row: typeof recurringOccurrences.$inferSelect): RecurringOccurrence {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    scheduledDate: row.scheduledDate,
    amount: row.amount,
    accountId: row.accountId,
    categoryId: row.categoryId,
    displayName: row.displayName,
    note: row.note,
    status: row.status,
    transactionId: row.transactionId,
    notifiedAt: row.notifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

function insertTransaction(
  tx: SqliteTx,
  transaction: Transaction,
  operationId: string,
  originDeviceId: string,
  now: string,
): void {
  const values = toTransactionRowValues(transaction);
  tx.insert(transactions).values(values).onConflictDoUpdate({ target: transactions.id, set: values }).run();
  const operation = buildSyncOperation({
    entityType: 'transaction',
    entityId: transaction.id,
    operation: 'create',
    payload: transaction,
    originDeviceId,
    revision: transaction.revision,
    createdAt: now,
    operationId,
  });
  tx.insert(changeLog).values(toChangeLogValues(operation)).run();
}

function insertSchedule(
  tx: SqliteTx,
  schedule: RecurringSchedule,
  operationId: string,
  originDeviceId: string,
  now: string,
): void {
  const values = toRecurringScheduleRowValues(schedule);
  tx.insert(recurringSchedules)
    .values(values)
    .onConflictDoUpdate({ target: recurringSchedules.id, set: values })
    .run();
  const operation = buildSyncOperation({
    entityType: 'recurring_schedule',
    entityId: schedule.id,
    operation: 'create',
    payload: schedule,
    originDeviceId,
    revision: schedule.revision,
    createdAt: now,
    operationId,
  });
  tx.insert(changeLog).values(toChangeLogValues(operation)).run();
}

function updateSchedule(
  tx: SqliteTx,
  schedule: RecurringSchedule,
  operationId: string,
  originDeviceId: string,
  now: string,
): void {
  const values = toRecurringScheduleRowValues(schedule);
  tx.insert(recurringSchedules)
    .values(values)
    .onConflictDoUpdate({ target: recurringSchedules.id, set: values })
    .run();
  const operation = buildSyncOperation({
    entityType: 'recurring_schedule',
    entityId: schedule.id,
    operation: 'update',
    payload: schedule,
    originDeviceId,
    revision: schedule.revision,
    createdAt: now,
    operationId,
  });
  tx.insert(changeLog).values(toChangeLogValues(operation)).run();
}

function insertOccurrence(
  tx: SqliteTx,
  occurrence: RecurringOccurrence,
  operationId: string,
  originDeviceId: string,
  now: string,
): void {
  const values = toRecurringOccurrenceRowValues(occurrence);
  tx.insert(recurringOccurrences)
    .values(values)
    .onConflictDoUpdate({ target: recurringOccurrences.id, set: values })
    .run();
  const operation = buildSyncOperation({
    entityType: 'recurring_occurrence',
    entityId: occurrence.id,
    operation: 'create',
    payload: occurrence,
    originDeviceId,
    revision: occurrence.revision,
    createdAt: now,
    operationId,
  });
  tx.insert(changeLog).values(toChangeLogValues(operation)).run();
}

function updateOccurrence(
  tx: SqliteTx,
  occurrence: RecurringOccurrence,
  operationId: string,
  originDeviceId: string,
  now: string,
): void {
  const values = toRecurringOccurrenceRowValues(occurrence);
  tx.insert(recurringOccurrences)
    .values(values)
    .onConflictDoUpdate({ target: recurringOccurrences.id, set: values })
    .run();
  const operation = buildSyncOperation({
    entityType: 'recurring_occurrence',
    entityId: occurrence.id,
    operation: 'update',
    payload: occurrence,
    originDeviceId,
    revision: occurrence.revision,
    createdAt: now,
    operationId,
  });
  tx.insert(changeLog).values(toChangeLogValues(operation)).run();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/data/local/recurring-repositories.test.ts`
Expected: PASS (15 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/data/local/repositories/recurring-occurrence-processing-repository.ts tests/data/local/recurring-repositories.test.ts
git commit -m "feat: add atomic create/confirm/skip repository for recurring occurrences"
```

---

### Task 7: Use cases — create, confirm, skip

**Files:**
- Create: `src/core/application/finance/create-recurring-expense.ts`
- Create: `src/core/application/finance/confirm-recurring-occurrence.ts`
- Create: `src/core/application/finance/skip-recurring-occurrence.ts`
- Test: `tests/core/finance/recurring-use-cases.test.ts`

**Interfaces:**
- Consumes: `RecurringOccurrenceProcessing`, `RecurringOccurrenceRepository`, `RecurringScheduleRepository` ports (Task 4); `RecurringOccurrenceProcessingRepository`, `RecurringOccurrenceRepository`, `RecurringScheduleRepository` concrete classes (Tasks 5–6) for the test; `TransactionInput` (existing); `RecurringScheduleInput` (Task 2); `RecurringOccurrenceEdits` (Task 2).
- Produces:
  - `class CreateRecurringExpense { constructor(deps: { processing: RecurringOccurrenceProcessing; now(): string; deviceId: string; generateId(): string }); execute(input: { transaction: Omit<TransactionInput, 'type'>; recurring: Omit<RecurringScheduleInput, 'anchorDay'> }): Promise<{ schedule: RecurringSchedule; occurrence: RecurringOccurrence }> }` — `anchorDay` is derived internally via `deriveAnchorDay(recurring.startDate, recurring.frequency)`, so callers never have to compute it.
  - `class ConfirmRecurringOccurrence { constructor(deps: { processing: RecurringOccurrenceProcessing; occurrenceRepository: RecurringOccurrenceRepository; scheduleRepository: RecurringScheduleRepository; now(): string; deviceId: string; generateId(): string }); execute(occurrenceId: string, edits: RecurringOccurrenceEdits, applyScope: 'this_only' | 'this_and_future'): Promise<RecurringOccurrenceProcessingResult & { transactionId: string }> }`
  - `class SkipRecurringOccurrence { constructor(deps: { processing: RecurringOccurrenceProcessing; occurrenceRepository: RecurringOccurrenceRepository; now(): string; deviceId: string; generateId(): string }); execute(occurrenceId: string): Promise<RecurringOccurrenceProcessingResult> }`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/core/finance/recurring-use-cases.test.ts
jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => {
      const base = '550e8400-e29b-41d4-a716-44665544';
      return base + String(counter++).padStart(4, '0');
    }),
  };
});

import { randomUUID } from 'expo-crypto';

import { ConfirmRecurringOccurrence } from '@/core/application/finance/confirm-recurring-occurrence';
import { CreateRecurringExpense } from '@/core/application/finance/create-recurring-expense';
import { SkipRecurringOccurrence } from '@/core/application/finance/skip-recurring-occurrence';
import { LocalDatabaseClient, openTestLocalDatabase } from '@/data/local/db/client';
import { accounts, categories } from '@/data/local/schema';
import { RecurringOccurrenceProcessingRepository } from '@/data/local/repositories/recurring-occurrence-processing-repository';
import { RecurringOccurrenceRepository } from '@/data/local/repositories/recurring-occurrence-repository';
import { RecurringScheduleRepository } from '@/data/local/repositories/recurring-schedule-repository';

const deviceId = '550e8400-e29b-41d4-a716-446655440030';

describe('recurring expense use cases', () => {
  let database: LocalDatabaseClient;
  let processing: RecurringOccurrenceProcessingRepository;
  let occurrenceRepository: RecurringOccurrenceRepository;
  let scheduleRepository: RecurringScheduleRepository;
  let now: () => string;
  let generateId: () => string;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    const seedNow = '2026-08-27T09:00:00.000Z';
    database.db
      .insert(accounts)
      .values({ id: 'account-main', name: 'Ví chính', type: 'cash', openingBalance: 0, isArchived: false, createdAt: seedNow, updatedAt: seedNow, deletedAt: null, revision: 1, originDeviceId: deviceId })
      .run();
    database.db
      .insert(categories)
      .values({ id: 'category-bills', name: 'Hóa đơn', type: 'expense', isArchived: false, createdAt: seedNow, updatedAt: seedNow, deletedAt: null, revision: 1, originDeviceId: deviceId })
      .run();

    processing = new RecurringOccurrenceProcessingRepository(database);
    occurrenceRepository = new RecurringOccurrenceRepository(database);
    scheduleRepository = new RecurringScheduleRepository(database);
    now = () => '2026-08-27T09:00:00.000Z';
    generateId = () => randomUUID();
  });

  afterEach(async () => {
    await database.close();
  });

  describe('CreateRecurringExpense', () => {
    it('creates the first transaction, the schedule and one pending occurrence', async () => {
      const createRecurringExpense = new CreateRecurringExpense({ processing, now, deviceId, generateId });

      const result = await createRecurringExpense.execute({
        transaction: { amount: 179000, accountId: 'account-main', categoryId: 'category-bills', date: '2026-08-27', name: 'YouTube Premium', note: null },
        recurring: { displayName: 'YouTube Premium', accountId: 'account-main', categoryId: 'category-bills', amount: 179000, frequency: 'monthly', startDate: '2026-08-27' },
      });

      expect(result.schedule).toMatchObject({ status: 'active', frequency: 'monthly', anchorDay: 27, generatedCount: 1 });
      expect(result.occurrence).toMatchObject({ status: 'pending', scheduledDate: '2026-09-27' });
      await expect(occurrenceRepository.findActiveByScheduleId(result.schedule.id)).resolves.toMatchObject({ id: result.occurrence.id });
    });
  });

  describe('ConfirmRecurringOccurrence and SkipRecurringOccurrence', () => {
    async function seedSchedule() {
      const createRecurringExpense = new CreateRecurringExpense({ processing, now, deviceId, generateId });
      return createRecurringExpense.execute({
        transaction: { amount: 179000, accountId: 'account-main', categoryId: 'category-bills', date: '2026-08-27', name: 'YouTube Premium', note: null },
        recurring: { displayName: 'YouTube Premium', accountId: 'account-main', categoryId: 'category-bills', amount: 179000, frequency: 'monthly', startDate: '2026-08-27' },
      });
    }

    it('confirms the pending occurrence and generates exactly one next occurrence', async () => {
      const { occurrence } = await seedSchedule();
      const confirmRecurringOccurrence = new ConfirmRecurringOccurrence({
        processing,
        occurrenceRepository,
        scheduleRepository,
        now: () => '2026-09-27T08:00:00.000Z',
        deviceId,
        generateId,
      });

      const result = await confirmRecurringOccurrence.execute(occurrence.id, {}, 'this_only');

      expect(result.occurrence).toMatchObject({ status: 'confirmed' });
      expect(result.nextOccurrence).toMatchObject({ status: 'pending', scheduledDate: '2026-10-27' });
      await expect(occurrenceRepository.listByStatus(['pending'])).resolves.toHaveLength(1);
    });

    it('rejects confirming an already-confirmed occurrence', async () => {
      const { occurrence } = await seedSchedule();
      const confirmRecurringOccurrence = new ConfirmRecurringOccurrence({
        processing,
        occurrenceRepository,
        scheduleRepository,
        now: () => '2026-09-27T08:00:00.000Z',
        deviceId,
        generateId,
      });
      await confirmRecurringOccurrence.execute(occurrence.id, {}, 'this_only');

      await expect(confirmRecurringOccurrence.execute(occurrence.id, {}, 'this_only')).rejects.toThrow(
        `Recurring occurrence ${occurrence.id} is not pending`,
      );
    });

    it('skips the pending occurrence and generates exactly one next occurrence', async () => {
      const { occurrence } = await seedSchedule();
      const skipRecurringOccurrence = new SkipRecurringOccurrence({
        processing,
        occurrenceRepository,
        now: () => '2026-09-27T08:00:00.000Z',
        deviceId,
        generateId,
      });

      const result = await skipRecurringOccurrence.execute(occurrence.id);

      expect(result.occurrence).toMatchObject({ status: 'skipped', transactionId: null });
      expect(result.nextOccurrence).toMatchObject({ status: 'pending', scheduledDate: '2026-10-27' });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/finance/recurring-use-cases.test.ts`
Expected: FAIL with "Cannot find module '@/core/application/finance/create-recurring-expense'"

- [ ] **Step 3: Implement `create-recurring-expense.ts`**

```typescript
// src/core/application/finance/create-recurring-expense.ts
import { RecurringOccurrenceProcessing } from '@/core/application/ports/recurring-repositories';
import { deriveAnchorDay } from '@/core/domain/finance/recurring-date';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule, RecurringScheduleInput } from '@/core/domain/finance/recurring-schedule';
import { TransactionInput } from '@/core/domain/finance/transaction';

export type CreateRecurringExpenseDeps = {
  processing: RecurringOccurrenceProcessing;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export type CreateRecurringExpenseRequest = {
  /** Always an expense; `type` is fixed by this use case. */
  transaction: Omit<TransactionInput, 'type'>;
  /** `anchorDay` is derived from `startDate`/`frequency`, never supplied by the caller. */
  recurring: Omit<RecurringScheduleInput, 'anchorDay'>;
};

/** Creates period 1's real transaction, its schedule, and the first pending occurrence (spec §Tạo lịch từ form thêm chi tiêu). */
export class CreateRecurringExpense {
  constructor(private readonly deps: CreateRecurringExpenseDeps) {}

  async execute(
    request: CreateRecurringExpenseRequest,
  ): Promise<{ schedule: RecurringSchedule; occurrence: RecurringOccurrence }> {
    const now = this.deps.now();
    const anchorDay = deriveAnchorDay(request.recurring.startDate, request.recurring.frequency);

    return this.deps.processing.createFirstPeriod({
      originDeviceId: this.deps.deviceId,
      now,
      transactionId: this.deps.generateId(),
      transactionOperationId: this.deps.generateId(),
      transaction: { ...request.transaction, type: 'expense' },
      scheduleId: this.deps.generateId(),
      scheduleOperationId: this.deps.generateId(),
      schedule: { ...request.recurring, anchorDay },
      occurrenceId: this.deps.generateId(),
      occurrenceOperationId: this.deps.generateId(),
    });
  }
}
```

- [ ] **Step 4: Implement `confirm-recurring-occurrence.ts`**

```typescript
// src/core/application/finance/confirm-recurring-occurrence.ts
import {
  RecurringOccurrenceProcessing,
  RecurringOccurrenceProcessingResult,
  RecurringOccurrenceRepository,
} from '@/core/application/ports/recurring-repositories';
import { RecurringScheduleRepository } from '@/core/application/ports/recurring-repositories';
import { RecurringOccurrenceEdits } from '@/core/domain/finance/recurring-occurrence';

export type ConfirmRecurringOccurrenceDeps = {
  processing: RecurringOccurrenceProcessing;
  occurrenceRepository: RecurringOccurrenceRepository;
  scheduleRepository: RecurringScheduleRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

/** Confirms a pending/overdue occurrence into a real transaction and generates the next period (spec §Xử lý kỳ dự kiến). */
export class ConfirmRecurringOccurrence {
  constructor(private readonly deps: ConfirmRecurringOccurrenceDeps) {}

  async execute(
    occurrenceId: string,
    edits: RecurringOccurrenceEdits,
    applyScope: 'this_only' | 'this_and_future',
  ): Promise<RecurringOccurrenceProcessingResult & { transactionId: string }> {
    const occurrence = await this.deps.occurrenceRepository.findById(occurrenceId);
    if (!occurrence) {
      throw new Error(`Recurring occurrence ${occurrenceId} not found`);
    }
    const schedule = await this.deps.scheduleRepository.findById(occurrence.scheduleId);
    if (!schedule) {
      throw new Error(`Recurring schedule ${occurrence.scheduleId} not found`);
    }

    // Only an `active` schedule ever generates a next occurrence (spec
    // §Sinh kỳ tiếp theo); the repository (Task 6) independently re-checks
    // `endDate`/`occurrenceLimit` and may still end up not using this id.
    const willGenerateNext = schedule.status === 'active';
    const now = this.deps.now();

    return this.deps.processing.confirmOccurrence({
      occurrenceId,
      edits,
      applyScope,
      originDeviceId: this.deps.deviceId,
      now,
      transactionId: this.deps.generateId(),
      transactionOperationId: this.deps.generateId(),
      occurrenceOperationId: this.deps.generateId(),
      scheduleOperationId: this.deps.generateId(),
      nextOccurrenceId: willGenerateNext ? this.deps.generateId() : null,
      nextOccurrenceOperationId: willGenerateNext ? this.deps.generateId() : null,
    });
  }
}
```

- [ ] **Step 5: Implement `skip-recurring-occurrence.ts`**

```typescript
// src/core/application/finance/skip-recurring-occurrence.ts
import {
  RecurringOccurrenceProcessing,
  RecurringOccurrenceProcessingResult,
  RecurringOccurrenceRepository,
} from '@/core/application/ports/recurring-repositories';

export type SkipRecurringOccurrenceDeps = {
  processing: RecurringOccurrenceProcessing;
  occurrenceRepository: RecurringOccurrenceRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

/** Skips a pending/overdue occurrence without affecting the balance, and generates the next period (spec §Xử lý kỳ dự kiến). */
export class SkipRecurringOccurrence {
  constructor(private readonly deps: SkipRecurringOccurrenceDeps) {}

  async execute(occurrenceId: string): Promise<RecurringOccurrenceProcessingResult> {
    const occurrence = await this.deps.occurrenceRepository.findById(occurrenceId);
    if (!occurrence) {
      throw new Error(`Recurring occurrence ${occurrenceId} not found`);
    }

    return this.deps.processing.skipOccurrence({
      occurrenceId,
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
      occurrenceOperationId: this.deps.generateId(),
      scheduleOperationId: this.deps.generateId(),
      nextOccurrenceId: this.deps.generateId(),
      nextOccurrenceOperationId: this.deps.generateId(),
    });
  }
}
```

Note: `SkipRecurringOccurrence` always allocates a next-occurrence id/operationId even when the repository ends up not using it (paused/ended/beyond-limit schedules) — this is harmless (an unused UUID) and keeps the use case simple; only `ConfirmRecurringOccurrence` needs the conditional because it already loads the schedule to decide.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/finance/recurring-use-cases.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add src/core/application/finance/create-recurring-expense.ts src/core/application/finance/confirm-recurring-occurrence.ts src/core/application/finance/skip-recurring-occurrence.ts tests/core/finance/recurring-use-cases.test.ts
git commit -m "feat: add create/confirm/skip recurring expense use cases"
```

---

### Task 8: Use cases — pause/resume/end/update schedule, and overview reads

**Files:**
- Create: `src/core/application/finance/manage-recurring-schedule.ts`
- Create: `src/core/application/finance/get-recurring-overview.ts`
- Test: `tests/core/finance/recurring-use-cases.test.ts` (append)

**Interfaces:**
- Consumes: `RecurringScheduleRepository`, `RecurringOccurrenceRepository` ports (Task 4, extended); `UpdateRecurringScheduleInput` (Task 4).
- Produces:
  - `class PauseRecurringSchedule { constructor(deps: { scheduleRepository: RecurringScheduleRepository; now(): string; deviceId: string; generateId(): string }); execute(id: string): Promise<RecurringSchedule> }`
  - `class ResumeRecurringSchedule` — same shape, sets `status: 'active'`.
  - `class EndRecurringSchedule` — same shape, sets `status: 'ended'`.
  - `class UpdateRecurringSchedule { constructor(deps: { scheduleRepository: RecurringScheduleRepository; occurrenceRepository: RecurringOccurrenceRepository; now(): string; deviceId: string; generateId(): string }); execute(id: string, changes: Partial<RecurringScheduleInput>): Promise<RecurringSchedule> }` — also refreshes the schedule's current unresolved occurrence's copied fields (spec §Quản lý định kỳ: "Sửa mẫu: áp dụng cho mẫu và kỳ dự kiến chưa xử lý").
  - `class GetRecurringOverview { constructor(deps: { scheduleRepository: RecurringScheduleRepository; occurrenceRepository: RecurringOccurrenceRepository }); execute(): Promise<{ dueOccurrences: RecurringOccurrence[]; schedules: RecurringSchedule[] }> }` — `dueOccurrences` is every `pending` occurrence (overdue vs. upcoming is derived in the view model via `deriveOccurrenceDisplayStatus`, Task 2).

- [ ] **Step 1: Write the failing tests**

```typescript
// append to tests/core/finance/recurring-use-cases.test.ts
import {
  EndRecurringSchedule,
  PauseRecurringSchedule,
  ResumeRecurringSchedule,
  UpdateRecurringSchedule,
} from '@/core/application/finance/manage-recurring-schedule';
import { GetRecurringOverview } from '@/core/application/finance/get-recurring-overview';

describe('manage recurring schedule use cases', () => {
  // Reuses the outer `beforeEach`/`afterEach` (database, processing, occurrenceRepository, scheduleRepository, now, generateId).

  async function seedSchedule() {
    const createRecurringExpense = new CreateRecurringExpense({ processing, now, deviceId, generateId });
    return createRecurringExpense.execute({
      transaction: { amount: 179000, accountId: 'account-main', categoryId: 'category-bills', date: '2026-08-27', name: 'YouTube Premium', note: null },
      recurring: { displayName: 'YouTube Premium', accountId: 'account-main', categoryId: 'category-bills', amount: 179000, frequency: 'monthly', startDate: '2026-08-27' },
    });
  }

  it('pauses then resumes a schedule', async () => {
    const { schedule } = await seedSchedule();
    const pause = new PauseRecurringSchedule({ scheduleRepository, now, deviceId, generateId });
    const resume = new ResumeRecurringSchedule({ scheduleRepository, now, deviceId, generateId });

    await expect(pause.execute(schedule.id)).resolves.toMatchObject({ status: 'paused' });
    await expect(resume.execute(schedule.id)).resolves.toMatchObject({ status: 'active' });
  });

  it('ends a schedule', async () => {
    const { schedule } = await seedSchedule();
    const end = new EndRecurringSchedule({ scheduleRepository, now, deviceId, generateId });

    await expect(end.execute(schedule.id)).resolves.toMatchObject({ status: 'ended' });
  });

  it('updates a schedule default and refreshes its current unresolved occurrence', async () => {
    const { schedule, occurrence } = await seedSchedule();
    const update = new UpdateRecurringSchedule({ scheduleRepository, occurrenceRepository, now, deviceId, generateId });

    const updated = await update.execute(schedule.id, { amount: 199000 });

    expect(updated).toMatchObject({ amount: 199000 });
    await expect(occurrenceRepository.findById(occurrence.id)).resolves.toMatchObject({ amount: 199000 });
  });

  it('GetRecurringOverview lists pending occurrences and all schedules', async () => {
    const { schedule, occurrence } = await seedSchedule();
    const getRecurringOverview = new GetRecurringOverview({ scheduleRepository, occurrenceRepository });

    const overview = await getRecurringOverview.execute();

    expect(overview.schedules).toEqual([schedule]);
    expect(overview.dueOccurrences).toEqual([occurrence]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/finance/recurring-use-cases.test.ts`
Expected: FAIL with "Cannot find module '@/core/application/finance/manage-recurring-schedule'"

- [ ] **Step 3: Implement `manage-recurring-schedule.ts`**

```typescript
// src/core/application/finance/manage-recurring-schedule.ts
import {
  RecurringOccurrenceRepository,
  RecurringScheduleRepository,
} from '@/core/application/ports/recurring-repositories';
import { RecurringSchedule, RecurringScheduleInput } from '@/core/domain/finance/recurring-schedule';

export type ManageRecurringScheduleDeps = {
  scheduleRepository: RecurringScheduleRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

function writeContext(deps: ManageRecurringScheduleDeps) {
  return { originDeviceId: deps.deviceId, operationId: deps.generateId(), now: deps.now() };
}

/** Stops generating new occurrences; the current unresolved one can still be confirmed/skipped (spec §Quản lý định kỳ). */
export class PauseRecurringSchedule {
  constructor(private readonly deps: ManageRecurringScheduleDeps) {}

  execute(id: string): Promise<RecurringSchedule> {
    return this.deps.scheduleRepository.update(id, { status: 'paused' }, writeContext(this.deps));
  }
}

/** Resumes generation for a paused schedule. */
export class ResumeRecurringSchedule {
  constructor(private readonly deps: ManageRecurringScheduleDeps) {}

  execute(id: string): Promise<RecurringSchedule> {
    return this.deps.scheduleRepository.update(id, { status: 'active' }, writeContext(this.deps));
  }
}

/** Permanently closes a schedule; never generates again, keeps past history (spec §Quản lý định kỳ). */
export class EndRecurringSchedule {
  constructor(private readonly deps: ManageRecurringScheduleDeps) {}

  execute(id: string): Promise<RecurringSchedule> {
    return this.deps.scheduleRepository.update(id, { status: 'ended' }, writeContext(this.deps));
  }
}

export type UpdateRecurringScheduleDeps = ManageRecurringScheduleDeps & {
  occurrenceRepository: RecurringOccurrenceRepository;
};

/**
 * Edits a schedule's defaults and, when it has a current unresolved
 * occurrence, refreshes that occurrence's copied fields to match — but
 * never touches already-confirmed past transactions (spec §Quản lý định kỳ).
 */
export class UpdateRecurringSchedule {
  constructor(private readonly deps: UpdateRecurringScheduleDeps) {}

  async execute(id: string, changes: Partial<RecurringScheduleInput>): Promise<RecurringSchedule> {
    const updated = await this.deps.scheduleRepository.update(id, changes, writeContext(this.deps));

    const activeOccurrence = await this.deps.occurrenceRepository.findActiveByScheduleId(id);
    if (activeOccurrence) {
      await this.deps.occurrenceRepository.update(
        activeOccurrence.id,
        {
          amount: updated.amount,
          accountId: updated.accountId,
          categoryId: updated.categoryId,
          displayName: updated.displayName,
          note: updated.note,
        },
        writeContext(this.deps),
      );
    }

    return updated;
  }
}
```

- [ ] **Step 4: Implement `get-recurring-overview.ts`**

```typescript
// src/core/application/finance/get-recurring-overview.ts
import {
  RecurringOccurrenceRepository,
  RecurringScheduleRepository,
} from '@/core/application/ports/recurring-repositories';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';

export type GetRecurringOverviewDeps = {
  scheduleRepository: RecurringScheduleRepository;
  occurrenceRepository: RecurringOccurrenceRepository;
};

export type RecurringOverview = {
  dueOccurrences: RecurringOccurrence[];
  schedules: RecurringSchedule[];
};

/** Reads backing the occurrence list and management list screens (spec §Cấu trúc màn hình). */
export class GetRecurringOverview {
  constructor(private readonly deps: GetRecurringOverviewDeps) {}

  async execute(): Promise<RecurringOverview> {
    const [dueOccurrences, schedules] = await Promise.all([
      this.deps.occurrenceRepository.listByStatus(['pending']),
      this.deps.scheduleRepository.list(),
    ]);
    return { dueOccurrences, schedules };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/finance/recurring-use-cases.test.ts`
Expected: PASS (9 tests total)

- [ ] **Step 6: Commit**

```bash
git add src/core/application/finance/manage-recurring-schedule.ts src/core/application/finance/get-recurring-overview.ts tests/core/finance/recurring-use-cases.test.ts
git commit -m "feat: add recurring schedule management and overview use cases"
```

---

### Task 9: Local reminder notifications

**Files:**
- Create: `src/core/application/ports/notification-scheduler.ts`
- Create: `src/infrastructure/expo/notifications/recurring-notification-scheduler.ts`
- Create: `src/core/application/finance/sync-recurring-notifications.ts`
- Test: `tests/infrastructure/expo/recurring-notification-scheduler.test.ts`
- Test: `tests/core/finance/recurring-use-cases.test.ts` (append)

**Interfaces:**
- Consumes: `RecurringOccurrenceRepository`, `RecurringScheduleRepository` ports (Task 4).
- Produces:
  - `NotificationScheduler` port: `{ requestPermissions(): Promise<boolean>; scheduleAt(params: { id: string; title: string; body: string; fireDate: Date }): Promise<void> }`
  - `class RecurringNotificationScheduler implements NotificationScheduler` (Expo implementation)
  - `class ScanAndScheduleRecurringNotifications { constructor(deps: { occurrenceRepository: RecurringOccurrenceRepository; scheduleRepository: RecurringScheduleRepository; notificationScheduler: NotificationScheduler; now(): string; deviceId: string; generateId(): string }); execute(): Promise<void> }`

- [ ] **Step 1: Install `expo-notifications`**

Run: `npx expo install expo-notifications`
Expected: adds `expo-notifications` to `package.json` at the SDK-54-compatible version and updates `package-lock.json`.

- [ ] **Step 2: Write the failing infra test**

```typescript
// tests/infrastructure/expo/recurring-notification-scheduler.test.ts
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

import * as Notifications from 'expo-notifications';

import { RecurringNotificationScheduler } from '@/infrastructure/expo/notifications/recurring-notification-scheduler';

describe('RecurringNotificationScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests permission and reports granted', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    const scheduler = new RecurringNotificationScheduler();

    await expect(scheduler.requestPermissions()).resolves.toBe(true);
  });

  it('reports not granted without throwing', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    const scheduler = new RecurringNotificationScheduler();

    await expect(scheduler.requestPermissions()).resolves.toBe(false);
  });

  it('schedules a notification with the given id, title, body and fire date', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('ignored');
    const scheduler = new RecurringNotificationScheduler();
    const fireDate = new Date('2026-09-26T09:00:00.000Z');

    await scheduler.scheduleAt({ id: 'occurrence-1', title: 'Sắp đến hạn', body: 'YouTube Premium', fireDate });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'occurrence-1',
      content: { title: 'Sắp đến hạn', body: 'YouTube Premium' },
      trigger: { type: 'date', date: fireDate },
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --runInBand tests/infrastructure/expo/recurring-notification-scheduler.test.ts`
Expected: FAIL with "Cannot find module '@/infrastructure/expo/notifications/recurring-notification-scheduler'"

- [ ] **Step 4: Implement the port and the Expo scheduler**

```typescript
// src/core/application/ports/notification-scheduler.ts
export interface NotificationScheduler {
  /** Resolves `true` once the user has granted local-notification permission. */
  requestPermissions(): Promise<boolean>;
  /** Schedules (or replaces, if `id` was already used) a one-off local notification. */
  scheduleAt(params: { id: string; title: string; body: string; fireDate: Date }): Promise<void>;
}
```

```typescript
// src/infrastructure/expo/notifications/recurring-notification-scheduler.ts
import * as Notifications from 'expo-notifications';

import { NotificationScheduler } from '@/core/application/ports/notification-scheduler';

export class RecurringNotificationScheduler implements NotificationScheduler {
  async requestPermissions(): Promise<boolean> {
    const result = await Notifications.requestPermissionsAsync();
    return result.granted === true;
  }

  async scheduleAt(params: { id: string; title: string; body: string; fireDate: Date }): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      identifier: params.id,
      content: { title: params.title, body: params.body },
      trigger: { type: 'date', date: params.fireDate },
    });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --runInBand tests/infrastructure/expo/recurring-notification-scheduler.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Write the failing use-case test**

```typescript
// append to tests/core/finance/recurring-use-cases.test.ts
import { ScanAndScheduleRecurringNotifications } from '@/core/application/finance/sync-recurring-notifications';
import { NotificationScheduler } from '@/core/application/ports/notification-scheduler';

class FakeNotificationScheduler implements NotificationScheduler {
  scheduled: { id: string; title: string; body: string; fireDate: Date }[] = [];
  async requestPermissions(): Promise<boolean> {
    return true;
  }
  async scheduleAt(params: { id: string; title: string; body: string; fireDate: Date }): Promise<void> {
    this.scheduled.push(params);
  }
}

describe('ScanAndScheduleRecurringNotifications', () => {
  it('schedules a future reminder for a not-yet-due occurrence and marks it notified', async () => {
    const { occurrence } = await (async () => {
      const createRecurringExpense = new CreateRecurringExpense({ processing, now, deviceId, generateId });
      return createRecurringExpense.execute({
        transaction: { amount: 179000, accountId: 'account-main', categoryId: 'category-bills', date: '2026-08-27', name: 'YouTube Premium', note: null },
        recurring: { displayName: 'YouTube Premium', accountId: 'account-main', categoryId: 'category-bills', amount: 179000, frequency: 'monthly', startDate: '2026-08-27', remindDaysBefore: 1 },
      });
    })(); // occurrence.scheduledDate === '2026-09-27', remindDaysBefore 1 → reminder on 2026-09-26

    const notificationScheduler = new FakeNotificationScheduler();
    const scan = new ScanAndScheduleRecurringNotifications({
      occurrenceRepository,
      scheduleRepository,
      notificationScheduler,
      now: () => '2026-08-28T08:00:00.000Z', // well before the 2026-09-26 reminder date
      deviceId,
      generateId,
    });

    await scan.execute();

    expect(notificationScheduler.scheduled).toHaveLength(1);
    expect(notificationScheduler.scheduled[0]).toMatchObject({ id: occurrence.id, body: 'YouTube Premium' });
    expect(notificationScheduler.scheduled[0].fireDate.toISOString().slice(0, 10)).toBe('2026-09-26');
    await expect(occurrenceRepository.findById(occurrence.id)).resolves.toMatchObject({ notifiedAt: '2026-08-28T08:00:00.000Z' });
  });

  it('sends a catch-up reminder immediately when opening the app after the reminder date has passed', async () => {
    const { occurrence } = await (async () => {
      const createRecurringExpense = new CreateRecurringExpense({ processing, now, deviceId, generateId });
      return createRecurringExpense.execute({
        transaction: { amount: 179000, accountId: 'account-main', categoryId: 'category-bills', date: '2026-08-27', name: 'YouTube Premium', note: null },
        recurring: { displayName: 'YouTube Premium', accountId: 'account-main', categoryId: 'category-bills', amount: 179000, frequency: 'monthly', startDate: '2026-08-27', remindDaysBefore: 1 },
      });
    })();

    const notificationScheduler = new FakeNotificationScheduler();
    const scan = new ScanAndScheduleRecurringNotifications({
      occurrenceRepository,
      scheduleRepository,
      notificationScheduler,
      now: () => '2026-09-30T08:00:00.000Z', // opened the app after both the reminder and the due date
      deviceId,
      generateId,
    });

    await scan.execute();

    expect(notificationScheduler.scheduled).toHaveLength(1);
    expect(notificationScheduler.scheduled[0].id).toBe(occurrence.id);
  });

  it('never notifies the same occurrence twice', async () => {
    const { occurrence } = await (async () => {
      const createRecurringExpense = new CreateRecurringExpense({ processing, now, deviceId, generateId });
      return createRecurringExpense.execute({
        transaction: { amount: 179000, accountId: 'account-main', categoryId: 'category-bills', date: '2026-08-27', name: 'YouTube Premium', note: null },
        recurring: { displayName: 'YouTube Premium', accountId: 'account-main', categoryId: 'category-bills', amount: 179000, frequency: 'monthly', startDate: '2026-08-27', remindDaysBefore: 1 },
      });
    })();

    const notificationScheduler = new FakeNotificationScheduler();
    const scan = new ScanAndScheduleRecurringNotifications({
      occurrenceRepository,
      scheduleRepository,
      notificationScheduler,
      now: () => '2026-09-30T08:00:00.000Z',
      deviceId,
      generateId,
    });

    await scan.execute();
    await scan.execute();

    expect(notificationScheduler.scheduled).toHaveLength(1);
    void occurrence;
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/finance/recurring-use-cases.test.ts`
Expected: FAIL with "Cannot find module '@/core/application/finance/sync-recurring-notifications'"

- [ ] **Step 8: Implement `sync-recurring-notifications.ts`**

```typescript
// src/core/application/finance/sync-recurring-notifications.ts
import { NotificationScheduler } from '@/core/application/ports/notification-scheduler';
import {
  RecurringOccurrenceRepository,
  RecurringScheduleRepository,
} from '@/core/application/ports/recurring-repositories';

export type ScanAndScheduleRecurringNotificationsDeps = {
  occurrenceRepository: RecurringOccurrenceRepository;
  scheduleRepository: RecurringScheduleRepository;
  notificationScheduler: NotificationScheduler;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

function subtractDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Runs on app open: schedules a reminder for every unnotified `pending`
 * occurrence, sending it immediately (catch-up) if its reminder date has
 * already passed, or scheduling it for later otherwise. Never re-notifies
 * an occurrence that already has `notifiedAt` set (spec §Thông báo).
 */
export class ScanAndScheduleRecurringNotifications {
  constructor(private readonly deps: ScanAndScheduleRecurringNotificationsDeps) {}

  async execute(): Promise<void> {
    const now = this.deps.now();
    const today = now.slice(0, 10);
    const pendingOccurrences = await this.deps.occurrenceRepository.listByStatus(['pending']);

    for (const occurrence of pendingOccurrences) {
      if (occurrence.notifiedAt !== null) {
        continue;
      }
      const schedule = await this.deps.scheduleRepository.findById(occurrence.scheduleId);
      if (!schedule) {
        continue;
      }

      const reminderDate = subtractDays(occurrence.scheduledDate, schedule.remindDaysBefore);
      const isDue = reminderDate <= today;
      if (!isDue && reminderDate < today) {
        continue;
      }

      const fireDate = isDue ? new Date(now) : new Date(`${reminderDate}T09:00:00.000Z`);
      await this.deps.notificationScheduler.scheduleAt({
        id: occurrence.id,
        title: 'Sắp đến hạn chi tiêu định kỳ',
        body: occurrence.displayName,
        fireDate,
      });
      await this.deps.occurrenceRepository.markNotified(occurrence.id, now, {
        originDeviceId: this.deps.deviceId,
        operationId: this.deps.generateId(),
        now,
      });
    }
  }
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/finance/recurring-use-cases.test.ts`
Expected: PASS (12 tests total)

- [ ] **Step 10: Add the iOS/Android notification permission description**

Read `app.json` first to match its existing plugin-array style, then add the description Expo needs for the local-notification permission prompt (no new native plugin config beyond this is required for `expo-notifications` local scheduling):

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSUserNotificationsUsageDescription": "Vimo cần quyền thông báo để nhắc bạn trước khi đến hạn chi tiêu định kỳ."
      }
    }
  }
}
```

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json app.json src/core/application/ports/notification-scheduler.ts src/infrastructure/expo/notifications/recurring-notification-scheduler.ts src/core/application/finance/sync-recurring-notifications.ts tests/infrastructure/expo/recurring-notification-scheduler.test.ts tests/core/finance/recurring-use-cases.test.ts
git commit -m "feat: add local reminder notifications for recurring occurrences"
```

---

### Task 10: Composition root

**Files:**
- Modify: `src/features/finance/finance-dependencies.ts`

**Interfaces:**
- Consumes: every repository class (Tasks 5–6) and use case class (Tasks 7–9).
- Produces: `FinanceDependencies` gains `recurringScheduleRepository`, `recurringOccurrenceRepository`, `recurringOccurrenceProcessing`, `createRecurringExpense`, `confirmRecurringOccurrence`, `skipRecurringOccurrence`, `pauseRecurringSchedule`, `resumeRecurringSchedule`, `endRecurringSchedule`, `updateRecurringSchedule`, `getRecurringOverview`, `notificationScheduler`, `scanAndScheduleRecurringNotifications`.

- [ ] **Step 1: Extend `finance-dependencies.ts`**

Read the current file first (already shown above in this plan's research) so the edit lands correctly; add the imports and wire the new pieces alongside the existing ones, keeping the same `shared = { now, deviceId, generateId }` spread convention:

```typescript
// src/features/finance/finance-dependencies.ts — additions
import { ConfirmRecurringOccurrence } from '@/core/application/finance/confirm-recurring-occurrence';
import { CreateRecurringExpense } from '@/core/application/finance/create-recurring-expense';
import { GetRecurringOverview } from '@/core/application/finance/get-recurring-overview';
import {
  EndRecurringSchedule,
  PauseRecurringSchedule,
  ResumeRecurringSchedule,
  UpdateRecurringSchedule,
} from '@/core/application/finance/manage-recurring-schedule';
import { SkipRecurringOccurrence } from '@/core/application/finance/skip-recurring-occurrence';
import { ScanAndScheduleRecurringNotifications } from '@/core/application/finance/sync-recurring-notifications';
import { NotificationScheduler } from '@/core/application/ports/notification-scheduler';
import { RecurringNotificationScheduler } from '@/infrastructure/expo/notifications/recurring-notification-scheduler';
import { RecurringOccurrenceProcessingRepository } from '@/data/local/repositories/recurring-occurrence-processing-repository';
import { RecurringOccurrenceRepository } from '@/data/local/repositories/recurring-occurrence-repository';
import { RecurringScheduleRepository } from '@/data/local/repositories/recurring-schedule-repository';

export type FinanceDependencies = {
  // ...existing fields unchanged...
  recurringScheduleRepository: RecurringScheduleRepository;
  recurringOccurrenceRepository: RecurringOccurrenceRepository;
  recurringOccurrenceProcessing: RecurringOccurrenceProcessingRepository;
  createRecurringExpense: CreateRecurringExpense;
  confirmRecurringOccurrence: ConfirmRecurringOccurrence;
  skipRecurringOccurrence: SkipRecurringOccurrence;
  pauseRecurringSchedule: PauseRecurringSchedule;
  resumeRecurringSchedule: ResumeRecurringSchedule;
  endRecurringSchedule: EndRecurringSchedule;
  updateRecurringSchedule: UpdateRecurringSchedule;
  getRecurringOverview: GetRecurringOverview;
  notificationScheduler: NotificationScheduler;
  scanAndScheduleRecurringNotifications: ScanAndScheduleRecurringNotifications;
};

export async function createFinanceDependencies(
  database: LocalDatabaseClient,
): Promise<FinanceDependencies> {
  // ...existing `now`/`generateId`/`deviceId`/`shared` and existing repositories unchanged...

  const recurringScheduleRepository = new RecurringScheduleRepository(database);
  const recurringOccurrenceRepository = new RecurringOccurrenceRepository(database);
  const recurringOccurrenceProcessing = new RecurringOccurrenceProcessingRepository(database);
  const notificationScheduler = new RecurringNotificationScheduler();

  return {
    // ...existing returned fields unchanged...
    recurringScheduleRepository,
    recurringOccurrenceRepository,
    recurringOccurrenceProcessing,
    createRecurringExpense: new CreateRecurringExpense({ processing: recurringOccurrenceProcessing, ...shared }),
    confirmRecurringOccurrence: new ConfirmRecurringOccurrence({
      processing: recurringOccurrenceProcessing,
      occurrenceRepository: recurringOccurrenceRepository,
      scheduleRepository: recurringScheduleRepository,
      ...shared,
    }),
    skipRecurringOccurrence: new SkipRecurringOccurrence({
      processing: recurringOccurrenceProcessing,
      occurrenceRepository: recurringOccurrenceRepository,
      ...shared,
    }),
    pauseRecurringSchedule: new PauseRecurringSchedule({ scheduleRepository: recurringScheduleRepository, ...shared }),
    resumeRecurringSchedule: new ResumeRecurringSchedule({ scheduleRepository: recurringScheduleRepository, ...shared }),
    endRecurringSchedule: new EndRecurringSchedule({ scheduleRepository: recurringScheduleRepository, ...shared }),
    updateRecurringSchedule: new UpdateRecurringSchedule({
      scheduleRepository: recurringScheduleRepository,
      occurrenceRepository: recurringOccurrenceRepository,
      ...shared,
    }),
    getRecurringOverview: new GetRecurringOverview({
      scheduleRepository: recurringScheduleRepository,
      occurrenceRepository: recurringOccurrenceRepository,
    }),
    notificationScheduler,
    scanAndScheduleRecurringNotifications: new ScanAndScheduleRecurringNotifications({
      occurrenceRepository: recurringOccurrenceRepository,
      scheduleRepository: recurringScheduleRepository,
      notificationScheduler,
      ...shared,
    }),
    buildWriteContext: (): WriteContext => ({
      originDeviceId: deviceId,
      operationId: generateId(),
      now: now(),
    }),
  };
}
```

- [ ] **Step 2: Type-check and run the full existing finance test suite to confirm nothing regressed**

Run: `npx tsc --noEmit`
Expected: PASS

Run: `npm test -- --runInBand tests/features/finance`
Expected: PASS (no changes to existing finance view-model behavior yet)

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/finance-dependencies.ts
git commit -m "feat: wire recurring expense dependencies into FinanceDependencies"
```

---

### Task 11: "Định kỳ" toggle in the expense form

Matches `design/Finance App.dc.html` lines ~210-227 (`isExpenseType` → `recurringEnabled` block) — recurring setup is only available for new **expense** transactions, never when editing an existing transaction (spec §Tạo lịch từ form thêm chi tiêu).

**Files:**
- Modify: `src/features/finance/view-models/use-transaction-form.ts`
- Modify: `src/components/finance/TransactionFormSheet.tsx`
- Test: `tests/features/finance/use-transaction-form.test.ts` (extend the existing suite — read it first to match its setup/fake-dependency style before adding cases)

**Interfaces:**
- Consumes: `CreateRecurringExpense` from `@/core/application/finance/create-recurring-expense` (Task 7); `RecurringFrequency` from `@/core/domain/finance/recurring-date` (Task 1); `Dropdown` from `@/components/base` (existing).
- Produces:
  - `TransactionFormDependencies` gains `createRecurringExpense: CreateRecurringExpense`.
  - `TransactionFormValues` gains `recurringEnabled: boolean; recurringFrequency: RecurringFrequency; recurringRemindDaysBefore: number; recurringEndMode: 'none' | 'date' | 'count'; recurringEndDate: string; recurringOccurrenceLimit: number | null`.
  - `TransactionFormViewModel` gains `canEnableRecurring: boolean` (true only for a new, non-editing expense) and setters `setRecurringEnabled(enabled: boolean)`, `setRecurringFrequency(frequency: RecurringFrequency)`, `setRecurringRemindDaysBefore(days: number)`, `setRecurringEndMode(mode: 'none' | 'date' | 'count')`, `setRecurringEndDate(date: string)`, `setRecurringOccurrenceLimit(limit: number | null)`.

- [ ] **Step 1: Write the failing view-model tests**

Read `tests/features/finance/use-transaction-form.test.ts` first to copy its exact fake-dependency setup (fake `AccountRepository`/`CategoryRepository`/`TransactionRepository` and `t` stub), then append:

```typescript
// append to tests/features/finance/use-transaction-form.test.ts
import { CreateRecurringExpense } from '@/core/application/finance/create-recurring-expense';

// Reuses this file's existing fake account/category/transaction repositories and `t` stub.
describe('useTransactionForm recurring toggle', () => {
  it('defaults recurringEnabled to false and only allows enabling it for a new expense', async () => {
    const { result } = renderHookWithDependencies(); // existing helper in this test file
    await waitForLoadingToFinish(result); // existing helper in this file

    expect(result.current.values.recurringEnabled).toBe(false);
    expect(result.current.canEnableRecurring).toBe(true);

    act(() => result.current.setType('income'));
    expect(result.current.canEnableRecurring).toBe(false);
  });

  it('creates a recurring schedule instead of a plain transaction when recurringEnabled is true on save', async () => {
    const createRecurringExpense = { execute: jest.fn().mockResolvedValue({ schedule: {}, occurrence: {} }) } as unknown as CreateRecurringExpense;
    const { result } = renderHookWithDependencies({ createRecurringExpense });
    await waitForLoadingToFinish(result);

    act(() => {
      result.current.setAmount(179000);
      result.current.setName('YouTube Premium');
      result.current.setCategoryId(result.current.categories[0].id);
      result.current.setRecurringEnabled(true);
      result.current.setRecurringFrequency('monthly');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(createRecurringExpense.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: expect.objectContaining({ amount: 179000, name: 'YouTube Premium' }),
        recurring: expect.objectContaining({ frequency: 'monthly', remindDaysBefore: 1, endDate: null, occurrenceLimit: null }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/features/finance/use-transaction-form.test.ts`
Expected: FAIL — `canEnableRecurring`/`setRecurringEnabled` undefined on the view model

- [ ] **Step 3: Extend `use-transaction-form.ts`**

```typescript
// src/features/finance/view-models/use-transaction-form.ts — additions
import type { CreateRecurringExpense } from '@/core/application/finance/create-recurring-expense';
import type { RecurringFrequency } from '@/core/domain/finance/recurring-date';

export type TransactionFormDependencies = {
  // ...existing fields...
  createRecurringExpense: CreateRecurringExpense;
};

export type RecurringEndMode = 'none' | 'date' | 'count';

// TransactionFormValues gains:
//   recurringEnabled: boolean;
//   recurringFrequency: RecurringFrequency;
//   recurringRemindDaysBefore: number;
//   recurringEndMode: RecurringEndMode;
//   recurringEndDate: string;
//   recurringOccurrenceLimit: number | null;

function emptyValues(today: string): TransactionFormValues {
  return {
    type: 'expense',
    amount: null,
    name: '',
    accountId: null,
    destinationAccountId: null,
    categoryId: null,
    date: today,
    note: '',
    recurringEnabled: false,
    recurringFrequency: 'monthly',
    recurringRemindDaysBefore: 1,
    recurringEndMode: 'none',
    recurringEndDate: today,
    recurringOccurrenceLimit: null,
  };
}

// Inside useTransactionForm, alongside the existing setters:
const setRecurringEnabled = useCallback(
  (recurringEnabled: boolean) => setValues((current) => ({ ...current, recurringEnabled })),
  [],
);
const setRecurringFrequency = useCallback(
  (recurringFrequency: RecurringFrequency) => setValues((current) => ({ ...current, recurringFrequency })),
  [],
);
const setRecurringRemindDaysBefore = useCallback(
  (recurringRemindDaysBefore: number) => setValues((current) => ({ ...current, recurringRemindDaysBefore })),
  [],
);
const setRecurringEndMode = useCallback(
  (recurringEndMode: RecurringEndMode) => setValues((current) => ({ ...current, recurringEndMode })),
  [],
);
const setRecurringEndDate = useCallback(
  (recurringEndDate: string) => setValues((current) => ({ ...current, recurringEndDate })),
  [],
);
const setRecurringOccurrenceLimit = useCallback(
  (recurringOccurrenceLimit: number | null) => setValues((current) => ({ ...current, recurringOccurrenceLimit })),
  [],
);

// setType must turn recurringEnabled off when leaving `expense` (mirrors the
// existing `setNewTxPositive` behavior in the design prototype):
const setType = useCallback(
  (type: TransactionType) =>
    setValues((current) => ({ ...current, type, recurringEnabled: type === 'expense' ? current.recurringEnabled : false })),
  [],
);

const canEnableRecurring = !transactionId && values.type === 'expense';
```

Inside `submit`, after `validateTransactionInput(input)` succeeds and before the existing `try { ... }` block, branch on whether this is a new recurring expense:

```typescript
setSubmitting(true);
try {
  if (transactionId) {
    await dependencies.updateTransaction.execute(transactionId, input);
  } else if (values.type === 'expense' && values.recurringEnabled) {
    await dependencies.createRecurringExpense.execute({
      transaction: input,
      recurring: {
        displayName: compactName,
        accountId: selectedAccountId as string,
        categoryId: values.categoryId as string,
        amount: values.amount as number,
        frequency: values.recurringFrequency,
        startDate: values.date,
        remindDaysBefore: values.recurringRemindDaysBefore,
        endDate: values.recurringEndMode === 'date' ? values.recurringEndDate : null,
        occurrenceLimit: values.recurringEndMode === 'count' ? values.recurringOccurrenceLimit : null,
        note: values.note.trim() === '' ? null : values.note.trim(),
      },
    });
  } else {
    await dependencies.createTransaction.execute(input);
  }
  onSaved();
} catch (cause) {
  setErrors({ form: cause instanceof Error ? cause.message : t('transactionFormGenericError') });
} finally {
  setSubmitting(false);
}
```

Add every new setter and `canEnableRecurring` to the object returned by the hook.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/features/finance/use-transaction-form.test.ts`
Expected: PASS

- [ ] **Step 5: Extend `TransactionFormSheet.tsx` with the recurring UI**

```typescript
// src/components/finance/TransactionFormSheet.tsx — additions
import { useState } from 'react';
import { Dropdown } from '@/components/base';
import type { RecurringFrequency } from '@/core/domain/finance/recurring-date';
import type { RecurringEndMode } from '@/features/finance/view-models/use-transaction-form';

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  yearly: 'Hàng năm',
};
const END_MODE_LABELS: Record<RecurringEndMode, string> = {
  none: 'Không giới hạn',
  date: 'Đến ngày',
  count: 'Số kỳ',
};

// Inside TransactionFormSheet, after destructuring `props`:
const {
  canEnableRecurring,
  setRecurringEnabled,
  setRecurringFrequency,
  setRecurringRemindDaysBefore,
  setRecurringEndMode,
  setRecurringEndDate,
  setRecurringOccurrenceLimit,
} = props;
const [openDropdown, setOpenDropdown] = useState<'frequency' | 'endMode' | null>(null);

// After the category field, before the note card, when `selectedType === 'expense'`:
{selectedType === 'expense' && canEnableRecurring ? (
  <Card style={styles.recurringCard} testID="recurring-toggle-card">
    <View style={styles.recurringToggleRow}>
      <View style={styles.recurringToggleCopy}>
        <Text style={styles.sectionLabel}>{t('recurringToggleLabel')}</Text>
        <Text style={styles.recurringToggleHint}>
          {values.recurringEnabled ? t('recurringToggleHintOn') : t('recurringToggleHintOff')}
        </Text>
      </View>
      <Switch
        accessibilityLabel={t('recurringToggleLabel')}
        onValueChange={setRecurringEnabled}
        thumbColor={colors.content.inverse}
        trackColor={{ false: colors.surface.muted, true: colors.brand.primary }}
        value={values.recurringEnabled}
      />
    </View>

    {values.recurringEnabled ? (
      <View style={styles.recurringFields}>
        <Dropdown
          fieldLabel={t('recurringFrequencyLabel')}
          onSelect={(key) => {
            setRecurringFrequency(key as RecurringFrequency);
            setOpenDropdown(null);
          }}
          onToggle={() => setOpenDropdown(openDropdown === 'frequency' ? null : 'frequency')}
          open={openDropdown === 'frequency'}
          options={(Object.keys(FREQUENCY_LABELS) as RecurringFrequency[]).map((key) => ({
            key,
            label: FREQUENCY_LABELS[key],
            isActive: key === values.recurringFrequency,
          }))}
          valueLabel={FREQUENCY_LABELS[values.recurringFrequency]}
        />

        <View style={styles.field}>
          <Text style={styles.sectionLabel}>{t('recurringRemindDaysBeforeLabel')}</Text>
          <TextInput
            accessibilityLabel={t('recurringRemindDaysBeforeLabel')}
            inputMode="numeric"
            keyboardType="number-pad"
            onChangeText={(text) => setRecurringRemindDaysBefore(Math.max(0, parseInt(text, 10) || 0))}
            style={styles.recurringNumberInput}
            value={String(values.recurringRemindDaysBefore)}
          />
        </View>

        <Dropdown
          fieldLabel={t('recurringEndLabel')}
          onSelect={(key) => {
            setRecurringEndMode(key as RecurringEndMode);
            setOpenDropdown(null);
          }}
          onToggle={() => setOpenDropdown(openDropdown === 'endMode' ? null : 'endMode')}
          open={openDropdown === 'endMode'}
          options={(Object.keys(END_MODE_LABELS) as RecurringEndMode[]).map((key) => ({
            key,
            label: END_MODE_LABELS[key],
            isActive: key === values.recurringEndMode,
          }))}
          valueLabel={END_MODE_LABELS[values.recurringEndMode]}
        />

        {values.recurringEndMode === 'count' ? (
          <View style={styles.field}>
            <Text style={styles.sectionLabel}>{t('recurringOccurrenceLimitLabel')}</Text>
            <TextInput
              accessibilityLabel={t('recurringOccurrenceLimitLabel')}
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={(text) => setRecurringOccurrenceLimit(parseInt(text, 10) || null)}
              style={styles.recurringNumberInput}
              value={values.recurringOccurrenceLimit ? String(values.recurringOccurrenceLimit) : ''}
            />
          </View>
        ) : null}

        <Text style={styles.recurringNote}>{t('recurringFirstPeriodNote')}</Text>
      </View>
    ) : null}
  </Card>
) : null}
```

Add `Card`, `Switch` to the top-of-file imports and the following styles to the `StyleSheet.create` block: `recurringCard: { marginBottom: spacing[4] }`, `recurringToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] }`, `recurringToggleCopy: { flex: 1 }`, `recurringToggleHint: { color: colors.content.secondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, marginTop: 2 }`, `recurringFields: { marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border.subtle, gap: spacing[1] }`, `recurringNumberInput: { backgroundColor: colors.surface.input, borderColor: colors.border.strong, borderWidth: 1, borderRadius: radius.sm, height: 48, paddingHorizontal: spacing[3], color: colors.content.primary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold }`, `recurringNote: { color: colors.content.secondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, lineHeight: 17, marginTop: spacing[2] }`.

- [ ] **Step 6: Manually verify in the running app**

Run: `npx expo start`, open the app, tap `+` → Chi tiêu, fill amount/category, toggle `Định kỳ`, pick a frequency, save, and confirm a new item appears without affecting income — this is a UI change, so per project convention it must be exercised in the running app, not just asserted by unit tests.

- [ ] **Step 7: Commit**

```bash
git add src/features/finance/view-models/use-transaction-form.ts src/components/finance/TransactionFormSheet.tsx tests/features/finance/use-transaction-form.test.ts
git commit -m "feat: add recurring toggle to the expense form"
```

---

### Task 12: Occurrence handling screens — List, Detail, Scope, Success

Matches `design/Finance App.dc.html`'s `isRecurringList` / `isRecurringDetail` / `isRecurringScope` / `isRecurringSuccess` blocks and `design/All Screens.dc.html`'s "Chi tiêu định kỳ" screen group.

**Files:**
- Create: `src/features/finance/view-models/recurring-presentation.ts`
- Create: `src/features/finance/view-models/use-recurring-occurrences.ts`
- Create: `src/features/finance/screens/recurring-occurrences-screen.tsx`
- Test: `tests/features/finance/recurring-presentation.test.ts`
- Test: `tests/features/finance/use-recurring-occurrences.test.ts`

**Interfaces:**
- Consumes: `GetRecurringOverview`, `ConfirmRecurringOccurrence`, `SkipRecurringOccurrence` (Tasks 7–8); `deriveOccurrenceDisplayStatus` (Task 2); `formatVnd` from `@/core/domain/finance/money`, `formatDateLabel`, `todayIsoDate` from `./transaction-presentation` (existing, reused — no duplicate formatters per `CLAUDE.md` §Component); `Card`, `ListRow`, `PillChip`, `PrimaryButton` from `@/components/base`.
- Produces:
  - `formatFrequencyLabel(frequency: RecurringFrequency, t: Translate): string`
  - `buildOccurrenceListItem(occurrence: RecurringOccurrence, today: string, t: Translate): RecurringOccurrenceListItem` where `RecurringOccurrenceListItem = { id: string; displayName: string; amountLabel: string; scheduledDateLabel: string; metaLabel: string; displayStatus: RecurringOccurrenceDisplayStatus }`
  - `useRecurringOccurrences(options: { dependencies: RecurringOccurrencesDependencies; t: Translate; now?(): Date }): RecurringOccurrencesViewModel`
  - `RecurringOccurrencesScreen(props: RecurringOccurrencesViewModel & { t: Translate; onBack(): void }): JSX.Element`

- [ ] **Step 1: Write the failing presentation tests**

```typescript
// tests/features/finance/recurring-presentation.test.ts
import { buildOccurrenceListItem, formatFrequencyLabel } from '@/features/finance/view-models/recurring-presentation';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { en } from '@/i18n/locales/en';
import { createTranslate } from '@/i18n/translations'; // read this file first to confirm the exact factory name/signature; adjust the import if it differs

const t = createTranslate(en);

const baseOccurrence: RecurringOccurrence = {
  id: 'occurrence-1',
  scheduleId: 'schedule-1',
  scheduledDate: '2026-09-27',
  amount: 179000,
  accountId: 'account-main',
  categoryId: 'category-bills',
  displayName: 'YouTube Premium',
  note: null,
  status: 'pending',
  transactionId: null,
  notifiedAt: null,
  createdAt: '2026-08-27T09:00:00.000Z',
  updatedAt: '2026-08-27T09:00:00.000Z',
  deletedAt: null,
  revision: 1,
  originDeviceId: '550e8400-e29b-41d4-a716-446655440020',
};

describe('formatFrequencyLabel', () => {
  it('formats every frequency', () => {
    expect(formatFrequencyLabel('weekly', t)).toEqual(expect.any(String));
    expect(formatFrequencyLabel('monthly', t)).toEqual(expect.any(String));
    expect(formatFrequencyLabel('quarterly', t)).toEqual(expect.any(String));
    expect(formatFrequencyLabel('yearly', t)).toEqual(expect.any(String));
  });
});

describe('buildOccurrenceListItem', () => {
  it('labels a not-yet-due occurrence as pending', () => {
    const item = buildOccurrenceListItem(baseOccurrence, '2026-09-01', t);
    expect(item).toMatchObject({ id: 'occurrence-1', displayName: 'YouTube Premium', displayStatus: 'pending' });
    expect(item.amountLabel).toContain('179');
  });

  it('labels a past-due pending occurrence as overdue', () => {
    const item = buildOccurrenceListItem(baseOccurrence, '2026-09-28', t);
    expect(item.displayStatus).toBe('overdue');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/features/finance/recurring-presentation.test.ts`
Expected: FAIL with "Cannot find module '@/features/finance/view-models/recurring-presentation'"

- [ ] **Step 3: Implement `recurring-presentation.ts`**

```typescript
// src/features/finance/view-models/recurring-presentation.ts
import { formatVnd } from '@/core/domain/finance/money';
import { RecurringFrequency } from '@/core/domain/finance/recurring-date';
import {
  deriveOccurrenceDisplayStatus,
  RecurringOccurrence,
  RecurringOccurrenceDisplayStatus,
} from '@/core/domain/finance/recurring-occurrence';
import type { Translate } from '@/i18n/translations';

import { formatDateLabel } from './transaction-presentation';

const FREQUENCY_KEYS: Record<RecurringFrequency, string> = {
  weekly: 'recurringFrequencyWeekly',
  monthly: 'recurringFrequencyMonthly',
  quarterly: 'recurringFrequencyQuarterly',
  yearly: 'recurringFrequencyYearly',
};

export function formatFrequencyLabel(frequency: RecurringFrequency, t: Translate): string {
  return t(FREQUENCY_KEYS[frequency]);
}

export type RecurringOccurrenceListItem = {
  id: string;
  displayName: string;
  amountLabel: string;
  scheduledDateLabel: string;
  metaLabel: string;
  displayStatus: RecurringOccurrenceDisplayStatus;
};

/** Builds one row for the "Sắp tới / Quá hạn" list (spec §Cấu trúc màn hình → Kỳ sắp tới / Quá hạn). */
export function buildOccurrenceListItem(
  occurrence: RecurringOccurrence,
  today: string,
  t: Translate,
): RecurringOccurrenceListItem {
  const displayStatus = deriveOccurrenceDisplayStatus(occurrence, today);
  const statusLabel =
    displayStatus === 'overdue' ? t('recurringStatusOverdue') : t('recurringStatusUpcoming');

  return {
    id: occurrence.id,
    displayName: occurrence.displayName,
    amountLabel: formatVnd(occurrence.amount),
    scheduledDateLabel: formatDateLabel(occurrence.scheduledDate),
    metaLabel: `${statusLabel} · ${formatDateLabel(occurrence.scheduledDate)}`,
    displayStatus,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/features/finance/recurring-presentation.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing view-model tests**

```typescript
// tests/features/finance/use-recurring-occurrences.test.ts
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useRecurringOccurrences } from '@/features/finance/view-models/use-recurring-occurrences';
import { en } from '@/i18n/locales/en';
import { createTranslate } from '@/i18n/translations';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';

const t = createTranslate(en);

const schedule: RecurringSchedule = {
  id: 'schedule-1',
  displayName: 'YouTube Premium',
  type: 'expense',
  accountId: 'account-main',
  categoryId: 'category-bills',
  amount: 179000,
  frequency: 'monthly',
  anchorDay: 27,
  startDate: '2026-08-27',
  endDate: null,
  occurrenceLimit: null,
  remindDaysBefore: 1,
  status: 'active',
  firstTransactionId: 'transaction-first',
  note: null,
  generatedCount: 1,
  createdAt: '2026-08-27T09:00:00.000Z',
  updatedAt: '2026-08-27T09:00:00.000Z',
  deletedAt: null,
  revision: 1,
  originDeviceId: '550e8400-e29b-41d4-a716-446655440020',
};

const occurrence: RecurringOccurrence = {
  id: 'occurrence-1',
  scheduleId: 'schedule-1',
  scheduledDate: '2026-09-27',
  amount: 179000,
  accountId: 'account-main',
  categoryId: 'category-bills',
  displayName: 'YouTube Premium',
  note: null,
  status: 'pending',
  transactionId: null,
  notifiedAt: null,
  createdAt: '2026-08-27T09:00:00.000Z',
  updatedAt: '2026-08-27T09:00:00.000Z',
  deletedAt: null,
  revision: 1,
  originDeviceId: '550e8400-e29b-41d4-a716-446655440020',
};

function buildDependencies(overrides?: { confirmResult?: unknown }) {
  return {
    getRecurringOverview: { execute: jest.fn().mockResolvedValue({ dueOccurrences: [occurrence], schedules: [schedule] }) },
    confirmRecurringOccurrence: {
      execute: jest.fn().mockResolvedValue(
        overrides?.confirmResult ?? {
          transactionId: 'transaction-2',
          occurrence: { ...occurrence, status: 'confirmed' },
          schedule,
          nextOccurrence: { ...occurrence, id: 'occurrence-2', scheduledDate: '2026-10-27' },
        },
      ),
    },
    skipRecurringOccurrence: {
      execute: jest.fn().mockResolvedValue({
        occurrence: { ...occurrence, status: 'skipped' },
        schedule,
        nextOccurrence: { ...occurrence, id: 'occurrence-2', scheduledDate: '2026-10-27' },
      }),
    },
  } as const;
}

describe('useRecurringOccurrences', () => {
  it('loads due occurrences into the list view', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() => useRecurringOccurrences({ dependencies: dependencies as never, t }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.view).toBe('list');
  });

  it('opens detail for a selected occurrence', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() => useRecurringOccurrences({ dependencies: dependencies as never, t }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.openDetail('occurrence-1'));

    expect(result.current.view).toBe('detail');
    expect(result.current.selected).toMatchObject({ id: 'occurrence-1', displayName: 'YouTube Premium' });
  });

  it('confirms directly to success when the amount was not edited', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() => useRecurringOccurrences({ dependencies: dependencies as never, t }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openDetail('occurrence-1'));

    await act(async () => {
      await result.current.confirm();
    });

    expect(dependencies.confirmRecurringOccurrence.execute).toHaveBeenCalledWith('occurrence-1', {}, 'this_only');
    expect(result.current.view).toBe('success');
  });

  it('routes to the scope screen when the edited amount differs from the schedule default', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() => useRecurringOccurrences({ dependencies: dependencies as never, t }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openDetail('occurrence-1'));
    act(() => result.current.setEditedAmount(189000));

    await act(async () => {
      await result.current.confirm();
    });

    expect(dependencies.confirmRecurringOccurrence.execute).not.toHaveBeenCalled();
    expect(result.current.view).toBe('scope');

    await act(async () => {
      await result.current.chooseScope('this_and_future');
    });

    expect(dependencies.confirmRecurringOccurrence.execute).toHaveBeenCalledWith(
      'occurrence-1',
      { amount: 189000 },
      'this_and_future',
    );
    expect(result.current.view).toBe('success');
  });

  it('skips an occurrence and returns to the list', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() => useRecurringOccurrences({ dependencies: dependencies as never, t }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openDetail('occurrence-1'));

    await act(async () => {
      await result.current.skip();
    });

    expect(dependencies.skipRecurringOccurrence.execute).toHaveBeenCalledWith('occurrence-1');
    expect(result.current.view).toBe('list');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --runInBand tests/features/finance/use-recurring-occurrences.test.ts`
Expected: FAIL with "Cannot find module '@/features/finance/view-models/use-recurring-occurrences'"

- [ ] **Step 7: Implement `use-recurring-occurrences.ts`**

```typescript
// src/features/finance/view-models/use-recurring-occurrences.ts
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ConfirmRecurringOccurrence } from '@/core/application/finance/confirm-recurring-occurrence';
import type { GetRecurringOverview } from '@/core/application/finance/get-recurring-overview';
import type { SkipRecurringOccurrence } from '@/core/application/finance/skip-recurring-occurrence';
import { formatVnd } from '@/core/domain/finance/money';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';
import type { Translate } from '@/i18n/translations';

import { buildOccurrenceListItem, formatFrequencyLabel, RecurringOccurrenceListItem } from './recurring-presentation';
import { formatDateLabel, todayIsoDate } from './transaction-presentation';

export type RecurringOccurrencesDependencies = {
  getRecurringOverview: GetRecurringOverview;
  confirmRecurringOccurrence: ConfirmRecurringOccurrence;
  skipRecurringOccurrence: SkipRecurringOccurrence;
};

export type RecurringOccurrenceDetail = {
  id: string;
  displayName: string;
  amount: number;
  scheduledDateLabel: string;
  frequencyLabel: string;
  metaLabel: string;
};

export type RecurringOccurrencesViewModel = {
  loading: boolean;
  submitting: boolean;
  view: 'list' | 'detail' | 'scope' | 'success';
  items: RecurringOccurrenceListItem[];
  selected: RecurringOccurrenceDetail | null;
  editedAmount: number | null;
  scopeDiffLabel: string | null;
  successSummary: { amountLabel: string; nextDateLabel: string | null } | null;
  error: string | null;
  openDetail(id: string): void;
  backToList(): void;
  setEditedAmount(amount: number | null): void;
  confirm(): Promise<void>;
  chooseScope(scope: 'this_only' | 'this_and_future'): Promise<void>;
  backToDetailFromScope(): void;
  skip(): Promise<void>;
};

export type UseRecurringOccurrencesOptions = {
  dependencies: RecurringOccurrencesDependencies;
  t: Translate;
  now?: () => Date;
};

export function useRecurringOccurrences({
  dependencies,
  t,
  now,
}: UseRecurringOccurrencesOptions): RecurringOccurrencesViewModel {
  const today = todayIsoDate(now?.() ?? new Date());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [occurrences, setOccurrences] = useState<RecurringOccurrence[]>([]);
  const [schedulesById, setSchedulesById] = useState<Map<string, RecurringSchedule>>(new Map());
  const [view, setView] = useState<'list' | 'detail' | 'scope' | 'success'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editedAmount, setEditedAmountState] = useState<number | null>(null);
  const [successSummary, setSuccessSummary] = useState<{ amountLabel: string; nextDateLabel: string | null } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const overview = await dependencies.getRecurringOverview.execute();
    setOccurrences(overview.dueOccurrences);
    setSchedulesById(new Map(overview.schedules.map((schedule) => [schedule.id, schedule])));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies]);

  useEffect(() => {
    reload();
  }, [reload]);

  const items = useMemo(
    () => occurrences.map((occurrence) => buildOccurrenceListItem(occurrence, today, t)),
    [occurrences, today, t],
  );

  const selectedOccurrence = occurrences.find((occurrence) => occurrence.id === selectedId) ?? null;
  const selectedSchedule = selectedOccurrence ? (schedulesById.get(selectedOccurrence.scheduleId) ?? null) : null;
  const selected: RecurringOccurrenceDetail | null =
    selectedOccurrence && selectedSchedule
      ? {
          id: selectedOccurrence.id,
          displayName: selectedOccurrence.displayName,
          amount: editedAmount ?? selectedOccurrence.amount,
          scheduledDateLabel: formatDateLabel(selectedOccurrence.scheduledDate),
          frequencyLabel: formatFrequencyLabel(selectedSchedule.frequency, t),
          metaLabel: `${formatDateLabel(selectedOccurrence.scheduledDate)} · ${formatFrequencyLabel(selectedSchedule.frequency, t)}`,
        }
      : null;

  const scopeDiffLabel =
    selectedOccurrence && selectedSchedule && editedAmount !== null && editedAmount !== selectedSchedule.amount
      ? t('recurringScopeDiff', { diff: formatVnd(Math.abs(editedAmount - selectedSchedule.amount)) })
      : null;

  const openDetail = useCallback((id: string) => {
    setSelectedId(id);
    setEditedAmountState(null);
    setView('detail');
  }, []);

  const backToList = useCallback(() => {
    setSelectedId(null);
    setEditedAmountState(null);
    setView('list');
  }, []);

  const setEditedAmount = useCallback((amount: number | null) => setEditedAmountState(amount), []);

  const applyConfirm = useCallback(
    async (scope: 'this_only' | 'this_and_future') => {
      if (!selectedOccurrence) {
        return;
      }
      setSubmitting(true);
      try {
        const edits = editedAmount !== null && editedAmount !== selectedOccurrence.amount ? { amount: editedAmount } : {};
        const result = await dependencies.confirmRecurringOccurrence.execute(selectedOccurrence.id, edits, scope);
        setSuccessSummary({
          amountLabel: formatVnd(result.occurrence.amount),
          nextDateLabel: result.nextOccurrence ? formatDateLabel(result.nextOccurrence.scheduledDate) : null,
        });
        setView('success');
        await reload();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t('transactionFormGenericError'));
      } finally {
        setSubmitting(false);
      }
    },
    [dependencies, editedAmount, reload, selectedOccurrence, t],
  );

  const confirm = useCallback(async () => {
    if (scopeDiffLabel) {
      setView('scope');
      return;
    }
    await applyConfirm('this_only');
  }, [applyConfirm, scopeDiffLabel]);

  const chooseScope = useCallback(
    async (scope: 'this_only' | 'this_and_future') => {
      await applyConfirm(scope);
    },
    [applyConfirm],
  );

  const backToDetailFromScope = useCallback(() => setView('detail'), []);

  const skip = useCallback(async () => {
    if (!selectedOccurrence) {
      return;
    }
    setSubmitting(true);
    try {
      await dependencies.skipRecurringOccurrence.execute(selectedOccurrence.id);
      backToList();
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('transactionFormGenericError'));
    } finally {
      setSubmitting(false);
    }
  }, [backToList, dependencies, reload, selectedOccurrence, t]);

  return {
    loading,
    submitting,
    view,
    items,
    selected,
    editedAmount,
    scopeDiffLabel,
    successSummary,
    error,
    openDetail,
    backToList,
    setEditedAmount,
    confirm,
    chooseScope,
    backToDetailFromScope,
    skip,
  };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- --runInBand tests/features/finance/use-recurring-occurrences.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 9: Implement `recurring-occurrences-screen.tsx`**

```typescript
// src/features/finance/screens/recurring-occurrences-screen.tsx
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, Clock } from 'lucide-react-native';

import { Card, IconButton, ListRow, PillChip, PrimaryButton } from '@/components/base';
import type { RecurringOccurrencesViewModel } from '@/features/finance/view-models/use-recurring-occurrences';
import type { Translate } from '@/i18n/translations';
import { colors, radius, spacing, typography } from '@/theme';

type RecurringOccurrencesScreenProps = RecurringOccurrencesViewModel & {
  t: Translate;
  onBack(): void;
  onOpenManagement(): void;
};

export function RecurringOccurrencesScreen({ t, onBack, onOpenManagement, ...vm }: RecurringOccurrencesScreenProps) {
  if (vm.view === 'detail' && vm.selected) {
    return <RecurringDetailView t={t} vm={vm} />;
  }
  if (vm.view === 'scope' && vm.selected) {
    return <RecurringScopeView t={t} vm={vm} />;
  }
  if (vm.view === 'success' && vm.successSummary) {
    return <RecurringSuccessView t={t} vm={vm} onDone={onBack} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel={t('back')}
          icon={<ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />}
          onPress={onBack}
        />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t('recurringListTitle')}</Text>
          <Text style={styles.subtitle}>{t('recurringListSubtitle')}</Text>
        </View>
        <PillChip active={false} label={t('recurringManageAction')} onPress={onOpenManagement} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {vm.items.length === 0 ? (
          <Text style={styles.emptyText}>{t('recurringListEmpty')}</Text>
        ) : (
          <Card padding={4}>
            {vm.items.map((item, index) => (
              <ListRow
                accessibilityLabel={item.displayName}
                key={item.id}
                onPress={() => vm.openDetail(item.id)}
                showDivider={index < vm.items.length - 1}
                subtitle={item.metaLabel}
                title={item.displayName}
                trailing={
                  <View style={styles.trailing}>
                    <Text style={styles.amount}>{item.amountLabel}</Text>
                    <PillChip
                      active={item.displayStatus === 'overdue'}
                      label={item.displayStatus === 'overdue' ? t('recurringStatusOverdue') : t('recurringStatusUpcoming')}
                      onPress={() => vm.openDetail(item.id)}
                    />
                  </View>
                }
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function RecurringDetailView({ t, vm }: { t: Translate; vm: RecurringOccurrencesViewModel }) {
  const selected = vm.selected!;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel={t('back')}
          icon={<ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />}
          onPress={vm.backToList}
        />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{selected.displayName}</Text>
          <Text style={styles.subtitle}>{t('recurringDetailSubtitle')}</Text>
        </View>
      </View>

      <Card style={styles.heroCard}>
        <Text style={styles.heroLabel}>{t('recurringDetailAmountLabel')}</Text>
        <TextInput
          accessibilityLabel={t('recurringDetailAmountLabel')}
          inputMode="numeric"
          keyboardType="number-pad"
          onChangeText={(text) => vm.setEditedAmount(parseInt(text, 10) || null)}
          style={styles.heroAmountInput}
          value={String(vm.editedAmount ?? selected.amount)}
        />
        <Text style={styles.heroMeta}>{selected.metaLabel}</Text>
      </Card>

      <PrimaryButton
        disabled={vm.submitting}
        label={t('recurringConfirmAction')}
        onPress={vm.confirm}
        radius="sm"
        style={styles.actionSpacing}
      />
      <PrimaryButton
        backgroundColor={colors.surface.primary}
        disabled={vm.submitting}
        label={t('recurringSkipAction')}
        textColor={colors.content.primary}
        onPress={vm.skip}
        radius="sm"
      />
    </View>
  );
}

function RecurringScopeView({ t, vm }: { t: Translate; vm: RecurringOccurrencesViewModel }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t('recurringScopeTitle')}</Text>
      <Text style={styles.subtitle}>{vm.scopeDiffLabel}</Text>

      <ListRow
        onPress={() => vm.chooseScope('this_only')}
        showDivider
        subtitle={t('recurringScopeOnlyThisHint')}
        title={t('recurringScopeOnlyThis')}
      />
      <ListRow
        onPress={() => vm.chooseScope('this_and_future')}
        subtitle={t('recurringScopeFutureHint')}
        title={t('recurringScopeFuture')}
      />
      <PrimaryButton
        backgroundColor={colors.surface.primary}
        label={t('recurringScopeBack')}
        textColor={colors.content.primary}
        onPress={vm.backToDetailFromScope}
        radius="sm"
        style={styles.actionSpacing}
      />
    </View>
  );
}

function RecurringSuccessView({
  t,
  vm,
  onDone,
}: {
  t: Translate;
  vm: RecurringOccurrencesViewModel;
  onDone(): void;
}) {
  const summary = vm.successSummary!;
  return (
    <View style={styles.successRoot}>
      <View style={styles.successBadge}>
        <Clock color={colors.status.positive} size={32} strokeWidth={2.4} />
      </View>
      <Text style={styles.title}>{t('recurringSuccessTitle')}</Text>
      <Text style={styles.subtitle}>
        {t('recurringSuccessBody', { amount: summary.amountLabel, nextDate: summary.nextDateLabel ?? t('recurringSuccessNoNext') })}
      </Text>
      <PrimaryButton label={t('recurringSuccessAction')} onPress={onDone} radius="sm" style={styles.actionSpacing} />
    </View>
  );
}

const styles = StyleSheet.create({
  actionSpacing: { marginTop: spacing[3] },
  amount: { color: colors.content.primary, fontSize: typography.sizes.body, fontWeight: typography.weights.black },
  emptyText: { color: colors.content.secondary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, textAlign: 'center', paddingTop: spacing[6] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingTop: 58, paddingHorizontal: spacing[4], marginBottom: spacing[4] },
  headerCopy: { flex: 1 },
  heroAmountInput: { color: colors.content.inverse, fontSize: typography.sizes.title, fontWeight: typography.weights.black, marginVertical: spacing[2] },
  heroCard: { backgroundColor: colors.brand.secondary, marginHorizontal: spacing[4], marginBottom: spacing[4] },
  heroLabel: { color: colors.content.inverse, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, opacity: 0.8 },
  heroMeta: { color: colors.content.inverse, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, opacity: 0.86 },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[6] },
  root: { flex: 1, backgroundColor: colors.surface.canvas, paddingHorizontal: 0 },
  subtitle: { color: colors.content.secondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, marginTop: 2 },
  successBadge: { alignSelf: 'center', width: 72, height: 72, borderRadius: radius.xl, backgroundColor: colors.status.positiveSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] },
  successRoot: { flex: 1, backgroundColor: colors.surface.canvas, paddingTop: 96, paddingHorizontal: spacing[5], alignItems: 'center' },
  title: { color: colors.content.primary, fontSize: typography.sizes.heading, fontWeight: typography.weights.black },
  trailing: { alignItems: 'flex-end', gap: spacing[1] },
});
```

- [ ] **Step 10: Manually verify in the running app**

This screen is not wired into `app/index.tsx` yet (Task 14 does that) — defer manual verification to the end of Task 14, where the full navigation path exists.

- [ ] **Step 11: Commit**

```bash
git add src/features/finance/view-models/recurring-presentation.ts src/features/finance/view-models/use-recurring-occurrences.ts src/features/finance/screens/recurring-occurrences-screen.tsx tests/features/finance/recurring-presentation.test.ts tests/features/finance/use-recurring-occurrences.test.ts
git commit -m "feat: add recurring occurrence list/detail/scope/success screens"
```

---

### Task 13: Schedule management screen — list, detail, pause/resume/end, history

Beyond what `design/Finance App.dc.html`'s prototype renders (which stops at confirm/skip) — required directly by spec §Quản lý định kỳ ("Sửa mẫu... Tạm dừng... Kết thúc... xem lịch sử kỳ đã xác nhận/bỏ qua"). Follows the same full-screen, back-button pattern as `gold-management-screen.tsx`.

**Files:**
- Create: `src/features/finance/view-models/use-recurring-management.ts`
- Create: `src/features/finance/screens/recurring-management-screen.tsx`
- Test: `tests/features/finance/use-recurring-management.test.ts`

**Interfaces:**
- Consumes: `GetRecurringOverview`, `PauseRecurringSchedule`, `ResumeRecurringSchedule`, `EndRecurringSchedule`, `UpdateRecurringSchedule` (Task 8); `RecurringOccurrenceRepository.listByScheduleId` (Task 4/5, for history); `formatFrequencyLabel` (Task 12); `formatVnd`, `formatDateLabel` (existing).
- Produces:
  - `RecurringScheduleListItem = { id: string; displayName: string; amountLabel: string; frequencyLabel: string; statusLabel: string; status: RecurringScheduleStatus }`
  - `RecurringScheduleDetail = { id: string; displayName: string; amount: number; frequencyLabel: string; status: RecurringScheduleStatus; statusLabel: string; history: { id: string; scheduledDateLabel: string; amountLabel: string; statusLabel: string }[] }`
  - `useRecurringManagement(options: { dependencies: RecurringManagementDependencies; t: Translate }): RecurringManagementViewModel`
  - `RecurringManagementScreen(props: RecurringManagementViewModel & { t: Translate; onBack(): void }): JSX.Element`

- [ ] **Step 1: Write the failing view-model tests**

```typescript
// tests/features/finance/use-recurring-management.test.ts
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useRecurringManagement } from '@/features/finance/view-models/use-recurring-management';
import { en } from '@/i18n/locales/en';
import { createTranslate } from '@/i18n/translations';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';

const t = createTranslate(en);

const schedule: RecurringSchedule = {
  id: 'schedule-1',
  displayName: 'YouTube Premium',
  type: 'expense',
  accountId: 'account-main',
  categoryId: 'category-bills',
  amount: 179000,
  frequency: 'monthly',
  anchorDay: 27,
  startDate: '2026-08-27',
  endDate: null,
  occurrenceLimit: null,
  remindDaysBefore: 1,
  status: 'active',
  firstTransactionId: 'transaction-first',
  note: null,
  generatedCount: 2,
  createdAt: '2026-08-27T09:00:00.000Z',
  updatedAt: '2026-08-27T09:00:00.000Z',
  deletedAt: null,
  revision: 1,
  originDeviceId: '550e8400-e29b-41d4-a716-446655440020',
};

const confirmedOccurrence: RecurringOccurrence = {
  id: 'occurrence-1',
  scheduleId: 'schedule-1',
  scheduledDate: '2026-09-27',
  amount: 179000,
  accountId: 'account-main',
  categoryId: 'category-bills',
  displayName: 'YouTube Premium',
  note: null,
  status: 'confirmed',
  transactionId: 'transaction-2',
  notifiedAt: null,
  createdAt: '2026-08-27T09:00:00.000Z',
  updatedAt: '2026-09-27T08:00:00.000Z',
  deletedAt: null,
  revision: 2,
  originDeviceId: '550e8400-e29b-41d4-a716-446655440020',
};

function buildDependencies() {
  return {
    getRecurringOverview: { execute: jest.fn().mockResolvedValue({ dueOccurrences: [], schedules: [schedule] }) },
    occurrenceRepository: { listByScheduleId: jest.fn().mockResolvedValue([confirmedOccurrence]) },
    pauseRecurringSchedule: { execute: jest.fn().mockResolvedValue({ ...schedule, status: 'paused' }) },
    resumeRecurringSchedule: { execute: jest.fn().mockResolvedValue({ ...schedule, status: 'active' }) },
    endRecurringSchedule: { execute: jest.fn().mockResolvedValue({ ...schedule, status: 'ended' }) },
    updateRecurringSchedule: { execute: jest.fn().mockResolvedValue({ ...schedule, amount: 199000 }) },
  } as const;
}

describe('useRecurringManagement', () => {
  it('lists every schedule', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() => useRecurringManagement({ dependencies: dependencies as never, t }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({ id: 'schedule-1', status: 'active' });
  });

  it('opens a schedule detail with its confirmed/skipped history', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() => useRecurringManagement({ dependencies: dependencies as never, t }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openDetail('schedule-1');
    });

    expect(result.current.selected).toMatchObject({ id: 'schedule-1', displayName: 'YouTube Premium' });
    expect(result.current.selected?.history).toHaveLength(1);
  });

  it('pauses, resumes and ends the selected schedule', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() => useRecurringManagement({ dependencies: dependencies as never, t }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.openDetail('schedule-1');
    });

    await act(async () => {
      await result.current.pause();
    });
    expect(dependencies.pauseRecurringSchedule.execute).toHaveBeenCalledWith('schedule-1');

    await act(async () => {
      await result.current.resume();
    });
    expect(dependencies.resumeRecurringSchedule.execute).toHaveBeenCalledWith('schedule-1');

    await act(async () => {
      await result.current.end();
    });
    expect(dependencies.endRecurringSchedule.execute).toHaveBeenCalledWith('schedule-1');
  });

  it('updates the selected schedule amount', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() => useRecurringManagement({ dependencies: dependencies as never, t }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.openDetail('schedule-1');
    });

    await act(async () => {
      await result.current.updateAmount(199000);
    });

    expect(dependencies.updateRecurringSchedule.execute).toHaveBeenCalledWith('schedule-1', { amount: 199000 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/features/finance/use-recurring-management.test.ts`
Expected: FAIL with "Cannot find module '@/features/finance/view-models/use-recurring-management'"

- [ ] **Step 3: Implement `use-recurring-management.ts`**

```typescript
// src/features/finance/view-models/use-recurring-management.ts
import { useCallback, useEffect, useState } from 'react';

import type { EndRecurringSchedule, PauseRecurringSchedule, ResumeRecurringSchedule, UpdateRecurringSchedule } from '@/core/application/finance/manage-recurring-schedule';
import type { GetRecurringOverview } from '@/core/application/finance/get-recurring-overview';
import type { RecurringOccurrenceRepository } from '@/core/application/ports/recurring-repositories';
import { formatVnd } from '@/core/domain/finance/money';
import { RecurringSchedule, RecurringScheduleStatus } from '@/core/domain/finance/recurring-schedule';
import type { Translate } from '@/i18n/translations';

import { formatFrequencyLabel } from './recurring-presentation';
import { formatDateLabel } from './transaction-presentation';

export type RecurringManagementDependencies = {
  getRecurringOverview: GetRecurringOverview;
  occurrenceRepository: Pick<RecurringOccurrenceRepository, 'listByScheduleId'>;
  pauseRecurringSchedule: PauseRecurringSchedule;
  resumeRecurringSchedule: ResumeRecurringSchedule;
  endRecurringSchedule: EndRecurringSchedule;
  updateRecurringSchedule: UpdateRecurringSchedule;
};

export type RecurringScheduleListItem = {
  id: string;
  displayName: string;
  amountLabel: string;
  frequencyLabel: string;
  status: RecurringScheduleStatus;
  statusLabel: string;
};

export type RecurringScheduleDetail = {
  id: string;
  displayName: string;
  amount: number;
  frequencyLabel: string;
  status: RecurringScheduleStatus;
  statusLabel: string;
  history: { id: string; scheduledDateLabel: string; amountLabel: string; statusLabel: string }[];
};

export type RecurringManagementViewModel = {
  loading: boolean;
  submitting: boolean;
  items: RecurringScheduleListItem[];
  selected: RecurringScheduleDetail | null;
  openDetail(id: string): Promise<void>;
  closeDetail(): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  end(): Promise<void>;
  updateAmount(amount: number): Promise<void>;
};

const STATUS_KEYS: Record<RecurringScheduleStatus, string> = {
  active: 'recurringScheduleStatusActive',
  paused: 'recurringScheduleStatusPaused',
  ended: 'recurringScheduleStatusEnded',
};

function toListItem(schedule: RecurringSchedule, t: Translate): RecurringScheduleListItem {
  return {
    id: schedule.id,
    displayName: schedule.displayName,
    amountLabel: formatVnd(schedule.amount),
    frequencyLabel: formatFrequencyLabel(schedule.frequency, t),
    status: schedule.status,
    statusLabel: t(STATUS_KEYS[schedule.status]),
  };
}

export function useRecurringManagement({
  dependencies,
  t,
}: {
  dependencies: RecurringManagementDependencies;
  t: Translate;
}): RecurringManagementViewModel {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<RecurringScheduleDetail['history']>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    const overview = await dependencies.getRecurringOverview.execute();
    setSchedules(overview.schedules);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies]);

  useEffect(() => {
    reload();
  }, [reload]);

  const items = schedules.map((schedule) => toListItem(schedule, t));
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedId) ?? null;
  const selected: RecurringScheduleDetail | null = selectedSchedule
    ? {
        id: selectedSchedule.id,
        displayName: selectedSchedule.displayName,
        amount: selectedSchedule.amount,
        frequencyLabel: formatFrequencyLabel(selectedSchedule.frequency, t),
        status: selectedSchedule.status,
        statusLabel: t(STATUS_KEYS[selectedSchedule.status]),
        history,
      }
    : null;

  const openDetail = useCallback(
    async (id: string) => {
      setSelectedId(id);
      const occurrences = await dependencies.occurrenceRepository.listByScheduleId(id);
      setHistory(
        occurrences
          .filter((occurrence) => occurrence.status === 'confirmed' || occurrence.status === 'skipped')
          .map((occurrence) => ({
            id: occurrence.id,
            scheduledDateLabel: formatDateLabel(occurrence.scheduledDate),
            amountLabel: formatVnd(occurrence.amount),
            statusLabel: t(occurrence.status === 'confirmed' ? 'recurringStatusConfirmed' : 'recurringStatusSkipped'),
          })),
      );
    },
    [dependencies],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setHistory([]);
  }, []);

  const pause = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await dependencies.pauseRecurringSchedule.execute(selectedId);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }, [dependencies, reload, selectedId]);

  const resume = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await dependencies.resumeRecurringSchedule.execute(selectedId);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }, [dependencies, reload, selectedId]);

  const end = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await dependencies.endRecurringSchedule.execute(selectedId);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }, [dependencies, reload, selectedId]);

  const updateAmount = useCallback(
    async (amount: number) => {
      if (!selectedId) return;
      setSubmitting(true);
      try {
        await dependencies.updateRecurringSchedule.execute(selectedId, { amount });
        await reload();
      } finally {
        setSubmitting(false);
      }
    },
    [dependencies, reload, selectedId],
  );

  return { loading, submitting, items, selected, openDetail, closeDetail, pause, resume, end, updateAmount };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/features/finance/use-recurring-management.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Implement `recurring-management-screen.tsx`**

Read `src/features/gold/screens/gold-management-screen.tsx` first to match its exact full-screen/back-button/header layout, then build an analogous list+detail screen:

```typescript
// src/features/finance/screens/recurring-management-screen.tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { Card, IconButton, ListRow, PillChip, PrimaryButton } from '@/components/base';
import type { RecurringManagementViewModel } from '@/features/finance/view-models/use-recurring-management';
import type { Translate } from '@/i18n/translations';
import { colors, spacing, typography } from '@/theme';

type RecurringManagementScreenProps = RecurringManagementViewModel & { t: Translate; onBack(): void };

export function RecurringManagementScreen({ t, onBack, ...vm }: RecurringManagementScreenProps) {
  if (vm.selected) {
    return <RecurringScheduleDetailView t={t} vm={vm} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel={t('back')}
          icon={<ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />}
          onPress={onBack}
        />
        <Text style={styles.title}>{t('recurringManagementTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {vm.items.length === 0 ? (
          <Text style={styles.emptyText}>{t('recurringManagementEmpty')}</Text>
        ) : (
          <Card padding={4}>
            {vm.items.map((item, index) => (
              <ListRow
                key={item.id}
                onPress={() => vm.openDetail(item.id)}
                showDivider={index < vm.items.length - 1}
                subtitle={`${item.frequencyLabel} · ${item.statusLabel}`}
                title={item.displayName}
                trailing={<Text style={styles.amount}>{item.amountLabel}</Text>}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function RecurringScheduleDetailView({ t, vm }: { t: Translate; vm: RecurringManagementViewModel }) {
  const selected = vm.selected!;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel={t('back')}
          icon={<ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />}
          onPress={vm.closeDetail}
        />
        <Text style={styles.title}>{selected.displayName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Card style={styles.summaryCard}>
          <Text style={styles.amount}>{`${selected.amount}`}</Text>
          <Text style={styles.meta}>{`${selected.frequencyLabel}`}</Text>
          <PillChip active label={selected.statusLabel} onPress={() => {}} />
        </Card>

        <View style={styles.actionRow}>
          {selected.status === 'active' ? (
            <PrimaryButton
              disabled={vm.submitting}
              label={t('recurringPauseAction')}
              onPress={vm.pause}
              radius="sm"
              style={styles.actionButton}
            />
          ) : selected.status === 'paused' ? (
            <PrimaryButton
              disabled={vm.submitting}
              label={t('recurringResumeAction')}
              onPress={vm.resume}
              radius="sm"
              style={styles.actionButton}
            />
          ) : null}
          {selected.status !== 'ended' ? (
            <PrimaryButton
              backgroundColor={colors.status.negativeSoft}
              disabled={vm.submitting}
              label={t('recurringEndAction')}
              onPress={vm.end}
              radius="sm"
              style={styles.actionButton}
              textColor={colors.status.negative}
            />
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>{t('recurringHistoryTitle')}</Text>
        {selected.history.length === 0 ? (
          <Text style={styles.emptyText}>{t('recurringHistoryEmpty')}</Text>
        ) : (
          <Card padding={4}>
            {selected.history.map((entry, index) => (
              <ListRow
                key={entry.id}
                showDivider={index < selected.history.length - 1}
                subtitle={entry.statusLabel}
                title={entry.scheduledDateLabel}
                trailing={<Text style={styles.amount}>{entry.amountLabel}</Text>}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] },
  amount: { color: colors.content.primary, fontSize: typography.sizes.body, fontWeight: typography.weights.black },
  emptyText: { color: colors.content.secondary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, textAlign: 'center', paddingTop: spacing[6] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingTop: 58, paddingHorizontal: spacing[4], marginBottom: spacing[4] },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[6], gap: spacing[3] },
  meta: { color: colors.content.secondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, marginBottom: spacing[2] },
  sectionLabel: { color: colors.content.muted, fontSize: typography.sizes.small, fontWeight: typography.weights.black, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: spacing[2] },
  summaryCard: { marginBottom: spacing[4] },
  title: { color: colors.content.primary, fontSize: typography.sizes.heading, fontWeight: typography.weights.black },
});
```

- [ ] **Step 6: Commit**

```bash
git add src/features/finance/view-models/use-recurring-management.ts src/features/finance/screens/recurring-management-screen.tsx tests/features/finance/use-recurring-management.test.ts
git commit -m "feat: add recurring schedule management screen"
```

---

### Task 14: App wiring — navigation, Settings entry point, startup notification scan

**Files:**
- Modify: `src/app/index.tsx`
- Modify: `src/features/finance/screens/settings-screen.tsx`

**Interfaces:**
- Consumes: `RecurringOccurrencesScreen` (Task 12), `useRecurringOccurrences` (Task 12), `RecurringManagementScreen` (Task 13), `useRecurringManagement` (Task 13), `FinanceDependencies` (Task 10, already threaded through `ConfiguredFinanceScreen`).
- Produces: two new `FinanceView` variants (`'recurring'`, `'recurringManagement'`), a `settingsManageRecurring`-labelled row in Settings, and a call to `scanAndScheduleRecurringNotifications.execute()` on app start.

- [ ] **Step 1: Add the two `FinanceView` variants and their branches**

Read `src/app/index.tsx` in full first (it is already reproduced in this plan's research notes above) so the edit lands in the right spots — the `FinanceView` union declaration (~line 34-41), the `ConfiguredFinanceScreen` `if (view.name === 'gold') { ... }` branch (~line 232), and the `SettingsScreen` `onOpenGoldManagement` wiring (~line 300):

```typescript
// src/app/index.tsx — additions
import { RecurringOccurrencesScreen } from '@/features/finance/screens/recurring-occurrences-screen';
import { RecurringManagementScreen } from '@/features/finance/screens/recurring-management-screen';
import { useRecurringOccurrences } from '@/features/finance/view-models/use-recurring-occurrences';
import { useRecurringManagement } from '@/features/finance/view-models/use-recurring-management';

type FinanceView =
  // ...existing variants...
  | { name: 'gold' }
  | { name: 'recurring' }
  | { name: 'recurringManagement' };
```

Inside `ConfiguredFinanceScreen`, alongside the existing `if (view.name === 'gold') { ... }` branch:

```typescript
if (view.name === 'recurring') {
  return (
    <ConfiguredRecurringOccurrencesScreen
      dependencies={dependencies}
      onBack={() => setView({ name: 'settings' })}
      onOpenManagement={() => setView({ name: 'recurringManagement' })}
      t={t}
    />
  );
}
if (view.name === 'recurringManagement') {
  return (
    <ConfiguredRecurringManagementScreen dependencies={dependencies} onBack={() => setView({ name: 'recurring' })} t={t} />
  );
}
```

Add the two configured wrapper components near `ConfiguredGoldManagementScreen`:

```typescript
function ConfiguredRecurringOccurrencesScreen({
  dependencies,
  onBack,
  onOpenManagement,
  t,
}: {
  dependencies: FinanceDependencies;
  onBack(): void;
  onOpenManagement(): void;
  t: Translate;
}) {
  const viewModel = useRecurringOccurrences({ dependencies, t });
  return <RecurringOccurrencesScreen {...viewModel} onBack={onBack} onOpenManagement={onOpenManagement} t={t} />;
}

function ConfiguredRecurringManagementScreen({
  dependencies,
  onBack,
  t,
}: {
  dependencies: FinanceDependencies;
  onBack(): void;
  t: Translate;
}) {
  const viewModel = useRecurringManagement({ dependencies, t });
  return <RecurringManagementScreen {...viewModel} onBack={onBack} t={t} />;
}
```

- [ ] **Step 2: Add the Settings row**

```typescript
// src/features/finance/screens/settings-screen.tsx — additions
import { Repeat } from 'lucide-react-native';

type SettingsScreenProps = SettingsViewModel & {
  // ...existing props...
  onOpenRecurring?: () => void;
};

// Inside the "Cài đặt ứng dụng" <Section>, immediately after the
// `settingsAccountsAndCategories` Row (matches design/Finance App.dc.html's
// row order):
<Row
  accessibilityLabel={t('settingsManageRecurring')}
  badgeColor={colors.brand.primary}
  icon={<Repeat color={colors.content.inverse} size={20} strokeWidth={1.8} />}
  label={t('settingsManageRecurring')}
  onPress={onOpenRecurring}
/>
```

Thread `onOpenRecurring={() => setView({ name: 'recurring' })}` through wherever `SettingsScreen` is rendered in `src/app/index.tsx`, mirroring the existing `onOpenGoldManagement={() => setView({ name: 'gold' })}`.

- [ ] **Step 3: Scan and schedule notifications on app start**

Read the `useEffect` in `RootScreen` (`src/app/index.tsx`) that calls `createFinanceDependencies(database)` and stores the result. Immediately after it resolves, fire the scan without blocking the splash screen:

```typescript
const financeDependencies = await createFinanceDependencies(database);
setDependencies(financeDependencies);
financeDependencies.notificationScheduler
  .requestPermissions()
  .then((granted) => {
    if (granted) {
      return financeDependencies.scanAndScheduleRecurringNotifications.execute();
    }
  })
  .catch(() => {
    // Best-effort: notification failures never block the app (spec §Xử lý lỗi — "Thông báo thất bại: kỳ vẫn hiển thị trong app; thử gửi lại khi mở app").
  });
```

- [ ] **Step 4: Add the i18n keys this task introduces**

`settingsManageRecurring`, `recurringManageAction` — add both to `src/i18n/locales/vi.ts` and `src/i18n/locales/en.ts` now (Task 15 covers the rest of the recurring feature's strings and its coverage test).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Manually verify in the running app**

Run: `npx expo start`. From Cài đặt, tap "Chi tiêu định kỳ" and confirm the list screen opens; from there open a due occurrence, confirm it, and verify the success screen shows the correct next date; tap "Quản lý lịch" and confirm pause/resume/end work on the schedule just created.

- [ ] **Step 7: Commit**

```bash
git add src/app/index.tsx src/features/finance/screens/settings-screen.tsx src/features/finance/screens/recurring-occurrences-screen.tsx src/i18n/locales/vi.ts src/i18n/locales/en.ts
git commit -m "feat: wire recurring expense screens into navigation and settings"
```

---

### Task 15: i18n keys and coverage test

**Files:**
- Modify: `src/i18n/locales/vi.ts`
- Modify: `src/i18n/locales/en.ts`
- Create: `tests/i18n/recurring-component-keys.test.ts`

First check whether a `back` key already exists in both locale files (it is used by `IconButton` throughout this plan's screens, e.g. Task 12/13's `t('back')`); if it doesn't exist yet, add it too (`"Quay lại"` / `"Back"`) and include it in the coverage list below.

- [ ] **Step 1: Write the failing coverage test**

```typescript
// tests/i18n/recurring-component-keys.test.ts
import { en } from '@/i18n/locales/en';
import { vi } from '@/i18n/locales/vi';

const recurringKeys = [
  'settingsManageRecurring',
  'recurringManageAction',
  'recurringToggleLabel',
  'recurringToggleHintOn',
  'recurringToggleHintOff',
  'recurringFrequencyLabel',
  'recurringFrequencyWeekly',
  'recurringFrequencyMonthly',
  'recurringFrequencyQuarterly',
  'recurringFrequencyYearly',
  'recurringRemindDaysBeforeLabel',
  'recurringEndLabel',
  'recurringOccurrenceLimitLabel',
  'recurringFirstPeriodNote',
  'recurringStatusOverdue',
  'recurringStatusUpcoming',
  'recurringStatusConfirmed',
  'recurringStatusSkipped',
  'recurringListTitle',
  'recurringListSubtitle',
  'recurringListEmpty',
  'recurringDetailSubtitle',
  'recurringDetailAmountLabel',
  'recurringConfirmAction',
  'recurringSkipAction',
  'recurringScopeTitle',
  'recurringScopeOnlyThis',
  'recurringScopeOnlyThisHint',
  'recurringScopeFuture',
  'recurringScopeFutureHint',
  'recurringScopeBack',
  'recurringScopeDiff',
  'recurringSuccessTitle',
  'recurringSuccessBody',
  'recurringSuccessNoNext',
  'recurringSuccessAction',
  'recurringManagementTitle',
  'recurringManagementEmpty',
  'recurringScheduleStatusActive',
  'recurringScheduleStatusPaused',
  'recurringScheduleStatusEnded',
  'recurringPauseAction',
  'recurringResumeAction',
  'recurringEndAction',
  'recurringHistoryTitle',
  'recurringHistoryEmpty',
] as const;

describe('recurring expense component translations', () => {
  it.each(recurringKeys)('defines %s in every locale', (key) => {
    expect(en[key]).toEqual(expect.any(String));
    expect(vi[key]).toEqual(expect.any(String));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/i18n/recurring-component-keys.test.ts`
Expected: FAIL — every key undefined

- [ ] **Step 3: Add the Vietnamese strings**

```typescript
// src/i18n/locales/vi.ts — additions
settingsManageRecurring: 'Chi tiêu định kỳ',
recurringManageAction: 'Quản lý lịch',
recurringToggleLabel: 'Định kỳ',
recurringToggleHintOn: 'Đang tạo lịch cho các kỳ tiếp theo',
recurringToggleHintOff: 'Tắt · Lưu như giao dịch bình thường',
recurringFrequencyLabel: 'Chu kỳ',
recurringFrequencyWeekly: 'Hàng tuần',
recurringFrequencyMonthly: 'Hàng tháng',
recurringFrequencyQuarterly: 'Hàng quý',
recurringFrequencyYearly: 'Hàng năm',
recurringRemindDaysBeforeLabel: 'Nhắc trước (ngày)',
recurringEndLabel: 'Kết thúc',
recurringOccurrenceLimitLabel: 'Số kỳ',
recurringFirstPeriodNote: 'Giao dịch này là kỳ đầu tiên. Các kỳ sau chỉ ảnh hưởng số dư khi bạn xác nhận.',
recurringStatusOverdue: 'Quá hạn',
recurringStatusUpcoming: 'Sắp tới',
recurringStatusConfirmed: 'Đã xác nhận',
recurringStatusSkipped: 'Đã bỏ qua',
recurringListTitle: 'Chi tiêu định kỳ',
recurringListSubtitle: 'Kỳ dự kiến không tính vào số dư',
recurringListEmpty: 'Chưa có kỳ nào sắp tới hoặc quá hạn.',
recurringDetailSubtitle: 'Kỳ chi dự kiến',
recurringDetailAmountLabel: 'Số tiền dự kiến',
recurringConfirmAction: 'Xác nhận đã chi',
recurringSkipAction: 'Bỏ qua kỳ này',
recurringScopeTitle: 'Áp dụng thay đổi thế nào?',
recurringScopeOnlyThis: 'Chỉ kỳ này',
recurringScopeOnlyThisHint: 'Chỉ ghi nhận giao dịch này, các kỳ sau vẫn theo lịch cũ.',
recurringScopeFuture: 'Kỳ này và các kỳ sau',
recurringScopeFutureHint: 'Ghi nhận kỳ này và cập nhật lịch cho các kỳ tiếp theo.',
recurringScopeBack: 'Quay lại chỉnh sửa',
recurringScopeDiff: 'Số tiền kỳ này khác {diff} so với lịch hiện tại.',
recurringSuccessTitle: 'Đã xác nhận khoản chi',
recurringSuccessBody: '{amount} đã được ghi vào giao dịch. Kỳ tiếp theo là {nextDate}.',
recurringSuccessNoNext: 'không có (lịch đã kết thúc)',
recurringSuccessAction: 'Về danh sách định kỳ',
recurringManagementTitle: 'Quản lý định kỳ',
recurringManagementEmpty: 'Chưa có lịch định kỳ nào.',
recurringScheduleStatusActive: 'Đang chạy',
recurringScheduleStatusPaused: 'Tạm dừng',
recurringScheduleStatusEnded: 'Đã kết thúc',
recurringPauseAction: 'Tạm dừng',
recurringResumeAction: 'Bật lại',
recurringEndAction: 'Kết thúc',
recurringHistoryTitle: 'Lịch sử kỳ',
recurringHistoryEmpty: 'Chưa có kỳ nào được xác nhận hoặc bỏ qua.',
```

- [ ] **Step 4: Add the English strings**

```typescript
// src/i18n/locales/en.ts — additions
settingsManageRecurring: 'Recurring expenses',
recurringManageAction: 'Manage schedules',
recurringToggleLabel: 'Recurring',
recurringToggleHintOn: 'Creating a schedule for future periods',
recurringToggleHintOff: 'Off · Saves as a regular transaction',
recurringFrequencyLabel: 'Frequency',
recurringFrequencyWeekly: 'Weekly',
recurringFrequencyMonthly: 'Monthly',
recurringFrequencyQuarterly: 'Quarterly',
recurringFrequencyYearly: 'Yearly',
recurringRemindDaysBeforeLabel: 'Remind before (days)',
recurringEndLabel: 'Ends',
recurringOccurrenceLimitLabel: 'Number of periods',
recurringFirstPeriodNote: 'This transaction is period 1. Future periods only affect your balance once you confirm them.',
recurringStatusOverdue: 'Overdue',
recurringStatusUpcoming: 'Upcoming',
recurringStatusConfirmed: 'Confirmed',
recurringStatusSkipped: 'Skipped',
recurringListTitle: 'Recurring expenses',
recurringListSubtitle: "Upcoming periods don't affect your balance",
recurringListEmpty: 'No upcoming or overdue periods yet.',
recurringDetailSubtitle: 'Upcoming period',
recurringDetailAmountLabel: 'Expected amount',
recurringConfirmAction: 'Confirm payment',
recurringSkipAction: 'Skip this period',
recurringScopeTitle: 'How should this change apply?',
recurringScopeOnlyThis: 'Only this period',
recurringScopeOnlyThisHint: 'Only records this transaction; future periods keep the old schedule.',
recurringScopeFuture: 'This and future periods',
recurringScopeFutureHint: 'Records this period and updates the schedule for future periods.',
recurringScopeBack: 'Back to edit',
recurringScopeDiff: 'This period differs by {diff} from the current schedule.',
recurringSuccessTitle: 'Expense confirmed',
recurringSuccessBody: '{amount} was recorded as a transaction. The next period is {nextDate}.',
recurringSuccessNoNext: 'none (schedule ended)',
recurringSuccessAction: 'Back to recurring list',
recurringManagementTitle: 'Manage recurring',
recurringManagementEmpty: 'No recurring schedules yet.',
recurringScheduleStatusActive: 'Active',
recurringScheduleStatusPaused: 'Paused',
recurringScheduleStatusEnded: 'Ended',
recurringPauseAction: 'Pause',
recurringResumeAction: 'Resume',
recurringEndAction: 'End',
recurringHistoryTitle: 'Period history',
recurringHistoryEmpty: 'No confirmed or skipped periods yet.',
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --runInBand tests/i18n/recurring-component-keys.test.ts`
Expected: PASS (45 tests)

- [ ] **Step 6: Run the full test suite and lint**

Run: `npm test`
Expected: PASS (every existing suite plus every new one added in this plan)

Run: `npx expo lint`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/i18n/locales/vi.ts src/i18n/locales/en.ts tests/i18n/recurring-component-keys.test.ts
git commit -m "feat: add i18n keys for the recurring expense feature"
```

---

## Verification Matrix

| Spec acceptance criterion (§Kiểm thử chấp nhận) | Covered by |
|---|---|
| Tạo chi tiêu + bật định kỳ → giao dịch thật kỳ 1 + mẫu + một kỳ dự kiến `pending` kế tiếp | Task 6 `createFirstPeriod` tests; Task 7 `CreateRecurringExpense` test |
| Xác nhận kỳ dự kiến → giao dịch thật, số dư/báo cáo cập nhật, sinh đúng một kỳ tiếp theo | Task 6 `confirmOccurrence` tests; Task 7 `ConfirmRecurringOccurrence` test |
| Bỏ qua kỳ → không ảnh hưởng số dư, sinh kỳ tiếp theo | Task 6 `skipOccurrence` test; Task 7 `SkipRecurringOccurrence` test |
| Kỳ quá hạn → trạng thái `overdue`, vẫn xác nhận/bỏ qua được | Task 2 `deriveOccurrenceDisplayStatus` tests; Task 6 confirm/skip tests never check stored status, only `pending`, matching that overdue is derived, not a blocking state |
| Chỉnh kỳ rồi xác nhận khác mẫu → hỏi `Chỉ kỳ này` / `Kỳ này và các kỳ sau` đúng hành vi | Task 12 `useRecurringOccurrences` scope-routing tests |
| `Kỳ này và các kỳ sau` cập nhật mẫu; kỳ tiếp theo sinh theo mẫu mới | Task 6 `confirmOccurrence` "this_and_future" test |
| Tạm dừng / kết thúc → không sinh kỳ mới; lịch sử giao dịch thật giữ nguyên | Task 6 paused-schedule test; Task 8 pause/resume/end tests |
| Ngày neo 31 hàng tháng → các tháng thiếu ngày dùng ngày cuối tháng đúng quy tắc | Task 1 `computeNextOccurrenceDate` tests (31/01→28/02→31/03→30/04, leap year 29/02) |
| Giao dịch dự kiến không tính vào số dư và báo cáo | Structural: `RecurringOccurrence` never writes to the `transactions` table (Task 6); only `confirmOccurrence` does |
| Thông báo theo `remindDaysBefore` từng lịch; không gửi trùng | Task 9 `ScanAndScheduleRecurringNotifications` tests |
| Đạt `endDate` hoặc `occurrenceLimit` → mẫu `ended`, không sinh thêm kỳ | Task 1 `isBeyondScheduleLimit` tests; Task 6 occurrenceLimit test |
| Tạo lịch, xác nhận, bỏ qua và change log cùng commit hoặc cùng rollback | Task 6: every write path is one `database.db.transaction(...)` call |

## Self-Review Notes

- **Spec coverage**: every §Kiểm thử chấp nhận line maps to a task above; §Cấu trúc màn hình's four areas (form toggle, transaction badges, kỳ sắp tới/quá hạn, quản lý định kỳ) map to Tasks 11, (existing transaction list is unaffected since occurrences never enter it), 12, and 13 respectively.
- **Placeholder scan**: no `TODO`/`TBD`/"handle appropriately" language; every step has runnable code or an exact command.
- **Type consistency**: `RecurringOccurrenceProcessing`'s three methods (Task 4) are implemented by exactly one class (Task 6) and consumed by exactly three use cases (Task 7); `RecurringScheduleRepository`/`RecurringOccurrenceRepository` (Task 4) are implemented once (Task 5) and consumed by Tasks 7, 8, 9, 12, 13 with matching method names (`findById`, `list`, `update`, `findActiveByScheduleId`, `listByStatus`, `listByScheduleId`, `markNotified`) throughout.
- **Known follow-ups explicitly deferred** (see Global Constraints / Out of Scope): sync-engine entity-adapter registration for the two new tables; the "Xóa giao dịch kỳ đầu" guidance banner.
