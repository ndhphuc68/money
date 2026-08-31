// tests/features/finance/recurring-presentation.test.ts
import {
  buildOccurrenceListItem,
  formatFrequencyLabel,
} from '@/features/finance/view-models/recurring-presentation';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { translate, Translate } from '@/i18n/translations';

const t: Translate = (key, params) => translate('en', key, params);

const baseOccurrence: RecurringOccurrence = {
  id: 'occurrence-1',
  scheduleId: 'schedule-1',
  scheduledDate: '2026-09-27',
  amount: 179000,
  accountId: 'account-main',
  categoryId: 'category-bills',
  displayName: 'YouTube Premium',
  note: null,
  status: 'pending',
  transactionId: null,
  notifiedAt: null,
  createdAt: '2026-08-27T09:00:00.000Z',
  updatedAt: '2026-08-27T09:00:00.000Z',
  deletedAt: null,
  revision: 1,
  originDeviceId: '550e8400-e29b-41d4-a716-446655440020',
};

describe('formatFrequencyLabel', () => {
  it('formats every frequency', () => {
    expect(formatFrequencyLabel('weekly', t)).toEqual(expect.any(String));
    expect(formatFrequencyLabel('monthly', t)).toEqual(expect.any(String));
    expect(formatFrequencyLabel('quarterly', t)).toEqual(expect.any(String));
    expect(formatFrequencyLabel('yearly', t)).toEqual(expect.any(String));
  });
});

describe('buildOccurrenceListItem', () => {
  it('labels a not-yet-due occurrence as pending', () => {
    const item = buildOccurrenceListItem(baseOccurrence, '2026-09-01', t);
    expect(item).toMatchObject({
      id: 'occurrence-1',
      displayName: 'YouTube Premium',
      displayStatus: 'pending',
    });
    expect(item.amountLabel).toContain('179');
  });

  it('labels a past-due pending occurrence as overdue', () => {
    const item = buildOccurrenceListItem(baseOccurrence, '2026-09-28', t);
    expect(item.displayStatus).toBe('overdue');
  });
});
