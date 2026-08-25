import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SyncViewModel } from '@/features/sync/view-models/use-sync';
import type { Locale, Translate } from '@/i18n/translations';
import { colors } from '@/theme/colors';

type SyncScreenProps = SyncViewModel & {
  locale: Locale;
  setLocale(locale: Locale): void;
  t: Translate;
};

export function SyncScreen({
  exportPackage,
  importPackage,
  isWorking,
  result,
  error,
  passphrase,
  setPassphrase,
  isConfigured,
  locale,
  setLocale,
  t,
}: SyncScreenProps) {
  return (
    <View style={styles.container}>
      <View accessibilityLabel={t('languageLabel')} style={styles.languagePicker}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('vietnamese')}
          accessibilityState={{ selected: locale === 'vi' }}
          onPress={() => setLocale('vi')}
          style={[styles.languageOption, locale === 'vi' && styles.languageOptionSelected]}
        >
          <Text style={[styles.languageOptionText, locale === 'vi' && styles.languageOptionTextSelected]}>{t('vietnamese')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('english')}
          accessibilityState={{ selected: locale === 'en' }}
          onPress={() => setLocale('en')}
          style={[styles.languageOption, locale === 'en' && styles.languageOptionSelected]}
        >
          <Text style={[styles.languageOptionText, locale === 'en' && styles.languageOptionTextSelected]}>{t('english')}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{t('appTitle')}</Text>
      <Text style={styles.description}>{t('description')}</Text>
      <Text style={styles.label}>{t('passphraseLabel')}</Text>
      <TextInput
        accessibilityLabel={t('passphraseLabel')}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setPassphrase}
        placeholder={t('passphrasePlaceholder')}
        placeholderTextColor={colors.content.placeholder}
        secureTextEntry
        style={styles.passphraseInput}
        value={passphrase}
      />
      {!isConfigured ? <Text accessibilityRole="alert" style={styles.error}>{t('passphraseRequired')}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('exportPackage')}
          accessibilityState={{ disabled: isWorking || !isConfigured }}
          disabled={isWorking || !isConfigured}
          onPress={exportPackage}
          style={({ pressed }) => [styles.primaryAction, (pressed || isWorking) && styles.primaryActionPressed]}
        >
          <Text style={styles.primaryActionText}>{t('exportPackage')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('importPackage')}
          accessibilityState={{ disabled: isWorking || !isConfigured }}
          disabled={isWorking || !isConfigured}
          onPress={importPackage}
          style={({ pressed }) => [styles.secondaryAction, (pressed || isWorking) && styles.secondaryActionPressed]}
        >
          <Text style={styles.secondaryActionText}>{t('importPackage')}</Text>
        </Pressable>
      </View>
      {isWorking ? <Text accessibilityLiveRegion="polite" style={styles.status}>{t('working')}</Text> : null}
      {result !== null ? <Text accessibilityLiveRegion="polite" style={styles.status}>{result}</Text> : null}
      {error !== null ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 32,
    width: '100%',
  },
  container: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  description: {
    color: colors.content.secondary,
    fontSize: 16,
    lineHeight: 24,
  },
  error: {
    color: colors.status.negative,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
  },
  label: {
    color: colors.content.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 24,
  },
  languageOption: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  languageOptionSelected: {
    backgroundColor: colors.brand.primary,
  },
  languageOptionText: {
    color: colors.brand.primaryPressed,
    fontSize: 14,
    fontWeight: '600',
  },
  languageOptionTextSelected: {
    color: colors.content.inverse,
  },
  languagePicker: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.strong,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 24,
    padding: 4,
  },
  passphraseInput: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryActionPressed: {
    backgroundColor: colors.brand.primaryPressed,
  },
  primaryActionText: {
    color: colors.content.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.brand.primary,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryActionPressed: {
    backgroundColor: colors.brand.soft,
  },
  secondaryActionText: {
    color: colors.brand.primaryPressed,
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    color: colors.status.positive,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
  },
  title: {
    color: colors.content.primary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
});
