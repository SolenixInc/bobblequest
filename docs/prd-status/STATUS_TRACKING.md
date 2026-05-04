# Template-Repo · Bootstrap Completion Status Tracking

## What this file is for

The wave-based execution log for the prd-status governance program — tracks W0..W7 milestones
across the bootstrap initiative. Distinct from
[`matrix.md`](./matrix.md) (concern × app readiness grid) and
[`gaps.md`](./gaps.md) (changelog of what changed).

## When to update it

- A wave milestone closes or a new wave kicks off
- Wave-level scope, owner, or sequencing changes
- The progress summary needs to reflect a new state at the wave level

This document consolidates the bootstrap completion plan and provides a trackable status overview.
It links to the detailed living overview (`overview.md`) and matrix (`matrix.md`) for granular
progress.

## 📋 Wave-Based Task List (Primary Tracking)

| Wave | Description | Status | Owner | Verification |
| --- | --- | --- | --- | --- |
| **W0** | Seed living overview doc | ✅ Completed | general-purpose | `overview.md` renders cleanly; lefthook passes |
| **W1** | P1 Build-Time Blockers | ✅ Completed | forge | `bun run build` in apps/web; `bunx size-limit` passes; @t/errors tests 139/139 |
| **W2** | Billing Depth (sequential) | ⏳ Pending | forge | `bun run test` in @t/db (73→~80); migration applies cleanly |
| **W3** | apps/api Delivery Surface (parallel) | 🟡 Partial | forge (+ bosun for W3a) | `bun run worker` boots; smoke test enqueues + processes job — queue consumer + cron landed in `3aa4b61`; OpenAPI emission + OTLP tracing still pending |
| **W4** | Mobile Store-Readiness (4 parallel) | ⏳ Pending | pocket | Vitest unit tests for token-registration helper; manual token logged |
| **W5** | Desktop Store-Readiness (5a→5b sequential, others parallel) | ⏳ Pending | atelier (+ bosun for W5e) | Unit tests; renderer boots; PostHog event fires on test exception |
| **W6** | Railway Runtime + Deploy Pipeline (sequential) | ⏳ Pending | bosun | Runbook walks through `railway link` → service create → env vars → smoke |
| **W7** | CI Hardening (3 parallel) | ⏳ Pending | bosun | CI shows new job green; @t/cache + @t/db integration tests run on every PR |

> **Note:** W2, W5, and W6/W7 have internal dependencies/sequential constraints as noted in the
> plan.

## 🔗 Detailed Status References

For granular, item-by-item progress tracking, see:

1. **[Living Overview Diagram](./overview.md)**  
   The canonical rich-ASCII diagram showing:
   - Client Apps (web, website, mobile, desktop) with progress bars and checkboxes
   - apps/api lane with status
   - 9 @t/* package boxes in 3-col grid (config, logging, errors, dependency-injection, db, cache,
     analytics, auth, billing)
   - Port-and-impl split visualization
   - CI suite status
   - Railway runtime status
   - Critical-path footer (P0-P3) with ✅/❌ indicators
   - Readiness-by-use-case section (scaffold-as-template, local dev, mobile shipping, desktop
     shipping, production deploy)

2. **[Status Matrix](./matrix.md)**  
   Concern × app grid showing:
   - Framework, Config, Logging, Errors, Auth, DB, Cache, Billing, Analytics, DI status per app
   - Package-level status for @t/* packages
   - App-level status and next steps
   - Historical update notes

3. **[Gap Analysis](./gaps.md)**  
   - Open items list (what remains to be done)
   - Changelog (Resolved YYYY-MM-DD) with one-line summaries
   - Linked from overview.md maintenance contract

## 🔄 Maintenance Contract (Per Overview.md)

Whenever a sub-agent closes a checkbox in `overview.md`, the same commit must:

1. Flip the `[ ]` to `[x]` in `overview.md` (with a `✨ landed-MM-DD` marker if recent)
2. Bump the percent + progress bar (▰▱) in the affected node
3. Mirror the same change in `matrix.md` (concern × app grid)
4. Move the resolved item from `gaps.md` open list into `gaps.md` Changelog (Resolved YYYY-MM-DD)
   with a one-line summary

**No item is "done" until those four files agree.** Drift is a blocker.

## 📈 Current Progress Summary (as of last update)

- **Server-side foundation** (apps/api + apps/web + apps/website + every server-side `@t/*`):
  **Turn-key**
- **Overall bootstrap**: ~93% (W0 & W1 completed; W3 partial — queue consumer + cron entrypoints
  shipped 2026-04-28; W2 / W3 OpenAPI / W4–W7 pending)
- **Critical path items** (P0-P3 footer in overview.md):
  - P0: ✅ ALL CLOSED (auth provider, db strategy, @t/* package naming)
  - P1: ✅ ALL CLOSED (webpack `node:process` URI fix resolved 2026-04-28; TS5097 verified phantom —
    not a runtime blocker)
  - P2: 🟡 In Progress (mobile/desktop store-readiness polish)
  - P3: 🟠 In Progress (Railway runtime + CI hardening; worker/cron entrypoints shipped, separate
    Railway services still need to be provisioned)

## 🔄 Update Instructions

To update this tracking document:

1. Modify the **Wave-Based Task List** table above when waves complete
2. Update the **Current Progress Summary** percentages
3. Ensure `overview.md`, `matrix.md`, and `gaps.md` are updated per maintenance contract
4. Commit changes with:  
   `fix(repo): update bootstrap status tracking`  
   `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

## 🗓️ Recent Changes

- **2026-04-28** — P1 webpack blocker closed. `node:process` URI removed from `ConfigRepositoryImpl`
  (commit `d7dfa2c`); `@t/config/browser` subpath correctly excludes server impl; `apps/web` build +
  size-limit pass (553 kB / 1800 kB). Schema hard-fail enforcement landed: `AnalyticsConfigSchema`,
  `PostHogConfigSchema`, `WebsiteConfigSchema`, `DesktopConfigValuesSchema` all require POSTHOG keys
  via `.min(1)`; `analytics-browser` NoOp fallback removed. CI yml refactored with YAML anchors +
  tier separation. 197 @t/config + 36 apps/web tests green.

- **2026-04-28** — Verified TS5097 lint blocker phantom (typecheck 22/22 green).

- **2026-04-28** — W3 → 🟡 Partial. Commit `3aa4b61` finalized `@t/queue` (port +
  `BullMQQueueClientImpl` + `InMemoryQueueImpl` + `registerQueueDI`) and landed the `apps/api`
  worker (`src/worker.ts`, `bun run worker` / `worker:dev`) and cron (`src/cron.ts`, `bun run cron`)
  entrypoints with `src/jobs/registerJobHandlers.ts` + `pingHandler` + `heartbeatHandler`.
  SIGTERM/SIGINT handler in `src/lifecycle.ts` now awaits `queue.close()` before
  `shutdownLogging()`. New docs: `docs/architecture/platform/queue.md`,
  `docs/prd-status/packages/queue.md`. Open under W3: OpenAPI emission from `AppRouter`, OTLP
  tracing wiring.

---
*Last updated: 2026-04-28*  
*This document is derived from the plan in `create-a-plan-to-validated-wadler.md` and the living
status overview in `overview.md`.*

---

Last reviewed: 2026-04-28 — owner: TBD