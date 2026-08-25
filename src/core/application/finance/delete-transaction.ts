import { TransactionRepository } from '@/core/application/ports/finance-repositories';
import { Transaction } from '@/core/domain/finance/transaction';

export type DeleteTransactionDeps = {
  transactionRepository: TransactionRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

/** Soft-deletes (tombstones) a transaction via the repository's `softDelete`. */
export class DeleteTransaction {
  constructor(private readonly deps: DeleteTransactionDeps) {}

  execute(id: string): Promise<Transaction> {
    return this.deps.transactionRepository.softDelete(id, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
  }
}
