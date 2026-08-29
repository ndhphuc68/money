import {
  GoldLotRepository,
  GoldSellTransactionRepository,
} from '@/core/application/ports/gold-repositories';
import { GoldError } from '@/core/domain/gold/gold-error';
import {
  GoldSellTransaction,
  GoldSellTransactionInput,
} from '@/core/domain/gold/gold-sell-transaction';

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
      throw new GoldError('lotNotFound', 'Gold lot not found');
    }
    if (lot.status !== 'held') {
      throw new GoldError('lotNotAvailableToSell', 'Gold lot is not available to sell');
    }
    if (input.saleDate < lot.purchaseDate) {
      throw new GoldError(
        'saleDateBeforePurchase',
        'Sale date must not be before the lot purchase date',
      );
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
