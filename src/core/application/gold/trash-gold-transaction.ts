import {
  GoldLotRepository,
  GoldSellTransactionRepository,
} from '@/core/application/ports/gold-repositories';
import { GoldError } from '@/core/domain/gold/gold-error';
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
      throw new GoldError(
        'lotHasActiveSale',
        'Cannot trash a gold lot with an active sell transaction',
      );
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
