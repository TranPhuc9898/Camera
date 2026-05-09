# CLAUDE.md

## Project Overview

`unicorn` is an **Expo React Native** mobile application built on a Clean Architecture stack. Cross-cutting primitives live under `src/lib/*`; feature modules under `src/features/*`; routes under `app/*` (Expo Router v6).

```
app/                              → Expo Router v6 routes (file-based)
src/lib/arch                      → Result type, BaseStore helpers, BaseRepository contract
src/lib/logger                    → AppLogger interface + react-native-logs impl + Sentry sink
src/lib/connectivity              → NetInfo store + useConnectivity hook
src/lib/storage                   → MMKV v4 wrapper, StorageKeys
src/lib/api                       → axios client + interceptors + TanStack QueryProvider
src/lib/auth                      → expo-secure-store wrapper + token-manager
src/lib/i18n                      → i18next init, type-safe keys, errorMessage helper
src/lib/analytics                 → Sentry init + AnalyticEvent + performer
src/theme                         → AppSpacing/AppRadius/AppDurations/colors/typography tokens
src/features/<feature>            → screens/, components/, api.ts, use-cases/, store, types
src/translations                  → vi.json + en.json
plop-templates/                   → Plop generators (screen, store, api, usecase, sheet, form)
```

## Mandatory Workflow: Analyze → Plan → Execute → Verify

For ANY task (feature, fix, refactor):

1. **Analyze** — Explore relevant code under `src/` and `app/`. Do NOT write code yet.
2. **Plan** — List files to touch, Plop commands, store registrations, skills to load. State the plan first.
3. **Execute** — Run Plop FIRST for new components, then fill logic.
4. **Verify** — `npx prettier --write $(git diff --name-only | grep -E '\.(ts|tsx)$')` once, then `npm run typecheck && npm run lint` (scope: `src/` + `app/` warnings only).

## Critical: npm Required

**ALL** package commands MUST use `npm` / `npx`. No `pnpm`, `yarn`, `bun`. Native commands use `npx expo` / `npx eas`. See the `u-codegen` skill for the full command reference.

## Architecture (STRICT)

```
Presentation  (Screens, Sheets, Components, Stores)  → use-case hooks    ONLY
Domain        (Use-case hooks: useQuery/useMutation) → repository<T>()   ONLY  (or api.ts module)
Data          (api.ts: axios calls, mappers)         → axios client      ONLY
```

- Screens MUST NOT call `axios` directly or import from `api.ts` directly — go through use-case hooks (`useFooQuery`, `useUpdateFooMutation`).
- Use-case hooks live in `src/features/<f>/use-cases/` and wrap TanStack `useQuery`/`useMutation` over `api.ts` calls.
- Repository pattern (optional layer): when a feature has business logic beyond plain HTTP, add `src/features/<f>/repository.ts` between hooks and api.
- Global Zustand stores (auth, theme, connectivity) live in `src/lib/<concern>/` and are imported via shallow selector hooks.
- Feature-local state lives in `src/features/<f>/<f>-store.ts`.

## Key Files (Must-Know)

- [src/lib/arch/index.ts](src/lib/arch/index.ts) — Result type + base store helpers + CrudApi contract.
- [src/lib/logger/index.ts](src/lib/logger/index.ts) — `log.info/debug/warning/error/critical`. Critical pipes to Sentry.
- [src/lib/api/client.ts](src/lib/api/client.ts) — axios instance + auth/refresh/logger interceptors.
- [src/lib/api/query-provider.tsx](src/lib/api/query-provider.tsx) — TanStack QueryClientProvider wrapper.
- [src/lib/auth/secure-storage.ts](src/lib/auth/secure-storage.ts) — expo-secure-store wrapper.
- [src/lib/storage/mmkv.ts](src/lib/storage/mmkv.ts) — MMKV v4 instance + `StorageKeys` enum (add every key here).
- [src/lib/i18n/index.ts](src/lib/i18n/index.ts) — i18next init + `errorMessage(t, err)` helper.
- [src/translations/en.json](src/translations/en.json), [src/translations/vi.json](src/translations/vi.json) — i18n sources. Every key MUST exist in BOTH.
- [src/theme/index.ts](src/theme/index.ts) — `AppSpacing`, `AppRadius`, `AppDurations`, light/dark colors. Mirrored in `tailwind.config.js`.
- [src/config/env.ts](src/config/env.ts) — zod-validated env vars; reads from `EXPO_PUBLIC_*`.
- [app/\_layout.tsx](app/_layout.tsx) — root layout, providers stack (Theme, i18n, QueryClient, ErrorBoundary).
- [app.config.ts](app.config.ts) — dynamic Expo config, reads env per `APP_FLAVOR`.
- [eas.json](eas.json) — EAS Build profiles: `development`, `preview`, `production`.
- [plopfile.js](plopfile.js) — Plop generators. Run `npx plop <generator>` from repo root.
- [package.json](package.json) — npm scripts (`typecheck`, `lint`, `test`, `start`, `plop`).
- [.env.example](.env.example) — Template. Copy to `.env.development` / `.env.staging` / `.env.production`. `.env.*` is gitignored.
- [.claude/docs/git-conventions.md](.claude/docs/git-conventions.md) — Conventional Commits, branch naming, scope list.

