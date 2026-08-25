/**
 * Device-local profile preferences. Not a SyncableRecord: the MVP keeps this
 * data on the current device only (see design doc "Profile settings").
 */
export type ProfileSettings = {
  displayName: string;
  /** When true, monetary amounts are masked in the UI. */
  amountsHidden: boolean;
  onboardingCompleted: boolean;
};

export function createDefaultProfileSettings(): ProfileSettings {
  return {
    displayName: '',
    amountsHidden: false,
    onboardingCompleted: false,
  };
}
