# Delegate vs. Main Context

**Applies to:** All agents, every session — decision framework for when to delegate to a subagent vs handle work in main context

## The Principle

Main context is the scarcest resource. It holds **understanding, decisions, synthesis, plan state**. Subagents do **gathering, verification, heavy-skill execution, tool-intensive work**. Apply the framework below before any non-trivial tool call sequence.

## The Rule

### Delegate when (any fires)

- **Input/output ratio is high** — you'd ingest 5k+ tokens to produce a ~200-token conclusion (test logs, build audits, codebase traces)
- **3+ files** to trace a chain or validate a hypothesis
- **Iterative loops** — grep → read → grep → read cycles
- **Heavy skill used once or twice** — any skill with a large body (>2k tokens) used in a self-contained way
- **Independent, parallelizable workstreams** — fan out, synthesize
- **Verification work** — re-running tests, inspecting commits a worker claims to have made
- **Verbose single-use output** — you won't refer back to it
- **Skilled work** — skill loading + tool execution + CLI usage + param generation all absorbed by the subagent. Main context sees only the ask going in and the structured result coming out.

### Keep in main when (any fires)

- **Synthesis IS the work** — you need the raw material to reason across it
- **Single targeted edit/read** with obvious intent
- **Next action depends on inspecting the exact tool output** (reactive cycles)
- **Orientation reads** forming a hypothesis — 1–2 files
- **Heavy skill reused 5+ times in succession** — amortize the load
- **Policy/prose authoring** — AGENTS.md edits, rule writing, spec authoring
- **Decisions, trade-offs, plan state** — never delegate understanding

### Two tests

1. "Can I brief a colleague to do this and receive a short structured result I'll fully understand?" → delegate.
2. "Do I need the raw material in front of me to decide?" → keep.

## Skilled Work Pattern

Subagents absorb the skill body + tool invocations + param generation + CLI chatter. Main context sees the ask going in and the structured result coming out — nothing in between.

**Don't:**
```
Skill(skill: "<heavy-skill>")
mcp__…__some_tool_call(...)
```

**Do:**
```
Agent({
  description: "Create sprint epic",
  prompt: "Load skill <heavy-skill>. In list <listId>, create an epic with <fields>. Return ONLY: {taskId, url, status}. No narrative.",
  run_in_background: true
})
```

## Structured Returns — Always

Brief every subagent to return **named fields only**, never narrative prose. Narrative re-bloats the cache the delegation was saving.

- Debug: `{ file, line, root_cause, fix }`
- DB work: `{ action, statement, rows_affected, status }`
- Test verification: `{ runner, pass_count, fail_count, failures? }`
- File scan: `{ matches: [{ file, line, snippet }] }`
- MCP / API ops: `{ id, url, status }`

## How to Delegate

1. Do minimum orientation in main (1–2 file reads max, form hypothesis).
2. Dispatch subagent with: hypothesis, entry-point files already found, specific question, structured return contract.
3. Keep moving while it runs — draft next brief, update plan, prep synthesis skeleton. **Never poll.**
4. On return: verify before trusting (see below).

**Bad:** Read 6 files yourself, trace the flow, report.
**Good:** Read 1 entry point, grep for `foo()`, dispatch: "Trace how `foo()` in `bar.ts:70` reaches the CLI spawn. Suspect: file path passed as string. Return `{ confirmed, path, evidence_line }`."

## Always Background — No Exceptions

Every `Agent(...)` and every `SendMessage(...)` MUST pass `run_in_background: true` **explicitly**. Including tiny continuations, follow-ups, and "this'll only take 10 seconds" calls. You get a completion notification anyway — main thread keeps working.

If you think you need foreground, you're wrong. Launch background, prep the next thing while waiting. If there's genuinely no next thing, update a rule, write the synthesis skeleton, or launch additional parallel workers.

## Verify, Don't Trust

Subagent reports are **proposals**, not truth. Before marking delegated work complete:

- Re-run the tests they claim passed, using the project's actual runner (read `package.json` `scripts.test` — don't assume).
- Re-read the files they claim landed.
- Inspect commits (`git show --stat`) to confirm file lists match the report.

A passing self-test in a subagent is a claim, not proof.

## Exception — Amortize Heavy Skills

If you'll do 5+ operations with the same skill in rapid succession (e.g. a sprint refactor across 20 tasks), loading once in main is cheaper than spawning 20 subagents.

## Warning Sign You Delegated Wrong

The returned structured fields don't give you enough to decide the next move, and you have to re-read what the subagent read. That's the "never delegate understanding" line — redraw it by **briefing better next time**, not by doing it yourself.
