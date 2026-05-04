# Auto-Enter Plan Mode for Plan-Worthy Tasks

**Applies to:** All agents, every session, BEFORE substantive work on a new task

## The Rule

When a task meets ANY trigger below, call `EnterPlanMode` **before the first substantive tool call** — do not ask the user first, just enter. Produce a plan, present via `ExitPlanMode`, let the user approve/edit, then execute.

**Triggers (enter plan mode if any one fires):**

- Implementation will touch 3+ files OR involve 3+ sequential steps.
- Architectural / design decision affects multiple modules or contracts (schema, auth, API surface, IPC, cross-package interfaces).
- Scope is ambiguous — the user's intent has multiple valid interpretations.
- Refactor with a large surface area (same pattern replicated across >5 call sites).
- The user's message contains "plan", "design", "approach", "how should we", "strategy" — even if not phrased as an explicit request.
- A task would spawn subagents/workers (parallel delegation benefits from an explicit plan both sides can reference).

**Do NOT enter plan mode for:**

- Single-file edits with obvious intent ("fix the typo", "rename X to Y").
- Factual answers or info lookups.
- Orientation reads (grep, glob, file reads) to form a hypothesis — orientation is not substantive work.
- User explicitly said "just do X" / "skip planning".
- You are already mid-execution of a pre-aligned plan.
- Reactive tool cycles where the next action is dictated by the tool output you just read.

## Why

Plan mode forces structured thinking before execution. Without it, agents generate implementation drafts during alignment, burn tokens on throwaway code, and drift from user intent. Exit-planning is cheap; exit-implementation is expensive.

## How to Apply

1. Before the first substantive tool call on a new task, check the triggers.
2. If any fire, call `EnterPlanMode` and draft a plan covering:
   - Restated user intent in one sentence.
   - Key decisions and trade-offs (options + recommendation).
   - File-level actions (what changes where).
   - Verification (how we know it worked).
3. Call `ExitPlanMode` with the drafted plan for user approval.
4. If new ambiguity surfaces mid-task or scope changes, re-enter plan mode.

## Relationship to pre-execution-alignment

`pre-execution-alignment` governs WHEN to confirm with the user (any non-trivial task). This rule governs HOW to produce the confirmable artifact — use plan mode so the plan is structured, reviewable, and editable rather than buried in chat prose.
