import { normalizeGoldWeightToGrams } from '@/core/domain/gold/gold-weight';
import { validateGoldLotInput, GoldLotInput } from '@/core/domain/gold/gold-lot';

describe('normalizeGoldWeightToGrams', () => {
  it('converts each unit to grams using the fixed MVP ratios', () => {
    expect(normalizeGoldWeightToGrams(1, 'luong')).toBeCloseTo(37.5, 10);
    expect(normalizeGoldWeightToGrams(1, 'chi')).toBeCloseTo(3.75, 10);
    expect(normalizeGoldWeightToGrams(1, 'phan')).toBeCloseTo(0.375, 10);
    expect(normalizeGoldWeightToGrams(2, 'gram')).toBeCloseTo(2, 10);
  });

  it('rejects a non-positive quantity', () => {
    expect(() => normalizeGoldWeightToGrams(0, 'chi')).toThrow(
      'Gold weight quantity must be a positive number',
    );
    expect(() => normalizeGoldWeightToGrams(-1, 'chi')).toThrow(
      'Gold weight quantity must be a positive number',
    );
  });

  it('rejects an unknown unit', () => {
    expect(() => normalizeGoldWeightToGrams(1, 'kg' as never)).toThrow(
      'Unknown gold weight unit: kg',
    );
  });
});

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
    expect(() => validateGoldLotInput({ ...validLotInput, brandId: '' })).toThrow(
      'Gold lot brandId must not be empty',
    );
  });

  it('rejects an invalid purchaseDate', () => {
    expect(() => validateGoldLotInput({ ...validLotInput, purchaseDate: '24/08/2026' })).toThrow(
      'Gold lot purchaseDate must be a valid ISO calendar date (YYYY-MM-DD)',
    );
  });

  it('rejects a non-positive quantity', () => {
    expect(() => validateGoldLotInput({ ...validLotInput, quantity: 0 })).toThrow(
      'Gold lot quantity must be a positive number',
    );
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

import {
  validateGoldSellTransactionInput,
  GoldSellTransactionInput,
} from '@/core/domain/gold/gold-sell-transaction';
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
    expect(() => validateGoldSellTransactionInput({ ...validSellInput, lotId: '' })).toThrow(
      'Gold sell lotId must not be empty',
    );
  });

  it('rejects an invalid saleDate', () => {
    expect(() =>
      validateGoldSellTransactionInput({ ...validSellInput, saleDate: 'not-a-date' }),
    ).toThrow('Gold sell saleDate must be a valid ISO calendar date (YYYY-MM-DD)');
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
    expect(() => validateGoldBrandInput({ name: '   ' } as GoldBrandInput)).toThrow(
      'Gold brand name must not be empty',
    );
  });
});

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
