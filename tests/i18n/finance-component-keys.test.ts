import { en } from '@/i18n/locales/en';
import { vi } from '@/i18n/locales/vi';

const componentKeys = [
  'balanceShow',
  'balanceHide',
  'filterAll',
  'filterIncome',
  'filterExpense',
  'filterTransfer',
  'filterPreviousMonth',
  'filterNextMonth',
  'filterMonth',
  'filterCategory',
  'filterAccount',
  'filterSearchLabel',
  'filterSearchPlaceholder',
  'amountInvalid',
  'amountPlaceholder',
  'dateTransactionLabel',
  'undoAction',
] as const;

describe('finance component translations', () => {
  it.each(componentKeys)('defines %s in every locale', (key) => {
    expect(en[key]).toEqual(expect.any(String));
    expect(vi[key]).toEqual(expect.any(String));
  });
});
