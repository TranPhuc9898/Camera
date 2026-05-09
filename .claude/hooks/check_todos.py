#!/usr/bin/env python3
# Exit 1 + print incomplete todo names if last TodoWrite has pending/in_progress items.
import json, os, sys

path = os.environ.get("TRANSCRIPT_PATH", "")
if not path or not os.path.isfile(path):
    sys.exit(0)

last_todos = None
try:
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            raw = raw.strip()
            if not raw:
                continue
            try:
                entry = json.loads(raw)
            except json.JSONDecodeError:
                continue
            msg = entry.get("message", entry)
            content = msg.get("content", [])
            if not isinstance(content, list):
                continue
            for block in content:
                if (
                    isinstance(block, dict)
                    and block.get("type") == "tool_use"
                    and block.get("name") == "TodoWrite"
                ):
                    todos = block.get("input", {}).get("todos", [])
                    if todos:
                        last_todos = todos
except OSError:
    sys.exit(0)

if last_todos is None:
    sys.exit(0)

incomplete = [
    t for t in last_todos
    if isinstance(t, dict) and t.get("status") in ("pending", "in_progress")
]
if not incomplete:
    sys.exit(0)

names = [t.get("content", "?") for t in incomplete[:5]]
suffix = f" +{len(incomplete) - 5}" if len(incomplete) > 5 else ""
print("; ".join(names) + suffix)
sys.exit(1)
