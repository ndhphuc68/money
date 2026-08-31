import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react-native';

import { Card, IconButton } from '@/components/base';
import {
  CategoryFormSheet,
  CategoryIcon,
  SegmentedControl,
  type CategoryFormData,
} from '@/components/finance';
import type { Category, CategoryType } from '@/core/domain/finance/category';
import type { SettingsViewModel } from '@/features/finance/view-models/use-settings';
import type { Translate } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type CategoriesScreenProps = SettingsViewModel & {
  t: Translate;
  onBack(): void;
};

export function CategoriesScreen({ t, onBack, ...p }: CategoriesScreenProps) {
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const filteredCategories = useMemo(() => {
    return p.categories.filter((c) => c.type === activeTab && !c.isArchived);
  }, [p.categories, activeTab]);

  const handleOpenAdd = () => {
    setSelectedCategory(null);
    setFormSheetVisible(true);
  };

  const handleOpenEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormSheetVisible(true);
  };

  const handleHideConfirm = (category: Category) => {
    Alert.alert(
      t('categoriesHideConfirmTitle'),
      t('categoriesHideConfirmMessage', { name: category.name }),
      [
        { text: t('categoriesHideConfirmCancel'), style: 'cancel' },
        {
          text: t('categoriesHideConfirmConfirm'),
          style: 'destructive',
          onPress: () => void p.hideCategory(category.id),
        },
      ],
    );
  };

  const handleSaveCategory = async (data: CategoryFormData) => {
    await p.saveCategoryData(data);
    setFormSheetVisible(false);
    setSelectedCategory(null);
  };

  const tabOptions = [t('categoriesTabExpense'), t('categoriesTabIncome')] as const;
  const currentTabLabel =
    activeTab === 'expense' ? t('categoriesTabExpense') : t('categoriesTabIncome');

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          accessibilityLabel={t('settingsBack')}
          backgroundColor={colors.surface.primary}
          icon={<ChevronLeft color={colors.content.primary} size={24} strokeWidth={2.4} />}
          onPress={onBack}
          pressedBackgroundColor={colors.surface.muted}
          style={shadows.card}
        />
        <Text style={styles.headerTitle}>{t('categoriesTitle')}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabSection}>
        <SegmentedControl
          onChange={(val) => {
            setActiveTab(val === t('categoriesTabIncome') ? 'income' : 'expense');
          }}
          options={tabOptions}
          value={currentTabLabel}
        />
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('categoriesEmpty')}</Text>
          </View>
        ) : (
          <Card elevation="card" padding={0} style={styles.cardList}>
            {filteredCategories.map((c, index) => (
              <View
                key={c.id}
                style={[
                  styles.categoryRow,
                  index < filteredCategories.length - 1 && styles.rowDivider,
                ]}>
                <CategoryIcon color={c.color} icon={c.icon} size={42} />

                <Text numberOfLines={1} style={styles.categoryName}>
                  {c.name}
                </Text>

                <View style={styles.actionsGroup}>
                  <Pressable
                    accessibilityLabel={t('categoriesEditLabel', { name: c.name })}
                    accessibilityRole="button"
                    onPress={() => handleOpenEdit(c)}
                    style={({ pressed }) => [
                      styles.actionIconButton,
                      pressed && styles.actionIconButtonPressed,
                    ]}>
                    <Pencil color={colors.content.secondary} size={18} strokeWidth={2} />
                  </Pressable>

                  <Pressable
                    accessibilityLabel={t('categoriesHideLabel', { name: c.name })}
                    accessibilityRole="button"
                    onPress={() => handleHideConfirm(c)}
                    style={({ pressed }) => [
                      styles.actionIconButton,
                      pressed && styles.actionIconButtonPressed,
                    ]}>
                    <Trash2 color={colors.status.negative} size={18} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      {/* Synchronized Vela Bottom CTA */}
      <View style={styles.ctaWrapper}>
        <Pressable
          accessibilityLabel={t('categoriesAdd')}
          accessibilityRole="button"
          onPress={handleOpenAdd}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <View>
            <Text style={styles.ctaTitle}>{t('categoriesAdd')}</Text>
            <Text style={styles.ctaSubtitle}>
              {activeTab === 'expense'
                ? 'Thêm danh mục chi tiêu mới'
                : 'Thêm danh mục thu nhập mới'}
            </Text>
          </View>
          <Text style={styles.ctaIcon}>+</Text>
        </Pressable>
      </View>

      {/* Category Create/Edit Sheet */}
      <CategoryFormSheet
        editingCategory={selectedCategory}
        onClose={() => {
          setFormSheetVisible(false);
          setSelectedCategory(null);
        }}
        onSave={handleSaveCategory}
        visible={formSheetVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionIconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  actionIconButtonPressed: {
    backgroundColor: colors.border.subtle,
  },
  actionsGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  cardList: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  categoryName: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 68,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  cta: {
    alignItems: 'center',
    backgroundColor: colors.content.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: spacing[4],
  },
  ctaIcon: {
    color: colors.content.inverse,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaSubtitle: {
    color: colors.border.strong,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  ctaTitle: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  ctaWrapper: {
    bottom: 0,
    left: 0,
    padding: spacing[4],
    position: 'absolute',
    right: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[7],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: 58,
  },
  headerTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
  listContainer: {
    padding: spacing[4],
    paddingBottom: 100,
  },
  root: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  tabSection: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
});
