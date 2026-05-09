---
name: u-continue
description: 'Resume incomplete task or fill TODO(ai) scaffold in unicorn (Expo + RN). Audits git diff, identifies gaps, continues from correct phase. Triggers: continue, resume, pick up, finish, incomplete, stuck, not done, where did we leave off, fill in, implement scaffold.'
---

# unicorn — Continue Incomplete Task

| Mode                 | When                     | What                                              |
| -------------------- | ------------------------ | ------------------------------------------------- |
| **Scaffold Mode**    | `TODO(ai)` markers exist | Fill all function/hook bodies in dependency order |
| **Interrupted Mode** | No `TODO(ai)` markers    | Audit what's done, continue from right phase      |

**Determine the mode in Phase 0. Do NOT restart from scratch.**

> **TL;DR** — Grep for `TODO(ai)` in diff (0) → **Scaffold mode** (found): map stubs → load skills → audit assumptions → fill data → domain → presentation → verify. **Interrupted mode** (none found): reconstruct intent → triage DONE/PARTIAL/MISSING/BROKEN → load skills for gaps → execute → verify.

---

## Phase 0 — Audit Current State

```bash
git diff HEAD --name-only
git diff HEAD --stat
git log main..HEAD --oneline
git diff HEAD
```

```bash
grep -rn "TODO(ai)" $(git diff HEAD --name-only | grep -E '\.(ts|tsx)$') 2>/dev/null
```

**If `TODO(ai)` found → Scaffold Mode. If none → Interrupted Mode.**

---

## SCAFFOLD MODE

### Phase 1-S — Map the Scaffold

```
SCAFFOLD DETECTED
======================================================
Feature: [inferred from file names and TODO(ai) specs]

TODO(ai) items by layer:
  Data:         · file.ts:NN — [function] — [summary]
  Domain:       · file.ts:NN — [hook]     — [summary]
  Presentation: · file.tsx:NN — [component/section] — [summary]

  Total: N items
======================================================
```

### Phase 2-S — Load Skills

| Layer with TODOs | Load                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| API function     | `u-api`, `u-architecture`                                                 |
| Use-case hook    | `u-usecase`, `u-architecture`                                             |
| Store            | `u-controller` / `u-global-store`, `u-reactive-state`, `u-error-handling` |
| Screen / sheet   | `u-screen`, `u-rn-ui`, `u-form` (if input), `u-reactive-state`            |
| Navigation       | `u-navigation`                                                            |
| Analytics        | `u-analytics`                                                             |
| i18n keys        | `u-i18n`                                                                  |

### Phase 2.5-S — Pre-Fill Assumption Audit

For **each stub** before filling:

```
Functions / hooks / types in the TODO(ai) spec: [list]
  → Confirmed at [file:line]? Or UNVERIFIED? (grep before writing)

Assumptions baked into spec: [list]
  → Actual field name? Read the type definition. Do not guess.

Pattern to follow: [file:line of adjacent implemented function]
  → Write implementation to match that pattern exactly.
```

**Approach Alignment Check** — Consult `.claude/rules/approach-alignment.md`. Answer the Quick Verdict block for every store / hook stub before filling it.

### Phase 3-S — Fill in Order

**Strict order: data layer → domain layer → presentation layer.**

For each `TODO(ai)` item:

1. Read the full annotation.
2. Load any referenced skills (`// Ref: u-xxx`).
3. Implement the body exactly per spec.
4. Remove the `TODO(ai)` comment and any placeholder return.
5. Do NOT move to the next item until the current one is correct (typecheck clean for that file).

### Phase 4-S — Post-Fill Cleanup

```bash
grep -rn "TODO(ai)" $(git diff HEAD --name-only | grep -E '\.(ts|tsx)$') 2>/dev/null
npx prettier --write $(git diff --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
npm run typecheck
npm run lint
```

Fix each error/warning once, then re-run `typecheck && lint` once. **If errors persist after the second run — surface exact errors and stop. Do not loop.**

If scaffold introduced new screens / data / features, invoke `/u-finalize` once.

### Phase 5-S — Summary

```
SCAFFOLD FILLED  [feature name]  (N/N items)
==========================================
Target: [what user can now do — 1 sentence]

Flow:   OrderListScreen → useGetOrders   → orders-api.getOrders   → axios → API
                       ↳ useUpdateOrder.mutate() → orders-api.updateOrder → axios → API
        Side: router.push('/orders/[id]') / toast.success(...)

Files:  ~ src/features/orders/hooks/use-get-orders.ts  (N TODOs filled)
        ~ src/features/orders/screens/order-list-screen.tsx  (N TODOs filled)

Check:  routes ok · wiring ok · i18n ok · typecheck 0 · lint 0
==========================================
```

---

## INTERRUPTED MODE

### Phase 1-I — Reconstruct Intent

```
RECONSTRUCTED INTENT
======================================================
Original goal: [1-2 sentences]
Task type:     [A / B / C / D / E]
Layers touched: [Presentation / Domain / Data / Config]

Evidence:
  · [file name] → [what it tells us]
  · [route file] → [which screen registered]
  · [api function] → [what data was wired]

Stop point: [where session stopped]
======================================================
```

### Phase 2-I — Triage

