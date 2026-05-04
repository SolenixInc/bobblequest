---
name: Logging
description: Winston-backed structured logger for the monorepo — Logger port, PII redaction, OTLP transport to PostHog, and Awilix DI registrars.
last_audited: 2026-04-26
---

# @t/logging

Structured JSON logger for the monorepo. Backed by winston v3. Ships a single abstract `Logger`
port, concrete winston implementations for global and request scopes, PII redaction, child-logger
context propagation, and Awilix DI registrars. The only remote transport is a PostHog OTLP-over-HTTP
sink, attached automatically when `POSTHOG_API_KEY` is present. Every app and every cross-module
producer (`@t/errors`, `@t/analytics`, `@t/billing`, `@t/ai`) depends on this single port.

> GCP Cloud Logging (severity mapping, `K_SERVICE` detection, trace field injection) was removed in
> the winston rewrite — it lived in an earlier Deno + Cloud Run era. Railway's native log drain
> ingests stdout directly, so Console is the primary sink. A pino swap was considered and explicitly
> rejected; winston stays.

---

## Module layout

```text
packages/logging/
  index.ts                         public barrel + factory helpers
  version.ts                       VERSION constant stamped into every log line
  entities/
    ports/
      Logger.ts                    abstract Logger (the port contract)
    types/
      LogContext.ts                 requestId, userId, fileName, metadata
      otlpConfig.ts                OTLPConfig interface (PostHog transport)
    enums/
      index.ts                     LogLevel, LogType
  infrastructure/
    winstonLogger.ts               WinstonLogger : Logger (base concrete impl)
    globalLogger.ts                GlobalLogger extends WinstonLogger
    requestLogger.ts               RequestLogger extends WinstonLogger
    redactors.ts                   DEFAULT_REDACT_PATHS, buildRedactConfig, redactFormat
    errorSerializer.ts             errorSerializerFormat (nested Error flattening)
    quietMode.ts                   isGlobalQuietMode, setGlobalQuietMode
    transports/
      otlpTransport.ts             OTLPWinstonTransport (PostHog OTLP-over-HTTP)
      transportFactory.ts          getOrCreateOTLPTransport (singleton, env-gated)
  dependency-injection/
    registerLoggerDI.ts            GlobalLogger singleton -> dependencyKeys.global.LOGGER
    registerLoggerFactoryDI.ts     createGlobalLogger factory -> dependencyKeys.global.LOGGER_FACTORY
  __tests__/
    childLogger.test.ts
    levelMethods.test.ts
    quietMode.test.ts
    errorSerialization.test.ts
    factoryBranches.test.ts
    legacyFactories.test.ts
    logShape.test.ts
    redaction.test.ts
    helpers/captureStdout.ts
```

---

## Call graph

```text
apps/*                                       route handlers, tRPC procedures, services
  |
  | container.resolve(dependencyKeys.global.LOGGER)
  | — or —
  | container.resolve(dependencyKeys.global.LOGGER_FACTORY)(fileName)
  v
GlobalLogger / RequestLogger
  (both extend WinstonLogger)
  |
  | winston.createLogger(formats, defaultMeta, transports)
  v
Transport pipeline
  +-- Console  (always present)
  |     NODE_ENV=production  -> JSON to stdout
  |     NODE_ENV!=production -> ANSI pretty-print to stdout
  |
  +-- OTLPWinstonTransport  (only when POSTHOG_API_KEY is set
        AND ENVIRONMENT !== "testing")
        -> BatchLogRecordProcessor
        -> OTLPLogExporter (HTTP)
        -> https://*.i.posthog.com/v1/logs
```

Format pipeline (applied before reaching any transport):

```text
redactFormat          masks PII keys recursively
  -> winston.format.timestamp()
  -> winston.format.errors({ stack: true })
  -> errorSerializerFormat()   flattens nested Error objects
  -> winston.format.json()     final serialisation (non-local Console + OTLP)
```

---

## Public API

All items exported from `packages/logging/index.ts`:

