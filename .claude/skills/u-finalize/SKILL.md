---
name: u-finalize
description: 'End-of-task self-audit for unicorn (Expo + RN): git diff → layer / wiring / RN style checklist → ship decision. Triggers: finalize, audit, done, ship, before commit, verify changes.'
---

# unicorn — Finalize & Code Review

Invoke when a feature or fix is complete, before committing.

> **Run once** — If `u-finalize` already ran this session and found blockers, fix them first. Do not loop `u-finalize` on the same diff. After fixing blockers, re-run `yarn typecheck && yarn lint` only — not the full `u-finalize` again.

> **Role in the pipeline**: `u-finalize` is the **fix phase** — Claude finds and corrects violations before they reach review. `u-review` is the **verify phase** — confirms the fix landed.

> **TL;DR** — Intent (0) → collect diff (1) → draw flow (2) → over-engineering + dead code scan (2.5) → approach alignment (2.8) → architecture (3) → wiring/routes (4) → UI/UX (5) → TS/RN style (6) → error handling (7) → impact (8) → verify (9) → ship/no-ship (10). Fix issues inline. Surface unresolved blockers to user.

---

## Step 0 — Capture Change Intent

```bash
git log --oneline -5
git diff HEAD --stat
```

```
CHANGE INTENT
======================================================
Goal:        [what this change accomplishes — 1-2 sentences]
Type:        [new feature / bug fix / refactor / enhancement / config]
Layers:      [Presentation / Domain / Data / Config]
Risk surface:[isolated screen-store pair / shared global store / route layout / native module]
======================================================
```

## Step 1 — Collect Changes

```bash
git diff HEAD --name-only
git diff HEAD
```

Categorize files: Screens / Sheets / Components / Hooks (use-cases) / API / Stores / Types / Routes (`app/`) / i18n / Config / Other.

## Step 2 — Draw End-to-End Data Flow

```
OrderListScreen → useGetOrders()  → orders-api.getOrders()  → axios → API
              ↳ useUpdateOrder().mutate() → orders-api.updateOrder() → axios → API
              ↳ useOrderFilterStore (status)
Side: router.push('/orders/[id]') / toast.success(...) / analytics.track(OrderViewedEvent)
```

Adapt to the actual changed components. Include all branching paths (pagination, error paths, conditional nav).

## Step 2.5 — Pre-Checklist Self-Review (Diff-Grounded)

Read `git diff HEAD` line by line. Concrete answers only — not opinions.

**Over-Engineering Scan**

```
New abstractions (HOC, generic wrapper, factory): [list]
  → Call sites in this diff = [N]. If N < 2 → REMOVE

New helpers / hooks / utils: [list]
  → Used in N files = [count]. If N = 1 → INLINE

New functions / hooks / methods: [list]
  → Has ≥1 call site in this diff or existing code? [yes / dead code → REMOVE]

Error / catch handlers added: [list]
  → Error path reachable in this feature? [yes / REMOVE]

Comments added: [list]
  → Explains WHY (not what the code does)? [yes / REMOVE]

Files modified outside stated scope: [list]
  → Explicitly required? [yes / REVERT]
```

**Assumption Audit**

```
Methods / fields called on external types: [list]
  → Confirmed visible at [file:line]? [yes / UNVERIFIED]

Global stores referenced via use<X>Store(): [list]
  → Created and exported from a *-store.ts? [yes / MISSING]

i18n keys via t('xxx.yyy'): [list]
  → Present in BOTH src/lib/i18n/locales/en.json AND vi.json? [yes / MISSING]

Routes pushed via router.push('/x/y'): [list]
  → Matching file exists at app/x/y.tsx (or [param].tsx)? [yes / MISSING]
```

> Blocker items must be resolved before running checklists.

## Step 2.8 — Approach Alignment Check

Consult `.claude/rules/approach-alignment.md`. For each changed store, hook, or screen in the diff, answer the Quick Verdict block against the actual written code.

> "fix" answers are blockers only if they cause incorrect behavior or prevent future work (e.g. multiple bools that can desync, flag parameter that hides two code paths). Pure-stylistic fixes → warning, not a blocker.

---

## Step 3 — Architecture Layer Checklist

**Presentation (Screens, Sheets, Components)**

- [ ] Screens are functional components — no class components.
- [ ] Server state via `useQuery` / `useMutation` / `useInfiniteQuery` — never `useState` + `useEffect` + `fetch`.
- [ ] Local UI state via `useState`; cross-component / persisted state via Zustand.
- [ ] Selectors return primitives or use `useShallow` for object/array selections.
- [ ] No axios / `fetch` calls inside components — go through `*-api.ts` then a hook.
- [ ] Long lists: `FlatList` / `FlashList` with `keyExtractor` — never `ScrollView` of `.map()`.
- [ ] `useEffect` cleanup matches every subscription / timer / listener.
- [ ] No imports from another feature's `internal/` (cross-feature leak).

**Domain (Use-Case Hooks)**

