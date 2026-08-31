import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { colors, radius, spacing } from '@/theme';
import { VELA_CATEGORY_COLORS } from './category-colors';

export type ColorPickerProps = {
  selectedColor: string;
  onSelectColor: (color: string) => void;
};

export function ColorPicker({ selectedColor, onSelectColor }: ColorPickerProps) {
  return (
    <View style={styles.grid}>
      {VELA_CATEGORY_COLORS.map((color) => {
        const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
        return (
          <Pressable
            accessibilityLabel={`Màu ${color}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={color}
            onPress={() => onSelectColor(color)}
            style={({ pressed }) => [
              styles.colorSwatch,
              { backgroundColor: color },
              isSelected && styles.colorSwatchSelected,
              pressed && styles.colorSwatchPressed,
            ]}>
            {isSelected ? <Check color={colors.content.inverse} size={16} strokeWidth={3} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  colorSwatch: {
    alignItems: 'center',
    borderRadius: radius.circle,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  colorSwatchPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  colorSwatchSelected: {
    borderColor: colors.content.inverse,
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'flex-start',
    paddingVertical: spacing[1],
  },
});
