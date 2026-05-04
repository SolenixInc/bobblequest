# Phase 05 — Implementations

## Goal

Implement the three concrete analytics trackers: `PostHogAnalyticsTrackerImpl`,
`NoOpAnalyticsTracker`, and `RequestAnalyticsTrackerImpl`. All Deno-style imports from the legacy
`*AnalyticsClient*Impl.ts` files must be eliminated.

## Blocked by

- Phase 03 — Port definitions (`AnalyticsTracker`, `RequestAnalyticsTracker`).
- Phase 04 — `AnalyticsConfigSchema`.

## Blocks

- Phase 06 — DI wires these impls into Awilix.
- Phase 07 — Tests exercise behaviour of each impl.

## Preconditions

- `posthog-node` is a direct dep of `@t/analytics` (NOT the Deno `@posthog` alias).
- `@t/logging` available for `warn`/`debug`.
- Legacy files under `packages/analytics/infrastructure/*AnalyticsClient*Impl.ts` are still present
  and must be deleted at the end.

## Checklist — `PostHogAnalyticsTrackerImpl`

- [ ] Create `packages/analytics/src/infrastructure/PostHogAnalyticsTrackerImpl.ts` extending
  `AnalyticsTracker`.
- [ ] Constructor signature: `({ environment, service, apiKey, host, enabled }:
  AnalyticsTrackerOptions)`.
- [ ] Guard: `if (!environment) throw new TypeError("environment required")`.
- [ ] Guard: `if (!service) throw new TypeError("service required")`.
- [ ] Instantiate `new PostHog(apiKey, { host })` from `posthog-node`.
- [ ] Implement ALL 11 methods from the port.
- [ ] Every capture method auto-stamps `$environment` and `$service` from ctor values, stripping any
  caller-supplied override from `props`.
- [ ] Strip reserved keys from caller `props` BEFORE merge: `$session_id`, `distinct_id`,
  `request_id`, `$group`, `$environment`, `$service`. Log a `warn` via `@t/logging` when stripping
  so misuse surfaces.
- [ ] `shutdown()` calls `postHogClient.shutdown()` and awaits it.
- [ ] Replace ALL Deno-style imports. Target state:
  - `@posthog` → `posthog-node`
  - `@/di` → `@t/di` (or local port module)
  - `@/errors` → `@t/errors`
  - `@/logging` → `@t/logging`
  - `@/entities/analytics` → relative `../entities/...` within `@t/analytics`
  - `import.meta.filename` → remove (Deno-only).

## Checklist — `NoOpAnalyticsTracker`

- [ ] Create `packages/analytics/src/infrastructure/NoOpAnalyticsTracker.ts` extending
  `AnalyticsTracker`.
- [ ] Same constructor shape + `environment`/`service` guards as PostHog impl.
- [ ] All capture methods no-op (resolve `void`).
- [ ] `sessionId()` returns a stable stub (e.g. `"noop-session"`).
- [ ] `isFeatureEnabled()` returns `false`.
- [ ] `getAllFlags()` returns `{}`.
- [ ] `shutdown()` resolves immediately.
- [ ] Optional: debug-log each call via `@t/logging` with the would-be-stamped payload so devs can
  trace locally.

## Checklist — `RequestAnalyticsTrackerImpl`

- [ ] Create `packages/analytics/src/infrastructure/RequestAnalyticsTrackerImpl.ts` extending
  `RequestAnalyticsTracker`.
- [ ] Constructor: `({ parent: AnalyticsTracker, requestId, userId?, sessionIdFromHeader?, groupKey?
  })`.
- [ ] Compute `distinct_id = userId ?? sessionIdFromHeader ?? requestId`.
- [ ] On every capture, stamp: `distinct_id`, `$session_id`, `request_id`, and `$group` (only when
  `groupKey` present).
- [ ] Do NOT restamp `$environment` / `$service` — inherit from parent.
- [ ] Delegate the final capture call to `parent.<method>(...)` with stamped props.
- [ ] Re-export from `packages/analytics/src/infrastructure/index.ts`.

## Cleanup

- [ ] Delete `packages/analytics/src/infrastructure/PostHogAnalyticsClientImpl.ts`.
- [ ] Delete `packages/analytics/src/infrastructure/NoOpAnalyticsClient.ts`.
- [ ] Delete `packages/analytics/src/infrastructure/RequestAnalyticsClientImpl.ts`.
- [ ] Grep repo for `AnalyticsClient` — zero hits remain.

## Files touched

```text
packages/analytics/src/infrastructure/PostHogAnalyticsTrackerImpl.ts   (new)
packages/analytics/src/infrastructure/NoOpAnalyticsTracker.ts          (new)
packages/analytics/src/infrastructure/RequestAnalyticsTrackerImpl.ts   (new)
packages/analytics/src/infrastructure/index.ts                         (re-export)
packages/analytics/src/infrastructure/*AnalyticsClient*Impl.ts         (deleted)
```

## Verification

- [ ] `cd packages/analytics && bun run tsc --noEmit` exits 0.
- [ ] Manual ctor sanity:

```ts
new PostHogAnalyticsTrackerImpl({}); // throws TypeError
new PostHogAnalyticsTrackerImpl({ environment: "prod" }); // throws TypeError
new PostHogAnalyticsTrackerImpl({ environment: "prod", service: "api", apiKey: "phc_..." }); // ok
```

- [ ] Grep: zero `@posthog`, `@/di`, `@/errors`, `@/logging`, `@/entities/analytics`, or
  `import.meta.filename` references inside `packages/analytics/`.

## Notes

- Callers MUST NOT override `$environment` / `$service` — guarding this at the tracker boundary is
  the core value of the port. Enforce by stripping reserved keys BEFORE merging stamped values.
- `RequestAnalyticsTrackerImpl` owns per-request stamping; the base tracker owns per-process
  stamping. Do not duplicate.
- Full correctness (stripping, flag eval, shutdown) validated end-to-end in Phase 07.
