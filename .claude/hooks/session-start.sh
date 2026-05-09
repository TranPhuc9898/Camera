#!/usr/bin/env bash
# Session orientation: emitted on startup/compact/clear so the agent
# re-orients immediately without reading files manually.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
cd "$PROJECT_DIR" || exit 0

BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
MODIFIED=$(git diff --name-only --diff-filter=M 2>/dev/null | head -8)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | head -5)
STAGED=$(git diff --cached --stat 2>/dev/null | tail -1)
RECENT=$(git log --oneline -3 2>/dev/null)
NODE_OK=$([ -d node_modules ] && echo "ok" || echo "MISSING — run npm install")

echo "=== UNICORN SESSION CONTEXT ==="
echo "Stack  : Expo RN | npm | TS strict | path: $PROJECT_DIR"
echo "Branch : $BRANCH"
echo "node_modules: $NODE_OK"
[ -n "$STAGED" ]    && echo "Staged : $STAGED"
[ -n "$MODIFIED" ]  && printf "Modified:\n%s\n" "$MODIFIED"
[ -n "$UNTRACKED" ] && printf "New files:\n%s\n" "$UNTRACKED"
echo "Recent commits:"
echo "$RECENT"
echo "==============================="

exit 0
