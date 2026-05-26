---
name: u-fix-bug
description: "Bug fix orchestrator for unicorn (Expo + RN): classify, trace root cause, minimal fix, verify layer contracts. Triggers: bug, fix, broken, crash, error, wrong, incorrect, unexpected, not working, doesn't work, fails, debug, diagnose, investigate, state desync, trace, red screen, white screen."
---

# unicorn — Bug Fix Orchestrator

Fix at the root cause — a fix that silences a symptom without addressing the root is worse than no fix.

> **TL;DR** — Expand report (0) → classify into 1 of 8 categories (2) → read actual files to trace root cause (3) → state ROOT CAUSE at `file:line` before writing code (4) → minimal fix (5) → verify (6). Never write code before reading the file where the bug lives.

## Phase 0 — Expand the Bug Report

```
EXPANDED BUG REPORT
======================================================
Original: "[user's exact words]"

Symptom:
  What:     [crash / red-box / UI not updating / wrong value / nav broken / data lost / stale data]
  Where:    [which screen / route / action]
  When:     [consistent / intermittent / after specific sequence / cold start / after backgrounding]
  Expected: [what should happen]
  Actual:   [what actually happens]

Most likely category: Category [N] — [name]
  Reasoning: [why this symptom maps to this category]

Root cause hypotheses:
  1. [HIGH] [most probable — specific hook/component/store]
  2. [MED]  [alternative]
  3. [LOW]  [edge case]

First files to read:
  1. [file path] — [what to look for]
  2. [file path] — [what to look for]

Definition of fixed:
  · [how to verify bug is gone]
  · [regressions to check]
======================================================
```

Proceed immediately if hypothesis is clear. Ask ONE targeted question only if symptom is too vague to classify.

---

## Phase 2 — Classify the Bug

### Category 1: UI Not Updating / State Not Reflecting

Root causes (check in order):

- Zustand store value read as a snapshot (`useStore.getState().x` inside render) — UI doesn't subscribe
- Selector returns a new object/array each call — referential equality fails, infinite re-render or stale UI
- `useQuery` cache hit returns stale data — missing `invalidateQueries` after a mutation
- `staleTime: Infinity` set globally and a refetch was never triggered
- State mutated in place (`state.list.push(item)` inside `set(...)`) — Zustand uses Object.is, no rerender
- Derived value computed inside render but its dependency isn't a tracked subscription
- `useEffect` dependency array missing the changing dep (lint should catch — exhaustive-deps disabled?)

### Category 2: Crash / Red-Box / Exception

Root causes:

- Null / undefined dereference on `value!.foo` where `value` is undefined (TS strict should prevent — `noUncheckedIndexedAccess`?)
- Mutation throws but no `try-catch` around `mutate()` — or `onError` not handled
- Hook called conditionally (`if (x) useFoo()`) — Rules of Hooks violation
- `useContext` returns `undefined` because consumer is outside provider
- Native module method called on wrong platform — wrap with `Platform.OS === 'ios'`
- JSON.parse on a value that isn't a string (e.g. MMKV returned `undefined`)
- Image source path wrong — RN throws on `require('./missing.png')`

### Category 3: Data Not Saved / Not Persisted

Root causes:

- Wrong `StorageKeys` key (typo or duplicate value)
- MMKV instance mismatch — secure data written via plain MMKV instead of `expo-secure-store`
- Zustand `persist` middleware misconfigured: missing `storage: createJSONStorage(() => mmkvStorage)` or wrong `name`
- `persist` `version` bumped without `migrate` function — old state silently dropped
- Token stored in MMKV instead of `expo-secure-store` — wiped or unreadable on some devices

### Category 4: Navigation / Routing Broken

Root causes:

- Route file path mismatch — `app/(tabs)/orders/index.tsx` vs `router.push('/order')` (singular)
- Missing route group `_layout.tsx` for stack/tab nesting
- `presentation: 'modal'` not set on the route group → modal renders as full screen
- `router.back()` from root — goes nowhere; need `router.replace('/')`
- Param typed wrong: `useLocalSearchParams<{ id: string }>()` vs `[id]` actually being a number
- Deep link not registered in `app.json` `scheme` / `intentFilters`
- Tab pressed but child stack stuck on previous screen — missing `unstable_settings.initialRouteName`

### Category 5: Data Wrong / Business Logic Error

Root causes:

- `useQuery` query key missing a dependency — same key used for different inputs, returns wrong cache entry
- Mutation `onSuccess` invalidates the wrong key (`orderKeys.detail(id)` instead of `orderKeys.list()`)
- API response shape changed and the type wasn't updated — silent runtime mismatch
- Pagination cursor not reset when filter changes — stale page returned
- HTTP error not mapped at the api function boundary — surfaces as raw `AxiosError` instead of `AppError`
- Date timezone bug: server returns UTC, UI compares to local `new Date()`
- Optimistic update rolled back on success because `onSettled` overwrites with stale snapshot

### Category 6: Memory Leak / Effect Cleanup Bug

