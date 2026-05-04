# @t/errors

Typed HTTP error hierarchy + Hono error handler middleware for the monorepo.

## Install

Already a workspace package — reference it in any app or package:

```json
"dependencies": {
  "@t/errors": "workspace:*"
}
```

## Public surface

| Export | Kind | Description |
| --- | --- | --- |
| `AppError` | abstract class | Base for all typed errors |
| `AppErrorOptions` | type | Shape of AppError options |
| `UnknownError` | type | Shape of the unknown-error response object |
| `BadRequestError` | class | 400 |
| `UnauthorizedError` | class | 401 |
| `ForbiddenError` | class | 403 |
| `NotFoundError` | class | 404 |
| `MethodNotFoundError` | class | 405 |
| `RequestTimeoutError` | class | 408 |
| `ConflictError` | class | 409 |
| `GoneError` | class | 410 |
| `PreconditionFailedError` | class | 412 |
| `UnsupportedMediaTypeError` | class | 415 |
| `UnprocessableEntityError` | class | 422 |
| `TooManyRequestsError` | class | 429 |
| `ValidationError` | class | 400 — Zod schema failures |
| `InternalServerError` | class | 500 |
| `NotImplementedError` | class | 501 |
| `BadGatewayError` | class | 502 |
| `ServiceUnavailableError` | class | 503 |
| `GatewayTimeoutError` | class | 504 |
| `ExternalStorageTimeoutError` | class | 504 |
| `InsufficientStorageError` | class | 507 |
| `NetworkAuthenticationRequiredError` | class | 511 |
| `toAppErrorResponse` | function | Serialize AppError → response object |
| `toUnknownErrorResponse` | function | Serialize unknown error → response object |
| `errorHandler` | Hono ErrorHandler | Mount on `app.onError` |
| `ErrorWithStatusCode` | interface | Type guard target for external SDK errors |
| `buildErrorMetadata` | function | Build structured log metadata from error + context |
| `convertZodErrorToValidationError` | function | ZodError → ValidationError |
| `determineStatusCode` | function | Extract HTTP status from any error |
| `extractValidationErrors` | function | ZodError → `{path, message}[]` |
| `getErrorCategory` | function | Classify error for observability |
| `getLogLevel` | function | Map status code to log level |
| `hasStatusCode` | function | Type guard for `statusCode` property |
| `logErrorAtAppropriateLevel` | function | Log at warning/info/error based on status |

## Usage

### Throwing a typed error

```typescript
import { NotFoundError, ValidationError } from '@t/errors'

// In a route handler
throw new NotFoundError(
  'User 123 not found in database',  // developer message
  'The requested user does not exist.' // user-facing message
)

// With cause chain
throw new NotFoundError('Record missing', 'Not found.', { cause: dbError })
```

### Mounting the error handler on Hono

```typescript
import { Hono } from 'hono'
import { errorHandler } from '@t/errors'

const app = new Hono()
app.onError(errorHandler)

// ZodErrors thrown in handlers are automatically converted to ValidationError (400).
// AppError subclasses return their own status code + structured JSON.
// Unknown errors return 500 with a sanitized message.
```

### Response shape (AppError)

```json
{
  "success": false,
  "name": "Not Found",
  "status": 404,
  "message": "User 123 not found",
  "details": "Resource doesn't exist.",
  "responseMessage": "The requested user does not exist.",
  "requestId": "req-abc123"
}
```

## Consumer integration (Hono)

`errorHandler` reads optional request-scoped dependencies from Hono context variables. All keys are
optional — if absent the handler falls back to `createGlobalLogger` and skips analytics.

### Context variable contract

| Key | Type | Behavior when absent |
| --- | --- | --- |
| `requestId` | `string` | Response body omits the field; logs omit it |
| `logger` | `RequestLogger \| Logger` | Falls back to `createGlobalLogger(fileName)` |
| `analytics` | `{ captureException(err, ctx?): void }` | Exception capture is skipped |

### Type augmentation

Import `@t/errors/delivery/hono` once in your app entry point to get typed `c.get` / `c.set` calls
for these keys:

```ts
import '@t/errors/delivery/hono'
```

### Minimal middleware example

```ts
import { Hono } from 'hono'
import { errorHandler } from '@t/errors'
import '@t/errors/delivery/hono'

const app = new Hono()

// Inject request-scoped deps before routes run
app.use(async (c, next) => {
  c.set('requestId', crypto.randomUUID())
  c.set('logger', requestLoggerFromDI)    // RequestLogger or Logger instance
  c.set('analytics', analyticsFromDI)     // any object with captureException()
  await next()
})

// Mount error handler — reads the vars set above
app.onError(errorHandler)
```

### Analytics adapter note

`@t/analytics` `AnalyticsTracker.captureException` requires a `distinctId` argument:
`captureException(error, distinctId, properties?)`. The `errorHandler` cannot know
the per-user distinct ID at the error-handling layer, so it uses the simpler structural
type `{ captureException(err: unknown, ctx?: Record<string, unknown>): void }`.

To bridge the gap, wrap your `AnalyticsTracker` in a thin adapter before passing it to context:

```ts
import type { ErrorHandlerAnalytics } from '@t/errors/delivery/errorHandler'

function makeErrorAnalytics(tracker: AnalyticsTracker, distinctId: string): ErrorHandlerAnalytics {
  return {
    captureException(error, ctx) {
      tracker.captureException(error as Error, distinctId, ctx)
    },
  }
}

// In middleware:
c.set('analytics', makeErrorAnalytics(tracker, userId ?? 'anonymous'))
```
