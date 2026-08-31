// src/features/finance/view-models/recurring-presentation.ts
import { formatVnd } from '@/core/domain/finance/money';
import { RecurringFrequency } from '@/core/domain/finance/recurring-date';
import {
  deriveOccurrenceDisplayStatus,
  RecurringOccurrence,
  RecurringOccurrenceDisplayStatus,
} from '@/core/domain/finance/recurring-occurrence';
import type { Translate, TranslationKey } from '@/i18n/translations';

import { formatDateLabel } from './transaction-presentation';

const FREQUENCY_KEYS: Record<RecurringFrequency, TranslationKey> = {
  weekly: 'recurringFrequencyWeekly',
  monthly: 'recurringFrequencyMonthly',
  quarterly: 'recurringFrequencyQuarterly',
  yearly: 'recurringFrequencyYearly',
};

export function formatFrequencyLabel(frequency: RecurringFrequency, t: Translate): string {
  return t(FREQUENCY_KEYS[frequency]);
}

export type RecurringOccurrenceListItem = {
  id: string;
  displayName: string;
  amountLabel: string;
  scheduledDateLabel: string;
  metaLabel: string;
  displayStatus: RecurringOccurrenceDisplayStatus;
};

/** Builds one row for the "Sắp tới / Quá hạn" list (spec §Cấu trúc màn hình → Kỳ sắp tới / Quá hạn). */
export function buildOccurrenceListItem(
  occurrence: RecurringOccurrence,
  today: string,
  t: Translate,
): RecurringOccurrenceListItem {
  const displayStatus = deriveOccurrenceDisplayStatus(occurrence, today);
  const statusLabel =
    displayStatus === 'overdue' ? t('recurringStatusOverdue') : t('recurringStatusUpcoming');

  return {
    id: occurrence.id,
    displayName: occurrence.displayName,
    amountLabel: formatVnd(occurrence.amount),
    scheduledDateLabel: formatDateLabel(occurrence.scheduledDate),
    metaLabel: `${statusLabel} · ${formatDateLabel(occurrence.scheduledDate)}`,
    displayStatus,
  };
}
