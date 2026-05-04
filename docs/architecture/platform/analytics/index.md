# Analytics Package — Phase 1 Implementation Plan

## Context

`packages/analytics/` is the platform-wide `@t/analytics` port + PostHog implementation.

Two docs cover this module — they serve different purposes:

- **`docs/architecture/platform/analytics.md`** (parent folder) — the platform architecture
  reference doc. Linked from `ARCHITECTURE.md`'s module index. Describes the full target design
  including Phase 2+ surfaces (UI SDK matrix, revenue hook, LLM spans, session stitching). This is
  the doc ARCHITECTURE.md points to.
- **`docs/architecture/platform/analytics/analytics.md`** (this folder) — the Phase-1 implementation
  spec. Focused solely on the core package (port + impls + DI + tests). Use this file as the source
  of truth when executing Phase-1 work.

The phase files in this folder (`phase-01` through `phase-08`) track Phase-1 implementation
progress. Phase 2+ work will be added here as new phase files once Phase 1 merges.

This index breaks Phase 1 (core package fix) into executable sub-phases, each with its own
checklist.

## Scope

**In scope (Phase 1):** the port, implementations, DI registrar, config schema, tests, and docs. No
app wiring, no UI SDKs, no cross-module producers.

**Out of scope (Phase 2+ — see
[`phase-08-readme-and-handoff.md`](./phase-08-readme-and-handoff.md)):**

- `apps/api` composition-root registration + per-request `RequestAnalyticsTracker` middleware
- `apps/*` UI SDK installation (`posthog-js`, `posthog-react-native`)
- `@t/billing` → `captureRevenue` on RevenueCat webhook events (RevenueCat is the single source of
  revenue events; Stripe is the web rail inside RevenueCat and does not emit app-level webhooks).
  Extends existing package.
- `@t/logging` → `captureException` fan-out on error-level logs (extends existing package)
- `@t/ai` → `captureLlm` on every model call (package does not yet exist — Phase 2 scaffolds it)
- `SIGTERM` flush hook in `apps/api`
- Client-side feature-flag gating + Next.js RSC flag bootstrap

## Phase Order

| # | Phase | Status | Blocks | Blocked by |
| --- | --- | --- | --- | --- |
| 01 | [Package skeleton](./phase-01-package-skeleton.md) | ✅ | 02–08 | — |
| 02 | [Types & schemas](./phase-02-types-and-schemas.md) | ✅ | 03, 05 | 01 |
| 03 | [Port definitions](./phase-03-port-definitions.md) | ✅ | 05, 06, 07 | 02 |
| 04 | [Config schema (`@t/config`)](./phase-04-config-schema.md) | ✅ | 05, 06 | 01 |
| 05 | [Implementations](./phase-05-implementations.md) | ✅ | 06, 07 | 03, 04 |
| 06 | [DI registrar](./phase-06-di-registrar.md) | ✅ | 07 | 05 |
| 07 | [Tests](./phase-07-tests.md) | ✅ | 08 | 06 |
| 08 | [README + handoff](./phase-08-readme-and-handoff.md) | ✅ | — | 07 |

Phases 01 and 04 can run in parallel after the skeleton is scaffolded. Phases 02 → 03 serialize
(ports need the types). Phase 05 fans in from 03 + 04.

## Conventions (template-repo)

- **Package manager:** `bun@1.3.11` (see `bunfig.toml` and `bun.lock` — note the lockfile is
  `bun.lock`, not `bun.lockb`).
- **Monorepo tool:** `turbo` (see `turbo.json`).
- **Base tsconfig:** `tsconfig.base.json` at repo root — each package extends it.
- **Alias style:** `@t/*` mapped to `./packages/*/src` in
  `tsconfig.base.json#compilerOptions.paths`. Package sources therefore live under
  `packages/<name>/src/`.
- **Existing packages already in repo:** `@t/config`, `@t/logging`, `@t/billing`, `@t/errors`,
  `@t/db`. Analytics will sit alongside these. Only `@t/ai` is missing today — it is scaffolded in
  Phase 2.
- **Apps in this repo:** `api` (Bun + Hono + tRPC), `web` (Next.js), `website` (Next.js), `desktop`
  (Electron), `mobile` (React Native / Expo).
- **Versioning:** `changesets` (see `.changeset/`).
- **Testing:** Vitest is **not** currently wired at repo root. Phase 07 must add it (either as a
  root shared dev-dep or per-package).
- **Rule of thumb:** before each phase, run `ls` in the relevant directory to confirm current state;
  do not assume the tree.

## How to use these phase files

1. Open the phase file.
2. Confirm all "Blocked by" phases are complete.
3. Work through the checklist top-to-bottom; tick items as you go.
4. Run the **Verification** step. Do NOT mark a phase complete until verification passes.
5. Move to the next phase.

## Future phases

Once Phase 1 (this folder) is fully shipped and merged, Phase 2+ work will be
captured in its own `docs/architecture/platform/analytics/phase-2X-*.md`
files following the same structure. The concrete scope is:

- `apps/api` composition-root wiring (`registerAnalyticsDI`) + per-request
  middleware that injects `RequestAnalyticsTracker` into the scoped container.
- `apps/web` + `apps/website` + `apps/desktop` + `apps/mobile` UI SDK wiring
  (`posthog-js`, `posthog-react-native`).
- `@t/billing` → `captureRevenue` on RevenueCat webhook events
  (RevenueCat is the single source of revenue events; Stripe is the web rail
  inside RevenueCat and does not emit app-level webhooks). Extends the
  existing package.
- `@t/logging` → `captureException` fan-out on every `error`-level log
  (extends the existing package).
- New `@t/ai` package → `captureLlm` producer on every model call
  (package does not yet exist; Phase 2 scaffolds it).
- `SIGTERM` shutdown hook in `apps/api` calling `tracker.shutdown()` so
  in-flight events flush before the process exits.
- Client-side feature-flag gating + Next.js RSC flag bootstrap: call
  `tracker.getAllFlags(...)` on the server and hydrate the client at
  first paint so there is no flicker.
