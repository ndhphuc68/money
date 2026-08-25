import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Category, CategoryType } from '@/core/domain/finance/category';
import { colors, radius, spacing, typography } from '@/theme';

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
          <PickerChip active={selectedId === null} label={allLabel} onPress={() => onSelect(null)} />
        ) : null}
        {visible.map((category) => (
          <PickerChip
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

function PickerChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && !active && styles.chipPressed]}
    >
      <Text numberOfLines={1} style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surface.muted,
    borderRadius: radius.pill,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  chipActive: {
    backgroundColor: colors.content.primary,
  },
  chipPressed: {
    backgroundColor: colors.border.subtle,
  },
  chipText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  chipTextActive: {
    color: colors.content.inverse,
    fontWeight: typography.weights.bold,
  },
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
