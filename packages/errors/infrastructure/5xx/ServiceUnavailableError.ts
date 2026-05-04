import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Service Unavailable" error that occurs when the server is currently unable to handle\
 * the request due to temporary overloading or maintenance of the server.\
 * \
 * This error corresponds to the HTTP status code 503 and indicates that the server is currently\
 * unable to handle the request due to a temporary overload or scheduled maintenance. This typically happens when:\
 * • The server is temporarily overloaded with too many requests\
 * • Scheduled maintenance is in progress\
 * • Database connections are exhausted\
 * • External dependencies are temporarily unavailable\
 * • Rate limiting is preventing request processing\
 * • Server resources are temporarily exhausted\
 * \
 * Use this error when the server cannot process the request right now but expects to be able to\
 * handle it later. This is different from a permanent error - it indicates a temporary condition.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new ServiceUnavailableError("Server is under maintenance", "Service is temporarily unavailable. Please try again later.");
 *
 * // With cause
 * throw new ServiceUnavailableError("Database overloaded", "We're experiencing high traffic. Please try again in a few minutes.", {
 *   cause: originalError
 * });
 * ```
 */
export class ServiceUnavailableError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Service Unavailable'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 503
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Service overloaded or down (temporary).'
  }
}
