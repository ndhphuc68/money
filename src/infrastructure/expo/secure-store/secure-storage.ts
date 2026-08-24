import * as SecureStore from 'expo-secure-store';

export class SecureStorage {
  get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }

  set(key: string, value: string): Promise<void> {
    return SecureStore.setItemAsync(key, value);
  }
}
