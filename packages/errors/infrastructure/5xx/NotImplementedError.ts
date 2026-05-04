import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Not Implemented" error that occurs when the server does not support the functionality\
 * required to fulfill the request.\
 * \
 * This error corresponds to the HTTP status code 501 and indicates that the server does not support\
 * the functionality required to fulfill the request. This typically happens when:\
 * • A requested API endpoint or method is not yet implemented\
 * • A feature is planned but not yet available\
 * • The server doesn't support the requested operation\
 * • Legacy functionality has been removed but clients still request it\
 * • Experimental features are disabled in production\
 * \
 * Use this error when the server understands the request but the specific functionality\
 * is not implemented or available. This is different from a 404 (Not Found) - the endpoint\
 * exists but the functionality is not implemented.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new NotImplementedError("Feature not yet implemented", "This feature is not available yet. Please check back later.");
 *
 * // With cause
 * throw new NotImplementedError("API endpoint not implemented", "This functionality is currently under development.", {
 *   cause: originalError
 * });
 * ```
 */
export class NotImplementedError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Not Implemented'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 501
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Endpoint/method not implemented.'
  }
}
