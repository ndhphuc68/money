import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type PillChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: ReactNode;
  activeColor?: string;
};

export function PillChip({ label, active, onPress, icon, activeColor }: PillChipProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && (activeColor ? { backgroundColor: activeColor } : styles.chipActive),
        pressed && !active && styles.chipPressed,
      ]}>
      {icon}
      <Text numberOfLines={1} style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing[1] + 2,
    justifyContent: 'center',
    minHeight: 40,
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
});
