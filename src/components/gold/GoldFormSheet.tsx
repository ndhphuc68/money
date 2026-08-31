import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Dropdown, PrimaryButton, Sheet, type DropdownOption } from '@/components/base';
import { AmountInput, DateField } from '@/components/finance';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldDropdownOption = DropdownOption;

export type GoldFormSheetProps = {
  visible: boolean;
  formType: 'buy' | 'sell';
  title: string;
  subtitle: string;
  closeLabel: string;
  dateLabel: string;
  dateValue: string;
  dateConfirmLabel: string;
  onChangeDate(iso: string): void;
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
  onClose(): void;
  onCloseDropdowns(): void;
};

export function GoldFormSheet(props: GoldFormSheetProps) {
  const { visible, title, subtitle, closeLabel, onSave, onClose, onCloseDropdowns, formType } =
    props;

  return (
    <Sheet
      closeLabel={closeLabel}
      onBodyPress={onCloseDropdowns}
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      visible={visible}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.field}>
          <DateField
            confirmLabel={props.dateConfirmLabel}
            label={props.dateLabel}
            onChange={props.onChangeDate}
            value={props.dateValue}
          />
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
          <View style={[styles.row, props.unitDropdownOpen && styles.rowOpen]}>
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
            <View style={styles.rowField}>
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

        <PrimaryButton
          backgroundColor={colors.category.gold}
          label={props.saveLabel}
          minHeight={54}
          onPress={onSave}
          style={styles.saveButtonSpacing}
        />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  field: {
    gap: spacing[1],
    marginBottom: spacing[3],
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
  rowOpen: {
    elevation: 20,
    zIndex: 20,
  },
  saveButtonSpacing: {
    marginTop: spacing[4],
  },
});
