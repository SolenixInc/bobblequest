import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Gateway Timeout" error that occurs when the server, while acting as a gateway or proxy,\
 * does not receive a timely response from the upstream server.\
 * \
 * This error corresponds to the HTTP status code 504 and indicates that the server, while acting as a\
 * gateway or proxy, did not receive a timely response from an upstream server it needed to access in\
 * order to complete the request. This typically happens when:\
 * • Upstream services take too long to respond (exceed timeout thresholds)\
 * • Database queries run longer than expected\
 * • External API calls timeout due to network latency\
 * • Microservice dependencies are slow or overloaded\
 * • Long-running operations exceed configured timeouts\
 * \
 * Use this error when your application is waiting for a response from an upstream service but the\
 * response doesn't arrive within the expected time frame.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new GatewayTimeoutError("Upstream server did not respond in time", "The request is taking longer than expected. Please try again.");
 *
 * // With cause
 * throw new GatewayTimeoutError("Database query timeout", "Service is temporarily slow. Please try again in a moment.", {
 *   cause: originalError
 * });
 * ```
 */
export class GatewayTimeoutError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Gateway Timeout'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 504
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return "Upstream server didn't respond in time."
  }
}
