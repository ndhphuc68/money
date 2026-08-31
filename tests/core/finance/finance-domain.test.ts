import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { Transaction, TransactionInput } from '@/core/domain/finance/transaction';
import { validateTransactionInput } from '@/core/domain/finance/transaction';
import {
  calculateAccountBalance,
  calculatePeriodSummary,
} from '@/core/domain/finance/finance-calculations';
import { formatVnd, parseVndInput } from '@/core/domain/finance/money';

const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440099';

function syncFields(
  id: string,
  overrides: Partial<{ deletedAt: string | null; revision: number }> = {},
) {
  return {
    id,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    deletedAt: overrides.deletedAt ?? null,
    revision: overrides.revision ?? 1,
    originDeviceId: DEVICE_ID,
  };
}

function makeAccount(id: string, openingBalance: number): Account {
  return {
    ...syncFields(id),
    name: `Account ${id}`,
    type: 'cash',
    openingBalance,
    isArchived: false,
  };
}

function makeCategory(id: string, type: 'income' | 'expense'): Category {
  return {
    ...syncFields(id),
    name: `Category ${id}`,
    type,
    isArchived: false,
  };
}

const CASH = 'account-cash';
const BANK = 'account-bank';
const SALARY = 'category-salary';
const FOOD = 'category-food';

function makeTransaction(overrides: Partial<Transaction> & { id: string }): Transaction {
  const base = {
    ...syncFields(overrides.id, { deletedAt: overrides.deletedAt as string | null | undefined }),
    amount: 100000,
    accountId: CASH,
    date: '2026-08-10',
    name: 'Test transaction',
    note: null,
    ...overrides,
  };
  return base as Transaction;
}

const validIncomeInput: TransactionInput = {
  type: 'income',
  amount: 500000,
  accountId: CASH,
  categoryId: SALARY,
  date: '2026-08-10',
  name: 'Salary',
  note: null,
};

const validExpenseInput: TransactionInput = {
  type: 'expense',
  amount: 50000,
  accountId: CASH,
  categoryId: FOOD,
  date: '2026-08-10',
  name: 'Lunch',
  note: null,
};

const validTransferInput: TransactionInput = {
  type: 'transfer',
  amount: 200000,
  accountId: CASH,
  destinationAccountId: BANK,
  date: '2026-08-10',
  name: 'Move to bank',
  note: null,
};

describe('validateTransactionInput', () => {
  it('accepts a valid income transaction', () => {
    expect(() => validateTransactionInput(validIncomeInput)).not.toThrow();
  });

  it('accepts a valid expense transaction', () => {
    expect(() => validateTransactionInput(validExpenseInput)).not.toThrow();
  });

  it('accepts a valid transfer transaction', () => {
    expect(() => validateTransactionInput(validTransferInput)).not.toThrow();
  });

  it('rejects an income transaction missing categoryId', () => {
    const { categoryId: _categoryId, ...withoutCategory } = validIncomeInput;
    expect(() => validateTransactionInput(withoutCategory as TransactionInput)).toThrow();
  });

  it('rejects an expense transaction missing categoryId', () => {
    const { categoryId: _categoryId, ...withoutCategory } = validExpenseInput;
    expect(() => validateTransactionInput(withoutCategory as TransactionInput)).toThrow();
  });

  it('rejects a transfer transaction that includes a categoryId', () => {
    const invalid = { ...validTransferInput, categoryId: FOOD } as TransactionInput;
    expect(() => validateTransactionInput(invalid)).toThrow();
  });

  it('rejects a transfer transaction missing destinationAccountId', () => {
    const { destinationAccountId: _destinationAccountId, ...withoutDestination } =
      validTransferInput;
    expect(() => validateTransactionInput(withoutDestination as TransactionInput)).toThrow();
  });

  it('rejects a transfer to the same account as the source', () => {
    const invalid = { ...validTransferInput, destinationAccountId: CASH } as TransactionInput;
    expect(() => validateTransactionInput(invalid)).toThrow();
  });

  it('rejects a zero amount', () => {
    expect(() => validateTransactionInput({ ...validExpenseInput, amount: 0 })).toThrow();
  });

  it('rejects a negative amount', () => {
    expect(() => validateTransactionInput({ ...validExpenseInput, amount: -1000 })).toThrow();
  });

  it('rejects a non-integer amount', () => {
    expect(() => validateTransactionInput({ ...validExpenseInput, amount: 1000.5 })).toThrow();
  });

  it('rejects a blank name', () => {
    expect(() => validateTransactionInput({ ...validExpenseInput, name: '   ' })).toThrow();
  });

  it('rejects a missing account id', () => {
    expect(() => validateTransactionInput({ ...validExpenseInput, accountId: '' })).toThrow();
  });

  it('rejects an invalid date', () => {
    expect(() => validateTransactionInput({ ...validExpenseInput, date: 'not-a-date' })).toThrow();
  });

  it('rejects an impossible calendar date', () => {
    expect(() => validateTransactionInput({ ...validExpenseInput, date: '2026-02-30' })).toThrow();
  });
});

