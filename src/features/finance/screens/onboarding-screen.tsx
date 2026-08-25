import { AccessibilityInfo, ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { AmountInput } from '@/components/finance';
import type { AccountType } from '@/core/domain/finance/account';
import type { OnboardingViewModel } from '@/features/finance/view-models/use-onboarding';
import type { Locale, Translate, TranslationKey } from '@/i18n/translations';
import { colors, radius, spacing, typography } from '@/theme';

type OnboardingScreenProps = OnboardingViewModel & {
  locale: Locale;
  setLocale(locale: Locale): void;
  t: Translate;
};

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'e-wallet', 'credit-card', 'other'];

const ACCOUNT_TYPE_KEYS: Record<AccountType, TranslationKey> = {
  cash: 'onboardingAccountTypeCash',
  bank: 'onboardingAccountTypeBank',
  'e-wallet': 'onboardingAccountTypeEwallet',
  'credit-card': 'onboardingAccountTypeCreditCard',
  other: 'onboardingAccountTypeOther',
};

export function OnboardingScreen(props: OnboardingScreenProps) {
  const { loading, step, t } = props;
  const [reduceMotion, setReduceMotion] = useState(false);
  const logoProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      logoProgress.setValue(1);
      return;
    }

    logoProgress.setValue(0.94);
    Animated.sequence([
      Animated.timing(logoProgress, { duration: 220, easing: Easing.out(Easing.cubic), toValue: 1.1, useNativeDriver: true }),
      Animated.timing(logoProgress, { duration: 180, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [logoProgress, reduceMotion, step]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>{t('onboardingLoading')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoiding}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <OnboardingHeader locale={props.locale} setLocale={props.setLocale} t={t} logoProgress={logoProgress} />
        <Progress step={step} t={t} />
        <Animated.View
          key={step}
          style={[
            styles.stepTransition,
            reduceMotion
              ? null
              : { opacity: logoProgress.interpolate({ inputRange: [0.94, 1], outputRange: [0, 1] }), transform: [{ translateX: logoProgress.interpolate({ inputRange: [0.94, 1], outputRange: [16, 0] }) }] },
          ]}
        >
          {step === 'display-name' ? <DisplayNameStep {...props} /> : null}
          {step === 'first-account' ? <FirstAccountStep {...props} /> : null}
          {step === 'confirm-categories' ? <ConfirmCategoriesStep {...props} /> : null}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function OnboardingHeader({ locale, setLocale, t, logoProgress }: Pick<OnboardingScreenProps, 'locale' | 'setLocale' | 't'> & { logoProgress: Animated.Value }) {
  return (
    <View style={styles.header}>
      <Animated.Image
        accessibilityLabel={t('appTitle')}
        source={require('../../../../assets/branding/vimo-logo.png')}
        style={[styles.brandLogo, { transform: [{ scale: logoProgress }] }]}
        testID="onboarding-brand-logo"
      />
      <View accessibilityLabel={t('languageLabel')} style={styles.languagePicker}>
        <Pressable
          accessibilityLabel={t('vietnamese')}
          accessibilityRole="button"
          accessibilityState={{ selected: locale === 'vi' }}
          onPress={() => setLocale('vi')}
          style={({ pressed }) => [styles.languageOption, locale === 'vi' && styles.languageOptionSelected, pressed && styles.languageOptionPressed]}
        >
          <Text style={[styles.languageOptionText, locale === 'vi' && styles.languageOptionTextSelected]}>VI</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('english')}
          accessibilityRole="button"
          accessibilityState={{ selected: locale === 'en' }}
          onPress={() => setLocale('en')}
          style={({ pressed }) => [styles.languageOption, locale === 'en' && styles.languageOptionSelected, pressed && styles.languageOptionPressed]}
        >
          <Text style={[styles.languageOptionText, locale === 'en' && styles.languageOptionTextSelected]}>EN</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Progress({ step, t }: { step: OnboardingViewModel['step']; t: Translate }) {
  const current = step === 'display-name' ? 1 : step === 'first-account' ? 2 : 3;
  return (
    <View accessibilityLabel={t('onboardingStepProgress', { current, total: 3 })} style={styles.progressBlock}>
      <View style={styles.progressMeta}>
        <Text style={styles.eyebrow}>{t('onboardingStepProgress', { current, total: 3 })}</Text>
        <Text style={styles.progressPercent}>{Math.round((current / 3) * 100)}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressValue, { width: `${(current / 3) * 100}%` }]} />
      </View>
    </View>
  );
}

function DisplayNameStep({ displayName, setDisplayName, continueDisplayName, skipDisplayName, submitting, t }: OnboardingScreenProps) {
  return (
    <View style={styles.displayNameStep}>
      <View style={styles.displayNameCard}>
        <Text style={styles.title}>{t('onboardingDisplayNameTitle')}</Text>
        <Text style={styles.description}>{t('onboardingDisplayNameDescription')}</Text>
        <Text style={styles.label}>{t('onboardingDisplayNameLabel')}</Text>
        <TextInput
          accessibilityLabel={t('onboardingDisplayNameLabel')}
          autoCapitalize="words"
          autoFocus
          onChangeText={setDisplayName}
          placeholder={t('onboardingDisplayNamePlaceholder')}
          placeholderTextColor={colors.content.placeholder}
          returnKeyType="next"
          style={styles.input}
          value={displayName}
        />
        <Text style={styles.helperText}>{t('onboardingDisplayNameHint')}</Text>
      </View>

      <View style={styles.displayNameActions}>
        <Pressable
          accessibilityLabel={t('onboardingSkip')}
          accessibilityRole="button"
          onPress={skipDisplayName}
          style={({ pressed }) => [styles.skipAction, pressed && styles.skipActionPressed]}
        >
          <Text style={styles.skipActionText}>{t('onboardingSkip')}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('onboardingContinue')}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={continueDisplayName}
          style={({ pressed }) => [styles.displayNamePrimaryAction, pressed && styles.primaryActionPressed]}
        >
          {submitting ? <ActivityIndicator color={colors.content.inverse} /> : <Text style={styles.primaryActionText}>{t('onboardingContinue')}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function FirstAccountStep({
  accountForm,
  setAccountName,
  setAccountType,
  setOpeningBalance,
  continueFirstAccount,
  goBack,
  errors,
  submitting,
  t,
}: OnboardingScreenProps) {
  return (
    <View style={styles.step}>
      <Text style={styles.title}>{t('onboardingFirstAccountTitle')}</Text>
      <Text style={styles.description}>{t('onboardingFirstAccountDescription')}</Text>

      <Text style={styles.label}>{t('onboardingAccountNameLabel')}</Text>
      <TextInput
        accessibilityLabel={t('onboardingAccountNameLabel')}
        onChangeText={setAccountName}
        placeholder={t('onboardingAccountNamePlaceholder')}
        placeholderTextColor={colors.content.placeholder}
        style={styles.input}
        value={accountForm.name}
      />
      {errors.accountName ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errors.accountName}
        </Text>
      ) : null}

      <Text style={styles.label}>{t('onboardingAccountTypeLabel')}</Text>
      <View accessibilityRole="tablist" style={styles.typeRow}>
        {ACCOUNT_TYPES.map((type) => {
          const label = t(ACCOUNT_TYPE_KEYS[type]);
          const selected = type === accountForm.type;
          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={type}
              onPress={() => setAccountType(type)}
              style={[styles.typeOption, selected && styles.typeOptionSelected]}
            >
              <Text style={[styles.typeOptionText, selected && styles.typeOptionTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <AmountInput
        errorMessage={errors.openingBalance ?? null}
        invalidMessage={t('amountInvalid')}
        label={t('onboardingOpeningBalanceLabel')}
        onChange={setOpeningBalance}
        placeholder={t('amountPlaceholder')}
        value={accountForm.openingBalance}
      />

      {errors.form ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errors.form}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={t('onboardingBack')}
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
        >
          <Text style={styles.secondaryActionText}>{t('onboardingBack')}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('onboardingContinue')}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={continueFirstAccount}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
        >
          <Text style={styles.primaryActionText}>{t('onboardingContinue')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ConfirmCategoriesStep({
  categories,
  updateCategoryName,
  removeCategory,
  finishOnboarding,
  skipCategories,
  goBack,
  errors,
  submitting,
  t,
}: OnboardingScreenProps) {
  return (
    <View style={styles.step}>
      <Text style={styles.title}>{t('onboardingConfirmCategoriesTitle')}</Text>
      <Text style={styles.description}>{t('onboardingConfirmCategoriesDescription')}</Text>

      {categories.map((category, index) => (
        <View key={`${category.type}-${index}`} style={styles.categoryRow}>
          <TextInput
            accessibilityLabel={`${t('onboardingCategoryNameLabel')} ${index + 1}`}
            onChangeText={(value) => updateCategoryName(index, value)}
            style={styles.categoryInput}
            value={category.name}
          />
          <Pressable
            accessibilityLabel={`${t('onboardingRemoveCategory')} ${category.name}`}
            accessibilityRole="button"
            onPress={() => removeCategory(index)}
            style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </Pressable>
        </View>
      ))}

      {errors.form ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errors.form}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={t('onboardingBack')}
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
        >
          <Text style={styles.secondaryActionText}>{t('onboardingBack')}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('onboardingSkip')}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={skipCategories}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
        >
          <Text style={styles.secondaryActionText}>{t('onboardingSkip')}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('onboardingFinish')}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={finishOnboarding}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
        >
          <Text style={styles.primaryActionText}>{t('onboardingFinish')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  categoryInput: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  container: {
    backgroundColor: colors.surface.canvas,
    flexGrow: 1,
    padding: spacing[4],
    paddingBottom: spacing[7],
    paddingTop: spacing[5],
  },
  description: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  input: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    marginBottom: spacing[2],
    minHeight: 48,
    paddingHorizontal: spacing[3],
  },
  keyboardAvoiding: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  displayNameStep: {
    flex: 1,
    gap: spacing[5],
  },
  header: {
    alignItems: 'center',
    minHeight: 112,
    position: 'relative',
  },
  brandLogo: {
    height: 96,
    width: 176,
  },
  stepTransition: {
    flex: 1,
  },
  languagePicker: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.pill,
    flexDirection: 'row',
    minHeight: 44,
    padding: 3,
    position: 'absolute',
    right: 0,
    top: spacing[4],
  },
  languageOption: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 42,
    paddingHorizontal: spacing[2],
  },
  languageOptionPressed: {
    opacity: 0.72,
  },
  languageOptionSelected: {
    backgroundColor: colors.surface.primary,
    shadowColor: colors.content.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  languageOptionText: {
    color: colors.content.muted,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  languageOptionTextSelected: {
    color: colors.brand.primary,
  },
  progressBlock: {
    gap: spacing[2],
  },
  progressMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.brand.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  progressPercent: {
    color: colors.content.muted,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  progressTrack: {
    backgroundColor: colors.brand.tint,
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
  },
  progressValue: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    height: '100%',
    width: '33.333%',
  },
  displayNameCard: {
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.strong,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[5],
    shadowColor: colors.content.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  helperText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    marginTop: spacing[1],
  },
  displayNameActions: {
    gap: spacing[2],
  },
  displayNamePrimaryAction: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing[4],
  },
  skipAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[4],
  },
  skipActionPressed: {
    opacity: 0.64,
  },
  skipActionText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[1],
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface.canvas,
    flex: 1,
    justifyContent: 'center',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.sm,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing[4],
  },
  primaryActionPressed: {
    backgroundColor: colors.brand.primaryPressed,
  },
  primaryActionText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  removeButtonPressed: {
    backgroundColor: colors.border.subtle,
  },
  removeButtonText: {
    color: colors.status.negative,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.brand.primary,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing[4],
  },
  secondaryActionPressed: {
    backgroundColor: colors.brand.soft,
  },
  secondaryActionText: {
    color: colors.brand.primaryPressed,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  step: {
    gap: spacing[1],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[1],
  },
  typeOption: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  typeOptionSelected: {
    backgroundColor: colors.content.primary,
  },
  typeOptionText: {
    color: colors.content.muted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  typeOptionTextSelected: {
    color: colors.content.inverse,
    fontWeight: typography.weights.bold,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
});
