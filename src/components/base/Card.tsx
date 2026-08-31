import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

export type CardProps = {
  children: ReactNode;
  elevation?: 'none' | 'card' | 'elevated';
  radius?: keyof typeof radius;
  padding?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  elevation = 'card',
  radius: radiusKey = 'lg',
  padding = spacing[4],
  backgroundColor = colors.surface.primary,
  style,
}: CardProps) {
  const elevationStyle =
    elevation === 'card' ? shadows.card : elevation === 'elevated' ? shadows.elevated : undefined;

  return (
    <View
      style={[
        elevationStyle,
        { backgroundColor, borderRadius: radius[radiusKey], padding },
        style,
      ]}>
      {children}
    </View>
  );
}