| Export | Kind | Description |
| --- | --- | --- |
| `createLogger(arg?)` | function | Alias of `createGlobalLogger`. Primary factory. |
| `createGlobalLogger(arg?)` | function | Returns a `GlobalLogger`. Accepts a filename string or options bag. |
| `createRequestLogger(context, options?)` | function | Returns a `RequestLogger` for per-request use. |
| `GlobalLogger` | class | `WinstonLogger` subclass used as `instanceof` discriminator. |
| `RequestLogger` | class | `WinstonLogger` subclass used as `instanceof` discriminator. |
| `WinstonLogger` | class | Base concrete implementation of `Logger`. |
| `WinstonLoggerOptions` | interface | `{ logType?, quiet?, redactExtraPaths? }` |
| `Logger` | abstract class | Port contract — all level methods + `child()`. |
| `LogPayload` | interface | `{ message?, metadata?, fileName?, err?, ...rest }` |
| `LogArg` | type | `string \| LogPayload` |
| `LogContext` | type | `{ requestId, userId?, fileName?, metadata? }` |
| `LogLevel` | enum | `DEBUG \| INFO \| WARNING \| ERROR \| CRITICAL` |
| `LogType` | enum | `TEXT \| JSON \| ERROR` |
| `OTLPConfig` | interface | OTLP transport config shape. |
| `registerLoggerDI` | function | Registers `GlobalLogger` singleton under `LOGGER` token. |
| `registerLoggerFactoryDI` | function | Registers `createGlobalLogger` factory under `LOGGER_FACTORY` token. |
| `LOGGER_DEPENDENCY_KEY` | const | Re-export of `dependencyKeys.global.LOGGER`. |
| `LoggerDIOptions` | interface | Options bag for `registerLoggerDI`. |
| `DEFAULT_REDACT_PATHS` | const | Default list of PII field names to redact. |
| `REDACTION_CENSOR` | const | The censor string: `"[REDACTED]"`. |
| `buildRedactConfig` | function | Merges extra paths with defaults; returns `RedactConfig`. |
| `redactFormat` | function | Winston format that recursively redacts matching keys. |
| `errorSerializerFormat` | function | Winston format that flattens nested `Error` instances. |
| `isGlobalQuietMode` | function | Returns the current global quiet flag. |
| `setGlobalQuietMode` | function | Sets the process-wide quiet flag (call once at startup). |
| `getOrCreateOTLPTransport` | function | Singleton factory for the OTLP transport. |
| `resetOTLPTransportForTests` | function | Resets the singleton (test-only). |
| `VERSION` | const | Package version string stamped into every log record. |

---

## Log-line shape

### Production (`NODE_ENV=production`) — structured JSON per line

```json
{
  "timestamp": "2026-04-24T14:03:11.221Z",
  "level": "info",
  "message": "user signed in",
  "service": "core-api",
  "environment": "production",
  "version": "0.0.0",
  "requestId": "req_abc123",
  "userId": "user_7k2",
  "fileName": "apps/api/src/routers/auth.ts",
  "password": "[REDACTED]"
}
```

`service`, `environment`, and `version` are `defaultMeta` injected by `winston.createLogger` — they
appear in every record without any call-site action.

`fatal` calls emit at wire-level `error` and add `"severity": "fatal"` to the JSON so downstream
aggregators (PostHog, log drains) can distinguish fatals from plain errors. Winston's internal
`Object.assign` would clobber a `level` key, so `severity` is used instead.

### Non-production — ANSI pretty-print

```text
HH:MM:SS.mmm [INFO]: [requestId] [userId|system] [fileName] <message>
{
  "requestId": "global",
  "fileName": "apps/api/src/server.ts",
  ...metadata...
}
```

`service`, `environment`, and `version` are stripped from the pretty-print to reduce noise. Metadata
appears as indented JSON below the header line, suppressed entirely when `quiet: true`.

---

## Redaction

`redactFormat` runs as the first format in the pipeline — before `timestamp`, `errors`, and `json` —
so it applies uniformly to every transport (Console and OTLP).

It walks the entire winston info object recursively. Any key whose name appears in the redact path
set is replaced with `"[REDACTED]"`. `Error` instances are passed through unchanged (they are
handled by `errorSerializerFormat` downstream); Symbol-keyed properties (winston's internal `LEVEL`,
`SPLAT`, `MESSAGE` from `triple-beam`) are copied verbatim.

### Default redacted paths

```text
password, passwd
token, accessToken, refreshToken
apiKey, api_key
secret
authorization, Authorization
cookie, Cookie, set-cookie
email
```

### Extending

```ts
// Per-instance
new WinstonLogger(ctx, { redactExtraPaths: ["ssn", "dob"] })

// Via DI registration
registerLoggerDI(container, { redactExtraPaths: ["ssn", "dob"] })
```

`buildRedactConfig(extraPaths)` deduplicates before building the path set, so repeating a default
path is harmless.

