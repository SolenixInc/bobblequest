# `@t/logging-rn`

React Native counterpart to [`@t/logging`](../logging/README.md). Implements the shared `Logger`
port from `@t/logging-types` using `console.*` for output (no winston/Node transports), with
optional analytics bridging that forwards `warn`/`error`/`fatal` to a tracker via
`captureException`.

Sibling packages: [`@t/logging`](../logging/README.md) (server/browser, winston-backed),
[`@t/analytics-rn`](../analytics-rn) (RN analytics tracker that plugs into the bridge).

## Install

Workspace reference — already wired in the monorepo. In any RN app's `package.json`:

```json
{
  "dependencies": {
    "@t/logging-rn": "workspace:*"
  }
}
```

## Public API

| Export | Kind | Purpose |
| --- | --- | --- |
| `ConsoleLogger` | class | `Logger` impl backed by `console.{debug,info,warn,error}`; structured payload with `timestamp`, `level`, `message`, `context`, extra bindings. |
| `AnalyticsBridgedLogger` | class | Decorator around any `Logger`; forwards `warn`/`error`/`fatal` to `tracker.captureException(err, userId)` while preserving normal log output. |
| `createReactNativeLogger` | factory | Singleton factory returning a `ConsoleLogger`, optionally wrapped in `AnalyticsBridgedLogger` when `{ analytics }` is passed. |
| `getLogger` | factory | Returns the existing singleton, or creates a default one if none exists. |
| `registerLoggerRnDI` | DI registrar | Registers a singleton `Logger` under `dependencyKeys.global.LOGGER` in an Awilix container. |
| `LOGGER_DEPENDENCY_KEY` | const | Re-export of the DI key for convenience. |
| `DEFAULT_REDACT_PATHS`, `REDACTION_CENSOR`, `RedactConfig`, `buildRedactConfig`, `redactFormat` | redaction utils | Same redaction primitives as `@t/logging`, exposed for parity. |
| `errorSerializerFormat` | format util | Stack-trace-preserving error serializer. |

## Quick start

```ts
import { createReactNativeLogger } from "@t/logging-rn"

const logger = createReactNativeLogger()

logger.info({ message: "app launched", metadata: { version: "1.0.0" } })

try {
  await loadUser()
} catch (err) {
  logger.error({ message: "loadUser failed", err })
}
```

`createReactNativeLogger` returns a singleton — repeat calls hand back the same instance.

## Dependency injection

Registers `Logger` as a singleton under the shared global key (`dependencyKeys.global.LOGGER`):

```ts
import { createContainer } from "@t/dependency-injection"
import { registerLoggerRnDI, LOGGER_DEPENDENCY_KEY } from "@t/logging-rn"

const container = createContainer()
registerLoggerRnDI(container, {
  context: { requestId: "rn-global", userId: currentUserId },
})

const logger = container.resolve(LOGGER_DEPENDENCY_KEY)
```

The DI key matches the server-side `@t/logging` registrar, so consumers resolving `"logger"` work
unchanged on RN.

## Bridging analytics

Pass an `AnalyticsTracker` (from `@t/analytics-types`) to forward `warn`/`error`/`fatal` calls to
your tracker's `captureException` method. `debug` and `info` are NOT forwarded — they stay local to
the console output.

```ts
import { createAnalyticsTracker } from "@t/analytics-rn"
import { registerLoggerRnDI } from "@t/logging-rn"

const analytics = createAnalyticsTracker(/* ... */)

registerLoggerRnDI(container, {
  context: { requestId: "rn-global" },
  analytics,
})

// later:
const logger = container.resolve("logger")
logger.error({ message: "checkout failed", err: new Error("network down") })
// → console.error(...) AND analytics.captureException(err, userId ?? "anonymous")
```

If `tracker.captureException` is undefined the bridge silently no-ops, so the same code path works
for trackers that haven't wired exception capture yet.

`userId` defaults to `"anonymous"` when the logger context has no user bound.

## Child loggers

```ts
const reqLogger = logger.child({ metadata: { screen: "Checkout" } })
reqLogger.info({ message: "rendered" })
```

`child` preserves the analytics bridge — child loggers created from an `AnalyticsBridgedLogger`
continue to forward `warn`/`error`/`fatal` to the same tracker.

## Notes

- **No winston, no Node transports.** This package is RN-only; it deliberately avoids `winston` and
  any Node-specific transports so it bundles cleanly under Metro.
- **No PostHog OTLP transport.** Analytics integration is bridge-only — error events flow through
  your `AnalyticsTracker`, not via OTLP.
- **Singleton scope.** `createReactNativeLogger` keeps a module-level singleton;
  `registerLoggerRnDI` keeps a container-scoped singleton. Pick one entry point per app.
- **Redaction parity.** `DEFAULT_REDACT_PATHS` mirrors `@t/logging` so logs share the same
  secret-key vocabulary across platforms.

## More

- Sibling: [`@t/logging`](../logging/README.md) — server/browser logger with winston + OTLP.
- Port: [`@t/logging-types`](../logging-types) — shared `Logger`, `LogArg`, `LogContext`.
- Architecture spec:
  [`docs/architecture/platform/logging.md`](../../docs/architecture/platform/logging.md).
