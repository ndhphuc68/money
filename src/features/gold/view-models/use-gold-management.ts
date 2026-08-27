// src/features/gold/view-models/use-gold-management.ts
import { useCallback, useEffect, useState } from 'react';

import { GoldOverview } from '@/core/application/gold/get-gold-overview';
import { GoldBrand } from '@/core/domain/gold/gold-brand';
import { GoldLot, GoldLotInput } from '@/core/domain/gold/gold-lot';
import { GoldSellTransactionInput } from '@/core/domain/gold/gold-sell-transaction';
import { GoldDependencies } from '@/features/gold/gold-dependencies';
import { Translate } from '@/i18n/translations';

import { buildLotHistoryRow, buildSaleHistoryRow, LotHistoryRow, SaleHistoryRow } from './gold-presentation';

export type GoldManagementDependencies = Pick<
  GoldDependencies,
  | 'goldLotRepository'
  | 'goldSellTransactionRepository'
  | 'goldBrandRepository'
  | 'createGoldLot'
  | 'createGoldBrand'
  | 'deleteGoldBrand'
  | 'listGoldBrands'
  | 'sellGoldLot'
  | 'trashGoldLot'
  | 'trashGoldSale'
  | 'restoreGoldLot'
  | 'restoreGoldSale'
  | 'purgeGoldLot'
  | 'purgeGoldSale'
  | 'getGoldOverview'
>;

export type GoldManagementViewModel = {
  overview: GoldOverview | null;
  heldLots: LotHistoryRow[];
  trashedLots: LotHistoryRow[];
  trashedSales: SaleHistoryRow[];
  brands: GoldBrand[];
  loading: boolean;
  error: string | null;
  reload(): Promise<void>;
  addBrand(name: string): Promise<void>;
  removeBrand(id: string): Promise<void>;
  createLot(input: GoldLotInput): Promise<void>;
  sellLot(input: GoldSellTransactionInput): Promise<void>;
  trashLot(id: string): Promise<void>;
  trashSale(id: string): Promise<void>;
  restoreLot(id: string): Promise<void>;
  restoreSale(id: string): Promise<void>;
  purgeLot(id: string): Promise<void>;
  purgeSale(id: string): Promise<void>;
};

export function useGoldManagement(options: { dependencies: GoldManagementDependencies; t: Translate }): GoldManagementViewModel {
  const { dependencies, t } = options;
  const [overview, setOverview] = useState<GoldOverview | null>(null);
  const [heldLots, setHeldLots] = useState<LotHistoryRow[]>([]);
  const [trashedLots, setTrashedLots] = useState<LotHistoryRow[]>([]);
  const [trashedSales, setTrashedSales] = useState<SaleHistoryRow[]>([]);
  const [brands, setBrands] = useState<GoldBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewResult, activeLots, deletedLots, deletedSales, brandList] = await Promise.all([
        dependencies.getGoldOverview.execute(),
        dependencies.goldLotRepository.list({ status: 'held' }),
        dependencies.goldLotRepository.list({ includeDeleted: true }).then((lots: GoldLot[]) => lots.filter((lot) => lot.deletedAt !== null)),
        dependencies.goldSellTransactionRepository.list({ includeDeleted: true }).then((sales) => sales.filter((sale) => sale.deletedAt !== null)),
        dependencies.listGoldBrands.execute(),
      ]);

      const brandNameById = new Map(brandList.map((brand) => [brand.id, brand.name] as const));
      const nameFor = (brandId: string) => brandNameById.get(brandId) ?? brandId;

      setOverview(overviewResult);
      setHeldLots(activeLots.map((lot) => buildLotHistoryRow(lot, nameFor(lot.brandId), t)));
      setTrashedLots(deletedLots.map((lot) => buildLotHistoryRow(lot, nameFor(lot.brandId), t)));

      const lotById = new Map<string, GoldLot>();
      for (const lot of [...activeLots, ...deletedLots]) {
        lotById.set(lot.id, lot);
      }
      setTrashedSales(
        deletedSales.map((sale) => {
          const lot = lotById.get(sale.lotId) ?? null;
          return buildSaleHistoryRow(sale, lot, lot ? nameFor(lot.brandId) : '', t);
        }),
      );
      setBrands(brandList);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [dependencies, t]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    overview,
    heldLots,
    trashedLots,
    trashedSales,
    brands,
    loading,
    error,
    reload: load,
    addBrand: async (name: string) => {
      await dependencies.createGoldBrand.execute({ name });
      await load();
    },
    removeBrand: async (id: string) => {
      await dependencies.deleteGoldBrand.execute(id);
      await load();
    },
    createLot: async (input: GoldLotInput) => {
      await dependencies.createGoldLot.execute(input);
      await load();
    },
    sellLot: async (input: GoldSellTransactionInput) => {
      await dependencies.sellGoldLot.execute(input);
      await load();
    },
    trashLot: async (id: string) => {
      await dependencies.trashGoldLot.execute(id);
      await load();
    },
    trashSale: async (id: string) => {
      await dependencies.trashGoldSale.execute(id);
      await load();
    },
    restoreLot: async (id: string) => {
      await dependencies.restoreGoldLot.execute(id);
      await load();
    },
    restoreSale: async (id: string) => {
      await dependencies.restoreGoldSale.execute(id);
      await load();
    },
    purgeLot: async (id: string) => {
      await dependencies.purgeGoldLot.execute(id);
      await load();
    },
    purgeSale: async (id: string) => {
      await dependencies.purgeGoldSale.execute(id);
      await load();
    },
  };
}
