---
name: analytics-types bootstrap status
last_audited: 2026-04-26
maintainer_contract: This package is a zero-runtime extraction from packages/analytics; do not re-add runtime dependencies.
---

# @t/analytics-types — bootstrap status

**Package status:** ✅ done

**Scope:** Zero-runtime port definition and types for cross-platform analytics. Extracted from
`packages/analytics` in 2026-04-26. Both `@t/analytics` (server) and `@t/analytics-browser`
(web/electron) depend on this package for the abstract `AnalyticsTracker` port and event schemas.

## Intended (per ADR-0001)

- Port: `AnalyticsTracker` (abstract class, 11 methods) + `RequestAnalyticsTracker` (per-request
  wrapper, same surface)
- Types: `Environment`, `Service`, `AnalyticsTrackerOptions`, `RevenueEvent`, `LlmEvent`,
  `ReservedSuperProps` (const + predicate)
- Schema: `EventSchema` (Zod)
- Dependencies: `zod ^3.23.0` only

## Actual (present files, 2026-04-26)

- `src/entities/ports/AnalyticsTracker.ts`: abstract class (11 methods)
- `src/entities/ports/RequestAnalyticsTracker.ts`: per-request wrapper port
- `src/entities/types/AnalyticsTrackerOptions.ts`
- `src/entities/types/Environment.ts` (development | local | testing | production)
- `src/entities/types/Service.ts` (api | web | website | mobile | desktop)
- `src/entities/types/RevenueEvent.ts`
- `src/entities/types/LlmEvent.ts`
- `src/entities/types/ReservedSuperProps.ts` (const + `isReservedKey` predicate)
- `src/entities/schemas/EventSchema.ts`: Zod schema
- `src/entities/index.ts`, `src/index.ts`: barrel re-exports
- `package.json`: `@t/analytics-types`, dependency on `zod ^3.23.0` only
- `tsconfig.json`: extends `../../tsconfig.base.json`
- `vitest.config.ts`, `biome.json`: inherited from repo config

## Consumer hooks

- `import { AnalyticsTracker, RequestAnalyticsTracker } from @t/analytics-types` — for type
  annotations
- `import { EventSchema } from @t/analytics-types` — for event validation
- `import { Environment, Service } from @t/analytics-types` — for enum-like types
- `import { ReservedSuperProps, isReservedKey } from @t/analytics-types` — for PII redaction

## Notes for next agent

- This package has zero runtime cost; it is pure TypeScript and Zod schemas.
- Never add runtime dependencies (no `posthog-node`, no `posthog-js`, no `lodash`, etc.).
- Both `@t/analytics` (server) and `@t/analytics-browser` (browser) import the port and types from
  here.
- The port shape is frozen: 11 methods on `AnalyticsTracker`. Adding a 12th requires a new ADR.
- If you find the port is too abstract or missing a method, that is a signal to open an ADR
  discussion, not to add a 12th method silently.
