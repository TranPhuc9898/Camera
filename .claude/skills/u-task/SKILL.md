---
name: u-task
description: 'End-to-end task orchestrator for any implementation request in unicorn (Expo + RN). Triggers: implement, build, create feature, add feature, new screen, new sheet, new flow, task.'
---

# unicorn — Task Orchestrator

> **TL;DR** — Expand (0) → **user confirms** → classify (1) → load skills (2) → explore (3) → audit plan (3.5) → plan (4) → execute: Plop → **tests RED (C/D/E)** → data → domain → presentation → store wiring → route (5) → verify once (6) → deliver (7). Done = `npm run typecheck && npm run lint` clean + evidence gate + `u-finalize` clean for C/D/E.

Follow every phase in order. **Do NOT write code until Phase 3 is complete.**

---

## Phase 0 — Expand the Request

Produce this block immediately:

```
EXPANDED REQUEST
======================================================
Original: "[user's exact words]"

Understood as:
  Feature: [complete one-sentence description]
  Entry point: [which screen / button / gesture triggers this]
  Data: [what is created, read, updated, or deleted]

Explicit requirements:
  · [stated requirement]

Potentially required (validate which apply in Phase 3.5 B):
  · Loading state — only if async operation users wait on
  · Error handling: try-catch → log.error → toast/snackbar via AppError
  · Success feedback (toast or navigation)
  · i18n keys — only if strings shown to users (en + vi)
  · Analytics event — only if trackable user action
  · React.memo / useCallback only if render budget actually matters
  · Stub repository — if real API is not ready (see Phase 5 Step 2)

Assumptions made:
  · [assumption] — reason: [why most reasonable]

Success criteria:
  · [ ] [user can do X from Y screen]
  · [ ] `npm run typecheck` passes
  · [ ] `npm run lint` 0 errors

Out of scope:
  · [item not being built]
======================================================
```

**After producing the EXPANDED REQUEST block: stop and wait for user confirmation.** Do not proceed to Phase 1 until acknowledged.

- User confirms ("ok", "proceed", "go ahead", "looks good"): move to Phase 1 immediately.
- User revises scope or assumptions: update the block, then wait again.
- User says "no confirmation" / "just do it" / "proceed through all phases": skip gate for this session.
- One critical ambiguity exists: ask it inline, then wait for the answer before proceeding.

> One round-trip here prevents the most common failure: correct implementation of wrong scope.

---

## Phase 1 — Classify the Task

| Type  | Description                                             | Plop generators              | Wiring                                | Route        |
| ----- | ------------------------------------------------------- | ---------------------------- | ------------------------------------- | ------------ |
| **A** | UI change only — existing screen/component, no new data | none                         | none                                  | none         |
| **B** | Logic change — new behaviour in existing store / hook   | possibly `usecase`           | use-case hook only                    | none         |
| **C** | New screen or sheet                                     | `screen`/`sheet` + `usecase` | use-case hooks + queryKeys + provider | YES (`app/`) |
| **D** | New data (use-case hook + api call, no new screen)      | `usecase` + `api`            | api function + hook + queryKey        | none         |
| **E** | Full feature — new screen + use-cases + api             | `api` → `usecase` → `screen` | all                                   | YES (`app/`) |

---

## Phase 2 — Load Skills

**Load immediately** (before exploration): `u-architecture`

**Load after Phase 3.5 confirms scope** (skip any layer that Phase 3.5C reveals is covered by reuse):

| Condition                | Load                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| New screen/sheet         | `u-screen`, `u-rn-ui`, `u-controller`, `u-reactive-state`        |
| Any store edit           | `u-controller`, `u-reactive-state`, `u-global-store` (if global) |
| New use-case hook        | `u-usecase`, `u-testing`                                         |
| New api call / endpoint  | `u-api`                                                          |
| Repository layer (rare)  | `u-repository`                                                   |
| Navigation changes       | `u-navigation`                                                   |
| New persisted setting    | `u-storage`                                                      |
| Error states / try-catch | `u-error-handling`                                               |
| New analytics            | `u-analytics`                                                    |
| New scaffold             | `u-codegen`                                                      |
| Bottom sheet             | `u-sheet`                                                        |
| Form input               | `u-form`                                                         |
| New i18n keys            | `u-i18n`                                                         |

