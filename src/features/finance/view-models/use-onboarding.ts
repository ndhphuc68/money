import { useCallback, useEffect, useRef, useState } from 'react';

import type { CreateAccountRequest } from '@/core/application/finance/create-account';
import { DEFAULT_CATEGORIES, DefaultCategory } from '@/core/application/finance/default-categories';
import type { Onboarding, OnboardingStep } from '@/core/application/finance/onboarding';
import type { AccountType } from '@/core/domain/finance/account';
import type { Translate } from '@/i18n/translations';

/** The subset of `Onboarding` (Task 4) this view model drives. */
export type OnboardingDependencies = Pick<
  Onboarding,
  'resume' | 'saveDisplayName' | 'createFirstAccount' | 'confirmDefaults'
>;

export type AccountFormValues = {
  name: string;
  type: AccountType;
  openingBalance: number | null;
};

export type OnboardingErrors = {
  accountName?: string;
  openingBalance?: string;
  form?: string;
};

export type OnboardingUiStep = 'display-name' | 'first-account' | 'opening-balance' | 'confirm-categories' | 'completed';

export type OnboardingViewModel = {
  loading: boolean;
  submitting: boolean;
  step: OnboardingUiStep;
  displayName: string;
  setDisplayName(value: string): void;
  continueDisplayName(): Promise<void>;
  skipDisplayName(): void;
  accountForm: AccountFormValues;
  setAccountName(value: string): void;
  setAccountType(value: AccountType): void;
  setOpeningBalance(value: number | null): void;
  continueWallet(): Promise<void>;
  continueFirstAccount(): Promise<void>;
  skipOpeningBalance(): void;
  continueOpeningBalance(): Promise<void>;
  categories: DefaultCategory[];
  categoryToggles: Record<string, boolean>;
  toggleCategory(index: number): void;
  updateCategoryName(index: number, name: string): void;
  removeCategory(index: number): void;
  finishOnboarding(): Promise<void>;
  skipCategories(): Promise<void>;
  goBack(): void;
  showExitConfirm: boolean;
  requestExit(): void;
  cancelExit(): void;
  confirmExit(): void;
  errors: OnboardingErrors;
};

export type UseOnboardingOptions = {
  onboarding: OnboardingDependencies;
  t: Translate;
  /** Called once when onboarding reaches (or resumes at) the completed state. */
  onComplete?: () => void;
};

function toUiStep(step: OnboardingStep): OnboardingUiStep {
  return step;
}

function createDefaultCategoryToggles() {
  return Object.fromEntries(DEFAULT_CATEGORIES.map((category) => [category.name, true]));
}

/**
 * Thin UI view model over `Onboarding` (Task 4): loads/resumes the
 * entry state on mount, then drives the wizard's 4 steps (display name,
 * first account, opening balance, confirm default categories) locally so
 * "skip" and "back" don't require re-deriving state from storage on every
 * keystroke. Re-entry behavior stays in `Onboarding`: completed profiles
 * leave the wizard; incomplete profiles restart from display name.
 */
