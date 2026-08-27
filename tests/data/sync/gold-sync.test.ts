import { Account } from '@/core/domain/finance/account';
import { GoldBrand } from '@/core/domain/gold/gold-brand';
import { GoldLot } from '@/core/domain/gold/gold-lot';
import { GoldSellTransaction } from '@/core/domain/gold/gold-sell-transaction';
import { SyncOperation, SyncOperationKind } from '@/core/domain/sync/sync-operation';
import { SyncPackageWithoutAuth } from '@/core/domain/sync/sync-package';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';
import { openTestLocalDatabase } from '@/data/local/db/client';
import { AccountRepository } from '@/data/local/repositories/account-repository';
import { ChangeLogRepository } from '@/data/local/repositories/change-log-repository';
import { GoldBrandRepository } from '@/data/local/repositories/gold-brand-repository';
import { GoldLotRepository } from '@/data/local/repositories/gold-lot-repository';
import { GoldSellTransactionRepository } from '@/data/local/repositories/gold-sell-transaction-repository';
import { StableSyncPackageSerializer } from '@/data/sync/serializers/sync-package-serializer';
import { SyncEngine } from '@/data/sync/sync-engine/sync-engine';

const sourceDeviceId = '550e8400-e29b-41d4-a716-446655440001';
const localDeviceId = '550e8400-e29b-41d4-a716-446655440002';
const serializer = new StableSyncPackageSerializer();

const accountId = '660e8400-e29b-41d4-a716-446655440010';
const goldBrandId = '770e8400-e29b-41d4-a716-446655440010';
const goldLotId = '770e8400-e29b-41d4-a716-446655440011';
const goldSaleId = '770e8400-e29b-41d4-a716-446655440012';

function accountRecord(overrides: Partial<Account> = {}): Account {
  return {
    id: accountId,
    name: 'Cash Wallet',
    type: 'cash',
    openingBalance: 500000,
    isArchived: false,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: sourceDeviceId,
    ...overrides,
  };
}

function goldBrandRecord(overrides: Partial<GoldBrand> = {}): GoldBrand {
  return {
    id: goldBrandId,
    name: 'PNJ',
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: sourceDeviceId,
    ...overrides,
  };
}

function goldLotRecord(overrides: Partial<GoldLot> = {}): GoldLot {
  return {
    id: goldLotId,
    brandId: goldBrandId,
    purchaseDate: '2026-08-12',
    quantity: 1,
    unit: 'chi',
    quantityGrams: 3.75,
    totalAmount: 8500000,
    note: null,
    status: 'held',
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: sourceDeviceId,
    ...overrides,
  };
}

function goldSaleRecord(overrides: Partial<GoldSellTransaction> = {}): GoldSellTransaction {
  return {
    id: goldSaleId,
    lotId: goldLotId,
    saleDate: '2026-08-25',
    totalAmount: 8700000,
    note: null,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: sourceDeviceId,
    ...overrides,
  };
}

function operationFor(
  entityType: string,
  payload: SyncableRecord,
  overrides: Partial<SyncOperation> = {},
): SyncOperation {
  const kind: SyncOperationKind = overrides.operation ?? (payload.deletedAt === null ? 'create' : 'delete');

  return {
    operationId: overrides.operationId ?? payload.id,
    entityType,
    entityId: payload.id,
    operation: kind,
    payload,
    originDeviceId: payload.originDeviceId,
    revision: payload.revision,
    createdAt: payload.updatedAt,
    ...overrides,
  };
}

function pkg(changes: SyncOperation[], overrides: Partial<SyncPackageWithoutAuth> = {}): SyncPackageWithoutAuth {
  return serializer.withChecksum({
    format: 'app-sync',
    formatVersion: 2,
    appVersion: '1.0.0',
    schemaVersion: 1,
    sourceDeviceId,
    exportedAt: '2026-08-24T10:10:00.000Z',
    changes,
    ...overrides,
  });
}

describe('SyncEngine — gold entities', () => {
  let database: Awaited<ReturnType<typeof openTestLocalDatabase>>;
  let accountRepo: AccountRepository;
  let goldBrandRepo: GoldBrandRepository;
  let goldLotRepo: GoldLotRepository;
  let goldSaleRepo: GoldSellTransactionRepository;
  let changes: ChangeLogRepository;
  let engine: SyncEngine;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    accountRepo = new AccountRepository(database);
    goldBrandRepo = new GoldBrandRepository(database);
    goldLotRepo = new GoldLotRepository(database);
    goldSaleRepo = new GoldSellTransactionRepository(database);
    changes = new ChangeLogRepository(database);
    engine = new SyncEngine({
      database,
      changes,
      serializer,
      appVersion: '1.0.0',
      schemaVersion: 1,
      sourceDeviceId: localDeviceId,
      now: () => '2026-08-24T10:10:00.000Z',
    });
  });

  afterEach(async () => {
    await database.close();
  });

  it('imports a gold brand, lot, and sell transaction from another device and round-trips them', async () => {
    const brand = goldBrandRecord();
    const lot = goldLotRecord();
    const sale = goldSaleRecord();

    // Brand must be applied before the lot (FK), and the lot before the sale.
    const changesToImport = [
      operationFor('gold_brand', brand),
      operationFor('gold_lot', lot),
      operationFor('gold_sell_transaction', sale),
    ];

    await expect(engine.import(pkg(changesToImport))).resolves.toEqual({
      applied: 3,
      skipped: 0,
      conflicted: 0,
      rejected: 0,
    });

    await expect(goldBrandRepo.findById(goldBrandId)).resolves.toEqual(brand);
    await expect(goldLotRepo.findById(goldLotId)).resolves.toEqual(lot);
    await expect(goldSaleRepo.findById(goldSaleId)).resolves.toEqual(sale);
    await expect(engine.exportPending()).resolves.toMatchObject({ changes: [] });
  });

  it('applies a mixed package containing both a finance operation and a gold operation (regression guard)', async () => {
    const account = accountRecord();
    const brand = goldBrandRecord();

    const changesToImport = [operationFor('account', account), operationFor('gold_brand', brand)];

    const summary = await engine.import(pkg(changesToImport));

    expect(summary).toEqual({ applied: 2, skipped: 0, conflicted: 0, rejected: 0 });
    await expect(accountRepo.findById(accountId)).resolves.toEqual(account);
    await expect(goldBrandRepo.findById(goldBrandId)).resolves.toEqual(brand);
  });
});
