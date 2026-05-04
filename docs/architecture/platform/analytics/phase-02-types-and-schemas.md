# Phase 02 — Types and Schemas

## Goal

Define the domain types and Zod schemas that every downstream phase (ports, implementations, DI,
tests) imports. This phase produces the static type contract and the runtime validation surface for
captured analytics events, with no behavior or side effects.

## Blocked by

- Phase 01 — Package scaffolding and folder layout.

## Blocks

- Phase 03 — Port definitions import these types.
- Phase 05 — Implementations (PostHog, noop) import these types.

## Preconditions

- `packages/analytics/src/entities/{types,schemas,ports}` directories exist.
- `@t/analytics` package resolves via `@t/*` path alias from `tsconfig.base.json`.
- `zod` is installed as a dependency of `@t/analytics`.

## Checklist

- [x] `src/entities/types/Environment.ts` — exports `type Environment = “development” | “local” | “testing” | “production”` (aligned to canonical EnvironmentSchema 4-value enum; `staging` removed 2026-04-26).
- [ ] `src/entities/types/Service.ts` — exports `type Service = "api" | "web" | "website" | "mobile" | "desktop" | "worker"`.
- [ ] `src/entities/types/AnalyticsTrackerOptions.ts` — `{ environment: Environment; service:
  Service; apiKey?: string; host?: string; enabled?: boolean }`.
- [ ] `src/entities/types/RevenueEvent.ts` — `{ amount: number; currency: string; distinctId:
  string; groups?: Record<string, string>; meta?: Record<string, unknown> }`.
- [ ] `src/entities/types/LlmEvent.ts` — `{ model: string; inputTokens: number; outputTokens:
  number; latencyMs: number; traceId: string; meta?: Record<string, unknown> }`.
- [ ] `src/entities/types/ReservedSuperProps.ts` — const array of reserved keys (`$environment`,
  `$service`, `$session_id`, `distinct_id`, `request_id`, `$group`) plus helper `isReservedKey(key:
  string): boolean`.
- [ ] `src/entities/types/index.ts` re-exports all of the above.
- [ ] `src/entities/schemas/EventSchema.ts` — Zod schema for a captured event's generic shape
  (`event`, `distinctId`, `properties`, optional `groups`, optional `timestamp`).
- [ ] `src/entities/schemas/index.ts` re-exports `EventSchema`.
- [ ] `src/index.ts` re-exports everything from `./entities/types` and `./entities/schemas`.

## Files touched

- `packages/analytics/src/entities/types/Environment.ts`
- `packages/analytics/src/entities/types/Service.ts`
- `packages/analytics/src/entities/types/AnalyticsTrackerOptions.ts`
- `packages/analytics/src/entities/types/RevenueEvent.ts`
- `packages/analytics/src/entities/types/LlmEvent.ts`
- `packages/analytics/src/entities/types/ReservedSuperProps.ts`
- `packages/analytics/src/entities/types/index.ts`
- `packages/analytics/src/entities/schemas/EventSchema.ts`
- `packages/analytics/src/entities/schemas/index.ts`
- `packages/analytics/src/index.ts`

## Verification

- `cd packages/analytics && bun run tsc --noEmit` exits 0.
- From another package: `import type { Environment, Service } from "@t/analytics"` resolves without
  error.
- `EventSchema.safeParse({ event: "x", distinctId: "u1", properties: {} }).success === true`.

## Notes

- `Environment` and `Service` unions are the ONLY allowed values — no string widening.
- `ReservedSuperProps` is the contract enforced by `capture*` methods: callers cannot override these
  keys via `properties`. Runtime enforcement happens in implementations (Phase 05), but the list
  lives here as the single source of truth.
- Keep each type file to a single responsibility — one exported type per file — to match repo SRP
  conventions.
- Do not import Zod in the pure type files; schemas live exclusively under `entities/schemas`.
