import { GoldBrand } from '@/core/domain/gold/gold-brand';
import { GoldLot } from '@/core/domain/gold/gold-lot';
import { GoldSellTransaction } from '@/core/domain/gold/gold-sell-transaction';
import { goldBrands, goldLots, goldSellTransactions } from '@/data/local/schema';

type GoldBrandRow = typeof goldBrands.$inferSelect;
type GoldLotRow = typeof goldLots.$inferSelect;
type GoldSellTransactionRow = typeof goldSellTransactions.$inferSelect;

export function toGoldBrandEntity(row: GoldBrandRow): GoldBrand {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toGoldBrandRowValues(brand: GoldBrand): GoldBrandRow {
  return {
    id: brand.id,
    name: brand.name,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
    deletedAt: brand.deletedAt,
    revision: brand.revision,
    originDeviceId: brand.originDeviceId,
  };
}

export function toGoldLotEntity(row: GoldLotRow): GoldLot {
  return {
    id: row.id,
    brandId: row.brandId,
    purchaseDate: row.purchaseDate,
    quantity: row.quantity,
    unit: row.unit,
    quantityGrams: row.quantityGrams,
    totalAmount: row.totalAmount,
    note: row.note,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toGoldLotRowValues(lot: GoldLot): GoldLotRow {
  return {
    id: lot.id,
    brandId: lot.brandId,
    purchaseDate: lot.purchaseDate,
    quantity: lot.quantity,
    unit: lot.unit,
    quantityGrams: lot.quantityGrams,
    totalAmount: lot.totalAmount,
    note: lot.note ?? null,
    status: lot.status,
    createdAt: lot.createdAt,
    updatedAt: lot.updatedAt,
    deletedAt: lot.deletedAt,
    revision: lot.revision,
    originDeviceId: lot.originDeviceId,
  };
}

export function toGoldSellTransactionEntity(row: GoldSellTransactionRow): GoldSellTransaction {
  return {
    id: row.id,
    lotId: row.lotId,
    saleDate: row.saleDate,
    totalAmount: row.totalAmount,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toGoldSellTransactionRowValues(sale: GoldSellTransaction): GoldSellTransactionRow {
  return {
    id: sale.id,
    lotId: sale.lotId,
    saleDate: sale.saleDate,
    totalAmount: sale.totalAmount,
    note: sale.note ?? null,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    deletedAt: sale.deletedAt,
    revision: sale.revision,
    originDeviceId: sale.originDeviceId,
  };
}
