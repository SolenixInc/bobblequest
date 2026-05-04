import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents an "Unauthorized" error that occurs when authentication is required or has failed.\
 * \
 * This error is typically used to indicate that the client must authenticate itself to get the\
 * requested response. It corresponds to the HTTP status code 401 and indicates that authentication\
 * is required or has failed. This typically happens when:\
 * • No authentication credentials are provided\
 * • Authentication credentials are invalid or malformed\
 * • Authentication tokens have expired\
 * • Authentication credentials are for the wrong user\
 * • Session has expired or been invalidated\
 * • Authentication method is not supported\
 * \
 * Use this error when the client needs to authenticate to access the resource. The client\
 * should provide valid authentication credentials before retrying the request.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new UnauthorizedError("Invalid token provided", "Please log in to access this resource.");
 *
 * // With cause
 * throw new UnauthorizedError("Token expired", "Your session has expired. Please log in again.", {
 *   cause: originalError
 * });
 * ```
 */
export class UnauthorizedError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Unauthorized'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 401
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Authentication required or failed (e.g., invalid token).'
  }
}
