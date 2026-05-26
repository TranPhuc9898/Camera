---
name: u-doc
description: 'Documentation — package READMEs, feature docs, ADRs, API references, changelog. What to document, where, format. Triggers — documentation, doc, README, ADR, architecture decision, changelog, api docs, feature doc, write docs.'
---

# u-doc — Documentation

## TL;DR

- Every feature folder has a `README.md` only if non-obvious from code
- Architecture decisions go in `docs/adr/` — short, decision + alternatives + reason
- Top-level `docs/` folder for project-overview, code-standards, codebase-summary
- Changelog auto-generated from Conventional Commits (no manual entries)
- Inline doc comments only when behavior is non-obvious — not "this function does X"
- READMEs are markdown; keep under 200 lines

## When to load

Asked to document something, deciding "should I write a README", recording an architecture decision, refreshing top-level docs.

---

## Documentation layers

| Where                          | What                                              | When                                 |
| ------------------------------ | ------------------------------------------------- | ------------------------------------ |
| Top-level `README.md`          | "How do I run this app" — setup, dev, build, test | Always; refresh quarterly            |
| `docs/project-overview-pdr.md` | Product, audience, success criteria               | Stable — update on major scope shift |
| `docs/system-architecture.md`  | High-level architecture diagram + key decisions   | When architecture shifts             |
| `docs/code-standards.md`       | Conventions (naming, layer, lint rules)           | When standards change                |
| `docs/codebase-summary.md`     | Map of features, what each does                   | Refresh per release                  |
| `docs/adr/<NNN>-<slug>.md`     | One architectural decision                        | Each non-trivial decision            |
| `docs/development-roadmap.md`  | Phases, milestones                                | Living                               |
| `docs/project-changelog.md`    | What shipped, when (auto from commits)            | Auto                                 |
| `src/features/<f>/README.md`   | Feature-specific notes (only if non-obvious)      | When code alone doesn't explain      |
| `src/lib/<concern>/README.md`  | Library API surface, examples                     | Per lib                              |

---

## When to write a feature README

```
Should this feature have a README?

├── Folder structure deviates from the standard pattern? → YES
├── Has cross-feature contract (e.g. publishes events)? → YES
├── Uses a non-obvious algorithm or external service?    → YES
├── Standard CRUD over an api?                           → NO (code is self-evident)
└── Single screen + form?                                → NO
```

---

## Feature README template

```markdown
# Orders

## Purpose

Browse, filter, and cancel orders for the current user.

## API

- `GET /orders` → list
- `GET /orders/:id` → detail
- `PATCH /orders/:id` (status: 'cancelled', cancelReason) → cancel

## Flow

- `OrderListScreen` → `useGetOrders(filter)` → `getOrders` → axios
- `OrderDetailScreen` → `useGetOrder(id)` + `useCancelOrder()`

## Cross-feature contracts

- Emits `AnalyticEvent.orderCancelled` after successful cancel
- Reads `useAuthStore.user.id` for filter scope

## Storage

- `StorageKeys.recentOrders` — last 10 viewed (MMKV)

## Notes

- Cancellation reason is plain text, BE truncates at 240 chars (BE-side validation).
```

Keep under 80 lines for a typical feature.

---

## ADR template

```markdown
# ADR-007: Use Zustand for client state

Date: 2025-12-01
Status: Accepted

## Context

We need a client-state solution for filters, drafts, and global concerns
(auth, theme). Considered: Redux Toolkit, MobX, Recoil, Zustand, plain Context.

## Decision

Use Zustand 5 with `persist` + MMKV for global stores, plain stores for feature-local.

## Reasons

- Zero boilerplate vs Redux
- Selectors prevent over-render
- Persist middleware composes cleanly with MMKV adapter
- Smaller bundle than MobX/Recoil

## Alternatives rejected

- **Redux Toolkit**: too much boilerplate for a single-team app
- **MobX**: tied to class observable model; mismatch with hooks
- **Context only**: re-render storms on every change

## Consequences

- New state is Zustand by default — no debate per feature
- Migrations need explicit `version` + `migrate` per persisted store
- Devtools: zustand devtools middleware on dev only
```

Number ADRs sequentially (`001-`, `002-`). Never edit accepted ADRs — supersede with a new one referencing the old.

---

## Inline doc comments — when

```ts
// ✅ Comment because subtle reason
// MMKV.getString returns undefined for missing key (not null) — coerce here
//   so JSON.parse never sees 'undefined' literal.
const raw = storage.getString(key) ?? null;

// ❌ Comment that just restates code
// Get the user from the store
const user = useUser();
```

Defaults: NO comment. Add one only when WHY is non-obvious.

---

## Top-level README

````markdown
# Unicorn

Mobile app — Expo + React Native + Clean Architecture.

## Quick start

\```bash
yarn install
cp .env.example .env.development # fill values
yarn expo start # iOS / Android / web
\```

## Build

\```bash
yarn eas build --profile preview --platform ios
\```

## Tests

\```bash
yarn typecheck && yarn lint && yarn test
\```

## Docs

- Architecture → `docs/system-architecture.md`
- Code standards → `docs/code-standards.md`
- Roadmap → `docs/development-roadmap.md`

## Skills (Claude Code)

See `.claude/skills/` — load `u-task` for any feature work.
````

---

## Changelog

Auto-generated from Conventional Commits via `conventional-changelog` or `release-please`.

Manual entries go in `docs/project-changelog.md` only for items that don't map cleanly to a single commit (e.g. "Migrated from MobX to Zustand over 4 PRs").

---

## API reference (for libs)

For `src/lib/<concern>/`, README documents the public surface:

````markdown
# @/lib/storage

## Exports

- `storage: MMKV` — main instance
- `mmkvJSONStorage` — Zustand persist adapter
- `StorageKeys` — enum of all keys

## Usage

\```ts
storage.set(StorageKeys.feedFilter, 'pending')
const v = storage.getString(StorageKeys.feedFilter)
\```

## Adding a key

1. Add to `StorageKeys` enum
2. Reference via the enum, never inline string

## Don't

- Use for tokens (use `expo-secure-store`)
````

---

## Do / Don't

| ✅                                    | ❌                            |
| ------------------------------------- | ----------------------------- |
| README only when non-obvious          | README per feature regardless |
| ADR for non-trivial decisions         | ADR for every PR              |
| Comment WHY, not WHAT                 | "// Get user from store"      |
| Conventional Commits → auto changelog | Manually maintained changelog |
| Update docs in same PR as code        | "I'll update docs later"      |
| Keep README < 200 lines               | Wall of text                  |

---

## See also

- `u-architecture` — what the system map should reflect in `docs/system-architecture.md`
- `u-finalize` — pre-commit doc-impact check
- `u-create-skill` — skill files are a special doc type
- `u-task` — task plans live in `plans/`, not `docs/`
