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
import { LocalDatabaseClient } from '@/data/local/db/client';
import { openTestLocalDatabase } from '@/data/local/db/client';
import { GoldBrandRepository } from '@/data/local/repositories/gold-brand-repository';
import { GoldLotRepository } from '@/data/local/repositories/gold-lot-repository';

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
});
