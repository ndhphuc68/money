import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AmountInput } from '@/components/finance';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export type GoldDropdownOption = {
  key: string;
  label: string;
  isActive: boolean;
};

export type GoldFormSheetProps = {
  visible: boolean;
  formType: 'buy' | 'sell';
  title: string;
  subtitle: string;
  closeLabel: string;
  dateLabel: string;
  dateValueLabel: string;
  onOpenCalendar(): void;
  brandFieldLabel: string;
  brandValueLabel: string;
  brandDropdownOpen: boolean;
  brandOptions: GoldDropdownOption[];
  addNewBrandLabel: string;
  onToggleBrandDropdown(): void;
  onSelectBrand(key: string): void;
  onSelectAddNewBrand(): void;
  lotFieldLabel: string;
  lotValueLabel: string;
  lotDropdownOpen: boolean;
  lotOptions: GoldDropdownOption[];
  onToggleLotDropdown(): void;
  onSelectLot(key: string): void;
  quantityLabel: string;
  quantityValue: string;
  onChangeQuantity(text: string): void;
  unitFieldLabel: string;
  unitValueLabel: string;
  unitDropdownOpen: boolean;
  unitOptions: GoldDropdownOption[];
  onToggleUnitDropdown(): void;
  onSelectUnit(key: string): void;
  totalLabel: string;
  totalPlaceholder: string;
  totalAmount: number | null;
  onChangeTotalAmount(amount: number | null): void;
  totalInvalidMessage: string;
  saveLabel: string;
  errorMessage: string | null;
  onSave(): void;
};

function Dropdown({
  fieldLabel,
  valueLabel,
  open,
  options,
  onToggle,
  onSelect,
  extraOption,
}: {
  fieldLabel: string;
  valueLabel: string;
  open: boolean;
  options: GoldDropdownOption[];
  onToggle(): void;
  onSelect(key: string): void;
  extraOption?: { label: string; onSelect(): void };
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{fieldLabel}</Text>
      <Pressable accessibilityRole="button" onPress={onToggle} style={[styles.dropdownField, open && styles.dropdownFieldOpen]}>
        <Text numberOfLines={1} style={styles.dropdownValue}>{valueLabel}</Text>
        <Text style={styles.chevron}>{open ? '︿' : '﹀'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.key}
              onPress={() => onSelect(option.key)}
              style={styles.dropdownOption}
            >
              <Text style={[styles.dropdownOptionText, option.isActive && styles.dropdownOptionTextActive]} numberOfLines={1}>
                {option.label}
              </Text>
              {option.isActive ? <Text style={styles.dropdownCheck}>✓</Text> : null}
            </Pressable>
          ))}
          {extraOption ? (
            <Pressable accessibilityRole="button" onPress={extraOption.onSelect} style={styles.dropdownOption}>
              <Text style={styles.dropdownAddNew}>{extraOption.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function GoldFormSheet(props: GoldFormSheetProps) {
  const { visible, formType, title, subtitle, closeLabel, onSave } = props;

  return (
    <Modal animationType="fade" onRequestClose={props.onSave} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={props.onSave} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{props.dateLabel}</Text>
              <Pressable accessibilityRole="button" onPress={props.onOpenCalendar} style={styles.dateField}>
                <Text style={styles.dropdownValue}>{props.dateValueLabel}</Text>
              </Pressable>
            </View>

            {formType === 'buy' ? (
              <Dropdown
                extraOption={{ label: props.addNewBrandLabel, onSelect: props.onSelectAddNewBrand }}
                fieldLabel={props.brandFieldLabel}
                onSelect={props.onSelectBrand}
                onToggle={props.onToggleBrandDropdown}
                open={props.brandDropdownOpen}
                options={props.brandOptions}
                valueLabel={props.brandValueLabel}
              />
            ) : (
              <Dropdown
                fieldLabel={props.lotFieldLabel}
                onSelect={props.onSelectLot}
                onToggle={props.onToggleLotDropdown}
                open={props.lotDropdownOpen}
                options={props.lotOptions}
                valueLabel={props.lotValueLabel}
              />
            )}

            {formType === 'buy' ? (
              <View style={styles.row}>
                <View style={[styles.field, styles.rowField]}>
                  <Text style={styles.label}>{props.quantityLabel}</Text>
                  <TextInput
                    accessibilityLabel={props.quantityLabel}
                    keyboardType="numeric"
                    onChangeText={props.onChangeQuantity}
                    style={styles.quantityInput}
                    value={props.quantityValue}
                  />
                </View>
                <View style={[styles.field, styles.rowField]}>
                  <Dropdown
                    fieldLabel={props.unitFieldLabel}
                    onSelect={props.onSelectUnit}
                    onToggle={props.onToggleUnitDropdown}
                    open={props.unitDropdownOpen}
                    options={props.unitOptions}
                    valueLabel={props.unitValueLabel}
                  />
                </View>
              </View>
            ) : null}

            <AmountInput
              errorMessage={null}
              invalidMessage={props.totalInvalidMessage}
              label={props.totalLabel}
              onChange={props.onChangeTotalAmount}
              placeholder={props.totalPlaceholder}
              value={props.totalAmount}
            />

            {props.errorMessage ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}

            <Pressable accessibilityRole="button" onPress={onSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>{props.saveLabel}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  chevron: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  dateField: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  dropdownAddNew: {
    color: colors.brand.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  dropdownCheck: {
    color: colors.brand.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
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
    borderColor: colors.brand.primary,
  },
  dropdownMenu: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
    marginTop: spacing[1],
    maxHeight: 240,
    padding: spacing[1],
  },
  dropdownOption: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing[2],
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
  errorText: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  field: {
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border.strong,
    borderRadius: radius.sm,
    height: 5,
    marginBottom: spacing[3],
    width: 44,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  quantityInput: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    height: 48,
    paddingHorizontal: spacing[3],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  rowField: {
    flex: 1,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.category.gold,
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 54,
  },
  saveButtonText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  sheet: {
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '86%',
    padding: spacing[5],
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
});
