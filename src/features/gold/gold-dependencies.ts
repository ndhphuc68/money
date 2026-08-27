// src/features/gold/gold-dependencies.ts
import { randomUUID } from 'expo-crypto';

import { CreateGoldLot } from '@/core/application/gold/create-gold-lot';
import { GetGoldOverview } from '@/core/application/gold/get-gold-overview';
import { CreateGoldBrand, DeleteGoldBrand, ListGoldBrands } from '@/core/application/gold/manage-gold-brands';
import { PurgeGoldLot, PurgeGoldSale } from '@/core/application/gold/purge-gold-transaction';
import { RestoreGoldLot, RestoreGoldSale } from '@/core/application/gold/restore-gold-transaction';
import { SellGoldLot } from '@/core/application/gold/sell-gold-lot';
import { TrashGoldLot, TrashGoldSale } from '@/core/application/gold/trash-gold-transaction';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { GoldBrandRepository } from '@/data/local/repositories/gold-brand-repository';
import { GoldLotRepository } from '@/data/local/repositories/gold-lot-repository';
import { GoldSellTransactionRepository } from '@/data/local/repositories/gold-sell-transaction-repository';
import { DeviceIdentity } from '@/infrastructure/expo/device-identity/device-identity';

export type GoldDependencies = {
  goldBrandRepository: GoldBrandRepository;
  goldLotRepository: GoldLotRepository;
  goldSellTransactionRepository: GoldSellTransactionRepository;
  createGoldLot: CreateGoldLot;
  createGoldBrand: CreateGoldBrand;
  listGoldBrands: ListGoldBrands;
  deleteGoldBrand: DeleteGoldBrand;
  sellGoldLot: SellGoldLot;
  trashGoldLot: TrashGoldLot;
  trashGoldSale: TrashGoldSale;
  restoreGoldLot: RestoreGoldLot;
  restoreGoldSale: RestoreGoldSale;
  purgeGoldLot: PurgeGoldLot;
  purgeGoldSale: PurgeGoldSale;
  getGoldOverview: GetGoldOverview;
};

/**
 * Composes every gold repository and use case for a single
 * `LocalDatabaseClient`, mirroring `createFinanceDependencies`
 * (`src/features/finance/finance-dependencies.ts`). Async because resolving
 * a stable device identity touches secure storage.
 */
export async function createGoldDependencies(database: LocalDatabaseClient): Promise<GoldDependencies> {
  const now = () => new Date().toISOString();
  const generateId = () => randomUUID();
  const deviceId = await new DeviceIdentity().get();
  const shared = { now, deviceId, generateId };

  const goldBrandRepository = new GoldBrandRepository(database);
  const goldLotRepository = new GoldLotRepository(database);
  const goldSellTransactionRepository = new GoldSellTransactionRepository(database);

  return {
    goldBrandRepository,
    goldLotRepository,
    goldSellTransactionRepository,
    createGoldLot: new CreateGoldLot({ goldLotRepository, ...shared }),
    createGoldBrand: new CreateGoldBrand({ goldBrandRepository, ...shared }),
    listGoldBrands: new ListGoldBrands({ goldBrandRepository }),
    deleteGoldBrand: new DeleteGoldBrand({ goldBrandRepository, ...shared }),
    sellGoldLot: new SellGoldLot({ goldLotRepository, goldSellTransactionRepository, ...shared }),
    trashGoldLot: new TrashGoldLot({ goldLotRepository, goldSellTransactionRepository, ...shared }),
    trashGoldSale: new TrashGoldSale({ goldLotRepository, goldSellTransactionRepository, ...shared }),
    restoreGoldLot: new RestoreGoldLot({ goldLotRepository, ...shared }),
    restoreGoldSale: new RestoreGoldSale({ goldLotRepository, goldSellTransactionRepository, ...shared }),
    purgeGoldLot: new PurgeGoldLot({ goldLotRepository, goldSellTransactionRepository, ...shared }),
    purgeGoldSale: new PurgeGoldSale({ goldSellTransactionRepository, ...shared }),
    getGoldOverview: new GetGoldOverview({ goldLotRepository }),
  };
}
