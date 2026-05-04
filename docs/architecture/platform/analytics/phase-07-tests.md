# Phase 07 — Tests

## Goal

Cover construction guards, reserved-prop stamping, DI selection, NoOp
behavior, and request-scope stamping with Vitest. No real PostHog network
calls — mock at the module boundary.

## Blocked by

- Phase 06 (registrar + renamed DI key).

## Blocks

- Phase 08 (README, reconciliation, handoff).

## Preconditions

- Vitest is NOT in root devDeps today — must be added in this phase.
- Inspect existing packages under `packages/*` first to learn the repo's
  test convention (root-shared vs per-package Vitest config).
- `posthog-node` is a runtime dep of `@t/analytics`.

## Checklist

- [ ] Add `vitest` + `@vitest/coverage-v8` to root `devDependencies` OR
      to `packages/analytics/package.json` devDependencies — follow
      whichever convention other packages use. Inspect first.
- [ ] Add `packages/analytics/vitest.config.ts` (or extend a root one
      if one already exists).
- [ ] Add `"test": "vitest run"` script to
      `packages/analytics/package.json`.
- [ ] Ensure the package name used everywhere is `@t/analytics`.
      NEVER `@t/*`.

### `tests/construction.test.ts`

- [ ] `new PostHogAnalyticsTrackerImpl({})` throws
      `TypeError("environment required")`.
- [ ] `new PostHogAnalyticsTrackerImpl({ environment: "prod" })` throws
      `TypeError("service required")`.
- [ ] Same two guards applied to `NoOpAnalyticsTracker`.

### `tests/reserved-props.test.ts`

- [ ] `capture(name, id, { $environment: “development” })` — the event sent
      to PostHog has `$environment` equal to the ctor's environment, NOT
      the caller's override.
- [ ] Same stamping precedence for `$service`, `$session_id`,
      `distinct_id`, `request_id`, and `$group`.

### `tests/di-selection.test.ts`

- [ ] `environment === "testing"` → `container.resolve(dependencyKeys.global.ANALYTICS)`
      returns an instance of `NoOpAnalyticsTracker`.
- [ ] `config.analytics.enabled === false` → resolves `NoOpAnalyticsTracker`.
- [ ] `config.analytics.apiKey === ""` → resolves `NoOpAnalyticsTracker`
      AND `logger.warn` was called exactly once.
- [ ] Valid config + non-testing environment → resolves
      `PostHogAnalyticsTrackerImpl`.

### `tests/noop.test.ts`

- [ ] All 11 port methods on `NoOpAnalyticsTracker` return without
      throwing.
- [ ] `isFeatureEnabled(...)` returns `false`.
- [ ] `getAllFlags(...)` returns `{}`.
- [ ] `sessionId(...)` returns the documented stub value.
- [ ] `shutdown()` resolves (never rejects).

### `tests/request-scope.test.ts`

- [ ] `RequestAnalyticsTrackerImpl` stamps `distinct_id` from `userId`
      when present; falls back to `$session_id`, then `requestId`.
- [ ] Stamps `$session_id` from the session header.
- [ ] Stamps `request_id` from the request context.
- [ ] Stamps `$group` when a group is present on the request.
- [ ] Inherits `$environment` and `$service` from the parent
      (global) tracker — request-scope NEVER overrides these.

### PostHog mocking

- [ ] `vi.mock("posthog-node", ...)` — replace the `PostHog` class with
      a fake exposing `capture`, `identify`, `alias`, `groupIdentify`,
      `isFeatureEnabled`, `getAllFlags`, `shutdown`, etc.
- [ ] Assert `.capture()` is called with the right merged payload
      (reserved props win, caller props pass through).
- [ ] No real network I/O. Confirm `fetch`/`undici` is never invoked in
      unit tests (can spy if paranoid).

## Files touched

- `packages/analytics/tests/construction.test.ts` (create)
- `packages/analytics/tests/reserved-props.test.ts` (create)
- `packages/analytics/tests/di-selection.test.ts` (create)
- `packages/analytics/tests/noop.test.ts` (create)
- `packages/analytics/tests/request-scope.test.ts` (create)
- `packages/analytics/vitest.config.ts` (create if needed)
- `packages/analytics/package.json` (add `test` script + devDeps)
- Root `package.json` (only if that is the repo convention for Vitest)

## Verification

- `bun test --filter @t/analytics` — ALL green.
- Coverage: construction guards, all 4 selection branches, every reserved
  prop, every NoOp method, every request-scope stamp.
- Grep the test output: zero "actual network" markers, zero unhandled
  promise rejections.

## Notes

- Prefer mocking `posthog-node` at the module boundary with `vi.mock`
  over ctor-injection of a fake client — keeps production code lean.
- If a test needs fine-grained control over the PostHog mock, inject it
  via an optional ctor param used ONLY by tests (document clearly).
- Do NOT hit the real PostHog API. No live keys in fixtures.
- Keep each test file narrow and named after its concern — SRP applies
  to tests too.
