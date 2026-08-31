import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

export type DropdownOption = {
  key: string;
  label: string;
  isActive: boolean;
};

export type DropdownProps = {
  fieldLabel: string;
  valueLabel: string;
  open: boolean;
  options: DropdownOption[];
  onToggle(): void;
  onSelect(key: string): void;
  extraOption?: { label: string; onSelect(): void };
};

export function Dropdown({
  fieldLabel,
  valueLabel,
  open,
  options,
  onToggle,
  onSelect,
  extraOption,
}: DropdownProps) {
  return (
    <View style={[styles.field, open && styles.fieldOpen]}>
      <Text style={styles.label}>{fieldLabel}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={[styles.dropdownField, open && styles.dropdownFieldOpen]}>
        <Text numberOfLines={1} style={styles.dropdownValue}>
          {valueLabel}
        </Text>
        {open ? (
          <ChevronUp color={colors.brand.primary} size={18} strokeWidth={2} />
        ) : (
          <ChevronDown color={colors.content.secondary} size={18} strokeWidth={2} />
        )}
      </Pressable>
      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.key}
              onPress={() => onSelect(option.key)}
              style={[styles.dropdownOption, option.isActive && styles.dropdownOptionActive]}>
              <Text
                style={[
                  styles.dropdownOptionText,
                  option.isActive && styles.dropdownOptionTextActive,
                ]}
                numberOfLines={1}>
                {option.label}
              </Text>
              {option.isActive ? (
                <Check color={colors.brand.primary} size={18} strokeWidth={2.5} />
              ) : null}
            </Pressable>
          ))}
          {extraOption ? (
            <Pressable
              accessibilityRole="button"
              onPress={extraOption.onSelect}
              style={styles.dropdownOption}>
              <Text style={styles.dropdownAddNew}>{extraOption.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownAddNew: {
    color: colors.brand.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  dropdownField: {
    alignItems: 'center',
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
  },
  dropdownFieldOpen: {
    backgroundColor: colors.brand.soft,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: colors.brand.tint,
  },
  dropdownMenu: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    borderColor: colors.brand.tint,
    borderTopWidth: 0,
    borderWidth: 1,
    marginTop: -1,
    maxHeight: 240,
    padding: spacing[1],
    position: 'absolute',
    top: '100%',
    width: '100%',
    zIndex: 20,
  },
  dropdownOption: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing[2],
  },
  dropdownOptionActive: {
    backgroundColor: colors.brand.soft,
  },
  dropdownOptionText: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  dropdownOptionTextActive: {
    color: colors.brand.primary,
    fontWeight: typography.weights.black,
  },
  dropdownValue: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  field: {
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  fieldOpen: {
    elevation: 20,
    zIndex: 20,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
});
