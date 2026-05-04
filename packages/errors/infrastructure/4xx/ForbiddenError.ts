import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Forbidden" error that occurs when the client is authenticated but does not have\
 * the necessary permissions to access the requested resource.\
 * \
 * This error corresponds to the HTTP status code 403 and indicates that the client is authenticated\
 * but not allowed to access the requested resource. This typically happens when:\
 * • User is authenticated but lacks required permissions\
 * • Role-based access control denies access\
 * • Resource ownership restrictions prevent access\
 * • Account is suspended or restricted\
 * • IP address or location is blocked\
 * • Time-based access restrictions are in effect\
 * \
 * Use this error when the client is properly authenticated but doesn't have the necessary\
 * permissions to access the resource. This is different from 401 (Unauthorized) - the client\
 * is authenticated but not authorized for this specific resource.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new ForbiddenError("Insufficient permissions", "You don't have permission to access this resource.");
 *
 * // With cause
 * throw new ForbiddenError("Role-based access denied", "This action requires administrator privileges.", {
 *   cause: originalError
 * });
 * ```
 */
export class ForbiddenError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Forbidden'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 403
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Authenticated but not allowed (e.g., not enough role/permission).'
  }
}
