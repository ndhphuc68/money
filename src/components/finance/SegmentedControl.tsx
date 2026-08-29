import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type SegmentedControlProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange?: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {options.map((option) => {
        const active = option === value;

        return (
          <Pressable
            accessibilityLabel={option}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={option}
            onPress={() => onChange?.(option)}
            style={({ pressed }) => [
              styles.option,
              active && styles.optionActive,
              pressed && !active && styles.optionPressed,
            ]}>
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.muted,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 6,
    padding: spacing[1],
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  optionActive: {
    backgroundColor: colors.content.primary,
  },
  optionPressed: {
    backgroundColor: colors.border.subtle,
  },
  optionText: {
    color: colors.content.muted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  optionTextActive: {
    color: colors.content.inverse,
    fontWeight: typography.weights.bold,
  },
});
