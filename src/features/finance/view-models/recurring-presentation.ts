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

export function resolveCategoryMeta(
  name: string = '',
  category?: { color?: string; name?: string } | null,
): { initials: string; bg: string } {
  if (category?.color) {
    const initials = (category.name || name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');
    return { initials: initials || 'DM', bg: category.color };
  }
  const lower = name.toLowerCase();
  if (/an uong|food|nha hang|quan|cafe|ca phe/.test(lower))
    return { initials: 'AU', bg: '#F59E0B' };
  if (/mua sam|shopping|shopee/.test(lower)) return { initials: 'MS', bg: '#EC4899' };
  if (/di chuyen|transport|grab|xang/.test(lower)) return { initials: 'DC', bg: '#14B8A6' };
  return { initials: 'HĐ', bg: '#2F6FED' };
}

export type RecurringOccurrenceListItem = {
  id: string;
  displayName: string;
  amountLabel: string;
  scheduledDateLabel: string;
  metaLabel: string;
  displayStatus: RecurringOccurrenceDisplayStatus;
  categoryInitials: string;
  categoryBg: string;
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
  const meta = resolveCategoryMeta(occurrence.displayName);

  return {
    id: occurrence.id,
    displayName: occurrence.displayName,
    amountLabel: formatVnd(occurrence.amount),
    scheduledDateLabel: formatDateLabel(occurrence.scheduledDate),
    metaLabel: `${statusLabel} · ${formatDateLabel(occurrence.scheduledDate)}`,
    displayStatus,
    categoryInitials: meta.initials,
    categoryBg: meta.bg,
  };
}
