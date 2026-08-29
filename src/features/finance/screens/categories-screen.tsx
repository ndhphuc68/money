import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SettingsViewModel } from '@/features/finance/view-models/use-settings';
import type { Translate } from '@/i18n/translations';
export function CategoriesScreen({
  t,
  ...p
}: SettingsViewModel & { t: Translate; onBack(): void }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text>{t('categoriesTitle')}</Text>
      <TextInput
        accessibilityLabel={t('categoriesNameLabel')}
        placeholder={t('categoriesNamePlaceholder')}
        value={p.categoryName}
        onChangeText={p.setCategoryName}
      />
      <Pressable accessibilityLabel={t('categoriesAdd')} onPress={() => void p.addCategory()}>
        <Text>{t('categoriesAdd')}</Text>
      </Pressable>
      <Pressable accessibilityLabel={t('categoriesSave')} onPress={() => void p.saveCategory()}>
        <Text>{t('categoriesSave')}</Text>
      </Pressable>
      {p.categories.length === 0 ? (
        <Text>{t('categoriesEmpty')}</Text>
      ) : (
        p.categories.map((c) => (
          <View key={c.id}>
            <Text>{c.name}</Text>
            <Pressable
              accessibilityLabel={t('categoriesEditLabel', { name: c.name })}
              onPress={() => p.beginEditCategory(c)}>
              <Text>{t('categoriesEditLabel', { name: c.name })}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t('categoriesHideLabel', { name: c.name })}
              onPress={() =>
                Alert.alert(
                  t('categoriesHideConfirmTitle'),
                  t('categoriesHideConfirmMessage', { name: c.name }),
                  [
                    { text: t('categoriesHideConfirmCancel'), style: 'cancel' },
                    {
                      text: t('categoriesHideConfirmConfirm'),
                      style: 'destructive',
                      onPress: () => void p.hideCategory(c.id),
                    },
                  ],
                )
              }>
              <Text>{t('categoriesHideLabel', { name: c.name })}</Text>
            </Pressable>
          </View>
        ))
      )}
      <Pressable accessibilityLabel={t('settingsBack')} onPress={p.onBack}>
        <Text>{t('settingsBack')}</Text>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({ container: { gap: 12, padding: 16 } });
