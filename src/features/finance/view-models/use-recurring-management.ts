// src/features/finance/view-models/use-recurring-management.ts
import { useCallback, useEffect, useState } from 'react';

import type { EndRecurringSchedule, PauseRecurringSchedule, ResumeRecurringSchedule, UpdateRecurringSchedule } from '@/core/application/finance/manage-recurring-schedule';
import type { GetRecurringOverview } from '@/core/application/finance/get-recurring-overview';
import type { RecurringOccurrenceRepository } from '@/core/application/ports/recurring-repositories';
import { formatVnd } from '@/core/domain/finance/money';
import { RecurringSchedule, RecurringScheduleStatus } from '@/core/domain/finance/recurring-schedule';
import type { Translate, TranslationKey } from '@/i18n/translations';

import { formatFrequencyLabel } from './recurring-presentation';
import { formatDateLabel } from './transaction-presentation';

export type RecurringManagementDependencies = {
  getRecurringOverview: GetRecurringOverview;
  occurrenceRepository: Pick<RecurringOccurrenceRepository, 'listByScheduleId'>;
  pauseRecurringSchedule: PauseRecurringSchedule;
  resumeRecurringSchedule: ResumeRecurringSchedule;
  endRecurringSchedule: EndRecurringSchedule;
  updateRecurringSchedule: UpdateRecurringSchedule;
};

export type RecurringScheduleListItem = {
  id: string;
  displayName: string;
  amountLabel: string;
  frequencyLabel: string;
  status: RecurringScheduleStatus;
  statusLabel: string;
};

export type RecurringScheduleDetail = {
  id: string;
  displayName: string;
  amount: number;
  frequencyLabel: string;
  status: RecurringScheduleStatus;
  statusLabel: string;
  history: { id: string; scheduledDateLabel: string; amountLabel: string; statusLabel: string }[];
};

export type RecurringManagementViewModel = {
  loading: boolean;
  submitting: boolean;
  items: RecurringScheduleListItem[];
  selected: RecurringScheduleDetail | null;
  openDetail(id: string): Promise<void>;
  closeDetail(): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  end(): Promise<void>;
  updateAmount(amount: number): Promise<void>;
};

const STATUS_KEYS: Record<RecurringScheduleStatus, TranslationKey> = {
  active: 'recurringScheduleStatusActive',
  paused: 'recurringScheduleStatusPaused',
  ended: 'recurringScheduleStatusEnded',
};

function toListItem(schedule: RecurringSchedule, t: Translate): RecurringScheduleListItem {
  return {
    id: schedule.id,
    displayName: schedule.displayName,
    amountLabel: formatVnd(schedule.amount),
    frequencyLabel: formatFrequencyLabel(schedule.frequency, t),
    status: schedule.status,
    statusLabel: t(STATUS_KEYS[schedule.status]),
  };
}

export function useRecurringManagement({
  dependencies,
  t,
}: {
  dependencies: RecurringManagementDependencies;
  t: Translate;
}): RecurringManagementViewModel {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<RecurringScheduleDetail['history']>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    const overview = await dependencies.getRecurringOverview.execute();
    setSchedules(overview.schedules);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies]);

  useEffect(() => {
    reload();
  }, [reload]);

  const items = schedules.map((schedule) => toListItem(schedule, t));
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedId) ?? null;
  const selected: RecurringScheduleDetail | null = selectedSchedule
    ? {
        id: selectedSchedule.id,
        displayName: selectedSchedule.displayName,
        amount: selectedSchedule.amount,
        frequencyLabel: formatFrequencyLabel(selectedSchedule.frequency, t),
        status: selectedSchedule.status,
        statusLabel: t(STATUS_KEYS[selectedSchedule.status]),
        history,
      }
    : null;

  const openDetail = useCallback(
    async (id: string) => {
      setSelectedId(id);
      const occurrences = await dependencies.occurrenceRepository.listByScheduleId(id);
      setHistory(
        occurrences
          .filter((occurrence) => occurrence.status === 'confirmed' || occurrence.status === 'skipped')
          .map((occurrence) => ({
            id: occurrence.id,
            scheduledDateLabel: formatDateLabel(occurrence.scheduledDate),
            amountLabel: formatVnd(occurrence.amount),
            statusLabel: t(occurrence.status === 'confirmed' ? 'recurringStatusConfirmed' : 'recurringStatusSkipped'),
          })),
      );
    },
    [dependencies, t],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setHistory([]);
  }, []);

  const pause = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await dependencies.pauseRecurringSchedule.execute(selectedId);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }, [dependencies, reload, selectedId]);

  const resume = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await dependencies.resumeRecurringSchedule.execute(selectedId);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }, [dependencies, reload, selectedId]);

  const end = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await dependencies.endRecurringSchedule.execute(selectedId);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }, [dependencies, reload, selectedId]);

  const updateAmount = useCallback(
    async (amount: number) => {
      if (!selectedId) return;
      setSubmitting(true);
      try {
        await dependencies.updateRecurringSchedule.execute(selectedId, { amount });
        await reload();
      } finally {
        setSubmitting(false);
      }
    },
    [dependencies, reload, selectedId],
  );

  return { loading, submitting, items, selected, openDetail, closeDetail, pause, resume, end, updateAmount };
}
