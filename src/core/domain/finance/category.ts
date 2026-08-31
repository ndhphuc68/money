import { FinanceRecord } from './finance-record';

export type CategoryType = 'income' | 'expense';

export type Category = FinanceRecord & {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  /** Archived categories cannot be assigned to new transactions but stay for history. */
  isArchived: boolean;
};
