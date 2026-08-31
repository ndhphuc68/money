import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Card, PrimaryButton, Sheet } from '@/components/base';
import type { Category, CategoryType } from '@/core/domain/finance/category';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { ColorPicker } from './ColorPicker';
import { IconPickerSheet } from './IconPickerSheet';
import { CategoryIcon } from './icons';
import { SegmentedControl } from './SegmentedControl';

export type CategoryFormData = {
  id?: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

export type CategoryFormSheetProps = {
  visible: boolean;
  editingCategory?: Category | null;
  onClose: () => void;
  onSave: (data: CategoryFormData) => void | Promise<void>;
};

export function CategoryFormSheet({
  visible,
  editingCategory,
  onClose,
  onSave,
}: CategoryFormSheetProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [icon, setIcon] = useState('fa6:shapes');
  const [color, setColor] = useState('#F2734A');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingCategory) {
        setName(editingCategory.name);
        setType(editingCategory.type);
        setIcon(editingCategory.icon || 'fa6:shapes');
        setColor(
          editingCategory.color || (editingCategory.type === 'income' ? '#10B981' : '#F2734A'),
        );
      } else {
        setName('');
        setType('expense');
        setIcon('fa6:shapes');
        setColor('#F2734A');
      }
      setShowIconPicker(false);
    }
  }, [visible, editingCategory]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...(editingCategory ? { id: editingCategory.id } : {}),
      name: name.trim(),
      type,
      icon,
      color,
    });
  };

  const isEditing = Boolean(editingCategory);
  const typeLabelMap: Record<CategoryType, string> = {
    expense: 'Chi tiêu',
    income: 'Thu nhập',
  };
  const typeOptions = ['Chi tiêu', 'Thu nhập'] as const;

  return (
    <>
      <Sheet
        closeLabel="Đóng"
        onClose={onClose}
        title={isEditing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
        visible={visible && !showIconPicker}
        style={styles.sheetContent}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Live Preview Card */}
            <Card elevation="card" padding={spacing[4]} style={styles.previewCard}>
              <CategoryIcon color={color} icon={icon} size={56} />
              <View style={styles.previewTextWrapper}>
                <Text numberOfLines={1} style={styles.previewName}>
                  {name.trim() || 'Tên danh mục'}
                </Text>
                <Text style={styles.previewType}>
                  {type === 'expense' ? 'Danh mục Chi tiêu' : 'Danh mục Thu nhập'}
                </Text>
              </View>
            </Card>

            {/* Type Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Loại danh mục</Text>
              <SegmentedControl
                onChange={(val) => {
                  const newType: CategoryType = val === 'Thu nhập' ? 'income' : 'expense';
                  setType(newType);
                  if (!isEditing) {
                    setColor(newType === 'income' ? '#10B981' : '#F2734A');
                  }
                }}
                options={typeOptions}
                value={typeLabelMap[type] as (typeof typeOptions)[number]}
              />
            </View>

            {/* Name Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tên danh mục</Text>
              <TextInput
                accessibilityLabel="Tên danh mục"
                onChangeText={setName}
                placeholder="vd: Cà phê, Spotify, Tiền phòng..."
                placeholderTextColor={colors.content.muted}
                style={styles.textInput}
                value={name}
              />
            </View>

            {/* Icon Picker Trigger */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Biểu tượng</Text>
              <Pressable
                accessibilityLabel="Chọn biểu tượng"
                accessibilityRole="button"
                onPress={() => setShowIconPicker(true)}
                style={({ pressed }) => [
                  styles.iconPickerRow,
                  pressed && styles.iconPickerRowPressed,
                ]}>
                <CategoryIcon color={color} icon={icon} size={40} />
                <Text style={styles.iconPickerText}>Đổi biểu tượng</Text>
                <ChevronRight color={colors.content.muted} size={20} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Color Palette */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Màu sắc</Text>
              <ColorPicker onSelectColor={setColor} selectedColor={color} />
            </View>

            {/* Save Button */}
            <View style={styles.actionContainer}>
              <PrimaryButton disabled={!name.trim()} label="Lưu danh mục" onPress={handleSave} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Sheet>

      {/* Embedded Icon Picker Sheet */}
      <IconPickerSheet
        onClose={() => setShowIconPicker(false)}
        onSelectIcon={(newIcon) => {
          setIcon(newIcon);
          setShowIconPicker(false);
        }}
        selectedColor={color}
        selectedIcon={icon}
        visible={visible && showIconPicker}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    gap: spacing[2],
    marginTop: spacing[3],
    paddingBottom: spacing[6],
  },
  fieldGroup: {
    gap: spacing[2],
  },
  fieldLabel: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  iconPickerRow: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 56,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  iconPickerRowPressed: {
    backgroundColor: colors.surface.muted,
  },
  iconPickerText: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  keyboardContainer: {
    maxHeight: 720,
  },
  previewCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[4],
  },
  previewName: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
  previewTextWrapper: {
    flex: 1,
    gap: spacing[1],
  },
  previewType: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  scrollContent: {
    gap: spacing[3],
    paddingBottom: spacing[7],
  },
  sheetContent: {
    maxHeight: '94%',
  },
  textInput: {
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    minHeight: 48,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
});
