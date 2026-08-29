import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { GoldBrand } from '@/core/domain/gold/gold-brand';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export type GoldBrandManageSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  closeLabel: string;
  brands: GoldBrand[];
  deleteBrandLabel: string;
  onDeleteBrand(id: string): void;
  newBrandName: string;
  onChangeNewBrandName(text: string): void;
  addBrandLabel: string;
  addBrandPlaceholder: string;
  addDisabled: boolean;
  saveBrandLabel: string;
  onAddBrand(): void;
  onClose(): void;
};

export function GoldBrandManageSheet({
  visible,
  title,
  subtitle,
  closeLabel,
  brands,
  deleteBrandLabel,
  onDeleteBrand,
  newBrandName,
  onChangeNewBrandName,
  addBrandLabel,
  addBrandPlaceholder,
  addDisabled,
  saveBrandLabel,
  onAddBrand,
  onClose,
}: GoldBrandManageSheetProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
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
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              {brands.map((brand, index) => (
                <View
                  key={brand.id}
                  style={[styles.row, index < brands.length - 1 && styles.rowDivider]}>
                  <View style={styles.rowBadge}>
                    <Text style={styles.rowBadgeText}>{brand.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.rowText}>
                    {brand.name}
                  </Text>
                  <Pressable
                    accessibilityLabel={deleteBrandLabel}
                    accessibilityRole="button"
                    onPress={() => onDeleteBrand(brand.id)}
                    style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{addBrandLabel}</Text>
              <TextInput
                accessibilityLabel={addBrandLabel}
                onChangeText={onChangeNewBrandName}
                placeholder={addBrandPlaceholder}
                placeholderTextColor={colors.content.placeholder}
                style={styles.input}
                value={newBrandName}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: addDisabled }}
              disabled={addDisabled}
              onPress={onAddBrand}
              style={[styles.saveButton, addDisabled && styles.saveButtonDisabled]}>
              <Text style={styles.saveButtonText}>{saveBrandLabel}</Text>
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
  card: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
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
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.status.negativeSoft,
    borderRadius: radius.md,
    flexShrink: 0,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  deleteButtonText: {
    color: colors.status.negative,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
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
  input: {
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
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 60,
  },
  rowBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF4D6',
    borderRadius: radius.circle,
    flexShrink: 0,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rowBadgeText: {
    color: '#A96308',
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  rowText: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    minWidth: 0,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.category.gold,
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 54,
  },
  saveButtonDisabled: {
    opacity: 0.5,
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
