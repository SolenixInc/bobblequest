# Use Todos Proactively

**Applies to:** All agents, every multi-step task

## The Rule

Use `TaskCreate`/`TaskUpdate`/`TaskList` for **any task with 2+ steps**. Two purposes:
1. **Internal organization** — prevents dropped steps, makes sequencing explicit.
2. **User UX** — live checklist of what's being worked on.

## When

At task start, before substantive work:
- 2+ discrete steps
- Multiple files or tool types
- Multi-subagent dispatch
- Multiple asks in one message
- Research → plan → execute flows

Skip only for truly trivial one-shots (single read, single edit, single factual answer).

## How

- Mark `in_progress` when starting a step — exactly one at a time.
- Mark `completed` the moment done — never batch at the end.
- Add new items as scope grows — don't absorb silently.
- Reword if direction changes — keep the list truthful.

## Why

Todos are the most visible signal to the user about active work. Without one, a tool-use sequence is opaque; with one, the user can course-correct early. Internally, explicit checklists reduce dropped steps in multi-phase work, especially with background subagents.
