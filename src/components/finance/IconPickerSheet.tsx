import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { X } from 'lucide-react-native';

import { PillChip, Sheet } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';
import {
  CATEGORY_ICON_GROUPS,
  CATEGORY_ICON_REGISTRY,
  type CategoryIconDefinition,
  type IconGroup,
} from './category-icon-registry';
import { CategoryIcon } from './icons';

export type IconPickerSheetProps = {
  visible: boolean;
  selectedIcon: string;
  selectedColor?: string;
  onSelectIcon: (iconId: string) => void;
  onClose: () => void;
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export function IconPickerSheet({
  visible,
  selectedIcon,
  selectedColor = '#2F6FED',
  onSelectIcon,
  onClose,
}: IconPickerSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<IconGroup | 'all'>('all');

  const filteredIcons = useMemo(() => {
    const query = normalizeText(searchQuery.trim());
    return CATEGORY_ICON_REGISTRY.filter((item) => {
      if (selectedGroup !== 'all' && item.category !== selectedGroup) {
        return false;
      }
      if (!query) return true;

      const matchNameVi = normalizeText(item.nameVi).includes(query);
      const matchNameEn = normalizeText(item.nameEn).includes(query);
      const matchTags = item.tags.some((tag) => normalizeText(tag).includes(query));
      return matchNameVi || matchNameEn || matchTags;
    });
  }, [searchQuery, selectedGroup]);

  const handleSelect = (iconId: string) => {
    onSelectIcon(iconId);
    onClose();
  };

  return (
    <Sheet
      closeLabel="Đóng"
      onClose={onClose}
      title="Chọn biểu tượng"
      visible={visible}
      style={styles.sheetContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome6 color={colors.content.muted} name="magnifying-glass" size={16} />
        <TextInput
          accessibilityLabel="Tìm kiếm biểu tượng"
          onChangeText={setSearchQuery}
          placeholder="Tìm kiếm biểu tượng..."
          placeholderTextColor={colors.content.muted}
          style={styles.searchInput}
          value={searchQuery}
        />
        {searchQuery.length > 0 ? (
          <Pressable
            accessibilityLabel="Xóa tìm kiếm"
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchButton}>
            <X color={colors.content.muted} size={16} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          contentContainerStyle={styles.tabsContainer}
          horizontal
          showsHorizontalScrollIndicator={false}>
          <PillChip
            active={selectedGroup === 'all'}
            label="Tất cả"
            onPress={() => setSelectedGroup('all')}
          />
          {CATEGORY_ICON_GROUPS.map((group) => (
            <PillChip
              active={selectedGroup === group.id}
              key={group.id}
              label={group.labelVi}
              onPress={() => setSelectedGroup(group.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Icons Grid */}
      <FlatList<CategoryIconDefinition>
        contentContainerStyle={styles.gridContent}
        data={filteredIcons}
        keyExtractor={(item) => item.id}
        numColumns={5}
        renderItem={({ item }) => {
          const isSelected = item.id === selectedIcon;
          return (
            <View style={styles.iconCell}>
              <Pressable
                accessibilityLabel={`Biểu tượng ${item.nameVi}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelect(item.id)}
                style={({ pressed }) => [
                  styles.iconButton,
                  isSelected && {
                    borderColor: selectedColor,
                    borderWidth: 2,
                    backgroundColor: colors.surface.muted,
                  },
                  pressed && styles.iconButtonPressed,
                ]}>
                <CategoryIcon
                  color={isSelected ? selectedColor : colors.content.muted}
                  icon={item.id}
                  size={36}
                />
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Không tìm thấy biểu tượng phù hợp</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  clearSearchButton: {
    padding: spacing[1],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[7],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
  },
  gridContent: {
    gap: spacing[2],
    paddingBottom: spacing[4],
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  iconButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  iconCell: {
    alignItems: 'center',
    flex: 1 / 5,
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  list: {
    maxHeight: 340,
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  searchInput: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    padding: 0,
  },
  sheetContent: {
    maxHeight: '88%',
  },
  tabsContainer: {
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  tabsWrapper: {
    marginBottom: spacing[3],
  },
});
