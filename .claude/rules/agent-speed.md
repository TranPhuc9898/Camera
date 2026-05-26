---
# No path filter — applies to every task in this project
---

# Agent Speed & Context Hygiene

Use these rules for every multi-phase task (u-task, u-fix-bug, u-continue, u-review).
Goal: keep the main session context lean, parallelise independent work, prevent fix loops.

---

## Rule 1 — Delegate Exploration to an Explore Subagent

**When:** Any step that reads ≥3 files to answer structural questions (e.g. "what pattern does this feature follow?", "does a similar mutation hook exist?", "where is the root cause?").

**How:**

```
Agent(
  subagent_type: "Explore",
  description: "Explore [feature/bug area]",
  prompt: "Read: [exact file list or glob patterns under src/ or app/].
           Answer these questions:
             1. [question]
             2. [question]
           Return a compact summary with file:line citations.
           Do NOT return raw file content. Under 300 words total."
)
```

**Why:** The Explore agent reads files internally; only its final summary enters the main session. Without this, every `Read` call dumps hundreds of lines into context — the session slows down as it grows, and compaction erases earlier reasoning.

**Output contract:** Always constrain the Explore prompt with "Under 300 words, file:line citations only." If a specific code snippet is needed, ask for ≤5 lines at the specific line range.

**When NOT to delegate:** Steps requiring <3 file reads — spawning overhead exceeds the benefit.

---

## Rule 2 — Parallelise Independent Steps

**When:** Two or more steps edit different files with no dependency on each other's output.

**Safe-to-parallel pattern** (common across u-task and u-continue):

| Group               | Files touched                                                                              | Why safe                                             |
| ------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Registration trio   | parent `app/(group)/_layout.tsx` + `src/translations/en.json` + `src/translations/vi.json` | All different files, no read-before-write dependency |
| Analytics + storage | analytics events file + `src/lib/storage/mmkv.ts` (StorageKeys)                            | Different files                                      |
| Mutation + API      | `features/<f>/use-cases/use-<a>-mutation.ts` + `features/<f>/api.ts`                       | Different files                                      |

**How:** Send multiple `Agent(...)` calls in a single response — they execute concurrently.

```
// Spawn all three at once — wait for all before proceeding:
Agent(description: "Add Stack.Screen route", prompt: "In app/(app)/_layout.tsx, add ...")
Agent(description: "Add i18n keys", prompt: "In src/translations/en.json AND vi.json, add ...")
Agent(description: "Add storage key", prompt: "In src/lib/storage/mmkv.ts, add ...")
```

**When NOT to parallelise:**

- Steps editing the same file — concurrent writes corrupt the file.
- Code generation (Plop scaffold) — must complete before layer fills that depend on it.
- Layer fills that have sequential dependencies (data → domain → presentation).

---

## Rule 3 — Fix-Loop Prevention

### TypeScript / lint warnings (`yarn typecheck` / `yarn lint`)

**Classify before fixing.** When warnings appear, read each one and group them before touching any code:

- `unused-imports`, `no-unused-vars` — remove the import/code
- type mismatch / cannot find name — fix the type or add the missing reference
- Layer violation (screen calls api directly, skipping use-case hook) — fix the call site

**Fix all in one pass.** Do not fix one warning, re-run, fix the next. Fix every warning in the current run before re-running. One-at-a-time fixing causes cascading reruns.

**Two runs maximum:**

```
typecheck (run 1) → read ALL warnings → classify → fix ALL in one pass → typecheck (run 2)
  → same warning still present: structural issue — surface + STOP
  → new warnings appeared: different root cause — still at the limit — surface + STOP
  → 0 warnings: done
```

**Error fingerprinting:** A warning is "the same" if its file, line, and TS error code (e.g., `TS2322`) match. If it reappears after a fix attempt, the fix addressed the symptom not the root — stop and surface it.

### Build commands (Plop, Metro, EAS)

These are **not** typecheck loops — they follow a different pattern:

| Command                         | Retry strategy                                                                                             | Stop condition                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `yarn plop <gen>` fails         | Read the exact error. Retry once with corrected flags/name if the error is a wrong argument.               | If error is not a wrong argument (missing generator, env issue) → surface immediately, STOP. |
| `yarn expo start` fails (Metro) | Retry once with `--clear` if cache-related.                                                                | Any other error → surface + STOP. Do NOT retry the identical command.                        |
| `eas build` fails               | Read the error. Often a credential or app-config issue — surface + STOP, do not retry.                     | Always STOP — do not retry network/build calls.                                              |
| i18n key sync fails             | Most common cause: key in one of `en.json`/`vi.json` but not the other — add the missing key, re-run once. | If still failing → surface + STOP.                                                           |

**Retry only changes something.** Retrying the exact same command without changing anything is never correct — it will produce the same result.

### Stopping protocol

When any limit is hit:

1. Quote the **exact** error/warning lines (file:line + error text).
2. State which rule was hit ("same warning after fix" / "second typecheck run" / "build retry exhausted").
3. Stop. Do not propose a new plan or alternative fix — surface the blocker to the user.

---

## Rule 4 — Context Hygiene

- After an Explore subagent returns: do NOT re-read the same files inline. Trust the summary.
- For files >150 lines: always use targeted Grep/Glob or pass a line range to Read. Never `Read` a large file to find one method.
- Do not summarise completed steps back to the user — the diff speaks for itself.
