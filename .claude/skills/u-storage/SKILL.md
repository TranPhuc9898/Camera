---
name: u-storage
description: 'Local storage — react-native-mmkv v4 for general data, expo-secure-store for tokens. StorageKeys enum, Zustand persist adapter, version/migrate. Triggers — storage, mmkv, secure store, persist, async storage, key value, save locally, cache, token storage.'
---

# u-storage — MMKV + SecureStore

## TL;DR

- **General data** → `react-native-mmkv` v4 (sync, fast, encrypted-at-rest on iOS Keychain key)
- **Auth tokens, refresh tokens, biometric secrets** → `expo-secure-store` (Keychain/Keystore)
- Every key is declared in `StorageKeys` enum (mmkv) or `SECURE_KEYS` enum (secure-store) — NEVER inline `'my-key'`
- Zustand `persist` plugs into MMKV via `mmkvJSONStorage` adapter
- Bumping persisted shape requires `version` + `migrate` (see `u-global-store`)
- DO NOT use AsyncStorage. DO NOT use MMKV for tokens.

## When to load

Adding a new persisted value, choosing storage tier, debugging persist hydration, writing/reading sensitive data.

---

## File map

```
src/lib/storage/
  mmkv.ts                 ← MMKV instance + StorageKeys + JSON adapter
src/lib/auth/
  secure-storage.ts       ← expo-secure-store wrapper + SECURE_KEYS
```

---

## `mmkv.ts`

```ts
import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({
  id: 'unicorn-app',
  encryptionKey: undefined, // optional; v4 supports per-instance encryption
});

export enum StorageKeys {
  onboardingDone = 'onboarding-done',
  recentOrders = 'recent-orders',
  feedFilter = 'feed-filter',
  // ADD ALL NEW KEYS HERE
}

// Zustand persist adapter — JSON wrapper over MMKV
export const mmkvJSONStorage = {
  getItem: (name: string): string | null => storage.getString(name) ?? null,
  setItem: (name: string, value: string): void => storage.set(name, value),
  removeItem: (name: string): void => storage.remove(name),
};
```

**v4 API gotchas:**

- Constructor: `createMMKV({...})` — NOT `new MMKV(...)` (v3)
- Delete: `storage.remove(key)` — NOT `storage.delete(key)`
- Read string: `storage.getString(key)` returns `string | undefined` — coerce with `?? null`

---

## Reading / writing

```ts
import { storage, StorageKeys } from '@/lib/storage/mmkv';

// Boolean
storage.set(StorageKeys.onboardingDone, true);
const done = storage.getBoolean(StorageKeys.onboardingDone);

// String
storage.set(StorageKeys.feedFilter, 'pending');
const filter = storage.getString(StorageKeys.feedFilter);

// JSON object — manually serialize
storage.set(StorageKeys.recentOrders, JSON.stringify(orders));
const raw = storage.getString(StorageKeys.recentOrders);
const orders: Order[] = raw ? JSON.parse(raw) : [];

// Remove
storage.remove(StorageKeys.feedFilter);

// Clear all (rare — sign out uses store reset, not this)
storage.clearAll();
```

---

## Secure storage (tokens)

```ts
// src/lib/auth/secure-storage.ts
import * as SecureStore from 'expo-secure-store';

export enum SECURE_KEYS {
  accessToken = 'access-token',
  refreshToken = 'refresh-token',
  biometricSecret = 'biometric-secret',
}

export const secureStorage = {
  async get(key: SECURE_KEYS): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async set(key: SECURE_KEYS, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async remove(key: SECURE_KEYS): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
  async clear(): Promise<void> {
    for (const k of Object.values(SECURE_KEYS)) {
      await SecureStore.deleteItemAsync(k);
    }
  },
};
```

`expo-secure-store` is async. Call from interceptors, sign-out flows, app startup gating — NOT from render.

---

## Zustand persist with MMKV

```ts
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvJSONStorage } from '@/lib/storage/mmkv';

export const useThemeStore = create<ThemeState>()(
  persist((set) => ({ mode: 'system', setMode: (mode) => set({ mode }) }), {
    name: 'theme-store',
    storage: createJSONStorage(() => mmkvJSONStorage),
    version: 1,
    migrate: (s) => s,
  }),
);
```

`name` becomes the MMKV key (`theme-store`). Storage layer holds the JSON-stringified `{ state, version }` envelope.

---

## Decision: MMKV vs SecureStore

| Data                                   | Where                             |
| -------------------------------------- | --------------------------------- |
| Auth access/refresh tokens             | SecureStore                       |
| Biometric-derived secrets              | SecureStore                       |
| User profile object (cached)           | MMKV                              |
| App settings (theme, language, notifs) | MMKV                              |
| Onboarding flags, feature gates        | MMKV                              |
| Last-seen IDs, recent items            | MMKV                              |
| Server-cached lists (orders, feed)     | TanStack Query cache, NOT storage |

If unsure: anything that, if leaked, would let an attacker impersonate the user → SecureStore.

---

## Migration example

```ts
{
  name: 'settings-store',
  version: 2,
  storage: createJSONStorage(() => mmkvJSONStorage),
  migrate: (persisted: unknown, version: number) => {
    if (version === 1) {
      const old = persisted as { lang: string }
      return { language: old.lang, notificationsEnabled: true }
    }
    return persisted as SettingsState
  },
}
```

---

## Do / Don't

| ✅                                      | ❌                       |
| --------------------------------------- | ------------------------ |
| Add key to `StorageKeys` enum           | Inline `'my-key'`        |
| `createMMKV({...})` (v4)                | `new MMKV(...)` (v3 API) |
| `storage.remove(key)`                   | `storage.delete(key)`    |
| Tokens in SecureStore                   | Tokens in MMKV           |
| `JSON.parse(raw ?? 'null')` defensively | Assume JSON shape        |
| One MMKV instance for whole app         | New instance per feature |

---

## Debugging

```ts
console.log(storage.getAllKeys()); // sees what's persisted
storage.clearAll(); // wipes — use only in dev
```

In Flipper / RN DevTools, MMKV plugin shows live values.

---

## See also

- `u-global-store` — `persist` middleware uses `mmkvJSONStorage`
- `u-controller` — feature stores rarely persist
- `u-api` — interceptor reads `SECURE_KEYS.accessToken` for Authorization header
- `u-security` — storage audit checklist
