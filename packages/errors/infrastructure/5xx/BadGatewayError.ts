import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Bad Gateway" error that occurs when the server, while acting as a gateway or proxy,\
 * receives an invalid response from the upstream server.\
 * \
 * This error corresponds to the HTTP status code 502 and indicates that the server, while acting as a\
 * gateway or proxy, received an invalid response from an upstream server it accessed in attempting to\
 * fulfill the request. This typically happens when:\
 * • An upstream server returns malformed or invalid data\
 * • A database or external service connection fails\
 * • A microservice dependency is unavailable or misconfigured\
 * • Network issues prevent proper communication with upstream services\
 * \
 * Use this error when your application acts as a proxy/gateway and cannot get a valid response\
 * from the services it depends on, but the issue is not with your application itself.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new BadGatewayError("Upstream server returned malformed response", "Unable to process your request. Please try again later.");
 *
 * // With cause
 * throw new BadGatewayError("Database connection failed", "Service temporarily unavailable. Please try again in a few minutes.", {
 *   cause: originalError
 * });
 * ```
 */
export class BadGatewayError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Bad Gateway'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 502
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Server acted as a proxy and got invalid response upstream.'
  }
}
