import { TransactionRepository } from '@/core/application/ports/finance-repositories';
import { Transaction } from '@/core/domain/finance/transaction';

export type RestoreTransactionDeps = {
  transactionRepository: TransactionRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

/** Clears `deletedAt` on a tombstoned transaction via the repository's `restore`. */
export class RestoreTransaction {
  constructor(private readonly deps: RestoreTransactionDeps) {}

  execute(id: string): Promise<Transaction> {
    return this.deps.transactionRepository.restore(id, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
  }
}
