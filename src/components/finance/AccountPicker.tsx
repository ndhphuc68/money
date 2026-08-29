import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Account } from '@/core/domain/finance/account';
import { colors, radius, spacing, typography } from '@/theme';

type AccountPickerProps = {
  accounts: readonly Account[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  label?: string;
  allowUnselect?: boolean;
  allLabel?: string;
  errorMessage?: string | null;
};

export function AccountPicker({
  accounts,
  selectedId,
  onSelect,
  label,
  allowUnselect = false,
  allLabel,
  errorMessage = null,
}: AccountPickerProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.list}>
        {allowUnselect && allLabel ? (
          <PickerChip
            active={selectedId === null}
            label={allLabel}
            onPress={() => onSelect(null)}
          />
        ) : null}
        {accounts.map((account) => (
          <PickerChip
            active={account.id === selectedId}
            key={account.id}
            label={account.name}
            onPress={() => onSelect(account.id)}
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

function PickerChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !active && styles.chipPressed,
      ]}>
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
