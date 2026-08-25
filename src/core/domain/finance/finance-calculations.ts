import { Account } from './account';
import { Transaction } from './transaction';

export type PeriodSummary = {
  income: number;
  expense: number;
  netCashFlow: number;
  byCategory: Record<string, number>;
  byAccount: Record<string, number>;
};

/**
 * Balance = opening balance + income - expense - outgoing transfers + incoming transfers.
 * Soft-deleted transactions (deletedAt !== null) are excluded.
 */
export function calculateAccountBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.openingBalance;

  for (const transaction of transactions) {
    if (transaction.deletedAt !== null) {
      continue;
    }

    if (transaction.type === 'income') {
      if (transaction.accountId === account.id) {
        balance += transaction.amount;
      }
    } else if (transaction.type === 'expense') {
      if (transaction.accountId === account.id) {
        balance -= transaction.amount;
      }
    } else {
      if (transaction.accountId === account.id) {
        balance -= transaction.amount;
      }
      if (transaction.destinationAccountId === account.id) {
        balance += transaction.amount;
      }
    }
  }

  return balance;
}

/**
 * Aggregates income/expense transactions within [from, to] (inclusive,
 * ISO calendar dates). Transfers never contribute to income, expense,
 * netCashFlow, byCategory or byAccount. Soft-deleted transactions are excluded.
 */
export function calculatePeriodSummary(transactions: Transaction[], from: string, to: string): PeriodSummary {
  const summary: PeriodSummary = {
    income: 0,
    expense: 0,
    netCashFlow: 0,
    byCategory: {},
    byAccount: {},
  };

  for (const transaction of transactions) {
    if (transaction.deletedAt !== null) {
      continue;
    }
    if (transaction.date < from || transaction.date > to) {
      continue;
    }
    if (transaction.type === 'transfer') {
      continue;
    }

    const signedAmount = transaction.type === 'income' ? transaction.amount : -transaction.amount;

    if (transaction.type === 'income') {
      summary.income += transaction.amount;
    } else {
      summary.expense += transaction.amount;
    }
    summary.netCashFlow += signedAmount;
    summary.byCategory[transaction.categoryId] = (summary.byCategory[transaction.categoryId] ?? 0) + signedAmount;
    summary.byAccount[transaction.accountId] = (summary.byAccount[transaction.accountId] ?? 0) + signedAmount;
  }

  return summary;
}
