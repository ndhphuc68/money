import { TransactionRepository, UpdateTransactionInput } from '@/core/application/ports/finance-repositories';
import { Transaction } from '@/core/domain/finance/transaction';

export type UpdateTransactionDeps = {
  transactionRepository: TransactionRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

/**
 * Applies a partial patch to an existing transaction (amount, account,
 * category, date, name, note, or even type). The repository's `update`
 * merges the patch onto the stored record and re-validates the merged
 * result via `validateTransactionInput`, so this use case does not
 * duplicate that validation.
 */
export class UpdateTransaction {
  constructor(private readonly deps: UpdateTransactionDeps) {}

  execute(id: string, patch: UpdateTransactionInput): Promise<Transaction> {
    return this.deps.transactionRepository.update(id, patch, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
  }
}
