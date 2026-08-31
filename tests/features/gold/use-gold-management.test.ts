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
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createGoldDependencies } from '@/features/gold/gold-dependencies';
import { useGoldManagement } from '@/features/gold/view-models/use-gold-management';
import { openTestLocalDatabase, LocalDatabaseClient } from '@/data/local/db/client';
import { en } from '@/i18n/locales/en';
import { Translate } from '@/i18n/translations';

function makeTranslate(): Translate {
  return ((key: keyof typeof en) => en[key]) as Translate;
}

describe('useGoldManagement', () => {
  let database: LocalDatabaseClient;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
  });

  afterEach(async () => {
    await database.close();
  });

  it('loads an empty overview, then adds a brand and a lot, then sells the lot', async () => {
    const dependencies = await createGoldDependencies(database);
    const t = makeTranslate();
    const { result } = renderHook(() => useGoldManagement({ dependencies, t }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.heldLots).toEqual([]);
    expect(result.current.brands).toEqual([]);

    await act(async () => {
      await result.current.addBrand('PNJ');
    });
    expect(result.current.brands).toHaveLength(1);
    const brandId = result.current.brands[0].id;

    await act(async () => {
      await result.current.createLot({
        brandId,
        purchaseDate: '2026-08-24',
        quantity: 2,
        unit: 'chi',
        totalAmount: 17000000,
      });
    });
    expect(result.current.heldLots).toHaveLength(1);
    expect(result.current.overview?.totalCostBasis).toBe(17000000);

    const lotId = result.current.heldLots[0].id;
    await act(async () => {
      await result.current.sellLot({ lotId, saleDate: '2026-08-25', totalAmount: 8700000 });
    });
    expect(result.current.heldLots).toEqual([]);
    expect(result.current.overview?.totalCostBasis).toBe(0);
  });

  it('trashes a lot, sees it in trashedLots, then restores it', async () => {
    const dependencies = await createGoldDependencies(database);
    const t = makeTranslate();
    const { result } = renderHook(() => useGoldManagement({ dependencies, t }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addBrand('SJC');
    });
    const brandId = result.current.brands[0].id;
    await act(async () => {
      await result.current.createLot({
        brandId,
        purchaseDate: '2026-08-24',
        quantity: 1,
        unit: 'chi',
        totalAmount: 8500000,
      });
    });
    const lotId = result.current.heldLots[0].id;

    await act(async () => {
      await result.current.trashLot(lotId);
    });
    expect(result.current.heldLots).toEqual([]);
    expect(result.current.trashedLots).toHaveLength(1);

    await act(async () => {
      await result.current.restoreLot(lotId);
    });
    expect(result.current.heldLots).toHaveLength(1);
    expect(result.current.trashedLots).toEqual([]);
  });
});
