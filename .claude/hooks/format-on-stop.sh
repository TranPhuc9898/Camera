#!/usr/bin/env bash
# Auto-format any modified TS/JS/JSON/MD files when Claude finishes a turn.
# Silent on no-op; non-blocking on failure.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
cd "$PROJECT_DIR" || exit 0

CHANGED=$(
  { git diff --name-only --diff-filter=ACMR 2>/dev/null;
    git ls-files --others --exclude-standard 2>/dev/null; } \
    | grep -E '\.(ts|tsx|js|jsx|json|md)$'
)
[ -z "$CHANGED" ] && exit 0

# Format only changed files. Use `command -v npx` to skip silently
# in environments without Node (CI, container shells).
if command -v npx >/dev/null 2>&1; then
  echo "$CHANGED" | xargs npx --no-install prettier --write >/dev/null 2>&1 || true
fi

exit 0
