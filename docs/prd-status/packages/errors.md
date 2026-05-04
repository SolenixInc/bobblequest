---
name: errors bootstrap status
last_audited: 2026-04-26
maintainer_contract: any agent editing packages/errors/** or apps/*/error handling wiring MUST update this file and docs/prd-status/matrix.md
---

# @t/errors — bootstrap status

**Package status:** ✅ completed

Phase 1 (package.json + tsconfig + vitest config + README + tests + alias rewrite) is fully landed
and self-contained. `errorHandler` is mounted in `apps/api` (2026-04-26) and the delivery layer now
reads `requestId`, `logger`, and `analytics` from the Hono context — wired by the new `apps/api`
request-context middleware. 139/139 tests pass at 100% coverage.

## Intended

- Typed error classes rooted in abstract `AppError` port
- HTTP 4xx/5xx error class catalog (client + server categories)
- Application-layer response transformers (AppError → JSON, unknown → sanitized JSON)
- Delivery-layer Hono `errorHandler` middleware
- Zod `ZodError` → `ValidationError` conversion utility
- Structured error metadata builder + status-code determination + log-level mapping for
  observability
- Consumer wiring via `app.onError(errorHandler)` in `apps/api`

## Actual

- `entities/ports/AppError.ts` — abstract class: `message`, `responseMessage`, `fileName?`,
  `metadata?`; abstract getters for `name`, `status`, `details`; constructor with `{ cause,
  fileName, metadata }` opts
- `entities/schemas/AppErrorOptions.ts`, `entities/schemas/UnknownError.ts` — shape types
  (name/status/message/stack/details/requestId)
- `entities/index.ts`, `entities/ports/index.ts` — barrels
- `infrastructure/4xx/` — `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`,
  `ConflictError`, `GoneError`, `MethodNotFoundError`, `PreconditionFailedError`,
  `RequestTimeoutError`, `TooManyRequestsError`, `UnprocessableEntityError`,
  `UnsupportedMediaTypeError`, `ValidationError` (+ barrel)
- `infrastructure/5xx/` — `InternalServerError`, `NotImplementedError`, `BadGatewayError`,
  `ServiceUnavailableError`, `GatewayTimeoutError`, `ExternalStorageTimeoutError`,
  `InsufficientStorageError`, `NetworkAuthenticationRequiredError` (+ barrel)
- `infrastructure/index.ts` — re-exports 4xx + 5xx
- `applications/toAppErrorResponse.ts` — AppError → response object (strips stack in `production`,
  includes `cause` when present, `requestId` passthrough; `staging` branch removed 2026-04-26)
- `applications/toUnknownErrorResponse.ts` — unknown → `UnknownError` (HTML tag stripper, 500-char
  truncation, production stack omission)
- `applications/index.ts` — barrel
- `delivery/errorHandler.ts` — Hono `ErrorHandler`: ZodError → ValidationError,
  `determineStatusCode`, metadata build, log at level, JSON response. Reads `requestId` / `logger` /
  `analytics` from Hono context (`c.get(...)`); each is OPTIONAL with graceful fallback (full
  rewrite 2026-04-26)
- `delivery/hono.d.ts` — NEW (2026-04-26): augments Hono `ContextVariableMap` with `requestId?:
  string`, `logger?: Logger`, `analytics?: AnalyticsTracker | RequestAnalyticsTracker`
- `delivery/utils/buildErrorMetadata.ts` — enriches with
  errorCategory/route/method/userId/requestId; unwraps ValidationError `cause.validationErrors`
- `delivery/utils/convertZodErrorToValidationError.ts` — flattens Zod issues into message +
  `cause.validationErrors`
- `delivery/utils/determineStatusCode.ts` — AppError.status > `error.statusCode` > 500
- `delivery/utils/extractValidationErrors.ts` — `[{ path, message }]` from `ZodError.issues`
- `delivery/utils/getErrorCategory.ts` — validation_zod / authentication / not_found / client_error
  / server_error / unknown
- `delivery/utils/getLogLevel.ts` — 401/404 warning, 4xx info, 5xx error
- `delivery/utils/hasStatusCode.ts` — type guard for `ErrorWithStatusCode`
- `delivery/utils/logErrorAtAppropriateLevel.ts` — routes log through `RequestLogger` if present
  else fallback `createGlobalLogger`
- `delivery/types/ErrorWithStatusCode.ts` — external-lib error shape (SDKs that throw objects
  carrying a `statusCode` field)
- `delivery/index.ts` — re-exports `{ errorHandler }` only (utils not exported)
- `index.ts` — top-level barrel re-exports entities + infrastructure + applications + delivery

## Consumer hooks

- `errorHandler: ErrorHandler` — mount with `app.onError(errorHandler)` in Hono apps
- `toAppErrorResponse(error, requestId?, environment?)` — AppError → JSON payload
- `toUnknownErrorResponse(err, requestId?, environment?)` — anything → sanitized JSON payload
- `convertZodErrorToValidationError(zodError)` — ZodError → `ValidationError` (exported only via
  delivery/utils path, NOT re-exported from `delivery/index.ts` — callers must deep-import)