> If Phase 3.5C reveals an existing hook or api function covers the need, skip that layer's skill — it would guide patterns you won't implement.

---

## Phase 3 — Explore (Delegate to Explore Subagent)

**For Type C/D/E tasks (≥3 files to read): delegate this entire phase to an Explore subagent** to keep raw file content out of the main session.

```
Agent(
  subagent_type: "Explore",
  description: "Explore [feature name] codebase",
  prompt: "Read these files/patterns: [list from below based on task type].
           Answer these questions with file:line citations:
             1. Does a similar screen / hook / api function already exist to follow?
             2. Which feature folder? (match existing: src/features/orders/, src/features/auth/, ...)
             3. Does an existing api function already expose the data needed?
             4. What global Zustand stores are already in scope?
             5. Does a reusable component in src/components/ already solve part of the UI?
           Under 300 words. No raw file content — citations only."
)
```

**Files to include in the Explore prompt:**

For ALL tasks:

- The specific file(s) mentioned by user
- Adjacent screen/store pair for the affected feature
- `src/lib/api/index.ts` (or feature `*-api.ts`)
- `app/_layout.tsx` (provider stack — when relevant)

For Type C/E also add:

- 1-2 existing screens in same domain for UI patterns
- Relevant `*-types.ts` if extending existing data
- `src/lib/storage/storage-keys.ts` if persisting settings

**Threshold:** if the file list above totals <3 files to read, read inline — subagent overhead exceeds benefit.

---

## Phase 3.5 — Pre-Plan Self-Review

Answer each item with file:line evidence. Vague answers ("looks fine") are not allowed. If you cannot answer with evidence, grep/read first.

**A. Assumption Audit**

```
· [type/function/field] at → [file:line]  or: UNVERIFIED — must grep before using
```

> Any UNVERIFIED assumption must be grepped before it enters the plan.

**B. Scope Boundary Check**

```
· Files to CREATE: [N] — each traceable to explicit requirement? [yes / speculative]
· New abstractions (base type, generic, HOC): [N]
    → Concrete uses in THIS changeset: [count]. Remove any with < 2 uses.
· Error handling cases: [N]
    → Each actually reachable in this feature's flow? [yes / remove]
· "Potentially required" from Phase 0 — which actually apply?
    · i18n keys — only if strings shown to users
    · Analytics event — only if trackable user action
    · Loading state — only if async operation users wait on
```

**C. Reuse Check**

```
· Existing use-case hook covering ≥80% of what I need?         → [name or none]
· Existing api function I can call?                            → [name or none]
· Existing global store (Zustand) for this state?              → [name or none]
· Existing reusable component in src/components/?              → [name or none]
```

If any reuse exists: use it. Do NOT create a parallel version.

**D. Consistency Check**

```
· Naming matches pattern of 1-2 existing files I read? [yes / deviation: X]
· Server state via TanStack Query (`useQuery`/`useMutation`); UI/local state via Zustand or `useState`? [yes / deviation: X]
· Strings via `t('key')` not literals? [yes / deviation]
· Colors via NativeWind classes / theme tokens, no raw hex in components? [yes / deviation]
```

> If any item reveals a problem: fix before writing the plan.

**E. Approach Alignment Check**