## Flavors & Launch

Three EAS profiles: `development`, `preview`, `production` (read by `app.config.ts` via `APP_FLAVOR`). Local dev: `npx expo start` (uses `.env.development`). EAS build: `eas build --profile <profile> --platform <ios|android>`.

## What This Stack Uses (do NOT suggest alternatives)

| Concern      | Use                                                                         | Not                                              |
| ------------ | --------------------------------------------------------------------------- | ------------------------------------------------ |
| Server state | TanStack Query v5 (`useQuery`, `useMutation`)                               | SWR / Apollo / RTK Query / fetch in component    |
| Client state | Zustand 5 (with `persist` + MMKV adapter)                                   | Redux, MobX, Recoil, Context for global          |
| Local state  | `useState` / `useReducer` (truly local UI flags only)                       | Zustand for ephemeral modal flags                |
| Routing      | Expo Router v6 (`<Stack>`, `<Tabs>`, `useRouter`, `<Link>`)                 | React Navigation directly, deeplink libraries    |
| HTTP         | axios via `src/lib/api/client.ts` (with interceptors)                       | `fetch` directly, raw axios.create scattered     |
| Storage      | `react-native-mmkv` v4 — `createMMKV({...})` + `.remove()`                  | AsyncStorage, ad-hoc keys                        |
| Auth tokens  | `expo-secure-store` via `src/lib/auth/secure-storage.ts`                    | MMKV for tokens, AsyncStorage for tokens         |
| Logging      | `log.info/debug/warning/error/critical` (react-native-logs)                 | `console.log`, `console.warn`                    |
| Localisation | `react-i18next` + `expo-localization`; call `t('key')` / `useTranslation()` | Inline strings, custom i18n util                 |
| Theme        | NativeWind v4 `className="text-text-primary p-md"` + `AppSpacing` tokens    | Inline `style={{...}}` for static, raw color hex |
| Forms        | `react-hook-form` + `zod` resolver                                          | Manual `useState` per field, Formik              |
| Analytics    | `@sentry/react-native` + `analyticPerformer`                                | `console.log` for events                         |
| Connectivity | `@react-native-community/netinfo` via `useConnectivity`                     | Polling, ad-hoc network checks                   |
| Lint         | `eslint-config-expo` + `@typescript-eslint` + `eslint-plugin-tailwindcss`   | `eslint` alone, default config                   |
| Codegen      | Plop.js (`npx plop`)                                                        | Hygen, Yeoman, copy-paste from existing files    |
| E2E          | Maestro (YAML flows)                                                        | Detox, Appium                                    |

## Import & File Rules

- **Path aliases ONLY** — never relative imports across folders. Use:
  - `@/...` → `src/...` (e.g. `@/lib/api/client`, `@/features/auth/api`)
  - `@/app/...` → `app/...` (e.g. `@/app/(app)/_layout`)
  - `@/assets/...` → `assets/...`
- Within the same feature folder, relative imports (`./components/login-form`) are OK.
- Import order (blank line between groups): `react` / `react-native` → third-party (`axios`, `zustand`, `@tanstack/...`) → `@/...` → relative.
- File suffixes: `*-screen.tsx`, `*-sheet.tsx`, `*-form.tsx`, `*-store.ts`, `use-*.ts`, `*-api.ts`, `*-types.ts`. kebab-case file names.
- React components: `PascalCase`. Hooks: `useCamelCase`. Constants: `SCREAMING_SNAKE_CASE`.
- TypeScript strict mode + `noUncheckedIndexedAccess: true`. No `any` without `// reason: ...` justification comment.

## Token Efficiency & Agent Speed

- **`npm run typecheck`**: count only `src/` and `app/` findings; ignore `node_modules` and `.expo/` cache.
- **Localization**: only 2 locales (en, vi) — keep keys in sync across both JSON files. See `.claude/rules/localization.md`.
- **Large files**: prefer `grep` / `Glob` over reading entirely. For files >150 lines, always use targeted Grep or Read with line range.
- **Scope**: focus `src/` and `app/`; skip `node_modules/`, `.expo/`, `ios/`, `android/`, `*.d.ts` generated.
- **Explore phase (u-task Phase 3, u-fix-bug Phase 3)**: delegate to `Explore` subagent — raw file content never enters main session, only the structured summary does. See `.claude/rules/agent-speed.md`.
- **Registration trio (u-task Steps 6/7/8)**: route + i18n keys + storage key edit different files — always spawn as parallel `Agent(...)` calls.
- **Loop limits**: max 2 fix cycles on any warning/error before surfacing to user and stopping. See `.claude/rules/agent-speed.md` Rule 3.

## Skills Reference

Load **`u-task`** for any implementation request — it orchestrates the others.