- Error classes directly instantiable: `new BadRequestError(message, responseMessage, opt?)`, `new
  ValidationError(...)` etc.
- `AppError` — abstract base for app-owned error types
- No DI registrar — stateless module

## Gaps vs docs

### Resolved 2026-04-25

- ~~No `packages/errors/package.json`~~ — `package.json` now declared (name `@t/errors`, deps `hono` / `zod` / `@t/logging`, `exports` field, scripts `check | typecheck | format | test | test:watch`).
- ~~No `tsconfig.json`~~ — present.
- ~~No `vitest.config.ts`~~ — present.
- ~~No `README.md`~~ — present.
- ~~No tests~~ — `__tests__/` directory shipped with ~6 Vitest specs covering the public surface.
- ~~Broken `@/errors` and `@/entities/errors` aliases~~ — rewritten to relative imports across the 7
  affected source files; package now typechecks cleanly.
- ~~No `docs/architecture/platform/errors.md`~~ — file already exists and is accurate (this gap was
  stale in the prior audit).

### Resolved 2026-04-26

- ~~No composition-root wiring: `apps/api` does not yet call `app.onError(errorHandler)`.~~ **Done
  2026-04-26** — `apps/api/src/index.ts` mounts `app.onError(errorHandler)`. `@t/errors` is now a
  declared dep in `apps/api/package.json`.
- ~~Analytics exception capture is a TODO (errorHandler.ts) — requires `@t/analytics` integration in
  the consumer.~~ **Done 2026-04-26** — `errorHandler` now resolves `analytics` from
  `c.get('analytics')` and calls `analytics.captureException(error, context?)` via the new
  `RequestAnalyticsTracker.captureException(error, context?)` overload
  (`packages/analytics/src/infrastructure/RequestAnalyticsTrackerImpl.ts:54-69`). Auto-fills
  distinctId from the scoped user (falling back to sessionId/requestId). Producer-side (apps/api)
  wires the request-scoped tracker via `apps/api/src/middleware/request-context.ts`.
- ~~Request logger + requestId wiring is stubbed to fallback logger + undefined — depends on per-app
  request middleware (DI scope reaching the delivery layer).~~ **Done 2026-04-26** — `errorHandler`
  now reads both from Hono context (`c.get('requestId')`, `c.get('logger')`); falls back to
  `createGlobalLogger()` and undefined when absent. Producer-side:
  `apps/api/src/middleware/request-context.ts` generates `requestId` via `crypto.randomUUID()`,
  builds a child logger via `createGlobalLogger({ requestId, metadata: { method, path } })`, and
  registers all three on Hono context. Echoes `X-Request-ID` header.

## Consumer context-key contract

The `errorHandler` reads three OPTIONAL keys off the Hono context (typed via `delivery/hono.d.ts`):

| Key          | Producer (in apps/api)                                  | Fallback when absent                                   |
| --- | --- | --- |
| `requestId`  | `request-context.ts` — `crypto.randomUUID()`            | `undefined` — metadata simply omits the field         |
| `logger`     | `request-context.ts` — `createGlobalLogger({ requestId, metadata })` child logger | `createGlobalLogger()` global logger                  |
| `analytics`  | `request-context.ts` — `container.createScope()` request-scoped `RequestAnalyticsTracker` | No-op — `captureException` is simply not invoked      |

Consumers without the request-context middleware degrade gracefully — the package never throws on
missing keys. See `packages/errors/README.md` section "Consumer integration (Hono)" for the full
integration example.

Cross-reference apps/api evidence:

- `C:\Users\jager\OneDrive\Documents\GitHub\template-repo\apps\api\src\middleware\request-context.ts`
  — the producer middleware
- `C:\Users\jager\OneDrive\Documents\GitHub\template-repo\apps\api\src\index.ts` (mount order:
  `onError` → CORS → `request-context` → `/health` → webhooks → `clerkAuth(/trpc/*)` → tRPC)
- `C:\Users\jager\OneDrive\Documents\GitHub\template-repo\apps\api\src\lifecycle.ts` —
  `installProcessHandlers(container)` registers `process.on('unhandledRejection' |
  'uncaughtException')` and uses the global `AnalyticsTracker.captureException(error, 'system', {
  source })` (process-level events have no user context, so the explicit `'system'` distinctId is
  intentional).

Cross-reference @t/analytics:

- New overload `RequestAnalyticsTracker.captureException(error, context?)` — see
  `C:\Users\jager\OneDrive\Documents\GitHub\template-repo\packages\analytics\src\entities\ports\RequestAnalyticsTracker.ts`
  and `RequestAnalyticsTrackerImpl.ts:54-69`. The 3-arg `AnalyticsTracker.captureException(error,
  distinctId, props?)` signature on the non-request-scoped tracker is preserved by design.

## Notes for next agent

- Package is now installable, typechecks, fully tested in isolation (139/139 at 100% coverage), AND
  fully wired in apps/api (errorHandler + request-context middleware + lifecycle handlers). All
  previously-open consumer-side TODOs closed 2026-04-26.
- Any change under `packages/errors/**` → update this file's `last_audited` + sections, and
  `docs/prd-status/matrix.md` when it lands.
