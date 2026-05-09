import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'unicorn-app' });

export const StorageKeys = {
  AUTH_TOKEN: 'auth.token',
  AUTH_USER: 'auth.user',
  THEME: 'app.theme',
  LOCALE: 'app.locale',
  ONBOARDED: 'app.onboarded',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
