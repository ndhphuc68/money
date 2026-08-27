jest.mock('expo-crypto', () => {
  let uuidCounter = 0;
  return {
    randomUUID: jest.fn(() => {
      const base = '550e8400-e29b-41d4-a716-44665544';
      const paddedCounter = String(uuidCounter++).padStart(4, '0');
      return base + paddedCounter;
    }),
  };
});

import { randomUUID } from 'expo-crypto';

import { CreateGoldBrand, DeleteGoldBrand, ListGoldBrands } from '@/core/application/gold/manage-gold-brands';
import { CreateGoldLot } from '@/core/application/gold/create-gold-lot';
import { SellGoldLot } from '@/core/application/gold/sell-gold-lot';
import { TrashGoldLot, TrashGoldSale } from '@/core/application/gold/trash-gold-transaction';
import { RestoreGoldLot, RestoreGoldSale } from '@/core/application/gold/restore-gold-transaction';
import { PurgeGoldLot, PurgeGoldSale } from '@/core/application/gold/purge-gold-transaction';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { openTestLocalDatabase } from '@/data/local/db/client';
import { ChangeLogRepository } from '@/data/local/repositories/change-log-repository';
import { GoldBrandRepository } from '@/data/local/repositories/gold-brand-repository';
import { GoldLotRepository } from '@/data/local/repositories/gold-lot-repository';
import { GoldSellTransactionRepository } from '@/data/local/repositories/gold-sell-transaction-repository';

const deviceId = '550e8400-e29b-41d4-a716-446655440010';

