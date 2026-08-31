// src/core/application/finance/sync-recurring-notifications.ts
import { NotificationScheduler } from '@/core/application/ports/notification-scheduler';
import {
  RecurringOccurrenceRepository,
  RecurringScheduleRepository,
} from '@/core/application/ports/recurring-repositories';

export type ScanAndScheduleRecurringNotificationsDeps = {
  occurrenceRepository: RecurringOccurrenceRepository;
  scheduleRepository: RecurringScheduleRepository;
  notificationScheduler: NotificationScheduler;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

function subtractDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Runs on app open: schedules a reminder for every unnotified `pending`
 * occurrence, sending it immediately (catch-up) if its reminder date has
 * already passed, or scheduling it for later otherwise. Never re-notifies
 * an occurrence that already has `notifiedAt` set (spec §Thông báo).
 */
export class ScanAndScheduleRecurringNotifications {
  constructor(private readonly deps: ScanAndScheduleRecurringNotificationsDeps) {}

  async execute(): Promise<void> {
    const now = this.deps.now();
    const today = now.slice(0, 10);
    const pendingOccurrences = await this.deps.occurrenceRepository.listByStatus(['pending']);

    for (const occurrence of pendingOccurrences) {
      if (occurrence.notifiedAt !== null) {
        continue;
      }
      const schedule = await this.deps.scheduleRepository.findById(occurrence.scheduleId);
      if (!schedule) {
        continue;
      }

      const reminderDate = subtractDays(occurrence.scheduledDate, schedule.remindDaysBefore);
      const isDue = reminderDate <= today;

      const fireDate = isDue ? new Date(now) : new Date(`${reminderDate}T09:00:00.000Z`);
      await this.deps.notificationScheduler.scheduleAt({
        id: occurrence.id,
        title: 'Sắp đến hạn chi tiêu định kỳ',
        body: occurrence.displayName,
        fireDate,
      });
      await this.deps.occurrenceRepository.markNotified(occurrence.id, now, {
        originDeviceId: this.deps.deviceId,
        operationId: this.deps.generateId(),
        now,
      });
    }
  }
}
