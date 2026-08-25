import { Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme';

export type CategoryIconName = 'income' | 'food' | 'shopping' | 'bills' | 'transport';
export type NavIconName = 'overview' | 'list' | 'target' | 'profile';

type CategoryIconProps = {
  name: CategoryIconName;
  color?: string;
};

const categoryGlyphs: Record<CategoryIconName, string> = {
  income: '+',
  food: 'F',
  shopping: 'S',
  bills: 'B',
  transport: 'T',
};

export function CategoryIcon({ name, color = categoryColor(name) }: CategoryIconProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        alignItems: 'center',
        backgroundColor: color,
        borderRadius: radius.circle,
        height: 40,
        justifyContent: 'center',
        width: 40,
      }}
    >
      <Text style={{ color: colors.content.inverse, fontSize: typography.sizes.small, fontWeight: typography.weights.black }}>
        {categoryGlyphs[name]}
      </Text>
    </View>
  );
}

export function NavIcon({ name, color }: { name: NavIconName; color: string }) {
  const glyphs: Record<NavIconName, string> = {
    overview: 'O',
    list: 'L',
    target: 'T',
    profile: 'P',
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        alignItems: 'center',
        borderColor: color,
        borderRadius: radius.circle,
        borderWidth: 1.8,
        height: 22,
        justifyContent: 'center',
        width: 22,
      }}
    >
      <Text style={{ color, fontSize: typography.sizes.micro, fontWeight: typography.weights.black }}>{glyphs[name]}</Text>
    </View>
  );
}

export function categoryColor(name: CategoryIconName) {
  return colors.category[name];
}
