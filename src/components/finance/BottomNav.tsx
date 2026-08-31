import { Pressable, StyleSheet, View } from 'react-native';
import { useContext } from 'react';
import { Plus } from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { IconButton } from '@/components/base';
import { colors, radius, shadows, spacing } from '@/theme';

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
    <View style={[styles.nav, { paddingBottom: Math.max(16, insets.bottom + 6) }]}>
      {firstItems.map((item) => (
        <NavItem active={item.key === activeKey} item={item} key={item.key} onChange={onChange} />
      ))}
      <IconButton
        accessibilityLabel={addAccessibilityLabel}
        backgroundColor={colors.content.primary}
        icon={<Plus color={colors.content.inverse} size={28} strokeWidth={2.6} />}
        onPress={onAdd}
        pressedBackgroundColor={colors.content.primaryPressed}
        size={52}
        style={styles.addButton}
      />
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

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => onChange?.(item.key)}
      style={({ pressed }) => [
        styles.item,
        active && styles.itemActive,
        pressed && styles.itemPressed,
      ]}>
      <NavIcon color={iconColor} name={item.icon} size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addButton: {
    ...shadows.fab,
    marginTop: -26,
  },
  item: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    minWidth: 56,
    paddingHorizontal: spacing[3],
  },
  itemActive: {
    backgroundColor: colors.brand.soft,
  },
  itemPressed: {
    opacity: 0.72,
  },
  nav: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 68,
    paddingBottom: 16,
    paddingHorizontal: spacing[2],
    paddingTop: spacing[2],
  },
});
