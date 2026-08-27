# Personal Gold Tracking MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the local-first core CRUD backend and screen wiring for personal nhẫn trơn 9999 gold tracking — purchase lots, one-lot-per-sale sell transactions, a reusable brand catalog, and trash/restore/purge — matching the already-built UI prototype in `design/Finance App.gold-management.dc.html`.

**Architecture:** Follow the existing hexagonal layering used by the finance feature: pure domain types/validation in `src/core/domain/gold`, use cases + repository ports in `src/core/application/gold` and `src/core/application/ports`, Drizzle+SQLite schema/repositories in `src/data/local`, and React Native screens/view-models in `src/features/gold`, composed by a `gold-dependencies.ts` root mirroring `finance-dependencies.ts`. Every business write (create, soft-delete, restore, purge) is paired with a `SyncOperation` appended to the shared `change_log` table inside one `database.db.transaction(...)` callback.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.9, Drizzle ORM + Expo SQLite, Jest + `jest-expo`, existing sync primitives in `src/core/domain/sync` and `src/data/local/repositories` (`buildSyncOperation`, `canonicalizeSyncableRecordIdentifiers`, `openTestLocalDatabase`).

**Spec:** `docs/superpowers/specs/2026-08-27-personal-gold-tracking-design.md`; visual source: `design/Finance App.gold-management.dc.html`.