---

## Child / request loggers

`logger.child(bindings)` returns a new instance of the same concrete class (`GlobalLogger` stays
`GlobalLogger`, `RequestLogger` stays `RequestLogger`) with merged context. The parent's
`WinstonLoggerOptions` (including `redactExtraPaths` and `quiet`) are inherited.

```ts
import { createGlobalLogger, createRequestLogger } from "@t/logging"

// App bootstrap — global, long-lived
const logger = createGlobalLogger("apps/api/src/server.ts")

// Per-request — Hono middleware, tRPC context factory, etc.
const reqLogger = createRequestLogger({
  requestId: ctx.requestId,
  userId: ctx.userId,
  fileName: "apps/api/src/routers/auth.ts",
})

// Narrow further — inherit request context, add subsystem tag
const dbLogger = reqLogger.child({ metadata: { subsystem: "db" } })
dbLogger.info({ message: "query executed", metadata: { ms: 12 } })
```

`GlobalLogger` and `RequestLogger` carry no extra behavior — they exist solely as `instanceof`
discriminators. `packages/errors/delivery/utils/logErrorAtAppropriateLevel.ts` branches on
`instanceof RequestLogger` to decide which log level to use for a given error context.

---

## DI integration

`@t/logging` ships two Awilix registrars. Both are designed to be called from
`apps/api/src/composition.ts` (or any app's `buildContainer()`). See
`docs/architecture/platform/dependency-injection.md` for the full composition-root wiring order.

### Primary registrar — use in new code

```ts
import { registerLoggerDI } from "@t/logging"
import { createContainer } from "@t/dependency-injection"

const container = createContainer()
registerLoggerDI(container, {
  context: { requestId: "global", fileName: "apps/api/src/server.ts" },
  redactExtraPaths: ["ssn"],
  quiet: false,
})

const logger = container.resolve("logger")  // resolves GlobalLogger singleton
```

Registers a `GlobalLogger` singleton under `dependencyKeys.global.LOGGER` (`"logger"`). The key is
re-exported as `LOGGER_DEPENDENCY_KEY` for call sites that need a typed constant.

### Legacy factory registrar — preserved for existing call sites

```ts
import { registerLoggerFactoryDI } from "@t/logging"
import { dependencyKeys } from "@t/dependency-injection"

registerLoggerFactoryDI(container)
const factory = container.resolve(dependencyKeys.global.LOGGER_FACTORY)
const logger = factory("apps/api/src/routers/auth.ts")  // returns GlobalLogger
```

Registers the `createGlobalLogger` factory function itself under
`dependencyKeys.global.LOGGER_FACTORY`. Prefer `registerLoggerDI` in new code;
`registerLoggerFactoryDI` exists so legacy `@t/analytics` and `@t/errors` call sites keep working
unchanged.

---

## Config integration

`@t/config` exports `LoggingConfigSchema` with the following fields:

| Field | Env var(s) | Default | Description |
| --- | --- | --- | --- |
| `level` | `LOG_LEVEL` | `"info"` | Minimum level emitted (`trace\|debug\|info\|warn\|error\|fatal`) |
| `serviceName` | `LOG_SERVICE_NAME` | `"app"` | Stamped as `service` in every record |
| `environment` | `ENVIRONMENT` / `NODE_ENV` | `"development"` | Stamped as `environment`; drives console format selection |
| `destination` | `LOG_DESTINATION` | `"stdout"` | `"stdout"` or `"stderr"` (reserved for future routing) |
| `redactExtraPaths` | `LOG_REDACT_EXTRA` | `undefined` | Extra keys to redact, merged with defaults |

The winston impl reads `LOG_LEVEL`, `SERVICE_NAME`, and `ENVIRONMENT` env vars **directly** for
drop-in compatibility when `@t/config` is not wired (e.g., standalone scripts). When `@t/config` IS
present in the composition root, pass `loggingConfig.level` / `loggingConfig.serviceName` into
`registerLoggerDI`'s options bag.

> Note: `LoggingConfigSchema`'s source comment describes the namespace as "winston-based" — matching
> the shipped impl. The schema itself is transport-agnostic; the winston impl reads from the same
> env vars the schema describes.

---

## Transport pipeline

| Transport | When attached | Format applied by transport | Notes |
| --- | --- | --- | --- |
| Console (JSON) | Always, when `NODE_ENV=production` | `timestamp + errors + errorSerializer + json` | Primary drain; Railway log drain picks up stdout |
| Console (pretty) | Always, when `NODE_ENV !== "production"` | Custom ANSI `printf` | Strips `service`/`environment`/`version`; metadata indented below |
| PostHog OTLP | `POSTHOG_API_KEY` set AND `ENVIRONMENT !== "testing"` | OTLP-over-HTTP via `OTLPLogExporter` | Batched via `BatchLogRecordProcessor`; singleton across all loggers |

**OTLP singleton:** `getOrCreateOTLPTransport()` is called once per process. Constructing multiple
`OTLPWinstonTransport` instances would leak `BatchLogRecordProcessor` timers and saturate PostHog
with overlapping batch intervals — hence the singleton pattern.

**Circuit breaker:** `OTLPWinstonTransport` includes a three-state circuit breaker (CLOSED / OPEN /
HALF_OPEN). After 5 consecutive export failures, the circuit opens and OTLP exports are silently
skipped for 30 seconds, then the transport enters HALF_OPEN to test recovery. This prevents PostHog
unavailability from impacting application logging.

**OTLP env vars** (all optional, sensible defaults):

| Env var | Default | Description |
| --- | --- | --- |
| `POSTHOG_HOST` | `https://us.i.posthog.com` | PostHog ingest host |
| `POSTHOG_OTLP_ENDPOINT` | `${POSTHOG_HOST}/v1/logs` | Full OTLP endpoint URL |
| `POSTHOG_OTLP_MAX_QUEUE_SIZE` | `2048` | Max buffered records before forced drop |
| `POSTHOG_OTLP_BATCH_SIZE` | `512` | Max records per export call |
| `POSTHOG_OTLP_EXPORT_INTERVAL_MS` | `5000` | Delay between scheduled batch exports |
| `POSTHOG_OTLP_EXPORT_TIMEOUT_MS` | `30000` | Per-export HTTP timeout (capped internally at 3 s for shutdown safety) |

---

## Testing

Tests use `NODE_ENV=production` so every log line is structured JSON captured via a
`process.stdout.write` spy. Set `ENVIRONMENT=testing` (or leave `POSTHOG_API_KEY` unset) to keep the
OTLP transport detached and avoid vitest timer-leak warnings.

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createGlobalLogger } from "@t/logging"