Root causes:

- `useEffect` returns no cleanup but sets up a subscription / timer / listener
- `setInterval` / `setTimeout` not cleared on unmount
- Event listener (`AppState.addEventListener`, `Linking.addEventListener`) not removed
- Animation `runOnJS` callback holds a ref to an unmounted component (Reanimated)
- `useQuery` with `refetchInterval` keeps polling after navigation (intended? if not, scope to screen)
- Image / video player not paused on unmount
- Zustand subscription via `subscribe(...)` without storing/calling the unsubscribe

### Category 7: Layer Violation (Architectural Bug)

Root causes:

- Screen calls axios / `fetch` directly (must go through `*-api.ts` then a hook)
- `*-api.ts` function imports a screen / hook (data → presentation back-edge)
- Server state stored in Zustand (must use TanStack Query)
- Component imports from another feature's `internal/` (cross-feature leak)
- Auth token read directly from MMKV in a component (must go via `useAuthStore` or `expo-secure-store` helper)

### Category 8: Silent Crash on Startup / White Screen

Root causes:

- `app/_layout.tsx` provider stack throws synchronously (e.g. i18n init before `SplashScreen.preventAutoHideAsync`)
- Native module require failed (added a package without `yarn expo prebuild` or rebuild)
- Hermes incompatible code path (e.g. proxies, dynamic import) — check `engine: hermes` in `app.json`
- Reanimated `babel.config.js` plugin missing → silent jsi crash
- Font load promise rejected and `<SplashScreen />` never hidden
- MMKV instance created at module top level on web target (MMKV is native-only)

---

## Phase 3 — Trace to Root Cause

**Do not guess — read the actual files.**

| Bug type          | Read first                                         | Then read                                  |
| ----------------- | -------------------------------------------------- | ------------------------------------------ |
| UI not updating   | screen `*-screen.tsx` — selector / `useQuery` call | store `*-store.ts` or hook `use-*.ts`      |
| Crash / red-box   | screen + stack trace top frame                     | hook / api / native module flagged         |
| Data not saved    | screen action handler                              | store `persist` config + `storage-keys.ts` |
| Wrong data        | hook `use-*.ts` queryKey                           | api `*-api.ts` mapping + types             |
| Navigation broken | `app/...` route file path                          | calling `router.push(...)` site            |
| Missing feature   | `app/_layout.tsx` + `(group)/_layout.tsx`          | route file path                            |
| Memory leak       | screen / hook `useEffect` cleanup                  | subscription source                        |

**If the trace requires reading ≥3 files, delegate to an Explore subagent**:

```
Agent(
  subagent_type: "Explore",
  description: "Trace root cause of [bug symptom]",
  prompt: "Read: [file list from table above for this bug type].
           Answer:
             1. Where is the state read / subscription set up? (selector / useQuery call)
             2. Which line throws / fails? (if crash/data bug)
             3. What is the exact root cause at file:line?
           Return: ROOT CAUSE: [file:line — 1 sentence]. Under 150 words."
)
```

Reproduce in Expo dev:

```bash
yarn expo start --dev-client         # or
yarn expo run:ios                    # native build
yarn expo run:android
```

For native crashes, capture the trace:

```bash
yarn react-native log-ios            # iOS console
yarn react-native log-android        # adb logcat tail
```

---

## Phase 4 — Identify the Minimal Fix

State root cause explicitly before writing code:

```
ROOT CAUSE: [exact description]
FILE: [exact file path]
LINE: [approximate line]
FIX: [what will change and why]
RISK: [what could this break]
```

**Pre-fix self-review — answer concretely:**

```
Root cause confirmed at: [file:line] — did I read the actual code? [yes / I assumed → read first]

Fix touches N files: [count]
  → If N > 2: fixing root cause or refactoring around it? Trim to root cause.

Every hook/function/type in my fix: [list]
  → Confirmed visible at [file:line]? Any UNVERIFIED = hallucination risk.

Am I adding code not matching current file's pattern? [yes / no]
  → If yes: adopt existing pattern.
```

**Approach Alignment Check**

Consult `.claude/rules/approach-alignment.md`. Verify the fix doesn't introduce approach smells (new bool flag, nested condition, layer violation).

---

## Phase 5 — Apply the Fix

### Selector / subscription bug:

```ts
// ❌ Snapshot read — never updates
const status = useOrderStore.getState().status;

// ✅ Subscribed selector — re-renders on change
const status = useOrderStore((s) => s.status);

// ❌ New object each render → infinite re-render
const { a, b } = useStore((s) => ({ a: s.a, b: s.b }));

// ✅ Atomic selectors or shallow equality
import { useShallow } from 'zustand/react/shallow';
const { a, b } = useStore(useShallow((s) => ({ a: s.a, b: s.b })));
```

### Stale data after mutation:

