---
name: u-worktree
description: 'Isolated git worktree per feature/fix — separate node_modules + Metro cache + simulator state. Triggers — worktree, git worktree, isolated branch, parallel branch, parallel feature, separate working copy.'
---

# u-worktree — Isolated Worktree Per Feature

## TL;DR

- One git worktree per feature/fix → no stash dance, no half-applied state across branches
- Each worktree has its own `node_modules`, `.expo`, Metro cache → no cross-contamination
- Naming: `../unicorn-<branch-slug>` next to main repo
- After merge: `git worktree remove ../unicorn-<slug>` + `git branch -d <branch>`
- DO NOT share `.env*` via symlink unless secrets are dev-only — copy fresh per worktree
- Best paired with `/ck:worktree` skill if running parallel agents

## When to load

Starting a new feature or non-trivial fix while another branch is in progress, parallelizing 2+ agents on independent work, debugging while a long-running build is in another branch.

---

## Why worktrees over branch-switching

|                                  | Branch switch          | Worktree        |
| -------------------------------- | ---------------------- | --------------- |
| `node_modules` consistency       | Reinstall every switch | Stable per tree |
| Metro cache                      | Bust on switch         | Persistent      |
| `.expo` state                    | Lost / bust            | Kept            |
| Simulator state (logged-in user) | Lost                   | Kept            |
| Stash management                 | Manual / risky         | None needed     |
| Parallel work                    | Impossible             | Native          |

Reinstalling deps + bumping Metro on every switch costs minutes; worktrees pay for themselves on day 1.

---

## Create

```bash
# From main repo root
git worktree add ../unicorn-feat-orders-cancel feat/orders-cancel
cd ../unicorn-feat-orders-cancel

# Set up env
cp ../unicorn/.env.development .env.development
npm install
npx expo prebuild --clean              # if native deps changed
```

Naming convention: `<repo-name>-<branch-slug>`. Slug = branch name with `/` → `-`.

---

## Layout on disk

```
~/Documents/VinGroup/
├── unicorn/                           # main checkout (master)
├── unicorn-feat-orders-cancel/        # worktree 1
├── unicorn-fix-auth-refresh/          # worktree 2
└── unicorn-chore-eas-config/          # worktree 3
```

Each is a real directory with its own `node_modules`, `.expo`, etc. Git metadata is shared (`.git` is a file pointing to main repo's `.git/worktrees/`).

---

## Daily flow

```bash
cd ~/Documents/VinGroup/unicorn-feat-orders-cancel

git pull origin main --rebase          # rebase feature branch onto latest main
npm install                             # if package.json changed in main
npx expo start                          # dev as normal

# commit / push
git add -A && git commit -m "feat(orders): cancel reason field"
git push -u origin feat/orders-cancel
```

---

## Cleanup after merge

```bash
# After PR merged into main
cd ~/Documents/VinGroup/unicorn

git worktree remove ../unicorn-feat-orders-cancel
git branch -d feat/orders-cancel
git push origin :feat/orders-cancel    # delete remote branch
```

If the worktree has uncommitted changes, `git worktree remove` refuses — `--force` only when sure.

---

## List + prune

```bash
git worktree list
# /Users/phucth13/Documents/VinGroup/unicorn               main          [main]
# /Users/phucth13/Documents/VinGroup/unicorn-feat-orders   abcdef12      [feat/orders-cancel]

git worktree prune                     # remove stale entries (deleted directories)
```

---

## .env handling

```bash
# ❌ Symlinking — secrets leak across branches if a branch swaps env files
ln -s ../unicorn/.env.development .env.development

# ✅ Copy fresh per worktree (still dev-only secrets)
cp ../unicorn/.env.development .env.development
```

Production secrets NEVER on dev machine — they live in EAS secrets / CI vault.

---

## Native pods (iOS) per worktree

```bash
# After `npx expo prebuild`, pods install in each worktree's ios/
cd ios && pod install --repo-update
```

Pods take disk — each worktree ~ 1.5GB. Trade-off vs reinstall time; worth it for 2+ active branches.

---

## Multi-agent parallel pattern

```bash
# Agent A — feature
git worktree add ../unicorn-feat-orders feat/orders-cancel
# Agent B — refactor
git worktree add ../unicorn-refactor-auth refactor/auth-store

# Both run independently, no file conflicts
```

Pair with `/ck:team` if spawning agents per worktree. Each agent operates in its own working dir; lead coordinates merges.

---

## EAS profiles per worktree

EAS config is in `eas.json` (committed) — same across worktrees. Build credentials are per-Apple-account, not per-worktree. Run builds from any worktree:

```bash
npx eas build --profile preview --platform ios
```

---

## Do / Don't

| ✅                                   | ❌                                   |
| ------------------------------------ | ------------------------------------ |
| One worktree per active branch       | Branch-switch with stash dance       |
| Naming: `<repo>-<slug>` next to main | Worktrees in `/tmp` (lost on reboot) |
| Copy `.env*` per worktree            | Symlink env files                    |
| `git worktree remove` after merge    | Leave dangling worktrees             |
| `git pull --rebase` per worktree     | Forget to sync, push stale base      |
| `npm install` after pulling          | Skip install, get version drift bugs |

---

## Common pitfalls

- **Disk pressure**: 5 worktrees × 2GB node_modules + 1.5GB pods = real estate. Prune unused.
- **Pod cache stale after prebuild**: `cd ios && pod install --repo-update` per worktree.
- **Pre-commit hooks**: live in `.git/hooks/` which IS shared; run from any worktree, but file paths must be relative.
- **Editor opens main worktree**: explicitly open the worktree dir, not the main one — easy to commit to wrong branch.
- **`.expo/` state leaks dev tunnel between trees**: rare, but if QR code points to wrong tree, kill Metro and restart.
- **Merge conflicts on `package-lock.json`**: rebase, not merge; `npm install` to regenerate consistent lockfile.

---

## When NOT to use a worktree

- Single tiny fix < 30 min — overhead not worth it
- Hotfix on main while no other branch active — just branch + commit
- Repo with no native deps and tiny `node_modules` — switch cost is low

---

## See also

- `u-task` — orchestrator pairs with worktree per phase
- `u-finalize` — pre-commit checks run per worktree
- `u-codegen` — `npm install` / prebuild after worktree create
