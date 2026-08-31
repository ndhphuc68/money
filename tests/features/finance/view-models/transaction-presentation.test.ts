import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import type { Transaction } from '@/core/domain/finance/transaction';
import {
  buildTransactionListItem,
  resolveCategoryColor,
  resolveCategoryIcon,
} from '@/features/finance/view-models/transaction-presentation';
import { translate } from '@/i18n/translations';

const t = translate.bind(null, 'vi');

describe('transaction-presentation helpers', () => {
  const customCategory: Category = {
    id: 'cat-spotify',
    name: 'Spotify',
    type: 'expense',
    icon: 'fa6:spotify',
    color: '#1DB954',
    isArchived: false,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: 'dev-1',
  };

  const account: Account = {
    id: 'acc-1',
    name: 'VPBank',
    type: 'bank',
    openingBalance: 0,
    isArchived: false,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: 'dev-1',
  };

  it('resolves custom category icon and color when available', () => {
    expect(resolveCategoryIcon('expense', customCategory)).toBe('fa6:spotify');
    expect(resolveCategoryColor('expense', customCategory)).toBe('#1DB954');
  });

  it('resolves fallback icon and color for transfers and income', () => {
    expect(resolveCategoryIcon('transfer', null)).toBe('lucide:arrow-right-left');
    expect(resolveCategoryColor('transfer', null)).toBe('#6366F1');

    expect(resolveCategoryIcon('income', null)).toBe('fa6:money-bill-wave');
    expect(resolveCategoryColor('income', null)).toBe('#10B981');
  });

  it('builds transaction list item with custom icon and color', () => {
    const transaction: Transaction = {
      id: 'tx-1',
      accountId: 'acc-1',
      categoryId: 'cat-spotify',
      name: 'Spotify Premium',
      amount: 59000,
      type: 'expense',
      date: '2026-08-31',
      note: null,
      destinationAccountId: null,
      createdAt: '2026-08-31T10:00:00.000Z',
      updatedAt: '2026-08-31T10:00:00.000Z',
      deletedAt: null,
      revision: 1,
      originDeviceId: 'dev-1',
    };

    const accountsById = new Map([['acc-1', account]]);
    const categoriesById = new Map([['cat-spotify', customCategory]]);

    const item = buildTransactionListItem(transaction, accountsById, categoriesById, false, t);

    expect(item).toMatchObject({
      id: 'tx-1',
      name: 'Spotify Premium',
      categoryLabel: 'Spotify',
      icon: 'fa6:spotify',
      color: '#1DB954',
      positive: false,
    });
  });
});
