# `@t/logging`

Structured JSON logger for the monorepo, backed by winston v3. Ships a single `Logger` port, PII
redaction, child-logger context, Awilix DI registrars, and a PostHog OTLP transport that attaches
only when configured.

Architecture spec:
[`docs/architecture/platform/logging.md`](../../docs/architecture/platform/logging.md).

## Install

Workspace reference â€” already wired in the monorepo. In any `package.json` that needs it:

```json
{
  "dependencies": {
    "@t/logging": "workspace:*"
  }
}
```

## Quick start

```ts
import { createGlobalLogger } from "@t/logging"

const logger = createGlobalLogger("apps/api/src/server.ts")

logger.info({ message: "server up", metadata: { port: 3000 } })

// redaction is on by default for the usual suspects
logger.info({
  message: "login attempt",
  metadata: { email: "a@b.com", password: "hunter2" },
})
// -> { ..., "email": "[REDACTED]", "password": "[REDACTED]" }
```

## Dependency injection

Primary â€” registers a `GlobalLogger` singleton under the container key `"logger"`:

```ts
import { registerLoggerDI } from "@t/logging"
import { createContainer } from "@t/dependency-injection"

const container = createContainer()
registerLoggerDI(container, {
  context: { requestId: "global", fileName: "apps/api/src/server.ts" },
  redactExtraPaths: ["ssn", "dob"],
})

const logger = container.resolve("logger")
```

Legacy factory â€” kept for pre-existing call sites in `@t/errors` and `@t/analytics`:

```ts
import { registerLoggerFactoryDI } from "@t/logging"
import { dependencyKeys } from "@t/dependency-injection"

registerLoggerFactoryDI(container)
const factory = container.resolve(dependencyKeys.global.LOGGER_FACTORY)
const logger = factory("apps/api/src/routers/auth.ts")
```

Prefer `registerLoggerDI` in new code.

## Child / request loggers

```ts
import { createRequestLogger } from "@t/logging"

const reqLogger = createRequestLogger({
  requestId: ctx.requestId,
  userId: ctx.userId,
  fileName: "apps/api/src/routers/auth.ts",
})

const dbLogger = reqLogger.child({ metadata: { subsystem: "db" } })
dbLogger.info({ message: "query", metadata: { ms: 12 } })
```

`createRequestLogger` returns a `RequestLogger` instance; `createGlobalLogger` returns a
`GlobalLogger`. Both are winston-backed `Logger` subclasses â€” downstream code branches on
`instanceof` to discriminate request-scoped vs app-scoped loggers.

## Error logging

```ts
try {
  await doWork()
} catch (err) {
  logger.error({ message: "doWork failed", err, metadata: { userId } })
}
```

Winston's `errors({ stack: true })` format is preconfigured, so a thrown `Error` in `err` is
serialized with its stack trace in the JSON output.

## Redaction defaults

Any key matching (at any nesting depth):

- `password`, `passwd`
- `token`, `accessToken`, `refreshToken`
- `apiKey`, `api_key`
- `secret`
- `authorization`, `Authorization`
- `cookie`, `Cookie`, `set-cookie`
- `email`

is replaced with `[REDACTED]`.

## Extending redaction

```ts
// per-instance
import { WinstonLogger } from "@t/logging"
new WinstonLogger(ctx, { redactExtraPaths: ["ssn", "dob"] })

// at DI registration
registerLoggerDI(container, { redactExtraPaths: ["ssn", "dob"] })
```

Redaction applies to every attached transport (Console and OTLP).

## Transports

- **Console** â€” always attached. JSON when `NODE_ENV=production`; ANSI-pretty otherwise.
- **PostHog OTLP** â€” attached only when `POSTHOG_API_KEY` is set and `ENVIRONMENT !== "testing"`.
  Process-wide singleton.

GCP Cloud Logging is not supported and was removed in this rewrite.

## Testing

Tests use a `process.stdout.write` spy under `NODE_ENV=production` so each line is a JSON record:

```ts
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { createGlobalLogger } from "@t/logging"

let writeSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  process.env.NODE_ENV = "production"
  writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
})
afterEach(() => writeSpy.mockRestore())

test("redacts password", () => {
  createGlobalLogger("t.ts").info({ message: "hi", metadata: { password: "x" } })
  const line = JSON.parse(writeSpy.mock.calls.at(-1)![0] as string)
  expect(line.password).toBe("[REDACTED]")
})
```

Run the package's test suite with Vitest:

```sh
bun run --filter @t/logging test
```

## More

Full architecture doc, port signature, DI shape, transport pipeline, and backward-compat matrix:
[`docs/architecture/platform/logging.md`](../../docs/architecture/platform/logging.md).
