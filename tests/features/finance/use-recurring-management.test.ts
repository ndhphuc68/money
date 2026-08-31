// tests/features/finance/use-recurring-management.test.ts
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useRecurringManagement } from '@/features/finance/view-models/use-recurring-management';
import { translate, Translate } from '@/i18n/translations';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';

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
  generatedCount: 2,
  createdAt: '2026-08-27T09:00:00.000Z',
  updatedAt: '2026-08-27T09:00:00.000Z',
  deletedAt: null,
  revision: 1,
  originDeviceId: '550e8400-e29b-41d4-a716-446655440020',
};

const confirmedOccurrence: RecurringOccurrence = {
  id: 'occurrence-1',
  scheduleId: 'schedule-1',
  scheduledDate: '2026-09-27',
  amount: 179000,
  accountId: 'account-main',
  categoryId: 'category-bills',
  displayName: 'YouTube Premium',
  note: null,
  status: 'confirmed',
  transactionId: 'transaction-2',
  notifiedAt: null,
  createdAt: '2026-08-27T09:00:00.000Z',
  updatedAt: '2026-09-27T08:00:00.000Z',
  deletedAt: null,
  revision: 2,
  originDeviceId: '550e8400-e29b-41d4-a716-446655440020',
};

function buildDependencies() {
  return {
    getRecurringOverview: {
      execute: jest.fn().mockResolvedValue({ dueOccurrences: [], schedules: [schedule] }),
    },
    recurringOccurrenceRepository: {
      listByScheduleId: jest.fn().mockResolvedValue([confirmedOccurrence]),
    },
    pauseRecurringSchedule: {
      execute: jest.fn().mockResolvedValue({ ...schedule, status: 'paused' }),
    },
    resumeRecurringSchedule: {
      execute: jest.fn().mockResolvedValue({ ...schedule, status: 'active' }),
    },
    endRecurringSchedule: {
      execute: jest.fn().mockResolvedValue({ ...schedule, status: 'ended' }),
    },
    updateRecurringSchedule: {
      execute: jest.fn().mockResolvedValue({ ...schedule, amount: 199000 }),
    },
  } as const;
}

describe('useRecurringManagement', () => {
  it('lists every schedule', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() =>
      useRecurringManagement({ dependencies: dependencies as never, t }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({ id: 'schedule-1', status: 'active' });
  });

  it('opens a schedule detail with its confirmed/skipped history', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() =>
      useRecurringManagement({ dependencies: dependencies as never, t }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openDetail('schedule-1');
    });

    expect(result.current.selected).toMatchObject({
      id: 'schedule-1',
      displayName: 'YouTube Premium',
    });
    expect(result.current.selected?.history).toHaveLength(1);
  });

  it('pauses, resumes and ends the selected schedule', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() =>
      useRecurringManagement({ dependencies: dependencies as never, t }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.openDetail('schedule-1');
    });

    await act(async () => {
      await result.current.pause();
    });
    expect(dependencies.pauseRecurringSchedule.execute).toHaveBeenCalledWith('schedule-1');

    await act(async () => {
      await result.current.resume();
    });
    expect(dependencies.resumeRecurringSchedule.execute).toHaveBeenCalledWith('schedule-1');

    await act(async () => {
      await result.current.end();
    });
    expect(dependencies.endRecurringSchedule.execute).toHaveBeenCalledWith('schedule-1');
  });

  it('updates the selected schedule amount', async () => {
    const dependencies = buildDependencies();
    const { result } = renderHook(() =>
      useRecurringManagement({ dependencies: dependencies as never, t }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.openDetail('schedule-1');
    });

    await act(async () => {
      await result.current.updateAmount(199000);
    });

    expect(dependencies.updateRecurringSchedule.execute).toHaveBeenCalledWith('schedule-1', {
      amount: 199000,
    });
  });
});