describe("redaction", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    process.env.NODE_ENV = "production"
    process.env.ENVIRONMENT = "testing"  // disables OTLP transport
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
  })

  afterEach(() => {
    writeSpy.mockRestore()
  })

  it("redacts password field", () => {
    const logger = createGlobalLogger("test.ts")
    logger.info({ message: "login attempt", metadata: { password: "hunter2" } })

    const line = JSON.parse(writeSpy.mock.calls.at(-1)![0] as string)
    expect(line.password).toBe("[REDACTED]")
  })
})
```

For tests that need to inspect or reset the OTLP singleton, import `resetOTLPTransportForTests` from
`@t/logging`.

The `quiet: true` option suppresses metadata in the ANSI pretty-printer but does not affect JSON
output — safe to use in test helpers where console noise is unwanted.

---

## Open items

- `destination` field in `LoggingConfigSchema` (`"stdout"` / `"stderr"`) is declared but not yet
  wired into `WinstonLogger` — the transport currently always writes to stdout. Future work: pass
  `destination` from the config options bag into the Console transport constructor.

---

## References

- `packages/logging/index.ts` — public barrel + factory helpers
- `packages/logging/infrastructure/winstonLogger.ts` — base concrete impl
- `packages/logging/infrastructure/globalLogger.ts` — GlobalLogger discriminator class
- `packages/logging/infrastructure/requestLogger.ts` — RequestLogger discriminator class
- `packages/logging/infrastructure/redactors.ts` — redaction format and default paths
- `packages/logging/infrastructure/errorSerializer.ts` — nested Error flattening format
- `packages/logging/infrastructure/transports/otlpTransport.ts` — PostHog OTLP transport + circuit
  breaker
- `packages/logging/infrastructure/transports/transportFactory.ts` — OTLP singleton factory
- `packages/logging/dependency-injection/registerLoggerDI.ts`
- `packages/logging/dependency-injection/registerLoggerFactoryDI.ts`
- `packages/config/entities/schemas/LoggingConfigSchema.ts` — config schema (transport-agnostic; env
  vars listed above)
- `docs/architecture/platform/dependency-injection.md` — DI wiring order and token registry
- `docs/architecture/platform/config.md` — Config module architecture
