# Parallel Chunks Over Monolithic Dispatch

**Applies to:** All agents dispatching subagents for bulk work (scan, classify, audit, transform) over N items

## The Rule

When N > ~50, split into **3-6 parallel background workers** grouped by a natural boundary (folder, project, repo, category, date range). **Never** hand all N items to one subagent to process sequentially.

### Trigger

Any bulk operation: "classify these N files", "audit these N tasks", "scan these N sessions", "transform these N records" where N exceeds ~50.

### Partition heuristic

1. **Count** items before dispatch.
2. **Identify natural grouping** — folder, repo, project, category, date bucket. Use whatever already segments the data.
3. **Partition** into 3-6 chunks of roughly balanced size. If nothing groups cleanly, fall back to modulo-hash split (`i % 4`).
4. **Dispatch all workers `run_in_background: true`** in a single message. Synthesize when they return.

### Exceptions

- **Shared index** — work requires an in-memory structure each worker would duplicate (e.g., building one unified embedding table). Run serially or pre-build the index once.
- **Small N (<20)** — coordination overhead exceeds parallel gain.
- **Sequential dependency** — item `i+1` needs item `i`'s output (rare for scan/classify; common for migrations).

## Why

Parallel chunks finish 3-6× faster than a serial monolith. Each worker carries a smaller context → higher accuracy, less error-recovery looping, cheaper per token. Natural grouping yields usable partial results if one worker fails — a monolith that dies at item 800/1000 gives you nothing. Monolithic dispatch defeats the purpose of subagents: the whole point is parallelism and isolated context.

## How to Apply

Before any `Agent(...)` call that hands over a batch: ask "how many items? what groups them?" If N > 50, the answer is never one agent.
