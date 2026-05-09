---
name: u-review
description: 'Readiness review for unicorn (Expo + RN): classify → understand intent → approach/design review → logic walk-through → complexity/cleanliness → project rules → verified issues only → markdown with prioritized checkboxes. Triggers: review, code review, PR review, ready to ship, readiness check, is this ready.'
---

# unicorn — Code Review & Readiness Report

Produce a developer-facing readiness report written to a markdown file. Every reported issue **must be confirmed against actual code** before appearing in the report. This is NOT `u-finalize` (Claude's own pre-commit audit) — this report is for the developer to read, act on, and track.

> **TL;DR** — Collect diff (0) → classify A-H (1) → load skills (2) → understand flow + impact (3) → review §0-§9 per type (4) → verify every issue has `file:line` (5) → write `review/{branch}.md` (6).

> **Prerequisite** — If `u-finalize` ran this session and surfaced unresolved blockers, do not produce a review report. Respond: "u-finalize found blockers — resolve them first, then run u-review."

> **Role in the pipeline**: `u-finalize` is the **fix phase**. `u-review` is the **verify phase** (confirms correctness and produces the report).

---

## Phase 0 — Collect Changes

```bash
git branch --show-current
git log main...HEAD --oneline
git diff main...HEAD --stat
git diff main...HEAD --name-only
```

If on main / reviewing uncommitted only:

```bash
git diff HEAD --stat && git diff HEAD --name-only
```

```
CHANGE SUMMARY
======================================================
Branch:   [name]            Base: [main]
Commits:  [N] — [list titles]
Files:    [N changed]       Lines: +[added] / -[removed]
Changed:  screens / sheets / components / hooks /
          api / stores / types / routes (app/) / i18n / config
======================================================
```

---

## Phase 1 — Classify Change

| Type  | Description                                  | Review depth                                                 |
| ----- | -------------------------------------------- | ------------------------------------------------------------ |
| **A** | UI-only — no new data, no logic change       | Style + Subscriptions + Accessibility                        |
| **B** | Logic / state — existing store / hook edited | Approach + Logic walk-through + Concurrency                  |
| **C** | New screen or sheet                          | Full: Approach + Architecture + Wiring + Routes + UI + Logic |
| **D** | Data layer — hook / api function changed     | Approach + Data integrity                                    |
| **E** | Full feature — new screen + hook + api       | All sections                                                 |
| **F** | Config / wiring / routes only                | Registration completeness                                    |
| **G** | Refactor — behaviour unchanged               | Approach simplicity + Layer contracts + No regressions       |
| **H** | Bug fix                                      | Root cause addressed + No symptom masking + Regression check |

---

## Phase 2 — Load Skills

| Changed files                                  | Skills                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `*-screen.tsx`, `*-sheet.tsx`, `app/.../*.tsx` | `u-screen`, `u-rn-ui`, `u-reactive-state`                                 |
| `*-store.ts`                                   | `u-controller` / `u-global-store`, `u-reactive-state`, `u-error-handling` |
| `use-*.ts`                                     | `u-usecase`, `u-architecture`                                             |
| `*-api.ts`, `*-types.ts`                       | `u-api`, `u-architecture`                                                 |
| `app/_layout.tsx`, `(group)/_layout.tsx`       | `u-architecture`, `u-navigation`                                          |
| `storage-keys.ts`, persist configs             | `u-storage`                                                               |
| i18n locales                                   | `u-i18n`                                                                  |

---

## Phase 3 — Understand Changes

**Read every changed file before reviewing. No review without reading.**

**For PRs with ≥4 changed files: delegate Phase 3.1 and 3.2 to an Explore subagent**:

```
Agent(
  subagent_type: "Explore",
  description: "Map end-to-end flow for [branch] PR",
  prompt: "Read these changed files: [list from Phase 0 --name-only].
           Answer:
             1. Draw the end-to-end data flow (screen → hook → api → axios → API).
             2. Which components are also used by other screens (shared risk)?
             3. What is the feature intent in 1-2 sentences?
           Return: ASCII flow diagram + impact map + intent sentence. Under 300 words."
)
```

**For PRs with <4 changed files:** read inline.

### 3.1 End-to-End Flow

```
OrderListScreen [CHANGED] → useGetOrders [NEW] → orders-api.getOrders [NEW] → axios → API
              ↳ useUpdateOrder.mutate() → orders-api.updateOrder → axios → API
              ↳ useOrderFilterStore (status)
Side: router.push('/orders/[id]') / toast.success(...) / analytics.track(OrderViewedEvent)
```

### 3.2 Impact Map

```
Changed component: [hook / store / api function / shared component]
Also used by:      [screens / hooks that share the same data or store]
Risk:              [could this change affect them? yes / no]
Action:            [read those files if risk = yes]
```

### 3.3 Feature Intent & Approach

```
Feature intent:   [What should this feature do? — 1-2 sentences]
Approach taken:   [How is it implemented? — core mechanism in 2-3 sentences]
Approach verdict: [simplest correct solution / over-complicated — see §0]
```

### 3.4 Spec Compliance Check

> Source priority: (1) `u-task` EXPANDED REQUEST block in conversation context, (2) commit message with stated goal, (3) user's original message. If none found: note "not available" and proceed.

```
Spec source:      [u-task EXPANDED REQUEST / commit message / user message / not available]

Stated success criteria:
  · [criterion 1]
  · [criterion 2]

Compliance:
  · [criterion 1] → [met: evidence at file:line / partial / NOT MET]
  · [criterion 2] → [met / partial / NOT MET]

Out-of-scope items built:
  · [file or feature not in stated scope / none]

Verdict: COMPLIANT / PARTIAL (note gaps) / DIVERGED (blocker — major scope drift)
```

> DIVERGED is a blocker in Phase 6 reporting even if the code is clean. Partial is a Warning. COMPLIANT with out-of-scope items is a Suggestion to remove them.

---

## Phase 4 — Review Sections

> Run only sections relevant to the classified type. Skip and note skipped sections.

### §0 Approach & Design (B, C, D, E, G — skip for A, F, trivial H)

```
Stated goal: [what the feature should do]
Approach: [how it does it in 1 sentence]

Is there a simpler approach? [yes — describe it / no]
Does the approach handle edge cases by construction? [yes / no — each case patched individually]
```

Code smell signals: Multiple booleans for one concern → discriminated union or `useQuery` status. Boolean flag parameter → split into two functions. Nested conditions > 2 levels → guard clauses / early return.

### §1 Logic Correctness (B, C, D, E, H)

Walk the logic step by step. At each step: `[file:line — function called] → [state after] → [correct: yes/deviation]`.

Check every `if`, `&&`, `||`, `?` for boundary bugs (`>` vs `>=`, wrong negation, null/undefined check on wrong side, `length === 0` vs `length > 0`).

### §2 Complexity & Cleanliness (All types with logic)

- Nesting depth > 2 levels → flag.
- Function/component > ~80 lines → flag.
- Bool flags > 2 for same concern → flag.
- Same logic 2+ times → extract.
- New abstraction with only 1 call site → remove.
- Component with > 3 `useEffect` → review for splitting.

### §3 Architecture & Layer Contracts (C, D, E, F, G)

```
Screens use hooks (use-*) only — no direct axios/fetch:  [yes / file:line]
Hooks call api functions only — no direct axios:         [yes / file:line]
Server state via TanStack Query — not Zustand:           [yes / file:line]
UI/local state via useState or Zustand (not Query):      [yes / file:line]
Route file exists for every router.push() target:        [yes / missing: /xxx]
Provider stack updated when needed (app/_layout.tsx):    [yes / N/A / missing]
Storage keys added to storage-keys.ts:                   [yes / N/A / missing]
expo-secure-store for tokens, MMKV for non-sensitive:    [yes / file:line wrong]
```

### §4 Subscriptions & Reactive State (A, B, C, E)

```
Selectors return primitives or use useShallow:           [yes / file:line returns new obj]
useEffect deps include every used external value:        [yes / file:line missing dep]
useEffect cleanup matches every subscription/timer:      [yes / file:line leaks]
Mutation onSuccess invalidates the right query keys:     [yes / file:line wrong key]
queryKey factory used (not inline strings):              [yes / file:line inline]
No useState mirroring server data already in Query:      [yes / file:line duplicates]
```

### §5 Error Handling (B, C, D, E, H)

```
Mutations have onError that logs + toasts:               [yes / file:line silent]
api functions map AxiosError → AppError:                 [yes / file:line raw axios error]
log.error('[Component] msg', e) — not console.error:     [yes / file:line]
Errors are AppError, not raw Error:                      [yes / file:line throws raw]
Error messages are i18n keys:                            [yes / file:line hardcoded English]
No empty catch {}:                                       [yes / file:line]
```

### §6 Performance & Threading (B, C, D, E)

```
Long lists use FlatList/FlashList with keyExtractor:     [yes / file:line ScrollView+map]
Heavy work off the JS thread (Reanimated / native):      [yes / N/A / file:line]
Memoised only where measured (useCallback/useMemo):      [yes / file:line premature]
expo-image used for non-trivial images:                  [yes / N/A / file:line plain Image]
Polling/intervals scoped to screen lifecycle:            [yes / file:line leaks]
```

### §7 Edge Cases (B, C, D, E, H)

```
· Empty state (no items)              → [handled / NOT HANDLED]
· First launch (no persisted value)   → [handled / NOT HANDLED]
· Rapid user actions (double-tap)     → [handled / NOT HANDLED — debounce / disable on pending]
· Large data set (>100 items)         → [pagination / virtualised / NOT HANDLED]
· Offline / no network                → [handled / NOT HANDLED]
· Backgrounded then resumed           → [handled / NOT HANDLED]
```

### §8 Style & Conventions (All types)

```
Spacing — NativeWind classes / theme tokens:             [yes / file:line raw px]
Colors — NativeWind / theme tokens, no hex literals:     [yes / file:line]
Strings — t('key') only:                                 [yes / file:line hardcoded English]
File names — kebab-case + correct suffix:                [yes / file:line]
Path aliases — @/ instead of deep relatives:             [yes / file:line ../../]
Import order (node→react/RN→3rd→@/lib→@/features→rel):   [yes / file:line wrong]
No `any`, no `as any`:                                   [yes / file:line]
No console.log left over:                                [yes / file:line]
No useEffect+fetch where useQuery fits:                  [yes / file:line]
```

### §9 i18n (types with user-visible strings)

```
Keys used: [list all t('xxx.yyy') in changed files]
Missing from en.json: [list / none]
Missing from vi.json: [list / none]
Inconsistent key shape between locales: [list / none]
```

---

## Phase 5 — Verify Before Reporting

**Every issue must pass this gate before entering the report.**

For each candidate issue:

```
Issue:     [description]
Evidence:  [file:line — paste the relevant lines]
Reachable: [is this code path actually reached?]
Verdict:   [REPORT / DISCARD — reason]
```

**Discard if:** Handled elsewhere in the diff. Theoretical — not reachable. Exists in untouched code predating this PR. Pure style preference already passing typecheck/lint.

---

## Phase 6 — Write Report

Write to: `review/${BRANCH}.md`

```markdown
# Review: [branch-name]

**Date**: [YYYY-MM-DD]
**Base**: [main]
**Status**: NOT READY / NEEDS MINOR FIXES / READY TO SHIP

## Summary

[2-3 sentences: what this change does and why]

**Type**: [A/B/C/D/E/F/G/H] — [description]
**Risk**: LOW / MED / HIGH

## End-to-End Flow

[ASCII flow — annotated with CHANGED / NEW / REMOVED]

## Approach Assessment

**Intent**: [1 sentence]
**Approach**: [1-2 sentences]
**Verdict**: Simplest correct / Could be simplified / Wrong approach

---

## Issues

🔴 Blocker · path/file.tsx:NN — [title] — [explanation + fix]
🟠 Warning · path/file.ts:NN — [title] — [explanation]
🟡 Suggestion · path/file.ts:NN — [title] — [explanation]

---

## Scorecard

| Category              | Result                         |
| --------------------- | ------------------------------ |
| Spec Compliance       | compliant / partial / diverged |
| Approach & Design     | ok / [describe]                |
| Logic Correctness     | ok / [N issues]                |
| Architecture & Layers | ok / [describe]                |
| Wiring & Routes       | ok / missing: [list]           |
| Subscriptions / State | ok / [describe]                |
| Error Handling        | ok / [describe]                |
| Performance           | ok / [describe]                |
| Style & Conventions   | ok / [describe]                |
| i18n                  | ok / missing keys: [list]      |

## Sections Skipped

[Section — reason]
```

After writing:

```
━━━ review/[branch-name].md ━━━━━━━━━━━━━━━━━━━━━━━━━━━
[N] 🔴 · [N] 🟠 · [N] 🟡 · Status: NOT READY / NEEDS MINOR FIXES / READY TO SHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Status Rules

| Status            | Condition                                 |
| ----------------- | ----------------------------------------- |
| READY TO SHIP     | 0 blockers, 0 warnings (or all justified) |
| NEEDS MINOR FIXES | 0 blockers, ≥1 warning                    |
| NOT READY         | ≥1 blocker                                |

## Priority Rules

| Priority   | Examples                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blocker    | Wrong approach; layer violation (axios in screen); missing route file; missing query invalidation; crash risk; missing i18n key; server state in Zustand; empty `catch {}` |
| Warning    | Unnecessary complexity; flag-based state; unhandled edge case; missing analytics; premature memoisation                                                                    |
| Suggestion | Style preference; optional `useShallow`; minor naming; readability improvement                                                                                             |

## Never Do

- Report an issue without a `file:line` and the actual lines of code.
- Flag issues in untouched code predating this PR.
- Rubber-stamp without reading every changed file.

---

## See Also

- `u-finalize` — pre-commit self-audit (precedes this skill).
- `u-architecture` — layer rules.
- `u-error-handling` — error taxonomy.
- `u-i18n` — locale sync rules.
- `u-navigation` — Expo Router routes.
