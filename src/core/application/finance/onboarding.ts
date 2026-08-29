import {
  AccountRepository,
  CategoryRepository,
  ProfileSettingsRepository,
} from '@/core/application/ports/finance-repositories';
import { Account } from '@/core/domain/finance/account';
import { Category } from '@/core/domain/finance/category';
import { ProfileSettings } from '@/core/domain/finance/profile-settings';

import { CreateAccountRequest, validateCreateAccountRequest } from './create-account';
import { DEFAULT_CATEGORIES, DefaultCategory } from './default-categories';

/**
 * The 4 onboarding steps from the design spec ("Onboarding"): display name,
 * first account, opening balance, confirm default categories. Steps 2+3
 * (first account + opening balance) collapse into one `first-account` step
 * here because `Account` creation already carries `openingBalance` as a
 * single field (see `CreateAccountRequest`) — there is no separate
 * "set opening balance" action to resume into.
 */
export type OnboardingStep = 'display-name' | 'first-account' | 'confirm-categories' | 'completed';

export type OnboardingState = {
  step: OnboardingStep;
  displayName: string;
  hasAccount: boolean;
  onboardingCompleted: boolean;
};

export type OnboardingDeps = {
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  profileSettingsRepository: ProfileSettingsRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

/**
 * Derives the current onboarding step from existing data, since
 * `ProfileSettings` deliberately has no persisted step number (see Task 1/2
 * review notes). Rules:
 *
 * - `onboardingCompleted` true -> 'completed'.
 * - No active account yet -> the display name is optional/skippable and is
 *   the very first thing shown, so: an empty `displayName` reads as "not
 *   yet visited" -> 'display-name'; a non-empty `displayName` reads as
 *   "already saved, move on" -> 'first-account'.
 * - An active account exists but onboarding isn't marked complete ->
 *   'confirm-categories' (the only remaining step).
 *
 * Known limitation: an explicitly-skipped-with-blank-name display-name step
 * is indistinguishable from "never visited". Both resume to 'display-name',
 * which is harmless since that step is optional and skippable again.
 */
function deriveOnboardingState(settings: ProfileSettings, hasAccount: boolean): OnboardingState {
  let step: OnboardingStep;
  if (settings.onboardingCompleted) {
    step = 'completed';
  } else if (!hasAccount) {
    step = settings.displayName.trim() === '' ? 'display-name' : 'first-account';
  } else {
    step = 'confirm-categories';
  }

  return {
    step,
    displayName: settings.displayName,
    hasAccount,
    onboardingCompleted: settings.onboardingCompleted,
  };
}

export class Onboarding {
  constructor(private readonly deps: OnboardingDeps) {}

  async getState(): Promise<OnboardingState> {
    const [settings, accounts] = await Promise.all([
      this.deps.profileSettingsRepository.get(),
      this.deps.accountRepository.listActive(),
    ]);
    return deriveOnboardingState(settings, accounts.length > 0);
  }

  /**
   * App re-entry deliberately restarts an incomplete onboarding flow instead
   * of resuming the last derived wizard step.
   */
  async resume(): Promise<OnboardingState> {
    const state = await this.getState();
    if (state.onboardingCompleted) {
      return state;
    }

    return { ...state, step: 'display-name' };
  }

  async saveDisplayName(displayName: string): Promise<ProfileSettings> {
    const current = await this.deps.profileSettingsRepository.get();
    const updated: ProfileSettings = { ...current, displayName: displayName.trim() };
    await this.deps.profileSettingsRepository.save(updated);
    return updated;
  }

  async createFirstAccount(input: CreateAccountRequest): Promise<Account> {
    validateCreateAccountRequest(input);

    return this.deps.accountRepository.create({
      id: this.deps.generateId(),
      operationId: this.deps.generateId(),
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
      name: input.name.trim(),
      type: input.type,
      openingBalance: input.openingBalance,
    });
  }

  /**
   * Creates the (optionally edited) default categories and marks onboarding
   * complete. Cannot finish until at least one account exists.
   */
  async confirmDefaults(selection: DefaultCategory[] = DEFAULT_CATEGORIES): Promise<Category[]> {
    const accounts = await this.deps.accountRepository.listActive();
    if (accounts.length === 0) {
      throw new Error('Onboarding cannot finish before the first account is created');
    }

    const created: Category[] = [];
    for (const category of selection) {
      const record = await this.deps.categoryRepository.create({
        id: this.deps.generateId(),
        operationId: this.deps.generateId(),
        originDeviceId: this.deps.deviceId,
        now: this.deps.now(),
        name: category.name,
        type: category.type,
      });
      created.push(record);
    }

    const settings = await this.deps.profileSettingsRepository.get();
    await this.deps.profileSettingsRepository.save({ ...settings, onboardingCompleted: true });

    return created;
  }
}
