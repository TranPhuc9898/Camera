# Task Completion Guard

## Rule: Always Use TodoWrite for Implementation Tasks

Any request that involves **2 or more** distinct actions (file edits, shell commands, hook registrations, etc.) MUST begin with a TodoWrite listing all steps at `pending`. When in doubt, use TodoWrite — the Stop hook blocks on incomplete todos, so skipping it removes the safety net entirely.

## Rule: Mark Progress in Real Time

Set `in_progress` before starting each task; `completed` immediately after. One `in_progress` at a time.

## Rule: Never Stop with Incomplete Todos

Before ending any turn, verify no TodoWrite item is `pending` or `in_progress`. Keep working if any remain.

## What the Hook Cannot Catch

- Tasks never added to TodoWrite.
- A todo marked `completed` before the work was actually done — correctness is Claude's responsibility.
