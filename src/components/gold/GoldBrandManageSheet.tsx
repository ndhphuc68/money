import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { X } from 'lucide-react-native';

import { Card, IconButton, ListRow, PrimaryButton, Sheet } from '@/components/base';
import type { GoldBrand } from '@/core/domain/gold/gold-brand';
import { colors, radius, spacing, typography } from '@/theme';

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
    <Sheet
      closeLabel={closeLabel}
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      visible={visible}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Card padding={0} style={styles.card}>
          {brands.map((brand, index) => (
            <ListRow
              gap={spacing[3]}
              key={brand.id}
              leading={
                <View style={styles.rowBadge}>
                  <Text style={styles.rowBadgeText}>{brand.name.slice(0, 2).toUpperCase()}</Text>
                </View>
              }
              minHeight={60}
              showDivider={index < brands.length - 1}
              title={brand.name}
              trailing={
                <IconButton
                  accessibilityLabel={deleteBrandLabel}
                  backgroundColor={colors.status.negativeSoft}
                  icon={<X color={colors.status.negative} size={16} strokeWidth={2.2} />}
                  onPress={() => onDeleteBrand(brand.id)}
                  radius="md"
                  size={36}
                  style={styles.deleteButton}
                />
              }
            />
          ))}
        </Card>

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

        <PrimaryButton
          backgroundColor={colors.category.gold}
          disabled={addDisabled}
          label={saveBrandLabel}
          minHeight={54}
          onPress={onAddBrand}
        />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  deleteButton: {
    flexShrink: 0,
  },
  field: {
    gap: spacing[1],
    marginBottom: spacing[3],
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
});
