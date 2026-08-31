// tests/infrastructure/expo/recurring-notification-scheduler.test.ts
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
}));

import * as Notifications from 'expo-notifications';

import { RecurringNotificationScheduler } from '@/infrastructure/expo/notifications/recurring-notification-scheduler';

describe('RecurringNotificationScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests permission and reports granted', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    const scheduler = new RecurringNotificationScheduler();

    await expect(scheduler.requestPermissions()).resolves.toBe(true);
  });

  it('reports not granted without throwing', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    const scheduler = new RecurringNotificationScheduler();

    await expect(scheduler.requestPermissions()).resolves.toBe(false);
  });

  it('schedules a notification with the given id, title, body and fire date', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('ignored');
    const scheduler = new RecurringNotificationScheduler();
    const fireDate = new Date('2026-09-26T09:00:00.000Z');

    await scheduler.scheduleAt({
      id: 'occurrence-1',
      title: 'Sắp đến hạn',
      body: 'YouTube Premium',
      fireDate,
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'occurrence-1',
      content: { title: 'Sắp đến hạn', body: 'YouTube Premium' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
  });
});
