import { RequestLogger, createGlobalLogger } from '@t/logging'
import type { Logger } from '@t/logging'
import type { Context } from 'hono'
import type { ErrorHandler } from 'hono/types'
import { ZodError } from 'zod'
import { toAppErrorResponse } from '../applications/toAppErrorResponse.ts'
import { toUnknownErrorResponse } from '../applications/toUnknownErrorResponse.ts'
import { AppError } from '../entities/ports/AppError.ts'
import { buildErrorMetadata } from './utils/buildErrorMetadata.ts'
import { convertZodErrorToValidationError } from './utils/convertZodErrorToValidationError.ts'
import { determineStatusCode } from './utils/determineStatusCode.ts'
import { logErrorAtAppropriateLevel } from './utils/logErrorAtAppropriateLevel.ts'

/* v8 ignore next — import.meta.filename is always set in Node/vitest; fallback is unreachable in tests */
const fileName = import.meta.filename ?? 'errorHandler.ts'

/**
 * Minimal structural type for analytics exception capture.
 *
 * We deliberately do NOT import `@t/analytics` here to avoid a circular
 * dependency between `@t/errors` and the analytics package.
 *
 * NOTE: `@t/analytics` AnalyticsTracker.captureException has the signature
 *   captureException(error: Error, distinctId: string, properties?: Record<string, unknown>): void
 * which requires a distinctId. The errorHandler does not have access to a
 * per-user distinctId; it uses a plain { captureException(err, ctx) } shape
 * that request-scoped analytics wrappers can satisfy. See the DRIFT section
 * in README.md for the recommended adapter pattern.
 */
export type ErrorHandlerAnalytics = {
  captureException(error: unknown, context?: Record<string, unknown>): void
}

/**
 * Hono context variables consumed by errorHandler (all optional).
 * Consumers inject these via middleware with `c.set(key, value)`.
 *
 * @see README.md "Consumer integration (Hono)" section
 */
export type ErrorHandlerContextVars = {
  requestId?: string
  logger?: RequestLogger | Logger
  analytics?: ErrorHandlerAnalytics
  /** Runtime environment string (e.g. 'production', 'development', 'testing').
   * When present, stack traces are omitted in production responses.
   * Set this from your ConfigRepository — no process.env reads are performed. */
  environment?: string
}

/**
 * Error handler for Hono's app.onError.
 *
 * This handler catches all unhandled errors thrown in the application and
 * converts them into appropriate HTTP responses. It handles both known
 * AppError instances and unknown errors, providing consistent error formatting
 * and logging.
 *
 * Request-scoped dependencies are read from Hono context variables:
 * - `requestId`: passed through to response body and logs
 * - `logger`: used for structured logging; falls back to createGlobalLogger
 * - `analytics`: if present, captureException is called for 5xx errors
 *
 * @param error - The error that was thrown (Error or AppError instance)
 * @param c - Hono context object containing request/response information
 * @returns JSON response with error details and appropriate HTTP status code
 *
 * @example
 * ```typescript
 * import { errorHandler } from '@t/errors'
 *
 * const app = new Hono()
 * app.onError(errorHandler)
 * ```
 *
 * @remarks
 * - For `AppError` instances: Returns the error's status code and formatted response
 * - For unknown errors: Returns 500 status with generic error response (with HTML sanitization)
 * - All errors are logged using the request logger from context (or global logger fallback)
 *
 * **GCS Error Handling:**
 * Google Cloud Storage errors are handled at two levels:
 * 1. **Primary**: GcpStorageClientImpl wraps GCS errors with appropriate AppError types
 *    - 408/504 timeouts → ExternalStorageTimeoutError (504)
 *    - Other 5xx errors → BadGatewayError (502)
 * 2. **Fallback**: This handler sanitizes HTML from any unknown errors that slip through
 *    - HTML error pages from GCS are stripped before being sent to clients
 *    - Error messages are limited to 500 characters to prevent large responses
 *
 * This defense-in-depth approach ensures that external service errors are properly
 * classified and that HTML content never leaks to API clients.
 */
export const errorHandler: ErrorHandler = (error: Error, c: Context) => {
  const fallbackLogger = createGlobalLogger(fileName)
  const userId = c.var.userId ?? 'unknown-user-id'

  // Read request-scoped dependencies from Hono context variables.
  // All are optional — fall back to global behavior when absent.
  const requestId: string | undefined = c.get('requestId' as never) as string | undefined
  const contextLogger = c.get('logger' as never) as (RequestLogger | Logger) | undefined
  const analytics = c.get('analytics' as never) as ErrorHandlerAnalytics | undefined
  const environment = c.get('environment' as never) as string | undefined

  const logger: RequestLogger | ReturnType<typeof createGlobalLogger> =
    contextLogger instanceof RequestLogger
      ? contextLogger
      : contextLogger !== undefined
        ? // Logger abstract class instance — wrap as fallback logger shape
          (contextLogger as unknown as ReturnType<typeof createGlobalLogger>)
        : fallbackLogger

  // Convert ZodError to ValidationError before processing
  const processedError = error instanceof ZodError ? convertZodErrorToValidationError(error) : error

  // Determine status code for the error
  const statusCode = determineStatusCode(processedError)

  // Capture exceptions to analytics for 5xx errors
  if (analytics !== undefined && statusCode >= 500) {
    analytics.captureException(processedError, {
      requestId,
      statusCode,
      fileName,
      userId,
    })
  }

  // Build enriched metadata
  const baseMetadata = buildErrorMetadata(processedError, statusCode, c, userId, requestId)

  if (processedError instanceof AppError) {
    const response = toAppErrorResponse(processedError, requestId, environment)
    const payload = {
      message: `AppError Response: ${JSON.stringify(response)}`,
      metadata: baseMetadata,
    }

    // Log at appropriate level based on status code
    logErrorAtAppropriateLevel(logger, statusCode, payload, fileName)

    return c.json(response, processedError.status)
  }
  const response = toUnknownErrorResponse(processedError, requestId, environment)
  const payload = {
    message: `Unknown Error Response: ${JSON.stringify(response)}`,
    metadata: baseMetadata,
  }

  // Unknown errors are logged with the determined status code
  logErrorAtAppropriateLevel(logger, statusCode, payload, fileName)
  return c.json(response, statusCode)
}
