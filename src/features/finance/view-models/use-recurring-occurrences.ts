// src/features/finance/view-models/use-recurring-occurrences.ts
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ConfirmRecurringOccurrence } from '@/core/application/finance/confirm-recurring-occurrence';
import type { GetRecurringOverview } from '@/core/application/finance/get-recurring-overview';
import type { SkipRecurringOccurrence } from '@/core/application/finance/skip-recurring-occurrence';
import { formatVnd } from '@/core/domain/finance/money';
import { RecurringOccurrence } from '@/core/domain/finance/recurring-occurrence';
import { RecurringSchedule } from '@/core/domain/finance/recurring-schedule';
import type { Translate } from '@/i18n/translations';

import {
  buildOccurrenceListItem,
  formatFrequencyLabel,
  RecurringOccurrenceListItem,
} from './recurring-presentation';
import { formatDateLabel, todayIsoDate } from './transaction-presentation';

export type RecurringOccurrencesDependencies = {
  getRecurringOverview: GetRecurringOverview;
  confirmRecurringOccurrence: ConfirmRecurringOccurrence;
  skipRecurringOccurrence: SkipRecurringOccurrence;
};

export type RecurringOccurrenceDetail = {
  id: string;
  displayName: string;
  amount: number;
  scheduledDateLabel: string;
  frequencyLabel: string;
  metaLabel: string;
};

export type RecurringOccurrencesViewModel = {
  loading: boolean;
  submitting: boolean;
  view: 'list' | 'detail' | 'scope' | 'success';
  items: RecurringOccurrenceListItem[];
  overdueCount: number;
  upcomingCount: number;
  selected: RecurringOccurrenceDetail | null;
  editedAmount: number | null;
  scopeDiffLabel: string | null;
  successSummary: { amountLabel: string; nextDateLabel: string | null } | null;
  error: string | null;
  openDetail(id: string): void;
  backToList(): void;
  setEditedAmount(amount: number | null): void;
  confirm(): Promise<void>;
  chooseScope(scope: 'this_only' | 'this_and_future'): Promise<void>;
  backToDetailFromScope(): void;
  skip(): Promise<void>;
};

export type UseRecurringOccurrencesOptions = {
  dependencies: RecurringOccurrencesDependencies;
  t: Translate;
  now?: () => Date;
};

export function useRecurringOccurrences({
  dependencies,
  t,
  now,
}: UseRecurringOccurrencesOptions): RecurringOccurrencesViewModel {
  const today = todayIsoDate(now?.() ?? new Date());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [occurrences, setOccurrences] = useState<RecurringOccurrence[]>([]);
  const [schedulesById, setSchedulesById] = useState<Map<string, RecurringSchedule>>(new Map());
  const [view, setView] = useState<'list' | 'detail' | 'scope' | 'success'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editedAmount, setEditedAmountState] = useState<number | null>(null);
  const [successSummary, setSuccessSummary] = useState<{
    amountLabel: string;
    nextDateLabel: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const overview = await dependencies.getRecurringOverview.execute();
    setOccurrences(overview.dueOccurrences);
    setSchedulesById(new Map(overview.schedules.map((schedule) => [schedule.id, schedule])));
    setLoading(false);
  }, [dependencies]);

  useEffect(() => {
    reload();
  }, [reload]);

  const items = useMemo(
    () => occurrences.map((occurrence) => buildOccurrenceListItem(occurrence, today, t)),
    [occurrences, today, t],
  );

  const overdueCount = useMemo(
    () => items.filter((item) => item.displayStatus === 'overdue').length,
    [items],
  );
  const upcomingCount = useMemo(
    () => items.filter((item) => item.displayStatus !== 'overdue').length,
    [items],
  );

  const selectedOccurrence = occurrences.find((occurrence) => occurrence.id === selectedId) ?? null;
  const selectedSchedule = selectedOccurrence
    ? (schedulesById.get(selectedOccurrence.scheduleId) ?? null)
    : null;
  const selected: RecurringOccurrenceDetail | null =
    selectedOccurrence && selectedSchedule
      ? {
          id: selectedOccurrence.id,
          displayName: selectedOccurrence.displayName,
          amount: editedAmount ?? selectedOccurrence.amount,
          scheduledDateLabel: formatDateLabel(selectedOccurrence.scheduledDate),
          frequencyLabel: formatFrequencyLabel(selectedSchedule.frequency, t),
          metaLabel: `${formatDateLabel(selectedOccurrence.scheduledDate)} · ${formatFrequencyLabel(selectedSchedule.frequency, t)}`,
        }
      : null;

  const scopeDiffLabel =
    selectedOccurrence &&
    selectedSchedule &&
    editedAmount !== null &&
    editedAmount !== selectedSchedule.amount
      ? t('recurringScopeDiff', {
          diff: formatVnd(Math.abs(editedAmount - selectedSchedule.amount)),
        })
      : null;

  const openDetail = useCallback((id: string) => {
    setSelectedId(id);
    setEditedAmountState(null);
    setView('detail');
  }, []);

  const backToList = useCallback(() => {
    setSelectedId(null);
    setEditedAmountState(null);
    setView('list');
  }, []);

  const setEditedAmount = useCallback((amount: number | null) => setEditedAmountState(amount), []);

  const applyConfirm = useCallback(
    async (scope: 'this_only' | 'this_and_future') => {
      if (!selectedOccurrence) {
        return;
      }
      setSubmitting(true);
      try {
        const edits =
          editedAmount !== null && editedAmount !== selectedOccurrence.amount
            ? { amount: editedAmount }
            : {};
        const result = await dependencies.confirmRecurringOccurrence.execute(
          selectedOccurrence.id,
          edits,
          scope,
        );
        setSuccessSummary({
          amountLabel: formatVnd(result.occurrence.amount),
          nextDateLabel: result.nextOccurrence
            ? formatDateLabel(result.nextOccurrence.scheduledDate)
            : null,
        });
        setView('success');
        await reload();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t('transactionFormGenericError'));
      } finally {
        setSubmitting(false);
      }
    },
    [dependencies, editedAmount, reload, selectedOccurrence, t],
  );

  const confirm = useCallback(async () => {
    if (scopeDiffLabel) {
      setView('scope');
      return;
    }
    await applyConfirm('this_only');
  }, [applyConfirm, scopeDiffLabel]);

  const chooseScope = useCallback(
    async (scope: 'this_only' | 'this_and_future') => {
      await applyConfirm(scope);
    },
    [applyConfirm],
  );

  const backToDetailFromScope = useCallback(() => setView('detail'), []);

  const skip = useCallback(async () => {
    if (!selectedOccurrence) {
      return;
    }
    setSubmitting(true);
    try {
      await dependencies.skipRecurringOccurrence.execute(selectedOccurrence.id);
      backToList();
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('transactionFormGenericError'));
    } finally {
      setSubmitting(false);
    }
  }, [backToList, dependencies, reload, selectedOccurrence, t]);

  return {
    loading,
    submitting,
    view,
    items,
    overdueCount,
    upcomingCount,
    selected,
    editedAmount,
    scopeDiffLabel,
    successSummary,
    error,
    openDetail,
    backToList,
    setEditedAmount,
    confirm,
    chooseScope,
    backToDetailFromScope,
    skip,
  };
}
