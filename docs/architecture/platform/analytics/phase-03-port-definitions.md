# Phase 03 — Port Definitions

## Goal

Define `AnalyticsTracker` and `RequestAnalyticsTracker` as abstract classes exposing the canonical
11-method analytics port surface. These ports are the ONLY thing consumer packages import —
implementations and DI bindings come later.

## Blocked by

- Phase 02 — Types and schemas.

## Blocks

- Phase 05 — PostHog/Noop implementations extend these abstract classes.
- Phase 06 — DI module binds concrete implementations to these ports.
- Phase 07 — Test suites target this port surface.

## Preconditions

- Phase 02 types exist and are re-exported from `@t/analytics`.
- `docs/architecture/platform/analytics/analytics.md` is readable — canonical method signatures live
  there; read it before writing signatures.

## Checklist

- [ ] Read `docs/architecture/platform/analytics/analytics.md` to lift exact method signatures.
- [ ] `src/entities/ports/AnalyticsTracker.ts` — abstract class with EXACTLY 11 abstract methods:
  - [ ] `capture(event: string, distinctId: string, properties?: Record<string, unknown>, groups?:
    Record<string, string>): void`
  - [ ] `captureException(error: Error, distinctId: string, properties?: Record<string, unknown>):
    void`
  - [ ] `captureRevenue(event: RevenueEvent): void`
  - [ ] `captureLlm(event: LlmEvent): void`
  - [ ] `identify(distinctId: string, traits?: Record<string, unknown>): void`
  - [ ] `alias(distinctId: string, alias: string): void`
  - [ ] `group(groupType: string, groupKey: string, traits?: Record<string, unknown>): void`
  - [ ] `sessionId(): string` — sync, NOT a Promise.
  - [ ] `isFeatureEnabled(key: string, distinctId: string): Promise<boolean>`
  - [ ] `getAllFlags(distinctId: string): Promise<Record<string, boolean | string>>`
  - [ ] `shutdown(): Promise<void>`
- [ ] JSDoc every method with purpose, parameter semantics, and side-effect notes.
- [ ] `src/entities/ports/RequestAnalyticsTracker.ts` — abstract class wrapping an
  `AnalyticsTracker` and stamping per-request super-properties (`distinct_id`, `$session_id`,
  `request_id`, `$environment`, `$service`, `$group`) into every outbound call.
- [ ] `src/entities/ports/index.ts` re-exports `AnalyticsTracker` and `RequestAnalyticsTracker`.
- [ ] Delete legacy `src/entities/ports/AnalyticsClient.ts` and
  `src/entities/ports/RequestAnalyticsClient.ts` IF present (Deno-era interfaces superseded by these
  abstract classes).
- [ ] Update `src/index.ts` to re-export `./entities/ports`.

## Files touched

- `packages/analytics/src/entities/ports/AnalyticsTracker.ts`
- `packages/analytics/src/entities/ports/RequestAnalyticsTracker.ts`
- `packages/analytics/src/entities/ports/index.ts`
- `packages/analytics/src/index.ts`
- (delete if present) `packages/analytics/src/entities/ports/AnalyticsClient.ts`
- (delete if present) `packages/analytics/src/entities/ports/RequestAnalyticsClient.ts`

## Verification

- `cd packages/analytics && bun run tsc --noEmit` exits 0.
- `grep -c "abstract " packages/analytics/src/entities/ports/AnalyticsTracker.ts` returns `11`.
- External consumer: `import { AnalyticsTracker, RequestAnalyticsTracker } from "@t/analytics"`
  resolves.

## Notes

- `sessionId()` is sync `string`, NOT `Promise<string>` — stable per-tracker session identifier,
  cheap to read.
- Do NOT include `capturePerformanceMetric` on the port. It is middleware-level and composes on top
  of `capture(...)`.
- Abstract classes (not interfaces) so implementations can share zero-arg constructability and
  `instanceof` checks in DI.
- `RequestAnalyticsTracker` must not add new methods — it mirrors the 11-method surface and injects
  super-properties transparently.
