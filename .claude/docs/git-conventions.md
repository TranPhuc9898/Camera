# Git Conventions

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Examples:

```
feat(auth): add biometric login
fix(storage): resolve MMKV rehydration race on cold start
chore(deps): bump expo-router to 6.0.23
refactor(home): extract list logic into useFeedQuery
test(api): add axios interceptor retry coverage
docs(ui): update Button usage examples
feat(theme)!: drop legacy color tokens
```

---

## Types

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New user-facing feature                                 |
| `fix`      | Bug fix                                                 |
| `chore`    | Maintenance, deps, config — no production logic change  |
| `refactor` | Code restructure, no behaviour change                   |
| `test`     | Adding or modifying tests only                          |
| `docs`     | Documentation only                                      |
| `perf`     | Performance improvement                                 |
| `style`    | Formatting or linting — no logic change                 |
| `ci`       | CI/CD pipeline changes                                  |
| `build`    | Build system, EAS profiles, Plop templates, Expo config |
| `revert`   | Reverts a previous commit                               |

When in doubt between `feat` and `chore`: if a user sees the result, use `feat`.

---

## Scope

Use the **feature folder name** under `src/features/` or one of the cross-cutting scopes:

| Scope          | Maps to                                                                      |
| -------------- | ---------------------------------------------------------------------------- |
| `auth`         | `src/features/auth/`                                                         |
| `feed`         | `src/features/feed/`                                                         |
| `settings`     | `src/features/settings/`                                                     |
| `<feature>`    | any folder under `src/features/`                                             |
| `arch`         | `src/lib/arch/`                                                              |
| `api`          | `src/lib/api/`                                                               |
| `storage`      | `src/lib/storage/`                                                           |
| `i18n`         | `src/lib/i18n/` + `src/translations/`                                        |
| `theme`        | `src/theme/`                                                                 |
| `ui`           | `src/components/ui/`                                                         |
| `logger`       | `src/lib/logger/`                                                            |
| `connectivity` | `src/lib/connectivity/`                                                      |
| `analytics`    | `src/lib/analytics/`                                                         |
| `router`       | `app/` (Expo Router routes/layouts)                                          |
| `e2e`          | `e2e/` (Maestro flows)                                                       |
| `deps`         | `package.json` / `package-lock.json`                                         |
| `ci`           | `.github/` or CI config                                                      |
| `build`        | `eas.json`, `app.json`, `app.config.*`, `babel.config.js`, `metro.config.js` |
| `templates`    | `plop-templates/` + `plopfile.js`                                            |
| `hooks`        | `.claude/hooks/` or `.husky/`                                                |

Omit scope when the commit spans multiple features or is truly cross-cutting:

```
chore: bump all expo deps
```

---

## Subject Line Rules

- **Imperative mood**: `add …` not `added …` or `adds …`
- **No capital letter** at the start of the description
- **No period** at the end
- **Max 72 characters** total (type + scope + description)

---

## Breaking Changes

Append `!` after type/scope. Optionally explain in the footer:

```
feat(theme)!: drop legacy color tokens

BREAKING CHANGE: theme.colors.primaryLegacy removed.
Replace with theme.colors.primary.
```

---

## Branch Naming

```
<type>/<short-description>
```

| Branch              | When                        |
| ------------------- | --------------------------- |
| `feat/<desc>`       | New feature work            |
| `fix/<desc>`        | Bug fix                     |
| `chore/<desc>`      | Maintenance, refactor, deps |
| `hotfix/<desc>`     | Urgent production fix       |
| `release/<version>` | Release preparation         |

Rules: lowercase kebab-case, max ~40 characters, no special characters except `-`.

```
feat/biometric-login
fix/storage-rehydration
chore/bump-expo-54
hotfix/crash-android-deeplink
release/1.2.0
```

---

## PR Titles

Follow the same `type(scope): description` format as commit subject lines.
The PR title becomes the squash-merge commit message — keep it precise.

---

## Claude Commit Behavior

1. Draft message following `<type>(<scope>): <description>` format.
2. Choose type from the table — default to `chore` when no user-facing change.
3. Omit scope when changes span multiple features.
4. Body: only when the _why_ is non-obvious from the diff.
5. Keep the total subject ≤ 72 characters.

---

## Hook Enforcement

`.husky/commit-msg` validates every commit via commitlint. Bootstrap activates it on `npm install` (Husky `prepare` script).