describe('gold use cases', () => {
  let database: LocalDatabaseClient;
  let goldBrandRepository: GoldBrandRepository;
  let goldLotRepository: GoldLotRepository;
  let now: () => string;
  let generateId: () => string;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    goldBrandRepository = new GoldBrandRepository(database);
    goldLotRepository = new GoldLotRepository(database);
    now = () => '2026-08-24T10:00:00.000Z';
    generateId = () => randomUUID();
  });

  afterEach(async () => {
    await database.close();
  });

  describe('CreateGoldBrand / ListGoldBrands / DeleteGoldBrand', () => {
    it('creates a brand, lists it, then deletes it', async () => {
      const createGoldBrand = new CreateGoldBrand({ goldBrandRepository, now, deviceId, generateId });
      const listGoldBrands = new ListGoldBrands({ goldBrandRepository });
      const deleteGoldBrand = new DeleteGoldBrand({ goldBrandRepository, now, deviceId, generateId });

      const brand = await createGoldBrand.execute({ name: 'PNJ' });
      await expect(listGoldBrands.execute()).resolves.toEqual([brand]);

      await deleteGoldBrand.execute(brand.id);
      await expect(listGoldBrands.execute()).resolves.toEqual([]);
    });
  });

  describe('CreateGoldLot', () => {
    it('creates a lot as held with normalized grams, referencing an existing brand', async () => {
      const createGoldBrand = new CreateGoldBrand({ goldBrandRepository, now, deviceId, generateId });
      const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });

      const brand = await createGoldBrand.execute({ name: 'SJC' });
      const lot = await createGoldLot.execute({
        brandId: brand.id,
        purchaseDate: '2026-08-24',
        quantity: 2,
        unit: 'chi',
        totalAmount: 17000000,
      });

      expect(lot).toMatchObject({ brandId: brand.id, quantity: 2, unit: 'chi', quantityGrams: 7.5, status: 'held' });
    });
  });

  describe('SellGoldLot', () => {
    it('sells a held lot, marking it sold and computing the correct lotId link', async () => {
      const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
      const createGoldBrand = new (require('@/core/application/gold/manage-gold-brands').CreateGoldBrand)({ goldBrandRepository, now, deviceId, generateId });
      const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
      const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });

      const brand = await createGoldBrand.execute({ name: 'PNJ' });
      const lot = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-12', quantity: 1, unit: 'chi', totalAmount: 8500000 });

      const sale = await sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-25', totalAmount: 8700000 });

      expect(sale).toMatchObject({ lotId: lot.id, totalAmount: 8700000 });
      await expect(goldLotRepository.findById(lot.id)).resolves.toMatchObject({ status: 'sold' });
    });

    it('rejects selling a lot that does not exist', async () => {
      const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
      const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });

      await expect(sellGoldLot.execute({ lotId: 'missing-lot', saleDate: '2026-08-25', totalAmount: 8700000 })).rejects.toThrow(
        'Gold lot not found',
      );
    });

    it('rejects selling a lot that is already sold', async () => {
      const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
      const createGoldBrand = new (require('@/core/application/gold/manage-gold-brands').CreateGoldBrand)({ goldBrandRepository, now, deviceId, generateId });
      const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
      const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });

      const brand = await createGoldBrand.execute({ name: 'SJC' });
      const lot = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-12', quantity: 1, unit: 'chi', totalAmount: 8500000 });
      await sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-20', totalAmount: 8700000 });

      await expect(sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-25', totalAmount: 8800000 })).rejects.toThrow(
        'Gold lot is not available to sell',
      );
    });

    it('rejects a sale date earlier than the purchase date', async () => {
      const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
      const createGoldBrand = new (require('@/core/application/gold/manage-gold-brands').CreateGoldBrand)({ goldBrandRepository, now, deviceId, generateId });
      const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
      const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });

      const brand = await createGoldBrand.execute({ name: 'DOJI' });
      const lot = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-20', quantity: 1, unit: 'chi', totalAmount: 8500000 });

      await expect(sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-19', totalAmount: 8700000 })).rejects.toThrow(
        'Sale date must not be before the lot purchase date',
      );
    });
  });

  describe('trash / restore / purge', () => {
    it('blocks trashing a lot with an active sale, allows it once the sale is trashed, and restore round-trips', async () => {
      const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
      const changeLogRepository = new ChangeLogRepository(database);
      const createGoldBrand = new CreateGoldBrand({ goldBrandRepository, now, deviceId, generateId });
      const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
      const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
      const trashGoldLot = new TrashGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
      const trashGoldSale = new TrashGoldSale({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
      const restoreGoldLot = new RestoreGoldLot({ goldLotRepository, now, deviceId, generateId });
      const restoreGoldSale = new RestoreGoldSale({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
      const purgeGoldLot = new PurgeGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
      const purgeGoldSale = new PurgeGoldSale({ goldSellTransactionRepository, now, deviceId, generateId });

      const brand = await createGoldBrand.execute({ name: 'PNJ' });
      const lot = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-12', quantity: 1, unit: 'chi', totalAmount: 8500000 });
      const sale = await sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-25', totalAmount: 8700000 });

      await expect(trashGoldLot.execute(lot.id)).rejects.toThrow('Cannot trash a gold lot with an active sell transaction');

      const trashedSale = await trashGoldSale.execute(sale.id);
      expect(trashedSale.deletedAt).not.toBeNull();
      await expect(goldLotRepository.findById(lot.id)).resolves.toMatchObject({ status: 'held' });

      const restoredSale = await restoreGoldSale.execute(sale.id);
      expect(restoredSale.deletedAt).toBeNull();
      await expect(goldLotRepository.findById(lot.id)).resolves.toMatchObject({ status: 'sold' });

      await trashGoldSale.execute(sale.id);
      const trashedLot = await trashGoldLot.execute(lot.id);
      expect(trashedLot.deletedAt).not.toBeNull();

      const restoredLot = await restoreGoldLot.execute(lot.id);
      expect(restoredLot.deletedAt).toBeNull();

      await trashGoldLot.execute(lot.id);
      await purgeGoldLot.execute(lot.id);
      const changeLogRepo = changeLogRepository;
      await expect(changeLogRepo.listPending()).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ entityId: lot.id, operation: 'delete' })]),
      );

      await purgeGoldSale.execute(sale.id);
      await expect(changeLogRepo.listPending()).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ entityId: sale.id, operation: 'delete' })]),
      );
    });

    it('rejects restoring a sale whose lot has been re-sold to another sale', async () => {
      const goldSellTransactionRepository = new GoldSellTransactionRepository(database);
      const createGoldBrand = new CreateGoldBrand({ goldBrandRepository, now, deviceId, generateId });
      const createGoldLot = new CreateGoldLot({ goldLotRepository, now, deviceId, generateId });
      const sellGoldLot = new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
      const trashGoldSale = new TrashGoldSale({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });
      const restoreGoldSale = new RestoreGoldSale({ goldLotRepository, goldSellTransactionRepository, now, deviceId, generateId });

      const brand = await createGoldBrand.execute({ name: 'SJC' });
      const lot = await createGoldLot.execute({ brandId: brand.id, purchaseDate: '2026-08-12', quantity: 1, unit: 'chi', totalAmount: 8500000 });
      const firstSale = await sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-20', totalAmount: 8700000 });
      await trashGoldSale.execute(firstSale.id);
      await sellGoldLot.execute({ lotId: lot.id, saleDate: '2026-08-22', totalAmount: 8600000 });

      await expect(restoreGoldSale.execute(firstSale.id)).rejects.toThrow('Cannot restore: the gold lot is no longer available');
    });
  });
});
