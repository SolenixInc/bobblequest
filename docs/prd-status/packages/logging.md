---
name: logging bootstrap status
last_audited: 2026-04-27
maintainer_contract: any agent editing packages/logging/** or apps/*/logging wiring MUST update this file and docs/prd-status/matrix.md
---

# @t/logging — bootstrap status

**Package status:** ✅ done

**Scope:** Server-only logging implementation using Winston v3 + PostHog OTLP transport. In
2026-04-26, the port and types were extracted to `@t/logging-types` (zero-runtime); this package now
re-exports from `-types` and keeps infrastructure impl + DI registrars. Browser surfaces use
`@t/logging-browser` (console impl) instead. The port is shared; the impl swaps at registration
time.

Phase 1 (port + winston impl + OTLP transport + DI + tests) fully landed. `apps/api` and `apps/web`
composition roots both call `registerLoggerFactoryDI` + `registerLoggerDI`. Platform doc reconciled
to winston 2026-04-26. SIGTERM/SIGINT flush hook landed in apps/api 2026-04-26 (`shutdownLogging`
helper awaits `OTLPWinstonTransport.shutdown()`). RN adapter shipped as `@t/logging-rn` (see
[logging-rn.md](./logging-rn.md)) 2026-04-27. Remaining: apps/{website,mobile,desktop} composition
roots.

## Intended (per docs)

- Port: `Logger` (5 levels + `child()`) — lives in `@t/logging-types`
- Impl: `WinstonLogger` base + `GlobalLogger` / `RequestLogger` marker subclasses
- Transport: Console (JSON prod, ANSI pretty dev) + optional PostHog OTLP
- DI: `registerLoggerDI` + `registerLoggerFactoryDI`

## Actual (present files, refactored 2026-04-26)

- `entities/index.ts`: re-exports from `@t/logging-types`
- `infrastructure/winstonLogger.ts`: `WinstonLogger` base (winston v3, JSON in prod, ANSI in dev)
- `infrastructure/globalLogger.ts`: `GlobalLogger extends WinstonLogger`
- `infrastructure/requestLogger.ts`: `RequestLogger extends WinstonLogger`
- `infrastructure/redactors.ts`: PII redaction (default + `redactExtraPaths`)
- `infrastructure/errorSerializer.ts`: walk Error objects, flatten to `{type, message, stack}`
- `infrastructure/transports/otlpTransport.ts`: PostHog OTLP bridge + circuit breaker + batch
  processor
- `infrastructure/transports/transportFactory.ts`: singleton OTLP transport with graceful shutdown
- `dependency-injection/registerLoggerDI.ts`: `registerLoggerDI(container)` binds `"logger"`
  singleton
- `dependency-injection/registerLoggerFactoryDI.ts`: legacy, binds
  `dependencyKeys.global.LOGGER_FACTORY`
- `index.ts`: re-exports entities/infra/DI + factory helpers
- `package.json`: `@t/logging`, deps on `@t/{logging-types,config,dependency-injection}`, `winston
  ^3.19`, OTLP packages
- Tests: 8 Vitest files, **100% coverage**

## Consumer hooks

- `createGlobalLogger(fileNameOrOptions?)` — returns `GlobalLogger` for app-scoped logging
- `createRequestLogger(context, options?)` — returns `RequestLogger` for per-request logging
- `registerLoggerDI(container, { context?, redactExtraPaths?, quiet? })` — binds `"logger"`
  singleton (preferred)
- `registerLoggerFactoryDI(container)` — binds legacy `LOGGER_FACTORY` token
- `setGlobalQuietMode(quiet)` — toggle quiet mode at startup

## Notes for next agent

- **Port extracted 2026-04-26:** All port/type/enum files moved to `@t/logging-types`; this package
  now re-exports from there.
- Winston is the canonical impl, not pino (platform doc reconciled 2026-04-26).
- OTLP shutdown caps `exportTimeoutMillis` at 3s so `shutdown()` stays under the 4s guard.
- Browser logging now uses `@t/logging-browser` instead of Winston (which is Node-only).
- React Native logging uses `@t/logging-rn` (see [logging-rn.md](./logging-rn.md)) — shipped
  2026-04-27.
- The port shape is sealed at 5 levels (DEBUG, INFO, WARN, ERROR, FATAL); adding a 6th requires an
  ADR.
- See ADR-0001 for the platform package split convention.