| Skill                | When to load                                                                   |
| -------------------- | ------------------------------------------------------------------------------ |
| **`u-ask`**          | Any question, brainstorm, comparison, or strategy recommendation               |
| **`u-task`**         | Any implementation request — full execution                                    |
| **`u-continue`**     | Resume incomplete task / fill `TODO(ai)` scaffold                              |
| **`u-fix-bug`**      | Any bug, crash, wrong behaviour, or root-cause debugging                       |
| **`u-review`**       | PR / branch readiness report                                                   |
| **`u-verify`**       | End-to-end real-device UI automation via Maestro                               |
| **`u-create-skill`** | Create a new project skill                                                     |
| **`u-review-skill`** | Audit / validate any SKILL.md                                                  |
| `u-architecture`     | Layer boundaries, file placement, store registration, route grouping           |
| `u-controller`       | Any feature `*-store.ts` (Zustand store)                                       |
| `u-global-store`     | Global Zustand stores (auth, theme, connectivity) + persist + reset            |
| `u-screen`           | Screen widgets, layout, theme, route screens                                   |
| `u-rn-ui`            | Animations (Reanimated), responsive, dark mode, overlays, gesture-handler      |
| `u-design-system`    | NativeWind tokens, `AppSpacing`, `AppRadius`, dark mode, breakpoints           |
| `u-reactive-state`   | `useState` / `useReducer` / Zustand selectors / TanStack hooks decision matrix |
| `u-usecase`          | Any `use-*-query.ts` / `use-*-mutation.ts`                                     |
| `u-repository`       | Repository module (optional layer between hooks and api)                       |
| `u-api`              | `src/lib/api/client.ts`, axios interceptors, `BaseResponse`, error mapping     |
| `u-storage`          | `StorageKeys`, MMKV v4 API, `expo-secure-store` for tokens                     |
| `u-form`             | `react-hook-form` + `zod` resolver, validators, submit guard                   |
| `u-sheet`            | Bottom sheets via `@gorhom/bottom-sheet`                                       |
| `u-error-handling`   | `AppError`, `AppErrorCode`, try/catch, snackbar                                |
| `u-navigation`       | Expo Router patterns, snackbar, dialog, loading overlay, deeplinks             |
| `u-codegen`          | Plop, npm scripts, `expo prebuild`, `eas build`, env regen                     |
| `u-analytics`        | Sentry events, `AnalyticEvent`, `analyticPerformer`                            |
| `u-testing`          | Jest + RNTL unit tests, integration tests (per layer and cross-layer flows)    |
| `u-finalize`         | End-of-task self-audit                                                         |
| `u-i18n`             | i18n key add across `vi.json` + `en.json`, type-safe keys                      |
| `u-accessibility`    | WCAG AA, `accessibilityLabel`, touch targets, contrast                         |
| `u-security`         | Storage/API/logs audit                                                         |
| `u-performance`      | Rebuild waste, memory leaks, query costs, bundle size                          |
| `u-refactor`         | Safe refactors: component extract, store split, type rename                    |
| `u-npm-package`      | Selecting, adding, configuring, and reading npm packages                       |
| `u-storybook`        | Add/maintain Storybook stories for design system components                    |
| `u-worktree`         | Isolated git worktree per feature branch — create, bootstrap, clean up         |
| `u-doc`              | Generate package READMEs, feature docs, task docs, API refs, changelogs, ADRs  |

## Response Style

- Answer or act first — no preamble ("Let me...", "I'll now...").
- Name the file and line, not the concept.
- No trailing summaries after code changes — the diff speaks for itself.
- When uncertain between options, recommend one with a one-line reason — don't list pros/cons and leave it open.
- Banned words: `delve`, `crucial`, `robust`, `comprehensive`, `leverage`, `utilize`, `nuanced`, `multifaceted`, `furthermore`, `moreover`, `pivotal`, `streamline`, `Foster`.

## Task Completion Guard

**NEVER stop a turn while any TodoWrite item is `pending` or `in_progress`.**

For **any request with 2 or more distinct actions** (edits, shell commands, store registrations — when in doubt, use it):

1. Call TodoWrite at the start with ALL planned steps at `pending`.
2. Flip each task to `in_progress` before starting it, then `completed` immediately after.
3. Only one task may be `in_progress` at a time.
4. Before your final message, verify every todo shows `completed`. If not — keep working.

A Stop hook (`ensure-task-complete.sh`) enforces this mechanically: it injects a block message whenever the last TodoWrite has incomplete items. **Skipping TodoWrite removes this safety net entirely** — if Claude stops randomly during a task, it is because TodoWrite was not called.

Do not work around the hook — complete the tasks.

## Compact instructions

When compacting, always preserve:

- The current TodoWrite task list with checked/unchecked state
- The current skill name and phase (e.g. "u-task Phase 4 — filling use case layer")
- Any Plop commands already run and their output
- File paths already edited vs still pending
- Any pending typecheck/lint warnings not yet fixed
