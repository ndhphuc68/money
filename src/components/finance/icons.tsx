import { View } from 'react-native';
import { Car, CircleDollarSign, CircleUserRound, LayoutGrid, List, ReceiptText, ShoppingBag, Target, Utensils } from 'lucide-react-native';

import { colors, radius } from '@/theme';

export type CategoryIconName = 'income' | 'food' | 'shopping' | 'bills' | 'transport';
export type NavIconName = 'overview' | 'list' | 'target' | 'profile';

type CategoryIconProps = {
  name: CategoryIconName;
  color?: string;
};

const categoryIcons = {
  income: CircleDollarSign,
  food: Utensils,
  shopping: ShoppingBag,
  bills: ReceiptText,
  transport: Car,
};

export function CategoryIcon({ name, color = categoryColor(name) }: CategoryIconProps) {
  const Icon = categoryIcons[name];
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
      <Icon color={colors.content.inverse} size={18} strokeWidth={1.8} />
    </View>
  );
}

export function NavIcon({ name, color }: { name: NavIconName; color: string }) {
  const navIcons = {
    overview: LayoutGrid,
    list: List,
    target: Target,
    profile: CircleUserRound,
  };
  const Icon = navIcons[name];

  return (
    <View accessibilityElementsHidden importantForAccessibility="no">
      <Icon color={color} size={25} strokeWidth={1.9} />
    </View>
  );
}

export function categoryColor(name: CategoryIconName) {
  return colors.category[name];
}
