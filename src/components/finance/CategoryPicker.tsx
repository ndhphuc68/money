import { StyleSheet, Text, View } from 'react-native';

import { PillChip } from '@/components/base';
import type { Category, CategoryType } from '@/core/domain/finance/category';
import { colors, spacing, typography } from '@/theme';

type CategoryPickerProps = {
  categories: readonly Category[];
  /** Pass 'all' to show both income and expense categories together (e.g. an unfiltered list view). */
  type: CategoryType | 'all';
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  label?: string;
  allowUnselect?: boolean;
  allLabel?: string;
  errorMessage?: string | null;
};

export function CategoryPicker({
  categories,
  type,
  selectedId,
  onSelect,
  label,
  allowUnselect = false,
  allLabel,
  errorMessage = null,
}: CategoryPickerProps) {
  const visible = categories.filter(
    (category) => (type === 'all' || category.type === type) && !category.isArchived,
  );

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.list}>
        {allowUnselect && allLabel ? (
          <PillChip active={selectedId === null} label={allLabel} onPress={() => onSelect(null)} />
        ) : null}
        {visible.map((category) => (
          <PillChip
            active={category.id === selectedId}
            key={category.id}
            label={category.name}
            onPress={() => onSelect(category.id)}
          />
        ))}
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
