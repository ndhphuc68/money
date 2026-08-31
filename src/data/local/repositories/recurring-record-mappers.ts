// src/data/local/repositories/recurring-record-mappers.ts
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';
import { recurringOccurrences, recurringSchedules } from '@/data/local/schema';

type RecurringScheduleRow = typeof recurringSchedules.$inferSelect;
type RecurringOccurrenceRow = typeof recurringOccurrences.$inferSelect;

export function toRecurringScheduleEntity(row: RecurringScheduleRow): RecurringSchedule {
  return {
    id: row.id,
    displayName: row.displayName,
    type: row.type,
    accountId: row.accountId,
    categoryId: row.categoryId,
    amount: row.amount,
    frequency: row.frequency,
    anchorDay: row.anchorDay,
    startDate: row.startDate,
    endDate: row.endDate,
    occurrenceLimit: row.occurrenceLimit,
    remindDaysBefore: row.remindDaysBefore,
    status: row.status,
    firstTransactionId: row.firstTransactionId,
    note: row.note,
    generatedCount: row.generatedCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toRecurringScheduleRowValues(schedule: RecurringSchedule): RecurringScheduleRow {
  return {
    id: schedule.id,
    displayName: schedule.displayName,
    type: schedule.type,
    accountId: schedule.accountId,
    categoryId: schedule.categoryId,
    amount: schedule.amount,
    frequency: schedule.frequency,
    anchorDay: schedule.anchorDay,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    occurrenceLimit: schedule.occurrenceLimit,
    remindDaysBefore: schedule.remindDaysBefore,
    status: schedule.status,
    firstTransactionId: schedule.firstTransactionId,
    note: schedule.note,
    generatedCount: schedule.generatedCount,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
    deletedAt: schedule.deletedAt,
    revision: schedule.revision,
    originDeviceId: schedule.originDeviceId,
  };
}

export function toRecurringOccurrenceEntity(row: RecurringOccurrenceRow): RecurringOccurrence {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    scheduledDate: row.scheduledDate,
    amount: row.amount,
    accountId: row.accountId,
    categoryId: row.categoryId,
    displayName: row.displayName,
    note: row.note,
    status: row.status,
    transactionId: row.transactionId,
    notifiedAt: row.notifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    revision: row.revision,
    originDeviceId: row.originDeviceId,
  };
}

export function toRecurringOccurrenceRowValues(occurrence: RecurringOccurrence): RecurringOccurrenceRow {
  return {
    id: occurrence.id,
    scheduleId: occurrence.scheduleId,
    scheduledDate: occurrence.scheduledDate,
    amount: occurrence.amount,
    accountId: occurrence.accountId,
    categoryId: occurrence.categoryId,
    displayName: occurrence.displayName,
    note: occurrence.note,
    status: occurrence.status,
    transactionId: occurrence.transactionId,
    notifiedAt: occurrence.notifiedAt,
    createdAt: occurrence.createdAt,
    updatedAt: occurrence.updatedAt,
    deletedAt: occurrence.deletedAt,
    revision: occurrence.revision,
    originDeviceId: occurrence.originDeviceId,
  };
}
