---
name: u-global-store
description: 'App-wide Zustand stores under src/lib/<concern>/ — auth, theme, connectivity, settings. Persistence via MMKV adapter, migration/version, sign-out reset orchestration. Triggers — global store, auth store, theme store, settings store, persist, migrate, version, sign out, reset all stores.'
---

# u-global-store — App-wide Zustand Stores

## TL;DR

- Global stores live under `src/lib/<concern>/<concern>-store.ts`: `auth-store`, `theme-store`, `connectivity-store`, `settings-store`
- Persisted via Zustand `persist` middleware + MMKV adapter (`mmkvJSONStorage`)
- Every persisted store MUST declare `version` and `migrate` — even at v1 (placeholder `(s) => s`)
- Auth store owns the sign-out reset orchestration: it calls `reset()` on every other persisted store
- Tokens are NOT in Zustand — they live in `expo-secure-store` (see `u-storage`)

## When to load

Adding a new global concern (theme, settings, locale), bumping store version, fixing persist hydration, designing sign-out cleanup.

---

## Folder layout

```
src/lib/auth/
  auth-store.ts            ← user info, isAuthenticated
  secure-storage.ts        ← expo-secure-store wrapper for tokens
  token-manager.ts         ← refresh-token logic

src/lib/theme/
  theme-store.ts           ← 'light' | 'dark' | 'system'

src/lib/connectivity/
  connectivity-store.ts    ← isOnline, type ('wifi' | 'cellular' | 'none')

src/lib/settings/
  settings-store.ts        ← language, notifications, biometrics
```

---

## Auth store template

```ts
// src/lib/auth/auth-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvJSONStorage } from '@/lib/storage/mmkv';
import { secureStorage } from './secure-storage';
import { resetAllPersistedStores } from '@/lib/store-registry';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: AuthUser | null;
  isHydrated: boolean;
}

interface AuthActions {
  setUser: (u: AuthUser) => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

const initial: AuthState = { user: null, isHydrated: false };

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initial,
      setUser: (user) => set({ user }),
      signOut: async () => {
        await secureStorage.clear();
        resetAllPersistedStores();
      },
      reset: () => set(initial),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => mmkvJSONStorage),
      partialize: (s) => ({ user: s.user }),
      version: 1,
      migrate: (persisted, _version) => persisted,
      onRehydrateStorage: () => (state) =>
        state?.isHydrated || useAuthStore.setState({ isHydrated: true }),
    },
  ),
);

export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.user !== null);
```

---

## Store registry — sign-out orchestration

```ts
// src/lib/store-registry.ts
type Resettable = { getState: () => { reset: () => void } };
const registry = new Set<Resettable>();

export function registerStore(s: Resettable) {
  registry.add(s);
}

export function resetAllPersistedStores() {
  for (const s of registry) s.getState().reset();
}
```

Each persisted store registers itself at module load:

```ts
// at the bottom of theme-store.ts
registerStore(useThemeStore);
```

Auth's `signOut` calls `resetAllPersistedStores` — every store snaps back to its `initial`. This avoids the sign-out-leaks-state class of bugs.

---

## Migration

When you change persisted shape:

```ts
{
  name: 'auth-store',
  version: 2,                                    // bump
  migrate: (persisted: unknown, version: number) => {
    if (version === 1) {
      const old = persisted as { user: { id: string; name: string } }
      return { user: { id: old.user.id, displayName: old.user.name, email: '' } }
    }
    return persisted as AuthState
  },
  storage: createJSONStorage(() => mmkvJSONStorage),
}
```

If migration is impossible → return `initial` state, user gets logged out cleanly.

---

## Theme store (simpler example)

```ts
// src/lib/theme/theme-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvJSONStorage } from '@/lib/storage/mmkv';
import { registerStore } from '@/lib/store-registry';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  reset: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
      reset: () => set({ mode: 'system' }),
    }),
    {
      name: 'theme-store',
      storage: createJSONStorage(() => mmkvJSONStorage),
      version: 1,
      migrate: (s) => s,
    },
  ),
);

registerStore(useThemeStore);
export const useThemeMode = () => useThemeStore((s) => s.mode);
```

---

## Hydration gate

Persisted state hydrates ASYNC on first launch. UI must wait for `isHydrated` before deciding auth-protected routes:

```tsx
// app/_layout.tsx
const isHydrated = useAuthStore((s) => s.isHydrated);
if (!isHydrated) return <SplashScreen />;
return <Stack> ... </Stack>;
```

For non-auth stores: hydration race usually doesn't matter. For auth: ALWAYS gate.

---

## Do / Don't

| ✅                                         | ❌                                   |
| ------------------------------------------ | ------------------------------------ |
| `partialize` to exclude transient flags    | Persist `isHydrated`, `isLoading`    |
| Tokens in `expo-secure-store`              | Tokens in MMKV / Zustand             |
| Always declare `version` + `migrate`       | Skip migrate "until we need it"      |
| `registerStore(useX)` at module load       | Manually call resets in components   |
| Selector hooks (`useUser`, `useThemeMode`) | Components subscribe to whole store  |
| Reset all on sign-out                      | Leave per-feature state across users |

---

## Connectivity store (no persist)

```ts
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

interface ConnectivityState {
  isOnline: boolean;
  type: string | null;
}

export const useConnectivityStore = create<ConnectivityState>(() => ({
  isOnline: true,
  type: null,
}));

NetInfo.addEventListener((s) => {
  useConnectivityStore.setState({ isOnline: !!s.isConnected, type: s.type });
});

export const useIsOnline = () => useConnectivityStore((s) => s.isOnline);
```

No persist — runtime-only state.

---

## See also

- `u-controller` — feature-local stores follow same pattern, no register
- `u-storage` — `mmkvJSONStorage` adapter and `expo-secure-store` for tokens
- `u-architecture` — global concerns belong in `src/lib/<concern>/`
- `u-reactive-state` — when global vs feature vs `useState`
