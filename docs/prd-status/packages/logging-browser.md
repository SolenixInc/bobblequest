---
name: logging-browser bootstrap status
last_audited: 2026-04-26
maintainer_contract: Browser logging with analytics-bridge. Any changes to console impl or error serialization MUST update this doc.
---

# @t/logging-browser — bootstrap status

**Package status:** ✅ done

**Scope:** Browser implementation of `Logger` port using structured console output. Features PII
redaction (matching server), analytics bridge (error/fatal logs auto-send to PostHog), and graceful
fallback when analytics is not available. Exported as `getLogger()` singleton and DI registrar for
future composition roots.

## Intended (per plan)

- Impl: `ConsoleLogger` (logs to console with structured JSON in prod, pretty-print in dev)
- Bridge: `AnalyticsBridgedLogger` (decorator: error/fatal/warn also call
  `analytics.captureException()`)
- Redaction: PII redaction format (default keys + `redactExtraPaths`), ported verbatim from server
- Error serialization: walk Error objects and flatten into `{type, message, stack}`
- DI: `registerLoggerBrowserDI(container, options)` for future apps with composition roots
- Module singleton: `getLogger()` for simple cases (returns console-backed logger with optional
  analytics bridge)
- Dependencies: `@t/logging-types`, `@t/analytics-types`, `@t/dependency-injection`, `zod` (per
  `package.json` shipped 2026-04-26 in commit `6cd7c69`; analytics is a type-only import — no
  runtime dependency on an analytics impl)

## Actual (present files, 2026-04-26)

- `src/infrastructure/ConsoleLogger.ts`: implements `Logger` via `console.log/warn/error`
- `src/infrastructure/AnalyticsBridgedLogger.ts`: decorator wrapping ConsoleLogger, calls
  `analytics.captureException()` on error/fatal/warn
- `src/infrastructure/redactors.ts`: ported verbatim from
  `packages/logging/infrastructure/redactors.ts` — PII redaction format
- `src/infrastructure/errorSerializer.ts`: ported verbatim — walks Error objects, flattens to
  `{type, message, stack}`
- `src/factories/createBrowserLogger.ts`: factory for `ConsoleLogger`, optional analytics injection,
  return `AnalyticsBridgedLogger` if analytics available
- `src/dependency-injection/registerLoggerBrowserDI.ts`: DI registrar binding `"logger"` singleton
- `src/index.ts`: barrel re-exports port (from `-types`) + impl + factories
- `package.json`: `@t/logging-browser`, runtime deps on `@t/logging-types`, `@t/analytics-types`,
  `@t/dependency-injection`, `zod` (the `@t/analytics-types` dep is type-only; no runtime import of
  an analytics impl)
- `tsconfig.json`: extends repo base
- `vitest.config.ts`: 100% coverage threshold; env: happy-dom (per devDependencies)
- Tests: 100% coverage

## Consumer hooks

- `getLogger()` — call to get the module-level singleton
- `logger.debug(payload)` / `logger.info()` / `logger.warn()` / `logger.error()` / `logger.fatal()`
  — 5-level API
- `logger.child(context)` — returns a new logger with context stamped into every log
- Analytics bridge: if analytics is available (detected at runtime), calling `logger.error()` or
  `logger.fatal()` automatically calls `analytics.captureException()`
- `registerLoggerBrowserDI(container, options?)` — DI registrar for composition roots

## Behavior

- **Console output:** structured JSON in `NODE_ENV=production`, pretty-print ANSI in dev
- **PII redaction:** default keys (password, token, apiKey, secret, email, …) are masked; extra
  paths configurable
- **Analytics bridge:** error/fatal/warn logs optionally fan out to `analytics.captureException()`;
  graceful fallback if analytics not wired
- **Error serialization:** any Error object (even nested in logs) is flattened into `{type, message,
  stack}`

## Notes for next agent

- The package imports `@t/analytics-types` only for type annotations (e.g., `AnalyticsTracker` type
  hint on the optional analytics instance). No runtime import of actual analytics impl.
- `AnalyticsBridgedLogger` is a decorator pattern: it wraps the console logger and injects the
  analytics reference at construction time.
- Redaction is applied at the serialization boundary, so PII never reaches the console even in dev.
- `redactors.ts` and `errorSerializer.ts` are verbatim ports from the server package; keep them in
  sync if either changes.
- The 5-level API mirrors the server: DEBUG, INFO, WARN, ERROR, FATAL. No TRACE in phase 1.
- This package is browser-only; it will NOT run on Node.js (no runtime issue, but pointless since
  server has Winston).
