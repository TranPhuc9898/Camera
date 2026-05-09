---
paths:
  - 'src/**/*.ts'
  - 'src/**/*.tsx'
  - 'app/**/*.tsx'
---

# Unicorn — Expo RN Edit Rules

TS/RN-edit specifics for this stack. Stack overview, file/import rules, and architecture invariants live in [CLAUDE.md](../../CLAUDE.md) — do not duplicate here.

## Component Creation — Plop FIRST

For any new screen / sheet / store / use-case hook / api module / form, scaffold via Plop **before** writing logic:

```bash
npx plop screen <name>          # screen + Expo Router entry
npx plop sheet <name>           # bottom sheet component
npx plop store <name>           # Zustand store (global or feature)
npx plop usecase <name>         # TanStack query/mutation hook
npx plop api <name>             # feature api module (axios)
npx plop form <name>            # react-hook-form + zod form
```

## Store Pattern (Zustand)

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, StorageKeys } from '@/lib/storage/mmkv';

const mmkvStorage = {
  getItem: (k: string) => storage.getString(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.remove(k),
};

type AuthState = {
  // === State ===
  user: User | null;
  isHydrated: boolean;
  // === Actions ===
  setUser: (u: User | null) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isHydrated: false,
      setUser: (user) => set({ user }),
      reset: () => set({ user: null }),
    }),
    {
      name: StorageKeys.AUTH_USER,
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
```

Section order via comments: `// === State ===` → `// === Selectors ===` (optional) → `// === Actions ===` → `// === Persisted ===` (when using persist middleware).

## Use-Case Hook Pattern (TanStack)

```ts
// Query
export const useActivitiesQuery = (cursor?: string) =>
  useQuery({
    queryKey: ['activities', cursor],
    queryFn: () => activitiesApi.list({ cursor }),
  });

// Mutation
export const useCreateActivityMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: activitiesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
};
```

## Component Decomposition (Avoid Rebuilds)

- Extract heavy subtrees into named components, not inline functions inside JSX.
- `React.memo` for list-row components that receive stable props.
- Keep reactive subscriptions narrow: `useStore(s => s.field)`, not `useStore()`.
- FlashList (Shopify) for long lists; provide `keyExtractor` + `getItemType`.
- Memoize derived data with `useMemo`, callbacks with `useCallback` only when passed to memoized children.

## Code Quality

- TypeScript strict + `noUncheckedIndexedAccess`.
- Path aliases only — never relative `../../`.
- 100-char lines (Prettier default).
- `kebab-case` filenames, `PascalCase` components, `camelCase` variables.
- File suffixes: `*-screen.tsx`, `*-sheet.tsx`, `*-form.tsx`, `*-store.ts`, `*-api.ts`, `use-*.ts`.

## Discriminated Unions over Booleans

Prefer discriminated unions over multiple bools:

```ts
type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: Activity[] }
  | { kind: 'error'; error: AppError };
```

Or just lean on TanStack's `{ data, isLoading, isError, error, refetch }`.

## Switch Exhaustiveness

```ts
const exhaustive = (x: never): never => {
  throw new Error(`unreachable: ${x}`);
};

const label = (status: Status['kind']) => {
  switch (status) {
    case 'idle':
      return 'Idle';
    case 'loading':
      return 'Loading…';
    case 'success':
      return 'Ready';
    case 'error':
      return 'Failed';
    default:
      return exhaustive(status);
  }
};
```

## Logging

Use `logger` from `@/lib/logger`. Never `console.log`/`console.error` in production code.

```ts
import { logger } from '@/lib/logger';

logger.info('[ActivityApi] list fetched count=', items.length);
logger.error('[HomeScreen] save failed', { error: e });
logger.critical('[Auth] token refresh permanently failed', { error: e }); // also Sentry
```

Levels: `debug / info / warn / error / critical`. `critical` additionally captures to Sentry.

## Error Handling

- In mutation `onError` or `try/catch`: `logger.error('[Tag] msg', { error: e }); toast.error(errorMessage(t, e))`.
- Throw `new AppError(code, ...)` from feature code — never raw `Error()`.
- Never let errors fail silently.

## Format & Verify

The `Stop` hook auto-formats changed files. Manual:

```bash
npx prettier --write $(git diff --name-only | grep -E '\.(ts|tsx|js|json|md)$')
npm run typecheck
npm run lint
npm test
```

Count typecheck/lint findings ONLY from `src/` and `app/`. Ignore `node_modules`, `.expo`, `dist`, `build`, generated `*.d.ts` from libs.

## Forbidden

- ❌ `console.log` / `console.error` / `console.warn` in production code — use `logger.*`.
- ❌ Relative imports (`../../`) — use `@/` path aliases.
- ❌ `import { storage } from 'react-native-mmkv'` direct in features — go through `@/lib/storage/mmkv`.
- ❌ `new MMKV(...)` (v3 API). Use `createMMKV({...})` (v4 Nitro Modules).
- ❌ `storage.delete(key)` (v3 API). Use `storage.remove(key)` (v4).
- ❌ Inline `style={{...}}` for theme values — use NativeWind `className="text-primary p-md"` or `theme.*` tokens.
- ❌ `useState` + `useEffect` + axios — use TanStack `useQuery`.
- ❌ `useState` for global app state — use Zustand.
- ❌ `useNavigation()` from `@react-navigation/*` — use `router.*` from `expo-router`.
- ❌ Hardcoded user-facing strings in JSX — use `t('key')` via `useTranslation()`.
- ❌ Hardcoded color hex codes — use NativeWind theme tokens or `theme.colors.*`.
- ❌ Hardcoded spacing pixel values — use `theme.spacing.*` / NativeWind `p-md gap-lg`.
- ❌ Direct `AsyncStorage` — use MMKV via `@/lib/storage/mmkv`.
- ❌ `setInterval`/`setTimeout` without cleanup in `useEffect`.
