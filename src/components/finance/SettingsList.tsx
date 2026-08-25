import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type SettingsItem = {
  label: string;
  iconColor: string;
};

type SettingsListProps = {
  items: readonly SettingsItem[];
  onSelect?: (index: number) => void;
};

export function SettingsList({ items, onSelect }: SettingsListProps) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <Pressable
          accessibilityLabel={item.label}
          accessibilityRole="button"
          key={`${item.label}-${index}`}
          onPress={() => onSelect?.(index)}
          style={({ pressed }) => [styles.row, index < items.length - 1 && styles.divider, pressed && styles.rowPressed]}
        >
          <View accessibilityElementsHidden importantForAccessibility="no" style={[styles.icon, { backgroundColor: item.iconColor }]} />
          <Text numberOfLines={1} style={styles.label}>{item.label}</Text>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: 'rgba(60, 60, 67, 0.3)',
    fontSize: 28,
    fontWeight: typography.weights.semibold,
  },
  divider: {
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
    borderBottomWidth: 1,
  },
  icon: {
    borderRadius: 7,
    height: 30,
    width: 30,
  },
  label: {
    color: colors.content.primary,
    flex: 1,
    fontSize: 17,
    fontWeight: typography.weights.regular,
  },
  list: {
    backgroundColor: colors.surface.primary,
    borderRadius: 26,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 52,
    paddingHorizontal: spacing[4],
  },
  rowPressed: {
    backgroundColor: colors.surface.muted,
  },
});
