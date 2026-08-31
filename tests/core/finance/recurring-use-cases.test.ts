// tests/core/finance/recurring-use-cases.test.ts
jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => {
      const base = '550e8400-e29b-41d4-a716-44665544';
      return base + String(counter++).padStart(4, '0');
    }),
  };
});

import { randomUUID } from 'expo-crypto';

import { ConfirmRecurringOccurrence } from '@/core/application/finance/confirm-recurring-occurrence';
import { CreateRecurringExpense } from '@/core/application/finance/create-recurring-expense';
import { SkipRecurringOccurrence } from '@/core/application/finance/skip-recurring-occurrence';
import {
  EndRecurringSchedule,
  PauseRecurringSchedule,
  ResumeRecurringSchedule,
  UpdateRecurringSchedule,
} from '@/core/application/finance/manage-recurring-schedule';
import { GetRecurringOverview } from '@/core/application/finance/get-recurring-overview';
import { ScanAndScheduleRecurringNotifications } from '@/core/application/finance/sync-recurring-notifications';
import { NotificationScheduler } from '@/core/application/ports/notification-scheduler';
import { LocalDatabaseClient, openTestLocalDatabase } from '@/data/local/db/client';
import { accounts, categories } from '@/data/local/schema';
import { RecurringOccurrenceProcessingRepository } from '@/data/local/repositories/recurring-occurrence-processing-repository';
import { RecurringOccurrenceRepository } from '@/data/local/repositories/recurring-occurrence-repository';
import { RecurringScheduleRepository } from '@/data/local/repositories/recurring-schedule-repository';

const deviceId = '550e8400-e29b-41d4-a716-446655440030';

class FakeNotificationScheduler implements NotificationScheduler {
  scheduled: { id: string; title: string; body: string; fireDate: Date }[] = [];
  async requestPermissions(): Promise<boolean> {
    return true;
  }
  async scheduleAt(params: {
    id: string;
    title: string;
    body: string;
    fireDate: Date;
  }): Promise<void> {
    this.scheduled.push(params);
  }
}

