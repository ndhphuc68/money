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
    if (lot.deletedAt === null) {
      throw new Error('Cannot permanently delete a gold lot that is not in the trash');
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
    if (sale.deletedAt === null) {
      throw new Error('Cannot permanently delete a gold sell transaction that is not in the trash');
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
