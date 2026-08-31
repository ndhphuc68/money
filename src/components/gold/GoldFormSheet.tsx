import { X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountInput, DateField } from '@/components/finance';
import { Dropdown, type DropdownOption } from '@/components/shared';
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
  const { visible, formType, title, subtitle, closeLabel, onSave, onClose, onCloseDropdowns } =
    props;
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onCloseDropdowns();
          }}
          style={[styles.sheet, { paddingBottom: spacing[5] + insets.bottom }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              <Pressable
                accessibilityLabel={closeLabel}
                accessibilityRole="button"
                onPress={onClose}
                style={styles.closeButton}>
                <X color={colors.content.primary} size={20} strokeWidth={2.2} />
              </Pressable>
            </View>

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

            <Pressable
              accessibilityRole="button"
              onPress={onSave}
              style={[styles.saveButton, styles.saveButtonSpacing]}>
              <Text style={styles.saveButtonText}>{props.saveLabel}</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.32)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
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
  rowOpen: {
    elevation: 20,
    zIndex: 20,
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
  saveButtonSpacing: {
    marginTop: spacing[4],
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
