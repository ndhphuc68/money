import { randomUUID } from 'expo-crypto';

import { canonicalizeUuid, isUuid } from '@/core/domain/sync/sync-operation';
import { SecureStorage } from '@/infrastructure/expo/secure-store/secure-storage';

export type DeviceIdentityStorage = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
};

const DEVICE_ID_STORAGE_KEY = 'offline-first-sync.device-id';

export class DeviceIdentity {
  constructor(private readonly storage: DeviceIdentityStorage = new SecureStorage()) {}

  async get(): Promise<string> {
    const storedIdentity = await this.storage.get(DEVICE_ID_STORAGE_KEY);
    if (storedIdentity !== null && isUuid(storedIdentity)) {
      return canonicalizeUuid(storedIdentity);
    }

    const identity = canonicalizeUuid(randomUUID());
    if (!isUuid(identity)) {
      throw new Error('Device identity generator returned an invalid UUID');
    }

    await this.storage.set(DEVICE_ID_STORAGE_KEY, identity);
    return identity;
  }
}
