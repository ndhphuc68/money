// src/core/application/finance/create-recurring-expense.ts
import { RecurringOccurrenceProcessing } from '@/core/application/ports/recurring-repositories';
import { deriveAnchorDay } from '@/core/domain/finance/recurring-date';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import {
  RecurringSchedule,
  RecurringScheduleInput,
} from '@/core/domain/finance/recurring-schedule';
import { TransactionInput } from '@/core/domain/finance/transaction';

export type CreateRecurringExpenseDeps = {
  processing: RecurringOccurrenceProcessing;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export type CreateRecurringExpenseRequest = {
  /** Always an expense; `type` is fixed by this use case. */
  transaction: Omit<TransactionInput, 'type'>;
  /** `anchorDay` is derived from `startDate`/`frequency`, never supplied by the caller. */
  recurring: Omit<RecurringScheduleInput, 'anchorDay'>;
};

/** Creates period 1's real transaction, its schedule, and the first pending occurrence (spec §Tạo lịch từ form thêm chi tiêu). */
export class CreateRecurringExpense {
  constructor(private readonly deps: CreateRecurringExpenseDeps) {}

  async execute(
    request: CreateRecurringExpenseRequest,
  ): Promise<{ schedule: RecurringSchedule; occurrence: RecurringOccurrence }> {
    const now = this.deps.now();
    const anchorDay = deriveAnchorDay(request.recurring.startDate, request.recurring.frequency);

    return this.deps.processing.createFirstPeriod({
      originDeviceId: this.deps.deviceId,
      now,
      transactionId: this.deps.generateId(),
      transactionOperationId: this.deps.generateId(),
      transaction: { ...request.transaction, type: 'expense' },
      scheduleId: this.deps.generateId(),
      scheduleOperationId: this.deps.generateId(),
      schedule: { ...request.recurring, anchorDay },
      occurrenceId: this.deps.generateId(),
      occurrenceOperationId: this.deps.generateId(),
    });
  }
}
