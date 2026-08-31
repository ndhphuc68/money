// tests/features/finance/use-recurring-occurrences.test.ts
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useRecurringOccurrences } from '@/features/finance/view-models/use-recurring-occurrences';
import { translate, Translate } from '@/i18n/translations';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';

const t: Translate = (key, params) => translate('en', key, params);

const schedule: RecurringSchedule = {
  id: 'schedule-1',
  displayName: 'YouTube Premium',
  type: 'expense',
  accountId: 'account-main',
  categoryId: 'category-bills',
  amount: 179000,
  frequency: 'monthly',
  anchorDay: 27,
  startDate: '2026-08-27',
  endDate: null,
  occurrenceLimit: null,
  remindDaysBefore: 1,
  status: 'active',
  firstTransactionId: 'transaction-first',
  note: null,
  generatedCount: 1,
  createdAt: '2026-08-27T09:00:00.000Z',
  updatedAt: '2026-08-27T09:00:00.000Z',
  deletedAt: null,
  revision: 1,
  originDeviceId: '550e8400-e29b-41d4-a716-446655440020',
};

const occurrence: RecurringOccurrence = {
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

function buildDependencies(overrides?: { confirmResult?: unknown }) {
  return {
    getRecurringOverview: {
      execute: jest.fn().mockResolvedValue({ dueOccurrences: [occurrence], schedules: [schedule] }),
    },
    confirmRecurringOccurrence: {
      execute: jest.fn().mockResolvedValue(
        overrides?.confirmResult ?? {
          transactionId: 'transaction-2',
          occurrence: { ...occurrence, status: 'confirmed' },
          schedule,
          nextOccurrence: { ...occurrence, id: 'occurrence-2', scheduledDate: '2026-10-27' },
        },
      ),
    },
    skipRecurringOccurrence: {
      execute: jest.fn().mockResolvedValue({
        occurrence: { ...occurrence, status: 'skipped' },
        schedule,
        nextOccurrence: { ...occurrence, id: 'occurrence-2', scheduledDate: '2026-10-27' },
      }),
    },
  } as const;
}

describe('useRecurringOccurrences', () => {
  it('loads due occurrences into the list view', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() =>
      useRecurringOccurrences({ dependencies: dependencies as never, t }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.view).toBe('list');
  });

  it('opens detail for a selected occurrence', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() =>
      useRecurringOccurrences({ dependencies: dependencies as never, t }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.openDetail('occurrence-1'));

    expect(result.current.view).toBe('detail');
    expect(result.current.selected).toMatchObject({
      id: 'occurrence-1',
      displayName: 'YouTube Premium',
    });
  });

  it('confirms directly to success when the amount was not edited', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() =>
      useRecurringOccurrences({ dependencies: dependencies as never, t }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openDetail('occurrence-1'));

    await act(async () => {
      await result.current.confirm();
    });

    expect(dependencies.confirmRecurringOccurrence.execute).toHaveBeenCalledWith(
      'occurrence-1',
      {},
      'this_only',
    );
    expect(result.current.view).toBe('success');
  });

  it('routes to the scope screen when the edited amount differs from the schedule default', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() =>
      useRecurringOccurrences({ dependencies: dependencies as never, t }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openDetail('occurrence-1'));
    act(() => result.current.setEditedAmount(189000));

    await act(async () => {
      await result.current.confirm();
    });

    expect(dependencies.confirmRecurringOccurrence.execute).not.toHaveBeenCalled();
    expect(result.current.view).toBe('scope');

    await act(async () => {
      await result.current.chooseScope('this_and_future');
    });

    expect(dependencies.confirmRecurringOccurrence.execute).toHaveBeenCalledWith(
      'occurrence-1',
      { amount: 189000 },
      'this_and_future',
    );
    expect(result.current.view).toBe('success');
  });

  it('skips an occurrence and returns to the list', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() =>
      useRecurringOccurrences({ dependencies: dependencies as never, t }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openDetail('occurrence-1'));

    await act(async () => {
      await result.current.skip();
    });

    expect(dependencies.skipRecurringOccurrence.execute).toHaveBeenCalledWith('occurrence-1');
    expect(result.current.view).toBe('list');
  });
});
