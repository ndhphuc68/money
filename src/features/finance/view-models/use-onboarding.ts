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

export type OnboardingViewModel = {
  loading: boolean;
  submitting: boolean;
  step: OnboardingStep;
  displayName: string;
  setDisplayName(value: string): void;
  continueDisplayName(): Promise<void>;
  skipDisplayName(): void;
  accountForm: AccountFormValues;
  setAccountName(value: string): void;
  setAccountType(value: AccountType): void;
  setOpeningBalance(value: number | null): void;
  continueFirstAccount(): Promise<void>;
  categories: DefaultCategory[];
  updateCategoryName(index: number, name: string): void;
  removeCategory(index: number): void;
  finishOnboarding(): Promise<void>;
  skipCategories(): Promise<void>;
  goBack(): void;
  errors: OnboardingErrors;
};

export type UseOnboardingOptions = {
  onboarding: OnboardingDependencies;
  t: Translate;
  /** Called once when onboarding reaches (or resumes at) the completed state. */
  onComplete?: () => void;
};

/**
 * Thin UI view model over `Onboarding` (Task 4): loads/resumes the
 * persisted step on mount, then drives the wizard's 4 steps (display name,
 * first account, opening balance, confirm default categories) locally so
 * "skip" and "back" don't require re-deriving state from storage on every
 * keystroke. All state-derivation logic (what step a fresh vs. resumed
 * profile starts at) stays in `Onboarding`; this hook never reimplements it.
 */
export function useOnboarding({ onboarding, t, onComplete }: UseOnboardingOptions): OnboardingViewModel {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<OnboardingStep>('display-name');
  const [displayName, setDisplayName] = useState('');
  const [accountForm, setAccountForm] = useState<AccountFormValues>({ name: '', type: 'cash', openingBalance: null });
  const [categories, setCategories] = useState<DefaultCategory[]>(DEFAULT_CATEGORIES);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;

    onboarding.resume().then((state) => {
      if (cancelled) {
        return;
      }
      setStep(state.step);
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

  const continueFirstAccount = useCallback(async () => {
    const nextErrors: OnboardingErrors = {};
    if (accountForm.name.trim() === '') {
      nextErrors.accountName = t('onboardingAccountNameRequired');
    }
    if (accountForm.openingBalance === null) {
      nextErrors.openingBalance = t('onboardingOpeningBalanceRequired');
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const request: CreateAccountRequest = {
      name: accountForm.name.trim(),
      type: accountForm.type,
      openingBalance: accountForm.openingBalance as number,
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
  }, [accountForm, onboarding, t]);

  const updateCategoryName = useCallback((index: number, name: string) => {
    setCategories((current) => current.map((category, i) => (i === index ? { ...category, name } : category)));
  }, []);

  const removeCategory = useCallback((index: number) => {
    setCategories((current) => current.filter((_, i) => i !== index));
  }, []);

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

  const finishOnboarding = useCallback(() => complete(categories), [complete, categories]);
  const skipCategories = useCallback(() => complete(undefined), [complete]);

  const goBack = useCallback(() => {
    setStep((current) => {
      if (current === 'confirm-categories') {
        return 'first-account';
      }
      if (current === 'first-account') {
        return 'display-name';
      }
      return current;
    });
  }, []);

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
    continueFirstAccount,
    categories,
    updateCategoryName,
    removeCategory,
    finishOnboarding,
    skipCategories,
    goBack,
    errors,
  };
}
