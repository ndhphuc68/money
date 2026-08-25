import { TransactionRepository } from '@/core/application/ports/finance-repositories';
import { Transaction, TransactionInput, validateTransactionInput } from '@/core/domain/finance/transaction';

export type CreateTransactionDeps = {
  transactionRepository: TransactionRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class CreateTransaction {
  constructor(private readonly deps: CreateTransactionDeps) {}

  async execute(input: TransactionInput): Promise<Transaction> {
    validateTransactionInput(input);

    return this.deps.transactionRepository.create({
      ...input,
      id: this.deps.generateId(),
      operationId: this.deps.generateId(),
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
    });
  }
}
