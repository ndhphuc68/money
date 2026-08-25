import { eq } from 'drizzle-orm';

import { ProfileSettingsRepository as ProfileSettingsRepositoryPort } from '@/core/application/ports/finance-repositories';
import { createDefaultProfileSettings, ProfileSettings } from '@/core/domain/finance/profile-settings';
import { LocalDatabaseClient } from '@/data/local/db/client';
import { profileSettings } from '@/data/local/schema';

/**
 * Single local-device row of profile preferences. Deliberately NOT part of
 * the sync/change-log system: no SyncOperation is built and no change-log
 * entry is appended for this repository's writes (see design doc, "Profile
 * settings" — device-local only in the MVP).
 */
const LOCAL_ROW_ID = 'local';

export class ProfileSettingsRepository implements ProfileSettingsRepositoryPort {
  constructor(private readonly database: LocalDatabaseClient) {}

  async get(): Promise<ProfileSettings> {
    const row = this.database.db
      .select()
      .from(profileSettings)
      .where(eq(profileSettings.id, LOCAL_ROW_ID))
      .get();

    if (!row) {
      return createDefaultProfileSettings();
    }

    return {
      displayName: row.displayName,
      amountsHidden: row.amountsHidden,
      onboardingCompleted: row.onboardingCompleted,
    };
  }

  async save(settings: ProfileSettings, now: string = new Date().toISOString()): Promise<void> {
    const values = {
      id: LOCAL_ROW_ID,
      displayName: settings.displayName,
      amountsHidden: settings.amountsHidden,
      onboardingCompleted: settings.onboardingCompleted,
      updatedAt: now,
    };

    this.database.db
      .insert(profileSettings)
      .values(values)
      .onConflictDoUpdate({ target: profileSettings.id, set: values })
      .run();
  }
}
