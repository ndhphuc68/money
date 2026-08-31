// src/core/application/finance/skip-recurring-occurrence.ts
import {
  RecurringOccurrenceProcessing,
  RecurringOccurrenceProcessingResult,
  RecurringOccurrenceRepository,
} from '@/core/application/ports/recurring-repositories';

export type SkipRecurringOccurrenceDeps = {
  processing: RecurringOccurrenceProcessing;
  occurrenceRepository: RecurringOccurrenceRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

/** Skips a pending/overdue occurrence without affecting the balance, and generates the next period (spec §Xử lý kỳ dự kiến). */
export class SkipRecurringOccurrence {
  constructor(private readonly deps: SkipRecurringOccurrenceDeps) {}

  async execute(occurrenceId: string): Promise<RecurringOccurrenceProcessingResult> {
    const occurrence = await this.deps.occurrenceRepository.findById(occurrenceId);
    if (!occurrence) {
      throw new Error(`Recurring occurrence ${occurrenceId} not found`);
    }

    return this.deps.processing.skipOccurrence({
      occurrenceId,
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
      occurrenceOperationId: this.deps.generateId(),
      scheduleOperationId: this.deps.generateId(),
      nextOccurrenceId: this.deps.generateId(),
      nextOccurrenceOperationId: this.deps.generateId(),
    });
  }
}
