import { AccessibilityInfo, ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BriefcaseBusiness, CarFront, CircleDollarSign, Gamepad2, Gift, HeartPulse, House, ListChecks, MoreHorizontal, ReceiptText, ShoppingBag, Utensils, WalletCards } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'e-wallet'];

const ACCOUNT_TYPE_KEYS: Record<AccountType, TranslationKey> = {
  cash: 'onboardingAccountTypeCash',
  bank: 'onboardingAccountTypeBank',
  'e-wallet': 'onboardingAccountTypeEwallet',
  'credit-card': 'onboardingAccountTypeCreditCard',
  other: 'onboardingAccountTypeOther',
};

const CATEGORY_COLORS = [colors.category.income, colors.category.shopping, colors.category.food, colors.category.transport, colors.brand.primary, colors.content.muted];

const DEFAULT_CATEGORY_ICONS: Record<string, typeof WalletCards> = {
  'Lương': BriefcaseBusiness,
  'Thưởng': Gift,
  'Thu nhập khác': WalletCards,
  'Ăn uống': Utensils,
  'Di chuyển': CarFront,
  'Nhà ở': House,
  'Hóa đơn & tiện ích': ReceiptText,
  'Mua sắm': ShoppingBag,
  'Giải trí': Gamepad2,
  'Sức khỏe': HeartPulse,
  'Chi tiêu khác': MoreHorizontal,
};

export function getDefaultCategoryIcon(name: string, type: 'income' | 'expense') {
  return DEFAULT_CATEGORY_ICONS[name] ?? (type === 'income' ? CircleDollarSign : ReceiptText);
}