- [ ] `use-*.ts` returns a typed query / mutation result — co-located with the api function.
- [ ] Query keys come from a `*-keys.ts` factory (`orderKeys.list(filter)`) — no inline string literals.
- [ ] Mutations invalidate the right key in `onSuccess`.
- [ ] Pure helpers (mappers, validators) have no React imports.

**Data (API + Types)**

- [ ] `*-api.ts` calls the shared axios client (`@/lib/api/client`) — no per-feature axios instance.
- [ ] Response types declared in `*-types.ts`; api functions return typed `Promise<T>`, not `any`.
- [ ] HTTP errors mapped to `AppError` at the api boundary — callers never see `AxiosError`.

**Stores**

- [ ] Zustand stores expose only state + actions — no derived data computed inside `set()`.
- [ ] Persisted stores use the MMKV adapter (`createJSONStorage(() => mmkvStorage)`); auth tokens use `expo-secure-store`, not MMKV.
- [ ] `version` + `migrate` set when shape changes.

---

## Step 4 — Wiring & Routes Checklist

**Routes (Expo Router file-based, under `app/`)**

- [ ] New screen → file exists at the path you `router.push(...)` to.
- [ ] Param routes named `[id].tsx` / `[...rest].tsx`; reads via `useLocalSearchParams<{ id: string }>()`.
- [ ] Modal routes inside a `(modals)` group with `presentation: 'modal'` in its `_layout.tsx`.
- [ ] New tab → entry registered in `(tabs)/_layout.tsx`'s `<Tabs.Screen ... />` if needed.
- [ ] Deep links registered in `app.json` `scheme` / `intentFilters` if applicable.

**Providers (`app/_layout.tsx`)**

- [ ] New context provider added inside the existing stack (innermost as needed).
- [ ] No new provider duplicates an existing one (`QueryClientProvider`, `GestureHandlerRootView`, etc.).

**Storage**

- [ ] New persisted setting → key added to `src/lib/storage/storage-keys.ts`; sensitive values use `expo-secure-store`.

**i18n**

- [ ] New keys present in BOTH `en.json` and `vi.json` with the same shape.
- [ ] No hardcoded user-facing strings remain in changed files.

**Analytics**

- [ ] Event name + payload typed; tracked via shared `analytics.track(...)`, not direct Sentry/Firebase calls.

---

## Step 5 — UI/UX Checklist

- [ ] All spacing via NativeWind classes (`p-4`, `gap-2`, `mt-6`) or theme tokens — no raw pixel values in `style={{...}}` outside one-off transforms.
- [ ] All colors via NativeWind / theme tokens — no `#abc`, `rgb(...)`, or `Colors.X` hex literals.
- [ ] Text uses theme typography (`text-base font-semibold`) or shared `<Text>` component.
- [ ] All user-visible strings via `t('key')` — no hardcoded English in JSX.
- [ ] New keys added to BOTH `en.json` and `vi.json`.
- [ ] `<FlatList />` / `<FlashList />` used for lists; `keyExtractor` provided; `ItemSeparatorComponent` used over inline padding.
- [ ] `<Image />` from `expo-image` for non-trivial images; `contentFit="cover"`; cached.
- [ ] Touch targets ≥ 44×44 (`hitSlop` if visual is smaller).
- [ ] `accessibilityLabel` + `accessibilityRole` on tappable views; `testID` on Detox-targeted elements.
- [ ] `<SafeAreaView>` / `useSafeAreaInsets` on root content of screens that touch top/bottom.
- [ ] Dark mode tokens honored — no fixed light-only colors.

---

## Step 6 — TS / RN Style Checklist

- [ ] File names: kebab-case with correct suffix (`*-screen.tsx`, `*-sheet.tsx`, `*-form.tsx`, `*-store.ts`, `use-*.ts`, `*-api.ts`, `*-types.ts`).
- [ ] Component names: PascalCase; hook names start with `use`; types/interfaces PascalCase.
- [ ] No `any` (use `unknown` + narrow); no `as any` casts in changed code.
- [ ] No non-null assertions (`!`) in changed code unless commented with reason.
- [ ] Imports grouped: node/react → react-native / third-party → `@/lib/...` → `@/features/...` → relative; blank line between groups.
- [ ] Path aliases used (`@/...`) — no deep relative imports (`../../../lib/...`).
- [ ] No `console.log` left over; logging via shared `log` helper.
- [ ] No `// @ts-ignore` / `// @ts-expect-error` without a comment + ticket.
- [ ] No `useEffect` with empty deps that runs async work without an `isMounted` guard or AbortController.
- [ ] `Platform.OS === 'ios' | 'android' | 'web'` guards explicit, not assumed.

**Direct-fetch / direct-axios scan** — any hit in a screen/component is a 🔴 blocker:

```bash
grep -rn -E "(axios|fetch)\\.(get|post|put|delete)" $(git diff --name-only | grep -E '\\.(ts|tsx)$') 2>/dev/null \
  | grep -vE '/(api|lib)/' || true
```

