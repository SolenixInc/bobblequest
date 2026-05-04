import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Gone" error that occurs when the requested resource is no longer available on the server.\
 * \
 * This error corresponds to the HTTP status code 410 and indicates that the resource is no longer\
 * available and will not return. This typically happens when:\
 * • A resource has been permanently deleted\
 * • Content has been removed and won't be restored\
 * • A service or feature has been discontinued\
 * • A URL has been permanently retired\
 * • Data has been purged due to retention policies\
 * • A resource has been moved to a different location permanently\
 * \
 * Use this error when a resource was previously available but has been permanently removed.\
 * This is different from 404 (Not Found) - the resource existed but is now gone forever.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new GoneError("Resource permanently removed", "This resource is no longer available.");
 *
 * // With cause
 * throw new GoneError("Content deleted", "The requested content has been permanently removed.", {
 *   cause: originalError
 * });
 * ```
 */
export class GoneError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Gone'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 410
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return "Resource no longer exists and won't return."
  }
}
