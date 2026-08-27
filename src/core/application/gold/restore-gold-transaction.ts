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
