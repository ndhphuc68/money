import { StyleSheet, Text, View } from 'react-native';

import { PillChip } from '@/components/base';
import type { Category, CategoryType } from '@/core/domain/finance/category';
import { colors, spacing, typography } from '@/theme';

import { CategoryIcon } from './icons';

type CategoryPickerProps = {
  categories: readonly Category[];
  /** Pass 'all' to show both income and expense categories together (e.g. an unfiltered list view). */
  type: CategoryType | 'all';
  selectedId?: string | null | string[] | readonly string[];
  selectedIds?: readonly string[];
  onSelect: (id: any) => void;
  label?: string;
  allowUnselect?: boolean;
  allLabel?: string;
  errorMessage?: string | null;
  multiple?: boolean;
};

export function CategoryPicker({
  categories,
  type,
  selectedId = null,
  selectedIds,
  onSelect,
  label,
  allowUnselect = false,
  allLabel,
  errorMessage = null,
  multiple = true,
}: CategoryPickerProps) {
  const visible = categories.filter(
    (category) => (type === 'all' || category.type === type) && !category.isArchived,
  );

  const getActiveIds = (): string[] => {
    if (selectedIds) return Array.from(selectedIds);
    if (Array.isArray(selectedId)) return Array.from(selectedId);
    if (typeof selectedId === 'string') return [selectedId];
    return [];
  };
  const activeIds = getActiveIds();
  const isAllSelected = activeIds.length === 0;

  const handleAllPress = () => {
    onSelect(null);
  };

  const handleCategoryPress = (categoryId: string) => {
    if (!multiple) {
      onSelect(activeIds.includes(categoryId) ? null : categoryId);
      return;
    }

    let next: string[];
    if (activeIds.includes(categoryId)) {
      next = activeIds.filter((id) => id !== categoryId);
    } else {
      next = [...activeIds, categoryId];
    }

    if (next.length === 0) {
      onSelect(null);
    } else if (next.length === 1) {
      onSelect(next[0]);
    } else {
      onSelect(next);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.list}>
        {allowUnselect && allLabel ? (
          <PillChip active={isAllSelected} label={allLabel} onPress={handleAllPress} />
        ) : null}
        {visible.map((category) => {
          const isSelected = activeIds.includes(category.id);
          return (
            <PillChip
              active={isSelected}
              activeColor={category.color}
              icon={
                category.icon ? (
                  <CategoryIcon color={category.color} icon={category.icon} iconSize={12} size={20} />
                ) : null
              }
              key={category.id}
              label={category.name}
              onPress={() => handleCategoryPress(category.id)}
            />
          );
        })}
      </View>
      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
