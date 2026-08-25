import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>{t('onboardingLoading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {step === 'display-name' ? <DisplayNameStep {...props} /> : null}
      {step === 'first-account' ? <FirstAccountStep {...props} /> : null}
      {step === 'confirm-categories' ? <ConfirmCategoriesStep {...props} /> : null}
    </ScrollView>
  );
}

function DisplayNameStep({ displayName, setDisplayName, continueDisplayName, skipDisplayName, submitting, t }: OnboardingScreenProps) {
  return (
    <View style={styles.step}>
      <Text style={styles.title}>{t('onboardingDisplayNameTitle')}</Text>
      <Text style={styles.description}>{t('onboardingDisplayNameDescription')}</Text>
      <Text style={styles.label}>{t('onboardingDisplayNameLabel')}</Text>
      <TextInput
        accessibilityLabel={t('onboardingDisplayNameLabel')}
        onChangeText={setDisplayName}
        placeholder={t('onboardingDisplayNamePlaceholder')}
        placeholderTextColor={colors.content.placeholder}
        style={styles.input}
        value={displayName}
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={t('onboardingSkip')}
          accessibilityRole="button"
          onPress={skipDisplayName}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
        >
          <Text style={styles.secondaryActionText}>{t('onboardingSkip')}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('onboardingContinue')}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={continueDisplayName}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
        >
          <Text style={styles.primaryActionText}>{t('onboardingContinue')}</Text>
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
