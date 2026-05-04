---
name: logging-types bootstrap status
last_audited: 2026-04-26
maintainer_contract: This package is a zero-runtime extraction from packages/logging; do not re-add runtime dependencies.
---

# @t/logging-types — bootstrap status

**Package status:** ✅ done

**Scope:** Zero-runtime port definition and types for cross-platform logging. Extracted from
`packages/logging` in 2026-04-26. Both `@t/logging` (server, Winston-backed) and
`@t/logging-browser` (browser, console-backed) depend on this package for the abstract `Logger` port
and log context types.

## Intended (per ADR-0001)

- Port: `Logger` (abstract class, 5 level methods + `child()`)
- Types: `LogContext`, `LogPayload`, `LogArg` (types only; no runtime)
- Enums: `LogLevel` (TRACE | DEBUG | INFO | WARN | ERROR | FATAL), `LogType` (LOCAL | STRUCTURED | QUIET)
- Dependencies: zero runtime (pure TypeScript)

## Actual (present files, 2026-04-26)

- `src/entities/ports/Logger.ts`: abstract class with `debug() / info() / warn() / error() / fatal()
  / child()`
- `src/entities/types/LogContext.ts`: `{ requestId?: string, userId?: string, fileName?: string,
  metadata?: Record<string, any> }`
- `src/entities/types/LogPayload.ts`: `{ err?: Error, message?: string }`
- `src/entities/types/LogArg.ts`: type union for flexible log call signatures
- `src/entities/enums/LogLevel.ts`: `TRACE | DEBUG | INFO | WARN | ERROR | FATAL`
- `src/entities/enums/LogType.ts`: `LOCAL | STRUCTURED | QUIET` (for log formatting control)
- `src/entities/index.ts`, `src/index.ts`: barrel re-exports
- `package.json`: `@t/logging-types`, zero production dependencies
- `tsconfig.json`: extends `../../tsconfig.base.json`

## Consumer hooks

- `import { Logger, LogContext, LogLevel } from @t/logging-types` — for type annotations
- `logger.debug(payload)` / `logger.info()` / `logger.warn()` / `logger.error()` / `logger.fatal()`
  — standard 5-level API
- `logger.child(context)` — create a child logger with context (requestId, userId, metadata)
- `import { LogType } from @t/logging-types` — for advanced formatting control

## Notes for next agent

- This package has zero runtime cost; it is pure TypeScript.
- Never add runtime dependencies (no winston, no pino, no axios, etc.).
- Both `@t/logging` (server, Winston) and `@t/logging-browser` (browser, console) import the port
  from here.
- The port shape is frozen: 5 level methods + `child()`. Adding a 6th level (e.g., `trace()`)
  requires an ADR.
- The 5 levels are: DEBUG, INFO, WARN, ERROR, FATAL (no TRACE by default, reserved for Phase 2+).
- If you find the port is missing a level or method, that signals an ADR discussion, not a silent
  addition.
