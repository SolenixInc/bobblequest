import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Precondition Failed" error that occurs when one or more conditions given in the\
 * request header fields are not met.\
 * \
 * This error corresponds to the HTTP status code 412 and indicates that the request didn't meet\
 * a condition header (like If-Match). This typically happens when:\
 * • If-Match header doesn't match the current ETag of the resource\
 * • If-None-Match header matches an existing resource\
 * • If-Modified-Since condition is not met\
 * • If-Unmodified-Since condition is violated\
 * • Custom conditional headers fail validation\
 * • Optimistic locking conditions are not satisfied\
 * \
 * Use this error when conditional request headers are not satisfied. This is commonly used\
 * for optimistic locking and cache validation scenarios.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new PreconditionFailedError("If-Match header condition failed", "The resource has been modified. Please refresh and try again.");
 *
 * // With cause
 * throw new PreconditionFailedError("ETag mismatch", "The resource has changed since you last viewed it.", {
 *   cause: originalError
 * });
 * ```
 */
export class PreconditionFailedError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Precondition Failed'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 412
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return "Request didn't meet a condition header (like If-Match)."
  }
}
