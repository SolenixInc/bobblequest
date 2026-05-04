# Phase 08 — README and Handoff

## Goal

Write `packages/analytics/README.md`, reconcile any implementation
divergence in the spec doc, and record the Phase 2+ handoff. This
closes out Phase 1 of `@t/analytics`.

## Blocked by

- Phase 07 (tests green).

## Blocks

- None. Phase 1 is complete when this phase ships.

## Preconditions

- All prior phases (00-07) are merged.
- Typecheck + tests are green at repo root.
- The DI key has been renamed everywhere from `ANALYTICS_CLIENT` to
  `ANALYTICS`.

## Checklist

### `packages/analytics/README.md` (create)

- [x] One-paragraph overview of the package and its role.
- [x] Install / usage snippet:

  ```ts
  import { registerAnalyticsDI } from "@t/analytics";
  registerAnalyticsDI(container, { config, environment: "prod", service: "api" });
  const tracker = container.resolve(dependencyKeys.global.ANALYTICS);
  tracker.capture("signup", userId, { plan: "pro" });
  ```

- [x] All 11 port methods listed with one-line descriptions (capture,
      identify, alias, group, groupIdentify, captureRevenue,
      captureException, captureLlm, isFeatureEnabled, getAllFlags,
      sessionId, shutdown — trim to exactly 11 per the port).
- [x] NoOp selection rules table:

      | Condition                           | Result |
      | ----------------------------------- | ------ |
      | `environment === "testing"`         | NoOp   |
      | `config.analytics.enabled === false`| NoOp   |
      | `!config.analytics.apiKey`          | NoOp + warn |
      | otherwise                           | PostHog |

- [x] Reserved super-properties list: `$environment`, `$service`,
      `$session_id`, `distinct_id`, `request_id`, `$group`. Document
      that caller-supplied values for these keys are ALWAYS overridden.
- [x] Link back to `docs/architecture/platform/analytics/analytics.md`.
- [x] Testing section: `bun test --filter @t/analytics`.

### `docs/architecture/platform/analytics/analytics.md`

- [x] Re-read end to end. Reconcile any divergence introduced during
      implementation (renamed options, tweaked method signatures, etc.).
- [x] Remove every "planned" / "will" / "TBD" phrase — Phase 1 is shipped.
- [x] Confirm the spec's DI example uses `ANALYTICS` (not
      `ANALYTICS_CLIENT`).

### `docs/architecture/platform/analytics/index.md`

- [x] Append a "Future phases" section listing:
  - `apps/api` composition-root wiring + per-request middleware.
  - `apps/web` + `apps/website` + `apps/desktop` + `apps/mobile`
    UI SDK wiring.
  - `@t/billing` → `captureRevenue` on RevenueCat webhook events
    (RevenueCat is the single source of revenue events; Stripe is the web
    rail inside RevenueCat and does not emit app-level webhooks).
  - `@t/logging` → `captureException` fan-out.
  - New `@t/ai` package → `captureLlm` producer.
  - SIGTERM shutdown hook in `apps/api`.
  - Client-side feature-flag gating + Next.js RSC flag bootstrap
    (`getAllFlags` on server for first-paint hydration).

### Cleanup

- [x] `grep -r "AnalyticsClient" packages/ apps/` — zero hits.
- [x] `grep -r "RequestAnalyticsClient" packages/ apps/` — zero hits.
- [x] `grep -r "registerAnalyticsClientDI" packages/ apps/` — zero hits.
- [x] `grep -r "ANALYTICS_CLIENT" packages/ apps/` — zero hits.
- [x] `grep -r "DISABLE_POSTHOG_OTLP" packages/ apps/` — zero hits.
- [x] `bun run typecheck` at repo root — no regressions.

## Files touched

- `packages/analytics/README.md` (create)
- `docs/architecture/platform/analytics/analytics.md` (polish +
  reconcile)
- `docs/architecture/platform/analytics/index.md` (append Future
  phases section)

## Verification

- `bun test` at repo root passes.
- `bun run typecheck` at repo root passes.
- Manual read-through of `README.md` and `analytics.md`: no TODOs,
  no dead links, no `@t/*` references, no `ANALYTICS_CLIENT`
  references.
- All five cleanup greps return zero hits.

## Notes — Handoff to Phase 2

- **Entry points.** Phase 2 lives in `apps/api` composition root (the
  one place that calls `registerAnalyticsDI`) and per-request
  middleware (which injects `RequestAnalyticsTrackerImpl` into the
  scoped container for each inbound request).
- **Feature-flag gating is CLIENT-ONLY** per the Phase-1 decision.
  Use `posthog-js` with `useFeatureFlagEnabled` in React. In Next.js
  RSC, call `tracker.getAllFlags()` on the server and hydrate the
  client at first paint so there is no flicker.
- **SIGTERM shutdown.** `apps/api` must call
  `tracker.shutdown()` on SIGTERM so in-flight events flush before
  the process exits.
- **Producer packages.** `@t/billing`, `@t/logging`,
  and the new `@t/ai` package are downstream consumers of the
  port — they depend on `@t/analytics`, not the other way
  around. Keep the dependency direction strict.