**Server-state-in-Zustand scan** — any hit is a 🔴 blocker:

```bash
grep -rn 'create(' $(git diff --name-only | grep -E '\\-store\\.ts$') 2>/dev/null \
  | grep -E '(orders|products|users|posts|messages)' || true   # adjust domain nouns
```

---

## Step 7 — Error Handling Checklist

- [ ] User actions wrapped in `useMutation` with `onError` — log + toast.
- [ ] `onError` logs via `log.error('[Component] action failed', e)` — not `console.error`.
- [ ] User feedback via shared `toast.error(...)` using `t('error.xxx')` keys.
- [ ] Domain errors as `AppError` / `AppErrorCode` — not raw `throw new Error('...')`.
- [ ] Error messages are i18n keys — not hardcoded English.
- [ ] `try/catch {}` empty blocks ⇒ 🔴 blocker.
- [ ] Network failures distinguished from validation failures (mapped at api boundary).

---

## Step 8 — Impact Analysis

- How many layers modified? All wiring complete?
- **High risk**: `app/_layout.tsx`, `(tabs)/_layout.tsx`, shared `client.ts` interceptors, `storage-keys.ts`, `i18n` init, native module config (`app.json`, `babel.config.js`).
- **Medium risk**: global Zustand store changes (affect all consumers), shared component edits.
- **Low risk**: isolated screen + hook + api triplet, new feature folder.

Flag missing pieces:

- API function added but no hook? Hook added but no screen consumer? Route file but no entry? i18n key in JSX but only one locale?

---

## Step 9 — Verify

```bash
yarn prettier --write $(git diff --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
yarn typecheck
yarn lint
yarn test --findRelatedTests $(git diff --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
```

Count only project sources. Fix each error/warning once, then re-run. **If errors persist after the second run — surface them to the user and stop. Do not loop.**

**Optional real-device test:** If this change touches UI, note after typecheck/lint passes:

> Run `/u-verify` to validate on a real device / simulator via Detox. Per-request only — do not invoke automatically.

**Evidence Gate — complete before Step 10.** "I believe it works" is not evidence. Fill each item from actual command output:

```
EVIDENCE
======================================================
· [x/–] typecheck:  [paste exact "Found X errors" line — must be 0]
· [x/–] lint:       [paste exact summary — must be 0 errors]
· [x/–] test:       [paste jest summary — required if hooks/api added]
· [x/–] real-device:[/u-verify Detox PASS — required for Type C/E if UI changed]
======================================================
Minimum to ship:
  Type A/B : typecheck + lint
  Type C/D : typecheck + lint + test
  Type E   : typecheck + lint + test + real-device (or explicit user sign-off in lieu)
```

Any required item still blank → Step 10 verdict is ❌ NOT READY, regardless of checklist results.

---

## Step 10 — Output Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ READY TO SHIP  [or]  ❌ NOT READY — [blocker ≤5 words]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target:  [what — 1 sentence]

Flow:
    [load]   OrderListScreen → useGetOrders()  → orders-api.getOrders()  → axios → API
    [action] OrderListScreen → useUpdateOrder().mutate() → orders-api.updateOrder() → axios → API
    Side: router.push('/orders/[id]') / toast.success(...) / analytics.track(OrderViewedEvent)

Files:  ~ path/file.ts    [what changed]

Issues:
    🔴 · file:L — critical
    🟠 · file:L — warning
    🟡 · file:L — suggestion
    [✅ None]

Check: routes ok · wiring ok · i18n ok · typecheck 0 · lint 0 · Evidence: [tc/lint/test/verify] · Risk: LOW/MED/HIGH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Quick Reference — Skills for Standalone Use

> Only load these if `u-finalize` was invoked **standalone** (without a prior `u-task`/`u-continue` run this session). If `u-task` ran first, these skills are already loaded — do not reload them.

| File type                     | Skills to load                                         |
| ----------------------------- | ------------------------------------------------------ |
| Screens / sheets / components | `u-screen` + `u-rn-ui` + `u-reactive-state`            |
| Stores                        | `u-controller` / `u-global-store` + `u-error-handling` |
| Use-case hooks                | `u-usecase` + `u-architecture`                         |
| API functions                 | `u-api` + `u-architecture`                             |
| Routes                        | `u-navigation`                                         |
| i18n                          | `u-i18n`                                               |
| Storage                       | `u-storage`                                            |
| Plop / config                 | `u-codegen`                                            |

---

## Never Do

- Use `npm` / `pnpm` / `bun` — yarn (Yarn Berry) only.
- Ship with `axios` / `fetch` calls inside a screen — must go via `*-api.ts`.
- Ship with server state stored in Zustand instead of TanStack Query.
- Register a new persisted store key without adding it to `storage-keys.ts`.
- Add an i18n key to only one of `en.json` / `vi.json`.
- Approve when a route file is missing for a `router.push(...)` target.
- Approve a diff with `console.log` left in.
