import { useCallback, useEffect, useState } from 'react';

import type {
  AccountRepository,
  CategoryRepository,
  ProfileSettingsRepository,
  TransactionRepository,
} from '@/core/application/ports/finance-repositories';
import type { DeleteTransaction } from '@/core/application/finance/delete-transaction';
import type { RestoreTransaction } from '@/core/application/finance/restore-transaction';
import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import type { Translate } from '@/i18n/translations';
import type { TransactionTypeFilter } from '@/components/finance';

import {
  buildTransactionListItem,
  currentMonth,
  formatDateLabel,
  indexById,
  TransactionListItem,
} from './transaction-presentation';

/** The subset of `FinanceDependencies` (Task 7) this view model drives. */
export type TransactionsDependencies = {
  transactionRepository: TransactionRepository;
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  profileSettingsRepository: ProfileSettingsRepository;
  deleteTransaction: DeleteTransaction;
  restoreTransaction: RestoreTransaction;
};

export type TransactionsFilters = {
  month: string;
  type: TransactionTypeFilter;
  categoryId: string | null;
  accountId: string | null;
  search: string;
};

export type TransactionGroup = {
  date: string;
  dateLabel: string;
  items: TransactionListItem[];
};

export type TransactionsViewModel = {
  loading: boolean;
  amountsHidden: boolean;
  filters: TransactionsFilters;
  setMonth(month: string): void;
  setType(type: TransactionTypeFilter): void;
  setCategoryId(id: string | null): void;
  setAccountId(id: string | null): void;
  setSearch(value: string): void;
  categories: Category[];
  accounts: Account[];
  groups: TransactionGroup[];
  isEmpty: boolean;
  /** Present while the undo banner should be shown; null otherwise. */
  undoMessage: string | null;
  deleteTransaction(id: string): Promise<void>;
  undoDelete(): Promise<void>;
  dismissUndo(): void;
  refresh(): Promise<void>;
};

export type UseTransactionsOptions = {
  dependencies: TransactionsDependencies;
  t: Translate;
  /** Injectable clock, overridable in tests. Defaults to `new Date()`. */
  now?: () => Date;
};

function groupByDate(items: TransactionListItem[]): TransactionGroup[] {
  const groups = new Map<string, TransactionListItem[]>();
  for (const item of items) {
    const bucket = groups.get(item.date) ?? [];
    bucket.push(item);
    groups.set(item.date, bucket);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, groupItems]) => ({ date, dateLabel: formatDateLabel(date), items: groupItems }));
}

/**
 * Thin UI view model over `TransactionRepository.list` plus the
 * delete/restore use cases (Task 4): loads active accounts/categories for
 * the filter pickers, re-lists transactions whenever a filter changes, and
 * drives the delete-then-undo flow (`UndoBanner`, Task 6) by soft-deleting
 * immediately and restoring on Undo.
 */
export function useTransactions({
  dependencies,
  t,
  now,
}: UseTransactionsOptions): TransactionsViewModel {
  const [loading, setLoading] = useState(true);
  const [amountsHidden, setAmountsHidden] = useState(false);
  const [filters, setFilters] = useState<TransactionsFilters>({
    month: currentMonth(now?.() ?? new Date()),
    type: 'all',
    categoryId: null,
    accountId: null,
    search: '',
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<TransactionGroup[]>([]);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [transactions, activeAccounts, expenseCategories, incomeCategories, settings] =
        await Promise.all([
          dependencies.transactionRepository.list({
            month: filters.month,
            type: filters.type === 'all' ? undefined : filters.type,
            categoryId: filters.categoryId ?? undefined,
            accountId: filters.accountId ?? undefined,
            query: filters.search.trim() === '' ? undefined : filters.search.trim(),
            includeDeleted: false,
          }),
          dependencies.accountRepository.listActive(),
          dependencies.categoryRepository.listActiveByType('expense'),
          dependencies.categoryRepository.listActiveByType('income'),
          dependencies.profileSettingsRepository.get(),
        ]);

      const allCategories = [...incomeCategories, ...expenseCategories];
      const accountsById = indexById(activeAccounts);
      const categoriesById = indexById(allCategories);
      const hidden = settings.amountsHidden;

      const items = transactions
        .slice()
        .sort((a, b) =>
          a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
        )
        .map((transaction) =>
          buildTransactionListItem(transaction, accountsById, categoriesById, hidden, t),
        );

      setAmountsHidden(hidden);
      setAccounts(activeAccounts);
      setCategories(allCategories);
      setGroups(groupByDate(items));
    } finally {
      setLoading(false);
    }
  }, [dependencies, filters, t]);

  useEffect(() => {
    load();
  }, [load]);

  const setMonth = useCallback(
    (month: string) => setFilters((current) => ({ ...current, month })),
    [],
  );
  const setType = useCallback(
    (type: TransactionTypeFilter) => setFilters((current) => ({ ...current, type })),
    [],
  );
  const setCategoryId = useCallback(
    (categoryId: string | null) => setFilters((current) => ({ ...current, categoryId })),
    [],
  );
  const setAccountId = useCallback(
    (accountId: string | null) => setFilters((current) => ({ ...current, accountId })),
    [],
  );
  const setSearch = useCallback(
    (search: string) => setFilters((current) => ({ ...current, search })),
    [],
  );

  const deleteTransactionById = useCallback(
    async (id: string) => {
      await dependencies.deleteTransaction.execute(id);
      setLastDeletedId(id);
      setUndoMessage(t('transactionsDeleteUndoMessage'));
      await load();
    },

    [dependencies, load, t],
  );

  const undoDelete = useCallback(async () => {
    if (lastDeletedId === null) {
      return;
    }
    await dependencies.restoreTransaction.execute(lastDeletedId);
    setLastDeletedId(null);
    setUndoMessage(null);
    await load();
  }, [dependencies, lastDeletedId, load]);

  const dismissUndo = useCallback(() => {
    setLastDeletedId(null);
    setUndoMessage(null);
  }, []);

  return {
    loading,
    amountsHidden,
    filters,
    setMonth,
    setType,
    setCategoryId,
    setAccountId,
    setSearch,
    categories,
    accounts,
    groups,
    isEmpty: groups.length === 0,
    undoMessage,
    deleteTransaction: deleteTransactionById,
    undoDelete,
    dismissUndo,
    refresh: load,
  };
}
