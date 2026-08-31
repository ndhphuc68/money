import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '@/theme';

export type IconButtonProps = {
  icon: ReactNode;
  onPress?: () => void;
  size?: number;
  radius?: keyof typeof radius;
  backgroundColor?: string;
  pressedBackgroundColor?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  onPress,
  size = 44,
  radius: radiusKey = 'circle',
  backgroundColor,
  pressedBackgroundColor,
  accessibilityLabel,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: size,
          width: size,
          borderRadius: radius[radiusKey],
          backgroundColor:
            pressed && pressedBackgroundColor ? pressedBackgroundColor : backgroundColor,
        },
        style,
      ]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
