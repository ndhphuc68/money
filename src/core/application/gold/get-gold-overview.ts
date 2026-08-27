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
