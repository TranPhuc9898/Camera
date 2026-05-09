---
name: u-ask
description: "Project-adapted advisor: answer any question, brainstorm options, compare approaches, or give strategy recommendations grounded in the actual unicorn codebase. Triggers: how do I, what is, should I, why does, explain, brainstorm, compare, best way, recommend, advice, strategy, which approach, what's the difference, help me think, can I, is it possible."
---

# unicorn — Ask Advisor

## TL;DR

Classify the question (0) → gather codebase context when needed (1) → constrain to actual stack (2) → answer with evidence (3) → route to next skill if actionable (4). Generic Expo / React Native advice without project context is worse than no advice — every claim about how something works here must trace to an actual file.

## When to load this skill

Load when the user asks a question about how the unicorn app is built, wants to compare approaches inside this stack, brainstorm a feature, or get a recommendation before implementing. Do NOT load for direct implementation, debugging, or PR-review requests — those route to `u-task`, `u-fix-bug`, or `u-review` respectively.

---

## Phase 0 — Classify the Question

Identify the type immediately, then output the classification block:

| Type           | Pattern                                    | Action                                       |
| -------------- | ------------------------------------------ | -------------------------------------------- |
| **How**        | "How do I add X / implement Y"             | Explore for the real pattern → show it       |
| **What**       | "What is X / what does X do here"          | Explain from codebase evidence               |
| **Should**     | "Should I X or Y / which is better for Z"  | Stack-constrained decision                   |
| **Compare**    | "X vs Y / difference between X and Y"      | Side-by-side within this stack only          |
| **Brainstorm** | "Help me think through X / ideas for X"    | Context-aware ideation → u-task-ready output |
| **Explain**    | "Explain how X works in this project"      | Grounded walkthrough with file:line          |
| **Why**        | "Why is X broken / not working / crashing" | → Route to `/u-fix-bug`                      |
| **Implement**  | "Build / create / add / make feature X"    | → Route to `/u-task`                         |
| **Review**     | "Is this ready / review X / check my code" | → Route to `/u-review`                       |

```
QUESTION TYPE: [How / What / Should / Compare / Brainstorm / Explain]
Codebase-dependent: [yes — Phase 1 needed / no — answer from stack knowledge]
Route to: [u-fix-bug / u-task / u-review / continue here]
```

**Immediate routing rules (stop — do not answer inline):**

- "Why is X broken / not working / crashing / wrong" → reply: "This is a debugging question — run `/u-fix-bug`: [restate symptom]." Stop.
- "Build / create / implement / add feature X" → reply: "This is an implementation task — run `/u-task`: [restate feature]." Stop.
- "Review / is this ready / check my PR" → reply: "Run `/u-review`." Stop.

---

## Phase 1 — Gather Context

**Skip this phase** for pure concept questions where the answer is definitively in the stack knowledge (e.g. "what is a Zustand selector?", "what does TanStack `useQuery` do?"). Go straight to Phase 3.

**For codebase-dependent questions** (e.g. "how does X work in _this_ project", "what pattern does the existing Y follow", "brainstorm how to build Z given our current code"):

Identify files to explore by topic:

