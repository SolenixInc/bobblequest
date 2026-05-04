# Agent Landing — Repo Orientation

You spawned at the repo root. The root `AGENTS.md` is the only AGENTS file guaranteed to load on
every turn — everything else is path-scoped or lazy. This page is your map for cross-cutting work,
unfamiliar subtrees, and first-time orientation. Treat it as a router, not a reference: hop to the
linked doc for depth.

## How agent context loads in this repo

Four layers, loaded in this order:

1. **Root `AGENTS.md`** (always-on, every turn) — stack, conventions, banned tools, scope routing
   table. See [/AGENTS.md](../../AGENTS.md).
2. **Per-scope `AGENTS.md`** — load BEFORE your first edit into a subtree. Located at
   `apps/<app>/AGENTS.md`, `packages/<pkg>/AGENTS.md`, `scripts/AGENTS.md`. The root routing table
   names which one applies for the path you're touching.
3. **Path-scoped rules** in [`.agents/rules/`](../../.agents/rules/README.md) — lazy, loaded by glob
   match when the corresponding files are read or edited (45 rule files indexed in the README).
4. **Architecture deep-dives** in [`docs/architecture/`](../architecture/) — reference depth. Follow
   links from per-scope AGENTS.md rather than reading preemptively.

## First-edit checklist for any task

1. Hit the **Scope Routing Table** in the root [AGENTS.md](../../AGENTS.md) to find the per-scope
   AGENTS.md for the path you're touching.
2. Open that per-scope `AGENTS.md` BEFORE the first edit — it carries the rules that actually
   govern that package or app.
3. For cross-cutting questions ("what uses X?", "where is Y wired?", structural recon), query
   **graphify first** — the graph at
   [`graphify-out/graph.json`](../../graphify-out/graph.json) (or the `graphify` MCP) returns
   semantic answers without you reading raw files. Grep is fallback, not default.
4. Follow the `## Links` section of the per-scope AGENTS.md into [`docs/architecture/`](../architecture/)
   for deep-dive context only when the rule pointer demands it.

## Where things live (quick map)

| Location                  | Purpose                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/`](../../apps/)    | Five client apps — `api`, `web`, `website`, `mobile`, `desktop`. All consume `apps/api` via tRPC `AppRouter`.                          |
| [`packages/`](../../packages/) | Clean Architecture port + impl modules: analytics, billing, logging, db, cache, queue, auth, config, errors, dependency-injection. |
| [`scripts/`](../../scripts/)   | Repo-wide tooling — `doctor` (env diagnostics), `stack` (docker-compose orchestrator).                                          |
| [`docs/architecture/`](../architecture/) | Deep-dive architecture references — per-app and cross-cutting.                                                          |
| [`.agents/rules/`](../../.agents/rules/README.md) | Path-scoped lazy rules — 45 files, indexed at `.agents/rules/README.md`. Load by glob on file touch.           |

The split is hard: `apps/` are thin client/server wrappers; `packages/` are the reusable Clean
Architecture units (one port, multiple impls). When in doubt about where a concern belongs, follow
the layering rules in [`.agents/rules/clean-architecture.md`](../../.agents/rules/clean-architecture.md).

## Cross-tool support

This repo standardizes on the open `AGENTS.md` convention plus path-scoped rules under
[`.agents/rules/`](../../.agents/rules/README.md). Tools that read `AGENTS.md` natively (Claude
Code, Codex CLI, Aider, Continue, Cline) are first-class. Tool-specific dotfile shims
(`.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`) are intentionally **not**
shipped — we only support the `AGENTS.md` + `.agents/` surface.