Consult `.claude/rules/approach-alignment.md` (auto-loaded when any `*-store.ts` or `use-*.ts` was read during Phase 3; read explicitly only if all affected files are new and haven't been read yet). For each planned state field and method, answer the Quick Verdict block.

> A "fix" that causes incorrect behavior (desynced bools, hidden code paths) → revise the plan before Phase 4. A "fix" that is purely stylistic but correct → note it, continue.

---

## Phase 4 — Plan

```
TASK TYPE: [A/B/C/D/E]
SKILLS LOADED: [list]

FILES TO CREATE (Plop first, data → domain → presentation):
  npx plop api      --feature=orders --name=getOrders
  npx plop usecase  --feature=orders --name=useGetOrders
  npx plop screen   --feature=orders --name=OrderList   # → app/(tabs)/orders/index.tsx
  npx plop sheet    --feature=orders --name=OrderFilter # if sheet

FILES TO MODIFY:
  src/features/orders/api/orders-api.ts
    - export async function getOrders(...): Promise<Order[]>
  src/features/orders/hooks/use-get-orders.ts
    - export function useGetOrders() { return useQuery({ queryKey: orderKeys.list(...), queryFn: ... }) }
  src/features/orders/types/order-types.ts
    - export interface Order { ... }
  src/features/orders/store/order-store.ts  (if local store needed)
  app/(tabs)/orders/index.tsx               (route — Expo Router)

i18n KEYS: 'orders.title', 'orders.empty'  (in src/lib/i18n/locales/en.json + vi.json)
ANALYTICS EVENT: OrderViewedEvent
LAYER MAP:
  Presentation: <OrderListScreen /> + useOrderListController()
  Domain: useGetOrders() (query) / useUpdateOrder() (mutation) — plus pure helpers if any
  Data: getOrders / updateOrder in orders-api.ts (axios)
```

Proceed if the plan is clearly correct, otherwise get approval.

---

## Phase 5 — Execute (Order is Critical)

### Step 1: Run Plop for every NEW component

```bash
# Always: data → domain → presentation
npx plop api     --feature="orders" --name="getOrders"
npx plop usecase --feature="orders" --name="useGetOrders"
npx plop screen  --feature="orders" --name="OrderList"   # or: sheet --name="OrderFilter"
```

### Step 1.5: Write Failing Tests (Type C/D/E only — skip for A/B)

Before filling any layer logic, write a unit test for each new use-case hook. `u-testing` is already loaded (Phase 2) — follow its hook test pattern exactly. Place tests next to the hook: `__tests__/use-get-orders.test.ts`.

For each new `useXxx` hook:

1. Create `src/features/{feature}/hooks/__tests__/use-xxx.test.ts`
2. Write one test that renders the hook with `renderHook` (`@testing-library/react-native`) wrapped in a `QueryClientProvider`, mocks the api function with a typed `jest.fn()`, and asserts on the resulting `data` / `isError` / `mutate` call shape.
3. Run and **confirm RED** (the test must fail because the api / hook body is empty):

```bash
npm test -- --testPathPattern="use-xxx" 2>&1 | tail -20
```

**Gate: proceed to Step 2 only after confirming RED output.** If the test passes before any implementation exists, the mock is too permissive — tighten the assertion.

> Skip only if: (a) user explicitly says "skip tests", or (b) the hook has no injectable boundary (wraps a 3rd-party SDK directly with no seam).

---

### Step 2: Data layer (api function)

Fill `getOrders` / `updateOrder` in `src/features/{feature}/api/{feature}-api.ts` — see `u-api`.

**If real API is ready:** Use the shared axios instance (`src/lib/api/client.ts`), call `client.get/post/put/del<ResponseType>(...)`, return `response.data`. Surface failures by re-throwing as `AppError` (see `u-error-handling`).

**If API is not ready yet (stub mode):** Return hardcoded data + `await sleep(latencyMs)` simulation. Mark each stub body `// TODO(api): real endpoint`. Hook signatures stay identical — when the API is ready, replace the stub body in place; no hook or screen changes needed anywhere else.

See `u-api` → "Stub Impl" section for the full pattern.

### Step 3: Domain layer (use-case hook)

Fill `useGetOrders()` / `useUpdateOrder()` — see `u-usecase`:

```ts
// src/features/orders/hooks/use-get-orders.ts
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '../api/orders-api';
import { orderKeys } from '../api/order-keys';

export function useGetOrders(filter: OrderFilter) {
  return useQuery({
    queryKey: orderKeys.list(filter),
    queryFn: () => getOrders(filter),
  });
}
```

For mutations: `useMutation({ mutationFn, onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }) })`.

### Step 4: Store / Controller (only if needed)

Local UI state stays in the screen via `useState`. Reach for Zustand only when:

- State is shared across siblings,
- Or persists across navigation,
- Or is global (auth, settings).

```ts
// src/features/orders/store/order-filter-store.ts
import { create } from 'zustand';

interface OrderFilterState {
  status: OrderStatus | 'all';
  setStatus: (s: OrderStatus | 'all') => void;
  reset: () => void;
}

export const useOrderFilterStore = create<OrderFilterState>((set) => ({
  status: 'all',
  setStatus: (status) => set({ status }),
  reset: () => set({ status: 'all' }),
}));
```

For global stores with persistence: see `u-global-store`.

### Step 5: Screen / Sheet

```tsx
// src/features/orders/screens/order-list-screen.tsx
import { View, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetOrders } from '../hooks/use-get-orders';
import { useOrderFilterStore } from '../store/order-filter-store';
import { OrderRow } from '../components/order-row';

export function OrderListScreen() {
  const { t } = useTranslation();
  const status = useOrderFilterStore((s) => s.status);
  const { data, isLoading, error } = useGetOrders({ status });

  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView error={error} />;

  return (
    <View className="bg-background flex-1 px-4">
      <FlatList
        data={data ?? []}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => <OrderRow order={item} />}
        ListEmptyComponent={<EmptyState text={t('orders.empty')} />}
      />
    </View>
  );
}
```

Rules:

- NativeWind classes / `theme/tokens` — no raw hex, no inline `StyleSheet.create({ color: '#abc' })`.
- Strings via `t('key')`, not literals.
- Long lists: `FlatList` / `FlashList`, never `ScrollView` of mapped items.
- Memoise per `u-performance` only when render cost is measurable.

### Steps 6 + 7 + 8: Wiring trio — run as parallel Agent calls

These three steps edit different files with no dependency on each other. **Spawn all three as parallel `Agent(...)` calls in a single response**. Wait for all to complete before moving to Step 9.

#### Step 6: Provider / store wiring

If the new screen needs a fresh `QueryClient` namespace, persisted store, or context provider that wraps `app/_layout.tsx`, register here. Most features need nothing — TanStack Query and Zustand already work without per-feature wiring.

Only edit when:

- Adding a new global Zustand store with `persist` (verify storage key uniqueness in `src/lib/storage/storage-keys.ts`),
- Wrapping the tree with a new context provider (rare).

#### Step 7: Navigation route (Expo Router file-based)

```bash
# New top-level tab/stack screen → just create the file under app/
app/(tabs)/orders/index.tsx          # tab list
app/(tabs)/orders/[id].tsx           # detail (param id)
app/(modals)/order-filter.tsx        # modal sheet
```

The file path IS the route — no `routes.ts` to update. For typed navigation:

```ts
// inside any screen
import { router } from 'expo-router';

router.push(`/orders/${order.id}`);
router.push({ pathname: '/(modals)/order-filter', params: { status } });
```

For sheets that present from a stack, set `presentation: 'modal'` in the route group's `_layout.tsx`. See `u-navigation`.

#### Step 8: i18n

Add keys to BOTH `src/lib/i18n/locales/en.json` AND `src/lib/i18n/locales/vi.json`:

```json
// en.json
{
  "orders": {
    "title": "My Orders",
    "empty": "You have no orders yet."
  }
}

// vi.json
{
  "orders": {
    "title": "Đơn hàng của tôi",
    "empty": "Bạn chưa có đơn hàng nào."
  }
}
```

i18next picks up the change on next module reload — no codegen step. See `u-i18n`.

### Step 9: Code generation (if needed)

```bash
# Only if api types come from OpenAPI / GraphQL codegen pipeline
npm run codegen        # if defined in package.json
```

Most tasks have no codegen — skip if not in `package.json`.

---

## Phase 6 — Verify

```bash
npx prettier --write $(git diff --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
npm run typecheck
npm run lint
```

Count only project sources (exclude `node_modules`, `.expo/`, `dist/`, generated `*.d.ts`). Fix each error/warning once, then run `typecheck && lint` a second time. **If errors persist after the second run — surface them to the user and stop. Do not loop.** Then:

- **Type A** (UI-only change): done — no `u-finalize` needed. Run the diff audit below.
- **Type B** (logic in existing store/hook, no new files): done — no `u-finalize` needed. Run the diff audit below.
- **Type C/D/E** (new screen, new data, or full feature): invoke `/u-finalize` once — it includes the diff audit. Do not re-invoke `u-finalize` in a loop — if it surfaces issues, fix them and stop. Surface unresolved blockers to the user.

**Optional real-device test (Type C/E or any UI-touching task):** After typecheck/lint pass, note:

> Run `/u-verify` to test this feature on a real device or simulator. It runs Detox e2e specs derived from this task context and produces a pass/fail report. Invoke only on request — do not run automatically.

**Diff audit (Type A/B only — skipped for C/D/E which use `u-finalize`):**

```
New functions/hooks  → has ≥1 call site? [yes / dead code → remove]
New abstractions     → used ≥2 places?   [count — if 1: inline it]
Comments added       → explains WHY?     [yes / remove it]
Files not in plan    → required?         [yes / revert change]
```

---

## Phase 7 — Delivery

> **Trivial change** (< 10 lines, single concern): output only target and check — omit flow and files.

```
==========================================
DONE  [feature name — 3-5 words]
==========================================
Target:  [what user can now do — 1 sentence]
    Test: [navigate to X] → [do Y] → [expect Z]

Flow:  [compact — simple task]
    [load]   <OrderListScreen> → useGetOrders()  → getOrders()  → axios → API
    [action] <OrderListScreen> → useUpdateOrder().mutate() → updateOrder() → axios → API
    Side: router.push('/orders/123') / toast.success(...) / analytics.track(OrderViewedEvent)

    [tree — use when 2+ screens, stores, or branching flows]
    OrderListScreen → useGetOrders → orders-api.getOrders → API
                   ↳ useOrderFilterStore (status)
                   ↳ router.push('/orders/[id]')
                          ↳ OrderDetailScreen → useGetOrder → orders-api.getOrder → API

Files:
    + src/features/orders/api/orders-api.ts
    + src/features/orders/hooks/use-get-orders.ts
    + src/features/orders/screens/order-list-screen.tsx
    + app/(tabs)/orders/index.tsx
    ~ src/lib/i18n/locales/en.json  (+'orders.title', +'orders.empty')
    ~ src/lib/i18n/locales/vi.json  (same keys, vi values)

Check: typecheck ok · lint ok · route ok · i18n ok
==========================================
```

---

## Common Mistakes

| Mistake                                   | Correct                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| Creating screen/hook manually             | `npx plop screen --name="..."` first                          |
| Putting server state in Zustand           | TanStack Query owns server state. Zustand only for UI/local.  |
| Calling api function directly from screen | Route through a use-case hook (`useGetOrders`)                |
| `useEffect(() => fetch...)` in screen     | Use `useQuery` — handles cache, retry, dedupe                 |
| Hardcoded colors in components            | NativeWind class (`bg-primary`) or `theme.colors.*` token     |
| Hardcoded strings                         | `t('key')` + add to BOTH `en.json` and `vi.json`              |
| Mapped `<View>` over array of items       | `FlatList` / `FlashList`                                      |
| `ScrollView` for long lists               | `FlatList` (virtualised)                                      |
| `style={{ color: '#fff' }}` inline        | NativeWind `className="text-white"`                           |
| Missing query invalidation after mutation | `qc.invalidateQueries({ queryKey: keys.all })` in `onSuccess` |
| Using `pnpm` / `yarn` / `bun`             | Use `npm` / `npx` only                                        |
| Declaring routes in code                  | Routes are file paths under `app/` (Expo Router file-based)   |
| Editing only `en.json` for new key        | Both `en.json` and `vi.json` must stay in sync                |
| Missing `key` on FlatList items           | `keyExtractor={(item) => item.id}`                            |
| Reading auth token from MMKV              | Auth tokens go in `expo-secure-store`, not MMKV               |

## Never Do

- Write implementation code before Plop scaffold completes (or you've consciously chosen to skip Plop for a reason).
- Skip query key invalidation after a mutation that changes server data — UI will stay stale.
- Add an i18n key to only one locale file (`en.json` and `vi.json` must stay in sync).
- Call axios / `fetch` directly from a screen — route through `*-api.ts` then a hook.
- Use `pnpm` / `yarn` / `bun` — this project is npm-only.
- Invent a route, hook, or api function name without verifying it exists via `grep`.

---

## See Also

- `u-architecture` — layer rules, file placement, path aliases.
- `u-api` — axios client, interceptors, error mapping, stub mode.
- `u-usecase` — `useQuery` / `useMutation` / `useInfiniteQuery` patterns.
- `u-controller` — Zustand store factory.
- `u-screen` — screen composition, layout, safe area.
- `u-navigation` — Expo Router v6, typed routes, modals.
- `u-i18n` — i18next setup, key conventions.
- `u-finalize` — end-of-task self-audit.
- `u-verify` — Detox e2e on real device/simulator.
- `u-codegen` — Plop generators reference.
