// src/core/application/finance/manage-recurring-schedule.ts
import {
  RecurringOccurrenceRepository,
  RecurringScheduleRepository,
} from '@/core/application/ports/recurring-repositories';
import {
  RecurringSchedule,
  RecurringScheduleInput,
} from '@/core/domain/finance/recurring-schedule';

export type ManageRecurringScheduleDeps = {
  scheduleRepository: RecurringScheduleRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

function writeContext(deps: ManageRecurringScheduleDeps) {
  return { originDeviceId: deps.deviceId, operationId: deps.generateId(), now: deps.now() };
}

/** Stops generating new occurrences; the current unresolved one can still be confirmed/skipped (spec §Quản lý định kỳ). */
export class PauseRecurringSchedule {
  constructor(private readonly deps: ManageRecurringScheduleDeps) {}

  execute(id: string): Promise<RecurringSchedule> {
    return this.deps.scheduleRepository.update(id, { status: 'paused' }, writeContext(this.deps));
  }
}

/** Resumes generation for a paused schedule. */
export class ResumeRecurringSchedule {
  constructor(private readonly deps: ManageRecurringScheduleDeps) {}

  execute(id: string): Promise<RecurringSchedule> {
    return this.deps.scheduleRepository.update(id, { status: 'active' }, writeContext(this.deps));
  }
}

/** Permanently closes a schedule; never generates again, keeps past history (spec §Quản lý định kỳ). */
export class EndRecurringSchedule {
  constructor(private readonly deps: ManageRecurringScheduleDeps) {}

  execute(id: string): Promise<RecurringSchedule> {
    return this.deps.scheduleRepository.update(id, { status: 'ended' }, writeContext(this.deps));
  }
}

export type UpdateRecurringScheduleDeps = ManageRecurringScheduleDeps & {
  occurrenceRepository: RecurringOccurrenceRepository;
};

/**
 * Edits a schedule's defaults and, when it has a current unresolved
 * occurrence, refreshes that occurrence's copied fields to match — but
 * never touches already-confirmed past transactions (spec §Quản lý định kỳ).
 */
export class UpdateRecurringSchedule {
  constructor(private readonly deps: UpdateRecurringScheduleDeps) {}

  async execute(id: string, changes: Partial<RecurringScheduleInput>): Promise<RecurringSchedule> {
    const updated = await this.deps.scheduleRepository.update(id, changes, writeContext(this.deps));

    const activeOccurrence = await this.deps.occurrenceRepository.findActiveByScheduleId(id);
    if (activeOccurrence) {
      await this.deps.occurrenceRepository.update(
        activeOccurrence.id,
        {
          amount: updated.amount,
          accountId: updated.accountId,
          categoryId: updated.categoryId,
          displayName: updated.displayName,
          note: updated.note,
        },
        writeContext(this.deps),
      );
    }

    return updated;
  }
}
