#!/usr/bin/env bash
# Block dangerous patterns. Output permissionDecision:allow for everything else
# to bypass the permission dialog without prompting.
#   stdin:   {"tool_input": {"command": "..."}, ...}
#   exit 0 + allow JSON = bypass dialog
#   exit 2 = block

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command','') or d.get('command',''))" 2>/dev/null)

allow() {
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
}

[ -z "$COMMAND" ] && allow

block() {
  echo "🚫 Blocked: $1" >&2
  echo "Command: $COMMAND" >&2
  echo "Run manually with '! <command>' if intentional." >&2
  exit 2
}

# Sensitive file read guard — catches shell-level reads that bypass Read/Edit deny rules
SENSITIVE_PATTERN='\.(env|env\.(development|staging|production|local)|jks|keystore|p12|cer|mobileprovision|provisionprofile)'
SENSITIVE_NAMES='(key\.properties|keystore\.properties|local\.properties|GoogleService-Info\.plist|google-services\.json|firebase-credentials\.json|sentry-auth-token)'
echo "$COMMAND" | grep -qE "(cat|head|tail|sed|awk|python3|perl|jq)[[:space:]].*($SENSITIVE_PATTERN|$SENSITIVE_NAMES)" && block "reading sensitive config/secret file"

# Filesystem destruction
echo "$COMMAND" | grep -qiF "rm -rf"                               && block "rm -rf"
echo "$COMMAND" | grep -qiE "rm[[:space:]]+-[a-zA-Z]*r"           && block "rm -r (recursive)"
echo "$COMMAND" | grep -qiF "mkfs"                                 && block "mkfs"
echo "$COMMAND" | grep -qiF "dd if="                               && block "dd"

# Privilege escalation
echo "$COMMAND" | grep -qE  '(^|[[:space:]])sudo([[:space:]]|$)'   && block "sudo"

# Git destructive
echo "$COMMAND" | grep -qiF "git push --force"                     && block "git push --force"
echo "$COMMAND" | grep -qiF "git push -f"                          && block "git push -f"
echo "$COMMAND" | grep -qiF "git reset --hard"                     && block "git reset --hard"
echo "$COMMAND" | grep -qiF "git clean -f"                         && block "git clean -f"
echo "$COMMAND" | grep -qE  '(^|[[:space:]])git[[:space:]]+push([[:space:]]|$)' && block "git push (confirm manually)"

# Pipe-to-shell (remote code exec)
echo "$COMMAND" | grep -qE  '(curl|wget|cat)[^|]*\|[[:space:]]*(sh|bash|zsh)' && block "pipe to shell"

# Decode-and-execute bypass
echo "$COMMAND" | grep -qE  'base64[[:space:]]+-d[[:space:]]*\|[[:space:]]*(sh|bash|zsh)' && block "base64 decode piped to shell"

# Source from network process substitution
echo "$COMMAND" | grep -qE  'source[[:space:]]*<\([[:space:]]*(curl|wget)' && block "source from network"

# npm-script remote execution
echo "$COMMAND" | grep -qE  'npm[[:space:]]+(install|i)[[:space:]]+.*--ignore-scripts=false.*-g' && block "global npm install with arbitrary script execution"

# SQL destructive (rare in RN but cheap to keep)
echo "$COMMAND" | grep -qiE "DROP[[:space:]]+(TABLE|DATABASE)"     && block "DROP TABLE/DATABASE"
echo "$COMMAND" | grep -qiF "TRUNCATE TABLE"                       && block "TRUNCATE TABLE"

# No dangerous pattern matched — explicitly allow to bypass the permission dialog
allow
