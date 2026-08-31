// src/core/application/finance/confirm-recurring-occurrence.ts
import {
  RecurringOccurrenceProcessing,
  RecurringOccurrenceProcessingResult,
  RecurringOccurrenceRepository,
  RecurringScheduleRepository,
} from '@/core/application/ports/recurring-repositories';
import { RecurringOccurrenceEdits } from '@/core/domain/finance/recurring-occurrence';

export type ConfirmRecurringOccurrenceDeps = {
  processing: RecurringOccurrenceProcessing;
  occurrenceRepository: RecurringOccurrenceRepository;
  scheduleRepository: RecurringScheduleRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

/** Confirms a pending/overdue occurrence into a real transaction and generates the next period (spec §Xử lý kỳ dự kiến). */
export class ConfirmRecurringOccurrence {
  constructor(private readonly deps: ConfirmRecurringOccurrenceDeps) {}

  async execute(
    occurrenceId: string,
    edits: RecurringOccurrenceEdits,
    applyScope: 'this_only' | 'this_and_future',
  ): Promise<RecurringOccurrenceProcessingResult & { transactionId: string }> {
    const occurrence = await this.deps.occurrenceRepository.findById(occurrenceId);
    if (!occurrence) {
      throw new Error(`Recurring occurrence ${occurrenceId} not found`);
    }
    const schedule = await this.deps.scheduleRepository.findById(occurrence.scheduleId);
    if (!schedule) {
      throw new Error(`Recurring schedule ${occurrence.scheduleId} not found`);
    }

    const willGenerateNext = schedule.status === 'active';
    const now = this.deps.now();

    return this.deps.processing.confirmOccurrence({
      occurrenceId,
      edits,
      applyScope,
      originDeviceId: this.deps.deviceId,
      now,
      transactionId: this.deps.generateId(),
      transactionOperationId: this.deps.generateId(),
      occurrenceOperationId: this.deps.generateId(),
      scheduleOperationId: this.deps.generateId(),
      nextOccurrenceId: willGenerateNext ? this.deps.generateId() : null,
      nextOccurrenceOperationId: willGenerateNext ? this.deps.generateId() : null,
    });
  }
}
