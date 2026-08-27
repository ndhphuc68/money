// src/features/gold/view-models/gold-presentation.ts
import { GoldLot } from '@/core/domain/gold/gold-lot';
import { GoldSellTransaction } from '@/core/domain/gold/gold-sell-transaction';
import { GoldWeightUnit } from '@/core/domain/gold/gold-weight';
import { formatVnd } from '@/core/domain/finance/money';
import { Translate } from '@/i18n/translations';

const UNIT_LABEL_KEY: Record<GoldWeightUnit, keyof ReturnType<typeof unitLabelKeys>> = {
  luong: 'goldUnitLuong',
  chi: 'goldUnitChi',
  phan: 'goldUnitPhan',
  gram: 'goldUnitGram',
};

function unitLabelKeys() {
  return {
    goldUnitLuong: 'luong',
    goldUnitChi: 'chi',
    goldUnitPhan: 'phan',
    goldUnitGram: 'gram',
  } as const;
}

export function formatGoldWeight(quantity: number, unit: GoldWeightUnit, t: Translate): string {
  const label = t(UNIT_LABEL_KEY[unit]);
  return `${quantity} ${label}`;
}

export type LotHistoryRow = {
  id: string;
  title: string;
  subtitle: string;
  amountLabel: string;
};

export function buildLotHistoryRow(lot: GoldLot, brandName: string, t: Translate): LotHistoryRow {
  return {
    id: lot.id,
    title: brandName,
    subtitle: `${lot.purchaseDate} · ${formatGoldWeight(lot.quantity, lot.unit, t)}`,
    amountLabel: formatVnd(lot.totalAmount),
  };
}

export type SaleHistoryRow = {
  id: string;
  title: string;
  subtitle: string;
  amountLabel: string;
};

export function buildSaleHistoryRow(sale: GoldSellTransaction, lot: GoldLot | null, brandName: string, t: Translate): SaleHistoryRow {
  const weightLabel = lot ? formatGoldWeight(lot.quantity, lot.unit, t) : '';
  return {
    id: sale.id,
    title: `${t('goldSaleLabel')} ${brandName}`,
    subtitle: `${sale.saleDate} · ${weightLabel}`,
    amountLabel: formatVnd(sale.totalAmount),
  };
}
