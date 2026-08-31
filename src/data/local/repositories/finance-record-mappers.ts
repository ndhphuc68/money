import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { Transaction } from '@/core/domain/finance/transaction';
import { accounts, categories, transactions } from '@/data/local/schema';

type AccountRow = typeof accounts.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;
type TransactionRow = typeof transactions.$inferSelect;

export function toAccountEntity(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    openingBalance: row.openingBalance,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toAccountRowValues(account: Account): AccountRow {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    openingBalance: account.openingBalance,
    isArchived: account.isArchived,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    deletedAt: account.deletedAt,
    revision: account.revision,
    originDeviceId: account.originDeviceId,
  };
}

export function toCategoryEntity(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon || 'fa6:shapes',
    color: row.color || (row.type === 'income' ? '#10B981' : '#F2734A'),
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toCategoryRowValues(category: Category): CategoryRow {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon || 'fa6:shapes',
    color: category.color || (category.type === 'income' ? '#10B981' : '#F2734A'),
    isArchived: category.isArchived,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    deletedAt: category.deletedAt,
    revision: category.revision,
    originDeviceId: category.originDeviceId,
  };
}

export function toTransactionEntity(row: TransactionRow): Transaction {
  const base = {
    id: row.id,
    amount: row.amount,
    accountId: row.accountId,
    date: row.transactionDate,
    name: row.name,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };

  if (row.type === 'transfer') {
    return {
      ...base,
      type: 'transfer',
      destinationAccountId: row.destinationAccountId as string,
      categoryId: null,
    };
  }

  return {
    ...base,
    type: row.type,
    categoryId: row.categoryId as string,
    destinationAccountId: null,
  };
}

export function toTransactionRowValues(transaction: Transaction): TransactionRow {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    accountId: transaction.accountId,
    destinationAccountId: transaction.type === 'transfer' ? transaction.destinationAccountId : null,
    categoryId: transaction.type === 'transfer' ? null : transaction.categoryId,
    transactionDate: transaction.date,
    name: transaction.name,
    note: transaction.note ?? null,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    deletedAt: transaction.deletedAt,
    revision: transaction.revision,
    originDeviceId: transaction.originDeviceId,
  };
}