```ts
// ✅ Invalidate the right key in onSuccess
const updateOrder = useMutation({
  mutationFn: (input: UpdateOrderInput) => updateOrderApi(input),
  onSuccess: (_, input) => {
    qc.invalidateQueries({ queryKey: orderKeys.detail(input.id) });
    qc.invalidateQueries({ queryKey: orderKeys.list() });
  },
});
```

### Missing try / `onError`:

```ts
const submit = useMutation({
  mutationFn: createOrder,
  onSuccess: () => {
    toast.success(t('orders.created'));
    router.back();
  },
  onError: (e) => {
    log.error('[OrderForm] submit failed', e);
    const err = e instanceof AppError ? e : AppError.unknown(e);
    toast.error(err.message);
  },
});
```

### Missing route file:

```bash
# Create the route file — Expo Router file-based
mkdir -p app/(tabs)/orders
touch app/(tabs)/orders/index.tsx
touch app/(tabs)/orders/[id].tsx
```

```tsx
// app/(tabs)/orders/index.tsx
export { OrderListScreen as default } from '@/features/orders/screens/order-list-screen';
```

### Wrong query key (cache hit returns stale data):

```ts
// ❌ Key doesn't depend on filter
useQuery({ queryKey: ['orders'], queryFn: () => getOrders(filter) });

// ✅ Key includes every input that changes the response
useQuery({ queryKey: orderKeys.list(filter), queryFn: () => getOrders(filter) });

// where:
export const orderKeys = {
  all: ['orders'] as const,
  list: (filter: OrderFilter) => [...orderKeys.all, 'list', filter] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};
```

### HTTP error mapping at api boundary:

```ts
// src/features/orders/api/orders-api.ts
import axios, { isAxiosError } from 'axios';
import { client } from '@/lib/api/client';
import { AppError } from '@/lib/error/app-error';

export async function getOrders(filter: OrderFilter): Promise<Order[]> {
  try {
    const { data } = await client.get<Order[]>('/orders', { params: filter });
    return data;
  } catch (e) {
    if (isAxiosError(e)) {
      if (e.response?.status === 401) throw AppError.unauthorized(e);
      if (e.code === 'ECONNABORTED') throw AppError.networkTimeout(e);
      throw AppError.network(e);
    }
    throw AppError.unknown(e);
  }
}
```

### Effect cleanup leak:

```ts
useEffect(() => {
  const sub = AppState.addEventListener('change', onChange);
  const t = setInterval(tick, 1000);
  return () => {
    sub.remove();
    clearInterval(t);
  };
}, [onChange]);
```

### Persist version migration:

```ts
// src/features/auth/store/auth-store.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      /* ... */
    }),
    {
      name: StorageKeys.auth,
      version: 2,
      migrate: (persistedState, fromVersion) => {
        if (fromVersion === 1) {
          return { ...persistedState, role: 'user' };
        }
        return persistedState;
      },
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
```

---

## Phase 6 — Verify & Fix Report

```bash
yarn prettier --write $(git diff --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
yarn typecheck
yarn lint
yarn test --findRelatedTests $(git diff --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
```

Fix each error/warning once, then re-run. **If errors persist after the second run — surface them to the user and stop. Do not loop.**

- [ ] Root cause addressed (not symptom masked)
- [ ] No new TS errors
- [ ] No new lint warnings
- [ ] Layer contracts preserved (screen → hook → api)
- [ ] `useEffect` cleanups still complete
- [ ] No hardcoded strings, colors, raw hex
- [ ] No `console.log` left over

If fix touches > 3 files or shared components/hooks: also run `/u-finalize`.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FIXED  [bug — 3-5 words]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Root:   file:L — [1 sentence]

Before: [2-3 lines]
After:  [2-3 lines]

Trace:  [omit for single-file fix]
    OrderListScreen → useGetOrders → orders-api.getOrders → axios
    Bug at: [layer] — [what broke]

Files:  ~ path/file.ts    [what changed]

Checks: Layers ok · typecheck 0 · lint 0 · Risk: LOW / MED / HIGH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Never Do

- `try/catch` that swallows the error to make the symptom go away (`catch {}` empty block).
- Bump package versions to "maybe fix" — pin the cause first.
- Refactor unrelated code in the same PR.
- Suggest alternatives to the stack (no Redux, no MobX, no Bloc, no `AsyncStorage` for new code — MMKV).
- Replace `useQuery` with manual `useEffect` + `fetch` to "simplify".
- Disable strict TS / `noUncheckedIndexedAccess` to silence an error.

---

## See Also

- `u-architecture` — layer rules.
- `u-error-handling` — `AppError` taxonomy, mapping, toast/snackbar.
- `u-reactive-state` — Zustand selectors, shallow equality, persistence.
- `u-usecase` — TanStack Query keys, invalidation, optimistic updates.
- `u-storage` — MMKV vs `expo-secure-store`, persist migration.
- `u-navigation` — Expo Router routes, modals, deep links.
- `u-performance` — render budget, memoisation, FlatList tuning.
- `u-testing` — hook tests with `QueryClientProvider`.
- `u-finalize` — end-of-fix audit when blast radius > 3 files.
