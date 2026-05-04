# Bulk / File-By-File Work Always Goes To a Subagent

**Applies to:** All agents, every session, before any multi-file Write/Edit sequence

## The Rule

If a task involves Write/Edit against **3+ files** OR loading a **heavy skill (>~1500 tokens) for work you'll do once or twice**, the work goes to a subagent. **No exceptions** — not "quick familiarity", not "I'll keep it tight", not "this batch is small."

Main context orchestrates (plans, briefs, synthesizes). Subagents execute (load skills, make edits, return structured results).

## Why

Real session (2026-04-19, this repo): executed a 5-phase hook-rewrite plan in main context. Loaded two heavy skills (`context-engineering`, `update-config`) plus the massive settings-JSON schema. Rewrote 5 hook scripts file-by-file. User corrected twice: _"why arent you using sub agents"_ / _"your polluting the main context window"_. The `delegate-vs-main-context.md` rule already covered this — it was ignored because "the task is moving" felt like it justified staying in main.

The correct move was: orient in main (1-2 reads), then dispatch one subagent per logical phase with structured-return contracts. That's what happened for Phases 3-4 of the same session once corrected — and it worked cleanly.

## How to Apply

**Triggers (any one fires → subagent):**
- 3+ files will be edited or written
- Work requires loading a heavy skill that will be used only 1-2 times in the task
- The work is a parallelizable batch (N files, same operation)
- Verification involves re-reading 3+ files

**Brief the subagent with:**
1. Load `Skill(skill: "<name>")` if applicable
2. Specific file paths + exact edits (not "figure it out")
3. Structured return contract (`{files_changed: [...], <other named fields>}` — no narrative)
4. `run_in_background: true` (always — per `delegate-vs-main-context.md`)

**If you catch yourself mid-main-context bulk-edit:**
- Stop at the current file
- Re-scope remaining files into a subagent brief
- Dispatch background, continue orchestration

## Anti-Patterns

- "I'll just do the next 3 files myself, then delegate the rest" — no. Delegate from the current file onward.
- "The subagent spawn overhead isn't worth it for 3 files" — it always is. The overhead saved is cache and synthesis time; the token cost of the subagent is amortized against the tool-call chatter you'd generate in main.
- "I need to see the content to reason about it" — that's orientation (1-2 reads). The subagent does the edits; you read the returned fields.

## Relationship to delegate-vs-main-context.md

This rule is the **trigger** that `delegate-vs-main-context.md` implies but doesn't force. The parent rule defines the framework; this one makes the most common miss (multi-file rewrites) non-negotiable.
