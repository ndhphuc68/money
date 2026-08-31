// src/infrastructure/expo/notifications/recurring-notification-scheduler.ts
import * as Notifications from 'expo-notifications';

import { NotificationScheduler } from '@/core/application/ports/notification-scheduler';

export class RecurringNotificationScheduler implements NotificationScheduler {
  async requestPermissions(): Promise<boolean> {
    const result = await Notifications.requestPermissionsAsync();
    return result.granted === true;
  }

  async scheduleAt(params: { id: string; title: string; body: string; fireDate: Date }): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      identifier: params.id,
      content: { title: params.title, body: params.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: params.fireDate,
      },
    });
  }
}
