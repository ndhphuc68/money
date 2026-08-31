import { View } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Car,
  CircleDollarSign,
  CircleUserRound,
  LayoutGrid,
  List,
  ReceiptText,
  Shapes,
  ShoppingBag,
  Target,
  Utensils,
} from 'lucide-react-native';

import { colors, radius } from '@/theme';
import { DEFAULT_CATEGORY_COLOR } from './category-colors';

export type CategoryIconName =
  'income' | 'food' | 'shopping' | 'bills' | 'transport' | 'shapes' | string;

export type NavIconName = 'overview' | 'list' | 'target' | 'profile';

export type CategoryIconProps = {
  icon?: string;
  name?: CategoryIconName;
  color?: string;
  size?: number;
  iconSize?: number;
  testID?: string;
};

const legacyCategoryIcons = {
  income: CircleDollarSign,
  food: Utensils,
  shopping: ShoppingBag,
  bills: ReceiptText,
  transport: Car,
  shapes: Shapes,
};

export function CategoryIcon({
  icon,
  name,
  color,
  size = 40,
  iconSize,
  testID,
}: CategoryIconProps) {
  const iconKey = icon || name || 'fa6:shapes';
  const finalIconSize = iconSize ?? Math.round(size * 0.46);

  let finalColor = color;
  if (!finalColor) {
    if (name && name in legacyCategoryIcons) {
      finalColor = categoryColor(name as keyof typeof legacyCategoryIcons);
    } else {
      finalColor = DEFAULT_CATEGORY_COLOR;
    }
  }

  return (
    <View
      accessibilityElementsHidden={testID ? undefined : true}
      importantForAccessibility={testID ? 'auto' : 'no'}
      testID={testID}
      style={{
        alignItems: 'center',
        backgroundColor: finalColor,
        borderRadius: radius.circle,
        height: size,
        justifyContent: 'center',
        width: size,
      }}>
      {renderInnerIcon(iconKey, finalIconSize)}
    </View>
  );
}

function renderInnerIcon(iconKey: string, size: number) {
  const iconColor = colors.content.inverse;

  if (iconKey.startsWith('fa6:')) {
    const glyphName = iconKey.slice(4);
    return <FontAwesome6 color={iconColor} name={glyphName as any} size={size} />;
  }

  if (iconKey.startsWith('mci:')) {
    const glyphName = iconKey.slice(4);
    return <MaterialCommunityIcons color={iconColor} name={glyphName as any} size={size + 2} />;
  }

  if (iconKey in legacyCategoryIcons) {
    const Icon = legacyCategoryIcons[iconKey as keyof typeof legacyCategoryIcons];
    return <Icon color={iconColor} size={size} strokeWidth={1.8} />;
  }

  // Fallback
  return <FontAwesome6 color={iconColor} name="shapes" size={size} />;
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

export function categoryColor(name: keyof typeof legacyCategoryIcons | string) {
  if (name in colors.category) {
    return colors.category[name as keyof typeof colors.category];
  }
  return DEFAULT_CATEGORY_COLOR;
}
