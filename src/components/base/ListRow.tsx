import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, typography } from '@/theme';

export type ListRowProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  showDivider?: boolean;
  dividerColor?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  gap?: number;
  minHeight?: number;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  showDivider = false,
  dividerColor = colors.border.subtle,
  onPress,
  accessibilityLabel,
  gap = 12,
  minHeight = 56,
  titleStyle,
  subtitleStyle,
  style,
}: ListRowProps) {
  const rowStyle = [
    styles.row,
    { gap, minHeight },
    showDivider ? { borderBottomColor: dividerColor, borderBottomWidth: 1 } : null,
    style,
  ];

  const content = (
    <>
      {leading}
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, titleStyle]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, subtitleStyle]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...rowStyle, pressed && styles.rowPressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  rowPressed: {
    backgroundColor: colors.surface.muted,
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
});
