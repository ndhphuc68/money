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
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
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
  if (
    typeof input.totalAmount !== 'number' ||
    !Number.isInteger(input.totalAmount) ||
    input.totalAmount <= 0
  ) {
    throw new Error('Gold sell totalAmount must be a positive integer');
  }
}
