import { FinanceRecord } from './finance-record';

export type AccountType = 'cash' | 'bank' | 'e-wallet' | 'credit-card' | 'other';

export type Account = FinanceRecord & {
  name: string;
  type: AccountType;
  /** Integer VND opening balance recorded when the account was created. */
  openingBalance: number;
  /** Archived accounts are hidden from pickers but kept for history. */
  isArchived: boolean;
};
