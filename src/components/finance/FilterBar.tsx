import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import type { TransactionType } from '@/core/domain/finance/transaction';
import { colors, radius, shadows, spacing, typography } from '@/theme';

import { AccountPicker } from './AccountPicker';
import { CategoryPicker } from './CategoryPicker';

export type TransactionTypeFilter = 'all' | TransactionType;

const TYPE_OPTIONS: readonly TransactionTypeFilter[] = ['all', 'income', 'expense', 'transfer'];
type FilterBarProps = {
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
}: FilterBarProps) {
  const typeLabels: Record<TransactionTypeFilter, string> = {
    all: labels.all,
    income: labels.income,
    expense: labels.expense,
    transfer: labels.transfer,
  };
  const categoryType = type === 'all' ? 'all' : type === 'income' ? 'income' : 'expense';

  return (
    <View style={styles.container}>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityLabel={labels.previousMonth}
          accessibilityRole="button"
          onPress={() => onMonthChange(shiftMonth(month, -1))}
          style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}
        >
          <Text style={styles.monthButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{formatMonth(month, labels.month)}</Text>
        <Pressable
          accessibilityLabel={labels.nextMonth}
          accessibilityRole="button"
          onPress={() => onMonthChange(shiftMonth(month, 1))}
          style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}
        >
          <Text style={styles.monthButtonText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.typeRow}>
        {TYPE_OPTIONS.map((option) => {
          const active = option === type;
          return (
            <Pressable
              accessibilityLabel={typeLabels[option]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option}
              onPress={() => onTypeChange(option)}
              style={({ pressed }) => [styles.typeChip, active && styles.typeChipActive, pressed && !active && styles.typeChipPressed]}
            >
              <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{typeLabels[option]}</Text>
            </Pressable>
          );
        })}
      </View>

      {type !== 'transfer' ? (
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

      <AccountPicker
        allLabel={labels.all}
        allowUnselect
        accounts={accounts}
        label={labels.account}
        onSelect={onAccountChange}
        selectedId={accountId}
      />

      <TextInput
        accessibilityLabel={labels.searchLabel}
        onChangeText={onSearchChange}
        placeholder={labels.searchPlaceholder}
        placeholderTextColor={colors.content.placeholder}
        style={styles.searchInput}
        value={search}
      />
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
  monthButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
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
  typeChip: {
    backgroundColor: colors.surface.muted,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing[3],
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