export function useOnboarding({ onboarding, t, onComplete }: UseOnboardingOptions): OnboardingViewModel {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<OnboardingUiStep>('display-name');
  const [displayName, setDisplayName] = useState('');
  const [accountForm, setAccountForm] = useState<AccountFormValues>({ name: '', type: 'cash', openingBalance: null });
  const [categories, setCategories] = useState<DefaultCategory[]>(DEFAULT_CATEGORIES);
  const [categoryToggles, setCategoryToggles] = useState<Record<string, boolean>>(createDefaultCategoryToggles);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;

    onboarding.resume().then((state) => {
      if (cancelled) {
        return;
      }
      setStep(toUiStep(state.step));
      setDisplayName(state.displayName);
      setLoading(false);
      if (state.step === 'completed') {
        onCompleteRef.current?.();
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding]);

  const continueDisplayName = useCallback(async () => {
    setSubmitting(true);
    try {
      await onboarding.saveDisplayName(displayName);
      setStep('first-account');
    } finally {
      setSubmitting(false);
    }
  }, [onboarding, displayName]);

  const skipDisplayName = useCallback(() => {
    setStep('first-account');
  }, []);

  const setAccountName = useCallback((value: string) => {
    setAccountForm((current) => ({ ...current, name: value }));
  }, []);

  const setAccountType = useCallback((value: AccountType) => {
    setAccountForm((current) => ({ ...current, type: value }));
  }, []);

  const setOpeningBalance = useCallback((value: number | null) => {
    setAccountForm((current) => ({ ...current, openingBalance: value }));
  }, []);

  const continueWallet = useCallback(async () => {
    const nextErrors: OnboardingErrors = {};
    if (accountForm.name.trim() === '') {
      nextErrors.accountName = t('onboardingAccountNameRequired');
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setErrors({});
    setStep('opening-balance');
  }, [accountForm.name, t]);

  const createAccountAndAdvance = useCallback(
    async (openingBalance: number) => {
    const request: CreateAccountRequest = {
      name: accountForm.name.trim(),
      type: accountForm.type,
      openingBalance,
    };

    setSubmitting(true);
    try {
      await onboarding.createFirstAccount(request);
      setErrors({});
      setStep('confirm-categories');
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : t('onboardingGenericError') });
    } finally {
      setSubmitting(false);
    }
    },
    [accountForm.name, accountForm.type, onboarding, t],
  );

  const continueOpeningBalance = useCallback(async () => {
    await createAccountAndAdvance(accountForm.openingBalance ?? 0);
  }, [accountForm.openingBalance, createAccountAndAdvance]);

  const skipOpeningBalance = useCallback(() => {
    setAccountForm((current) => ({ ...current, openingBalance: 0 }));
    void createAccountAndAdvance(0);
  }, [createAccountAndAdvance]);

  const updateCategoryName = useCallback((index: number, name: string) => {
    setCategories((current) => current.map((category, i) => (i === index ? { ...category, name } : category)));
  }, []);

  const removeCategory = useCallback((index: number) => {
    setCategories((current) => current.filter((_, i) => i !== index));
  }, []);

  const toggleCategory = useCallback((index: number) => {
    setCategoryToggles((current) => {
      const category = categories[index];
      if (!category) {
        return current;
      }
      return { ...current, [category.name]: !current[category.name] };
    });
  }, [categories]);

  const complete = useCallback(
    async (selection?: DefaultCategory[]) => {
      setSubmitting(true);
      try {
        await onboarding.confirmDefaults(selection);
        setStep('completed');
        onCompleteRef.current?.();
      } catch (cause) {
        setErrors({ form: cause instanceof Error ? cause.message : t('onboardingGenericError') });
      } finally {
        setSubmitting(false);
      }
    },
    [onboarding, t],
  );

  const finishOnboarding = useCallback(
    () => complete(categories.filter((category) => categoryToggles[category.name] !== false)),
    [complete, categories, categoryToggles],
  );
  const skipCategories = useCallback(() => complete(undefined), [complete]);

  const goBack = useCallback(() => {
    setStep((current) => {
      if (current === 'confirm-categories') {
        return 'opening-balance';
      }
      if (current === 'opening-balance') {
        return 'first-account';
      }
      if (current === 'first-account') {
        return 'display-name';
      }
      return current;
    });
  }, []);

  const resetLocalFields = useCallback(() => {
    setStep('display-name');
    setDisplayName('');
    setAccountForm({ name: '', type: 'cash', openingBalance: null });
    setCategories(DEFAULT_CATEGORIES);
    setCategoryToggles(createDefaultCategoryToggles());
    setErrors({});
    setShowExitConfirm(false);
  }, []);

  const requestExit = useCallback(() => setShowExitConfirm(true), []);
  const cancelExit = useCallback(() => setShowExitConfirm(false), []);
  const confirmExit = useCallback(() => resetLocalFields(), [resetLocalFields]);

  return {
    loading,
    submitting,
    step,
    displayName,
    setDisplayName,
    continueDisplayName,
    skipDisplayName,
    accountForm,
    setAccountName,
    setAccountType,
    setOpeningBalance,
    continueWallet,
    continueFirstAccount: continueWallet,
    skipOpeningBalance,
    continueOpeningBalance,
    categories,
    categoryToggles,
    toggleCategory,
    updateCategoryName,
    removeCategory,
    finishOnboarding,
    skipCategories,
    goBack,
    showExitConfirm,
    requestExit,
    cancelExit,
    confirmExit,
    errors,
  };
}