describe('calculateAccountBalance', () => {
  it('applies opening balance plus income minus expense', () => {
    const account = makeAccount(CASH, 1000000);
    const transactions: Transaction[] = [
      makeTransaction({
        id: 't1',
        type: 'income',
        categoryId: SALARY,
        accountId: CASH,
        amount: 500000,
      } as Transaction),
      makeTransaction({
        id: 't2',
        type: 'expense',
        categoryId: FOOD,
        accountId: CASH,
        amount: 200000,
      } as Transaction),
    ];

    expect(calculateAccountBalance(account, transactions)).toBe(1300000);
  });

  it('subtracts outgoing transfers and adds incoming transfers', () => {
    const cash = makeAccount(CASH, 1000000);
    const bank = makeAccount(BANK, 0);
    const transactions: Transaction[] = [
      makeTransaction({
        id: 't1',
        type: 'transfer',
        accountId: CASH,
        destinationAccountId: BANK,
        amount: 300000,
      } as Transaction),
    ];

    expect(calculateAccountBalance(cash, transactions)).toBe(700000);
    expect(calculateAccountBalance(bank, transactions)).toBe(300000);
  });

  it('excludes soft-deleted transactions', () => {
    const account = makeAccount(CASH, 1000000);
    const transactions: Transaction[] = [
      makeTransaction({
        id: 't1',
        type: 'expense',
        categoryId: FOOD,
        accountId: CASH,
        amount: 900000,
        deletedAt: '2026-08-11T00:00:00.000Z',
      } as Transaction),
    ];

    expect(calculateAccountBalance(account, transactions)).toBe(1000000);
  });

  it('ignores transactions belonging to other accounts', () => {
    const account = makeAccount(CASH, 1000000);
    const transactions: Transaction[] = [
      makeTransaction({
        id: 't1',
        type: 'income',
        categoryId: SALARY,
        accountId: BANK,
        amount: 500000,
      } as Transaction),
    ];

    expect(calculateAccountBalance(account, transactions)).toBe(1000000);
  });
});

