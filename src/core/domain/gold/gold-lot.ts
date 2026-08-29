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
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
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
  if (
    typeof input.quantity !== 'number' ||
    !Number.isFinite(input.quantity) ||
    input.quantity <= 0
  ) {
    throw new Error('Gold lot quantity must be a positive number');
  }
  normalizeGoldWeightToGrams(input.quantity, input.unit);
  if (
    typeof input.totalAmount !== 'number' ||
    !Number.isInteger(input.totalAmount) ||
    input.totalAmount <= 0
  ) {
    throw new Error('Gold lot totalAmount must be a positive integer');
  }
}
