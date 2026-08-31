import { ChangeLogRepository } from '@/data/local/repositories/change-log-repository';
import { GoldBrandRepository } from '@/data/local/repositories/gold-brand-repository';
import { GoldLotRepository } from '@/data/local/repositories/gold-lot-repository';
import { GoldSellTransactionRepository } from '@/data/local/repositories/gold-sell-transaction-repository';
import { openTestLocalDatabase } from '@/data/local/db/client';
import { WriteContext } from '@/core/application/ports/finance-repositories';

const deviceId = '550e8400-e29b-41d4-a716-446655440010';

function id(suffix: string): string {
  return `550e8400-e29b-41d4-a716-4466554${suffix.padStart(5, '0')}`;
}

function ctx(overrides: Partial<WriteContext> = {}): WriteContext {
  return {
    originDeviceId: deviceId,
    operationId: id('90000'),
    now: '2026-08-24T10:00:00.000Z',
    ...overrides,
  };
}

describe('gold repositories', () => {
  let database: Awaited<ReturnType<typeof openTestLocalDatabase>>;
  let brands: GoldBrandRepository;
  let changes: ChangeLogRepository;
  let lots: GoldLotRepository;
  let sales: GoldSellTransactionRepository;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    brands = new GoldBrandRepository(database);
    changes = new ChangeLogRepository(database);
    lots = new GoldLotRepository(database);
    sales = new GoldSellTransactionRepository(database);
  });

  afterEach(async () => {
    await database.close();
  });

  describe('GoldBrandRepository', () => {
    it('creates a brand and appends a matching change operation', async () => {
      const brand = await brands.create({
        id: id('00001'),
        name: 'PNJ',
        ...ctx({ operationId: id('90001') }),
      });

      expect(brand).toMatchObject({ name: 'PNJ', revision: 1 });
      await expect(brands.findById(brand.id)).resolves.toEqual(brand);
      await expect(changes.hasOperation(id('90001'))).resolves.toBe(true);
      await expect(brands.listActive()).resolves.toEqual([brand]);
    });

    it('soft-deletes a brand without affecting lots that reference it', async () => {
      const brand = await brands.create({
        id: id('00002'),
        name: 'SJC',
        ...ctx({ operationId: id('90002') }),
      });
      await brands.softDelete(
        brand.id,
        ctx({ operationId: id('90003'), now: '2026-08-24T11:00:00.000Z' }),
      );

      const deleted = await brands.findById(brand.id);
      expect(deleted?.deletedAt).toBe('2026-08-24T11:00:00.000Z');
      await expect(brands.listActive()).resolves.toEqual([]);
    });
  });

  describe('GoldLotRepository', () => {
    it('creates a lot as held, normalizing quantity to grams', async () => {
      const brand = await brands.create({
        id: id('00010'),
        name: 'PNJ',
        ...ctx({ operationId: id('90010') }),
      });
      const lot = await lots.create({
        id: id('00011'),
        brandId: brand.id,
        purchaseDate: '2026-08-24',
        quantity: 2,
        unit: 'chi',
        totalAmount: 17000000,
        ...ctx({ operationId: id('90011') }),
      });

      expect(lot).toMatchObject({
        brandId: brand.id,
        quantity: 2,
        unit: 'chi',
        quantityGrams: 7.5,
        totalAmount: 17000000,
        status: 'held',
        revision: 1,
      });
      await expect(lots.findById(lot.id)).resolves.toEqual(lot);
      await expect(changes.hasOperation(id('90011'))).resolves.toBe(true);
    });

    it('soft-deletes and restores a lot', async () => {
      const brand = await brands.create({
        id: id('00012'),
        name: 'SJC',
        ...ctx({ operationId: id('90012') }),
      });
      const lot = await lots.create({
        id: id('00013'),
        brandId: brand.id,
        purchaseDate: '2026-08-24',
        quantity: 1,
        unit: 'chi',
        totalAmount: 8500000,
        ...ctx({ operationId: id('90013') }),
      });

      const trashed = await lots.softDelete(
        lot.id,
        ctx({ operationId: id('90014'), now: '2026-08-24T11:00:00.000Z' }),
      );
      expect(trashed.deletedAt).toBe('2026-08-24T11:00:00.000Z');
      await expect(lots.list()).resolves.toEqual([]);
      await expect(lots.list({ includeDeleted: true })).resolves.toEqual([trashed]);

      const restored = await lots.restore(
        lot.id,
        ctx({ operationId: id('90015'), now: '2026-08-24T12:00:00.000Z' }),
      );
      expect(restored.deletedAt).toBeNull();
      await expect(lots.list()).resolves.toEqual([restored]);
    });

    it('marks a lot sold and back to held', async () => {
      const brand = await brands.create({
        id: id('00016'),
        name: 'DOJI',
        ...ctx({ operationId: id('90016') }),
      });
      const lot = await lots.create({
        id: id('00017'),
        brandId: brand.id,
        purchaseDate: '2026-08-24',
        quantity: 1,
        unit: 'chi',
        totalAmount: 8500000,
        ...ctx({ operationId: id('90017') }),
      });

      const sold = await lots.markSold(
        lot.id,
        ctx({ operationId: id('90018'), now: '2026-08-25T10:00:00.000Z' }),
      );
      expect(sold.status).toBe('sold');
      await expect(lots.list({ status: 'held' })).resolves.toEqual([]);

      const held = await lots.markHeld(
        lot.id,
        ctx({ operationId: id('90019'), now: '2026-08-26T10:00:00.000Z' }),
      );
      expect(held.status).toBe('held');
      await expect(lots.list({ status: 'held' })).resolves.toEqual([held]);
    });
  });

  describe('GoldSellTransactionRepository', () => {
    it('creates a sell transaction and finds it by lotId', async () => {
      const brand = await brands.create({
        id: id('00020'),
        name: 'PNJ',
        ...ctx({ operationId: id('90020') }),
      });
      const lot = await lots.create({
        id: id('00021'),
        brandId: brand.id,
        purchaseDate: '2026-08-12',
        quantity: 1,
        unit: 'chi',
        totalAmount: 8500000,
        ...ctx({ operationId: id('90021') }),
      });

      const sale = await sales.create({
        id: id('00022'),
        lotId: lot.id,
        saleDate: '2026-08-25',
        totalAmount: 8700000,
        ...ctx({ operationId: id('90022') }),
      });

      expect(sale).toMatchObject({ lotId: lot.id, totalAmount: 8700000, revision: 1 });
      await expect(sales.findById(sale.id)).resolves.toEqual(sale);
      await expect(sales.findActiveByLotId(lot.id)).resolves.toEqual(sale);
      await expect(changes.hasOperation(id('90022'))).resolves.toBe(true);
    });

    it('soft-deletes a sell transaction so findActiveByLotId returns null', async () => {
      const brand = await brands.create({
        id: id('00023'),
        name: 'SJC',
        ...ctx({ operationId: id('90023') }),
      });
      const lot = await lots.create({
        id: id('00024'),
        brandId: brand.id,
        purchaseDate: '2026-08-12',
        quantity: 1,
        unit: 'chi',
        totalAmount: 8500000,
        ...ctx({ operationId: id('90024') }),
      });
      const sale = await sales.create({
        id: id('00025'),
        lotId: lot.id,
        saleDate: '2026-08-25',
        totalAmount: 8700000,
        ...ctx({ operationId: id('90025') }),
      });

      await sales.softDelete(
        sale.id,
        ctx({ operationId: id('90026'), now: '2026-08-26T10:00:00.000Z' }),
      );
      await expect(sales.findActiveByLotId(lot.id)).resolves.toBeNull();

      const restored = await sales.restore(
        sale.id,
        ctx({ operationId: id('90027'), now: '2026-08-27T10:00:00.000Z' }),
      );
      expect(restored.deletedAt).toBeNull();
      await expect(sales.findActiveByLotId(lot.id)).resolves.toEqual(restored);
    });
  });
});
