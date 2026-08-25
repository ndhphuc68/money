import { AccountRepository } from '@/core/application/ports/finance-repositories';
import { Account, AccountType } from '@/core/domain/finance/account';

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'e-wallet', 'credit-card', 'other'];

export type CreateAccountRequest = {
  name: string;
  type: AccountType;
  openingBalance: number;
};

export type CreateAccountDeps = {
  accountRepository: AccountRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

/**
 * Validates an account creation request. There is no dedicated domain
 * validator for accounts (unlike `validateTransactionInput`), so the rules
 * live here: a non-empty name, a known account type, and an integer opening
 * balance (negative is allowed, e.g. for a credit-card starting debt).
 */
export function validateCreateAccountRequest(input: CreateAccountRequest): void {
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw new Error('Account name must not be empty');
  }
  if (!ACCOUNT_TYPES.includes(input.type)) {
    throw new Error('Account type is invalid');
  }
  if (typeof input.openingBalance !== 'number' || !Number.isInteger(input.openingBalance)) {
    throw new Error('Account opening balance must be an integer');
  }
}

export class CreateAccount {
  constructor(private readonly deps: CreateAccountDeps) {}

  async execute(input: CreateAccountRequest): Promise<Account> {
    validateCreateAccountRequest(input);

    return this.deps.accountRepository.create({
      id: this.deps.generateId(),
      operationId: this.deps.generateId(),
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
      name: input.name.trim(),
      type: input.type,
      openingBalance: input.openingBalance,
    });
  }
}
