import {
  CreateTransactionInput,
  TransactionListFilter,
  TransactionRepository,
} from '@/core/application/ports/finance-repositories';
import { CreateTransaction } from '@/core/application/finance/create-transaction';
import { GetReportTrend } from '@/core/application/finance/get-report-trend';
import {
  Transaction,
  TransactionInput,
  validateTransactionInput,
} from '@/core/domain/finance/transaction';

const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440099';

class FakeTransactionRepository implements TransactionRepository {
  private readonly store = new Map<string, Transaction>();

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const { id, originDeviceId, operationId: _operationId, now, ...rest } = input;
    validateTransactionInput(rest);
    const transaction = buildTransaction(id, rest, {
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      originDeviceId,
    });
    this.store.set(id, transaction);
    return transaction;
  }

  async update(): Promise<Transaction> {
    throw new Error('not implemented');
  }

  async softDelete(): Promise<Transaction> {
    throw new Error('not implemented');
  }

  async restore(): Promise<Transaction> {
    throw new Error('not implemented');
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter: TransactionListFilter = {}): Promise<Transaction[]> {
    let items = Array.from(this.store.values());
    if (!filter.includeDeleted) {
      items = items.filter((t) => t.deletedAt === null);
    }
    if (filter.categoryIds && filter.categoryIds.length > 0) {
      items = items.filter((t) => filter.categoryIds!.includes(t.categoryId ?? ''));
    } else if (filter.categoryId) {
      items = items.filter((t) => t.categoryId === filter.categoryId);
    }
    if (filter.from) {
      items = items.filter((t) => t.date >= filter.from!);
    }
    if (filter.to) {
      items = items.filter((t) => t.date <= filter.to!);
    }
    return items;
  }

  async saveWithOperation(): Promise<void> {
    throw new Error('not implemented');
  }
}

function buildTransaction(
  id: string,
  input: TransactionInput,
  meta: {
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    revision: number;
    originDeviceId: string;
  },
): Transaction {
  const base = {
    id,
    amount: input.amount,
    accountId: input.accountId,
    date: input.date,
    name: input.name,
    note: input.note ?? null,
    ...meta,
  };
  if (input.type === 'transfer') {
    return {
      ...base,
      type: 'transfer',
      destinationAccountId: input.destinationAccountId as string,
      categoryId: null,
    };
  }
  return {
    ...base,
    type: input.type,
    categoryId: input.categoryId as string,
    destinationAccountId: null,
  };
}

function makeIdFactory(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

describe('GetReportTrend', () => {
  it('builds a trailing monthly series ending on the anchor month, defaulting to 6 points', async () => {
    const transactionRepository = new FakeTransactionRepository();
    const now = () => new Date('2026-08-25T00:00:00.000Z').toISOString();
    const generateId = makeIdFactory('trend');
    const createTransaction = new CreateTransaction({
      transactionRepository,
      now,
      deviceId: DEVICE_ID,
      generateId,
    });

    await createTransaction.execute({
      type: 'income',
      amount: 1000000,
      accountId: 'account-cash',
      categoryId: 'category-salary',
      date: '2026-08-05',
      name: 'Salary',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 200000,
      accountId: 'account-cash',
      categoryId: 'category-food',
      date: '2026-03-10',
      name: 'Groceries in March',
      note: null,
    });

    const trend = new GetReportTrend({ transactionRepository });
    const points = await trend.execute({ kind: 'month', anchor: '2026-08' });

    expect(points).toHaveLength(6);
    expect(points.map((p) => p.key)).toEqual([
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ]);
    expect(points[0]).toEqual({
      key: '2026-03',
      from: '2026-03-01',
      to: '2026-03-31',
      income: 0,
      expense: 200000,
    });
    expect(points[5]).toEqual({
      key: '2026-08',
      from: '2026-08-01',
      to: '2026-08-31',
      income: 1000000,
      expense: 0,
    });
  });

  it('respects an explicit pointCount and a weekly kind', async () => {
    const transactionRepository = new FakeTransactionRepository();
    const trend = new GetReportTrend({ transactionRepository });
    const points = await trend.execute({ kind: 'week', anchor: '2026-08-24', pointCount: 3 });

    expect(points.map((p) => p.key)).toEqual(['2026-08-10', '2026-08-17', '2026-08-24']);
    expect(points[2]).toEqual({
      key: '2026-08-24',
      from: '2026-08-24',
      to: '2026-08-30',
      income: 0,
      expense: 0,
    });
  });

  it('applies filters to every point in a quarterly series', async () => {
    const transactionRepository = new FakeTransactionRepository();
    const now = () => new Date('2026-08-25T00:00:00.000Z').toISOString();
    const generateId = makeIdFactory('trendq');
    const createTransaction = new CreateTransaction({
      transactionRepository,
      now,
      deviceId: DEVICE_ID,
      generateId,
    });

    await createTransaction.execute({
      type: 'expense',
      amount: 300000,
      accountId: 'account-cash',
      categoryId: 'category-food',
      date: '2026-07-15',
      name: 'Q3 groceries',
      note: null,
    });
    await createTransaction.execute({
      type: 'expense',
      amount: 500000,
      accountId: 'account-cash',
      categoryId: 'category-bills',
      date: '2026-07-16',
      name: 'Q3 bills',
      note: null,
    });

    const trend = new GetReportTrend({ transactionRepository });
    const points = await trend.execute({
      kind: 'quarter',
      anchor: '2026-Q3',
      pointCount: 1,
      filters: { categoryId: 'category-food' },
    });

    expect(points).toEqual([
      { key: '2026-Q3', from: '2026-07-01', to: '2026-09-30', income: 0, expense: 300000 },
    ]);
  });
});
