import { en } from '@/i18n/locales/en';
import { vi } from '@/i18n/locales/vi';

const goldComponentKeys = [
  'goldUnitLuong',
  'goldUnitChi',
  'goldUnitPhan',
  'goldUnitGram',
  'goldSaleLabel',
  'goldOverviewTitle',
  'goldOverviewSubtitle',
  'goldQuantityLabel',
  'goldCostBasisLabel',
  'goldHistoryTitle',
  'goldTrashLabel',
  'goldAddTransactionTitle',
  'goldAddTransactionSubtitle',
  'goldBuyActionTitle',
  'goldBuyActionSubtitle',
  'goldSellActionTitle',
  'goldSellActionSubtitle',
  'goldBuyFormTitle',
  'goldSellFormTitle',
  'goldDateFieldLabel',
  'goldBrandFieldLabel',
  'goldSellPlaceLabel',
  'goldAddNewBrandOption',
  'goldLotFieldLabel',
  'goldQuantityFieldLabel',
  'goldUnitFieldLabel',
  'goldBuyTotalLabel',
  'goldSellTotalLabel',
  'goldSaveBuyLabel',
  'goldSaveSellLabel',
  'goldManageBrandsTitle',
  'goldManageBrandsSubtitle',
  'goldAddBrandLabel',
  'goldAddBrandPlaceholder',
  'goldSaveBrandLabel',
  'goldTrashSheetTitle',
  'goldTrashSheetSubtitle',
  'goldRestoreLabel',
  'goldPurgeConfirmMessage',
  'goldTrashBlockedMessage',
] as const;

describe('gold component translations', () => {
  it.each(goldComponentKeys)('defines %s in every locale', (key) => {
    expect(en[key]).toEqual(expect.any(String));
    expect(vi[key]).toEqual(expect.any(String));
  });
});