describe('calculatePeriodSummary', () => {
  const transactions: Transaction[] = [
    makeTransaction({
      id: 't1',
      type: 'income',
      categoryId: SALARY,
      accountId: CASH,
      amount: 1000000,
      date: '2026-08-05',
    } as Transaction),
    makeTransaction({
      id: 't2',
      type: 'expense',
      categoryId: FOOD,
      accountId: CASH,
      amount: 200000,
      date: '2026-08-10',
    } as Transaction),
    makeTransaction({
      id: 't3',
      type: 'expense',
      categoryId: FOOD,
      accountId: BANK,
      amount: 50000,
      date: '2026-08-15',
    } as Transaction),
    makeTransaction({
      id: 't4',
      type: 'transfer',
      accountId: CASH,
      destinationAccountId: BANK,
      amount: 300000,
      date: '2026-08-12',
    } as Transaction),
    // Out of range: previous month.
    makeTransaction({
      id: 't5',
      type: 'income',
      categoryId: SALARY,
      accountId: CASH,
      amount: 999999,
      date: '2026-07-31',
    } as Transaction),
    // Out of range: next month.
    makeTransaction({
      id: 't6',
      type: 'expense',
      categoryId: FOOD,
      accountId: CASH,
      amount: 999999,
      date: '2026-09-01',
    } as Transaction),
    // Soft-deleted, must be excluded.
    makeTransaction({
      id: 't7',
      type: 'expense',
      categoryId: FOOD,
      accountId: CASH,
      amount: 999999,
      date: '2026-08-20',
      deletedAt: '2026-08-21T00:00:00.000Z',
    } as Transaction),
  ];

  it('computes income, expense and net cash flow excluding transfers, honoring month boundaries', () => {
    const summary = calculatePeriodSummary(transactions, '2026-08-01', '2026-08-31');

    expect(summary.income).toBe(1000000);
    expect(summary.expense).toBe(250000);
    expect(summary.netCashFlow).toBe(750000);
  });

  it('includes transactions on the exact from/to boundary dates', () => {
    const boundaryTransactions: Transaction[] = [
      makeTransaction({
        id: 'b1',
        type: 'income',
        categoryId: SALARY,
        accountId: CASH,
        amount: 111,
        date: '2026-08-01',
      } as Transaction),
      makeTransaction({
        id: 'b2',
        type: 'expense',
        categoryId: FOOD,
        accountId: CASH,
        amount: 22,
        date: '2026-08-31',
      } as Transaction),
    ];

    const summary = calculatePeriodSummary(boundaryTransactions, '2026-08-01', '2026-08-31');

    expect(summary.income).toBe(111);
    expect(summary.expense).toBe(22);
  });

  it('aggregates net amounts by category', () => {
    const summary = calculatePeriodSummary(transactions, '2026-08-01', '2026-08-31');

    expect(summary.byCategory[SALARY]).toBe(1000000);
    expect(summary.byCategory[FOOD]).toBe(-250000);
  });

  it('aggregates net amounts by account', () => {
    const summary = calculatePeriodSummary(transactions, '2026-08-01', '2026-08-31');

    expect(summary.byAccount[CASH]).toBe(800000);
    expect(summary.byAccount[BANK]).toBe(-50000);
  });
});

describe('formatVnd', () => {
  it('formats an integer amount with thousands separators and the VND symbol', () => {
    expect(formatVnd(1234567)).toBe('1.234.567 ₫');
  });

  it('formats zero', () => {
    expect(formatVnd(0)).toBe('0 ₫');
  });

  it('formats small numbers without separators', () => {
    expect(formatVnd(500)).toBe('500 ₫');
  });

  it('formats negative amounts with a leading minus sign', () => {
    expect(formatVnd(-1234567)).toBe('-1.234.567 ₫');
  });

  it('throws for non-integer amounts', () => {
    expect(() => formatVnd(1000.5)).toThrow();
  });
});

describe('parseVndInput', () => {
  it('parses a formatted VND string back into an integer', () => {
    expect(parseVndInput('1.234.567 ₫')).toBe(1234567);
  });

  it('parses a plain numeric string', () => {
    expect(parseVndInput('50000')).toBe(50000);
  });

  it('ignores separators and currency symbols', () => {
    expect(parseVndInput('1,234,567đ')).toBe(1234567);
  });

  it('returns null for an empty string', () => {
    expect(parseVndInput('')).toBeNull();
  });

  it('returns null for a string with no digits', () => {
    expect(parseVndInput('₫')).toBeNull();
  });

  it('round-trips through formatVnd', () => {
    expect(parseVndInput(formatVnd(9876543))).toBe(9876543);
  });
});
