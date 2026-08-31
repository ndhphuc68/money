import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ListRow } from '@/components/base';
import { colors, spacing, typography } from '@/theme';

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
        <ListRow
          dividerColor="rgba(60, 60, 67, 0.12)"
          gap={spacing[3]}
          key={`${item.label}-${index}`}
          leading={
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.icon, { backgroundColor: item.iconColor }]}
            />
          }
          minHeight={52}
          onPress={() => onSelect?.(index)}
          showDivider={index < items.length - 1}
          style={styles.row}
          title={item.label}
          titleStyle={styles.title}
          trailing={
            <ChevronRight
              accessibilityElementsHidden
              color="rgba(60, 60, 67, 0.3)"
              importantForAccessibility="no"
              size={22}
              strokeWidth={2.2}
            />
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    borderRadius: 7,
    height: 30,
    width: 30,
  },
  list: {
    backgroundColor: colors.surface.primary,
    borderRadius: 26,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: spacing[4],
  },
  title: {
    color: colors.content.primary,
    flex: 1,
    fontSize: 17,
    fontWeight: typography.weights.regular,
  },
});
