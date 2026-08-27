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
