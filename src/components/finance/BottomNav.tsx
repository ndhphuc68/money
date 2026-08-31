import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useContext } from 'react';
import { Plus } from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing, typography } from '@/theme';

import { NavIcon, type NavIconName } from './icons';

export type BottomNavItem = {
  key: string;
  label: string;
  icon: NavIconName;
};

type BottomNavProps = {
  items: readonly BottomNavItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  onAdd?: () => void;
  addAccessibilityLabel: string;
};

export function BottomNav({
  items,
  activeKey,
  onChange,
  onAdd,
  addAccessibilityLabel,
}: BottomNavProps) {
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0 };
  const firstItems = items.slice(0, 2);
  const lastItems = items.slice(2);

  return (
    <View style={[styles.nav, { paddingBottom: Math.max(26, insets.bottom + 10) }]}>
      {firstItems.map((item) => (
        <NavItem active={item.key === activeKey} item={item} key={item.key} onChange={onChange} />
      ))}
      <Pressable
        accessibilityLabel={addAccessibilityLabel}
        accessibilityRole="button"
        onPress={onAdd}
        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
        <Plus color={colors.content.inverse} size={28} strokeWidth={2.6} />
      </Pressable>
      {lastItems.map((item) => (
        <NavItem active={item.key === activeKey} item={item} key={item.key} onChange={onChange} />
      ))}
    </View>
  );
}

function NavItem({
  item,
  active,
  onChange,
}: {
  item: BottomNavItem;
  active: boolean;
  onChange?: (key: string) => void;
}) {
  const iconColor = active ? colors.brand.primary : colors.content.faint;
  const textColor = active ? colors.content.primary : colors.content.muted2;

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => onChange?.(item.key)}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <NavIcon color={iconColor} name={item.icon} />
      <Text numberOfLines={1} style={[styles.itemText, { color: textColor }]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addButton: {
    ...shadows.fab,
    alignItems: 'center',
    backgroundColor: colors.content.primary,
    borderRadius: radius.circle,
    height: 52,
    justifyContent: 'center',
    marginTop: -30,
    width: 52,
  },
  addButtonPressed: {
    backgroundColor: '#243247',
  },
  item: {
    alignItems: 'center',
    gap: spacing[1],
    justifyContent: 'center',
    minHeight: 44,
    width: 64,
  },
  itemPressed: {
    opacity: 0.72,
  },
  itemText: {
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.bold,
    lineHeight: 18,
  },
  nav: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 88,
    paddingBottom: 26,
    paddingHorizontal: spacing[2],
    paddingTop: spacing[3] - 2,
  },
});
