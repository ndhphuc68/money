import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';

import { Card, PrimaryButton, Sheet } from '@/components/base';
import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import type { TransactionType } from '@/core/domain/finance/transaction';
import { colors, radius, spacing, typography } from '@/theme';

import { AccountPicker } from './AccountPicker';
import { CategoryPicker } from './CategoryPicker';

export type TransactionTypeFilter = 'all' | TransactionType;

const TYPE_OPTIONS: readonly TransactionTypeFilter[] = ['all', 'income', 'expense', 'transfer'];

type FilterBarProps = {
  compact?: boolean;
  /** Compact mode only: show the month prev/next navigator. Defaults to true. */
  showMonthNav?: boolean;
  month: string;
  onMonthChange: (month: string) => void;
  type: TransactionTypeFilter;
  onTypeChange: (type: TransactionTypeFilter) => void;
  categories: readonly Category[];
  categoryId: string | null;
  categoryIds?: readonly string[];
  onCategoryChange: (id: string | null | string[]) => void;
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
  categoryIds,
  onCategoryChange,
  accounts,
  accountId,
  onAccountChange,
  search,
  onSearchChange,
  labels,
  compact = false,
  showMonthNav = true,
}: FilterBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const typeLabels: Record<TransactionTypeFilter, string> = {
    all: labels.all,
    income: labels.income,
    expense: labels.expense,
    transfer: labels.transfer,
  };

  const categoryType = type === 'all' ? 'all' : type === 'income' ? 'income' : 'expense';

  const activeCategoryIds =
    categoryIds ?? (Array.isArray(categoryId) ? categoryId : categoryId ? [categoryId] : []);

  if (!compact) {
    return (
      <Card style={styles.container}>
        <View style={styles.monthRow}>
          <Pressable
            accessibilityLabel={labels.previousMonth}
            accessibilityRole="button"
            onPress={() => onMonthChange(shiftMonth(month, -1))}
            style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}>
            <ChevronLeft color={colors.content.primary} size={20} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonth(month, labels.month)}</Text>
          <Pressable
            accessibilityLabel={labels.nextMonth}
            accessibilityRole="button"
            onPress={() => onMonthChange(shiftMonth(month, 1))}
            style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}>
            <ChevronRight color={colors.content.primary} size={20} />
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
                style={({ pressed }) => [
                  styles.typeChip,
                  active && styles.typeChipActive,
                  pressed && !active && styles.typeChipPressed,
                ]}>
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                  {typeLabels[option]}
                </Text>
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
            selectedId={activeCategoryIds}
            type={categoryType}
          />
        ) : null}

        <AccountPicker
          accounts={accounts}
          allLabel={labels.all}
          allowUnselect
          label={labels.account}
          onSelect={onAccountChange}
          selectedId={accountId}
        />

        <TextInput
          accessibilityLabel={labels.searchLabel}
          onChangeText={onSearchChange}
          placeholder={labels.searchPlaceholder}
          placeholderTextColor={colors.content.placeholder}
          style={styles.searchInputFull}
          value={search}
        />
      </Card>
    );
  }

  const visibleOptions = TYPE_OPTIONS.filter((option) => option !== 'transfer');

  let activeFiltersCount = 0;
  activeFiltersCount += activeCategoryIds.length;
  if (accountId !== null) activeFiltersCount += 1;
  if (search.trim().length > 0) activeFiltersCount += 1;

  const handleResetFilters = () => {
    onCategoryChange(null);
    onAccountChange(null);
    onSearchChange('');
  };

  return (
    <View style={styles.compactContainer}>
      {/* Month navigator */}
      {showMonthNav ? (
        <View style={styles.monthRow}>
          <Pressable
            accessibilityLabel={labels.previousMonth}
            accessibilityRole="button"
            onPress={() => onMonthChange(shiftMonth(month, -1))}
            style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}>
            <ChevronLeft color={colors.content.primary} size={20} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonth(month, labels.month)}</Text>
          <Pressable
            accessibilityLabel={labels.nextMonth}
            accessibilityRole="button"
            onPress={() => onMonthChange(shiftMonth(month, 1))}
            style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}>
            <ChevronRight color={colors.content.primary} size={20} />
          </Pressable>
        </View>
      ) : null}

      {/* Segmented Control - Type Row */}
      <View style={styles.compactTypeRow}>
        {visibleOptions.map((option) => {
          const active = option === type;
          return (
            <Pressable
              accessibilityLabel={typeLabels[option]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option}
              onPress={() => onTypeChange(option)}
              style={({ pressed }) => [
                styles.typeChip,
                styles.compactTypeChip,
                active && styles.typeChipActive,
                pressed && !active && styles.typeChipPressed,
              ]}>
              <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                {typeLabels[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Search & Filter Trigger Bar */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchInputContainer}>
          <Search color={colors.content.muted} size={18} style={styles.searchIcon} />
          <TextInput
            accessibilityLabel={labels.searchLabel}
            onChangeText={onSearchChange}
            placeholder={labels.searchPlaceholder}
            placeholderTextColor={colors.content.placeholder}
            style={styles.searchInput}
            value={search}
          />
          {search.length > 0 ? (
            <Pressable
              accessibilityLabel="Xoá tìm kiếm"
              onPress={() => onSearchChange('')}
              style={styles.clearSearchButton}>
              <X color={colors.content.muted} size={16} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel={labels.advanced ?? 'Bộ lọc nâng cao'}
          accessibilityRole="button"
          accessibilityState={{ expanded: advancedOpen }}
          onPress={() => setAdvancedOpen(true)}
          style={({ pressed }) => [
            styles.filterButton,
            activeFiltersCount > 0 && styles.filterButtonActive,
            pressed && styles.filterButtonPressed,
          ]}>
          <SlidersHorizontal
            color={activeFiltersCount > 0 ? colors.brand.primary : colors.content.primary}
            size={18}
            strokeWidth={2.2}
          />
          {activeFiltersCount > 0 ? (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{activeFiltersCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Advanced Filters Bottom Sheet */}
      <Sheet
        closeLabel="Đóng"
        onClose={() => setAdvancedOpen(false)}
        title={labels.advanced ?? 'Bộ lọc nâng cao'}
        visible={advancedOpen}>
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetSubtitle}>Tối ưu danh sách theo danh mục & tài khoản</Text>
          {activeFiltersCount > 0 ? (
            <Pressable onPress={handleResetFilters} style={styles.resetButton}>
              <RotateCcw color={colors.brand.primary} size={14} />
              <Text style={styles.resetButtonText}>Đặt lại</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.sheetScroll}>
          {type !== 'transfer' ? (
            <View style={styles.sheetSection}>
              <CategoryPicker
                allLabel={labels.all}
                allowUnselect
                categories={categories}
                label={labels.category}
                onSelect={onCategoryChange}
                selectedId={activeCategoryIds}
                type={categoryType}
              />
            </View>
          ) : null}

          <View style={styles.sheetSection}>
            <AccountPicker
              accounts={accounts}
              allLabel={labels.all}
              allowUnselect
              label={labels.account}
              onSelect={onAccountChange}
              selectedId={accountId}
            />
          </View>
        </ScrollView>

        <View style={styles.sheetFooter}>
          <PrimaryButton
            backgroundColor={colors.brand.primary}
            label="Áp dụng"
            onPress={() => setAdvancedOpen(false)}
            pressedBackgroundColor={colors.brand.primaryPressed}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderColor: colors.surface.primary,
    borderRadius: radius.circle,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -3,
    top: -3,
  },
  badgeText: {
    color: colors.content.inverse,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  clearSearchButton: {
    padding: spacing[1],
  },
  compactContainer: {
    gap: spacing[2],
  },
  compactTypeChip: {
    alignItems: 'center',
    flex: 1,
    minHeight: 32,
    paddingHorizontal: spacing[2],
  },
  compactTypeRow: {
    backgroundColor: colors.surface.muted,
    borderRadius: 16,
    flexDirection: 'row',
    gap: spacing[1],
    minHeight: 44,
    padding: spacing[1],
  },
  container: {
    gap: spacing[3],
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.strong,
    borderRadius: radius.circle,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    position: 'relative',
    width: 42,
  },
  filterButtonActive: {
    backgroundColor: colors.brand.soft,
    borderColor: colors.brand.primary,
  },
  filterButtonPressed: {
    opacity: 0.7,
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
  resetButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  resetButtonText: {
    color: colors.brand.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  searchFilterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    paddingVertical: 0,
  },
  searchInputContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.strong,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    height: 42,
    paddingHorizontal: spacing[3],
  },
  searchInputFull: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  sheetFooter: {
    marginTop: spacing[4],
    paddingTop: spacing[2],
  },
  sheetHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
    marginTop: -spacing[2],
  },
  sheetScroll: {
    maxHeight: 380,
  },
  sheetScrollContent: {
    gap: spacing[4],
    paddingVertical: spacing[2],
  },
  sheetSection: {
    gap: spacing[2],
  },
  sheetSubtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
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
