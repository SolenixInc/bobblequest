---
paths:
  - "**/*clickup*/**"
  - "**/*sprint*/**"
  - "**/*epic*/**"
  - "**/clickup*.md"
---

# Never Close Epics with Open Subtasks

**Applies to:** All agents, every ClickUp epic close operation

## The Rule

Before closing any epic or parent task in ClickUp, **verify all subtasks are closed first**. If any subtask is still `ready`, `in progress`, or not explicitly `closed`/`complete`, do NOT close the parent — surface the open items instead.

### Before closing an epic, you MUST:

1. **Fetch the epic's full subtask list** via `clickup_get_task` with `subtasks: true`
2. **Check every subtask's status** — anything not `closed`/`complete` blocks the close
3. **Surface open items** via `AskUserQuestion` — list each open subtask by name + ID, ask what to do before proceeding
4. **Only close when all subtasks are closed** — or when the user explicitly overrides after seeing the list

### Exception

User explicitly told you to close the epic and skip the open subtasks. This override must be captured as an exception in the completion comment, not assumed.

## Why

Closing an epic with active subtasks leaves orphaned work in the sprint board. The epic disappears from active views but its open children remain, creating ghost work that doesn't show up in any meaningful sprint context. The board becomes misleading — completed-looking epics that hide unresolved work.

User correction on 2026-04-19: closed epic `868jajt0k` while 6 subtasks were still `ready`, causing board confusion. This rule prevents recurrence.

## How to Apply

1. When `clickup_update_task` or `clickup_move_task` targets an epic/parent close: stop
2. Run `clickup_get_task` with `subtasks: true` on the target epic
3. Filter subtasks: if any have `status` not in `["closed", "complete"]`, surface them
4. Use `AskUserQuestion` to present: list of open subtasks + "close only these?" / "keep epic open?" / "close epic + move subtasks to [where]?"
5. Only after explicit user confirmation on all open items → proceed with close

## Verification

No subtask with `status` not in `closed`/`complete` may exist under a `closed` epic. Post-close, verify via `clickup_get_task` that parent status is `closed` and all children match.

## Paired Sensor

No automated sensor exists yet. Manual discipline until a hook can inspect task status before close operations.