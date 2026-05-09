#!/usr/bin/env bash
# Stop hook: block if TodoWrite has pending/in_progress items.

INPUT=$(cat)

# Parse stop_reason and transcript_path; handle both snake_case and camelCase field names.
{
  read -r STOP_REASON
  read -r TRANSCRIPT
} < <(
  echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    sr = d.get('stop_reason') or d.get('stopReason') or ''
    tp = d.get('transcript_path') or d.get('transcriptPath') or ''
    if not tp:
        sid = d.get('session_id') or d.get('sessionId') or ''
        if sid:
            import os, glob
            pattern = os.path.expanduser('~/.claude/projects/*/' + sid + '.jsonl')
            matches = glob.glob(pattern)
            if matches:
                tp = matches[0]
    print(sr)
    print(tp)
except Exception as e:
    print('', file=sys.stderr)
    print('')
    print('')
"
)

case "$STOP_REASON" in
  end_turn|max_tokens) ;;
  *) exit 0 ;;
esac

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Fallback: if transcript path is missing or file doesn't exist,
# find the most recently modified transcript across all projects.
if [[ -z "$TRANSCRIPT" || ! -f "$TRANSCRIPT" ]]; then
  TRANSCRIPT=$(ls -t ~/.claude/projects/*/*.jsonl 2>/dev/null | head -1)
fi

if [[ -z "$TRANSCRIPT" || ! -f "$TRANSCRIPT" ]]; then
  exit 0
fi

RESULT=$(TRANSCRIPT_PATH="$TRANSCRIPT" python3 "$HOOK_DIR/check_todos.py")
EXIT=$?

if [[ $EXIT -eq 1 && -n "$RESULT" ]]; then
  python3 -c "
import sys, json
msg = ('You still have incomplete tasks — DO NOT stop. '
       'Continue working until every todo is marked completed. '
       'Call TodoWrite to mark each task in_progress then completed as you work. '
       'Incomplete: ' + sys.argv[1])
print(json.dumps({'decision': 'block', 'reason': msg}))
" "$RESULT"
fi

exit 0
