import { useCallback, useEffect, useState } from 'react';

import type { AccountRepository, CategoryRepository, TransactionRepository } from '@/core/application/ports/finance-repositories';
import type { CreateTransaction } from '@/core/application/finance/create-transaction';
import type { UpdateTransaction } from '@/core/application/finance/update-transaction';
import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import { TransactionInput, TransactionType, validateTransactionInput } from '@/core/domain/finance/transaction';
import type { Translate } from '@/i18n/translations';

import { todayIsoDate } from './transaction-presentation';

/** The subset of `FinanceDependencies` (Task 7) this view model drives. */
export type TransactionFormDependencies = {
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
  createTransaction: CreateTransaction;
  updateTransaction: UpdateTransaction;
};

export type TransactionFormValues = {
  type: TransactionType;
  amount: number | null;
  name: string;
  accountId: string | null;
  destinationAccountId: string | null;
  categoryId: string | null;
  date: string;
  note: string;
};

export type TransactionFormErrors = {
  name?: string;
  amount?: string;
  accountId?: string;
  categoryId?: string;
  destinationAccountId?: string;
  form?: string;
};

export type TransactionFormViewModel = {
  loading: boolean;
  submitting: boolean;
  isEditing: boolean;
  values: TransactionFormValues;
  errors: TransactionFormErrors;
  accounts: Account[];
  categories: Category[];
  setType(type: TransactionType): void;
  setAmount(amount: number | null): void;
  setName(name: string): void;
  setAccountId(id: string | null): void;
  setDestinationAccountId(id: string | null): void;
  setCategoryId(id: string | null): void;
  setDate(date: string): void;
  setNote(note: string): void;
  submit(): Promise<void>;
};

export type UseTransactionFormOptions = {
  dependencies: TransactionFormDependencies;
  /** Existing transaction id to edit; omit (or null) to create a new transaction. */
  transactionId?: string | null;
  t: Translate;
  onSaved(): void;
  /** Injectable clock for the new-transaction default date, overridable in tests. */
  now?: () => Date;
};

function emptyValues(today: string): TransactionFormValues {
  return {
    type: 'expense',
    amount: null,
    name: '',
    accountId: null,
    destinationAccountId: null,
    categoryId: null,
    date: today,
    note: '',
  };
}

/**
 * Thin UI view model over `CreateTransaction`/`UpdateTransaction` (Task 4).
 * Unlike `TransactionForm` (Task 6), which only accepts an `initialDate` and
 * always starts blank, this hook owns every field as controlled state so
 * `transaction-form-screen.tsx` can pre-fill an existing transaction for
 * editing (see the Task 8 report for why `TransactionForm` itself isn't
 * reused here).
 */
export function useTransactionForm({ dependencies, transactionId, t, onSaved, now }: UseTransactionFormOptions): TransactionFormViewModel {
  const today = todayIsoDate(now?.() ?? new Date());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState<TransactionFormValues>(emptyValues(today));
  const [errors, setErrors] = useState<TransactionFormErrors>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [activeAccounts, expenseCategories, incomeCategories] = await Promise.all([
        dependencies.accountRepository.listActive(),
        dependencies.categoryRepository.listActiveByType('expense'),
        dependencies.categoryRepository.listActiveByType('income'),
      ]);
      const allCategories = [...incomeCategories, ...expenseCategories];

      let nextValues = emptyValues(today);
      if (transactionId) {
        const existing = await dependencies.transactionRepository.findById(transactionId);
        if (existing) {
          nextValues = {
            type: existing.type,
            amount: existing.amount,
            name: existing.name,
            accountId: existing.accountId,
            destinationAccountId: existing.type === 'transfer' ? existing.destinationAccountId : null,
            categoryId: existing.type === 'transfer' ? null : existing.categoryId,
            date: existing.date,
            note: existing.note ?? '',
          };
        }
      }

      if (!cancelled) {
        setAccounts(activeAccounts);
        setCategories(allCategories);
        setValues(nextValues);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies, transactionId]);

  const setType = useCallback((type: TransactionType) => setValues((current) => ({ ...current, type })), []);
  const setAmount = useCallback((amount: number | null) => setValues((current) => ({ ...current, amount })), []);
  const setName = useCallback((name: string) => setValues((current) => ({ ...current, name })), []);
  const setAccountId = useCallback((accountId: string | null) => setValues((current) => ({ ...current, accountId })), []);
  const setDestinationAccountId = useCallback(
    (destinationAccountId: string | null) => setValues((current) => ({ ...current, destinationAccountId })),
    [],
  );
  const setCategoryId = useCallback((categoryId: string | null) => setValues((current) => ({ ...current, categoryId })), []);
  const setDate = useCallback((date: string) => setValues((current) => ({ ...current, date })), []);
  const setNote = useCallback((note: string) => setValues((current) => ({ ...current, note })), []);

  const submit = useCallback(async () => {
    const isTransfer = values.type === 'transfer';
    const nextErrors: TransactionFormErrors = {};

    if (values.name.trim() === '') {
      nextErrors.name = t('transactionFormNameRequired');
    }
    if (values.amount === null || values.amount <= 0) {
      nextErrors.amount = t('transactionFormAmountRequired');
    }
    if (values.accountId === null) {
      nextErrors.accountId = t('transactionFormAccountRequired');
    }
    if (isTransfer) {
      if (values.destinationAccountId === null) {
        nextErrors.destinationAccountId = t('transactionFormDestinationRequired');
      } else if (values.destinationAccountId === values.accountId) {
        nextErrors.destinationAccountId = t('transactionFormDestinationSame');
      }
    } else if (values.categoryId === null) {
      nextErrors.categoryId = t('transactionFormCategoryRequired');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const input: TransactionInput = isTransfer
      ? {
          type: 'transfer',
          amount: values.amount as number,
          accountId: values.accountId as string,
          destinationAccountId: values.destinationAccountId as string,
          date: values.date,
          name: values.name.trim(),
          note: values.note.trim() === '' ? null : values.note.trim(),
        }
      : {
          type: values.type,
          amount: values.amount as number,
          accountId: values.accountId as string,
          categoryId: values.categoryId as string,
          date: values.date,
          name: values.name.trim(),
          note: values.note.trim() === '' ? null : values.note.trim(),
        };

    try {
      validateTransactionInput(input);
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : t('transactionFormGenericError') });
      return;
    }

    setSubmitting(true);
    try {
      if (transactionId) {
        await dependencies.updateTransaction.execute(transactionId, input);
      } else {
        await dependencies.createTransaction.execute(input);
      }
      onSaved();
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : t('transactionFormGenericError') });
    } finally {
      setSubmitting(false);
    }
  }, [dependencies, onSaved, t, transactionId, values]);

  return {
    loading,
    submitting,
    isEditing: Boolean(transactionId),
    values,
    errors,
    accounts,
    categories,
    setType,
    setAmount,
    setName,
    setAccountId,
    setDestinationAccountId,
    setCategoryId,
    setDate,
    setNote,
    submit,
  };
}
