import type { CategoryIconName } from '@/components/finance';
import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import { formatVnd } from '@/core/domain/finance/money';
import type { Transaction } from '@/core/domain/finance/transaction';
import type { Translate } from '@/i18n/translations';

/**
 * Shared presentation helpers for the dashboard and transactions list, so
 * both view models (`use-dashboard.ts`, `use-transactions.ts`) build
 * `TransactionRow`-shaped data the same way instead of duplicating the
 * category/account lookup and amount-masking logic.
 */

export const MASKED_AMOUNT_TEXT = '•• ••• •••';

/**
 * Masks a pre-formatted amount string when `hidden` is true. Never touches
 * the underlying numeric value — masking is purely a presentation-layer
 * concern, applied after `formatVnd` has already run.
 */
export function maskAmountText(hidden: boolean, formatted: string): string {
  return hidden ? MASKED_AMOUNT_TEXT : formatted;
}

/**
 * Best-effort mapping from a transaction/category onto the small fixed
 * `CategoryIconName` union `TransactionRow` accepts (Task 6). Categories are
 * free-text (Task 1), so this is a heuristic on the category name, not a
 * stored field.
 */
export function resolveCategoryIcon(transactionType: Transaction['type'], category: Category | null): CategoryIconName {
  if (transactionType === 'transfer') {
    return 'transport';
  }
  if (transactionType === 'income') {
    return 'income';
  }

  const name = (category?.name ?? '').toLowerCase();
  if (/an uong|food|nha hang|quan|cafe|ca phe/.test(name)) {
    return 'food';
  }
  if (/hoa don|dien|nuoc|internet|bill/.test(name)) {
    return 'bills';
  }
  if (/di chuyen|xe|grab|xang|transport/.test(name)) {
    return 'transport';
  }
  return 'shopping';
}

/** Formats an ISO calendar date (YYYY-MM-DD) as "DD/MM/YYYY". */
export function formatDateLabel(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export type TransactionListItem = {
  id: string;
  name: string;
  categoryLabel: string;
  meta: string;
  amountLabel: string;
  positive: boolean;
  icon: CategoryIconName;
  date: string;
};

/**
 * Maps a domain `Transaction` onto the shape both `dashboard-screen.tsx` and
 * `transactions-screen.tsx` feed into `TransactionRow`. `accountsById`/
 * `categoriesById` should include archived/soft-deleted records too (found
 * via each repository's `findById`), since a past transaction can reference
 * an account or category no longer active.
 */
export function buildTransactionListItem(
  transaction: Transaction,
  accountsById: ReadonlyMap<string, Account>,
  categoriesById: ReadonlyMap<string, Category>,
  amountsHidden: boolean,
  t: Translate,
): TransactionListItem {
  const account = accountsById.get(transaction.accountId) ?? null;
  const category = transaction.type === 'transfer' ? null : (categoriesById.get(transaction.categoryId) ?? null);
  const categoryLabel = transaction.type === 'transfer' ? t('transactionTypeTransfer') : (category?.name ?? t('transactionUncategorized'));
  const meta = account ? `${formatDateLabel(transaction.date)} · ${account.name}` : formatDateLabel(transaction.date);
  const positive = transaction.type === 'income';
  const sign = transaction.type === 'income' ? '+' : '-';
  const amountLabel = maskAmountText(amountsHidden, `${sign}${formatVnd(transaction.amount)}`);

  return {
    id: transaction.id,
    name: transaction.name,
    categoryLabel,
    meta,
    amountLabel,
    positive,
    icon: resolveCategoryIcon(transaction.type, category),
    date: transaction.date,
  };
}

/** Builds a `Map<id, record>` for O(1) lookups when rendering a transaction list. */
export function indexById<T extends { id: string }>(records: readonly T[]): Map<string, T> {
  return new Map(records.map((record) => [record.id, record]));
}

/** Returns the current calendar month formatted as YYYY-MM. */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns today's date as an ISO calendar date (YYYY-MM-DD), local time. */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