**Out of scope for this plan** (per spec's explicit "ngoài phạm vi MVP hiện tại" notes and the reduced scope agreed for this plan): reference price provider / SJC fallback, unrealized/realized P&L calculation and display, edit-existing-transaction flows, and history filters. This plan covers only: gold lots, one-lot sell transactions, the brand catalog, and trash/restore/purge — the backend for the screens that already exist in the design prototype.

## Global Constraints

- MVP scope is a single person, physical nhẫn trơn 9999 only, VND currency, local-first data (per spec §Phạm vi sản phẩm).
- Weight units are `lượng/cây`, `chỉ`, `phân`, `gram` with conversions `1 lượng = 10 chỉ = 100 phân = 37.5 gram`, `1 chỉ = 10 phân = 3.75 gram`, `1 phân = 0.375 gram` (spec §Phạm vi sản phẩm). Store both the original entered quantity/unit and a gram-normalized quantity using exact decimal arithmetic (no floating-point rounding drift).
- A gold lot's cost basis is the total purchase amount entered directly by the user; there is no separate unit-price field, no auto-calculated total, and no discrepancy warning (spec §Lô mua, §Luồng thêm giao dịch mua — synced from UI).
- Each sell transaction links to exactly one purchase lot and always sells that lot's entire quantity; there is no partial-lot sale and no multi-lot sale in one transaction (spec §Giao dịch bán, §Công thức — synced from UI).
- A lot is in exactly one of two states: `held` (no active sell transaction linked) or `sold` (has exactly one active sell transaction linked, in which case it must not appear in the sell-form lot picker).
- Realized P&L formula (implemented but not yet surfaced in UI per this plan's scope): `Tổng tiền thực nhận - Giá vốn của lô` (spec §Công thức).
- A purchase lot cannot be moved to trash while it has an active (non-trashed) sell transaction linked to it; the caller must be told which sell transaction blocks it (spec §Đưa giao dịch mua vào thùng rác).
- Moving a sell transaction to trash returns its lot to `held`; restoring a sell transaction only succeeds if its lot is still `held` and not already re-linked to another active sell (spec §Đưa giao dịch bán vào thùng rác, §Khôi phục giao dịch bán).
- Permanent deletion is only ever performed from the trash screen, always requires an explicit "cannot be undone" confirmation, and still writes a change-log entry (spec §Xóa vĩnh viễn) so the record does not resurrect via sync.
- Deleting a brand from the catalog never mutates or hides previously saved lots that used that brand (spec §Quản lý thương hiệu).
- Every business entity write (create/soft-delete/restore) plus its `SyncOperation` append must commit inside a single SQLite transaction; on any failure inside that transaction, nothing is persisted (spec §Kiến trúc triển khai, §Xử lý lỗi).
- Screens must not access SQLite or repositories directly — only through use cases/view-models (established codebase convention, `src/features/finance/finance-dependencies.ts`).
- Preserve sync metadata (`id`, `createdAt`, `updatedAt`, `deletedAt`, `revision`, `originDeviceId`) on every syncable business entity (established codebase convention, `src/core/domain/sync/syncable-record.ts`).
- Every new user-facing string gets a camelCase key added to both `src/i18n/locales/vi.ts` and `src/i18n/locales/en.ts`, verified by an `it.each` test enumerating the required keys (established codebase convention, `tests/i18n/finance-component-keys.test.ts`).

## File Map

- Domain: `src/core/domain/gold/gold-lot.ts`, `src/core/domain/gold/gold-sell-transaction.ts`, `src/core/domain/gold/gold-brand.ts`, `src/core/domain/gold/gold-weight.ts`, `src/core/domain/gold/gold-calculations.ts`
- Application (use cases + ports): `src/core/application/ports/gold-repositories.ts`, `src/core/application/gold/create-gold-lot.ts`, `src/core/application/gold/sell-gold-lot.ts`, `src/core/application/gold/trash-gold-transaction.ts`, `src/core/application/gold/restore-gold-transaction.ts`, `src/core/application/gold/purge-gold-transaction.ts`, `src/core/application/gold/manage-gold-brands.ts`, `src/core/application/gold/get-gold-overview.ts`
- Data: `src/data/local/schema/gold-lots.ts`, `src/data/local/schema/gold-sell-transactions.ts`, `src/data/local/schema/gold-brands.ts`, `src/data/local/schema/index.ts` (extend), `src/data/local/repositories/gold-record-mappers.ts`, `src/data/local/repositories/gold-lot-repository.ts`, `src/data/local/repositories/gold-sell-transaction-repository.ts`, `src/data/local/repositories/gold-brand-repository.ts`
- Feature wiring: `src/features/gold/gold-dependencies.ts`, `src/features/gold/view-models/gold-presentation.ts`, `src/features/gold/view-models/use-gold-management.ts`
- i18n: `src/i18n/locales/vi.ts` (extend), `src/i18n/locales/en.ts` (extend), `tests/i18n/gold-component-keys.test.ts`
- Tests: `tests/core/gold/gold-domain.test.ts`, `tests/core/gold/gold-use-cases.test.ts`, `tests/data/local/gold-repositories.test.ts`, `tests/data/local/gold-schema.test.ts`, `tests/features/gold/use-gold-management.test.ts`

---

### Task 1: Domain types, weight conversion, and validation

**Files:**
- Create: `src/core/domain/gold/gold-weight.ts`
- Create: `src/core/domain/gold/gold-lot.ts`
- Create: `src/core/domain/gold/gold-sell-transaction.ts`
- Create: `src/core/domain/gold/gold-brand.ts`
- Test: `tests/core/gold/gold-domain.test.ts`

**Interfaces:**
- Consumes: `SyncableRecord` from `@/core/domain/sync/syncable-record` (existing).
- Produces:
  - `GoldWeightUnit = 'luong' | 'chi' | 'phan' | 'gram'`
  - `normalizeGoldWeightToGrams(quantity: number, unit: GoldWeightUnit): number`
  - `GoldLot = SyncableRecord & { brandId: string; purchaseDate: string; quantity: number; unit: GoldWeightUnit; quantityGrams: number; totalAmount: number; note: string | null; status: 'held' | 'sold' }`
  - `GoldLotInput = { brandId: string; purchaseDate: string; quantity: number; unit: GoldWeightUnit; totalAmount: number; note?: string | null }`
  - `validateGoldLotInput(input: GoldLotInput): void`
  - `GoldSellTransaction = SyncableRecord & { lotId: string; saleDate: string; totalAmount: number; note: string | null }`
  - `GoldSellTransactionInput = { lotId: string; saleDate: string; totalAmount: number; note?: string | null }`
  - `validateGoldSellTransactionInput(input: GoldSellTransactionInput): void`
  - `GoldBrand = SyncableRecord & { name: string }`
  - `GoldBrandInput = { name: string }`
  - `validateGoldBrandInput(input: GoldBrandInput): void`

- [ ] **Step 1: Write the failing test for gram normalization**

```typescript
// tests/core/gold/gold-domain.test.ts
import { normalizeGoldWeightToGrams } from '@/core/domain/gold/gold-weight';

describe('normalizeGoldWeightToGrams', () => {
  it('converts each unit to grams using the fixed MVP ratios', () => {
    expect(normalizeGoldWeightToGrams(1, 'luong')).toBeCloseTo(37.5, 10);
    expect(normalizeGoldWeightToGrams(1, 'chi')).toBeCloseTo(3.75, 10);
    expect(normalizeGoldWeightToGrams(1, 'phan')).toBeCloseTo(0.375, 10);
    expect(normalizeGoldWeightToGrams(2, 'gram')).toBeCloseTo(2, 10);
  });

  it('rejects a non-positive quantity', () => {
    expect(() => normalizeGoldWeightToGrams(0, 'chi')).toThrow('Gold weight quantity must be a positive number');
    expect(() => normalizeGoldWeightToGrams(-1, 'chi')).toThrow('Gold weight quantity must be a positive number');
  });

  it('rejects an unknown unit', () => {
    expect(() => normalizeGoldWeightToGrams(1, 'kg' as never)).toThrow('Unknown gold weight unit: kg');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/gold/gold-domain.test.ts`
Expected: FAIL with "Cannot find module '@/core/domain/gold/gold-weight'"

- [ ] **Step 3: Implement `gold-weight.ts`**

```typescript
// src/core/domain/gold/gold-weight.ts
export type GoldWeightUnit = 'luong' | 'chi' | 'phan' | 'gram';

const GRAMS_PER_UNIT: Record<GoldWeightUnit, number> = {
  luong: 37.5,
  chi: 3.75,
  phan: 0.375,
  gram: 1,
};

/**
 * Converts an entered quantity + unit to grams using the fixed MVP ratios
 * (1 lượng = 10 chỉ = 100 phân = 37.5 gram). Uses plain floating-point
 * multiplication against decimal-exact ratios (all powers of 10 apart),
 * which is exact for these specific factors.
 */
export function normalizeGoldWeightToGrams(quantity: number, unit: GoldWeightUnit): number {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Gold weight quantity must be a positive number');
  }
  const gramsPerUnit = GRAMS_PER_UNIT[unit];
  if (gramsPerUnit === undefined) {
    throw new Error(`Unknown gold weight unit: ${unit}`);
  }
  return quantity * gramsPerUnit;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/gold/gold-domain.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for `GoldLotInput` validation**

```typescript
// append to tests/core/gold/gold-domain.test.ts
import { validateGoldLotInput, GoldLotInput } from '@/core/domain/gold/gold-lot';

const validLotInput: GoldLotInput = {
  brandId: 'brand-pnj',
  purchaseDate: '2026-08-24',
  quantity: 2,
  unit: 'chi',
  totalAmount: 17000000,
};

describe('validateGoldLotInput', () => {
  it('accepts a valid input', () => {
    expect(() => validateGoldLotInput(validLotInput)).not.toThrow();
  });

  it('rejects a missing brandId', () => {
    expect(() => validateGoldLotInput({ ...validLotInput, brandId: '' })).toThrow('Gold lot brandId must not be empty');
  });

  it('rejects an invalid purchaseDate', () => {
    expect(() => validateGoldLotInput({ ...validLotInput, purchaseDate: '24/08/2026' })).toThrow(
      'Gold lot purchaseDate must be a valid ISO calendar date (YYYY-MM-DD)',
    );
  });

  it('rejects a non-positive quantity', () => {
    expect(() => validateGoldLotInput({ ...validLotInput, quantity: 0 })).toThrow('Gold lot quantity must be a positive number');
  });

  it('rejects a non-positive totalAmount', () => {
    expect(() => validateGoldLotInput({ ...validLotInput, totalAmount: 0 })).toThrow(
      'Gold lot totalAmount must be a positive integer',
    );
  });

  it('rejects a non-integer totalAmount', () => {
    expect(() => validateGoldLotInput({ ...validLotInput, totalAmount: 17000000.5 })).toThrow(
      'Gold lot totalAmount must be a positive integer',
    );
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/gold/gold-domain.test.ts`
Expected: FAIL with "Cannot find module '@/core/domain/gold/gold-lot'"

- [ ] **Step 7: Implement `gold-lot.ts`**

```typescript
// src/core/domain/gold/gold-lot.ts
import { SyncableRecord } from '../sync/syncable-record';
import { GoldWeightUnit, normalizeGoldWeightToGrams } from './gold-weight';

export type GoldLotStatus = 'held' | 'sold';

export type GoldLot = SyncableRecord & {
  brandId: string;
  purchaseDate: string;
  quantity: number;
  unit: GoldWeightUnit;
  quantityGrams: number;
  totalAmount: number;
  note: string | null;
  status: GoldLotStatus;
};

export type GoldLotInput = {
  brandId: string;
  purchaseDate: string;
  quantity: number;
  unit: GoldWeightUnit;
  totalAmount: number;
  note?: string | null;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Validates a gold lot (purchase) input. Throws a descriptive Error when
 * invalid. Also exercises `normalizeGoldWeightToGrams` so an invalid
 * quantity/unit combination surfaces as a lot-specific error message.
 */
export function validateGoldLotInput(input: GoldLotInput): void {
  if (!isNonEmptyString(input.brandId)) {
    throw new Error('Gold lot brandId must not be empty');
  }
  if (!isValidCalendarDate(input.purchaseDate)) {
    throw new Error('Gold lot purchaseDate must be a valid ISO calendar date (YYYY-MM-DD)');
  }
  if (typeof input.quantity !== 'number' || !Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Gold lot quantity must be a positive number');
  }
  normalizeGoldWeightToGrams(input.quantity, input.unit);
  if (typeof input.totalAmount !== 'number' || !Number.isInteger(input.totalAmount) || input.totalAmount <= 0) {
    throw new Error('Gold lot totalAmount must be a positive integer');
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/gold/gold-domain.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 9: Write the failing test for `GoldSellTransactionInput` and `GoldBrandInput` validation**

```typescript
// append to tests/core/gold/gold-domain.test.ts
import { validateGoldSellTransactionInput, GoldSellTransactionInput } from '@/core/domain/gold/gold-sell-transaction';
import { validateGoldBrandInput, GoldBrandInput } from '@/core/domain/gold/gold-brand';

const validSellInput: GoldSellTransactionInput = {
  lotId: 'lot-1',
  saleDate: '2026-08-25',
  totalAmount: 8700000,
};

describe('validateGoldSellTransactionInput', () => {
  it('accepts a valid input', () => {
    expect(() => validateGoldSellTransactionInput(validSellInput)).not.toThrow();
  });

  it('rejects a missing lotId', () => {
    expect(() => validateGoldSellTransactionInput({ ...validSellInput, lotId: '' })).toThrow('Gold sell lotId must not be empty');
  });

  it('rejects an invalid saleDate', () => {
    expect(() => validateGoldSellTransactionInput({ ...validSellInput, saleDate: 'not-a-date' })).toThrow(
      'Gold sell saleDate must be a valid ISO calendar date (YYYY-MM-DD)',
    );
  });

  it('rejects a non-positive totalAmount', () => {
    expect(() => validateGoldSellTransactionInput({ ...validSellInput, totalAmount: -1 })).toThrow(
      'Gold sell totalAmount must be a positive integer',
    );
  });
});

describe('validateGoldBrandInput', () => {
  it('accepts a valid name', () => {
    expect(() => validateGoldBrandInput({ name: 'PNJ' })).not.toThrow();
  });

  it('rejects a blank name', () => {
    expect(() => validateGoldBrandInput({ name: '   ' } as GoldBrandInput)).toThrow('Gold brand name must not be empty');
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/gold/gold-domain.test.ts`
Expected: FAIL with "Cannot find module '@/core/domain/gold/gold-sell-transaction'"

- [ ] **Step 11: Implement `gold-sell-transaction.ts` and `gold-brand.ts`**

```typescript
// src/core/domain/gold/gold-sell-transaction.ts
import { SyncableRecord } from '../sync/syncable-record';

export type GoldSellTransaction = SyncableRecord & {
  lotId: string;
  saleDate: string;
  totalAmount: number;
  note: string | null;
};

export type GoldSellTransactionInput = {
  lotId: string;
  saleDate: string;
  totalAmount: number;
  note?: string | null;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Validates a gold sell transaction input. Business rules that require
 * looking up the referenced lot (lot must be `held`, sale date not before
 * purchase date) live in the `SellGoldLot` use case, not here — this
 * function only validates the input's own shape.
 */
export function validateGoldSellTransactionInput(input: GoldSellTransactionInput): void {
  if (!isNonEmptyString(input.lotId)) {
    throw new Error('Gold sell lotId must not be empty');
  }
  if (!isValidCalendarDate(input.saleDate)) {
    throw new Error('Gold sell saleDate must be a valid ISO calendar date (YYYY-MM-DD)');
  }
  if (typeof input.totalAmount !== 'number' || !Number.isInteger(input.totalAmount) || input.totalAmount <= 0) {
    throw new Error('Gold sell totalAmount must be a positive integer');
  }
}
```

```typescript
// src/core/domain/gold/gold-brand.ts
import { SyncableRecord } from '../sync/syncable-record';

export type GoldBrand = SyncableRecord & {
  name: string;
};

export type GoldBrandInput = {
  name: string;
};

export function validateGoldBrandInput(input: GoldBrandInput): void {
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw new Error('Gold brand name must not be empty');
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/gold/gold-domain.test.ts`
Expected: PASS (16 tests)

- [ ] **Step 13: Commit**

```bash
git add src/core/domain/gold tests/core/gold/gold-domain.test.ts
git commit -m "feat: add gold domain types, weight conversion, and validation"
```

---

### Task 2: Realized P&L calculation

**Files:**
- Create: `src/core/domain/gold/gold-calculations.ts`
- Test: `tests/core/gold/gold-domain.test.ts` (extend)

**Interfaces:**
- Consumes: `GoldLot` from Task 1, `GoldSellTransaction` from Task 1.
- Produces: `calculateRealizedGain(lot: GoldLot, sale: GoldSellTransaction): number`

- [ ] **Step 1: Write the failing test**

```typescript
// append to tests/core/gold/gold-domain.test.ts
import { calculateRealizedGain } from '@/core/domain/gold/gold-calculations';

function syncFields(id: string) {
  return {
    id,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: '550e8400-e29b-41d4-a716-446655440099',
  };
}

describe('calculateRealizedGain', () => {
  it('returns proceeds minus the lot cost basis (a gain)', () => {
    const lot = {
      ...syncFields('lot-1'),
      brandId: 'brand-pnj',
      purchaseDate: '2026-08-12',
      quantity: 1,
      unit: 'chi' as const,
      quantityGrams: 3.75,
      totalAmount: 8500000,
      note: null,
      status: 'sold' as const,
    };
    const sale = {
      ...syncFields('sale-1'),
      lotId: 'lot-1',
      saleDate: '2026-08-25',
      totalAmount: 8700000,
      note: null,
    };

    expect(calculateRealizedGain(lot, sale)).toBe(200000);
  });

  it('returns a negative number for a loss', () => {
    const lot = {
      ...syncFields('lot-2'),
      brandId: 'brand-sjc',
      purchaseDate: '2026-08-12',
      quantity: 1,
      unit: 'chi' as const,
      quantityGrams: 3.75,
      totalAmount: 8500000,
      note: null,
      status: 'sold' as const,
    };
    const sale = {
      ...syncFields('sale-2'),
      lotId: 'lot-2',
      saleDate: '2026-08-25',
      totalAmount: 8000000,
      note: null,
    };

    expect(calculateRealizedGain(lot, sale)).toBe(-500000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/gold/gold-domain.test.ts`
Expected: FAIL with "Cannot find module '@/core/domain/gold/gold-calculations'"

- [ ] **Step 3: Implement `gold-calculations.ts`**

```typescript
// src/core/domain/gold/gold-calculations.ts
import { GoldLot } from './gold-lot';
import { GoldSellTransaction } from './gold-sell-transaction';

/**
 * Lời/lỗ đã thực hiện = Tổng tiền thực nhận - Giá vốn của lô (spec §Công thức).
 * The lot's cost basis is its full `totalAmount` because a sell always
 * disposes of the entire lot (no partial-lot sales in this MVP).
 */
export function calculateRealizedGain(lot: GoldLot, sale: GoldSellTransaction): number {
  return sale.totalAmount - lot.totalAmount;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/gold/gold-domain.test.ts`
Expected: PASS (18 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/gold/gold-calculations.ts tests/core/gold/gold-domain.test.ts
git commit -m "feat: add gold realized gain calculation"
```

---

### Task 3: Drizzle schema and migration

**Files:**
- Create: `src/data/local/schema/gold-brands.ts`
- Create: `src/data/local/schema/gold-lots.ts`
- Create: `src/data/local/schema/gold-sell-transactions.ts`
- Modify: `src/data/local/schema/index.ts`
- Modify: `package.json` (add a `db:generate` script)
- Test: `tests/data/local/gold-schema.test.ts`

**Interfaces:**
- Produces: Drizzle tables `goldBrands`, `goldLots`, `goldSellTransactions`, each exported from `src/data/local/schema/index.ts` and each carrying the sync columns (`createdAt`, `updatedAt`, `deletedAt`, `revision`, `originDeviceId`) matching `SyncableRecord`.

- [ ] **Step 1: Write the failing schema smoke test**

```typescript
// tests/data/local/gold-schema.test.ts
import { openTestLocalDatabase } from '@/data/local/db/client';
import { goldBrands, goldLots, goldSellTransactions } from '@/data/local/schema';

describe('gold schema', () => {
  it('creates the gold_brands, gold_lots, and gold_sell_transactions tables via migration', async () => {
    const database = await openTestLocalDatabase();
    try {
      const brandId = '550e8400-e29b-41d4-a716-446655440101';
      const lotId = '550e8400-e29b-41d4-a716-446655440102';
      const saleId = '550e8400-e29b-41d4-a716-446655440103';
      const deviceId = '550e8400-e29b-41d4-a716-446655440010';
      const now = '2026-08-24T10:00:00.000Z';

      database.db
        .insert(goldBrands)
        .values({ id: brandId, name: 'PNJ', createdAt: now, updatedAt: now, deletedAt: null, revision: 1, originDeviceId: deviceId })
        .run();

      database.db
        .insert(goldLots)
        .values({
          id: lotId,
          brandId,
          purchaseDate: '2026-08-24',
          quantity: 2,
          unit: 'chi',
          quantityGrams: 7.5,
          totalAmount: 17000000,
          note: null,
          status: 'held',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          revision: 1,
          originDeviceId: deviceId,
        })
        .run();

      database.db
        .insert(goldSellTransactions)
        .values({
          id: saleId,
          lotId,
          saleDate: '2026-08-25',
          totalAmount: 8700000,
          note: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          revision: 1,
          originDeviceId: deviceId,
        })
        .run();

      const lotRow = database.db.select().from(goldLots).all();
      const saleRow = database.db.select().from(goldSellTransactions).all();
      expect(lotRow).toHaveLength(1);
      expect(saleRow).toHaveLength(1);
      expect(saleRow[0].lotId).toBe(lotId);
    } finally {
      await database.close();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/data/local/gold-schema.test.ts`
Expected: FAIL with "Cannot find module '@/data/local/schema'" export `goldBrands` (or similar module-resolution error)

- [ ] **Step 3: Implement the three schema files**

```typescript
// src/data/local/schema/gold-brands.ts
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const goldBrands = sqliteTable('gold_brands', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  revision: integer('revision').notNull(),
  originDeviceId: text('origin_device_id').notNull(),
});
```

```typescript
// src/data/local/schema/gold-lots.ts
import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { goldBrands } from './gold-brands';

export const goldLots = sqliteTable(
  'gold_lots',
  {
    id: text('id').primaryKey(),
    brandId: text('brand_id')
      .notNull()
      .references(() => goldBrands.id),
    /** ISO calendar date (YYYY-MM-DD). */
    purchaseDate: text('purchase_date').notNull(),
    /** Quantity in the unit the user entered (not grams). */
    quantity: real('quantity').notNull(),
    unit: text('unit', { enum: ['luong', 'chi', 'phan', 'gram'] }).notNull(),
    /** Quantity normalized to grams for cross-unit reasoning. */
    quantityGrams: real('quantity_grams').notNull(),
    /** Positive integer VND; this is the lot's cost basis. */
    totalAmount: integer('total_amount').notNull(),
    note: text('note'),
    /** 'held' while unsold; 'sold' once exactly one active sell transaction links to it. */
    status: text('status', { enum: ['held', 'sold'] }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [
    index('gold_lots_brand_id_idx').on(table.brandId),
    index('gold_lots_status_idx').on(table.status),
    index('gold_lots_purchase_date_idx').on(table.purchaseDate),
    check('gold_lots_unit_check', sql`${table.unit} in ('luong', 'chi', 'phan', 'gram')`),
    check('gold_lots_status_check', sql`${table.status} in ('held', 'sold')`),
  ],
);
```

```typescript
// src/data/local/schema/gold-sell-transactions.ts
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { goldLots } from './gold-lots';

export const goldSellTransactions = sqliteTable(
  'gold_sell_transactions',
  {
    id: text('id').primaryKey(),
    lotId: text('lot_id')
      .notNull()
      .references(() => goldLots.id),
    /** ISO calendar date (YYYY-MM-DD). */
    saleDate: text('sale_date').notNull(),
    /** Positive integer VND; the total amount actually received. */
    totalAmount: integer('total_amount').notNull(),
    note: text('note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [
    index('gold_sell_transactions_lot_id_idx').on(table.lotId),
    index('gold_sell_transactions_sale_date_idx').on(table.saleDate),
  ],
);
```

```typescript
// src/data/local/schema/index.ts (add these three lines, keep existing exports)
export { goldBrands } from './gold-brands';
export { goldLots } from './gold-lots';
export { goldSellTransactions } from './gold-sell-transactions';
```

- [ ] **Step 4: Add the migration-generation script and generate the migration**

Add to `package.json` `"scripts"`:

```json
"db:generate": "drizzle-kit generate"
```

Run: `npm run db:generate`
Expected: a new `drizzle/000N_<name>.sql` file plus a matching `drizzle/meta/000N_snapshot.json` are created, and `drizzle/migrations.js` is regenerated to import and register the new migration (mirrors how `0000_open_zarda.sql`/`0001_loose_deadpool.sql`/`0002_gorgeous_malice.sql` are already wired). Read the generated SQL file to confirm it creates `gold_brands`, `gold_lots`, and `gold_sell_transactions` with the expected columns before proceeding.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --runInBand tests/data/local/gold-schema.test.ts`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add src/data/local/schema/gold-brands.ts src/data/local/schema/gold-lots.ts src/data/local/schema/gold-sell-transactions.ts src/data/local/schema/index.ts package.json drizzle tests/data/local/gold-schema.test.ts
git commit -m "feat: add gold_brands, gold_lots, gold_sell_transactions schema and migration"
```

---

### Task 4: Repository ports

**Files:**
- Create: `src/core/application/ports/gold-repositories.ts`

**Interfaces:**
- Consumes: `GoldLot`, `GoldLotInput`, `GoldSellTransaction`, `GoldSellTransactionInput`, `GoldBrand`, `GoldBrandInput` from Task 1; `WriteContext` (reuse the existing type from `@/core/application/ports/finance-repositories`, do not redefine it); `SyncOperation` from `@/core/domain/sync/sync-operation`.
- Produces:
  - `CreateGoldLotInput = WriteContext & GoldLotInput & { id: string }`
  - `CreateGoldSellTransactionInput = WriteContext & GoldSellTransactionInput & { id: string }`
  - `CreateGoldBrandInput = WriteContext & GoldBrandInput & { id: string }`
  - `GoldLotListFilter = { includeDeleted?: boolean; status?: GoldLotStatus }`
  - `interface GoldLotRepository { create; softDelete; restore; findById; list; markSold(id: string, context: WriteContext): Promise<GoldLot>; markHeld(id: string, context: WriteContext): Promise<GoldLot>; saveWithOperation }`
  - `interface GoldSellTransactionRepository { create; softDelete; restore; findById; findByLotId(lotId: string): Promise<GoldSellTransaction | null>; list; saveWithOperation }`
  - `interface GoldBrandRepository { create; softDelete; findById; listActive; saveWithOperation }`

This task has no test of its own (it is a pure TypeScript interface file with no runtime behavior); Task 6's repository tests exercise it.

- [ ] **Step 1: Write the port file**

```typescript
// src/core/application/ports/gold-repositories.ts
import { WriteContext } from '@/core/application/ports/finance-repositories';
import { GoldBrand, GoldBrandInput } from '@/core/domain/gold/gold-brand';
import { GoldLot, GoldLotInput, GoldLotStatus } from '@/core/domain/gold/gold-lot';
import { GoldSellTransaction, GoldSellTransactionInput } from '@/core/domain/gold/gold-sell-transaction';
import { SyncOperation } from '@/core/domain/sync/sync-operation';

export type CreateGoldLotInput = WriteContext & GoldLotInput & { id: string };

export type GoldLotListFilter = {
  /** When true, includes soft-deleted (trashed) lots. Defaults to false. */
  includeDeleted?: boolean;
  status?: GoldLotStatus;
};

export interface GoldLotRepository {
  create(input: CreateGoldLotInput): Promise<GoldLot>;
  softDelete(id: string, context: WriteContext): Promise<GoldLot>;
  restore(id: string, context: WriteContext): Promise<GoldLot>;
  findById(id: string): Promise<GoldLot | null>;
  list(filter?: GoldLotListFilter): Promise<GoldLot[]>;
  /** Flips status to 'sold'. Called by SellGoldLot inside its own transaction — does not append a change-log entry itself. */
  markSold(id: string, context: WriteContext): Promise<GoldLot>;
  /** Flips status back to 'held'. Called by TrashGoldTransaction/RestoreGoldTransaction. */
  markHeld(id: string, context: WriteContext): Promise<GoldLot>;
  saveWithOperation(record: GoldLot, operation: SyncOperation): Promise<void>;
}

export type CreateGoldSellTransactionInput = WriteContext & GoldSellTransactionInput & { id: string };

export type GoldSellTransactionListFilter = {
  includeDeleted?: boolean;
};

export interface GoldSellTransactionRepository {
  create(input: CreateGoldSellTransactionInput): Promise<GoldSellTransaction>;
  softDelete(id: string, context: WriteContext): Promise<GoldSellTransaction>;
  restore(id: string, context: WriteContext): Promise<GoldSellTransaction>;
  findById(id: string): Promise<GoldSellTransaction | null>;
  /** Finds the single active (non-trashed) sell transaction for a lot, if any. */
  findActiveByLotId(lotId: string): Promise<GoldSellTransaction | null>;
  list(filter?: GoldSellTransactionListFilter): Promise<GoldSellTransaction[]>;
  saveWithOperation(record: GoldSellTransaction, operation: SyncOperation): Promise<void>;
}

export type CreateGoldBrandInput = WriteContext & GoldBrandInput & { id: string };

export interface GoldBrandRepository {
  create(input: CreateGoldBrandInput): Promise<GoldBrand>;
  softDelete(id: string, context: WriteContext): Promise<GoldBrand>;
  findById(id: string): Promise<GoldBrand | null>;
  listActive(): Promise<GoldBrand[]>;
  saveWithOperation(record: GoldBrand, operation: SyncOperation): Promise<void>;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no new errors (this file only declares types; nothing imports it yet).

- [ ] **Step 3: Commit**

```bash
git add src/core/application/ports/gold-repositories.ts
git commit -m "feat: add gold repository ports"
```

---

### Task 5: Repository implementations (lot, sell transaction, brand)

**Files:**
- Create: `src/data/local/repositories/gold-record-mappers.ts`
- Create: `src/data/local/repositories/gold-brand-repository.ts`
- Create: `src/data/local/repositories/gold-lot-repository.ts`
- Create: `src/data/local/repositories/gold-sell-transaction-repository.ts`
- Test: `tests/data/local/gold-repositories.test.ts`

**Interfaces:**
- Consumes: ports from Task 4, schema tables from Task 3, `buildSyncOperation` from `@/data/local/repositories/sync-operation-builder`, `canonicalizeSyncableRecordIdentifiers`/`canonicalizeSyncOperationIdentifiers` from `@/data/local/repositories/sync-identifier-validation`, `toChangeLogValues` from `@/data/local/repositories/change-log-repository`, `openTestLocalDatabase` from `@/data/local/db/client`, `normalizeGoldWeightToGrams` from Task 1.
- Produces: `GoldBrandRepository`, `GoldLotRepository`, `GoldSellTransactionRepository` classes implementing the Task 4 ports, each constructed as `new XRepository(database: LocalDatabaseClient)`.

- [ ] **Step 1: Write the failing test for `GoldBrandRepository`**

```typescript
// tests/data/local/gold-repositories.test.ts
import { ChangeLogRepository } from '@/data/local/repositories/change-log-repository';
import { GoldBrandRepository } from '@/data/local/repositories/gold-brand-repository';
import { openTestLocalDatabase } from '@/data/local/db/client';
import { WriteContext } from '@/core/application/ports/finance-repositories';

const deviceId = '550e8400-e29b-41d4-a716-446655440010';

function id(suffix: string): string {
  return `550e8400-e29b-41d4-a716-4466554${suffix.padStart(5, '0')}`;
}

function ctx(overrides: Partial<WriteContext> = {}): WriteContext {
  return {
    originDeviceId: deviceId,
    operationId: id('90000'),
    now: '2026-08-24T10:00:00.000Z',
    ...overrides,
  };
}

describe('gold repositories', () => {
  let database: Awaited<ReturnType<typeof openTestLocalDatabase>>;
  let brands: GoldBrandRepository;
  let changes: ChangeLogRepository;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    brands = new GoldBrandRepository(database);
    changes = new ChangeLogRepository(database);
  });

  afterEach(async () => {
    await database.close();
  });

  describe('GoldBrandRepository', () => {
    it('creates a brand and appends a matching change operation', async () => {
      const brand = await brands.create({ id: id('00001'), name: 'PNJ', ...ctx({ operationId: id('90001') }) });

      expect(brand).toMatchObject({ name: 'PNJ', revision: 1 });
      await expect(brands.findById(brand.id)).resolves.toEqual(brand);
      await expect(changes.hasOperation(id('90001'))).resolves.toBe(true);
      await expect(brands.listActive()).resolves.toEqual([brand]);
    });

    it('soft-deletes a brand without affecting lots that reference it', async () => {
      const brand = await brands.create({ id: id('00002'), name: 'SJC', ...ctx({ operationId: id('90002') }) });
      await brands.softDelete(brand.id, ctx({ operationId: id('90003'), now: '2026-08-24T11:00:00.000Z' }));

      const deleted = await brands.findById(brand.id);
      expect(deleted?.deletedAt).toBe('2026-08-24T11:00:00.000Z');
      await expect(brands.listActive()).resolves.toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/data/local/gold-repositories.test.ts`
Expected: FAIL with "Cannot find module '@/data/local/repositories/gold-brand-repository'"

- [ ] **Step 3: Implement `gold-record-mappers.ts` and `gold-brand-repository.ts`**

```typescript
// src/data/local/repositories/gold-record-mappers.ts
import { GoldBrand } from '@/core/domain/gold/gold-brand';
import { GoldLot } from '@/core/domain/gold/gold-lot';
import { GoldSellTransaction } from '@/core/domain/gold/gold-sell-transaction';
import { goldBrands, goldLots, goldSellTransactions } from '@/data/local/schema';

type GoldBrandRow = typeof goldBrands.$inferSelect;
type GoldLotRow = typeof goldLots.$inferSelect;
type GoldSellTransactionRow = typeof goldSellTransactions.$inferSelect;

export function toGoldBrandEntity(row: GoldBrandRow): GoldBrand {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toGoldBrandRowValues(brand: GoldBrand): GoldBrandRow {
  return {
    id: brand.id,
    name: brand.name,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
    deletedAt: brand.deletedAt,
    revision: brand.revision,
    originDeviceId: brand.originDeviceId,
  };
}

export function toGoldLotEntity(row: GoldLotRow): GoldLot {
  return {
    id: row.id,
    brandId: row.brandId,
    purchaseDate: row.purchaseDate,
    quantity: row.quantity,
    unit: row.unit,
    quantityGrams: row.quantityGrams,
    totalAmount: row.totalAmount,
    note: row.note,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toGoldLotRowValues(lot: GoldLot): GoldLotRow {
  return {
    id: lot.id,
    brandId: lot.brandId,
    purchaseDate: lot.purchaseDate,
    quantity: lot.quantity,
    unit: lot.unit,
    quantityGrams: lot.quantityGrams,
    totalAmount: lot.totalAmount,
    note: lot.note ?? null,
    status: lot.status,
    createdAt: lot.createdAt,
    updatedAt: lot.updatedAt,
    deletedAt: lot.deletedAt,
    revision: lot.revision,
    originDeviceId: lot.originDeviceId,
  };
}

export function toGoldSellTransactionEntity(row: GoldSellTransactionRow): GoldSellTransaction {
  return {
    id: row.id,
    lotId: row.lotId,
    saleDate: row.saleDate,
    totalAmount: row.totalAmount,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toGoldSellTransactionRowValues(sale: GoldSellTransaction): GoldSellTransactionRow {
  return {
    id: sale.id,
    lotId: sale.lotId,
    saleDate: sale.saleDate,
    totalAmount: sale.totalAmount,
    note: sale.note ?? null,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    deletedAt: sale.deletedAt,
    revision: sale.revision,
    originDeviceId: sale.originDeviceId,
  };
}
```

```typescript
// src/data/local/repositories/gold-brand-repository.ts
import { eq, isNull } from 'drizzle-orm';

import { CreateGoldBrandInput, GoldBrandRepository as GoldBrandRepositoryPort } from '@/core/application/ports/gold-repositories';
import { WriteContext } from '@/core/application/ports/finance-repositories';
import { GoldBrand, validateGoldBrandInput } from '@/core/domain/gold/gold-brand';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, goldBrands } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toGoldBrandEntity, toGoldBrandRowValues } from './gold-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import { canonicalizeSyncableRecordIdentifiers, canonicalizeSyncOperationIdentifiers } from './sync-identifier-validation';

export class GoldBrandRepository implements GoldBrandRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async create(input: CreateGoldBrandInput): Promise<GoldBrand> {
    const { id, originDeviceId, operationId, now, ...brandInput } = input;
    validateGoldBrandInput(brandInput);

    const brand: GoldBrand = {
      id,
      name: brandInput.name,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_brand',
      entityId: brand.id,
      operation: 'create',
      payload: brand,
      originDeviceId,
      revision: brand.revision,
      createdAt: now,
      operationId,
    });

    await this.saveWithOperation(brand, operation);
    return brand;
  }

  async softDelete(id: string, context: WriteContext): Promise<GoldBrand> {
    const existing = await this.requireById(id);
    const updated: GoldBrand = {
      ...existing,
      deletedAt: context.now,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_brand',
      entityId: updated.id,
      operation: 'delete',
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  async findById(id: string): Promise<GoldBrand | null> {
    const row = this.database.db.select().from(goldBrands).where(eq(goldBrands.id, id)).get();
    return row ? toGoldBrandEntity(row) : null;
  }

  async listActive(): Promise<GoldBrand[]> {
    const rows = this.database.db.select().from(goldBrands).where(isNull(goldBrands.deletedAt)).orderBy(goldBrands.name).all();
    return rows.map(toGoldBrandEntity);
  }

  async saveWithOperation(record: GoldBrand, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as GoldBrand;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toGoldBrandRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction.insert(goldBrands).values(values).onConflictDoUpdate({ target: goldBrands.id, set: values }).run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async requireById(id: string): Promise<GoldBrand> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Gold brand ${id} not found`);
    }
    return existing;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/data/local/gold-repositories.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for `GoldLotRepository`**

```typescript
// append to tests/data/local/gold-repositories.test.ts (add imports for GoldLotRepository at top)
import { GoldLotRepository } from '@/data/local/repositories/gold-lot-repository';

// inside describe('gold repositories', ...), add:
let lots: GoldLotRepository;

// inside beforeEach, add:
lots = new GoldLotRepository(database);

describe('GoldLotRepository', () => {
  it('creates a lot as held, normalizing quantity to grams', async () => {
    const brand = await brands.create({ id: id('00010'), name: 'PNJ', ...ctx({ operationId: id('90010') }) });
    const lot = await lots.create({
      id: id('00011'),
      brandId: brand.id,
      purchaseDate: '2026-08-24',
      quantity: 2,
      unit: 'chi',
      totalAmount: 17000000,
      ...ctx({ operationId: id('90011') }),
    });

    expect(lot).toMatchObject({ brandId: brand.id, quantity: 2, unit: 'chi', quantityGrams: 7.5, totalAmount: 17000000, status: 'held', revision: 1 });
    await expect(lots.findById(lot.id)).resolves.toEqual(lot);
    await expect(changes.hasOperation(id('90011'))).resolves.toBe(true);
  });

  it('soft-deletes and restores a lot', async () => {
    const brand = await brands.create({ id: id('00012'), name: 'SJC', ...ctx({ operationId: id('90012') }) });
    const lot = await lots.create({
      id: id('00013'),
      brandId: brand.id,
      purchaseDate: '2026-08-24',
      quantity: 1,
      unit: 'chi',
      totalAmount: 8500000,
      ...ctx({ operationId: id('90013') }),
    });

    const trashed = await lots.softDelete(lot.id, ctx({ operationId: id('90014'), now: '2026-08-24T11:00:00.000Z' }));
    expect(trashed.deletedAt).toBe('2026-08-24T11:00:00.000Z');
    await expect(lots.list()).resolves.toEqual([]);
    await expect(lots.list({ includeDeleted: true })).resolves.toEqual([trashed]);

    const restored = await lots.restore(lot.id, ctx({ operationId: id('90015'), now: '2026-08-24T12:00:00.000Z' }));
    expect(restored.deletedAt).toBeNull();
    await expect(lots.list()).resolves.toEqual([restored]);
  });

  it('marks a lot sold and back to held', async () => {
    const brand = await brands.create({ id: id('00016'), name: 'DOJI', ...ctx({ operationId: id('90016') }) });
    const lot = await lots.create({
      id: id('00017'),
      brandId: brand.id,
      purchaseDate: '2026-08-24',
      quantity: 1,
      unit: 'chi',
      totalAmount: 8500000,
      ...ctx({ operationId: id('90017') }),
    });

    const sold = await lots.markSold(lot.id, ctx({ operationId: id('90018'), now: '2026-08-25T10:00:00.000Z' }));
    expect(sold.status).toBe('sold');
    await expect(lots.list({ status: 'held' })).resolves.toEqual([]);

    const held = await lots.markHeld(lot.id, ctx({ operationId: id('90019'), now: '2026-08-26T10:00:00.000Z' }));
    expect(held.status).toBe('held');
    await expect(lots.list({ status: 'held' })).resolves.toEqual([held]);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --runInBand tests/data/local/gold-repositories.test.ts`
Expected: FAIL with "Cannot find module '@/data/local/repositories/gold-lot-repository'"

- [ ] **Step 7: Implement `gold-lot-repository.ts`**

```typescript
// src/data/local/repositories/gold-lot-repository.ts
import { and, eq, isNull } from 'drizzle-orm';

import { CreateGoldLotInput, GoldLotListFilter, GoldLotRepository as GoldLotRepositoryPort } from '@/core/application/ports/gold-repositories';
import { WriteContext } from '@/core/application/ports/finance-repositories';
import { GoldLot, validateGoldLotInput } from '@/core/domain/gold/gold-lot';
import { normalizeGoldWeightToGrams } from '@/core/domain/gold/gold-weight';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, goldLots } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toGoldLotEntity, toGoldLotRowValues } from './gold-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import { canonicalizeSyncableRecordIdentifiers, canonicalizeSyncOperationIdentifiers } from './sync-identifier-validation';

export class GoldLotRepository implements GoldLotRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async create(input: CreateGoldLotInput): Promise<GoldLot> {
    const { id, originDeviceId, operationId, now, ...lotInput } = input;
    validateGoldLotInput(lotInput);

    const lot: GoldLot = {
      id,
      brandId: lotInput.brandId,
      purchaseDate: lotInput.purchaseDate,
      quantity: lotInput.quantity,
      unit: lotInput.unit,
      quantityGrams: normalizeGoldWeightToGrams(lotInput.quantity, lotInput.unit),
      totalAmount: lotInput.totalAmount,
      note: lotInput.note ?? null,
      status: 'held',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_lot',
      entityId: lot.id,
      operation: 'create',
      payload: lot,
      originDeviceId,
      revision: lot.revision,
      createdAt: now,
      operationId,
    });

    await this.saveWithOperation(lot, operation);
    return lot;
  }

  async softDelete(id: string, context: WriteContext): Promise<GoldLot> {
    return this.applyPatch(id, { deletedAt: context.now }, context, 'delete');
  }

  async restore(id: string, context: WriteContext): Promise<GoldLot> {
    return this.applyPatch(id, { deletedAt: null }, context, 'update');
  }

  async markSold(id: string, context: WriteContext): Promise<GoldLot> {
    return this.applyPatch(id, { status: 'sold' }, context, 'update');
  }

  async markHeld(id: string, context: WriteContext): Promise<GoldLot> {
    return this.applyPatch(id, { status: 'held' }, context, 'update');
  }

  async findById(id: string): Promise<GoldLot | null> {
    const row = this.database.db.select().from(goldLots).where(eq(goldLots.id, id)).get();
    return row ? toGoldLotEntity(row) : null;
  }

  async list(filter: GoldLotListFilter = {}): Promise<GoldLot[]> {
    const conditions = [];
    if (!filter.includeDeleted) {
      conditions.push(isNull(goldLots.deletedAt));
    }
    if (filter.status) {
      conditions.push(eq(goldLots.status, filter.status));
    }

    const query = this.database.db.select().from(goldLots);
    const rows = (conditions.length > 0 ? query.where(and(...conditions)) : query).orderBy(goldLots.purchaseDate).all();
    return rows.map(toGoldLotEntity);
  }

  async saveWithOperation(record: GoldLot, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as GoldLot;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toGoldLotRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction.insert(goldLots).values(values).onConflictDoUpdate({ target: goldLots.id, set: values }).run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async applyPatch(
    id: string,
    patch: Partial<Pick<GoldLot, 'deletedAt' | 'status'>>,
    context: WriteContext,
    operationKind: 'update' | 'delete',
  ): Promise<GoldLot> {
    const existing = await this.requireById(id);
    const updated: GoldLot = {
      ...existing,
      ...patch,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_lot',
      entityId: updated.id,
      operation: operationKind,
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  private async requireById(id: string): Promise<GoldLot> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Gold lot ${id} not found`);
    }
    return existing;
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- --runInBand tests/data/local/gold-repositories.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 9: Write the failing test for `GoldSellTransactionRepository`**

```typescript
// append to tests/data/local/gold-repositories.test.ts (add import at top)
import { GoldSellTransactionRepository } from '@/data/local/repositories/gold-sell-transaction-repository';

// inside describe('gold repositories', ...), add:
let sales: GoldSellTransactionRepository;

// inside beforeEach, add:
sales = new GoldSellTransactionRepository(database);

describe('GoldSellTransactionRepository', () => {
  it('creates a sell transaction and finds it by lotId', async () => {
    const brand = await brands.create({ id: id('00020'), name: 'PNJ', ...ctx({ operationId: id('90020') }) });
    const lot = await lots.create({
      id: id('00021'),
      brandId: brand.id,
      purchaseDate: '2026-08-12',
      quantity: 1,
      unit: 'chi',
      totalAmount: 8500000,
      ...ctx({ operationId: id('90021') }),
    });

    const sale = await sales.create({
      id: id('00022'),
      lotId: lot.id,
      saleDate: '2026-08-25',
      totalAmount: 8700000,
      ...ctx({ operationId: id('90022') }),
    });

    expect(sale).toMatchObject({ lotId: lot.id, totalAmount: 8700000, revision: 1 });
    await expect(sales.findById(sale.id)).resolves.toEqual(sale);
    await expect(sales.findActiveByLotId(lot.id)).resolves.toEqual(sale);
    await expect(changes.hasOperation(id('90022'))).resolves.toBe(true);
  });

  it('soft-deletes a sell transaction so findActiveByLotId returns null', async () => {
    const brand = await brands.create({ id: id('00023'), name: 'SJC', ...ctx({ operationId: id('90023') }) });
    const lot = await lots.create({
      id: id('00024'),
      brandId: brand.id,
      purchaseDate: '2026-08-12',
      quantity: 1,
      unit: 'chi',
      totalAmount: 8500000,
      ...ctx({ operationId: id('90024') }),
    });
    const sale = await sales.create({
      id: id('00025'),
      lotId: lot.id,
      saleDate: '2026-08-25',
      totalAmount: 8700000,
      ...ctx({ operationId: id('90025') }),
    });

    await sales.softDelete(sale.id, ctx({ operationId: id('90026'), now: '2026-08-26T10:00:00.000Z' }));
    await expect(sales.findActiveByLotId(lot.id)).resolves.toBeNull();

    const restored = await sales.restore(sale.id, ctx({ operationId: id('90027'), now: '2026-08-27T10:00:00.000Z' }));
    expect(restored.deletedAt).toBeNull();
    await expect(sales.findActiveByLotId(lot.id)).resolves.toEqual(restored);
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test -- --runInBand tests/data/local/gold-repositories.test.ts`
Expected: FAIL with "Cannot find module '@/data/local/repositories/gold-sell-transaction-repository'"

- [ ] **Step 11: Implement `gold-sell-transaction-repository.ts`**

```typescript
// src/data/local/repositories/gold-sell-transaction-repository.ts
import { and, eq, isNull } from 'drizzle-orm';

import { CreateGoldSellTransactionInput, GoldSellTransactionListFilter, GoldSellTransactionRepository as GoldSellTransactionRepositoryPort } from '@/core/application/ports/gold-repositories';
import { WriteContext } from '@/core/application/ports/finance-repositories';
import { GoldSellTransaction, validateGoldSellTransactionInput } from '@/core/domain/gold/gold-sell-transaction';
import { SyncOperation } from '@/core/domain/sync/sync-operation';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { changeLog, goldSellTransactions } from '@/data/local/schema';

import { toChangeLogValues } from './change-log-repository';
import { toGoldSellTransactionEntity, toGoldSellTransactionRowValues } from './gold-record-mappers';
import { buildSyncOperation } from './sync-operation-builder';
import { canonicalizeSyncableRecordIdentifiers, canonicalizeSyncOperationIdentifiers } from './sync-identifier-validation';

export class GoldSellTransactionRepository implements GoldSellTransactionRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async create(input: CreateGoldSellTransactionInput): Promise<GoldSellTransaction> {
    const { id, originDeviceId, operationId, now, ...saleInput } = input;
    validateGoldSellTransactionInput(saleInput);

    const sale: GoldSellTransaction = {
      id,
      lotId: saleInput.lotId,
      saleDate: saleInput.saleDate,
      totalAmount: saleInput.totalAmount,
      note: saleInput.note ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_sell_transaction',
      entityId: sale.id,
      operation: 'create',
      payload: sale,
      originDeviceId,
      revision: sale.revision,
      createdAt: now,
      operationId,
    });

    await this.saveWithOperation(sale, operation);
    return sale;
  }

  async softDelete(id: string, context: WriteContext): Promise<GoldSellTransaction> {
    return this.applyPatch(id, { deletedAt: context.now }, context, 'delete');
  }

  async restore(id: string, context: WriteContext): Promise<GoldSellTransaction> {
    return this.applyPatch(id, { deletedAt: null }, context, 'update');
  }

  async findById(id: string): Promise<GoldSellTransaction | null> {
    const row = this.database.db.select().from(goldSellTransactions).where(eq(goldSellTransactions.id, id)).get();
    return row ? toGoldSellTransactionEntity(row) : null;
  }

  async findActiveByLotId(lotId: string): Promise<GoldSellTransaction | null> {
    const row = this.database.db
      .select()
      .from(goldSellTransactions)
      .where(and(eq(goldSellTransactions.lotId, lotId), isNull(goldSellTransactions.deletedAt)))
      .get();
    return row ? toGoldSellTransactionEntity(row) : null;
  }

  async list(filter: GoldSellTransactionListFilter = {}): Promise<GoldSellTransaction[]> {
    const query = this.database.db.select().from(goldSellTransactions);
    const rows = (filter.includeDeleted ? query : query.where(isNull(goldSellTransactions.deletedAt)))
      .orderBy(goldSellTransactions.saleDate)
      .all();
    return rows.map(toGoldSellTransactionEntity);
  }

  async saveWithOperation(record: GoldSellTransaction, operation: SyncOperation): Promise<void> {
    const canonicalRecord = canonicalizeSyncableRecordIdentifiers(record) as GoldSellTransaction;
    const canonicalOperation = canonicalizeSyncOperationIdentifiers(operation);
    const values = toGoldSellTransactionRowValues(canonicalRecord);

    this.database.db.transaction((transaction) => {
      transaction
        .insert(goldSellTransactions)
        .values(values)
        .onConflictDoUpdate({ target: goldSellTransactions.id, set: values })
        .run();
      transaction.insert(changeLog).values(toChangeLogValues(canonicalOperation)).run();
    });
  }

  private async applyPatch(
    id: string,
    patch: Partial<Pick<GoldSellTransaction, 'deletedAt'>>,
    context: WriteContext,
    operationKind: 'update' | 'delete',
  ): Promise<GoldSellTransaction> {
    const existing = await this.requireById(id);
    const updated: GoldSellTransaction = {
      ...existing,
      ...patch,
      updatedAt: context.now,
      revision: existing.revision + 1,
      originDeviceId: context.originDeviceId,
    };
    const operation = buildSyncOperation({
      entityType: 'gold_sell_transaction',
      entityId: updated.id,
      operation: operationKind,
      payload: updated,
      originDeviceId: context.originDeviceId,
      revision: updated.revision,
      createdAt: context.now,
      operationId: context.operationId,
    });

    await this.saveWithOperation(updated, operation);
    return updated;
  }

  private async requireById(id: string): Promise<GoldSellTransaction> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Gold sell transaction ${id} not found`);
    }
    return existing;
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- --runInBand tests/data/local/gold-repositories.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 13: Commit**

```bash
git add src/data/local/repositories/gold-record-mappers.ts src/data/local/repositories/gold-brand-repository.ts src/data/local/repositories/gold-lot-repository.ts src/data/local/repositories/gold-sell-transaction-repository.ts tests/data/local/gold-repositories.test.ts
git commit -m "feat: add gold brand, lot, and sell transaction repositories"
```

---

### Task 6: Use cases — create lot, manage brands

**Files:**
- Create: `src/core/application/gold/create-gold-lot.ts`
- Create: `src/core/application/gold/manage-gold-brands.ts`
- Test: `tests/core/gold/gold-use-cases.test.ts`

**Interfaces:**
- Consumes: `GoldLotRepository`, `GoldBrandRepository`, `CreateGoldLotInput`, `CreateGoldBrandInput` ports from Task 4/5; `GoldLotInput`, `GoldBrandInput` from Task 1.
- Produces:
  - `class CreateGoldLot { constructor(deps: { goldLotRepository: GoldLotRepository; now: () => string; deviceId: string; generateId: () => string }); execute(input: GoldLotInput): Promise<GoldLot> }`
  - `class CreateGoldBrand { constructor(deps: { goldBrandRepository: GoldBrandRepository; now: () => string; deviceId: string; generateId: () => string }); execute(input: GoldBrandInput): Promise<GoldBrand> }`
  - `class ListGoldBrands { constructor(deps: { goldBrandRepository: GoldBrandRepository }); execute(): Promise<GoldBrand[]> }`
  - `class DeleteGoldBrand { constructor(deps: { goldBrandRepository: GoldBrandRepository; now: () => string; deviceId: string; generateId: () => string }); execute(id: string): Promise<GoldBrand> }`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/core/gold/gold-use-cases.test.ts
import { randomUUID } from 'expo-crypto';

import { CreateGoldBrand, DeleteGoldBrand, ListGoldBrands } from '@/core/application/gold/manage-gold-brands';
import { CreateGoldLot } from '@/core/application/gold/create-gold-lot';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { openTestLocalDatabase } from '@/data/local/db/client';
import { GoldBrandRepository } from '@/data/local/repositories/gold-brand-repository';
import { GoldLotRepository } from '@/data/local/repositories/gold-lot-repository';

const deviceId = '550e8400-e29b-41d4-a716-446655440010';

describe('gold use cases', () => {
  let database: LocalDatabaseClient;
  let goldBrandRepository: GoldBrandRepository;
  let goldLotRepository: GoldLotRepository;
  let now: () => string;
  let generateId: () => string;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    goldBrandRepository = new GoldBrandRepository(database);
    goldLotRepository = new GoldLotRepository(database);
    now = () => '2026-08-24T10:00:00.000Z';
    generateId = () => randomUUID();
  });

  afterEach(async () => {
    await database.close();
  });

  describe('CreateGoldBrand / ListGoldBrands / DeleteGoldBrand', () => {
    it('creates a brand, lists it, then deletes it', async () => {
      const createGoldBrand = new CreateGoldBrand({ goldBrandRepository, now, deviceId, generateId });
      const listGoldBrands = new ListGoldBrands({ goldBrandRepository });
      const deleteGoldBrand = new DeleteGoldBrand({ goldBrandRepository, now, deviceId, generateId });

      const brand = await createGoldBrand.execute({ name: 'PNJ' });
      await expect(listGoldBrands.execute()).resolves.toEqual([brand]);

      await deleteGoldBrand.execute(brand.id);
      await expect(listGoldBrands.execute()).resolves.toEqual([]);
    });
  });

  describe('CreateGoldLot', () => {
    it('creates a lot as held with normalized grams, referencing an existing brand', async () => {
      const createGoldBrand = new CreateGoldBrand({ goldBrandRepository, now, deviceId, generateId });
      const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });

      const brand = await createGoldBrand.execute({ name: 'SJC' });
      const lot = await createGoldLot.execute({
        brandId: brand.id,
        purchaseDate: '2026-08-24',
        quantity: 2,
        unit: 'chi',
        totalAmount: 17000000,
      });

      expect(lot).toMatchObject({ brandId: brand.id, quantity: 2, unit: 'chi', quantityGrams: 7.5, status: 'held' });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/gold/gold-use-cases.test.ts`
Expected: FAIL with "Cannot find module '@/core/application/gold/manage-gold-brands'"

- [ ] **Step 3: Implement `manage-gold-brands.ts` and `create-gold-lot.ts`**

```typescript
// src/core/application/gold/manage-gold-brands.ts
import { GoldBrandRepository } from '@/core/application/ports/gold-repositories';
import { GoldBrand, GoldBrandInput } from '@/core/domain/gold/gold-brand';

export type GoldBrandUseCaseDeps = {
  goldBrandRepository: GoldBrandRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class CreateGoldBrand {
  constructor(private readonly deps: GoldBrandUseCaseDeps) {}

  async execute(input: GoldBrandInput): Promise<GoldBrand> {
    return this.deps.goldBrandRepository.create({
      ...input,
      id: this.deps.generateId(),
      operationId: this.deps.generateId(),
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
    });
  }
}

export class ListGoldBrands {
  constructor(private readonly deps: Pick<GoldBrandUseCaseDeps, 'goldBrandRepository'>) {}

  async execute(): Promise<GoldBrand[]> {
    return this.deps.goldBrandRepository.listActive();
  }
}

export class DeleteGoldBrand {
  constructor(private readonly deps: GoldBrandUseCaseDeps) {}

  /** Removes a brand from the selectable catalog. Never touches lots that reference it (spec §Quản lý thương hiệu). */
  async execute(id: string): Promise<GoldBrand> {
    return this.deps.goldBrandRepository.softDelete(id, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
  }
}
```

```typescript
// src/core/application/gold/create-gold-lot.ts
import { GoldLotRepository } from '@/core/application/ports/gold-repositories';
import { GoldLot, GoldLotInput } from '@/core/domain/gold/gold-lot';

export type CreateGoldLotDeps = {
  goldLotRepository: GoldLotRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class CreateGoldLot {
  constructor(private readonly deps: CreateGoldLotDeps) {}

  async execute(input: GoldLotInput): Promise<GoldLot> {
    return this.deps.goldLotRepository.create({
      ...input,
      id: this.deps.generateId(),
      operationId: this.deps.generateId(),
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/gold/gold-use-cases.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/application/gold/create-gold-lot.ts src/core/application/gold/manage-gold-brands.ts tests/core/gold/gold-use-cases.test.ts
git commit -m "feat: add gold lot creation and brand catalog use cases"
```

---

### Task 7: Use case — sell a gold lot

**Files:**
- Create: `src/core/application/gold/sell-gold-lot.ts`
- Test: `tests/core/gold/gold-use-cases.test.ts` (extend)

**Interfaces:**
- Consumes: `GoldLotRepository`, `GoldSellTransactionRepository` from Task 4/5; `GoldSellTransactionInput` from Task 1.
- Produces: `class SellGoldLot { constructor(deps: { goldLotRepository: GoldLotRepository; goldSellTransactionRepository: GoldSellTransactionRepository; now: () => string; deviceId: string; generateId: () => string }); execute(input: GoldSellTransactionInput): Promise<GoldSellTransaction> }`. Throws `Error('Gold lot not found')`, `Error('Gold lot is not available to sell')` (already sold or trashed), or `Error('Sale date must not be before the lot purchase date')`.

- [ ] **Step 1: Write the failing test**

```typescript
// append to tests/core/gold/gold-use-cases.test.ts (add imports at top)
import { SellGoldLot } from '@/core/application/gold/sell-gold-lot';
import { GoldSellTransactionRepository } from '@/data/local/repositories/gold-sell-transaction-repository';

// append new describe block:
describe('SellGoldLot', () => {
  it('sells a held lot, marking it sold and computing the correct lotId link', async () => {
    const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
    const createGoldBrand = new (require('@/core/application/gold/manage-gold-brands').CreateGoldBrand)({ goldBrandRepository, now, deviceId, generateId });
    const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
    const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });

    const brand = await createGoldBrand.execute({ name: 'PNJ' });
    const lot = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-12', quantity: 1, unit: 'chi', totalAmount: 8500000 });

    const sale = await sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-25', totalAmount: 8700000 });

    expect(sale).toMatchObject({ lotId: lot.id, totalAmount: 8700000 });
    await expect(goldLotRepository.findById(lot.id)).resolves.toMatchObject({ status: 'sold' });
  });

  it('rejects selling a lot that does not exist', async () => {
    const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
    const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });

    await expect(sellGoldLot.execute({ lotId: 'missing-lot', saleDate: '2026-08-25', totalAmount: 8700000 })).rejects.toThrow(
      'Gold lot not found',
    );
  });

  it('rejects selling a lot that is already sold', async () => {
    const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
    const createGoldBrand = new (require('@/core/application/gold/manage-gold-brands').CreateGoldBrand)({ goldBrandRepository, now, deviceId, generateId });
    const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
    const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });

    const brand = await createGoldBrand.execute({ name: 'SJC' });
    const lot = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-12', quantity: 1, unit: 'chi', totalAmount: 8500000 });
    await sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-20', totalAmount: 8700000 });

    await expect(sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-25', totalAmount: 8800000 })).rejects.toThrow(
      'Gold lot is not available to sell',
    );
  });

  it('rejects a sale date earlier than the purchase date', async () => {
    const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
    const createGoldBrand = new (require('@/core/application/gold/manage-gold-brands').CreateGoldBrand)({ goldBrandRepository, now, deviceId, generateId });
    const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
    const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });

    const brand = await createGoldBrand.execute({ name: 'DOJI' });
    const lot = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-20', quantity: 1, unit: 'chi', totalAmount: 8500000 });

    await expect(sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-19', totalAmount: 8700000 })).rejects.toThrow(
      'Sale date must not be before the lot purchase date',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/gold/gold-use-cases.test.ts`
Expected: FAIL with "Cannot find module '@/core/application/gold/sell-gold-lot'"

- [ ] **Step 3: Implement `sell-gold-lot.ts`**

```typescript
// src/core/application/gold/sell-gold-lot.ts
import { GoldLotRepository, GoldSellTransactionRepository } from '@/core/application/ports/gold-repositories';
import { GoldSellTransaction, GoldSellTransactionInput } from '@/core/domain/gold/gold-sell-transaction';

export type SellGoldLotDeps = {
  goldLotRepository: GoldLotRepository;
  goldSellTransactionRepository: GoldSellTransactionRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class SellGoldLot {
  constructor(private readonly deps: SellGoldLotDeps) {}

  async execute(input: GoldSellTransactionInput): Promise<GoldSellTransaction> {
    const lot = await this.deps.goldLotRepository.findById(input.lotId);
    if (!lot || lot.deletedAt !== null) {
      throw new Error('Gold lot not found');
    }
    if (lot.status !== 'held') {
      throw new Error('Gold lot is not available to sell');
    }
    if (input.saleDate < lot.purchaseDate) {
      throw new Error('Sale date must not be before the lot purchase date');
    }

    const sale = await this.deps.goldSellTransactionRepository.create({
      ...input,
      id: this.deps.generateId(),
      operationId: this.deps.generateId(),
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
    });

    await this.deps.goldLotRepository.markSold(lot.id, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });

    return sale;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/gold/gold-use-cases.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/application/gold/sell-gold-lot.ts tests/core/gold/gold-use-cases.test.ts
git commit -m "feat: add sell-gold-lot use case"
```

---

### Task 8: Use cases — trash, restore, purge

**Files:**
- Create: `src/core/application/gold/trash-gold-transaction.ts`
- Create: `src/core/application/gold/restore-gold-transaction.ts`
- Create: `src/core/application/gold/purge-gold-transaction.ts`
- Test: `tests/core/gold/gold-use-cases.test.ts` (extend)

**Interfaces:**
- Consumes: `GoldLotRepository`, `GoldSellTransactionRepository` from Task 4/5.
- Produces:
  - `class TrashGoldLot { execute(id: string): Promise<GoldLot> }` — throws `Error('Cannot trash a gold lot with an active sell transaction')` if `goldSellTransactionRepository.findActiveByLotId(id)` returns non-null.
  - `class TrashGoldSale { execute(id: string): Promise<GoldSellTransaction> }` — soft-deletes the sale, then calls `goldLotRepository.markHeld(sale.lotId, ...)`.
  - `class RestoreGoldLot { execute(id: string): Promise<GoldLot> }` — restores the lot (no dependency checks needed, since a lot can only be trashed when it has no active sale).
  - `class RestoreGoldSale { execute(id: string): Promise<GoldSellTransaction> }` — throws `Error('Cannot restore: the gold lot is no longer available')` if the lot is trashed or already `sold` (re-linked to a different active sale) or the sale date now precedes the lot's purchase date; otherwise restores the sale and calls `goldLotRepository.markSold`.
  - `class PurgeGoldLot { execute(id: string): Promise<void> }` — throws `Error('Cannot permanently delete a gold lot with an active sell transaction')` if an active sale still references it; otherwise appends a `delete`-kind change-log tombstone operation for the already-trashed lot without re-touching the entity row (uses `goldLotRepository.findById` + `goldLotRepository.saveWithOperation` with the existing payload, matching spec's "vẫn ghi change log/tombstone" requirement even though the row was already soft-deleted).
  - `class PurgeGoldSale { execute(id: string): Promise<void> }` — same tombstone-append pattern for a sale.

- [ ] **Step 1: Write the failing test**

```typescript
// append to tests/core/gold/gold-use-cases.test.ts (add imports at top)
import { TrashGoldLot, TrashGoldSale } from '@/core/application/gold/trash-gold-transaction';
import { RestoreGoldLot, RestoreGoldSale } from '@/core/application/gold/restore-gold-transaction';
import { PurgeGoldLot, PurgeGoldSale } from '@/core/application/gold/purge-gold-transaction';
import { ChangeLogRepository } from '@/data/local/repositories/change-log-repository';
import { CreateGoldBrand } from '@/core/application/gold/manage-gold-brands';
import { SellGoldLot } from '@/core/application/gold/sell-gold-lot';

describe('trash / restore / purge', () => {
  it('blocks trashing a lot with an active sale, allows it once the sale is trashed, and restore round-trips', async () => {
    const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
    const changeLogRepository = new ChangeLogRepository(database);
    const createGoldBrand = new CreateGoldBrand({ goldBrandRepository, now, deviceId, generateId });
    const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
    const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
    const trashGoldLot = new TrashGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
    const trashGoldSale = new TrashGoldSale({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
    const restoreGoldLot = new RestoreGoldLot({ goldLotRepository, now, deviceId, generateId });
    const restoreGoldSale = new RestoreGoldSale({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
    const purgeGoldLot = new PurgeGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
    const purgeGoldSale = new PurgeGoldSale({ goldSellTransactionRepository, now, deviceId, generateId });

    const brand = await createGoldBrand.execute({ name: 'PNJ' });
    const lot = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-12', quantity: 1, unit: 'chi', totalAmount: 8500000 });
    const sale = await sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-25', totalAmount: 8700000 });

    await expect(trashGoldLot.execute(lot.id)).rejects.toThrow('Cannot trash a gold lot with an active sell transaction');

    const trashedSale = await trashGoldSale.execute(sale.id);
    expect(trashedSale.deletedAt).not.toBeNull();
    await expect(goldLotRepository.findById(lot.id)).resolves.toMatchObject({ status: 'held' });

    const restoredSale = await restoreGoldSale.execute(sale.id);
    expect(restoredSale.deletedAt).toBeNull();
    await expect(goldLotRepository.findById(lot.id)).resolves.toMatchObject({ status: 'sold' });

    await trashGoldSale.execute(sale.id);
    const trashedLot = await trashGoldLot.execute(lot.id);
    expect(trashedLot.deletedAt).not.toBeNull();

    const restoredLot = await restoreGoldLot.execute(lot.id);
    expect(restoredLot.deletedAt).toBeNull();

    await trashGoldLot.execute(lot.id);
    await purgeGoldLot.execute(lot.id);
    const changeLogRepo = changeLogRepository;
    await expect(changeLogRepo.listPending()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ entityId: lot.id, operation: 'delete' })]),
    );

    await purgeGoldSale.execute(sale.id);
    await expect(changeLogRepo.listPending()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ entityId: sale.id, operation: 'delete' })]),
    );
  });

  it('rejects restoring a sale whose lot has been re-sold to another sale', async () => {
    const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
    const createGoldBrand = new CreateGoldBrand({ goldBrandRepository, now, deviceId, generateId });
    const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
    const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
    const trashGoldSale = new TrashGoldSale({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
    const restoreGoldSale = new RestoreGoldSale({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });

    const brand = await createGoldBrand.execute({ name: 'SJC' });
    const lot = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-12', quantity: 1, unit: 'chi', totalAmount: 8500000 });
    const firstSale = await sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-20', totalAmount: 8700000 });
    await trashGoldSale.execute(firstSale.id);
    await sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-22', totalAmount: 8600000 });

    await expect(restoreGoldSale.execute(firstSale.id)).rejects.toThrow('Cannot restore: the gold lot is no longer available');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/gold/gold-use-cases.test.ts`
Expected: FAIL with "Cannot find module '@/core/application/gold/trash-gold-transaction'"

- [ ] **Step 3: Implement `trash-gold-transaction.ts`**

```typescript
// src/core/application/gold/trash-gold-transaction.ts
import { GoldLotRepository, GoldSellTransactionRepository } from '@/core/application/ports/gold-repositories';
import { GoldLot } from '@/core/domain/gold/gold-lot';
import { GoldSellTransaction } from '@/core/domain/gold/gold-sell-transaction';

export type TrashGoldDeps = {
  goldLotRepository: GoldLotRepository;
  goldSellTransactionRepository: GoldSellTransactionRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class TrashGoldLot {
  constructor(private readonly deps: TrashGoldDeps) {}

  async execute(id: string): Promise<GoldLot> {
    const activeSale = await this.deps.goldSellTransactionRepository.findActiveByLotId(id);
    if (activeSale) {
      throw new Error('Cannot trash a gold lot with an active sell transaction');
    }
    return this.deps.goldLotRepository.softDelete(id, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
  }
}

export class TrashGoldSale {
  constructor(private readonly deps: TrashGoldDeps) {}

  async execute(id: string): Promise<GoldSellTransaction> {
    const trashed = await this.deps.goldSellTransactionRepository.softDelete(id, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
    await this.deps.goldLotRepository.markHeld(trashed.lotId, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
    return trashed;
  }
}
```

- [ ] **Step 4: Implement `restore-gold-transaction.ts`**

```typescript
// src/core/application/gold/restore-gold-transaction.ts
import { GoldLotRepository, GoldSellTransactionRepository } from '@/core/application/ports/gold-repositories';
import { GoldLot } from '@/core/domain/gold/gold-lot';
import { GoldSellTransaction } from '@/core/domain/gold/gold-sell-transaction';

export type RestoreGoldLotDeps = {
  goldLotRepository: GoldLotRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class RestoreGoldLot {
  constructor(private readonly deps: RestoreGoldLotDeps) {}

  async execute(id: string): Promise<GoldLot> {
    return this.deps.goldLotRepository.restore(id, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
  }
}

export type RestoreGoldSaleDeps = {
  goldLotRepository: GoldLotRepository;
  goldSellTransactionRepository: GoldSellTransactionRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class RestoreGoldSale {
  constructor(private readonly deps: RestoreGoldSaleDeps) {}

  async execute(id: string): Promise<GoldSellTransaction> {
    const sale = await this.deps.goldSellTransactionRepository.findById(id);
    if (!sale) {
      throw new Error('Gold sell transaction not found');
    }

    const lot = await this.deps.goldLotRepository.findById(sale.lotId);
    const lotStillAvailable = lot && lot.deletedAt === null && lot.status === 'held';
    const dateStillValid = lot ? sale.saleDate >= lot.purchaseDate : false;
    if (!lotStillAvailable || !dateStillValid) {
      throw new Error('Cannot restore: the gold lot is no longer available');
    }

    const restored = await this.deps.goldSellTransactionRepository.restore(id, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
    await this.deps.goldLotRepository.markSold(lot.id, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
    return restored;
  }
}
```

- [ ] **Step 5: Implement `purge-gold-transaction.ts`**

```typescript
// src/core/application/gold/purge-gold-transaction.ts
import { GoldLotRepository, GoldSellTransactionRepository } from '@/core/application/ports/gold-repositories';
import { SyncOperation } from '@/core/domain/sync/sync-operation';

export type PurgeGoldLotDeps = {
  goldLotRepository: GoldLotRepository;
  goldSellTransactionRepository: GoldSellTransactionRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class PurgeGoldLot {
  constructor(private readonly deps: PurgeGoldLotDeps) {}

  /**
   * Permanently removes a trashed lot from active use. The row was already
   * soft-deleted by TrashGoldLot; this appends one more tombstone-equivalent
   * change-log entry (spec §Xóa vĩnh viễn: "phải ghi change log/tombstone
   * cần thiết để không làm giao dịch xuất hiện lại khi dùng cơ chế
   * sync-package hiện có") without mutating the entity payload further.
   */
  async execute(id: string): Promise<void> {
    const activeSale = await this.deps.goldSellTransactionRepository.findActiveByLotId(id);
    if (activeSale) {
      throw new Error('Cannot permanently delete a gold lot with an active sell transaction');
    }
    const lot = await this.deps.goldLotRepository.findById(id);
    if (!lot) {
      throw new Error('Gold lot not found');
    }

    const operation: SyncOperation = {
      operationId: this.deps.generateId(),
      entityType: 'gold_lot',
      entityId: lot.id,
      operation: 'delete',
      payload: lot,
      originDeviceId: this.deps.deviceId,
      revision: lot.revision,
      createdAt: this.deps.now(),
    };
    await this.deps.goldLotRepository.saveWithOperation(lot, operation);
  }
}

export type PurgeGoldSaleDeps = {
  goldSellTransactionRepository: GoldSellTransactionRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class PurgeGoldSale {
  constructor(private readonly deps: PurgeGoldSaleDeps) {}

  async execute(id: string): Promise<void> {
    const sale = await this.deps.goldSellTransactionRepository.findById(id);
    if (!sale) {
      throw new Error('Gold sell transaction not found');
    }

    const operation: SyncOperation = {
      operationId: this.deps.generateId(),
      entityType: 'gold_sell_transaction',
      entityId: sale.id,
      operation: 'delete',
      payload: sale,
      originDeviceId: this.deps.deviceId,
      revision: sale.revision,
      createdAt: this.deps.now(),
    };
    await this.deps.goldSellTransactionRepository.saveWithOperation(sale, operation);
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/gold/gold-use-cases.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 7: Commit**

```bash
git add src/core/application/gold/trash-gold-transaction.ts src/core/application/gold/restore-gold-transaction.ts src/core/application/gold/purge-gold-transaction.ts tests/core/gold/gold-use-cases.test.ts
git commit -m "feat: add gold trash, restore, and purge use cases"
```

---

### Task 9: Overview aggregation use case

**Files:**
- Create: `src/core/application/gold/get-gold-overview.ts`
- Test: `tests/core/gold/gold-use-cases.test.ts` (extend)

**Interfaces:**
- Consumes: `GoldLotRepository` from Task 4.
- Produces: `class GetGoldOverview { constructor(deps: { goldLotRepository: GoldLotRepository }); execute(): Promise<{ totalQuantityGrams: number; totalCostBasis: number; heldLots: GoldLot[] }> }` — matches the UI card's "Khối lượng" + "Giá vốn" totals (spec §Cấu trúc màn hình, reduced-scope card).

- [ ] **Step 1: Write the failing test**

```typescript
// append to tests/core/gold/gold-use-cases.test.ts (add import at top)
import { GetGoldOverview } from '@/core/application/gold/get-gold-overview';

describe('GetGoldOverview', () => {
  it('sums quantity and cost basis across held lots only', async () => {
    const createGoldBrand = new CreateGoldBrand({ goldBrandRepository, now, deviceId, generateId });
    const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
    const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
    const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
    const getGoldOverview = new GetGoldOverview({ goldLotRepository });

    const brand = await createGoldBrand.execute({ name: 'PNJ' });
    const lotA = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-12', quantity: 2, unit: 'chi', totalAmount: 17000000 });
    const lotB = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-20', quantity: 1, unit: 'chi', totalAmount: 8500000 });
    await sellGoldLot.execute({ lotId: lotB.id, saleDate: '2026-08-25', totalAmount: 8700000 });

    const overview = await getGoldOverview.execute();

    expect(overview.totalQuantityGrams).toBeCloseTo(7.5, 10);
    expect(overview.totalCostBasis).toBe(17000000);
    expect(overview.heldLots).toEqual([lotA]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/core/gold/gold-use-cases.test.ts`
Expected: FAIL with "Cannot find module '@/core/application/gold/get-gold-overview'"

- [ ] **Step 3: Implement `get-gold-overview.ts`**

```typescript
// src/core/application/gold/get-gold-overview.ts
import { GoldLotRepository } from '@/core/application/ports/gold-repositories';
import { GoldLot } from '@/core/domain/gold/gold-lot';

export type GoldOverview = {
  totalQuantityGrams: number;
  totalCostBasis: number;
  heldLots: GoldLot[];
};

export class GetGoldOverview {
  constructor(private readonly deps: { goldLotRepository: GoldLotRepository }) {}

  async execute(): Promise<GoldOverview> {
    const heldLots = await this.deps.goldLotRepository.list({ status: 'held' });
    return {
      totalQuantityGrams: heldLots.reduce((sum, lot) => sum + lot.quantityGrams, 0),
      totalCostBasis: heldLots.reduce((sum, lot) => sum + lot.totalAmount, 0),
      heldLots,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/core/gold/gold-use-cases.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/application/gold/get-gold-overview.ts tests/core/gold/gold-use-cases.test.ts
git commit -m "feat: add gold overview aggregation use case"
```

---

### Task 10: Composition root — `gold-dependencies.ts`

**Files:**
- Create: `src/features/gold/gold-dependencies.ts`

**Interfaces:**
- Consumes: every repository (Task 5) and use case (Tasks 6–9); `DeviceIdentity` from `@/infrastructure/expo/device-identity/device-identity` (existing, reused as-is); `randomUUID` from `expo-crypto`.
- Produces: `type GoldDependencies = { goldBrandRepository; goldLotRepository; goldSellTransactionRepository; createGoldLot; createGoldBrand; listGoldBrands; deleteGoldBrand; sellGoldLot; trashGoldLot; trashGoldSale; restoreGoldLot; restoreGoldSale; purgeGoldLot; purgeGoldSale; getGoldOverview }` and `async function createGoldDependencies(database: LocalDatabaseClient): Promise<GoldDependencies>`.

This task has no dedicated test (it is a thin composition wrapper); Task 11's view-model test exercises it end-to-end against a real test database, mirroring how `finance-dependencies.ts` has no standalone test either.

- [ ] **Step 1: Implement `gold-dependencies.ts`**

```typescript
// src/features/gold/gold-dependencies.ts
import { randomUUID } from 'expo-crypto';

import { CreateGoldLot } from '@/core/application/gold/create-gold-lot';
import { GetGoldOverview } from '@/core/application/gold/get-gold-overview';
import { CreateGoldBrand, DeleteGoldBrand, ListGoldBrands } from '@/core/application/gold/manage-gold-brands';
import { PurgeGoldLot, PurgeGoldSale } from '@/core/application/gold/purge-gold-transaction';
import { RestoreGoldLot, RestoreGoldSale } from '@/core/application/gold/restore-gold-transaction';
import { SellGoldLot } from '@/core/application/gold/sell-gold-lot';
import { TrashGoldLot, TrashGoldSale } from '@/core/application/gold/trash-gold-transaction';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { GoldBrandRepository } from '@/data/local/repositories/gold-brand-repository';
import { GoldLotRepository } from '@/data/local/repositories/gold-lot-repository';
import { GoldSellTransactionRepository } from '@/data/local/repositories/gold-sell-transaction-repository';
import { DeviceIdentity } from '@/infrastructure/expo/device-identity/device-identity';

export type GoldDependencies = {
  goldBrandRepository: GoldBrandRepository;
  goldLotRepository: GoldLotRepository;
  goldSellTransactionRepository: GoldSellTransactionRepository;
  createGoldLot: CreateGoldLot;
  createGoldBrand: CreateGoldBrand;
  listGoldBrands: ListGoldBrands;
  deleteGoldBrand: DeleteGoldBrand;
  sellGoldLot: SellGoldLot;
  trashGoldLot: TrashGoldLot;
  trashGoldSale: TrashGoldSale;
  restoreGoldLot: RestoreGoldLot;
  restoreGoldSale: RestoreGoldSale;
  purgeGoldLot: PurgeGoldLot;
  purgeGoldSale: PurgeGoldSale;
  getGoldOverview: GetGoldOverview;
};

/**
 * Composes every gold repository and use case for a single
 * `LocalDatabaseClient`, mirroring `createFinanceDependencies`
 * (`src/features/finance/finance-dependencies.ts`). Async because resolving
 * a stable device identity touches secure storage.
 */
export async function createGoldDependencies(database: LocalDatabaseClient): Promise<GoldDependencies> {
  const now = () => new Date().toISOString();
  const generateId = () => randomUUID();
  const deviceId = await new DeviceIdentity().get();
  const shared = { now, deviceId, generateId };

  const goldBrandRepository = new GoldBrandRepository(database);
  const goldLotRepository = new GoldLotRepository(database);
  const goldSellTransactionRepository = new GoldSellTransactionRepository(database);

  return {
    goldBrandRepository,
    goldLotRepository,
    goldSellTransactionRepository,
    createGoldLot: new CreateGoldLot({ goldLotRepository, ...shared }),
    createGoldBrand: new CreateGoldBrand({ goldBrandRepository, ...shared }),
    listGoldBrands: new ListGoldBrands({ goldBrandRepository }),
    deleteGoldBrand: new DeleteGoldBrand({ goldBrandRepository, ...shared }),
    sellGoldLot: new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, ...shared }),
    trashGoldLot: new TrashGoldLot({ goldLotRepository, goldSellTransactionRepository, ...shared }),
    trashGoldSale: new TrashGoldSale({ goldLotRepository, goldSellTransactionRepository, ...shared }),
    restoreGoldLot: new RestoreGoldLot({ goldLotRepository, ...shared }),
    restoreGoldSale: new RestoreGoldSale({ goldLotRepository, goldSellTransactionRepository, ...shared }),
    purgeGoldLot: new PurgeGoldLot({ goldLotRepository, goldSellTransactionRepository, ...shared }),
    purgeGoldSale: new PurgeGoldSale({ goldSellTransactionRepository, ...shared }),
    getGoldOverview: new GetGoldOverview({ goldLotRepository }),
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/gold/gold-dependencies.ts
git commit -m "feat: add gold feature composition root"
```

---

### Task 11: Presentation helpers and `useGoldManagement` view-model

**Files:**
- Create: `src/features/gold/view-models/gold-presentation.ts`
- Create: `src/features/gold/view-models/use-gold-management.ts`
- Test: `tests/features/gold/use-gold-management.test.ts`

**Interfaces:**
- Consumes: `GoldDependencies` from Task 10; `Translate` type from `@/i18n/translations` (existing); `formatVnd` from `@/core/domain/finance/money` (existing, reused as-is).
- Produces:
  - `gold-presentation.ts`: `formatGoldWeight(quantity: number, unit: GoldWeightUnit, t: Translate): string` (e.g. "2 chỉ"), `buildLotHistoryRow(lot: GoldLot, brandName: string): { id; title; subtitle; amountLabel }`, `buildSaleHistoryRow(sale: GoldSellTransaction, lot: GoldLot | null, brandName: string): { id; title; subtitle; amountLabel }`.
  - `use-gold-management.ts`: `export type GoldManagementDependencies = Pick<GoldDependencies, 'goldLotRepository' | 'goldSellTransactionRepository' | 'goldBrandRepository' | 'createGoldLot' | 'createGoldBrand' | 'deleteGoldBrand' | 'listGoldBrands' | 'sellGoldLot' | 'trashGoldLot' | 'trashGoldSale' | 'restoreGoldLot' | 'restoreGoldSale' | 'purgeGoldLot' | 'purgeGoldSale' | 'getGoldOverview'>` and `function useGoldManagement(options: { dependencies: GoldManagementDependencies; t: Translate }): GoldManagementViewModel` where `GoldManagementViewModel` exposes `{ overview: GoldOverview | null; heldLots: LotHistoryRow[]; trashedLots: LotHistoryRow[]; trashedSales: SaleHistoryRow[]; brands: GoldBrand[]; loading: boolean; error: string | null; reload(): Promise<void>; addBrand(name: string): Promise<void>; removeBrand(id: string): Promise<void>; createLot(input: GoldLotInput): Promise<void>; sellLot(input: GoldSellTransactionInput): Promise<void>; trashLot(id: string): Promise<void>; trashSale(id: string): Promise<void>; restoreLot(id: string): Promise<void>; restoreSale(id: string): Promise<void>; purgeLot(id: string): Promise<void>; purgeSale(id: string): Promise<void> }`.

This mirrors `use-transactions.ts`'s shape: a `load()` callback populating state via `Promise.all`, mutation methods that call a use case then re-`load()`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/features/gold/use-gold-management.test.ts
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createGoldDependencies } from '@/features/gold/gold-dependencies';
import { useGoldManagement } from '@/features/gold/view-models/use-gold-management';
import { openTestLocalDatabase, LocalDatabaseClient } from '@/data/local/db/client';
import { en } from '@/i18n/locales/en';
import { Translate } from '@/i18n/translations';

function makeTranslate(): Translate {
  return ((key: keyof typeof en) => en[key]) as Translate;
}

describe('useGoldManagement', () => {
  let database: LocalDatabaseClient;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
  });

  afterEach(async () => {
    await database.close();
  });

  it('loads an empty overview, then adds a brand and a lot, then sells the lot', async () => {
    const dependencies = await createGoldDependencies(database);
    const { result } = renderHook(() => useGoldManagement({ dependencies, t: makeTranslate() }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.heldLots).toEqual([]);
    expect(result.current.brands).toEqual([]);

    await act(async () => {
      await result.current.addBrand('PNJ');
    });
    expect(result.current.brands).toHaveLength(1);
    const brandId = result.current.brands[0].id;

    await act(async () => {
      await result.current.createLot({ brandId, purchaseDate: '2026-08-24', quantity: 2, unit: 'chi', totalAmount: 17000000 });
    });
    expect(result.current.heldLots).toHaveLength(1);
    expect(result.current.overview?.totalCostBasis).toBe(17000000);

    const lotId = result.current.heldLots[0].id;
    await act(async () => {
      await result.current.sellLot({ lotId, saleDate: '2026-08-25', totalAmount: 8700000 });
    });
    expect(result.current.heldLots).toEqual([]);
    expect(result.current.overview?.totalCostBasis).toBe(0);
  });

  it('trashes a lot, sees it in trashedLots, then restores it', async () => {
    const dependencies = await createGoldDependencies(database);
    const { result } = renderHook(() => useGoldManagement({ dependencies, t: makeTranslate() }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addBrand('SJC');
    });
    const brandId = result.current.brands[0].id;
    await act(async () => {
      await result.current.createLot({ brandId, purchaseDate: '2026-08-24', quantity: 1, unit: 'chi', totalAmount: 8500000 });
    });
    const lotId = result.current.heldLots[0].id;

    await act(async () => {
      await result.current.trashLot(lotId);
    });
    expect(result.current.heldLots).toEqual([]);
    expect(result.current.trashedLots).toHaveLength(1);

    await act(async () => {
      await result.current.restoreLot(lotId);
    });
    expect(result.current.heldLots).toHaveLength(1);
    expect(result.current.trashedLots).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/features/gold/use-gold-management.test.ts`
Expected: FAIL with "Cannot find module '@/features/gold/view-models/use-gold-management'"

- [ ] **Step 3: Implement `gold-presentation.ts`**

```typescript
// src/features/gold/view-models/gold-presentation.ts
import { GoldLot } from '@/core/domain/gold/gold-lot';
import { GoldSellTransaction } from '@/core/domain/gold/gold-sell-transaction';
import { GoldWeightUnit } from '@/core/domain/gold/gold-weight';
import { formatVnd } from '@/core/domain/finance/money';
import { Translate } from '@/i18n/translations';

const UNIT_LABEL_KEY: Record<GoldWeightUnit, keyof ReturnType<typeof unitLabelKeys>> = {
  luong: 'goldUnitLuong',
  chi: 'goldUnitChi',
  phan: 'goldUnitPhan',
  gram: 'goldUnitGram',
};

function unitLabelKeys() {
  return {
    goldUnitLuong: 'luong',
    goldUnitChi: 'chi',
    goldUnitPhan: 'phan',
    goldUnitGram: 'gram',
  } as const;
}

export function formatGoldWeight(quantity: number, unit: GoldWeightUnit, t: Translate): string {
  const label = t(UNIT_LABEL_KEY[unit]);
  return `${quantity} ${label}`;
}

export type LotHistoryRow = {
  id: string;
  title: string;
  subtitle: string;
  amountLabel: string;
};

export function buildLotHistoryRow(lot: GoldLot, brandName: string, t: Translate): LotHistoryRow {
  return {
    id: lot.id,
    title: brandName,
    subtitle: `${lot.purchaseDate} · ${formatGoldWeight(lot.quantity, lot.unit, t)}`,
    amountLabel: formatVnd(lot.totalAmount),
  };
}

export type SaleHistoryRow = {
  id: string;
  title: string;
  subtitle: string;
  amountLabel: string;
};

export function buildSaleHistoryRow(sale: GoldSellTransaction, lot: GoldLot | null, brandName: string, t: Translate): SaleHistoryRow {
  const weightLabel = lot ? formatGoldWeight(lot.quantity, lot.unit, t) : '';
  return {
    id: sale.id,
    title: `${t('goldSaleLabel')} ${brandName}`,
    subtitle: `${sale.saleDate} · ${weightLabel}`,
    amountLabel: formatVnd(sale.totalAmount),
  };
}
```

- [ ] **Step 4: Implement `use-gold-management.ts`**

```typescript
// src/features/gold/view-models/use-gold-management.ts
import { useCallback, useEffect, useState } from 'react';

import { GoldOverview } from '@/core/application/gold/get-gold-overview';
import { GoldBrand } from '@/core/domain/gold/gold-brand';
import { GoldLot, GoldLotInput } from '@/core/domain/gold/gold-lot';
import { GoldSellTransactionInput } from '@/core/domain/gold/gold-sell-transaction';
import { GoldDependencies } from '@/features/gold/gold-dependencies';
import { Translate } from '@/i18n/translations';

import { buildLotHistoryRow, buildSaleHistoryRow, LotHistoryRow, SaleHistoryRow } from './gold-presentation';

export type GoldManagementDependencies = Pick<
  GoldDependencies,
  | 'goldLotRepository'
  | 'goldSellTransactionRepository'
  | 'goldBrandRepository'
  | 'createGoldLot'
  | 'createGoldBrand'
  | 'deleteGoldBrand'
  | 'listGoldBrands'
  | 'sellGoldLot'
  | 'trashGoldLot'
  | 'trashGoldSale'
  | 'restoreGoldLot'
  | 'restoreGoldSale'
  | 'purgeGoldLot'
  | 'purgeGoldSale'
  | 'getGoldOverview'
>;

export type GoldManagementViewModel = {
  overview: GoldOverview | null;
  heldLots: LotHistoryRow[];
  trashedLots: LotHistoryRow[];
  trashedSales: SaleHistoryRow[];
  brands: GoldBrand[];
  loading: boolean;
  error: string | null;
  reload(): Promise<void>;
  addBrand(name: string): Promise<void>;
  removeBrand(id: string): Promise<void>;
  createLot(input: GoldLotInput): Promise<void>;
  sellLot(input: GoldSellTransactionInput): Promise<void>;
  trashLot(id: string): Promise<void>;
  trashSale(id: string): Promise<void>;
  restoreLot(id: string): Promise<void>;
  restoreSale(id: string): Promise<void>;
  purgeLot(id: string): Promise<void>;
  purgeSale(id: string): Promise<void>;
};

export function useGoldManagement(options: { dependencies: GoldManagementDependencies; t: Translate }): GoldManagementViewModel {
  const { dependencies, t } = options;
  const [overview, setOverview] = useState<GoldOverview | null>(null);
  const [heldLots, setHeldLots] = useState<LotHistoryRow[]>([]);
  const [trashedLots, setTrashedLots] = useState<LotHistoryRow[]>([]);
  const [trashedSales, setTrashedSales] = useState<SaleHistoryRow[]>([]);
  const [brands, setBrands] = useState<GoldBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewResult, activeLots, deletedLots, deletedSales, brandList] = await Promise.all([
        dependencies.getGoldOverview.execute(),
        dependencies.goldLotRepository.list({ status: 'held' }),
        dependencies.goldLotRepository.list({ includeDeleted: true }).then((lots: GoldLot[]) => lots.filter((lot) => lot.deletedAt !== null)),
        dependencies.goldSellTransactionRepository.list({ includeDeleted: true }).then((sales) => sales.filter((sale) => sale.deletedAt !== null)),
        dependencies.listGoldBrands.execute(),
      ]);

      const brandNameById = new Map(brandList.map((brand) => [brand.id, brand.name] as const));
      const nameFor = (brandId: string) => brandNameById.get(brandId) ?? brandId;

      setOverview(overviewResult);
      setHeldLots(activeLots.map((lot) => buildLotHistoryRow(lot, nameFor(lot.brandId), t)));
      setTrashedLots(deletedLots.map((lot) => buildLotHistoryRow(lot, nameFor(lot.brandId), t)));

      const lotById = new Map<string, GoldLot>();
      for (const lot of [...activeLots, ...deletedLots]) {
        lotById.set(lot.id, lot);
      }
      setTrashedSales(
        deletedSales.map((sale) => {
          const lot = lotById.get(sale.lotId) ?? null;
          return buildSaleHistoryRow(sale, lot, lot ? nameFor(lot.brandId) : '', t);
        }),
      );
      setBrands(brandList);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [dependencies, t]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    overview,
    heldLots,
    trashedLots,
    trashedSales,
    brands,
    loading,
    error,
    reload: load,
    addBrand: async (name: string) => {
      await dependencies.createGoldBrand.execute({ name });
      await load();
    },
    removeBrand: async (id: string) => {
      await dependencies.deleteGoldBrand.execute(id);
      await load();
    },
    createLot: async (input: GoldLotInput) => {
      await dependencies.createGoldLot.execute(input);
      await load();
    },
    sellLot: async (input: GoldSellTransactionInput) => {
      await dependencies.sellGoldLot.execute(input);
      await load();
    },
    trashLot: async (id: string) => {
      await dependencies.trashGoldLot.execute(id);
      await load();
    },
    trashSale: async (id: string) => {
      await dependencies.trashGoldSale.execute(id);
      await load();
    },
    restoreLot: async (id: string) => {
      await dependencies.restoreGoldLot.execute(id);
      await load();
    },
    restoreSale: async (id: string) => {
      await dependencies.restoreGoldSale.execute(id);
      await load();
    },
    purgeLot: async (id: string) => {
      await dependencies.purgeGoldLot.execute(id);
      await load();
    },
    purgeSale: async (id: string) => {
      await dependencies.purgeGoldSale.execute(id);
      await load();
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --runInBand tests/features/gold/use-gold-management.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/features/gold/view-models/gold-presentation.ts src/features/gold/view-models/use-gold-management.ts tests/features/gold/use-gold-management.test.ts
git commit -m "feat: add gold presentation helpers and useGoldManagement view-model"
```

---

### Task 12: i18n keys

**Files:**
- Modify: `src/i18n/locales/vi.ts`
- Modify: `src/i18n/locales/en.ts`
- Create: `tests/i18n/gold-component-keys.test.ts`

**Interfaces:**
- Consumes: nothing new — extends the existing flat key→string maps.
- Produces: the following keys added to both locale files: `goldUnitLuong`, `goldUnitChi`, `goldUnitPhan`, `goldUnitGram`, `goldSaleLabel`, `goldOverviewTitle`, `goldOverviewSubtitle`, `goldQuantityLabel`, `goldCostBasisLabel`, `goldHistoryTitle`, `goldTrashLabel`, `goldAddTransactionTitle`, `goldAddTransactionSubtitle`, `goldBuyActionTitle`, `goldBuyActionSubtitle`, `goldSellActionTitle`, `goldSellActionSubtitle`, `goldBuyFormTitle`, `goldSellFormTitle`, `goldDateFieldLabel`, `goldBrandFieldLabel`, `goldSellPlaceLabel`, `goldAddNewBrandOption`, `goldLotFieldLabel`, `goldQuantityFieldLabel`, `goldUnitFieldLabel`, `goldBuyTotalLabel`, `goldSellTotalLabel`, `goldSaveBuyLabel`, `goldSaveSellLabel`, `goldManageBrandsTitle`, `goldManageBrandsSubtitle`, `goldAddBrandLabel`, `goldAddBrandPlaceholder`, `goldSaveBrandLabel`, `goldTrashSheetTitle`, `goldTrashSheetSubtitle`, `goldRestoreLabel`, `goldPurgeConfirmMessage`, `goldTrashBlockedMessage`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/i18n/gold-component-keys.test.ts
import { en } from '@/i18n/locales/en';
import { vi } from '@/i18n/locales/vi';

const goldComponentKeys = [
  'goldUnitLuong',
  'goldUnitChi',
  'goldUnitPhan',
  'goldUnitGram',
  'goldSaleLabel',
  'goldOverviewTitle',
  'goldOverviewSubtitle',
  'goldQuantityLabel',
  'goldCostBasisLabel',
  'goldHistoryTitle',
  'goldTrashLabel',
  'goldAddTransactionTitle',
  'goldAddTransactionSubtitle',
  'goldBuyActionTitle',
  'goldBuyActionSubtitle',
  'goldSellActionTitle',
  'goldSellActionSubtitle',
  'goldBuyFormTitle',
  'goldSellFormTitle',
  'goldDateFieldLabel',
  'goldBrandFieldLabel',
  'goldSellPlaceLabel',
  'goldAddNewBrandOption',
  'goldLotFieldLabel',
  'goldQuantityFieldLabel',
  'goldUnitFieldLabel',
  'goldBuyTotalLabel',
  'goldSellTotalLabel',
  'goldSaveBuyLabel',
  'goldSaveSellLabel',
  'goldManageBrandsTitle',
  'goldManageBrandsSubtitle',
  'goldAddBrandLabel',
  'goldAddBrandPlaceholder',
  'goldSaveBrandLabel',
  'goldTrashSheetTitle',
  'goldTrashSheetSubtitle',
  'goldRestoreLabel',
  'goldPurgeConfirmMessage',
  'goldTrashBlockedMessage',
] as const;

describe('gold component translations', () => {
  it.each(goldComponentKeys)('defines %s in every locale', (key) => {
    expect(en[key]).toEqual(expect.any(String));
    expect(vi[key]).toEqual(expect.any(String));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/i18n/gold-component-keys.test.ts`
Expected: FAIL — TypeScript errors / `undefined` values, since these keys do not exist yet in `en`/`vi`.

- [ ] **Step 3: Add the keys to both locale files**

Append to `src/i18n/locales/vi.ts` (inside the exported object, alongside the existing finance keys):

```typescript
  goldUnitLuong: 'lượng/cây',
  goldUnitChi: 'chỉ',
  goldUnitPhan: 'phân',
  goldUnitGram: 'gram',
  goldSaleLabel: 'Bán',
  goldOverviewTitle: 'Vàng của tôi',
  goldOverviewSubtitle: 'Tổng quan tài sản vàng đã mua',
  goldQuantityLabel: 'Khối lượng',
  goldCostBasisLabel: 'Giá vốn',
  goldHistoryTitle: 'Lịch sử giao dịch',
  goldTrashLabel: 'Thùng rác',
  goldAddTransactionTitle: 'Thêm giao dịch',
  goldAddTransactionSubtitle: 'Ghi lại lần mua hoặc bán vàng',
  goldBuyActionTitle: 'Mua vàng',
  goldBuyActionSubtitle: 'Tạo một lô nhẫn trơn 9999 mới',
  goldSellActionTitle: 'Bán vàng',
  goldSellActionSubtitle: 'Chọn lô mua và lượng muốn bán',
  goldBuyFormTitle: 'Thêm giao dịch mua',
  goldSellFormTitle: 'Thêm giao dịch bán',
  goldDateFieldLabel: 'Ngày giao dịch',
  goldBrandFieldLabel: 'Thương hiệu / nơi mua',
  goldSellPlaceLabel: 'Vàng đã mua',
  goldAddNewBrandOption: '+ Thêm thương hiệu mới…',
  goldLotFieldLabel: 'Vàng đã mua',
  goldQuantityFieldLabel: 'Khối lượng',
  goldUnitFieldLabel: 'Đơn vị',
  goldBuyTotalLabel: 'Tổng tiền thực trả',
  goldSellTotalLabel: 'Tổng tiền thực nhận',
  goldSaveBuyLabel: 'Lưu giao dịch mua',
  goldSaveSellLabel: 'Lưu giao dịch bán',
  goldManageBrandsTitle: 'Thương hiệu vàng',
  goldManageBrandsSubtitle: 'Quản lý danh sách chọn khi thêm giao dịch mua',
  goldAddBrandLabel: 'Thêm thương hiệu mới',
  goldAddBrandPlaceholder: 'VD: PNJ, SJC, DOJI...',
  goldSaveBrandLabel: 'Thêm thương hiệu',
  goldTrashSheetTitle: 'Thùng rác',
  goldTrashSheetSubtitle: 'Giao dịch không còn được tính vào số liệu',
  goldRestoreLabel: 'Khôi phục',
  goldPurgeConfirmMessage: 'Xoá vĩnh viễn giao dịch này? Thao tác không thể hoàn tác.',
  goldTrashBlockedMessage: 'Không thể xoá lô mua đang có giao dịch bán liên quan. Hãy xoá lần bán trước.',
```

Append to `src/i18n/locales/en.ts`:

```typescript
  goldUnitLuong: 'tael',
  goldUnitChi: 'chi',
  goldUnitPhan: 'phan',
  goldUnitGram: 'gram',
  goldSaleLabel: 'Sold',
  goldOverviewTitle: 'My gold',
  goldOverviewSubtitle: 'Overview of gold you have bought',
  goldQuantityLabel: 'Quantity',
  goldCostBasisLabel: 'Cost basis',
  goldHistoryTitle: 'Transaction history',
  goldTrashLabel: 'Trash',
  goldAddTransactionTitle: 'Add transaction',
  goldAddTransactionSubtitle: 'Record a gold purchase or sale',
  goldBuyActionTitle: 'Buy gold',
  goldBuyActionSubtitle: 'Create a new 9999 plain ring lot',
  goldSellActionTitle: 'Sell gold',
  goldSellActionSubtitle: 'Choose a purchased lot to sell',
  goldBuyFormTitle: 'Add purchase',
  goldSellFormTitle: 'Add sale',
  goldDateFieldLabel: 'Transaction date',
  goldBrandFieldLabel: 'Brand / place of purchase',
  goldSellPlaceLabel: 'Purchased gold',
  goldAddNewBrandOption: '+ Add new brand…',
  goldLotFieldLabel: 'Purchased gold',
  goldQuantityFieldLabel: 'Quantity',
  goldUnitFieldLabel: 'Unit',
  goldBuyTotalLabel: 'Total amount paid',
  goldSellTotalLabel: 'Total amount received',
  goldSaveBuyLabel: 'Save purchase',
  goldSaveSellLabel: 'Save sale',
  goldManageBrandsTitle: 'Gold brands',
  goldManageBrandsSubtitle: 'Manage the list shown when adding a purchase',
  goldAddBrandLabel: 'Add a new brand',
  goldAddBrandPlaceholder: 'e.g. PNJ, SJC, DOJI...',
  goldSaveBrandLabel: 'Add brand',
  goldTrashSheetTitle: 'Trash',
  goldTrashSheetSubtitle: 'Transactions here no longer count toward your totals',
  goldRestoreLabel: 'Restore',
  goldPurgeConfirmMessage: 'Permanently delete this transaction? This cannot be undone.',
  goldTrashBlockedMessage: 'This lot has a linked sale — trash the sale first.',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/i18n/gold-component-keys.test.ts`
Expected: PASS (39 cases)

- [ ] **Step 5: Run the full suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS across all test files (existing finance suite + new gold suite).

- [ ] **Step 6: Typecheck the whole project**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/locales/vi.ts src/i18n/locales/en.ts tests/i18n/gold-component-keys.test.ts
git commit -m "feat: add gold tracking i18n keys"
```

---

## Self-Review Notes

- **Spec coverage**: Task 1–2 cover §Khái niệm nghiệp vụ + §Công thức (post-sync, one-lot-per-sale model). Task 3 covers the sync-metadata/schema requirement from §Kiến trúc triển khai. Task 4–5 cover repository ports/implementations satisfying the "repository port ở application, implementation ở data layer" split. Task 6–7 cover §Luồng thêm giao dịch mua and §Luồng thêm giao dịch bán (including the brand-catalog sub-section and the one-lot sell rule). Task 8 covers §Thùng rác and §Khôi phục và xóa vĩnh viễn in full (trash-blocked-by-active-sale, sale-trash-returns-lot-to-held, restore-checks, tombstone-on-purge). Task 9 covers the reduced-scope §Tổng quan Vàng của tôi (quantity + cost basis only, matching the UI). Task 10–11 cover the composition-root and view-model wiring convention. Task 12 covers the i18n convention. Reference pricing, P&L display, history filters, and edit flows are explicitly out of scope per this plan's header and are not silently dropped — they're named.
- **Placeholder scan**: no TBD/TODO, no "add appropriate error handling" phrasing, no "similar to Task N" — every step has full code.
- **Type consistency**: `GoldLotRepository`/`GoldSellTransactionRepository`/`GoldBrandRepository` port names match their implementation class names across Tasks 4, 5, 10, 11. `WriteContext` is reused from the existing `finance-repositories.ts` port file everywhere rather than redefined. `GoldLotInput`/`GoldSellTransactionInput`/`GoldBrandInput` names are consistent from Task 1 through Task 11. `markSold`/`markHeld` names introduced in Task 4 are used identically in Task 5's implementation and Task 7/8's use cases.
