import * as SecureStore from 'expo-secure-store';

export const SecureKeys = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export type SecureKey = (typeof SecureKeys)[keyof typeof SecureKeys];

export const secureStorage = {
  async get(key: SecureKey): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async set(key: SecureKey, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: SecureKey): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};
