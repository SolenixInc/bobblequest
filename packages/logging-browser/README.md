# `@t/logging-browser`

Browser-side logging facade. Implements the shared `Logger` port from `@t/logging-types` for code
that runs in browsers (Next.js client components, web workers, embedded SDKs) without pulling in
winston or any Node-only transports.

Sibling packages: [`@t/logging`](../logging/README.md) (server, winston-backed),
[`@t/logging-rn`](../logging-rn/README.md) (React Native).

## Install

Workspace reference — already wired in the monorepo. In any browser-targeted app's `package.json`:

```json
{
  "dependencies": {
    "@t/logging-browser": "workspace:*"
  }
}
```

## Build

```bash
bun run build
```

## Public API

| Export | Kind | Purpose |
| --- | --- | --- |
| `ConsoleLogger` | class | `Logger` impl backed by `console.{debug,info,warn,error}` with structured payloads. |
| `AnalyticsBridgedLogger` | class | Decorator forwarding `warn`/`error`/`fatal` to a tracker via `captureException`, while preserving local console output. |
| `createBrowserLogger` | factory | Singleton factory returning a `ConsoleLogger`, optionally wrapped in `AnalyticsBridgedLogger`. |
| `getLogger` | factory | Returns the existing singleton, or creates a default one if none exists. |
| `registerLoggerBrowserDI` | DI registrar | Registers a singleton `Logger` under `dependencyKeys.global.LOGGER` in an Awilix container. |
| `LOGGER_DEPENDENCY_KEY` | const | Re-export of the DI key for convenience. |
| `DEFAULT_REDACT_PATHS`, `REDACTION_CENSOR`, `RedactConfig`, `buildRedactConfig`, `redactFormat` | redaction utils | Same redaction primitives as `@t/logging`, exposed for parity. |

## Notes

- **No winston, no Node transports.** Bundles cleanly under any browser bundler
  (webpack/turbopack/vite).
- **Singleton scope.** `createBrowserLogger` keeps a module-level singleton;
  `registerLoggerBrowserDI` keeps a container-scoped singleton. Pick one entry point per app.
- **Redaction parity.** `DEFAULT_REDACT_PATHS` mirrors `@t/logging` so logs share the same
  secret-key vocabulary across platforms.

## See also

- Sibling: [`@t/logging`](../logging/README.md) — server logger with winston + OTLP.
- Sibling: [`@t/logging-rn`](../logging-rn/README.md) — React Native logger.
- Port: [`@t/logging-types`](../logging-types) — shared `Logger`, `LogArg`, `LogContext`.
- Architecture spec:
  [`docs/architecture/platform/logging.md`](../../docs/architecture/platform/logging.md).
