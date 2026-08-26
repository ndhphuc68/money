import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ChevronRight, ListChecks } from 'lucide-react-native';
import { useState } from 'react';

import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import type { TransactionType } from '@/core/domain/finance/transaction';
import { colors, radius, shadows, spacing, typography } from '@/theme';

import { AccountPicker } from './AccountPicker';
import { CategoryPicker } from './CategoryPicker';

export type TransactionTypeFilter = 'all' | TransactionType;

const TYPE_OPTIONS: readonly TransactionTypeFilter[] = ['all', 'income', 'expense', 'transfer'];
type FilterBarProps = {
  compact?: boolean;
  month: string;
  onMonthChange: (month: string) => void;
  type: TransactionTypeFilter;
  onTypeChange: (type: TransactionTypeFilter) => void;
  categories: readonly Category[];
  categoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  accounts: readonly Account[];
  accountId: string | null;
  onAccountChange: (id: string | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
  labels: {
    all: string;
    income: string;
    expense: string;
    transfer: string;
    previousMonth: string;
    nextMonth: string;
    month: string;
    category: string;
    account: string;
    searchLabel: string;
    searchPlaceholder: string;
    advanced?: string;
  };
};

function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const next = new Date(year, monthIndex - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(month: string, monthLabel: string): string {
  const [year, monthIndex] = month.split('-');
  return `${monthLabel} ${Number(monthIndex)}/${year}`;
}

export function FilterBar({
  month,
  onMonthChange,
  type,
  onTypeChange,
  categories,
  categoryId,
  onCategoryChange,
  accounts,
  accountId,
  onAccountChange,
  search,
  onSearchChange,
  labels,
  compact = false,
}: FilterBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const typeLabels: Record<TransactionTypeFilter, string> = {
    all: labels.all,
    income: labels.income,
    expense: labels.expense,
    transfer: labels.transfer,
  };
  const categoryType = type === 'all' ? 'all' : type === 'income' ? 'income' : 'expense';
  const visibleOptions = compact ? TYPE_OPTIONS.filter((option) => option !== 'transfer') : TYPE_OPTIONS;

  return (
    <View style={compact ? styles.compactContainer : styles.container}>
      {!compact ? <View style={styles.monthRow}>
        <Pressable
          accessibilityLabel={labels.previousMonth}
          accessibilityRole="button"
          onPress={() => onMonthChange(shiftMonth(month, -1))}
          style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}
        >
          <ChevronLeft color={colors.content.primary} size={20} />
        </Pressable>
        <Text style={styles.monthLabel}>{formatMonth(month, labels.month)}</Text>
        <Pressable
          accessibilityLabel={labels.nextMonth}
          accessibilityRole="button"
          onPress={() => onMonthChange(shiftMonth(month, 1))}
          style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}
        >
          <ChevronRight color={colors.content.primary} size={20} />
        </Pressable>
      </View> : null}

      <View style={compact ? styles.compactTypeRow : styles.typeRow}>
        {visibleOptions.map((option) => {
          const active = option === type;
          return (
            <Pressable
              accessibilityLabel={typeLabels[option]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option}
              onPress={() => onTypeChange(option)}
              style={({ pressed }) => [styles.typeChip, compact && styles.compactTypeChip, active && styles.typeChipActive, pressed && !active && styles.typeChipPressed]}
            >
              <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{typeLabels[option]}</Text>
            </Pressable>
          );
        })}
      </View>

      {compact ? (
        <Pressable
          accessibilityLabel={labels.advanced ?? 'Bộ lọc nâng cao'}
          accessibilityRole="button"
          accessibilityState={{ expanded: advancedOpen }}
          onPress={() => setAdvancedOpen((open) => !open)}
          style={({ pressed }) => [styles.advancedToggle, pressed && styles.advancedTogglePressed]}
        >
          <ListChecks color={colors.content.muted} size={16} strokeWidth={2} />
          <Text style={styles.advancedToggleText}>{labels.advanced ?? 'Bộ lọc nâng cao'}</Text>
          <Text style={styles.advancedToggleValue}>{advancedOpen ? 'Ẩn' : 'Hiện'}</Text>
        </Pressable>
      ) : null}

      {(!compact || advancedOpen) && type !== 'transfer' ? (
        <CategoryPicker
          allLabel={labels.all}
          allowUnselect
          categories={categories}
          label={labels.category}
          onSelect={onCategoryChange}
          selectedId={categoryId}
          type={categoryType}
        />
      ) : null}

      {(!compact || advancedOpen) ? <AccountPicker
        allLabel={labels.all}
        allowUnselect
        accounts={accounts}
        label={labels.account}
        onSelect={onAccountChange}
        selectedId={accountId}
      /> : null}

      {(!compact || advancedOpen) ? <TextInput
        accessibilityLabel={labels.searchLabel}
        onChangeText={onSearchChange}
        placeholder={labels.searchPlaceholder}
        placeholderTextColor={colors.content.placeholder}
        style={styles.searchInput}
        value={search}
      /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    gap: spacing[3],
    padding: spacing[4],
  },
  compactContainer: {
    gap: spacing[2],
  },
  compactTypeRow: {
    backgroundColor: colors.surface.muted,
    borderRadius: 16,
    flexDirection: 'row',
    gap: spacing[1],
    minHeight: 44,
    padding: spacing[1],
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  monthButtonPressed: {
    backgroundColor: colors.border.subtle,
  },
  monthLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  monthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchInput: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  advancedToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 44,
    paddingHorizontal: spacing[1],
  },
  advancedTogglePressed: {
    opacity: 0.6,
  },
  advancedToggleText: {
    color: colors.content.muted,
    flex: 1,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  advancedToggleValue: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  typeChip: {
    backgroundColor: colors.surface.muted,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing[3],
  },
  compactTypeChip: {
    alignItems: 'center',
    flex: 1,
    minHeight: 32,
    paddingHorizontal: spacing[2],
  },
  typeChipActive: {
    backgroundColor: colors.content.primary,
  },
  typeChipPressed: {
    backgroundColor: colors.border.subtle,
  },
  typeChipText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  typeChipTextActive: {
    color: colors.content.inverse,
    fontWeight: typography.weights.bold,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
