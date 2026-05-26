# Skill Workflow Routing

This project uses a **single skill system: the `u-*` suite**. Every implementation,
fix, review, or question routes through a `u-*` orchestrator skill.

> Load **`u-task`** for any implementation request — it internally orchestrates the
> domain skills (`u-screen`, `u-api`, `u-controller`, ...). You rarely load domain
> skills by hand.

## Orchestrator Skills (entry points)

| User Intent                                             | Load skill   |
| ------------------------------------------------------- | ------------ |
| "implement X", "build X", "add feature X", "new screen" | `u-task`     |
| "X is broken", "bug in X", "crash", "wrong behaviour"   | `u-fix-bug`  |
| "continue", "resume", fill a `TODO(ai)` scaffold        | `u-continue` |
| "is this ready?", PR / branch readiness review          | `u-review`   |
| End-of-task self-audit before shipping                  | `u-finalize` |
| Any question, brainstorm, compare options, strategy     | `u-ask`      |
| Real-device E2E UI automation (Maestro)                 | `u-verify`   |

## Core Development Flow

```
u-ask (optional: explore options)
   → u-task (plan → Plop scaffold → fill layers → typecheck/lint)
   → u-testing (unit + integration)
   → u-review (readiness)
   → u-finalize (self-audit → ship decision)
```

`u-task` already runs the Analyze → Plan → Execute → Verify workflow from `CLAUDE.md`.
Do NOT pre-plan separately — the planning phase lives inside `u-task`.

## Bugfix Flow

```
u-fix-bug (classify → trace root cause → minimal fix → verify layer contracts)
   → u-testing (regression)
   → u-review
```

Write a failing test that reproduces the bug FIRST, then fix (Karpathy goal-driven gate).

## Investigation Flow

```
u-ask (understand / compare approaches)        → for strategy questions
Explore subagent (see agent-speed.md Rule 1)   → for codebase structure questions
research skill                                  → for external tech/library research
```

## Setup / Support Skills

- `u-worktree` — isolated git worktree per feature/fix before starting.
- `u-codegen` — Plop generators, yarn scripts, `expo prebuild`, `eas build`.
- `u-architecture` — layer placement, store registration, route grouping decisions.

## Post-Implementation Checklist

- `u-review` — readiness review before merging.
- `u-finalize` — end-of-task self-audit (git diff → layer/wiring/RN-style checklist).
- `journal` — document decisions and lessons (optional).

See `skill-domain-routing.md` for picking the right domain `u-*` skill,
and `karpathy-principles.md` for the quality gates applied at each step.
