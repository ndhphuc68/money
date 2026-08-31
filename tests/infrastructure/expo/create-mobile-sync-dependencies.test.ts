jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '550e8400-e29b-41d4-a716-446655440099'),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

import { openTestLocalDatabase } from '@/data/local/db/client';
import { HmacSha256AuthenticationProvider } from '@/data/sync/authentication/hmac-sha256-authentication-provider';
import { StableSyncPackageSerializer } from '@/data/sync/serializers/sync-package-serializer';
import { createMobileSyncDependencies } from '@/infrastructure/expo/sync/create-mobile-sync-dependencies';

describe('createMobileSyncDependencies', () => {
  it('requires an explicit non-empty shared passphrase instead of falling back to a shipped secret', async () => {
    const database = await openTestLocalDatabase();

    try {
      expect(() => createMobileSyncDependencies(database, '')).toThrow(
        'shared passphrase must not be empty',
      );
    } finally {
      await database.close();
    }
  });

  it('authenticates export and import with the supplied shared passphrase', async () => {
    const database = await openTestLocalDatabase();
    const passphrase = 'pairing phrase from the user';
    const serializer = new StableSyncPackageSerializer();
    const dependencies = createMobileSyncDependencies(database, passphrase);

    try {
      const exported = await dependencies.exportSyncPackage.execute();

      expect(
        new HmacSha256AuthenticationProvider(passphrase).verify(
          serializer.authenticationInput(exported),
          exported.authTag,
        ),
      ).toBe(true);
      expect(
        new HmacSha256AuthenticationProvider('offline-first-sync-development').verify(
          serializer.authenticationInput(exported),
          exported.authTag,
        ),
      ).toBe(false);
      await expect(dependencies.importSyncPackage.execute(exported)).resolves.toEqual({
        applied: 0,
        skipped: 0,
        conflicted: 0,
        rejected: 0,
      });
    } finally {
      await database.close();
    }
  });
});
