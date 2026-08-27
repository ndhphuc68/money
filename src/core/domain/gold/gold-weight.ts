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
