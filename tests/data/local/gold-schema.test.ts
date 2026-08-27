import { openTestLocalDatabase } from '@/data/local/db/client';
import { goldBrands, goldLots, goldSellTransactions } from '@/data/local/schema';

describe('gold schema', () => {
  it('creates the gold_brands, gold_lots, and gold_sell_transactions tables via migration', async () => {
    const database = await openTestLocalDatabase();
    try {
      const brandId = '550e8400-e29b-41d4-a716-446655440101';
      const lotId = '550e8400-e29b-41d4-a716-446655440102';
      const saleId = '550e8400-e29b-41d4-a716-446655440103';
      const deviceId = '550e8400-e29b-41d4-a716-446655440010';
      const now = '2026-08-24T10:00:00.000Z';

      database.db
        .insert(goldBrands)
        .values({ id: brandId, name: 'PNJ', createdAt: now, updatedAt: now, deletedAt: null, revision: 1, originDeviceId: deviceId })
        .run();

      database.db
        .insert(goldLots)
        .values({
          id: lotId,
          brandId,
          purchaseDate: '2026-08-24',
          quantity: 2,
          unit: 'chi',
          quantityGrams: 7.5,
          totalAmount: 17000000,
          note: null,
          status: 'held',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          revision: 1,
          originDeviceId: deviceId,
        })
        .run();

      database.db
        .insert(goldSellTransactions)
        .values({
          id: saleId,
          lotId,
          saleDate: '2026-08-25',
          totalAmount: 8700000,
          note: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          revision: 1,
          originDeviceId: deviceId,
        })
        .run();

      const lotRow = database.db.select().from(goldLots).all();
      const saleRow = database.db.select().from(goldSellTransactions).all();
      expect(lotRow).toHaveLength(1);
      expect(saleRow).toHaveLength(1);
      expect(saleRow[0].lotId).toBe(lotId);
    } finally {
      await database.close();
    }
  });
});
