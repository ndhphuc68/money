import { FinanceRecord } from './finance-record';

export type TransactionType = 'income' | 'expense' | 'transfer';

type TransactionCommon = FinanceRecord & {
  /** Integer VND, always greater than zero. */
  amount: number;
  /** Source account for every transaction type. */
  accountId: string;
  /** Transaction date, formatted as an ISO calendar date (YYYY-MM-DD). */
  date: string;
  name: string;
  note?: string | null;
};

export type IncomeExpenseTransaction = TransactionCommon & {
  type: 'income' | 'expense';
  categoryId: string;
  destinationAccountId?: null;
};

export type TransferTransaction = TransactionCommon & {
  type: 'transfer';
  destinationAccountId: string;
  categoryId?: null;
};

export type Transaction = IncomeExpenseTransaction | TransferTransaction;

/**
 * Shape used to create or edit a transaction, before sync metadata (id,
 * createdAt, updatedAt, deletedAt, revision, originDeviceId) is attached.
 */
export type TransactionInput = {
  type: TransactionType;
  amount: number;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  date: string;
  name: string;
  note?: string | null;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidTransactionDate(value: unknown): boolean {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Validates a transaction input against the finance MVP business rules.
 * Throws a descriptive Error when the input is invalid; returns void otherwise.
 */
export function validateTransactionInput(input: TransactionInput): void {
  if (input.type !== 'income' && input.type !== 'expense' && input.type !== 'transfer') {
    throw new Error('Transaction type must be income, expense or transfer');
  }
  if (!isNonEmptyString(input.name)) {
    throw new Error('Transaction name must not be empty');
  }
  if (typeof input.amount !== 'number' || !Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Transaction amount must be a positive integer');
  }
  if (!isNonEmptyString(input.accountId)) {
    throw new Error('Transaction accountId must not be empty');
  }
  if (!isValidTransactionDate(input.date)) {
    throw new Error('Transaction date must be a valid ISO calendar date (YYYY-MM-DD)');
  }

  if (input.type === 'income' || input.type === 'expense') {
    if (!isNonEmptyString(input.categoryId)) {
      throw new Error('Income and expense transactions require a categoryId');
    }
    if (input.destinationAccountId != null) {
      throw new Error('Income and expense transactions must not have a destinationAccountId');
    }
    return;
  }

  // input.type === 'transfer'
  if (input.categoryId != null) {
    throw new Error('Transfer transactions must not have a categoryId');
  }
  if (!isNonEmptyString(input.destinationAccountId)) {
    throw new Error('Transfer transactions require a destinationAccountId');
  }
  if (input.destinationAccountId === input.accountId) {
    throw new Error('Transfer destination account must differ from the source account');
  }
}
