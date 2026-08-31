// src/core/application/finance/get-recurring-overview.ts
import {
  RecurringOccurrenceRepository,
  RecurringScheduleRepository,
} from '@/core/application/ports/recurring-repositories';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';

export type GetRecurringOverviewDeps = {
  scheduleRepository: RecurringScheduleRepository;
  occurrenceRepository: RecurringOccurrenceRepository;
};

export type RecurringOverview = {
  dueOccurrences: RecurringOccurrence[];
  schedules: RecurringSchedule[];
};

/** Reads backing the occurrence list and management list screens (spec §Cấu trúc màn hình). */
export class GetRecurringOverview {
  constructor(private readonly deps: GetRecurringOverviewDeps) {}

  async execute(): Promise<RecurringOverview> {
    const [dueOccurrences, schedules] = await Promise.all([
      this.deps.occurrenceRepository.listByStatus(['pending']),
      this.deps.scheduleRepository.list(),
    ]);
    return { dueOccurrences, schedules };
  }
}