describe('recurring expense use cases', () => {
  let database: LocalDatabaseClient;
  let processing: RecurringOccurrenceProcessingRepository;
  let occurrenceRepository: RecurringOccurrenceRepository;
  let scheduleRepository: RecurringScheduleRepository;
  let now: () => string;
  let generateId: () => string;

  beforeEach(async () => {
    database = await openTestLocalDatabase();
    const seedNow = '2026-08-27T09:00:00.000Z';
    database.db
      .insert(accounts)
      .values({
        id: 'account-main',
        name: 'Ví chính',
        type: 'cash',
        openingBalance: 0,
        isArchived: false,
        createdAt: seedNow,
        updatedAt: seedNow,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();
    database.db
      .insert(categories)
      .values({
        id: 'category-bills',
        name: 'Hóa đơn',
        type: 'expense',
        isArchived: false,
        createdAt: seedNow,
        updatedAt: seedNow,
        deletedAt: null,
        revision: 1,
        originDeviceId: deviceId,
      })
      .run();

    processing = new RecurringOccurrenceProcessingRepository(database);
    occurrenceRepository = new RecurringOccurrenceRepository(database);
    scheduleRepository = new RecurringScheduleRepository(database);
    now = () => '2026-08-27T09:00:00.000Z';
    generateId = () => randomUUID();
  });

  afterEach(async () => {
    await database.close();
  });

  describe('CreateRecurringExpense', () => {
    it('creates the first transaction, the schedule and one pending occurrence', async () => {
      const createRecurringExpense = new CreateRecurringExpense({
        processing,
        now,
        deviceId,
        generateId,
      });

      const result = await createRecurringExpense.execute({
        transaction: {
          amount: 179000,
          accountId: 'account-main',
          categoryId: 'category-bills',
          date: '2026-08-27',
          name: 'YouTube Premium',
          note: null,
        },
        recurring: {
          displayName: 'YouTube Premium',
          accountId: 'account-main',
          categoryId: 'category-bills',
          amount: 179000,
          frequency: 'monthly',
          startDate: '2026-08-27',
        },
      });

      expect(result.schedule).toMatchObject({
        status: 'active',
        frequency: 'monthly',
        anchorDay: 27,
        generatedCount: 1,
      });
      expect(result.occurrence).toMatchObject({ status: 'pending', scheduledDate: '2026-09-27' });
      await expect(
        occurrenceRepository.findActiveByScheduleId(result.schedule.id),
      ).resolves.toMatchObject({ id: result.occurrence.id });
    });
  });

  describe('ConfirmRecurringOccurrence and SkipRecurringOccurrence', () => {
    async function seedSchedule() {
      const createRecurringExpense = new CreateRecurringExpense({
        processing,
        now,
        deviceId,
        generateId,
      });
      return createRecurringExpense.execute({
        transaction: {
          amount: 179000,
          accountId: 'account-main',
          categoryId: 'category-bills',
          date: '2026-08-27',
          name: 'YouTube Premium',
          note: null,
        },
        recurring: {
          displayName: 'YouTube Premium',
          accountId: 'account-main',
          categoryId: 'category-bills',
          amount: 179000,
          frequency: 'monthly',
          startDate: '2026-08-27',
        },
      });
    }

    it('confirms the pending occurrence and generates exactly one next occurrence', async () => {
      const { occurrence } = await seedSchedule();
      const confirmRecurringOccurrence = new ConfirmRecurringOccurrence({
        processing,
        occurrenceRepository,
        scheduleRepository,
        now: () => '2026-09-27T08:00:00.000Z',
        deviceId,
        generateId,
      });

      const result = await confirmRecurringOccurrence.execute(occurrence.id, {}, 'this_only');

      expect(result.occurrence).toMatchObject({ status: 'confirmed' });
      expect(result.nextOccurrence).toMatchObject({
        status: 'pending',
        scheduledDate: '2026-10-27',
      });
      await expect(occurrenceRepository.listByStatus(['pending'])).resolves.toHaveLength(1);
    });

    it('rejects confirming an already-confirmed occurrence', async () => {
      const { occurrence } = await seedSchedule();
      const confirmRecurringOccurrence = new ConfirmRecurringOccurrence({
        processing,
        occurrenceRepository,
        scheduleRepository,
        now: () => '2026-09-27T08:00:00.000Z',
        deviceId,
        generateId,
      });
      await confirmRecurringOccurrence.execute(occurrence.id, {}, 'this_only');

      await expect(
        confirmRecurringOccurrence.execute(occurrence.id, {}, 'this_only'),
      ).rejects.toThrow(`Recurring occurrence ${occurrence.id} is not pending`);
    });

    it('skips the pending occurrence and generates exactly one next occurrence', async () => {
      const { occurrence } = await seedSchedule();
      const skipRecurringOccurrence = new SkipRecurringOccurrence({
        processing,
        occurrenceRepository,
        now: () => '2026-09-27T08:00:00.000Z',
        deviceId,
        generateId,
      });

      const result = await skipRecurringOccurrence.execute(occurrence.id);

      expect(result.occurrence).toMatchObject({ status: 'skipped', transactionId: null });
      expect(result.nextOccurrence).toMatchObject({
        status: 'pending',
        scheduledDate: '2026-10-27',
      });
    });
  });

  describe('manage recurring schedule use cases', () => {
    async function seedSchedule() {
      const createRecurringExpense = new CreateRecurringExpense({
        processing,
        now,
        deviceId,
        generateId,
      });
      return createRecurringExpense.execute({
        transaction: {
          amount: 179000,
          accountId: 'account-main',
          categoryId: 'category-bills',
          date: '2026-08-27',
          name: 'YouTube Premium',
          note: null,
        },
        recurring: {
          displayName: 'YouTube Premium',
          accountId: 'account-main',
          categoryId: 'category-bills',
          amount: 179000,
          frequency: 'monthly',
          startDate: '2026-08-27',
        },
      });
    }

    it('pauses then resumes a schedule', async () => {
      const { schedule } = await seedSchedule();
      const pause = new PauseRecurringSchedule({ scheduleRepository, now, deviceId, generateId });
      const resume = new ResumeRecurringSchedule({ scheduleRepository, now, deviceId, generateId });

      await expect(pause.execute(schedule.id)).resolves.toMatchObject({ status: 'paused' });
      await expect(resume.execute(schedule.id)).resolves.toMatchObject({ status: 'active' });
    });

    it('ends a schedule', async () => {
      const { schedule } = await seedSchedule();
      const end = new EndRecurringSchedule({ scheduleRepository, now, deviceId, generateId });

      await expect(end.execute(schedule.id)).resolves.toMatchObject({ status: 'ended' });
    });

    it('updates a schedule default and refreshes its current unresolved occurrence', async () => {
      const { schedule, occurrence } = await seedSchedule();
      const update = new UpdateRecurringSchedule({
        scheduleRepository,
        occurrenceRepository,
        now,
        deviceId,
        generateId,
      });

      const updated = await update.execute(schedule.id, { amount: 199000 });

      expect(updated).toMatchObject({ amount: 199000 });
      await expect(occurrenceRepository.findById(occurrence.id)).resolves.toMatchObject({
        amount: 199000,
      });
    });

    it('GetRecurringOverview lists pending occurrences and all schedules', async () => {
      const { schedule, occurrence } = await seedSchedule();
      const getRecurringOverview = new GetRecurringOverview({
        scheduleRepository,
        occurrenceRepository,
      });

      const overview = await getRecurringOverview.execute();

      expect(overview.schedules).toEqual([schedule]);
      expect(overview.dueOccurrences).toEqual([occurrence]);
    });
  });

  describe('ScanAndScheduleRecurringNotifications', () => {
    it('schedules a future reminder for a not-yet-due occurrence and marks it notified', async () => {
      const { occurrence } = await (async () => {
        const createRecurringExpense = new CreateRecurringExpense({
          processing,
          now,
          deviceId,
          generateId,
        });
        return createRecurringExpense.execute({
          transaction: {
            amount: 179000,
            accountId: 'account-main',
            categoryId: 'category-bills',
            date: '2026-08-27',
            name: 'YouTube Premium',
            note: null,
          },
          recurring: {
            displayName: 'YouTube Premium',
            accountId: 'account-main',
            categoryId: 'category-bills',
            amount: 179000,
            frequency: 'monthly',
            startDate: '2026-08-27',
            remindDaysBefore: 1,
          },
        });
      })();

      const notificationScheduler = new FakeNotificationScheduler();
      const scan = new ScanAndScheduleRecurringNotifications({
        occurrenceRepository,
        scheduleRepository,
        notificationScheduler,
        now: () => '2026-08-28T08:00:00.000Z',
        deviceId,
        generateId,
      });

      await scan.execute();

      expect(notificationScheduler.scheduled).toHaveLength(1);
      expect(notificationScheduler.scheduled[0]).toMatchObject({
        id: occurrence.id,
        body: 'YouTube Premium',
      });
      expect(notificationScheduler.scheduled[0].fireDate.toISOString().slice(0, 10)).toBe(
        '2026-09-26',
      );
      await expect(occurrenceRepository.findById(occurrence.id)).resolves.toMatchObject({
        notifiedAt: '2026-08-28T08:00:00.000Z',
      });
    });

    it('sends a catch-up reminder immediately when opening the app after the reminder date has passed', async () => {
      const { occurrence } = await (async () => {
        const createRecurringExpense = new CreateRecurringExpense({
          processing,
          now,
          deviceId,
          generateId,
        });
        return createRecurringExpense.execute({
          transaction: {
            amount: 179000,
            accountId: 'account-main',
            categoryId: 'category-bills',
            date: '2026-08-27',
            name: 'YouTube Premium',
            note: null,
          },
          recurring: {
            displayName: 'YouTube Premium',
            accountId: 'account-main',
            categoryId: 'category-bills',
            amount: 179000,
            frequency: 'monthly',
            startDate: '2026-08-27',
            remindDaysBefore: 1,
          },
        });
      })();

      const notificationScheduler = new FakeNotificationScheduler();
      const scan = new ScanAndScheduleRecurringNotifications({
        occurrenceRepository,
        scheduleRepository,
        notificationScheduler,
        now: () => '2026-09-30T08:00:00.000Z',
        deviceId,
        generateId,
      });

      await scan.execute();

      expect(notificationScheduler.scheduled).toHaveLength(1);
      expect(notificationScheduler.scheduled[0].id).toBe(occurrence.id);
    });

    it('never notifies the same occurrence twice', async () => {
      const { occurrence } = await (async () => {
        const createRecurringExpense = new CreateRecurringExpense({
          processing,
          now,
          deviceId,
          generateId,
        });
        return createRecurringExpense.execute({
          transaction: {
            amount: 179000,
            accountId: 'account-main',
            categoryId: 'category-bills',
            date: '2026-08-27',
            name: 'YouTube Premium',
            note: null,
          },
          recurring: {
            displayName: 'YouTube Premium',
            accountId: 'account-main',
            categoryId: 'category-bills',
            amount: 179000,
            frequency: 'monthly',
            startDate: '2026-08-27',
            remindDaysBefore: 1,
          },
        });
      })();

      const notificationScheduler = new FakeNotificationScheduler();
      const scan = new ScanAndScheduleRecurringNotifications({
        occurrenceRepository,
        scheduleRepository,
        notificationScheduler,
        now: () => '2026-09-30T08:00:00.000Z',
        deviceId,
        generateId,
      });

      await scan.execute();
      await scan.execute();

      expect(notificationScheduler.scheduled).toHaveLength(1);
      void occurrence;
    });
  });
});