export function OnboardingScreen(props: OnboardingScreenProps) {
  const { loading, step, t } = props;
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  const logoProgress = useRef(new Animated.Value(1)).current;
  const containerStyle = [
    styles.container,
    { paddingBottom: spacing[7] + insets.bottom, paddingTop: spacing[7] + insets.top },
  ];

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

    logoProgress.setValue(0.96);
    Animated.sequence([
      Animated.timing(logoProgress, { duration: 180, easing: Easing.out(Easing.cubic), toValue: 1.04, useNativeDriver: true }),
      Animated.timing(logoProgress, { duration: 140, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [logoProgress, reduceMotion, step]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>{t('onboardingLoading')}</Text>
      </View>
    );
  }

  const content = (
    <>
      <Progress step={step} t={t} />
      <Animated.View key={step} style={[styles.stepTransition, reduceMotion ? null : { opacity: logoProgress }]}>
        {step === 'display-name' ? <DisplayNameStep {...props} /> : null}
        {step === 'first-account' ? <WalletStep {...props} /> : null}
        {step === 'opening-balance' ? <OpeningBalanceStep {...props} /> : null}
        {step === 'confirm-categories' ? <CategoryToggleStep {...props} /> : null}
      </Animated.View>
    </>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoiding}>
      {step === 'confirm-categories' ? (
        <View style={[styles.scroll, containerStyle, styles.fixedContainer]} testID="onboarding-root">
          {content}
        </View>
      ) : (
        <ScrollView contentContainerStyle={containerStyle} keyboardShouldPersistTaps="handled" style={styles.scroll} testID="onboarding-root">
          {content}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function Progress({ step, t }: { step: OnboardingViewModel['step']; t: Translate }) {
  const current = step === 'display-name' ? 1 : step === 'first-account' ? 2 : step === 'opening-balance' ? 3 : 4;
  const total = 4;
  return (
    <View accessibilityLabel={t('onboardingStepProgress', { current, total })} style={styles.progressBlock} testID="onboarding-progress">
      <View style={styles.progressTrack}>
        {[1, 2, 3, 4].map((index) => (
          <View key={index} style={[styles.progressDot, index <= current ? styles.progressDotActive : styles.progressDotInactive]} />
        ))}
      </View>
      <Text style={styles.eyebrow}>{t('onboardingStepProgress', { current, total })}</Text>
    </View>
  );
}

function DisplayNameStep({ displayName, setDisplayName, continueDisplayName, skipDisplayName, submitting, t }: OnboardingScreenProps) {
  return (
    <View style={styles.step} testID="onboarding-step-card">
      <View>
        <Text style={styles.title}>{t('onboardingDisplayNameTitle')}</Text>
        <Text style={styles.description}>{t('onboardingDisplayNameDescription')}</Text>
      </View>
      <View style={styles.inputPanel}>
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
      </View>
      <Text style={styles.helperText}>{t('onboardingDisplayNameHint')}</Text>
      <View style={styles.flexSpacer} />
      <ActionStack
        primaryLabel={t('onboardingContinue')}
        secondaryLabel={t('onboardingSkip')}
        submitting={submitting}
        onPrimary={continueDisplayName}
        onSecondary={skipDisplayName}
      />
    </View>
  );
}

function WalletStep({ accountForm, setAccountName, setAccountType, continueWallet, errors, submitting, t }: OnboardingScreenProps) {
  return (
    <View style={styles.step} testID="onboarding-step-card">
      <StepIcon icon={WalletCards} />
      <Text style={styles.title}>{t('onboardingFirstAccountTitle')}</Text>
      <Text style={styles.description}>{t('onboardingFirstAccountDescription')}</Text>

      <View style={styles.inputPanel}>
        <Text style={styles.label}>{t('onboardingAccountNameLabel')}</Text>
        <TextInput
          accessibilityLabel={t('onboardingAccountNameLabel')}
          onChangeText={setAccountName}
          placeholder={t('onboardingAccountNamePlaceholder')}
          placeholderTextColor={colors.content.placeholder}
          returnKeyType="next"
          style={styles.input}
          value={accountForm.name}
        />
      </View>
      {errors.accountName ? <Text accessibilityRole="alert" style={styles.error}>{errors.accountName}</Text> : null}

      <Text style={styles.accountTypeLabel}>{t('onboardingAccountTypeLabel')}</Text>
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
              style={({ pressed }) => [styles.typeOption, selected && styles.typeOptionSelected, pressed && styles.pressed]}
            >
              <Text style={[styles.typeOptionText, selected && styles.typeOptionTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.flexSpacer} />
      <ActionStack primaryLabel={t('onboardingContinue')} submitting={submitting} onPrimary={continueWallet} />
    </View>
  );
}

function OpeningBalanceStep({ accountForm, setOpeningBalance, continueOpeningBalance, skipOpeningBalance, errors, submitting, t }: OnboardingScreenProps) {
  const walletName = accountForm.name || t('onboardingWalletFallback');
  return (
    <View style={styles.step} testID="onboarding-step-card">
      <StepIcon icon={CircleDollarSign} />
      <Text style={styles.title}>{t('onboardingOpeningBalanceTitle', { walletName })}</Text>
      <Text style={styles.description}>{t('onboardingOpeningBalanceDescription')}</Text>
      <AmountInput
        errorMessage={errors.openingBalance ?? null}
        invalidMessage={t('amountInvalid')}
        label={t('onboardingOpeningBalanceLabel')}
        onChange={setOpeningBalance}
        placeholder={t('amountPlaceholder')}
        value={accountForm.openingBalance}
      />
      {errors.form ? <Text accessibilityRole="alert" style={styles.error}>{errors.form}</Text> : null}
      <View style={styles.flexSpacer} />
      <ActionStack
        primaryLabel={t('onboardingContinue')}
        secondaryLabel={t('onboardingSkip')}
        submitting={submitting}
        onPrimary={continueOpeningBalance}
        onSecondary={skipOpeningBalance}
      />
    </View>
  );
}

function CategoryToggleStep({ categories, categoryToggles, toggleCategory, finishOnboarding, skipCategories, errors, submitting, t }: OnboardingScreenProps) {
  return (
    <View style={styles.step} testID="onboarding-step-card">
      <StepIcon icon={ListChecks} muted />
      <Text style={styles.title}>{t('onboardingConfirmCategoriesTitle')}</Text>
      <Text style={styles.description}>{t('onboardingConfirmCategoriesDescription')}</Text>
      <ScrollView
        contentContainerStyle={styles.categoryPanelContent}
        keyboardShouldPersistTaps="handled"
        style={styles.categoryPanel}
        testID="onboarding-category-scroll"
      >
        {categories.map((category, index) => {
          const enabled = categoryToggles[category.name] !== false;
          const isLast = index === categories.length - 1;
          return (
            <View key={`${category.type}-${category.name}`} style={[styles.categoryToggleRow, isLast && styles.categoryToggleRowLast]}>
              <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }]}>
                {(() => {
                  const Icon = getDefaultCategoryIcon(category.name, category.type);
                  return <Icon color={colors.content.inverse} size={18} />;
                })()}
              </View>
              <Text numberOfLines={1} style={styles.categoryName}>{category.name}</Text>
              <Pressable
                accessibilityLabel={category.name}
                accessibilityRole="switch"
                accessibilityState={{ checked: enabled }}
                onPress={() => toggleCategory(index)}
                style={({ pressed }) => [styles.switchTrack, enabled ? styles.switchTrackOn : styles.switchTrackOff, pressed && styles.pressed]}
              >
                <View style={[styles.switchKnob, enabled ? styles.switchKnobOn : styles.switchKnobOff]} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      {errors.form ? <Text accessibilityRole="alert" style={styles.error}>{errors.form}</Text> : null}
      <ActionStack
        primaryLabel={t('onboardingFinish')}
        secondaryLabel={t('onboardingSkip')}
        submitting={submitting}
        onPrimary={finishOnboarding}
        onSecondary={skipCategories}
      />
    </View>
  );
}

function ActionStack({
  primaryLabel,
  secondaryLabel,
  submitting,
  onPrimary,
  onSecondary,
}: {
  primaryLabel: string;
  secondaryLabel?: string;
  submitting: boolean;
  onPrimary(): void;
  onSecondary?(): void;
}) {
  return (
    <View style={styles.actionsStack}>
      {secondaryLabel && onSecondary ? (
        <Pressable accessibilityLabel={secondaryLabel} accessibilityRole="button" disabled={submitting} onPress={onSecondary} style={({ pressed }) => [styles.skipAction, pressed && styles.pressed]}>
          <Text style={styles.skipActionText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel={primaryLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: submitting }}
        disabled={submitting}
        onPress={onPrimary}
        style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
        testID="onboarding-primary-action"
      >
        {submitting ? <ActivityIndicator color={colors.content.inverse} /> : <Text style={styles.primaryActionText}>{primaryLabel}</Text>}
      </Pressable>
    </View>
  );
}

function StepIcon({ icon: Icon, muted = false }: { icon: typeof WalletCards; muted?: boolean }) {
  return (
    <View style={[styles.stepIcon, muted && styles.stepIconMuted]}>
      <Icon color={muted ? colors.brand.primary : colors.content.inverse} size={26} strokeWidth={2.2} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionsStack: {
    gap: spacing[2],
    marginTop: spacing[4],
  },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  categoryName: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  categoryPanel: {
    backgroundColor: colors.surface.primary,
    flex: 1,
    borderRadius: radius.lg,
    minHeight: 0,
    overflow: 'hidden',
  },
  accountTypeLabel: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  categoryPanelContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  categoryToggleRow: {
    alignItems: 'center',
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 60,
  },
  categoryToggleRowLast: {
    borderBottomWidth: 0,
  },
  container: {
    backgroundColor: colors.surface.canvas,
    flexGrow: 1,
    paddingBottom: spacing[7],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[7],
  },
  fixedContainer: {
    flex: 1,
  },
  description: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    lineHeight: 22,
    marginBottom: spacing[5],
  },
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[2],
  },
  eyebrow: {
    color: colors.content.muted,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    marginTop: spacing[2],
  },
  flexSpacer: {
    flex: 1,
    minHeight: spacing[6],
  },
  helperText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.caption,
    marginTop: spacing[2],
  },
  input: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.semibold,
    minHeight: 34,
    padding: 0,
  },
  inputPanel: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    padding: spacing[4],
    shadowColor: colors.content.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  keyboardAvoiding: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[2],
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface.canvas,
    flex: 1,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.68,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.sm,
    justifyContent: 'center',
    minHeight: 50,
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
  progressBlock: {
    marginBottom: spacing[6],
  },
  progressDot: {
    borderRadius: radius.pill,
    flex: 1,
    height: 4,
  },
  progressDotActive: {
    backgroundColor: colors.content.primary,
  },
  progressDotInactive: {
    backgroundColor: colors.border.subtle,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.brand.primary,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing[4],
  },
  secondaryActionText: {
    color: colors.brand.primaryPressed,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  scroll: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  skipAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[4],
  },
  skipActionText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  step: {
    flex: 1,
  },
  stepIcon: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing[5],
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    width: 56,
  },
  stepIconMuted: {
    backgroundColor: colors.brand.tint,
    shadowOpacity: 0,
  },
  stepTransition: {
    flex: 1,
  },
  switchKnob: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.pill,
    height: 20,
    width: 20,
  },
  switchKnobOff: {
    marginLeft: 3,
  },
  switchKnobOn: {
    marginLeft: 21,
  },
  switchTrack: {
    borderRadius: radius.pill,
    height: 26,
    justifyContent: 'center',
    width: 44,
  },
  switchTrackOff: {
    backgroundColor: colors.border.subtle,
  },
  switchTrackOn: {
    backgroundColor: colors.content.primary,
  },
  title: {
    color: colors.content.primary,
    fontSize: 22,
    fontWeight: typography.weights.bold,
    lineHeight: 28,
    marginBottom: spacing[2],
  },
  typeOption: {
    alignItems: 'center',
    backgroundColor: colors.border.subtle,
    borderRadius: radius.sm,
    justifyContent: 'center',
    minHeight: 36,
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
