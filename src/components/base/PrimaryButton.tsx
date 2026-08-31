import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, radius, typography } from '@/theme';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  backgroundColor?: string;
  pressedBackgroundColor?: string;
  textColor?: string;
  textStyle?: StyleProp<TextStyle>;
  radius?: keyof typeof radius;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  backgroundColor = colors.content.primary,
  pressedBackgroundColor,
  textColor = colors.content.inverse,
  textStyle,
  radius: radiusKey = 'lg',
  minHeight = 52,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: radius[radiusKey],
          minHeight,
          backgroundColor:
            pressed && !disabled && pressedBackgroundColor
              ? pressedBackgroundColor
              : backgroundColor,
        },
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.text, { color: textColor }, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
});