| Topic                  | Files to explore                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Server state / queries | A `use-*-query.ts` / `use-*-mutation.ts` in a similar feature, `src/lib/api/query-provider.tsx` |
| Client state / Zustand | A `*-store.ts` in a similar feature, `src/lib/arch/index.ts` (BaseStore helpers)                |
| Navigation / routes    | `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, a nearby `*-screen.tsx`                            |
| Storage                | `src/lib/storage/mmkv.ts` (`StorageKeys` enum), a file using `StorageKeys`                      |
| Error handling         | A `use-*-mutation.ts` with `onError`, `src/lib/arch` (AppError)                                 |
| API / HTTP             | A `src/features/<f>/api.ts`, `src/lib/api/client.ts`, interceptors                              |
| UI / theming           | `src/theme/index.ts`, `tailwind.config.js`, a nearby `*-screen.tsx` with NativeWind classes     |
| Forms                  | A `*-form.tsx` using `react-hook-form` + zod, `src/lib/i18n/index.ts` for error messages        |
| Architecture / layers  | `src/lib/arch/index.ts`, `app/_layout.tsx`, one representative file per relevant layer          |
| Brainstorm (feature)   | The `src/features/<closest>/` folder + `app/_layout.tsx`                                        |

If ≥3 files are needed, delegate to an Explore subagent (see `.claude/rules/agent-speed.md` Rule 1):

```
Agent(
  subagent_type: "Explore",
  description: "Find [pattern/feature] in unicorn",
  prompt: "Read: [file list from table above].
           Answer these questions with file:line citations:
             1. [specific question about the pattern / existing usage]
             2. [follow-up question if needed]
           Under 200 words. File:line citations only — no raw file content."
)
```

If <3 files, read inline.

---

## Phase 2 — Constraint Check

Before answering, verify the recommendation fits the actual stack. Flag any collision and state the unicorn equivalent — never debate the choice.

```
Stack constraints:
  Server state: TanStack Query v5 (useQuery / useMutation)        NOT SWR / Apollo / RTK Query / fetch in component
  Client state: Zustand 5 (with persist + MMKV adapter)           NOT Redux / MobX / Recoil / Context for global
  Local state:  useState / useReducer (truly local UI flags)      NOT Zustand for ephemeral modal flags
  Routing:      Expo Router v6 (<Stack>, <Tabs>, useRouter)       NOT React Navigation directly / deeplink libs
  HTTP:         axios via src/lib/api/client.ts (interceptors)    NOT fetch directly / raw axios.create scattered
  Storage:      react-native-mmkv v4 createMMKV + StorageKeys     NOT AsyncStorage / new MMKV(...) v3 / ad-hoc keys
  Auth tokens:  expo-secure-store via src/lib/auth                NOT MMKV for tokens / AsyncStorage for tokens
  Logging:      log.info/debug/warning/error/critical              NOT console.log / console.warn
  i18n:         t('key') from useTranslation (react-i18next)      NOT inline strings / custom util
  Theme:        NativeWind className + AppSpacing tokens          NOT inline style={{...}} for static / hex colors
  Forms:        react-hook-form + zod resolver                    NOT manual useState per field / Formik
  Animation:    react-native-reanimated v3 worklets                NOT Animated API / Moti for new code
  E2E:          Maestro (YAML flows)                              NOT Detox / Appium
  Imports:      @/lib/* / @/features/* (path alias)               NOT ../../../lib/...
```

If the question references a banned alternative: state clearly that it is not in this stack, then immediately explain the unicorn equivalent.

---

## Phase 3 — Answer

Shape the response by question type.

### How (pattern questions)

```
Pattern: [name of the pattern in this project]
File:    [file:line — canonical example]
```

```tsx
// [10-20 line compilable example consistent with unicorn APIs]
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/features/orders/api';
import type { Order } from '@/features/orders/types';

export function useOrdersQuery() {
  return useQuery<Order[]>({
    queryKey: ['orders', 'list'],
    queryFn: () => ordersApi.list(),
    staleTime: 30_000,
  });
}
```

```
Rules:
  . [rule 1 — grounded in codebase evidence]
  . [rule 2]
```

### Should / Compare (decision questions)

```
Decision: [what is being chosen between]

[Option A]: [name]
  Use when: [condition]
  unicorn example: [file:line]

[Option B]: [name]
  Use when: [condition]
  unicorn example: [file:line]

Recommendation: [A] — [1-sentence reason grounded in this project's pattern].
```

Common decision matrices already settled in this stack:

| Decision                                          | Pick                  | Reason                                                   |
| ------------------------------------------------- | --------------------- | -------------------------------------------------------- |
| Zustand vs Redux vs Jotai for global client state | Zustand               | Already wired with MMKV persist; no boilerplate          |
| TanStack Query vs SWR for server state            | TanStack Query v5     | QueryClient + DevTools already configured                |
| Reanimated vs Moti for animations                 | Reanimated v3         | Worklets give 60fps; Moti is a thin wrapper, no new wins |
| MMKV vs AsyncStorage for local data               | MMKV v4               | Synchronous, 10x faster, already wrapped                 |
| `expo-secure-store` vs MMKV for tokens            | expo-secure-store     | Keychain/Keystore-backed; MMKV is plain disk             |
| `react-hook-form` vs Formik vs manual `useState`  | react-hook-form + zod | Resolver pattern + zero re-render cost                   |
| Expo Router vs React Navigation                   | Expo Router v6        | File-based, deeplinks free, project default              |
| NativeWind vs StyleSheet vs styled-components     | NativeWind            | Tailwind tokens mirror `src/theme/index.ts`              |

### Brainstorm

```
Goal: [restated in 1 sentence]
Existing code that shapes this: [file:line — what already exists]

Approaches (all within stack constraints):
  1. [approach name] — [how it works] — [tradeoff]
  2. [approach name] — [how it works] — [tradeoff]
  3. [approach name, if genuinely different] — [tradeoff]

Recommended: [N] — [1-sentence reason tied to project patterns].

To implement: /u-task "[1-sentence feature description using recommended approach]"
```

### Explain

```
[Component / concept] in this project:
  [2-3 sentence explanation grounded in actual implementation]

Where it lives:   [file:line — canonical source]
How it's used:    [file:line — a real call site in src/features/ or app/]

See also: [related skill if applicable]
```

### What (API / concept questions)

Answer directly from stack knowledge. If the component lives in a known file, cite it (e.g., `src/lib/api/client.ts:12` for the axios instance, `src/lib/storage/mmkv.ts:8` for `StorageKeys`).

---

## Phase 4 — Route

End every response with exactly one of:

```
→ To implement:  /u-task "[feature description]"
→ To debug:      /u-fix-bug "[symptom]"
→ To review:     /u-review
→ Done — no further action needed.
```

---

## Response Rules

- Lead with the answer — no preamble ("Let me...", "Great question...").
- Every claim about existing behavior has a `file:line` citation.
- Every code example compiles against unicorn APIs (`useQuery` not `useSWR`, `createMMKV` not `new MMKV`, `t('key')` not `.tr()`, `className` not `style={{}}`for static).
- Never give pros/cons of banned alternatives — state the equivalent and move on.
- Max 300 words for How / What / Explain. Brainstorm and Compare may run longer if options genuinely differ.
- No trailing summary after the answer — the Phase 4 route line is the closing.

---

## Never Do

- Answer "how do I X" from generic Expo / React Native knowledge — explore the actual project pattern first.
- Recommend Redux, MobX, Recoil, SWR, Apollo, Formik, AsyncStorage, Detox, or any other banned alternative.
- Use `new MMKV(...)` (v3 API) — always `createMMKV({...})` (v4 Nitro Modules).
- Use `storage.delete(key)` — always `storage.remove(key)`.
- Use `useState` for server data or global app state — route to TanStack Query / Zustand respectively.
- Cite a `file:line` without having read or explored the file — hallucinated citations are worse than none.
- Route a brainstorm straight to `/u-task` without presenting options first — the user asked to think, not just build.
- Answer implementation, debugging, or review questions inline — route them immediately in Phase 0.
- Give a code example where a screen imports `api.ts` directly or calls `axios` — layer contracts always apply, even in examples (use a use-case hook).

---

## See also

- `u-architecture` — layer boundaries, file placement, where does X go
- `u-task` — full implementation pipeline (the destination of most "how / brainstorm" answers)
- `u-fix-bug` — root-cause debugging (route here for any "why is X broken")
- `u-review` — PR / branch readiness audit
- `u-continue` — resume an incomplete `TODO(ai)` scaffold
- `u-finalize` — end-of-task self-audit
- `u-controller` — feature-local Zustand stores
- `u-global-store` — `src/lib/*` global stores (auth, theme, connectivity)
- `u-usecase` — TanStack `useQuery` / `useMutation` hook patterns
- `u-api` — axios client + interceptors
- `u-storage` — MMKV v4 + `StorageKeys`
- `u-screen` — screen widget structure
- `u-navigation` — Expo Router v6 patterns
