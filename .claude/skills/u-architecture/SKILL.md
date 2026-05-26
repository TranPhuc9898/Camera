---
name: u-architecture
description: Clean Architecture layer rules, file placement, store registration, route grouping, and DI patterns for the unicorn Expo/RN app. Triggers — layer violation, layer boundaries, file placement, where does X go, route grouping, store registration, DI, dependency injection, architecture question, screen calls api directly, repository optional, use case structure.
---

# u-architecture — Clean Architecture for unicorn

## TL;DR

- 3 layers, strict direction: **Presentation → Domain (use-case hooks) → Data (api.ts)**
- Screens MUST NOT import from `api.ts` or call `axios` — go through use-case hooks
- Feature module shape: `src/features/<f>/{api.ts, use-cases/, components/, screens/, <f>-store.ts, types.ts}`
- Cross-cutting primitives live under `src/lib/<concern>/` — never duplicate per feature
- Path alias `@/` for absolute imports across folders; relative `./` only within same feature
- Repository layer is OPTIONAL — add only when business logic justifies it

## When to load this skill

Load when the task involves: deciding where a file belongs, fixing a layer violation, registering a global store, grouping a route, restructuring a feature, or answering "how is the app organized?".

---

## Layer Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ Presentation                                                 │
│   app/(tabs)/<route>.tsx           Expo Router screens       │
│   src/features/<f>/screens/        Feature screens           │
│   src/features/<f>/components/     Feature components        │
│   src/features/<f>/<f>-store.ts    Feature Zustand store     │
│                                                              │
│   imports: use-case hooks ONLY (not api.ts, not axios)       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ Domain — use-case hooks                                      │
│   src/features/<f>/use-cases/use-<entity>-query.ts           │
│   src/features/<f>/use-cases/use-<entity>-mutation.ts        │
│                                                              │
│   wrap TanStack useQuery / useMutation over api.ts           │
│   imports: api.ts module, repository (optional), types       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ Data                                                         │
│   src/features/<f>/api.ts          axios calls + mappers     │
│   src/features/<f>/repository.ts   (optional layer)          │
│                                                              │
│   imports: src/lib/api/client (axios instance), types        │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ Infrastructure (src/lib/*)                                   │
│   api/client.ts        axios + interceptors                  │
│   logger/index.ts      log.info/warn/error/critical          │
│   storage/mmkv.ts      MMKV v4 + StorageKeys                 │
│   auth/secure-storage  expo-secure-store wrapper             │
│   i18n/index.ts        i18next + useTranslation              │
│   analytics/           Sentry RN + AnalyticEvent             │
│   connectivity/        NetInfo + useConnectivity             │
│   arch/index.ts        Result<T,E>, BaseStore, CrudApi       │
└──────────────────────────────────────────────────────────────┘
```

**Rule:** dependencies always flow downward. A Data-layer file MUST NOT import from a Presentation file. A Use-case hook MUST NOT import a Screen.

---

## Where does X go?

### A new screen for an existing feature

- Component file → `src/features/<f>/screens/<name>-screen.tsx`
- Route entry → `app/(tabs)/<route>.tsx` or nested layout. Use Plop: `yarn plop screen`
- If screen needs feature state → use existing `<f>-store.ts`, do not invent another store

### A new API endpoint

- Add function in `src/features/<f>/api.ts` (axios call + response mapping)
- Add a use-case hook in `src/features/<f>/use-cases/use-<endpoint>-{query,mutation}.ts`
- Screens import the hook, never `api.ts` directly

### A new global state (auth, theme, connectivity)

- Lives in `src/lib/<concern>/<concern>-store.ts`
- Register provider/persist hydration in `app/_layout.tsx`
- Export selector hooks: `useAuthToken()`, `useTheme()`, etc — never expose raw `useStore`

### A new feature

- Create folder `src/features/<feature>/`
- Run `yarn plop store` for the Zustand store
- Run `yarn plop api` for the api module
- Run `yarn plop usecase` for the first use-case hook
- Add types in `src/features/<f>/types.ts`
- Routes inside `app/(tabs)/<feature>.tsx` or grouped layout

### A new utility used in 2+ features

- Move to `src/lib/<concern>/` or `src/utils/`
- Never copy-paste across features

### A new translation key

- Add in BOTH `src/translations/en.json` AND `src/translations/vi.json`
- Use `t('key')` from `useTranslation()` — never inline strings
- See `u-i18n` for verification script

### A new storage key

- Add to `StorageKeys` enum in `src/lib/storage/mmkv.ts` — NEVER hard-code string keys
- See `u-storage`

### A new error code

- Add to `AppErrorCode` enum + factory in `src/lib/arch` (or wherever AppError lives)
- See `u-error-handling`

---

## Feature module skeleton

```
src/features/orders/
├── api.ts                       # axios calls + DTO mappers
├── repository.ts                # OPTIONAL — only if pure business logic
├── orders-store.ts              # Zustand store (feature-local state)
├── types.ts                     # Order, OrderStatus, DTO types
├── components/
│   ├── order-card.tsx
│   └── order-status-badge.tsx
├── screens/
│   ├── orders-list-screen.tsx
│   └── order-detail-screen.tsx
└── use-cases/
    ├── use-orders-query.ts          # GET /orders, list with cursor
    ├── use-order-detail-query.ts    # GET /orders/:id
    ├── use-create-order-mutation.ts # POST /orders
    └── use-cancel-order-mutation.ts # PATCH /orders/:id/cancel
```

**Notes**

- `index.ts` barrels are fine for components but optional. Prefer direct imports.
- `screens/` are pure components — they read from `<f>-store.ts` and call use-case hooks
- `use-cases/` files are _thin_ — they wrap TanStack hooks, no business branching beyond `select`/`onSuccess`

---

## Repository layer — when to add

Add `repository.ts` only when ANY of these is true:

- A feature has **non-HTTP business logic** (e.g., compute eligibility from cached + server data)
- Multiple use-case hooks share **identical data shaping** that doesn't fit in `api.ts`
- A feature needs a **swappable backend** (axios today, GraphQL later)

Don't add repository when:

- The use-case hook is just a TanStack wrapper around one axios call (most cases)
- "It feels cleaner" — KISS wins

```ts
// src/features/orders/repository.ts (when justified)
import { ordersApi } from './api';
import type { Order, OrderEligibility } from './types';

export const ordersRepository = {
  async getEligibility(userId: string): Promise<OrderEligibility> {
    const [user, orders] = await Promise.all([
      ordersApi.getUser(userId),
      ordersApi.getRecentOrders(userId, 30),
    ]);
    return computeEligibility(user, orders);
  },
};
```

---

## Path aliases

| Alias          | Maps to      | Use when                                              |
| -------------- | ------------ | ----------------------------------------------------- |
| `@/...`        | `src/...`    | Importing `@/lib/*`, `@/features/*`, `@/components/*` |
| `@/app/...`    | `app/...`    | Cross-referencing Expo Router internals (rare)        |
| `@/assets/...` | `assets/...` | Static images, fonts                                  |
| `./...`        | relative     | Within the SAME feature folder only                   |
| `../...`       | relative     | NEVER across folders — use `@/`                       |

Configured in `tsconfig.json` and Babel/Metro. If you see `../../../lib/...`, refactor to `@/lib/...`.

---

## Import order (per file)

```ts
// 1. React / React Native
import { useEffect } from 'react';
import { View, Text } from 'react-native';

// 2. Third-party
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Project absolute (@/)
import { apiClient } from '@/lib/api/client';
import { log } from '@/lib/logger';

// 4. Same-feature relative
import { ordersApi } from './api';
import { OrderCard } from './components/order-card';
```

Blank line between groups. ESLint `eslint-config-expo` enforces this.

---

## DI pattern (no DI container)

unicorn uses **simple module imports + constructor injection in factories** — no Inversify, no tsyringe.

- **Singleton services** (axios client, MMKV instance, i18n) → exported from `src/lib/<concern>/index.ts`. Import where needed.
- **Per-feature stores** → exported as Zustand store hooks (`useOrdersStore`)
- **Test injection** → use Jest module mocking: `jest.mock('@/lib/api/client')`

Example singleton wiring:

```ts
// src/lib/api/client.ts
import axios from 'axios';
import { authInterceptor, refreshInterceptor, loggerInterceptor } from './interceptors';

export const apiClient = axios.create({ baseURL: ENV.API_URL, timeout: 15_000 });
apiClient.interceptors.request.use(authInterceptor);
apiClient.interceptors.response.use(...refreshInterceptor);
apiClient.interceptors.response.use(...loggerInterceptor);
```

Consumers do `import { apiClient } from '@/lib/api/client'`. No registration, no container.

---

## Route grouping (Expo Router v6)

```
app/
├── _layout.tsx              Root: Theme, i18n, QueryClient, ErrorBoundary, Auth gate
├── (auth)/
│   ├── _layout.tsx          Auth stack (no tabs)
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (tabs)/
│   ├── _layout.tsx          Tabs layout
│   ├── index.tsx            Home tab
│   ├── orders.tsx           Orders tab
│   └── profile.tsx          Profile tab
└── modal.tsx                Modal presentation
```

- Group prefix `(name)` does not affect URL — used for layout grouping
- Nested `_layout.tsx` adds a Stack/Tabs/Drawer wrapper
- Auth gate: `app/_layout.tsx` reads `useAuthToken()` and routes via `<Redirect />` to `(auth)/sign-in`
- Modal: a top-level route with `presentation: 'modal'`. Created via Plop when needed.

---

## Provider stack (`app/_layout.tsx`)

Order matters — outer providers initialize first.

```tsx
<ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView>
            <BottomSheetModalProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </I18nProvider>
  </QueryClientProvider>
</ErrorBoundary>
```

When adding a new global provider: add at the right depth (cross-cutting → outer; UI-only → inner).

---

## Layer-violation examples (REJECT in review)

| Anti-pattern                                   | Why it's wrong                              | Fix                                              |
| ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| Screen does `await axios.get(...)`             | Skips Domain layer; no caching/dedupe       | Use a use-case hook + TanStack                   |
| Screen imports from `api.ts` directly          | Same                                        | Same                                             |
| `api.ts` imports a Zustand store               | Data layer reading Presentation state       | Pass arg into the api function                   |
| `<f>-store.ts` calls axios                     | Store is for client state, not server state | Call use-case hook from screen, set store result |
| Two features import each other's `api.ts`      | Coupling features                           | Promote to `src/lib/<shared>/`                   |
| Use-case hook imports another feature's screen | Inverted dependency                         | Keep use-case hooks data-only                    |
| Hard-coded string in `mmkv.set('foo', x)`      | Bypasses `StorageKeys`                      | Add to enum first                                |
| `t` literal `<Text>Welcome</Text>`             | Bypasses i18n                               | Add to en.json + vi.json, use `t('welcome')`     |

---

## Checklist for adding a new feature

1. `yarn plop store --name <feature>` → scaffolds `<f>-store.ts`
2. `yarn plop api --name <feature>` → scaffolds `api.ts`
3. `yarn plop usecase --name <feature> --action <verb>` → scaffolds `use-<verb>-{query,mutation}.ts`
4. `yarn plop screen --name <feature>` → scaffolds screen + route
5. Add `types.ts` if shared shapes exist
6. Add i18n keys in both `en.json` + `vi.json` if user-visible strings
7. Add `StorageKeys.<KEY>` if persisting feature data
8. Wire route in `app/(tabs)/_layout.tsx` if it's a new tab
9. `yarn typecheck && yarn lint` — must pass before commit
10. Load `u-finalize` for self-audit

---

## See also

- `u-codegen` — Plop, yarn scripts, EAS commands
- `u-controller` — feature-local Zustand stores
- `u-global-store` — `src/lib/*` global stores
- `u-usecase` — use-case hook patterns
- `u-api` — axios client + interceptors
- `u-storage` — MMKV + StorageKeys
- `u-screen` — screen widget structure
- `u-navigation` — Expo Router patterns
