// tests/i18n/recurring-component-keys.test.ts
import { en } from '@/i18n/locales/en';
import { vi } from '@/i18n/locales/vi';

const recurringKeys = [
  'settingsManageRecurring',
  'recurringManageAction',
  'recurringToggleLabel',
  'recurringToggleHintOn',
  'recurringToggleHintOff',
  'recurringFrequencyLabel',
  'recurringFrequencyWeekly',
  'recurringFrequencyMonthly',
  'recurringFrequencyQuarterly',
  'recurringFrequencyYearly',
  'recurringRemindDaysBeforeLabel',
  'recurringEndLabel',
  'recurringOccurrenceLimitLabel',
  'recurringFirstPeriodNote',
  'recurringStatusOverdue',
  'recurringStatusUpcoming',
  'recurringStatusConfirmed',
  'recurringStatusSkipped',
  'recurringListTitle',
  'recurringListSubtitle',
  'recurringListEmpty',
  'recurringDetailSubtitle',
  'recurringDetailAmountLabel',
  'recurringConfirmAction',
  'recurringSkipAction',
  'recurringScopeTitle',
  'recurringScopeOnlyThis',
  'recurringScopeOnlyThisHint',
  'recurringScopeFuture',
  'recurringScopeFutureHint',
  'recurringScopeBack',
  'recurringScopeDiff',
  'recurringSuccessTitle',
  'recurringSuccessBody',
  'recurringSuccessNoNext',
  'recurringSuccessAction',
  'recurringManagementTitle',
  'recurringManagementEmpty',
  'recurringScheduleStatusActive',
  'recurringScheduleStatusPaused',
  'recurringScheduleStatusEnded',
  'recurringPauseAction',
  'recurringResumeAction',
  'recurringEndAction',
  'recurringHistoryTitle',
  'recurringHistoryEmpty',
] as const;

describe('recurring expense component translations', () => {
  it.each(recurringKeys)('defines %s in every locale', (key) => {
    expect(en[key]).toEqual(expect.any(String));
    expect(vi[key]).toEqual(expect.any(String));
  });
});
