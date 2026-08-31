// src/core/application/ports/notification-scheduler.ts
export interface NotificationScheduler {
  /** Resolves `true` once the user has granted local-notification permission. */
  requestPermissions(): Promise<boolean>;
  /** Schedules (or replaces, if `id` was already used) a one-off local notification. */
  scheduleAt(params: { id: string; title: string; body: string; fireDate: Date }): Promise<void>;
}