```bash
grep -rn "TODO\|FIXME\|throw new Error('not implemented')\|// \\.\\.\\." \
  $(git diff HEAD --name-only | grep -E '\.(ts|tsx)$') 2>/dev/null
```

```
TRIAGE
======================================================
DONE      · [component] — [why done]
PARTIAL   · [file:line] — [exists vs missing]
MISSING   · [file] — [what to create]
BROKEN    · [file:line] — [issue]
======================================================
```

Completeness checks:

| Deliverable             | Check                                                   |
| ----------------------- | ------------------------------------------------------- |
| Plop-generated files    | Exist at correct path?                                  |
| Route file under `app/` | Exists at the path `router.push(...)` targets?          |
| Provider wiring         | Updated in `app/_layout.tsx` if needed?                 |
| Storage keys            | New keys declared in `src/lib/storage/storage-keys.ts`? |
| i18n keys               | Present in BOTH `en.json` and `vi.json`?                |
| Query keys              | Factory exposed from `*-keys.ts`?                       |
| Mutation invalidation   | `onSuccess` invalidates the right keys?                 |

### Phase 3-I — Load Skills

Load only for remaining work. Always `u-architecture`.

| Remaining        | Load                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| Screen / sheet   | `u-screen`, `u-rn-ui`, `u-controller`, `u-reactive-state`                 |
| Store incomplete | `u-controller` / `u-global-store`, `u-reactive-state`, `u-error-handling` |
| Use-case hook    | `u-usecase`                                                               |
| API function     | `u-api`                                                                   |
| Route missing    | `u-navigation`                                                            |
| i18n missing     | `u-i18n`                                                                  |
| Storage missing  | `u-storage`                                                               |
| Broken           | `u-fix-bug`                                                               |

### Phase 4-I — Continuation Plan

```
CONTINUATION PLAN
======================================================
Resuming from: [last completed step]
Remaining (in order):
  1. [concrete action]
  2. [concrete action]
  3. npm run typecheck && npm run lint
Files to fix first: · [file:line] — [exact fix]
======================================================
```

### Phase 4.5-I — Pre-Execute Audit

```
Functions / types I plan to call not yet read: [list]
  → Read actual signature / type. Do NOT assume from spec.

Files I plan to modify: [list]
  → Only files in triage list? [yes / scope creep]
```

**Approach Alignment Check** — Consult `.claude/rules/approach-alignment.md`.

### Phase 5-I — Execute

Fix broken things before adding new things:

1. Fix TS errors and lint warnings.
2. Run Plop for missing scaffolds.
3. Complete partial implementations.
4. **Wire route + i18n + storage keys in parallel** — these edit different files, spawn as parallel `Agent(...)` calls:
   - Agent 1: Create / update route file under `app/`.
   - Agent 2: Add missing i18n keys to BOTH `en.json` and `vi.json`.
   - Agent 3: Add missing storage keys to `storage-keys.ts` (if persisted state added).
5. `npx prettier --write ...`

### Phase 6-I — Verify

```bash
npx prettier --write $(git diff --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
npm run typecheck
npm run lint
```

Fix each error/warning once, then re-run once. **If errors persist after the second run — surface exact errors and stop. Do not loop.**

If changes involve new screens / data / features, invoke `/u-finalize` once.

### Phase 7-I — Summary

```
RESUMED  [feature name]
==========================================
Was: [where previous session stopped]
Did: [what was completed this session]

Flow:   OrderListScreen → useGetOrders → orders-api.getOrders → axios
                       ↳ useUpdateOrder.mutate() → orders-api.updateOrder → axios

Files:  + path/file.tsx  (created)
        ~ path/file.ts   (modified)

Check:  routes ok · wiring ok · i18n ok · typecheck 0 · lint 0
==========================================
```

---

## Common Scenarios

| Scenario             | Signal                                      | Action                                                  |
| -------------------- | ------------------------------------------- | ------------------------------------------------------- |
| Scaffold mode        | `TODO(ai)` markers                          | Fill data → domain → presentation                       |
| Mid-Plop interrupt   | Generated files unmodified                  | Fill all stubs                                          |
| Stopped after hook   | No `*-screen.tsx`                           | `npx plop screen --name=...`, implement screen          |
| Route file missing   | `router.push('/x')` but no `app/x.tsx`      | Create the file, point to screen export                 |
| i18n keys missing    | `t('xxx.yyy')` in JSX, absent from JSON     | Add to BOTH `en.json` and `vi.json`                     |
| Stale persist        | Store shape changed, no `version`/`migrate` | Bump `version` + add `migrate`                          |
| Looping on TS errors | Same error reappears                        | Fix root cause                                          |
| Partial screen       | Screen renders only `<View />`              | Implement all sections                                  |
| Native module added  | Package installed, app crashes              | `npx expo prebuild --clean && npx expo run:ios/android` |

## Never Do

- Fill `TODO(ai)` markers with placeholder code or comments — implement fully.
- Skip the `git diff` audit before continuing — the diff is the only source of truth.
- Restart from scratch; always continue from where execution stopped.
- Run the same failing command without changing something first.
- Assume what's complete without reading the diff — gaps hide in generated stubs.

---

## See Also

- `u-task` — full orchestrator (when starting fresh, not resuming).
- `u-fix-bug` — for `BROKEN` triage items.
- `u-finalize` — pre-commit audit when scope ≥ Type C.
- `u-codegen` — Plop generators reference.
