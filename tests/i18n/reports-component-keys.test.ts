import { en } from '@/i18n/locales/en';
import { vi } from '@/i18n/locales/vi';

const componentKeys = [
  'reportsTitle',
  'reportsIncomeLabel',
  'reportsExpenseLabel',
  'reportsNetLabel',
  'reportsCategoryTitle',
  'reportsCategoryEmpty',
  'reportsAccountTitle',
  'reportsAccountEmpty',
  'reportsPreviousPeriod',
  'reportsNextPeriod',
  'reportsPeriodWeek',
  'reportsPeriodMonth',
  'reportsPeriodQuarter',
  'reportsPeriodYear',
  'reportsPeriodCustom',
  'reportsPeriodClose',
  'reportsPeriodApply',
  'reportsCustomFromLabel',
  'reportsCustomToLabel',
  'reportsPeriodWeekLabel',
  'reportsPeriodMonthLabel',
  'reportsPeriodQuarterLabel',
  'reportsPeriodYearLabel',
  'reportsPeriodCustomLabel',
  'reportsComparisonTitle',
  'reportsTrendTitle',
] as const;

describe('reports component translations', () => {
  it.each(componentKeys)('defines %s in every locale', (key) => {
    expect(en[key]).toEqual(expect.any(String));
    expect(vi[key]).toEqual(expect.any(String));
  });
});
