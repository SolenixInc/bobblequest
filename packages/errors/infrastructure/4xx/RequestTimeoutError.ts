import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Request Timeout" error that occurs when the server times out waiting for the client\
 * to send a request.\
 * \
 * This error corresponds to the HTTP status code 408 and indicates that the client took too long\
 * to send the request. This typically happens when:\
 * • Client connection is slow or unstable\
 * • Large file uploads take too long to complete\
 * • Network latency causes delays in request transmission\
 * • Client-side processing delays prevent timely request sending\
 * • Server timeout thresholds are exceeded\
 * • Connection is dropped during request transmission\
 * \
 * Use this error when the server times out waiting for the client to complete sending the request.\
 * This is different from 504 (Gateway Timeout) - this is about the client request, not upstream services.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new RequestTimeoutError("Client request timeout", "The request took too long to process. Please try again.");
 *
 * // With cause
 * throw new RequestTimeoutError("Slow client connection", "Your request timed out. Please check your connection and try again.", {
 *   cause: originalError
 * });
 * ```
 */
export class RequestTimeoutError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Request Timeout'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 408
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Client took too long to send request.'
  }
}
